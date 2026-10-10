/**
 * Measures one roof for the estimator, from the point the homeowner put on
 * their roof.
 *
 *   GET /api/roof-measure?lat=39.04530&lng=-94.58260
 *   → { ok: true, roof: MeasuredRoof, credits } or { ok: false, error }
 *
 * Every successful call is billed by the measuring service (see
 * api/_lib/roof/measurement.ts), so it is the most guarded endpoint here:
 *
 *   - only our own page: a request another site makes (an <img>, a
 *     cross-site fetch) is refused before anything is counted or bought;
 *   - per visitor: ROOF_MEASURE_PER_HOUR measurements an hour (default 6);
 *   - per day:     ROOF_MEASURE_DAILY_CAP for the whole site (default 20),
 *                  so one bad day can't spend the month;
 *   - per month:   ROOF_MEASURE_MONTHLY_CAP for the whole site (default 300),
 *                  after which the page falls back to the outline estimate;
 *   - the store:   measuring is off unless the Upstash store behind these
 *                  limits is configured (RATE_LIMIT_REDIS_URL / _TOKEN), and
 *                  if that store can't be reached the call is refused, not
 *                  waved through.
 *
 * The page only calls this after the homeowner confirms their roof, and it
 * sends the point already rounded to 5 decimals (about a metre), so the same
 * pin asked again is usually answered from the edge cache, not bought twice.
 */

import type { IncomingMessage, ServerResponse } from 'node:http'
import { countUse, deadlineIn, handle, hasLimiterStore, header, isRateLimited, queryOf, sendError, sendJson } from './_lib/roof/http.js'
import { measureLimits, measurementFromEnv, measuringPaused, pickMeasurement, unmeteredAllowed } from './_lib/roof/measurement.js'

export const config = { maxDuration: 60 }

/**
 * The service takes 10–20 s, sometimes more. Measured from the start of the
 * request, this leaves a few seconds to answer in JSON before the 60 s limit.
 */
const BUDGET_MS = 56_000
const RATE_WINDOW_S = 3600
const CACHE_S = 7 * 86_400

/** Five decimals is about a metre: one roof, one cache entry. */
function pointOf(query: URLSearchParams) {
  const lat = Number(query.get('lat'))
  const lng = Number(query.get('lng'))
  if (!query.get('lat') || !query.get('lng') || !Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180 || (lat === 0 && lng === 0)) return null
  return { lat: Math.round(lat * 1e5) / 1e5, lng: Math.round(lng * 1e5) / 1e5 }
}

/**
 * Browsers say where a request came from. Our page's fetch is same-origin;
 * anything else would spend from its visitors' allowances. Callers that
 * aren't browsers send no such header and still meet every limit below.
 */
function fromAnotherSite(req: IncomingMessage) {
  const site = header(req, 'sec-fetch-site')
  return site !== undefined && site !== 'same-origin'
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const deadline = deadlineIn(BUDGET_MS)
  await handle(res, 'roof-measure', async () => {
    if (req.method !== 'GET') return sendError(res, 'invalid')
    if (fromAnotherSite(req)) return sendJson(res, { ok: false, error: 'invalid' }, 403)
    const query = queryOf(req)
    const point = pointOf(query)
    if (!point) return sendError(res, 'invalid')

    const chosen = pickMeasurement()
    if (!chosen) return sendError(res, 'not_configured')
    const limits = measureLimits(chosen.id)
    if (measuringPaused(limits)) return sendError(res, 'limit_reached')
    const measurement = measurementFromEnv()
    if (!measurement) return sendError(res, 'not_configured')
    // A page whose lookup named another service (open from before a switch,
    // or an edge-cached lookup) mustn't get this one's data: Google's, say,
    // would land on a Mapbox photo. It's also part of the cache key.
    const asked = query.get('provider')
    if (asked && asked !== measurement.id) return sendError(res, 'not_configured')

    // measurementFromEnv only allows a missing store on a developer's machine, by request.
    if (hasLimiterStore()) {
      // Each service has its own limits and counters, so switching mid-month starts fresh.
      const scope = `roof-measure:${measurement.id}`
      if (await isRateLimited(req, scope, limits.perHour, RATE_WINDOW_S)) return sendError(res, 'rate_limited')
      // Counted before the call, so a burst can't slip past a cap while
      // measurements are in flight. The month is only counted once the day
      // allows it, so a day's refused requests don't use up the month.
      const now = new Date().toISOString()
      const today = await countUse(`${scope}:day:${now.slice(0, 10)}`, 2 * 86_400)
      if (today === null) return sendError(res, 'busy')
      if (today > limits.perDay) return sendError(res, 'limit_reached')
      const month = await countUse(`${scope}:month:${now.slice(0, 7)}`, 40 * 86_400)
      if (month === null) return sendError(res, 'busy')
      if (month > limits.perMonth) return sendError(res, 'limit_reached')
    } else if (!unmeteredAllowed()) {
      return sendError(res, 'not_configured')
    }

    const roof = await measurement.measure(point, deadline)
    // No stale-while-revalidate: a background refresh would buy the roof again.
    sendJson(res, { ok: true, provider: measurement.id, roof, credits: [measurement.credit] }, 200, CACHE_S, 0)
  })
}
