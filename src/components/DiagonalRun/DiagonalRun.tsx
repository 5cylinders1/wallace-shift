import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import './DiagonalRun.css'

/** Used only if the CSS custom property cannot be read for any reason. */
const DIAGONAL_RISE_FALLBACK = 28

/**
 * The bone-to-ink wedge, and the car racing down it.
 *
 * This is the beat that follows the pit stop: the car leaves the lane, then
 * runs down the hill into the dark section below. It closes both the
 * homepage's approach section and the standards section on `/approach`, so
 * the geometry and the car's path live here once rather than in each.
 *
 * The host section must set `overflow: hidden` and end with this element —
 * see the note in DiagonalRun.css about the clipped bottom reserve.
 */
export function DiagonalRun() {
  const rootRef = useRef<HTMLDivElement>(null)
  const carRef = useRef<HTMLImageElement>(null)
  const reducedMotion = useReducedMotion()

  useGSAP(
    () => {
      const diagonal = rootRef.current
      if (!diagonal || reducedMotion) return

      // The rise distance comes from the same custom property that sizes
      // the band's clipped bottom buffer, so the two can never drift apart
      // — a rise bigger than that buffer would uncover the section's own
      // background instead of staying seamlessly black.
      const diagStyle = getComputedStyle(diagonal)
      const rise =
        parseFloat(diagStyle.getPropertyValue('--diag-rise')) ||
        DIAGONAL_RISE_FALLBACK

      const exitTrigger = ScrollTrigger.create({
        trigger: diagonal,
        start: 'top 85%',
        end: 'top 35%',
        scrub: 0.6,
        // Last to refresh: this element's position depends on any pinned
        // section above it having already reserved its scroll distance.
        refreshPriority: -1,
        animation: gsap.fromTo(diagonal, { y: 0 }, { y: -rise, ease: 'none' }),
      })

      // The car races along the same slope as the diagonal itself — its
      // start/end `top` values come from the exact `--diag-right` /
      // `--diag-left` percentages the clip-path uses, read from the same
      // element, so the car's path can never drift from the hill it is
      // supposedly racing down.
      const car = carRef.current
      let carTrigger: ScrollTrigger | undefined

      if (car) {
        const right = parseFloat(diagStyle.getPropertyValue('--diag-right')) || 8
        const left = parseFloat(diagStyle.getPropertyValue('--diag-left')) || 95

        // Tilted to the hill's actual rendered slope rather than a guessed
        // constant, so the angle stays correct at any viewport width.
        const rect = diagonal.getBoundingClientRect()
        const riseFraction = (left - right) / 100
        const tiltDeg =
          -Math.atan2(riseFraction * rect.height, rect.width) * (180 / Math.PI)

        // The car travels past both screen edges so it fully enters and
        // exits off-frame, but `top` at those off-screen X positions must
        // be the same line extrapolated — not reused from the 0%/100%
        // endpoints — or the car cuts the corner and drifts off the hill
        // exactly where it is most visible. `lineTopAt` is the clip-path's
        // own line equation extended to any x.
        const startX = 115
        const endX = -30
        const lineTopAt = (x: number) => left + ((right - left) * x) / 100

        gsap.set(car, {
          left: `${startX}%`,
          top: `${lineTopAt(startX)}%`,
          rotation: tiltDeg,
        })

        carTrigger = ScrollTrigger.create({
          trigger: diagonal,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
          refreshPriority: -1,
          animation: gsap.to(car, {
            left: `${endX}%`,
            top: `${lineTopAt(endX)}%`,
            ease: 'none',
          }),
        })
      }

      return () => {
        exitTrigger.kill()
        carTrigger?.kill()
      }
    },
    { scope: rootRef, dependencies: [reducedMotion] },
  )

  return (
    <div className="diagonal-run" ref={rootRef} aria-hidden="true">
      <div className="diagonal-run__plane" />
      <div className="diagonal-run__edge" />
      {/* Purely decorative and entirely motion-driven — under reduced
       * motion there is no sensible static position for a racing car, so
       * it is simply not rendered rather than shown frozen mid-flight. */}
      {!reducedMotion && (
        <img
          className="diagonal-run__car"
          src="/media/generated/car-ember.webp"
          alt=""
          ref={carRef}
        />
      )}
    </div>
  )
}
