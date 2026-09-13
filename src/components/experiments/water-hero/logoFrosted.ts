import { Color, type Material, type MeshStandardMaterial } from 'three'
import { createLogoCrystalMaterial, logoGlassUniforms } from './logoMaterial'
import { COLOR_WAVE, UNDERWATER_PALETTE } from './shaders/underwaterColor'
import { logoCrystalFragmentComposite } from './shaders/logoGlass'
import { FROSTED_VOLUME, logoFrostedVertexPars, logoFrostedVertexProject,
  logoFrostedFragmentPars, logoFrostedFragmentRoughness, logoFrostedFragmentComposite } from './shaders/logoFrosted'

export const FROSTED_CRYSTAL_MATERIAL = {
  baseColor: [.92, .96, 1],
  color: [.62, .84, 1],
  intensity: .98,
  reflectionGain: .48,
  envMapIntensity: 1.10,
  roughness: FROSTED_VOLUME.capRoughness,
  ior: 1.48,
  absorption: [.12, .045, .02],
  iridescence: .22,
  internalReflection: .38,
} as const

function createFrostedUniforms(reflectionProxy: boolean) {
  return {
    uFrostedColor: { value: new Color().setRGB(...FROSTED_CRYSTAL_MATERIAL.color) },
    uFrostedIntensity: { value: FROSTED_CRYSTAL_MATERIAL.intensity as number },
    uFrostedGain: { value: reflectionProxy ? FROSTED_CRYSTAL_MATERIAL.reflectionGain : 1 },
    uFrostedProxy: { value: reflectionProxy ? 1 : 0 },
    uFrostedGlowPass: { value: 0 },
  }
}

const frostedMaterials = new WeakMap<MeshStandardMaterial, ReturnType<typeof createFrostedUniforms>>()
export const logoFrostedUniforms = (material: MeshStandardMaterial) => frostedMaterials.get(material)

/** The clear-crystal factory supplies independent uniforms, the shared
 * background-capture registry and the shallow optical-normal lens. All
 * overrides belong to this new material; the original Glass stays exact. */
export function createLogoFrostedMaterial(source: Material, worldThickness: number, reflectionProxy = false) {
  const material = createLogoCrystalMaterial(source, worldThickness, 'clear')
  const profile = FROSTED_CRYSTAL_MATERIAL
  material.name = `${source.name || 'WS'}_FrostedCrystal`
  material.color.setRGB(...profile.baseColor)
  material.roughness = profile.roughness
  material.ior = profile.ior
  material.envMapIntensity = profile.envMapIntensity
  material.iridescence = profile.iridescence
  material.map = material.normalMap = material.bumpMap = material.roughnessMap = null
  material.metalnessMap = material.emissiveMap = material.aoMap = material.alphaMap = null
  const glass = logoGlassUniforms(material)!
  glass.uGlassAbsorption.value.setRGB(...profile.absorption)
  glass.uGlassInternalReflection.value = profile.internalReflection
  // Crystal registration suppresses the legacy smoky emitted rim in shared
  // updateGlassRim calls. The frost supplies its own intrinsic volume light.
  glass.uGlassRimStrength.value = 0
  const uniforms = createFrostedUniforms(reflectionProxy)
  frostedMaterials.set(material, uniforms)
  const compileCrystal = material.onBeforeCompile
  material.onBeforeCompile = (shader, renderer) => {
    compileCrystal(shader, renderer)
    Object.assign(shader.uniforms, uniforms)
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${logoFrostedVertexPars}`)
      .replace('#include <project_vertex>', `#include <project_vertex>\n${logoFrostedVertexProject}`)
    // Append after glass pars: frost helpers read its capture uniforms and
    // geometric bevel varying, which GLSL must see declared first.
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>\n${logoFrostedFragmentRoughness}`)
      .replace('void main() {', `${logoFrostedFragmentPars}\nvoid main() {`)
      .replace(logoCrystalFragmentComposite, logoFrostedFragmentComposite)
  }
  material.customProgramCacheKey = () => 'water-hero-frosted-crystal-v1'
  return material
}

export function setFrostedGlowPass(materials: readonly MeshStandardMaterial[], enabled: boolean) {
  for (const material of materials) {
    const uniforms = frostedMaterials.get(material)
    if (uniforms) uniforms.uFrostedGlowPass.value = enabled ? 1 : 0
  }
}

const smooth = (start: number, end: number, value: number) => {
  const t = Math.max(0, Math.min(1, (value - start) / (end - start)))
  return t * t * (3 - 2 * t)
}

/** Gently borrow the surrounding particles' arriving hue and brightness,
 * keeping the translucent icy body readable rather than cycling a solid LED
 * color. Frozen time reproduces the same settled reduced-motion lighting. */
export function updateFrostedLighting(materials: readonly MeshStandardMaterial[], time: number, underwater: number) {
  const clock = Number.isFinite(time) ? Math.max(0, time) : 0
  const submerged = Number.isFinite(underwater) ? Math.max(0, Math.min(1, underwater)) : 0
  const phase = (clock - .72 / COLOR_WAVE.speed) / COLOR_WAVE.seconds
  const cycle = Math.floor(phase), age = phase - cycle
  const palette = (index: number) => UNDERWATER_PALETTE[(index % UNDERWATER_PALETTE.length + UNDERWATER_PALETTE.length) % UNDERWATER_PALETTE.length]
  const previous = palette(cycle - 1), next = palette(cycle)
  const change = smooth(0, COLOR_WAVE.transition, age)
  const crest = smooth(0, COLOR_WAVE.attack, age) * (1 - smooth(COLOR_WAVE.peak, COLOR_WAVE.release, age))
  const tint = smooth(.20, .98, submerged) * .24
  const base = FROSTED_CRYSTAL_MATERIAL.color
  for (const material of materials) {
    const uniforms = frostedMaterials.get(material)
    if (!uniforms) continue
    uniforms.uFrostedColor.value.setRGB(
      base[0] + (previous[0] + (next[0] - previous[0]) * change - base[0]) * tint,
      base[1] + (previous[1] + (next[1] - previous[1]) * change - base[1]) * tint,
      base[2] + (previous[2] + (next[2] - previous[2]) * change - base[2]) * tint,
    )
    uniforms.uFrostedIntensity.value = FROSTED_CRYSTAL_MATERIAL.intensity * (1 + crest * submerged * .12)
  }
}
