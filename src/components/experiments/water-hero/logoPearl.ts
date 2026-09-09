import { FrontSide, MeshPhysicalMaterial, MeshStandardMaterial, type Material } from 'three'
import { PEARL_GLAZE, logoPearlVertexPars, logoPearlVertexNormal,
  logoPearlFragmentPars, logoPearlFragmentRoughness, logoPearlFragmentPhysical,
  logoPearlFragmentComposite } from './shaders/logoPearl'

export const PEARL_CERAMIC_MATERIAL = {
  baseColor: [.82, .775, .68],
  metalness: 0,
  roughness: PEARL_GLAZE.capRoughness,
  ior: 1.45,
  specularIntensity: .70,
  clearcoat: .28,
  clearcoatRoughness: .26,
  envMapIntensity: 1.02,
  iridescence: .28,
  iridescenceIOR: 1.32,
  iridescenceThicknessRange: [330, 390],
  openingColor: [.92, .80, .60],
  openingReflectionGain: .45,
} as const

function createPearlUniforms() {
  return {
    uPearlTurn: { value: 0 },
    uPearlGlowPass: { value: 0 },
  }
}

const pearlMaterials = new WeakMap<MeshStandardMaterial, ReturnType<typeof createPearlUniforms>>()
export const logoPearlUniforms = (material: MeshStandardMaterial) => pearlMaterials.get(material)

/** Own only the material: the route supplies its existing rounded geometry.
 * This opaque ceramic does not join the glass scene-capture registry, sample
 * a background texture, or modify any cached source material. */
export function createLogoPearlMaterial(source: Material) {
  const material = new MeshPhysicalMaterial()
  if (source instanceof MeshStandardMaterial) MeshStandardMaterial.prototype.copy.call(material, source)
  // Standard.copy resets the physical defines. Keep the native IOR,
  // dielectric specular, glaze and thin-film lighting branches available.
  material.defines = { STANDARD: '', PHYSICAL: '' }
  const profile = PEARL_CERAMIC_MATERIAL
  material.name = `${source.name || 'WS'}_PearlCeramic`
  material.color.setRGB(...profile.baseColor)
  material.metalness = profile.metalness
  material.roughness = profile.roughness
  material.ior = profile.ior
  material.specularIntensity = profile.specularIntensity
  material.clearcoat = profile.clearcoat
  material.clearcoatRoughness = profile.clearcoatRoughness
  material.envMapIntensity = profile.envMapIntensity
  material.iridescence = profile.iridescence
  material.iridescenceIOR = profile.iridescenceIOR
  material.iridescenceThicknessRange = [...profile.iridescenceThicknessRange]
  material.transmission = 0
  material.side = FrontSide
  material.transparent = false
  material.opacity = 1
  material.depthWrite = true
  material.flatShading = false
  material.emissive.setScalar(0)
  material.emissiveIntensity = 0
  // The owned rounded mesh has no UVs, and the ceramic must stay clean.
  // Explicitly remove authored maps rather than reinterpreting them as glaze.
  material.map = material.normalMap = material.bumpMap = material.roughnessMap = null
  material.metalnessMap = material.emissiveMap = material.aoMap = material.alphaMap = null
  material.lightMap = material.displacementMap = null
  material.clearcoatMap = material.clearcoatNormalMap = material.clearcoatRoughnessMap = null
  material.specularColorMap = material.specularIntensityMap = null
  material.iridescenceMap = material.iridescenceThicknessMap = null
  material.transmissionMap = material.thicknessMap = material.anisotropyMap = null
  material.sheenColorMap = material.sheenRoughnessMap = null
  material.vertexColors = false
  const uniforms = createPearlUniforms()
  pearlMaterials.set(material, uniforms)
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, uniforms)
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${logoPearlVertexPars}`)
      .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>\n${logoPearlVertexNormal}`)
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${logoPearlFragmentPars}`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>\n${logoPearlFragmentRoughness}`)
      .replace('#include <lights_physical_fragment>', `#include <lights_physical_fragment>\n${logoPearlFragmentPhysical}`)
      .replace('#include <opaque_fragment>', `${logoPearlFragmentComposite}\n#include <opaque_fragment>`)
  }
  material.customProgramCacheKey = () => 'water-hero-pearl-ceramic-v1'
  return material
}

/** A uniform gate keeps the native thin-film program compiled while fading
 * its contribution smoothly with the actual turn. Both endpoint looks remain
 * plain ivory, including reduced motion (yaw0) and the held 180-degree split. */
export function updatePearlLighting(materials: readonly MeshStandardMaterial[], yaw: number) {
  const angle = Number.isFinite(yaw) ? Math.max(0, Math.min(Math.PI, yaw)) : 0
  const turn = angle <= 1e-6 || angle >= Math.PI - 1e-6 ? 0 : Math.sin(angle) ** 2
  for (const material of materials) {
    const uniforms = pearlMaterials.get(material)
    if (uniforms) uniforms.uPearlTurn.value = turn
  }
}

export function setPearlGlowPass(materials: readonly MeshStandardMaterial[], enabled: boolean) {
  for (const material of materials) {
    const uniforms = pearlMaterials.get(material)
    if (uniforms) uniforms.uPearlGlowPass.value = enabled ? 1 : 0
  }
}
