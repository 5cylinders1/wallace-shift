import { useEffect, useState } from 'react'
import {
  IMPLEMENTED_PROGRESS_MAX,
  PHASES,
  QUALITY,
  SUBMERSION_PRESETS,
} from './waterHeroConfig'
import {
  PASSAGE,
  REQUIRED_SPLIT_DISPLACEMENT,
  REQUIRED_SPLIT_FRACTION,
} from './cameraPath'
import type {
  DebugTelemetry,
  DebugOverride,
  ProgressSource,
  QualityTier,
} from './waterHeroTypes'

/** Phase boundaries, so a reviewer can land on each one exactly. */
const PROGRESS_MARKS = [
  { label: 'Beneath', value: 0 },
  { label: 'Breach', value: PHASES.breach[0] },
  { label: 'Crossing', value: 0.19 },
  { label: 'Clear', value: PHASES.beautyShot[0] },
  { label: 'Beauty', value: 0.41 },
] as const

interface DebugOverlayProps {
  telemetry: DebugTelemetry
  override: DebugOverride
  progress: ProgressSource
  onProgress: (narrative: number) => void
  tier: QualityTier
  onTier: (tier: QualityTier) => void
}

const TIERS: QualityTier[] = ['high', 'medium', 'low']

/**
 * Development diagnostics and the manual submersion rig.
 *
 * Samples the telemetry object ten times a second rather than reading it
 * per frame: the numbers are for a human, and rendering them at 60Hz would
 * put React work on the frame budget it is meant to be measuring.
 *
 * Only ever mounted behind `?debug=1`.
 */
export function DebugOverlay({
  telemetry,
  override,
  progress,
  onProgress,
  tier,
  onTier,
}: DebugOverlayProps) {
  const [snapshot, setSnapshot] = useState<DebugTelemetry>({ ...telemetry })
  const [manual, setManual] = useState<number | null>(override.value)
  const [pinned, setPinned] = useState<number | null>(override.progress)

  useEffect(() => {
    const id = window.setInterval(() => setSnapshot({ ...telemetry }), 100)
    return () => window.clearInterval(id)
  }, [telemetry])

  const setOverride = (value: number | null) => {
    override.value = value
    setManual(value)
  }

  const setPin = (value: number | null) => {
    override.progress = value
    setPinned(value)
    if (value !== null) {
      progress.current = value
      onProgress(value)
    }
  }

  const quality = QUALITY[tier]

  return (
    <div className="water-hero__debug">
      <div className="water-hero__debug-head">
        <strong>water-hero</strong>
        <span>{snapshot.fps.toFixed(0)} fps</span>
      </div>

      <dl className="water-hero__debug-grid">
        <Row label="progress" value={snapshot.progress.toFixed(4)} />
        <Row label="logo world Y" value={snapshot.logoWorldY.toFixed(3)} />
        <Row
          label="bounds Y"
          value={`${snapshot.boundsMin.toFixed(3)} … ${snapshot.boundsMax.toFixed(3)}`}
        />
        <Row
          label="submersion"
          value={`${(snapshot.submersion * 100).toFixed(1)}%`}
        />
        <Row
          label="vertical vel"
          value={`${snapshot.verticalVelocity.toFixed(3)} u/s`}
        />
        <Row label="ripple energy" value={snapshot.rippleEnergy.toFixed(4)} />
        <Row
          label="nodes"
          value={
            snapshot.nodesFound
              ? 'WS_Logo · WS_Left · WS_Right ✓'
              : `missing — found ${snapshot.discoveredNames.join(', ') || 'nothing'}`
          }
        />
        <Row
          label="camera"
          value={snapshot.cameraPosition.map((v) => v.toFixed(2)).join(', ')}
        />
        <Row
          label="looking at"
          value={snapshot.cameraTarget.map((v) => v.toFixed(2)).join(', ')}
        />
        <Row
          label="passage"
          value={`${snapshot.passageWorld.map((v) => v.toFixed(2)).join(', ')} · ${snapshot.passageDistance.toFixed(2)} away`}
        />
        <Row
          label="split needed"
          value={`±${REQUIRED_SPLIT_DISPLACEMENT.toFixed(3)} (${(REQUIRED_SPLIT_FRACTION * 100).toFixed(0)}% of width) for ${PASSAGE.targetClearance.toFixed(2)} clearance`}
        />
        <Row
          label="tier"
          value={`${tier} · ${quality.waterSegments}² water · ${quality.reflectionSize}px refl · ${quality.rippleSize}² ripple`}
        />
      </dl>

      <div className="water-hero__debug-section">
        <span className="water-hero__debug-label">Submersion</span>
        <div className="water-hero__debug-buttons">
          {SUBMERSION_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              data-active={manual === preset.value ? 'true' : undefined}
              onClick={() => setOverride(preset.value)}
            >
              {preset.label}
            </button>
          ))}
          <button
            type="button"
            data-active={manual === null ? 'true' : undefined}
            onClick={() => setOverride(null)}
          >
            Scroll
          </button>
        </div>
        <input
          type="range"
          min={-0.05}
          max={1.2}
          step={0.005}
          value={manual ?? 0}
          disabled={manual === null}
          onChange={(event) => setOverride(Number(event.target.value))}
          aria-label="Manual submersion"
        />
      </div>

      <div className="water-hero__debug-section">
        <span className="water-hero__debug-label">
          Narrative progress {pinned === null ? '(scroll)' : `(pinned ${pinned.toFixed(3)})`}
        </span>
        <div className="water-hero__debug-buttons">
          {PROGRESS_MARKS.map((mark) => (
            <button
              key={mark.label}
              type="button"
              data-active={pinned === mark.value ? 'true' : undefined}
              onClick={() => setPin(mark.value)}
            >
              {mark.label}
            </button>
          ))}
          <button
            type="button"
            data-active={pinned === null ? 'true' : undefined}
            onClick={() => setPin(null)}
          >
            Scroll
          </button>
        </div>
        <input
          type="range"
          min={0}
          max={IMPLEMENTED_PROGRESS_MAX}
          step={0.002}
          value={pinned ?? snapshot.progress}
          disabled={pinned === null}
          onChange={(event) => setPin(Number(event.target.value))}
          aria-label="Narrative progress"
        />
      </div>

      <div className="water-hero__debug-section">
        <span className="water-hero__debug-label">Quality</span>
        <div className="water-hero__debug-buttons">
          {TIERS.map((option) => (
            <button
              key={option}
              type="button"
              data-active={tier === option ? 'true' : undefined}
              onClick={() => onTier(option)}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </>
  )
}
