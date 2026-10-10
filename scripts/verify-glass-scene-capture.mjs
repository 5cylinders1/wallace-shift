/** Verify pass isolation, ordering, particle depth selection and cleanup with
 * real Three objects and mocked draws. Does not claim GPU glass correctness. */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import {
  ACESFilmicToneMapping, BoxGeometry, Color, FrontSide, Group, HalfFloatType,
  LinearMipmapLinearFilter, LinearSRGBColorSpace, Mesh, MeshBasicMaterial,
  NoToneMapping, PerspectiveCamera, Scene, Vector2, Vector3, WebGLRenderTarget,
} from 'three'
import { transpileModule } from 'typescript'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

const modules = new Map()
async function sourceUrl(url) {
  if (modules.has(url.href)) return modules.get(url.href)
  let javascript = transpileModule(await readFile(url, 'utf8'), { compilerOptions: { target: 9, module: 7 } }).outputText
  for (const match of [...javascript.matchAll(/from ['"]([^'"]+)['"]/g)]) {
    const specifier = match[1]
    const resolved = specifier.startsWith('.')
      ? await sourceUrl(new URL(`${specifier}.ts`, url)) : import.meta.resolve(specifier)
    javascript = javascript.replace(match[0], `from '${resolved}'`)
  }
  const result = `data:text/javascript;base64,${Buffer.from(javascript).toString('base64')}`
  modules.set(url.href, result)
  return result
}
const sourceBase = new URL('../src/components/experiments/water-hero/', import.meta.url)
const load = name => sourceUrl(new URL(`${name}.ts`, sourceBase)).then(url => import(url))
const { createGlassSceneCapture, captureGlassScene, updateGlassParticleCapture,
  updateGlassDepthGuard, GLASS_DEPTH_LAYER, GLASS_BACKGROUND_LAYER, glassParticleCaptureGLSL } = await load('glassSceneCapture')
const { createLogoMaterialVariants, logoVariantMaterials, selectLogoAppearance, disposeLogoMaterialVariants } = await load('logoMaterialVariants')
const { logoMaterials, logoGlassUniforms, bindGlassScene } = await load('logoMaterial')

function fixture({ failAt = 0, previousMarker = false, waterVisible = true } = {}) {
  const scene = new Scene(), camera = new PerspectiveCamera(32, 16 / 9, .025, 400)
  camera.position.set(.3, -1.5, 7)
  camera.lookAt(0, -1.5, 0)
  camera.updateMatrixWorld()
  camera.layers.enable(2); camera.layers.enable(3); camera.layers.enable(7)
  if (previousMarker) camera.userData.glassCapture = { existing: true }
  const originalMarker = camera.userData.glassCapture
  const geometry = new BoxGeometry(), material = new MeshBasicMaterial()
  const sceneRoot = new Group(), proxyRoot = new Group()
  for (const [root, layer] of [[sceneRoot, 0], [proxyRoot, 1]]) {
    root.name = layer === 0 ? 'logo' : 'proxy'
    root.layers.set(layer)
    const mesh = new Mesh(geometry, material); mesh.layers.set(layer); mesh.layers.enable(7)
    mesh.name = root.name; mesh.position.x = .3
    root.add(mesh); scene.add(root)
  }
  const add = (name, layer) => {
    const mesh = new Mesh(geometry, material); mesh.name = name; mesh.layers.set(layer); scene.add(mesh); return mesh
  }
  const water = add('water', 0)
  water.visible = waterVisible
  add('sky', 0); add('fog volume', 2); add('particles', 3)
  add('unrelated depth-layer object', GLASS_DEPTH_LAYER)
  add('fog banks', 2).layers.enable(GLASS_BACKGROUND_LAYER)
  scene.background = new Color(.02, .04, .06)
  scene.overrideMaterial = new MeshBasicMaterial()
  const previous = {
    background: scene.background, override: scene.overrideMaterial, mask: camera.layers.mask,
    projection: camera.projectionMatrix.clone(), world: camera.matrixWorld.clone(),
    layerMasks: [],
  }
  scene.traverse(object => previous.layerMasks.push([object, object.layers.mask]))
  const capture = createGlassSceneCapture(640, 360)
  const initialTarget = new WebGLRenderTarget(11, 13)
  let target = initialTarget, face = 2, mip = 3, draws = 0
  const clear = new Color(.1, .2, .3)
  let alpha = .4
  const uniforms = {
    uGlassCaptureActive: { value: 0 }, uGlassFrontDepth: { value: null },
    uGlassCaptureResolution: { value: new Vector2(1, 1) },
    uGlassFallbackDepth: { value: 1 },
  }
  const renderer = {
    xr: { enabled: true }, toneMapping: ACESFilmicToneMapping,
    autoClear: false, autoClearColor: false, autoClearDepth: false, autoClearStencil: true,
    getClearAlpha: () => alpha,
    getClearColor: out => out.copy(clear),
    setClearAlpha(value) { alpha = value },
    setClearColor(value, nextAlpha) { clear.copy(value); alpha = nextAlpha },
    getRenderTarget: () => target, getActiveCubeFace: () => face, getActiveMipmapLevel: () => mip,
    setRenderTarget(value, nextFace = 0, nextMip = 0) { target = value; face = nextFace; mip = nextMip },
    render(actualScene, actualCamera) {
      draws++
      assert.equal(actualScene, scene); assert.equal(actualCamera, camera)
      assert.equal(renderer.xr.enabled, false)
      assert.equal(renderer.toneMapping, NoToneMapping)
      assert.equal(renderer.autoClear, true); assert.equal(renderer.autoClearDepth, true)
      assert.equal(alpha, 1)
      assert.equal(water.visible, false); assert.equal(proxyRoot.visible, false)
      const visible = []
      scene.traverseVisible(object => {
        if (object.isMesh && camera.layers.test(object.layers)) visible.push(object.name)
      })
      if (target === capture.depthTarget) {
        assert.equal(camera.layers.mask, 1 << GLASS_DEPTH_LAYER)
        assert.equal(scene.overrideMaterial, capture.depthMaterial)
        assert.equal(scene.background, null)
        assert.deepEqual(visible, ['logo'])
      } else {
        assert.equal(target, capture.colorTarget)
        assert.equal(scene.overrideMaterial, null)
        assert.equal(scene.background, previous.background)
        assert.deepEqual(visible, ['sky', 'particles', 'fog banks'])
        assert.equal(camera.userData.glassCapture, capture.particlePass)
        updateGlassParticleCapture(camera, uniforms)
        assert.equal(uniforms.uGlassCaptureActive.value, 1)
        assert.equal(uniforms.uGlassFrontDepth.value, capture.depthTarget.depthTexture)
        assert.deepEqual(uniforms.uGlassCaptureResolution.value.toArray(), [640, 360])
        assert.equal(uniforms.uGlassFallbackDepth.value, capture.particlePass.fallbackDepth)
        assert.ok(uniforms.uGlassFallbackDepth.value > 0 && uniforms.uGlassFallbackDepth.value < 1)
      }
      if (draws === failAt) throw new Error('injected glass draw failure')
    },
  }
  const restored = () => {
    assert.equal(target, initialTarget); assert.equal(face, 2); assert.equal(mip, 3)
    assert.equal(scene.background, previous.background); assert.equal(scene.overrideMaterial, previous.override)
    assert.equal(sceneRoot.visible, true); assert.equal(proxyRoot.visible, true); assert.equal(water.visible, waterVisible)
    assert.equal(camera.layers.mask, previous.mask)
    for (const [object, mask] of previous.layerMasks) assert.equal(object.layers.mask, mask)
    assert.deepEqual(camera.matrixWorld, previous.world); assert.deepEqual(camera.projectionMatrix, previous.projection)
    assert.equal(Object.hasOwn(camera.userData, 'glassCapture'), previousMarker)
    assert.equal(camera.userData.glassCapture, originalMarker)
    assert.equal(renderer.xr.enabled, true); assert.equal(renderer.toneMapping, ACESFilmicToneMapping)
    assert.equal(renderer.autoClear, false); assert.equal(renderer.autoClearColor, false)
    assert.equal(renderer.autoClearDepth, false); assert.equal(renderer.autoClearStencil, true)
    assert.deepEqual(clear.toArray(), [.1, .2, .3]); assert.equal(alpha, .4)
    assert.equal(capture.depthNodes.length, 0, 'no stale graph masks survive a capture')
    assert.equal(capture.logoObjects.size, 0, 'no stale scene objects survive a capture')
  }
  return {
    run: () => captureGlassScene(renderer, scene, camera, capture, { sceneRoot, proxyRoot }, water),
    restored, capture, camera, uniforms, getDraws: () => draws,
    dispose() { geometry.dispose(); material.dispose(); previous.override.dispose(); initialTarget.dispose(); capture.dispose() },
  }
}

await test('glass captures front depth then particles and distant fog, excluding logo and foreground volume', () => {
  const f = fixture()
  const color = f.run()
  assert.equal(color, f.capture.colorTarget.texture)
  assert.equal(f.getDraws(), 2)
  f.restored()
  updateGlassParticleCapture(f.camera, f.uniforms)
  assert.equal(f.uniforms.uGlassCaptureActive.value, 0)
  assert.equal(f.uniforms.uGlassFrontDepth.value, null, 'beauty cannot keep sampling capture depth')
  assert.equal(f.uniforms.uGlassFallbackDepth.value, 1, 'beauty cannot retain the capture cutoff')
  updateGlassParticleCapture({ userData: { particleReflection: true } }, f.uniforms)
  assert.equal(f.uniforms.uGlassCaptureActive.value, 0, 'reflection probes never reuse a glass capture flag')
  f.run()
  assert.equal(f.getDraws(), 4, 'targets are reused on subsequent frames')
  f.restored()
  f.dispose()
})

await test('both failed passes restore existing state and hidden-water state exactly', () => {
  for (const failAt of [1, 2]) {
    const f = fixture({ failAt, previousMarker: true, waterVisible: false })
    assert.throws(f.run, /injected glass draw failure/)
    f.restored()
    f.dispose()
  }
})

await test('capture target sizes, HDR filtering, front faces and resource lifetimes are bounded', () => {
  for (const [width, height] of [[1024, 576], [640, 360], [384, 683]]) {
    const capture = createGlassSceneCapture(width, height)
    assert.equal(capture.depthTarget.width, width); assert.equal(capture.depthTarget.height, height)
    assert.equal(capture.colorTarget.width, width); assert.equal(capture.colorTarget.height, height)
    assert.equal(capture.colorTarget.texture.type, HalfFloatType)
    assert.equal(capture.colorTarget.texture.colorSpace, LinearSRGBColorSpace)
    assert.equal(capture.colorTarget.texture.generateMipmaps, true)
    assert.equal(capture.colorTarget.texture.minFilter, LinearMipmapLinearFilter)
    assert.equal(capture.depthMaterial.side, FrontSide)
    assert.equal(capture.depthMaterial.colorWrite, false)
    assert.equal(capture.depthMaterial.depthWrite, true)
    let targetsDisposed = 0, materialsDisposed = 0
    for (const target of [capture.depthTarget, capture.colorTarget]) target.addEventListener('dispose', () => targetsDisposed++)
    capture.depthMaterial.addEventListener('dispose', () => materialsDisposed++)
    capture.dispose()
    assert.equal(targetsDisposed, 2); assert.equal(materialsDisposed, 1)
  }
})

await test('projected particle depth keeps rear transmission and excludes foreground grains at bent sample UVs', () => {
  const match = glassParticleCaptureGLSL.match(/bool glassParticleInFront\(float particleDepth, float frontDepth\)\s*\{([^}]*)\}/)
  assert.ok(match)
  const rejects = new Function('particleDepth', 'frontDepth', match[1])
  const depthMatch = glassParticleCaptureGLSL.match(/float glassCaptureDepth\(float frontDepth, float fallbackDepth\)\s*\{([^}]*)\}/)
  assert.ok(depthMatch)
  const selectDepth = new Function('frontDepth', 'fallbackDepth', depthMatch[1])
  for (const aspect of [390 / 844, 16 / 9]) {
    const camera = new PerspectiveCamera(32, aspect, .025, 400)
    camera.position.set(0, -1.5, 7)
    camera.lookAt(0, -1.5, 0); camera.updateMatrixWorld()
    const projectDepth = z => new Vector3(0, -1.5, z).project(camera).z * .5 + .5
    const front = projectDepth(.10)
    assert.equal(rejects(projectDepth(2), front), true, 'foreground grain only appears in beauty')
    assert.equal(rejects(projectDepth(-2), front), false, 'rear grain appears through the glass')
    assert.equal(rejects(front, front), true, 'coplanar grain avoids a duplicate edge')
    const fallback = projectDepth(-.10)
    assert.equal(selectDepth(front, fallback), front, 'the real visible front keeps its exact depth')
    assert.equal(rejects(projectDepth(2), selectDepth(1, fallback)), true,
      'a bent UV outside the silhouette cannot pull foreground grains into transmission')
    assert.equal(rejects(projectDepth(-2), selectDepth(1, fallback)), false,
      'rear particles remain available outside the silhouette')
  }
})

await test('the conservative cutoff follows transformed pieces through rotation, split and near-camera bounds', () => {
  const capture = createGlassSceneCapture(390, 844)
  const geometry = new BoxGeometry(1.3, 1.6, .2), material = new MeshBasicMaterial()
  const root = new Group(), left = new Mesh(geometry, material), right = new Mesh(geometry, material)
  root.add(left, right)
  const camera = new PerspectiveCamera(32, 390 / 844, .025, 400)
  camera.position.set(0, 0, 7); camera.lookAt(0, 0, 0); camera.updateMatrixWorld()
  for (const rotation of [0, Math.PI * .5, Math.PI]) {
    root.rotation.y = rotation
    for (const split of [0, 4, 25]) {
      left.position.x = -split; right.position.x = split
      updateGlassDepthGuard(root, camera, capture)
      const depth = capture.particlePass.fallbackDepth
      assert.ok(Number.isFinite(depth) && depth >= 0 && depth < 1)
      const farCorner = new Vector3(capture.bounds.max.x, capture.bounds.max.y, capture.bounds.min.z).project(camera)
      assert.ok(depth >= Math.min(.999999, farCorner.z * .5 + .5) - 1e-9)
    }
  }
  camera.position.z = .001; camera.updateMatrixWorld()
  updateGlassDepthGuard(root, camera, capture)
  assert.ok(Number.isFinite(capture.particlePass.fallbackDepth))
  root.visible = false
  updateGlassDepthGuard(root, camera, capture)
  assert.equal(capture.particlePass.fallbackDepth, 1, 'an absent logo does not cut the background')
  geometry.dispose(); material.dispose(); capture.dispose()
})

await test('glass routing uses a separate conditional lifetime, per-draw gates and beauty-only foreground fog', async () => {
  const base = '../src/components/experiments/water-hero/'
  const [water, bank, foreground, burst, flow] = await Promise.all(
    ['WaterSurface.tsx', 'SurfaceFog.tsx', 'ForegroundMist.tsx', 'UnderwaterBurst.tsx', 'UnderwaterFlow.tsx']
      .map(name => readFile(new URL(base + name, import.meta.url), 'utf8')),
  )
  assert.match(water, /const glassCapture = useDisposable\(\(\) => \{\s*if \(!glassEnabled\) return null/)
  assert.match(water, /bindGlassScene\(value.boundMaterials, null\)\s*value.dispose\(\)/,
    'capture disposal unbinds the old glass materials even after an appearance switch')
  assert.ok(water.indexOf('captureGlassScene(gl, scene, camera') < water.indexOf('if (!surfaceVisible)'))
  assert.match(water, /const openingGlow = !reducedMotion && sceneState.progress > OPENING_REVEAL.traceStart\s*&& sceneState.progress < OPENING_REVEAL.surfaceEnd/)
  assert.match(water, /const glassEnabled = appearance === 'glass' \|\| appearance === 'frosted'/)
  assert.match(water, /\[glassEnabled, bufferSize, quality.refractionSize\]/,
    'switching between optical looks keeps the same capture lifetime')
  const captureExpression = water.match(/const glassEnabled = ([^\n]+)/)?.[1]
  const glowExpression = water.match(/const glowEnabled = ([^\n]+(?:\n[ \t]*(?:\|\||&&)[^\n]+)*)/)?.[1]
  assert.ok(captureExpression && glowExpression)
  const captureEnabled = new Function('appearance', `return ${captureExpression}`)
  const glowEnabled = new Function('appearance', 'openingGlow', `return ${glowExpression}`)
  for (const appearance of ['led', 'electric', 'glass', 'chrome', 'frosted', 'pearl', 'copper', 'mercury', 'cutlight', 'studio']) {
    assert.equal(captureEnabled(appearance), appearance === 'glass' || appearance === 'frosted' || appearance === 'copper' || appearance === 'studio',
      'opaque ceramic and mercury cannot allocate or render a glass background capture')
    assert.equal(glowEnabled(appearance, true), true, 'every look participates in the shared opening light')
    assert.equal(glowEnabled(appearance, false), appearance !== 'glass' && appearance !== 'pearl' && appearance !== 'copper' && appearance !== 'mercury' && appearance !== 'studio',
      'non-emissive glass, copper, ceramic and mercury skip the settled halo passes')
  }
  assert.match(water, /if \(glowEnabled && sceneState.progress < .98\) renderLEDGlow/)
  assert.match(water, /if \(glowEnabled\) renderLEDGlow/)
  assert.match(bank, /mesh.layers.enable\(GLASS_BACKGROUND_LAYER\)/)
  assert.doesNotMatch(foreground, /GLASS_BACKGROUND_LAYER|glassCapture/)
  for (const source of [bank, burst, flow]) {
    assert.match(source, /\$\{glassParticleCaptureGLSL\}/)
    assert.match(source, /if \(glassCaptureRejectsParticle\(\)\) discard;/)
    assert.match(source, /onBeforeRender[\s\S]*updateGlassParticleCapture\(camera,/)
    assert.match(source, /uGlassFallbackDepth: \{ value: 1 \}/)
  }
  assert.match(burst, /if \(worldY >= -.025\) discard;/)
  assert.match(flow, /if \(fragmentY >= -.008\) discard;/)
})

await test('Glass, Frosted, Copper and Studio reuse capture storage while releasing inactive bindings, including failed captures', async t => {
  const water = await readFile(new URL('WaterSurface.tsx', sourceBase), 'utf8')
  const bindingBlock = water.match(/if \(glassEnabled && \(reducedMotion \|\| sceneState\.progress < \.98\)\) \{([\s\S]*?)\n    \}/)?.[1]
  assert.ok(bindingBlock, 'exercise the actual frame-loop rebinding block')
  const bindFrame = new Function('glassCapture', 'logoNodes', 'gl', 'scene', 'camera', 'mesh',
    'logoMaterials', 'bindGlassScene', 'captureGlassScene', bindingBlock)
  const bytes = await readFile(new URL('../public/models/ws_logo.glb', import.meta.url))
  const { scene: source } = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '')
  const sceneRoot = source.clone(true), proxyRoot = source.clone(true), nodes = { sceneRoot, proxyRoot }
  createLogoMaterialVariants(sceneRoot, .432916)
  createLogoMaterialVariants(proxyRoot, .432916, true)
  const optical = logoVariantMaterials(sceneRoot).filter(material => logoGlassUniforms(material))
  const reflected = logoVariantMaterials(proxyRoot).filter(material => logoGlassUniforms(material))
  assert.equal(optical.length, 7, 'clear, frosted and copper cover both pieces; Studio transmits only through its slash')
  const capture = { ...createGlassSceneCapture(640, 360), boundMaterials: [] }
  const originalTargets = [capture.depthTarget, capture.colorTarget]
  let draws = 0, failure = false
  const draw = (_gl, _scene, _camera, target) => {
    draws++
    assert.equal(target, capture)
    assert.deepEqual([target.depthTarget, target.colorTarget], originalTargets)
    for (const material of optical) {
      assert.equal(logoGlassUniforms(material).uGlassReady.value, 0, 'previous active materials unbind before the next capture')
      assert.equal(logoGlassUniforms(material).uGlassScene.value, null)
    }
    if (failure) throw new Error('injected shared optical capture failure')
    return target.colorTarget.texture
  }
  t.after(() => {
    bindGlassScene(capture.boundMaterials, null); capture.dispose()
    disposeLogoMaterialVariants(sceneRoot); disposeLogoMaterialVariants(proxyRoot)
  })
  const selected = new Map()
  for (const look of ['glass', 'frosted', 'copper', 'studio', 'glass', 'frosted', 'copper', 'studio']) {
    selectLogoAppearance(sceneRoot, look); selectLogoAppearance(proxyRoot, look)
    const active = logoMaterials(sceneRoot)
    if (selected.has(look)) assert.deepEqual(active, selected.get(look))
    else selected.set(look, active)
    bindFrame(capture, nodes, {}, {}, {}, {}, logoMaterials, bindGlassScene, draw)
    assert.deepEqual(capture.boundMaterials, active)
    for (const material of optical) {
      const uniforms = logoGlassUniforms(material), expected = active.includes(material)
      assert.equal(uniforms.uGlassReady.value, expected ? 1 : 0)
      assert.equal(uniforms.uGlassScene.value, expected ? capture.colorTarget.texture : null)
    }
    for (const material of reflected) assert.equal(logoGlassUniforms(material).uGlassScene.value, null,
      'neither water proxy receives the beauty-camera background')
  }
  assert.equal(draws, 8)
  for (const look of ['glass', 'frosted', 'copper', 'studio']) {
    selectLogoAppearance(sceneRoot, look)
    failure = true
    assert.throws(() => bindFrame(capture, nodes, {}, {}, {}, {}, logoMaterials, bindGlassScene, draw), /injected shared optical capture failure/)
    for (const material of optical) assert.equal(logoGlassUniforms(material).uGlassScene.value, null)
    failure = false
    bindFrame(capture, nodes, {}, {}, {}, {}, logoMaterials, bindGlassScene, draw)
  }
  selectLogoAppearance(sceneRoot, 'pearl')
  bindGlassScene(capture.boundMaterials, null)
  bindGlassScene(logoMaterials(sceneRoot), capture.colorTarget.texture, 640, 360)
  assert.ok(logoMaterials(sceneRoot).every(material => !logoGlassUniforms(material)),
    'sharing rounded geometry cannot register ceramic as transmissive')
  for (const material of optical) {
    assert.equal(logoGlassUniforms(material).uGlassReady.value, 0)
    assert.equal(logoGlassUniforms(material).uGlassScene.value, null, 'final cleanup leaves no dangling capture reference in an inactive look')
  }
})
