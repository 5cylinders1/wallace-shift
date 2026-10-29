/**
 * Finds the mowable lawn on a lot from the public-domain NAIP aerial.
 *
 * 1. The lot: every pixel nearer the house than any neighbouring house
 *    (sheds and garages don't count as neighbours), within the frame.
 * 2. Grass: the near-infrared photo makes living plants bright, so a
 *    vegetation index finds them; tree canopy is then set apart from turf
 *    by being darker and far more textured at 30–60 cm a pixel.
 * 3. Only patches that reach the house are kept, so a field across the
 *    road or a neighbour's yard beyond a fence line of trees stays out.
 *
 * It is an estimate: shade, beds and fence lines are judgement calls, which
 * is why the homeowner can paint and erase before asking for service.
 *
 * New builds are often missing from the building data. Then the house is a
 * spot: found by the roof at the address, or tapped by the homeowner, and
 * stood in for by a square the size of the neighbouring houses.
 */

import { edgeDistanceSq, fillRing, projector, type Px } from './geo'
import type { LawnBuilding, LawnFrame, LawnLookup } from './types'

export const SQFT_PER_M2 = 10.763_910_4
/** Below this an outline is a shed or garage, not a house that claims part of the lot. */
const HOUSE_MIN_SQFT = 800
/** Vegetation index (NIR − red) / (NIR + red). */
const MIN_NDVI = 0.15
/** Mean of the visible red and green bands, 0–255: canopy and its shadow are darker. */
const MIN_BRIGHTNESS = 50
/** Standard deviation of NIR over a 5 × 5 window: turf is smooth, canopy is not. */
const MAX_TEXTURE = 18
/** A lawn patch must come this close to the house to be the homeowner's. */
const NEAR_HOUSE_M = 14
const MIN_PATCH_M2 = 8
/** Below this vegetation index a pixel is roof or paving. */
const MAX_ROOF_NDVI = 0.1
/** The address is on a roof when most of this disc around it is. */
const ROOF_PROBE_M = 2.5
const ROOF_SHARE = 0.6
/** Stand-in house when the data has no outline: the neighbours' median, within limits. */
const STAND_IN_SQFT = { fallback: 2000, min: 900, max: 4500 }

/** The house the lot belongs to: a mapped outline, or a spot (analysis pixels) without one. */
export type HomeChoice = { outline: string } | { spot: Px }

export interface LawnMask {
  size: number
  metersPerPx: number
  /** 1 where there is lawn; edited in place by the brush. */
  lawn: Uint8Array
  /** The automatic answer, for "Reset". */
  auto: Uint8Array
  /** 1 on buildings: never lawn, never paintable. */
  blocked: Uint8Array
  /** Rings in analysis pixels, for drawing the outlines. */
  rings: { id: string; ring: Px[]; house: boolean }[]
  /** The house's ring: its outline, or the stand-in square for a spot. */
  home: Px[]
}

export function lawnSqFt(mask: Pick<LawnMask, 'lawn' | 'metersPerPx'>): number {
  let count = 0
  for (let i = 0; i < mask.lawn.length; i += 1) count += mask.lawn[i]
  return Math.round(count * mask.metersPerPx ** 2 * SQFT_PER_M2)
}

/** Lot share of the home at a coarser grid (each cell is `step` pixels square). */
function lotCells(size: number, step: number, home: Px[], rivals: Px[][], homeInside: Uint8Array) {
  const grid = Math.ceil(size / step)
  const mine = new Uint8Array(grid * grid)
  const homeDistance = new Float32Array(grid * grid)
  for (let gy = 0; gy < grid; gy += 1) {
    for (let gx = 0; gx < grid; gx += 1) {
      const x = gx * step + step / 2
      const y = gy * step + step / 2
      const pixel = Math.min(size - 1, Math.floor(y)) * size + Math.min(size - 1, Math.floor(x))
      const own = homeInside[pixel] ? 0 : edgeDistanceSq(x, y, home)
      let nearest = Infinity
      for (const ring of rivals) {
        nearest = Math.min(nearest, edgeDistanceSq(x, y, ring))
        if (nearest < own) break
      }
      mine[gy * grid + gx] = own <= nearest ? 1 : 0
      homeDistance[gy * grid + gx] = Math.sqrt(own)
    }
  }
  return { grid, mine, homeDistance }
}

function erode(mask: Uint8Array, size: number): Uint8Array {
  const out = new Uint8Array(mask.length)
  for (let y = 1; y < size - 1; y += 1) {
    for (let x = 1; x < size - 1; x += 1) {
      const i = y * size + x
      out[i] = mask[i] & mask[i - 1] & mask[i + 1] & mask[i - size] & mask[i + size]
    }
  }
  return out
}

function dilate(mask: Uint8Array, size: number): Uint8Array {
  const out = new Uint8Array(mask.length)
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const i = y * size + x
      out[i] = mask[i] | (x > 0 ? mask[i - 1] : 0) | (x < size - 1 ? mask[i + 1] : 0) | (y > 0 ? mask[i - size] : 0) | (y < size - 1 ? mask[i + size] : 0)
    }
  }
  return out
}

const ndviAt = (data: Uint8ClampedArray, i: number) => (data[i * 4] - data[i * 4 + 1]) / (data[i * 4] + data[i * 4 + 1] + 1e-6)

/** True when most of a disc around a pixel is roof or paving rather than plants. */
function onRoof(infrared: ImageData, [cx, cy]: Px, radiusPx: number): boolean {
  const size = infrared.width
  let total = 0
  let bare = 0
  for (let y = Math.max(0, Math.floor(cy - radiusPx)); y <= Math.min(size - 1, Math.ceil(cy + radiusPx)); y += 1) {
    for (let x = Math.max(0, Math.floor(cx - radiusPx)); x <= Math.min(size - 1, Math.ceil(cx + radiusPx)); x += 1) {
      if ((x - cx) ** 2 + (y - cy) ** 2 > radiusPx ** 2) continue
      total += 1
      if (ndviAt(infrared.data, y * size + x) < MAX_ROOF_NDVI) bare += 1
    }
  }
  return total > 0 && bare / total >= ROOF_SHARE
}

/**
 * The house when the lookup couldn't name one. A precise address on a roof
 * with no outline is a house the building data doesn't have yet; otherwise
 * the nearest mapped house in view, or the address itself.
 */
export function autoHome(infrared: ImageData, data: LawnLookup): HomeChoice {
  if (data.home) return { outline: data.home }
  const { toPx, metersPerPx } = projector(data.frame, infrared.width)
  const at = toPx(data.location)
  const precise = data.precision === 'rooftop' || data.precision === 'parcel'
  if (precise && onRoof(infrared, at, ROOF_PROBE_M / metersPerPx)) return { spot: at }
  const nearest = data.buildings.find((building) => building.areaSqFt >= HOUSE_MIN_SQFT && building.distanceM <= data.frame.viewM / 2)
  return nearest ? { outline: nearest.id } : { spot: at }
}

/** A square the size of the neighbouring houses, centered on the spot. */
function standIn([cx, cy]: Px, buildings: LawnBuilding[], metersPerPx: number): Px[] {
  const houses = buildings.map((building) => building.areaSqFt).filter((sqft) => sqft >= HOUSE_MIN_SQFT).sort((a, b) => a - b)
  const median = houses.length ? houses[Math.floor(houses.length / 2)] : STAND_IN_SQFT.fallback
  const sqft = Math.min(STAND_IN_SQFT.max, Math.max(STAND_IN_SQFT.min, median))
  const r = Math.sqrt(sqft / SQFT_PER_M2) / 2 / metersPerPx
  return [[cx - r, cy - r], [cx + r, cy - r], [cx + r, cy + r], [cx - r, cy + r]]
}

/**
 * `infrared` is the NAIP false-color export: near-infrared, red and green
 * bands as the image's R, G and B.
 */
export function measureLawn(infrared: ImageData, frame: LawnFrame, buildings: LawnBuilding[], choice: HomeChoice): LawnMask {
  const size = infrared.width
  const { toPx, metersPerPx } = projector(frame, size)
  const homeId = 'outline' in choice ? choice.outline : null
  const rings = buildings.map((building) => ({
    id: building.id,
    ring: building.ring.map(toPx),
    house: building.areaSqFt >= HOUSE_MIN_SQFT || building.id === homeId,
  }))
  const blocked = new Uint8Array(size * size)
  for (const { ring } of rings) fillRing(ring, size, (i) => (blocked[i] = 1))

  const outline = rings.find((ring) => ring.id === homeId)
  // The stand-in isn't blocked: if it overhangs the roof, the grass there still counts.
  const homeRing: Px[] = outline?.ring ?? standIn('spot' in choice ? choice.spot : [size / 2, size / 2], buildings, metersPerPx)
  const homeInside = new Uint8Array(size * size)
  fillRing(homeRing, size, (i) => (homeInside[i] = 1))
  const rivals = rings.filter((ring) => ring.house && ring.id !== homeId).map((ring) => ring.ring)

  const step = 2
  const lot = lotCells(size, step, homeRing, rivals, homeInside)
  const lotAt = (x: number, y: number) => {
    const cell = Math.floor(y / step) * lot.grid + Math.floor(x / step)
    return lot.mine[cell]
  }

  // Texture: local NIR standard deviation from integral images.
  const data = infrared.data
  const stride = size + 1
  const sum = new Float64Array(stride * stride)
  const sumSq = new Float64Array(stride * stride)
  for (let y = 0; y < size; y += 1) {
    let rowSum = 0
    let rowSq = 0
    for (let x = 0; x < size; x += 1) {
      const nir = data[(y * size + x) * 4]
      rowSum += nir
      rowSq += nir * nir
      sum[(y + 1) * stride + x + 1] = sum[y * stride + x + 1] + rowSum
      sumSq[(y + 1) * stride + x + 1] = sumSq[y * stride + x + 1] + rowSq
    }
  }
  const reach = 2
  const textureAt = (x: number, y: number) => {
    const x0 = Math.max(0, x - reach)
    const y0 = Math.max(0, y - reach)
    const x1 = Math.min(size, x + reach + 1)
    const y1 = Math.min(size, y + reach + 1)
    const n = (x1 - x0) * (y1 - y0)
    const s = sum[y1 * stride + x1] - sum[y0 * stride + x1] - sum[y1 * stride + x0] + sum[y0 * stride + x0]
    const q = sumSq[y1 * stride + x1] - sumSq[y0 * stride + x1] - sumSq[y1 * stride + x0] + sumSq[y0 * stride + x0]
    const mean = s / n
    return Math.sqrt(Math.max(0, q / n - mean * mean))
  }

  const raw = new Uint8Array(size * size)
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const i = y * size + x
      if (blocked[i] || !lotAt(x, y)) continue
      const red = data[i * 4 + 1]
      const green = data[i * 4 + 2]
      if (ndviAt(data, i) > MIN_NDVI && (red + green) / 2 > MIN_BRIGHTNESS && textureAt(x, y) < MAX_TEXTURE) raw[i] = 1
    }
  }
  // An opening: specks of grass in a bed or canopy gap go, solid lawn stays.
  const candidate = dilate(erode(raw, size), size)

  // Keep the patches that reach the house.
  const lawn = new Uint8Array(size * size)
  const seen = new Uint8Array(size * size)
  const queue = new Int32Array(size * size)
  const nearPx = NEAR_HOUSE_M / metersPerPx
  const minPatch = MIN_PATCH_M2 / metersPerPx ** 2
  for (let start = 0; start < candidate.length; start += 1) {
    if (!candidate[start] || seen[start]) continue
    let head = 0
    let tail = 0
    let near = false
    queue[tail++] = start
    seen[start] = 1
    while (head < tail) {
      const i = queue[head++]
      const x = i % size
      const y = (i - x) / size
      if (!near && lot.homeDistance[Math.floor(y / step) * lot.grid + Math.floor(x / step)] <= nearPx) near = true
      for (const j of [x > 0 ? i - 1 : -1, x < size - 1 ? i + 1 : -1, y > 0 ? i - size : -1, y < size - 1 ? i + size : -1]) {
        if (j >= 0 && candidate[j] && !seen[j]) {
          seen[j] = 1
          queue[tail++] = j
        }
      }
    }
    if (near && tail >= minPatch) for (let k = 0; k < tail; k += 1) lawn[queue[k]] = 1
  }

  return { size, metersPerPx, lawn, auto: lawn.slice(), blocked, rings, home: homeRing }
}

/** Paints (value 1) or erases (0) a disc; buildings stay off-limits. */
export function brush(mask: LawnMask, cx: number, cy: number, radiusPx: number, value: 0 | 1): void {
  const { size, lawn, blocked } = mask
  const r2 = radiusPx * radiusPx
  for (let y = Math.max(0, Math.floor(cy - radiusPx)); y <= Math.min(size - 1, Math.ceil(cy + radiusPx)); y += 1) {
    for (let x = Math.max(0, Math.floor(cx - radiusPx)); x <= Math.min(size - 1, Math.ceil(cx + radiusPx)); x += 1) {
      const i = y * size + x
      if ((x - cx) ** 2 + (y - cy) ** 2 <= r2 && !blocked[i]) lawn[i] = value
    }
  }
}
