import { BufferGeometry, Float32BufferAttribute, Vector2, Vector3 } from 'three'

/**
 * Roof geometry from first principles: a rectangular footprint, an eave
 * height, a pitch and an overhang produce exact planes. Everything the
 * scene shows about a roof — its area, ridge and eave runs, where the
 * gutters hang, where hail lands — is derived from these planes, so a
 * pitch change in the studio really does change the measured area.
 */

export type RoofKind = 'gable' | 'hip' | 'shed'

export interface RoofSpec {
  kind: RoofKind
  /** Wall footprint. Gable and hip ridges run along x. */
  x0: number
  x1: number
  z0: number
  z1: number
  /** Top of wall. */
  eave: number
  /** Rise per 12 of run. */
  pitch: number
  overhang: number
  /** Gable rake overhang at the x0 and x1 ends (0 where a roof abuts a wall). */
  rake?: [number, number]
}

export interface RoofPlane {
  points: Vector3[]
  normal: Vector3
  /** Horizontal, along the eave. */
  u: Vector3
  /** Up the slope, in the plane. */
  v: Vector3
  origin: Vector3
  area: number
}

export type Segment = [Vector3, Vector3]

export interface Roof {
  spec: RoofSpec
  slope: number
  planes: RoofPlane[]
  ridges: Segment[]
  hips: Segment[]
  eaves: Segment[]
  rakes: Segment[]
  /** Where a roof meets a wall: needs step or counter flashing. */
  walls: Segment[]
  eaveY: number
  ridgeY: number
  area: number
  heightAt(x: number, z: number): number | null
}

const v3 = (x: number, y: number, z: number) => new Vector3(x, y, z)

function makePlane(points: Vector3[], eaveA: Vector3, eaveB: Vector3): RoofPlane {
  const u = eaveB.clone().sub(eaveA).normalize()
  const normal = new Vector3()
  for (let i = 0; i < points.length; i++) {
    const a = points[i]
    const b = points[(i + 1) % points.length]
    normal.x += (a.y - b.y) * (a.z + b.z)
    normal.y += (a.z - b.z) * (a.x + b.x)
    normal.z += (a.x - b.x) * (a.y + b.y)
  }
  normal.normalize()
  if (normal.y < 0) normal.negate()
  const v = new Vector3().crossVectors(normal, u).normalize()
  if (v.y < 0) v.negate()
  let area = 0
  for (let i = 1; i < points.length - 1; i++) {
    area += new Vector3().crossVectors(points[i].clone().sub(points[0]), points[i + 1].clone().sub(points[0])).length() / 2
  }
  return { points, normal, u, v, origin: eaveA.clone(), area }
}

export function buildRoof(spec: RoofSpec): Roof {
  const s = spec.pitch / 12
  const o = spec.overhang
  const { x0, x1, z0, z1 } = spec
  const zc = (z0 + z1) / 2
  const depth = z1 - z0

  if (spec.kind === 'shed') {
    // High side against the wall at z0, falling toward +z.
    const [rl, rr] = spec.rake ?? [o, o]
    const xa = x0 - rl
    const xb = x1 + rr
    const zf = z1 + o
    const top = spec.eave
    const low = top - (zf - z0) * s
    const plane = makePlane([v3(xa, low, zf), v3(xb, low, zf), v3(xb, top, z0), v3(xa, top, z0)], v3(xa, low, zf), v3(xb, low, zf))
    return {
      spec, slope: s, planes: [plane], ridges: [], hips: [],
      eaves: [[v3(xa, low, zf), v3(xb, low, zf)]],
      rakes: [[v3(xa, low, zf), v3(xa, top, z0)], [v3(xb, low, zf), v3(xb, top, z0)]],
      walls: [[v3(xa, top, z0), v3(xb, top, z0)]],
      eaveY: low, ridgeY: top, area: plane.area,
      heightAt: (x, z) => (x < xa || x > xb || z < z0 || z > zf ? null : top - (z - z0) * s),
    }
  }

  const eaveY = spec.eave - o * s
  const ridgeY = spec.eave + (depth / 2) * s
  const zf = z1 + o
  const zb = z0 - o

  if (spec.kind === 'gable') {
    const [rl, rr] = spec.rake ?? [o, o]
    const xa = x0 - rl
    const xb = x1 + rr
    const front = makePlane([v3(xa, eaveY, zf), v3(xb, eaveY, zf), v3(xb, ridgeY, zc), v3(xa, ridgeY, zc)], v3(xa, eaveY, zf), v3(xb, eaveY, zf))
    const back = makePlane([v3(xb, eaveY, zb), v3(xa, eaveY, zb), v3(xa, ridgeY, zc), v3(xb, ridgeY, zc)], v3(xb, eaveY, zb), v3(xa, eaveY, zb))
    const rakes: Segment[] = []
    const walls: Segment[] = []
    if (rl > 0) rakes.push([v3(xa, eaveY, zf), v3(xa, ridgeY, zc)], [v3(xa, eaveY, zb), v3(xa, ridgeY, zc)])
    else walls.push([v3(xa, eaveY, zf), v3(xa, ridgeY, zc)], [v3(xa, eaveY, zb), v3(xa, ridgeY, zc)])
    if (rr > 0) rakes.push([v3(xb, eaveY, zf), v3(xb, ridgeY, zc)], [v3(xb, eaveY, zb), v3(xb, ridgeY, zc)])
    else walls.push([v3(xb, eaveY, zf), v3(xb, ridgeY, zc)], [v3(xb, eaveY, zb), v3(xb, ridgeY, zc)])
    return {
      spec, slope: s, planes: [front, back],
      ridges: [[v3(xa, ridgeY, zc), v3(xb, ridgeY, zc)]], hips: [],
      eaves: [[v3(xa, eaveY, zf), v3(xb, eaveY, zf)], [v3(xb, eaveY, zb), v3(xa, eaveY, zb)]],
      rakes, walls, eaveY, ridgeY, area: front.area + back.area,
      heightAt: (x, z) => (x < xa || x > xb || z < zb || z > zf ? null : ridgeY - Math.abs(z - zc) * s),
    }
  }

  // Hip: every plane shares the pitch, so the ridge is shortened by the depth.
  const xa = x0 - o
  const xb = x1 + o
  const half = (zf - zb) / 2
  const r1 = v3(Math.min(xa + half, (xa + xb) / 2), ridgeY, zc)
  const r2 = v3(Math.max(xb - half, (xa + xb) / 2), ridgeY, zc)
  const fl = v3(xa, eaveY, zf), fr = v3(xb, eaveY, zf), br = v3(xb, eaveY, zb), bl = v3(xa, eaveY, zb)
  const planes = [
    makePlane([fl, fr, r2, r1], fl, fr),
    makePlane([br, bl, r1, r2], br, bl),
    makePlane([bl, fl, r1], bl, fl),
    makePlane([fr, br, r2], fr, br),
  ]
  const xc = (xa + xb) / 2
  const halfRidge = (r2.x - r1.x) / 2
  return {
    spec, slope: s, planes,
    ridges: r2.x - r1.x > 0.01 ? [[r1, r2]] : [],
    hips: [[fl, r1], [bl, r1], [fr, r2], [br, r2]],
    eaves: [[fl, fr], [fr, br], [br, bl], [bl, fl]],
    rakes: [], walls: [], eaveY, ridgeY,
    area: planes.reduce((sum, plane) => sum + plane.area, 0),
    heightAt: (x, z) => {
      if (x < xa || x > xb || z < zb || z > zf) return null
      const d = Math.max(Math.abs(z - zc), Math.abs(x - xc) - halfRidge)
      return ridgeY - d * s
    },
  }
}

/* ------------------------------------------------------------------ */
/* Plane-space helpers                                                 */
/* ------------------------------------------------------------------ */

export function toPlane(plane: RoofPlane, point: Vector3): Vector2 {
  const d = point.clone().sub(plane.origin)
  return new Vector2(d.dot(plane.u), d.dot(plane.v))
}

export function fromPlane(plane: RoofPlane, u: number, v: number, lift = 0): Vector3 {
  return plane.origin.clone().addScaledVector(plane.u, u).addScaledVector(plane.v, v).addScaledVector(plane.normal, lift)
}

/** Sutherland–Hodgman against the half-plane a·x + b·y + c >= 0. */
export function clip2D(points: Vector2[], a: number, b: number, c: number): Vector2[] {
  const out: Vector2[] = []
  for (let i = 0; i < points.length; i++) {
    const p = points[i]
    const q = points[(i + 1) % points.length]
    const dp = a * p.x + b * p.y + c
    const dq = a * q.x + b * q.y + c
    if (dp >= 0) out.push(p)
    if ((dp >= 0) !== (dq >= 0)) {
      const t = dp / (dp - dq)
      out.push(new Vector2(p.x + (q.x - p.x) * t, p.y + (q.y - p.y) * t))
    }
  }
  return out
}

/** The plane polygon in its own 2D (u, v) coordinates. */
export function planeOutline(plane: RoofPlane): Vector2[] {
  return plane.points.map(point => toPlane(plane, point))
}

/** Lines running up the slope at a fixed spacing along the eave: rafters, seams. */
export function slopeLines(plane: RoofPlane, spacing: number, inset = 0, phase = 0): [Vector2, Vector2][] {
  const outline = planeOutline(plane)
  const minU = Math.min(...outline.map(p => p.x))
  const maxU = Math.max(...outline.map(p => p.x))
  const lines: [Vector2, Vector2][] = []
  for (let u = minU + phase + inset; u <= maxU - inset; u += spacing) {
    let low = Infinity
    let high = -Infinity
    for (let i = 0; i < outline.length; i++) {
      const p = outline[i]
      const q = outline[(i + 1) % outline.length]
      if ((p.x - u) * (q.x - u) > 0 || p.x === q.x) continue
      const t = (u - p.x) / (q.x - p.x)
      const v = p.y + (q.y - p.y) * t
      low = Math.min(low, v)
      high = Math.max(high, v)
    }
    if (high - low > 0.05) lines.push([new Vector2(u, low), new Vector2(u, high)])
  }
  return lines
}

/* ------------------------------------------------------------------ */
/* Mesh builders                                                       */
/* ------------------------------------------------------------------ */

/**
 * A plane polygon given real thickness. Group 0 is the weathering
 * surface (UVs in metres), group 1 the fascia edges and soffit beneath.
 */
export function slabGeometry(plane: RoofPlane, polygon: Vector2[], thickness: number, lift: number): BufferGeometry {
  const top = polygon.map(p => fromPlane(plane, p.x, p.y, lift + thickness))
  const bottom = polygon.map(p => fromPlane(plane, p.x, p.y, lift))
  const positions: number[] = []
  const normals: number[] = []
  const uvs: number[] = []
  const push = (p: Vector3, n: Vector3, u: number, v: number) => {
    positions.push(p.x, p.y, p.z)
    normals.push(n.x, n.y, n.z)
    uvs.push(u, v)
  }
  for (let i = 1; i < polygon.length - 1; i++) {
    for (const index of [0, i, i + 1]) push(top[index], plane.normal, polygon[index].x, polygon[index].y)
  }
  const topCount = positions.length / 3
  const down = plane.normal.clone().negate()
  for (let i = 1; i < polygon.length - 1; i++) {
    for (const index of [0, i + 1, i]) push(bottom[index], down, polygon[index].x, polygon[index].y)
  }
  for (let i = 0; i < polygon.length; i++) {
    const j = (i + 1) % polygon.length
    const edge = top[j].clone().sub(top[i])
    const n = new Vector3().crossVectors(edge, plane.normal).normalize()
    const length = edge.length()
    push(bottom[i], n, 0, 0); push(bottom[j], n, length, 0); push(top[j], n, length, thickness)
    push(bottom[i], n, 0, 0); push(top[j], n, length, thickness); push(top[i], n, 0, thickness)
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('normal', new Float32BufferAttribute(normals, 3))
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
  geometry.addGroup(0, topCount, 0)
  geometry.addGroup(topCount, positions.length / 3 - topCount, 1)
  return geometry
}

/** An oriented box between two points; `up` orients its height. */
export function beamGeometry(a: Vector3, b: Vector3, width: number, height: number, up = new Vector3(0, 1, 0)): BufferGeometry {
  const axis = b.clone().sub(a)
  const length = axis.length()
  const x = axis.normalize()
  const y = up.clone().addScaledVector(x, -up.dot(x)).normalize()
  const z = new Vector3().crossVectors(x, y)
  const corners: Vector3[] = []
  for (const [lx, ly, lz] of [[0, 0, -1], [1, 0, -1], [1, 1, -1], [0, 1, -1], [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]]) {
    corners.push(a.clone().addScaledVector(x, lx * length).addScaledVector(y, ly * height).addScaledVector(z, (lz * width) / 2))
  }
  const faces: [number[], Vector3][] = [
    [[0, 3, 2, 1], z.clone().negate()], [[4, 5, 6, 7], z],
    [[3, 7, 6, 2], y], [[0, 1, 5, 4], y.clone().negate()],
    [[0, 4, 7, 3], x.clone().negate()], [[1, 2, 6, 5], x],
  ]
  const positions: number[] = []
  const normals: number[] = []
  const uvs: number[] = []
  for (const [quad, n] of faces) {
    for (const index of [quad[0], quad[1], quad[2], quad[0], quad[2], quad[3]]) {
      const p = corners[index]
      positions.push(p.x, p.y, p.z)
      normals.push(n.x, n.y, n.z)
      uvs.push(p.dot(x), p.dot(y))
    }
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('normal', new Float32BufferAttribute(normals, 3))
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
  return geometry
}

/** The direction that bisects a ridge or hip line, pointing skyward. */
export function capUp(segment: Segment): Vector3 {
  const axis = segment[1].clone().sub(segment[0]).normalize()
  return new Vector3(0, 1, 0).addScaledVector(axis, -axis.y).normalize()
}

/** Simple polygon fan with UVs in metres, for walls and gable ends. */
export function wallGeometry(points: Vector3[], normal: Vector3, uAxis: Vector3): BufferGeometry {
  const positions: number[] = []
  const normals: number[] = []
  const uvs: number[] = []
  const vAxis = new Vector3().crossVectors(normal, uAxis).normalize()
  if (vAxis.y < 0) vAxis.negate()
  const winding = new Vector3().crossVectors(points[1].clone().sub(points[0]), points[2].clone().sub(points[0]))
  const ordered = winding.dot(normal) < 0 ? [...points].reverse() : points
  for (let i = 1; i < ordered.length - 1; i++) {
    for (const p of [ordered[0], ordered[i], ordered[i + 1]]) {
      positions.push(p.x, p.y, p.z)
      normals.push(normal.x, normal.y, normal.z)
      uvs.push(p.dot(uAxis), p.dot(vAxis))
    }
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('normal', new Float32BufferAttribute(normals, 3))
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
  return geometry
}
