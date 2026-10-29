/**
 * Everything the lawn estimator needs for one address.
 *
 *   GET /api/lawn-lookup?id=<suggestion id>
 *   GET /api/lawn-lookup?address=7400%20W%20162nd%20Ter%2C%20Overland%20Park%20KS
 *   → LawnLookup (src/demos/lawn/estimate/types.ts) or { ok: false, error }
 *
 * The lawn is measured on the page, from the aerial pair returned here
 * (see api/_lib/lawn/lookup.ts for why the measuring is client-side).
 */

import type { IncomingMessage, ServerResponse } from 'node:http'
import { isRateLimited, queryOf, sendJson } from './_lib/roof/http.js'
import { handleLawn, sendLawnError } from './_lib/lawn/http.js'
import { lawnLookup, type LookupTarget } from './_lib/lawn/lookup.js'

export const config = { maxDuration: 20 }

/** A homeowner looks up one or two homes; this stops someone mapping a town. */
const RATE_LIMIT = 40
const RATE_WINDOW_S = 3600
/** Short, because the rates and service radius ride along and may be changed. */
const CACHE_S = 600
const PARTIAL_CACHE_S = 60

function targetOf(query: URLSearchParams): LookupTarget | null {
  const id = query.get('id')
  if (id) return id.length <= 1200 ? { kind: 'suggestion', id } : null
  const address = (query.get('address') ?? '').replace(/\s+/g, ' ').trim()
  return address.length >= 5 && address.length <= 200 ? { kind: 'address', address } : null
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  await handleLawn(res, 'lawn-lookup', async () => {
    if (req.method !== 'GET') return sendLawnError(res, 'invalid')
    const target = targetOf(queryOf(req))
    if (!target) return sendLawnError(res, 'invalid')
    if (await isRateLimited(req, 'lawn-lookup', RATE_LIMIT, RATE_WINDOW_S)) return sendLawnError(res, 'rate_limited')

    const { lookup, partial } = await lawnLookup(target)
    sendJson(res, lookup, 200, partial ? PARTIAL_CACHE_S : CACHE_S)
  })
}
