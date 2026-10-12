/**
 * Perspective texture mapping for the visualizer.
 *
 * Canvas 2D only supports affine transforms, so a roof plane is mapped as a
 * homography from the unit square (u along the eave, v up the slope) to the
 * traced quad, subdivided into small cells that are each drawn affinely.
 * Courses therefore foreshorten and converge with the plane's pitch the way
 * real shingles do in a photograph, instead of being stamped flat.
 */

export type Pt = { x: number; y: number }
type Mapper = (u: number, v: number) => Pt

/** Unit square -> quad (p0 bottom-left, p1 bottom-right, p2 top-right, p3 top-left). */
export function squareToQuad(p: [Pt, Pt, Pt, Pt]): Mapper {
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
 * Order any traced polygon into an eave-first quad. The edge whose midpoint
 * sits lowest in the photo is taken as the eave; a triangle (hip end) keeps
 * its apex as both top corners and maps affinely.
 */
export function planeQuad(points: Pt[]): [Pt, Pt, Pt, Pt] {
  const cx = points.reduce((s, p) => s + p.x, 0) / points.length
  const cy = points.reduce((s, p) => s + p.y, 0) / points.length
  const ring = [...points].sort((a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx))
  if (ring.length === 3) {
    const [a, b, c] = ring
    const byY = [a, b, c].sort((p, q) => q.y - p.y)
    const bottom = byY.slice(0, 2).sort((p, q) => p.x - q.x)
    return [bottom[0], bottom[1], byY[2], byY[2]]
  }
  if (ring.length > 4) {
    // Four selected vertices can cut off shoulders of a more detailed trace.
    // Cover the whole polygon, then let the caller clip to its exact outline.
    const left = Math.min(...ring.map(p => p.x)), right = Math.max(...ring.map(p => p.x))
    const top = Math.min(...ring.map(p => p.y)), bottom = Math.max(...ring.map(p => p.y))
    return [{ x: left, y: bottom }, { x: right, y: bottom }, { x: right, y: top }, { x: left, y: top }]
  }
  const corners = ring
  // Rotate so the lowest edge becomes the eave, left point first.
  let start = 0, lowest = -Infinity
  for (let i = 0; i < 4; i++) {
    const m = (corners[i].y + corners[(i + 1) % 4].y) / 2
    if (m > lowest) { lowest = m; start = i }
  }
  const q = [0, 1, 2, 3].map(i => corners[(start + i) % 4])
  return q[0].x <= q[1].x ? [q[0], q[1], q[2], q[3]] : [q[1], q[0], q[3], q[2]]
}

/**
 * A hip face photographed from the street is a real trapezoid: its courses
 * stay parallel to the eave and its seams stay upright, only foreshortened by
 * the pitch. A gable plane seen from a drone is a rectangle in perspective.
 * Decide which reading fits a traced quad: near-horizontal eave and ridge,
 * ridge centred over the eave and narrower than it means a hip face.
 */
export function looksLikeHipFace(q: [Pt, Pt, Pt, Pt]): boolean {
  const [bl, br, tr, tl] = q
  const angle = (a: Pt, b: Pt) => Math.abs(Math.atan2(b.y - a.y, b.x - a.x)) % Math.PI
  const level = (a: Pt, b: Pt) => Math.min(angle(a, b), Math.PI - angle(a, b)) < (10 * Math.PI) / 180
  const eave = Math.hypot(br.x - bl.x, br.y - bl.y)
  const ridge = Math.hypot(tr.x - tl.x, tr.y - tl.y)
  const centred = Math.abs((tl.x + tr.x) / 2 - (bl.x + br.x) / 2) < eave * 0.14
  return level(bl, br) && level(tl, tr) && centred && ridge < eave * 0.92
}

/**
 * Affine map for a hip face or any elevation view: u runs along the eave,
 * v runs from the eave midpoint to the ridge midpoint, so courses compress
 * with the pitch but seams stay parallel. The caller clips to the polygon.
 */
export function elevationMap(q: [Pt, Pt, Pt, Pt]): Mapper {
  const [bl, br, tr, tl] = q
  const ex = br.x - bl.x, ey = br.y - bl.y
  const mx = (bl.x + br.x) / 2, my = (bl.y + br.y) / 2
  const rx = (tl.x + tr.x) / 2 - mx, ry = (tl.y + tr.y) / 2 - my
  // Extend the eave span so the parallel texture still covers the hips' outer corners.
  const ext = 0.5 * Math.max(0, Math.hypot(tr.x - tl.x, tr.y - tl.y) / Math.max(1, Math.hypot(ex, ey)) - 1)
  return (u, v) => ({ x: bl.x - ext * ex + (u * (1 + 2 * ext)) * ex + v * rx, y: bl.y - ext * ey + (u * (1 + 2 * ext)) * ey + v * ry })
}

/** Draw `texture` through `map` over the unit square, in `cells` x `cells` affine pieces. */
export function drawMapped(ctx: CanvasRenderingContext2D, texture: HTMLCanvasElement, map: Mapper, cells = 18) {
  const tw = texture.width, th = texture.height
  const grid: Pt[][] = []
  for (let j = 0; j <= cells; j++) {
    const row: Pt[] = []
    for (let i = 0; i <= cells; i++) row.push(map(i / cells, j / cells))
    grid.push(row)
  }
  for (let j = 0; j < cells; j++) {
    for (let i = 0; i < cells; i++) {
      const u0 = (i / cells) * tw, u1 = ((i + 1) / cells) * tw
      // Texture rows run top-down; v = 0 is the eave at the bottom of the texture.
      const v0 = th - (j / cells) * th, v1 = th - ((j + 1) / cells) * th
      const a = grid[j][i], b = grid[j][i + 1], c = grid[j + 1][i + 1], d = grid[j + 1][i]
      triangle(ctx, texture, [u0, v0, a.x, a.y], [u1, v0, b.x, b.y], [u1, v1, c.x, c.y], [u0, v0, a.x, a.y], [u1, v1, c.x, c.y], [u0, v1, d.x, d.y])
    }
  }
}

type Vtx = [number, number, number, number] // texture x, texture y, screen x, screen y

function triangle(ctx: CanvasRenderingContext2D, texture: HTMLCanvasElement, ...tris: Vtx[]) {
  for (let t = 0; t < tris.length; t += 3) {
    const [p0, p1, p2] = [tris[t], tris[t + 1], tris[t + 2]]
    const [x0, y0, x1, y1, x2, y2] = [p0[2], p0[3], p1[2], p1[3], p2[2], p2[3]]
    const [s0, t0, s1, t1, s2, t2] = [p0[0], p0[1], p1[0], p1[1], p2[0], p2[1]]
    const det = (s1 - s0) * (t2 - t0) - (s2 - s0) * (t1 - t0)
    if (Math.abs(det) < 1e-6) continue
    const ma = ((x1 - x0) * (t2 - t0) - (x2 - x0) * (t1 - t0)) / det
    const mb = ((y1 - y0) * (t2 - t0) - (y2 - y0) * (t1 - t0)) / det
    const mc = ((x2 - x0) * (s1 - s0) - (x1 - x0) * (s2 - s0)) / det
    const md = ((y2 - y0) * (s1 - s0) - (y1 - y0) * (s2 - s0)) / det
    const me = x0 - ma * s0 - mc * t0
    const mf = y0 - mb * s0 - md * t0
    // Grow the clip a hair from the centroid so neighbouring pieces overlap.
    const gx = (x0 + x1 + x2) / 3, gy = (y0 + y1 + y2) / 3
    const grow = (x: number, y: number): Pt => { const dx = x - gx, dy = y - gy; const len = Math.hypot(dx, dy) || 1; return { x: x + (dx / len) * 1.6, y: y + (dy / len) * 1.6 } }
    const [g0, g1, g2] = [grow(x0, y0), grow(x1, y1), grow(x2, y2)]
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(g0.x, g0.y); ctx.lineTo(g1.x, g1.y); ctx.lineTo(g2.x, g2.y); ctx.closePath()
    ctx.clip()
    ctx.transform(ma, mb, mc, md, me, mf)
    const sx = Math.max(0, Math.min(s0, s1, s2) - 2), sy = Math.max(0, Math.min(t0, t1, t2) - 2)
    const sw = Math.min(texture.width - sx, Math.max(s0, s1, s2) - sx + 2), sh = Math.min(texture.height - sy, Math.max(t0, t1, t2) - sy + 2)
    ctx.drawImage(texture, sx, sy, sw, sh, sx, sy, sw, sh)
    ctx.restore()
  }
}
