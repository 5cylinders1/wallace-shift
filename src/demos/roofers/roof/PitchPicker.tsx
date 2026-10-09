import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import gsap from 'gsap'
import { figurePaths, outfits, poses, type Pose } from '../timelapse/crew'
import {
  HOUSE_STYLES,
  PITCH_BANDS,
  PITCH_MAX,
  PITCH_MIN,
  bandFor,
  clampPitch,
  pitchDegrees,
  pitchFactor,
} from './pitch'
import './PitchPicker.css'

interface PitchPickerProps {
  /** Whole-number rise per 12. */
  value: number
  onChange: (rise: number) => void
  /** Ids of elements that describe the control (e.g. an instruction line). */
  describedBy?: string
}

/* Gable-end elevation, in viewBox units. */
const VIEW_W = 600
const VIEW_H = 384
const GROUND = 350
const EAVE_Y = 260
const CENTER = 300
const HALF_RUN = 150
const ROOF_T = 20
const WALL_X0 = 172
const WALL_X1 = 428
const HANDLE_GAP = 30

const rise = (pitch: number) => (HALF_RUN * pitch) / 12
const slopeY = (x: number, h: number) => EAVE_Y - h * (1 - Math.abs(x - CENTER) / HALF_RUN)

function figure(pose: Pose) {
  const p = figurePaths(pose)
  const o = outfits.r1
  return { p, o }
}

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Drag the ridge up or down until the drawing matches the house. The roof,
 * the 12-and-rise triangle, the angle, and the roofer on the slope (who
 * gets a harness, then roof jacks, as it steepens) all follow live.
 *
 * The thumb is a real WAI-ARIA slider: arrows step one inch, Page keys
 * three, Home and End jump to the ends. A mouse or pen drags anywhere on
 * the drawing; a finger drags the handle (so swiping past still scrolls),
 * with pointer capture so it can wander off it. The Flatter / Steeper
 * buttons do the same without dragging at all.
 */
export function PitchPicker({ value, onChange, describedBy }: PitchPickerProps) {
  const [shown, setShown] = useState(value)
  const [dragging, setDragging] = useState(false)
  const stageRef = useRef<HTMLDivElement>(null)
  const handleRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const tweenRef = useRef<gsap.core.Tween | null>(null)
  const proxy = useRef({ v: value })
  const labelId = useId()
  const noteId = useId()

  // Animate to values that arrive from outside a drag (keys, buttons,
  // style chips). With reduced motion the tween has no length: it jumps.
  useEffect(() => {
    if (dragging) return
    tweenRef.current?.kill()
    tweenRef.current = gsap.to(proxy.current, {
      v: value,
      duration: reducedMotion() ? 0 : 0.55,
      ease: 'power3.out',
      onUpdate: () => setShown(proxy.current.v),
    })
    return () => {
      tweenRef.current?.kill()
    }
  }, [value, dragging])

  const pitchFromPointer = (clientY: number) => {
    const svg = svgRef.current
    const matrix = svg?.getScreenCTM()
    if (!svg || !matrix) return null
    const point = new DOMPoint(0, clientY).matrixTransform(matrix.inverse())
    const peakY = point.y + HANDLE_GAP
    return clampPitch(((EAVE_Y - peakY) / HALF_RUN) * 12)
  }

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    // On touch, only the handle drags, so a swipe across the drawing scrolls the page.
    if (event.pointerType === 'touch' && !handleRef.current?.contains(event.target as Node)) return
    const next = pitchFromPointer(event.clientY)
    if (next === null) return
    event.currentTarget.setPointerCapture(event.pointerId)
    tweenRef.current?.kill()
    setDragging(true)
    proxy.current.v = next
    setShown(next)
    onChange(Math.round(next))
  }

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragging) return
    const next = pitchFromPointer(event.clientY)
    if (next === null) return
    proxy.current.v = next
    setShown(next)
    const whole = Math.round(next)
    if (whole !== value) onChange(whole)
  }

  const endDrag = () => {
    if (!dragging) return
    setDragging(false)
    // Settle on the whole-number pitch the readout already shows.
    const whole = Math.round(proxy.current.v)
    if (reducedMotion()) {
      proxy.current.v = whole
      setShown(whole)
    } else {
      tweenRef.current = gsap.to(proxy.current, { v: whole, duration: 0.35, ease: 'power2.out', onUpdate: () => setShown(proxy.current.v) })
    }
    onChange(whole)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const steps: Record<string, number> = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1, PageUp: 3, PageDown: -3 }
    let next: number | null = null
    if (event.key in steps) next = value + steps[event.key]
    else if (event.key === 'Home') next = PITCH_MIN
    else if (event.key === 'End') next = PITCH_MAX
    if (next === null) return
    event.preventDefault()
    onChange(Math.round(clampPitch(next)))
  }

  const h = rise(shown)
  const band = bandFor(value)
  const deg = pitchDegrees(value)
  const factor = pitchFactor(value)

  // Roof band and gable wall.
  const roof = `M${CENTER - HALF_RUN} ${EAVE_Y}L${CENTER} ${EAVE_Y - h}L${CENTER + HALF_RUN} ${EAVE_Y}L${CENTER + HALF_RUN} ${EAVE_Y + ROOF_T}L${CENTER} ${EAVE_Y - h + ROOF_T}L${CENTER - HALF_RUN} ${EAVE_Y + ROOF_T}Z`
  const wallTop = (x: number) => slopeY(x, h) + ROOF_T
  const gable = `M${WALL_X0} ${GROUND}L${WALL_X0} ${wallTop(WALL_X0)}L${CENTER} ${EAVE_Y - h + ROOF_T}L${WALL_X1} ${wallTop(WALL_X1)}L${WALL_X1} ${GROUND}Z`

  // The roofer's 12-and-rise triangle on the right-hand slope, far enough
  // down it that the handle above the ridge never covers its labels.
  const ax = CENTER + 58
  const ay = slopeY(ax, h)
  const run = 66
  const bx = ax + run
  const cy = ay + (run * shown) / 12

  // Angle at the left eave.
  const theta = Math.atan(h / HALF_RUN)
  const arcR = 58
  const ex = CENTER - HALF_RUN
  const arc = `M${ex + arcR} ${EAVE_Y}A${arcR} ${arcR} 0 0 0 ${(ex + arcR * Math.cos(theta)).toFixed(1)} ${(EAVE_Y - arcR * Math.sin(theta)).toFixed(1)}`
  const labelAngle = theta / 2
  const degX = ex + (arcR + 22) * Math.cos(labelAngle)
  const degY = EAVE_Y - (arcR + 22) * Math.sin(labelAngle) + 5

  // The roofer: walks a walkable roof, kneels on a moderate one, and is
  // tied off on roof jacks once it is steep.
  const steep = Math.round(shown) >= 10
  const pose = shown < 7 ? poses.walkA : poses.kneel
  const { p, o } = figure(pose)
  const fx = CENTER - HALF_RUN * 0.48
  const fy = slopeY(fx, h)
  const scale = 0.5
  const shoulder = { x: fx + pose.shoulder[0] * scale, y: fy + pose.shoulder[1] * scale }

  const handleY = EAVE_Y - h - HANDLE_GAP
  const handleLeft = (CENTER / VIEW_W) * 100
  const handleTop = (handleY / VIEW_H) * 100

  return (
    <div className={`rf-pitch${dragging ? ' is-dragging' : ''}`}>
      <div
        ref={stageRef}
        className="rf-pitch__stage"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onLostPointerCapture={endDrag}
      >
        <svg ref={svgRef} className="rf-pitch__svg" viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} aria-hidden="true" focusable="false">
          <defs>
            <linearGradient id="rf-pitch-roof" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#6a737b" />
              <stop offset="1" stopColor="#40474e" />
            </linearGradient>
            <pattern id="rf-pitch-siding" width="40" height="9" patternUnits="userSpaceOnUse">
              <rect width="40" height="9" fill="#e9e4da" />
              <rect y="7.6" width="40" height="1.4" fill="#cfc8bb" />
            </pattern>
          </defs>

          {/* range guide behind the ridge */}
          <line x1={CENTER} y1={EAVE_Y - rise(PITCH_MAX)} x2={CENTER} y2={EAVE_Y - rise(PITCH_MIN)} className="rf-pitch__guide" />

          <rect x="0" y={GROUND} width={VIEW_W} height={VIEW_H - GROUND} className="rf-pitch__ground" />
          <path d={gable} fill="url(#rf-pitch-siding)" />
          <path d={gable} fill="#14181c" opacity="0.08" />
          {/* a window and a vent on the gable end */}
          <rect x={CENTER - 30} y={GROUND - 72} width="60" height="44" className="rf-pitch__window" />
          <path d={`M${CENTER} ${GROUND - 72}V${GROUND - 28}M${CENTER - 30} ${GROUND - 50}H${CENTER + 30}`} className="rf-pitch__mullion" />
          {h > 60 && (
            <path
              d={`M${CENTER - 11} ${EAVE_Y - h * 0.42 + 24}V${EAVE_Y - h * 0.42 + 6}A11 11 0 0 1 ${CENTER + 11} ${EAVE_Y - h * 0.42 + 6}V${EAVE_Y - h * 0.42 + 24}Z`}
              className="rf-pitch__vent"
            />
          )}

          <path d={roof} fill="url(#rf-pitch-roof)" />
          {/* rake board under the shingle edge, drip edge on top */}
          <path
            d={`M${CENTER - HALF_RUN + 6} ${EAVE_Y + ROOF_T - 3}L${CENTER} ${EAVE_Y - h + ROOF_T - 3}L${CENTER + HALF_RUN - 6} ${EAVE_Y + ROOF_T - 3}`}
            className="rf-pitch__rake"
          />
          <path d={`M${CENTER - HALF_RUN} ${EAVE_Y}L${CENTER} ${EAVE_Y - h}L${CENTER + HALF_RUN} ${EAVE_Y}`} className="rf-pitch__drip" />

          {/* angle */}
          <line x1={ex} y1={EAVE_Y} x2={ex + arcR + 16} y2={EAVE_Y} className="rf-pitch__ref" />
          <path d={arc} className="rf-pitch__arc" />
          <text x={degX} y={degY} className="rf-pitch__deg">
            {pitchDegrees(shown).toFixed(0)}°
          </text>

          {/* 12 : rise */}
          <path d={`M${ax} ${ay}H${bx}V${cy}`} className="rf-pitch__triangle" />
          <text x={(ax + bx) / 2} y={ay - 9} className="rf-pitch__tri-label">
            12
          </text>
          <text x={bx + 9} y={(ay + cy) / 2 + 5} className="rf-pitch__tri-label rf-pitch__tri-label--rise">
            {Math.round(shown)}
          </text>

          {/* the roofer */}
          {steep && (
            <>
              <path
                d={`M${shoulder.x} ${shoulder.y}Q${(shoulder.x + CENTER) / 2} ${Math.max(shoulder.y, EAVE_Y - h) + 10} ${CENTER - 4} ${EAVE_Y - h + 4}`}
                className="rf-pitch__rope"
              />
              <path d={`M${fx - 22} ${fy + 2}H${fx + 18}`} className="rf-pitch__plank" />
              <path d={`M${fx - 12} ${fy + 2}L${fx - 4} ${slopeY(fx - 4, h) + 1}M${fx + 8} ${fy + 2}L${fx + 14} ${slopeY(fx + 14, h) + 1}`} className="rf-pitch__bracket" />
            </>
          )}
          <g transform={`translate(${fx.toFixed(1)} ${fy.toFixed(1)}) scale(${scale})`} strokeLinecap="round" strokeLinejoin="round" fill="none">
            <path d={p.legBack} stroke={o.pants} strokeWidth="12" opacity="0.8" />
            <path d={p.armBack} stroke={o.shirt} strokeWidth="9.5" opacity="0.8" />
            <path d={p.torso} stroke={o.vest} strokeWidth="25" />
            <path d={p.stripe} stroke="#eef2f2" strokeWidth="3" />
            <path d={p.legFront} stroke={o.pants} strokeWidth="12" />
            <path d={p.bootFront} stroke="#3a2a1e" strokeWidth="8" />
            <path d={p.bootBack} stroke="#3a2a1e" strokeWidth="8" />
            <g transform={`translate(${p.headX} ${p.headY})`}>
              <circle r="9.5" fill={o.skin} />
              <path d="M-11 -2Q-11 -16 0 -16Q11 -16 11 -2ZM-13 -2H15" fill={o.hat} stroke={o.hat} strokeWidth="2.6" />
            </g>
            <path d={p.armFront} stroke={o.shirt} strokeWidth="9.5" />
          </g>

          {/* handle stem */}
          <line x1={CENTER} y1={handleY + 14} x2={CENTER} y2={EAVE_Y - h - 2} className="rf-pitch__stem" />
        </svg>

        <div
          ref={handleRef}
          className="rf-pitch__handle"
          role="slider"
          tabIndex={0}
          aria-labelledby={labelId}
          aria-describedby={[noteId, describedBy].filter(Boolean).join(' ')}
          aria-valuemin={PITCH_MIN}
          aria-valuemax={PITCH_MAX}
          aria-valuenow={value}
          aria-valuetext={`${value} in 12, about ${deg.toFixed(0)} degrees, ${band.label.toLowerCase()}`}
          aria-orientation="vertical"
          onKeyDown={onKeyDown}
          style={{ left: `${handleLeft}%`, top: `${handleTop}%` }}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M7 10l5-5 5 5M7 14l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      <div className="rf-pitch__readout">
        <p id={labelId} className="rf-pitch__label">
          Roof pitch
        </p>
        <p className="rf-pitch__value" aria-hidden="true">
          <span>{value}</span>/12
        </p>
        <p className="rf-pitch__meta" aria-hidden="true">
          {deg.toFixed(1)}° · roof area ×{factor.toFixed(2)}
        </p>
        <div className="rf-pitch__steppers">
          <button type="button" className="rf-pitch__step" aria-label="Flatter" disabled={value <= PITCH_MIN} onClick={() => onChange(value - 1)}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 12h12" />
            </svg>
          </button>
          <button type="button" className="rf-pitch__step" aria-label="Steeper" disabled={value >= PITCH_MAX} onClick={() => onChange(value + 1)}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 12h12M12 6v12" />
            </svg>
          </button>
        </div>
        <p className="rf-pitch__band">
          <strong>{band.label}.</strong> <span id={noteId}>{band.note}</span>
        </p>
      </div>

      <div className="rf-pitch__scale" aria-hidden="true">
        {PITCH_BANDS.map((b) => (
          <span key={b.id} className={`rf-pitch__segment${b.id === band.id ? ' is-active' : ''}`} style={{ flexGrow: b.to - b.from + 1 }}>
            {b.short}
          </span>
        ))}
        <span className="rf-pitch__marker" style={{ left: `${((shown - PITCH_MIN) / (PITCH_MAX - PITCH_MIN)) * 100}%` }} />
      </div>

      <div className="rf-pitch__styles" role="group" aria-label="Start from a house style">
        {HOUSE_STYLES.map((style) => (
          <button
            key={style.id}
            type="button"
            className="rf-pitch__style"
            aria-pressed={value === style.pitch}
            onClick={() => onChange(style.pitch)}
          >
            <span>{style.label}</span>
            <small>{style.pitch}/12</small>
          </button>
        ))}
      </div>
    </div>
  )
}
