/**
 * Building outlines near a point, from open datasets.
 *
 * Sources are tried in order until one returns a building:
 *
 *   usa-structures  FEMA / Oak Ridge National Laboratory "USA Structures",
 *                   nationwide, keyless, public. Outlines are derived from
 *                   imagery and lidar; buildings under ~450 sq ft are left
 *                   out, and an attached garage is normally part of the
 *                   house.
 *   microsoft       Microsoft's US Building Footprints as hosted by Esri
 *                   (ODbL). Older, but fills gaps.
 *   osm             OpenStreetMap through an Overpass instance you run or
 *                   pay for (OVERPASS_URL). The public instances are for
 *                   light, non-commercial use, so there is no default.
 *
 *   ROOF_FOOTPRINT_SOURCES  Comma list, default "usa-structures,microsoft".
 *   OVERPASS_URL            e.g. https://overpass.example.com/api/interpreter
 *
 * Every outline is drawn with its dataset's credit. Areas are computed by
 * us from the geometry (see measure.ts): the services' own Shape__Area is
 * in Web Mercator and overstates real area by roughly 1.6× in the Midwest.
 */

import type { Credit, LatLng } from '../../../src/demos/roofers/roof/types.js'
import { RoofError, fetchJson, type Deadline } from './http.js'

export interface RawFootprint {
  id: string
  /** Outer ring first, then any holes; lat/lng, closing point optional. */
  rings: LatLng[][]
  /** Year of the imagery the outline was traced from, when the dataset says. */
  capturedYear?: number | null
}

export interface FootprintSource {
  id: string
  credit: Credit
  near(point: LatLng, radiusM: number, deadline?: Deadline): Promise<RawFootprint[]>
}

type Position = [number, number]
interface GeoJsonFeature {
  id?: string | number
  geometry?: { type?: string; coordinates?: unknown } | null
  properties?: Record<string, unknown> | null
}

/** ArcGIS sends dates as epoch milliseconds; other sources may send ISO text. */
function yearOf(value: unknown): number | null {
  const date = typeof value === 'number' ? new Date(value) : typeof value === 'string' ? new Date(value) : null
  const year = date && !Number.isNaN(date.getTime()) ? date.getUTCFullYear() : null
  return year && year >= 1990 && year <= 2100 ? year : null
}

const isPosition = (value: unknown): value is Position =>
  Array.isArray(value) && typeof value[0] === 'number' && typeof value[1] === 'number' && Number.isFinite(value[0]) && Number.isFinite(value[1])

function toRing(value: unknown): LatLng[] | null {
  if (!Array.isArray(value) || value.length < 4 || !value.every(isPosition)) return null
  return (value as Position[]).map(([lng, lat]) => ({ lat, lng }))
}

/** One footprint per polygon part; a multipart building becomes several tappable parts. */
export function parseGeoJson(body: unknown, prefix: string, dateField?: string): RawFootprint[] {
  const features = (body as { features?: GeoJsonFeature[] } | null)?.features
  if (!Array.isArray(features)) throw new RoofError('upstream', `${prefix}: not a FeatureCollection`)
  const out: RawFootprint[] = []
  features.forEach((feature, index) => {
    const geometry = feature.geometry
    const id = `${prefix}-${feature.id ?? index}`
    const capturedYear = dateField ? yearOf(feature.properties?.[dateField]) : null
    const polygons = geometry?.type === 'Polygon' ? [geometry.coordinates] : geometry?.type === 'MultiPolygon' ? (geometry.coordinates as unknown[]) : []
    polygons.forEach((polygon, part) => {
      if (!Array.isArray(polygon)) return
      const rings = polygon.map(toRing)
      if (!rings[0] || rings.some((ring) => ring === null)) return
      out.push({ id: polygons.length > 1 ? `${id}.${part}` : id, rings: rings as LatLng[][], capturedYear })
    })
  })
  return out
}

/** More than a 70 m circle holds even on 25-foot city lots; we keep the nearest few. */
const MAX_RECORDS = 250

/**
 * Feature-service point query: every polygon within `radiusM` of the point.
 * ArcGIS can't sort by distance, so a capped answer could leave out the
 * very building the pin is in; when the service says it truncated, a
 * second query asks for just the building under the pin.
 */
function arcgisSource(id: string, layerUrl: string, credit: Credit, dateField?: string): FootprintSource {
  const query = async (point: LatLng, distance: number, deadline?: Deadline) => {
    const params = new URLSearchParams({
      geometry: `${point.lng.toFixed(7)},${point.lat.toFixed(7)}`,
      geometryType: 'esriGeometryPoint',
      inSR: '4326',
      spatialRel: 'esriSpatialRelIntersects',
      distance: String(distance),
      units: 'esriSRUnit_Meter',
      outFields: ['OBJECTID', dateField].filter(Boolean).join(','),
      returnGeometry: 'true',
      outSR: '4326',
      resultRecordCount: String(MAX_RECORDS),
      f: 'geojson',
    })
    const body = (await fetchJson(`${layerUrl}/query?${params}`, { deadline })) as {
      error?: { code?: number; message?: string }
      exceededTransferLimit?: boolean
      properties?: { exceededTransferLimit?: boolean }
    } | null
    // ArcGIS reports failures as HTTP 200 with an `error` object.
    const error = body?.error
    if (error) throw new RoofError(error.code === 429 ? 'busy' : 'upstream', `${id}: ${error.code} ${error.message}`)
    return { footprints: parseGeoJson(body, id, dateField), truncated: Boolean(body?.exceededTransferLimit || body?.properties?.exceededTransferLimit) }
  }

  return {
    id,
    credit,
    async near(point, radiusM, deadline) {
      const around = await query(point, radiusM, deadline)
      if (!around.truncated) return around.footprints
      const under = await query(point, 0, deadline)
      const seen = new Set(around.footprints.map((footprint) => footprint.id))
      return [...around.footprints, ...under.footprints.filter((footprint) => !seen.has(footprint.id))]
    },
  }
}

interface OverpassElement {
  type?: string
  id?: number
  geometry?: Array<{ lat?: number; lon?: number }>
  members?: Array<{ role?: string; geometry?: Array<{ lat?: number; lon?: number }> }>
}

const overpassRing = (geometry: OverpassElement['geometry']): LatLng[] | null => {
  if (!Array.isArray(geometry) || geometry.length < 4) return null
  const ring = geometry.map((node) => ({ lat: Number(node.lat), lng: Number(node.lon) }))
  return ring.every((node) => Number.isFinite(node.lat) && Number.isFinite(node.lng)) ? ring : null
}

export function parseOverpass(body: unknown): RawFootprint[] {
  const elements = (body as { elements?: OverpassElement[] } | null)?.elements
  if (!Array.isArray(elements)) throw new RoofError('upstream', 'osm: no elements')
  const out: RawFootprint[] = []
  for (const element of elements) {
    if (element.type === 'way') {
      const ring = overpassRing(element.geometry)
      if (ring) out.push({ id: `osm-w${element.id}`, rings: [ring] })
    } else if (element.type === 'relation') {
      // Multipolygon buildings: keep closed outer members, each tappable on its own.
      element.members?.forEach((member, index) => {
        const ring = member.role === 'outer' ? overpassRing(member.geometry) : null
        const closed = ring && ring[0].lat === ring[ring.length - 1].lat && ring[0].lng === ring[ring.length - 1].lng
        if (ring && closed) out.push({ id: `osm-r${element.id}.${index}`, rings: [ring] })
      })
    }
  }
  return out
}

function overpassSource(endpoint: string): FootprintSource {
  return {
    id: 'osm',
    credit: { text: 'Building outlines © OpenStreetMap contributors', href: 'https://www.openstreetmap.org/copyright' },
    async near(point, radiusM, deadline) {
      const lat = point.lat.toFixed(7)
      const lng = point.lng.toFixed(7)
      const query = `[out:json][timeout:8];(way["building"](around:${radiusM},${lat},${lng});relation["building"](around:${radiusM},${lat},${lng}););out geom;`
      const body = await fetchJson(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ data: query }).toString(),
        deadline,
      })
      return parseOverpass(body)
    },
  }
}

const SOURCES: Record<string, () => FootprintSource | null> = {
  'usa-structures': () =>
    arcgisSource(
      'usa-structures',
      'https://services2.arcgis.com/FiaPA4ga0iQKduv3/arcgis/rest/services/USA_Structures_View/FeatureServer/0',
      { text: 'Building outlines: USA Structures, FEMA & ORNL', href: 'https://gis-fema.hub.arcgis.com/pages/usa-structures' },
      'IMAGE_DATE',
    ),
  microsoft: () =>
    arcgisSource('microsoft', 'https://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/MSBFP2/FeatureServer/0', {
      text: 'Building outlines © Microsoft (ODbL)',
      href: 'https://github.com/microsoft/USBuildingFootprints',
    }),
  osm: () => (process.env.OVERPASS_URL ? overpassSource(process.env.OVERPASS_URL) : null),
}

export function footprintSourcesFromEnv(): FootprintSource[] {
  const names = (process.env.ROOF_FOOTPRINT_SOURCES ?? 'usa-structures,microsoft')
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean)
  return names.map((name) => SOURCES[name]?.() ?? null).filter((source): source is FootprintSource => source !== null)
}
