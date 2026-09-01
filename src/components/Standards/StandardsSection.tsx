import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { standards } from '../../content/siteConfig'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { StandardPrinciple } from './StandardPrinciple'
import './StandardsSection.css'

// Fallback only — the real value is read from the `.standards__diagonal`
// element's own `--diag-rise` custom property (StandardsSection.css), the
// same one that sizes the band's clipped bottom buffer, so the JS translate
// distance and the CSS reserve that absorbs it can never drift apart.
const DIAGONAL_RISE_FALLBACK = 28

export function StandardsSection() {
  const reducedMotion = useReducedMotion()
  const sectionRef = useRef<HTMLElement>(null)
  const eyebrowRef = useRef<HTMLParagraphElement>(null)
  const headlineRef = useRef<HTMLHeadingElement>(null)
  const principleRefs = useRef<(HTMLLIElement | null)[]>([])
  const diagonalRef = useRef<HTMLDivElement>(null)
  const carRef = useRef<HTMLImageElement>(null)

  useGSAP(
    () => {
      const section = sectionRef.current
      const eyebrow = eyebrowRef.current
      const headline = headlineRef.current
      const diagonal = diagonalRef.current
      const rows = principleRefs.current.filter((row): row is HTMLLIElement => !!row)

      if (!section || !eyebrow || !headline || !diagonal || rows.length === 0) return

      const rules = rows.map((row) => row.querySelector<HTMLElement>('.standard-principle__rule'))
      const copyGroups = rows.map((row) =>
        row.querySelectorAll<HTMLElement>('.standard-principle__number, .standard-principle__title, .standard-principle__description'),
      )

      if (reducedMotion) {
        // Static, fully visible layout — CSS defaults already show
        // everything without JS, so reduced motion just skips creating
        // any timeline or ScrollTrigger at all (including the diagonal's
        // scroll-linked rise).
        return
      }

      gsap.set(eyebrow, { opacity: 0 })
      gsap.set(headline, { opacity: 0, y: 22 })
      gsap.set(rules, { scaleX: 0, transformOrigin: 'left center' })
      copyGroups.forEach((group) => gsap.set(group, { opacity: 0, y: 12 }))

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: 'top 80%',
          toggleActions: 'play none none none',
        },
        defaults: { ease: 'power2.out' },
      })

      tl.to(eyebrow, { opacity: 1, duration: 0.35 }, 0)
      tl.to(headline, { opacity: 1, y: 0, duration: 0.65 }, 0.08)

      rows.forEach((_row, i) => {
        const start = 0.28 + i * 0.1
        tl.to(rules[i], { scaleX: 1, duration: 0.5 }, start)
        tl.to(copyGroups[i], { opacity: 1, y: 0, duration: 0.5, stagger: 0.03 }, start + 0.05)
      })

      // A short, restrained scrub — not a pin, not a long sequence — that
      // lets the diagonal (plane + silver edge, moving together as one
      // element) drift up slightly as the visitor nears the section below.
      // The rise distance comes from the CSS custom property that also
      // sizes the band's clipped bottom buffer (StandardsSection.css), so
      // the two can never drift apart — a rise bigger than that buffer
      // would uncover the section's own background instead of staying
      // seamlessly black.
      const diagStyle = getComputedStyle(diagonal)
      const diagonalRise = parseFloat(diagStyle.getPropertyValue('--diag-rise')) || DIAGONAL_RISE_FALLBACK

      const exitTrigger = ScrollTrigger.create({
        trigger: diagonal,
        start: 'top 85%',
        end: 'top 35%',
        scrub: 0.6,
        animation: gsap.fromTo(diagonal, { y: 0 }, { y: -diagonalRise, ease: 'none' }),
      })

      // The car races along the same slope as the diagonal itself — its
      // start/end `top` values are the exact `--diag-right`/`--diag-left`
      // percentages the clip-path uses, read from the same element, so the
      // car's path can never drift from the hill it's supposedly racing
      // down. Runs for as long as the diagonal is anywhere in the
      // viewport, so it crosses the screen for the full "scrolling past"
      // gesture rather than a fixed, speed-independent duration.
      const car = carRef.current
      let carTrigger: ScrollTrigger | undefined
      if (car) {
        const diagRightPercent = parseFloat(diagStyle.getPropertyValue('--diag-right')) || 8
        const diagLeftPercent = parseFloat(diagStyle.getPropertyValue('--diag-left')) || 95

        // Tilted to match the hill's actual rendered slope (not a guessed
        // constant): computed from the same two percentages above and the
        // band's own current pixel size, so the car's angle stays correct
        // at any viewport width instead of drifting from the real line.
        const diagRect = diagonal.getBoundingClientRect()
        const riseFraction = (diagLeftPercent - diagRightPercent) / 100
        const tiltDeg = -Math.atan2(riseFraction * diagRect.height, diagRect.width) * (180 / Math.PI)

        // The car travels well past both screen edges (so it fully enters
        // and exits off-frame), but `top` at those off-screen X positions
        // must be the *same line, extrapolated* — not just reused from the
        // 0%/100% endpoints — or the car cuts the corner and drifts off
        // the hill's surface exactly where it's most visible, right as it
        // enters and just before it leaves. `lineTopAt` is the clip-path's
        // own line equation (the two points above, extended to any x), so
        // wherever the car is on screen, it sits exactly on that line.
        const leftStart = 115
        const leftEnd = -30
        const lineTopAt = (xPercent: number) =>
          diagLeftPercent + ((diagRightPercent - diagLeftPercent) * xPercent) / 100

        gsap.set(car, { left: `${leftStart}%`, top: `${lineTopAt(leftStart)}%`, rotation: tiltDeg })

        carTrigger = ScrollTrigger.create({
          trigger: diagonal,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
          animation: gsap.to(car, { left: `${leftEnd}%`, top: `${lineTopAt(leftEnd)}%`, ease: 'none' }),
        })
      }

      return () => {
        exitTrigger.kill()
        carTrigger?.kill()
      }
    },
    { scope: sectionRef, dependencies: [reducedMotion] },
  )

  return (
    <section id="about" className="standards" ref={sectionRef}>
      <div className="container standards__grid">
        <div className="standards__intro">
          <p className="eyebrow standards__eyebrow" ref={eyebrowRef}>
            {standards.eyebrow}
          </p>
          <h2 className="standards__headline" ref={headlineRef}>
            {standards.headline}
          </h2>
        </div>

        <ol className="standards__list">
          {standards.principles.map((item, index) => (
            <StandardPrinciple
              key={item.number}
              item={item}
              ref={(el) => {
                principleRefs.current[index] = el
              }}
            />
          ))}
        </ol>
      </div>

      <div className="standards__diagonal" ref={diagonalRef} aria-hidden="true">
        <div className="standards__diagonal-plane" />
        <div className="standards__diagonal-edge" />
        {/* Purely decorative and entirely motion-driven — under reduced
         * motion there's no sensible static position for a "racing" car,
         * so it's simply not rendered rather than shown frozen mid-flight. */}
        {!reducedMotion && (
          <img className="standards__car" src="/media/generated/car-ember.webp" alt="" ref={carRef} />
        )}
      </div>
    </section>
  )
}
