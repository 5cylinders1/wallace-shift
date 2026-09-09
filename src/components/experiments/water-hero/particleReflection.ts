import { CubeCamera, HalfFloatType, LinearFilter, NoToneMapping, PMREMGenerator,
  WebGLCubeRenderTarget, type Scene, type Texture, type Vector3, type WebGLRenderer, type WebGLRenderTarget } from 'three'
import { SUBMERGED_PARTICLE_LAYER } from './waterRenderLayers'
import type { QualityTier } from './waterHeroTypes'

/** One cube serves both halves. Six small faces and one reused PMREM target
 * update on a bounded clock; the standard metal shader samples the result. */
export const PARTICLE_REFLECTION_BUDGET = {
  high: { size: 128, capturesPerSecond: 6 },
  medium: { size: 64, capturesPerSecond: 4 },
  low: { size: 32, capturesPerSecond: 2 },
} as const

export function particleReflectionActive(progress: number, underwater: number, reducedMotion: boolean) {
  return !reducedMotion && underwater > .95 && progress >= .49 && progress < .98
}

export function particleReflectionDue(now: number, lastCapture: number, tier: QualityTier) {
  return now - lastCapture >= 1 / PARTICLE_REFLECTION_BUDGET[tier].capturesPerSecond - 1e-8
}

export function createParticleReflection(renderer: WebGLRenderer, tier: QualityTier) {
  const cube = new WebGLCubeRenderTarget(PARTICLE_REFLECTION_BUDGET[tier].size, {
    type: HalfFloatType, generateMipmaps: false, minFilter: LinearFilter, magFilter: LinearFilter,
    depthBuffer: true, stencilBuffer: false,
  })
  const camera = new CubeCamera(.08, 40, cube)
  // CubeCamera shares this layer object with all six of its face cameras.
  // Neither logo, the water, air fog nor any reflective material is captured.
  camera.layers.set(SUBMERGED_PARTICLE_LAYER)
  // Particle materials restore their ordinary radiance on every beauty
  // draw. This marker only compensates the small, filtered reflection
  // capture; it does not invent another cloud or an animated logo light.
  for (const face of camera.children) face.userData.particleReflection = true
  const pmrem = new PMREMGenerator(renderer)
  return {
    cube, camera, pmrem, filtered: null as WebGLRenderTarget | null,
    lastCapture: -Infinity, capturedProgress: -Infinity,
    dispose() { cube.dispose(); this.filtered?.dispose(); pmrem.dispose() },
  }
}

/** Capture scene particles over the same studio radiance the metal already
 * sees. Keep radiance linear, and restore every changed scene/renderer value
 * even if a face render fails. Explicit PMREM ownership avoids a stale cached
 * environment and makes the GPU target's lifetime unambiguous. */
export function captureParticleReflection(renderer: WebGLRenderer, scene: Scene,
  probe: ReturnType<typeof createParticleReflection>, studio: Texture, position: Vector3) {
  const previous = {
    target: renderer.getRenderTarget(), face: renderer.getActiveCubeFace(), mip: renderer.getActiveMipmapLevel(),
    background: scene.background, intensity: scene.backgroundIntensity, blur: scene.backgroundBlurriness,
    rotation: scene.backgroundRotation.clone(), toneMapping: renderer.toneMapping,
    autoClear: renderer.autoClear, color: renderer.autoClearColor, depth: renderer.autoClearDepth,
    stencil: renderer.autoClearStencil, xr: renderer.xr.enabled,
  }
  try {
    scene.background = studio
    scene.backgroundIntensity = 1
    scene.backgroundBlurriness = 0
    scene.backgroundRotation.copy(scene.environmentRotation)
    renderer.toneMapping = NoToneMapping
    renderer.autoClear = renderer.autoClearColor = renderer.autoClearDepth = true
    renderer.autoClearStencil = false
    probe.camera.position.copy(position)
    probe.camera.update(renderer, scene)
    probe.filtered = probe.pmrem.fromCubemap(probe.cube.texture, probe.filtered)
  } finally {
    scene.background = previous.background
    scene.backgroundIntensity = previous.intensity
    scene.backgroundBlurriness = previous.blur
    scene.backgroundRotation.copy(previous.rotation)
    renderer.toneMapping = previous.toneMapping
    renderer.autoClear = previous.autoClear
    renderer.autoClearColor = previous.color
    renderer.autoClearDepth = previous.depth
    renderer.autoClearStencil = previous.stencil
    renderer.xr.enabled = previous.xr
    renderer.setRenderTarget(previous.target, previous.face, previous.mip)
  }
}
