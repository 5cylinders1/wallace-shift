import type { RefObject } from 'react'
import { PitStopCar, type PitStopCarProps } from './PitStopCar'
import { CAR_CANVAS_H, CAR_CANVAS_W, HUB, STAGE_VIEW_W, TIRE_TREAD_PERCENT } from './pitStopGeometry'
import './PitStopScene.css'

// Desktop pit-stop stage: a full-window-wide, letterboxed strip with a
// small pit box, a couple of alignment marks, one release indicator, and
// the assembled car — all positioned on one shared 1000x220 coordinate
// system so the markings agree exactly with the car's own measured hub
// percentages (viewBox units are just stage-percentage x10 / x2.2).
//
// No crew: the car does all the work itself. It drives in from off-frame,
// stops, its own wheels launch off and fresh ones snap on, then it
// accelerates away off-frame the other side, leaving a peel-out mark under
// each rear wheel as it goes. The car is deliberately small relative to
// the stage — a car crossing a wide, mostly-empty strip reads as "driving
// through", not "parked in a box".
const VIEW_W = STAGE_VIEW_W
const VIEW_H = 220

const BOX_X = 360
const BOX_Y = 30
const BOX_W = 280
const BOX_H = 160

// Percentages of the *travel wrapper* (which spans the full stage — see
// `.pit-stop-scene__car-travel` in the CSS), not of the stage's own
// bounding box directly — kept in one place so the car's own numbers and
// the derived hub/peel-mark positions below can't drift apart.
const CAR_TRACK_WIDTH_PERCENT = 13
const CAR_TRACK_HEIGHT_PERCENT = 48
const CAR_TRACK_LEFT_PERCENT = (100 - CAR_TRACK_WIDTH_PERCENT) / 2
const CAR_TRACK_TOP_PERCENT = (100 - CAR_TRACK_HEIGHT_PERCENT) / 2

const CAR_TRACK_LEFT = (CAR_TRACK_LEFT_PERCENT / 100) * VIEW_W
const CAR_TRACK_TOP = (CAR_TRACK_TOP_PERCENT / 100) * VIEW_H
const CAR_TRACK_WIDTH = (CAR_TRACK_WIDTH_PERCENT / 100) * VIEW_W
const CAR_TRACK_HEIGHT = (CAR_TRACK_HEIGHT_PERCENT / 100) * VIEW_H

// The car box above isn't necessarily the source canvas's own 1672:941
// ratio, so `object-fit: contain` letterboxes it — uniformly scaled to fit,
// centered on whichever axis has slack. Hub positions and the peel-mark
// thickness are measured against the *source* canvas, so they need the
// car's actual rendered size within the box (and its letterbox offset),
// not the box's own raw dimensions, or they drift off the real tires.
const CAR_FITS_BY_WIDTH = CAR_CANVAS_W / CAR_CANVAS_H > CAR_TRACK_WIDTH / CAR_TRACK_HEIGHT
const CAR_RENDERED_WIDTH = CAR_FITS_BY_WIDTH ? CAR_TRACK_WIDTH : CAR_TRACK_HEIGHT * (CAR_CANVAS_W / CAR_CANVAS_H)
const CAR_RENDERED_HEIGHT = CAR_FITS_BY_WIDTH ? CAR_TRACK_WIDTH * (CAR_CANVAS_H / CAR_CANVAS_W) : CAR_TRACK_HEIGHT
const CAR_OFFSET_X = CAR_TRACK_LEFT + (CAR_TRACK_WIDTH - CAR_RENDERED_WIDTH) / 2
const CAR_OFFSET_Y = CAR_TRACK_TOP + (CAR_TRACK_HEIGHT - CAR_RENDERED_HEIGHT) / 2

const REAR_X = CAR_OFFSET_X + (HUB.rearXPercent / 100) * CAR_RENDERED_WIDTH
const FRONT_X = CAR_OFFSET_X + (HUB.frontXPercent / 100) * CAR_RENDERED_WIDTH
const CENTER_X = (REAR_X + FRONT_X) / 2
const HUB_UPPER_Y = CAR_OFFSET_Y + (HUB.upperYPercent / 100) * CAR_RENDERED_HEIGHT
const HUB_LOWER_Y = CAR_OFFSET_Y + (HUB.lowerYPercent / 100) * CAR_RENDERED_HEIGHT

// The mark's max length, once fully laid down — long enough to read as a
// real burnout trail (at least half the remaining distance from the rear
// wheel out to the edge of the full-window-wide stage), not just a short
// stub under the car. Safe to make this generous regardless of the car's
// own size: Approach.tsx grows the mark in lockstep with the car's own
// live position (never independently), so it can only ever trail the rear
// wheel, never overtake it, however long it's allowed to get.
export const PEEL_MARK_LENGTH = Math.round((VIEW_W - REAR_X) * 0.55)

// Matches the rear tire's own measured footprint width so the mark reads
// as coming from the tire itself, not an arbitrarily thin line.
const PEEL_MARK_THICKNESS = (TIRE_TREAD_PERCENT / 100) * CAR_RENDERED_HEIGHT

// Only the rear wheels lay down peel-out marks — the classic driven-wheel
// burnout look, rather than all four corners.
const PEEL_MARK_POSITIONS = [
  { x: REAR_X, y: HUB_UPPER_Y },
  { x: REAR_X, y: HUB_LOWER_Y },
] as const

export interface PitStopSceneProps extends Omit<PitStopCarProps, 'className'> {
  carTravelRef: RefObject<HTMLDivElement | null>
  releaseIndicatorRef: RefObject<SVGCircleElement | null>
  peelMarkRefs: RefObject<SVGRectElement | null>[]
}

export function PitStopScene({
  carTravelRef,
  releaseIndicatorRef,
  peelMarkRefs,
  ...carProps
}: PitStopSceneProps) {
  return (
    <div className="pit-stop-scene">
      <svg
        className="pit-stop-scene__markings"
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
        focusable="false"
      >
        <rect
          x={BOX_X}
          y={BOX_Y}
          width={BOX_W}
          height={BOX_H}
          rx={5}
          fill="var(--color-bone)"
          stroke="#ada393"
          strokeWidth={1.25}
          strokeDasharray="2 6"
          opacity={0.9}
        />

        <line x1={CENTER_X} y1={BOX_Y + 8} x2={CENTER_X} y2={BOX_Y + BOX_H - 8} stroke="#ada393" strokeWidth={1} strokeDasharray="1 7" opacity={0.8} />

        {[REAR_X, FRONT_X].map((x) => (
          <g key={x} aria-hidden="true">
            <circle cx={x} cy={HUB_UPPER_Y} r={13} fill="none" stroke="#ada393" strokeWidth={1} strokeDasharray="1 5" opacity={0.6} />
            <circle cx={x} cy={HUB_LOWER_Y} r={13} fill="none" stroke="#ada393" strokeWidth={1} strokeDasharray="1 5" opacity={0.6} />
          </g>
        ))}

        {/* Peel-out marks: anchored at the rear wheel's stopped position
         * and grown, in Approach.tsx, in exact lockstep with the car's own
         * live position — so the mark can only ever trail the rear wheel
         * as it drives away, never extend ahead of it. Rendered beneath
         * the car so the chassis and tires always paint over them while
         * the car is still sitting on top. */}
        <g className="pit-stop-scene__peel-marks" aria-hidden="true">
          {PEEL_MARK_POSITIONS.map((pos, i) => (
            <rect
              key={i}
              ref={peelMarkRefs[i]}
              x={pos.x}
              y={pos.y - PEEL_MARK_THICKNESS / 2}
              width={0}
              height={PEEL_MARK_THICKNESS}
              rx={1.5}
            />
          ))}
        </g>

        <g className="pit-stop-scene__release" transform={`translate(${BOX_X + BOX_W - 18},${BOX_Y + 10})`}>
          <rect x={-7} y={-3} width={14} height={20} rx={3} fill="none" stroke="var(--color-ink)" strokeWidth={1.25} />
          <circle ref={releaseIndicatorRef} cx={0} cy={7} r={3.5} fill="var(--color-ink)" stroke="var(--color-ink)" strokeWidth={1.25} />
        </g>
      </svg>

      {/* Spans the entire stage width so `xPercent` on it (driven by
       * Approach.tsx) is one full stage-width per 100% — the car's own box
       * inside is a small, fixed percentage slice, so a modest xPercent
       * swing clears it completely off-frame on either side. */}
      <div className="pit-stop-scene__car-travel" ref={carTravelRef}>
        <div
          className="pit-stop-scene__car-track"
          style={{
            left: `${CAR_TRACK_LEFT_PERCENT}%`,
            top: `${CAR_TRACK_TOP_PERCENT}%`,
            width: `${CAR_TRACK_WIDTH_PERCENT}%`,
            height: `${CAR_TRACK_HEIGHT_PERCENT}%`,
          }}
        >
          <PitStopCar className="pit-stop-scene__car" {...carProps} />
        </div>
      </div>
    </div>
  )
}
