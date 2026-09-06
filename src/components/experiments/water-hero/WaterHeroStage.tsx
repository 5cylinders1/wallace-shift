import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { DebugOverlay } from './DebugOverlay'
import { HeroUI } from './HeroUI'
import { applyHeroUiProgress } from './heroUiProgress'
import { LoadingFallback } from './LoadingFallback'
import { WaterScene } from './WaterScene'
import { useScrollProgress } from './useScrollProgress'
import {
  CAMERA,
  QUALITY,
  REDUCED_MOTION_PROGRESS,
  STAGE_SCROLL_SVH,
} from './waterHeroConfig'
import type {
  DebugTelemetry,
  ProgressSource,
  QualityTier,
  SceneState,
  DebugOverride,
} from './waterHeroTypes'

interface WaterHeroStageProps {
  progress: ProgressSource
  override: DebugOverride
  sceneState: SceneState
  telemetry: DebugTelemetry
  tier: QualityTier
  onTier: (tier: QualityTier) => void
  debug: boolean
  reducedMotion: boolean
  pointerEnabled: boolean
  onContextLost: () => void
  channel: number
}

/**
 * Signals that the suspended subtree resolved, so the loader can retire.
 *
 * Mounting is the signal: React does not run this effect until everything
 * the Suspense boundary was waiting on has loaded.
 */
function SceneReady({ onReady }: { onReady: () => void }) {
  useEffect(() => {
    onReady()
  }, [onReady])
  return null
}

export function WaterHeroStage({
  progress,
  override,
  sceneState,
  telemetry,
  tier,
  onTier,
  debug,
  reducedMotion,
  pointerEnabled,
  onContextLost,
  channel,
}: WaterHeroStageProps) {
  const sectionRef = useRef<HTMLElement>(null)
  const uiRef = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)

  const onProgress = useCallback(
    (narrative: number) => {
      applyHeroUiProgress(uiRef.current, narrative, reducedMotion)
    },
    [reducedMotion],
  )

  // Reduced motion keeps the composition but drops the pinned narrative:
  // progress is parked on the beauty shot and the section is one screen
  // tall, so the page scrolls like any other document. The water still
  // moves — a blank canvas is not an accessible alternative to a scene.
  useScrollProgress(sectionRef, progress, override, onProgress, !reducedMotion)

  useEffect(() => {
    if (reducedMotion) {
      progress.current = REDUCED_MOTION_PROGRESS
      applyHeroUiProgress(uiRef.current, REDUCED_MOTION_PROGRESS, true)
      return
    }
    // A pinned narrative suppresses the scroll driver, which is otherwise
    // what performs the DOM layer's first write — without this the copy
    // stays at the opacity 0 it is authored with.
    if (override.progress !== null) {
      applyHeroUiProgress(uiRef.current, override.progress, false)
    }
  }, [reducedMotion, progress, override])

  const first = CAMERA.keys[0]

  return (
    <section
      ref={sectionRef}
      className="water-hero"
      style={{ height: reducedMotion ? '100svh' : `${STAGE_SCROLL_SVH}svh` }}
    >
      <div className="water-hero__stage">
        <Canvas
          className="water-hero__canvas"
          aria-hidden="true"
          dpr={[1, QUALITY[tier].dprCap]}
          gl={{
            antialias: true,
            powerPreference: 'high-performance',
            alpha: false,
          }}
          camera={{
            fov: CAMERA.fov,
            near: CAMERA.near,
            far: CAMERA.far,
            position: [0, first.height, first.distance],
          }}
          onCreated={({ gl }) => {
            gl.domElement.addEventListener('webglcontextlost', onContextLost, {
              once: true,
            })
          }}
        >
          <Suspense fallback={null}>
            <SceneReady onReady={() => setReady(true)} />
            <WaterScene
              progress={progress}
              override={override}
              sceneState={sceneState}
              telemetry={telemetry}
              tier={tier}
              pointerEnabled={pointerEnabled}
              channel={channel}
              debug={debug}
            />
          </Suspense>
        </Canvas>

        <div ref={uiRef} className="water-hero__ui-root">
          <HeroUI still={reducedMotion} />
        </div>

        <LoadingFallback visible={!ready} />

        {debug && (
          <DebugOverlay
            telemetry={telemetry}
            override={override}
            progress={progress}
            onProgress={onProgress}
            tier={tier}
            onTier={onTier}
          />
        )}
      </div>
    </section>
  )
}
