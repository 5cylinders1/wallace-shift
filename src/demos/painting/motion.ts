export const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value))
export const smooth = (value: number) => value * value * (3 - 2 * value)

/**
 * Maps scroll progress (0–1) onto stops 0…count−1, holding still at every
 * stop and easing between them, so each panel of a pinned scene pauses long
 * enough to read before the camera moves on.
 */
export function stepped(progress: number, count: number, hold = 0.5) {
  const last = count - 1
  if (last <= 0) return 0
  let at = clamp(progress) * (count * hold + last)
  for (let stop = 0; stop < last; stop += 1) {
    if (at <= hold) return stop
    at -= hold
    if (at <= 1) return stop + smooth(at)
    at -= 1
  }
  return last
}

export const prefersMotion = '(prefers-reduced-motion: no-preference)'
/** Wide enough for the pinned 3D scenes; narrower screens get per-item reveals. */
export const roomyMotion = '(prefers-reduced-motion: no-preference) and (min-width: 900px) and (min-height: 600px)'
