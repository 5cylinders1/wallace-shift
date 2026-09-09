import { HalfFloatType, LinearFilter, LinearMipmapLinearFilter, WebGLRenderTarget } from 'three'

/** The renderer regenerates this mip chain after each reflection pass.
 * Water can then sample a rougher reflected image without a separate blur
 * scene or rendering sharp white geometry as jagged, warped strips. */
export function createWaterReflectionTarget(width: number, height: number) {
  return new WebGLRenderTarget(width, height, {
    type: HalfFloatType,
    depthBuffer: true,
    stencilBuffer: false,
    generateMipmaps: true,
    minFilter: LinearMipmapLinearFilter,
    magFilter: LinearFilter,
  })
}
