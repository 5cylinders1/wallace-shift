import type { IncomingMessage } from 'node:http'
import { createHash } from 'node:crypto'
import { incrementWindow, limiterStore } from '../limiter-store.js'
import { RenderError } from './validation.js'

export type RenderAccess = { local: boolean; visitor: string }
type Counter = { count: number; expires: number }
const localCounters = new Map<string, Counter>()
const header = (request: IncomingMessage, name: string): string | undefined => {
  const value = request.headers[name]
  return typeof value === 'string' ? value : undefined
}
const loopback = (value: string | undefined) => value === '127.0.0.1' || value === '::1' || value === '::ffff:127.0.0.1'

/** No trusted Host/Origin can be constructed from visitor forwarding headers. */
export function requestAccess(request: IncomingMessage): RenderAccess {
  const host = header(request, 'host') ?? ''
  const origin = header(request, 'origin')
  const localHost = /^(localhost|127\.0\.0\.1|\[::1\])(?::\d{1,5})?$/.test(host)
  const local = process.env.NODE_ENV !== 'production' && !process.env.VERCEL && loopback(request.socket?.remoteAddress) && localHost
  if (local) {
    if (origin && origin !== `http://${host}` && origin !== `https://${host}`) throw new RenderError('disabled', 'Open the studio from the same local address before generating a study.', 403)
    if (header(request, 'sec-fetch-site') === 'cross-site') throw new RenderError('disabled', 'Open the studio directly before generating a study.', 403)
    return { local: true, visitor: createHash('sha256').update(request.socket.remoteAddress ?? 'local').digest('hex').slice(0, 24) }
  }
  if (process.env.ROOF_RENDER_ENABLED !== 'true') throw new RenderError('disabled', 'Live photo studies are available in the private studio preview.', 503)
  let allowed: URL
  try { allowed = new URL(process.env.ROOF_RENDER_ORIGIN ?? '') } catch { throw new RenderError('disabled', 'The live photo studio has not been enabled for this address.', 503) }
  const sameOriginStatus = request.method === 'GET' && !origin && header(request, 'sec-fetch-site') === 'same-origin'
  if (allowed.protocol !== 'https:' || allowed.pathname !== '/' || allowed.search || allowed.hash || (!sameOriginStatus && origin !== allowed.origin) || host !== allowed.host) throw new RenderError('disabled', 'Open the studio from its configured address before generating a study.', 403)
  if (!limiterStore()) throw new RenderError('disabled', 'The live photo studio is waiting for its usage limits to be configured.', 503)
  // On Vercel, this provider-supplied header is rewritten by the edge. Outside
  // Vercel, use the actual peer; never accept a visitor's x-forwarded-for value.
  const ip = process.env.VERCEL === '1' ? header(request, 'x-vercel-forwarded-for') : request.socket?.remoteAddress
  if (!ip || !/^[\da-fA-F:.]+$/.test(ip)) throw new RenderError('disabled', 'The studio could not verify this connection. Please try again from the studio website.', 403)
  return { local: false, visitor: createHash('sha256').update(ip).digest('hex').slice(0, 24) }
}

function cap(name: string, fallback: number, ceiling: number): number {
  const value = Number(process.env[name])
  return Number.isInteger(value) && value > 0 ? Math.min(value, ceiling) : fallback
}

function localIncrement(key: string, ttl: number): number {
  const now = Date.now()
  for (const [storedKey, value] of localCounters) if (value.expires <= now) localCounters.delete(storedKey)
  const previous = localCounters.get(key)
  const next = { count: (previous?.count ?? 0) + 1, expires: previous?.expires ?? now + ttl * 1000 }
  localCounters.set(key, next)
  return next.count
}

/** Reserve before a paid call; failed and timed-out calls also consume a slot. */
export async function reserveRender(access: RenderAccess): Promise<void> {
  const hour = Math.floor(Date.now() / 3_600_000)
  const day = Math.floor(Date.now() / 86_400_000)
  const perHour = cap('ROOF_RENDER_PER_HOUR', 10, 20)
  const daily = cap('ROOF_RENDER_DAILY_CAP', 20, 100)
  const store = access.local ? null : limiterStore()
  if (!access.local && !store) throw new RenderError('disabled', 'The live photo studio is waiting for its usage limits to be configured.', 503)
  const increment = (key: string, ttl: number) => access.local ? Promise.resolve(localIncrement(key, ttl)) : incrementWindow(store!, key, ttl)
  const visitorCount = await increment(`velar-roof-render:visitor:${access.visitor}:${hour}`, 3600)
  if (visitorCount === null) throw new RenderError('busy', 'The studio could not confirm its usage limits. Please try again later.', 503)
  if (visitorCount > perHour) throw new RenderError('rate_limited', 'You have reached the studio’s hourly study limit. Please return later.', 429)
  const dailyCount = await increment(`velar-roof-render:day:${day}`, 86_400)
  if (dailyCount === null) throw new RenderError('busy', 'The studio could not confirm its usage limits. Please try again later.', 503)
  if (dailyCount > daily) throw new RenderError('limit_reached', 'Today’s photo-study allowance has been reached. Please return tomorrow.', 429)
}
