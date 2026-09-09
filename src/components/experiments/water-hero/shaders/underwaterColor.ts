/** Successive colored light fronts travel from the mark into the fixed volume.
 * Shared by every layer: no per-particle random hues or geometry expansion. */
export const COLOR_WAVE = { seconds: 5.6, speed: 1.65, transition: .18, attack: .06, peak: .10, release: .32 } as const

// The rim and particle volume share one palette and clock. A local glow
// follows the arriving light rather than adding another moving light source.
export const UNDERWATER_PALETTE = [
  [.012, .30, 1.0], [.20, .018, 1.0], [1.0, .028, .11],
  [1.0, .64, .012], [.012, 1.0, .36],
] as const

export const underwaterColorGLSL = /* glsl */ `
vec3 underwaterPalette(float index) {
  float color = mod(index, 5.0);
  ${UNDERWATER_PALETTE.map((color, index) => `${index < 4 ? `if (color < ${(index + 1).toFixed(1)}) ` : ''}return vec3(${color.join(', ')});`).join('\n  ')}
}
float underwaterPhase(float radius, float time) {
  return (time - radius / ${COLOR_WAVE.speed.toFixed(2)}) / ${COLOR_WAVE.seconds.toFixed(2)};
}
float underwaterFront(float age) {
  return smoothstep(0.0, ${COLOR_WAVE.attack.toFixed(2)}, age)
    * (1.0 - smoothstep(${COLOR_WAVE.peak.toFixed(2)}, ${COLOR_WAVE.release.toFixed(2)}, age));
}
vec4 underwaterLight(vec3 worldPosition, vec3 origin, float time) {
  // Distance delays the exact same color front at each layer. A stopped
  // camera still sees successive fronts passing through the formations.
  vec3 delta = worldPosition - origin;
  float radius = length(delta * vec3(1.0, .86, .80));
  float phase = underwaterPhase(radius, time);
  float cycle = floor(phase);
  float age = fract(phase);
  float change = smoothstep(0.0, ${COLOR_WAVE.transition.toFixed(2)}, age);
  vec3 color = mix(underwaterPalette(cycle - 1.0), underwaterPalette(cycle), change);
  float front = underwaterFront(age);
  // A visible pulse has a quick rise, a bright traveling crest, then a
  // longer decay. The exact same front controls grain diameter in both fields.
  return vec4(color * (.45 + front * 3.5), front);
}
`
