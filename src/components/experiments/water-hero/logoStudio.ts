import { FrontSide, MeshPhysicalMaterial, MeshStandardMaterial, type Material } from 'three'
import { createLogoCrystalMaterial, logoGlassUniforms } from './logoMaterial'
import { logoCrystalFragmentNormal } from './shaders/logoGlass'

/** WebGL translation of About's fine_brushed_aluminum / optical_glass pair.
 * Independent materials keep every saved experiment's appearance untouched. */
export const STUDIO_ALUMINUM_MATERIAL = {
  baseColor: [.63, .66, .69],
  metalness: 1,
  roughness: .25,
  anisotropy: .64,
  envMapIntensity: 1.35,
} as const

export const STUDIO_BLUE_CRYSTAL_MATERIAL = {
  baseColor: [.87, .96, 1],
  roughness: .021,
  ior: 1.46,
  envMapIntensity: .95,
  /** Beer-Lambert absorption in this scene's much smaller world scale. */
  absorption: [3.6, 1.0, .065],
  specularColor: [.24, .60, 1],
  dispersion: .012,
  internalReflection: 1.05,
} as const

/** Broad optical facets stay fixed to the slash. They redirect the real
 * photographic cards and captured scene, leaving clear dark regions between
 * reflections; they do not paint a blue fill or emit an animated highlight. */
const studioCrystalNormal = /* glsl */ `
float studioFaceWeight = 1.0 - smoothstep(.004, .045, vGlassBevel);
float studioFaceSign = dot(normal, vGlassFaceNormal) < 0.0 ? -1.0 : 1.0;
vec2 studioPlane = vGlassPlane / 6.0;
float studioAlong = clamp((.081148 - studioPlane.y) / .162296, 0.0, 1.0);
float studioAcross = clamp((studioPlane.x + .47 * studioPlane.y + .027) / .054, 0.0, 1.0);
// The facets remain crisp, but each boundary covers a pixel footprint.
// MSAA only smooths geometry coverage, so hard fragment branches alias
// inside the crystal even when the canvas has antialiasing enabled.
float studioUpperEdge = studioAlong - (.24 + .62 * studioAcross);
float studioLowerEdge = studioAlong - (.76 - .46 * studioAcross);
float studioSideEdge = studioAcross - (.82 - .24 * studioAlong);
float studioUpperWidth = max(fwidth(studioUpperEdge), .00001);
float studioLowerWidth = max(fwidth(studioLowerEdge), .00001);
float studioSideWidth = max(fwidth(studioSideEdge), .00001);
float studioUpper = 1.0 - smoothstep(-studioUpperWidth * .5, studioUpperWidth * .5, studioUpperEdge);
float studioLower = smoothstep(-studioLowerWidth * .5, studioLowerWidth * .5, studioLowerEdge);
float studioSide = smoothstep(-studioSideWidth * .5, studioSideWidth * .5, studioSideEdge);
vec2 studioFacet = mix(vec2(-.018, .008), vec2(.055, -.030), studioLower);
studioFacet = mix(studioFacet, vec2(-.13, .09), studioUpper);
studioFacet = mix(studioFacet, vec2(.09, .04), studioSide);
vec3 studioTilt = normalize(vGlassTangentX) * studioFacet.x
  + normalize(vGlassTangentZ) * studioFacet.y;
studioTilt -= normal * dot(normal, studioTilt);
normal = normalize(normal - studioTilt * studioFaceSign * studioFaceWeight);
`

const studioMaterials = new WeakMap<MeshStandardMaterial, 'aluminum' | 'crystal'>()
export const logoStudioFinish = (material: MeshStandardMaterial) => studioMaterials.get(material)
const aluminumGlow = new WeakMap<MeshStandardMaterial, { value: number }>()

export function setStudioGlowPass(materials: readonly MeshStandardMaterial[], enabled: boolean) {
  for (const material of materials) {
    const uniform = aluminumGlow.get(material)
    if (uniform) uniform.value = enabled ? 1 : 0
  }
}

export function createLogoStudioAluminumMaterial(source: Material) {
  const material = new MeshPhysicalMaterial()
  if (source instanceof MeshStandardMaterial) MeshStandardMaterial.prototype.copy.call(material, source)
  material.defines = { STANDARD: '', PHYSICAL: '' }
  material.name = `${source.name || 'WS'}_StudioBrushedAluminum`
  material.color.setRGB(...STUDIO_ALUMINUM_MATERIAL.baseColor)
  material.metalness = STUDIO_ALUMINUM_MATERIAL.metalness
  material.roughness = STUDIO_ALUMINUM_MATERIAL.roughness
  material.anisotropy = STUDIO_ALUMINUM_MATERIAL.anisotropy
  material.envMapIntensity = STUDIO_ALUMINUM_MATERIAL.envMapIntensity
  material.transmission = material.clearcoat = 0
  material.side = FrontSide
  material.transparent = false
  material.opacity = 1
  material.depthWrite = true
  material.emissive.setScalar(0)
  material.map = material.normalMap = material.bumpMap = material.roughnessMap = null
  material.metalnessMap = material.emissiveMap = material.aoMap = material.alphaMap = null
  studioMaterials.set(material, 'aluminum')
  const glowPass = { value: 0 }
  aluminumGlow.set(material, glowPass)
  material.onBeforeCompile = shader => {
    shader.uniforms.uStudioGlowPass = glowPass
    const varyings = 'varying vec3 vStudioPosition;\nvarying vec3 vStudioVertical;\nvarying vec3 vStudioHorizontal;'
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${varyings}`)
      .replace('#include <project_vertex>', `#include <project_vertex>
        vStudioPosition = transformed;
        vStudioVertical = normalize((modelViewMatrix * vec4(0.0, 0.0, 1.0, 0.0)).xyz);
        vStudioHorizontal = normalize((modelViewMatrix * vec4(1.0, 0.0, 0.0, 0.0)).xyz);`)
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${varyings}\nuniform float uStudioGlowPass;`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        // Object-fixed brushing fades below a pixel instead of shimmering.
        float studioGrain = vStudioPosition.x * 7900.0 + sin(vStudioPosition.z * 17.0) * .6;
        float studioResolved = 1.0 - smoothstep(.4, 2.0, fwidth(studioGrain));
        roughnessFactor += sin(studioGrain) * .015 * studioResolved;`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        #ifdef USE_ANISOTROPY
          // These rounded meshes have no UV atlas. Use the authored upright
          // axis, with a nondegenerate fallback at the horizontal end walls.
          vec3 studioTangent = vStudioVertical - normal * dot(vStudioVertical, normal);
          if (dot(studioTangent, studioTangent) < .001)
            studioTangent = vStudioHorizontal - normal * dot(vStudioHorizontal, normal);
          studioTangent = normalize(studioTangent);
          tbn = mat3(studioTangent, normalize(cross(normal, studioTangent)), normal);
        #endif`)
      .replace('#include <opaque_fragment>', `
        // Reflective metal never blooms; the opening wrapper adds only its
        // temporary charge after this isolated-emission mask is cleared.
        if (uStudioGlowPass > .5) outgoingLight = vec3(0.0);
        #include <opaque_fragment>`)
  }
  material.customProgramCacheKey = () => 'water-hero-studio-brushed-aluminum-v1'
  return material
}

/** Only WS_Right transmits a scene capture. The W remains a solid conductor. */
export function createLogoStudioCrystalMaterial(source: Material, worldThickness: number) {
  const material = createLogoCrystalMaterial(source, worldThickness, 'clear')
  const profile = STUDIO_BLUE_CRYSTAL_MATERIAL
  material.name = `${source.name || 'WS'}_StudioBlueOpticalCrystal`
  material.color.setRGB(...profile.baseColor)
  material.roughness = profile.roughness
  material.ior = profile.ior
  material.envMapIntensity = profile.envMapIntensity
  material.specularColor.setRGB(...profile.specularColor)
  material.iridescence = 0
  material.clearcoat = .10
  material.clearcoatRoughness = .025
  const glass = logoGlassUniforms(material)!
  glass.uGlassAbsorption.value.setRGB(...profile.absorption)
  glass.uGlassDispersion.value = profile.dispersion
  glass.uGlassInternalReflection.value = profile.internalReflection
  const compileCrystal = material.onBeforeCompile
  material.onBeforeCompile = (shader, renderer) => {
    compileCrystal(shader, renderer)
    shader.fragmentShader = shader.fragmentShader
      .replace(logoCrystalFragmentNormal, studioCrystalNormal)
      // The rear interface needs the same pixel-footprint filtering as
      // Three's front reflection. Raw polish makes the narrow shoulder
      // sparkle and stair-step when it is only a few mobile pixels wide.
      .replace('getIBLRadiance(insideView, rearNormal, roughness)',
        'getIBLRadiance(insideView, rearNormal, material.roughness)')
  }
  studioMaterials.set(material, 'crystal')
  material.customProgramCacheKey = () => 'water-hero-studio-blue-optical-crystal-v3'
  return material
}
