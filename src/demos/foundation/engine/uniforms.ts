import { Color, Vector3, type Material } from 'three'
import { GLSL_GROUND } from './ground'

/**
 * Uniforms shared by every material in the scene. Materials receive the
 * same objects, so one write per frame reaches the soil, the house and the
 * repairs together.
 */
export const shared = {
  uTime: { value: 0 },
  uSettle: { value: 0 },
  uBow: { value: 0 },
  uWet: { value: 0.3 },
  uTable: { value: -6 },
  uDry: { value: 0 },
  uGap: { value: 0 },
  uFrost: { value: 0 },
  uSwell: { value: 0 },
  uNegGrade: { value: 1 },
  uRegrade: { value: 0 },
  uFocus: { value: -1 },
  uFocusAmount: { value: 0 },
  uNight: { value: 0 },
  uLawnDry: { value: 0 },
  uMembrane: { value: 0 },
  uWater: { value: new Color('#2f7fd8') },
  uLight: { value: new Vector3(0.4, 0.8, 0.45).normalize() },
}

export type SharedUniforms = typeof shared

/**
 * The model's exaggerated movement: the left corner settles and the house
 * leans after it; the right-hand basement wall bows in at mid-height.
 * Geometry is authored in world space, so object space is world space.
 */
export const GLSL_DEFORM = /* glsl */ `
uniform float uSettle;
uniform float uBow;
vec3 deform(vec3 p) {
  float s = uSettle * (1.0 - smoothstep(-6.3, 2.5, p.x));
  p.y -= s * 0.24;
  p.x -= s * 0.05 * clamp((p.y + 2.8) / 9.0, 0.0, 1.0);
  float wall = smoothstep(4.9, 5.6, p.x) * (1.0 - smoothstep(6.7, 7.4, p.x));
  float h = clamp((p.y + 2.5) / 2.85, 0.0, 1.0);
  float band = step(-2.55, p.y) * step(p.y, 0.42);
  p.x -= uBow * 0.18 * sin(h * 3.14159) * wall * band;
  return p;
}
`

/** Adds the shared movement to any built-in material. */
export function deformable<T extends Material>(material: T, key: string): T {
  material.onBeforeCompile = shader => {
    shader.uniforms.uSettle = shared.uSettle
    shader.uniforms.uBow = shared.uBow
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${GLSL_DEFORM}`)
      .replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed = deform(transformed);')
  }
  material.customProgramCacheKey = () => `datum-deform-${key}`
  return material
}

export { GLSL_GROUND }
