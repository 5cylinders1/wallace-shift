/**
 * The interactive ripple field: a discretised wave equation stepped on the
 * GPU between two ping-pong targets.
 *
 * `.r` carries the current height, `.g` the previous one — the second
 * order term the wave equation needs. This runs on a fixed timestep of
 * its own, entirely independent of scroll, which is what lets ripples keep
 * propagating and dying away while the narrative is frozen.
 */
export const rippleVertexShader = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

export const rippleFragmentShader = /* glsl */ `
precision highp float;

uniform sampler2D uPrevious;
uniform vec2 uTexel;
uniform float uDamping;

/**
 * Four impulse slots: xy = centre in simulation UV, z = radius in UV,
 * w = amplitude. An unused slot carries amplitude 0 rather than being
 * skipped by a count, which keeps the loop uniform-free.
 */
uniform vec4 uSplats[4];

varying vec2 vUv;

void main() {
  vec2 state = texture2D(uPrevious, vUv).rg;
  float height = state.r;
  float previous = state.g;

  float l = texture2D(uPrevious, vUv - vec2(uTexel.x, 0.0)).r;
  float r = texture2D(uPrevious, vUv + vec2(uTexel.x, 0.0)).r;
  float d = texture2D(uPrevious, vUv - vec2(0.0, uTexel.y)).r;
  float u = texture2D(uPrevious, vUv + vec2(0.0, uTexel.y)).r;

  // Explicit wave step at the stability limit for a unit grid.
  float next = (l + r + d + u) * 0.5 - previous;
  next *= uDamping;

  for (int i = 0; i < 4; i++) {
    vec2 delta = vUv - uSplats[i].xy;
    float radius = max(uSplats[i].z, 1e-5);
    next += uSplats[i].w * exp(-dot(delta, delta) / (radius * radius));
  }

  // A hard boundary bounces the wave straight back and draws a square
  // echo on the water. Fading the field out at the border absorbs it.
  vec2 edge = min(vUv, 1.0 - vUv);
  next *= smoothstep(0.0, 0.07, min(edge.x, edge.y));

  gl_FragColor = vec4(next, height, 0.0, 1.0);
}
`
