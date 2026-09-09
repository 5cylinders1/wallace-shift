/** LED geometry and shader-wiring checks. No browser/GPU appearance claim. */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { FrontSide, Matrix3, Matrix4, MeshPhysicalMaterial, ShaderLib, Vector3 } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import ts from 'typescript'

async function sourceModule(path, replacements = []) {
  let source = await readFile(new URL(path, import.meta.url), 'utf8')
  for (const [from, to] of replacements) source = source.replace(from, to)
  const js = ts.transpileModule(source, { compilerOptions: {
    target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext,
  } }).outputText.replace("from 'three'", `from '${import.meta.resolve('three')}'`)
  return `data:text/javascript;base64,${Buffer.from(js).toString('base64')}`
}
const base = '../src/components/experiments/water-hero/'
const shaderUrl = await sourceModule(`${base}shaders/logoLED.ts`)
const shader = await import(shaderUrl)
const configUrl = await sourceModule(`${base}waterHeroConfig.ts`)
const colorUrl = await sourceModule(`${base}shaders/underwaterColor.ts`)
const glassUrl = await sourceModule(`${base}shaders/logoGlass.ts`)
const { LED_LOGO_MATERIAL, ELECTRIC_LOGO_MATERIAL, PREFERRED_LOGO_APPEARANCE, PREVIEW_LOGO_APPEARANCE } = await import(configUrl)
const { readLogoAppearance, logoAppearanceUrl } = await import(await sourceModule(`${base}logoAppearance.ts`, [
  ["from './waterHeroConfig'", `from '${configUrl}'`],
]))
const { COLOR_WAVE } = await import(colorUrl)
const { createLogoLEDMaterial, logoLEDUniforms, setLEDGlowPass, updateLEDLighting } = await import(await sourceModule(`${base}logoMaterial.ts`, [
  ["from './waterHeroConfig'", `from '${configUrl}'`],
  ["from './shaders/underwaterColor'", `from '${colorUrl}'`],
  ["from './shaders/logoGlass'", `from '${glassUrl}'`],
  ["from './shaders/logoLED'", `from '${shaderUrl}'`],
]))
const bytes = await readFile(new URL('../public/models/ws_logo.glb', import.meta.url))
const { scene } = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '')
const meshes = []
scene.traverse(mesh => { if (mesh.isMesh) meshes.push(mesh) })
const mask = alignment => { const t = Math.max(0, Math.min(1, (alignment - .78) / (.995 - .78))); return t * t * (3 - 2 * t) }

await test('the factory isolates LED uniforms and preserves solid physical housing and source materials', () => {
  const source = meshes[0].material, before = source.toJSON()
  const real = createLogoLEDMaterial(source), proxy = createLogoLEDMaterial(source, true)
  for (const material of [real, proxy]) {
    assert.ok(material instanceof MeshPhysicalMaterial)
    assert.ok(Object.hasOwn(material.defines, 'PHYSICAL'))
    assert.equal(material.side, FrontSide)
    assert.equal(material.transmission, 0)
    assert.equal(material.transparent, false)
    assert.equal(material.depthWrite, true)
    assert.equal(material.opacity, 1)
    for (const key of ['map', 'normalMap', 'roughnessMap', 'bumpMap']) assert.equal(material[key], null)
    assert.deepEqual(material.color.toArray(), LED_LOGO_MATERIAL.housingColor)
  }
  const realUniforms = logoLEDUniforms(real), proxyUniforms = logoLEDUniforms(proxy)
  assert.notEqual(realUniforms, proxyUniforms)
  assert.notEqual(realUniforms.uLEDColor.value, proxyUniforms.uLEDColor.value)
  assert.equal(proxyUniforms.uLEDIntensity.value, realUniforms.uLEDIntensity.value * LED_LOGO_MATERIAL.reflectionGain)
  setLEDGlowPass([real], true)
  assert.equal(realUniforms.uLEDGlowPass.value, 1)
  assert.equal(proxyUniforms.uLEDGlowPass.value, 0)
  setLEDGlowPass([real], false)
  assert.equal(realUniforms.uLEDGlowPass.value, 0)
  const compiled = { vertexShader: ShaderLib.physical.vertexShader, fragmentShader: ShaderLib.physical.fragmentShader, uniforms: {} }
  real.onBeforeCompile(compiled, {})
  for (const [name, uniform] of Object.entries(realUniforms)) assert.equal(compiled.uniforms[name], uniform)
  assert.ok(compiled.vertexShader.includes('vLEDFaceAlignment = abs(normalize(objectNormal).y)'))
  assert.ok(compiled.fragmentShader.includes('outgoingLight = ledEmission + ledHousing'))
  assert.ok(!compiled.fragmentShader.includes('uGlassScene'))
  assert.deepEqual(source.toJSON(), before)
  real.dispose(); proxy.dispose()
})

await test('opening LED illumination is stable and underwater tint cycles remain continuous with a restrained proxy', () => {
  const real = createLogoLEDMaterial(meshes[0].material), proxy = createLogoLEDMaterial(meshes[0].material, true)
  const materials = [real, proxy], a = logoLEDUniforms(real), b = logoLEDUniforms(proxy)
  for (const time of [0, 1, 5.6, 50, 1200]) {
    updateLEDLighting(materials, time, 0)
    assert.deepEqual(a.uLEDColor.value.toArray(), LED_LOGO_MATERIAL.color)
    assert.equal(a.uLEDIntensity.value, LED_LOGO_MATERIAL.intensity)
    assert.equal(b.uLEDIntensity.value, a.uLEDIntensity.value * LED_LOGO_MATERIAL.reflectionGain)
  }
  for (let time = 0; time < COLOR_WAVE.seconds * 6; time += .037) {
    for (const underwater of [0, .3, .65, 1]) {
      updateLEDLighting(materials, time, underwater)
      assert.ok(a.uLEDColor.value.toArray().every(value => Number.isFinite(value) && value >= 0 && value <= 1))
      assert.ok(a.uLEDIntensity.value >= LED_LOGO_MATERIAL.intensity * .85)
      assert.ok(a.uLEDIntensity.value <= LED_LOGO_MATERIAL.intensity * 1.03)
      assert.equal(b.uLEDIntensity.value, a.uLEDIntensity.value * LED_LOGO_MATERIAL.reflectionGain)
      assert.deepEqual(a.uLEDColor.value.toArray(), b.uLEDColor.value.toArray())
    }
  }
  for (let cycle = 0; cycle <= 6; cycle++) {
    const boundary = .72 / COLOR_WAVE.speed + cycle * COLOR_WAVE.seconds
    updateLEDLighting(materials, boundary - 1e-5, 1)
    const colorBefore = a.uLEDColor.value.clone(), intensityBefore = a.uLEDIntensity.value
    updateLEDLighting(materials, boundary + 1e-5, 1)
    assert.ok(a.uLEDColor.value.toArray().every((value, i) => Math.abs(value - colorBefore.toArray()[i]) < 1e-6))
    assert.ok(Math.abs(a.uLEDIntensity.value - intensityBefore) < 1e-6)
  }
  real.dispose(); proxy.dispose()
})

await test('switching through the electrified preview restores the exact saved LED lighting at the same pose and time', () => {
  assert.equal(PREFERRED_LOGO_APPEARANCE, 'led')
  const material = createLogoLEDMaterial(meshes[0].material)
  const proxy = createLogoLEDMaterial(meshes[0].material, true)
  const uniforms = logoLEDUniforms(material), reflected = logoLEDUniforms(proxy)
  const originalSource = meshes[0].material.toJSON()
  for (const time of [0, 1.2, 5.6, 13.3, 120]) {
    for (const underwater of [0, .5, 1]) {
      updateLEDLighting([material, proxy], time, underwater, 'led')
      const before = { color: uniforms.uLEDColor.value.toArray(), intensity: uniforms.uLEDIntensity.value }
      const version = material.version, program = material.customProgramCacheKey()
      updateLEDLighting([material, proxy], time, underwater, 'electric')
      assert.equal(uniforms.uElectricMode.value, 1)
      assert.equal(uniforms.uElectricTime.value, time)
      assert.equal(reflected.uElectricTime.value, time)
      assert.deepEqual(reflected.uLEDColor.value.toArray(), uniforms.uLEDColor.value.toArray())
      assert.equal(reflected.uLEDIntensity.value, uniforms.uLEDIntensity.value * ELECTRIC_LOGO_MATERIAL.reflectionGain)
      if (underwater === 0) assert.deepEqual(uniforms.uLEDColor.value.toArray(), ELECTRIC_LOGO_MATERIAL.color)
      assert.ok(Number.isFinite(uniforms.uLEDIntensity.value))
      updateLEDLighting([material, proxy], time, underwater, 'led')
      assert.deepEqual(uniforms.uLEDColor.value.toArray(), before.color)
      assert.equal(uniforms.uLEDIntensity.value, before.intensity)
      assert.equal(uniforms.uElectricMode.value, 0)
      assert.equal(uniforms.uElectricTime.value, 0)
      assert.equal(material.version, version, 'switching uniforms does not recompile the material')
      assert.equal(material.customProgramCacheKey(), program)
    }
  }
  // WSLogo supplies zero time and submersion in reduced motion.
  updateLEDLighting([material, proxy], 0, 0, 'electric')
  assert.equal(uniforms.uElectricTime.value, 0)
  assert.equal(uniforms.uLEDIntensity.value, ELECTRIC_LOGO_MATERIAL.intensity)
  assert.deepEqual(meshes[0].material.toJSON(), originalSource)
  material.dispose(); proxy.dispose()
})

await test('comparison URLs preserve the review pose and favorite without changing other query settings', () => {
  assert.equal(PREVIEW_LOGO_APPEARANCE, 'glass')
  for (const search of ['', '?look=unknown']) assert.equal(readLogoAppearance(search), PREVIEW_LOGO_APPEARANCE)
  for (const appearance of ['led', 'electric', 'glass', 'chrome', 'frosted', 'pearl', 'copper', 'mercury', 'cutlight', 'led']) {
    const original = 'https://example.test/experiments/water-hero?progress=.63&quality=low&reduced=1&channel=2&debug=1#review'
    const result = new URL(logoAppearanceUrl(original, appearance), original)
    assert.equal(readLogoAppearance(result.search), appearance)
    assert.equal(result.pathname, '/experiments/water-hero')
    assert.equal(result.hash, '#review')
    for (const [name, value] of new URL(original).searchParams) assert.equal(result.searchParams.get(name), value)
  }
})

await test('the LED diffuser illuminates the broad authored faces and leaves the extrusion walls dark', t => {
  const a = new Vector3(), b = new Vector3(), c = new Vector3()
  for (const mesh of meshes) {
    const position = mesh.geometry.attributes.position, normal = mesh.geometry.attributes.normal, indices = mesh.geometry.index
    let area = 0, litArea = 0, faceArea = 0, wallArea = 0
    for (let i = 0; i < indices.count; i += 3) {
      const ids = [indices.getX(i), indices.getX(i + 1), indices.getX(i + 2)]
      a.fromBufferAttribute(position, ids[0]); b.fromBufferAttribute(position, ids[1]); c.fromBufferAttribute(position, ids[2])
      const triangleArea = b.sub(a).cross(c.sub(a)).length() * .5
      const alignment = ids.map(id => Math.abs(normal.getY(id)))
      const lit = mask(alignment.reduce((sum, value) => sum + value, 0) / 3)
      area += triangleArea; litArea += triangleArea * lit
      if (Math.min(...alignment) > .9999) { faceArea += triangleArea; assert.equal(lit, 1, 'the whole planar face is luminous') }
      if (Math.max(...alignment) < .78) { wallArea += triangleArea; assert.equal(lit, 0, 'side housing does not emit') }
    }
    assert.ok(faceArea / area > .30, 'authored plane occupies substantially more than a bevel strip')
    assert.ok(wallArea / area > .50)
    assert.ok(litArea / area > .35 && litArea / area < .45)
    t.diagnostic(`${mesh.name}: ${(litArea / area * 100).toFixed(2)}% area-weighted emission at triangle centroids; CPU geometry estimate`)
  }
})

await test('authored face alignment survives the 180-degree turn and mirrored camera normal transforms', () => {
  const normal = new Vector3(), axis = new Vector3(), normalMatrix = new Matrix3()
  const orient = new Matrix4().makeRotationX(Math.PI / 2)
  for (let degrees = 0; degrees <= 180; degrees += 5) {
    const world = new Matrix4().makeRotationY(degrees * Math.PI / 180).multiply(orient)
    for (const cameraTilt of [-.06, .06]) {
      normalMatrix.getNormalMatrix(new Matrix4().makeRotationX(cameraTilt).multiply(world))
      axis.set(0, 1, 0).applyMatrix3(normalMatrix).normalize()
      for (const mesh of meshes) {
        const authored = mesh.geometry.attributes.normal
        for (let i = 0; i < authored.count; i++) {
          const alignment = Math.abs(authored.getY(i)), intensity = mask(alignment)
          normal.fromBufferAttribute(authored, i).applyMatrix3(normalMatrix).normalize()
          assert.ok(Number.isFinite(normal.length()) && intensity >= 0 && intensity <= 1)
          if (alignment > .9999) { assert.ok(Math.abs(normal.dot(axis)) > .9999); assert.equal(intensity, 1) }
          if (alignment < .78) assert.equal(intensity, 0)
        }
      }
    }
  }
})

await test('the LED snippets fit native shaders and emit the same face light in beauty and glow draws', () => {
  for (const native of [ShaderLib.standard, ShaderLib.physical]) {
    const vertex = native.vertexShader.replace('#include <common>', `#include <common>\n${shader.logoLEDVertexPars}`)
      .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>\n${shader.logoLEDVertexNormal}`)
      .replace('#include <project_vertex>', `#include <project_vertex>\n${shader.logoLEDVertexProject}`)
    const fragment = native.fragmentShader.replace('#include <common>', `#include <common>\n${shader.logoLEDFragmentPars}`)
      .replace('#include <opaque_fragment>', `${shader.logoLEDFragmentComposite}\n#include <opaque_fragment>`)
    assert.ok(vertex.indexOf('vLEDFaceAlignment =') > vertex.indexOf('#include <beginnormal_vertex>'))
    assert.ok(vertex.indexOf('vLEDWorldPosition =') > vertex.indexOf('#include <project_vertex>'))
    assert.ok(fragment.indexOf('outgoingLight = ledEmission') < fragment.indexOf('#include <opaque_fragment>'))
    assert.ok(fragment.indexOf('outgoingLight = ledEmission') < fragment.indexOf('#include <tonemapping_fragment>'))
    assert.ok(fragment.includes('ledHousing * (1.0 - step(.5, uLEDGlowPass))'))
    assert.ok(fragment.includes('uLEDGlowPass > .5 && cameraPosition.y > 0.0 && vLEDWorldPosition.y < 0.0'))
    assert.ok(!shader.logoLEDFragmentComposite.includes('texture2D'), 'LED faces are solid rather than scene-transmitting glass')
  }
})
