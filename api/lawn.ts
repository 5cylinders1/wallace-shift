import type { IncomingMessage, ServerResponse } from 'node:http'
import lookup from './_lib/lawn/handlers/lookup.js'
import request from './_lib/lawn/handlers/request.js'
import suggest from './_lib/lawn/handlers/suggest.js'
import { sendJson } from './_lib/roof/http.js'

// Related endpoints share one deployed function; each retains its own limits.
export const config = { maxDuration: 20 }

const handlers = { lookup, request, suggest }
type Action = keyof typeof handlers
const legacyPaths: Record<string, Action> = {
  '/api/lawn-lookup': 'lookup',
  '/api/lawn-request': 'request',
  '/api/lawn-suggest': 'suggest',
}
type LawnRequest = IncomingMessage & { query?: Record<string, string | string[] | undefined> }

export default async function handler(req: LawnRequest, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? '/', 'http://localhost')
  const path = url.pathname.replace(/\/$/, '')
  const actions = url.searchParams.getAll('action')
  // Vercel can provide the original path or the rewritten function path.
  // A caller-supplied action must never override an existing endpoint's path.
  const action = Object.hasOwn(legacyPaths, path) ? legacyPaths[path]
    : path === '/api/lawn' && actions.length <= 1 ? actions[0] ?? req.query?.action : undefined
  if (typeof action !== 'string' || !Object.hasOwn(handlers, action)) {
    sendJson(res, { ok: false, error: 'not_found' }, 404)
    return
  }
  await handlers[action as Action](req, res)
}
