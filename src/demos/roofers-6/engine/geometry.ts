import { BoxGeometry, BufferGeometry, CylinderGeometry, Float32BufferAttribute, IcosahedronGeometry, Matrix4, Vector3 } from 'three'
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { Rng } from './textures'

/** Non-indexed geometry with exactly position, normal and uv, ready to merge. */
export function plain(geometry: BufferGeometry): BufferGeometry {
  const flat = geometry.index ? geometry.toNonIndexed() : geometry
  if (flat !== geometry) geometry.dispose()
  for (const name of Object.keys(flat.attributes)) {
    if (name !== 'position' && name !== 'normal' && name !== 'uv') flat.deleteAttribute(name)
  }
  if (!flat.attributes.uv) {
    flat.setAttribute('uv', new Float32BufferAttribute(new Float32Array((flat.attributes.position.count) * 2), 2))
  }
  flat.clearGroups()
  return flat
}

export function merge(geometries: BufferGeometry[]): BufferGeometry {
  if (geometries.length === 0) return new BufferGeometry()
  const merged = mergeGeometries(geometries.map(plain), false)
  for (const geometry of geometries) geometry.dispose()
  return merged ?? new BufferGeometry()
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

export function box(cx: number, cy: number, cz: number, sx: number, sy: number, sz: number): BufferGeometry {
  const geometry = plain(new BoxGeometry(sx, sy, sz))
  geometry.translate(cx, cy, cz)
  return geometry
}

export function cylinder(radiusTop: number, radiusBottom: number, height: number, segments = 16, open = false): BufferGeometry {
  return plain(new CylinderGeometry(radiusTop, radiusBottom, height, segments, 1, open))
}

/** Places a geometry with a local frame: x along, y up, z out. */
export function orient(geometry: BufferGeometry, origin: Vector3, x: Vector3, y: Vector3, z: Vector3): BufferGeometry {
  const matrix = new Matrix4().makeBasis(x, y, z).setPosition(origin)
  geometry.applyMatrix4(matrix)
  return geometry
}

/** An organic blob for foliage: an icosphere pushed around by noise. */
export function blob(radius: number, random: Rng, detail = 2, squash = 1): BufferGeometry {
  const source = new IcosahedronGeometry(radius, detail)
  source.deleteAttribute('normal')
  source.deleteAttribute('uv')
  const geometry = mergeVertices(source)
  source.dispose()
  const position = geometry.attributes.position
  const v = new Vector3()
  const offsets = Array.from({ length: 6 }, () => new Vector3(random() - 0.5, random() - 0.5, random() - 0.5).normalize())
  const phase = random() * 10
  for (let i = 0; i < position.count; i++) {
    v.fromBufferAttribute(position, i)
    const n = v.clone().normalize()
    let bump = 0
    for (const o of offsets) bump += Math.max(0, n.dot(o)) ** 3 * 0.22
    bump += Math.sin(n.x * 9.1 + phase) * Math.sin(n.z * 7.3 + n.y * 4.2) * 0.07
    v.multiplyScalar(1 + bump)
    v.y *= squash
    position.setXYZ(i, v.x, v.y, v.z)
  }
  geometry.computeVertexNormals()
  return plain(geometry)
}
