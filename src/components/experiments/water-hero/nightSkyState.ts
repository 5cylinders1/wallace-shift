/** One bounded visibility contract for the sky's fine stars and low mist. */
export function sampleNightSky(underwater: number, lightLevel: number, time: number, reducedMotion: boolean) {
  const air = 1 - Math.max(0, Math.min(1, underwater))
  const light = Math.max(0, Math.min(1, lightLevel))
  return {
    visible: air > .005 && light > .001,
    stars: .72 * air * air * light,
    fog: air ** 1.25 * light,
    fogTime: reducedMotion ? 0 : Math.max(0, time),
  }
}
