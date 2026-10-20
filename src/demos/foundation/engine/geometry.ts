import { BoxGeometry, BufferGeometry, CylinderGeometry, Float32BufferAttribute, Shape, ShapeGeometry } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

export type Rng = () => number

/** Mulberry32: small, fast and repeatable, so the painted textures never change between visits. */
export function seeded(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Non-indexed geometry with exactly position, normal and uv, ready to merge. */
export function plain(geometry: BufferGeometry): BufferGeometry {
  const flat = geometry.index ? geometry.toNonIndexed() : geometry
  if (flat !== geometry) geometry.dispose()
  for (const name of Object.keys(flat.attributes)) {
    if (name !== 'position' && name !== 'normal' && name !== 'uv') flat.deleteAttribute(name)
  }
  if (!flat.attributes.normal) flat.computeVertexNormals()
  if (!flat.attributes.uv) flat.setAttribute('uv', new Float32BufferAttribute(new Float32Array(flat.attributes.position.count * 2), 2))
  flat.clearGroups()
  return flat
}

export function merge(geometries: BufferGeometry[]): BufferGeometry {
  if (geometries.length === 0) return new BufferGeometry()
  const merged = mergeGeometries(geometries.map(plain), false)
  for (const geometry of geometries) geometry.dispose()
  return merged ?? new BufferGeometry()
}

/** Box from its min and max corners, with world-scale UVs (one unit per metre). */
export function slab(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number): BufferGeometry {
  const geometry = plain(new BoxGeometry(x1 - x0, y1 - y0, z1 - z0))
  geometry.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)
  return worldUV(geometry)
}

export function cylinder(radiusTop: number, radiusBottom: number, height: number, segments = 18, open = false): BufferGeometry {
  return plain(new CylinderGeometry(radiusTop, radiusBottom, height, segments, 1, open))
}

/** Box-projected UVs in metres, so tiled textures keep their real scale. */
export function worldUV(geometry: BufferGeometry, scale = 1): BufferGeometry {
  const position = geometry.attributes.position
  const normal = geometry.attributes.normal
  const uv = geometry.attributes.uv
  for (let i = 0; i < position.count; i++) {
    const nx = Math.abs(normal.getX(i)), ny = Math.abs(normal.getY(i))
    const x = position.getX(i), y = position.getY(i), z = position.getZ(i)
    if (ny > 0.7) uv.setXY(i, x * scale, z * scale)
    else if (nx > 0.7) uv.setXY(i, z * scale, y * scale)
    else uv.setXY(i, x * scale, y * scale)
  }
  uv.needsUpdate = true
  return geometry
}

/** A flat outline on the section plane, facing the viewer. */
export function section(points: [number, number][], z = 0.004): BufferGeometry {
  const shape = new Shape()
  points.forEach(([x, y], index) => (index === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y)))
  shape.closePath()
  const geometry = new ShapeGeometry(shape)
  geometry.translate(0, 0, z)
  const position = geometry.attributes.position
  const uv = geometry.attributes.uv
  for (let i = 0; i < position.count; i++) uv.setXY(i, position.getX(i), position.getY(i))
  return plain(geometry)
}

export function rect(x0: number, x1: number, y0: number, y1: number, z = 0.004): BufferGeometry {
  return section([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], z)
}

/** A disc (or half-disc) on the section plane, for pipes and pier shafts seen end-on. */
export function disc(cx: number, cy: number, radius: number, z = 0.006, segments = 20): BufferGeometry {
  const points: [number, number][] = []
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2
    points.push([cx + Math.cos(a) * radius, cy + Math.sin(a) * radius])
  }
  return section(points, z)
}

export const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x))
