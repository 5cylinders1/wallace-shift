import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Line,
  LineBasicMaterial,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  OctahedronGeometry,
  RingGeometry,
  Vector3,
} from 'three'
import {
  PASSAGE,
  REQUIRED_SPLIT_DISPLACEMENT,
  passagePoint,
  type CameraJourney,
} from './cameraPath'
import { POSES } from './cameraPoses'

/**
 * Development-only visualisation of the authored camera path.
 *
 * Never mounted outside debug mode. Its job is to make the two questions
 * that matter answerable by looking: does the path go where it is supposed
 * to, and does it clear the geometry. A camera path that is only ever seen
 * from inside the camera is a path nobody has actually checked.
 */
export function CameraPathDebug({
  journey,
  rigMatrix,
}: {
  journey: CameraJourney
  rigMatrix: Matrix4
}) {
  const resources = useMemo(() => {
    const lineGeometry = new BufferGeometry()
    const line = new Line(
      lineGeometry,
      new LineBasicMaterial({ color: new Color('#e85427'), depthTest: false }),
    )
    line.frustumCulled = false
    line.renderOrder = 999

    const markerGeometry = new OctahedronGeometry(0.035)
    const markerMaterial = new MeshBasicMaterial({
      color: new Color('#f1efe9'),
      depthTest: false,
    })
    const markers = POSES.map(() => {
      const mesh = new Mesh(markerGeometry, markerMaterial)
      mesh.renderOrder = 1000
      mesh.frustumCulled = false
      return mesh
    })

    // The clearance the passage actually needs, drawn at the corridor
    // centre so it can be compared against the real gap by eye.
    const ringGeometry = new RingGeometry(
      PASSAGE.targetClearance - 0.006,
      PASSAGE.targetClearance,
      48,
    )
    const ring = new Mesh(
      ringGeometry,
      new MeshBasicMaterial({ color: new Color('#4da3ff'), depthTest: false }),
    )
    ring.renderOrder = 1000
    ring.frustumCulled = false

    return { line, lineGeometry, markerGeometry, markerMaterial, markers, ring, ringGeometry }
  }, [])

  useEffect(
    () => () => {
      resources.lineGeometry.dispose()
      ;(resources.line.material as LineBasicMaterial).dispose()
      resources.markerGeometry.dispose()
      resources.markerMaterial.dispose()
      resources.ringGeometry.dispose()
      ;(resources.ring.material as MeshBasicMaterial).dispose()
    },
    [resources],
  )

  const scratch = useMemo(() => new Vector3(), [])

  useFrame(() => {
    // Sampled densely: a sparse polyline through a centripetal spline can
    // look like it clears geometry that the real curve passes through.
    const points = journey.positions.getSpacedPoints(240)
    const flat: number[] = []
    for (const point of points) flat.push(point.x, point.y, point.z)
    resources.lineGeometry.setAttribute(
      'position',
      new Float32BufferAttribute(flat, 3),
    )
    resources.lineGeometry.computeBoundingSphere()

    POSES.forEach((_, index) => {
      journey.positions.getPointAt(
        Math.min(1, Math.max(0, journey.poseTravel[index])),
        resources.markers[index].position,
      )
    })

    passagePoint(rigMatrix, 0, scratch)
    resources.ring.position.copy(scratch)
    resources.ring.quaternion.setFromRotationMatrix(rigMatrix)
  })

  return (
    <group>
      <primitive object={resources.line} />
      <primitive object={resources.ring} />
      {resources.markers.map((marker, index) => (
        <primitive key={POSES[index].name} object={marker} />
      ))}
    </group>
  )
}

/** Reported in the debug overlay so the split target is not a guess. */
export const SPLIT_TARGET = REQUIRED_SPLIT_DISPLACEMENT
