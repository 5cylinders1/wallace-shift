/**
 * Live site audit for the /approach page.
 *
 * SECURITY — why this function never fetches the visitor's URL itself.
 * ----------------------------------------------------------------------
 * A public endpoint that fetches an arbitrary user-supplied URL is a
 * server-side request forgery hole: it can be pointed at localhost, at a
 * private 10.x/192.168.x address, or — worst — at a cloud metadata
 * endpoint like 169.254.169.254 to read deployment credentials. Hostname
 * blocklists do not close it either, because DNS rebinding defeats them.
 *
 * So this function makes exactly one outbound request, and it is to
 * Google: the PageSpeed Insights API, which runs a real Lighthouse audit
 * on Google's own infrastructure and returns the result. Google fetches
 * the visitor's site; we never do. There is no SSRF surface to defend,
 * and the data is better than anything we could scrape.
 *
 * CACHING — why this is a GET.
 * ----------------------------------------------------------------------
 * The audit was a POST, which no CDN will cache. As a GET with the target
 * in the query string, Vercel's edge network caches the whole response by
 * URL: a site audited twice in an hour is served from the edge without the
 * function running at all. That is the result cache, and it doubles as the
 * cheapest possible rate limit — hammering one URL costs nothing after the
 * first call, and spends no PageSpeed quota.
 *
 * Required environment variable:
 *   PAGESPEED_API_KEY  A Google Cloud API key with the PageSpeed Insights
 *                      API enabled. Technically the API answers without
 *                      one — but the keyless quota is a single pool shared
 *                      by every anonymous caller on the internet and is
 *                      routinely exhausted (verified: HTTP 429 on a plain
 *                      request). Treat the key as mandatory; without it
 *                      the audit fails for most visitors, most of the day.
 *                      The free tier is 25,000 requests/day, which is far
 *                      beyond this site's traffic.
 *
 * Optional environment variables (rate limiting):
 *   RATE_LIMIT_REDIS_URL    Upstash Redis REST endpoint.
 *   RATE_LIMIT_REDIS_TOKEN  Its bearer token.
 *
 * Upstash speaks HTTP, so this needs no client library — one fetch, in
 * keeping with the project's lean dependency rule. While either variable
 * is unset the endpoint still works but is UNTHROTTLED: the cache above is
 * then the only thing standing between a bored person with a loop and your
 * daily PageSpeed quota. Set them before advertising the page.
 */

export const config = { runtime: 'edge' }

const PSI = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed'

/**
 * PSI regularly takes 15–30s for a mobile audit, and Vercel's edge runtime
 * gives the whole request 25s. That gap is the tightest constraint in this
 * feature: there is no timeout value that makes a slow Lighthouse run fit.
 *
 * So this sits as close to the platform ceiling as it can while still
 * leaving room to return a real JSON error instead of a platform error
 * page, and the design absorbs the rest — one fewer Lighthouse category to
 * run, an edge cache so a URL is only ever slow once, and a retry button,
 * because PSI frequently answers a repeat request quickly from its own
 * warm result.
 */
const TIMEOUT_MS = 23_000

const MAX_URL_LENGTH = 2048

/** Distinct audits allowed per IP per window. Generous — a real visitor
 *  checks one or two sites; this only stops automated abuse. */
const RATE_LIMIT = 12
const RATE_WINDOW_S = 3600

/** How long the edge serves a cached audit for the same URL. */
const CACHE_S = 3600
const STALE_S = 86_400

function json(body: unknown, status: number, cacheable = false): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
      // Only successful audits are cacheable. Errors must never be, or a
      // transient failure would be pinned to a URL for an hour.
      'cache-control': cacheable
        ? `public, s-maxage=${CACHE_S}, stale-while-revalidate=${STALE_S}`
        : 'no-store',
    },
  })
}

/**
 * Fixed-window counter in Upstash, over its REST API.
 *
 * Returns true when the caller is over the limit. Fails OPEN: if the
 * limiter is unreachable or unconfigured the audit still runs, because
 * breaking the page's centrepiece over a rate-limit outage is worse than
 * briefly allowing extra requests through.
 */
async function isRateLimited(request: Request): Promise<boolean> {
  const base = process.env.RATE_LIMIT_REDIS_URL
  const token = process.env.RATE_LIMIT_REDIS_TOKEN
  if (!base || !token) return false

  const ip =
    request.headers.get('x-real-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown'
  const bucket = Math.floor(Date.now() / 1000 / RATE_WINDOW_S)
  const key = `audit:${ip}:${bucket}`

  try {
    const res = await fetch(`${base}/pipeline`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify([
        ['INCR', key],
        ['EXPIRE', key, String(RATE_WINDOW_S), 'NX'],
      ]),
    })
    if (!res.ok) return false
    const out = (await res.json()) as Array<{ result?: number }>
    const count = out?.[0]?.result
    return typeof count === 'number' && count > RATE_LIMIT
  } catch {
    return false
  }
}

/**
 * Rejects anything that is not a public http(s) URL. This is not an SSRF
 * defence — see the note above, there is nothing to defend — it exists so
 * visitors get a clear message instead of a confusing failure from Google.
 */
function normalizeUrl(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const trimmed = raw.trim()
  if (!trimmed || trimmed.length > MAX_URL_LENGTH) return null

  // People type "example.com", not "https://example.com".
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`

  let url: URL
  try {
    url = new URL(withScheme)
  } catch {
    return null
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null

  const host = url.hostname.toLowerCase()
  const isPrivate =
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.internal') ||
    host.endsWith('.local') ||
    /^\d+\.\d+\.\d+\.\d+$/.test(host) ||
    host.includes(':')
  if (isPrivate) return null

  // A hostname with no dot cannot be a public site.
  if (!host.includes('.')) return null

  return url.toString()
}

/** Lighthouse scores are 0–1; the UI wants whole numbers. */
function pct(score: unknown): number | null {
  return typeof score === 'number' ? Math.round(score * 100) : null
}

type Audit = { score?: number | null; displayValue?: string; title?: string }

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'GET') {
    return json({ ok: false, error: 'method_not_allowed' }, 405)
  }

  const target = normalizeUrl(new URL(request.url).searchParams.get('url'))
  if (!target) {
    return json({ ok: false, error: 'invalid_url' }, 400)
  }

  // Checked after validation so malformed input costs no Redis round trip.
  if (await isRateLimited(request)) {
    return json({ ok: false, error: 'rate_limited' }, 429)
  }

  // Three categories, not four. `best-practices` was requested solely for
  // the is-on-https audit, and the final URL states that outright — so the
  // whole category was being run for something already known. Every
  // category Lighthouse skips is time this request does not spend.
  const params = new URLSearchParams({ url: target, strategy: 'mobile' })
  for (const c of ['performance', 'seo', 'accessibility']) {
    params.append('category', c)
  }
  const key = process.env.PAGESPEED_API_KEY
  if (key) params.set('key', key)

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  let response: Response
  try {
    response = await fetch(`${PSI}?${params.toString()}`, {
      signal: controller.signal,
      headers: { accept: 'application/json' },
    })
  } catch {
    clearTimeout(timer)
    return json({ ok: false, error: 'timeout' }, 504)
  }
  clearTimeout(timer)

  if (!response.ok) {
    // 400 from PSI almost always means it could not load the page at all.
    // 429 means quota — either the key is missing entirely or the day's
    // allowance is gone. Reported separately so the visitor is not told to
    // "try again in a moment" when the real answer is "not until tomorrow".
    if (response.status === 400) {
      return json({ ok: false, error: 'unreachable' }, 422)
    }
    if (response.status === 429) {
      return json({ ok: false, error: 'quota' }, 429)
    }
    return json({ ok: false, error: 'upstream' }, 502)
  }

  let data: Record<string, unknown>
  try {
    data = (await response.json()) as Record<string, unknown>
  } catch {
    return json({ ok: false, error: 'upstream' }, 502)
  }

  const lh = data.lighthouseResult as
    | { categories?: Record<string, { score?: number }>; audits?: Record<string, Audit>; finalUrl?: string }
    | undefined
  if (!lh?.categories) {
    return json({ ok: false, error: 'unreachable' }, 422)
  }

  const audits = lh.audits ?? {}
  const has = (id: string) => {
    const a = audits[id]
    if (!a || typeof a.score !== 'number') return null
    return a.score >= 0.9
  }

  return json(
    {
      ok: true,
      url: lh.finalUrl ?? target,
      scores: {
        performance: pct(lh.categories.performance?.score),
        seo: pct(lh.categories.seo?.score),
        accessibility: pct(lh.categories.accessibility?.score),
      },
      metrics: {
        lcp: audits['largest-contentful-paint']?.displayValue ?? null,
        cls: audits['cumulative-layout-shift']?.displayValue ?? null,
        tbt: audits['total-blocking-time']?.displayValue ?? null,
      },
      checks: {
        metaDescription: has('meta-description'),
        title: has('document-title'),
        viewport: has('viewport'),
        // Derived rather than audited — see the category note above.
        https: (lh.finalUrl ?? target).startsWith('https://'),
        contrast: has('color-contrast'),
        altText: has('image-alt'),
        linkNames: has('link-name'),
      },
    },
    200,
    true,
  )
}
