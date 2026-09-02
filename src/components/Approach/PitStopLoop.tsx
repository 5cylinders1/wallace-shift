import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { PitStopCar } from './PitStopCar'
import {
  CAR_ENTER_X_PERCENT,
  CAR_EXIT_X_PERCENT,
  TIRE_KEYS,
  TIRE_TRAVEL_Y_PERCENT,
  isUpperTire,
} from './pitStopGeometry'
import './PitStopLoop.css'

/** Seconds each stage's own motion runs for. Deliberately shorter than the
 *  stage hold in Approach, so every beat finishes and settles before the
 *  copy above it cross-fades to the next one. */
const ENTER_S = 0.9
const SWAP_OFF_S = 0.32
const SWAP_ON_S = 0.42
const EXIT_S = 0.75

export interface PitStopLoopProps {
  /** Index of the approach step currently on screen: 0 arrival, 1 tire
   *  swap, 2 release and launch. */
  stage: number
  /** Whether the section is on screen. While false the scene holds its
   *  pre-arrival state, so the car's entrance plays for the visitor rather
   *  than several sections above them. */
  active: boolean
}

/**
 * The mobile pit stop. Same three beats as the desktop scene and the same
 * car layers, but played on the stage timer rather than scrubbed by a
 * pinned scroll — small screens never surrender their scroll position here.
 */
export function PitStopLoop({ stage, active }: PitStopLoopProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const lightRef = useRef<HTMLSpanElement>(null)

  const chassisRef = useRef<HTMLImageElement>(null)
  const frontUpperMountedRef = useRef<HTMLImageElement>(null)
  const frontLowerMountedRef = useRef<HTMLImageElement>(null)
  const rearUpperMountedRef = useRef<HTMLImageElement>(null)
  const rearLowerMountedRef = useRef<HTMLImageElement>(null)
  const frontUpperReplacementRef = useRef<HTMLImageElement>(null)
  const frontLowerReplacementRef = useRef<HTMLImageElement>(null)
  const rearUpperReplacementRef = useRef<HTMLImageElement>(null)
  const rearLowerReplacementRef = useRef<HTMLImageElement>(null)

  // Lookup objects for the GSAP effect only — never passed to a JSX `ref=`
  // attribute, per the project's react-hooks/refs rule (see PitStopCar).
  const mountedRefs = {
    frontUpper: frontUpperMountedRef,
    frontLower: frontLowerMountedRef,
    rearUpper: rearUpperMountedRef,
    rearLower: rearLowerMountedRef,
  }
  const replacementRefs = {
    frontUpper: frontUpperReplacementRef,
    frontLower: frontLowerReplacementRef,
    rearUpper: rearUpperReplacementRef,
    rearLower: rearLowerReplacementRef,
  }

  useGSAP(
    () => {
      const track = trackRef.current
      const light = lightRef.current
      const mounted = TIRE_KEYS.map((key) => mountedRefs[key].current)
      const replacements = TIRE_KEYS.map((key) => replacementRefs[key].current)
      if (!track || !light || mounted.some((el) => !el) || replacements.some((el) => !el)) {
        return
      }

      const offsets = TIRE_KEYS.map(
        (key) => (isUpperTire(key) ? -1 : 1) * TIRE_TRAVEL_Y_PERCENT,
      )

      // Off screen: hold the staged pre-arrival state and run nothing.
      if (!active) {
        gsap.set(mounted, { opacity: 1, yPercent: 0 })
        replacements.forEach((tire, i) => {
          gsap.set(tire, { opacity: 0, yPercent: offsets[i] })
        })
        gsap.set(light, { backgroundColor: 'var(--color-ink)' })
        gsap.set(track, { xPercent: CAR_ENTER_X_PERCENT })
        return
      }

      const tl = gsap.timeline()

      if (stage === 0) {
        // Re-arm the whole scene, then drive in. This is the only beat that
        // resets, so a loop back round to stage 0 restages the car without
        // needing a separate teardown pass.
        gsap.set(mounted, { opacity: 1, yPercent: 0 })
        replacements.forEach((tire, i) => {
          gsap.set(tire, { opacity: 0, yPercent: offsets[i] })
        })
        gsap.set(light, { backgroundColor: 'var(--color-ink)' })
        gsap.set(track, { xPercent: CAR_ENTER_X_PERCENT })
        tl.to(track, { xPercent: 0, duration: ENTER_S, ease: 'power2.out' })
      } else if (stage === 1) {
        gsap.set(track, { xPercent: 0 })
        tl.to(mounted, {
          yPercent: (i: number) => offsets[i],
          opacity: 0,
          duration: SWAP_OFF_S,
          ease: 'power4.in',
          stagger: 0.04,
        }).to(
          replacements,
          {
            yPercent: 0,
            opacity: 1,
            duration: SWAP_ON_S,
            ease: 'back.out(1.8)',
            stagger: 0.04,
          },
          '>-0.05',
        )
      } else {
        gsap.set(track, { xPercent: 0 })
        tl.to(light, {
          backgroundColor: 'var(--color-ember)',
          duration: 0.18,
          ease: 'none',
        }).to(track, { xPercent: CAR_EXIT_X_PERCENT, duration: EXIT_S, ease: 'power4.in' })
      }

      return () => {
        tl.kill()
      }
    },
    { dependencies: [stage, active] },
  )

  return (
    <div className="pit-stop-loop" aria-hidden="true">
      <div className="pit-stop-loop__stage">
        <span className="pit-stop-loop__box" />
        <div className="pit-stop-loop__track" ref={trackRef}>
          <PitStopCar
            className="pit-stop-loop__car"
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
        </div>
        <span className="pit-stop-loop__light" ref={lightRef} />
      </div>
    </div>
  )
}
