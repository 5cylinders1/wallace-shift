import { useRef, type ReactNode } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { useReducedMotion } from '../../hooks/useReducedMotion'

type RevealProps = {
  children: ReactNode
  delay?: number
  y?: number
  className?: string
}

export function Reveal({ children, delay = 0, y = 22, className }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const reducedMotion = useReducedMotion()

  useGSAP(
    () => {
      const el = ref.current
      if (!el) return

      if (reducedMotion) {
        gsap.set(el, { opacity: 1, y: 0 })
        return
      }

      gsap.set(el, { opacity: 0, y })

      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              gsap.to(el, {
                opacity: 1,
                y: 0,
                duration: 0.8,
                delay,
                ease: 'power3.out',
              })
              observer.unobserve(el)
            }
          }
        },
        { threshold: 0.2 },
      )

      observer.observe(el)
      return () => observer.disconnect()
    },
    { scope: ref, dependencies: [reducedMotion, delay, y] },
  )

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  )
}
