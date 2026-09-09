/** A recessed steady source confined to the two actual central-cut banks. */
export const CUT_LIGHT_SHAPE = {
  lipWidth: .0018,
  lipStrength: .70,
  wallWidth: .0016,
  terminalFade: .010,
  wallNormalStart: .82,
  wallNormalEnd: .98,
  recessStart: .50,
  recessEnd: .94,
} as const

export const logoCutLightVertexPars = /* glsl */ `
uniform mat4 uCutFrame;
uniform mat3 uCutNormalFrame;
uniform vec2 uCutDepthBounds;
varying vec2 vCutPlane;
varying vec3 vCutVolume;
varying vec3 vCutVolumeNormal;
varying float vCutFace;
varying float vCutDepth;
varying vec3 vCutWorld;
`

export const logoCutLightVertexNormal = /* glsl */ `
vCutFace = abs(normalize(objectNormal).y);
vCutVolumeNormal = normalize(uCutNormalFrame * objectNormal);
`

export const logoCutLightVertexProject = /* glsl */ `
vCutVolume = (uCutFrame * vec4(transformed, 1.0)).xyz;
vCutPlane = vCutVolume.xz;
vCutDepth = (transformed.y - uCutDepthBounds.x) / max(.000001, uCutDepthBounds.y);
vCutWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;
`

export const logoCutLightFragmentPars = /* glsl */ `
uniform vec3 uCutColor;
uniform float uCutIntensity;
uniform float uCutGain;
uniform float uCutSpillWidth;
uniform float uCutSpillGain;
uniform float uCutGlowPass;
uniform vec4 uCutSegments[4];
uniform vec4 uCutBankInfo[4];
uniform int uCutSegmentCount;
varying vec2 vCutPlane;
varying vec3 vCutVolume;
varying vec3 vCutVolumeNormal;
varying float vCutFace;
varying float vCutDepth;
varying vec3 vCutWorld;

float cutLightField(vec2 p) {
  float footprint = max(length(fwidth(p)), .00001);
  float lipRadius = ${CUT_LIGHT_SHAPE.lipWidth} + footprint * .45;
  float wallRadius = ${CUT_LIGHT_SHAPE.wallWidth} + footprint * .40;
  float cap = smoothstep(.90, .9998, vCutFace);
  // Vertex normals in this GLB are blended across the whole wall and its
  // corners. Use the real triangle plane for source placement, preserving
  // the authored smooth normal exclusively for the body's physical shading.
  vec3 wallNormal = cross(dFdx(vCutVolume), dFdy(vCutVolume));
  wallNormal /= max(length(wallNormal), .00000001);
  wallNormal *= dot(wallNormal, vCutVolumeNormal) < 0.0 ? -1.0 : 1.0;
  float wall = 1.0 - smoothstep(.18, .72, abs(wallNormal.y));
  vec2 planarNormal = wallNormal.xz / max(length(wallNormal.xz), .000001);
  float recess = 1.0 - smoothstep(${CUT_LIGHT_SHAPE.recessStart}, ${CUT_LIGHT_SHAPE.recessEnd}, abs(vCutDepth));
  float unlit = 1.0;

  for (int i = 0; i < 4; i++) {
    if (i < uCutSegmentCount) {
      vec4 edge = uCutSegments[i];
      vec4 bank = uCutBankInfo[i];
      vec2 direction = edge.zw - edge.xy;
      float edgeLength = max(length(direction), .000001);
      vec2 alongDirection = direction / edgeLength;
      // The authored +Y triangles wind clockwise in XZ: their outward
      // normal points into the central gap on every selected bank.
      vec2 bankNormal = vec2(-alongDirection.y, alongDirection.x);
      float along = dot(p - edge.xy, alongDirection);
      vec2 capPoint = edge.xy + alongDirection * clamp(along, 0.0, edgeLength);
      float capDistance = length(p - capPoint);

      // Only the cut's top/bottom terminal ends taper. Interior joins keep
      // their light; finite source lips never wrap onto the outer perimeter.
      float terminal = mix(1.0, smoothstep(0.0, ${CUT_LIGHT_SHAPE.terminalFade}, along), bank.y)
        * mix(1.0, smoothstep(0.0, ${CUT_LIGHT_SHAPE.terminalFade}, edgeLength - along), bank.z);
      float lip = exp(-pow(capDistance / lipRadius, 2.0))
        * ${CUT_LIGHT_SHAPE.lipWidth} / lipRadius * ${CUT_LIGHT_SHAPE.lipStrength} * cap;

      // The wall is displaced from the cap by the measured original bevel.
      // Extend only interior joins to include their real mitered wall corner.
      // Normal alignment rejects adjacent outer/top/bottom wall faces even
      // when they are spatially close to a luminous terminal.
      float wallAlong = clamp(along, -(1.0 - bank.y) * bank.x * 3.0,
        edgeLength + (1.0 - bank.z) * bank.x * 3.0);
      vec2 wallPoint = edge.xy + bankNormal * bank.x + alongDirection * wallAlong;
      float wallDistance = length(p - wallPoint);
      float facing = smoothstep(${CUT_LIGHT_SHAPE.wallNormalStart}, ${CUT_LIGHT_SHAPE.wallNormalEnd}, dot(planarNormal, bankNormal));
      float innerWall = exp(-pow(wallDistance / wallRadius, 2.0))
        * facing * wall * (.18 + .82 * recess);
      float spill = exp(-pow(capDistance / max(.0001, uCutSpillWidth), 2.0)) * uCutSpillGain * cap;

      // Smooth bounded union of contributions, with no nearest-segment
      // winner or bisector. Corners meet without doubling their brightness.
      float contribution = clamp((lip + innerWall + spill) * terminal, 0.0, 1.0);
      unlit *= 1.0 - contribution;
    }
  }
  return 1.0 - unlit;
}
`

export const logoCutLightFragmentComposite = /* glsl */ `
vec3 cutEmission = uCutColor * uCutIntensity * uCutGain * cutLightField(vCutPlane);
// Isolated halo contains only the central source. The charcoal body retains
// its normal physical reflections in beauty and in the water proxy.
if (uCutGlowPass > .5 && cameraPosition.y > 0.0 && vCutWorld.y < 0.0) discard;
outgoingLight = cutEmission + outgoingLight * (1.0 - step(.5, uCutGlowPass));
`
