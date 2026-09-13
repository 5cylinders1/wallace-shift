import { Quaternion, Vector3 } from 'three'

/** Pointer positions arrive normalized against the mark's own radius, with
 * Y already flipped so up is positive. The controller never translates the
 * mark: it only accumulates an orientation the renderer composes onto the
 * scroll pose. */
const MAX_SPIN = 11
const GRAB_DAMPING = 1.15
const OFFSTAGE_DAMPING = 5
const REST = .015

const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value))
const finite = (value: number) => Number.isFinite(value) ? value : 0

/** A virtual trackball. Points near the centre sit on a unit sphere and
 * points beyond it on a hyperbolic sheet, which is what lets a flat drag
 * produce roll as well as yaw and pitch — a plain two-axis mapping can
 * never turn the mark about the axis facing the reader. */
function project(out: Vector3, x: number, y: number) {
  const planar = x * x + y * y
  out.set(x, y, planar <= .5 ? Math.sqrt(1 - planar) : .5 / Math.sqrt(planar))
  return out.normalize()
}

/** Free rotation for the quiz mark: drag to turn it on every axis, release
 * mid-drag to send it spinning at the speed of the throw. Scroll still owns
 * where the mark sits and how it is lit; this owns only its orientation. */
export function createJourneySpin() {
  const orientation = new Quaternion()
  const applied = new Quaternion()
  const velocity = new Vector3()
  const measured = new Vector3()
  const axis = new Vector3()
  const previous = new Vector3()
  const current = new Vector3()
  const step = new Quaternion()
  let grabbed = false
  let lastMove = 0

  return {
    applied,
    get grabbed() { return grabbed },
    /** True while the mark is still turning on its own after a throw. */
    get coasting() { return !grabbed && velocity.lengthSq() > REST * REST },

    grab(x: number, y: number, time: number) {
      grabbed = true
      lastMove = finite(time)
      velocity.set(0, 0, 0)
      project(previous, finite(x), finite(y))
    },

    move(x: number, y: number, time: number) {
      if (!grabbed) return
      project(current, finite(x), finite(y))
      step.setFromUnitVectors(previous, current)
      // A screen-space drag turns the mark about screen axes, so the new
      // rotation is applied before the accumulated one, not after it.
      orientation.premultiply(step)
      const elapsed = clamp(finite(time) - lastMove, 1 / 240, .1)
      lastMove = finite(time)
      const sine = Math.sqrt(Math.max(1e-9, 1 - step.w * step.w))
      const angle = 2 * Math.atan2(sine, clamp(step.w, -1, 1))
      axis.set(step.x / sine, step.y / sine, step.z / sine)
      // The throw follows the drag's recent average rather than its final
      // frame, so one jittery sample cannot fling the mark across the stage.
      measured.copy(axis).multiplyScalar(angle / elapsed)
      velocity.lerp(measured, .45)
      previous.copy(current)
    },

    release() {
      if (!grabbed) return
      grabbed = false
      const speed = velocity.length()
      if (speed > MAX_SPIN) velocity.multiplyScalar(MAX_SPIN / speed)
      else if (speed < REST) velocity.set(0, 0, 0)
    },

    cancel() {
      grabbed = false
      velocity.set(0, 0, 0)
    },

    /** `presence` is how much of the quiz chapter is on screen. The mark
     * returns to its composed scroll pose as the section leaves, and finds
     * the reader's own orientation again when it comes back. */
    advance(delta: number, presence: number) {
      const dt = clamp(finite(delta), 0, .1)
      const onStage = clamp(finite(presence), 0, 1)
      if (!grabbed && velocity.lengthSq() > 0) {
        const speed = velocity.length()
        if (speed > REST) {
          axis.copy(velocity).divideScalar(speed)
          step.setFromAxisAngle(axis, speed * dt)
          orientation.premultiply(step)
        }
        const damping = GRAB_DAMPING + (OFFSTAGE_DAMPING - GRAB_DAMPING) * (1 - onStage)
        velocity.multiplyScalar(Math.exp(-damping * dt))
        if (velocity.length() < REST) velocity.set(0, 0, 0)
      }
      applied.identity().slerp(orientation, onStage)
      return applied
    },
  }
}

export type JourneySpin = ReturnType<typeof createJourneySpin>
