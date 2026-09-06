import { Vector3 } from 'three'

/**
 * Five authored compositions.
 *
 * These are the shot, and the path is built to serve them — not the other
 * way round. The previous camera was derived from a corridor that had been
 * validated for clearance, and it showed: collision-safe, and visually a
 * lunge. A valid corridor is not a cinematic move.
 *
 * Each pose is a position and a look target in world space, chosen for
 * what it frames. Distances come from the framing maths rather than from
 * taste: with a 32-degree vertical field of view, the frame at distance d
 * on a 16:9 viewport is 0.5735 * d * aspect wide, so the emblem's 2.0
 * units of width fill a given fraction of frame at exactly one distance.
 *
 * The emblem sits centred at world (0, 0.565, 0), spans X +/-1.0, and its
 * passage corridor is at (0.28, 0.906) — see PASSAGE in cameraPath.ts.
 */

export interface CameraPose {
  name: string
  /**
   * Whether this pose stands off the emblem (and so must be re-framed for
   * narrow viewports) or sits on the passage corridor (where its position
   * is set by clearance and must not be moved).
   */
  kind: 'standoff' | 'corridor'
  /**
   * Intended narrative progress, for reference and review only.
   *
   * The progress a pose is actually reached at is derived from the speed
   * profile and its own arc length — see `poseProgress` on the journey.
   * Anchoring poses to chosen progress values is what produced a
   * non-monotone velocity curve in the first place.
   */
  at: number
  position: Vector3
  target: Vector3
  /** What this pose is for, in one line. Shown in the debug overlay. */
  note: string
}

/** Frame width in world units at a given distance and aspect. */
export function frameWidthAt(distance: number, aspect: number, fovDeg = 32) {
  return 2 * distance * Math.tan((fovDeg * Math.PI) / 360) * aspect
}

/** What fraction of the frame's width the emblem covers at a distance. */
export function logoCoverage(distance: number, aspect = 16 / 9) {
  return 2.0 / frameWidthAt(distance, aspect)
}

const polar = (distance: number, azimuth: number, height: number) =>
  new Vector3(
    Math.sin(azimuth) * distance,
    height,
    Math.cos(azimuth) * distance,
  )

/** Corridor centre in world space at a given depth along it. */
const corridor = (z: number) => new Vector3(0.28, 0.906, z)

export const POSES: CameraPose[] = [
  {
    name: 'BEAUTY',
    kind: 'standoff',
    at: 0.46,
    // 5.6 units puts the emblem at ~35% of a 16:9 frame.
    position: polar(5.6, 0.075, 0.60),
    target: new Vector3(0, 0.57, 0),
    note: '35% width, 4.3deg effective, complete WS legible, S readable',
  },
  {
    name: 'ACTIVATION',
    kind: 'standoff',
    at: 0.72,
    // Barely closer. The arc swings back across the mark rather than
    // simply dollying in, so the move registers as parallax rather than
    // as zoom — the whole mark stays readable.
    position: polar(5.05, 0.062, 0.60),
    target: new Vector3(0, 0.575, 0),
    note: 'activation: barely closer, no lateral swing, seam defines itself'
  },
  {
    name: 'ATTRACTION',
    kind: 'standoff',
    at: 0.86,
    // ~50% width. Far enough back that the viewer watches the mark open
    // as a mark, which is the beat the old path skipped entirely.
    position: polar(4.05, 0.05, 0.63),
    target: new Vector3(0.06, 0.60, 0),
    note: 'attraction: ~48% width, front silhouette still fully readable',
  },
  {
    name: 'APERTURE',
    kind: 'corridor',
    at: 0.945,
    // On the corridor axis and far enough out that the frame is narrower
    // than the emblem: metal fills both edges, opening centred.
    position: corridor(1.05),
    target: corridor(0.2),
    note: 'metal fills both edges, aperture centred, destination faint',
  },
  {
    name: 'EXIT',
    kind: 'corridor',
    at: 1.0,
    position: corridor(-1.05),
    target: new Vector3(0.22, 0.89, -3.6),
    note: 'through the mark, destination revealed spatially',
  },
]

/**
 * Distance multiplier that keeps the emblem inside a narrow frame.
 *
 * Applied when the journey is built rather than to the sampled position,
 * because scaling a point on a spline radially deforms the authored path.
 * Corridor poses are exempt: their placement comes from measured clearance
 * and pulling them back would walk the camera out of the passage.
 *
 * Returns 1 for any landscape viewport, so desktop is untouched.
 */
export function standoffFit(distance: number, aspect: number): number {
  const coverage = frameWidthAt(distance, aspect)
  if (coverage <= 0) return 1

  const towardPortrait = Math.min(
    1,
    Math.max(0, (1.3 - aspect) / (1.3 - 0.5)),
  )
  // Portrait wants the mark filling more of the width, not the same airy
  // landscape composition shrunk into a column.
  const fraction = 0.62 + (0.9 - 0.62) * towardPortrait
  return Math.max(1, 2.0 / fraction / coverage)
}

export const POSE_BY_NAME = Object.fromEntries(
  POSES.map((pose) => [pose.name, pose]),
) as Record<string, CameraPose>
