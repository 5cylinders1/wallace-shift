import type { RefObject } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { PEEL_MARK_LENGTH } from './PitStopScene'
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

const ACTIVE_OPACITY = 1
const COMPLETED_TITLE_OPACITY = 0.55
const COMPLETED_DESC_OPACITY = 0.45

type ImgRef = RefObject<HTMLImageElement | null>

export interface PitStopSceneRefs {
  sectionRef: RefObject<HTMLElement | null>
  carTravelRef: RefObject<HTMLDivElement | null>
  releaseIndicatorRef: RefObject<SVGCircleElement | null>
  mountedRefs: Record<TireKey, ImgRef>
  replacementRefs: Record<TireKey, ImgRef>
  peelMarkRefs: RefObject<SVGRectElement | null>[]
  titleRefs: RefObject<(HTMLElement | null)[]>
  descRefs: RefObject<(HTMLElement | null)[]>
  /**
   * What to pin, when that is not the whole trigger section. The homepage
   * keeps the hill run inside the same section and must not pin it — the
   * car has to be able to leave down the slope after the pin releases.
   */
  pinTargetRef?: RefObject<HTMLElement | null>
}

export interface PitStopSceneOptions {
  enabled: boolean
  /** Pinned scroll distance as a multiple of viewport height. */
  pinVh?: number
}

/**
 * The full pit-stop sequence: car in, four wheels off, four wheels on,
 * release light, launch — with the three step titles handing over as each
 * beat lands, and peel marks trailing the rear wheels on the way out.
 *
 * Pinned and scrubbed. The pin is the point: the sequence is four distinct
 * beats and a visitor scrolling past an unpinned scene sees perhaps one of
 * them. Shared by `/approach` and the homepage so there is one
 * implementation of the timing rather than two that drift apart.
 */
export function usePitStopSceneTimeline(
  refs: PitStopSceneRefs,
  { enabled, pinVh = 1.55 }: PitStopSceneOptions,
) {
  const {
    sectionRef,
    carTravelRef,
    releaseIndicatorRef,
    mountedRefs,
    replacementRefs,
    peelMarkRefs,
    titleRefs,
    descRefs,
    pinTargetRef,
  } = refs

  useGSAP(
    () => {
      if (!enabled) return

      const section = sectionRef.current
      const carTravel = carTravelRef.current
      const releaseIndicator = releaseIndicatorRef.current
      const titles = titleRefs.current.filter((el): el is HTMLElement => !!el)
      const descs = descRefs.current.filter((el): el is HTMLElement => !!el)
      const mountedTires = TIRE_KEYS.map((key) => mountedRefs[key].current)
      const replacementTires = TIRE_KEYS.map((key) => replacementRefs[key].current)
      const peelMarks = peelMarkRefs.map((ref) => ref.current)

      if (
        !section ||
        !carTravel ||
        !releaseIndicator ||
        titles.length < 3 ||
        descs.length < 3 ||
        mountedTires.some((el) => !el) ||
        replacementTires.some((el) => !el) ||
        peelMarks.some((el) => !el)
      ) {
        return
      }

      // Initial state — car staged off-screen left, replacement tires
      // parked beside their hub (invisible), mounted tires on their hubs,
      // release indicator closed, no peel marks laid down yet.
      gsap.set(carTravel, { xPercent: CAR_ENTER_X_PERCENT })
      gsap.set(mountedTires, { opacity: 1, yPercent: 0 })
      TIRE_KEYS.forEach((key, i) => {
        const sign = isUpperTire(key) ? -1 : 1
        gsap.set(replacementTires[i], {
          opacity: 0,
          yPercent: sign * TIRE_TRAVEL_Y_PERCENT,
        })
      })
      gsap.set(releaseIndicator, { attr: { fill: 'var(--color-ink)' } })

      // Peel marks are derived from the car's live position every update,
      // never tweened on their own ease — so a mark can only trail the
      // wheel that laid it down, never run ahead of it.
      const updatePeelMarks = () => {
        const xPercent = gsap.getProperty(carTravel, 'xPercent') as number
        const displacement = Math.max(0, (xPercent / 100) * STAGE_VIEW_W)
        const width = Math.min(displacement, PEEL_MARK_LENGTH)
        gsap.set(peelMarks, { attr: { width } })
      }
      updatePeelMarks()

      // Chrome can leave the scene's absolutely-positioned layers resolving
      // their percentage position against a stale containing-block rect
      // once the pin engages — correct getBoundingClientRect(), wrong
      // paint, until something forces a fresh layout pass. Cheap per-frame
      // comparison while the section is in view; the corrective reflow only
      // runs on an actual mismatch.
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
        const stale = layeredEls.some(
          (el) => Math.abs(el.getBoundingClientRect().top - sceneTop) > 0.5,
        )
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
          pin: pinTargetRef?.current ?? section,
          start: 'top top',
          end: () => `+=${Math.round(window.innerHeight * pinVh)}`,
          scrub: 0.35,
          invalidateOnRefresh: true,
          // Refreshes before anything positioned below it — a diagonal or
          // a following section is placed by this pin's added height.
          refreshPriority: 1,
          onRefresh: forceSceneReflow,
          onEnter: forceSceneReflow,
          onEnterBack: forceSceneReflow,
        },
        defaults: { ease: 'none' },
        onUpdate: updatePeelMarks,
      })

      const { enterEnd, shootOffEnd, shootOnEnd, releaseAt } = TIMELINE

      // 1. The car enters alone and stops in the pit box.
      tl.to(carTravel, { xPercent: 0, duration: enterEnd, ease: 'power2.out' }, 0)

      // Step 1 settles, step 2 becomes active.
      tl.to(titles[0], { opacity: COMPLETED_TITLE_OPACITY, scale: 1, duration: 0.03, ease: 'power1.in' }, enterEnd + 0.02)
      tl.to(descs[0], { opacity: COMPLETED_DESC_OPACITY, duration: 0.03, ease: 'power1.in' }, enterEnd + 0.02)
      tl.fromTo(titles[1], { y: 10 }, { opacity: ACTIVE_OPACITY, y: 0, scale: 1.06, duration: 0.04, ease: 'power2.out' }, enterEnd + 0.04)
      tl.fromTo(descs[1], { y: 10 }, { opacity: ACTIVE_OPACITY, y: 0, duration: 0.04, ease: 'power2.out' }, enterEnd + 0.04)

      // 2. Old wheels shoot off, all four at once.
      tl.to(
        mountedTires,
        {
          yPercent: (i: number) => (isUpperTire(TIRE_KEYS[i]) ? -1 : 1) * TIRE_TRAVEL_Y_PERCENT,
          opacity: 0,
          duration: shootOffEnd - enterEnd,
          ease: 'power4.in',
          stagger: 0.015,
        },
        enterEnd,
      )

      // 3. Fresh wheels snap onto the hub with a touch of overshoot.
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

      // Step 2 -> step 3.
      tl.to(titles[1], { opacity: COMPLETED_TITLE_OPACITY, scale: 1, duration: 0.03, ease: 'power1.in' }, releaseAt - 0.03)
      tl.to(descs[1], { opacity: COMPLETED_DESC_OPACITY, duration: 0.03, ease: 'power1.in' }, releaseAt - 0.03)
      tl.fromTo(titles[2], { y: 10 }, { opacity: ACTIVE_OPACITY, y: 0, scale: 1.06, duration: 0.04, ease: 'power2.out' }, releaseAt)
      tl.fromTo(descs[2], { y: 10 }, { opacity: ACTIVE_OPACITY, y: 0, duration: 0.04, ease: 'power2.out' }, releaseAt)

      // 4. Release light flips to ember and the car launches away.
      tl.to(
        releaseIndicator,
        { attr: { fill: 'var(--color-ember)', stroke: 'var(--color-ember)' }, duration: 0.02, ease: 'none' },
        releaseAt,
      )
      tl.to(carTravel, { xPercent: CAR_EXIT_X_PERCENT, duration: 1 - releaseAt, ease: 'power4.in' }, releaseAt)

      if (document.fonts && 'ready' in document.fonts) {
        document.fonts.ready.then(() => ScrollTrigger.refresh())
      }

      const handleResize = () => ScrollTrigger.refresh()
      window.addEventListener('resize', handleResize)

      return () => {
        window.removeEventListener('resize', handleResize)
        watchdogObserver.disconnect()
        cancelAnimationFrame(watchdogId)
        tl.scrollTrigger?.kill()
        tl.kill()
      }
    },
    { scope: sectionRef, dependencies: [enabled, pinVh] },
  )
}
