import { useCallback, useEffect, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import {
  advanceStarLook, createStarLookState, inputStarLook, releaseStarLook, wheelPixels,
} from './starLookInteraction'
import type { DebugOverride, ProgressSource } from './waterHeroTypes'

/** Native listeners remain passive: the Easter Egg never owns page scroll. */
export function useStarLook({ progress, override, reducedMotion }: {
  progress: ProgressSource
  override?: DebugOverride
  reducedMotion: boolean
}) {
  const canvas = useThree(state => state.gl.domElement)
  const state = useRef(createStarLookState())
  const touch = useRef<{ identifier: number; y: number } | null>(null)
  const blocked = useCallback(() => reducedMotion || override?.progress != null
    || document.visibilityState === 'hidden', [reducedMotion, override])

  useEffect(() => {
    state.current = createStarLookState()
    const surface = canvas.closest<HTMLElement>('.water-hero__stage') ?? canvas
    const eligible = () => {
      // Safari can report negative scrollY while rubber-banding. Cancel
      // that viewport displacement when checking the hero's actual top.
      const heroTop = surface.getBoundingClientRect().top + Math.min(0, window.scrollY)
      return !blocked() && window.scrollY <= 1 && progress.current <= .0001 && Math.abs(heroTop) <= 2
    }
    const interactive = (target: EventTarget | null) => target instanceof Element
      && Boolean(target.closest('a, button, input, select, textarea, [contenteditable], .water-hero__debug'))
    const wheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey || interactive(event.target)
        || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return
      state.current = inputStarLook(state.current,
        wheelPixels(event.deltaY, event.deltaMode, window.innerHeight),
        performance.now(), eligible(), event.isTrusted)
    }
    const touchStart = (event: TouchEvent) => {
      const point = event.touches[0]
      touch.current = event.isTrusted && event.touches.length === 1 && !interactive(event.target)
        ? { identifier: point.identifier, y: point.clientY } : null
    }
    const touchMove = (event: TouchEvent) => {
      if (!touch.current || event.touches.length !== 1) {
        touch.current = null
        return
      }
      const point = event.touches[0]
      if (point.identifier !== touch.current.identifier) return
      const pixels = touch.current.y - point.clientY
      touch.current.y = point.clientY
      state.current = inputStarLook(state.current, pixels, performance.now(), eligible(), event.isTrusted)
    }
    const touchEnd = () => { touch.current = null }
    const scroll = () => {
      if (window.scrollY > 1 || progress.current > .0001) state.current = releaseStarLook(state.current, true)
    }
    const reset = () => { state.current = createStarLookState(); touch.current = null }

    surface.addEventListener('wheel', wheel, { passive: true })
    surface.addEventListener('touchstart', touchStart, { passive: true })
    surface.addEventListener('touchmove', touchMove, { passive: true })
    surface.addEventListener('touchend', touchEnd, { passive: true })
    surface.addEventListener('touchcancel', touchEnd, { passive: true })
    window.addEventListener('scroll', scroll, { passive: true })
    window.addEventListener('blur', reset)
    document.addEventListener('visibilitychange', reset)
    return () => {
      surface.removeEventListener('wheel', wheel)
      surface.removeEventListener('touchstart', touchStart)
      surface.removeEventListener('touchmove', touchMove)
      surface.removeEventListener('touchend', touchEnd)
      surface.removeEventListener('touchcancel', touchEnd)
      window.removeEventListener('scroll', scroll)
      window.removeEventListener('blur', reset)
      document.removeEventListener('visibilitychange', reset)
      reset()
    }
  }, [canvas, progress, blocked])

  return useCallback((delta: number) => {
    state.current = advanceStarLook(state.current, delta, performance.now(),
      !blocked() && progress.current < .025 && window.scrollY < 120,
      window.scrollY <= 1 && progress.current <= .0001)
    return state.current.lift
  }, [progress, blocked])
}
