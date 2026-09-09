import { Color, FrontSide, Mesh, MeshPhysicalMaterial, MeshStandardMaterial, Vector2, Vector4,
  type Material, type Object3D, type Texture } from 'three'
import { ELECTRIC_LOGO_MATERIAL, GLASSMORPH_LOGO_MATERIAL, LED_LOGO_MATERIAL, LOGO_MATERIAL, type LogoAppearance } from './waterHeroConfig'
import { COLOR_WAVE, UNDERWATER_PALETTE } from './shaders/underwaterColor'
import { logoGlassVertexPars, logoGlassVertexNormal, logoGlassVertexProject,
  logoGlassFragmentPars, logoGlassFragmentComposite, logoCrystalFragmentComposite, logoCrystalFragmentNormal } from './shaders/logoGlass'
import { logoLEDVertexPars, logoLEDVertexNormal, logoLEDVertexProject,
  logoLEDFragmentPars, logoLEDFragmentComposite } from './shaders/logoLED'

export function logoMaterials(root: Object3D) {
  const materials = new Set<MeshStandardMaterial>()
  root.traverse(child => {
    if (!(child instanceof Mesh)) return
    for (const material of Array.isArray(child.material) ? child.material : [child.material]) {
      if (material instanceof MeshStandardMaterial) materials.add(material)
    }
  })
  return [...materials]
}

function createGlassUniforms(worldThickness: number) {
  return {
    uGlassScene: { value: null as Texture | null },
    uGlassResolution: { value: new Vector2(1, 1) },
    uGlassWorldThickness: { value: worldThickness },
    uGlassReady: { value: 0 },
    uGlassCrystalProfile: { value: 0 },
    uGlassAbsorption: { value: new Color().setRGB(1.65, 1.30, 1.10) },
    uGlassBodyFill: { value: new Vector2(.14, .06) },
    uGlassDispersion: { value: 0 },
    uGlassInternalReflection: { value: 0 },
    uGlassRimColor: { value: new Color().setRGB(...LOGO_MATERIAL.rimColor) },
    uGlassRimStrength: { value: LOGO_MATERIAL.rimStrength as number },
  }
}
export type LogoGlassUniforms = ReturnType<typeof createGlassUniforms>
const glassUniforms = new WeakMap<MeshStandardMaterial, LogoGlassUniforms>()
export const logoGlassUniforms = (material: MeshStandardMaterial) => glassUniforms.get(material)

/** A route-owned material; never modify the cached source GLB. The opaque
 * depth write is deliberate: the shader already transmits the captured
 * background, and foreground particles/fog must then composite exactly once. */
export function createLogoGlassMaterial(source: Material, worldThickness: number) {
  const material = new MeshPhysicalMaterial()
  if (source instanceof MeshStandardMaterial) MeshStandardMaterial.prototype.copy.call(material, source)
  // Standard.copy resets defines; retain Physical's IOR/specular branches.
  material.defines = { STANDARD: '', PHYSICAL: '' }
  material.name = `${source.name || 'WS'}_SmokedGlass`
  material.color.setRGB(...LOGO_MATERIAL.baseColor)
  material.metalness = LOGO_MATERIAL.metalness
  material.roughness = LOGO_MATERIAL.roughness
  material.ior = LOGO_MATERIAL.ior
  material.specularIntensity = LOGO_MATERIAL.specularIntensity
  material.envMapIntensity = LOGO_MATERIAL.envMapIntensity
  // Native transmission captures opaque objects only, missing the particles.
  material.transmission = 0
  material.clearcoat = 0
  material.side = FrontSide
  material.transparent = false
  material.opacity = 1
  material.depthWrite = true
  material.emissive.setScalar(0)
  const uniforms = createGlassUniforms(worldThickness)
  glassUniforms.set(material, uniforms)
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, uniforms)
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${logoGlassVertexPars}`)
      .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>\n${logoGlassVertexNormal}`)
      .replace('#include <project_vertex>', `#include <project_vertex>\n${logoGlassVertexProject}`)
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${logoGlassFragmentPars}`)
      .replace('#include <opaque_fragment>', `${logoGlassFragmentComposite}\n#include <opaque_fragment>`)
  }
  material.customProgramCacheKey = () => 'water-hero-smoked-glass-v1'
  return material
}

/** Clear polished glass uses the same scene capture and authored bevels as
 * the smoked prototype, with much less absorption and no emitted rim. */
export function createLogoCrystalMaterial(source: Material, worldThickness: number) {
  const material = createLogoGlassMaterial(source, worldThickness)
  const profile = GLASSMORPH_LOGO_MATERIAL
  material.name = `${source.name || 'WS'}_CrystalGlass`
  material.color.setRGB(...profile.baseColor)
  material.metalness = profile.metalness
  material.roughness = profile.roughness
  material.ior = profile.ior
  material.specularIntensity = profile.specularIntensity
  material.envMapIntensity = profile.envMapIntensity
  material.iridescence = profile.iridescence
  material.iridescenceIOR = profile.iridescenceIOR
  material.iridescenceThicknessRange = [...profile.iridescenceThicknessRange]
  const uniforms = glassUniforms.get(material)!
  uniforms.uGlassCrystalProfile.value = 1
  uniforms.uGlassAbsorption.value.setRGB(...profile.absorption)
  uniforms.uGlassBodyFill.value.set(...profile.bodyFill)
  uniforms.uGlassDispersion.value = profile.dispersion
  uniforms.uGlassInternalReflection.value = profile.internalReflection
  uniforms.uGlassRimStrength.value = 0
  const compileGlass = material.onBeforeCompile
  material.onBeforeCompile = (shader, renderer) => {
    compileGlass(shader, renderer)
    shader.fragmentShader = shader.fragmentShader.replace(logoGlassFragmentComposite, logoCrystalFragmentComposite)
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <normal_fragment_maps>', `#include <normal_fragment_maps>\n${logoCrystalFragmentNormal}`,
    )
    // Native thin-film Fresnel only on the actual rounded shoulders; the
    // broad front/back planes remain clear, not a rainbow-painted surface.
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <lights_physical_fragment>',
      `#include <lights_physical_fragment>
      #ifdef USE_IRIDESCENCE
        float crystalBevel = smoothstep(.003, .045, vGlassBevel)
          * (1.0 - smoothstep(.70, .98, vGlassBevel));
        material.iridescence *= crystalBevel;
        material.iridescenceThickness = mix(iridescenceThicknessMinimum,
          iridescenceThicknessMaximum, smoothstep(.015, .38, vGlassBevel));
      #endif`,
    )
  }
  material.customProgramCacheKey = () => 'water-hero-crystal-glass-v3'
  return material
}

/** Called only after a fresh background capture. The planar reflection proxy
 * is never bound: sampling a beauty-camera texture from it would be incorrect. */
export function bindGlassScene(materials: readonly MeshStandardMaterial[], texture: Texture | null, width = 1, height = 1) {
  for (const material of materials) {
    const uniforms = glassUniforms.get(material)
    if (!uniforms) continue
    uniforms.uGlassScene.value = texture
    uniforms.uGlassResolution.value.set(width, height)
    uniforms.uGlassReady.value = texture ? 1 : 0
  }
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

/** Sample the same front at the logo rim's representative world radius.
 * Color tint and strength are modest; the actual reflected particles still
 * come from the live cube probe. No sweep or surface noise is introduced. */
export function updateGlassRim(materials: readonly MeshStandardMaterial[], time: number, underwater: number) {
  const phase = (time - .72 / COLOR_WAVE.speed) / COLOR_WAVE.seconds
  const cycle = Math.floor(phase), age = phase - cycle
  const palette = (index: number) => UNDERWATER_PALETTE[(index % UNDERWATER_PALETTE.length + UNDERWATER_PALETTE.length) % UNDERWATER_PALETTE.length]
  const previous = palette(cycle - 1), next = palette(cycle)
  const change = smooth(0, COLOR_WAVE.transition, age)
  const crest = smooth(0, COLOR_WAVE.attack, age) * (1 - smooth(COLOR_WAVE.peak, COLOR_WAVE.release, age))
  const tint = smooth(.25, .95, underwater) * .62
  for (const material of materials) {
    const uniforms = glassUniforms.get(material)
    if (!uniforms) continue
    // Clear glass gets its glints from the native reflection BRDF and the
    // captured scene. Never restore the smoked prototype's emitted rim.
    if (uniforms.uGlassCrystalProfile.value > .5) continue
    const color = uniforms.uGlassRimColor.value
    color.setRGB(...LOGO_MATERIAL.rimColor)
    const channels = ['r', 'g', 'b'] as const
    for (let i = 0; i < 3; i++) {
      const pulseColor = previous[i] + (next[i] - previous[i]) * change
      color[channels[i]] += (pulseColor - color[channels[i]]) * tint
    }
    uniforms.uGlassRimStrength.value = LOGO_MATERIAL.rimStrength * (1 + crest * underwater * .20)
  }
}

function createLEDUniforms() {
  return {
    uLEDColor: { value: new Color().setRGB(...LED_LOGO_MATERIAL.color) },
    uLEDIntensity: { value: LED_LOGO_MATERIAL.intensity as number },
    uLEDGlowPass: { value: 0 },
    uElectricMode: { value: 0 },
    uElectricTime: { value: 0 },
    uElectricSegments: { value: Array.from({ length: 16 }, () => new Vector4()) },
    uElectricSegmentCount: { value: 0 },
  }
}
const ledMaterials = new WeakMap<MeshStandardMaterial, { uniforms: ReturnType<typeof createLEDUniforms>; reflectionProxy: boolean }>()
export const logoLEDUniforms = (material: MeshStandardMaterial) => ledMaterials.get(material)?.uniforms

/** A solid opal diffuser with dark housing. No scene sampling or transparency:
 * particle occlusion, fog depth and the split use the original closed mesh. */
export function createLogoLEDMaterial(source: Material, reflectionProxy = false) {
  const material = new MeshPhysicalMaterial()
  if (source instanceof MeshStandardMaterial) MeshStandardMaterial.prototype.copy.call(material, source)
  material.defines = { STANDARD: '', PHYSICAL: '' }
  material.name = `${source.name || 'WS'}_LED`
  material.color.setRGB(...LED_LOGO_MATERIAL.housingColor)
  material.metalness = LED_LOGO_MATERIAL.metalness
  material.roughness = LED_LOGO_MATERIAL.roughness
  material.envMapIntensity = LED_LOGO_MATERIAL.envMapIntensity
  material.transmission = 0
  material.side = FrontSide
  material.transparent = false
  material.opacity = 1
  material.depthWrite = true
  material.emissive.setScalar(0)
  const uniforms = createLEDUniforms()
  if (reflectionProxy) uniforms.uLEDIntensity.value *= LED_LOGO_MATERIAL.reflectionGain
  ledMaterials.set(material, { uniforms, reflectionProxy })
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, uniforms)
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${logoLEDVertexPars}`)
      .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>\n${logoLEDVertexNormal}`)
      .replace('#include <project_vertex>', `#include <project_vertex>\n${logoLEDVertexProject}`)
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${logoLEDFragmentPars}`)
      .replace('#include <opaque_fragment>', `${logoLEDFragmentComposite}\n#include <opaque_fragment>`)
  }
  material.customProgramCacheKey = () => 'water-hero-led-electric-original-v1'
  return material
}

export function setLEDGlowPass(materials: readonly MeshStandardMaterial[], enabled: boolean) {
  for (const material of materials) {
    const uniforms = logoLEDUniforms(material)
    if (uniforms) uniforms.uLEDGlowPass.value = enabled ? 1 : 0
  }
}

/** The diffuser gently follows the existing outward light fronts underwater.
 * Its stable opening light is independent of the clock and reduced motion. */
export function updateLEDLighting(materials: readonly MeshStandardMaterial[], time: number, underwater: number, appearance: LogoAppearance = 'led') {
  const profile = appearance === 'electric' ? ELECTRIC_LOGO_MATERIAL : LED_LOGO_MATERIAL
  const phase = (time - .72 / COLOR_WAVE.speed) / COLOR_WAVE.seconds
  const cycle = Math.floor(phase), age = phase - cycle
  const palette = (index: number) => UNDERWATER_PALETTE[(index % UNDERWATER_PALETTE.length + UNDERWATER_PALETTE.length) % UNDERWATER_PALETTE.length]
  const previous = palette(cycle - 1), next = palette(cycle)
  const change = smooth(0, COLOR_WAVE.transition, age)
  const crest = smooth(0, COLOR_WAVE.attack, age) * (1 - smooth(COLOR_WAVE.peak, COLOR_WAVE.release, age))
  const tint = smooth(.30, .98, underwater) * .74
  for (const material of materials) {
    const state = ledMaterials.get(material)
    if (!state) continue
    const { uniforms, reflectionProxy } = state
    uniforms.uElectricMode.value = appearance === 'electric' ? 1 : 0
    uniforms.uElectricTime.value = appearance === 'electric' ? time : 0
    const color = uniforms.uLEDColor.value
    color.setRGB(profile.color[0], profile.color[1], profile.color[2])
    const channels = ['r', 'g', 'b'] as const
    for (let i = 0; i < 3; i++) {
      color[channels[i]] += (previous[i] + (next[i] - previous[i]) * change - color[channels[i]]) * tint
    }
    uniforms.uLEDIntensity.value = profile.intensity * (1 - underwater * .14 + crest * underwater * .16)
      * (reflectionProxy ? profile.reflectionGain : 1)
  }
}
