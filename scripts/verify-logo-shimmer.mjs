/** Historical command name retained. Tests smoked glass ownership and bounded
 * particle reflections using Three objects and mock draws, not GPU renders. */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { ACESFilmicToneMapping, BoxGeometry, Color, CubeCamera, FrontSide, HalfFloatType, Mesh,
  MeshPhysicalMaterial, MeshStandardMaterial, NoToneMapping, Scene, ShaderLib, Texture, Vector3,
  Vector4, WebGLCoordinateSystem, WebGLCubeRenderTarget, WebGLRenderTarget } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import ts from 'typescript'

async function sourceModule(path, replacements = []) {
  let source = await readFile(new URL(path, import.meta.url), 'utf8')
  for (const [from, to] of replacements) source = source.replace(from, to)
  const javascript = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext },
  }).outputText.replace("from 'three'", `from '${import.meta.resolve('three')}'`)
  return `data:text/javascript;base64,${Buffer.from(javascript).toString('base64')}`
}
const configURL = await sourceModule('../src/components/experiments/water-hero/waterHeroConfig.ts')
const { LOGO_MATERIAL, REFLECTION_PROXY_MATERIAL, WS_LOGO_URL } = await import(configURL)
const colorURL = await sourceModule('../src/components/experiments/water-hero/shaders/underwaterColor.ts')
const glassURL = await sourceModule('../src/components/experiments/water-hero/shaders/logoGlass.ts')
const ledURL = await sourceModule('../src/components/experiments/water-hero/shaders/logoLED.ts')
const materialURL = await sourceModule('../src/components/experiments/water-hero/logoMaterial.ts', [
  ["from './waterHeroConfig'", `from '${configURL}'`],
  ["from './shaders/underwaterColor'", `from '${colorURL}'`],
  ["from './shaders/logoGlass'", `from '${glassURL}'`],
  ["from './shaders/logoLED'", `from '${ledURL}'`],
])
const { logoMaterials, createLogoGlassMaterial, logoGlassUniforms, bindGlassScene, updateGlassRim } = await import(materialURL)
const fogURL = await sourceModule('../src/components/experiments/water-hero/surfaceFogField.ts')
const layerURL = await sourceModule('../src/components/experiments/water-hero/waterRenderLayers.ts', [
  ["from './surfaceFogField'", `from '${fogURL}'`],
])
const { SUBMERGED_PARTICLE_LAYER } = await import(layerURL)
const reflectionURL = await sourceModule('../src/components/experiments/water-hero/particleReflection.ts', [
  ["from './waterRenderLayers'", `from '${layerURL}'`],
])
const { PARTICLE_REFLECTION_BUDGET, particleReflectionActive, particleReflectionDue,
  createParticleReflection, captureParticleReflection } = await import(reflectionURL)
const { createCanopySeeds } = await import(await sourceModule('../src/components/experiments/water-hero/canopyField.ts'))
const { updatePointDrawScale } = await import(await sourceModule('../src/components/experiments/water-hero/pointDrawScale.ts'))
const bytes = await readFile(new URL(`../public${WS_LOGO_URL}`, import.meta.url))
const json = JSON.parse(bytes.toString('utf8', 20, 20 + bytes.readUInt32LE(12)))
const authored = json.materials.find(material => material.name === 'WS_BlackMetal')
const { scene: asset } = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '')

await test('smoked glass owns its material and leaves the cached GLB and surface maps unchanged', () => {
  const pbr = authored.pbrMetallicRoughness
  assert.equal(REFLECTION_PROXY_MATERIAL, LOGO_MATERIAL)
  for (const original of logoMaterials(asset)) {
    const material = createLogoGlassMaterial(original, .433)
    assert.ok(material instanceof MeshPhysicalMaterial)
    assert.deepEqual(material.color.toArray(), LOGO_MATERIAL.baseColor)
    assert.equal(material.metalness, 0)
    assert.equal(material.roughness, LOGO_MATERIAL.roughness)
    assert.equal(material.ior, LOGO_MATERIAL.ior)
    assert.equal(material.side, FrontSide)
    assert.equal(material.transmission, 0, 'avoid native opaque-only capture and its redundant pass')
    assert.equal(material.transparent, false)
    assert.equal(material.depthWrite, true, 'front fog/particles composite once over the transmitted background')
    assert.equal(material.emissive.getHex(), 0, 'emission is confined to the authored bevel shader')
    for (const key of ['map', 'normalMap', 'bumpMap', 'roughnessMap', 'metalnessMap']) assert.equal(material[key], null)
    assert.deepEqual(original.color.toArray(), pbr.baseColorFactor.slice(0, 3))
    assert.equal(original.metalness, pbr.metallicFactor)
    assert.equal(original.roughness, pbr.roughnessFactor)
    material.dispose()
  }
})

await test('the physical shader keeps native specular and adds refraction before tone mapping', () => {
  for (const original of logoMaterials(asset)) {
    const material = createLogoGlassMaterial(original, .433)
    const shader = { vertexShader: ShaderLib.physical.vertexShader, fragmentShader: ShaderLib.physical.fragmentShader, uniforms: {} }
    material.onBeforeCompile(shader, {})
    assert.match(shader.vertexShader, /vGlassBevel = 1.0 - abs\(normalize\(objectNormal\).y\)/)
    assert.match(shader.fragmentShader, /outgoingLight = totalSpecular \+ glassBody \+ glassRim/)
    assert.ok(shader.fragmentShader.indexOf('outgoingLight = totalSpecular + glassBody + glassRim') < shader.fragmentShader.indexOf('#include <tonemapping_fragment>'))
    assert.equal(shader.uniforms.uGlassReady, logoGlassUniforms(material).uGlassReady)
    assert.doesNotMatch(shader.fragmentShader, /sweep|simplex|fbm|grain/i)
    material.dispose()
  }
})

await test('scene refraction binds only beauty materials and unbinds without recompiling', () => {
  const original = logoMaterials(asset)[0]
  const beauty = createLogoGlassMaterial(original, .433), proxy = createLogoGlassMaterial(original, .433)
  const texture = new Texture(), version = beauty.version
  bindGlassScene([beauty], texture, 768, 432)
  assert.equal(logoGlassUniforms(beauty).uGlassScene.value, texture)
  assert.equal(logoGlassUniforms(beauty).uGlassReady.value, 1)
  assert.deepEqual(logoGlassUniforms(beauty).uGlassResolution.value.toArray(), [768, 432])
  assert.equal(logoGlassUniforms(proxy).uGlassScene.value, null)
  assert.equal(logoGlassUniforms(proxy).uGlassReady.value, 0)
  bindGlassScene([beauty], null)
  assert.equal(logoGlassUniforms(beauty).uGlassReady.value, 0)
  assert.equal(beauty.version, version)
  beauty.dispose(); proxy.dispose(); texture.dispose()
})

await test('rim light stays restrained and follows the particle palette continuously', () => {
  const material = createLogoGlassMaterial(logoMaterials(asset)[0], .433)
  const uniforms = logoGlassUniforms(material)
  for (const time of [0, 1, 5.6, 20, 1000]) {
    updateGlassRim([material], time, 0)
    assert.deepEqual(uniforms.uGlassRimColor.value.toArray(), LOGO_MATERIAL.rimColor)
    assert.equal(uniforms.uGlassRimStrength.value, LOGO_MATERIAL.rimStrength)
  }
  const colors = new Set()
  for (let i = 0; i < 2800; i++) {
    updateGlassRim([material], i / 100, 1)
    const color = uniforms.uGlassRimColor.value.toArray()
    colors.add(color.map(value => value.toFixed(2)).join(','))
    assert.ok(color.every(value => Number.isFinite(value) && value >= 0 && value <= 1))
    assert.ok(uniforms.uGlassRimStrength.value >= LOGO_MATERIAL.rimStrength)
    assert.ok(uniforms.uGlassRimStrength.value <= LOGO_MATERIAL.rimStrength * 1.201)
    updateGlassRim([material], i / 100 + 1e-5, 1)
    assert.ok(uniforms.uGlassRimColor.value.toArray().every((value, index) => Math.abs(value - color[index]) < .0001))
  }
  assert.ok(colors.size > 100)
  material.dispose()
})

await test('capture budgets remain bounded across stops, jumps and reduced motion', () => {
  assert.equal(particleReflectionActive(.3, 0, false), false)
  assert.equal(particleReflectionActive(.49, .9, false), false)
  assert.equal(particleReflectionActive(.6, 1, true), false)
  assert.equal(particleReflectionActive(.6, 1, false), true)
  assert.equal(particleReflectionActive(.98, 1, false), false)
  for (const tier of ['high', 'medium', 'low']) {
    let last = -Infinity, captures = 0
    for (let frame = 0; frame < 1200; frame++) {
      const now = frame / 120, progress = frame % 3 === 0 ? .9 : .5
      if (particleReflectionActive(progress, 1, false) && particleReflectionDue(now, last, tier)) { last = now; captures++ }
    }
    assert.ok(captures <= PARTICLE_REFLECTION_BUDGET[tier].capturesPerSecond * 10)
    assert.ok(PARTICLE_REFLECTION_BUDGET[tier].size <= 128)
  }
})

await test('real canopy particles project into cube faces and gain detail at the revised capture size', t => {
  const seeds = createCanopySeeds(6000)
  const point = new Vector3(), view = new Vector3(), projected = new Vector3(), viewport = new Vector4()
  for (const logoY of [-1.5, -2.8, -4.15]) {
    const detail = []
    for (const size of [64, PARTICLE_REFLECTION_BUDGET.high.size]) {
      const target = new WebGLCubeRenderTarget(size), cube = new CubeCamera(.08, 40, target)
      cube.coordinateSystem = WebGLCoordinateSystem
      cube.updateCoordinateSystem()
      cube.position.y = logoY
      cube.updateMatrixWorld(true)
      const uniforms = { uPointScale: { value: 0 }, uPixelRatio: { value: 0 } }
      const coverage = Array(6).fill(0)
      let readable = 0, forwardMetalCone = 0
      for (const seed of seeds) {
        if (seed.soft) continue
        point.set(seed.x, seed.y, seed.z)
        for (let side = 0; side < cube.children.length; side++) {
          const camera = cube.children[side]
          view.copy(point).applyMatrix4(camera.matrixWorldInverse)
          projected.copy(point).project(camera)
          if (view.z > -.08 || view.z < -40 || Math.abs(projected.x) > 1 || Math.abs(projected.y) > 1) continue
          updatePointDrawScale({ getCurrentViewport: value => value.set(0, 0, size, size) }, camera, uniforms, viewport, 844)
          assert.ok(uniforms.uPointScale.value > 0, 'negative cube FOV must not erase sprites')
          const diameter = seed.size * uniforms.uPointScale.value / -view.z
          coverage[side]++
          if (diameter > .25) readable++
          if (side === 4 && Math.abs(projected.x) < .35 && Math.abs(projected.y) < .35) forwardMetalCone++
        }
      }
      assert.ok(coverage.every(count => count > 0), 'all six directions contain real scene particles')
      assert.ok(forwardMetalCone > 0, 'particles also inhabit the visible face reflection directions')
      detail.push(readable)
      target.dispose()
    }
    assert.ok(detail[1] > detail[0] * 1.5, 'larger cube resolves substantially more of the existing particle volume')
    t.diagnostic(`logo Y ${logoY}: ${detail[0]} → ${detail[1]} of 6000 seeds exceed 0.25 pixel (64px → 128px capture; CPU projection only)`)
  }
})

function captureFixture() {
  const scene = new Scene()
  scene.background = new Color(.01, .02, .03)
  scene.backgroundIntensity = .14; scene.backgroundBlurriness = .4
  scene.backgroundRotation.set(.1, .2, .3); scene.environmentRotation.set(.4, .5, .6)
  const geometry = new BoxGeometry(), material = new MeshStandardMaterial()
  for (const [name, layer] of [['real logo', 0], ['proxy logo', 1], ['air fog', 2], ['particles', SUBMERGED_PARTICLE_LAYER], ['water', 0]]) {
    const object = new Mesh(geometry, material); object.name = name; object.layers.set(layer); scene.add(object)
  }
  const studio = new Texture(), initialTarget = new WebGLRenderTarget(16, 16)
  let target = initialTarget, face = 3, mip = 2, draws = 0, fail = false
  const renderer = {
    coordinateSystem: WebGLCoordinateSystem, isWebGLRenderer: true,
    state: { buffers: { depth: { getReversed: () => false } } },
    xr: { enabled: true }, toneMapping: ACESFilmicToneMapping,
    autoClear: false, autoClearColor: false, autoClearDepth: false, autoClearStencil: true,
    getRenderTarget: () => target, getActiveCubeFace: () => face, getActiveMipmapLevel: () => mip,
    setRenderTarget(next, nextFace = 0, nextMip = 0) { target = next; face = nextFace; mip = nextMip },
    render(capturedScene, camera) {
      draws++
      assert.equal(capturedScene, scene)
      assert.equal(scene.background, studio)
      assert.equal(scene.backgroundIntensity, 1)
      assert.equal(renderer.toneMapping, NoToneMapping)
      assert.deepEqual(scene.children.filter(child => camera.layers.test(child.layers)).map(child => child.name), ['particles'])
      assert.equal(camera.layers.mask, 1 << SUBMERGED_PARTICLE_LAYER)
      assert.equal(camera.userData.particleReflection, true, 'only probe draws receive reflection radiance compensation')
      if (fail) throw new Error('simulated cube draw failure')
    },
  }
  const probe = createParticleReflection(renderer, 'high')
  let filters = 0
  probe.pmrem.fromCubemap = (texture, previous) => {
    filters++
    assert.equal(texture, probe.cube.texture)
    assert.equal(texture.pmremVersion, filters, 'actual CubeCamera invalidates radiance after each set of six faces')
    return previous ?? new WebGLRenderTarget(192, 256)
  }
  const previous = { background: scene.background, intensity: scene.backgroundIntensity, blur: scene.backgroundBlurriness,
    rotation: scene.backgroundRotation.clone() }
  const restored = () => {
    assert.equal(target, initialTarget); assert.equal(face, 3); assert.equal(mip, 2)
    assert.equal(scene.background, previous.background)
    assert.equal(scene.backgroundIntensity, previous.intensity); assert.equal(scene.backgroundBlurriness, previous.blur)
    assert.deepEqual(scene.backgroundRotation, previous.rotation)
    assert.equal(renderer.toneMapping, ACESFilmicToneMapping); assert.equal(renderer.xr.enabled, true)
    assert.equal(renderer.autoClear, false); assert.equal(renderer.autoClearColor, false)
    assert.equal(renderer.autoClearDepth, false); assert.equal(renderer.autoClearStencil, true)
  }
  return { scene, studio, renderer, probe, restored, counts: () => ({ draws, filters }),
    fail: () => { fail = true }, dispose: () => { geometry.dispose(); material.dispose(); studio.dispose(); initialTarget.dispose(); probe.dispose() } }
}

await test('all six cube faces capture only particles and refresh the same owned PMREM target', () => {
  const fixture = captureFixture()
  const { probe, renderer, scene, studio } = fixture
  assert.equal(probe.cube.width, 128); assert.equal(probe.cube.texture.type, HalfFloatType)
  assert.equal(probe.cube.texture.generateMipmaps, false)
  captureParticleReflection(renderer, scene, probe, studio, new Vector3(0, -2, 0))
  const first = probe.filtered
  assert.deepEqual(probe.camera.position.toArray(), [0, -2, 0])
  fixture.restored()
  captureParticleReflection(renderer, scene, probe, studio, new Vector3(0, -3, 0))
  assert.equal(probe.filtered, first)
  assert.deepEqual(fixture.counts(), { draws: 12, filters: 2 })
  fixture.restored()
  let disposedCube = 0, disposedFiltered = 0
  probe.cube.addEventListener('dispose', () => disposedCube++)
  probe.filtered.addEventListener('dispose', () => disposedFiltered++)
  fixture.dispose()
  assert.equal(disposedCube, 1); assert.equal(disposedFiltered, 1)
})

await test('a failed cube draw restores the scene and renderer state', () => {
  const fixture = captureFixture()
  fixture.fail()
  assert.throws(() => captureParticleReflection(fixture.renderer, fixture.scene, fixture.probe, fixture.studio, new Vector3()), /simulated cube draw failure/)
  fixture.restored()
  fixture.dispose()
})
