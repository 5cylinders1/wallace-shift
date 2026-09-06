import { useCallback, useEffect, useMemo, useState } from 'react'
import { useReducedMotion } from '../../../hooks/useReducedMotion'
import { WaterHeroErrorBoundary } from './WaterHeroErrorBoundary'
import { WaterHeroStage } from './WaterHeroStage'
import { useQualityTier } from './useQualityTier'
import { createSceneState } from './waterHeroTypes'
import type {
  DebugTelemetry,
  ProgressSource,
  QualityTier,
  DebugOverride,
} from './waterHeroTypes'
import './WaterHero.css'

interface SearchOptions {
  debug: boolean
  /** `?quality=` pins the tier and opts out of the automatic downgrade. */
  tier: QualityTier | undefined
  /** `?progress=` pins the narrative, for inspecting one moment. */
  progress: number | null
  /**
   * `?reduced=1` forces the reduced-motion build.
   *
   * The OS setting cannot be emulated from a test harness, and reviewing a
   * variant by asking someone to change a system preference and reload is
   * how that variant stops getting reviewed. This only ever turns the
   * accessible path on.
   */
  forceReducedMotion: boolean
  /** `?channel=` isolates one water contribution. Development only. */
  channel: number
}

function readSearch(): SearchOptions {
  if (typeof window === 'undefined') {
    return {
      debug: false,
      tier: undefined,
      progress: null,
      forceReducedMotion: false,
      channel: 0,
    }
  }

  const params = new URLSearchParams(window.location.search)
  const requested = params.get('quality')
  const tier: QualityTier | undefined =
    requested === 'high' || requested === 'medium' || requested === 'low'
      ? requested
      : undefined

  const pinned = params.get('progress')
  const progress =
    pinned !== null && Number.isFinite(Number(pinned)) ? Number(pinned) : null

  return {
    debug: params.get('debug') === '1',
    tier,
    progress,
    forceReducedMotion: params.get('reduced') === '1',
    channel: Number(params.get('channel') ?? 0) || 0,
  }
}

/** Cheap probe, so a machine without WebGL2 never mounts the Canvas at all. */
function supportsWebGL(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const canvas = document.createElement('canvas')
    return Boolean(
      canvas.getContext('webgl2') ??
        canvas.getContext('webgl') ??
        canvas.getContext('experimental-webgl'),
    )
  } catch {
    return false
  }
}

export function WaterHeroExperiment() {
  const prefersReducedMotion = useReducedMotion()
  const [
    {
      debug,
      tier: requestedTier,
      progress: pinnedProgress,
      forceReducedMotion,
      channel,
    },
  ] = useState(readSearch)
  const reducedMotion = prefersReducedMotion || forceReducedMotion
  const { tier, setTier, downgrade, canDowngrade } = useQualityTier(requestedTier)

  const [failure, setFailure] = useState<string | null>(null)
  const [webgl] = useState(supportsWebGL)

  // Pointer parallax is a fine-pointer affordance and a motion effect; a
  // touch device has nothing to hover with, and reduced motion has asked
  // for less of exactly this.
  const pointerEnabled = useMemo(() => {
    if (reducedMotion || typeof window === 'undefined') return false
    return window.matchMedia('(pointer: fine)').matches
  }, [reducedMotion])

  // Stable mutable channels between the DOM, the scroll driver and the
  // frame loop. `useState` with a lazy initialiser rather than `useRef`:
  // the value is read during render to pass down, which is exactly what a
  // ref is not for, and this guarantees the same identity for the life of
  // the component without pretending the object is React state.
  const [progress] = useState<ProgressSource>(() => ({
    current: pinnedProgress ?? 0,
  }))
  const [override] = useState<DebugOverride>(() => ({
    value: null,
    progress: pinnedProgress,
  }))
  const [sceneState] = useState(createSceneState)
  const [telemetry] = useState<DebugTelemetry>(() => ({
    progress: 0,
    logoWorldY: 0,
    boundsMin: 0,
    boundsMax: 0,
    submersion: 0,
    verticalVelocity: 0,
    rippleEnergy: 0,
    tier: 'high',
    fps: 0,
    nodesFound: false,
    discoveredNames: [],
    cameraPosition: [0, 0, 0],
    cameraTarget: [0, 0, 0],
    passageWorld: [0, 0, 0],
    passageDistance: 0,
    travelPerPercent: 0,
    destinationReveal: 0,
  }))

  const onContextLost = useCallback(() => {
    setFailure('The WebGL context was lost.')
  }, [])

  /**
   * One-way downgrade on sustained slow frames.
   *
   * Sampled over three seconds and acted on once, because a tier change
   * rebuilds the water mesh and both render targets — a policy that
   * reacted to a single slow frame would spend the whole session
   * reallocating.
   */
  useEffect(() => {
    if (!canDowngrade || requestedTier) return
    const started = performance.now()
    const id = window.setInterval(() => {
      if (performance.now() - started < 3000) return
      if (telemetry.fps > 0 && telemetry.fps < 40) {
        downgrade()
        window.clearInterval(id)
      }
    }, 1000)
    return () => window.clearInterval(id)
  }, [canDowngrade, downgrade, requestedTier, telemetry])

  if (!webgl || failure) {
    return (
      <div className="water-hero-shell">
        <StaticFallback
          detail={failure ?? 'This browser did not provide a WebGL context.'}
        />
        <Handoff />
      </div>
    )
  }

  return (
    <div className="water-hero-shell">
      <WaterHeroErrorBoundary
        fallback={(message) => <StaticFallback detail={message} />}
      >
        <WaterHeroStage
          progress={progress}
          override={override}
          sceneState={sceneState}
          telemetry={telemetry}
          tier={tier}
          onTier={setTier}
          debug={debug}
          reducedMotion={reducedMotion}
          pointerEnabled={pointerEnabled}
          onContextLost={onContextLost}
          channel={channel}
        />
      </WaterHeroErrorBoundary>
      <Handoff />
    </div>
  )
}

/**
 * The route-safe fallback: a real composition, not an error card.
 *
 * The detail line is development-only. In production a visitor gets the
 * statement and a way back to the site, which is all the page owed them.
 */
function StaticFallback({ detail }: { detail: string }) {
  return (
    <section className="water-hero water-hero--static">
      <div className="water-hero__stage">
        <div className="water-hero__ui-root">
          <HeroFallbackCopy />
        </div>
        {import.meta.env.DEV && (
          <p className="water-hero__failure">{detail}</p>
        )}
      </div>
    </section>
  )
}

function HeroFallbackCopy() {
  return (
    <div className="water-hero__ui">
      <header className="water-hero__masthead">
        <a className="water-hero__brand" href="/">
          <img
            src="/brand/wallace-shift-logo-white.svg"
            alt=""
            width={26}
            height={16}
          />
          <span>Wallace Shift</span>
        </a>
        <a className="water-hero__back" href="/">
          Back to wallaceshift.com
        </a>
      </header>
      <div className="water-hero__copy">
        <p className="water-hero__eyebrow">Realtime experiment</p>
        <h1 className="water-hero__statement">
          <span className="water-hero__word">Overlooked</span>
          <span className="water-hero__arrow" aria-hidden="true">
            →
          </span>
          <span className="water-hero__word water-hero__word--lit">
            Unforgettable
          </span>
        </h1>
      </div>
    </div>
  )
}

/**
 * Proves the stage gives control back.
 *
 * Deliberately a placeholder rather than a real Wallace Shift section:
 * the experiment is not approved to replace anything, and reaching into
 * the production page for content would start coupling the two.
 */
function Handoff() {
  return (
    <section className="water-hero-handoff">
      <div className="water-hero-handoff__inner">
        <p className="water-hero-handoff__label">End of stage</p>
        <h2 className="water-hero-handoff__title">
          Document scroll resumes here.
        </h2>
        <p className="water-hero-handoff__body">
          Everything above this line is a single realtime scene driven by
          scroll position. Nothing below it is — this section exists only to
          confirm the stage unpins cleanly and hands the page back.
        </p>
        <a className="water-hero-handoff__link" href="/">
          Return to the Wallace Shift site
        </a>
      </div>
    </section>
  )
}
