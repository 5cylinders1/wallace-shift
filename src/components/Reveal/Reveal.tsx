import { useRef, type ReactNode } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { useReducedMotion } from '../../hooks/useReducedMotion'

type RevealProps = {
  children: ReactNode
  delay?: number
  y?: number
  /**
   * Slide in from off the page instead of rising. The offset is a percentage
   * of the element's own width, so it always starts fully outside itself
   * whatever the column it sits in is doing. The section it lives in has to
   * clip, or the off-screen start becomes a horizontal scrollbar.
   */
  xPercent?: number
  className?: string
}

export function Reveal({ children, delay = 0, y = 22, xPercent, className }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const reducedMotion = useReducedMotion()

  useGSAP(
    () => {
      const el = ref.current
      if (!el) return

      const sliding = xPercent !== undefined

      if (reducedMotion) {
        gsap.set(el, { opacity: 1, y: 0, xPercent: 0 })
        return
      }

      gsap.set(el, sliding ? { opacity: 0, xPercent, y: 0 } : { opacity: 0, y })

      // A sliding reveal starts fully outside its own section, and that
      // section has to clip or the page gains a horizontal scrollbar.
      // IntersectionObserver clips against ancestor overflow, so watching the
      // element itself reports it as never intersecting: it cannot come into
      // view because it is off the page, and it is never animated in because
      // it is not in view. Watch the untransformed parent instead, which is
      // exactly as visible as the place this element is travelling to.
      const watched = (sliding && el.parentElement) || el

      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              gsap.to(el, {
                opacity: 1,
                y: 0,
                xPercent: 0,
                // A full-width travel needs longer than a 22px rise to land
                // with the same weight.
                duration: sliding ? 1.05 : 0.8,
                delay,
                ease: 'power3.out',
              })
              observer.unobserve(watched)
            }
          }
        },
        // A tall enquiry card would otherwise have to be a fifth on screen
        // before it starts, by which time the reader has already seen the gap
        // it should have arrived into.
        { threshold: sliding ? 0 : 0.2, rootMargin: sliding ? '0px 0px -12% 0px' : '0px' },
      )

      observer.observe(watched)
      return () => observer.disconnect()
    },
    { scope: ref, dependencies: [reducedMotion, delay, y, xPercent] },
  )

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  )
}
