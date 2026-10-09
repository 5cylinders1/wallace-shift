/**
 * Plumbing shared by the roof endpoints: JSON responses with honest cache
 * headers, an optional per-IP limit, and outbound calls that can't hang.
 */

import type { IncomingMessage, ServerResponse } from 'node:http'
import type { RoofErrorCode } from '../../../src/demos/roofers/roof/types.js'

/** A failure we can name to the visitor. */
export class RoofError extends Error {
  readonly code: RoofErrorCode
  /** The provider's HTTP status, when the failure was an HTTP answer. */
  readonly status: number | null
  constructor(code: RoofErrorCode, detail?: string, status: number | null = null) {
    super(detail ?? code)
    this.code = code
    this.status = status
  }
}

/**
 * "Not connected yet", "no such address" and "no outline here" are answers,
 * not failures: they come back as 200 so a visitor's ordinary dead end
 * never shows up as a red network error. Bad input, throttling and
 * provider faults keep their real statuses.
 */
const STATUS: Record<RoofErrorCode, number> = {
  not_configured: 200,
  invalid: 400,
  address_not_found: 200,
  no_footprint: 200,
  rate_limited: 429,
  busy: 503,
  upstream: 502,
  roof_not_found: 200,
  unmeasurable: 200,
  limit_reached: 200,
  timed_out: 504,
}

/**
 * `cacheSeconds` > 0 lets Vercel's CDN answer repeat requests for the same
 * URL without running the function (or spending provider quota). Errors
 * are never cached, so a blip isn't pinned to an address for a day.
 * `staleSeconds` lets the CDN serve an expired answer while it refreshes
 * it in the background; pass 0 where a refresh costs money.
 */
export function sendJson(res: ServerResponse, body: unknown, status = 200, cacheSeconds = 0, staleSeconds = cacheSeconds): void {
  res.statusCode = status
  res.setHeader('content-type', 'application/json')
  const stale = staleSeconds > 0 ? `, stale-while-revalidate=${staleSeconds}` : ''
  res.setHeader('cache-control', cacheSeconds > 0 ? `public, s-maxage=${cacheSeconds}${stale}` : 'no-store')
  res.end(JSON.stringify(body))
}

export function sendError(res: ServerResponse, code: RoofErrorCode): void {
  sendJson(res, { ok: false, error: code }, STATUS[code])
}

/** Node lowercases header names but may hand back an array. */
export function header(req: IncomingMessage, name: string): string | undefined {
  const value = req.headers[name]
  return Array.isArray(value) ? value[0] : value
}

export function queryOf(req: IncomingMessage): URLSearchParams {
  return new URL(req.url ?? '/', 'http://localhost').searchParams
}

/**
 * Fixed-window counter in Upstash over its REST API, as in /api/audit.
 * Fails open: an unreachable or unconfigured limiter never breaks the tool.
 */
export async function isRateLimited(req: IncomingMessage, scope: string, limit: number, windowSeconds: number): Promise<boolean> {
  const base = process.env.RATE_LIMIT_REDIS_URL
  const token = process.env.RATE_LIMIT_REDIS_TOKEN
  if (!base || !token) return false

  const ip = header(req, 'x-real-ip') ?? header(req, 'x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const key = `${scope}:${ip}:${Math.floor(Date.now() / 1000 / windowSeconds)}`
  try {
    const response = await fetch(`${base}/pipeline`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify([
        ['INCR', key],
        ['EXPIRE', key, String(windowSeconds), 'NX'],
      ]),
      signal: AbortSignal.timeout(1500),
    })
    if (!response.ok) return false
    const out = (await response.json()) as Array<{ result?: number }>
    const count = out?.[0]?.result
    return typeof count === 'number' && count > limit
  } catch {
    return false
  }
}

/** Whether the shared Upstash store behind the limiters is configured. */
export const hasLimiterStore = () => Boolean(process.env.RATE_LIMIT_REDIS_URL && process.env.RATE_LIMIT_REDIS_TOKEN)

/**
 * Counts one use against `key` (a fixed window the caller names, e.g. a
 * day or a month) and returns the new total, or null when the store is
 * unconfigured or unreachable. Unlike the per-IP limiter this does not
 * fail open on its own: callers spending money decide what null means.
 */
export async function countUse(key: string, ttlSeconds: number): Promise<number | null> {
  if (!hasLimiterStore()) return null
  try {
    const response = await fetch(`${process.env.RATE_LIMIT_REDIS_URL}/pipeline`, {
      method: 'POST',
      headers: { authorization: `Bearer ${process.env.RATE_LIMIT_REDIS_TOKEN}`, 'content-type': 'application/json' },
      body: JSON.stringify([
        ['INCR', key],
        ['EXPIRE', key, String(ttlSeconds), 'NX'],
      ]),
      signal: AbortSignal.timeout(1500),
    })
    if (!response.ok) return null
    const out = (await response.json()) as Array<{ result?: number }>
    const count = out?.[0]?.result
    return typeof count === 'number' ? count : null
  } catch {
    return null
  }
}

/** Identifies us to keyless public services, as their usage policies ask. */
export const USER_AGENT = 'RoofEstimateDemo/1.0 (+https://roofers.wallaceshift.com)'

/** Epoch ms by which a whole request must be answered; outbound calls share it. */
export type Deadline = number

/** Leaves time to answer in JSON before the platform cuts the function off. */
export function deadlineIn(ms: number): Deadline {
  return Date.now() + ms
}

const isTimeout = (error: unknown) => error instanceof DOMException && (error.name === 'TimeoutError' || error.name === 'AbortError')

/**
 * One outbound JSON call with a hard timeout: its own limit or whatever is
 * left of the request's deadline, whichever is shorter. Throttling and
 * running out of time become `busy` (the visitor can retry); anything else
 * unexpected becomes `upstream`.
 */
export async function fetchJson(url: string, init: RequestInit & { timeoutMs?: number; deadline?: Deadline } = {}): Promise<unknown> {
  const { timeoutMs = 8000, deadline, ...rest } = init
  const budget = deadline === undefined ? timeoutMs : Math.min(timeoutMs, deadline - Date.now())
  if (budget < 250) throw new RoofError('busy', 'out of time before the call')
  let response: Response
  const signal = AbortSignal.timeout(budget)
  try {
    response = await fetch(url, {
      ...rest,
      headers: { accept: 'application/json', 'user-agent': USER_AGENT, ...rest.headers },
      signal,
    })
  } catch (error) {
    throw new RoofError(isTimeout(error) ? 'busy' : 'upstream', `fetch failed: ${String(error)}`)
  }
  if (response.status === 429 || response.status === 503) throw new RoofError('busy', `HTTP ${response.status}`, response.status)
  if (!response.ok) throw new RoofError('upstream', `HTTP ${response.status}`, response.status)
  try {
    return await response.json()
  } catch (error) {
    // The timeout still runs while the body downloads.
    const timedOut = isTimeout(error) || signal.aborted
    throw new RoofError(timedOut ? 'busy' : 'upstream', timedOut ? 'body timed out' : 'response was not JSON')
  }
}

/** The handler body, with every throw turned into one of our error codes. */
export async function handle(res: ServerResponse, label: string, run: () => Promise<void>): Promise<void> {
  try {
    await run()
  } catch (error) {
    if (error instanceof RoofError) {
      if (error.code === 'upstream' || error.code === 'busy') console.error(`[${label}] ${error.code}: ${error.message}`)
      if (!res.headersSent) sendError(res, error.code)
      return
    }
    console.error(`[${label}] unexpected:`, error)
    if (!res.headersSent) sendError(res, 'upstream')
  }
}
