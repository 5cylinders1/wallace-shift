import { useFrame } from '@react-three/fiber'
import type { PerspectiveCamera } from 'three'
import { sampleDescent } from './sceneDirector'
import { STAR_LOOK_ELEVATION } from './starLookInteraction'
import { useStarLook } from './useStarLook'
import type { DebugOverride, DebugTelemetry, ProgressSource, SceneState } from './waterHeroTypes'

export function CameraRig({ progress, telemetry, sceneState, override, reducedMotion = true }: {
  progress: ProgressSource
  telemetry: DebugTelemetry
  sceneState: SceneState
  override?: DebugOverride
  reducedMotion?: boolean
}) {
  const starLook = useStarLook({ progress, override, reducedMotion })
  useFrame(({ camera }, delta) => {
    const pose = sampleDescent(progress.current, (camera as PerspectiveCamera).aspect)
    const look = starLook(delta)
    const target: [number, number, number] = [...pose.target]
    if (look > 0) {
      const dx = target[0] - pose.camera[0]
      const dz = target[2] - pose.camera[2]
      const horizontal = Math.hypot(dx, dz)
      const baseElevation = Math.atan2(target[1] - pose.camera[1], horizontal)
      const elevation = baseElevation + (STAR_LOOK_ELEVATION - baseElevation) * look
      target[1] = pose.camera[1] + Math.tan(elevation) * horizontal
    }
    camera.position.set(...pose.camera)
    camera.lookAt(...target)
    camera.updateMatrixWorld()
    sceneState.progress = pose.progress
    sceneState.underwater = pose.underwater
    sceneState.lightLevel = pose.lightLevel
    telemetry.cameraPosition = pose.camera
    telemetry.cameraTarget = target
    telemetry.phase = pose.phase
    telemetry.cameraUnderwater = pose.underwater
    telemetry.blackout = pose.blackout
    telemetry.logoYaw = pose.yaw * 180 / Math.PI
  }, -3)
  return null
}
