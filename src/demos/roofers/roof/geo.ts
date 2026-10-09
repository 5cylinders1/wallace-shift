import type { MapFrame, LatLng } from './types'

/**
 * Placing lat/lng on a web-Mercator image (every static-map provider uses
 * the same 256-pixel world), and small-area geometry for outlines.
 */

const TILE = 256

function worldPixel({ lat, lng }: LatLng, zoom: number): [number, number] {
  const scale = TILE * 2 ** zoom
  const sin = Math.min(Math.max(Math.sin((lat * Math.PI) / 180), -0.9999), 0.9999)
  return [((lng + 180) / 360) * scale, (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale]
}

/** CSS-pixel position of a point on the frame. */
export function toFrame(point: LatLng, frame: MapFrame): [number, number] {
  const [x, y] = worldPixel(point, frame.zoom)
  const [cx, cy] = worldPixel(frame.center, frame.zoom)
  return [x - cx + frame.width / 2, y - cy + frame.height / 2]
}

/** The inverse: a frame pixel back to lat/lng. */
export function fromFrame([px, py]: [number, number], frame: MapFrame): LatLng {
  const scale = TILE * 2 ** frame.zoom
  const [cx, cy] = worldPixel(frame.center, frame.zoom)
  const x = cx + px - frame.width / 2
  const y = cy + py - frame.height / 2
  const lng = (x / scale) * 360 - 180
  const n = Math.PI - (2 * Math.PI * y) / scale
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)))
  return { lat, lng }
}

/** Metres per CSS pixel at the frame's centre. */
export const metersPerPixel = (frame: MapFrame) =>
  (156543.03392 * Math.cos((frame.center.lat * Math.PI) / 180)) / 2 ** frame.zoom

export function ringCentroid(ring: Array<[number, number]>): [number, number] {
  let a = 0
  let cx = 0
  let cy = 0
  for (let i = 0; i < ring.length; i += 1) {
    const [x1, y1] = ring[i]
    const [x2, y2] = ring[(i + 1) % ring.length]
    const cross = x1 * y2 - x2 * y1
    a += cross
    cx += (x1 + x2) * cross
    cy += (y1 + y2) * cross
  }
  if (Math.abs(a) < 1e-9) return ring[0]
  return [cx / (3 * a), cy / (3 * a)]
}
