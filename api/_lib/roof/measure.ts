/**
 * Raw outlines → the buildings the homeowner chooses from: ground area,
 * distance from the address point, and a corner count that hints at how
 * cut-up the roof is.
 */

import type { FootprintBuilding, LatLng } from '../../../src/demos/roofers/roof/types.js'
import type { RawFootprint } from './footprints.js'
import { collapseShortEdges, distanceToRing, localMeters, ringArea, simplifyRing, type Point } from './polygon.js'

export const SQFT_PER_M2 = 10.763_910_4

/** Ignore sheds and slivers; footprint datasets leave most out anyway. */
const MIN_AREA_M2 = 6
/** More buildings than this is a block, not a lot. */
const MAX_BUILDINGS = 8
/** Lidar-traced outlines are jagged; corners are counted after this much smoothing (metres). */
const CORNER_TOLERANCE_M = 0.3
const CORNER_MIN_EDGE_M = 0.9
/** Payload guard: outlines with more vertices than this are lightly simplified. */
const MAX_VERTICES = 120

const open = (ring: LatLng[]) => {
  const first = ring[0]
  const last = ring[ring.length - 1]
  return first.lat === last.lat && first.lng === last.lng ? ring.slice(0, -1) : ring
}

const round7 = (value: number) => Math.round(value * 1e7) / 1e7

export function measureBuildings(raw: RawFootprint[], point: LatLng, radiusM: number): FootprintBuilding[] {
  const plane = localMeters(point)
  const here: Point = [0, 0]
  const buildings: FootprintBuilding[] = []

  for (const footprint of raw) {
    const [outer, ...holes] = footprint.rings.map((ring) => open(ring).map(plane.to))
    if (!outer || outer.length < 3) continue
    const areaM2 = ringArea(outer) - holes.reduce((sum, hole) => sum + ringArea(hole), 0)
    if (areaM2 < MIN_AREA_M2) continue
    const distanceM = distanceToRing(here, outer)
    if (distanceM > radiusM) continue

    const corners = collapseShortEdges(simplifyRing(outer, CORNER_TOLERANCE_M), CORNER_MIN_EDGE_M).length
    const drawn = outer.length > MAX_VERTICES ? simplifyRing(outer, 0.15) : outer
    buildings.push({
      id: footprint.id,
      ring: drawn.map((xy) => {
        const { lat, lng } = plane.from(xy)
        return { lat: round7(lat), lng: round7(lng) }
      }),
      areaSqFt: Math.round(areaM2 * SQFT_PER_M2),
      distanceM: Math.round(distanceM * 10) / 10,
      corners,
    })
  }

  // The building the point falls in first, then nearest; larger breaks ties.
  buildings.sort((a, b) => a.distanceM - b.distanceM || b.areaSqFt - a.areaSqFt)
  return buildings.slice(0, MAX_BUILDINGS)
}
