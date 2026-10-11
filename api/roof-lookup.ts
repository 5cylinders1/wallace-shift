/**
 * Finds the building outlines at an address for the roof estimator.
 *
 *   GET /api/roof-lookup?id=<suggestion id>
 *   GET /api/roof-lookup?address=4120%20Wornall%20Rd%2C%20Kansas%20City%20MO
 *   → RoofLookup (src/demos/roofers/roof/types.ts) or { ok: false, error }
 *
 * Returns ground outlines and their areas, an aerial frame to show them
 * on, and the credits each dataset requires. The roof's pitch is not
 * known here; the homeowner sets it on the page.
 *
 * Optional rate limiting uses the same Upstash store as /api/audit
 * (api/_lib/limiter-store.ts).
 */

import type { IncomingMessage, ServerResponse } from 'node:http'
import { handle, isRateLimited, queryOf, sendError, sendJson } from './_lib/roof/http.js'
import { roofProviderFromEnv, type LookupTarget } from './_lib/roof/provider.js'
import { signMeasurementBuilding } from './_lib/roof/measurement-identity.js'

export const config = { maxDuration: 20 }

/** A homeowner looks up one or two houses; this stops someone mapping a city. */
const RATE_LIMIT = 40
const RATE_WINDOW_S = 3600
/** Outlines change on the scale of years; a day at the edge is safe. */
const CACHE_S = 86_400
/** An answer from a fallback dataset, after the first one failed: don't pin it for a day. */
const PARTIAL_CACHE_S = 300

function targetOf(query: URLSearchParams): LookupTarget | null {
  const id = query.get('id')
  if (id) return id.length <= 1200 ? { kind: 'suggestion', id } : null
  const address = (query.get('address') ?? '').replace(/\s+/g, ' ').trim()
  return address.length >= 5 && address.length <= 200 ? { kind: 'address', address } : null
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  await handle(res, 'roof-lookup', async () => {
    if (req.method !== 'GET') return sendError(res, 'invalid')
    const target = targetOf(queryOf(req))
    if (!target) return sendError(res, 'invalid')

    const provider = roofProviderFromEnv()
    if (!provider) return sendError(res, 'not_configured')
    if (await isRateLimited(req, 'roof-lookup', RATE_LIMIT, RATE_WINDOW_S)) return sendError(res, 'rate_limited')

    const { lookup, partial } = await provider.lookup(target)
    const measurement = lookup.measure?.provider
    if (measurement === 'instant-roofer' || measurement === 'google-solar') {
      lookup.buildings = lookup.buildings.map(building => ({
        ...building,
        measurementToken: signMeasurementBuilding(measurement, lookup.source, building),
      }))
    }
    sendJson(res, lookup, 200, partial ? PARTIAL_CACHE_S : CACHE_S)
  })
}
