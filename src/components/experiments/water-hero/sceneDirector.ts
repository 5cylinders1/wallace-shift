import { Vector3 } from 'three'
import { CAMERA } from './waterHeroConfig'
import type { LogoMetrics } from './waterHeroTypes'

/**
 * Every scene state, derived from normalized progress alone.
 *
 * Nothing here accumulates. Given a progress value the scene reconstructs
 * itself exactly, which is what makes scrolling backward, jumping with the
 * scrollbar and resizing mid-sequence all land on a coherent frame — and
 * why none of this is expressed as tweens or one-shot enter callbacks.
 */

export interface Keyframe {
  at: number
  value: number
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t)
}

export function sampleCurve(keys: readonly Keyframe[], x: number): number {
  const first = keys[0]
  const last = keys[keys.length - 1]
  if (x <= first.at) return first.value
  if (x >= last.at) return last.value

  for (let i = 1; i < keys.length; i += 1) {
    const b = keys[i]
    if (x > b.at) continue
    const a = keys[i - 1]
    const span = b.at - a.at
    const t = span <= 1e-6 ? 1 : smoothstep((x - a.at) / span)
    return a.value + (b.value - a.value) * t
  }

  return last.value
}

/**
 * Emergence, as a 0-1 fraction between fully submerged and fully clear.
 *
 * The long hold at 1 from 0.34 onward is the beauty shot: phase 3 is meant
 * to be somewhere the viewer can stop and look, so the logo stops climbing
 * well before the camera finishes moving.
 */
export const RISE_CURVE: readonly Keyframe[] = [
  { at: 0.0, value: 0.0 },
  // Phase 1 holds almost still: the emblem is present but has not begun
  // rising, so the opening builds pressure rather than starting the event.
  { at: 0.1, value: 0.07 },
  // The breach itself. Slower through the waterline, then decisive —
  // a heavy object being released upward, not a light one popping out.
  { at: 0.18, value: 0.3 },
  { at: 0.24, value: 0.72 },
  { at: 0.3, value: 0.94 },
  { at: 0.35, value: 1.0 },
  { at: 1.0, value: 1.0 },
]

/** A few degrees of backward lean underwater, settling upright on reveal. */
export const PITCH_CURVE: readonly Keyframe[] = [
  // Backward lean while submerged reads as an object resting on the
  // bottom. It is gone by the time the mark has to be recognisable.
  { at: 0.0, value: -0.128 },
  { at: 0.3, value: -0.03 },
  { at: 0.4, value: 0.0 },
  { at: 1.0, value: 0.0 },
]

/**
 * Master yaw. Deliberately almost nothing.
 *
 * This curve used to settle at -0.16 rad while the camera sat at +0.42,
 * and those do not cancel — they compound, because rotating the mark away
 * from a camera that has already moved off-axis adds to the relative
 * angle. The effective presentation was 33 degrees, and at 33 degrees the
 * emblem stops reading as WS: the left arm foreshortens, the embedded S
 * closes up, and the right stroke detaches into an unrelated slash.
 *
 * A logo is not a product that needs a three-quarter hero angle. Its
 * silhouette is the asset. Depth is carried by bevels, sidewall
 * highlights, reflection, proximity, and — above all — the split, which is
 * where the three-dimensionality is supposed to be spent.
 *
 * Held at zero through every intact phase, so the effective angle is
 * whatever the camera alone contributes and nothing more.
 */
export const YAW_CURVE: readonly Keyframe[] = [
  { at: 0.0, value: 0.0 },
  { at: 0.78, value: 0.0 },
  // A few degrees only, and only once the mark is already opening.
  { at: 1.0, value: 0.04 },
]

/**
 * How far the two halves have opened, 0 to 1.
 *
 * Starts at 0.78, while the emblem is still around half the frame and
 * completely comprehensible. In playback the previous timing read as two
 * slabs sliding apart rather than as a mark opening, because by the time
 * any separation was visible the camera was already on top of it and the
 * WS was no longer legible. The viewer has to see a whole mark first for
 * the opening to mean anything.
 */
export const SPLIT_CURVE: readonly Keyframe[] = [
  { at: 0.0, value: 0.0 },
  { at: 0.78, value: 0.0 },
  { at: 0.86, value: 0.42 },
  { at: 0.93, value: 1.0 },
  { at: 1.0, value: 1.0 },
]

export function riseFraction(progress: number): number {
  return sampleCurve(RISE_CURVE, progress)
}

/** World Y of the rig origin — i.e. of the emblem's measured centre. */
export function riseToWorldY(fraction: number, metrics: LogoMetrics): number {
  return (
    metrics.submergedRiseY +
    (metrics.emergedRiseY - metrics.submergedRiseY) * fraction
  )
}

/**
 * Rig height that puts the emblem at an exact fraction of submersion.
 *
 * The debug presets use this rather than inverting the rise curve: the
 * curve maps onto a travel range that includes clearance above and below
 * the surface, so "50%" through it is not 50% submerged. Milestone 3 is
 * about validating stated submersion values, so the stated value has to
 * be the real one.
 */
export function riseYForSubmersion(
  submersion: number,
  metrics: LogoMetrics,
  waterLevel: number,
): number {
  return waterLevel + metrics.height * (0.5 - submersion)
}

export interface CameraState {
  distance: number
  height: number
  azimuth: number
  targetY: number
}

export function sampleCamera(progress: number): CameraState {
  const keys = CAMERA.keys
  const first = keys[0]
  const last = keys[keys.length - 1]

  if (progress <= first.at) return { ...first }
  if (progress >= last.at) return { ...last }

  for (let i = 1; i < keys.length; i += 1) {
    const b = keys[i]
    if (progress > b.at) continue
    const a = keys[i - 1]
    const span = b.at - a.at
    const t = span <= 1e-6 ? 1 : smoothstep((progress - a.at) / span)
    return {
      distance: a.distance + (b.distance - a.distance) * t,
      height: a.height + (b.height - a.height) * t,
      azimuth: a.azimuth + (b.azimuth - a.azimuth) * t,
      targetY: a.targetY + (b.targetY - a.targetY) * t,
    }
  }

  return { ...last }
}

export function cameraPositionFrom(state: CameraState, out: Vector3): Vector3 {
  return out.set(
    Math.sin(state.azimuth) * state.distance,
    state.height,
    Math.cos(state.azimuth) * state.distance,
  )
}
