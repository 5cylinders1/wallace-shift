/**
 * The site in numbers. Metres, grade at y = 0, the section cut at z = 0 and
 * everything modelled behind it. The same strata boundaries are evaluated in
 * TypeScript (to paint the soil) and in GLSL (to wet, dry and freeze it), so
 * the two definitions below must stay identical.
 */

export const EARTH = { x0: -16, x1: 16, z0: -18, bottom: -10, top: 0.7 }

export const HOUSE = {
  x0: -6, x1: 6, z0: -7.25,
  wall: 0.25,
  /** Top of the poured basement wall, a little above grade. */
  wallTop: 0.35,
  slabTop: -2.35,
  slabBottom: -2.5,
  footingTop: -2.5,
  footingBottom: -2.8,
  footingHalf: 0.35,
  joistTop: 0.59,
  floorTop: 0.62,
  ceiling: 3.3,
  eave: 3.3,
  ridge: 5.95,
  overhang: 0.55,
}

/** Kansas City, Missouri's published footing depth: 36 inches below grade. */
export const FROST_DEPTH = 0.9144

export const topsoilBottom = (x: number) => -0.38 + 0.05 * Math.sin(0.9 * x + 0.3) + 0.03 * Math.sin(2.3 * x)
export const clayBottom = (x: number) => -4.3 + 0.28 * Math.sin(0.23 * x + 0.8) + 0.12 * Math.sin(0.71 * x + 2.1)
export const shaleBottom = (x: number) => -6.9 + 0.35 * Math.sin(0.17 * x + 2.4) + 0.1 * Math.sin(0.53 * x)

/** Outer edge of the backfill beside a basement wall, wider toward the surface. */
export const backfillEdge = (y: number) => 6.45 + 0.9 * Math.max(0, Math.min(1, (y + 2.85) / 2.85))

/**
 * Grade height. `negative` dips the soil toward the right-hand wall (a low
 * spot that holds water); `regrade` builds it up to fall away from the house.
 */
export function gradeAt(x: number, negative: number, regrade: number): number {
  const right = Math.max(0, x - 6)
  const dip = -0.16 * negative * Math.exp(-((x - 6.9) ** 2) / 0.9) * (x > 6 ? 1 : 0)
  const build = regrade * 0.24 * Math.max(0, 1 - right / 3.4) * (x > 6 ? 1 : 0)
  return dip + build
}

export const GLSL_GROUND = /* glsl */ `
float topsoilBottom(float x) { return -0.38 + 0.05 * sin(0.9 * x + 0.3) + 0.03 * sin(2.3 * x); }
float clayBottom(float x) { return -4.3 + 0.28 * sin(0.23 * x + 0.8) + 0.12 * sin(0.71 * x + 2.1); }
float shaleBottom(float x) { return -6.9 + 0.35 * sin(0.17 * x + 2.4) + 0.1 * sin(0.53 * x); }
float backfillEdge(float y) { return 6.45 + 0.9 * clamp((y + 2.85) / 2.85, 0.0, 1.0); }
float gradeAt(float x, float negative, float regrade) {
  float right = max(0.0, x - 6.0);
  float side = step(6.0, x);
  float dip = -0.16 * negative * exp(-pow(x - 6.9, 2.0) / 0.9) * side;
  float build = regrade * 0.24 * max(0.0, 1.0 - right / 3.4) * side;
  return dip + build;
}
float hash21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float valueNoise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p);
  float a = hash21(i), b = hash21(i + vec2(1.0, 0.0)), c = hash21(i + vec2(0.0, 1.0)), d = hash21(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
/** Distance to the nearest edge of a jittered cell pattern: shrinkage cracks in drying clay. */
float cellEdge(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p);
  float d1 = 8.0; float d2 = 8.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 g = vec2(float(x), float(y));
    vec2 o = vec2(hash21(i + g), hash21(i + g + 17.1));
    float d = length(g + o - f);
    if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) { d2 = d; }
  }
  return d2 - d1;
}
`
