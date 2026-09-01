import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import './PointerLight.css'

// Two stacked lights, one pointer: a tighter cool core, and a much wider,
// fainter ember halo that trails further behind. The lag difference is
// what sells it as light drifting across material instead of a cursor
// glow — the warmth arrives a beat after the light itself.
export function PointerLight() {
  const rootRef = useRef<HTMLDivElement>(null)
  const reducedMotion = useReducedMotion()

  useGSAP(
    () => {
      const root = rootRef.current
      const container = root?.parentElement
      if (!container || !root || reducedMotion) return

      const core = root.querySelector<HTMLElement>('.pointer-light__core')
      const halo = root.querySelector<HTMLElement>('.pointer-light__halo')
      if (!core || !halo) return

      const mm = gsap.matchMedia()

      mm.add('(hover: hover) and (pointer: fine)', () => {
        gsap.set([core, halo], { xPercent: -50, yPercent: -50, opacity: 0 })

        const coreX = gsap.quickTo(core, 'x', { duration: 0.7, ease: 'power3.out' })
        const coreY = gsap.quickTo(core, 'y', { duration: 0.7, ease: 'power3.out' })
        const haloX = gsap.quickTo(halo, 'x', { duration: 1.35, ease: 'power3.out' })
        const haloY = gsap.quickTo(halo, 'y', { duration: 1.35, ease: 'power3.out' })

        const handleMove = (event: PointerEvent) => {
          const rect = container.getBoundingClientRect()
          const x = event.clientX - rect.left
          const y = event.clientY - rect.top
          coreX(x)
          coreY(y)
          haloX(x)
          haloY(y)
        }

        const handleEnter = () => {
          gsap.to(core, { opacity: 1, duration: 0.6, ease: 'power2.out' })
          gsap.to(halo, { opacity: 1, duration: 0.9, ease: 'power2.out' })
        }

        const handleLeave = () => {
          gsap.to([core, halo], { opacity: 0, duration: 0.7, ease: 'power2.out' })
        }

        container.addEventListener('pointermove', handleMove)
        container.addEventListener('pointerenter', handleEnter)
        container.addEventListener('pointerleave', handleLeave)

        return () => {
          container.removeEventListener('pointermove', handleMove)
          container.removeEventListener('pointerenter', handleEnter)
          container.removeEventListener('pointerleave', handleLeave)
        }
      })

      return () => mm.revert()
    },
    { scope: rootRef, dependencies: [reducedMotion] },
  )

  if (reducedMotion) return null

  return (
    <div ref={rootRef} className="pointer-light" aria-hidden="true">
      <div className="pointer-light__halo" />
      <div className="pointer-light__core" />
    </div>
  )
}
