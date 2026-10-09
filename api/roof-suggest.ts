/**
 * Address suggestions for the roof estimator's search box.
 *
 *   GET /api/roof-suggest?q=4120%20worn
 *   → { ok: true, suggestions: [{ id, primary, secondary }], credits }
 *
 * The provider key never reaches the browser; see api/_lib/roof/ for the
 * adapters and their environment variables. Until a provider is
 * configured this answers `not_configured`, and the page says so.
 */

import type { IncomingMessage, ServerResponse } from 'node:http'
import { handle, isRateLimited, queryOf, sendError, sendJson } from './_lib/roof/http.js'
import { roofProviderFromEnv } from './_lib/roof/provider.js'

export const config = { maxDuration: 10 }

/** Keystroke-driven, so generous; this only stops scripted abuse. */
const RATE_LIMIT = 300
const RATE_WINDOW_S = 3600
/** The same prefix typed again is answered from the CDN. */
const CACHE_S = 86_400

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  await handle(res, 'roof-suggest', async () => {
    if (req.method !== 'GET') return sendError(res, 'invalid')
    const q = (queryOf(req).get('q') ?? '').replace(/\s+/g, ' ').trim()
    if (q.length < 3 || q.length > 120) return sendError(res, 'invalid')

    const provider = roofProviderFromEnv()
    if (!provider) return sendError(res, 'not_configured')
    if (await isRateLimited(req, 'roof-suggest', RATE_LIMIT, RATE_WINDOW_S)) return sendError(res, 'rate_limited')

    const result = await provider.suggest(q)
    sendJson(res, { ok: true, ...result }, 200, CACHE_S)
  })
}
