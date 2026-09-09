/** A scattering interior behind smooth dielectric interfaces. These constants
 * describe optical distance; no texture/noise modulates the material. */
export const FROSTED_VOLUME = {
  capScatter: 1.65,
  edgeScatter: .40,
  capRoughness: .24,
  edgeRoughness: .055,
  maxOffset: .032,
  maxBlur: 14,
} as const

export const logoFrostedVertexPars = /* glsl */ `
varying vec3 vFrostedWorld;
`

export const logoFrostedVertexProject = /* glsl */ `
vFrostedWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;
`

export const logoFrostedFragmentPars = /* glsl */ `
uniform vec3 uFrostedColor;
uniform float uFrostedIntensity;
uniform float uFrostedGain;
uniform float uFrostedProxy;
uniform float uFrostedGlowPass;
varying vec3 vFrostedWorld;

float frostedCapWeight() {
  // Smooth original cap normals and the broad rounded shoulder form the
  // boundary between the satin interior and the clearer polished edge.
  return 1.0 - smoothstep(.008, .20, vGlassBevel);
}

vec3 frostedSceneTap(vec2 uv, vec2 pixel) {
  return texture2D(uGlassScene, clamp(uv, pixel * .5, vec2(1.0) - pixel * .5)).rgb;
}

vec3 frostedSceneSample(vec2 uv, vec2 pixel, float radius) {
  // A normalized, fixed 13-tap soft kernel avoids the five separated image
  // copies that a widely spaced cross kernel would create in bright grains.
  vec2 spread = pixel * radius;
  vec3 result = frostedSceneTap(uv, pixel) * .18;
  result += frostedSceneTap(uv + vec2(spread.x * .5, 0.0), pixel) * .10;
  result += frostedSceneTap(uv - vec2(spread.x * .5, 0.0), pixel) * .10;
  result += frostedSceneTap(uv + vec2(0.0, spread.y * .5), pixel) * .10;
  result += frostedSceneTap(uv - vec2(0.0, spread.y * .5), pixel) * .10;
  result += frostedSceneTap(uv + spread * vec2(.45, .45), pixel) * .065;
  result += frostedSceneTap(uv + spread * vec2(-.45, .45), pixel) * .065;
  result += frostedSceneTap(uv + spread * vec2(.45, -.45), pixel) * .065;
  result += frostedSceneTap(uv - spread * vec2(.45, .45), pixel) * .065;
  result += frostedSceneTap(uv + vec2(spread.x, 0.0), pixel) * .04;
  result += frostedSceneTap(uv - vec2(spread.x, 0.0), pixel) * .04;
  result += frostedSceneTap(uv + vec2(0.0, spread.y), pixel) * .04;
  result += frostedSceneTap(uv - vec2(0.0, spread.y), pixel) * .04;
  return result;
}
`

export const logoFrostedFragmentRoughness = /* glsl */ `
roughnessFactor = mix(${FROSTED_VOLUME.edgeRoughness}, ${FROSTED_VOLUME.capRoughness}, frostedCapWeight());
`

export const logoFrostedFragmentComposite = /* glsl */ `
vec3 frostedView = normalize(vViewPosition);
vec3 frostedIncident = -frostedView;
vec3 frostedAxis = normalize(vGlassFaceNormal);
frostedAxis *= dot(frostedAxis, normal) < 0.0 ? -1.0 : 1.0;
float frostedNoV = clamp(dot(normal, frostedView), 0.0, 1.0);
float frostedF0 = max(material.specularColor.r, max(material.specularColor.g, material.specularColor.b));
float frostedFresnel = frostedF0 + (1.0 - frostedF0) * pow(1.0 - frostedNoV, 5.0);
float frostedCap = frostedCapWeight();
float frostedPath = max(.001, uGlassWorldThickness)
  / max(.30, abs(dot(frostedAxis, frostedView)));
float frostedScatter = mix(${FROSTED_VOLUME.edgeScatter}, ${FROSTED_VOLUME.capScatter}, frostedCap);
vec3 frostedAbsorption = exp(-uGlassAbsorption * frostedPath);
float frostedUnscattered = exp(-frostedScatter * frostedPath);
vec3 frostedTransmission = frostedAbsorption * frostedUnscattered;
vec3 frostedInside = refract(frostedIncident, normal, 1.0 / max(1.001, ior));

// Interior light follows optical thickness and smoothly loses energy at a
// grazing interface. Its quiet depth gradient is static, never a light swipe
// or a noisy diffuse coat. Both faces and the side volume remain readable.
float frostedInnerFalloff = .82 + .18 * exp(-dot(vGlassPlane * vec2(1.4, 1.1), vGlassPlane * vec2(1.4, 1.1)));
vec3 frostedInterior = uFrostedColor * uFrostedIntensity * uFrostedGain
  * (1.0 - frostedUnscattered) * frostedAbsorption
  * frostedInnerFalloff * (1.0 - frostedFresnel);

vec3 frostedOptics = vec3(0.0);
// Keep the glow target intrinsically emissive: the branch skips capture taps
// and environment samples instead of allowing bright particles to bloom.
if (uFrostedGlowPass < .5) {
  vec3 frostedBackground = vec3(0.0);
  // The mirrored water proxy can never sample a beauty-camera texture.
  if (uGlassReady > .5 && uFrostedProxy < .5) {
    vec2 uv = vGlassClip.xy / max(.0001, vGlassClip.w) * .5 + .5;
    vec2 pixel = 1.0 / max(uGlassResolution, vec2(1.0));
    vec2 incidentSlope = frostedIncident.xy / max(.20, -frostedIncident.z);
    vec2 travel = .5 * vGlassProjection * frostedPath / max(.20, vViewPosition.z);
    vec2 offset = clamp(travel * (frostedInside.xy / max(.20, -frostedInside.z) - incidentSlope),
      vec2(-${FROSTED_VOLUME.maxOffset}), vec2(${FROSTED_VOLUME.maxOffset}));
    float projectedThickness = uGlassResolution.y * vGlassProjection.y
      * frostedPath / max(.20, vViewPosition.z);
    float blur = clamp(projectedThickness * .11 * mix(.12, 1.0, frostedCap), 1.0, ${FROSTED_VOLUME.maxBlur.toFixed(1)});
    frostedBackground = frostedSceneSample(uv + offset, pixel, blur)
      * frostedTransmission * (1.0 - frostedFresnel);
  }

  vec3 frostedRearReflection = vec3(0.0);
  #if defined(USE_ENVMAP) && defined(ENVMAP_TYPE_CUBE_UV)
    // The opposing polished shoulder catches a second, quieter reflection.
    // Scattering suppresses it through the broad milky cap.
    vec3 rearNormal = normalize(2.0 * dot(normal, frostedAxis) * frostedAxis - normal);
    vec3 insideView = normalize(-frostedInside);
    float rearNoV = clamp(dot(rearNormal, insideView), 0.0, 1.0);
    float rearFresnel = frostedF0 + (1.0 - frostedF0) * pow(1.0 - rearNoV, 5.0);
    vec3 rearRadiance = getIBLRadiance(insideView, rearNormal, ${FROSTED_VOLUME.edgeRoughness});
    frostedRearReflection = rearRadiance * frostedTransmission * frostedTransmission
      * pow(1.0 - frostedFresnel, 2.0) * rearFresnel
      * mix(.12, 1.0, 1.0 - frostedCap) * uGlassInternalReflection;
  #endif
  frostedOptics = totalSpecular + frostedBackground + frostedRearReflection;
}

if (uFrostedGlowPass > .5 && cameraPosition.y > 0.0 && vFrostedWorld.y < 0.0) discard;
outgoingLight = frostedInterior + frostedOptics;
`
