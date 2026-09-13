import { Color, type Material, type MeshStandardMaterial } from 'three'
import { createLogoCrystalMaterial, logoGlassUniforms } from './logoMaterial'
import { logoCrystalFragmentComposite } from './shaders/logoGlass'
import { COPPER_OPTICS, logoCopperFragmentPars, logoCopperFragmentSurface,
  logoCopperFragmentComposite } from './shaders/logoCopper'

export const SMOKED_COPPER_MATERIAL = {
  baseColor: [1, 1, 1],
  copperReflectance: [.82, .46, .28],
  roughness: .12,
  copperRoughness: COPPER_OPTICS.roughness,
  ior: 1.50,
  specularIntensity: 1,
  envMapIntensity: .88,
  /** Through .433 world units this passes 28/25/22% before Fresnel. */
  absorption: [2.9, 3.18, 3.46],
  internalReflection: .24,
  openingColor: [.94, .48, .25],
  openingReflectionGain: .34,
} as const

function createCopperUniforms(reflectionProxy: boolean) {
  return {
    uCopperReflectance: { value: new Color().setRGB(...SMOKED_COPPER_MATERIAL.copperReflectance) },
    uCopperProxy: { value: reflectionProxy ? 1 : 0 },
  }
}

const copperMaterials = new WeakMap<MeshStandardMaterial, ReturnType<typeof createCopperUniforms>>()
export const logoCopperUniforms = (material: MeshStandardMaterial) => copperMaterials.get(material)

/** Own a new optical material while retaining the common scene-capture
 * registry and rounded-face normal hooks. Clear Glass and its source GLB
 * remain unchanged; no copper geometry or extra capture is allocated. */
export function createLogoCopperMaterial(source: Material, worldThickness: number, reflectionProxy = false) {
  const material = createLogoCrystalMaterial(source, worldThickness, 'clear')
  const profile = SMOKED_COPPER_MATERIAL
  material.name = `${source.name || 'WS'}_SmokedCopperGlass`
  material.color.setRGB(...profile.baseColor)
  material.metalness = 0
  material.roughness = profile.roughness
  material.ior = profile.ior
  material.specularIntensity = profile.specularIntensity
  material.envMapIntensity = profile.envMapIntensity
  material.iridescence = 0
  material.clearcoat = 0
  material.flatShading = false
  material.vertexColors = false
  material.emissive.setScalar(0)
  material.emissiveIntensity = 0
  // The shared rounded mesh has no UV atlas. Its clean smoked faces and
  // physical copper band are entirely geometric and optically shaded.
  material.map = material.normalMap = material.bumpMap = material.roughnessMap = null
  material.metalnessMap = material.emissiveMap = material.aoMap = material.alphaMap = null
  material.lightMap = material.displacementMap = null
  material.clearcoatMap = material.clearcoatNormalMap = material.clearcoatRoughnessMap = null
  material.specularColorMap = material.specularIntensityMap = null
  material.iridescenceMap = material.iridescenceThicknessMap = null
  material.transmissionMap = material.thicknessMap = material.anisotropyMap = null
  material.sheenColorMap = material.sheenRoughnessMap = null
  const glass = logoGlassUniforms(material)!
  glass.uGlassAbsorption.value.setRGB(...profile.absorption)
  glass.uGlassDispersion.value = 0
  glass.uGlassInternalReflection.value = profile.internalReflection
  glass.uGlassBodyFill.value.set(0, 0)
  glass.uGlassRimStrength.value = 0
  const uniforms = createCopperUniforms(reflectionProxy)
  copperMaterials.set(material, uniforms)
  const compileCrystal = material.onBeforeCompile
  material.onBeforeCompile = (shader, renderer) => {
    compileCrystal(shader, renderer)
    Object.assign(shader.uniforms, uniforms)
    shader.fragmentShader = shader.fragmentShader
      // Append after the shared glass pars so the cap/shoulder varying is
      // declared before the copper coverage helper reads it.
      .replace('void main() {', `${logoCopperFragmentPars}\nvoid main() {`)
      .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>\n${logoCopperFragmentSurface}`)
      .replace(logoCrystalFragmentComposite, logoCopperFragmentComposite)
  }
  material.customProgramCacheKey = () => 'water-hero-smoked-copper-glass-v1'
  return material
}
