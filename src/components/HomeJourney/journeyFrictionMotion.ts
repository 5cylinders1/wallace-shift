/** How far the docked mark climbs during Launch, as a share of the open
 * stage. This module stays free of imports so its trajectory contracts can
 * be exercised on their own. */
export const ASCENT_RISE = .22

/** Ambient motion is local to Find. Scroll owns the wipe, capture, docking
 * and the Launch climb. */
export interface FrictionMotionInput {
  time: number
  width: number
  height: number
  headerOffset: number
  baseX: number
  baseY: number
  logoWidth: number
  logoHeight: number
  copyRight: number
  copyBottom: number
  findWipe: number
  makeWipe: number
  makeEdge: number
  dock: number
  retire: number
  rise: number
}

const clamp = (n: number, low = 0, high = 1) => Math.max(low, Math.min(high, Number.isFinite(n) ? n : low))
const mix = (a: number, b: number, t: number) => a + (b - a) * t

export function createJourneyFrictionMotion() {
  let x = 0, y = 0, vx = 160, vy = 104, yaw = .18
  let previousTime: number | null = null
  let previousWidth = 0, previousHeight = 0
  let started = false, frozen = false
  return {
    update(input: FrictionMotionInput) {
      const { width, height, headerOffset, logoWidth, logoHeight } = input
      const radius = logoWidth * .70
      const left = radius + 28, right = Math.max(left, width - radius - 28)
      const top = headerOffset + radius + 8, bottom = Math.max(top, height - radius - 28)
      const obstacleX = Math.min(right, input.copyRight + radius + 28)
      const obstacleY = Math.min(bottom, input.copyBottom + radius + 26)
      if (previousWidth && previousHeight && (width !== previousWidth || height !== previousHeight)) {
        x *= width / previousWidth; y *= height / previousHeight
      }
      previousWidth = width; previousHeight = height
      const delta = previousTime === null ? 0 : clamp(input.time - previousTime, 0, .1)
      previousTime = input.time
      if (input.findWipe < .999 && input.makeWipe === 0) {
        if (started && input.findWipe > .001) {
          // Returning to the blueprint smoothly restores its measured anchor
          // instead of snapping from a random bounce location at the boundary.
          return { x: mix(input.baseX, x, input.findWipe),
            y: mix(input.baseY, y, input.findWipe), yaw: yaw * input.findWipe, rise: 0 }
        }
        started = false; frozen = false
        x = input.baseX; y = input.baseY; yaw = .18
        return { x, y, yaw: .18 * input.findWipe, rise: 0 }
      }
      if (!started) {
        started = true
        x = clamp(input.baseX, left, right); y = clamp(input.baseY, top, bottom)
        vx = width * .135; vy = height * .17
        frozen = input.makeWipe >= 1
      }
      // Capture before integrating this frame, including a fast scroll that
      // skips across the whole logo. Reverse scroll uncovers the same pose.
      if (input.makeWipe > 0 && input.makeEdge * height <= y + logoHeight * .5) frozen = true
      if (input.makeWipe === 0) frozen = false
      if (!frozen && input.retire === 0) {
        const steps = Math.max(1, Math.ceil(delta / .016))
        const dt = delta / steps
        for (let i = 0; i < steps; i++) {
          const oldX = x, oldY = y
          x += vx * dt; y += vy * dt
          if (x < left) { x = left + (left - x); vx = Math.abs(vx) }
          if (x > right) { x = right - (x - right); vx = -Math.abs(vx) }
          if (y < top) { y = top + (top - y); vy = Math.abs(vy) }
          if (y > bottom) { y = bottom - (y - bottom); vy = -Math.abs(vy) }
          // The copy is a solid obstacle. The assembly can roam the full
          // lower stage and the right side without ever passing over it.
          if (x < obstacleX && y < obstacleY) {
            if (oldX >= obstacleX || (oldY < obstacleY && obstacleX - x < obstacleY - y)) {
              x = obstacleX; vx = Math.abs(vx)
            } else { y = obstacleY; vy = Math.abs(vy) }
          }
        }
        yaw = .18 + Math.sin(input.time * .4) * .055
      }
      const dock = input.makeWipe >= 1 ? clamp(input.dock) : 0
      // Leave a generous 8vw (at least 64px) beyond the mark's outer edge.
      // Growth re-solves this every frame, so the climbing mark keeps the
      // same measured inset as it takes up more of the stage.
      const targetX = width - Math.max(64, width * .08) - logoWidth * .5
      const restY = headerOffset + (height - headerOffset) * .5
      // The climb is a share of the open stage, clamped so a large mark can
      // never pass under navigation or leave the panel at the top.
      const rise = Math.min(clamp(input.rise) * (height - headerOffset) * ASCENT_RISE,
        Math.max(0, restY - headerOffset - logoHeight * .5 - 24))
      const retire = clamp(input.retire)
      return {
        x: mix(mix(x, targetX, dock), input.baseX, retire),
        y: mix(mix(y, restY - rise, dock), input.baseY, retire),
        yaw: mix(yaw * (1 - dock), 0, retire),
        rise: rise * dock * (1 - retire),
      }
    },
  }
}
