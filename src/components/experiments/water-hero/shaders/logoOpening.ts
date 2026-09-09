/** A one-time, scroll-reversible charge along the actual central cut.
 * Coordinates are shared by both pieces in the authored XZ plane. */
export const OPENING_CUT_BLEND = .04

export const logoOpeningVertexPars = /* glsl */ `
uniform mat4 uOpeningFrame;
varying vec2 vOpeningPlane;
varying float vOpeningFace;
varying vec3 vOpeningWorld;
`
export const logoOpeningVertexNormal = /* glsl */ `
vOpeningFace = abs(normalize(objectNormal).y);
`
export const logoOpeningVertexProject = /* glsl */ `
vOpeningPlane = (uOpeningFrame * vec4(transformed, 1.0)).xz;
vOpeningWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;
`
export const logoOpeningFragmentPars = /* glsl */ `
uniform float uOpeningTrace;
uniform float uOpeningTraceStrength;
uniform float uOpeningSurface;
uniform float uOpeningGlass;
uniform float uOpeningEmissiveGlass;
uniform float uOpeningGlowPass;
uniform float uOpeningGain;
uniform vec3 uOpeningColor;
uniform vec4 uOpeningSegments[3];
uniform vec4 uOpeningArc;
uniform vec4 uOpeningHalfGap;
varying vec2 vOpeningPlane;
varying float vOpeningFace;
varying vec3 vOpeningWorld;

// Blend the light contributions, not a winning segment or its arc coordinate.
// A nearest-segment switch jumps arc/width on its bisector and draws a seam;
// averaging arc before evaluating a head could invent a second light front.
// Distance-relative exponential weights keep the transition continuous and
// well-conditioned even on the outer stroke, far from the central cut.
vec2 openingCut(vec2 p) {
  vec3 samples[3];
  float nearest = 100.0;
  for (int i = 0; i < 3; i++) {
    vec4 segment = uOpeningSegments[i];
    vec2 line = segment.zw - segment.xy;
    float along = clamp(dot(p - segment.xy, line) / max(dot(line, line), .000001), 0.0, 1.0);
    float distanceToCut = length(p - segment.xy - line * along);
    samples[i] = vec3(distanceToCut, mix(uOpeningArc[i], uOpeningArc[i + 1], along),
      mix(uOpeningHalfGap[i], uOpeningHalfGap[i + 1], along));
    nearest = min(nearest, distanceToCut);
  }
  vec2 blended = vec2(0.0);
  float totalWeight = 0.0;
  for (int i = 0; i < 3; i++) {
    float weight = exp(-(samples[i].x - nearest) / ${OPENING_CUT_BLEND});
    float bankDistance = max(0.0, samples[i].x - samples[i].z);
    float behind = uOpeningTrace - samples[i].y;
    float head = exp(-pow(behind / .075, 2.0));
    float trail = smoothstep(0.0, .025, behind) * exp(-max(behind, 0.0) / .14) * .48;
    float bankLight = exp(-bankDistance * 170.0) * 1.5 + exp(-bankDistance * 32.0) * .30;
    blended += vec2(bankDistance, (head + trail) * bankLight) * weight;
    totalWeight += weight;
  }
  return blended / totalWeight;
}
`
export const logoOpeningFragmentComposite = /* glsl */ `
// Clear glass contributes only its temporary charge to the isolated halo.
// Frosted crystal has already isolated its interior light in its own shader.
if (uOpeningGlowPass > .5 && cameraPosition.y > 0.0 && vOpeningWorld.y < 0.0) discard;
if (uOpeningGlowPass > .5 && uOpeningGlass > .5 && uOpeningEmissiveGlass < .5) outgoingLight = vec3(0.0);
if (uOpeningSurface < 1.0 || uOpeningTraceStrength > 0.0) {
  vec2 cut = openingCut(vOpeningPlane);
  float bankDistance = cut.x;
  float face = smoothstep(.12, .97, vOpeningFace);
  float noV = clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0);
  float delay = min(.52, bankDistance * 1.7);
  float settled = smoothstep(delay, 1.0, uOpeningSurface);
  // A quiet blue-black face remains legible before ignition. This temporary
  // fill disappears completely at rest, leaving the selected finish intact.
  vec3 quiet = outgoingLight * mix(.018, .34, uOpeningGlass)
    + vec3(.014, .020, .025) * face * (.55 + .45 * noV) * uOpeningGain;
  if (uOpeningGlowPass > .5) quiet = vec3(0.0);
  outgoingLight = mix(quiet, outgoingLight, settled);
  vec3 charge = uOpeningColor * cut.y
    * face * uOpeningTraceStrength * 2.8 * uOpeningGain;
  outgoingLight += charge;
}
`
