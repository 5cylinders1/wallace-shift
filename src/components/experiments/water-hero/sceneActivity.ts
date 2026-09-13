import type { RootState } from '@react-three/fiber'

/** Landing Canvas stays in manual mode: Canvas reconfiguration cannot wake
 * an offscreen scene or reset its clock. Feed R3F seconds of active time only. */
export function startSceneFrames(
  { clock, advance }: Pick<RootState, 'clock' | 'advance'>,
  scheduler: Pick<Window, 'requestAnimationFrame' | 'cancelAnimationFrame'> = window,
) {
  let previous: number | null = null
  let frame = 0
  let stopped = false
  const update = (now: number) => {
    if (stopped) return
    const delta = previous === null ? 0 : Math.max(0, Math.min((now - previous) / 1000, .1))
    previous = now
    // Do not run global effects for other canvases on the page.
    advance(clock.elapsedTime + delta, false)
    frame = scheduler.requestAnimationFrame(update)
  }
  frame = scheduler.requestAnimationFrame(update)
  return () => {
    stopped = true
    scheduler.cancelAnimationFrame(frame)
  }
}
