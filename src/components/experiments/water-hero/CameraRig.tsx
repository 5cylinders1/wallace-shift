import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Vector3 } from 'three'
import { sampleJourney, type CameraJourney } from './cameraPath'
import { POINTER } from './waterHeroConfig'
import type { DebugTelemetry, ProgressSource } from './waterHeroTypes'


const UP = new Vector3(0, 1, 0)

export function CameraRig({
  progress,
  pointerEnabled,
  journey,
  telemetry,
}: {
  progress: ProgressSource
  pointerEnabled: boolean
  journey: CameraJourney
  telemetry: DebugTelemetry
}) {
  const camera = useThree((state) => state.camera)

  const pointer = useRef({ x: 0, y: 0 })
  const scratch = useMemo(
    () => ({
      position: new Vector3(),
      target: new Vector3(),
      right: new Vector3(),
      sampled: { position: new Vector3(), target: new Vector3() },
    }),
    [],
  )

  useFrame((state, delta) => {
    const narrative = progress.current

    sampleJourney(narrative, journey, scratch.sampled)
    scratch.position.copy(scratch.sampled.position)
    scratch.target.copy(scratch.sampled.target)


    if (pointerEnabled) {
      const approach = Math.min(1, delta * POINTER.damping)
      pointer.current.x += (state.pointer.x - pointer.current.x) * approach
      pointer.current.y += (state.pointer.y - pointer.current.y) * approach

      scratch.position.sub(scratch.target)
      scratch.position.applyAxisAngle(UP, pointer.current.x * POINTER.cameraYaw)
      scratch.right.crossVectors(UP, scratch.position).normalize()
      scratch.position.applyAxisAngle(
        scratch.right,
        -pointer.current.y * POINTER.cameraPitch,
      )
      scratch.position.add(scratch.target)
    }

    camera.position.copy(scratch.position)
    camera.lookAt(scratch.target)

    telemetry.cameraPosition = [
      scratch.position.x,
      scratch.position.y,
      scratch.position.z,
    ]
    telemetry.cameraTarget = [
      scratch.target.x,
      scratch.target.y,
      scratch.target.z,
    ]
  })

  return null
}
