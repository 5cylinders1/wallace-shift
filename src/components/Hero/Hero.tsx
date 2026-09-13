import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { HeroMedia } from './HeroMedia'
import { PointerLight } from './PointerLight'
import { HeroRipples } from './HeroRipples'
import { HeroContent } from './HeroContent'
import { HeroScrollCue } from './HeroScrollCue'
import './Hero.css'

// Max distance (px) the copy/card drift in pointer micro-parallax. Small on
// purpose: the WS and its water must stay rigid, so only the foreground
// copy layers get depth, and only barely.
const PARALLAX_COPY = 7
const PARALLAX_CARD = 4
// Radius (px) around a CTA within which it starts drifting toward the
// pointer, and the drift cap.
const MAGNET_RADIUS = 110
const MAGNET_PULL = 6

export function Hero({ posterOnly = false }: { posterOnly?: boolean }) {
  const sectionRef = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      const section = sectionRef.current
      if (!section || posterOnly) return

      const mm = gsap.matchMedia()

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap
          .timeline({ defaults: { ease: 'power3.out' } })
          .from('.hero__eyebrow', { opacity: 0, y: 18, duration: 0.9 }, 0.1)
          .fromTo(
            '.hero__line-inner',
            { yPercent: 112 },
            {
              yPercent: 0,
              duration: 1.05,
              stagger: 0.14,
              ease: 'power4.out',
            },
            0.22,
          )
          .from('.hero__supporting', { opacity: 0, y: 18, duration: 0.9 }, 0.62)
          .from('.hero__actions', { opacity: 0, y: 14, duration: 0.9 }, 0.76)
          .from('.hero-contact-card', { opacity: 0, y: 20, duration: 0.9 }, 0.9)
          .from('.hero__scroll-cue', { opacity: 0, duration: 0.7 }, 1.1)
      })

      // Pointer micro-parallax + magnetic CTAs — fine pointers only, and
      // never under reduced motion. The video layer is deliberately left
      // out: no camera motion, no drifting media.
      mm.add(
        '(prefers-reduced-motion: no-preference) and (hover: hover) and (pointer: fine)',
        () => {
          const copy = section.querySelector<HTMLElement>('.hero__copy')
          const card = section.querySelector<HTMLElement>('.hero-contact-card')
          const magnets = gsap.utils.toArray<HTMLElement>(
            section.querySelectorAll('[data-magnetic]'),
          )

          const copyX = copy && gsap.quickTo(copy, 'x', { duration: 1.1, ease: 'power3.out' })
          const copyY = copy && gsap.quickTo(copy, 'y', { duration: 1.1, ease: 'power3.out' })
          const cardX = card && gsap.quickTo(card, 'x', { duration: 1.4, ease: 'power3.out' })
          const cardY = card && gsap.quickTo(card, 'y', { duration: 1.4, ease: 'power3.out' })

          const magnetSetters = magnets.map((el) => ({
            el,
            x: gsap.quickTo(el, 'x', { duration: 0.4, ease: 'power3.out' }),
            y: gsap.quickTo(el, 'y', { duration: 0.4, ease: 'power3.out' }),
          }))

          const handleMove = (event: PointerEvent) => {
            const rect = section.getBoundingClientRect()
            const nx = (event.clientX - rect.left) / rect.width - 0.5
            const ny = (event.clientY - rect.top) / rect.height - 0.5

            copyX?.(nx * -PARALLAX_COPY)
            copyY?.(ny * -PARALLAX_COPY)
            cardX?.(nx * PARALLAX_CARD)
            cardY?.(ny * PARALLAX_CARD)

            for (const magnet of magnetSetters) {
              const box = magnet.el.getBoundingClientRect()
              const cx = box.left + box.width / 2
              const cy = box.top + box.height / 2
              const dx = event.clientX - cx
              const dy = event.clientY - cy
              const distance = Math.hypot(dx, dy)

              if (distance < MAGNET_RADIUS) {
                const strength = 1 - distance / MAGNET_RADIUS
                magnet.x((dx / MAGNET_RADIUS) * MAGNET_PULL * strength * 10)
                magnet.y((dy / MAGNET_RADIUS) * MAGNET_PULL * strength * 10)
              } else {
                magnet.x(0)
                magnet.y(0)
              }
            }
          }

          const handleLeave = () => {
            copyX?.(0)
            copyY?.(0)
            cardX?.(0)
            cardY?.(0)
            magnetSetters.forEach((magnet) => {
              magnet.x(0)
              magnet.y(0)
            })
          }

          section.addEventListener('pointermove', handleMove)
          section.addEventListener('pointerleave', handleLeave)

          return () => {
            section.removeEventListener('pointermove', handleMove)
            section.removeEventListener('pointerleave', handleLeave)
          }
        },
      )

      return () => mm.revert()
    },
    { scope: sectionRef, dependencies: [posterOnly], revertOnUpdate: true },
  )

  return (
    <section id="top" className="hero" ref={sectionRef}>
      <HeroMedia posterOnly={posterOnly} />
      {!posterOnly && <PointerLight />}
      {!posterOnly && <HeroRipples sectionRef={sectionRef} />}

      <HeroContent />
      <HeroScrollCue />
    </section>
  )
}
