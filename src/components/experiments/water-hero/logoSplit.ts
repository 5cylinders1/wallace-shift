import { Box3, Matrix3, Mesh, Vector3, type BufferGeometry, type Group, type Object3D, type PerspectiveCamera } from 'three'
import type { LogoNodes, LogoRevealContour } from './waterHeroTypes'

interface ProjectedMesh { mesh: Mesh; geometry: BufferGeometry; points: Float64Array; edges: Uint32Array }

export function createLogoSplitScratch() {
  return {
    bounds: new Box3(), center: new Vector3(), point: new Vector3(), right: new Vector3(),
    worldOrigin: new Vector3(), offset: new Vector3(), toRig: new Matrix3(),
    leftOffset: new Vector3(), rightOffset: new Vector3(),
    reveal: { rows: [], left: [], right: [], version: 0, open: false, complete: false } as LogoRevealContour,
    contourMeshes: new Map<Object3D, ProjectedMesh[]>(),
    contourMatrices: new Float64Array(48), contourAmount: -1, contourWidth: -1,
  }
}

export function restoreLogoHalves(nodes: LogoNodes) {
  for (const [part, proxy, baseline] of [
    [nodes.left, nodes.proxyLeft, nodes.baseline.left],
    [nodes.right, nodes.proxyRight, nodes.baseline.right],
  ] as const) {
    part.position.copy(baseline.position)
    part.quaternion.copy(baseline.quaternion)
    part.scale.copy(baseline.scale)
    proxy.position.copy(baseline.position)
    proxy.quaternion.copy(baseline.quaternion)
    proxy.scale.copy(baseline.scale)
  }
}

/** Reconstruct each half from its authored transform, then move the visible
 * left half left and the visible right half right. At a half turn these are
 * the opposite authored names. Camera-space travel guarantees a full exit
 * on every aspect ratio without altering the logo asset or camera framing. */
export function applyLogoSplit(nodes: LogoNodes, rig: Group, camera: PerspectiveCamera,
  amount: number, scratch: ReturnType<typeof createLogoSplitScratch>, viewportWidth = 1920) {
  restoreLogoHalves(nodes)
  rig.updateMatrixWorld(true)
  scratch.leftOffset.set(0, 0, 0)
  scratch.rightOffset.set(0, 0, 0)
  const split = Math.max(0, Math.min(1, amount))
  if (split === 0) {
    if (scratch.reveal.open || scratch.reveal.rows.length) scratch.reveal.version++
    scratch.reveal.open = false
    scratch.reveal.complete = false
    scratch.reveal.rows.length = scratch.reveal.left.length = scratch.reveal.right.length = 0
    scratch.contourAmount = -1
    return
  }
  scratch.right.setFromMatrixColumn(camera.matrixWorld, 0).normalize()
  scratch.toRig.setFromMatrix4(rig.matrixWorld).invert()
  const horizontalProjection = 1 / camera.projectionMatrix.elements[0]
  for (const [part, proxy, materialOffset] of [
    [nodes.left, nodes.proxyLeft, scratch.leftOffset],
    [nodes.right, nodes.proxyRight, scratch.rightOffset],
  ] as const) {
    scratch.bounds.setFromObject(part)
    scratch.bounds.getCenter(scratch.center).applyMatrix4(camera.matrixWorldInverse)
    const direction = scratch.center.x < 0 ? -1 : 1
    let travel = 0
    // Bound all eight corners, including the furthest corner's perspective
    // depth, so the piece's trailing edge clears the viewport as well.
    for (const x of [scratch.bounds.min.x, scratch.bounds.max.x]) {
      for (const y of [scratch.bounds.min.y, scratch.bounds.max.y]) {
        for (const z of [scratch.bounds.min.z, scratch.bounds.max.z]) {
          scratch.point.set(x, y, z).applyMatrix4(camera.matrixWorldInverse)
          const edge = 1.10 * Math.max(.001, -scratch.point.z) * horizontalProjection
          travel = Math.max(travel, edge - direction * scratch.point.x)
        }
      }
    }
    scratch.offset.copy(scratch.right).multiplyScalar(direction * travel * split)
    materialOffset.copy(scratch.offset).applyMatrix3(scratch.toRig)
    part.getWorldPosition(scratch.worldOrigin).add(scratch.offset)
    part.parent!.worldToLocal(scratch.worldOrigin)
    part.position.copy(scratch.worldOrigin)
    proxy.position.copy(part.position)
  }
  rig.updateMatrixWorld(true)
  updateRevealContours(nodes, rig, camera, split, viewportWidth, scratch)
}

function meshProjections(part: Object3D, cache: Map<Object3D, ProjectedMesh[]>) {
  let records = cache.get(part)
  if (records?.every(record => record.geometry === record.mesh.geometry)) return records
  records = []
  part.traverse(mesh => {
    if (!(mesh instanceof Mesh)) return
    const positions = mesh.geometry.getAttribute('position')
    const index = mesh.geometry.index
    const count = index?.count ?? positions.count
    const edgeSet = new Set<string>()
    const edges: number[] = []
    for (let triangle = 0; triangle < count; triangle += 3) {
      for (let side = 0; side < 3; side++) {
        const a = index ? index.getX(triangle + side) : triangle + side
        const b = index ? index.getX(triangle + (side + 1) % 3) : triangle + (side + 1) % 3
        const key = `${Math.min(a, b)}:${Math.max(a, b)}`
        if (edgeSet.has(key)) continue
        edgeSet.add(key)
        edges.push(a, b)
      }
    }
    records!.push({ mesh, geometry: mesh.geometry, points: new Float64Array(positions.count * 2), edges: Uint32Array.from(edges) })
  })
  cache.set(part, records)
  return records
}

function lowerBound(values: number[], target: number) {
  let low = 0, high = values.length
  while (low < high) {
    const middle = (low + high) >>> 1
    if (values[middle] < target) low = middle + 1
    else high = middle
  }
  return low
}

/** Continue the last angled contour segment beyond its vertical extent.
 * This keeps tall type bounded by the parting shapes instead of adding
 * rectangular panels above/below the metal. The actual mesh-height range
 * always uses its projected triangle edges without extrapolation. */
function extendContour(rows: number[], edge: number[], visibleLeft: boolean) {
  const first = edge.findIndex(Number.isFinite)
  if (first < 0) return
  let last = edge.length - 1
  while (!Number.isFinite(edge[last])) last--
  let next = first + 1
  while (next < last && rows[next] - rows[first] < .025) next++
  let previous = last - 1
  while (previous > first && rows[last] - rows[previous] < .025) previous--
  const slope = (a: number, b: number) => Math.max(-4, Math.min(4,
    (edge[b] - edge[a]) / Math.max(1e-8, rows[b] - rows[a])))
  const bottomSlope = next <= last ? slope(first, next) : 0
  const topSlope = previous >= first ? slope(previous, last) : 0
  let inner = visibleLeft ? -Infinity : Infinity
  for (let i = first; i <= last; i++) inner = visibleLeft ? Math.max(inner, edge[i]) : Math.min(inner, edge[i])
  const remaining = Math.max(0, Math.min(1, (visibleLeft ? 1 + inner : 1 - inner) / .5))
  const continuation = remaining * remaining * (3 - 2 * remaining)
  // Off-height continuations relax as the actual metal clears the viewport.
  // Tall or narrow-screen headings therefore finish revealing continuously,
  // rather than popping from a lingering artificial mask at the final frame.
  for (let i = 0; i < first; i++) edge[i] = edge[first] + bottomSlope * (rows[i] - rows[first]) * continuation
  for (let i = last + 1; i < rows.length; i++) edge[i] = edge[last] + topSlope * (rows[i] - rows[last]) * continuation
}

function updateRevealContours(nodes: LogoNodes, rig: Group, camera: PerspectiveCamera,
  amount: number, viewportWidth: number, scratch: ReturnType<typeof createLogoSplitScratch>) {
  let changed = amount !== scratch.contourAmount || viewportWidth !== scratch.contourWidth
  let entry = 0
  for (const matrix of [rig.matrixWorld, camera.matrixWorld, camera.projectionMatrix]) {
    for (const value of matrix.elements) {
      if (scratch.contourMatrices[entry] !== value) changed = true
      scratch.contourMatrices[entry++] = value
    }
  }
  // Appearance comparisons can replace geometry without moving the camera
  // or either mesh. Refresh topology and projected buffer sizes before the
  // held-pose shortcut, so the text mask follows the selected silhouette.
  const records = [nodes.left, nodes.right].map(part => {
    const previous = scratch.contourMeshes.get(part)
    const current = meshProjections(part, scratch.contourMeshes)
    if (current !== previous) changed = true
    return current
  })
  if (!changed) return
  scratch.contourAmount = amount
  scratch.contourWidth = viewportWidth
  const contour = scratch.reveal
  const rows = contour.rows
  rows.length = 0
  // Vertex heights retain the actual corners; uniform samples bound any
  // change where projected edges overlap between vertex heights.
  for (let i = 0; i <= 64; i++) rows.push(i / 32 - 1)
  for (const meshes of records) {
    for (const { mesh, points } of meshes) {
      const positions = mesh.geometry.getAttribute('position')
      for (let i = 0; i < positions.count; i++) {
        scratch.point.fromBufferAttribute(positions, i).applyMatrix4(mesh.matrixWorld).project(camera)
        points[i * 2] = scratch.point.x
        points[i * 2 + 1] = scratch.point.y
        if (scratch.point.y >= -1 && scratch.point.y <= 1) rows.push(scratch.point.y)
      }
    }
  }
  rows.sort((a, b) => a - b)
  let unique = 0
  for (const y of rows) if (unique === 0 || y - rows[unique - 1] > 1e-7) rows[unique++] = y
  rows.length = unique
  contour.left.length = contour.right.length = unique
  contour.left.fill(-Infinity)
  contour.right.fill(Infinity)
  for (let partIndex = 0; partIndex < 2; partIndex++) {
    const part = partIndex === 0 ? nodes.left : nodes.right
    scratch.bounds.setFromObject(part).getCenter(scratch.center).project(camera)
    const visibleLeft = scratch.center.x < 0
    const edge = visibleLeft ? contour.left : contour.right
    const recordHit = (row: number, x: number) => {
      edge[row] = visibleLeft ? Math.max(edge[row], x) : Math.min(edge[row], x)
    }
    for (const { points, edges } of records[partIndex]) {
      for (let i = 0; i < edges.length; i += 2) {
        const a = edges[i] * 2, b = edges[i + 1] * 2
        const ax = points[a], ay = points[a + 1], bx = points[b], by = points[b + 1]
        const minY = Math.min(ay, by), maxY = Math.max(ay, by)
        for (let row = lowerBound(rows, minY - 1e-7); row < rows.length && rows[row] <= maxY + 1e-7; row++) {
          if (Math.abs(by - ay) < 1e-8) {
            recordHit(row, ax); recordHit(row, bx)
          } else {
            const t = Math.max(0, Math.min(1, (rows[row] - ay) / (by - ay)))
            recordHit(row, ax + (bx - ax) * t)
          }
        }
      }
    }
    extendContour(rows, edge, visibleLeft)
  }
  const clearance = 2 / Math.max(1, viewportWidth)
  // Insert exact closures before collapsing overlapping traces. Without the
  // crossing row a polygon could form a thin triangular opening over metal
  // between a closed row and the next clear row.
  for (let i = rows.length - 1; i > 0; i--) {
    const before = contour.right[i - 1] - contour.left[i - 1] - 2 * clearance
    const after = contour.right[i] - contour.left[i] - 2 * clearance
    if (before * after >= 0) continue
    const t = before / (before - after)
    const interpolate = (values: number[]) => values[i - 1] + (values[i] - values[i - 1]) * t
    const y = interpolate(rows), left = interpolate(contour.left), right = interpolate(contour.right)
    rows.splice(i, 0, y)
    contour.left.splice(i, 0, left)
    contour.right.splice(i, 0, right)
  }
  contour.open = false
  for (let i = 0; i < rows.length; i++) {
    const left = contour.left[i] + clearance
    const right = contour.right[i] - clearance
    if (left >= right) contour.left[i] = contour.right[i] = (left + right) * .5
    else {
      contour.left[i] = left
      contour.right[i] = right
      if (right > -1 && left < 1) contour.open = true
    }
  }
  contour.complete = amount >= 1
  contour.version++
}
