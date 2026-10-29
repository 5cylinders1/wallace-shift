/** Placing lat/lng on the estimator's square Web Mercator frame. */

import type { LatLng, LawnFrame } from './types'

export type Px = [number, number]

const rad = (deg: number) => (deg * Math.PI) / 180
const mercY = (lat: number) => Math.log(Math.tan(Math.PI / 4 + rad(lat) / 2))
const EARTH_RADIUS = 6_378_137

/** Projects into a `size`-pixel square over the frame (the analysis grid or the screen). */
export function projector(frame: LawnFrame, size: number) {
  // Half the frame, in Mercator radians: ground metres widened by 1/cos(lat).
  const half = frame.viewM / 2 / Math.cos(rad(frame.center.lat)) / EARTH_RADIUS
  const y0 = mercY(frame.center.lat)
  const scale = size / 2 / half
  return {
    toPx: (point: LatLng): Px => [size / 2 + (rad(point.lng) - rad(frame.center.lng)) * scale, size / 2 - (mercY(point.lat) - y0) * scale],
    /** Ground metres per pixel; constant enough over one lot. */
    metersPerPx: frame.viewM / size,
  }
}

/** Even–odd scanline fill: calls `set` for every pixel whose center is inside. */
export function fillRing(ring: Px[], size: number, set: (index: number) => void): void {
  let top = size
  let bottom = -1
  for (const [, y] of ring) {
    top = Math.min(top, y)
    bottom = Math.max(bottom, y)
  }
  const from = Math.max(0, Math.floor(top))
  const to = Math.min(size - 1, Math.ceil(bottom))
  const crossings: number[] = []
  for (let row = from; row <= to; row += 1) {
    const y = row + 0.5
    crossings.length = 0
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
      const [xi, yi] = ring[i]
      const [xj, yj] = ring[j]
      if (yi > y !== yj > y) crossings.push(xi + ((y - yi) / (yj - yi)) * (xj - xi))
    }
    crossings.sort((a, b) => a - b)
    for (let k = 0; k + 1 < crossings.length; k += 2) {
      const start = Math.max(0, Math.ceil(crossings[k] - 0.5))
      const end = Math.min(size - 1, Math.floor(crossings[k + 1] - 0.5))
      for (let x = start; x <= end; x += 1) set(row * size + x)
    }
  }
}

/** Squared distance from a point to a ring's edges (0 is not returned for inside: callers fill those). */
export function edgeDistanceSq(x: number, y: number, ring: Px[]): number {
  let best = Infinity
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const [ax, ay] = ring[j]
    const [bx, by] = ring[i]
    const dx = bx - ax
    const dy = by - ay
    const lengthSq = dx * dx + dy * dy
    const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / lengthSq))
    const ex = x - (ax + t * dx)
    const ey = y - (ay + t * dy)
    best = Math.min(best, ex * ex + ey * ey)
  }
  return best
}
