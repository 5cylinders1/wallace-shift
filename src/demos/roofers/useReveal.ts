import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import type { RefObject } from 'react'

/**
 * Short upward reveals for `[data-reveal]` blocks inside `scope`, batched so
 * neighbours entering together stagger slightly. Nothing moves with
 * reduced motion; everything is visible without JavaScript.
 *
 * Only opacity changes, never visibility, so a block waiting to be revealed
 * can still be reached by Tab and read by a screen reader; one that gets
 * focus before it scrolls in is shown at once.
 */
export function useReveal(scope: RefObject<HTMLElement | null>) {
  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const targets = gsap.utils.toArray<HTMLElement>('[data-reveal]')
        gsap.set(targets, { opacity: 0, y: 20 })
        ScrollTrigger.batch(targets, {
          start: 'top 90%',
          once: true,
          onEnter: (batch) =>
            gsap.to(batch, { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out', stagger: 0.08, overwrite: true }),
        })
        const showFocused = (event: FocusEvent) => {
          const block = (event.target as Element | null)?.closest<HTMLElement>('[data-reveal]')
          if (block) gsap.to(block, { opacity: 1, y: 0, duration: 0.2, overwrite: true })
        }
        const root = scope.current
        root?.addEventListener('focusin', showFocused)
        return () => root?.removeEventListener('focusin', showFocused)
      })
      return () => mm.revert()
    },
    { scope },
  )
}
