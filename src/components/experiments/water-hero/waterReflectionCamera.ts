import { Matrix4, PerspectiveCamera, Vector3 } from 'three'

const WATER_NORMAL = new Vector3(0, 1, 0)

export function createReflectionScratch() {
  return { eye: new Vector3(), target: new Vector3(), forward: new Vector3(), rotation: new Matrix4(), origin: new Vector3() }
}

/** Mirror the eye, gaze and up vector across the actual water plane.
 * Source-minus-plane is already the outward vector: negating after its
 * reflection would leave the eye above water on the far side of the logo. */
export function updateWaterReflectionCamera(
  source: PerspectiveCamera,
  reflected: PerspectiveCamera,
  waterY: number,
  scratch: ReturnType<typeof createReflectionScratch>,
) {
  scratch.origin.set(0, waterY, 0)
  scratch.eye.setFromMatrixPosition(source.matrixWorld)
  scratch.rotation.extractRotation(source.matrixWorld)
  scratch.forward.set(0, 0, -1).applyMatrix4(scratch.rotation)
  scratch.target.copy(scratch.eye).add(scratch.forward)
    .sub(scratch.origin).reflect(WATER_NORMAL).add(scratch.origin)
  reflected.position.copy(scratch.eye).sub(scratch.origin).reflect(WATER_NORMAL).add(scratch.origin)
  reflected.up.set(0, 1, 0).applyMatrix4(scratch.rotation).reflect(WATER_NORMAL)
  reflected.lookAt(scratch.target)
  reflected.near = source.near
  reflected.far = source.far
  reflected.fov = source.fov
  reflected.aspect = source.aspect
  reflected.projectionMatrix.copy(source.projectionMatrix)
  reflected.projectionMatrixInverse.copy(source.projectionMatrixInverse)
  reflected.updateMatrixWorld()
}
