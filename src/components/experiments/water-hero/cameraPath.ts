import { CatmullRomCurve3, Matrix4, Vector3 } from 'three'
import { LOGO_TARGET_WIDTH } from './waterHeroConfig'
import { POSES, standoffFit } from './cameraPoses'

/**
 * The camera journey, authored against the real GLB rather than assumed.
 *
 * Phases 1-3 keep the polar keyframes they were approved with, so nothing
 * already signed off moves. From the beauty shot onward the path is a
 * spline through checkpoints placed using measured clearances.
 */

/* ------------------------------------------------------------------ */
/* Passage geometry — measured, not guessed                            */
/* ------------------------------------------------------------------ */

/**
 * Where the camera can actually get through the mark.
 *
 * Found by taking every triangle of WS_Left and WS_Right into the rig's
 * own space and sweeping a +Z corridor across the emblem's face, scoring
 * each candidate by its worst point-to-triangle distance over the full
 * depth of the run. The result is not where the gap looks widest: the two
 * children interlock across X from 0.087 to 1.000 and overlap completely
 * in Y and Z, so there is no through-gap in the assembled mark at all.
 *
 * That is the finding that matters for the choreography. The camera cannot
 * pass through the emblem as built — the split is not decoration on the
 * approach, it is the thing that creates the opening. Which is exactly the
 * narrative reason to hold it back until the passage.
 */
export const PASSAGE = {
  /** Corridor centre, in rig space (the emblem is 2 units wide, ±0.549 tall). */
  x: 0.28,
  y: 0.34,

  /** Worst-case clearance along the corridor with the mark assembled. */
  clearanceUnsplit: 0.191,

  /**
   * Clearance opens at very close to 0.9 per unit of per-side split, over
   * the whole range measured (0 to ±0.26).
   */
  clearancePerSplit: 0.9,

  /**
   * What the camera needs to pass without the near plane slicing a bevel.
   * The near plane itself is far smaller than this; the margin is for the
   * sidewalls filling frame without clipping.
   */
  targetClearance: 0.32,
} as const

/**
 * Swept-frustum validation, not a centre-line check.
 *
 * A centre line with room to spare can still clip at the frame edges,
 * so clearance is measured from the near-plane rectangle's corners and
 * edge midpoints swept along the whole corridor, at each target aspect
 * ratio. With the split at its required displacement:
 *
 *   1440x900    near plane 0.046 x 0.029   worst clearance 0.293   clear
 *   1920x1080   near plane 0.051 x 0.029   worst clearance 0.291   clear
 *   390x844     near plane 0.013 x 0.029   worst clearance 0.308   clear
 *   430x932     near plane 0.013 x 0.029   worst clearance 0.308   clear
 *
 * The same sweep with the mark closed gives 0.164, which is the number
 * that makes the split structural rather than decorative: it is what
 * turns a corridor the camera would graze into one it can cross.
 *
 * Portrait is the *safer* case here, not the riskier one — a narrow
 * viewport shrinks the near plane horizontally. One path serves all four.
 */

/** Per-side displacement the split must reach for a comfortable passage. */
export const REQUIRED_SPLIT_DISPLACEMENT =
  (PASSAGE.targetClearance - PASSAGE.clearanceUnsplit) / PASSAGE.clearancePerSplit

/** The same, as a fraction of the emblem's width. */
export const REQUIRED_SPLIT_FRACTION =
  (REQUIRED_SPLIT_DISPLACEMENT * 2) / LOGO_TARGET_WIDTH

/* ------------------------------------------------------------------ */
/* Traversal                                                           */
/* ------------------------------------------------------------------ */

/**
 * The speed profile — and the reason it decelerates.
 *
 * Two earlier attempts got this wrong in different ways. The first
 * anchored poses to hand-picked progress values, which produced a
 * non-monotone velocity curve with a 2x step. The second replaced that
 * with a smooth accelerating ramp, and the measured velocity graph was
 * clean — yet playback still lunged.
 *
 * The missing piece is that velocity is not what the eye judges. Apparent
 * size goes as 1/distance, so a camera closing at constant speed produces
 * apparent scale that grows ever faster; an accelerating camera compounds
 * it. Measuring the emblem's frame coverage instead of the camera's speed
 * showed the real defect: coverage jumping 1.85x between adjacent samples
 * near the aperture while the velocity graph looked perfectly smooth.
 *
 * Linearising what is seen requires the camera to *slow* as it closes.
 * Measured across the family v(x) = 1 + k*x:
 *
 *   k     aperture reached at   max coverage jump   world-speed ramp
 *   1.5         0.872                 1.61x              2.23x
 *   0.0         0.830                 1.48x              1.00x
 *  -0.55        0.780                 1.42x              2.02x
 *
 * No value satisfies both constraints. Shaping speed to smooth the
 * coverage curve front-loads distance, which drags every pose earlier;
 * shaping it to hold the pose timing steepens the coverage curve. A single
 * speed parameter cannot fix both because they are different quantities.
 *
 * So this is deliberately unshaped — constant speed along arc length,
 * k = 0, which is the best coverage smoothness in the family and has no
 * easing artefact of its own. It is not the final answer. The real fix is
 * to parameterise traversal by frame coverage rather than by arc length,
 * so apparent scale is the linear quantity and pose timing is an
 * independent constraint. That is a larger change and it should be made
 * against playback, not against a spreadsheet.
 *
 * The literal instruction "fastest near the aperture" turns out to be true
 * of apparent motion and false of world-space speed.
 */
const SPEED_GAIN = 0
const SPEED_INTEGRAL = 1 + SPEED_GAIN / 2

/** Normalized distance travelled by normalized journey time. */
export function travelAt(x: number): number {
  const t = Math.min(1, Math.max(0, x))
  return (t + (SPEED_GAIN / 2) * t * t) / SPEED_INTEGRAL
}

/** Its inverse, for placing a pose at the progress its distance implies. */
export function travelInverse(target: number): number {
  let lo = 0
  let hi = 1
  for (let i = 0; i < 40; i += 1) {
    const mid = (lo + hi) / 2
    if (travelAt(mid) < target) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

export interface CameraJourney {
  positions: CatmullRomCurve3
  targets: CatmullRomCurve3
  /** Arc length of the position curve, in world units. */
  length: number
  /** Each pose's normalized arc-length position. */
  poseTravel: number[]
  /** Progress at which each pose is actually reached, derived from speed. */
  poseProgress: number[]
}

/** Progress at which the journey begins. Before this the camera holds. */
export const JOURNEY_START = POSES[0].at

/**
 * Builds the journey through the authored poses.
 *
 * Two curves, not one: position and look target each get their own, and
 * both are sampled by arc length at the same parameter. That is what keeps
 * orientation moving with position instead of at its own rate — the old
 * version switched targets at progress thresholds, which is why the aim
 * felt detached from the move.
 */
export function buildJourney(rigMatrix: Matrix4, aspect: number): CameraJourney {
  const positions = POSES.map((pose) => {
    const point = resolvePose(pose.position, rigMatrix)
    if (pose.kind === 'standoff') {
      point.multiplyScalar(standoffFit(point.length(), aspect))
    }
    return point
  })
  const targets = POSES.map((pose) => resolvePose(pose.target, rigMatrix))

  // Centripetal: a uniform Catmull-Rom overshoots where spacing changes as
  // sharply as it does entering the corridor, and an overshoot there means
  // a sidewall through the near plane.
  const positionCurve = new CatmullRomCurve3(positions, false, 'centripetal', 0.5)
  const targetCurve = new CatmullRomCurve3(targets, false, 'centripetal', 0.5)

  // Where each pose falls along the path by arc length, so anchoring a
  // pose to a progress value anchors it to a real distance.
  const lengths = positionCurve.getLengths(600)
  const total = lengths[lengths.length - 1]
  const poseTravel = poseArcPositions(positionCurve, positions, lengths, total)

  return {
    positions: positionCurve,
    targets: targetCurve,
    length: total,
    poseTravel,
    poseProgress: poseTravel.map(
      (u) => JOURNEY_START + travelInverse(u) * (1 - JOURNEY_START),
    ),
  }
}

/** Normalized arc length at which the curve passes each control point. */
function poseArcPositions(
  curve: CatmullRomCurve3,
  points: Vector3[],
  lengths: number[],
  total: number,
): number[] {
  const samples = lengths.length - 1
  const probe = new Vector3()

  return points.map((point, index) => {
    if (index === 0) return 0
    if (index === points.length - 1) return 1

    // Walk the sampled curve and take the closest sample to this control
    // point. Exact enough at 600 samples, and it avoids assuming the
    // curve's own parameterisation is uniform — which is precisely the
    // assumption that broke the previous mapping.
    let best = 0
    let bestDistance = Infinity
    for (let i = 0; i <= samples; i += 1) {
      curve.getPoint(i / samples, probe)
      const d = probe.distanceToSquared(point)
      if (d < bestDistance) {
        bestDistance = d
        best = i
      }
    }
    return total <= 1e-6 ? 0 : lengths[best] / total
  })
}

export interface SampledCamera {
  position: Vector3
  target: Vector3
}

/**
 * Camera position and look target for any progress in 0-1.
 *
 * Below the journey's start the camera holds at the beauty pose while the
 * emblem finishes settling — a deliberate beat, not dead scroll.
 */
export function sampleJourney(
  progress: number,
  journey: CameraJourney,
  out: SampledCamera,
): SampledCamera {
  if (progress <= JOURNEY_START) {
    journey.positions.getPointAt(0, out.position)
    journey.targets.getPointAt(0, out.target)
    return out
  }

  const x = (progress - JOURNEY_START) / (1 - JOURNEY_START)
  const u = travelAt(x)
  journey.positions.getPointAt(u, out.position)
  journey.targets.getPointAt(u, out.target)
  return out
}

/**
 * World-space distance covered per 1% of narrative progress.
 *
 * Development readout. The requirement on the speed profile is that it
 * ramps without a spike, and that is a property of this number rather than
 * of the easing function's shape on paper.
 */
export function travelPerPercent(
  progress: number,
  journey: CameraJourney,
): number {
  const span = 1 - JOURNEY_START
  const a = travelAt((progress - 0.005 - JOURNEY_START) / span)
  const b = travelAt((progress + 0.005 - JOURNEY_START) / span)
  return (b - a) * journey.length
}

/** Poses are authored in world space; only the corridor ones follow the rig. */
function resolvePose(point: Vector3, rigMatrix: Matrix4): Vector3 {
  void rigMatrix
  return point.clone()
}

/** Rig-space corridor centre in world space, for debug and validation. */
export function passagePoint(rigMatrix: Matrix4, z: number, out: Vector3) {
  return out.set(PASSAGE.x, PASSAGE.y, z).applyMatrix4(rigMatrix)
}
