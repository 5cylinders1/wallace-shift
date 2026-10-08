/**
 * World coordinates for the timelapse illustration.
 *
 * One unit is roughly 0.6 inches; a person is ~110 units tall. The scene is
 * a front elevation of a 1½-story Cape: a white front-gable wing on the
 * left, two dormers over the porch, a stone front gable with a bay window,
 * an interior chimney, and a lower garage wing set back on the right.
 *
 * The camera "rises" by stretching the main roof plane upward from its eave
 * (more of the slope becomes visible) and by deepening the lawn from the
 * house's base line. Anything that sits on either surface is placed through
 * `roofY()` / `groundY()` so it stays attached.
 */

export const GROUND_Y = 1060

export const EAVE_Y = 875
export const RIDGE_Y = 600
export const ROOF_X0 = 700
export const ROOF_X1 = 1700
/** The main roof's front plane: a steep slope with a slightly clipped end. */
export const ROOF_POLY: ReadonlyArray<readonly [number, number]> = [
  [ROOF_X0, EAVE_Y],
  [ROOF_X0 + 60, RIDGE_Y],
  [ROOF_X1 - 60, RIDGE_Y],
  [ROOF_X1, EAVE_Y],
]

/** One shingle course (exposure), bottom edges aligned to the eave. */
export const COURSE = 10
export const COURSE_COUNT = Math.ceil((EAVE_Y - RIDGE_Y) / COURSE)
/** The ice & water shield band along the eave (about three feet). */
export const ICE_TOP = EAVE_Y - 60

export const GARAGE = {
  x0: 1600,
  x1: 1940,
  eaveY: 935,
  ridgeY: 830,
  poly: [
    [1580, 935],
    [1700, 830],
    [1840, 830],
    [1960, 935],
  ] as ReadonlyArray<readonly [number, number]>,
}

export const LEFT_GABLE = { x0: 575, x1: 845, eaveY: 860, peakX: 710, peakY: 690 }
export const STONE_GABLE = { x0: 1160, x1: 1440, eaveY: 880, peakX: 1300, peakY: 700 }

export const DORMERS = [
  { x: 920, baseY: 822 },
  { x: 1080, baseY: 822 },
] as const

export const CHIMNEY = { x0: 1452, x1: 1530, topY: 500, baseY: 735 }

export const PIPE_BOOTS = [
  { x: 1225, y: 662 },
  { x: 1600, y: 812 },
] as const

/** Decking sheets found soft at tear-off and replaced. 4×8 sheets. */
export const ROTTEN_SHEETS = [
  { x: 1520, y: 715, w: 160, h: 80 },
  { x: 1440, y: 795, w: 160, h: 80 },
  { x: 960, y: 715, w: 160, h: 80 },
] as const

/** Hail hits the inspector circles in chalk, in the order he walks them. Roof-local. */
export const CHALK_MARKS = [
  { x: 1548, y: 838 },
  { x: 1630, y: 770 },
  { x: 1572, y: 690 },
  { x: 1352, y: 646 },
  { x: 1250, y: 628 },
  { x: 1002, y: 742 },
  { x: 812, y: 640 },
] as const

/** The dump trailer and truck, parked on the driveway in front of the garage. */
export const TRAILER = { x: 1536, w: 300, baseY: 1186 }
export const TRUCK = { x: 1854, w: 336, baseY: 1186 }
export const LADDER = { x: 1466, topY: EAVE_Y - 38 }
export const YARD_SIGN = { x: 770, y: 1262 }
/** The public sidewalk and street that close the lawn at the bottom. */
export const SIDEWALK_Y = 1372
export const CURB_Y = 1412

/** World-space anchor for the debris arc into the trailer. */
export const TRAILER_MOUTH = { x: TRAILER.x + 150, y: 1094 }

export function roofY(localY: number, stretch: number): number {
  return EAVE_Y - (EAVE_Y - localY) * stretch
}

export function garageRoofY(localY: number, stretch: number): number {
  return GARAGE.eaveY - (GARAGE.eaveY - localY) * stretch
}

export function groundY(localY: number, depth: number): number {
  return GROUND_Y + (localY - GROUND_Y) * depth
}

/** Every window pane on the house, for daytime glass and the night glow. */
export const WINDOW_PANES: ReadonlyArray<{ x: number; y: number; w: number; h: number }> = [
  // left gable wing
  { x: 668, y: 904, w: 84, h: 104 },
  // right of the stone gable
  { x: 1504, y: 924, w: 50, h: 84 },
  { x: 1564, y: 924, w: 50, h: 84 },
  // bay window
  { x: 1206, y: 926, w: 56, h: 96 },
  { x: 1272, y: 926, w: 56, h: 96 },
  { x: 1338, y: 926, w: 56, h: 96 },
  // door sidelights
  { x: 950, y: 948, w: 14, h: 104 },
  { x: 1036, y: 948, w: 14, h: 104 },
]
