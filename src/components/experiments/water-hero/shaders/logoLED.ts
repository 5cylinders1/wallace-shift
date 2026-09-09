/** Solid opal LED faces in the existing dark housing. Both GLB meshes have
 * local +/-Y face normals; the presentation rig supplies their world pose.
 * The broad faces emit evenly, while their authored rounded shoulders fade
 * into the unlit extrusion. No UV texture, wireframe, or animated sweep.
 */
export const logoLEDVertexPars = /* glsl */ `
varying float vLEDFaceAlignment;
varying vec3 vLEDWorldPosition;
varying vec2 vElectricPlane;
`

/** Insert after beginnormal_vertex, while objectNormal is still authored-local. */
export const logoLEDVertexNormal = /* glsl */ `
vLEDFaceAlignment = abs(normalize(objectNormal).y);
`

/** Insert after project_vertex, with the final local vertex position available. */
export const logoLEDVertexProject = /* glsl */ `
vLEDWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;
// Authored XZ coordinates stay attached to each solid piece through the turn,
// reflection and split. Time changes current, never the geometry or its scale.
vElectricPlane = transformed.xz * 6.0;
`

export const logoLEDFragmentPars = /* glsl */ `
uniform vec3 uLEDColor;
uniform float uLEDIntensity;
uniform float uLEDGlowPass;
uniform float uElectricMode;
uniform float uElectricTime;
uniform vec4 uElectricSegments[16];
uniform float uElectricSegmentCount;
varying float vLEDFaceAlignment;
varying vec3 vLEDWorldPosition;
varying vec2 vElectricPlane;

float ledDiffuserMask(float faceAlignment) {
  return smoothstep(.78, .995, faceAlignment);
}

float electricHash(float n) { return fract(sin(n * 127.1 + 311.7) * 43758.5453); }

// Piecewise linear bends create an electrical path, not a scrolling texture.
// Each bend drifts slowly and continuously; there is no global flash or reset.
float electricBend(float y, float seed) {
  float segment = floor(y), along = fract(y);
  float a = sin(uElectricTime * .62 + electricHash(segment + seed) * 6.2831853);
  float b = sin(uElectricTime * .62 + electricHash(segment + 1.0 + seed) * 6.2831853);
  return mix(a, b, along);
}

float electricPath(float y, float seed) {
  return electricBend(y * 5.0, seed) * .078
    + electricBend(y * 16.0, seed + 19.0) * .021;
}

vec2 electricFilament(float distanceToPath, float width) {
  float aa = max(fwidth(distanceToPath), .0007);
  float core = 1.0 - smoothstep(width, width + aa, distanceToPath);
  float spill = exp(-distanceToPath * 62.0);
  return vec2(core, spill);
}

vec3 electricRadiance(vec2 p, float face, float noV) {
  // Three irregular trunks and short forks make patches of light travel through
  // the face while leaving dark gaps. The blur pass scatters only their emission.
  vec2 charge = vec2(0.0);
  for (int i = 0; i < 3; i++) {
    float lane = float(i), seed = 11.0 + lane * 37.0;
    float slope = mix(-.53, .53, step(1.0, lane));
    vec2 q = vec2(p.x + p.y * slope, p.y);
    float center = (lane - 1.0) * .27 + electricPath(q.y, seed);
    float distanceToTrunk = abs(q.x - center);
    float surge = .48 + .52 * pow(.5 + .5 * sin(q.y * 6.0 - uElectricTime * 1.65 + lane * 2.1), 3.0);
    charge += electricFilament(distanceToTrunk, .0018) * surge;
    float forkY = .18 * sin(seed) + .02 * sin(uElectricTime * .24 + lane);
    float forkProgress = q.y - forkY;
    float forkCenter = (lane - 1.0) * .27 + electricPath(forkY, seed)
      + forkProgress * (lane < 1.0 ? -1.3 : 1.3)
      + electricBend(forkProgress * 21.0, seed + 70.0) * .018;
    float forkWindow = smoothstep(-.01, .025, forkProgress) * (1.0 - smoothstep(.12, .27, forkProgress));
    charge += electricFilament(abs(q.x - forkCenter), .0011) * forkWindow * surge * .72;
  }
  // Authored rounded shoulders form the lit contour, without rectangular masks.
  float shoulder = smoothstep(.08, .42, vLEDFaceAlignment)
    * (1.0 - smoothstep(.93, .997, vLEDFaceAlignment));
  float distanceToEdge = 10.0;
  for (int edge = 0; edge < 16; edge++) {
    if (float(edge) >= uElectricSegmentCount) break;
    vec4 segment = uElectricSegments[edge];
    vec2 alongEdge = segment.zw - segment.xy;
    float nearest = clamp(dot(p - segment.xy, alongEdge) / max(dot(alongEdge, alongEdge), .000001), 0.0, 1.0);
    distanceToEdge = min(distanceToEdge, length(p - segment.xy - nearest * alongEdge));
  }
  float edgeAA = max(fwidth(distanceToEdge), .0007);
  float tracedEdge = (1.0 - smoothstep(.0025, .0025 + edgeAA, distanceToEdge))
    + exp(-distanceToEdge * 95.0) * .16;
  float contour = (shoulder * .5 + tracedEdge * face)
    * (.72 + .16 * sin(p.y * 8.0 + p.x * 5.0 - uElectricTime * 1.1));
  float edgeFill = pow(1.0 - noV, 3.0) * .065;
  vec3 hotColor = mix(uLEDColor, vec3(.68, .94, 1.0), .63);
  vec3 body = uLEDColor * (.024 + .015 * (p.y + .6) + edgeFill) * face;
  vec3 current = (hotColor * charge.x * 1.35 + uLEDColor * charge.y * .27) * face;
  return (body + current + hotColor * contour * .95) * max(0.0, uLEDIntensity);
}
`

/** Insert before opaque_fragment, after native material lighting. The HDR
 * glow pass uses the identical emission mask and radiance, with a black
 * housing. The beauty pass stays opaque and retains its normal depth write.
 */
export const logoLEDFragmentComposite = /* glsl */ `
// Above the water, only exposed faces can contribute to the direct halo.
// WaterSurface owns the refracted body below the surface. Underwater the
// whole solid logo may glow; ordinary beauty rendering is never clipped.
if (uLEDGlowPass > .5 && cameraPosition.y > 0.0 && vLEDWorldPosition.y < 0.0) discard;
float ledFace = ledDiffuserMask(vLEDFaceAlignment);
float ledNoV = clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0);
// Opal diffusion remains readable at oblique angles. This quiet angular
// falloff describes the solid face without drawing a moving light stripe.
float ledDiffusion = .90 + .10 * sqrt(ledNoV);
vec3 ledEmission = uLEDColor * max(0.0, uLEDIntensity) * ledFace * ledDiffusion;
vec3 ledHousing = outgoingLight * (1.0 - ledFace * .88);
if (uElectricMode > .5) {
  ledEmission = electricRadiance(vElectricPlane, ledFace, ledNoV);
  ledHousing = outgoingLight * .78;
}
outgoingLight = ledEmission + ledHousing * (1.0 - step(.5, uLEDGlowPass));
`
