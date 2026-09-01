import { useRef, type RefObject } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import './HeroRipples.css'

// Pressing anywhere on the hero drops a quiet "touch on water" — two thin
// concentric ellipse rings that spread and fade, flattened to match the
// water's perspective. The rings are an overlay light effect only: the
// video, and the WS inside it, never move.
const MAX_LIVE_RIPPLES = 6
const RING_W = 260
const RING_H = 74

interface HeroRipplesProps {
  sectionRef: RefObject<HTMLElement | null>
}

export function HeroRipples({ sectionRef }: HeroRipplesProps) {
  const layerRef = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      const layer = layerRef.current
      const section = sectionRef.current
      if (!layer || !section) return

      const mm = gsap.matchMedia()

      mm.add(
        '(prefers-reduced-motion: no-preference) and (hover: hover) and (pointer: fine)',
        () => {
          const spawn = (event: PointerEvent) => {
            // Only primary, unmodified presses on the hero surface itself —
            // clicks on the CTAs, nav, or contact card shouldn't splash.
            if (event.button !== 0) return
            const target = event.target as HTMLElement
            if (target.closest('a, button, input, textarea, label')) return
            if (layer.childElementCount >= MAX_LIVE_RIPPLES * 2) return

            const rect = section.getBoundingClientRect()
            const x = event.clientX - rect.left
            const y = event.clientY - rect.top

            for (let i = 0; i < 2; i++) {
              const ring = document.createElement('span')
              ring.className = 'hero-ripple'
              ring.style.width = `${RING_W}px`
              ring.style.height = `${RING_H}px`
              ring.style.left = `${x}px`
              ring.style.top = `${y}px`
              layer.appendChild(ring)

              const duration = 1.5 + i * 0.45
              const peak = 0.5 - i * 0.22

              gsap.set(ring, { xPercent: -50, yPercent: -50, scale: 0.12, opacity: 0 })
              gsap
                .timeline({ delay: i * 0.12, onComplete: () => ring.remove() })
                .to(ring, { scale: 1 + i * 0.5, duration, ease: 'power2.out' }, 0)
                .to(ring, { opacity: peak, duration: 0.22, ease: 'power1.out' }, 0)
                .to(ring, { opacity: 0, duration: duration - 0.22, ease: 'power1.out' }, 0.22)
            }
          }

          section.addEventListener('pointerdown', spawn)
          return () => {
            section.removeEventListener('pointerdown', spawn)
            layer.replaceChildren()
          }
        },
      )

      return () => mm.revert()
    },
    { scope: layerRef, dependencies: [] },
  )

  return <div ref={layerRef} className="hero-ripples" aria-hidden="true" />
}
