import { FrontSide, Matrix4, MeshPhysicalMaterial, MeshStandardMaterial, Vector3, Vector4,
  type BufferGeometry, type Material } from 'three'
import { buildElectricContour, ELECTRIC_CONTOUR_MAX_SEGMENTS, ELECTRIC_CONTOUR_SCALE } from './electricContour'
import { MERCURY_FLOW, logoMercuryVertexPars, logoMercuryVertexNormal, logoMercuryVertexProject,
  logoMercuryFragmentPars, logoMercuryFragmentNormal, logoMercuryFragmentRoughness,
  logoMercuryFragmentComposite } from './shaders/logoMercury'

export const LIQUID_MERCURY_MATERIAL = {
  baseColor: [.86, .89, .92],
  metalness: 1,
  roughness: MERCURY_FLOW.capRoughness,
  envMapIntensity: .78,
  openingColor: [.72, .88, 1],
  openingReflectionGain: .52,
} as const

/** Every finite front-cap edge, including the real central cut and notch,
 * converted to the same opening frame used by both pieces. Extraction and
 * registration leave the cached GLB's positions/normals/index untouched. */
export function buildMercuryContour(geometry: BufferGeometry, frame: Matrix4): Vector4[] {
  return buildElectricContour(geometry).map(segment => {
    const a = new Vector3(segment.x / ELECTRIC_CONTOUR_SCALE, 0,
      segment.y / ELECTRIC_CONTOUR_SCALE).applyMatrix4(frame)
    const b = new Vector3(segment.z / ELECTRIC_CONTOUR_SCALE, 0,
      segment.w / ELECTRIC_CONTOUR_SCALE).applyMatrix4(frame)
    return new Vector4(a.x, a.z, b.x, b.z)
  })
}

function createMercuryUniforms(frame: Matrix4, contour: readonly Vector4[]) {
  return {
    uMercuryFrame: { value: frame.clone() },
    uMercuryTime: { value: 0 },
    uMercuryGlowPass: { value: 0 },
    uMercurySegments: { value: Array.from({ length: ELECTRIC_CONTOUR_MAX_SEGMENTS }, (_, i) => contour[i]?.clone() ?? new Vector4()) },
    uMercurySegmentCount: { value: contour.length },
  }
}

const mercuryMaterials = new WeakMap<MeshStandardMaterial, ReturnType<typeof createMercuryUniforms>>()
export const logoMercuryUniforms = (material: MeshStandardMaterial) => mercuryMaterials.get(material)

/** Opaque silver on the original precise silhouette. Both beauty and water
 * proxy own their material/uniforms but use identical optical motion; only
 * the shared opening charge has its separate reflection gain. */
export function createLogoMercuryMaterial(source: Material, frame: Matrix4, geometry: BufferGeometry, reflectionProxy = false) {
  const contour = buildMercuryContour(geometry, frame)
  const material = new MeshPhysicalMaterial()
  if (source instanceof MeshStandardMaterial) MeshStandardMaterial.prototype.copy.call(material, source)
  material.defines = { STANDARD: '', PHYSICAL: '' }
  const profile = LIQUID_MERCURY_MATERIAL
  material.name = `${source.name || 'WS'}_LiquidMercury${reflectionProxy ? '_WaterProxy' : ''}`
  material.color.setRGB(...profile.baseColor)
  material.metalness = profile.metalness
  material.roughness = profile.roughness
  material.envMapIntensity = profile.envMapIntensity
  material.transmission = 0
  material.clearcoat = 0
  material.iridescence = 0
  material.side = FrontSide
  material.transparent = false
  material.opacity = 1
  material.depthWrite = true
  material.flatShading = false
  material.vertexColors = false
  material.emissive.setScalar(0)
  material.emissiveIntensity = 0
  // No inherited normal/noise maps or UV-dependent material detail. Reflection
  // motion is a small analytic cap-normal change, not an image or deformation.
  material.map = material.normalMap = material.bumpMap = material.roughnessMap = null
  material.metalnessMap = material.emissiveMap = material.aoMap = material.alphaMap = null
  material.lightMap = material.displacementMap = null
  material.clearcoatMap = material.clearcoatNormalMap = material.clearcoatRoughnessMap = null
  material.specularColorMap = material.specularIntensityMap = null
  material.iridescenceMap = material.iridescenceThicknessMap = null
  material.transmissionMap = material.thicknessMap = material.anisotropyMap = null
  material.sheenColorMap = material.sheenRoughnessMap = null
  const uniforms = createMercuryUniforms(frame, contour)
  mercuryMaterials.set(material, uniforms)
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, uniforms)
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${logoMercuryVertexPars}`)
      .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>\n${logoMercuryVertexNormal}`)
      .replace('#include <project_vertex>', `#include <project_vertex>\n${logoMercuryVertexProject}`)
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${logoMercuryFragmentPars}`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>\n${logoMercuryFragmentRoughness}`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>\n${logoMercuryFragmentNormal}`)
      .replace('#include <opaque_fragment>', `${logoMercuryFragmentComposite}\n#include <opaque_fragment>`)
  }
  material.customProgramCacheKey = () => 'water-hero-liquid-mercury-v1'
  return material
}

/** The owner supplies one clock for both views and time0 for reduced motion. */
export function updateMercuryLighting(materials: readonly MeshStandardMaterial[], time: number) {
  const clock = Number.isFinite(time) ? Math.max(0, time) : 0
  for (const material of materials) {
    const uniforms = mercuryMaterials.get(material)
    if (uniforms) uniforms.uMercuryTime.value = clock
  }
}

export function setMercuryGlowPass(materials: readonly MeshStandardMaterial[], enabled: boolean) {
  for (const material of materials) {
    const uniforms = mercuryMaterials.get(material)
    if (uniforms) uniforms.uMercuryGlowPass.value = enabled ? 1 : 0
  }
}
