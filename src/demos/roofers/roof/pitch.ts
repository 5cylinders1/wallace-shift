/**
 * Roof pitch, the way roofers say it: inches of rise per 12 of run.
 *
 * For a roof whose planes share one pitch, the sloped surface is the plan
 * (footprint) area times √(1 + (rise/12)²) — whatever the gable/hip layout,
 * because every plane is tilted by the same angle. That factor is the whole
 * reason the homeowner's pitch matters to the price.
 */

export const PITCH_MIN = 2
export const PITCH_MAX = 16
export const PITCH_DEFAULT = 6

export const pitchDegrees = (rise: number) => (Math.atan(rise / 12) * 180) / Math.PI
export const pitchFactor = (rise: number) => Math.sqrt(1 + (rise / 12) ** 2)
export const clampPitch = (rise: number) => Math.min(PITCH_MAX, Math.max(PITCH_MIN, rise))

export interface PitchBand {
  id: 'low' | 'walkable' | 'moderate' | 'steep' | 'very-steep'
  label: string
  /** For the scale under the drawing. */
  short: string
  from: number
  to: number
  /** What it means on site, in a homeowner's words. */
  note: string
  /** Labor multiplier on the installed price. */
  labor: number
}

export const PITCH_BANDS: PitchBand[] = [
  { id: 'low', label: 'Low slope', short: 'Low', from: 2, to: 3, note: 'Porches, additions and some modern homes. Needs a low-slope underlayment.', labor: 1 },
  { id: 'walkable', label: 'Walkable', short: 'Walkable', from: 4, to: 6, note: 'Most ranches and split-levels. A roofer can walk it comfortably.', labor: 1 },
  { id: 'moderate', label: 'Moderate', short: 'Moderate', from: 7, to: 9, note: 'Common on two-story homes. Harnesses on, a little slower.', labor: 1.06 },
  { id: 'steep', label: 'Steep', short: 'Steep', from: 10, to: 12, note: 'Cape Cods and many older homes. Roof jacks and extra labor.', labor: 1.14 },
  { id: 'very-steep', label: 'Very steep', short: 'Very steep', from: 13, to: 16, note: 'Tudors, Victorians and A-frames. A specialist setup.', labor: 1.25 },
]

export function bandFor(rise: number): PitchBand {
  const r = Math.round(rise)
  return PITCH_BANDS.find((band) => r >= band.from && r <= band.to) ?? PITCH_BANDS[PITCH_BANDS.length - 1]
}

/** One-tap starting points, for visitors who know their house style. */
export const HOUSE_STYLES = [
  { id: 'ranch', label: 'Ranch', pitch: 5 },
  { id: 'two-story', label: 'Two-story', pitch: 7 },
  { id: 'cape', label: 'Cape Cod', pitch: 10 },
  { id: 'tudor', label: 'Tudor', pitch: 14 },
] as const

export const formatPitch = (rise: number) => `${Math.round(rise)}/12`
