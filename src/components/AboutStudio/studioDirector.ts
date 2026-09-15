/** Scroll holds leave room to read; travel happens between those holds. */
export const clampStudioProgress = (value: number) => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0))
const smooth = (value: number) => {
  const t = clampStudioProgress(value)
  return t * t * (3 - 2 * t)
}
const range = (value: number, from: number, to: number) => smooth((value - from) / (to - from))

export function sampleStudioJourney(progress: number) {
  const p = clampStudioProgress(progress)
  const firstTravel = range(p, .13, .43)
  const secondTravel = range(p, .58, .88)
  return {
    film: firstTravel * .5 + secondTravel * .5,
    opening: 1 - range(p, .14, .25),
    detail: range(p, .33, .43) * (1 - range(p, .59, .69)),
    alignment: range(p, .77, .88),
    chapter: p < .3 ? 0 : p < .73 ? 1 : 2,
  }
}
