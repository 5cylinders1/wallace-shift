/**
 * The sample roof: an illustrated house seen from above, used when the
 * live measurement API is not connected (and as the idle blueprint).
 *
 * Plan coordinates are metres, x east and y south, on a 40 × 40 m tile
 * with north up. Planes tile the roof without overlapping, so their areas
 * add up: a cross-gabled 1½-storey house with two front gables, two
 * dormers and a hipped garage wing — about 28 squares.
 */

export type Vec = [number, number]

export interface SamplePlane {
  id: string
  polygon: Vec[]
  pitchDeg: number
  /** Down-slope compass bearing. */
  azimuthDeg: number
  kind: 'main' | 'wing' | 'dormer' | 'garage'
}

export const TILE_METERS = 40
export const PIXELS = 400

const SCALE = 0.85
const OFFSET: Vec = [3.4, 3.1]

const deg = (rise: number) => (Math.atan(rise / 12) * 180) / Math.PI
const P = (x: number, y: number): Vec => [OFFSET[0] + x * SCALE, OFFSET[1] + y * SCALE]

const MAIN = deg(10)
const WING = deg(12)
const GARAGE = deg(6)

export const planes: SamplePlane[] = [
  { id: 'main-n', kind: 'main', pitchDeg: MAIN, azimuthDeg: 0, polygon: [P(8, 14), P(26, 14), P(26, 18.5), P(8, 18.5)] },
  {
    id: 'main-s',
    kind: 'main',
    pitchDeg: MAIN,
    azimuthDeg: 180,
    polygon: [P(8, 18.5), P(26, 18.5), P(26, 23), P(23, 23), P(20.5, 20), P(18, 23), P(15.5, 23), P(12.5, 19.4), P(9.5, 23), P(8, 23)],
  },
  { id: 'west-gable-w', kind: 'wing', pitchDeg: WING, azimuthDeg: 270, polygon: [P(9.5, 23), P(12.5, 19.4), P(12.5, 28.5), P(9.5, 28.5)] },
  { id: 'west-gable-e', kind: 'wing', pitchDeg: WING, azimuthDeg: 90, polygon: [P(12.5, 19.4), P(15.5, 23), P(15.5, 28.5), P(12.5, 28.5)] },
  { id: 'stone-gable-w', kind: 'wing', pitchDeg: WING, azimuthDeg: 270, polygon: [P(18, 23), P(20.5, 20), P(20.5, 26.5), P(18, 26.5)] },
  { id: 'stone-gable-e', kind: 'wing', pitchDeg: WING, azimuthDeg: 90, polygon: [P(20.5, 20), P(23, 23), P(23, 26.5), P(20.5, 26.5)] },
  { id: 'dormer-1-w', kind: 'dormer', pitchDeg: WING, azimuthDeg: 270, polygon: [P(15.9, 20.6), P(16.7, 20.6), P(16.7, 22.8), P(15.9, 22.8)] },
  { id: 'dormer-1-e', kind: 'dormer', pitchDeg: WING, azimuthDeg: 90, polygon: [P(16.7, 20.6), P(17.5, 20.6), P(17.5, 22.8), P(16.7, 22.8)] },
  { id: 'dormer-2-w', kind: 'dormer', pitchDeg: WING, azimuthDeg: 270, polygon: [P(23.7, 20.6), P(24.5, 20.6), P(24.5, 22.8), P(23.7, 22.8)] },
  { id: 'dormer-2-e', kind: 'dormer', pitchDeg: WING, azimuthDeg: 90, polygon: [P(24.5, 20.6), P(25.3, 20.6), P(25.3, 22.8), P(24.5, 22.8)] },
  { id: 'garage-w', kind: 'garage', pitchDeg: GARAGE, azimuthDeg: 270, polygon: [P(26, 15), P(29.75, 18.75), P(29.75, 19.75), P(26, 23.5)] },
  { id: 'garage-e', kind: 'garage', pitchDeg: GARAGE, azimuthDeg: 90, polygon: [P(33.5, 15), P(33.5, 23.5), P(29.75, 19.75), P(29.75, 18.75)] },
  { id: 'garage-n', kind: 'garage', pitchDeg: GARAGE, azimuthDeg: 0, polygon: [P(26, 15), P(33.5, 15), P(29.75, 18.75)] },
  { id: 'garage-s', kind: 'garage', pitchDeg: GARAGE, azimuthDeg: 180, polygon: [P(26, 23.5), P(29.75, 19.75), P(33.5, 23.5)] },
]

/** Lines drawn as highlights (ridges, hips) and shadows (valleys). */
export const ridges: Array<[Vec, Vec]> = [
  [P(8, 18.5), P(26, 18.5)],
  [P(12.5, 19.4), P(12.5, 28.5)],
  [P(20.5, 20), P(20.5, 26.5)],
  [P(16.7, 20.6), P(16.7, 22.8)],
  [P(24.5, 20.6), P(24.5, 22.8)],
  [P(29.75, 18.75), P(29.75, 19.75)],
  [P(26, 15), P(29.75, 18.75)],
  [P(33.5, 15), P(29.75, 18.75)],
  [P(26, 23.5), P(29.75, 19.75)],
  [P(33.5, 23.5), P(29.75, 19.75)],
]

export const valleys: Array<[Vec, Vec]> = [
  [P(9.5, 23), P(12.5, 19.4)],
  [P(15.5, 23), P(12.5, 19.4)],
  [P(18, 23), P(20.5, 20)],
  [P(23, 23), P(20.5, 20)],
]

/** A backyard shed, in absolute tile metres: a separate building to opt in. */
export const shed: Vec[] = [[24.2, 6.2], [27.8, 6.2], [27.8, 8.9], [24.2, 8.9]]

/** Neighbouring houses at the frame edges (absolute tile metres). */
export const neighbours: Array<{ x: number; y: number; w: number; h: number; ridgeVertical: boolean }> = [
  { x: -4.5, y: 12.5, w: 9, h: 13, ridgeVertical: true },
  { x: 36.2, y: 13.5, w: 9, h: 12, ridgeVertical: false },
]

/** Where the address point lands: the front walk, by the door. */
export const pin: Vec = [OFFSET[0] + 16.9 * SCALE, OFFSET[1] + 27.4 * SCALE]

export const chimney: Vec[] = [P(21.9, 19.1), P(22.9, 19.1), P(22.9, 20.1), P(21.9, 20.1)]

export const driveway: Vec[] = [P(26.6, 23.5), P(33, 23.5), P(33.6, 44), P(26.2, 44)]
export const walk: Vec[] = [P(16.4, 26.6), P(17.3, 26.6), P(17.3, 40.9), P(16.4, 40.9)]
export const SIDEWALK_Y = OFFSET[1] + 40.9 * SCALE
export const STREET_Y = OFFSET[1] + 42.6 * SCALE
