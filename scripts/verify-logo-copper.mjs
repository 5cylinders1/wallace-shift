/** Actual GLB/material, absorption and native shader checks; no browser or GPU rendering. */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { Box3, FrontSide, MeshPhysicalMaterial, ShaderChunk, ShaderLib, Texture, Vector3 } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import ts from 'typescript'

const modules = new Map()
async function sourceUrl(url) {
  if (modules.has(url.href)) return modules.get(url.href)
  let js = ts.transpileModule(await readFile(url, 'utf8'), { compilerOptions: {
    target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext,
  } }).outputText
  for (const match of [...js.matchAll(/from ['"]([^'"]+)['"]/g)]) {
    const specifier = match[1]
    const resolved = specifier.startsWith('.')
      ? await sourceUrl(new URL(`${specifier}.ts`, url)) : import.meta.resolve(specifier)
    js = js.replace(match[0], `from '${resolved}'`)
  }
  const result = `data:text/javascript;base64,${Buffer.from(js).toString('base64')}`
  modules.set(url.href, result)
  return result
}
const base = new URL('../src/components/experiments/water-hero/', import.meta.url)
const load = name => sourceUrl(new URL(`${name}.ts`, base)).then(url => import(url))
const { SMOKED_COPPER_MATERIAL: profile, createLogoCopperMaterial, logoCopperUniforms } = await load('logoCopper')
const copperShader = await load('shaders/logoCopper')
const { createLogoCrystalMaterial, logoGlassUniforms, logoLEDUniforms, bindGlassScene, logoMaterials } = await load('logoMaterial')
const { logoChromeUniforms } = await load('logoChrome')
const { logoFrostedUniforms } = await load('logoFrosted')
const { logoPearlUniforms } = await load('logoPearl')
const { createLogoMaterialVariants, selectLogoAppearance, disposeLogoMaterialVariants } = await load('logoMaterialVariants')
const { logoOpeningUniforms, updateLogoOpening } = await load('logoOpening')
const { buildGlassGeometry } = await load('glassGeometry')
const bytes = await readFile(new URL('../public/models/ws_logo.glb', import.meta.url))
const { scene: source } = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '')
source.updateMatrixWorld(true)
const meshes = []
source.traverse(mesh => { if (mesh.isMesh) meshes.push(mesh) })
const size = new Box3().setFromObject(source).getSize(new Vector3())
const thickness = size.y * 2 / size.x
const close = (a, b, epsilon = 1e-8) => assert.ok(Math.abs(a - b) <= epsilon, `${a} vs ${b}`)
const smoothstep = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t) }
function expandIncludes(text) {
  return text.replace(/#include <([\w_]+)>/g, (_, name) => {
    assert.equal(typeof ShaderChunk[name], 'string')
    return expandIncludes(ShaderChunk[name])
  })
}

await test('smoked copper owns independent dielectric and optical uniforms without changing the clear glass or cached GLB', t => {
  for (const mesh of meshes) {
    const original = mesh.material.toJSON(), positions = mesh.geometry.attributes.position.array.slice()
    const clear = createLogoCrystalMaterial(mesh.material, thickness), clearBefore = clear.toJSON()
    const beauty = createLogoCopperMaterial(mesh.material, thickness)
    const proxy = createLogoCopperMaterial(mesh.material, thickness, true)
    t.after(() => { clear.dispose(); beauty.dispose(); proxy.dispose() })
    for (const material of [beauty, proxy]) {
      assert.ok(material instanceof MeshPhysicalMaterial && Object.hasOwn(material.defines, 'PHYSICAL'))
      assert.equal(material.side, FrontSide); assert.equal(material.depthWrite, true)
      assert.equal(material.transparent, false); assert.equal(material.opacity, 1)
      assert.equal(material.transmission, 0, 'transparent particles use the existing explicit scene capture')
      assert.equal(material.metalness, 0, 'only the shader shoulder band becomes conductive')
      assert.equal(material.ior, profile.ior); assert.equal(material.roughness, profile.roughness)
      assert.equal(material.iridescence, 0, 'copper does not inherit clear-crystal rainbow rims')
      assert.deepEqual(material.emissive.toArray(), [0, 0, 0])
      for (const map of ['map', 'normalMap', 'bumpMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'aoMap', 'alphaMap']) assert.equal(material[map], null)
      const glass = logoGlassUniforms(material), copper = logoCopperUniforms(material)
      assert.ok(glass && copper)
      assert.equal(glass.uGlassWorldThickness.value, thickness)
      assert.deepEqual(glass.uGlassAbsorption.value.toArray(), profile.absorption)
      assert.deepEqual(glass.uGlassBodyFill.value.toArray(), [0, 0], 'dark absorption cannot become a flat gray undercoat')
      assert.equal(glass.uGlassRimStrength.value, 0)
      assert.deepEqual(copper.uCopperReflectance.value.toArray(), profile.copperReflectance)
      assert.equal(copper.uCopperProxy.value, material === proxy ? 1 : 0)
      assert.ok(!logoLEDUniforms(material) && !logoChromeUniforms(material) && !logoFrostedUniforms(material) && !logoPearlUniforms(material))
      assert.notEqual(material.customProgramCacheKey(), clear.customProgramCacheKey())
    }
    for (const key of Object.keys(logoCopperUniforms(beauty))) assert.notEqual(logoCopperUniforms(beauty)[key], logoCopperUniforms(proxy)[key])
    assert.notEqual(logoCopperUniforms(beauty).uCopperReflectance.value, logoCopperUniforms(proxy).uCopperReflectance.value)
    assert.notEqual(logoGlassUniforms(beauty).uGlassAbsorption.value, logoGlassUniforms(clear).uGlassAbsorption.value)
    assert.deepEqual(clear.toJSON(), clearBefore); assert.deepEqual(mesh.material.toJSON(), original)
    assert.deepEqual(mesh.geometry.attributes.position.array, positions)
  }
})

const bandExpression = copperShader.logoCopperFragmentPars.match(/return ([\s\S]*?);/)[1]
const bandAt = new Function('vGlassBevel', 'smoothstep', `return ${bandExpression};`)
const compositeExpression = copperShader.logoCopperFragmentComposite.match(/outgoingLight = ([^;]+);/)[1]
const combine = new Function('totalSpecular', 'copperGlassWeight', 'copperBody', 'copperRearReflection', `return ${compositeExpression};`)
const coverageAt = new Function('copperBand', `return ${copperShader.logoCopperFragmentComposite.match(/float copperGlassWeight = ([^;]+);/)[1]};`)

await test('the actual rounded GLB confines conductive copper to a continuous narrow shoulder band', t => {
  for (const mesh of meshes) {
    const geometry = buildGlassGeometry(mesh.geometry)
    t.after(() => geometry.dispose())
    const p = geometry.attributes.position, n = geometry.attributes.normal, index = geometry.index
    const a = new Vector3(), b = new Vector3(), c = new Vector3(), edge = new Vector3(), cross = new Vector3()
    const bevels = Array.from({ length: n.count }, (_, i) => 1 - Math.abs(new Vector3().fromBufferAttribute(n, i).normalize().y))
    let area = 0, copperArea = 0, capArea = 0, maxBand = 0
    for (const bevel of bevels) {
      const weight = bandAt(bevel, smoothstep)
      assert.ok(weight >= 0 && weight <= 1)
      if (bevel < 1e-7 || bevel > .99) assert.equal(weight, 0, 'broad glass caps and deep extrusion walls stay uncoated')
      maxBand = Math.max(maxBand, weight)
    }
    for (let i = 0; i < index.count; i += 3) {
      const ids = [index.getX(i), index.getX(i + 1), index.getX(i + 2)]
      a.fromBufferAttribute(p, ids[0]); b.fromBufferAttribute(p, ids[1]); c.fromBufferAttribute(p, ids[2])
      const triangleArea = cross.subVectors(b, a).cross(edge.subVectors(c, a)).length() * .5
      // Varying bevel is interpolated after the vertex normal is normalized.
      const bevel = ids.reduce((sum, id) => sum + bevels[id], 0) / 3
      area += triangleArea
      copperArea += triangleArea * bandAt(bevel, smoothstep)
      if (ids.every(id => bevels[id] < 1e-7)) capArea += triangleArea
    }
    assert.ok(maxBand > .99, `${mesh.name} has actual rounded normals reaching full conductor coverage`)
    assert.ok(copperArea > area * .0001 && copperArea < area * .2, 'the area-weighted inlay remains a small portion of the sculpture')
    assert.ok(capArea > copperArea * 3, 'uncoated cap area dominates the narrow inlay')
  }
  for (let bevel = 0; bevel <= 1; bevel += .001) {
    const left = bandAt(bevel - 1e-7, smoothstep), right = bandAt(bevel + 1e-7, smoothstep)
    assert.ok(Math.abs(left - right) < 2e-5, 'both coverage edges remain continuous')
    const weight = coverageAt(bandAt(bevel, smoothstep))
    for (const light of [0, .4, 20]) {
      close(combine(.3, weight, light, light * .1), .3 + weight * light * 1.1)
    }
  }
  assert.equal(combine(.3, coverageAt(1), 1000, 1000), .3, 'fully coated copper cannot transmit either glass interface')
})

await test('warm absorption follows optical thickness while native copper shading precedes light evaluation', t => {
  const shaderText = copperShader.logoCopperFragmentComposite
  const transmission = new Function('uGlassAbsorption', 'copperPath', `const exp = Math.exp; return ${shaderText.match(/vec3 copperTransmission = ([^;]+);/)[1]};`)
  const front = profile.absorption.map(absorption => transmission(absorption, thickness))
  assert.ok(front.every(value => value > .18 && value < .35), 'dark faces retain a restrained view of the actual captured background')
  assert.ok(front[0] > front[1] && front[1] > front[2], 'slightly greater red transmission gives the glass its warm smoke tint')
  for (const absorption of profile.absorption) {
    let last = 1
    for (let degrees = 0; degrees <= 90; degrees++) {
      const path = thickness / Math.max(.3, Math.abs(Math.cos(degrees * Math.PI / 180)))
      const value = transmission(absorption, path)
      assert.ok(value > 0 && value <= last)
      last = value
    }
  }
  const material = createLogoCopperMaterial(meshes[0].material, thickness)
  t.after(() => material.dispose())
  const shader = { uniforms: {}, vertexShader: ShaderLib.physical.vertexShader, fragmentShader: ShaderLib.physical.fragmentShader }
  material.onBeforeCompile(shader, {})
  for (const registry of [logoGlassUniforms(material), logoCopperUniforms(material)]) {
    for (const [name, uniform] of Object.entries(registry)) assert.equal(shader.uniforms[name], uniform)
  }
  const text = shader.fragmentShader
  const helper = text.indexOf('float copperBandWeight()')
  assert.ok(helper > text.indexOf('varying float vGlassBevel;') && helper < text.indexOf('void main() {'))
  const surface = text.indexOf(copperShader.logoCopperFragmentSurface.trim())
  assert.ok(surface > text.indexOf('#include <metalnessmap_fragment>'))
  assert.ok(surface < text.indexOf('#include <lights_physical_fragment>'), 'native BRDF receives conductor reflectance and roughness before evaluating light')
  const finish = text.indexOf(`outgoingLight = ${compositeExpression};`)
  assert.ok(finish > text.indexOf('vec3 totalSpecular ='))
  assert.ok(finish < text.indexOf('#include <opaque_fragment>') && finish < text.indexOf('#include <tonemapping_fragment>'))
  assert.ok(!text.includes('outgoingLight = totalSpecular + crystalBody + crystalRearReflection;'))
  assert.ok(!compositeExpression.includes('totalDiffuse') && !compositeExpression.includes('totalEmissive'), 'no gray undercoat or copper light source is added')
  expandIncludes(text); expandIncludes(shader.vertexShader)
})

await test('water proxies reject beauty captures and settled copper is removed from the shared opening halo', t => {
  const beauty = source.clone(true), proxy = source.clone(true), texture = new Texture()
  createLogoMaterialVariants(beauty, thickness); createLogoMaterialVariants(proxy, thickness, true)
  selectLogoAppearance(beauty, 'copper'); selectLogoAppearance(proxy, 'copper')
  const actual = logoMaterials(beauty), reflected = logoMaterials(proxy), materials = [...actual, ...reflected]
  t.after(() => { bindGlassScene(materials, null); texture.dispose(); disposeLogoMaterialVariants(beauty); disposeLogoMaterialVariants(proxy) })
  bindGlassScene(materials, texture, 1024, 576)
  const condition = copperShader.logoCopperFragmentComposite.match(/if \((uGlassReady[^\n]+)\) \{/)[1]
  const shouldSample = new Function('uGlassReady', 'uCopperProxy', 'copperGlassWeight', `return ${condition};`)
  for (const material of materials) {
    const copper = logoCopperUniforms(material), glass = logoGlassUniforms(material), opening = logoOpeningUniforms(material)
    assert.equal(opening.uOpeningGlass.value, 1); assert.equal(opening.uOpeningEmissiveGlass.value, 0)
    assert.deepEqual(opening.uOpeningColor.value.toArray(), profile.openingColor)
    assert.equal(opening.uOpeningGain.value, actual.includes(material) ? 1 : profile.openingReflectionGain)
    for (const band of [0, .5, 1]) {
      assert.equal(shouldSample(glass.uGlassReady.value, copper.uCopperProxy.value, coverageAt(band)), actual.includes(material) && band < 1)
    }
    assert.equal(shouldSample(0, copper.uCopperProxy.value, 1), false, 'unbound captures cannot supply background radiance')
    const shader = { uniforms: {}, vertexShader: ShaderLib.physical.vertexShader, fragmentShader: ShaderLib.physical.fragmentShader }
    material.onBeforeCompile(shader, {})
    const reset = shader.fragmentShader.match(/if \((uOpeningGlowPass[^\n]+)\) outgoingLight = vec3\(0\.0\);/)
    assert.ok(reset, 'non-emissive glass uses the shared glow reset')
    const resetAt = shader.fragmentShader.indexOf(reset[0]), finish = shader.fragmentShader.indexOf(`outgoingLight = ${compositeExpression};`)
    assert.ok(resetAt > finish)
    const clear = new Function('uOpeningGlowPass', 'uOpeningGlass', 'uOpeningEmissiveGlass', `return ${reset[1]};`)
    assert.equal(clear(1, opening.uOpeningGlass.value, opening.uOpeningEmissiveGlass.value), true)
    assert.equal(clear(0, opening.uOpeningGlass.value, opening.uOpeningEmissiveGlass.value), false)
  }
  updateLogoOpening(materials, .065)
  assert.ok(materials.every(material => logoOpeningUniforms(material).uOpeningTraceStrength.value > 0))
  updateLogoOpening(materials, .4)
  assert.ok(materials.every(material => logoOpeningUniforms(material).uOpeningTraceStrength.value === 0))
})
