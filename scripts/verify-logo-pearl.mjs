/** Actual GLB/material and native shader wiring checks; no browser or GPU rendering. */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { FrontSide, MeshPhysicalMaterial, ShaderChunk, ShaderLib, Vector3 } from 'three'
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
const { PEARL_CERAMIC_MATERIAL: profile, createLogoPearlMaterial, logoPearlUniforms,
  updatePearlLighting, setPearlGlowPass } = await load('logoPearl')
const { PEARL_GLAZE, logoPearlFragmentRoughness, logoPearlFragmentPhysical,
  logoPearlFragmentComposite } = await load('shaders/logoPearl')
const { createLogoMaterialVariants, logoVariantMaterials, selectLogoAppearance, disposeLogoMaterialVariants } = await load('logoMaterialVariants')
const { logoMaterials, logoLEDUniforms, logoGlassUniforms } = await load('logoMaterial')
const { logoChromeUniforms } = await load('logoChrome')
const { logoFrostedUniforms } = await load('logoFrosted')
const { buildGlassGeometry } = await load('glassGeometry')
const { logoOpeningUniforms, updateLogoOpening } = await load('logoOpening')
const bytes = await readFile(new URL('../public/models/ws_logo.glb', import.meta.url))
const { scene: source } = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '')
source.updateMatrixWorld(true)
const sourceMeshes = []
source.traverse(mesh => { if (mesh.isMesh) sourceMeshes.push(mesh) })
const close = (a, b, epsilon = 1e-8) => assert.ok(Math.abs(a - b) <= epsilon, `${a} vs ${b}`)
const smoothstep = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t) }
const mix = (a, b, t) => a + (b - a) * t
function variants(t) {
  const beauty = source.clone(true), proxy = source.clone(true)
  createLogoMaterialVariants(beauty, .432916); createLogoMaterialVariants(proxy, .432916, true)
  t.after(() => { disposeLogoMaterialVariants(beauty); disposeLogoMaterialVariants(proxy) })
  return { beauty, proxy, materials: [...logoVariantMaterials(beauty), ...logoVariantMaterials(proxy)] }
}
function expandIncludes(text) {
  return text.replace(/#include <([\w_]+)>/g, (_, name) => {
    assert.equal(typeof ShaderChunk[name], 'string', `installed native chunk ${name}`)
    return expandIncludes(ShaderChunk[name])
  })
}

await test('ceramic owns an opaque ivory dielectric with no optical capture, source mutation or permanent emission', t => {
  for (const mesh of sourceMeshes) {
    const original = mesh.material.toJSON(), originalPositions = mesh.geometry.attributes.position.array.slice()
    const a = createLogoPearlMaterial(mesh.material), b = createLogoPearlMaterial(mesh.material)
    t.after(() => { a.dispose(); b.dispose() })
    for (const material of [a, b]) {
      assert.ok(material instanceof MeshPhysicalMaterial)
      assert.ok(Object.hasOwn(material.defines, 'PHYSICAL'))
      assert.equal(material.side, FrontSide); assert.equal(material.transparent, false)
      assert.equal(material.depthWrite, true); assert.equal(material.opacity, 1)
      assert.equal(material.transmission, 0); assert.equal(material.metalness, 0)
      assert.equal(material.ior, profile.ior); assert.equal(material.specularIntensity, profile.specularIntensity)
      assert.equal(material.roughness, profile.roughness); assert.equal(material.clearcoat, profile.clearcoat)
      assert.equal(material.clearcoatRoughness, profile.clearcoatRoughness)
      assert.deepEqual(material.color.toArray(), profile.baseColor)
      assert.deepEqual(material.emissive.toArray(), [0, 0, 0]); assert.equal(material.emissiveIntensity, 0)
      assert.equal(material.vertexColors, false)
      for (const [name, value] of Object.entries(material)) {
        if (name.endsWith('Map') && name !== 'envMap') assert.equal(value, null, `${name} cannot require missing rounded-mesh UVs or add a texture`)
      }
      assert.equal(material.map, null)
      assert.ok(logoPearlUniforms(material))
      assert.ok(!logoGlassUniforms(material) && !logoLEDUniforms(material) && !logoChromeUniforms(material) && !logoFrostedUniforms(material))
    }
    assert.notEqual(a.color, b.color)
    assert.notEqual(a.iridescenceThicknessRange, b.iridescenceThicknessRange)
    assert.notEqual(logoPearlUniforms(a).uPearlTurn, logoPearlUniforms(b).uPearlTurn)
    assert.notEqual(logoPearlUniforms(a).uPearlGlowPass, logoPearlUniforms(b).uPearlGlowPass)
    updatePearlLighting([a], Math.PI / 2)
    assert.equal(logoPearlUniforms(b).uPearlTurn.value, 0)
    assert.deepEqual(mesh.material.toJSON(), original)
    assert.deepEqual(mesh.geometry.attributes.position.array, originalPositions)
  }
})

await test('rounded GLB normals shape the glaze and native specular sheen is gated before Fresnel evaluation', t => {
  const capExpression = logoPearlFragmentRoughness.match(/float pearlCap = ([^;]+);/)[1]
  const roughExpression = logoPearlFragmentRoughness.match(/roughnessFactor = ([^;]+);/)[1]
  const roughAt = new Function('vPearlFace', 'smoothstep', 'mix', `const pearlCap = ${capExpression}; return ${roughExpression};`)
  for (const mesh of sourceMeshes) {
    const geometry = buildGlassGeometry(mesh.geometry), normals = geometry.attributes.normal
    t.after(() => geometry.dispose())
    assert.equal(geometry.attributes.uv, undefined, 'the active rounded mesh has no UV requirement')
    const values = new Set()
    for (let i = 0; i < normals.count; i++) {
      const n = new Vector3().fromBufferAttribute(normals, i).normalize()
      const rough = roughAt(Math.abs(n.y), smoothstep, mix)
      assert.ok(rough >= PEARL_GLAZE.shoulderRoughness && rough <= PEARL_GLAZE.capRoughness)
      values.add(rough.toFixed(5))
    }
    assert.ok(values.has(PEARL_GLAZE.capRoughness.toFixed(5)))
    assert.ok(values.has(PEARL_GLAZE.shoulderRoughness.toFixed(5)))
    assert.ok(values.size > 2, 'rounded shoulders supply a smooth native-normal transition')
    const material = createLogoPearlMaterial(mesh.material)
    t.after(() => material.dispose())
    const shader = { uniforms: {}, vertexShader: ShaderLib.physical.vertexShader, fragmentShader: ShaderLib.physical.fragmentShader }
    material.onBeforeCompile(shader, {})
    for (const [key, uniform] of Object.entries(logoPearlUniforms(material))) assert.equal(shader.uniforms[key], uniform)
    const fragment = expandIncludes(shader.fragmentShader)
    const initialize = fragment.indexOf('material.iridescence = iridescence;')
    const gate = fragment.indexOf('material.iridescence *= uPearlTurn;')
    const evaluate = fragment.search(/material\.iridescenceFresnel\w*\s*=\s*evalIridescence/)
    assert.ok(initialize >= 0 && gate > initialize && evaluate > gate, 'the yaw gate must affect native light calculations, not only a late material value')
    assert.ok(shader.fragmentShader.indexOf(logoPearlFragmentRoughness.trim()) < shader.fragmentShader.indexOf('#include <lights_physical_fragment>'))
    const erase = fragment.indexOf('if (uPearlGlowPass > .5) outgoingLight = vec3(0.0);')
    assert.ok(erase > fragment.lastIndexOf('outgoingLight =', erase - 1), 'all native layers are finished before halo suppression')
    assert.ok(erase > fragment.indexOf('clearcoatSpecular * material.clearcoat'))
    assert.ok(erase < fragment.indexOf('gl_FragColor = vec4( outgoingLight'))
    assert.ok(!logoPearlFragmentPhysical.includes('diffuseColor'), 'angle sheen changes specular response rather than tinting ivory diffuse')
    assert.ok(!shader.fragmentShader.includes('uGlassScene') && !shader.vertexShader.includes('uGlass'))
    expandIncludes(shader.vertexShader)
  }
})

await test('turn-only sheen has exact neutral endpoints, reverses without history and leaves all approved variants untouched', t => {
  const { materials } = variants(t)
  const ceramic = materials.filter(material => logoPearlUniforms(material))
  const other = materials.filter(material => !logoPearlUniforms(material))
  const snapshot = material => JSON.stringify([material.toJSON(), logoLEDUniforms(material), logoGlassUniforms(material), logoChromeUniforms(material), logoFrostedUniforms(material)])
  const before = other.map(snapshot), versions = ceramic.map(material => material.version)
  const colors = ceramic.map(material => material.color), physical = ceramic.map(material => material.toJSON())
  const state = () => ceramic.map(material => logoPearlUniforms(material).uPearlTurn.value)
  const values = []
  for (let i = 0; i <= 180; i++) {
    updatePearlLighting(materials, i * Math.PI / 180)
    const turn = state()[0]
    assert.ok(state().every(value => value === turn))
    assert.ok(turn >= 0 && turn <= 1)
    values.push(turn)
    assert.ok(ceramic.every(material => material.iridescence * turn <= .3), 'thin-film contribution stays restrained')
  }
  assert.equal(values[0], 0); assert.equal(values[180], 0)
  assert.ok(values[90] > .99)
  for (let i = 1; i <= 90; i++) assert.ok(values[i] > values[i - 1])
  for (let i = 180; i >= 0; i--) {
    updatePearlLighting(materials, i * Math.PI / 180)
    close(state()[0], values[i]); close(values[i], values[180 - i])
  }
  for (const angle of [0, 1e-6, .2, Math.PI / 2, Math.PI - 1e-6, Math.PI]) {
    updatePearlLighting(materials, angle - 1e-7); const left = state()
    updatePearlLighting(materials, angle + 1e-7); const right = state()
    left.forEach((value, i) => close(value, right[i], 3e-7))
  }
  for (const angle of [-1, 0, 1e-7, Math.PI - 1e-7, Math.PI, 4, NaN, Infinity]) {
    updatePearlLighting(materials, angle)
    assert.ok(state().every(value => value === 0), 'held endpoints and reduced-motion yaw0 are plain ceramic')
  }
  assert.deepEqual(ceramic.map(material => material.version), versions, 'the angle gate changes no compile-time properties')
  assert.deepEqual(ceramic.map(material => material.toJSON()), physical)
  ceramic.forEach((material, i) => assert.equal(material.color, colors[i]))
  assert.deepEqual(other.map(snapshot), before)
})

await test('ceramic clears native optics only during halo capture and the shared warm charge settles back to zero', t => {
  const { beauty, proxy, materials } = variants(t)
  selectLogoAppearance(beauty, 'pearl'); selectLogoAppearance(proxy, 'pearl')
  const actual = logoMaterials(beauty), reflected = logoMaterials(proxy)
  const suppress = new Function('outgoingLight', 'uPearlGlowPass', `${logoPearlFragmentComposite.replace('vec3(0.0)', '0')} return outgoingLight;`)
  for (const material of [...actual, ...reflected]) {
    const opening = logoOpeningUniforms(material)
    assert.equal(opening.uOpeningGlass.value, 0); assert.equal(opening.uOpeningEmissiveGlass.value, 0)
    assert.deepEqual(opening.uOpeningColor.value.toArray(), profile.openingColor)
    assert.equal(opening.uOpeningGain.value, actual.includes(material) ? 1 : profile.openingReflectionGain)
  }
  setPearlGlowPass(actual, true)
  for (const material of actual) {
    assert.equal(logoPearlUniforms(material).uPearlGlowPass.value, 1)
    for (const nativeRadiance of [0, .2, 1, 1000]) {
      assert.equal(suppress(nativeRadiance, 1), 0, 'even bright reflected particles and ivory diffuse cannot become permanent halo')
      assert.equal(suppress(nativeRadiance, 0), nativeRadiance, 'beauty retains unchanged physical lighting')
    }
  }
  for (const material of reflected) assert.equal(logoPearlUniforms(material).uPearlGlowPass.value, 0)
  updateLogoOpening(materials, .065)
  assert.ok(actual.every(material => logoOpeningUniforms(material).uOpeningTraceStrength.value > 0))
  updateLogoOpening(materials, .4)
  assert.ok(actual.every(material => logoOpeningUniforms(material).uOpeningTraceStrength.value === 0))
  setPearlGlowPass(materials, false)
  assert.ok([...actual, ...reflected].every(material => logoPearlUniforms(material).uPearlGlowPass.value === 0))
  assert.ok(materials.filter(material => !logoPearlUniforms(material)).every(material => {
    const u = logoLEDUniforms(material) ?? logoFrostedUniforms(material) ?? logoChromeUniforms(material)
    return !u || Object.entries(u).filter(([key]) => key.endsWith('GlowPass')).every(([, uniform]) => uniform.value === 0)
  }))
})
