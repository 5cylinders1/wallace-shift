import { useRef, useState } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { approach } from '../../content/siteConfig'
import { renderLines } from '../../lib/textLines'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { PageLink } from '../PageLink/PageLink'
import { Reveal } from '../Reveal/Reveal'
import { DiagonalRun } from '../DiagonalRun/DiagonalRun'
import { ApproachTrack } from './ApproachTrack'
import {
  HUB,
  TIMELINE,
  TIRE_TREAD_PERCENT,
  TIRE_KEYS,
  TIRE_TRAVEL_Y_PERCENT,
  isUpperTire,
  type TireKey,
} from '../Approach/pitStopGeometry'
import './ApproachSummary.css'

/** Fraction of the car's own width it sits off each end of the lane. */
const OFFSCREEN_MARGIN = 1.15
/** Pinned scroll distance on mobile, as a multiple of viewport height. */
const MOBILE_PIN_VH = 2.4

/**
 * The homepage's view of the process.
 *
 * Two shapes, one timeline vocabulary:
 *
 * - Mobile pins a viewport-tall stage. One step card is on screen at a
 *   time and the car lane is locked to the bottom of the screen, so the
 *   sequence is legible on a short phone without the visitor having to
 *   catch a car that has already left. Cards cross-fade as the pit stop
 *   advances, and the car lays tire marks on the way out.
 * - Desktop keeps the three cards side by side with the lane above them,
 *   scrubbed but never pinned — there is room for both there.
 *
 * The pin is deliberate on mobile, against the general rule of keeping
 * small screens off pinned scrolls: the beats are unreadable otherwise,
 * which is the problem this replaced.
 */
export function ApproachSummary() {
  const sectionRef = useRef<HTMLElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const carRef = useRef<HTMLDivElement>(null)
  const lightRef = useRef<HTMLSpanElement>(null)
  const markUpperRef = useRef<HTMLSpanElement>(null)
  const markLowerRef = useRef<HTMLSpanElement>(null)
  const cardRefs = useRef<(HTMLLIElement | null)[]>([])

  const chassisRef = useRef<HTMLImageElement>(null)
  const frontUpperMountedRef = useRef<HTMLImageElement>(null)
  const frontLowerMountedRef = useRef<HTMLImageElement>(null)
  const rearUpperMountedRef = useRef<HTMLImageElement>(null)
  const rearLowerMountedRef = useRef<HTMLImageElement>(null)
  const frontUpperReplacementRef = useRef<HTMLImageElement>(null)
  const frontLowerReplacementRef = useRef<HTMLImageElement>(null)
  const rearUpperReplacementRef = useRef<HTMLImageElement>(null)
  const rearLowerReplacementRef = useRef<HTMLImageElement>(null)

  // Lookup objects for the GSAP effect only — never read during render,
  // per the project's react-hooks/refs rule (see PitStopCar).
  const mountedRefs: Record<TireKey, typeof frontUpperMountedRef> = {
    frontUpper: frontUpperMountedRef,
    frontLower: frontLowerMountedRef,
    rearUpper: rearUpperMountedRef,
    rearLower: rearLowerMountedRef,
  }
  const replacementRefs: Record<TireKey, typeof frontUpperReplacementRef> = {
    frontUpper: frontUpperReplacementRef,
    frontLower: frontLowerReplacementRef,
    rearUpper: rearUpperReplacementRef,
    rearLower: rearLowerReplacementRef,
  }

  const reducedMotion = useReducedMotion()
  const isMobile = useMediaQuery('(max-width: 767px)')
  // Which step the car has reached. Written at most twice across the whole
  // sequence — the car itself is animated by GSAP, never by React state.
  const [activeStep, setActiveStep] = useState(0)

  useGSAP(
    () => {
      if (reducedMotion) return

      const section = sectionRef.current
      const lane = trackRef.current
      const car = carRef.current
      const light = lightRef.current
      const marks = [markUpperRef.current, markLowerRef.current]
      const mounted = TIRE_KEYS.map((key) => mountedRefs[key].current)
      const replacements = TIRE_KEYS.map((key) => replacementRefs[key].current)

      if (
        !section ||
        !lane ||
        !car ||
        !light ||
        marks.some((el) => !el) ||
        mounted.some((el) => !el) ||
        replacements.some((el) => !el)
      ) {
        return
      }

      const offsets = TIRE_KEYS.map(
        (key) => (isUpperTire(key) ? -1 : 1) * TIRE_TRAVEL_Y_PERCENT,
      )

      // Function-based so a resize recomputes them rather than keeping
      // pixel values measured at the width the page happened to load at.
      const startX = () => -car.offsetWidth * OFFSCREEN_MARGIN
      const stopX = () => (lane.offsetWidth - car.offsetWidth) / 2
      const exitX = () => lane.offsetWidth * OFFSCREEN_MARGIN

      // Marks are never tweened on their own ease — they are derived from
      // the car's live position every update, so a mark can only trail the
      // wheel that laid it down, never run ahead of it. They keep growing
      // to the screen edge as the car leaves.
      //
      // Their vertical position and thickness come from the car's own
      // rendered box, not the lane's: the hub and tread percentages are
      // fractions of the car canvas, and the car occupies only part of the
      // lane's height. Measuring against the lane put the marks well away
      // from the tires and left them hairline-thin.
      const rearWheelOffset = () => car.offsetWidth * (HUB.rearXPercent / 100)
      const updateMarks = () => {
        const carH = car.offsetHeight
        const carTop = (lane.offsetHeight - carH) / 2
        const tread = Math.max(2, carH * (TIRE_TREAD_PERCENT / 100))

        const x = gsap.getProperty(car, 'x') as number
        const from = stopX() + rearWheelOffset()
        const travelled = Math.max(0, x - stopX())
        const width = Math.min(travelled, lane.offsetWidth - from)

        const place = (
          el: HTMLSpanElement | null,
          hubYPercent: number,
        ) => {
          if (!el) return
          gsap.set(el, {
            left: from,
            width,
            height: tread,
            top: carTop + carH * (hubYPercent / 100) - tread / 2,
          })
        }

        place(markUpperRef.current, HUB.upperYPercent)
        place(markLowerRef.current, HUB.lowerYPercent)
      }

      gsap.set(mounted, { opacity: 1, yPercent: 0 })
      replacements.forEach((tire, i) => {
        gsap.set(tire, { opacity: 0, yPercent: offsets[i] })
      })
      gsap.set(light, { backgroundColor: 'var(--color-ink)' })
      gsap.set(marks, { width: 0 })
      gsap.set(car, { x: startX })

      const { enterEnd, shootOffEnd, shootOnEnd, releaseAt } = TIMELINE
      const stage = stageRef.current

      const tl = gsap.timeline({
        scrollTrigger: isMobile
          ? {
              trigger: section,
              // Pinned: the lane holds at the bottom of the screen while
              // the cards change over, so every beat is actually seen.
              pin: stage ?? section,
              start: 'top top',
              end: () => `+=${Math.round(window.innerHeight * MOBILE_PIN_VH)}`,
              scrub: 0.35,
              invalidateOnRefresh: true,
              // This pin adds ~2 viewports of document height, and the
              // diagonal below it is a child component whose effect runs
              // first — so without this its trigger positions are computed
              // against a document that has not grown yet, and the hill run
              // finishes off-screen before the visitor ever reaches it.
              // Higher priority refreshes earlier.
              refreshPriority: 1,
              onUpdate: (self) => {
                const p = self.progress
                setActiveStep(p < enterEnd ? 0 : p < releaseAt ? 1 : 2)
              },
            }
          : {
              trigger: section,
              start: 'top 78%',
              end: 'bottom 32%',
              scrub: 0.4,
              invalidateOnRefresh: true,
              onUpdate: (self) => {
                const p = self.progress
                setActiveStep(p < enterEnd ? 0 : p < releaseAt ? 1 : 2)
              },
            },
        defaults: { ease: 'none' },
        onUpdate: updateMarks,
      })

      tl.to(car, { x: stopX, duration: enterEnd, ease: 'power2.out' }, 0)
        .to(
          mounted,
          {
            yPercent: (i: number) => offsets[i],
            opacity: 0,
            duration: shootOffEnd - enterEnd,
            ease: 'power4.in',
            stagger: 0.02,
          },
          enterEnd,
        )
        .to(
          replacements,
          {
            yPercent: 0,
            opacity: 1,
            duration: shootOnEnd - shootOffEnd,
            ease: 'back.out(1.8)',
            stagger: 0.02,
          },
          shootOffEnd,
        )
        .to(
          light,
          { backgroundColor: 'var(--color-ember)', duration: 0.02 },
          releaseAt,
        )
        .to(
          car,
          { x: exitX, duration: 1 - releaseAt, ease: 'power4.in' },
          releaseAt,
        )

      const handleResize = () => ScrollTrigger.refresh()
      window.addEventListener('resize', handleResize)
      return () => window.removeEventListener('resize', handleResize)
    },
    { scope: sectionRef, dependencies: [reducedMotion, isMobile] },
  )

  const track = (
    <ApproachTrack
      trackRef={trackRef}
      carRef={carRef}
      lightRef={lightRef}
      markUpperRef={markUpperRef}
      markLowerRef={markLowerRef}
      chassisRef={chassisRef}
      frontUpperMountedRef={frontUpperMountedRef}
      frontLowerMountedRef={frontLowerMountedRef}
      rearUpperMountedRef={rearUpperMountedRef}
      rearLowerMountedRef={rearLowerMountedRef}
      frontUpperReplacementRef={frontUpperReplacementRef}
      frontLowerReplacementRef={frontLowerReplacementRef}
      rearUpperReplacementRef={rearUpperReplacementRef}
      rearLowerReplacementRef={rearLowerReplacementRef}
    />
  )

  const cards = approach.steps.map((step, index) => (
    <li
      className={`approach-summary__step${
        index === activeStep ? ' approach-summary__step--active' : ''
      }`}
      key={step.index}
      ref={(el) => {
        cardRefs.current[index] = el
      }}
    >
      <span className="approach-summary__index">{step.index}</span>
      <h3 className="approach-summary__title">{step.title}</h3>
      <p className="approach-summary__body">{step.description}</p>
    </li>
  ))

  const head = (
    <div className="approach-summary__head">
      <Reveal>
        <h2 className="approach-summary__heading">
          {renderLines(approach.headingLines)}
        </h2>
      </Reveal>
      <Reveal delay={0.08}>
        <PageLink href="/approach" className="approach-summary__link">
          How the work runs
          <span aria-hidden="true">&#8599;</span>
        </PageLink>
      </Reveal>
    </div>
  )

  return (
    <section id="approach-summary" className="approach-summary" ref={sectionRef}>
      {isMobile && !reducedMotion ? (
        // Pinned stage: one card at a time, lane locked to the bottom of
        // the screen. Sized in svh so every phone gets the same shape.
        <div className="container approach-summary__stage" ref={stageRef}>
          {head}

          {/* Progress across the three beats. With one card on screen at a
              time, this is the only thing telling a visitor how many there
              are and where they have got to. */}
          <ol className="approach-summary__rail" aria-hidden="true">
            {approach.steps.map((step, index) => (
              <li
                className={`approach-summary__rail-seg${
                  index <= activeStep ? ' approach-summary__rail-seg--done' : ''
                }`}
                key={step.index}
              >
                <span>{step.index}</span>
              </li>
            ))}
          </ol>

          <div className="approach-summary__cards">
            {/* The stage number at editorial scale, bone on bone. Fills the
                space a single card leaves behind and carries the count at a
                glance. */}
            <span className="approach-summary__ghost" aria-hidden="true">
              {approach.steps[activeStep]?.index}
            </span>
            <ol className="approach-summary__steps approach-summary__steps--stacked">
              {cards}
            </ol>
          </div>

          {track}
        </div>
      ) : (
        <div className="container">
          {head}
          {!reducedMotion && track}
          <ol className="approach-summary__steps">{cards}</ol>
        </div>
      )}

      {/* The car leaves the lane and runs down the hill into the dark
          section below — the pit stop's own exit, not a separate flourish. */}
      <DiagonalRun />
    </section>
  )
}
