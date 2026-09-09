/** Clear-glass material and native shader wiring checks; no GPU rendering. */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { Box3, FrontSide, MeshPhysicalMaterial, ShaderChunk, ShaderLib, Texture, Vector3 } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import ts from 'typescript'

async function sourceModule(path, replacements = []) {
  let source = await readFile(new URL(path, import.meta.url), 'utf8')
  for (const [from, to] of replacements) source = source.replace(from, to)
  const javascript = ts.transpileModule(source, { compilerOptions: {
    target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext,
  } }).outputText.replace("from 'three'", `from '${import.meta.resolve('three')}'`)
  return `data:text/javascript;base64,${Buffer.from(javascript).toString('base64')}`
}

const base = '../src/components/experiments/water-hero/'
const configUrl = await sourceModule(`${base}waterHeroConfig.ts`)
const colorUrl = await sourceModule(`${base}shaders/underwaterColor.ts`)
const glassUrl = await sourceModule(`${base}shaders/logoGlass.ts`)
const { CRYSTAL_FACE_CURVATURE, logoCrystalFragmentNormal } = await import(glassUrl)
const ledUrl = await sourceModule(`${base}shaders/logoLED.ts`)
const { GLASSMORPH_LOGO_MATERIAL, LOGO_MATERIAL, WS_LOGO_URL } = await import(configUrl)
const { createLogoCrystalMaterial, createLogoGlassMaterial, logoGlassUniforms, bindGlassScene, updateGlassRim } = await import(
  await sourceModule(`${base}logoMaterial.ts`, [
    ["from './waterHeroConfig'", `from '${configUrl}'`],
    ["from './shaders/underwaterColor'", `from '${colorUrl}'`],
    ["from './shaders/logoGlass'", `from '${glassUrl}'`],
    ["from './shaders/logoLED'", `from '${ledUrl}'`],
  ]),
)
const bytes = await readFile(new URL(`../public${WS_LOGO_URL}`, import.meta.url))
const { scene } = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '')
scene.updateMatrixWorld(true)
const meshes = []
scene.traverse(mesh => { if (mesh.isMesh) meshes.push(mesh) })
const size = new Box3().setFromObject(scene).getSize(new Vector3())
const thickness = size.y * 2 / size.x

function expandIncludes(source) {
  return source.replace(/#include <([\w_]+)>/g, (_, name) => {
    assert.equal(typeof ShaderChunk[name], 'string', `native shader chunk ${name} must exist`)
    return expandIncludes(ShaderChunk[name])
  })
}

await test('clear glass retains the physical dielectric path, lower absorption, and untouched cached GLB materials', t => {
  for (const mesh of meshes) {
    const source = mesh.material, before = source.toJSON()
    const clear = createLogoCrystalMaterial(source, thickness)
    const smoked = createLogoGlassMaterial(source, thickness)
    t.after(() => { clear.dispose(); smoked.dispose() })
    const crystalUniforms = logoGlassUniforms(clear), smokedUniforms = logoGlassUniforms(smoked)
    assert.ok(clear instanceof MeshPhysicalMaterial)
    for (const material of [clear, smoked]) {
      assert.ok(Object.hasOwn(material.defines, 'STANDARD'))
      assert.ok(Object.hasOwn(material.defines, 'PHYSICAL'), 'copying a Standard source must retain native IOR/specular support')
      assert.equal(material.metalness, 0)
      assert.equal(material.transmission, 0, 'transparent particles come from the owned scene capture')
      assert.equal(material.side, FrontSide)
      assert.equal(material.transparent, false)
      assert.equal(material.depthWrite, true)
      assert.equal(material.clearcoat, 0)
      assert.deepEqual(material.emissive.toArray(), [0, 0, 0])
      for (const key of ['map', 'normalMap', 'bumpMap', 'roughnessMap']) assert.equal(material[key], null)
    }
    assert.equal(clear.ior, GLASSMORPH_LOGO_MATERIAL.ior)
    assert.equal(smoked.ior, LOGO_MATERIAL.ior)
    assert.equal(clear.iridescence, GLASSMORPH_LOGO_MATERIAL.iridescence)
    assert.equal(smoked.iridescence, 0, 'clear-film reflections must not alter the smoked prototype')
    assert.ok(clear.roughness < smoked.roughness)
    assert.equal(crystalUniforms.uGlassCrystalProfile.value, 1)
    assert.deepEqual(crystalUniforms.uGlassBodyFill.value.toArray(), [0, 0], 'clear faces and their water proxy must not acquire an opaque diffuse undercoat')
    assert.equal(crystalUniforms.uGlassDispersion.value, GLASSMORPH_LOGO_MATERIAL.dispersion)
    assert.equal(crystalUniforms.uGlassInternalReflection.value, GLASSMORPH_LOGO_MATERIAL.internalReflection)
    assert.equal(smokedUniforms.uGlassCrystalProfile.value, 0)
    assert.deepEqual(crystalUniforms.uGlassAbsorption.value.toArray(), [...GLASSMORPH_LOGO_MATERIAL.absorption])
    assert.deepEqual(smokedUniforms.uGlassAbsorption.value.toArray(), [1.65, 1.30, 1.10])
    const clearExtinction = crystalUniforms.uGlassAbsorption.value.toArray()
    const smokedExtinction = smokedUniforms.uGlassAbsorption.value.toArray()
    for (let channel = 0; channel < 3; channel++) {
      const clearFront = Math.exp(-clearExtinction[channel] * thickness)
      const smokedFront = Math.exp(-smokedExtinction[channel] * thickness)
      assert.ok(clearFront > .94 && clearFront < 1, 'clear front faces transmit the captured scene with only a slight tint')
      assert.ok(smokedFront > .45 && smokedFront < .70, 'the earlier smoked attenuation remains unchanged')
      for (let degrees = 0; degrees <= 180; degrees++) {
        const path = thickness / Math.max(.30, Math.abs(Math.cos(degrees * Math.PI / 180)))
        const transmission = Math.exp(-clearExtinction[channel] * path)
        assert.ok(Number.isFinite(transmission) && transmission > .85 && transmission <= 1)
      }
    }
    assert.deepEqual(source.toJSON(), before)
    assert.notEqual(clear.color, source.color)
    assert.notEqual(clear.customProgramCacheKey(), smoked.customProgramCacheKey(), 'variant programs cannot share an incompatible cached shader')
  }
})

await test('clear iridescence modifies native material parameters before lighting and scene transmission precedes output conversion', t => {
  const clear = createLogoCrystalMaterial(meshes[0].material, thickness)
  const smoked = createLogoGlassMaterial(meshes[0].material, thickness)
  t.after(() => { clear.dispose(); smoked.dispose() })
  const shader = { vertexShader: ShaderLib.physical.vertexShader, fragmentShader: ShaderLib.physical.fragmentShader, uniforms: {} }
  clear.onBeforeCompile(shader, {})
  for (const [name, uniform] of Object.entries(logoGlassUniforms(clear))) assert.equal(shader.uniforms[name], uniform)
  const fragment = expandIncludes(shader.fragmentShader)
  const lens = shader.fragmentShader.indexOf('float crystalFaceWeight =')
  assert.ok(lens > shader.fragmentShader.indexOf('#include <normal_fragment_maps>'))
  assert.ok(lens < shader.fragmentShader.indexOf('#include <lights_physical_fragment>'),
    'the optical face normal must affect native reflections and transmission together')
  const initialize = fragment.indexOf('material.iridescence = iridescence;')
  const bevelGate = fragment.indexOf('material.iridescence *= crystalBevel;')
  const evaluate = fragment.search(/material\.iridescenceFresnel\w*\s*=\s*evalIridescence/)
  assert.ok(initialize >= 0 && bevelGate > initialize && evaluate > bevelGate,
    'bevel-only thin-film strength must be set before native Fresnel evaluation')
  assert.ok(fragment.includes('uniform float iridescenceThicknessMinimum;'))
  assert.ok(fragment.includes('uniform float iridescenceThicknessMaximum;'))
  const composite = shader.fragmentShader.indexOf('outgoingLight = totalSpecular + crystalBody + crystalRearReflection;')
  assert.ok(composite > shader.fragmentShader.indexOf('vec3 totalSpecular ='))
  assert.ok(composite < shader.fragmentShader.indexOf('#include <opaque_fragment>'))
  assert.ok(composite < shader.fragmentShader.indexOf('#include <tonemapping_fragment>'))
  assert.ok(composite < shader.fragmentShader.indexOf('#include <colorspace_fragment>'))
  const optics = shader.fragmentShader.slice(shader.fragmentShader.indexOf('vec3 crystalView'), composite)
  assert.ok(!optics.includes('totalDiffuse'), 'clear compositing cannot wash the transparent face with diffuse gray')
  assert.ok(!optics.includes('uGlassRimStrength'), 'crystal edges reflect their environment rather than emit a white outline')
  assert.ok(optics.includes('getIBLRadiance(insideView, rearNormal, roughness)'), 'a second interface must use the actual environment')
  const oldShader = { vertexShader: ShaderLib.physical.vertexShader, fragmentShader: ShaderLib.physical.fragmentShader, uniforms: {} }
  smoked.onBeforeCompile(oldShader, {})
  assert.ok(!oldShader.fragmentShader.includes('material.iridescence *= crystalBevel;'))
  assert.ok(!oldShader.fragmentShader.includes('float crystalFaceWeight ='), 'the old smoked profile must retain its original normals')
})

await test('clear face lensing stays shallow, continuous and subordinate to the rounded shoulders', t => {
  const { scale, xx, zz, xz } = CRYSTAL_FACE_CURVATURE
  let maximumTilt = 0, maximumUvBend = 0
  const projection = 1 / Math.tan(32 * Math.PI / 360)
  for (const mesh of meshes) {
    const position = mesh.geometry.attributes.position, normal = mesh.geometry.attributes.normal
    for (let i = 0; i < position.count; i++) {
      if (Math.abs(normal.getY(i)) < .9999) continue
      const x = position.getX(i) * scale, z = position.getZ(i) * scale
      const slopeX = xx * x + xz * z, slopeZ = zz * z + xz * x
      maximumTilt = Math.max(maximumTilt, Math.atan(Math.hypot(slopeX, slopeZ)))
      // View the same front/back face straight on. The XZ perturbation is
      // transformed through the existing 90-degree presentation rotation.
      const opticalNormal = new Vector3(-slopeX, slopeZ, 1).normalize()
      const incident = new Vector3(0, 0, -1), eta = 1 / GLASSMORPH_LOGO_MATERIAL.ior
      const dot = opticalNormal.dot(incident), k = 1 - eta * eta * (1 - dot * dot)
      const ray = incident.multiplyScalar(eta).addScaledVector(opticalNormal, -eta * dot - Math.sqrt(k))
      const travel = .5 * projection * thickness / 7.9
      maximumUvBend = Math.max(maximumUvBend, travel * Math.hypot(ray.x, ray.y) / Math.max(.2, -ray.z))
      assert.ok(Number.isFinite(maximumUvBend))
    }
  }
  assert.ok(maximumTilt > .01 && maximumTilt < .025, 'face normal variation is about a degree, not wavy surface deformation')
  assert.ok(maximumUvBend > .0001 && maximumUvBend < .002, 'opening refraction remains subtle and much smaller than the .032 shoulder clamp')
  t.diagnostic(`CPU optical bound: ${(maximumTilt * 180 / Math.PI).toFixed(2)} degree face tilt, ${(maximumUvBend * 1440).toFixed(2)}px maximum bend at a 1440px opening viewport`)
  assert.match(logoCrystalFragmentNormal, /1\.0 - smoothstep\(\.004, \.045, vGlassBevel\)/)
  assert.doesNotMatch(logoCrystalFragmentNormal, /uTime|sin\(|cos\(|noise|totalDiffuse|emissive/)
})

await test('beauty capture bindings do not leak into the clear planar proxy or another material instance', t => {
  const beauty = createLogoCrystalMaterial(meshes[0].material, thickness)
  const proxy = createLogoCrystalMaterial(meshes[0].material, thickness)
  const other = createLogoCrystalMaterial(meshes[1].material, thickness)
  const texture = new Texture()
  t.after(() => { beauty.dispose(); proxy.dispose(); other.dispose(); texture.dispose() })
  const b = logoGlassUniforms(beauty), p = logoGlassUniforms(proxy), o = logoGlassUniforms(other)
  for (const key of Object.keys(b)) assert.notEqual(b[key], p[key], `${key} must belong to one material`)
  bindGlassScene([beauty], texture, 1440, 900)
  assert.equal(b.uGlassScene.value, texture)
  assert.equal(b.uGlassReady.value, 1)
  assert.deepEqual(b.uGlassResolution.value.toArray(), [1440, 900])
  for (const uniforms of [p, o]) {
    assert.equal(uniforms.uGlassScene.value, null)
    assert.equal(uniforms.uGlassReady.value, 0)
    assert.deepEqual(uniforms.uGlassResolution.value.toArray(), [1, 1])
  }
  bindGlassScene([beauty], null)
  assert.equal(b.uGlassScene.value, null)
  assert.equal(b.uGlassReady.value, 0)
  assert.deepEqual(b.uGlassResolution.value.toArray(), [1, 1])
})

await test('particle pulse updates never restore the smoked emitted rim on clear glass', t => {
  const clear = createLogoCrystalMaterial(meshes[0].material, thickness)
  const proxy = createLogoCrystalMaterial(meshes[0].material, thickness)
  const smoked = createLogoGlassMaterial(meshes[0].material, thickness)
  t.after(() => { clear.dispose(); proxy.dispose(); smoked.dispose() })
  const crystalUniforms = [logoGlassUniforms(clear), logoGlassUniforms(proxy)]
  const snapshot = uniforms => ({
    rimColor: uniforms.uGlassRimColor.value.toArray(),
    rimStrength: uniforms.uGlassRimStrength.value,
    absorption: uniforms.uGlassAbsorption.value.toArray(),
    fill: uniforms.uGlassBodyFill.value.toArray(),
    dispersion: uniforms.uGlassDispersion.value,
  })
  const before = crystalUniforms.map(snapshot)
  let smokedPeak = 0
  for (let time = 0; time <= 60; time += .25) {
    for (const underwater of [0, .5, 1]) {
      updateGlassRim([clear, proxy, smoked], time, underwater)
      for (let i = 0; i < crystalUniforms.length; i++) {
        assert.equal(crystalUniforms[i].uGlassRimStrength.value, 0)
        assert.deepEqual(snapshot(crystalUniforms[i]), before[i])
      }
      smokedPeak = Math.max(smokedPeak, logoGlassUniforms(smoked).uGlassRimStrength.value)
    }
  }
  assert.ok(smokedPeak > LOGO_MATERIAL.rimStrength, 'smoked pulses still update while clear reflections remain unlit')
})
