import type { Camera, ShaderMaterial } from 'three'

/** Camera depth changes the appearance of existing matter, never its anchors.
 * Keep the responsive camera standoff from looking like extra murky water. */
export const particleDepthGLSL = /* glsl */ `
uniform float uViewDepth;
float particleOpticalDistance(float distanceToCamera, float focusDistance, float viewPass) {
  return max(0.0, distanceToCamera - max(0.0, focusDistance - 6.5) * viewPass);
}
float particleTransmittance(float opticalDistance, float viewPass) {
  return exp(-max(0.0, opticalDistance - 3.5) * mix(.028, .105, viewPass));
}
float particleDefocus(float viewDepth, float focusDistance, float viewPass) {
  float nearBlur = 1.0 - smoothstep(.32, .76, viewDepth / max(1.0, focusDistance));
  float farBlur = smoothstep(3.0, 8.0, viewDepth - focusDistance) * .22;
  return max(nearBlur, farBlur) * viewPass;
}
`

/** Reflection probes gather local radiance. View-camera defocus belongs only
 * to the visible composition; the metal's roughness already filters its cube. */
export function updateParticleDepthPass(camera: Pick<Camera, 'parent'>, uniforms: ShaderMaterial['uniforms']) {
  uniforms.uViewDepth.value = camera.parent?.type === 'CubeCamera' ? 0 : 1
}
