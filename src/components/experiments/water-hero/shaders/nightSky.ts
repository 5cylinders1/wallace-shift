/** Seamless directional Milky Way haze, drawn in the sky and its reflection cube.
 * The band is the edge-on stellar disk seen from Earth, with dark dust
 * interruptions. It has no galaxy spiral, planet, lens flare or animation. */
export const milkyWayGLSL = /* glsl */ `
float nightHash(vec3 p) {
  p = fract(p * .1031);
  p += dot(p, p.yzx + 33.33);
  return fract((p.x + p.y) * p.z);
}
float nightNoise(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(nightHash(i), nightHash(i + vec3(1,0,0)), f.x),
        mix(nightHash(i + vec3(0,1,0)), nightHash(i + vec3(1,1,0)), f.x), f.y),
    mix(mix(nightHash(i + vec3(0,0,1)), nightHash(i + vec3(1,0,1)), f.x),
        mix(nightHash(i + vec3(0,1,1)), nightHash(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float nightFilteredNoise(vec3 p) {
  float footprint = max(length(dFdx(p)), length(dFdy(p)));
  return mix(.5, nightNoise(p), 1.0 - smoothstep(.45, 1.15, footprint));
}
float nightCloud(vec3 p) {
  return nightFilteredNoise(p) * .55 + nightFilteredNoise(p * 2.03 + 7.7) * .28
    + nightFilteredNoise(p * 4.11 - 4.3) * .17;
}
vec3 milkyWay(vec3 dir) {
  // A steep oblique galactic plane, viewed from Earth. Its luminous core
  // lies near 23 degrees elevation, centred in the upward-scroll glance.
  float pixelAngle = max(length(dFdx(dir)), length(dFdy(dir)));
  float altitude = smoothstep(.09, .40, dir.y);
  vec3 axis = normalize(vec3(.93, .26, .11));
  float latitude = dot(dir, axis);
  float cloud = nightCloud(dir * 18.0);
  float dustNoise = nightCloud(dir * 37.0 + vec3(3.1, 7.4, -2.7));
  // Smaller clouds nest inside the broad dust rather than adding another
  // bright band. The coherent warp gives the edges a folded, layered shape.
  float foldedCloud = nightFilteredNoise(dir * 78.0
    + vec3(cloud * 2.6, dustNoise * 1.8, -cloud * 2.1));
  float bentLatitude = latitude + (cloud - .5) * .026;
  float broad = exp(-bentLatitude * bentLatitude / .020);
  float ridge = exp(-bentLatitude * bentLatitude / .0026);
  // Broken outer clouds spread beyond the bright spine. Existing filtered
  // cloud folds keep this expanded dust patchy rather than a uniform veil.
  float outerLatitude = bentLatitude + (dustNoise - .5) * .085;
  float outerClouds = exp(-outerLatitude * outerLatitude / .048)
    * smoothstep(.32, .68, cloud * .65 + foldedCloud * .35);
  float dustLatitude = latitude + (dustNoise - .5) * .055
    + sin(dot(dir, vec3(8.0, -3.0, 7.0))) * .013;
  float mainDust = exp(-dustLatitude * dustLatitude / .00024);
  float branchLatitude = dustLatitude + .040 + (cloud - .5) * .023;
  float branchDust = exp(-branchLatitude * branchLatitude / .00014) * .45;
  float core = pow(max(dot(dir, normalize(vec3(0.0, .11, -.26))), 0.0), 18.0);
  // Fine structure resolves during the star glance, while its average is
  // retained in the smaller reflection cube instead of producing speckle.
  float grain = mix(.5, nightNoise(dir * 146.0 + 13.2),
    1.0 - smoothstep(.45, 1.15, pixelAngle * 146.0));
  float fineGrain = mix(.5, nightNoise(dir * 390.0 - 9.6),
    1.0 - smoothstep(.45, 1.15, pixelAngle * 390.0));
  float filamentLatitude = latitude - .044 + (dustNoise - .5) * .075
    + (grain - .5) * .008;
  float filamentPixel = max(pixelAngle, fwidth(filamentLatitude));
  float filamentWidth = max(.000012, filamentPixel * filamentPixel * 1.5);
  float filament = exp(-filamentLatitude * filamentLatitude / filamentWidth)
    * sqrt(.000012 / filamentWidth)
    * smoothstep(.36, .66, cloud * .45 + grain * .55);
  float forkLatitude = latitude + .019 + (dustNoise - .5) * .071
    + (foldedCloud - .5) * .021;
  float forkPixel = max(pixelAngle, fwidth(forkLatitude));
  float forkWidth = max(.000035, forkPixel * forkPixel * 1.5);
  float forkDust = exp(-forkLatitude * forkLatitude / forkWidth)
    * sqrt(.000035 / forkWidth) * smoothstep(.32, .70, cloud);
  float dust = min(.96, mainDust * .86 + branchDust + filament * .24 + forkDust * .20);
  float density = (.22 + .78 * smoothstep(.22, .76, cloud)) * (.65 + .35 * grain);
  density *= 1.0 + (grain - .5) * .50 + (fineGrain - .5) * .38;
  density *= 1.0 + (foldedCloud - .5) * .22;
  float luminosity = (broad * .034 + ridge * .14 + outerClouds * .022)
    * density * (1.0 - dust);
  vec3 tint = mix(vec3(.15, .24, .40), vec3(.65, .40, .34), core * .80);
  // Broad temperature pockets sit behind the finer, cooler dust. Normalize
  // their color to a shared luminance, keeping the cloud brightness above
  // independent of whether a particular pocket is warm or cool.
  vec3 luminance = vec3(.2126, .7152, .0722);
  float originalLuminance = dot(tint, luminance);
  float pocket = nightFilteredNoise(dir * 11.5 + vec3(-8.3, 5.7, 12.4));
  float warmPocket = smoothstep(.54, .80, pocket) * (.40 + core * .60);
  float coolPocket = smoothstep(.44, .74, dustNoise * .65 + foldedCloud * .35);
  tint = mix(tint, vec3(.58, .31, .24), warmPocket * .28);
  tint = mix(tint, vec3(.18, .25, .50), coolPocket * .24);
  float colorVariation = (dustNoise - .5) * .60 + (grain - .5) * .15;
  vec3 variedTint = tint * vec3(1.0 + colorVariation, 1.0 - colorVariation * .10,
    1.0 - colorVariation);
  tint = variedTint * originalLuminance / max(dot(variedTint, luminance), .0001);
  return tint * luminosity * altitude;
}
`

/** Stars are evaluated at screen resolution, not baked into a 256px cube.
 * Cell margins and derivative filtering keep points fine and stable as the
 * camera tilts. Magnitude varies; no stars flicker on an animation clock. */
export const nightStarGLSL = /* glsl */ `
vec3 starHash(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973));
  q += dot(q, q.yxz + 33.33);
  return fract((q.xxy + q.yzz) * q.zyx);
}
vec3 starLayer(vec2 uv, float scale, vec2 occupancy, float bandWeight, float seed) {
  vec2 p = uv * vec2(scale * 2.0, scale);
  // Derivatives are evaluated uniformly, before cell selection. Integrate
  // nearby kernels and preserve flux so tiny stars do not pop on camera tilt.
  vec2 footprint = fwidth(p);
  float pixel = max(footprint.x, footprint.y);
  vec3 sum = vec3(0.0);
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 cell = floor(p) + vec2(float(x), float(y));
      vec3 random = starHash(cell + seed);
      // Membership belongs to the star's cell. Galactic clustering changes
      // luminosity smoothly, never clips a sprite with a moving threshold.
      float fieldStar = step(1.0 - occupancy.x, random.z);
      float bandStar = step(1.0 - occupancy.x - occupancy.y, random.z) * (1.0 - fieldStar);
      float selected = fieldStar + bandStar * bandWeight;
      vec2 offset = p - cell - (.18 + random.xy * .64);
      float baseRadius = .035 + .070 * pow(random.x, 5.0);
      float radius = max(baseRadius, pixel * .65);
      float star = exp(-dot(offset, offset) / max(radius * radius, 1e-6));
      // Occasional close pairs share their original flux: a little richness
      // without another star layer or an increase in overall exposure.
      float companionWeight = step(.88, fract(random.x * 17.3 + random.y * 23.7)) * .24;
      if (companionWeight > 0.0) {
        vec2 companionOffset = offset - (random.yx - .5) * vec2(.58, .48);
        float companion = exp(-dot(companionOffset, companionOffset) / max(radius * radius, 1e-6));
        star = mix(star, companion, companionWeight);
      }
      float flux = baseRadius * baseRadius / (radius * radius);
      float magnitude = .22 + 1.8 * pow(random.y, 9.0);
      vec3 temperature = mix(vec3(.72, .83, 1.0), vec3(1.0, .91, .79), random.x);
      sum += temperature * star * flux * magnitude * selected;
    }
  }
  return sum;
}
vec3 nightStars(vec3 direction) {
  vec2 uv = vec2(atan(direction.z, direction.x) / 6.28318530718 + .5,
    asin(clamp(direction.y, -1.0, 1.0)) / 3.14159265359 + .5);
  float latitude = dot(direction, normalize(vec3(.93, .26, .11)));
  float galacticDensity = exp(-latitude * latitude / .009);
  float clusters = .45 + 1.10 * smoothstep(.26, .74, nightNoise(direction * 74.0 + 13.2));
  vec3 stars = starLayer(uv, 1000.0, vec2(.035, .18), galacticDensity * clusters, 71.0);
  stars += starLayer(uv, 270.0, vec2(.018, 0.0), 0.0, 319.0) * 1.35;
  return stars * smoothstep(.045, .18, direction.y);
}
`

/** Distant mist sits just above the water horizon. Its slow drift has no
 * influence on star positions, and the shader returns zero below water. */
export const nightFogGLSL = /* glsl */ `
vec3 nightFog(vec3 dir, float time) {
  if (dir.y <= 0.0 || dir.y >= .15) return vec3(0.0);
  vec3 p = vec3(dir.x * 9.0 + time * .012, dir.z * 9.0, dir.y * 52.0);
  float billow = nightNoise(p) * .65 + nightNoise(p * 2.07 + 5.4) * .35;
  float height = .020 + (billow - .5) * .018;
  float altitudeOffset = (dir.y - height) / .027;
  float layer = exp(-altitudeOffset * altitudeOffset);
  layer *= smoothstep(0.0, .012, dir.y) * (1.0 - smoothstep(.075, .15, dir.y));
  return vec3(.040, .048, .057) * layer * (.25 + billow * .75);
}
`
