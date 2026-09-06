import { useCallback, type RefObject } from 'react'
import { useGSAP } from '@gsap/react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { IMPLEMENTED_PROGRESS_MAX } from './waterHeroConfig'
import type { DebugOverride, ProgressSource } from './waterHeroTypes'

/**
 * Maps page scroll onto normalized narrative progress.
 *
 * There is no `scrub` value here, numeric or otherwise. A numeric scrub
 * introduces catch-up time between where the page is and where the scene
 * thinks it is, which is exactly wrong for an object whose height the user
 * is meant to be holding directly. `onUpdate` writes the trigger's own
 * progress into a mutable ref instead: no tween, no lag, nothing to
 * settle, and no React render on the scroll path.
 *
 * `onRefresh` matters as much as `onUpdate`. A resize, a font load or a
 * route-level ScrollTrigger.refresh() changes the mapping without firing
 * a scroll event, and without this the scene would keep rendering the
 * pre-resize progress until the user moved.
 */
export function useScrollProgress(
  sectionRef: RefObject<HTMLElement | null>,
  progress: ProgressSource,
  override: DebugOverride,
  onProgress?: (narrative: number) => void,
  enabled = true,
) {
  const apply = useCallback(
    (raw: number) => {
      // A pinned narrative outranks scroll, so a reviewer holding a moment
      // does not lose it to an incidental scroll.
      if (override.progress !== null) return
      const narrative = raw * IMPLEMENTED_PROGRESS_MAX
      progress.current = narrative
      onProgress?.(narrative)
    },
    [progress, override, onProgress],
  )

  useGSAP(
    () => {
      const section = sectionRef.current
      if (!section || !enabled) return

      const trigger = ScrollTrigger.create({
        trigger: section,
        start: 'top top',
        end: 'bottom bottom',
        onUpdate: (self) => apply(self.progress),
        onRefresh: (self) => apply(self.progress),
      })

      apply(trigger.progress)

      return () => {
        trigger.kill()
      }
    },
    { scope: sectionRef, dependencies: [apply, enabled] },
  )
}
