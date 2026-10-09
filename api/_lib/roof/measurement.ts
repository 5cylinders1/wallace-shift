/**
 * Measured roofs: area and pitch from a licensed service that measures the
 * roof itself (aerial imagery, plus height data where it has it), instead
 * of our estimate from an
 * open building outline and a pitch the homeowner picks.
 *
 * Behind an interface so the service can change (EagleView, Nearmap…)
 * without touching the endpoint or the page. The default is Instant Roofer's
 * AI measurement API:
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
 *   INSTANT_ROOFER_API_KEY    From api-dashboard.instantroofer.com. Server-side
 *                             only; never give it a VITE_ prefix.
 *   ROOF_MEASURE_PER_HOUR     Per visitor (default 6).
 *   ROOF_MEASURE_DAILY_CAP    Whole site, per UTC day (default 20).
 *   ROOF_MEASURE_MONTHLY_CAP  Whole site, per UTC month (default 300).
 *                             0 in any of the three pauses measuring.
 *   ROOF_MEASURE_UNMETERED    "1" lets local development measure without the
 *                             Upstash store; ignored on any Vercel deployment.
 */

import type { Credit, LatLng, MeasuredRoof } from '../../../src/demos/roofers/roof/types.js'
import { RoofError, fetchJson, hasLimiterStore, type Deadline } from './http.js'

export interface MeasurementProvider {
  id: string
  credit: Credit
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

export function measureLimits(): MeasureLimits {
  return {
    perHour: limit('ROOF_MEASURE_PER_HOUR', 6),
    perDay: limit('ROOF_MEASURE_DAILY_CAP', 20),
    perMonth: limit('ROOF_MEASURE_MONTHLY_CAP', 300),
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
export function measurementFromEnv(limits: MeasureLimits = measureLimits()): MeasurementProvider | null {
  const key = process.env.INSTANT_ROOFER_API_KEY?.trim()
  if (!key) return null
  if (!hasLimiterStore() && !unmeteredAllowed()) {
    console.error(
      '[roof-measure] off: INSTANT_ROOFER_API_KEY is set but RATE_LIMIT_REDIS_URL/TOKEN are not, so measuring would be unmetered. ' +
        'Add the store, or set ROOF_MEASURE_UNMETERED=1 for local development only.',
    )
    return null
  }
  if (measuringPaused(limits)) return null
  return instantRoofer(key)
}
