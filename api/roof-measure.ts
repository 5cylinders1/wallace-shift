/**
 * Measure a roof once, then reuse its provider-licensed snapshot.
 *
 * Redis shares results and purchase locks across deployed instances. Local,
 * explicitly unmetered development persists Instant Roofer to ignored local
 * disk (Google uses expiring memory). Cache hits do
 * not consume paid-call budgets. A signed lookup footprint lets different
 * pins on one building share a result; unsigned pins remain separate.
 */
import { randomUUID } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { MeasureResponse } from '../src/demos/roofers/roof/types.js'
import { RoofError, countUse, deadlineIn, handle, hasLimiterStore, header, isRateLimited, queryOf, sendError, sendJson } from './_lib/roof/http.js'
import { measureLimits, measurementFromEnv, measuringPaused, pickMeasurement, unmeteredAllowed } from './_lib/roof/measurement.js'
import { cacheSecondsFor, getMeasurementStore, measurementCacheKey, type CachedMeasurement } from './_lib/roof/measurement-cache.js'
import { verifyMeasurementBuilding } from './_lib/roof/measurement-identity.js'

export const config = { maxDuration: 60 }
// Leave nine seconds for cache writes and the response after provider work.
const BUDGET_MS = 51_000
const RATE_WINDOW_S = 3600
type Success = Extract<MeasureResponse, { ok: true }>
const inFlight = new Map<string, Promise<Success>>()

/** Normalize the pin before both cache identity and provider measurement. */
function pointOf(query: URLSearchParams) {
  const lat = Number(query.get('lat'))
  const lng = Number(query.get('lng'))
  if (!query.get('lat') || !query.get('lng') || !Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180 || (lat === 0 && lng === 0)) return null
  return { lat: Math.round(lat * 1e5) / 1e5, lng: Math.round(lng * 1e5) / 1e5 }
}

function fromAnotherSite(req: IncomingMessage) {
  const site = header(req, 'sec-fetch-site')
  return site !== undefined && site !== 'same-origin'
}

/** Never give the CDN a fresh full lifetime for an already-aged result. */
function respond(res: ServerResponse, result: Success) {
  const remaining = result.cache !== 'off' && result.expiresAt ? Math.max(0, Math.floor((Date.parse(result.expiresAt) - Date.now()) / 1000)) : 0
  res.setHeader('x-roof-measure-cache', result.cache)
  sendJson(res, result, 200, remaining, 0)
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
    // Preserve the explicit operational pause, even for cached measurements.
    if (measuringPaused(limits)) return sendError(res, 'limit_reached')
    const measurement = measurementFromEnv()
    if (!measurement || query.get('provider') !== measurement.id) return sendError(res, 'not_configured')

    const store = getMeasurementStore(measurement.id)
    if (!store) return sendError(res, 'not_configured')
    const ttl = cacheSecondsFor(measurement.id)
    const token = query.get('roof')
    const identity = verifyMeasurementBuilding(token, measurement.id, point)
    const exactKey = measurementCacheKey(measurement.id, point)
    const buildingKey = identity ? measurementCacheKey(measurement.id, point, identity) : null

    async function readSaved(): Promise<Success | null> {
      if (ttl === 0) return null
      for (const key of buildingKey ? [exactKey, buildingKey] : [exactKey]) {
        const entry = await store!.get(key)
        if (!entry || entry.provider !== measurement!.id) continue
        // A shorter configured retention period takes effect immediately.
        const expires = Math.min(Date.parse(entry.expiresAt), Date.parse(entry.measuredAt) + ttl * 1000)
        if (expires <= Date.now()) continue
        // A provider can return the nearest building rather than the asked one.
        // Never let that answer become a cache hit for a different pin.
        if (key === buildingKey && (entry.roof.atPoint === false || verifyMeasurementBuilding(token, measurement!.id, entry.roof.point) !== identity)) continue
        return { ok: true, ...entry, expiresAt: new Date(expires).toISOString(), cache: 'hit' }
      }
      return null
    }

    const saved = await readSaved()
    if (saved) return respond(res, saved)

    // Share only identical pins in this worker. Distinct pins use the shared
    // building lock and subsequently read the verified building snapshot.
    const pending = inFlight.get(exactKey)
    if (pending) return respond(res, await pending)

    const purchase = async (): Promise<Success> => {
      const owner = randomUUID()
      const held: string[] = []
      let release = true
      try {
        // Both are needed: an older/unsigned client may request the same pin
        // while a new client supplies its building identity. A single choice
        // of lock would allow those two requests to buy the roof concurrently.
        for (const key of buildingKey ? [exactKey, buildingKey] : [exactKey]) {
          if (!await store.acquire(key, owner)) {
            const completed = await readSaved()
            if (completed) return completed
            throw new RoofError('busy', 'this roof is already being measured; no new measurement was requested')
          }
          held.push(key)
        }
        // Another worker may have saved the roof between our first read and lock.
        const completed = await readSaved()
        if (completed) return completed
        if (hasLimiterStore()) {
          const scope = measurement.id === 'instant-roofer' ? 'roof-measure' : `roof-measure:${measurement.id}`
          if (await isRateLimited(req, scope, limits.perHour, RATE_WINDOW_S)) throw new RoofError('rate_limited')
          const now = new Date().toISOString()
          const today = await countUse(`${scope}:day:${now.slice(0, 10)}`, 2 * 86_400)
          if (today === null) throw new RoofError('busy')
          if (today > limits.perDay) throw new RoofError('limit_reached')
          const month = await countUse(`${scope}:month:${now.slice(0, 7)}`, 40 * 86_400)
          if (month === null) throw new RoofError('busy')
          if (month > limits.perMonth) throw new RoofError('limit_reached')
        } else if (!unmeteredAllowed()) {
          throw new RoofError('not_configured')
        }

        // Once the billed call starts, an uncertain outcome leaves the 90-second
        // lock to expire. Aborts/errors must not trigger an immediate repurchase.
        release = false
        const roof = await measurement.measure(point, deadline)
        const measuredAt = new Date().toISOString()
        // Even with shared caching off, a long-open page must discard Google
        // measurements within its maximum retention period.
        const workingLifetime = ttl || (measurement.id === 'google-solar' ? 30 * 86_400 : 0)
        const expiresAt = workingLifetime > 0 ? new Date(Date.parse(measuredAt) + workingLifetime * 1000).toISOString() : null
        const result: Success = { ok: true, provider: measurement.id, roof, credits: [measurement.credit], measuredAt, expiresAt, cache: ttl > 0 ? 'miss' : 'off' }
        if (ttl > 0 && expiresAt) {
          const entry: CachedMeasurement = { provider: result.provider, roof, credits: result.credits, measuredAt, expiresAt }
          try {
            await store.put(exactKey, entry, ttl)
            if (buildingKey && roof.atPoint !== false && verifyMeasurementBuilding(token, measurement.id, roof.point) === identity) {
              await store.put(buildingKey, entry, ttl)
            }
          } catch {
            // The user still receives the result already paid for. Leave the
            // lock intact if persistence failed, and do not claim it was saved.
            console.error('[roof-measure] result cache write failed; purchase cooldown retained')
            return { ...result, cache: 'off' }
          }
        }
        release = true
        return result
      } finally {
        // Unlock is best-effort. If it fails, the lease expires safely by itself.
        if (release) await Promise.all(held.map(key => store.release(key, owner).catch(() => undefined)))
      }
    }

    const work = purchase()
    inFlight.set(exactKey, work)
    try {
      respond(res, await work)
    } finally {
      if (inFlight.get(exactKey) === work) inFlight.delete(exactKey)
    }
  })
}
