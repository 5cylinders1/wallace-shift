import { milkyWayGLSL } from './nightSky'

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
uniform float uHorizonFalloff;
uniform float uNightSky;

// Each source: forward/right/up basis, half-angles, colour, intensity.
uniform vec3 uSourceForward[SOURCE_COUNT];
uniform vec3 uSourceRight[SOURCE_COUNT];
uniform vec3 uSourceUp[SOURCE_COUNT];
uniform vec3 uSourceColor[SOURCE_COUNT];
uniform vec2 uSourceHalf[SOURCE_COUNT];
uniform float uSourceIntensity[SOURCE_COUNT];

varying vec3 vDirection;
${milkyWayGLSL}

/** Visible sky retains its established feathered source. Metal receives
 * a graduated diffusion card: no constant center to flatten the face,
 * and no hard shoulder to draw a white outline around every bevel. */
vec3 softbox(
  vec3 dir, vec3 forward, vec3 right, vec3 up,
  vec2 halfAngles, vec3 color, float intensity
) {
  float facing = dot(dir, forward);
  if (facing <= 0.05) return vec3(0.0);

  vec2 q = vec2(dot(dir, right), dot(dir, up)) / facing;
  vec2 e = abs(q) / max(halfAngles, vec2(1e-4));
  float m = max(e.x, e.y);

  float skyProfile = 1.0 - smoothstep(0.55, 1.0, m);
  float diffusion = exp(-dot(e * vec2(1.50, 1.10), e * vec2(1.50, 1.10)));
  float metalProfile = diffusion * (1.0 - smoothstep(1.2, 1.8, m));
  return color * intensity * mix(metalProfile, skyProfile, uNightSky);
}

void main() {
  vec3 dir = normalize(vDirection);
  float elevation = dir.y;

  vec3 color = elevation >= 0.0
    ? mix(uHorizon, uZenith, pow(elevation, 0.34))
    : mix(uHorizon, uNadir, pow(-elevation, 0.42));

  // The visible sky gets a narrow, near-black atmospheric trace; the
  // separate lighting cube retains its wider studio lift for the metal.
  color += uHorizonGlow * exp(-abs(elevation) * uHorizonFalloff);
  if (uNightSky > .5) color += milkyWay(dir) * .12;

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
