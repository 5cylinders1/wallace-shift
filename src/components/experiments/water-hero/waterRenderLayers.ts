import { SURFACE_FOG_LAYER } from './surfaceFogField'

/** Submerged transparent matter is sampled through water from above, but
 * drawn directly in front of its underside when the camera is below it. */
export const SUBMERGED_PARTICLE_LAYER = 3

export function refractionLayerMask(beautyMask: number, cameraY: number, waterY: number) {
  const withoutAirMist = beautyMask & ~(1 << SURFACE_FOG_LAYER)
  // Including these particles here would bake them into the underside's
  // background, then blend them a second time in the final transparent pass.
  return cameraY < waterY
    ? withoutAirMist & ~(1 << SUBMERGED_PARTICLE_LAYER)
    : withoutAirMist
}
