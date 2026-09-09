/** Optical normal motion only. Distances use the shared, width-normalized
 * authored frame; none of these values changes mesh positions or contours. */
export const MERCURY_FLOW = {
  capStart: .996,
  capEnd: .9999,
  edgeStart: .012,
  edgeEnd: .052,
  maxTilt: .030,
  primaryAmplitude: .0034,
  secondaryAmplitude: .0016,
  capRoughness: .20,
  sideRoughness: .28,
} as const

export const logoMercuryVertexPars = /* glsl */ `
uniform mat4 uMercuryFrame;
varying vec2 vMercuryPlane;
varying float vMercuryFace;
varying vec3 vMercuryFaceAxis;
varying vec3 vMercuryTangentX;
varying vec3 vMercuryTangentZ;
`

export const logoMercuryVertexNormal = /* glsl */ `
vMercuryFace = abs(normalize(objectNormal).y);
vMercuryFaceAxis = normalize(normalMatrix * vec3(0.0, 1.0, 0.0));
vMercuryTangentX = normalize((modelViewMatrix * vec4(1.0, 0.0, 0.0, 0.0)).xyz);
vMercuryTangentZ = normalize((modelViewMatrix * vec4(0.0, 0.0, 1.0, 0.0)).xyz);
`

export const logoMercuryVertexProject = /* glsl */ `
// Read the established projection; never modify transformed or gl_Position.
vMercuryPlane = (uMercuryFrame * vec4(transformed, 1.0)).xz;
`

export const logoMercuryFragmentPars = /* glsl */ `
uniform float uMercuryTime;
uniform float uMercuryGlowPass;
uniform vec4 uMercurySegments[16];
uniform int uMercurySegmentCount;
varying vec2 vMercuryPlane;
varying float vMercuryFace;
varying vec3 vMercuryFaceAxis;
varying vec3 vMercuryTangentX;
varying vec3 vMercuryTangentZ;

float mercuryContourFade(vec2 p) {
  float interior = 1.0;
  for (int i = 0; i < 16; i++) {
    if (i < uMercurySegmentCount) {
      vec4 edge = uMercurySegments[i];
      vec2 direction = edge.zw - edge.xy;
      float along = clamp(dot(p - edge.xy, direction)
        / max(dot(direction, direction), .000001), 0.0, 1.0);
      float distanceToEdge = length(p - edge.xy - direction * along);
      // Multiplying independent smooth fades has no nearest-edge winner.
      // It keeps tip/notch medial axes smooth while remaining exactly zero
      // at every real cut and outer contour, including segment endpoints.
      interior *= smoothstep(${MERCURY_FLOW.edgeStart}, ${MERCURY_FLOW.edgeEnd}, distanceToEdge);
    }
  }
  return interior;
}

vec2 mercuryFlowSlope(vec2 p, float time) {
  // Two broad continuous surface slopes share one spatial frame and clock.
  // Their long periods move environment reflections slowly without a bright
  // moving stripe, grain, random texture, or an animated color term.
  float xPhase = p.x * 5.2 + time * .07 + .35;
  float zPhase = p.y * 3.8 - time * .05 - .60;
  float diagonal = p.x * 3.1 - p.y * 4.2 + time * .055 + .80;
  return vec2(
    ${MERCURY_FLOW.primaryAmplitude} * 5.2 * cos(xPhase) * sin(zPhase)
      - ${MERCURY_FLOW.secondaryAmplitude} * 3.1 * sin(diagonal),
    ${MERCURY_FLOW.primaryAmplitude} * 3.8 * sin(xPhase) * cos(zPhase)
      + ${MERCURY_FLOW.secondaryAmplitude} * 4.2 * sin(diagonal));
}
`

/** Insert after native normal maps and before physical lighting. It changes
 * only the shading normal, preserving every authored cap edge and bevel. */
export const logoMercuryFragmentNormal = /* glsl */ `
float mercuryCap = smoothstep(${MERCURY_FLOW.capStart}, ${MERCURY_FLOW.capEnd}, vMercuryFace);
float mercuryInterior = mercuryContourFade(vMercuryPlane);
vec2 mercurySlope = mercuryFlowSlope(vMercuryPlane, uMercuryTime);
mercurySlope *= min(1.0, ${MERCURY_FLOW.maxTilt} / max(length(mercurySlope), .000001));
vec3 mercuryTilt = normalize(vMercuryTangentX) * mercurySlope.x
  + normalize(vMercuryTangentZ) * mercurySlope.y;
mercuryTilt -= normal * dot(normal, mercuryTilt);
float mercuryFaceSign = dot(normal, vMercuryFaceAxis) < 0.0 ? -1.0 : 1.0;
normal = normalize(normal - mercuryTilt * mercuryFaceSign * mercuryCap * mercuryInterior);
`

export const logoMercuryFragmentRoughness = /* glsl */ `
// Satin sides remain still; the silver caps retain moderated reflections.
roughnessFactor = mix(${MERCURY_FLOW.sideRoughness}, ${MERCURY_FLOW.capRoughness}, smoothstep(.80, .995, vMercuryFace));
`

export const logoMercuryFragmentComposite = /* glsl */ `
// Mercury emits no ongoing light. The shared opening wrapper may add its
// temporary charge after the native reflected finish is removed here.
if (uMercuryGlowPass > .5) outgoingLight = vec3(0.0);
`
