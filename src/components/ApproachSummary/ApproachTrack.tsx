import type { RefObject } from 'react'
import { PitStopCar } from '../Approach/PitStopCar'
import './ApproachTrack.css'

export interface ApproachTrackProps {
  trackRef: RefObject<HTMLDivElement | null>
  carRef: RefObject<HTMLDivElement | null>
  lightRef: RefObject<HTMLSpanElement | null>
  /** Rear-wheel tire marks, laid down as the car launches away. */
  markUpperRef: RefObject<HTMLSpanElement | null>
  markLowerRef: RefObject<HTMLSpanElement | null>
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

/**
 * The pit lane above the three steps: a rule the car crosses, the car
 * itself, and the release light at the far end.
 *
 * Presentation only — ApproachSummary owns the scroll-scrubbed timeline
 * that drives all of it, the same way Approach owns the timeline for the
 * full scene on `/approach`. Every ref arrives as its own named prop
 * rather than bundled in an object, per the project's react-hooks/refs
 * rule (see the note in PitStopCar).
 */
export function ApproachTrack({
  trackRef,
  carRef,
  lightRef,
  markUpperRef,
  markLowerRef,
  chassisRef,
  frontUpperMountedRef,
  frontLowerMountedRef,
  rearUpperMountedRef,
  rearLowerMountedRef,
  frontUpperReplacementRef,
  frontLowerReplacementRef,
  rearUpperReplacementRef,
  rearLowerReplacementRef,
}: ApproachTrackProps) {
  return (
    <div className="approach-track" aria-hidden="true">
      <div className="approach-track__lane" ref={trackRef}>
        <span className="approach-track__rule" />
        <span className="approach-track__light" ref={lightRef} />

        {/* Laid down behind each rear wheel on the launch beat. Position,
            thickness and width are all set by the parent's timeline from
            the car's own rendered box — see updateMarks. */}
        <span className="approach-track__mark" ref={markUpperRef} />
        <span className="approach-track__mark" ref={markLowerRef} />
        <div className="approach-track__car" ref={carRef}>
          <PitStopCar
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
      </div>
    </div>
  )
}
