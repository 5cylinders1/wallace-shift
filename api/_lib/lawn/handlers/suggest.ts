/**
 * Address suggestions for the lawn estimator's search box.
 *
 *   GET /api/lawn-suggest?q=7400%20w%20162
 *   → { ok: true, suggestions: [{ id, primary, secondary }], credits }
 *
 * The same Geoapify geocoder as the roof estimator (api/_lib/roof/geocoder.ts),
 * ranked around the business (LAWN_SERVICE_ORIGIN) instead.
 */

import type { IncomingMessage, ServerResponse } from 'node:http'
import { isRateLimited, queryOf, sendJson } from '../../roof/http.js'
import { geocoderFromEnv } from '../../roof/geocoder.js'
import { searchBias } from '../config.js'
import { handleLawn, sendLawnError } from '../http.js'

/** Keystroke-driven, so generous; this only stops scripted abuse. */
const RATE_LIMIT = 300
const RATE_WINDOW_S = 3600
const CACHE_S = 86_400

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  await handleLawn(res, 'lawn-suggest', async () => {
    if (req.method !== 'GET') return sendLawnError(res, 'invalid')
    const q = (queryOf(req).get('q') ?? '').replace(/\s+/g, ' ').trim()
    if (q.length < 3 || q.length > 120) return sendLawnError(res, 'invalid')

    const geocoder = geocoderFromEnv()
    if (!geocoder) return sendLawnError(res, 'not_configured')
    if (await isRateLimited(req, 'lawn-suggest', RATE_LIMIT, RATE_WINDOW_S)) return sendLawnError(res, 'rate_limited')

    sendJson(res, { ok: true, ...(await geocoder.suggest(q, searchBias())) }, 200, CACHE_S)
  })
}
