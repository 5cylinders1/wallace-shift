import {
  BackSide, BoxGeometry, Color, CubeCamera, HalfFloatType, LinearFilter,
  LinearSRGBColorSpace, Mesh, NoToneMapping, PMREMGenerator, Scene,
  ShaderMaterial, Vector2, Vector3, WebGLCubeRenderTarget,
  type Texture, type WebGLRenderer, type WebGLRenderTarget,
} from 'three'

interface CrystalCard {
  azimuth: number
  elevation: number
  half: readonly [number, number]
  intensity: number
  color: readonly [number, number, number]
  /** Smooth finite oval reflection, fading continuously from the center. */
  softOval?: boolean
}

/** Reflection-only photographic cards. Bright shoulder cards describe the
 * extrusion, while much dimmer soft face cards reveal selected clear planes.
 * Opposing cards keep that description as the emblem turns around. */
export const CRYSTAL_REFLECTION_CARDS: readonly CrystalCard[] = [
  { azimuth: -.72, elevation: .28, half: [.48, .90], intensity: 22, color: [.94, 1.00, 1.06] },
  { azimuth: .96, elevation: .08, half: [.19, .90], intensity: 28, color: [1.00, .97, .93] },
  { azimuth: .12, elevation: 1.02, half: [.90, .21], intensity: 18, color: [.94, .98, 1.06] },
  { azimuth: 2.62, elevation: .12, half: [.45, .76], intensity: 20, color: [1.03, .99, .96] },
  { azimuth: -2.10, elevation: .35, half: [.22, .80], intensity: 24, color: [.93, 1.00, 1.07] },
  { azimuth: -.12, elevation: -.16, half: [.90, .025], intensity: 5.5, color: [.86, .96, 1.06] },
  { azimuth: -.070, elevation: .085, half: [.043, .055], intensity: 3.2, color: [.94, .99, 1.04], softOval: true },
  { azimuth: .075, elevation: .085, half: [.035, .035], intensity: 2.7, color: [1.03, 1.00, .96], softOval: true },
  { azimuth: Math.PI - .070, elevation: .085, half: [.043, .055], intensity: 2.8, color: [1.02, .99, .96], softOval: true },
  { azimuth: Math.PI + .075, elevation: .085, half: [.035, .035], intensity: 2.4, color: [.95, 1.00, 1.05], softOval: true },
]
/** Glass gets a soft source, not just a rougher mirror of a white rectangle.
 * Preserve the small opening-face cards; replace the bright shoulder/card
 * plateaus with continuous oval falloff at one fifth of their peak radiance.
 * The original rig remains exact for Frosted Crystal and Smoked Copper. */
export const SOFT_GLASS_REFLECTION_CARDS: readonly CrystalCard[] = CRYSTAL_REFLECTION_CARDS.map(card => ({
  ...card,
  intensity: card.softOval ? card.intensity : card.intensity * .20,
  softOval: true,
}))
export type CrystalEnvironmentProfile = 'original' | 'soft-glass'
export const CRYSTAL_ENVIRONMENT_SIZE = 256
export const CRYSTAL_AMBIENT = [.0008, .0010, .0014] as const

export function crystalCardBasis(card: Pick<CrystalCard, 'azimuth' | 'elevation'>) {
  const forward = new Vector3(Math.cos(card.elevation) * Math.sin(card.azimuth),
    Math.sin(card.elevation), Math.cos(card.elevation) * Math.cos(card.azimuth)).normalize()
  const right = new Vector3(0, 1, 0).cross(forward).normalize()
  return { forward, right, up: forward.clone().cross(right).normalize() }
}

export const crystalEnvironmentFragment = /* glsl */ `
uniform vec3 uAmbient;
uniform vec3 uForward[CARD_COUNT];
uniform vec3 uRight[CARD_COUNT];
uniform vec3 uUp[CARD_COUNT];
uniform vec2 uHalf[CARD_COUNT];
uniform vec3 uColor[CARD_COUNT];
uniform float uIntensity[CARD_COUNT];
uniform float uSoftOval[CARD_COUNT];
varying vec3 vDirection;
void main() {
  vec3 direction = normalize(vDirection);
  vec3 radiance = uAmbient;
  for (int i = 0; i < CARD_COUNT; i++) {
    float facing = dot(direction, uForward[i]);
    if (facing <= .01) continue;
    vec2 p = vec2(dot(direction, uRight[i]), dot(direction, uUp[i])) / facing;
    float radius = min(uHalf[i].x, uHalf[i].y) * .22;
    vec2 q = abs(p) - uHalf[i] + radius;
    float distanceToCard = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - radius;
    float feather = min(uHalf[i].x, uHalf[i].y) * .12;
    float coverage = 1.0 - smoothstep(-feather, feather, distanceToCard);
    if (uSoftOval[i] > .5) {
      vec2 oval = p / uHalf[i];
      float ovalRadius = length(oval);
      coverage = exp(-dot(oval, oval) * 2.4)
        * (1.0 - smoothstep(.80, 1.60, ovalRadius));
    }
    // A graduated diffuser has shape within the highlight. The black gaps
    // come from source placement, not a painted texture or animated sweep.
    float graduation = mix(.66, 1.0, smoothstep(-1.0, 1.0, p.y / uHalf[i].y));
    radiance += uColor[i] * uIntensity[i] * coverage * graduation;
  }
  gl_FragColor = vec4(radiance, 1.0);
}
`

/** Exposed separately so its linear-HDR source contract can be tested without
 * pretending a mocked renderer verifies the resulting glass appearance. */
export function createCrystalEnvironmentMaterial(profile: CrystalEnvironmentProfile = 'original') {
  const cards = profile === 'soft-glass' ? SOFT_GLASS_REFLECTION_CARDS : CRYSTAL_REFLECTION_CARDS
  const bases = cards.map(crystalCardBasis)
  return new ShaderMaterial({
    side: BackSide, depthWrite: false, depthTest: false, toneMapped: false,
    defines: { CARD_COUNT: cards.length },
    vertexShader: /* glsl */ `
      varying vec3 vDirection;
      void main() {
        vDirection = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: crystalEnvironmentFragment,
    uniforms: {
      uAmbient: { value: new Vector3(...CRYSTAL_AMBIENT) },
      uForward: { value: bases.map(basis => basis.forward) },
      uRight: { value: bases.map(basis => basis.right) },
      uUp: { value: bases.map(basis => basis.up) },
      uHalf: { value: cards.map(card => new Vector2(...card.half)) },
      uColor: { value: cards.map(card => new Vector3(...card.color)) },
      uIntensity: { value: cards.map(card => card.intensity) },
      uSoftOval: { value: cards.map(card => card.softOval ? 1 : 0) },
    },
  })
}

export interface CrystalEnvironment {
  /** Reject the previous look's source while its replacement is allocated. */
  profile: CrystalEnvironmentProfile
  /** Native physical reflections use the roughness-prefiltered map. */
  environment: Texture
  /** Particle probes start with unfiltered card radiance, avoiding two PMREMs. */
  radiance: Texture
  dispose: () => void
}

/** Independent from the visible sky, water and existing LED/Electric studio.
 * Allocate only while glass is selected, and free both retained targets. */
export function createCrystalEnvironment(renderer: WebGLRenderer, profile: CrystalEnvironmentProfile = 'original'): CrystalEnvironment {
  const geometry = new BoxGeometry(4, 4, 4)
  const material = createCrystalEnvironmentMaterial(profile)
  const scene = new Scene()
  scene.background = new Color(0)
  const mesh = new Mesh(geometry, material)
  mesh.frustumCulled = false
  scene.add(mesh)
  const cube = new WebGLCubeRenderTarget(CRYSTAL_ENVIRONMENT_SIZE, {
    type: HalfFloatType, colorSpace: LinearSRGBColorSpace,
    generateMipmaps: false, minFilter: LinearFilter, magFilter: LinearFilter,
    depthBuffer: false, stencilBuffer: false,
  })
  const camera = new CubeCamera(.1, 10, cube)
  const pmrem = new PMREMGenerator(renderer)
  let filtered: WebGLRenderTarget | null = null
  const previous = {
    target: renderer.getRenderTarget(), face: renderer.getActiveCubeFace(), mip: renderer.getActiveMipmapLevel(),
    toneMapping: renderer.toneMapping, xr: renderer.xr.enabled,
    autoClear: renderer.autoClear, color: renderer.autoClearColor, depth: renderer.autoClearDepth,
    stencil: renderer.autoClearStencil, clearColor: renderer.getClearColor(new Color()), clearAlpha: renderer.getClearAlpha(),
  }
  try {
    renderer.toneMapping = NoToneMapping
    renderer.xr.enabled = false
    renderer.autoClear = renderer.autoClearColor = renderer.autoClearDepth = true
    renderer.autoClearStencil = false
    camera.update(renderer, scene)
    filtered = pmrem.fromCubemap(cube.texture)
    return {
      profile,
      environment: filtered.texture, radiance: cube.texture,
      dispose() { cube.dispose(); filtered?.dispose() },
    }
  } catch (error) {
    cube.dispose()
    filtered?.dispose()
    throw error
  } finally {
    geometry.dispose(); material.dispose(); scene.clear(); pmrem.dispose()
    renderer.toneMapping = previous.toneMapping
    renderer.xr.enabled = previous.xr
    renderer.autoClear = previous.autoClear
    renderer.autoClearColor = previous.color
    renderer.autoClearDepth = previous.depth
    renderer.autoClearStencil = previous.stencil
    renderer.setClearColor(previous.clearColor, previous.clearAlpha)
    renderer.setRenderTarget(previous.target, previous.face, previous.mip)
  }
}
