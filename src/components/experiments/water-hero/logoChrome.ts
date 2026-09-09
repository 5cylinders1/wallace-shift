import { Color, FrontSide, Matrix4, MeshPhysicalMaterial, MeshStandardMaterial, Vector3, Vector4,
  type BufferGeometry, type Material } from 'three'
import { buildElectricContour, ELECTRIC_CONTOUR_SCALE } from './electricContour'
import { COLOR_WAVE, UNDERWATER_PALETTE } from './shaders/underwaterColor'
import { logoChromeVertexPars, logoChromeVertexNormal, logoChromeVertexProject,
  logoChromeFragmentPars, logoChromeFragmentColor, logoChromeFragmentRoughness,
  logoChromeFragmentComposite } from './shaders/logoChrome'

export const BLACK_CHROME_MATERIAL = {
  faceColor: [.13, .155, .18],
  seamColor: [1, .135, .018],
  metalness: .94,
  roughness: .17,
  envMapIntensity: .72,
  seamIntensity: 2.4,
  reflectionGain: .24,
} as const

/** Map the real +Y cap boundary into the common opening frame, then retain
 * only edges facing the central cut. In the authored clockwise XZ cap the
 * left bank descends in Z and the right bank ascends. The nonnegative X
 * interval excludes the W's inner notch and outer arm. This deliberately
 * does not draw the gap's midpoint, an extended line, or a nearest bisector.
 * The source geometry and supplied frame remain untouched. */
export function buildChromeSeam(geometry: BufferGeometry, frame: Matrix4): Vector4[] {
  const contour = buildElectricContour(geometry).map(segment => {
    const a = new Vector3(segment.x / ELECTRIC_CONTOUR_SCALE, 0,
      segment.y / ELECTRIC_CONTOUR_SCALE).applyMatrix4(frame)
    const b = new Vector3(segment.z / ELECTRIC_CONTOUR_SCALE, 0,
      segment.w / ELECTRIC_CONTOUR_SCALE).applyMatrix4(frame)
    return new Vector4(a.x, a.z, b.x, b.z)
  })
  const mainPiece = contour.some(segment => Math.min(segment.x, segment.z) < 0)
  const seam = contour.filter(segment => {
    const dx = segment.z - segment.x, dz = segment.w - segment.y
    const length = Math.hypot(dx, dz)
    const cutFacing = mainPiece ? dz < -length * .32 : dz > length * .32
    return cutFacing && Math.min(segment.x, segment.z) > -.00001
  })
  const expected = mainPiece ? 3 : 1
  if (seam.length !== expected) {
    throw new Error(`Cannot register black-chrome central seam: expected ${expected} authored cut edges, found ${seam.length}.`)
  }
  return seam
}

function createChromeUniforms(frame: Matrix4, seam: readonly Vector4[], reflectionProxy: boolean) {
  return {
    uChromeFrame: { value: frame.clone() },
    uChromeTime: { value: 0 },
    uChromeUnderwater: { value: 0 },
    uChromeGlowPass: { value: 0 },
    uChromeSeamColor: { value: new Color().setRGB(...BLACK_CHROME_MATERIAL.seamColor) },
    uChromeSeamIntensity: { value: BLACK_CHROME_MATERIAL.seamIntensity as number },
    uChromeSeamGain: { value: reflectionProxy ? BLACK_CHROME_MATERIAL.reflectionGain : 1 },
    uChromePulseColor: { value: new Color().setRGB(...UNDERWATER_PALETTE[0]) },
    uChromeSegments: { value: Array.from({ length: 4 }, (_, i) => seam[i]?.clone() ?? new Vector4()) },
    uChromeSegmentCount: { value: seam.length },
  }
}

const chromeMaterials = new WeakMap<MeshStandardMaterial, ReturnType<typeof createChromeUniforms>>()
export const logoChromeUniforms = (material: MeshStandardMaterial) => chromeMaterials.get(material)

/** An independent opaque conductor. The supplied material/GLB are never
 * modified, and no existing appearance or scene capture is repurposed. */
export function createLogoChromeMaterial(source: Material, frame: Matrix4, geometry: BufferGeometry, reflectionProxy = false) {
  const seam = buildChromeSeam(geometry, frame)
  const material = new MeshPhysicalMaterial()
  if (source instanceof MeshStandardMaterial) MeshStandardMaterial.prototype.copy.call(material, source)
  material.defines = { STANDARD: '', PHYSICAL: '' }
  material.name = `${source.name || 'WS'}_BlackChrome`
  material.color.setRGB(...BLACK_CHROME_MATERIAL.faceColor)
  material.metalness = BLACK_CHROME_MATERIAL.metalness
  material.roughness = BLACK_CHROME_MATERIAL.roughness
  material.envMapIntensity = BLACK_CHROME_MATERIAL.envMapIntensity
  material.transmission = 0
  material.clearcoat = 0
  material.side = FrontSide
  material.transparent = false
  material.opacity = 1
  material.depthWrite = true
  material.emissive.setScalar(0)
  // The cap has no image, grain, cloudy finish, normal distortion or swipe.
  material.map = material.normalMap = material.bumpMap = material.roughnessMap = null
  material.metalnessMap = material.emissiveMap = material.aoMap = material.alphaMap = null
  const uniforms = createChromeUniforms(frame, seam, reflectionProxy)
  chromeMaterials.set(material, uniforms)
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, uniforms)
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${logoChromeVertexPars}`)
      .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>\n${logoChromeVertexNormal}`)
      .replace('#include <project_vertex>', `#include <project_vertex>\n${logoChromeVertexProject}`)
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${logoChromeFragmentPars}`)
      .replace('#include <color_fragment>', `#include <color_fragment>\n${logoChromeFragmentColor}`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>\n${logoChromeFragmentRoughness}`)
      .replace('#include <opaque_fragment>', `${logoChromeFragmentComposite}\n#include <opaque_fragment>`)
  }
  material.customProgramCacheKey = () => 'water-hero-black-chrome-v1'
  return material
}

export function setChromeGlowPass(materials: readonly MeshStandardMaterial[], enabled: boolean) {
  for (const material of materials) {
    const uniforms = chromeMaterials.get(material)
    if (uniforms) uniforms.uChromeGlowPass.value = enabled ? 1 : 0
  }
}

const smooth = (start: number, end: number, value: number) => {
  const t = Math.min(1, Math.max(0, (value - start) / (end - start)))
  return t * t * (3 - 2 * t)
}

/** Existing particle pulses influence only a faint reflected fill and a 7%
 * seam response. The joint retains its orange-red identity. A frozen time
 * gives the same attractive stationary studio reflection in reduced motion. */
export function updateChromeLighting(materials: readonly MeshStandardMaterial[], time: number, underwater: number) {
  const clock = Number.isFinite(time) ? Math.max(0, time) : 0
  const submerged = Number.isFinite(underwater) ? Math.max(0, Math.min(1, underwater)) : 0
  const phase = (clock - .72 / COLOR_WAVE.speed) / COLOR_WAVE.seconds
  const cycle = Math.floor(phase), age = phase - cycle
  const palette = (index: number) => UNDERWATER_PALETTE[(index % UNDERWATER_PALETTE.length + UNDERWATER_PALETTE.length) % UNDERWATER_PALETTE.length]
  const previous = palette(cycle - 1), next = palette(cycle)
  const change = smooth(0, COLOR_WAVE.transition, age)
  const crest = smooth(0, COLOR_WAVE.attack, age) * (1 - smooth(COLOR_WAVE.peak, COLOR_WAVE.release, age))
  for (const material of materials) {
    const uniforms = chromeMaterials.get(material)
    if (!uniforms) continue
    uniforms.uChromeTime.value = clock
    uniforms.uChromeUnderwater.value = submerged
    uniforms.uChromePulseColor.value.setRGB(
      previous[0] + (next[0] - previous[0]) * change,
      previous[1] + (next[1] - previous[1]) * change,
      previous[2] + (next[2] - previous[2]) * change,
    )
    uniforms.uChromeSeamIntensity.value = BLACK_CHROME_MATERIAL.seamIntensity * (1 + crest * submerged * .07)
  }
}
