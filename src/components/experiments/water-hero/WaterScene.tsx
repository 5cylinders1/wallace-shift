import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { ACESFilmicToneMapping, Matrix4, Vector3 } from 'three'
import { CameraRig } from './CameraRig'
import { BreachParticles } from './BreachParticles'
import { CameraPathDebug } from './CameraPathDebug'
import { DestinationField } from './DestinationField'
import { buildJourney, passagePoint, travelPerPercent } from './cameraPath'
import { REFLECTION_CLIP } from './reflectionPlane'
import { WSLogo } from './WSLogo'
import { WaterSurface } from './WaterSurface'
import { createStudioEnvironment } from './studioEnvironment'
import { useDisposable } from './useDisposable'
import { disposeLogoInstance, useLogoModel } from './useLogoModel'
import { ENVIRONMENT, PARTICLES, QUALITY } from './waterHeroConfig'
import type {
  DebugTelemetry,
  ProgressSource,
  QualityTier,
  SceneState,
  DebugOverride,
} from './waterHeroTypes'

interface WaterSceneProps {
  progress: ProgressSource
  override: DebugOverride
  sceneState: SceneState
  telemetry: DebugTelemetry
  tier: QualityTier
  pointerEnabled: boolean
  channel: number
  debug: boolean
}

export function WaterScene({
  progress,
  override,
  sceneState,
  telemetry,
  tier,
  pointerEnabled,
  channel,
  debug,
}: WaterSceneProps) {
  const gl = useThree((state) => state.gl)
  const scene = useThree((state) => state.scene)

  const quality = QUALITY[tier]
  const { nodes, error, discovered } = useLogoModel()

  // Telemetry is written in an effect, not during render: the overlay is
  // a passive observer and the render pass must stay free of side effects.
  useEffect(() => {
    telemetry.tier = tier
    telemetry.nodesFound = nodes !== null
    telemetry.discoveredNames = discovered
  }, [telemetry, tier, nodes, discovered])

  useEffect(() => {
    gl.toneMapping = ACESFilmicToneMapping
    gl.toneMappingExposure = ENVIRONMENT.toneMappingExposure
  }, [gl])

  const environment = useDisposable(
    () => createStudioEnvironment(gl),
    (value) => value.dispose(),
    [gl],
  )

  useEffect(() => {
    if (!environment) return
    scene.background = environment.background
    scene.environment = environment.environment
    scene.backgroundIntensity = ENVIRONMENT.backgroundIntensity
    scene.environmentIntensity = ENVIRONMENT.environmentIntensity
    return () => {
      scene.background = null
      scene.environment = null
    }
  }, [scene, environment])

  /**
   * The emblem's live world transform, and the camera curve built through
   * it.
   *
   * The passage checkpoints are authored in the rig's own space, so the
   * curve has to follow the emblem's yaw and pitch rather than assume it
   * is square to the world. Rebuilt only when the rig actually moves
   * enough to matter — re-allocating a spline every frame to track a rig
   * that is holding still is pure waste.
   */
  const rigMatrix = useMemo(() => new Matrix4(), [])
  const [journey, setJourney] = useState(() => buildJourney(rigMatrix, 1.777))
  const lastRig = useRef(-Infinity)

  const lastAspect = useRef(0)

  useFrame(({ camera }) => {
    if (!nodes) return
    // The standoff poses are re-framed for the viewport, so the journey has
    // to be rebuilt when the aspect ratio genuinely changes.
    const aspect = (camera as { aspect?: number }).aspect ?? 1.777
    if (Math.abs(aspect - lastAspect.current) > 0.01) {
      lastAspect.current = aspect
      setJourney(buildJourney(rigMatrix, aspect))
    }
    nodes.sceneRoot.updateMatrixWorld()
    // orientGroup -> pitchGroup: the space the passage points are authored
    // in, and the last one that still carries rise, yaw and pitch.
    const pitchGroup = nodes.sceneRoot.parent?.parent
    if (!pitchGroup) return
    rigMatrix.copy(pitchGroup.matrixWorld)
    const y = rigMatrix.elements[13]
    if (Math.abs(y - lastRig.current) < 0.004) return
    lastRig.current = y
    setJourney(buildJourney(rigMatrix, lastAspect.current || 1.777))
  })

  // Corridor centre in world space, and how close the camera currently is
  // to it — the number that says whether the authored path actually goes
  // where it was designed to.
  const passageScratch = useMemo(() => new Vector3(), [])
  useFrame(({ camera }) => {
    passagePoint(rigMatrix, 0, passageScratch)
    telemetry.passageWorld = [
      passageScratch.x,
      passageScratch.y,
      passageScratch.z,
    ]
    telemetry.passageDistance = camera.position.distanceTo(passageScratch)
    telemetry.travelPerPercent = travelPerPercent(progress.current, journey)
  })

  useEffect(() => {
    if (!nodes) return
    return () => disposeLogoInstance(nodes)
  }, [nodes])

  // Surfaced through the error boundary rather than swallowed: a missing
  // node means the export contract changed, and quietly substituting some
  // other object would hide that until the split animation looked wrong.
  if (error) throw new Error(error)
  if (!nodes || !environment) return null

  return (
    <>
      <CameraRig
        progress={progress}
        pointerEnabled={pointerEnabled}
        journey={journey}
        telemetry={telemetry}
      />
      <WSLogo
        nodes={nodes}
        progress={progress}
        override={override}
        scene={sceneState}
        telemetry={telemetry}
        pointerEnabled={pointerEnabled}
        skyEnvironment={environment.background}
        reflectionClip={REFLECTION_CLIP}
      />
      <WaterSurface
        sceneState={sceneState}
        telemetry={telemetry}
        quality={quality}
        environment={environment}
        channel={channel}
      />
      {PARTICLES.enabled && (
        <BreachParticles sceneState={sceneState} count={quality.particles} />
      )}
      <DestinationField rigMatrix={rigMatrix} telemetry={telemetry} />
      {debug && <CameraPathDebug journey={journey} rigMatrix={rigMatrix} />}
    </>
  )
}
