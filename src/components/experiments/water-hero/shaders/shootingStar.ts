/** A single great-circle streak. Derivative filtering preserves its angular
 * width and flux across screen sizes; no texture, light or particle emitter. */
export const shootingStarGLSL = /* glsl */ `
uniform vec3 uMeteorStart;
uniform vec3 uMeteorTangent;
uniform vec4 uMeteor;
vec3 shootingStar(vec3 direction) {
  float pixel = max(length(dFdx(direction)), length(dFdy(direction)));
  if (uMeteor.w <= 0.0) return vec3(0.0);
  vec3 normal = cross(uMeteorStart, uMeteorTangent);
  float along = atan(dot(direction, uMeteorTangent), dot(direction, uMeteorStart));
  float across = asin(clamp(dot(direction, normal), -1.0, 1.0));
  float head = uMeteor.x * uMeteor.y;
  float behind = head - along;
  float width = max(.00042, pixel * .65);
  float line = exp(-across * across / (width * width)) * (.00042 / width);
  float taper = pow(clamp(1.0 - behind / uMeteor.z, 0.0, 1.0), 1.7);
  float tail = line * taper * smoothstep(-pixel, pixel, behind)
    * smoothstep(-pixel, pixel, along);
  float headWidth = max(.00095, pixel * .7);
  float headDistance = (along - head) * (along - head) + across * across;
  float core = exp(-headDistance / (headWidth * headWidth))
    * (.00095 * .00095 / (headWidth * headWidth));
  return (vec3(.55, .71, 1.0) * tail * .30 + vec3(.92, .96, 1.0) * core * 1.25)
    * uMeteor.w * smoothstep(.035, .10, direction.y);
}
`
