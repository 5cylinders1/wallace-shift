import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import type { RefObject } from 'react'

/**
 * Short upward reveals for `[data-reveal]` blocks inside `scope`, batched so
 * neighbours entering together stagger slightly. Nothing moves with
 * reduced motion; everything is visible without JavaScript.
 */
export function useReveal(scope: RefObject<HTMLElement | null>) {
  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const targets = gsap.utils.toArray<HTMLElement>('[data-reveal]')
        gsap.set(targets, { autoAlpha: 0, y: 20 })
        ScrollTrigger.batch(targets, {
          start: 'top 90%',
          once: true,
          onEnter: (batch) =>
            gsap.to(batch, { autoAlpha: 1, y: 0, duration: 0.7, ease: 'power2.out', stagger: 0.08, overwrite: true }),
        })
      })
      return () => mm.revert()
    },
    { scope },
  )
}
