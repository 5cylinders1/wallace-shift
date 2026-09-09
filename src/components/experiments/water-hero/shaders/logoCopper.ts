/** Thin copper inlay on the existing rounded shoulder. The inputs are
 * 1-abs(native normalY), so both front/back caps and the deep sidewall are
 * uncoated. This describes physical material coverage, not an emitted line. */
export const COPPER_BAND = { innerStart: .012, innerEnd: .032, outerStart: .075, outerEnd: .13 } as const
export const COPPER_OPTICS = { roughness: .23, maxOffset: .024, maxBlur: 2.0 } as const

export const logoCopperFragmentPars = /* glsl */ `
uniform vec3 uCopperReflectance;
uniform float uCopperProxy;

float copperBandWeight() {
  return smoothstep(${COPPER_BAND.innerStart}, ${COPPER_BAND.innerEnd}, vGlassBevel)
    * (1.0 - smoothstep(${COPPER_BAND.outerStart}, ${COPPER_BAND.outerEnd}, vGlassBevel));
}
`

/** Insert after metalnessmap_fragment and before lights_physical_fragment.
 * Three's native BRDF must see the same metallic coverage as transmission. */
export const logoCopperFragmentSurface = /* glsl */ `
float copperBand = copperBandWeight();
diffuseColor.rgb = mix(diffuseColor.rgb, uCopperReflectance, copperBand);
metalnessFactor = copperBand;
roughnessFactor = mix(roughnessFactor, ${COPPER_OPTICS.roughness}, copperBand);
`

export const logoCopperFragmentComposite = /* glsl */ `
vec3 copperView = normalize(vViewPosition);
vec3 copperIncident = -copperView;
vec3 copperAxis = normalize(vGlassFaceNormal);
copperAxis *= dot(copperAxis, normal) < 0.0 ? -1.0 : 1.0;
float copperNoV = clamp(dot(normal, copperView), 0.0, 1.0);
// The dielectric interface uses its own F0. Native totalSpecular already
// uses Three's metalness-blended conductor F0 on the copper-coated shoulder.
float copperF0 = max(material.specularColor.r, max(material.specularColor.g, material.specularColor.b));
float copperFresnel = copperF0 + (1.0 - copperF0) * pow(1.0 - copperNoV, 5.0);
float copperPath = max(.001, uGlassWorldThickness)
  / max(.30, abs(dot(copperAxis, copperView)));
vec3 copperTransmission = exp(-uGlassAbsorption * copperPath);
vec3 copperInside = refract(copperIncident, normal, 1.0 / max(1.001, ior));
float copperGlassWeight = 1.0 - copperBand;
vec3 copperBody = vec3(0.0);

// A planar water proxy has no valid beauty-camera projection. Even an
// accidental texture binding must not paste its captured image into water.
if (uGlassReady > .5 && uCopperProxy < .5 && copperGlassWeight > .0001) {
  vec2 uv = vGlassClip.xy / max(.0001, vGlassClip.w) * .5 + .5;
  vec2 pixel = 1.0 / max(uGlassResolution, vec2(1.0));
  vec2 incidentSlope = copperIncident.xy / max(.20, -copperIncident.z);
  vec2 travel = .5 * vGlassProjection * copperPath / max(.20, vViewPosition.z);
  vec2 offset = clamp(travel * (copperInside.xy / max(.20, -copperInside.z) - incidentSlope),
    vec2(-${COPPER_OPTICS.maxOffset}), vec2(${COPPER_OPTICS.maxOffset}));
  float blur = .75 + vGlassBevel * 1.25;
  copperBody = glassSceneSample(uv + offset, pixel, blur)
    * copperTransmission * (1.0 - copperFresnel);
}

vec3 copperRearReflection = vec3(0.0);
#if defined(USE_ENVMAP) && defined(ENVMAP_TYPE_CUBE_UV)
  if (copperGlassWeight > .0001) {
    vec3 rearNormal = normalize(2.0 * dot(normal, copperAxis) * copperAxis - normal);
    vec3 insideView = normalize(-copperInside);
    float rearNoV = clamp(dot(rearNormal, insideView), 0.0, 1.0);
    float rearFresnel = copperF0 + (1.0 - copperF0) * pow(1.0 - rearNoV, 5.0);
    vec3 rearRadiance = getIBLRadiance(insideView, rearNormal, roughness);
    copperRearReflection = rearRadiance * copperTransmission * copperTransmission
      * pow(1.0 - copperFresnel, 2.0) * rearFresnel * uGlassInternalReflection;
  }
#endif

// Copper is opaque: coverage removes both the transmitted background and
// the opposite glass interface. No diffuse gray fill, rim emission or halo
// is added; all copper light comes from the native physical reflection BRDF.
outgoingLight = totalSpecular + copperGlassWeight * (copperBody + copperRearReflection);
`
