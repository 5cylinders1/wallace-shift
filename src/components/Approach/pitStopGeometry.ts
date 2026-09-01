// Shared layout constants for the pit-stop Process scene. All five source
// layers (formula-car-chassis.png, formula-tire-*.png) share one
// 1672x941 canvas — see PitStopCar.tsx.
export const CAR_CANVAS_W = 1672
export const CAR_CANVAS_H = 941
export const CAR_ASPECT = `${CAR_CANVAS_W} / ${CAR_CANVAS_H}`

// Hub centers, measured directly from the source PNGs (percentage of the
// shared canvas) — used to place alignment marks and the peel-out marks
// relative to the car container rather than guessing.
export const HUB = {
  frontXPercent: 79.1,
  rearXPercent: 16.2,
  upperYPercent: 21.9,
  lowerYPercent: 77,
} as const

// The rear tire's own footprint height (percentage of the shared canvas
// height, from the same alpha-bbox measurement as HUB above) — used to
// size the peel-out mark's thickness so it reads as coming from the tire
// itself rather than an arbitrarily thin line.
export const TIRE_TREAD_PERCENT = 17.2

// How far a tire travels off its hub during the swap, expressed as
// `yPercent` (relative to the tire image's own — i.e. the car container's —
// rendered height) so it scales uniformly with the car at every viewport
// size instead of needing a resize recalculation.
export const TIRE_TRAVEL_Y_PERCENT = 92

// The scene stage's own coordinate-system width (PitStopScene.tsx's
// viewBox and `.pit-stop-scene__car-travel` are both this many units/100%
// wide) — shared here so Approach.tsx can convert the travel wrapper's
// live `xPercent` into absolute stage units for the peel-out marks without
// duplicating the number.
export const STAGE_VIEW_W = 1000

// Horizontal travel for the whole assembled car during entry/exit. The car
// itself occupies a small, centered slice of a full-window-wide stage, so
// this is expressed as `xPercent` on a wrapper that spans the *entire*
// stage width (not the car's own small box) — -100/+100 is exactly one
// full stage-width of travel, which clears the (much smaller) car
// completely off-frame on either side with a wide margin regardless of
// viewport size. See PitStopScene.tsx's `.pit-stop-scene__car-travel`.
export const CAR_ENTER_X_PERCENT = -100
export const CAR_EXIT_X_PERCENT = 100

// Timeline label positions (fraction of total scrubbed duration): car
// stops -> old wheels shoot off -> fresh wheels shoot on -> release opens
// and peel marks lay down as the car launches away.
export const TIMELINE = {
  enterEnd: 0.24,
  shootOffEnd: 0.4,
  shootOnEnd: 0.56,
  releaseAt: 0.6,
} as const

export type TireKey = 'frontUpper' | 'frontLower' | 'rearUpper' | 'rearLower'

export const TIRE_KEYS: TireKey[] = ['frontUpper', 'frontLower', 'rearUpper', 'rearLower']

export const TIRE_SOURCES: Record<TireKey, string> = {
  frontUpper: '/media/pit-stop/formula-tire-front-upper.png',
  frontLower: '/media/pit-stop/formula-tire-front-lower.png',
  rearUpper: '/media/pit-stop/formula-tire-rear-upper.png',
  rearLower: '/media/pit-stop/formula-tire-rear-lower.png',
}

export const CHASSIS_SOURCE = '/media/pit-stop/formula-car-chassis.png'

export function isUpperTire(key: TireKey): boolean {
  return key === 'frontUpper' || key === 'rearUpper'
}
