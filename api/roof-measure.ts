/**
 * Measures one roof for the estimator, from the point the homeowner put on
 * their roof.
 *
 *   GET /api/roof-measure?lat=39.045300&lng=-94.582600
 *   → { ok: true, roof: MeasuredRoof, credits } or { ok: false, error }
 *
 * Every successful call is billed by the measuring service (see
 * api/_lib/roof/measurement.ts), so it is the most guarded endpoint here:
 *
 *   - per visitor: ROOF_MEASURE_PER_HOUR measurements an hour (default 6);
 *   - per month:   ROOF_MEASURE_MONTHLY_CAP for the whole site (default 300),
 *                  after which the page falls back to the outline estimate;
 *   - production:  measuring is off unless the Upstash store behind both
 *                  limits is configured (RATE_LIMIT_REDIS_URL / _TOKEN), and
 *                  if that store can't be reached the call is refused, not
 *                  waved through.
 *
 * The page only calls this after the homeowner confirms their roof. Answers
 * are cached at the edge for a week by the rounded point (about 1 m), so the
 * same roof looked up again isn't bought twice.
 */

import type { IncomingMessage, ServerResponse } from 'node:http'
import { countThisMonth, deadlineIn, handle, hasLimiterStore, isRateLimited, queryOf, sendError, sendJson } from './_lib/roof/http.js'
import { measurementFromEnv } from './_lib/roof/measurement.js'

export const config = { maxDuration: 60 }

/** The service takes 10–20 s, sometimes more; answer in JSON well before the 60 s limit. */
const BUDGET_MS = 45_000
const RATE_WINDOW_S = 3600
const CACHE_S = 7 * 86_400

const limit = (name: string, fallback: number) => {
  const value = Number(process.env[name])
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback
}

/** Five decimals is about a metre: one roof, one cache entry. */
function pointOf(query: URLSearchParams) {
  const lat = Number(query.get('lat'))
  const lng = Number(query.get('lng'))
  if (!query.get('lat') || !query.get('lng') || !Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180 || (lat === 0 && lng === 0)) return null
  return { lat: Math.round(lat * 1e5) / 1e5, lng: Math.round(lng * 1e5) / 1e5 }
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  await handle(res, 'roof-measure', async () => {
    if (req.method !== 'GET') return sendError(res, 'invalid')
    const point = pointOf(queryOf(req))
    if (!point) return sendError(res, 'invalid')

    const measurement = measurementFromEnv()
    if (!measurement) return sendError(res, 'not_configured')
    if (await isRateLimited(req, 'roof-measure', limit('ROOF_MEASURE_PER_HOUR', 6), RATE_WINDOW_S)) return sendError(res, 'rate_limited')

    // Counted before the call, so a burst can't slip past the cap while measurements are in flight.
    const used = await countThisMonth('roof-measure')
    if (used === null && hasLimiterStore()) return sendError(res, 'busy')
    if (used !== null && used > limit('ROOF_MEASURE_MONTHLY_CAP', 300)) return sendError(res, 'limit_reached')

    const roof = await measurement.measure(point, deadlineIn(BUDGET_MS))
    sendJson(res, { ok: true, roof, credits: [measurement.credit] }, 200, CACHE_S)
  })
}
