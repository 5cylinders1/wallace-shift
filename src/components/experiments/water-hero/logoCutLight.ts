import { Color, FrontSide, Matrix3, Matrix4, MeshPhysicalMaterial, MeshStandardMaterial, Vector2, Vector3, Vector4,
  type BufferGeometry, type Material } from 'three'
import { buildChromeSeam } from './logoChrome'
import { logoCutLightVertexPars, logoCutLightVertexNormal, logoCutLightVertexProject,
  logoCutLightFragmentPars, logoCutLightFragmentComposite } from './shaders/logoCutLight'

export const CUT_LIGHT_MATERIAL = {
  baseColor: [.055, .064, .073],
  metalness: .22,
  roughness: .34,
  ior: 1.45,
  specularIntensity: .70,
  envMapIntensity: .94,
  color: [1, 1, 1],
  intensity: 2.8,
  reflectionGain: .30,
  spillWidth: .012,
  reflectionSpillWidth: .005,
  spillGain: .065,
  reflectionSpillGain: .025,
  openingColor: [1, 1, 1],
  openingReflectionGain: .30,
} as const

/** Read the real bank, the corresponding straight inner wall, and its native
 * thickness. Front cap edges are inset by a bevel, so their XZ distance alone
 * would illuminate the wrong surface instead of a recessed cut-facing wall. */
export function buildCutLightBanks(geometry: BufferGeometry, frame: Matrix4) {
  const segments = buildChromeSeam(geometry, frame)
  const positions = geometry.getAttribute('position')
  const normalFrame = new Matrix3().getNormalMatrix(frame)
  const a = new Vector3(), b = new Vector3(), c = new Vector3(), direction = new Vector3(), normal = new Vector3()
  let lowY = Infinity, highY = -Infinity
  for (let i = 0; i < positions.count; i++) {
    lowY = Math.min(lowY, positions.getY(i))
    highY = Math.max(highY, positions.getY(i))
  }
  if (!(highY > lowY)) throw new Error('Cannot register central cut light: the source needs nonzero native Y thickness.')
  // The cached GLB smooths vertex normals across sidewall corners/bevels.
  // Measure the real extrusion planes from triangles rather than looking
  // for nonexistent pure-wall vertex normals or changing authored shading.
  const walls: { point: Vector3; normal: Vector3 }[] = []
  const index = geometry.getIndex(), cornerCount = index?.count ?? positions.count
  const corner = (i: number) => index ? index.getX(i) : i
  for (let i = 0; i < cornerCount; i += 3) {
    a.fromBufferAttribute(positions, corner(i)).applyMatrix4(frame)
    b.fromBufferAttribute(positions, corner(i + 1)).applyMatrix4(frame)
    c.fromBufferAttribute(positions, corner(i + 2)).applyMatrix4(frame)
    normal.copy(b).sub(a).cross(direction.copy(c).sub(a)).normalize()
    if (Math.abs(normal.y) > .001 || normal.lengthSq() < .5) continue
    walls.push({ point: a.clone().add(b).add(c).multiplyScalar(1 / 3), normal: normal.clone() })
  }
  const near = (x: number, z: number, a: number, b: number) => Math.hypot(x - a, z - b) < .00001
  const bankInfo = segments.map((edge, edgeIndex) => {
    const dx = edge.z - edge.x, dz = edge.w - edge.y, length = Math.hypot(dx, dz)
    const nx = -dz / length, nz = dx / length
    const offsets: number[] = []
    for (const { point, normal: wallNormal } of walls) {
      if (wallNormal.x * nx + wallNormal.z * nz < .98) continue
      const px = point.x - edge.x, pz = point.z - edge.y
      const along = (px * dx + pz * dz) / (length * length)
      const offset = px * nx + pz * nz
      if (along >= -.10 && along <= 1.10 && offset > .00001 && offset < .02) offsets.push(offset)
    }
    if (!offsets.length) throw new Error(`Cannot register central cut light: no matching inner wall for bank ${edgeIndex}.`)
    offsets.sort((a, b) => a - b)
    const offset = offsets[Math.floor(offsets.length / 2)]
    const shared = (x: number, z: number) => segments.some((other, index) => index !== edgeIndex
      && (near(x, z, other.x, other.y) || near(x, z, other.z, other.w)))
    return new Vector4(offset, shared(edge.x, edge.y) ? 0 : 1, shared(edge.z, edge.w) ? 0 : 1, 0)
  })
  return { segments, bankInfo, normalFrame, depthBounds: new Vector2((lowY + highY) / 2, (highY - lowY) / 2) }
}

function createCutUniforms(frame: Matrix4, banks: ReturnType<typeof buildCutLightBanks>, reflectionProxy: boolean) {
  const profile = CUT_LIGHT_MATERIAL
  return {
    uCutFrame: { value: frame.clone() },
    uCutNormalFrame: { value: banks.normalFrame.clone() },
    uCutDepthBounds: { value: banks.depthBounds.clone() },
    uCutSegments: { value: Array.from({ length: 4 }, (_, i) => banks.segments[i]?.clone() ?? new Vector4()) },
    uCutBankInfo: { value: Array.from({ length: 4 }, (_, i) => banks.bankInfo[i]?.clone() ?? new Vector4()) },
    uCutSegmentCount: { value: banks.segments.length },
    uCutColor: { value: new Color().setRGB(...profile.color) },
    uCutIntensity: { value: profile.intensity as number },
    uCutGain: { value: reflectionProxy ? profile.reflectionGain : 1 },
    uCutSpillWidth: { value: reflectionProxy ? profile.reflectionSpillWidth : profile.spillWidth },
    uCutSpillGain: { value: reflectionProxy ? profile.reflectionSpillGain : profile.spillGain },
    uCutGlowPass: { value: 0 },
  }
}

const cutMaterials = new WeakMap<MeshStandardMaterial, ReturnType<typeof createCutUniforms>>()
export const logoCutLightUniforms = (material: MeshStandardMaterial) => cutMaterials.get(material)

/** Satin charcoal and a white source physically registered to the original
 * cut. No geometry deformation, animation clock or external texture is used. */
export function createLogoCutLightMaterial(source: Material, frame: Matrix4, geometry: BufferGeometry, reflectionProxy = false) {
  const banks = buildCutLightBanks(geometry, frame)
  const material = new MeshPhysicalMaterial()
  if (source instanceof MeshStandardMaterial) MeshStandardMaterial.prototype.copy.call(material, source)
  material.defines = { STANDARD: '', PHYSICAL: '' }
  const profile = CUT_LIGHT_MATERIAL
  material.name = `${source.name || 'WS'}_CentralCutLight${reflectionProxy ? '_WaterProxy' : ''}`
  material.color.setRGB(...profile.baseColor)
  material.metalness = profile.metalness
  material.roughness = profile.roughness
  material.ior = profile.ior
  material.specularIntensity = profile.specularIntensity
  material.envMapIntensity = profile.envMapIntensity
  material.clearcoat = 0
  material.transmission = 0
  material.iridescence = 0
  material.side = FrontSide
  material.transparent = false
  material.opacity = 1
  material.depthWrite = true
  material.flatShading = false
  material.vertexColors = false
  material.emissive.setScalar(0)
  material.emissiveIntensity = 0
  material.map = material.normalMap = material.bumpMap = material.roughnessMap = null
  material.metalnessMap = material.emissiveMap = material.aoMap = material.alphaMap = null
  material.lightMap = material.displacementMap = null
  material.clearcoatMap = material.clearcoatNormalMap = material.clearcoatRoughnessMap = null
  material.specularColorMap = material.specularIntensityMap = null
  material.iridescenceMap = material.iridescenceThicknessMap = null
  material.transmissionMap = material.thicknessMap = material.anisotropyMap = null
  material.sheenColorMap = material.sheenRoughnessMap = null
  const uniforms = createCutUniforms(frame, banks, reflectionProxy)
  cutMaterials.set(material, uniforms)
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, uniforms)
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${logoCutLightVertexPars}`)
      .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>\n${logoCutLightVertexNormal}`)
      .replace('#include <project_vertex>', `#include <project_vertex>\n${logoCutLightVertexProject}`)
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${logoCutLightFragmentPars}`)
      .replace('#include <opaque_fragment>', `${logoCutLightFragmentComposite}\n#include <opaque_fragment>`)
  }
  material.customProgramCacheKey = () => 'water-hero-central-cut-light-v1'
  return material
}

export function setCutLightGlowPass(materials: readonly MeshStandardMaterial[], enabled: boolean) {
  for (const material of materials) {
    const uniforms = cutMaterials.get(material)
    if (uniforms) uniforms.uCutGlowPass.value = enabled ? 1 : 0
  }
}
