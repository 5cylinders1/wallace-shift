import {
  AddEquation, Color, CustomBlending, HalfFloatType, LinearFilter, LinearSRGBColorSpace,
  Mesh, NoBlending, NoToneMapping, OneFactor, OrthographicCamera, PlaneGeometry,
  Scene, ShaderMaterial, Vector2, WebGLRenderTarget, ZeroFactor,
  type Camera, type Object3D, type WebGLRenderer,
} from 'three'
import { logoMaterials, setLEDGlowPass } from './logoMaterial'
import { setChromeGlowPass } from './logoChrome'
import { setFrostedGlowPass } from './logoFrosted'
import { setPearlGlowPass } from './logoPearl'
import { setMercuryGlowPass } from './logoMercury'
import { setCutLightGlowPass } from './logoCutLight'
import { setStudioGlowPass } from './logoStudio'
import { setOpeningGlowPass } from './logoOpening'
import type { LogoNodes } from './waterHeroTypes'

/** An isolated emission pass, not a threshold applied to the whole scene. */
export const LED_GLOW_LAYER = 4
export const LED_GLOW_GAIN = .12
export const LED_GLOW_RADIUS_CSS = 12

const quadVertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`
// Bilinear sample pairs form a normalized nine-tap Gaussian in five reads.
// The farthest pair spans the declared CSS radius in either direction.
export const ledGlowBlurShader = /* glsl */ `
uniform sampler2D uSource;
uniform vec2 uDirection;
varying vec2 vUv;
void main() {
  vec3 color = texture2D(uSource, vUv).rgb * .2270270270;
  color += texture2D(uSource, vUv + uDirection * 1.3846153846).rgb * .3162162162;
  color += texture2D(uSource, vUv - uDirection * 1.3846153846).rgb * .3162162162;
  color += texture2D(uSource, vUv + uDirection * 3.2307692308).rgb * .0702702703;
  color += texture2D(uSource, vUv - uDirection * 3.2307692308).rgb * .0702702703;
  gl_FragColor = vec4(color, 1.0);
}
`
const overlayFragmentShader = /* glsl */ `
uniform sampler2D uGlow;
uniform float uGain;
varying vec2 vUv;
void main() {
  gl_FragColor = vec4(texture2D(uGlow, vUv).rgb * uGain, 0.0);
  #include <colorspace_fragment>
}
`

/** The caller fits dimensions to its tier cap while retaining screen aspect. */
export function createLEDGlow(width: number, height: number) {
  const options = {
    type: HalfFloatType, colorSpace: LinearSRGBColorSpace, minFilter: LinearFilter,
    magFilter: LinearFilter, generateMipmaps: false, stencilBuffer: false,
  }
  const w = Math.max(2, Math.round(width)), h = Math.max(2, Math.round(height))
  const maskTarget = new WebGLRenderTarget(w, h, { ...options, depthBuffer: true })
  const horizontalTarget = new WebGLRenderTarget(w, h, { ...options, depthBuffer: false })
  const blurTarget = new WebGLRenderTarget(w, h, { ...options, depthBuffer: false })
  const blurMaterial = new ShaderMaterial({
    vertexShader: quadVertexShader, fragmentShader: ledGlowBlurShader,
    depthTest: false, depthWrite: false, toneMapped: false, blending: NoBlending,
    uniforms: { uSource: { value: maskTarget.texture }, uDirection: { value: new Vector2() } },
  })
  const overlayMaterial = new ShaderMaterial({
    vertexShader: quadVertexShader, fragmentShader: overlayFragmentShader,
    depthTest: false, depthWrite: false, toneMapped: false, transparent: true,
    blending: CustomBlending,
    blendEquation: AddEquation, blendSrc: OneFactor, blendDst: OneFactor,
    blendEquationAlpha: AddEquation, blendSrcAlpha: ZeroFactor, blendDstAlpha: OneFactor,
    uniforms: { uGlow: { value: blurTarget.texture }, uGain: { value: LED_GLOW_GAIN } },
  })
  const quadGeometry = new PlaneGeometry(2, 2)
  const quad = new Mesh(quadGeometry, blurMaterial)
  quad.frustumCulled = false
  const quadScene = new Scene()
  quadScene.add(quad)
  const quadCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 1)
  return {
    maskTarget, horizontalTarget, blurTarget, blurMaterial, overlayMaterial,
    quadScene, quadCamera, quad, quadGeometry,
    canvasSize: new Vector2(), savedClearColor: new Color(), black: new Color(0),
    logoObjects: new Set<Object3D>(), layerNodes: [] as { object: Object3D; mask: number }[],
    dispose() {
      maskTarget.dispose(); horizontalTarget.dispose(); blurTarget.dispose()
      blurMaterial.dispose(); overlayMaterial.dispose(); quadGeometry.dispose()
      quadScene.remove(quad)
    },
  }
}

/** Run after beauty. Only logo emission and its opening charge enter the halo;
 * particles, sky, fog and the water reflection never enter a bloom threshold.
 * The LED material clips below-water mask fragments while viewed from air. */
export function renderLEDGlow(
  renderer: WebGLRenderer, scene: Scene, camera: Camera,
  glow: ReturnType<typeof createLEDGlow>,
  nodes: Pick<LogoNodes, 'sceneRoot' | 'proxyRoot'>, water?: Object3D,
) {
  if (!nodes.sceneRoot.visible) return
  const materials = logoMaterials(nodes.sceneRoot)
  const previous = {
    target: renderer.getRenderTarget(), face: renderer.getActiveCubeFace(), mip: renderer.getActiveMipmapLevel(),
    background: scene.background, fog: scene.fog, override: scene.overrideMaterial,
    layers: camera.layers.mask, proxyVisible: nodes.proxyRoot.visible, waterVisible: water?.visible,
    toneMapping: renderer.toneMapping, xr: renderer.xr.enabled,
    autoClear: renderer.autoClear, color: renderer.autoClearColor, depth: renderer.autoClearDepth,
    stencil: renderer.autoClearStencil, clearAlpha: renderer.getClearAlpha(),
  }
  renderer.getClearColor(glow.savedClearColor)
  renderer.getSize(glow.canvasSize)
  const stepX = LED_GLOW_RADIUS_CSS / (3.2307692308 * Math.max(1, glow.canvasSize.x))
  const stepY = LED_GLOW_RADIUS_CSS / (3.2307692308 * Math.max(1, glow.canvasSize.y))
  glow.logoObjects.clear()
  nodes.sceneRoot.traverse(object => glow.logoObjects.add(object))
  glow.layerNodes.length = 0
  try {
    // Strip any pre-existing use of the reserved layer outside this logo too.
    // This makes isolation independent of other experimental scene contents.
    scene.traverse(object => {
      if (!glow.logoObjects.has(object) && !object.layers.isEnabled(LED_GLOW_LAYER)) return
      glow.layerNodes.push({ object, mask: object.layers.mask })
      if (glow.logoObjects.has(object)) object.layers.enable(LED_GLOW_LAYER)
      else object.layers.disable(LED_GLOW_LAYER)
    })
    camera.layers.set(LED_GLOW_LAYER)
    nodes.proxyRoot.visible = false
    if (water) water.visible = false
    scene.background = scene.fog = scene.overrideMaterial = null
    renderer.xr.enabled = false
    renderer.toneMapping = NoToneMapping
    renderer.autoClear = renderer.autoClearColor = renderer.autoClearDepth = true
    renderer.autoClearStencil = false
    renderer.setClearColor(glow.black, 0)
    setLEDGlowPass(materials, true)
    setChromeGlowPass(materials, true)
    setFrostedGlowPass(materials, true)
    setPearlGlowPass(materials, true)
    setMercuryGlowPass(materials, true)
    setCutLightGlowPass(materials, true)
    setStudioGlowPass(materials, true)
    setOpeningGlowPass(materials, true)
    renderer.setRenderTarget(glow.maskTarget)
    renderer.render(scene, camera)
    setLEDGlowPass(materials, false)
    setChromeGlowPass(materials, false)
    setFrostedGlowPass(materials, false)
    setPearlGlowPass(materials, false)
    setMercuryGlowPass(materials, false)
    setCutLightGlowPass(materials, false)
    setStudioGlowPass(materials, false)
    setOpeningGlowPass(materials, false)

    glow.quad.material = glow.blurMaterial
    glow.blurMaterial.uniforms.uSource.value = glow.maskTarget.texture
    glow.blurMaterial.uniforms.uDirection.value.set(stepX, 0)
    glow.blurMaterial.uniformsNeedUpdate = true
    renderer.setRenderTarget(glow.horizontalTarget)
    renderer.render(glow.quadScene, glow.quadCamera)
    glow.blurMaterial.uniforms.uSource.value = glow.horizontalTarget.texture
    glow.blurMaterial.uniforms.uDirection.value.set(0, stepY)
    glow.blurMaterial.uniformsNeedUpdate = true
    renderer.setRenderTarget(glow.blurTarget)
    renderer.render(glow.quadScene, glow.quadCamera)
  } finally {
    setLEDGlowPass(materials, false)
    setChromeGlowPass(materials, false)
    setFrostedGlowPass(materials, false)
    setPearlGlowPass(materials, false)
    setMercuryGlowPass(materials, false)
    setCutLightGlowPass(materials, false)
    setStudioGlowPass(materials, false)
    setOpeningGlowPass(materials, false)
    for (const { object, mask } of glow.layerNodes) object.layers.mask = mask
    glow.layerNodes.length = 0
    glow.logoObjects.clear()
    camera.layers.mask = previous.layers
    nodes.proxyRoot.visible = previous.proxyVisible
    if (water) water.visible = previous.waterVisible!
    scene.background = previous.background
    scene.fog = previous.fog
    scene.overrideMaterial = previous.override
    renderer.toneMapping = previous.toneMapping
    renderer.xr.enabled = previous.xr
    renderer.autoClear = previous.autoClear
    renderer.autoClearColor = previous.color
    renderer.autoClearDepth = previous.depth
    renderer.autoClearStencil = previous.stencil
    renderer.setClearColor(glow.savedClearColor, previous.clearAlpha)
    renderer.setRenderTarget(previous.target, previous.face, previous.mip)
  }

  // Scene/camera/capture flags are already restored before the additive draw.
  // Keep the full blurred emission continuous across the silhouette. Subtracting
  // the sharp mask cuts a dark notch into the glow along the diffuser's edge.
  // Scale radiance before encoding, then add RGB while preserving beauty alpha.
  try {
    renderer.xr.enabled = false
    renderer.autoClear = false
    glow.quad.material = glow.overlayMaterial
    renderer.render(glow.quadScene, glow.quadCamera)
  } finally {
    renderer.xr.enabled = previous.xr
    renderer.autoClear = previous.autoClear
    renderer.setRenderTarget(previous.target, previous.face, previous.mip)
  }
}
