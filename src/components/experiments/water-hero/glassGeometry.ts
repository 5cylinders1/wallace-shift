import { BufferGeometry, ExtrudeGeometry, Float32BufferAttribute, Shape, Vector2, Vector3 } from 'three'
import { buildElectricContour, ELECTRIC_CONTOUR_SCALE } from './electricContour'

const TOLERANCE = 1e-6
/** The source's .002 shoulder becomes .008 wide and .010 deep. Full local
 * extrusion thickness and the outer 11/4-corner silhouettes stay unchanged. */
export const GLASS_SHOULDER_WIDTH_RATIO = .125
export const GLASS_SHOULDER_DEPTH_RATIO = .15625
export const GLASS_SHOULDER_SEGMENTS = 12

const keyFor = (x: number, z: number) => `${Math.round(x / TOLERANCE)},${Math.round(z / TOLERANCE)}`

/** Order the exported front-face perimeter, then recover its corresponding
 * outer wall corners. The flat cap is already inset by the original bevel;
 * using it directly would shrink the logo every time the bevel grows. */
function outerContour(source: BufferGeometry) {
  const front = buildElectricContour(source)
  const vertices = new Map<string, Vector2>()
  const neighbors = new Map<string, string[]>()
  for (const edge of front) {
    const a = new Vector2(edge.x, edge.y).divideScalar(ELECTRIC_CONTOUR_SCALE)
    const b = new Vector2(edge.z, edge.w).divideScalar(ELECTRIC_CONTOUR_SCALE)
    const ak = keyFor(a.x, a.y), bk = keyFor(b.x, b.y)
    vertices.set(ak, a); vertices.set(bk, b)
    neighbors.set(ak, [...neighbors.get(ak) ?? [], bk])
    neighbors.set(bk, [...neighbors.get(bk) ?? [], ak])
  }
  const first = neighbors.keys().next().value!
  const ordered: Vector2[] = []
  let current = first, previous = ''
  do {
    ordered.push(vertices.get(current)!)
    const next = neighbors.get(current)!.find(key => key !== previous)!
    previous = current
    current = next
    if (ordered.length > vertices.size) throw new Error('Cannot build glass logo geometry: the front perimeter does not close.')
  } while (current !== first)
  if (ordered.length !== vertices.size) throw new Error('Cannot build glass logo geometry: only one continuous outline per piece is supported.')

  const position = source.getAttribute('position')
  let minY = Infinity, maxY = -Infinity
  for (let i = 0; i < position.count; i++) {
    minY = Math.min(minY, position.getY(i))
    maxY = Math.max(maxY, position.getY(i))
  }
  const centerY = (minY + maxY) / 2
  let wallY = Infinity
  for (let i = 0; i < position.count; i++) wallY = Math.min(wallY, Math.abs(position.getY(i) - centerY))
  const wallCorners = new Map<string, Vector2>()
  for (let i = 0; i < position.count; i++) {
    if (Math.abs(Math.abs(position.getY(i) - centerY) - wallY) > TOLERANCE) continue
    const x = position.getX(i), z = position.getZ(i)
    wallCorners.set(keyFor(x, z), new Vector2(x, z))
  }
  if (wallCorners.size !== ordered.length || !(maxY - minY > TOLERANCE)) {
    throw new Error('Cannot build glass logo geometry: the authored extrusion must have matching front and outer-wall corners.')
  }
  const used = new Set<Vector2>()
  const outline = ordered.map(point => {
    let closest: Vector2 | undefined, distance = Infinity
    for (const corner of wallCorners.values()) {
      const nextDistance = point.distanceToSquared(corner)
      if (nextDistance < distance) { closest = corner; distance = nextDistance }
    }
    if (!closest || used.has(closest)) throw new Error('Cannot build glass logo geometry: front-to-wall corner correspondence is ambiguous.')
    used.add(closest)
    return closest
  })
  return { outline, minY, maxY }
}

/** Create an owned, smoothly rounded glass extrusion without touching any
 * cached GLB attribute, normal, material or transform. Native face normals
 * remain local +/-Y, matching the existing shader and presentation rig. */
export function buildGlassGeometry(source: BufferGeometry): BufferGeometry {
  const { outline, minY, maxY } = outerContour(source)
  const thickness = maxY - minY
  const bevelSize = thickness * GLASS_SHOULDER_WIDTH_RATIO
  const bevelThickness = thickness * GLASS_SHOULDER_DEPTH_RATIO
  // ExtrudeGeometry uses XY for the drawing and Z for thickness. Negating
  // the drawn Z then rotating restores the GLB's XZ drawing and +Y front.
  const shape = new Shape(outline.map(point => new Vector2(point.x, -point.y)))
  shape.closePath()
  const extrusion = new ExtrudeGeometry(shape, {
    depth: thickness - bevelThickness * 2,
    steps: 1,
    bevelEnabled: true,
    bevelSegments: GLASS_SHOULDER_SEGMENTS,
    bevelSize,
    bevelThickness,
    bevelOffset: -bevelSize,
  })
  extrusion.rotateX(-Math.PI / 2)
  extrusion.translate(0, minY + bevelThickness, 0)

  // The built-in extrusion splits every triangle for flat normals. Weld by
  // position only, so UV seams do not interrupt the polished shoulder. These
  // procedural glass materials sample screen/environment space, not an atlas.
  const input = extrusion.getAttribute('position')
  const position: number[] = [], index: number[] = []
  const unique = new Map<string, number>()
  const weldTolerance = 1e-8
  for (let i = 0; i < input.count; i++) {
    const x = input.getX(i), y = input.getY(i), z = input.getZ(i)
    const key = `${Math.round(x / weldTolerance)},${Math.round(y / weldTolerance)},${Math.round(z / weldTolerance)}`
    let vertex = unique.get(key)
    if (vertex === undefined) {
      vertex = position.length / 3
      unique.set(key, vertex)
      position.push(x, y, z)
    }
    index.push(vertex)
  }
  extrusion.dispose()
  const geometry = new BufferGeometry()
  geometry.name = `${source.name || 'WS'}_RoundedGlass`
  geometry.setAttribute('position', new Float32BufferAttribute(position, 3))
  geometry.setIndex(index)
  // Angle weighting prevents long sidewall triangles from pulling normals
  // across the narrow concave notch and flattening its shorter shoulder.
  const accum = new Float64Array(position.length)
  const a = new Vector3(), b = new Vector3(), c = new Vector3()
  const first = new Vector3(), second = new Vector3(), face = new Vector3(), cross = new Vector3()
  for (let i = 0; i < index.length; i += 3) {
    const ids = [index[i], index[i + 1], index[i + 2]]
    const points = [a.fromArray(position, ids[0] * 3), b.fromArray(position, ids[1] * 3), c.fromArray(position, ids[2] * 3)]
    face.copy(b).sub(a).cross(cross.copy(c).sub(a)).normalize()
    for (let corner = 0; corner < 3; corner++) {
      first.copy(points[(corner + 1) % 3]).sub(points[corner])
      second.copy(points[(corner + 2) % 3]).sub(points[corner])
      const angle = Math.atan2(cross.copy(first).cross(second).length(), first.dot(second))
      const offset = ids[corner] * 3
      accum[offset] += face.x * angle
      accum[offset + 1] += face.y * angle
      accum[offset + 2] += face.z * angle
    }
  }
  for (let i = 0; i < accum.length; i += 3) {
    first.fromArray(accum, i).normalize()
    accum[i] = first.x; accum[i + 1] = first.y; accum[i + 2] = first.z
  }
  geometry.setAttribute('normal', new Float32BufferAttribute(accum, 3))
  const normals = geometry.getAttribute('normal'), positions = geometry.getAttribute('position')
  for (let i = 0; i < positions.count; i++) {
    const y = positions.getY(i)
    // Exact tangent joins keep both large faces optically flat. The rest of
    // the normal field is smoothly averaged over the 12 shoulder intervals.
    if (Math.abs(y - maxY) < TOLERANCE) normals.setXYZ(i, 0, 1, 0)
    else if (Math.abs(y - minY) < TOLERANCE) normals.setXYZ(i, 0, -1, 0)
    else if (Math.abs(y - maxY + bevelThickness) < TOLERANCE || Math.abs(y - minY - bevelThickness) < TOLERANCE) {
      const length = Math.hypot(normals.getX(i), normals.getZ(i))
      if (length > 0) normals.setXYZ(i, normals.getX(i) / length, 0, normals.getZ(i) / length)
    }
  }
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  geometry.userData.glassShoulder = { width: bevelSize, depth: bevelThickness, segments: GLASS_SHOULDER_SEGMENTS }
  return geometry
}
