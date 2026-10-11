/**
 * The Upstash Redis database behind the rate limits and spending caps
 * (/api/audit and the roof estimator), reached over Upstash's REST API: one
 * fetch per check, no client library.
 *
 * It is read from the first of these pairs that is fully set:
 *
 *   RATE_LIMIT_REDIS_URL, RATE_LIMIT_REDIS_TOKEN       set by hand
 *   KV_REST_API_URL, KV_REST_API_TOKEN                 added by Vercel's
 *                                                      "Upstash for Redis"
 *                                                      integration
 *   UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN   as Upstash's console
 *                                                      names them
 *
 * The URL is the REST endpoint (https://<name>.upstash.io), not the
 * rediss:// connection string, and the token is the standard one: these
 * counters write, so the read-only token can't work and is never read.
 */

const PAIRS = [
  ['RATE_LIMIT_REDIS_URL', 'RATE_LIMIT_REDIS_TOKEN'],
  ['KV_REST_API_URL', 'KV_REST_API_TOKEN'],
  ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN'],
] as const

export interface LimiterStore {
  url: string
  token: string
  /** The variable the URL came from, for log lines. */
  from: string
}

/** Each problem is logged once per function instance, not on every request. */
const logged = new Set<string>()
const logOnce = (message: string) => {
  if (logged.has(message)) return
  logged.add(message)
  console.error(`[limiter] ${message}`)
}

/** The configured store, or null when none is (or the one named can't work). */
export function limiterStore(): LimiterStore | null {
  for (const [urlName, tokenName] of PAIRS) {
    // Pasted values often carry a newline or a trailing slash.
    const url = process.env[urlName]?.trim().replace(/\/+$/, '')
    const token = process.env[tokenName]?.trim()
    if (!url || !token) continue
    // The first pair set is the one meant; a broken one doesn't quietly fall through to another.
    if (!url.startsWith('https://')) {
      logOnce(`${urlName} must be the REST URL (https://…upstash.io), not a redis:// connection string. Limits are off.`)
      return null
    }
    return { url, token, from: urlName }
  }
  return null
}

/**
 * Adds one to the fixed-window counter `key`, which expires `ttlSeconds`
 * after its first use, and returns the new count; null when the store
 * didn't answer with one. Callers decide what null means.
 */
export async function incrementWindow(store: LimiterStore, key: string, ttlSeconds: number): Promise<number | null> {
  try {
    const response = await fetch(`${store.url}/pipeline`, {
      method: 'POST',
      headers: { authorization: `Bearer ${store.token}`, 'content-type': 'application/json' },
      body: JSON.stringify([
        ['INCR', key],
        ['EXPIRE', key, String(ttlSeconds), 'NX'],
      ]),
      signal: AbortSignal.timeout(1500),
    })
    if (!response.ok) {
      logOnce(`the store at ${store.from} answered HTTP ${response.status}; check its token (the standard one, not read-only).`)
      return null
    }
    const out = (await response.json()) as Array<{ result?: unknown; error?: unknown }>
    const count = out?.[0]?.result
    if (typeof count === 'number') return count
    // A read-only token gets NOPERM here; a spent free quota gets an error too.
    const error = out?.[0]?.error
    logOnce(`the store at ${store.from} refused the counter: ${typeof error === 'string' ? error : 'no count returned'}.`)
    return null
  } catch {
    // Timeouts and network failures: counted as no answer, not logged on every request.
    return null
  }
}
