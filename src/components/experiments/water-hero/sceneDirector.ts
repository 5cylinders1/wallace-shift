/** Direction B: one set of authored beats for camera, object and medium. */
export interface DescentPose {
  at: number
  name: string
  logoY: number
  yaw: number
  pitch: number
  camera: readonly [number, number, number]
}

export const TURN_END = .80
export const SPLIT_START = .82
export const SPLIT_END = .98
export const SUBMERGED_STANDOFF = 2.8

export const DESCENT_POSES: readonly DescentPose[] = [
  // The measured 1.098-unit mark intersects water by .009 at rest.
  // This anchors its reflection and activates the existing contact system.
  { at: 0, name: 'Identity', logoY: .54, yaw: 0, pitch: 0, camera: [0, .10, 7.9] },
  { at: .14, name: 'Connection', logoY: .54, yaw: 0, pitch: 0, camera: [0, .10, 7.8] },
  { at: .25, name: 'Commitment', logoY: .54, yaw: 0, pitch: 0, camera: [.03, .10, 7.6] },
  { at: .35, name: 'Contact', logoY: .28, yaw: 0, pitch: 0, camera: [.12, .14, 5.7] },
  { at: .43, name: 'Crossing', logoY: -.62, yaw: 0, pitch: 0, camera: [.24, .10, 4.3] },
  { at: .54, name: 'Below the surface', logoY: -1.5, yaw: 35, pitch: 0, camera: [.32, -.95, 3.9] },
  { at: .68, name: 'A different angle', logoY: -2.8, yaw: 125, pitch: 0, camera: [.45, -2.25, 3.9] },
  { at: TURN_END, name: 'Half turn', logoY: -4.15, yaw: 180, pitch: 0, camera: [0, -4.15, 4.55] },
  { at: SPLIT_START, name: 'Opening the mark', logoY: -4.15, yaw: 180, pitch: 0, camera: [0, -4.15, 4.55] },
  { at: SPLIT_END, name: 'A Different Perspective', logoY: -4.15, yaw: 180, pitch: 0, camera: [0, -4.15, 4.55] },
  { at: 1, name: 'A Different Perspective', logoY: -4.15, yaw: 180, pitch: 0, camera: [0, -4.15, 4.55] },
]

export function smoothRange(start: number, end: number, value: number): number {
  const t = Math.min(1, Math.max(0, (value - start) / (end - start)))
  return t * t * (3 - 2 * t)
}

/** Shape-preserving Hermite interpolation: shared beat timing, no overshoot.
 * Slopes continue across moving beats and become zero at authored holds.
 * No arc-length remapping can move a camera pose away from its logo pose. */
function channel(progress: number, read: (pose: DescentPose) => number): number {
  const keys = DESCENT_POSES
  const p = Math.min(1, Math.max(0, progress))
  let i = 0
  while (i < keys.length - 2 && p > keys[i + 1].at) i++
  const a = keys[i], b = keys[i + 1]
  const span = b.at - a.at
  const slope = (j: number) => (read(keys[j + 1]) - read(keys[j])) / (keys[j + 1].at - keys[j].at)
  const tangent = (j: number) => {
    if (j === 0 || j === keys.length - 1) return 0
    const before = slope(j - 1), after = slope(j)
    if (before * after <= 0) return 0
    const h0 = keys[j].at - keys[j - 1].at, h1 = keys[j + 1].at - keys[j].at
    const w0 = 2 * h1 + h0, w1 = h1 + 2 * h0
    return (w0 + w1) / (w0 / before + w1 / after)
  }
  const t = (p - a.at) / span, t2 = t * t, t3 = t2 * t
  return (2*t3-3*t2+1)*read(a) + (t3-2*t2+t)*span*tangent(i)
    + (-2*t3+3*t2)*read(b) + (t3-t2)*span*tangent(i+1)
}

export function sampleDescent(progress: number, aspect = 16 / 9) {
  const p = Math.min(1, Math.max(0, progress))
  const logoY = p <= .25 ? DESCENT_POSES[0].logoY : channel(p, key => key.logoY)
  const authoredZ = channel(p, key => key.camera[2])
  // Portrait receives a constant standoff offset, preserving camera velocity.
  // Keep camera height unchanged so
  // the medium crossing happens at the same beat in every viewport.
  const portraitDistance = 2 / (2 * Math.tan(16 * Math.PI / 180) * Math.max(aspect, .25) * .72)
  // The wider opening matches the production hero on desktop. Portrait
  // keeps the mark legible, then joins the same underwater framing smoothly.
  const portraitOpening = (1 - smoothRange(.55, .95, aspect))
    * (1 - smoothRange(.25, .54, p)) * (authoredZ - 3.8)
  // Widen only after contact. An independent smooth offset preserves the
  // accepted approach and crossing curve while giving suspended matter room.
  // Narrow viewports need more distance to retain the same lateral breathing room.
  const submergedStandoff = SUBMERGED_STANDOFF * Math.max(1, .9 / Math.max(aspect, .25))
    * smoothRange(.43, .54, p)
  const z = authoredZ + Math.max(0, portraitDistance - 3.8) - portraitOpening + submergedStandoff
  const camera: [number, number, number] = [
    channel(p, key => key.camera[0]) * z / authoredZ,
    channel(p, key => key.camera[1]), z,
  ]
  // Hold the exact responsive opening composition through the shared reveal.
  // Retain the original authored path, then release this camera-only offset
  // over .25–.35. A smooth join avoids a jump to the old .25 pose and leaves
  // the established contact/crossing/turn/split curves untouched from .35 on.
  const openingRelease = smoothRange(.25, .35, p)
  if (openingRelease < 1) {
    const opening = DESCENT_POSES[0].camera
    const openingZ = opening[2] + Math.max(0, portraitDistance - 3.8)
      - (1 - smoothRange(.55, .95, aspect)) * (opening[2] - 3.8)
    camera[0] = opening[0] + (camera[0] - opening[0]) * openingRelease
    camera[1] = opening[1] + (camera[1] - opening[1]) * openingRelease
    camera[2] = openingZ + (camera[2] - openingZ) * openingRelease
  }
  const phase = [...DESCENT_POSES].reverse().find(pose => p >= pose.at)?.name ?? 'Identity'
  return {
    progress: p, phase, logoY, camera,
    target: [0, logoY, 0] as [number, number, number],
    // The half turn finishes before the two visible sides part horizontally.
    yaw: channel(p, key => key.yaw) * Math.PI / 180,
    pitch: channel(p, key => key.pitch) * Math.PI / 180,
    underwater: 1 - smoothRange(-.12, .08, camera[1]),
    tension: smoothRange(.14, .25, p) * (1 - smoothRange(.32, .44, p)),
    particles: smoothRange(.50, .62, p) * (1 - .78 * smoothRange(.86, 1, p)),
    particleDepth: .35 * smoothRange(.80, 1, p),
    split: smoothRange(SPLIT_START, SPLIT_END, p),
    extinction: 0,
    edgeLight: 0,
    shimmerLight: 1,
    lightLevel: 1,
    blackout: 0,
  }
}
