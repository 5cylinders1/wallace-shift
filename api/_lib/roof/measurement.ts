/**
 * Measured roofs: area and pitch from a service that measures the roof
 * itself (aerial imagery, plus height data where it has it), instead of our
 * estimate from an open building outline and a pitch the homeowner picks.
 *
 * Behind an interface so the service can change without touching the
 * endpoint or the page. Two are wired up:
 *
 *   instant-roofer  Instant Roofer (below), the default whenever its key is
 *                   set: licensed for roofing. Dollars a call and 10–20 s, so
 *                   the page asks the homeowner to confirm the roof first.
 *   google-solar    Google Solar API (solar.ts). Off unless
 *                   ROOF_MEASURE_PROVIDER=google-solar: its terms (§20.1)
 *                   allow it only for solar energy systems, and pricing a
 *                   standard re-roof from it was judged outside that. Kept
 *                   for a possible solar-only option; see docs/roofing-demo.md.
 *
 * Instant Roofer's AI measurement API:
 *
 *   POST https://v5.instantroofer.com/v2
 *   Authorization: Bearer <key>, JSON { latitude, longitude, resultOptions }
 *   → synchronous, typically 10–20 s
 *
 * It takes coordinates only, and they must sit on the building ("404 — Roof
 * not found. Please make sure your latitude/longitude is in the center of a
 * building"), which is why the page has the homeowner put the pin on their
 * roof before anything is measured. The request and response shapes follow
 * Instant Roofer's published "AI Instant Measure Reports API" (June 2026);
 * the reader below is tolerant where those docs only describe a field in
 * prose. Its terms require "Powered by Instant Roofer" on any page that uses
 * it, so the credit travels with every result.
 *
 *   GOOGLE_SOLAR_API_KEY      Server-side key restricted to the Solar API.
 *                             Never the Static Maps browser key.
 *   GOOGLE_SOLAR_QUALITY      Lowest imagery quality accepted: HIGH or MEDIUM
 *                             (default MEDIUM, which still returns HIGH where
 *                             Google has it; MEDIUM lowers the confidence shown).
 *   INSTANT_ROOFER_API_KEY    From api-dashboard.instantroofer.com. Server-side
 *                             only; never give either key a VITE_ prefix.
 *   ROOF_MEASURE_PROVIDER     Optional: "instant-roofer" (the default) or
 *                             "google-solar", which must be named to run.
 *   ROOF_MEASURE_PER_HOUR     Instant Roofer, per visitor (default 6).
 *   ROOF_MEASURE_DAILY_CAP    Instant Roofer, whole site, per UTC day (default 20).
 *   ROOF_MEASURE_MONTHLY_CAP  Instant Roofer, whole site, per UTC month (default 300).
 *   GOOGLE_SOLAR_PER_HOUR, GOOGLE_SOLAR_DAILY_CAP, GOOGLE_SOLAR_MONTHLY_CAP
 *                             The same for Google (defaults 30 / 400 / 4,000).
 *                             0 in any of a service's three pauses it.
 *   ROOF_MEASURE_UNMETERED    "1" lets local development measure without the
 *                             Upstash store; ignored on any Vercel deployment.
 */

import type { Credit, LatLng, MeasuredRoof } from '../../../src/demos/roofers/roof/types.js'
import { RoofError, fetchJson, hasLimiterStore, type Deadline } from './http.js'
import { findClosestBuilding, type SolarQuality } from './solar.js'

export type MeasurementId = 'google-solar' | 'instant-roofer'

export interface MeasurementProvider {
  id: MeasurementId
  credit: Credit
  /**
   * 'auto': cheap and quick, so the page measures as soon as it has a point.
   * 'confirm': each call is costly, so the homeowner confirms the roof first.
   */
  mode: 'auto' | 'confirm'
  measure(point: LatLng, deadline?: Deadline): Promise<MeasuredRoof>
}

const INSTANT_ROOFER = 'https://v5.instantroofer.com/v2'
/**
 * The service answers in 10–20 s. Giving up early doesn't stop the job on
 * their side, so the call gets all the time the endpoint has left.
 */
const MEASURE_TIMEOUT_MS = 55_000

/** The outline image (Google imagery) and the lidar point cloud are large and unused here. */
const RESULT_OPTIONS = { mapWithOutlineFromImageModel: false, facetMeta: true, facetPoints: false }

const num = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

/** "5/12", "5:12", "5" or 5 → the rise per 12. */
export function parsePitchRise(pitch: unknown): number | null {
  if (pitch === null || pitch === undefined) return null
  const match = /^(\d+(?:\.\d+)?)\s*(?:[/:]\s*(\d+(?:\.\d+)?))?/.exec(String(pitch).trim())
  if (!match) return null
  const rise = Number(match[1])
  const run = match[2] ? Number(match[2]) : 12
  return Number.isFinite(rise) && Number.isFinite(run) && run > 0 ? (rise / run) * 12 : null
}

/** Their documented buckets, used only when the response carries no label of its own. */
const confidenceLabel = (score: number | null): MeasuredRoof['confidence']['label'] =>
  score === null ? null : score >= 0.35 ? 'High' : score >= 0.24 ? 'Medium' : 'Low'

interface InstantRooferBody {
  measurements?: {
    sqft?: { aerial?: unknown; measured?: unknown }
    pitch?: unknown
    complexity?: unknown
    confidence?: { score?: unknown; display?: { value?: unknown } }
  }
  coordinates?: { latitude?: unknown; longitude?: unknown; lat?: unknown; lng?: unknown }
}

/** A measurement we can price from, or null when the body doesn't carry one. */
export function readInstantRoofer(body: unknown, asked: LatLng): MeasuredRoof | null {
  const data = (body && typeof body === 'object' ? body : {}) as InstantRooferBody
  const m = data.measurements ?? {}
  const footprint = num(m.sqft?.aerial)
  const rise = parsePitchRise(m.pitch)
  if (footprint === null || footprint <= 0 || rise === null) return null
  const measured = num(m.sqft?.measured) ?? footprint * Math.sqrt(1 + (rise / 12) ** 2)

  const complexity = num(m.complexity)
  const score = num(m.confidence?.score)
  const given = m.confidence?.display?.value
  const label = given === 'High' || given === 'Medium' || given === 'Low' ? given : confidenceLabel(score)

  // The service echoes the point it measured; keep ours when it doesn't.
  const lat = num(data.coordinates?.latitude ?? data.coordinates?.lat)
  const lng = num(data.coordinates?.longitude ?? data.coordinates?.lng)
  const point = lat !== null && lng !== null && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : asked

  return {
    roofSqFt: Math.round(measured),
    footprintSqFt: Math.round(footprint),
    pitchRise: Math.round(rise * 10) / 10,
    complexity: complexity !== null && complexity >= 0 && complexity <= 3 ? Math.round(complexity) : null,
    confidence: { score, label },
    point,
  }
}

/** Their documented errors, as answers the page can explain. */
function classify(error: RoofError): RoofError {
  switch (error.status) {
    case 404:
      return new RoofError('roof_not_found', error.message, 404)
    case 422:
      return new RoofError('unmeasurable', error.message, 422)
    case 400:
      return new RoofError('invalid', error.message, 400)
    case 402:
      return new RoofError('limit_reached', error.message, 402)
    case 401:
    case 403:
      // A missing, expired or unenabled key is ours to fix, not the visitor's.
      return new RoofError('upstream', `instant roofer key rejected (${error.status})`, error.status)
    default:
      return error
  }
}

function instantRoofer(apiKey: string): MeasurementProvider {
  return {
    id: 'instant-roofer',
    mode: 'confirm',
    credit: { text: 'Powered by Instant Roofer', href: 'https://www.instantroofer.com/' },
    async measure(point, deadline) {
      let body: unknown
      try {
        body = await fetchJson(INSTANT_ROOFER, {
          method: 'POST',
          headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
          body: JSON.stringify({ latitude: point.lat, longitude: point.lng, resultOptions: RESULT_OPTIONS }),
          timeoutMs: MEASURE_TIMEOUT_MS,
          deadline,
        })
      } catch (error) {
        if (!(error instanceof RoofError)) throw error
        // Our own timeout, after the request went out: it may well be billed,
        // so it isn't reported as "busy, try again".
        if (error.code === 'busy' && error.status === null) throw new RoofError('timed_out', error.message)
        throw classify(error)
      }
      const roof = readInstantRoofer(body, point)
      // A body we can't read is their fault, not an unusual roof.
      if (!roof) throw new RoofError('upstream', 'instant roofer: no measurement in the response')
      return roof
    },
  }
}

/** Google answers in a second or two; anything slower is a fault worth retrying. */
const SOLAR_TIMEOUT_MS = 12_000

function googleSolar(apiKey: string, quality: SolarQuality): MeasurementProvider {
  return {
    id: 'google-solar',
    mode: 'auto',
    // Google's text attribution for its data shown off a map: exactly "Google Maps", unaltered.
    credit: { text: 'Google Maps' },
    measure: (point, deadline) => findClosestBuilding(apiKey, point, quality, deadline, SOLAR_TIMEOUT_MS),
  }
}

const solarQuality = (): SolarQuality => (process.env.GOOGLE_SOLAR_QUALITY?.trim().toUpperCase() === 'HIGH' ? 'HIGH' : 'MEDIUM')

/**
 * The measuring service, before any spending checks: Instant Roofer when its
 * key is set. Google Solar runs only when ROOF_MEASURE_PROVIDER names it, so
 * a Google key left in the environment never turns it on by itself.
 */
export function pickMeasurement(): MeasurementProvider | null {
  const roofer = process.env.INSTANT_ROOFER_API_KEY?.trim()
  const choice = process.env.ROOF_MEASURE_PROVIDER?.trim().toLowerCase() || 'instant-roofer'
  if (choice === 'instant-roofer') return roofer ? instantRoofer(roofer) : null
  if (choice === 'google-solar') {
    const google = process.env.GOOGLE_SOLAR_API_KEY?.trim()
    if (!google) {
      console.error('[roof-measure] off: ROOF_MEASURE_PROVIDER=google-solar but GOOGLE_SOLAR_API_KEY is not set')
      return null
    }
    // The Static Maps key is in every image URL; if it's the same key, the Solar key is public.
    if (google === process.env.GOOGLE_MAPS_STATIC_KEY?.trim()) {
      console.error('[roof-measure] off: GOOGLE_SOLAR_API_KEY is the same as GOOGLE_MAPS_STATIC_KEY, which every visitor can see. Use two keys.')
      return null
    }
    return googleSolar(google, solarQuality())
  }
  console.error(`[roof-measure] off: ROOF_MEASURE_PROVIDER=${JSON.stringify(choice)} isn't "instant-roofer" or "google-solar"`)
  return null
}

export interface MeasureLimits {
  perHour: number
  perDay: number
  perMonth: number
}

/** Blank means the default and 0 pauses; anything that isn't a whole number fails closed, as 0. */
function limit(name: string, fallback: number): number {
  const raw = process.env[name]?.trim()
  if (!raw) return fallback
  const value = Number(raw)
  if (Number.isInteger(value) && value >= 0) return value
  console.error(`[roof-measure] ${name}=${JSON.stringify(raw)} isn't a whole number, so measuring is paused until it is`)
  return 0
}

/**
 * Defaults sized to each service's price, and each service's own variables:
 * Google-sized caps written for one must never carry over to Instant
 * Roofer's dollars-a-call measurements.
 */
const LIMITS: Record<MeasurementId, { prefix: string; defaults: MeasureLimits }> = {
  'instant-roofer': { prefix: 'ROOF_MEASURE', defaults: { perHour: 6, perDay: 20, perMonth: 300 } },
  'google-solar': { prefix: 'GOOGLE_SOLAR', defaults: { perHour: 30, perDay: 400, perMonth: 4000 } },
}

export function measureLimits(id: MeasurementId = 'instant-roofer'): MeasureLimits {
  const { prefix, defaults } = LIMITS[id]
  return {
    perHour: limit(`${prefix}_PER_HOUR`, defaults.perHour),
    perDay: limit(`${prefix}_DAILY_CAP`, defaults.perDay),
    perMonth: limit(`${prefix}_MONTHLY_CAP`, defaults.perMonth),
  }
}

export const measuringPaused = (limits: MeasureLimits) => limits.perHour === 0 || limits.perDay === 0 || limits.perMonth === 0

/**
 * Measuring without the Upstash store behind the limits: only on a developer's
 * machine, and only when asked for. Never on a Vercel deployment, preview or
 * production, whatever the variables say.
 */
export const unmeteredAllowed = () =>
  process.env.ROOF_MEASURE_UNMETERED === '1' && process.env.VERCEL_ENV !== 'production' && process.env.VERCEL_ENV !== 'preview'

/**
 * Null until a key is set: the lookup then doesn't offer to measure. Every
 * measurement is billed, so measuring also needs the Upstash store behind
 * the per-visitor, daily and monthly limits; without it, measuring stays off
 * rather than running unmetered. Limits set to 0 turn it off too.
 */
export function measurementFromEnv(): MeasurementProvider | null {
  const provider = pickMeasurement()
  if (!provider) return null
  if (!hasLimiterStore() && !unmeteredAllowed()) {
    console.error(
      `[roof-measure] off: a ${provider.id} key is set but no Upstash store is (RATE_LIMIT_REDIS_URL/TOKEN, or the KV_REST_API_URL/TOKEN ` +
        "Vercel's integration adds), so measuring would be unmetered. Add the store, or set ROOF_MEASURE_UNMETERED=1 for local development only.",
    )
    return null
  }
  if (measuringPaused(measureLimits(provider.id))) return null
  return provider
}
