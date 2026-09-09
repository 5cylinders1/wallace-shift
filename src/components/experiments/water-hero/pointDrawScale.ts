import type { Camera, ShaderMaterial, Vector4, WebGLRenderer } from 'three'

/** Point sprites use physical pixels in the current draw viewport. Offscreen
 * water targets are smaller than the canvas, so each pass needs its own scale
 * before that texture is expanded back into the final composition. */
export function updatePointDrawScale(
  renderer: Pick<WebGLRenderer, 'getCurrentViewport'>,
  camera: Pick<Camera, 'projectionMatrix'>,
  uniforms: ShaderMaterial['uniforms'],
  viewport: Vector4,
  cssCanvasHeight: number,
) {
  renderer.getCurrentViewport(viewport)
  const height = Math.max(1, viewport.w)
  // CubeCamera's face projections use a negative FOV to orient cubemap
  // faces. Diameter is a magnitude even when that projection axis is flipped.
  uniforms.uPointScale.value = Math.abs(camera.projectionMatrix.elements[5]) * height * .5
  uniforms.uPixelRatio.value = height / Math.max(1, cssCanvasHeight)
}
