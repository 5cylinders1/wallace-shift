/** Render-pass contracts and actual LED uniform ownership with mocked draws.
 * These checks do not verify shader rasterization or the halo's appearance. */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import {
  ACESFilmicToneMapping, AddEquation, BoxGeometry, Color, CustomBlending, FogExp2, Group,
  HalfFloatType, LinearFilter, LinearSRGBColorSpace, Matrix4, Mesh, MeshBasicMaterial,
  MeshStandardMaterial, NoToneMapping, OneFactor, PerspectiveCamera, Scene,
  WebGLRenderTarget, ZeroFactor,
} from 'three'
import { transpileModule } from 'typescript'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

const base = new URL('../src/components/experiments/water-hero/', import.meta.url)
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
const load = name => sourceUrl(new URL(`${name}.ts`, base)).then(url => import(url))
const { createOpeningFrame, installLogoOpening, logoOpeningUniforms, updateLogoOpening } = await load('logoOpening')
const { createLogoLEDMaterial, createLogoCrystalMaterial, logoLEDUniforms, updateLEDLighting } = await load('logoMaterial')
const { createLogoChromeMaterial, logoChromeUniforms, updateChromeLighting } = await load('logoChrome')
const { createLogoFrostedMaterial, logoFrostedUniforms, updateFrostedLighting } = await load('logoFrosted')
const { createLogoPearlMaterial, logoPearlUniforms, updatePearlLighting } = await load('logoPearl')
const { createLogoCopperMaterial } = await load('logoCopper')
const { createLogoMercuryMaterial, logoMercuryUniforms, updateMercuryLighting } = await load('logoMercury')
const { createLogoCutLightMaterial, logoCutLightUniforms } = await load('logoCutLight')
const { NODE_NAMES } = await load('waterHeroConfig')
const { createLEDGlow, renderLEDGlow, LED_GLOW_LAYER, LED_GLOW_GAIN, LED_GLOW_RADIUS_CSS, ledGlowBlurShader } =
  await load('logoLEDGlow')
const bytes = await readFile(new URL('../public/models/ws_logo.glb', import.meta.url))
const { scene: sourceLogo } = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '')
sourceLogo.updateMatrixWorld(true)
const sourceLeft = sourceLogo.getObjectByName(NODE_NAMES.left)
const chromeFrame = createOpeningFrame(sourceLeft, sourceLogo.getObjectByName(NODE_NAMES.root))

function fixture({ failAt = 0, offscreen = false, waterVisible = true, proxyVisible = true, appearance = 'led' } = {}) {
  const scene = new Scene(), camera = new PerspectiveCamera(32, 16 / 9, .025, 400)
  camera.position.set(.3, .1, 7.9)
  camera.lookAt(0, .54, 0); camera.updateMatrixWorld()
  camera.layers.enable(2); camera.layers.enable(3); camera.layers.enable(7)
  const copper = appearance === 'copper'
  const frosted = appearance === 'frosted', glass = appearance === 'glass' || frosted || copper, chrome = appearance === 'chrome'
  const pearl = appearance === 'pearl'
  const mercury = appearance === 'mercury'
  const cutlight = appearance === 'cutlight'
  const geometry = chrome || mercury || cutlight ? sourceLeft.geometry.clone() : new BoxGeometry(), source = new MeshStandardMaterial()
  const led = cutlight ? createLogoCutLightMaterial(source, chromeFrame, geometry) : mercury ? createLogoMercuryMaterial(source, chromeFrame, geometry) : copper ? createLogoCopperMaterial(source, .43) : pearl ? createLogoPearlMaterial(source) : frosted ? createLogoFrostedMaterial(source, .43) : glass ? createLogoCrystalMaterial(source, .43)
    : chrome ? createLogoChromeMaterial(source, chromeFrame, geometry) : createLogoLEDMaterial(source)
  const proxyMaterial = cutlight ? createLogoCutLightMaterial(source, chromeFrame, geometry, true) : mercury ? createLogoMercuryMaterial(source, chromeFrame, geometry, true) : copper ? createLogoCopperMaterial(source, .43, true) : pearl ? createLogoPearlMaterial(source) : frosted ? createLogoFrostedMaterial(source, .43, true) : glass ? createLogoCrystalMaterial(source, .43)
    : chrome ? createLogoChromeMaterial(source, chromeFrame, geometry, true) : createLogoLEDMaterial(source, true)
  installLogoOpening(led, new Matrix4(), glass)
  installLogoOpening(proxyMaterial, new Matrix4(), glass, true)
  if (frosted) {
    logoOpeningUniforms(led).uOpeningEmissiveGlass.value = 1
    logoOpeningUniforms(proxyMaterial).uOpeningEmissiveGlass.value = 1
  }
  updateLEDLighting([led, proxyMaterial], 12, 0, appearance)
  updateChromeLighting([led, proxyMaterial], 12, 0)
  updateFrostedLighting([led, proxyMaterial], 12, 0)
  updatePearlLighting([led, proxyMaterial], .7)
  updateMercuryLighting([led, proxyMaterial], 12)
  updateLogoOpening([led, proxyMaterial], .065)
  const otherMaterial = new MeshBasicMaterial()
  const sceneRoot = new Group(), proxyRoot = new Group()
  const logoMesh = new Mesh(geometry, led); logoMesh.name = 'logo'; logoMesh.layers.enable(7)
  sceneRoot.add(logoMesh); scene.add(sceneRoot)
  const proxyMesh = new Mesh(geometry, proxyMaterial); proxyMesh.name = 'proxy'; proxyMesh.layers.set(1)
  proxyRoot.add(proxyMesh); proxyRoot.visible = proxyVisible; scene.add(proxyRoot)
  const add = (name, layer) => {
    const mesh = new Mesh(geometry, otherMaterial); mesh.name = name; mesh.layers.set(layer); scene.add(mesh); return mesh
  }
  const water = add('water', 0); water.visible = waterVisible
  add('sky', 0); add('fog', 2); add('particles', 3); add('alien reserved-layer mesh', LED_GLOW_LAYER)
  scene.background = new Color(.02, .03, .04)
  scene.fog = new FogExp2('#010304', .03)
  scene.overrideMaterial = new MeshBasicMaterial()
  const previous = {
    background: scene.background, fog: scene.fog, override: scene.overrideMaterial, mask: camera.layers.mask,
    projection: camera.projectionMatrix.clone(), world: camera.matrixWorld.clone(), layerMasks: [],
  }
  scene.traverse(object => previous.layerMasks.push([object, object.layers.mask]))
  const initialTarget = offscreen ? new WebGLRenderTarget(320, 180) : null
  let target = initialTarget, face = 2, mip = 3, draws = 0, alpha = .4
  const clear = new Color(.1, .2, .3), glow = createLEDGlow(512, 288)
  const renderer = {
    xr: { enabled: true }, toneMapping: ACESFilmicToneMapping,
    autoClear: false, autoClearColor: false, autoClearDepth: false, autoClearStencil: true,
    getSize: out => out.set(1440, 810),
    getClearColor: out => out.copy(clear), getClearAlpha: () => alpha,
    setClearColor(value, nextAlpha) { clear.copy(value); alpha = nextAlpha },
    getRenderTarget: () => target, getActiveCubeFace: () => face, getActiveMipmapLevel: () => mip,
    setRenderTarget(value, nextFace = 0, nextMip = 0) { target = value; face = nextFace; mip = nextMip },
    render(actualScene, actualCamera) {
      draws++
      const phase = (draws - 1) % 4 + 1
      assert.equal(renderer.xr.enabled, false)
      if (phase === 1) {
        assert.equal(actualScene, scene); assert.equal(actualCamera, camera)
        assert.equal(target, glow.maskTarget); assert.equal(camera.layers.mask, 1 << LED_GLOW_LAYER)
        assert.equal(scene.background, null); assert.equal(scene.fog, null); assert.equal(scene.overrideMaterial, null)
        assert.deepEqual(clear.toArray(), [0, 0, 0]); assert.equal(alpha, 0)
        assert.equal(renderer.toneMapping, NoToneMapping); assert.equal(renderer.autoClear, true)
        if (cutlight) {
          assert.equal(logoCutLightUniforms(led).uCutGlowPass.value, 1)
          assert.equal(logoCutLightUniforms(proxyMaterial).uCutGlowPass.value, 0)
        } else if (mercury) {
          assert.equal(logoMercuryUniforms(led).uMercuryGlowPass.value, 1)
          assert.equal(logoMercuryUniforms(proxyMaterial).uMercuryGlowPass.value, 0)
        } else if (pearl) {
          assert.equal(logoPearlUniforms(led).uPearlGlowPass.value, 1)
          assert.equal(logoPearlUniforms(proxyMaterial).uPearlGlowPass.value, 0)
        } else if (frosted) {
          assert.equal(logoFrostedUniforms(led).uFrostedGlowPass.value, 1)
          assert.equal(logoFrostedUniforms(proxyMaterial).uFrostedGlowPass.value, 0)
        } else if (chrome) {
          assert.equal(logoChromeUniforms(led).uChromeGlowPass.value, 1)
          assert.equal(logoChromeUniforms(proxyMaterial).uChromeGlowPass.value, 0)
        } else if (!glass) {
          assert.equal(logoLEDUniforms(led).uLEDGlowPass.value, 1)
          assert.equal(logoLEDUniforms(proxyMaterial).uLEDGlowPass.value, 0)
        }
        assert.equal(logoOpeningUniforms(led).uOpeningGlowPass.value, 1)
        assert.equal(logoOpeningUniforms(proxyMaterial).uOpeningGlowPass.value, 0)
        const visible = []
        scene.traverseVisible(object => {
          if (object.isMesh && camera.layers.test(object.layers)) visible.push(object.name)
        })
        assert.deepEqual(visible, ['logo'], 'no particles, sky, fog, proxy, water or unrelated layer-4 mesh enters the mask')
      } else {
        assert.equal(actualScene, glow.quadScene); assert.equal(actualCamera, glow.quadCamera)
        if (cutlight) assert.equal(logoCutLightUniforms(led).uCutGlowPass.value, 0)
        else if (mercury) assert.equal(logoMercuryUniforms(led).uMercuryGlowPass.value, 0)
        else if (pearl) assert.equal(logoPearlUniforms(led).uPearlGlowPass.value, 0)
        else if (frosted) assert.equal(logoFrostedUniforms(led).uFrostedGlowPass.value, 0)
        else if (chrome) assert.equal(logoChromeUniforms(led).uChromeGlowPass.value, 0)
        else if (!glass) assert.equal(logoLEDUniforms(led).uLEDGlowPass.value, 0)
        assert.equal(logoOpeningUniforms(led).uOpeningGlowPass.value, 0)
        if (phase === 4) {
          assert.equal(target, initialTarget); assert.equal(face, 2); assert.equal(mip, 3)
          assert.equal(glow.quad.material, glow.overlayMaterial)
          assert.equal(renderer.autoClear, false); assert.equal(renderer.toneMapping, ACESFilmicToneMapping)
          assert.equal(renderer.autoClearColor, false); assert.equal(renderer.autoClearDepth, false)
          assert.equal(renderer.autoClearStencil, true)
          assert.equal(scene.background, previous.background); assert.equal(scene.fog, previous.fog)
          assert.equal(scene.overrideMaterial, previous.override); assert.equal(camera.layers.mask, previous.mask)
          assert.deepEqual(clear.toArray(), [.1, .2, .3]); assert.equal(alpha, .4)
          assert.equal(water.visible, waterVisible); assert.equal(proxyRoot.visible, proxyVisible)
          for (const [object, mask] of previous.layerMasks) assert.equal(object.layers.mask, mask)
        } else {
          assert.equal(glow.quad.material, glow.blurMaterial)
          assert.equal(renderer.toneMapping, NoToneMapping); assert.equal(renderer.autoClear, true)
          const direction = glow.blurMaterial.uniforms.uDirection.value
          if (phase === 2) {
            assert.equal(target, glow.horizontalTarget)
            assert.equal(glow.blurMaterial.uniforms.uSource.value, glow.maskTarget.texture)
            assert.equal(direction.y, 0)
            assert.ok(Math.abs(direction.x * 3.2307692308 * 1440 - LED_GLOW_RADIUS_CSS) < 1e-10)
          } else {
            assert.equal(target, glow.blurTarget)
            assert.equal(glow.blurMaterial.uniforms.uSource.value, glow.horizontalTarget.texture)
            assert.equal(direction.x, 0)
            assert.ok(Math.abs(direction.y * 3.2307692308 * 810 - LED_GLOW_RADIUS_CSS) < 1e-10)
          }
          assert.notEqual(glow.blurMaterial.uniforms.uSource.value, target.texture, 'blur never reads its own output')
        }
      }
      if (draws === failAt) throw new Error('injected LED draw failure')
    },
  }
  const restored = () => {
    assert.equal(target, initialTarget); assert.equal(face, 2); assert.equal(mip, 3)
    assert.equal(scene.background, previous.background); assert.equal(scene.fog, previous.fog)
    assert.equal(scene.overrideMaterial, previous.override); assert.equal(camera.layers.mask, previous.mask)
    assert.equal(water.visible, waterVisible); assert.equal(proxyRoot.visible, proxyVisible)
    for (const [object, mask] of previous.layerMasks) assert.equal(object.layers.mask, mask)
    assert.deepEqual(camera.matrixWorld, previous.world); assert.deepEqual(camera.projectionMatrix, previous.projection)
    assert.equal(renderer.toneMapping, ACESFilmicToneMapping); assert.equal(renderer.xr.enabled, true)
    assert.equal(renderer.autoClear, false); assert.equal(renderer.autoClearColor, false)
    assert.equal(renderer.autoClearDepth, false); assert.equal(renderer.autoClearStencil, true)
    assert.deepEqual(clear.toArray(), [.1, .2, .3]); assert.equal(alpha, .4)
    if (cutlight) {
      assert.equal(logoCutLightUniforms(led).uCutGlowPass.value, 0)
      assert.equal(logoCutLightUniforms(proxyMaterial).uCutGlowPass.value, 0)
    } else if (mercury) {
      assert.equal(logoMercuryUniforms(led).uMercuryGlowPass.value, 0)
      assert.equal(logoMercuryUniforms(proxyMaterial).uMercuryGlowPass.value, 0)
    } else if (pearl) {
      assert.equal(logoPearlUniforms(led).uPearlGlowPass.value, 0)
      assert.equal(logoPearlUniforms(proxyMaterial).uPearlGlowPass.value, 0)
    } else if (frosted) {
      assert.equal(logoFrostedUniforms(led).uFrostedGlowPass.value, 0)
      assert.equal(logoFrostedUniforms(proxyMaterial).uFrostedGlowPass.value, 0)
    } else if (chrome) {
      assert.equal(logoChromeUniforms(led).uChromeGlowPass.value, 0)
      assert.equal(logoChromeUniforms(proxyMaterial).uChromeGlowPass.value, 0)
    } else if (!glass) {
      assert.equal(logoLEDUniforms(led).uLEDGlowPass.value, 0)
      assert.equal(logoLEDUniforms(proxyMaterial).uLEDGlowPass.value, 0)
    }
    assert.equal(logoOpeningUniforms(led).uOpeningGlowPass.value, 0)
    assert.equal(logoOpeningUniforms(proxyMaterial).uOpeningGlowPass.value, 0)
    assert.equal(glow.layerNodes.length, 0); assert.equal(glow.logoObjects.size, 0)
  }
  return {
    run: () => renderLEDGlow(renderer, scene, camera, glow, { sceneRoot, proxyRoot }, water),
    restored, glow, sceneRoot, getDraws: () => draws,
    dispose() {
      geometry.dispose(); source.dispose(); led.dispose(); proxyMaterial.dispose(); otherMaterial.dispose()
      previous.override.dispose(); initialTarget?.dispose(); glow.dispose()
    },
  }
}

await test('only authored LED emission is blurred, then added to untouched beauty with all capture state restored', () => {
  for (const offscreen of [false, true]) {
    const f = fixture({ offscreen })
    f.run(); f.restored(); assert.equal(f.getDraws(), 4)
    f.run(); f.restored(); assert.equal(f.getDraws(), 8, 'all targets are reused')
    f.dispose()
  }
})

await test('mask, both blur passes and overlay failures always restore state and reset actual LED uniforms', () => {
  for (const appearance of ['led', 'electric', 'glass', 'chrome', 'frosted', 'pearl', 'copper', 'mercury', 'cutlight']) for (const failAt of [1, 2, 3, 4]) {
    const f = fixture({ failAt, waterVisible: false, proxyVisible: false, appearance })
    assert.throws(f.run, /injected LED draw failure/)
    assert.equal(f.getDraws(), failAt)
    f.restored(); f.dispose()
  }
})

await test('every appearance captures the shared opening charge without leaking its glow flag into beauty or the proxy', () => {
  for (const appearance of ['led', 'electric', 'glass', 'chrome', 'frosted', 'pearl', 'copper', 'mercury', 'cutlight']) {
    const f = fixture({ appearance })
    f.run(); f.restored(); assert.equal(f.getDraws(), 4)
    f.dispose()
  }
})

await test('a hidden logo adds no halo or offscreen rendering', () => {
  const f = fixture()
  f.sceneRoot.visible = false
  f.run(); assert.equal(f.getDraws(), 0); f.restored(); f.dispose()
})

await test('halo retains full blurred emission and preserves beauty alpha with bounded HDR targets', () => {
  const weights = [...ledGlowBlurShader.matchAll(/\.rgb \* ([.\d]+);/g)].map(match => Number(match[1]))
  assert.equal(weights.length, 5)
  assert.ok(Math.abs(weights.reduce((sum, weight) => sum + weight, 0) - 1) < 1e-9)
  assert.ok(LED_GLOW_GAIN >= .10 && LED_GLOW_GAIN <= .16)
  assert.ok(LED_GLOW_RADIUS_CSS >= 8 && LED_GLOW_RADIUS_CSS <= 16)
  for (const [width, height] of [[512, 288], [384, 216], [118, 256]]) {
    const glow = createLEDGlow(width, height)
    let targetDisposals = 0, materialDisposals = 0, geometryDisposals = 0
    for (const target of [glow.maskTarget, glow.horizontalTarget, glow.blurTarget]) {
      assert.equal(target.width, width); assert.equal(target.height, height)
      assert.equal(target.texture.type, HalfFloatType); assert.equal(target.texture.colorSpace, LinearSRGBColorSpace)
      assert.equal(target.texture.minFilter, LinearFilter); assert.equal(target.texture.generateMipmaps, false)
      target.addEventListener('dispose', () => targetDisposals++)
    }
    assert.equal(glow.maskTarget.depthBuffer, true)
    assert.equal(glow.horizontalTarget.depthBuffer, false); assert.equal(glow.blurTarget.depthBuffer, false)
    for (const material of [glow.blurMaterial, glow.overlayMaterial]) {
      assert.equal(material.depthTest, false); assert.equal(material.depthWrite, false); assert.equal(material.toneMapped, false)
      material.addEventListener('dispose', () => materialDisposals++)
    }
    const overlay = glow.overlayMaterial
    assert.equal(overlay.blending, CustomBlending)
    assert.equal(overlay.blendEquation, AddEquation)
    assert.equal(overlay.blendSrc, OneFactor); assert.equal(overlay.blendDst, OneFactor)
    assert.equal(overlay.blendEquationAlpha, AddEquation)
    assert.equal(overlay.blendSrcAlpha, ZeroFactor); assert.equal(overlay.blendDstAlpha, OneFactor)
    assert.equal(overlay.uniforms.uGlow.value, glow.blurTarget.texture)
    assert.equal(overlay.uniforms.uGain.value, LED_GLOW_GAIN)
    assert.equal(overlay.uniforms.uMask, undefined, 'a sharp core mask must not cut into the blurred silhouette')
    assert.match(overlay.fragmentShader, /vec4\(texture2D\(uGlow, vUv\)\.rgb \* uGain, 0\.0\);\s*#include <colorspace_fragment>/,
      'scale full HDR emission before encoding, with RGB addition independent of source alpha')
    glow.quadGeometry.addEventListener('dispose', () => geometryDisposals++)
    glow.dispose()
    assert.equal(targetDisposals, 3); assert.equal(materialDisposals, 2); assert.equal(geometryDisposals, 1)
    assert.equal(glow.quadScene.children.length, 0)
  }
})
