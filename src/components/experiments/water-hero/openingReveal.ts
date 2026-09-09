/** Shared scroll beats for every appearance. The finished state occupies a
 * generous scroll interval, not a guaranteed number of seconds. There is no
 * wall clock, autoplay, scroll interception or state to unwind on reversal. */
export const OPENING_REVEAL = {
  restEnd: .025,
  traceStart: .025,
  traceEnd: .09,
  surfaceStart: .07,
  surfaceEnd: .145,
  holdEnd: .25,
  exitEnd: .35,
} as const

const smooth = (start: number, end: number, progress: number) => {
  const t = Math.max(0, Math.min(1, (progress - start) / (end - start)))
  return t * t * (3 - 2 * t)
}

export interface OpeningReveal {
  /** Position of the tracing front along the centre cut. */
  trace: number
  /** Trace disappears as the material finishes, avoiding a lasting outline. */
  traceStrength: number
  /** Mix from the readable resting finish to the selected complete material. */
  surface: number
  /** Text emphasis shares the material's energizing interval. */
  prominence: number
  /** The initial dark-but-readable interval, before any trace starts. */
  resting: boolean
}

export function sampleOpeningReveal(progress: number, still = false): OpeningReveal {
  if (still) return { trace: 1, traceStrength: 0, surface: 1, prominence: 1, resting: false }
  const p = Number.isNaN(progress) ? 0 : Math.max(0, Math.min(1, progress))
  const surface = smooth(OPENING_REVEAL.surfaceStart, OPENING_REVEAL.surfaceEnd, p)
  return {
    trace: smooth(OPENING_REVEAL.traceStart, OPENING_REVEAL.traceEnd, p),
    traceStrength: smooth(OPENING_REVEAL.traceStart, .037, p)
      * (1 - smooth(OPENING_REVEAL.traceEnd, OPENING_REVEAL.surfaceEnd, p)),
    surface,
    prominence: surface,
    resting: p <= OPENING_REVEAL.restEnd,
  }
}
