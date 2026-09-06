import {
  MeshStandardMaterial,
  Mesh,
  Vector3,
  type IUniform,
  type Object3D,
  type WebGLProgramParametersWithUniforms,
} from 'three'

/**
 * Makes recently-submerged metal look wet.
 *
 * Without this, metal that has just broken the surface is identical to
 * metal that has been dry all along, and the breach loses most of its
 * physical consequence — the emblem reads as passing through a printed
 * plane rather than out of a liquid. A film of water on a polished surface
 * does two things: it darkens the substrate, and it is smoother than the
 * substrate, so it reflects harder. Both are one-line changes to the
 * standard material's inputs.
 *
 * The wet line is driven from `WSLogo`, which tracks the highest point the
 * water has recently reached and lets it fall back as the piece drains.
 *
 * Patched through `onBeforeCompile` rather than by replacing the material,
 * so the metalness, roughness and colour authored in Blender remain the
 * material's own values and everything three does for a
 * MeshStandardMaterial keeps working.
 */
/**
 * Wetness and the seam share one material patch.
 *
 * Both are per-fragment modifications of the same standard material, and
 * two separate `onBeforeCompile` hooks on one material would simply
 * overwrite each other.
 */
export interface WetnessUniforms {
  /** World Y below which the metal is wet. */
  uWetWorldY: IUniform<number>
  /** Height of the soft transition from wet to dry, in world units. */
  uWetFade: IUniform<number>
  /** Seconds, for the slow downward drift of the drainage streaks. */
  uWetTime: IUniform<number>
  /** Brightness of the meniscus line at the film's lower edge. */
  uWetBeadGain: IUniform<Vector3>
  /** World X of the split plane, and how far the glow reaches from it. */
  uSeamX: IUniform<number>
  uSeamFalloff: IUniform<number>
  /** Colour times separation. Zero while the mark is closed. */
  uSeamColor: IUniform<Vector3>
}

const CACHE_KEY = 'ws-water-hero-wetness'

export function applyWetness(
  root: Object3D,
  wetFade: number,
  beadGain: readonly [number, number, number],
  /** When false the wetness branch is compiled out; the seam remains. */
  wet: boolean,
): WetnessUniforms {
  // One shared uniform object across every mesh, so the wet line cannot
  // drift between WS_Left and WS_Right.
  const uniforms: WetnessUniforms = {
    uWetWorldY: { value: -1e9 },
    uWetFade: { value: wetFade },
    uWetTime: { value: 0 },
    uWetBeadGain: { value: new Vector3(...beadGain) },
    uSeamX: { value: 0 },
    uSeamFalloff: { value: 1 },
    uSeamColor: { value: new Vector3(0, 0, 0) },
  }

  root.traverse((child) => {
    if (!(child instanceof Mesh)) return
    const materials = Array.isArray(child.material)
      ? child.material
      : [child.material]

    materials.forEach((material) => {
      if (!(material instanceof MeshStandardMaterial)) return

      material.onBeforeCompile = (
        shader: WebGLProgramParametersWithUniforms,
      ) => {
        shader.uniforms.uWetWorldY = uniforms.uWetWorldY
        shader.uniforms.uWetFade = uniforms.uWetFade
        shader.uniforms.uWetTime = uniforms.uWetTime
        shader.uniforms.uWetBeadGain = uniforms.uWetBeadGain
        shader.uniforms.uSeamX = uniforms.uSeamX
        shader.uniforms.uSeamFalloff = uniforms.uSeamFalloff
        shader.uniforms.uSeamColor = uniforms.uSeamColor

        shader.vertexShader = shader.vertexShader
          .replace(
            '#include <common>',
            '#include <common>\nvarying vec3 vWetWorldPosition;',
          )
          .replace(
            '#include <begin_vertex>',
            '#include <begin_vertex>\nvWetWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;',
          )

        shader.fragmentShader = shader.fragmentShader
          .replace(
            '#include <common>',
            `#include <common>
varying vec3 vWetWorldPosition;
// Not a varying: written in the roughness block and read again at output,
// both within the same fragment invocation.
float vWetBead = 0.0;
uniform float uWetWorldY;
uniform float uWetFade;
uniform float uWetTime;
uniform vec3 uWetBeadGain;
uniform float uSeamX;
uniform float uSeamFalloff;
uniform vec3 uSeamColor;

// Cheap value noise, used only to give the drainage streaks a varying
// width so the film edge is not a machined horizontal line.
float wetHash(vec2 p) {
  return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453);
}
float wetNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(wetHash(i), wetHash(i + vec2(1.0, 0.0)), f.x),
    mix(wetHash(i + vec2(0.0, 1.0)), wetHash(i + vec2(1.0, 1.0)), f.x),
    f.y
  );
}`,
          )
          .replace(
            '#include <roughnessmap_fragment>',
            `#include <roughnessmap_fragment>
{
  // Drainage: the film edge is not level. It hangs lower where water is
  // still running off and higher where it has already drained, and the
  // pattern creeps downward. This is what makes wetness legible in a still
  // frame — a perfectly horizontal boundary reads as a clipping plane.
  float streak = wetNoise(
    vec2(vWetWorldPosition.x * 6.0, vWetWorldPosition.z * 6.0 - uWetTime * 0.35)
  );
  float edgeY = uWetWorldY + (streak - 0.5) * uWetFade * 1.1;

  float wetAmount = 1.0 - smoothstep(
    edgeY - uWetFade,
    edgeY,
    vWetWorldPosition.y
  );

  // A water film is smoother than the metal under it and darkens what it
  // covers — the same two changes that make wet asphalt read as wet.
#ifdef WS_WETNESS
  roughnessFactor = mix(roughnessFactor, roughnessFactor * 0.22, wetAmount);
  diffuseColor.rgb *= mix(1.0, 0.46, wetAmount);
#endif

  // The meniscus itself. A draining film beads at its lower edge and
  // catches a bright line, which is the single most readable wetness cue
  // on dark metal — darkening alone is invisible on a near-black surface.
#ifdef WS_WETNESS
  vWetBead = exp(-pow((vWetWorldPosition.y - edgeY) / (uWetFade * 0.3), 2.0))
           * step(vWetWorldPosition.y, edgeY + uWetFade);
#endif
}`,
          )
          .replace(
            '#include <tonemapping_fragment>',
            `gl_FragColor.rgb += vWetBead * uWetBeadGain;
{
  // The seam. Light spilling from between the two halves onto the interior
  // sidewalls they expose, and nowhere else — driven by distance from the
  // split plane, so a face that is not near the opening never picks it up
  // and the emblem stays a solid object rather than a lit sign.
  float seam = exp(
    -abs(vWetWorldPosition.x - uSeamX) / max(uSeamFalloff, 1e-3)
  );
  gl_FragColor.rgb += uSeamColor * seam;
}
#include <tonemapping_fragment>`,
          )
      }

      // Without a stable key three treats every patched material as unique
      // and recompiles it on each rebuild.
      material.defines = { ...(material.defines ?? {}), ...(wet ? { WS_WETNESS: '' } : {}) }
      material.customProgramCacheKey = () => CACHE_KEY + (wet ? '-wet' : '')
      material.needsUpdate = true
    })
  })

  return uniforms
}
