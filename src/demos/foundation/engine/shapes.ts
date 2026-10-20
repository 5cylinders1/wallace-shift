import { BufferGeometry, CatmullRomCurve3, IcosahedronGeometry, TubeGeometry, Vector3 } from 'three'
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { cylinder, plain, type Rng } from './geometry'

/** A soft organic mass for planting, an icosphere pushed around by noise. */
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
    for (const o of offsets) bump += Math.max(0, n.dot(o)) ** 3 * 0.2
    bump += Math.sin(n.x * 9.1 + phase) * Math.sin(n.z * 7.3 + n.y * 4.2) * 0.06
    v.multiplyScalar(1 + bump)
    v.y *= squash
    position.setXYZ(i, v.x, v.y, v.z)
  }
  geometry.computeVertexNormals()
  return plain(geometry)
}

/** Upright cylinder standing on (x, y, z). */
export function cylinderAt(x: number, y: number, z: number, radiusTop: number, radiusBottom: number, height: number, segments = 18): BufferGeometry {
  const geometry = cylinder(radiusTop, radiusBottom, height, segments)
  geometry.translate(x, y + height / 2, z)
  return geometry
}

/** A pipe through a list of points. */
export function pipe(points: [number, number, number][], radius: number, tension = 0.02): BufferGeometry {
  const curve = new CatmullRomCurve3(points.map(([x, y, z]) => new Vector3(x, y, z)), false, 'catmullrom', tension)
  return plain(new TubeGeometry(curve, Math.max(8, points.length * 12), radius, 10, false))
}
