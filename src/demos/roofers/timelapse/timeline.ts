/**
 * The job, as a function of scroll progress (0–100).
 *
 * Captions, the clock, and every animated layer read these ranges, so a
 * phase can be lengthened or moved here without touching the drawing.
 */

export const PHASE = {
  introEnd: 5,
  inspect: [5, 16],
  arrive: [16, 24],
  tearOff: [25, 39.5],
  garageTear: [34, 39],
  deck: [40, 47],
  dripEdge: [47.5, 49.5],
  ice: [48.5, 51],
  underlay: [50, 56],
  night: [57, 64],
  install: [67, 80.5],
  garageInstall: [78.4, 81.6],
  ridge: [80, 82.4],
  cleanup: [82.4, 92],
  finale: [92, 100],
} as const

/** Which caption is showing, by progress. -1 is the intro, 7 the finale. */
export const STEP_STARTS = [5, 16, 24, 40, 47, 64, 82, 92] as const

export function stepAt(p: number): number {
  let index = -1
  for (let i = 0; i < STEP_STARTS.length; i += 1) {
    if (p >= STEP_STARTS[i]) index = i
  }
  return index
}

/**
 * The on-screen clock. Minutes since midnight of day 1; the inspection
 * happens before the job is scheduled, so it reads as its own label.
 */
const CLOCK: ReadonlyArray<{ at: number; minutes: number }> = [
  { at: 16, minutes: 7 * 60 },
  { at: 24, minutes: 8 * 60 + 10 },
  { at: 40, minutes: 12 * 60 + 20 },
  { at: 47, minutes: 14 * 60 + 30 },
  { at: 56, minutes: 17 * 60 + 40 },
  { at: 60.5, minutes: 21 * 60 + 30 },
  { at: 62.5, minutes: 24 * 60 + 5 * 60 + 30 },
  { at: 65, minutes: 24 * 60 + 7 * 60 },
  { at: 82, minutes: 24 * 60 + 14 * 60 + 40 },
  { at: 92, minutes: 24 * 60 + 16 * 60 + 30 },
  { at: 100, minutes: 24 * 60 + 17 * 60 + 15 },
]

export function clockAt(p: number): { day: string; time: string } {
  if (p < CLOCK[0].at) return { day: 'Before the job', time: 'Free inspection' }
  let minutes = CLOCK[CLOCK.length - 1].minutes
  for (let i = 1; i < CLOCK.length; i += 1) {
    if (p <= CLOCK[i].at) {
      const a = CLOCK[i - 1]
      const b = CLOCK[i]
      minutes = a.minutes + ((p - a.at) / (b.at - a.at)) * (b.minutes - a.minutes)
      break
    }
  }
  // Round to five minutes so the readout ticks like a timelapse clock.
  const rounded = Math.floor(minutes / 5) * 5
  const day = rounded >= 24 * 60 ? 2 : 1
  const inDay = rounded % (24 * 60)
  const h24 = Math.floor(inDay / 60)
  const m = inDay % 60
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12
  const suffix = h24 < 12 ? 'AM' : 'PM'
  return { day: `Day ${day}`, time: `${h12}:${String(m).padStart(2, '0')} ${suffix}` }
}
