/**
 * Turns a raster mask (non-zero = roof) into a clean building outline, the
 * way footprint datasets are made from imagery: keep the 4-connected
 * component under (or nearest to) the building's centre, plus sizeable
 * islands centred inside its box, walk each piece's outer edge along pixel
 * edges, then simplify the staircases back into straight eaves and rakes.
 *
 * Used only to build the bundled sample house, so its outline has the
 * same character as real data rather than the drawing's perfect corners.
 */

import { collapseShortEdges, simplifyRing, type Point } from '../../api/_lib/roof/polygon.ts'

export interface PixelBox {
  x0: number
  y0: number
  x1: number
  y1: number
}

export interface OutlineOptions {
  /** Where the building is, in pixels. */
  seed: Point
  /** The building's bounding box in pixels; pieces must centre inside it. */
  box: PixelBox
  /** Douglas–Peucker tolerance, in pixels. */
  tolerance: number
  /** Ignore islands smaller than this share of the main piece. */
  minShare?: number
}

export interface Outline {
  polygons: Point[][]
  /** Roof pixels kept, for sanity checks against the reported area. */
  pixelCount: number
}

interface Component {
  pixels: Int32Array
  count: number
  cx: number
  cy: number
}

function floodComponent(mask: Uint8Array, labels: Int32Array, width: number, height: number, start: number, label: number): Component {
  const stack = [start]
  const pixels: number[] = []
  labels[start] = label
  let sx = 0
  let sy = 0
  while (stack.length) {
    const index = stack.pop() as number
    pixels.push(index)
    const x = index % width
    const y = (index - x) / width
    sx += x
    sy += y
    const neighbours = [
      x > 0 ? index - 1 : -1,
      x < width - 1 ? index + 1 : -1,
      y > 0 ? index - width : -1,
      y < height - 1 ? index + width : -1,
    ]
    for (const next of neighbours) {
      if (next >= 0 && mask[next] && labels[next] === 0) {
        labels[next] = label
        stack.push(next)
      }
    }
  }
  return { pixels: Int32Array.from(pixels), count: pixels.length, cx: sx / pixels.length + 0.5, cy: sy / pixels.length + 0.5 }
}

/** The roof pixel nearest the seed, searching outward ring by ring. */
function nearestRoofPixel(mask: Uint8Array, width: number, height: number, [sx, sy]: Point, maxRadius: number): number {
  const cx = Math.min(width - 1, Math.max(0, Math.floor(sx)))
  const cy = Math.min(height - 1, Math.max(0, Math.floor(sy)))
  for (let r = 0; r <= maxRadius; r += 1) {
    let best = -1
    let bestDistance = Infinity
    for (let y = cy - r; y <= cy + r; y += 1) {
      if (y < 0 || y >= height) continue
      for (let x = cx - r; x <= cx + r; x += 1) {
        if (x < 0 || x >= width) continue
        if (Math.max(Math.abs(x - cx), Math.abs(y - cy)) !== r) continue
        const index = y * width + x
        if (!mask[index]) continue
        const distance = (x - cx) ** 2 + (y - cy) ** 2
        if (distance < bestDistance) {
          bestDistance = distance
          best = index
        }
      }
    }
    if (best >= 0) return best
  }
  return -1
}

/**
 * Walks the outer boundary of a single component along pixel edges,
 * clockwise in image coordinates (y down), keeping the roof on the right.
 * Vertices are pixel corners; only turning points are emitted.
 */
export function traceBoundary(component: Uint8Array, width: number, height: number): Point[] {
  const at = (x: number, y: number) => (x >= 0 && y >= 0 && x < width && y < height ? component[y * width + x] : 0)

  let start = -1
  for (let i = 0; i < component.length; i += 1) {
    if (component[i]) {
      start = i
      break
    }
  }
  if (start < 0) return []

  // Directions: 0 east, 1 south, 2 west, 3 north.
  const DX = [1, 0, -1, 0]
  const DY = [0, 1, 0, -1]
  // An edge leaving corner (x, y) in direction d is a boundary edge when the
  // pixel on its right is roof and the one on its left is not.
  const isBoundary = (x: number, y: number, d: number) => {
    switch (d) {
      case 0:
        return at(x, y) === 1 && at(x, y - 1) !== 1
      case 1:
        return at(x - 1, y) === 1 && at(x, y) !== 1
      case 2:
        return at(x - 1, y - 1) === 1 && at(x - 1, y) !== 1
      default:
        return at(x, y - 1) === 1 && at(x - 1, y - 1) !== 1
    }
  }

  const startX = start % width
  const startY = (start - startX) / width
  let x = startX
  let y = startY
  let d = 0
  const points: Point[] = [[x, y]]
  const limit = 4 * (width + 1) * (height + 1)

  for (let steps = 0; steps < limit; steps += 1) {
    x += DX[d]
    y += DY[d]
    if (x === startX && y === startY) break
    // Right turn first keeps diagonal-only neighbours separate, matching
    // the 4-connected flood fill that defined the component.
    const options = [(d + 1) % 4, d, (d + 3) % 4]
    const next = options.find((candidate) => isBoundary(x, y, candidate))
    if (next === undefined) break
    if (next !== d) points.push([x, y])
    d = next
  }
  return points
}

export function buildingOutline(mask: Uint8Array, width: number, height: number, options: OutlineOptions): Outline {
  const minShare = options.minShare ?? 0.04
  const labels = new Int32Array(width * height)
  const searchRadius = Math.ceil(Math.max(options.box.x1 - options.box.x0, options.box.y1 - options.box.y0) / 2) + 2
  const seed = nearestRoofPixel(mask, width, height, options.seed, searchRadius)
  if (seed < 0) return { polygons: [], pixelCount: 0 }

  let label = 1
  const main = floodComponent(mask, labels, width, height, seed, label)
  const kept: Component[] = [main]

  // Other islands of the same roof: centred inside the building's box and
  // not mere specks.
  const { x0, y0, x1, y1 } = options.box
  for (let y = Math.max(0, Math.floor(y0)); y < Math.min(height, Math.ceil(y1)); y += 1) {
    for (let x = Math.max(0, Math.floor(x0)); x < Math.min(width, Math.ceil(x1)); x += 1) {
      const index = y * width + x
      if (!mask[index] || labels[index] !== 0) continue
      label += 1
      const piece = floodComponent(mask, labels, width, height, index, label)
      const centred = piece.cx >= x0 && piece.cx <= x1 && piece.cy >= y0 && piece.cy <= y1
      if (centred && piece.count >= main.count * minShare) kept.push(piece)
    }
  }

  const polygons: Point[][] = []
  let pixelCount = 0
  for (const piece of kept) {
    const isolated = new Uint8Array(width * height)
    for (const index of piece.pixels) isolated[index] = 1
    const ring = collapseShortEdges(simplifyRing(traceBoundary(isolated, width, height), options.tolerance), options.tolerance * 3)
    if (ring.length >= 3) {
      polygons.push(ring)
      pixelCount += piece.count
    }
  }
  return { polygons, pixelCount }
}
