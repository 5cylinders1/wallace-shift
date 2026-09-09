/** A beauty-only layer prevents mist being composited again through water. */
export const SURFACE_FOG_LAYER = 2

/** Far-to-near order for the distant banks; foreground has its own volume. */
export const SURFACE_FOG_BANKS = [
  { x: -3, z: -30, width: 58, height: 1.10, yaw: .06, opacity: .22, seed: 1.7 },
  { x: 7, z: -17, width: 35, height: .85, yaw: -.08, opacity: .24, seed: 4.3 },
  { x: -4, z: -8, width: 18, height: .62, yaw: .10, opacity: .25, seed: 7.1 },
  { x: 3.7, z: -2.8, width: 10, height: .46, yaw: -.12, opacity: .22, seed: 11.4 },
  { x: -3.7, z: 2.0, width: 3.8, height: .34, yaw: .16, opacity: .23, seed: 15.2 },
  { x: 3.5, z: 2.8, width: 3.3, height: .28, yaw: -.14, opacity: .20, seed: 19.8 },
] as const

/** Fog is already gone when the lens meets the water, rather than following
 * the camera down as an airborne overlay. Time freezes under reduced motion. */
export function sampleSurfaceFog(underwater: number, lightLevel: number, elapsed: number, reducedMotion: boolean) {
  const t = Math.max(0, Math.min(1, (underwater - .015) / .305))
  const air = 1 - t * t * (3 - 2 * t)
  const gain = air * Math.max(0, Math.min(1, lightLevel))
  return { visible: gain > .001, gain, time: reducedMotion ? 0 : Math.max(0, elapsed) }
}
