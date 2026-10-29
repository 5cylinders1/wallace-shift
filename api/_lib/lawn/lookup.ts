/**
 * Address → everything the estimator needs to measure a lawn in the browser:
 * the house and its neighbours (open footprint data), a public-domain aerial
 * pair framed on the lot, the distance from the business, and the rates.
 *
 * The measuring itself happens on the page (src/demos/lawn/estimate/measure.ts):
 * the lot is split between neighbouring houses, and the grass in the
 * homeowner's share is found in the near-infrared photo. That photo is
 * USDA NAIP, which is public domain, so analysing it is allowed; Mapbox's
 * and Google's terms forbid deriving data from their imagery, which is why
 * neither is used here (compare api/_lib/roof/imagery.ts).
 */

import type { Credit, LatLng, LawnBuilding, LawnFrame, LawnLookup } from '../../../src/demos/lawn/estimate/types.js'
import { footprintSourcesFromEnv } from '../roof/footprints.js'
import { geocoderFromEnv } from '../roof/geocoder.js'
import { RoofError, deadlineIn } from '../roof/http.js'
import { measureBuildings } from '../roof/measure.js'
import { localMeters } from '../roof/polygon.js'
import { pricingFromEnv, rangeOf, searchBias } from './config.js'
import { LawnError } from './http.js'

export type LookupTarget = { kind: 'suggestion'; id: string } | { kind: 'address'; address: string }

/** Neighbours are needed too: the lot is split between houses. */
const SEARCH_M = 110
const LOOKUP_BUDGET_MS = 15_000
/** A building-level point this close to an outline is taken to be on the house. */
const HOME_WITHIN_M = 15
/** Smaller outlines are sheds and garages: they never claim lawn from the house. */
export const HOUSE_MIN_SQFT = 800
/** Square view, ground metres: a tight suburban lot up to an acreage. */
const VIEW_M = { min: 70, max: 160, perNeighbourM: 2.4 }
export const FRAME_SIZE = 640

const NAIP = 'https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer/exportImage'
const NAIP_CREDITS: Credit[] = [
  { text: 'Imagery: NAIP, USDA FPAC Business Center' },
  { text: 'via USGS The National Map', href: 'https://www.usgs.gov/programs/national-geospatial-program/national-map' },
]

const EARTH_RADIUS = 6_378_137

function naipUrl(frame: LawnFrame, pixels: number, bands: string | null): string {
  const x = (EARTH_RADIUS * frame.center.lng * Math.PI) / 180
  const y = EARTH_RADIUS * Math.log(Math.tan(Math.PI / 4 + (frame.center.lat * Math.PI) / 360))
  // Ground metres → Web Mercator metres at this latitude.
  const half = frame.viewM / 2 / Math.cos((frame.center.lat * Math.PI) / 180)
  const params = new URLSearchParams({
    bbox: [x - half, y - half, x + half, y + half].map((v) => v.toFixed(2)).join(','),
    bboxSR: '3857',
    imageSR: '3857',
    size: `${pixels},${pixels}`,
    format: 'jpg',
    f: 'image',
  })
  // Near-infrared, red, green as the image's R, G, B: grass and trees glow in R.
  if (bands) params.set('bandIds', bands)
  return `${NAIP}?${params}`
}

const centroid = (ring: LatLng[]): LatLng => ({
  lat: ring.reduce((sum, p) => sum + p.lat, 0) / ring.length,
  lng: ring.reduce((sum, p) => sum + p.lng, 0) / ring.length,
})

/** Wider when the nearest neighbouring house is farther away, so the whole lot is in view. */
function viewFor(home: LawnBuilding | null, buildings: LawnBuilding[], point: LatLng): { center: LatLng; viewM: number } {
  const center = home ? centroid(home.ring) : point
  const plane = localMeters(center)
  const gaps = buildings
    .filter((b) => b.id !== home?.id && b.areaSqFt >= HOUSE_MIN_SQFT)
    .map((b) => Math.hypot(...plane.to(centroid(b.ring))))
  const nearest = gaps.length ? Math.min(...gaps) : Infinity
  const viewM = Number.isFinite(nearest) ? Math.min(VIEW_M.max, Math.max(VIEW_M.min, nearest * VIEW_M.perNeighbourM)) : VIEW_M.max
  return { center: { lat: Math.round(center.lat * 1e6) / 1e6, lng: Math.round(center.lng * 1e6) / 1e6 }, viewM: Math.round(viewM) }
}

export async function lawnLookup(target: LookupTarget): Promise<{ lookup: LawnLookup; partial: boolean }> {
  const geocoder = geocoderFromEnv()
  const sources = footprintSourcesFromEnv()
  if (!geocoder || !sources.length) throw new LawnError('not_configured')

  const deadline = deadlineIn(LOOKUP_BUDGET_MS)
  const place = target.kind === 'suggestion' ? await geocoder.resolve(target.id) : await geocoder.search(target.address, searchBias(), deadline)
  if (!place) throw new LawnError(target.kind === 'suggestion' ? 'invalid' : 'address_not_found')

  let buildings: LawnBuilding[] = []
  let credit: Credit | null = null
  let partial = false
  for (const source of sources) {
    try {
      const found = measureBuildings(await source.near(place.location, SEARCH_M, deadline), place.location, SEARCH_M)
      if (!found.length) continue
      buildings = found.map(({ id, ring, areaSqFt, distanceM }) => ({ id, ring, areaSqFt, distanceM }))
      credit = source.credit
      break
    } catch (error) {
      // One dataset being down shouldn't end the lookup: the lawn can still be painted by hand.
      partial = true
      if (!(error instanceof RoofError)) throw error
      if (error.code === 'busy' && Date.now() >= deadline) break
    }
  }

  const onBuilding = place.precision === 'rooftop' || place.precision === 'parcel'
  const nearest = buildings[0] ?? null
  const home = nearest && onBuilding && nearest.distanceM <= HOME_WITHIN_M ? nearest : null
  const { center, viewM } = viewFor(home ?? (nearest && nearest.distanceM <= HOME_WITHIN_M * 2 ? nearest : null), buildings, place.location)
  const frame: LawnFrame = { center, viewM, size: FRAME_SIZE }

  return {
    partial,
    lookup: {
      ok: true,
      address: place.address,
      location: place.location,
      precision: place.precision,
      buildings,
      home: home?.id ?? null,
      frame,
      imagery: {
        photo: naipUrl(frame, FRAME_SIZE * 2, null),
        infrared: naipUrl(frame, FRAME_SIZE, '3,0,1'),
        credits: NAIP_CREDITS,
      },
      range: rangeOf(place.location),
      pricing: pricingFromEnv(),
      credits: [...place.credits, ...(credit ? [credit] : [])],
    },
  }
}

/** The point a request is for, re-resolved on the server so its range can't be forged. */
export async function locate(target: LookupTarget): Promise<{ location: LatLng; formatted: string }> {
  const geocoder = geocoderFromEnv()
  if (!geocoder) throw new LawnError('not_configured')
  const place = target.kind === 'suggestion' ? await geocoder.resolve(target.id) : await geocoder.search(target.address, searchBias(), deadlineIn(8000))
  if (!place) throw new LawnError(target.kind === 'suggestion' ? 'invalid' : 'address_not_found')
  return { location: place.location, formatted: place.address.formatted }
}
