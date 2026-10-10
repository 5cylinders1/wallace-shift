/** Real cloned GLB/material lifecycle checks. No browser or GPU appearance claim. */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { Plane, ShaderLib, Texture, Vector3 } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import ts from 'typescript'

const modules = new Map()
async function sourceModule(url) {
  if (modules.has(url.href)) return modules.get(url.href)
  let javascript = ts.transpileModule(await readFile(url, 'utf8'), { compilerOptions: {
    target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext,
  } }).outputText
  for (const match of [...javascript.matchAll(/from ['"]([^'"]+)['"]/g)]) {
    const specifier = match[1]
    const resolved = specifier.startsWith('.')
      ? await sourceModule(new URL(`${specifier}.ts`, url)) : import.meta.resolve(specifier)
    javascript = javascript.replace(match[0], `from '${resolved}'`)
  }
  const result = `data:text/javascript;base64,${Buffer.from(javascript).toString('base64')}`
  modules.set(url.href, result)
  return result
}
const base = new URL('../src/components/experiments/water-hero/', import.meta.url)
const { createLogoMaterialVariants, logoVariantMaterials, selectLogoAppearance, disposeLogoMaterialVariants } =
  await import(await sourceModule(new URL('logoMaterialVariants.ts', base)))
const { logoMaterials, logoGlassUniforms, logoLEDUniforms, bindGlassScene, updateLEDLighting } =
  await import(await sourceModule(new URL('logoMaterial.ts', base)))
const { logoChromeUniforms, updateChromeLighting } =
  await import(await sourceModule(new URL('logoChrome.ts', base)))
const { logoFrostedUniforms } =
  await import(await sourceModule(new URL('logoFrosted.ts', base)))
const { logoPearlUniforms, updatePearlLighting } =
  await import(await sourceModule(new URL('logoPearl.ts', base)))
const { logoCopperUniforms } =
  await import(await sourceModule(new URL('logoCopper.ts', base)))
const { logoMercuryUniforms, updateMercuryLighting } =
  await import(await sourceModule(new URL('logoMercury.ts', base)))
const { logoCutLightUniforms } =
  await import(await sourceModule(new URL('logoCutLight.ts', base)))
const { logoStudioFinish, setStudioGlowPass, STUDIO_BLUE_CRYSTAL_MATERIAL } =
  await import(await sourceModule(new URL('logoStudio.ts', base)))
const { updateLogoOpening, logoOpeningUniforms } =
  await import(await sourceModule(new URL('logoOpening.ts', base)))
const bytes = await readFile(new URL('../public/models/ws_logo.glb', import.meta.url))
const { scene: source } = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '')
const meshes = root => { const list = []; root.traverse(object => { if (object.isMesh) list.push(object) }); return list }

await test('nine styles reuse the same cloned meshes and return to the exact saved material instances', () => {
  const root = source.clone(true), before = root.toJSON(), originals = meshes(root)
  const geometry = originals.map(mesh => mesh.geometry)
  const transforms = originals.map(mesh => [mesh.position.toArray(), mesh.quaternion.toArray(), mesh.scale.toArray()])
  createLogoMaterialVariants(root, .432916)
  const led = logoMaterials(root), all = logoVariantMaterials(root)
  assert.equal(all.length, 18)
  assert.equal(led.length, 2)
  const versions = all.map(material => material.version)
  let glassGeometry, chromeMaterials, frostedMaterials, pearlMaterials, copperMaterials, mercuryMaterials, cutLightMaterials
  // Environment setup includes inactive variants, just as the scene does.
  const texture = new Texture(), clip = new Plane(new Vector3(0, 1, 0), 0)
  all.forEach(material => { material.envMap = texture; material.clippingPlanes = [clip] })
  for (const appearance of ['electric', 'glass', 'frosted', 'pearl', 'copper', 'mercury', 'cutlight', 'chrome', 'led', 'frosted', 'pearl', 'copper', 'mercury', 'cutlight', 'chrome', 'glass', 'electric', 'led']) {
    selectLogoAppearance(root, appearance)
    updateLEDLighting(all, 14.75, .8, appearance)
    updateChromeLighting(all, 14.75, .8)
    updatePearlLighting(all, Math.PI * .4)
    updateMercuryLighting(all, 14.75)
    assert.deepEqual(meshes(root), originals)
    const activeGeometry = originals.map(mesh => mesh.geometry)
    if (appearance === 'glass' || appearance === 'frosted' || appearance === 'pearl' || appearance === 'copper') {
      if (!glassGeometry) glassGeometry = activeGeometry
      assert.deepEqual(activeGeometry, glassGeometry, 'glass, frosted, ceramic and copper share one rounded geometry allocation per mesh')
      activeGeometry.forEach((item, i) => assert.notEqual(item, geometry[i], 'rounded looks use the owned geometry variant'))
    } else {
      activeGeometry.forEach((item, i) => assert.equal(item, geometry[i], 'LED/electric/chrome/mercury/cutlight retain the exact original geometry reference'))
    }
    assert.deepEqual(originals.map(mesh => [mesh.position.toArray(), mesh.quaternion.toArray(), mesh.scale.toArray()]), transforms)
    for (const material of logoMaterials(root)) {
      assert.equal(material.envMap, texture)
      assert.equal(material.clippingPlanes[0], clip)
      assert.equal(material.depthWrite, true)
      assert.equal(material.transparent, false)
      if (appearance === 'glass' || appearance === 'frosted' || appearance === 'copper') {
        assert.ok(logoGlassUniforms(material))
        assert.equal(!!logoFrostedUniforms(material), appearance === 'frosted')
        assert.equal(!!logoCopperUniforms(material), appearance === 'copper')
      }
      else if (appearance === 'cutlight') {
        assert.ok(logoCutLightUniforms(material))
        assert.equal(logoGlassUniforms(material), undefined, 'opaque cut-light material never enters background capture')
      }
      else if (appearance === 'mercury') {
        assert.ok(logoMercuryUniforms(material))
        assert.equal(logoGlassUniforms(material), undefined, 'opaque mercury never enters background capture')
      }
      else if (appearance === 'pearl') {
        assert.ok(logoPearlUniforms(material))
        assert.equal(logoGlassUniforms(material), undefined, 'opaque ceramic never enters background capture')
      }
      else if (appearance === 'chrome') assert.ok(logoChromeUniforms(material))
      else assert.ok(logoLEDUniforms(material))
    }
    if (appearance === 'cutlight') {
      if (!cutLightMaterials) cutLightMaterials = logoMaterials(root)
      assert.deepEqual(logoMaterials(root), cutLightMaterials, 'cut-light retains independent materials across round trips')
      for (const material of cutLightMaterials) assert.ok(!led.includes(material) && !mercuryMaterials.includes(material))
    } else if (appearance === 'mercury') {
      if (!mercuryMaterials) mercuryMaterials = logoMaterials(root)
      assert.deepEqual(logoMaterials(root), mercuryMaterials, 'mercury retains independent materials across round trips')
      for (const material of mercuryMaterials) assert.ok(!led.includes(material) && !chromeMaterials?.includes(material))
    } else if (appearance === 'copper') {
      if (!copperMaterials) copperMaterials = logoMaterials(root)
      assert.deepEqual(logoMaterials(root), copperMaterials, 'copper glass retains independent materials across round trips')
      for (const material of copperMaterials) assert.ok(!led.includes(material) && !frostedMaterials.includes(material))
    } else if (appearance === 'pearl') {
      if (!pearlMaterials) pearlMaterials = logoMaterials(root)
      assert.deepEqual(logoMaterials(root), pearlMaterials, 'ceramic retains its own materials across round trips')
      for (const material of pearlMaterials) assert.ok(!led.includes(material) && !frostedMaterials.includes(material))
    } else if (appearance === 'frosted') {
      if (!frostedMaterials) frostedMaterials = logoMaterials(root)
      assert.deepEqual(logoMaterials(root), frostedMaterials, 'frosted glass retains independent material slots across switches')
      for (const material of frostedMaterials) assert.ok(!led.includes(material))
    } else if (appearance === 'chrome') {
      if (!chromeMaterials) chromeMaterials = logoMaterials(root)
      assert.deepEqual(logoMaterials(root), chromeMaterials, 'chrome uses the same owned slots after every round trip')
      for (const material of chromeMaterials) assert.ok(!led.includes(material), 'chrome cannot mutate either saved LED slot')
    } else if (appearance !== 'glass') assert.deepEqual(logoMaterials(root), led)
    assert.deepEqual(all.map(material => material.version), versions, 'switching selects slots without recompiling or allocating materials')
  }
  createLogoMaterialVariants(root, .432916)
  assert.deepEqual(logoVariantMaterials(root), all, 'repeat setup cannot allocate replacement variants')
  assert.deepEqual(source.toJSON().geometries, before.geometries)
  disposeLogoMaterialVariants(root); texture.dispose()
})

await test('glass binds only the beauty graph and can be unbound while the LED variant is active', () => {
  const root = source.clone(true), proxy = source.clone(true)
  createLogoMaterialVariants(root, .432916)
  createLogoMaterialVariants(proxy, .432916, true)
  const texture = new Texture()
  selectLogoAppearance(root, 'glass'); selectLogoAppearance(proxy, 'glass')
  meshes(root).forEach((mesh, i) => {
    const reflected = meshes(proxy)[i]
    assert.notEqual(mesh.geometry, reflected.geometry, 'each graph owns its glass geometry lifetime')
    assert.deepEqual(mesh.geometry.attributes.position.array, reflected.geometry.attributes.position.array)
    assert.deepEqual(mesh.geometry.attributes.normal.array, reflected.geometry.attributes.normal.array)
  })
  bindGlassScene(logoMaterials(root), texture, 640, 360)
  for (const material of logoMaterials(root)) {
    assert.equal(logoGlassUniforms(material).uGlassScene.value, texture)
    assert.deepEqual(logoGlassUniforms(material).uGlassResolution.value.toArray(), [640, 360])
  }
  for (const material of logoMaterials(proxy)) assert.equal(logoGlassUniforms(material).uGlassReady.value, 0)
  selectLogoAppearance(root, 'led')
  bindGlassScene(logoVariantMaterials(root), null)
  selectLogoAppearance(root, 'glass')
  for (const material of logoMaterials(root)) {
    assert.equal(logoGlassUniforms(material).uGlassReady.value, 0)
    assert.equal(logoGlassUniforms(material).uGlassScene.value, null, 'inactive glass cannot retain a disposed capture target')
  }
  disposeLogoMaterialVariants(root); disposeLogoMaterialVariants(proxy); texture.dispose()
})

await test('Studio keeps a silver W and blue transmissive slash through opening, capture, and saved-Glass round trips', () => {
  const root = source.clone(true), proxy = source.clone(true), texture = new Texture()
  const before = source.toJSON()
  createLogoMaterialVariants(root, .432916)
  createLogoMaterialVariants(proxy, .432916, true)
  selectLogoAppearance(root, 'glass')
  const savedGlass = logoMaterials(root)
  const savedSettings = savedGlass.map(material => material.toJSON())
  const rounded = meshes(root).map(mesh => mesh.geometry)
  selectLogoAppearance(root, 'studio'); selectLogoAppearance(proxy, 'studio')
  const studio = logoMaterials(root), all = logoVariantMaterials(root)
  assert.deepEqual(meshes(root).map(mesh => mesh.geometry), rounded)
  for (const graph of [root, proxy]) for (const mesh of meshes(graph)) {
    const right = mesh.name === 'WS_Right', material = mesh.material
    assert.equal(logoStudioFinish(material), right ? 'crystal' : 'aluminum')
    assert.equal(!!logoGlassUniforms(material), right, 'only the optical slash samples the captured background')
    assert.equal(logoLEDUniforms(material), undefined)
    assert.equal(material.emissive.getHex(), 0)
    assert.equal(material.transmission, 0, 'avoids Three opaque-only native transmission pass')
    assert.equal(material.depthWrite, true)
    assert.equal(material.transparent, false)
    if (right) {
      assert.equal(material.iridescence, 0, 'About crystal does not inherit the saved Glass rainbow coating')
      assert.deepEqual(logoGlassUniforms(material).uGlassAbsorption.value.toArray(), STUDIO_BLUE_CRYSTAL_MATERIAL.absorption)
    } else assert.equal(material.metalness, 1)
  }
  bindGlassScene(studio, texture, 640, 360)
  assert.equal(logoGlassUniforms(root.getObjectByName('WS_Right').material).uGlassScene.value, texture)
  assert.equal(logoGlassUniforms(proxy.getObjectByName('WS_Right').material).uGlassScene.value, null)
  for (const progress of [0, .025, .07, .12, .5, .8, 1, .07, 0]) {
    updateLogoOpening(all, progress)
    updateLEDLighting(all, 14, .8, 'studio')
    assert.deepEqual(logoMaterials(root), studio, 'opening only updates uniforms, never assigns LED or Glass slots')
  }
  const aluminum = root.getObjectByName('WS_Left').material
  const shader = { uniforms: {}, vertexShader: ShaderLib.physical.vertexShader, fragmentShader: ShaderLib.physical.fragmentShader }
  aluminum.onBeforeCompile(shader, {})
  assert.ok(shader.fragmentShader.includes('uniform float uStudioGlowPass;'), 'isolated glow control is declared in the consuming fragment shader')
  assert.ok(shader.fragmentShader.indexOf('if (uStudioGlowPass > .5) outgoingLight') < shader.fragmentShader.indexOf('if (uOpeningGlowPass > .5'), 'clear reflected metal before adding the temporary opening charge')
  setStudioGlowPass(studio, true)
  assert.equal(shader.uniforms.uStudioGlowPass.value, 1)
  setStudioGlowPass(studio, false)
  assert.equal(shader.uniforms.uStudioGlowPass.value, 0)
  assert.equal(logoOpeningUniforms(aluminum).uOpeningGlass.value, 0)
  selectLogoAppearance(root, 'glass')
  bindGlassScene(all, null)
  assert.deepEqual(logoMaterials(root), savedGlass)
  assert.deepEqual(savedGlass.map(material => material.toJSON()), savedSettings, 'the previous homepage material settings are unchanged')
  selectLogoAppearance(root, 'studio')
  assert.deepEqual(logoMaterials(root), studio)
  assert.equal(logoGlassUniforms(root.getObjectByName('WS_Right').material).uGlassScene.value, null)
  assert.deepEqual(source.toJSON(), before, 'no cached GLB material, geometry, or transform was mutated')
  disposeLogoMaterialVariants(root); disposeLogoMaterialVariants(proxy); texture.dispose()
})

await test('cleanup disposes owned material and glass geometry slots without touching the cached GLB', () => {
  const root = source.clone(true), sourceMeshes = meshes(source)
  const sourceMaterials = sourceMeshes.map(mesh => mesh.material)
  const before = sourceMaterials.map(material => material.toJSON())
  let sourceDisposals = 0, geometryDisposals = 0
  const onSourceDispose = () => sourceDisposals++, onGeometryDispose = () => geometryDisposals++
  sourceMaterials.forEach(material => material.addEventListener('dispose', onSourceDispose))
  sourceMeshes.forEach(mesh => mesh.geometry.addEventListener('dispose', onGeometryDispose))
  createLogoMaterialVariants(root, .432916)
  selectLogoAppearance(root, 'glass')
  const glass = meshes(root).map(mesh => mesh.geometry), glassCounts = new Map(glass.map(geometry => [geometry, 0]))
  for (const geometry of glass) geometry.addEventListener('dispose', () => glassCounts.set(geometry, glassCounts.get(geometry) + 1))
  selectLogoAppearance(root, 'led')
  const all = logoVariantMaterials(root), counts = new Map(all.map(material => [material, 0]))
  for (const material of all) material.addEventListener('dispose', () => counts.set(material, counts.get(material) + 1))
  disposeLogoMaterialVariants(root)
  assert.ok([...counts.values()].every(count => count === 1))
  assert.ok([...glassCounts.values()].every(count => count === 1), 'inactive rounded geometry is also released')
  assert.equal(sourceDisposals, 0); assert.equal(geometryDisposals, 0)
  assert.deepEqual(sourceMaterials.map(material => material.toJSON()), before)
  createLogoMaterialVariants(root, .432916)
  selectLogoAppearance(root, 'glass')
  assert.deepEqual(meshes(root).map(mesh => mesh.geometry), glass, 'StrictMode setup reuses retained CPU arrays after GPU disposal')
  sourceMaterials.forEach(material => material.removeEventListener('dispose', onSourceDispose))
  sourceMeshes.forEach(mesh => mesh.geometry.removeEventListener('dispose', onGeometryDispose))
})
