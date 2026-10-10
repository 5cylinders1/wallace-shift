/**
 * Google Solar API: a measured roof, and its solar potential, for the
 * building nearest a point.
 *
 *   GET https://solar.googleapis.com/v1/buildingInsights:findClosest
 *       ?location.latitude=…&location.longitude=…&requiredQuality=…&key=…
 *
 * Google measures every roof face (area with the tilt applied, pitch,
 * compass direction) from its own aerial imagery and elevation model, and
 * lays out the solar panels that would fit. The field meanings below follow
 * the API's published discovery document (revision 2026-10-07):
 *
 *   - findClosest returns the building whose centre is closest to the
 *     point, and NOT_FOUND when none is within about 50 m.
 *   - `wholeRoofStats` covers only the roof assigned to a face; Google's
 *     own advice for the whole building is to scale its sloped area by the
 *     ratio of `buildingStats` to `wholeRoofStats` ground area, because
 *     `buildingStats` ground area is reliable and its sloped area is not.
 *   - `requiredQuality` defaults to HIGH only, which fails wherever Google
 *     has only MEDIUM; it is a minimum, so asking for MEDIUM still returns
 *     HIGH where it exists, and the answer says which it used. LOW and BASE
 *     are satellite-derived and, in the US, Pre-GA, so they aren't used.
 *   - No `experiments`: anything sent with one is a Pre-GA offering, which
 *     can change or vanish without notice and carries no SLA.
 *
 * Permitted use (Google Maps Platform Service Specific Terms §20.1): only
 * to judge whether an energy system can go on a property, to design or
 * install one, or to prepare a design, proposal or opted-in marketing for
 * one that the homeowner asked for. The page therefore shows every
 * homeowner their roof's solar potential and prices solar shingles beside
 * the standard roof (see docs/roofing-demo.md). §20.2 allows caching the
 * answer for at most 30 days.
 */

import type { LatLng, MeasuredRoof, SolarPanelSpot, SolarPotential } from '../../../src/demos/roofers/roof/types.js'
import { RoofError, fetchJson, type Deadline } from './http.js'

const FIND_CLOSEST = 'https://solar.googleapis.com/v1/buildingInsights:findClosest'
const SQFT_PER_M2 = 10.763_910_4
/** Enough to draw the layout on one roof; a warehouse can return thousands. */
const MAX_PANELS_DRAWN = 160

export type SolarQuality = 'HIGH' | 'MEDIUM'

const num = (value: unknown): number | null => (typeof value === 'number' && Number.isFinite(value) ? value : null)

function latLng(value: unknown): LatLng | null {
  const v = value as { latitude?: unknown; longitude?: unknown } | null
  const lat = num(v?.latitude)
  const lng = num(v?.longitude)
  return lat !== null && lng !== null && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null
}

interface SizeStats {
  areaMeters2?: unknown
  groundAreaMeters2?: unknown
}

interface Segment {
  pitchDegrees?: unknown
  azimuthDegrees?: unknown
  stats?: SizeStats
  center?: unknown
}

interface Body {
  center?: unknown
  imageryDate?: { year?: unknown; month?: unknown }
  imageryQuality?: unknown
  boundingBox?: { sw?: unknown; ne?: unknown }
  solarPotential?: {
    maxArrayPanelsCount?: unknown
    panelCapacityWatts?: unknown
    panelHeightMeters?: unknown
    panelWidthMeters?: unknown
    maxSunshineHoursPerYear?: unknown
    wholeRoofStats?: SizeStats
    buildingStats?: SizeStats
    roofSegmentStats?: Segment[]
    solarPanelConfigs?: Array<{ panelsCount?: unknown; yearlyEnergyDcKwh?: unknown }>
    solarPanels?: Array<{ center?: unknown; orientation?: unknown; segmentIndex?: unknown }>
  }
}

/** Rise per 12 from degrees of tilt. */
export const riseFromDegrees = (degrees: number) => 12 * Math.tan((degrees * Math.PI) / 180)

/**
 * The pitch most of the roof has: the area-weighted median face, so a
 * small porch or flat bump-out doesn't drag a steep main roof down.
 */
export function predominantPitch(faces: Array<{ degrees: number; area: number }>): number | null {
  const usable = faces.filter((f) => f.area > 0).sort((a, b) => a.degrees - b.degrees)
  const total = usable.reduce((sum, f) => sum + f.area, 0)
  if (!total) return null
  let running = 0
  for (const face of usable) {
    running += face.area
    if (running >= total / 2) return face.degrees
  }
  return usable[usable.length - 1].degrees
}

/** Faces → our 0–3 complexity grade (0 a plain gable … 3 many valleys). */
export function complexityFromFaces(faces: number): number {
  if (faces <= 2) return 0
  if (faces <= 6) return 1
  if (faces <= 12) return 2
  return 3
}

const QUALITY_LABEL: Record<string, MeasuredRoof['confidence']['label']> = { HIGH: 'High', MEDIUM: 'Medium', LOW: 'Low', BASE: 'Low' }

/** About a metre of slack: the box is Google's, the point is the homeowner's tap. */
const BOX_SLACK_DEG = 0.00001

function inBox(point: LatLng, box: { sw: LatLng; ne: LatLng }): boolean {
  return (
    point.lat >= box.sw.lat - BOX_SLACK_DEG &&
    point.lat <= box.ne.lat + BOX_SLACK_DEG &&
    point.lng >= box.sw.lng - BOX_SLACK_DEG &&
    point.lng <= box.ne.lng + BOX_SLACK_DEG
  )
}

function solarOf(potential: NonNullable<Body['solarPotential']>, segments: Segment[]): SolarPotential | null {
  const maxPanels = num(potential.maxArrayPanelsCount)
  const watts = num(potential.panelCapacityWatts)
  if (!maxPanels || maxPanels < 1 || !watts) return null
  const configs = (potential.solarPanelConfigs ?? [])
    .map((c) => ({ panels: num(c.panelsCount), kwh: num(c.yearlyEnergyDcKwh) }))
    .filter((c): c is { panels: number; kwh: number } => c.panels !== null && c.kwh !== null && c.panels > 0)
  const largest = configs.length ? configs[configs.length - 1] : null
  const panels: SolarPanelSpot[] = []
  for (const panel of potential.solarPanels ?? []) {
    if (panels.length >= MAX_PANELS_DRAWN) break
    const center = latLng(panel.center)
    const index = num(panel.segmentIndex)
    const azimuth = index !== null ? num(segments[index]?.azimuthDegrees) : null
    if (center) panels.push({ center, portrait: panel.orientation === 'PORTRAIT', azimuth: azimuth ?? 180 })
  }
  return {
    maxPanels,
    panelWatts: watts,
    maxKw: Math.round((maxPanels * watts) / 100) / 10,
    yearlyKwh: largest ? Math.round(largest.kwh / 10) * 10 : null,
    sunshineHours: num(potential.maxSunshineHoursPerYear) !== null ? Math.round(num(potential.maxSunshineHoursPerYear) as number) : null,
    panelHeightM: num(potential.panelHeightMeters) ?? 1.879,
    panelWidthM: num(potential.panelWidthMeters) ?? 1.045,
    panels,
    configs: configs.map((c) => ({ panels: c.panels, yearlyKwh: Math.round(c.kwh) })),
  }
}

/** A roof we can price from, or null when the answer doesn't carry one. */
export function readGoogleSolar(body: unknown, asked: LatLng): MeasuredRoof | null {
  const data = (body && typeof body === 'object' ? body : {}) as Body
  const potential = data.solarPotential
  if (!potential) return null
  const segments = Array.isArray(potential.roofSegmentStats) ? potential.roofSegmentStats : []
  const whole = { sloped: num(potential.wholeRoofStats?.areaMeters2), ground: num(potential.wholeRoofStats?.groundAreaMeters2) }
  const buildingGround = num(potential.buildingStats?.groundAreaMeters2)
  if (!whole.sloped || whole.sloped <= 0 || !whole.ground || whole.ground <= 0) return null

  // Google's advice: scale the faces' sloped area up to the whole building's reliable ground area.
  const ground = buildingGround && buildingGround >= whole.ground ? buildingGround : whole.ground
  const sloped = whole.sloped * (ground / whole.ground)

  const faces = segments
    .map((s) => ({ degrees: num(s.pitchDegrees), area: num(s.stats?.areaMeters2) }))
    .filter((f): f is { degrees: number; area: number } => f.degrees !== null && f.area !== null && f.degrees >= 0 && f.degrees < 80)
  const degrees = predominantPitch(faces) ?? Math.acos(Math.min(1, whole.ground / whole.sloped)) * (180 / Math.PI)

  const quality = typeof data.imageryQuality === 'string' && data.imageryQuality in QUALITY_LABEL ? data.imageryQuality : null
  const year = num(data.imageryDate?.year)
  const month = num(data.imageryDate?.month)
  const sw = latLng(data.boundingBox?.sw)
  const ne = latLng(data.boundingBox?.ne)

  return {
    roofSqFt: Math.round(sloped * SQFT_PER_M2),
    footprintSqFt: Math.round(ground * SQFT_PER_M2),
    pitchRise: Math.round(riseFromDegrees(degrees) * 10) / 10,
    complexity: faces.length ? complexityFromFaces(faces.length) : null,
    confidence: { score: null, label: quality ? QUALITY_LABEL[quality] : null },
    point: latLng(data.center) ?? asked,
    faces: faces.length || null,
    capturedYear: year && year > 1990 ? year : null,
    capturedMonth: month && month >= 1 && month <= 12 ? month : null,
    bounds: sw && ne ? { sw, ne } : null,
    // findClosest takes the building whose centre is nearest, which on a
    // tight lot can be the neighbour's; the page says so when it happens.
    atPoint: sw && ne ? inBox(asked, { sw, ne }) : null,
    solar: solarOf(potential, segments),
  }
}

interface GoogleErrorBody {
  error?: { status?: unknown; message?: unknown; details?: Array<{ reason?: unknown }> }
}

/** Why Google refused, from its google.rpc.Status body: e.g. API_KEY_INVALID, SERVICE_DISABLED. */
function reasonOf(body: unknown): string | null {
  const error = (body as GoogleErrorBody | undefined)?.error
  const reason = error?.details?.find((d) => typeof d?.reason === 'string')?.reason
  return typeof reason === 'string' ? reason : typeof error?.status === 'string' ? error.status : null
}

/** Google's error statuses, as answers the page can explain. */
function classify(error: RoofError): RoofError {
  const reason = reasonOf(error.body)
  // A missing, invalid, restricted or unenabled key (or billing) is ours to fix, not the visitor's.
  if (error.status === 401 || error.status === 403 || (reason && /^(API_KEY|SERVICE_DISABLED|BILLING|ACCESS_TOKEN|CONSUMER)/.test(reason))) {
    return new RoofError('upstream', `google solar refused our key (${error.status} ${reason ?? ''})`.trim(), error.status)
  }
  switch (error.status) {
    case 404:
      return new RoofError('roof_not_found', error.message, 404)
    case 400:
      return new RoofError('invalid', `${error.message} ${reason ?? ''}`.trim(), 400)
    default:
      return error
  }
}

export async function findClosestBuilding(apiKey: string, point: LatLng, quality: SolarQuality, deadline?: Deadline, timeoutMs = 12_000): Promise<MeasuredRoof> {
  const params = new URLSearchParams({
    'location.latitude': point.lat.toFixed(6),
    'location.longitude': point.lng.toFixed(6),
    requiredQuality: quality,
    key: apiKey,
  })
  let body: unknown
  try {
    body = await fetchJson(`${FIND_CLOSEST}?${params}`, { timeoutMs, deadline })
  } catch (error) {
    if (!(error instanceof RoofError)) throw error
    throw classify(error)
  }
  const roof = readGoogleSolar(body, point)
  if (!roof) {
    const message = (body as GoogleErrorBody)?.error?.message
    throw new RoofError('upstream', `google solar: no roof in the response${typeof message === 'string' ? ` (${message})` : ''}`)
  }
  return roof
}
