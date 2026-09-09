import { useEffect, useState } from 'react'
import {
  IMPLEMENTED_PROGRESS_MAX,
  QUALITY,
  SUBMERSION_PRESETS,
} from './waterHeroConfig'
import { DESCENT_POSES } from './sceneDirector'
import type {
  DebugTelemetry,
  DebugOverride,
  ProgressSource,
  QualityTier,
} from './waterHeroTypes'

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
        <strong>WS · entry into depth</strong>
        <span>{snapshot.fps.toFixed(0)} fps</span>
      </div>

      <dl className="water-hero__debug-grid">
        <Row label="progress" value={snapshot.progress.toFixed(4)} />
        <Row label="pose" value={snapshot.phase} />
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
          label="camera depth"
          value={`${(snapshot.cameraUnderwater * 100).toFixed(0)}% underwater`}
        />
        <Row label="logo yaw" value={`${snapshot.logoYaw.toFixed(1)}°`} />
        <Row label="blackout" value={`${(snapshot.blackout * 100).toFixed(0)}%`} />
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
          {DESCENT_POSES.map((mark) => (
            <button
              key={mark.at}
              type="button"
              data-active={pinned === mark.at ? 'true' : undefined}
              onClick={() => setPin(mark.at)}
            >
              {mark.name}
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
