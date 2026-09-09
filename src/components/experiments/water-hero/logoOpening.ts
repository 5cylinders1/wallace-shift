import { Color, Matrix4, Vector4, type MeshStandardMaterial, type Object3D } from 'three'
import { sampleOpeningReveal } from './openingReveal'
import { LED_LOGO_MATERIAL } from './waterHeroConfig'
import { logoOpeningVertexPars, logoOpeningVertexNormal, logoOpeningVertexProject,
  logoOpeningFragmentPars, logoOpeningFragmentComposite } from './shaders/logoOpening'

/** Measured midpoint of the WS_Left/WS_Right gap, in the WS_Logo native
 * frame. Width normalization is isotropic, so distance stays meaningful. */
export const OPENING_CUT = {
  center: [-.023108769, .008498222],
  width: .295669027,
  points: [[.190243643, -.274456333], [.118533052, -.120210236],
    [.152007139, .007673163], [.027885364, .274456333]],
  arc: [0, .285147282, .506746173, 1],
  halfGap: [.063028768, .063314916, .008600065, .009149119].map(width => width / (.295669027 * 2)),
} as const

export function createOpeningFrame(mesh: Object3D, authoredRoot: Object3D) {
  return new Matrix4().makeScale(1 / OPENING_CUT.width, 1 / OPENING_CUT.width, 1 / OPENING_CUT.width)
    .multiply(new Matrix4().makeTranslation(-OPENING_CUT.center[0], 0, -OPENING_CUT.center[1]))
    .multiply(authoredRoot.matrixWorld.clone().invert()).multiply(mesh.matrixWorld)
}

function createUniforms(frame: Matrix4, glass: boolean, proxy: boolean) {
  return {
    uOpeningFrame: { value: frame.clone() },
    uOpeningTrace: { value: 1 },
    uOpeningTraceStrength: { value: 0 },
    uOpeningSurface: { value: 1 },
    uOpeningGlass: { value: glass ? 1 : 0 },
    uOpeningEmissiveGlass: { value: 0 },
    uOpeningGlowPass: { value: 0 },
    uOpeningGain: { value: proxy ? LED_LOGO_MATERIAL.reflectionGain : 1 },
    uOpeningColor: { value: new Color().setRGB(.52, .82, 1) },
    uOpeningSegments: { value: OPENING_CUT.points.slice(0, 3).map((p, i) =>
      new Vector4(p[0], p[1], OPENING_CUT.points[i + 1][0], OPENING_CUT.points[i + 1][1])) },
    uOpeningArc: { value: new Vector4(...OPENING_CUT.arc) },
    uOpeningHalfGap: { value: new Vector4(...OPENING_CUT.halfGap) },
  }
}
const openingMaterials = new WeakMap<MeshStandardMaterial, ReturnType<typeof createUniforms>>()
export const logoOpeningUniforms = (material: MeshStandardMaterial) => openingMaterials.get(material)

/** Wrap each owned material once. Finished presets retain their original
 * physical shading; animation changes uniforms without allocating materials. */
export function installLogoOpening(material: MeshStandardMaterial, frame: Matrix4, glass: boolean, proxy = false) {
  if (openingMaterials.has(material)) return
  const uniforms = createUniforms(frame, glass, proxy)
  openingMaterials.set(material, uniforms)
  const compile = material.onBeforeCompile, key = material.customProgramCacheKey()
  material.onBeforeCompile = (shader, renderer) => {
    compile(shader, renderer)
    Object.assign(shader.uniforms, uniforms)
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${logoOpeningVertexPars}`)
      .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>\n${logoOpeningVertexNormal}`)
      .replace('#include <project_vertex>', `#include <project_vertex>\n${logoOpeningVertexProject}`)
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${logoOpeningFragmentPars}`)
      .replace('#include <opaque_fragment>', `${logoOpeningFragmentComposite}\n#include <opaque_fragment>`)
  }
  material.customProgramCacheKey = () => `${key}-opening-cut-v4`
}

export function updateLogoOpening(materials: readonly MeshStandardMaterial[], progress: number, still = false) {
  const reveal = sampleOpeningReveal(progress, still)
  for (const material of materials) {
    const uniforms = openingMaterials.get(material)
    if (!uniforms) continue
    uniforms.uOpeningTrace.value = reveal.trace
    uniforms.uOpeningTraceStrength.value = reveal.traceStrength
    uniforms.uOpeningSurface.value = reveal.surface
  }
}

export function setOpeningGlowPass(materials: readonly MeshStandardMaterial[], enabled: boolean) {
  for (const material of materials) {
    const uniforms = openingMaterials.get(material)
    if (uniforms) uniforms.uOpeningGlowPass.value = enabled ? 1 : 0
  }
}
