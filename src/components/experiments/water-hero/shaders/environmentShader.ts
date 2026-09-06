/**
 * A procedural studio environment, rendered into cube maps at mount.
 *
 * There is no HDRI file and no CDN request. The scene needs reflections
 * far more than it needs a recognisable location, and rectangular soft
 * sources over a graded void give the metal something worth reflecting
 * while staying entirely art-directable from config: an HDRI would drag in
 * a real place, and every stock one reads as a stock one.
 *
 * The same shader is rendered twice with different source sets — see
 * `studioEnvironment.ts` for why the lighting the metal sees and the sky
 * the water reflects have to be two different things.
 */
export const environmentVertexShader = /* glsl */ `
varying vec3 vDirection;

void main() {
  vDirection = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

export const environmentFragmentShader = /* glsl */ `
precision highp float;

uniform vec3 uZenith;
uniform vec3 uHorizon;
uniform vec3 uNadir;
uniform vec3 uHorizonGlow;

// Each source: forward/right/up basis, half-angles, colour, intensity.
uniform vec3 uSourceForward[SOURCE_COUNT];
uniform vec3 uSourceRight[SOURCE_COUNT];
uniform vec3 uSourceUp[SOURCE_COUNT];
uniform vec3 uSourceColor[SOURCE_COUNT];
uniform vec2 uSourceHalf[SOURCE_COUNT];
uniform float uSourceIntensity[SOURCE_COUNT];

varying vec3 vDirection;

/**
 * A rectangular soft source with a feathered edge.
 *
 * A disc would be cheaper, but a round highlight on a bevel reads as a
 * point light. Rectangles are what studio softboxes are, and the long
 * straight glints they leave along an edge are most of what makes metal
 * look expensive.
 */
vec3 softbox(
  vec3 dir, vec3 forward, vec3 right, vec3 up,
  vec2 halfAngles, vec3 color, float intensity
) {
  float facing = dot(dir, forward);
  if (facing <= 0.05) return vec3(0.0);

  vec2 q = vec2(dot(dir, right), dot(dir, up)) / facing;
  vec2 e = abs(q) / max(halfAngles, vec2(1e-4));
  float m = max(e.x, e.y);

  return color * intensity * (1.0 - smoothstep(0.55, 1.0, m));
}

void main() {
  vec3 dir = normalize(vDirection);
  float elevation = dir.y;

  vec3 color = elevation >= 0.0
    ? mix(uHorizon, uZenith, pow(elevation, 0.34))
    : mix(uHorizon, uNadir, pow(-elevation, 0.42));

  // A broad band of lift around eye level.
  //
  // This is the primary source in the rig, not a decorative gradient. Dark
  // water is only visible at all because of what it reflects, and at the
  // grazing angles this composition is built on, what it reflects is the
  // sky within a few degrees of the horizon. Take this away and the
  // surface has nothing to break into facets and reads as a solid.
  // Deliberately wide: a tight band draws a hard line across the horizon.
  color += uHorizonGlow * exp(-abs(elevation) * 7.5);

  for (int i = 0; i < SOURCE_COUNT; i++) {
    color += softbox(
      dir,
      uSourceForward[i], uSourceRight[i], uSourceUp[i],
      uSourceHalf[i], uSourceColor[i], uSourceIntensity[i]
    );
  }

  gl_FragColor = vec4(color, 1.0);
}
`
