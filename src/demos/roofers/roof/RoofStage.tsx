import { useId, useMemo, useState } from 'react'
import { metersPerPixel, ringCentroid, toFrame } from './geo'
import type { FootprintBuilding, MapFrame, RoofLookup } from './types'

export type StageMode = 'idle' | 'locating' | 'found' | 'error' | 'manual'

interface RoofStageProps {
  mode: StageMode
  lookup: RoofLookup | null
  selected: ReadonlySet<string>
  onToggle: (id: string) => void
  /** Drawn faintly behind the idle and loading states. */
  blueprint: RoofLookup
  status: string
}

const NICE_METERS = [2, 5, 10, 20, 50, 100]

/** Height of the strip along the bottom where providers print their logo and credits. */
const CREDIT_STRIP = 30

function scaleBar(frame: MapFrame) {
  const mpp = metersPerPixel(frame)
  const target = frame.width * 0.2 * mpp
  const meters = NICE_METERS.reduce((best, m) => (Math.abs(m - target) < Math.abs(best - target) ? m : best), NICE_METERS[0])
  return { px: meters / mpp, label: `${meters} m · ${Math.round(meters * 3.28084)} ft` }
}

/** The pin is drawn above its tip; an area label that would sit under it moves just below. */
function clearOfPin(label: [number, number], pin: [number, number]): [number, number] {
  const dx = Math.abs(label[0] - pin[0])
  const dy = label[1] - pin[1]
  return dx < 70 && dy > -52 && dy < 16 ? [label[0], pin[1] + 22] : label
}

const ringPath = (building: FootprintBuilding, frame: MapFrame) =>
  building.ring.map((point, i) => `${i === 0 ? 'M' : 'L'}${toFrame(point, frame).map((v) => v.toFixed(1)).join(' ')}`).join('') + 'Z'

function Grid({ frame }: { frame: MapFrame }) {
  const gridId = useId()
  // Two-metre cells, so the plan reads at true scale.
  const cell = 2 / metersPerPixel(frame)
  return (
    <>
      <defs>
        <pattern id={gridId} width={cell} height={cell} patternUnits="userSpaceOnUse">
          <path d={`M${cell} 0H0V${cell}`} fill="none" stroke="rgba(244,241,234,0.07)" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width={frame.width} height={frame.height} fill={`url(#${gridId})`} />
    </>
  )
}

function Blueprint({ lookup, scanning }: { lookup: RoofLookup; scanning: boolean }) {
  const { frame } = lookup
  return (
    <svg className="rf-stage__blueprint" viewBox={`0 0 ${frame.width} ${frame.height}`} aria-hidden="true" focusable="false">
      <Grid frame={frame} />
      {lookup.buildings.map((building) => (
        <path key={building.id} d={ringPath(building, frame)} className="rf-stage__blueprint-ring" />
      ))}
      <g className="rf-stage__crosshair" transform={`translate(${frame.width / 2} ${frame.height / 2})`}>
        <circle r="34" />
        <path d="M-56 0H-18M18 0H56M0 -56V-18M0 18V56" />
      </g>
      {scanning && <rect className="rf-stage__scan" x="0" y="0" width={frame.width} height={frame.height * 0.11} />}
    </svg>
  )
}

/**
 * The aerial backdrop with our own outlines drawn on it. Outlines come from
 * open footprint data, never from the imagery: the photo is context only,
 * and without one the outlines are drawn on a plan grid at true scale.
 * Each outline is a tap target; the same choices are offered as checkboxes
 * beside the stage for keyboard and screen-reader users.
 */
export function RoofStage({ mode, lookup, selected, onToggle, blueprint, status }: RoofStageProps) {
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null)
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const maskId = useId()
  const clipId = useId()
  const view = mode === 'found' ? lookup : null
  const frame = view?.frame ?? null
  const imagery = view?.imagery && view.imagery.src !== failedSrc ? view.imagery : null
  const ready = view !== null && (imagery === null || loadedSrc === imagery.src)

  const overlay = useMemo(() => {
    if (!frame || !view) return null
    const pin = toFrame(view.location, frame)
    return {
      buildings: view.buildings.map((building) => {
        const points = building.ring.map((point) => toFrame(point, frame))
        return { building, d: ringPath(building, frame), label: clearOfPin(ringCentroid(points), pin) }
      }),
      pin,
      scale: scaleBar(frame),
    }
  }, [frame, view])

  return (
    <div className={`rf-stage rf-stage--${mode}${ready ? ' is-loaded' : ''}${view && !imagery ? ' is-plan' : ''}`}>
      <div className="rf-stage__frame">
        {!ready && <Blueprint lookup={blueprint} scanning={mode === 'locating' || mode === 'found'} />}

        {imagery && frame && (
          <img
            className="rf-stage__image"
            src={imagery.src}
            width={frame.width}
            height={frame.height}
            alt={view?.source === 'sample' ? 'Illustrated aerial view of the sample house' : `Aerial view of ${view?.address.formatted ?? 'the property'}`}
            onLoad={() => setLoadedSrc(imagery.src)}
            onError={() => setFailedSrc(imagery.src)}
            draggable={false}
          />
        )}

        {frame && overlay && ready && (
          <svg className="rf-stage__overlay" viewBox={`0 0 ${frame.width} ${frame.height}`} aria-hidden="true" focusable="false">
            {!imagery && <Grid frame={frame} />}
            <defs>
              {/* Nothing of ours, not even the dimming, covers the provider's marks. */}
              <clipPath id={clipId}>
                <rect width={frame.width} height={frame.height - (imagery && imagery.provider !== 'sample' ? CREDIT_STRIP : 0)} />
              </clipPath>
              <mask id={maskId}>
                <rect width={frame.width} height={frame.height} fill="white" />
                {overlay.buildings
                  .filter(({ building }) => selected.has(building.id))
                  .map(({ building, d }) => (
                    <path key={building.id} d={d} fill="black" />
                  ))}
              </mask>
            </defs>
            <g clipPath={`url(#${clipId})`}>
              {imagery && <rect className="rf-stage__dim" width={frame.width} height={frame.height} mask={`url(#${maskId})`} />}
              {overlay.buildings.map(({ building, d }) => (
                <path
                  key={building.id}
                  d={d}
                  className={`rf-stage__ring${selected.has(building.id) ? ' is-selected' : ''}`}
                  onClick={() => onToggle(building.id)}
                />
              ))}
              {overlay.buildings
                .filter(({ building }) => selected.has(building.id))
                .map(({ building, label }) => (
                  <text key={building.id} x={label[0]} y={label[1]} className="rf-stage__area">
                    {building.areaSqFt.toLocaleString('en-US')} sq ft
                  </text>
                ))}
              <g className="rf-stage__pin" transform={`translate(${overlay.pin[0].toFixed(1)} ${overlay.pin[1].toFixed(1)})`}>
                <path d="M0 0C-9 -14 -14 -20 -14 -28A14 14 0 0 1 14 -28C14 -20 9 -14 0 0Z" />
                <circle cy="-28" r="5" />
              </g>
            </g>
            <g className="rf-stage__north" transform={`translate(${frame.width - 36} 40)`}>
              <circle r="20" />
              <path d="M0 -12L7 8L0 4L-7 8Z" />
              <text y="34">N</text>
            </g>
            {/* Top-left, so it never covers an imagery provider's logo. */}
            <g className="rf-stage__scale" transform="translate(24 44)">
              <path d={`M0 -6V0H${overlay.scale.px.toFixed(1)}V-6`} />
              <text x="0" y="-12">
                {overlay.scale.label}
              </text>
            </g>
          </svg>
        )}

        {mode !== 'found' && (
          <p className="rf-stage__status" aria-hidden="true">
            {status}
          </p>
        )}
      </div>
    </div>
  )
}
