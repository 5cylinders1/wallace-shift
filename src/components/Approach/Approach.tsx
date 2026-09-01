import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { approach } from '../../content/siteConfig'
import { renderLines } from '../../lib/textLines'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { Reveal } from '../Reveal/Reveal'
import { PitStopScene, PEEL_MARK_LENGTH } from './PitStopScene'
import { MobilePitScene } from './MobilePitScene'
import { PitStopCarStatic } from './PitStopCar'
import {
  CAR_ENTER_X_PERCENT,
  CAR_EXIT_X_PERCENT,
  STAGE_VIEW_W,
  TIMELINE,
  TIRE_KEYS,
  TIRE_TRAVEL_Y_PERCENT,
  isUpperTire,
  type TireKey,
} from './pitStopGeometry'
import './Approach.css'

const ACTIVE_OPACITY = 1
const COMPLETED_TITLE_OPACITY = 0.55
const COMPLETED_DESC_OPACITY = 0.45

export function Approach() {
  const reducedMotion = useReducedMotion()
  const isMobile = useMediaQuery('(max-width: 767px)')
  const sectionRef = useRef<HTMLElement>(null)
  const titleRefs = useRef<(HTMLHeadingElement | null)[]>([])
  const descRefs = useRef<(HTMLParagraphElement | null)[]>([])

  const carTravelRef = useRef<HTMLDivElement>(null)
  const chassisRef = useRef<HTMLImageElement>(null)
  const frontUpperMountedRef = useRef<HTMLImageElement>(null)
  const frontLowerMountedRef = useRef<HTMLImageElement>(null)
  const rearUpperMountedRef = useRef<HTMLImageElement>(null)
  const rearLowerMountedRef = useRef<HTMLImageElement>(null)
  const frontUpperReplacementRef = useRef<HTMLImageElement>(null)
  const frontLowerReplacementRef = useRef<HTMLImageElement>(null)
  const rearUpperReplacementRef = useRef<HTMLImageElement>(null)
  const rearLowerReplacementRef = useRef<HTMLImageElement>(null)

  const releaseIndicatorRef = useRef<SVGCircleElement>(null)
  const rearUpperPeelRef = useRef<SVGRectElement>(null)
  const rearLowerPeelRef = useRef<SVGRectElement>(null)

  // Plain lookup objects for the GSAP effect's own convenience (they're
  // never passed to a JSX `ref=` attribute — each ref reaches its element
  // through its own individually-named prop instead, per the project's
  // react-hooks/refs lint rule).
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
  // Matches PitStopScene's PEEL_MARK_POSITIONS order: rearUpper, rearLower.
  const peelMarkRefs = [rearUpperPeelRef, rearLowerPeelRef]

  useGSAP(
    () => {
      if (reducedMotion || isMobile) return

      const section = sectionRef.current
      const carTravel = carTravelRef.current
      const chassis = chassisRef.current
      const releaseIndicator = releaseIndicatorRef.current
      const titles = titleRefs.current.filter((el): el is HTMLHeadingElement => !!el)
      const descs = descRefs.current.filter((el): el is HTMLParagraphElement => !!el)
      const mountedTires = TIRE_KEYS.map((key) => mountedRefs[key].current)
      const replacementTires = TIRE_KEYS.map((key) => replacementRefs[key].current)
      const peelMarks = peelMarkRefs.map((ref) => ref.current)

      if (
        !section ||
        !carTravel ||
        !chassis ||
        !releaseIndicator ||
        titles.length === 0 ||
        descs.length === 0 ||
        mountedTires.some((el) => !el) ||
        replacementTires.some((el) => !el) ||
        peelMarks.some((el) => !el)
      ) {
        return
      }

      // Initial state — car staged off-screen left, replacement tires
      // parked beside their hub (invisible), mounted tires on their hubs,
      // release indicator closed (car still to be serviced), no peel marks
      // laid down yet.
      gsap.set(carTravel, { xPercent: CAR_ENTER_X_PERCENT })
      gsap.set(mountedTires, { opacity: 1, yPercent: 0 })
      TIRE_KEYS.forEach((key, i) => {
        const sign = isUpperTire(key) ? -1 : 1
        gsap.set(replacementTires[i], { opacity: 0, yPercent: sign * TIRE_TRAVEL_Y_PERCENT })
      })
      gsap.set(releaseIndicator, { attr: { fill: 'var(--color-ink)' } })

      // Peel marks are never tweened on their own timeline/ease — they're
      // driven directly off the car's own live position every update, so a
      // mark can only ever trail the rear wheel that laid it down, never
      // extend ahead of (or independently of) where the car actually is.
      // `xPercent` on the travel wrapper is a fraction of the wrapper's own
      // width, which is exactly the stage width, so this converts cleanly
      // to absolute stage units; clamping at 0 keeps marks off during
      // entry (`xPercent` is negative then) and at PEEL_MARK_LENGTH keeps
      // a mark from growing forever once the car has moved on.
      const updatePeelMarks = () => {
        const xPercent = gsap.getProperty(carTravel, 'xPercent') as number
        const displacement = Math.max(0, (xPercent / 100) * STAGE_VIEW_W)
        const width = Math.min(displacement, PEEL_MARK_LENGTH)
        gsap.set(peelMarks, { attr: { width } })
      }
      updatePeelMarks()

      // Chrome sometimes leaves the scene's absolutely-positioned layers
      // (markings, the car track) resolving their percentage position
      // against a stale containing-block rect once the section's pin
      // engages — each reports a correct bounding box in isolation via
      // getBoundingClientRect(), yet paints at the wrong position (or not
      // at all) until something forces a fresh layout pass. It isn't a
      // one-time glitch at pin-entry, and it isn't reliably tied to GSAP's
      // own scrub ticks either (it can appear once scrolling has already
      // stopped) — so this runs as its own requestAnimationFrame loop,
      // independent of the timeline, gated to only run while the section
      // is actually in view: a cheap getBoundingClientRect() comparison
      // every frame, and only the expensive corrective reflow (a display
      // toggle) when it actually finds a mismatch.
      const scene = section.querySelector('.pit-stop-scene')
      const layeredEls = [
        section.querySelector('.pit-stop-scene__markings'),
        section.querySelector('.pit-stop-scene__car-travel'),
      ].filter((el): el is Element => !!el)
      const forceSceneReflow = () => {
        layeredEls.forEach((el) => {
          const display = (el as HTMLElement).style.display
          ;(el as HTMLElement).style.display = 'none'
          void (el as HTMLElement).offsetHeight
          ;(el as HTMLElement).style.display = display
        })
      }
      const checkSceneAlignment = () => {
        if (!scene || layeredEls.length === 0) return
        const sceneTop = scene.getBoundingClientRect().top
        const stale = layeredEls.some((el) => Math.abs(el.getBoundingClientRect().top - sceneTop) > 0.5)
        if (stale) forceSceneReflow()
      }

      let watchdogId = 0
      let watchdogActive = false
      const watchdogTick = () => {
        checkSceneAlignment()
        if (watchdogActive) watchdogId = requestAnimationFrame(watchdogTick)
      }
      const watchdogObserver = new IntersectionObserver(([entry]) => {
        watchdogActive = entry.isIntersecting
        if (watchdogActive) {
          watchdogId = requestAnimationFrame(watchdogTick)
        } else {
          cancelAnimationFrame(watchdogId)
        }
      })
      watchdogObserver.observe(section)

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          pin: section,
          start: 'top top',
          end: () => `+=${Math.round(window.innerHeight * 1.55)}`,
          scrub: 0.35,
          invalidateOnRefresh: true,
          onRefresh: forceSceneReflow,
          onEnter: forceSceneReflow,
          onEnterBack: forceSceneReflow,
        },
        defaults: { ease: 'none' },
        onUpdate: updatePeelMarks,
      })

      const { enterEnd, shootOffEnd, shootOnEnd, releaseAt } = TIMELINE

      // 1. The car enters alone and stops precisely in the pit box — one
      // rigid translation, never scaled or stretched.
      tl.to(carTravel, { xPercent: 0, duration: enterEnd, ease: 'power2.out' }, 0)

      // Step 1 settles, Step 2 becomes active.
      tl.to(titles[0], { opacity: COMPLETED_TITLE_OPACITY, scale: 1, duration: 0.03, ease: 'power1.in' }, enterEnd + 0.02)
      tl.to(descs[0], { opacity: COMPLETED_DESC_OPACITY, duration: 0.03, ease: 'power1.in' }, enterEnd + 0.02)
      tl.fromTo(
        titles[1],
        { y: 10 },
        { opacity: ACTIVE_OPACITY, y: 0, scale: 1.06, duration: 0.04, ease: 'power2.out' },
        enterEnd + 0.04,
      )
      tl.fromTo(
        descs[1],
        { y: 10 },
        { opacity: ACTIVE_OPACITY, y: 0, duration: 0.04, ease: 'power2.out' },
        enterEnd + 0.04,
      )

      // 2. Old wheels shoot off — all four at once, a hard snap rather than
      // a carried exit. The chassis itself never moves during this window.
      tl.to(
        mountedTires,
        {
          yPercent: (i) => (isUpperTire(TIRE_KEYS[i]) ? -1 : 1) * TIRE_TRAVEL_Y_PERCENT,
          opacity: 0,
          duration: shootOffEnd - enterEnd,
          ease: 'power4.in',
          stagger: 0.015,
        },
        enterEnd,
      )

      // 3. Fresh wheels shoot on and snap onto the hub with a touch of
      // overshoot, like they've just been racked into place.
      tl.to(
        replacementTires,
        {
          yPercent: 0,
          opacity: 1,
          duration: shootOnEnd - shootOffEnd,
          ease: 'back.out(1.8)',
          stagger: 0.015,
        },
        shootOffEnd,
      )

      // Step 2 -> Step 3.
      tl.to(titles[1], { opacity: COMPLETED_TITLE_OPACITY, scale: 1, duration: 0.03, ease: 'power1.in' }, releaseAt - 0.03)
      tl.to(descs[1], { opacity: COMPLETED_DESC_OPACITY, duration: 0.03, ease: 'power1.in' }, releaseAt - 0.03)
      tl.fromTo(
        titles[2],
        { y: 10 },
        { opacity: ACTIVE_OPACITY, y: 0, scale: 1.06, duration: 0.04, ease: 'power2.out' },
        releaseAt,
      )
      tl.fromTo(
        descs[2],
        { y: 10 },
        { opacity: ACTIVE_OPACITY, y: 0, duration: 0.04, ease: 'power2.out' },
        releaseAt,
      )

      // 4. Release light flips to ember — the "go" signal — and the car
      // launches away hard. `updatePeelMarks` (wired as the timeline's
      // onUpdate) lays a mark behind each rear wheel automatically as this
      // tween moves the car.
      tl.to(
        releaseIndicator,
        { attr: { fill: 'var(--color-ember)', stroke: 'var(--color-ember)' }, duration: 0.02, ease: 'none' },
        releaseAt,
      )
      const exitDuration = 1 - releaseAt
      tl.to(carTravel, { xPercent: CAR_EXIT_X_PERCENT, duration: exitDuration, ease: 'power4.in' }, releaseAt)

      if (document.fonts && 'ready' in document.fonts) {
        document.fonts.ready.then(() => ScrollTrigger.refresh())
      }

      const handleResize = () => ScrollTrigger.refresh()
      window.addEventListener('resize', handleResize)

      return () => {
        window.removeEventListener('resize', handleResize)
        watchdogObserver.disconnect()
        cancelAnimationFrame(watchdogId)
      }
    },
    { scope: sectionRef, dependencies: [reducedMotion, isMobile] },
  )

  if (reducedMotion) {
    return (
      <section id="approach" className="approach approach--static">
        <div className="container approach__head">
          <h2 className="approach__heading">
            {renderLines(approach.headingLines)}
          </h2>
        </div>

        <div className="container approach__static-car">
          <PitStopCarStatic />
        </div>

        <div className="container approach__steps">
          {approach.steps.map((step) => (
            <div className="approach-step approach-step--static" key={step.index}>
              <span className="approach-step__index">{step.index}</span>
              <h3 className="approach-step__title">{step.title}</h3>
              <p className="approach-step__description">{step.description}</p>
            </div>
          ))}
        </div>
      </section>
    )
  }

  return (
    <section id="approach" className="approach" ref={sectionRef}>
      <div className="container approach__head">
        <Reveal>
          <h2 className="approach__heading">
            {renderLines(approach.headingLines)}
          </h2>
        </Reveal>
      </div>

      {!isMobile && (
        <div className="approach__scene-wrap">
          <PitStopScene
            carTravelRef={carTravelRef}
            chassisRef={chassisRef}
            frontUpperMountedRef={frontUpperMountedRef}
            frontLowerMountedRef={frontLowerMountedRef}
            rearUpperMountedRef={rearUpperMountedRef}
            rearLowerMountedRef={rearLowerMountedRef}
            frontUpperReplacementRef={frontUpperReplacementRef}
            frontLowerReplacementRef={frontLowerReplacementRef}
            rearUpperReplacementRef={rearUpperReplacementRef}
            rearLowerReplacementRef={rearLowerReplacementRef}
            releaseIndicatorRef={releaseIndicatorRef}
            peelMarkRefs={peelMarkRefs}
          />
        </div>
      )}

      <div className="container approach__steps">
        {approach.steps.map((step, index) => {
          const isLast = index === approach.steps.length - 1
          const content = (
            <>
              {isMobile && isLast && <MobilePitScene />}
              <span className="approach-step__index">{step.index}</span>
              <h3
                className="approach-step__title"
                ref={(el) => {
                  titleRefs.current[index] = el
                }}
              >
                {step.title}
              </h3>
              <p
                className="approach-step__description"
                ref={(el) => {
                  descRefs.current[index] = el
                }}
              >
                {step.description}
              </p>
            </>
          )

          if (isMobile) {
            return (
              <Reveal
                key={step.index}
                delay={index * 0.1}
                className="approach-step"
              >
                {content}
              </Reveal>
            )
          }

          return (
            <div className="approach-step" key={step.index}>
              {content}
            </div>
          )
        })}
      </div>
    </section>
  )
}
