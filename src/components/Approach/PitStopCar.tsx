import type { RefObject } from 'react'
import { CHASSIS_SOURCE, TIRE_SOURCES } from './pitStopGeometry'
import './PitStopCar.css'

// The assembled car is one rigid object: a single container fixed to the
// source canvas's own aspect ratio, with every layer absolutely filling it
// via `object-fit: contain`. Nothing here ever sets an individual
// left/top/width/height offset per image — if a tire doesn't sit on its
// hub, the fix is this shared container CSS, not a per-image nudge.
//
// Every ref is threaded through as its own named prop (rather than bundled
// into a lookup object) — the project's react-hooks/refs lint rule flags
// any `ref={someObject.property}` access as an unsafe render-time ref
// read, so each ref here is a bare identifier passed straight through from
// Approach.tsx's own individual useRef() calls.

/** Static assembled car — chassis plus the four mounted tires only, no
 * replacement duplicates and no refs. Used for the reduced-motion path and
 * the mobile fallback scene. */
export function PitStopCarStatic({ className }: { className?: string }) {
  return (
    <div className={`pit-stop-car ${className ?? ''}`}>
      <img className="pit-stop-car__layer" src={CHASSIS_SOURCE} alt="" />
      <img className="pit-stop-car__layer" src={TIRE_SOURCES.frontUpper} alt="" />
      <img className="pit-stop-car__layer" src={TIRE_SOURCES.frontLower} alt="" />
      <img className="pit-stop-car__layer" src={TIRE_SOURCES.rearUpper} alt="" />
      <img className="pit-stop-car__layer" src={TIRE_SOURCES.rearLower} alt="" />
    </div>
  )
}

export interface PitStopCarProps {
  className?: string
  chassisRef: RefObject<HTMLImageElement | null>
  frontUpperMountedRef: RefObject<HTMLImageElement | null>
  frontLowerMountedRef: RefObject<HTMLImageElement | null>
  rearUpperMountedRef: RefObject<HTMLImageElement | null>
  rearLowerMountedRef: RefObject<HTMLImageElement | null>
  frontUpperReplacementRef: RefObject<HTMLImageElement | null>
  frontLowerReplacementRef: RefObject<HTMLImageElement | null>
  rearUpperReplacementRef: RefObject<HTMLImageElement | null>
  rearLowerReplacementRef: RefObject<HTMLImageElement | null>
}

/** Full animated car — chassis, the four mounted tires, and the four
 * replacement tires (initially hidden at their staged offset), each wired
 * to a ref so the parent's GSAP timeline can drive the pit-stop sequence.
 * Layer order is fixed: chassis, then all rear tires, then all front
 * tires. */
export function PitStopCar({
  className,
  chassisRef,
  frontUpperMountedRef,
  frontLowerMountedRef,
  rearUpperMountedRef,
  rearLowerMountedRef,
  frontUpperReplacementRef,
  frontLowerReplacementRef,
  rearUpperReplacementRef,
  rearLowerReplacementRef,
}: PitStopCarProps) {
  return (
    <div className={`pit-stop-car ${className ?? ''}`}>
      <img className="pit-stop-car__layer" src={CHASSIS_SOURCE} alt="Formula car, top-down, assembled" ref={chassisRef} />

      <img
        className="pit-stop-car__layer pit-stop-car__tire pit-stop-car__tire--mounted"
        src={TIRE_SOURCES.rearUpper}
        alt=""
        ref={rearUpperMountedRef}
      />
      <img
        className="pit-stop-car__layer pit-stop-car__tire pit-stop-car__tire--replacement"
        src={TIRE_SOURCES.rearUpper}
        alt=""
        ref={rearUpperReplacementRef}
      />
      <img
        className="pit-stop-car__layer pit-stop-car__tire pit-stop-car__tire--mounted"
        src={TIRE_SOURCES.rearLower}
        alt=""
        ref={rearLowerMountedRef}
      />
      <img
        className="pit-stop-car__layer pit-stop-car__tire pit-stop-car__tire--replacement"
        src={TIRE_SOURCES.rearLower}
        alt=""
        ref={rearLowerReplacementRef}
      />

      <img
        className="pit-stop-car__layer pit-stop-car__tire pit-stop-car__tire--mounted"
        src={TIRE_SOURCES.frontUpper}
        alt=""
        ref={frontUpperMountedRef}
      />
      <img
        className="pit-stop-car__layer pit-stop-car__tire pit-stop-car__tire--replacement"
        src={TIRE_SOURCES.frontUpper}
        alt=""
        ref={frontUpperReplacementRef}
      />
      <img
        className="pit-stop-car__layer pit-stop-car__tire pit-stop-car__tire--mounted"
        src={TIRE_SOURCES.frontLower}
        alt=""
        ref={frontLowerMountedRef}
      />
      <img
        className="pit-stop-car__layer pit-stop-car__tire pit-stop-car__tire--replacement"
        src={TIRE_SOURCES.frontLower}
        alt=""
        ref={frontLowerReplacementRef}
      />
    </div>
  )
}
