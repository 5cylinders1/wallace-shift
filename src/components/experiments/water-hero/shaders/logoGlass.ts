/** Smoked or clear dielectric glass over a logo-free linear scene target.
 * The authored GLB's face normals are local +/-Y on both logo meshes. Their
 * nodes have translation only; the outer presentation group stands Y up to Z.
 * These snippets leave the native physical reflection BRDF and geometry intact.
 */
/** A shallow quadratic optical surface, measured in the authored XZ plane.
 * This is continuous lens curvature, not texture, grain or animated lighting. */
export const CRYSTAL_FACE_CURVATURE = {
  scale: 6.0,
  xx: .024,
  zz: .016,
  xz: .004,
} as const

/** Art-directed diffusion on the exposed wall during the first turn only.
 * Later views reuse that light source, so leave the source itself intact. */
export const GLASS_EARLY_TURN = { start: 20, full: 45, release: 80, end: 110, roughness: .34 } as const

/** Glass only, after native material initialization and before lighting.
 * Cap faces retain their polish and refraction. The wall and its shoulder
 * smoothly broaden the reflected lobe without changing their normals. */
export const logoCrystalEarlyReflection = /* glsl */ `
float crystalSideSoftness = uGlassEarlyTurn * smoothstep(.18, .78, vGlassBevel);
float crystalReflectionRoughness = mix(roughness,
  max(roughness, ${GLASS_EARLY_TURN.roughness}), crystalSideSoftness);
material.roughness = max(material.roughness, crystalReflectionRoughness);
`

export const logoGlassVertexPars = /* glsl */ `
varying float vGlassBevel;
varying vec3 vGlassFaceNormal;
varying vec2 vGlassPlane;
varying vec3 vGlassTangentX;
varying vec3 vGlassTangentZ;
varying vec4 vGlassClip;
varying vec2 vGlassProjection;
`

/** Insert after beginnormal_vertex, before the normal enters view space. */
export const logoGlassVertexNormal = /* glsl */ `
vGlassBevel = 1.0 - abs(normalize(objectNormal).y);
vGlassFaceNormal = normalize(normalMatrix * vec3(0.0, 1.0, 0.0));
vGlassTangentX = normalize((modelViewMatrix * vec4(1.0, 0.0, 0.0, 0.0)).xyz);
vGlassTangentZ = normalize((modelViewMatrix * vec4(0.0, 0.0, 1.0, 0.0)).xyz);
`

/** Insert after project_vertex; screen coordinates match the capture camera. */
export const logoGlassVertexProject = /* glsl */ `
vGlassClip = gl_Position;
vGlassProjection = vec2(projectionMatrix[0][0], projectionMatrix[1][1]);
vGlassPlane = transformed.xz * ${CRYSTAL_FACE_CURVATURE.scale.toFixed(1)};
`

export const logoGlassFragmentPars = /* glsl */ `
uniform sampler2D uGlassScene;
uniform vec2 uGlassResolution;
uniform float uGlassWorldThickness;
uniform float uGlassReady;
uniform float uGlassCrystalProfile;
uniform vec3 uGlassAbsorption;
uniform vec2 uGlassBodyFill;
uniform float uGlassDispersion;
uniform float uGlassInternalReflection;
uniform vec3 uGlassRimColor;
uniform float uGlassRimStrength;
varying float vGlassBevel;
varying vec3 vGlassFaceNormal;
varying vec2 vGlassPlane;
varying vec3 vGlassTangentX;
varying vec3 vGlassTangentZ;
varying vec4 vGlassClip;
varying vec2 vGlassProjection;

vec3 glassSceneSample(vec2 uv, vec2 pixel, float radius) {
  // Clamp every tap to its texel center so the screen border never wraps
  // into an unrelated region during the two-piece exit.
  vec2 lo = pixel * .5;
  vec2 hi = vec2(1.0) - lo;
  vec2 spread = pixel * radius;
  vec3 sampleColor = texture2D(uGlassScene, clamp(uv, lo, hi)).rgb * .40;
  sampleColor += texture2D(uGlassScene, clamp(uv + vec2(spread.x, 0.0), lo, hi)).rgb * .15;
  sampleColor += texture2D(uGlassScene, clamp(uv - vec2(spread.x, 0.0), lo, hi)).rgb * .15;
  sampleColor += texture2D(uGlassScene, clamp(uv + vec2(0.0, spread.y), lo, hi)).rgb * .15;
  sampleColor += texture2D(uGlassScene, clamp(uv - vec2(0.0, spread.y), lo, hi)).rgb * .15;
  return sampleColor;
}
`

/** Crystal only: insert after normal_fragment_maps and before physical
 * lighting. The shared optical normal drives both Fresnel and scene bending.
 * The original rounded shoulder takes over before the silhouette changes. */
export const logoCrystalFragmentNormal = /* glsl */ `
float crystalFaceWeight = 1.0 - smoothstep(.004, .045, vGlassBevel);
float crystalFaceSign = dot(normal, vGlassFaceNormal) < 0.0 ? -1.0 : 1.0;
vec2 crystalLensSlope = vec2(
  ${CRYSTAL_FACE_CURVATURE.xx} * vGlassPlane.x + ${CRYSTAL_FACE_CURVATURE.xz} * vGlassPlane.y,
  ${CRYSTAL_FACE_CURVATURE.zz} * vGlassPlane.y + ${CRYSTAL_FACE_CURVATURE.xz} * vGlassPlane.x);
vec3 crystalLensTilt = normalize(vGlassTangentX) * crystalLensSlope.x
  + normalize(vGlassTangentZ) * crystalLensSlope.y;
crystalLensTilt -= normal * dot(normal, crystalLensTilt);
normal = normalize(normal - crystalLensTilt * crystalFaceSign * crystalFaceWeight);
`

/** Glass comparison only, after lights_physical_fragment initializes the
 * material and before native thin-film Fresnel evaluation. Thickness is
 * fixed to the object, so its spectrum changes with the view and real light,
 * never with a color-cycling clock. It tints specular light, not transmission. */
export const logoCrystalIridescence = /* glsl */ `
#ifdef USE_IRIDESCENCE
  float crystalFilmNoV = clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0);
  float crystalFilmShoulder = smoothstep(.003, .045, vGlassBevel)
    * (1.0 - smoothstep(.70, .98, vGlassBevel));
  float crystalFilmFace = 1.0 - smoothstep(.004, .045, vGlassBevel);
  // Broad, continuous thickness variation puts different spectral glints on
  // the face and polished shoulders without introducing a texture or seam.
  float crystalFilmPosition = clamp(.48 + .24 * vGlassPlane.x
    - .20 * vGlassPlane.y + .055 * vGlassPlane.x * vGlassPlane.y, 0.0, 1.0);
  float crystalFaceSheen = mix(.46, .76,
    smoothstep(.02, .78, 1.0 - crystalFilmNoV))
    * mix(.60, 1.0, smoothstep(.12, .90, crystalFilmPosition));
  float crystalFilmWeight = max(crystalFilmShoulder,
    crystalFilmFace * crystalFaceSheen);
  material.iridescence *= crystalFilmWeight;
  float crystalFilmThickness = clamp(crystalFilmPosition
    + .22 * smoothstep(.015, .38, vGlassBevel), 0.0, 1.0);
  material.iridescenceThickness = mix(iridescenceThicknessMinimum,
    iridescenceThicknessMaximum, crystalFilmThickness);
#endif
`

/** Insert immediately before opaque_fragment, after the physical shader has
 * evaluated its lighting. The material stays depth-writing and opaque to the
 * renderer; optical transmission comes from the separate scene capture. */
export const logoGlassFragmentComposite = /* glsl */ `
vec3 glassView = normalize(vViewPosition);
vec3 glassIncident = -glassView;
float glassNoV = clamp(dot(normal, glassView), 0.0, 1.0);
float glassF0 = max(material.specularColor.r, max(material.specularColor.g, material.specularColor.b));
float glassFresnel = glassF0 + (1.0 - glassF0) * pow(1.0 - glassNoV, 5.0);

// Thickness is measured from the real extrusion in world units. The face
// axis keeps absorption coherent as the plate turns, including its reverse.
float glassThroughFace = max(.30, abs(dot(normalize(vGlassFaceNormal), glassView)));
float glassPath = max(.001, uGlassWorldThickness) / glassThroughFace;
vec3 glassTransmission = exp(-uGlassAbsorption * glassPath);
vec3 glassBody = vec3(0.0);
if (uGlassReady > .5) {
  vec3 glassBent = refract(glassIncident, normal, 1.0 / max(1.001, ior));
  vec2 glassSlope = glassBent.xy / max(.20, -glassBent.z)
    - glassIncident.xy / max(.20, -glassIncident.z);
  vec2 glassOffset = .5 * vGlassProjection * glassSlope * glassPath
    / max(.20, vViewPosition.z);
  // The local screen capture cannot supply offscreen rays. A bounded bend
  // avoids dragged image bands at grazing angles and at the viewport edge.
  glassOffset = clamp(glassOffset, vec2(-.022), vec2(.022));
  vec2 glassUv = vGlassClip.xy / max(.0001, vGlassClip.w) * .5 + .5;
  vec2 glassPixel = 1.0 / max(uGlassResolution, vec2(1.0));
  float glassBlur = 1.10 + vGlassBevel * 1.8;
  vec2 glassSampleUv = glassUv + glassOffset;
  vec3 glassBackground = glassSceneSample(glassSampleUv, glassPixel, glassBlur);
  glassBody = glassBackground * glassTransmission * (1.0 - glassFresnel);
}

// Broad planes receive a little environment fill so smoked glass remains
// readable against the nearly black opening sky. The reflection proxy has
// no scene capture and uses a slightly stronger neutral body contribution.
glassBody += totalDiffuse * mix(uGlassBodyFill.x, uGlassBodyFill.y, step(.5, uGlassReady));

// Only the authored rounded face bevel emits. Flat front/back faces and
// the deep extrusion walls stay unlit: no wireframe or screen-space outline.
float glassRimBand = smoothstep(.005, .030, vGlassBevel)
  * (1.0 - smoothstep(.18, .45, vGlassBevel));
float glassRimAngle = .35 + .65 * sqrt(max(0.0, 1.0 - glassNoV));
vec3 glassRim = uGlassRimColor * uGlassRimStrength * glassRimBand * glassRimAngle;
outgoingLight = totalSpecular + glassBody + glassRim;
`

/** Clear crystal has no diffuse undercoat or emitted outline. A second
 * dielectric interface supplies the quieter, displaced reflection visible
 * through a thick rounded edge. It is an optical approximation, not a
 * complete multi-bounce ray tracer; both interfaces use the actual light rig. */
export const logoCrystalFragmentComposite = /* glsl */ `
vec3 crystalView = normalize(vViewPosition);
vec3 crystalIncident = -crystalView;
vec3 crystalAxis = normalize(vGlassFaceNormal);
crystalAxis *= dot(crystalAxis, normal) < 0.0 ? -1.0 : 1.0;
float crystalNoV = clamp(dot(normal, crystalView), 0.0, 1.0);
float crystalF0 = max(material.specularColor.r, max(material.specularColor.g, material.specularColor.b));
float crystalFresnel = crystalF0 + (1.0 - crystalF0) * pow(1.0 - crystalNoV, 5.0);
float crystalPath = max(.001, uGlassWorldThickness)
  / max(.30, abs(dot(crystalAxis, crystalView)));
vec3 crystalTransmission = exp(-uGlassAbsorption * crystalPath);
vec3 crystalInside = refract(crystalIncident, normal, 1.0 / max(1.001, ior));
vec3 crystalBody = vec3(0.0);

if (uGlassReady > .5) {
  vec2 crystalUv = vGlassClip.xy / max(.0001, vGlassClip.w) * .5 + .5;
  vec2 crystalPixel = 1.0 / max(uGlassResolution, vec2(1.0));
  vec2 incidentSlope = crystalIncident.xy / max(.20, -crystalIncident.z);
  vec2 travel = .5 * vGlassProjection * crystalPath / max(.20, vViewPosition.z);
  // Spectral separation follows the bent rays through the physical thickness.
  // The shallow face lens gives a tiny bend; rounded shoulders still catch
  // the pronounced spectrum and the much larger thickness displacement.
  vec3 redRay = refract(crystalIncident, normal, 1.0 / max(1.001, ior - uGlassDispersion * .5));
  vec3 blueRay = refract(crystalIncident, normal, 1.0 / max(1.001, ior + uGlassDispersion * .5));
  vec2 redOffset = clamp(travel * (redRay.xy / max(.20, -redRay.z) - incidentSlope), vec2(-.032), vec2(.032));
  vec2 greenOffset = clamp(travel * (crystalInside.xy / max(.20, -crystalInside.z) - incidentSlope), vec2(-.032), vec2(.032));
  vec2 blueOffset = clamp(travel * (blueRay.xy / max(.20, -blueRay.z) - incidentSlope), vec2(-.032), vec2(.032));
  float blur = .25 + vGlassBevel * .35;
  vec3 crystalBackground = vec3(
    glassSceneSample(crystalUv + redOffset, crystalPixel, blur).r,
    glassSceneSample(crystalUv + greenOffset, crystalPixel, blur).g,
    glassSceneSample(crystalUv + blueOffset, crystalPixel, blur).b);
  crystalBody = crystalBackground * crystalTransmission * (1.0 - crystalFresnel);
}

vec3 crystalRearReflection = vec3(0.0);
#if defined(USE_ENVMAP) && defined(ENVMAP_TYPE_CUBE_UV)
  // Mirror the shoulder normal around the extrusion axis to approximate
  // the opposing rounded interface. This creates a second angled reflection
  // through the clear edge rather than a solid white stroke on its perimeter.
  vec3 rearNormal = normalize(2.0 * dot(normal, crystalAxis) * crystalAxis - normal);
  vec3 insideView = normalize(-crystalInside);
  float rearNoV = clamp(dot(rearNormal, insideView), 0.0, 1.0);
  float rearFresnel = crystalF0 + (1.0 - crystalF0) * pow(1.0 - rearNoV, 5.0);
  vec3 rearRadiance = getIBLRadiance(insideView, rearNormal, roughness);
  float edgeWeight = mix(.18, 1.0, smoothstep(.008, .30, vGlassBevel));
  float interfaceWeight = pow(1.0 - crystalFresnel, 2.0) * rearFresnel;
  crystalRearReflection = rearRadiance * crystalTransmission * crystalTransmission
    * interfaceWeight * edgeWeight * uGlassInternalReflection;
#endif

outgoingLight = totalSpecular + crystalBody + crystalRearReflection;
`
