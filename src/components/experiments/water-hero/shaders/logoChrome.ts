/** A clean conductor with a small, continuously illuminated central joint.
 * The seam coordinates are finite edges extracted from each authored cap. */
export const CHROME_SEAM = { width: .0024, shoulder: .0065, shoulderGain: .16 } as const

export const logoChromeVertexPars = /* glsl */ `
uniform mat4 uChromeFrame;
varying vec2 vChromePlane;
varying float vChromeFace;
varying float vChromeNativeDepth;
varying vec3 vChromeWorld;
`

export const logoChromeVertexNormal = /* glsl */ `
vChromeFace = abs(normalize(objectNormal).y);
`

export const logoChromeVertexProject = /* glsl */ `
vChromePlane = (uChromeFrame * vec4(transformed, 1.0)).xz;
vChromeNativeDepth = transformed.y;
vChromeWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;
`

export const logoChromeFragmentPars = /* glsl */ `
uniform float uChromeTime;
uniform float uChromeUnderwater;
uniform float uChromeGlowPass;
uniform float uChromeSeamIntensity;
uniform float uChromeSeamGain;
uniform vec3 uChromeSeamColor;
uniform vec3 uChromePulseColor;
uniform vec4 uChromeSegments[4];
uniform int uChromeSegmentCount;
varying vec2 vChromePlane;
varying float vChromeFace;
varying float vChromeNativeDepth;
varying vec3 vChromeWorld;

float chromeFaceMask() {
  return smoothstep(.64, .995, vChromeFace);
}

// The face stays entirely clean. These stationary, low-amplitude machining
// lines affect sidewall roughness only and fade below a pixel's footprint.
float chromeSideBrush() {
  float phase = vChromeNativeDepth * 9200.0;
  float resolved = 1.0 - smoothstep(.75, 3.0, fwidth(phase));
  return sin(phase) * resolved;
}

float chromeSeamDistance(vec2 p) {
  float distanceToBank = 100.0;
  for (int i = 0; i < 4; i++) {
    if (i < uChromeSegmentCount) {
      vec4 edge = uChromeSegments[i];
      vec2 direction = edge.zw - edge.xy;
      float along = clamp(dot(p - edge.xy, direction)
        / max(dot(direction, direction), .000001), 0.0, 1.0);
      distanceToBank = min(distanceToBank, length(p - edge.xy - direction * along));
    }
  }
  return distanceToBank;
}

float chromeSeamLight(vec2 p) {
  float distanceToBank = chromeSeamDistance(p);
  // Integrate a narrow luminous bank over its pixel footprint. This avoids
  // fizzing lines at mobile sizes without growing their integrated energy.
  float footprint = max(length(fwidth(p)), .00001);
  float width = ${CHROME_SEAM.width} + footprint * .45;
  float core = exp(-pow(distanceToBank / width, 2.0)) * ${CHROME_SEAM.width} / width;
  float shoulder = exp(-distanceToBank / ${CHROME_SEAM.shoulder}) * ${CHROME_SEAM.shoulderGain};
  return core + shoulder;
}
`

export const logoChromeFragmentColor = /* glsl */ `
// Linear conductor reflectance differs between the polished caps and brushed
// graphite housing; it is not an emissive gray layer over the complete mark.
diffuseColor.rgb = mix(vec3(.035, .043, .052), diffuseColor.rgb, chromeFaceMask());
`

export const logoChromeFragmentRoughness = /* glsl */ `
roughnessFactor = mix(.34 + chromeSideBrush() * .022, roughnessFactor, chromeFaceMask());
`

export const logoChromeFragmentComposite = /* glsl */ `
float chromeFace = chromeFaceMask();
float chromeNoV = clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0);
vec3 chromeWorldNormal = inverseTransformDirection(normal, viewMatrix);
vec3 chromeView = normalize(cameraPosition - vChromeWorld);
vec3 chromeReflection = reflect(-chromeView, chromeWorldNormal);

// A very broad studio card is evaluated in reflection space. The small
// position term gives the planar caps a gradual light-to-dark progression;
// the reflected ray and Fresnel response keep it attached to the metal as it
// turns. Its slow drift has no traveling hard edge or narrow light stripe.
float chromeCardCenter = -.10 + sin(uChromeTime * .035) * .11;
float chromeCardCoordinate = chromeReflection.x * .48 + chromeReflection.y * .26
  + vChromePlane.x * .65 + vChromePlane.y * .35;
float chromeCard = exp(-pow((chromeCardCoordinate - chromeCardCenter) / .33, 2.0));
chromeCard *= .35 + .65 * pow(abs(chromeReflection.z), 1.5);
vec3 chromeFresnel = mix(diffuseColor.rgb, vec3(.72), pow(1.0 - chromeNoV, 5.0));
vec3 chromeStudio = chromeFresnel * chromeCard * .72 * mix(.42, 1.0, chromeFace);
// A quiet, directional fill prevents an unlit silhouette between reflections.
// The local colored fill is subordinate to the actual live particle probe.
vec3 chromeFill = vec3(.010, .014, .018) * (.45 + .55 * chromeNoV)
  + uChromePulseColor * uChromeUnderwater * chromeCard * .012;
vec3 chromeBody = outgoingLight + chromeStudio + chromeFill * mix(.42, 1.0, chromeFace);
vec3 chromeSeam = uChromeSeamColor * uChromeSeamIntensity * uChromeSeamGain
  * chromeSeamLight(vChromePlane) * mix(.28, 1.0, chromeFace);

// The water proxy attenuates only seam emission. The physical body retains
// its ordinary reflection strength. Halo capture contains no studio card,
// particle reflection, or face fill, and cannot glow through the waterline.
if (uChromeGlowPass > .5 && cameraPosition.y > 0.0 && vChromeWorld.y < 0.0) discard;
outgoingLight = chromeSeam + chromeBody * (1.0 - step(.5, uChromeGlowPass));
`
