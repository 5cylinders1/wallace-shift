import { waterCommon } from './waterCommon'

/**
 * The water surface.
 *
 * The mesh is opaque and depth-tested like any other geometry, so
 * anything below the surface is genuinely occluded by it. What is
 * underwater comes back only through the refraction sample — which is why
 * the intersection with the logo is a real geometric one at any height,
 * rather than a transparency trick that would fall apart the moment the
 * logo stopped being conveniently placed.
 */
export const waterVertexShader = /* glsl */ `
${waterCommon}

uniform mat4 uReflectMatrix;

varying vec3 vWorldPos;
varying vec3 vViewPos;
varying vec4 vReflectCoord;

void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);

  // The grid is warped so quads grow with distance; past ~70 units a quad
  // is wider than the shortest wavelength, and displacing it only makes
  // the far field crawl. Fog has taken over long before then, so the
  // displacement is faded out and the detail lives in the normal instead.
  float camDist = length(cameraPosition - world.xyz);
  float displacementFade = 1.0 - smoothstep(18.0, 70.0, camDist);

  world.y += surfaceHeight(world.xz, uTime) * displacementFade;

  vWorldPos = world.xyz;
  vReflectCoord = uReflectMatrix * world;

  vec4 view = viewMatrix * world;
  vViewPos = view.xyz;

  gl_Position = projectionMatrix * view;
}
`

export const waterFragmentShader = /* glsl */ `
${waterCommon}

#include <packing>

uniform sampler2D uReflection;
uniform sampler2D uRefraction;
uniform sampler2D uRefractionDepth;
uniform samplerCube uEnvMap;

uniform vec2 uResolution;
uniform float uCameraNear;
uniform float uCameraFar;

uniform float uRippleResolution;
uniform float uRippleNormalGain;

uniform float uF0;
uniform float uReflectionDistortion;
uniform float uReflectionRolloff;
uniform vec2 uLogoCenter;
uniform float uReflectionFocus;
uniform float uRefractionDistortion;
uniform vec3 uExtinction;
uniform vec3 uDeepColor;
uniform vec3 uScatterColor;
uniform float uFogDensity;
uniform float uBackgroundIntensity;

uniform vec3 uKeyDirection;
uniform vec3 uKeyColor;
uniform float uSpecularRoughness;
uniform float uSpecularStrength;

/**
 * Development-only channel isolator.
 *
 * 0 renders the composite; 1-5 render a single contribution. Chasing a
 * bright artefact by tuning candidate causes one at a time is how three
 * passes get spent on the wrong term — this answers the question in one.
 */
uniform int uChannel;
uniform float uContactDarkening;

varying vec3 vWorldPos;
varying vec3 vViewPos;
varying vec4 vReflectCoord;

/** Simulation gradient, sampled at texel spacing and scaled to world units. */
vec2 rippleGradient(vec2 p) {
  vec2 uv = (p - uRippleCenter) / uRippleExtent + 0.5;
  if (clamp(uv, 0.0, 1.0) != uv) return vec2(0.0);

  float texel = 1.0 / uRippleResolution;
  float l = texture2D(uRipple, uv - vec2(texel, 0.0)).r;
  float r = texture2D(uRipple, uv + vec2(texel, 0.0)).r;
  float d = texture2D(uRipple, uv - vec2(0.0, texel)).r;
  float u = texture2D(uRipple, uv + vec2(0.0, texel)).r;

  float spacing = 2.0 * uRippleExtent * texel;
  return vec2(r - l, u - d) / spacing;
}

/**
 * Surface normal, assembled from analytic gradients rather than by
 * finite-differencing the height.
 *
 * The returned fade is the LOD: the micro band has a wavelength of a few
 * centimetres, and once a wavelength covers less than a pixel keeping it
 * only produces sparkle that crawls between frames. It is faded by
 * distance and returned so the shading below can compensate — losing the
 * band silently would make the far field turn to glass.
 */
vec3 computeNormal(vec2 p, float t, float camDist, out float detailFade) {
  detailFade = 1.0 - smoothstep(26.0, 130.0, camDist);

  vec2 grad = swellFull(p, t).yz;
  grad += microDetail(p, t).yz * detailFade;
  grad += contactGradient(p);
  grad += pressureGradient(p);
  grad += rippleGradient(p) * uRippleNormalGain * detailFade;

  return normalize(vec3(-grad.x, 1.0, -grad.y));
}

/** GGX, isolated to the key source. The rest of the highlights are IBL. */
float specularGGX(vec3 N, vec3 V, vec3 L, float roughness) {
  vec3 H = normalize(V + L);
  float a = roughness * roughness;
  float a2 = a * a;
  float NdotH = max(dot(N, H), 0.0);
  float denom = NdotH * NdotH * (a2 - 1.0) + 1.0;
  return a2 / (3.14159265 * denom * denom);
}

float linearViewZ(float depth) {
  return perspectiveDepthToViewZ(depth, uCameraNear, uCameraFar);
}

void main() {
  vec3 V = normalize(cameraPosition - vWorldPos);
  float camDist = length(cameraPosition - vWorldPos);

  float detailFade;
  vec3 N = computeNormal(vWorldPos.xz, uTime, camDist, detailFade);

  // Distortion has to shrink with distance or the far field smears: the
  // same world-space normal covers far fewer pixels out there.
  float distortScale = min(1.0, 7.0 / max(camDist, 0.001));

  float NdotV = max(dot(N, V), 1e-3);
  float fresnel = uF0 + (1.0 - uF0) * pow(1.0 - NdotV, 5.0);

  /* --- Reflection ------------------------------------------------- */
  // The planar target only covers what the mirrored camera could see. Far
  // water projects outside it, and clamping there smears the target's edge
  // row across the whole horizon as a hard bright band. Falling back to
  // the environment along the true reflected direction is both correct and
  // seamless: at grazing angles that direction is the horizon, which is
  // exactly what the sky above it shows.
  vec3 mirrored = reflect(-V, N);
  vec3 environmentReflection =
    textureCube(uEnvMap, mirrored).rgb * uBackgroundIntensity;

  vec2 reflUv = vReflectCoord.xy / max(vReflectCoord.w, 1e-4);
  reflUv += N.xz * uReflectionDistortion * distortScale;

  vec2 reflEdge = min(reflUv, 1.0 - reflUv);
  float planarValid = smoothstep(0.0, 0.035, min(reflEdge.x, reflEdge.y))
                    * step(1e-4, vReflectCoord.w);

  vec3 reflection = mix(
    environmentReflection,
    texture2D(uReflection, clamp(reflUv, 0.002, 0.998)).rgb,
    planarValid
  );

  // Once the micro band has faded there is no longer any structure left to
  // break the reflection up, and a perfectly smooth mirror is precisely
  // what makes dark water read as tar. Rolling the far field toward the
  // environment keeps it soft instead of specular.
  // Clearest directly beneath the emblem, dissolving with distance from
  // it. A reflection that stays equally coherent all the way to the bottom
  // of the frame reads as a runway laid on the water — which is what
  // replaced the white lanes and was no better. Real water loses a
  // reflection to accumulated slope error long before it loses brightness.
  float logoDistance = length(vWorldPos.xz - uLogoCenter);
  float focus = 1.0 - smoothstep(
    uReflectionFocus,
    uReflectionFocus * 2.4,
    logoDistance
  );
  // Squared, so coherence falls away sharply rather than tapering into a
  // long strip. Beyond the emblem's own footprint the water goes back to
  // being water.
  focus *= focus;
  reflection = mix(
    environmentReflection,
    reflection,
    (0.06 + 0.94 * focus) * (0.35 + 0.65 * detailFade)
  );

  // Controlled reflection exposure.
  //
  // The horizon band is the brightest thing in the sky and the primary
  // source the water lives on, so disturbed water inevitably channels it
  // into coherent lanes — that part is real glitter-path behaviour. What
  // is not acceptable is those lanes arriving unbounded and reading as
  // painted road markings. Compressing the reflection keeps every bit of
  // the structure and takes the top off the peaks, which is the difference
  // between broken highlights on water and white paint on vinyl.
  reflection = reflection / (1.0 + reflection * uReflectionRolloff);

  /* --- Refraction and absorption ---------------------------------- */
  vec2 screenUv = gl_FragCoord.xy / uResolution;
  vec2 refrUv = screenUv + N.xz * uRefractionDistortion * distortScale;
  refrUv = clamp(refrUv, 0.002, 0.998);

  float sceneZ = linearViewZ(texture2D(uRefractionDepth, refrUv).x);
  float thickness = vViewPos.z - sceneZ;

  // A distorted sample can land on geometry that is in front of the
  // water. Falling back to the undistorted tap is what keeps the
  // above-water half of the logo from bleeding through the waterline.
  if (thickness <= 0.0) {
    refrUv = screenUv;
    sceneZ = linearViewZ(texture2D(uRefractionDepth, refrUv).x);
    thickness = max(vViewPos.z - sceneZ, 0.0);
  }

  vec3 refracted = texture2D(uRefraction, refrUv).rgb;
  vec3 transmittance = exp(-thickness * uExtinction);
  vec3 underwater = refracted * transmittance + uDeepColor * (1.0 - transmittance);

  // Depth eats contrast before it eats brightness. Without this the
  // submerged metal stays crisp and reads as sitting on the water rather
  // than under it.
  float murk = 1.0 - exp(-thickness * 0.55);
  float luma = dot(underwater, vec3(0.2126, 0.7152, 0.0722));
  underwater = mix(underwater, vec3(luma), murk * 0.30);

  // Light that entered the surface and scattered back out.
  //
  // Close to camera the view angle steepens, Fresnel collapses, and the
  // surface shows almost nothing but absorbed depth — the foreground goes
  // to pure black and the water stops existing there. Real water in that
  // situation is not black; it is faintly lit from within. Weighted by the
  // surface normal so it also picks out the near ripples.
  underwater += uScatterColor
              * (1.0 - fresnel)
              * (0.4 + 0.6 * clamp(N.y, 0.0, 1.0))
              * (1.0 - exp(-thickness * 1.1));

  /* --- Composite --------------------------------------------------- */
  vec3 color = mix(underwater, reflection, fresnel);

  // Glitter. On near water the Fresnel term is small and the surface is
  // showing mostly absorbed depth, so without a specular lobe catching the
  // few facets tilted toward the key the foreground goes flat black and
  // stops reading as a liquid at all.
  //
  // The rolloff is not optional. A GGX distribution is a density, not a
  // radiance: its peak is 1/(pi*a^2), so at roughness 0.055 it reaches
  // about 35,000 and any facet near the mirror direction clips to white.
  // On a surface whose normal varies smoothly that is not a sparkle, it is
  // a solid white band down the whole glitter path. Compressing it keeps
  // the highlights bright and bounded, and never plateaus the way a hard
  // clamp would.
  //
  // Order matters here. The source's intensity has to go in *before* the
  // rolloff, not after: multiplying a bounded value by a bright colour
  // simply unbounds it again, which is how a lobe that was supposedly
  // capped at 1.6 was arriving at 7.4 and painting the ribbons back on.
  // uKeyColor is a unit-ish hue; uSpecularStrength carries the level.
  float spec = specularGGX(N, V, uKeyDirection, uSpecularRoughness)
             * uSpecularStrength;
  spec = spec / (1.0 + spec * 1.15);
  color += uKeyColor * spec * (0.05 + fresnel) * detailFade;

  // The contact collar is rougher water: it scatters rather than mirrors,
  // so it reads as a dulled ring rather than a painted-on shadow.
  color *= 1.0 - contactMask(vWorldPos.xz) * uContactDarkening;

  /* --- Horizon ----------------------------------------------------- */
  // Fog resolves to the sky actually behind this fragment, so the far
  // edge of the plane dissolves into the background instead of ending.
  vec3 skyBehind = textureCube(uEnvMap, -V).rgb * uBackgroundIntensity;
  float fogAmount = 1.0 - exp(-pow(camDist * uFogDensity, 2.0));
  color = mix(color, skyBehind, fogAmount);

  if (uChannel == 1) color = reflection * fresnel;
  else if (uChannel == 2) color = underwater * (1.0 - fresnel);
  else if (uChannel == 3) color = uKeyColor * spec * (0.05 + fresnel) * detailFade;
  else if (uChannel == 4) color = vec3(fogAmount) * 0.5;
  else if (uChannel == 5) color = vec3(contactMask(vWorldPos.xz));

  gl_FragColor = vec4(color, 1.0);

  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`
