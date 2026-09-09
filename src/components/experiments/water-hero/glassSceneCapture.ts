import {
  Box3, Color, DepthFormat, DepthTexture, FrontSide, HalfFloatType, LinearFilter,
  LinearMipmapLinearFilter, LinearSRGBColorSpace, MeshDepthMaterial, NearestFilter,
  NoBlending, NoToneMapping, UnsignedIntType, Vector2, Vector3, WebGLRenderTarget,
  type Camera, type Object3D, type Scene, type ShaderMaterial, type WebGLRenderer,
} from 'three'
import { SURFACE_FOG_LAYER } from './surfaceFogField'
import type { LogoNodes } from './waterHeroTypes'

/** Reserved for the actual logo's depth prepass, never enabled for beauty. */
export const GLASS_DEPTH_LAYER = 4
/** Distant surface banks opt into transmission; foreground volume stays out. */
export const GLASS_BACKGROUND_LAYER = 5

interface GlassParticlePass {
  depth: DepthTexture
  resolution: Vector2
  fallbackDepth: number
}

/** The same projected front depth that hides rear particles in beauty also
 * excludes foreground particles from glass transmission. Otherwise they
 * would be refracted once and drawn again on top of the logo. */
export const glassParticleCaptureGLSL = /* glsl */ `
uniform sampler2D uGlassFrontDepth;
uniform vec2 uGlassCaptureResolution;
uniform float uGlassCaptureActive;
uniform float uGlassFallbackDepth;
bool glassParticleInFront(float particleDepth, float frontDepth) {
  return frontDepth < 1.0 && particleDepth <= frontDepth + .000001;
}
float glassCaptureDepth(float frontDepth, float fallbackDepth) {
  return frontDepth < 1.0 ? frontDepth : fallbackDepth;
}
bool glassCaptureRejectsParticle() {
  if (uGlassCaptureActive < .5) return false;
  vec2 uv = gl_FragCoord.xy / uGlassCaptureResolution;
  float front = texture2D(uGlassFrontDepth, uv).x;
  // Bent UVs can sample just outside the unbent logo silhouette. Exclude
  // foreground grains there too, using a conservative far-logo cutoff.
  // The exact visible front remains authoritative inside the silhouette.
  front = glassCaptureDepth(front, uGlassFallbackDepth);
  return glassParticleInFront(gl_FragCoord.z, front);
}
`

/** Called for every particle draw, including reflection probes and beauty. */
export function updateGlassParticleCapture(camera: Pick<Camera, 'userData'>, uniforms: ShaderMaterial['uniforms']) {
  const pass = camera.userData.glassCapture as GlassParticlePass | undefined
  uniforms.uGlassCaptureActive.value = pass ? 1 : 0
  uniforms.uGlassFrontDepth.value = pass?.depth ?? null
  uniforms.uGlassFallbackDepth.value = pass?.fallbackDepth ?? 1
  if (pass) (uniforms.uGlassCaptureResolution.value as Vector2).copy(pass.resolution)
}

/** Two owned, adaptive-size targets: front depth and linear HDR radiance.
 * The background has filtered mip levels for the glass's small roughness. */
export function createGlassSceneCapture(width: number, height: number) {
  const depth = new DepthTexture(width, height, UnsignedIntType)
  depth.format = DepthFormat
  depth.minFilter = depth.magFilter = NearestFilter
  const depthTarget = new WebGLRenderTarget(width, height, {
    depthBuffer: true, stencilBuffer: false, depthTexture: depth,
  })
  const colorTarget = new WebGLRenderTarget(width, height, {
    type: HalfFloatType, colorSpace: LinearSRGBColorSpace,
    generateMipmaps: true, minFilter: LinearMipmapLinearFilter, magFilter: LinearFilter,
    depthBuffer: true, stencilBuffer: false,
  })
  const depthMaterial = new MeshDepthMaterial({ side: FrontSide, blending: NoBlending })
  depthMaterial.colorWrite = false
  const particlePass: GlassParticlePass = { depth, resolution: new Vector2(width, height), fallbackDepth: 1 }
  return {
    depthTarget, colorTarget, depthMaterial, particlePass, savedClearColor: new Color(),
    logoObjects: new Set<Object3D>(), bounds: new Box3(), point: new Vector3(),
    depthNodes: [] as { object: Object3D; mask: number }[],
    // WebGLRenderTarget owns and frees its attached depth texture once it
    // has GPU storage. An unrendered target has no GPU allocation to free.
    dispose() { depthTarget.dispose(); colorTarget.dispose(); depthMaterial.dispose() },
  }
}

/** A conservative background-only guard for refracted samples outside the
 * projected silhouette. Recomputed from the actual transformed pieces, so
 * upright rotation, responsive framing and the split use the same bound.
 * It can omit grains within the extrusion slab outside the silhouette;
 * unlike retaining them, it cannot refract foreground grains a second time. */
export function updateGlassDepthGuard(
  root: Object3D, camera: Camera,
  capture: Pick<ReturnType<typeof createGlassSceneCapture>, 'bounds' | 'point' | 'particlePass'>,
) {
  const { bounds, point, particlePass } = capture
  particlePass.fallbackDepth = 1
  if (!root.visible) return
  bounds.setFromObject(root)
  if (bounds.isEmpty()) return
  let farDepth = -Infinity
  for (let corner = 0; corner < 8; corner++) {
    point.set(corner & 1 ? bounds.max.x : bounds.min.x,
      corner & 2 ? bounds.max.y : bounds.min.y,
      corner & 4 ? bounds.max.z : bounds.min.z)
    point.applyMatrix4(camera.matrixWorldInverse)
    if (point.z >= -.00001) continue
    point.applyMatrix4(camera.projectionMatrix)
    const depth = point.z * .5 + .5
    if (Number.isFinite(depth)) farDepth = Math.max(farDepth, depth)
  }
  if (Number.isFinite(farDepth)) particlePass.fallbackDepth = Math.max(0, Math.min(.999999, farDepth))
}

/** Capture before any logo beauty/water draw. Native material transmission
 * remains zero, so Three does not insert its opaque-only transmission pass.
 * Excludes foreground air fog and both logo graphs; water is explicitly hidden to avoid
 * sampling this target while it is being written through water's refraction.
 * No object is reparented and no geometry/material on the GLB is modified. */
export function captureGlassScene(
  renderer: WebGLRenderer, scene: Scene, camera: Camera,
  capture: ReturnType<typeof createGlassSceneCapture>,
  nodes: Pick<LogoNodes, 'sceneRoot' | 'proxyRoot'>, water?: Object3D,
) {
  const previous = {
    target: renderer.getRenderTarget(), face: renderer.getActiveCubeFace(), mip: renderer.getActiveMipmapLevel(),
    background: scene.background, override: scene.overrideMaterial, layers: camera.layers.mask,
    sceneVisible: nodes.sceneRoot.visible, proxyVisible: nodes.proxyRoot.visible, waterVisible: water?.visible,
    toneMapping: renderer.toneMapping, xr: renderer.xr.enabled,
    autoClear: renderer.autoClear, color: renderer.autoClearColor, depth: renderer.autoClearDepth,
    stencil: renderer.autoClearStencil, clearAlpha: renderer.getClearAlpha(),
    hadMarker: Object.hasOwn(camera.userData, 'glassCapture'), marker: camera.userData.glassCapture,
  }
  renderer.getClearColor(capture.savedClearColor)
  const depthNodes = capture.depthNodes
  depthNodes.length = 0
  const logoObjects = capture.logoObjects
  logoObjects.clear()
  nodes.sceneRoot.traverse(object => logoObjects.add(object))
  try {
    renderer.xr.enabled = false
    renderer.toneMapping = NoToneMapping
    renderer.autoClear = renderer.autoClearColor = renderer.autoClearDepth = true
    renderer.autoClearStencil = false
    renderer.setClearAlpha(1)
    if (water) water.visible = false
    nodes.proxyRoot.visible = false

    // Layer selection keeps sky meshes/particles out of the front depth.
    // Preserve preexisting layer memberships even after a failed render.
    scene.traverse(object => {
      const mask = object.layers.mask
      if (logoObjects.has(object)) object.layers.enable(GLASS_DEPTH_LAYER)
      else object.layers.disable(GLASS_DEPTH_LAYER)
      if (object.layers.mask !== mask) depthNodes.push({ object, mask })
    })
    camera.layers.set(GLASS_DEPTH_LAYER)
    scene.background = null
    scene.overrideMaterial = capture.depthMaterial
    renderer.setRenderTarget(capture.depthTarget)
    renderer.render(scene, camera)
    updateGlassDepthGuard(nodes.sceneRoot, camera, capture)

    for (const { object, mask } of depthNodes) object.layers.mask = mask
    camera.layers.mask = (previous.layers & ~(1 << SURFACE_FOG_LAYER) & ~(1 << GLASS_DEPTH_LAYER))
      | (1 << GLASS_BACKGROUND_LAYER)
    scene.background = previous.background
    scene.overrideMaterial = null
    nodes.sceneRoot.visible = false
    camera.userData.glassCapture = capture.particlePass
    renderer.setRenderTarget(capture.colorTarget)
    renderer.render(scene, camera)
    return capture.colorTarget.texture
  } finally {
    for (const { object, mask } of depthNodes) object.layers.mask = mask
    depthNodes.length = 0
    logoObjects.clear()
    nodes.sceneRoot.visible = previous.sceneVisible
    nodes.proxyRoot.visible = previous.proxyVisible
    if (water) water.visible = previous.waterVisible!
    camera.layers.mask = previous.layers
    if (previous.hadMarker) camera.userData.glassCapture = previous.marker
    else delete camera.userData.glassCapture
    scene.background = previous.background
    scene.overrideMaterial = previous.override
    renderer.toneMapping = previous.toneMapping
    renderer.xr.enabled = previous.xr
    renderer.autoClear = previous.autoClear
    renderer.autoClearColor = previous.color
    renderer.autoClearDepth = previous.depth
    renderer.autoClearStencil = previous.stencil
    renderer.setClearColor(capture.savedClearColor, previous.clearAlpha)
    renderer.setRenderTarget(previous.target, previous.face, previous.mip)
  }
}
