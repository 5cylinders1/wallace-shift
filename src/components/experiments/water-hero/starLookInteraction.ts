/** Passive overscroll intent; scroll positions alone never create a lift. */
export const STAR_LOOK_QUIET_MS = 150
export const STAR_LOOK_ELEVATION = 25 * Math.PI / 180

export interface StarLookState {
  lift: number
  velocity: number
  target: number
  upwardPixels: number
  lastUpMs: number
  fastReturn: boolean
}

export function createStarLookState(): StarLookState {
  return { lift: 0, velocity: 0, target: 0, upwardPixels: 0, lastUpMs: -Infinity, fastReturn: false }
}

export function wheelPixels(delta: number, mode: number, viewportHeight: number): number {
  if (!Number.isFinite(delta)) return 0
  const pixels = delta * (mode === 1 ? 16 : mode === 2 ? viewportHeight : 1)
  return Math.max(-160, Math.min(160, pixels))
}

export function releaseStarLook(state: StarLookState, fast = false): StarLookState {
  return { ...state, target: 0, upwardPixels: 0, lastUpMs: -Infinity, fastReturn: fast }
}

/** Negative pixels mean an attempt to scroll toward the top of the page. */
export function inputStarLook(
  state: StarLookState,
  pixels: number,
  nowMs: number,
  eligible: boolean,
  trusted: boolean,
): StarLookState {
  if (!trusted || !Number.isFinite(pixels) || !Number.isFinite(nowMs)) return state
  if (pixels > 0) return releaseStarLook(state, true)
  if (!eligible || pixels >= -0.5) return state
  const continued = nowMs - state.lastUpMs <= STAR_LOOK_QUIET_MS
  const upwardPixels = Math.min(312, (continued ? state.upwardPixels : 0) + Math.min(160, -pixels))
  // Ignore incidental trackpad noise; a sustained gesture builds the view.
  const target = Math.min(1, Math.max(0, (upwardPixels - 12) / 300))
  return { ...state, target, upwardPixels, lastUpMs: nowMs, fastReturn: false }
}

/** Exact critical-damping step, stable across refresh rates and with no
 * timer-driven narrative. Quiet input releases the spring automatically. */
export function advanceStarLook(
  state: StarLookState,
  deltaSeconds: number,
  nowMs: number,
  allowed: boolean,
  atTop: boolean,
): StarLookState {
  if (!allowed) return createStarLookState()
  const quiet = nowMs - state.lastUpMs > STAR_LOOK_QUIET_MS
  const current = quiet || !atTop ? releaseStarLook(state, state.fastReturn || !atTop) : state
  const dt = Math.min(.1, Math.max(0, Number.isFinite(deltaSeconds) ? deltaSeconds : 0))
  const omega = current.target > 0 ? 10 : current.fastReturn ? 16 : 11
  const displacement = current.lift - current.target
  const combined = current.velocity + omega * displacement
  const decay = Math.exp(-omega * dt)
  const lift = current.target + (displacement + combined * dt) * decay
  const velocity = (current.velocity - omega * combined * dt) * decay
  if (current.target === 0 && Math.abs(lift) < .00005 && Math.abs(velocity) < .0005) {
    return createStarLookState()
  }
  return { ...current, lift: Math.max(0, Math.min(1, lift)), velocity: lift < 0 || lift > 1 ? 0 : velocity }
}
