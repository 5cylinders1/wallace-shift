/** A photo-plane homography: u follows the eave, v follows the roof slope. */
export type Point = { x: number; y: number }
export type Quad = [Point, Point, Point, Point]
export type Mapper = (u: number, v: number) => Point

export function squareToQuad(p: Quad): Mapper {
  const [p0, p1, p2, p3] = p
  const dx1 = p1.x - p2.x, dx2 = p3.x - p2.x, dx3 = p0.x - p1.x + p2.x - p3.x
  const dy1 = p1.y - p2.y, dy2 = p3.y - p2.y, dy3 = p0.y - p1.y + p2.y - p3.y
  const det = dx1 * dy2 - dx2 * dy1
  if (Math.abs(det) < 1e-9 || (Math.abs(dx3) < 1e-9 && Math.abs(dy3) < 1e-9)) {
    return (u, v) => ({ x: p0.x + u * (p1.x - p0.x) + v * (p3.x - p0.x), y: p0.y + u * (p1.y - p0.y) + v * (p3.y - p0.y) })
  }
  const g = (dx3 * dy2 - dx2 * dy3) / det
  const h = (dx1 * dy3 - dx3 * dy1) / det
  const a = p1.x - p0.x + g * p1.x, b = p3.x - p0.x + h * p3.x, c = p0.x
  const d = p1.y - p0.y + g * p1.y, e = p3.y - p0.y + h * p3.y, f = p0.y
  return (u, v) => {
    const den = g * u + h * v + 1
    return { x: (a * u + b * v + c) / den, y: (d * u + e * v + f) / den }
  }
}

/**
 * A hip's sloping sides are cuts in a physical plane, not vanishing edges.
 * Parallel/elevation mapping retains that distinction and clips the texture
 * to the traced boundary. The visitor can override both mapping and anchors.
 */
export function parallelMap(q: Quad): Mapper {
  const [bl, br, tr, tl] = q
  const ex = br.x - bl.x, ey = br.y - bl.y
  const rx = (tl.x + tr.x - bl.x - br.x) / 2, ry = (tl.y + tr.y - bl.y - br.y) / 2
  const ext = 0.5 * Math.max(0, Math.hypot(tr.x - tl.x, tr.y - tl.y) / Math.max(1e-6, Math.hypot(ex, ey)) - 1)
  return (u, v) => ({ x: bl.x - ext * ex + u * (1 + 2 * ext) * ex + v * rx, y: bl.y - ext * ey + u * (1 + 2 * ext) * ey + v * ry })
}

export function polygonArea(points: Point[]): number {
  return Math.abs(points.reduce((sum, p, i) => {
    const next = points[(i + 1) % points.length]
    return sum + p.x * next.y - next.x * p.y
  }, 0)) / 2
}

const cross = (a: Point, b: Point, c: Point) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)
const onSegment = (a: Point, b: Point, p: Point) => Math.abs(cross(a, b, p)) < 1e-9 && p.x >= Math.min(a.x, b.x) - 1e-9 && p.x <= Math.max(a.x, b.x) + 1e-9 && p.y >= Math.min(a.y, b.y) - 1e-9 && p.y <= Math.max(a.y, b.y) + 1e-9

/** Reject crossed/degenerate boundaries before a texture is applied. */
export function validOutline(points: Point[]): boolean {
  if (points.length < 3 || polygonArea(points) < 0.00008) return false
  if (points.some(p => !Number.isFinite(p.x) || !Number.isFinite(p.y) || p.x < 0 || p.x > 1 || p.y < 0 || p.y > 1)) return false
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length]
    if (Math.hypot(a.x - b.x, a.y - b.y) < 0.0001) return false
    for (let j = i + 1; j < points.length; j++) {
      if (j === i + 1 || (i === 0 && j === points.length - 1)) continue
      const c = points[j], d = points[(j + 1) % points.length]
      if (cross(a, b, c) * cross(a, b, d) < 0 && cross(c, d, a) * cross(c, d, b) < 0) return false
      if (onSegment(a, b, c) || onSegment(a, b, d) || onSegment(c, d, a) || onSegment(c, d, b)) return false
    }
  }
  return true
}

export function validPerspective(q: Quad): boolean {
  const signs = q.map((p, i) => cross(p, q[(i + 1) % 4], q[(i + 2) % 4]))
  return validOutline(q) && (signs.every(value => value > 1e-7) || signs.every(value => value < -1e-7))
}

export function roofSlopeLength(horizontalRun: number, pitchRise: number): number {
  return horizontalRun * Math.sqrt(1 + (pitchRise / 12) ** 2)
}

export function pointInPolygon(p: Point, outline: Point[]): boolean {
  let inside = false
  for (let i = 0, j = outline.length - 1; i < outline.length; j = i++) {
    const a = outline[i], b = outline[j]
    if ((a.y > p.y) !== (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) inside = !inside
  }
  return inside
}

/** Suggested mapping only. The visitor confirms the roof's eave and ridge. */
export function suggestAnchors(points: Point[]): Quad {
  const cx = points.reduce((s, p) => s + p.x, 0) / points.length
  const cy = points.reduce((s, p) => s + p.y, 0) / points.length
  const ring = [...points].sort((a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx))
  if (ring.length === 3) {
    const sorted = [...ring].sort((a, b) => b.y - a.y)
    const bottom = sorted.slice(0, 2).sort((a, b) => a.x - b.x)
    return [bottom[0], bottom[1], sorted[2], sorted[2]]
  }
  if (ring.length !== 4) {
    const left = Math.min(...ring.map(p => p.x)), right = Math.max(...ring.map(p => p.x))
    const top = Math.min(...ring.map(p => p.y)), bottom = Math.max(...ring.map(p => p.y))
    return [{ x: left, y: bottom }, { x: right, y: bottom }, { x: right, y: top }, { x: left, y: top }]
  }
  let start = 0, lowest = -Infinity
  for (let i = 0; i < 4; i++) {
    const midpoint = (ring[i].y + ring[(i + 1) % 4].y) / 2
    if (midpoint > lowest) { lowest = midpoint; start = i }
  }
  const q = [0, 1, 2, 3].map(i => ring[(start + i) % 4])
  return q[0].x <= q[1].x ? [q[0], q[1], q[2], q[3]] : [q[1], q[0], q[3], q[2]]
}

export function suggestedMode(q: Quad): 'parallel' | 'perspective' {
  const [bl, br, tr, tl] = q
  const eave = Math.hypot(br.x - bl.x, br.y - bl.y), ridge = Math.hypot(tr.x - tl.x, tr.y - tl.y)
  const level = (a: Point, b: Point) => Math.abs(b.y - a.y) < Math.abs(b.x - a.x) * 0.18
  const centered = Math.abs((tl.x + tr.x - bl.x - br.x) / 2) < eave * 0.14
  return ridge < 1e-6 || (level(bl, br) && level(tl, tr) && centered && ridge < eave * 0.92) ? 'parallel' : 'perspective'
}

/** Subdivide a projective plane because Canvas 2D transforms are affine. */
export function drawMapped(ctx: CanvasRenderingContext2D, texture: HTMLCanvasElement, map: Mapper, cells = 22) {
  const tw = texture.width, th = texture.height
  const grid: Point[][] = []
  for (let j = 0; j <= cells; j++) {
    const row: Point[] = []
    for (let i = 0; i <= cells; i++) row.push(map(i / cells, j / cells))
    grid.push(row)
  }
  for (let j = 0; j < cells; j++) for (let i = 0; i < cells; i++) {
    const u0 = i / cells * tw, u1 = (i + 1) / cells * tw
    const v0 = th - j / cells * th, v1 = th - (j + 1) / cells * th
    const a = grid[j][i], b = grid[j][i + 1], c = grid[j + 1][i + 1], d = grid[j + 1][i]
    triangle(ctx, texture, [u0, v0, a.x, a.y], [u1, v0, b.x, b.y], [u1, v1, c.x, c.y])
    triangle(ctx, texture, [u0, v0, a.x, a.y], [u1, v1, c.x, c.y], [u0, v1, d.x, d.y])
  }
}

type Vertex = [number, number, number, number]
function triangle(ctx: CanvasRenderingContext2D, texture: HTMLCanvasElement, p0: Vertex, p1: Vertex, p2: Vertex) {
  const [x0, y0, x1, y1, x2, y2] = [p0[2], p0[3], p1[2], p1[3], p2[2], p2[3]]
  const [s0, t0, s1, t1, s2, t2] = [p0[0], p0[1], p1[0], p1[1], p2[0], p2[1]]
  const det = (s1 - s0) * (t2 - t0) - (s2 - s0) * (t1 - t0)
  if (Math.abs(det) < 1e-6) return
  const ma = ((x1 - x0) * (t2 - t0) - (x2 - x0) * (t1 - t0)) / det
  const mb = ((y1 - y0) * (t2 - t0) - (y2 - y0) * (t1 - t0)) / det
  const mc = ((x2 - x0) * (s1 - s0) - (x1 - x0) * (s2 - s0)) / det
  const md = ((y2 - y0) * (s1 - s0) - (y1 - y0) * (s2 - s0)) / det
  const me = x0 - ma * s0 - mc * t0, mf = y0 - mb * s0 - md * t0
  const gx = (x0 + x1 + x2) / 3, gy = (y0 + y1 + y2) / 3
  const grow = (x: number, y: number) => { const dx = x - gx, dy = y - gy, length = Math.hypot(dx, dy) || 1; return { x: x + dx / length * 0.65, y: y + dy / length * 0.65 } }
  const [a, b, c] = [grow(x0, y0), grow(x1, y1), grow(x2, y2)]
  ctx.save()
  ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.closePath(); ctx.clip()
  ctx.transform(ma, mb, mc, md, me, mf)
  const sx = Math.max(0, Math.min(s0, s1, s2) - 2), sy = Math.max(0, Math.min(t0, t1, t2) - 2)
  const sw = Math.min(texture.width - sx, Math.max(s0, s1, s2) - sx + 2), sh = Math.min(texture.height - sy, Math.max(t0, t1, t2) - sy + 2)
  ctx.drawImage(texture, sx, sy, sw, sh, sx, sy, sw, sh)
  ctx.restore()
}
