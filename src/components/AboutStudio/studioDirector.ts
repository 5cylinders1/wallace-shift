/** Enter the architecture, cross its seam, then reveal its full ground plan. */
export const clampStudioProgress = (value: number) => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0))
const smooth = (value: number) => {
  const t = clampStudioProgress(value)
  return t * t * (3 - 2 * t)
}
const range = (value: number, from: number, to: number) => smooth((value - from) / (to - from))

export function sampleStudioJourney(progress: number) {
  const p = clampStudioProgress(progress)
  const firstTravel = range(p, .06, .40)
  const secondTravel = range(p, .48, .90)
  return {
    film: firstTravel * .5 + secondTravel * .5,
    immersion: range(p, .07, .17) * (1 - range(p, .72, .84)),
    opening: 1 - range(p, .065, .15),
    detail: range(p, .35, .40) * (1 - range(p, .49, .57)),
    alignment: range(p, .84, .91),
    chapter: p < .25 ? 0 : p < .76 ? 1 : 2,
  }
}
