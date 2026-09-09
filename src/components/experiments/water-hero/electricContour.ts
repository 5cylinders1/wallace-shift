import { Vector4, type BufferGeometry } from 'three'

export const ELECTRIC_CONTOUR_MAX_SEGMENTS = 16
/** Must match the electrical shader's authored-local XZ coordinates. */
export const ELECTRIC_CONTOUR_SCALE = 6.0
const POSITION_TOLERANCE = 1e-6

interface ContourVertex {
  x: number
  z: number
}
interface ContourEdge {
  from: string
  to: string
  count: number
}

/** Extract the real front-face perimeter without changing the source mesh.
 * Both logo pieces are authored with their flat front normal along local +Y.
 * Position keys weld duplicate corners, including non-indexed triangles;
 * edges shared by two front triangles are internal diagonals and disappear.
 */
export function buildElectricContour(geometry: BufferGeometry): Vector4[] {
  const position = geometry.getAttribute('position')
  const normal = geometry.getAttribute('normal')
  if (!position || !normal || position.itemSize < 3 || normal.itemSize < 3 || normal.count !== position.count) {
    throw new Error('Cannot build electric logo contour: matching position and normal attributes are required.')
  }
  const index = geometry.getIndex()
  const cornerCount = index?.count ?? position.count
  if (cornerCount % 3 !== 0) {
    throw new Error('Cannot build electric logo contour: geometry must contain complete triangles.')
  }
  const vertices = new Map<string, ContourVertex>()
  const edges = new Map<string, ContourEdge>()
  const corner = (offset: number) => index ? index.getX(offset) : offset
  const keyFor = (vertexIndex: number) => {
    const x = position.getX(vertexIndex), y = position.getY(vertexIndex), z = position.getZ(vertexIndex)
    if (![x, y, z].every(Number.isFinite)) {
      throw new Error('Cannot build electric logo contour: front-face positions must be finite.')
    }
    const key = `${Math.round(x / POSITION_TOLERANCE)},${Math.round(y / POSITION_TOLERANCE)},${Math.round(z / POSITION_TOLERANCE)}`
    // Every reference to a welded corner uses the same representative. This
    // also keeps returned segment endpoints exactly joined after scaling.
    if (!vertices.has(key)) vertices.set(key, { x, z })
    return key
  }

  for (let offset = 0; offset < cornerCount; offset += 3) {
    const corners = [corner(offset), corner(offset + 1), corner(offset + 2)]
    if (!corners.every(vertexIndex => normal.getY(vertexIndex) > .9999)) continue
    const keys = corners.map(keyFor)
    // A triangle collapsed by the tolerance contributes no usable perimeter.
    if (new Set(keys).size !== 3) continue
    for (let side = 0; side < 3; side++) {
      const from = keys[side], to = keys[(side + 1) % 3]
      const key = from < to ? `${from}|${to}` : `${to}|${from}`
      const existing = edges.get(key)
      if (existing) existing.count++
      else edges.set(key, { from, to, count: 1 })
    }
  }

  const boundary = [...edges.values()].filter(edge => edge.count === 1)
  if (boundary.length > ELECTRIC_CONTOUR_MAX_SEGMENTS) {
    throw new Error(`Electric logo contour has ${boundary.length} boundary segments; the shader supports at most ${ELECTRIC_CONTOUR_MAX_SEGMENTS}.`)
  }
  if (boundary.length === 0) {
    throw new Error('Cannot build electric logo contour: no closed local +Y front-face perimeter was found.')
  }
  const degree = new Map<string, number>()
  for (const edge of boundary) {
    degree.set(edge.from, (degree.get(edge.from) ?? 0) + 1)
    degree.set(edge.to, (degree.get(edge.to) ?? 0) + 1)
  }
  if ([...degree.values()].some(count => count !== 2) || [...edges.values()].some(edge => edge.count > 2)) {
    throw new Error('Cannot build electric logo contour: the local +Y front-face perimeter is open or non-manifold.')
  }
  return boundary.map(edge => {
    const from = vertices.get(edge.from)!, to = vertices.get(edge.to)!
    return new Vector4(from.x, from.z, to.x, to.z).multiplyScalar(ELECTRIC_CONTOUR_SCALE)
  })
}
