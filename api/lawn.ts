import type { IncomingMessage, ServerResponse } from 'node:http'
import lookup from './_lib/lawn/handlers/lookup.js'
import request from './_lib/lawn/handlers/request.js'
import suggest from './_lib/lawn/handlers/suggest.js'
import paintRender from './_lib/paint/render.js'
import paintRequest from './_lib/paint/request.js'
import { sendJson } from './_lib/roof/http.js'

// The public real-business demos' endpoints share one deployed function (the
// project is at its 12-function limit); each keeps its own limits. Lawn calls
// finish within 20 seconds; Complete Painting's photo previews can take minutes.
export const config = { maxDuration: 180 }

const handlers = { lookup, request, suggest, 'paint-render': paintRender, 'paint-request': paintRequest }
type Action = keyof typeof handlers
const legacyPaths: Record<string, Action> = {
  '/api/lawn-lookup': 'lookup',
  '/api/lawn-request': 'request',
  '/api/lawn-suggest': 'suggest',
  '/api/paint-render': 'paint-render',
  '/api/paint-request': 'paint-request',
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
