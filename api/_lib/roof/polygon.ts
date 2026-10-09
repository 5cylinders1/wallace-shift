/**
 * Plane-polygon helpers shared by the roof lookup and the sample-house
 * generator. Every function works in any consistent planar unit: local
 * metres on the server, pixels in the generator.
 */

export type Point = [number, number]

function perpendicularDistance([px, py]: Point, [ax, ay]: Point, [bx, by]: Point): number {
  const dx = bx - ax
  const dy = by - ay
  const length = Math.hypot(dx, dy)
  if (length === 0) return Math.hypot(px - ax, py - ay)
  return Math.abs(dy * px - dx * py + bx * ay - by * ax) / length
}

function simplifyOpen(points: Point[], tolerance: number): Point[] {
  if (points.length < 3) return points.slice()
  let maxDistance = 0
  let index = 0
  for (let i = 1; i < points.length - 1; i += 1) {
    const distance = perpendicularDistance(points[i], points[0], points[points.length - 1])
    if (distance > maxDistance) {
      maxDistance = distance
      index = i
    }
  }
  if (maxDistance <= tolerance) return [points[0], points[points.length - 1]]
  const left = simplifyOpen(points.slice(0, index + 1), tolerance)
  const right = simplifyOpen(points.slice(index), tolerance)
  return [...left.slice(0, -1), ...right]
}

/** Douglas–Peucker for a closed ring, anchored at its two farthest-apart points. */
export function simplifyRing(ring: Point[], tolerance: number): Point[] {
  if (ring.length < 4) return ring.slice()
  let far = 0
  let farDistance = 0
  for (let i = 1; i < ring.length; i += 1) {
    const distance = Math.hypot(ring[i][0] - ring[0][0], ring[i][1] - ring[0][1])
    if (distance > farDistance) {
      farDistance = distance
      far = i
    }
  }
  const first = simplifyOpen(ring.slice(0, far + 1), tolerance)
  const second = simplifyOpen([...ring.slice(far), ring[0]], tolerance)
  return [...first.slice(0, -1), ...second.slice(0, -1)]
}

function lineIntersection(a: Point, b: Point, c: Point, d: Point): Point | null {
  const denominator = (a[0] - b[0]) * (c[1] - d[1]) - (a[1] - b[1]) * (c[0] - d[0])
  if (Math.abs(denominator) < 1e-9) return null
  const t = ((a[0] - c[0]) * (c[1] - d[1]) - (a[1] - c[1]) * (c[0] - d[0])) / denominator
  return [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]
}

/**
 * A rotated corner on a pixel grid survives simplification as two points a
 * pixel or two apart. Collapse any edge shorter than `minEdge` into the
 * corner its neighbouring edges actually meet at.
 */
export function collapseShortEdges(ring: Point[], minEdge: number): Point[] {
  const points = ring.slice()
  let changed = true
  while (changed && points.length > 3) {
    changed = false
    for (let i = 0; i < points.length && points.length > 3; i += 1) {
      const a = points[i]
      const b = points[(i + 1) % points.length]
      if (Math.hypot(b[0] - a[0], b[1] - a[1]) >= minEdge) continue
      const before = points[(i - 1 + points.length) % points.length]
      const after = points[(i + 2) % points.length]
      const corner = lineIntersection(before, a, b, after)
      const mid: Point = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
      const replacement = corner && Math.hypot(corner[0] - mid[0], corner[1] - mid[1]) < minEdge * 2 ? corner : mid
      points.splice(i, 1, replacement)
      points.splice((i + 1) % (points.length + 0), 1)
      changed = true
      break
    }
  }
  return points
}

/** Shoelace area, in square pixels. */
export function ringArea(ring: Point[]): number {
  let sum = 0
  for (let i = 0; i < ring.length; i += 1) {
    const [x1, y1] = ring[i]
    const [x2, y2] = ring[(i + 1) % ring.length]
    sum += x1 * y2 - x2 * y1
  }
  return Math.abs(sum) / 2
}

/** Even–odd test; the ring is closed implicitly. */
export function pointInRing([x, y]: Point, ring: Point[]): boolean {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

function distanceToSegment([px, py]: Point, [ax, ay]: Point, [bx, by]: Point): number {
  const dx = bx - ax
  const dy = by - ay
  const lengthSq = dx * dx + dy * dy
  const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSq))
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

/** Zero inside the ring, otherwise the distance to its nearest edge. */
export function distanceToRing(point: Point, ring: Point[]): number {
  if (pointInRing(point, ring)) return 0
  let best = Infinity
  for (let i = 0; i < ring.length; i += 1) best = Math.min(best, distanceToSegment(point, ring[i], ring[(i + 1) % ring.length]))
  return best
}

// WGS84.
const A_AXIS = 6_378_137
const E2 = 0.006_694_379_990_14

/**
 * Projects lat/lng onto a flat east/north plane in metres around `origin`,
 * using the ellipsoid's radii of curvature at that latitude. Over a house
 * lot (tens of metres) the distortion is a few parts per million, far
 * below the error in any footprint, and it avoids Web Mercator's area
 * inflation (about 1.6× at Kansas City's latitude).
 */
export function localMeters(origin: { lat: number; lng: number }) {
  const phi = (origin.lat * Math.PI) / 180
  const w = 1 - E2 * Math.sin(phi) ** 2
  const k = Math.PI / 180
  const north = ((A_AXIS * (1 - E2)) / w ** 1.5) * k
  const east = (A_AXIS / Math.sqrt(w)) * Math.cos(phi) * k
  return {
    to: (point: { lat: number; lng: number }): Point => [(point.lng - origin.lng) * east, (point.lat - origin.lat) * north],
    from: ([x, y]: Point) => ({ lat: origin.lat + y / north, lng: origin.lng + x / east }),
  }
}
