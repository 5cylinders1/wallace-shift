/** Small, dependency-free helpers shared by the scene and its director. */

export const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value))

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/** 0 before `start`, 1 after `end`, linear in between. */
export const segment = (p: number, start: number, end: number) =>
  clamp((p - start) / (end - start))

export const easeInOut = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)

export const easeIn = (t: number) => t * t * t

/** Fades in over [a, b] and out over [c, d]. */
export const window4 = (p: number, a: number, b: number, c: number, d: number) =>
  Math.min(segment(p, a, b), 1 - segment(p, c, d))

/** Deterministic PRNG so the illustration is identical on every render. */
export function seeded(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type Rgb = [number, number, number]

const parseHex = (hex: string): Rgb => {
  const value = parseInt(hex.slice(1), 16)
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255]
}

const toHex = ([r, g, b]: Rgb) =>
  `#${[r, g, b]
    .map((channel) => Math.round(channel).toString(16).padStart(2, '0'))
    .join('')}`

export function mixColor(a: string, b: string, t: number): string {
  const ca = parseHex(a)
  const cb = parseHex(b)
  return toHex([lerp(ca[0], cb[0], t), lerp(ca[1], cb[1], t), lerp(ca[2], cb[2], t)])
}

/**
 * Piecewise interpolation over keyframes sorted by `at`. Holds the first
 * value before the first key and the last after the last.
 */
export function keyed<T>(
  p: number,
  keys: ReadonlyArray<{ at: number; value: T }>,
  mix: (a: T, b: T, t: number) => T,
  ease: (t: number) => number = easeInOut,
): T {
  if (p <= keys[0].at) return keys[0].value
  for (let i = 1; i < keys.length; i += 1) {
    const next = keys[i]
    if (p <= next.at) {
      const prev = keys[i - 1]
      return mix(prev.value, next.value, ease((p - prev.at) / (next.at - prev.at)))
    }
  }
  return keys[keys.length - 1].value
}

export const keyedNumber = (
  p: number,
  keys: ReadonlyArray<{ at: number; value: number }>,
  ease?: (t: number) => number,
) => keyed(p, keys, lerp, ease)

export const keyedColor = (
  p: number,
  keys: ReadonlyArray<{ at: number; value: string }>,
) => keyed(p, keys, mixColor)
