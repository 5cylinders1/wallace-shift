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

export function pointInRing([x, y]: [number, number], ring: Array<[number, number]>): boolean {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

/**
 * A point inside a building outline, for a measuring pin: the centroid when
 * it falls inside (most houses), otherwise the first point inside on the
 * way from the centroid to a corner (an L- or U-shaped house).
 */
export function insidePoint(ring: LatLng[], frame: MapFrame): LatLng | null {
  const points = ring.map((point) => toFrame(point, frame))
  const [cx, cy] = ringCentroid(points)
  if (pointInRing([cx, cy], points)) return fromFrame([cx, cy], frame)
  for (const [vx, vy] of points) {
    for (const t of [0.5, 0.75, 0.9]) {
      const candidate: [number, number] = [cx + (vx - cx) * t, cy + (vy - cy) * t]
      if (pointInRing(candidate, points)) return fromFrame(candidate, frame)
    }
  }
  return null
}

/** The outline a point falls in, if any. */
export function buildingAt<T extends { ring: LatLng[] }>(point: LatLng, buildings: T[], frame: MapFrame): T | null {
  const xy = toFrame(point, frame)
  return buildings.find((building) => pointInRing(xy, building.ring.map((p) => toFrame(p, frame)))) ?? null
}

const EARTH_RADIUS_M = 6_378_137

/** The point `meters` away from `from` on a compass heading (0 north, 90 east). */
export function offsetPoint(from: LatLng, meters: number, headingDeg: number): LatLng {
  const heading = (headingDeg * Math.PI) / 180
  const north = meters * Math.cos(heading)
  const east = meters * Math.sin(heading)
  return {
    lat: from.lat + (north / EARTH_RADIUS_M) * (180 / Math.PI),
    lng: from.lng + (east / (EARTH_RADIUS_M * Math.cos((from.lat * Math.PI) / 180))) * (180 / Math.PI),
  }
}

/**
 * A solar panel's four corners on the ground, as Google's own Solar API
 * sample draws them: the panel's half-width and half-height (portrait
 * dimensions) turned by its orientation and the compass direction of the
 * roof face it sits on.
 */
export function panelCorners(
  panel: { center: LatLng; portrait: boolean; azimuth: number },
  widthM: number,
  heightM: number,
): LatLng[] {
  const w = widthM / 2
  const h = heightM / 2
  const turn = (panel.portrait ? 90 : 0) + panel.azimuth
  return [
    [w, h],
    [w, -h],
    [-w, -h],
    [-w, h],
  ].map(([x, y]) => offsetPoint(panel.center, Math.hypot(x, y), (Math.atan2(y, x) * 180) / Math.PI + turn))
}

const COMPASS = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west']

/** Which way `to` lies from `from`, as one of eight compass words. */
export function compassFrom(from: LatLng, to: LatLng): string {
  const east = (to.lng - from.lng) * Math.cos((from.lat * Math.PI) / 180)
  const north = to.lat - from.lat
  const degrees = ((Math.atan2(east, north) * 180) / Math.PI + 360) % 360
  return COMPASS[Math.round(degrees / 45) % 8]
}

/** The plain average of a ring's points: good enough to say which way a building lies. */
export function ringMiddle(ring: LatLng[]): LatLng {
  return { lat: ring.reduce((sum, p) => sum + p.lat, 0) / ring.length, lng: ring.reduce((sum, p) => sum + p.lng, 0) / ring.length }
}
