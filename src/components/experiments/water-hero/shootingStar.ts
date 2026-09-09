/** One brief, world-angular meteor at a time. The mutable state is reused by
 * the sky frame loop; randomness is seeded once when its resources mount. */
export const SHOOTING_STAR = { minWait: 12, maxWait: 25, maxFrameGap: .5 } as const

export interface ShootingStarState {
  random: number
  lastTime: number
  nextAt: number
  startedAt: number
  duration: number
  travel: number
  tail: number
  progress: number
  gain: number
  events: number
  start: [number, number, number]
  tangent: [number, number, number]
}

export function createShootingStarState(seed: number): ShootingStarState {
  return { random: seed >>> 0, lastTime: NaN, nextAt: Infinity, startedAt: Infinity,
    duration: 1, travel: .2, tail: .07, progress: 0, gain: 0, events: 0,
    start: [0, .3, -.954], tangent: [1, 0, 0] }
}

function random(state: ShootingStarState) {
  state.random = (Math.imul(state.random, 1664525) + 1013904223) >>> 0
  return state.random / 4294967296
}

function wait(state: ShootingStarState) {
  return SHOOTING_STAR.minWait + random(state) * (SHOOTING_STAR.maxWait - SHOOTING_STAR.minWait)
}

export function resetShootingStar(state: ShootingStarState) {
  state.lastTime = NaN
  state.nextAt = state.startedAt = Infinity
  state.progress = state.gain = 0
}

function smooth(a: number, b: number, value: number) {
  const t = Math.max(0, Math.min(1, (value - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

function begin(state: ShootingStarState, now: number, aspect: number) {
  // Some paths occupy the opening sky; others reward the upward glance.
  // Limit azimuth on narrow screens without making the path camera-relative.
  const halfWidth = Math.min(.34, Math.atan(Math.tan(16 * Math.PI / 180) * Math.max(.25, aspect)) * .72)
  const azimuth = (random(state) * 2 - 1) * halfWidth
  const elevation = (random(state) < .55 ? 12 + random(state) * 5 : 24 + random(state) * 10) * Math.PI / 180
  const descent = .24 + random(state) * .32
  const side = random(state) < .5 ? -1 : 1
  const horizontal = Math.sqrt(1 - descent * descent) * side
  const sinAz = Math.sin(azimuth), cosAz = Math.cos(azimuth)
  const sinEl = Math.sin(elevation), cosEl = Math.cos(elevation)
  const cx = sinAz * cosEl, cy = sinEl, cz = -cosAz * cosEl
  // East and local-up vectors form the tangent plane of the celestial sphere.
  const tx = horizontal * cosAz + descent * sinAz * sinEl
  const ty = -descent * cosEl
  const tz = horizontal * sinAz - descent * cosAz * sinEl
  state.travel = .16 + random(state) * .10
  state.tail = .055 + random(state) * .030
  state.duration = .85 + random(state) * .30
  const half = state.travel * .5, c = Math.cos(half), s = Math.sin(half)
  state.start[0] = cx * c - tx * s
  state.start[1] = cy * c - ty * s
  state.start[2] = cz * c - tz * s
  state.tangent[0] = cx * s + tx * c
  state.tangent[1] = cy * s + ty * c
  state.tangent[2] = cz * s + tz * c
  state.startedAt = now
  state.nextAt = Infinity
  state.events++
}

/** A visibility loss or suspended clock cancels the event rather than
 * catching up on old meteors. Returning to the sky always waits anew. */
export function advanceShootingStar(state: ShootingStarState, now: number, allowed: boolean, aspect: number) {
  if (!allowed || !Number.isFinite(now)) {
    resetShootingStar(state)
    return
  }
  if (!Number.isFinite(state.lastTime) || now < state.lastTime || now - state.lastTime > SHOOTING_STAR.maxFrameGap) {
    state.startedAt = Infinity
    state.nextAt = now + wait(state)
    state.progress = state.gain = 0
  }
  state.lastTime = now
  if (now >= state.nextAt) begin(state, now, aspect)
  if (!Number.isFinite(state.startedAt)) return
  const age = (now - state.startedAt) / state.duration
  if (age >= 1) {
    state.startedAt = Infinity
    state.nextAt = now + wait(state)
    state.progress = state.gain = 0
    return
  }
  state.progress = Math.max(0, age)
  state.gain = smooth(0, .09, age) * (1 - smooth(.62, 1, age))
}
