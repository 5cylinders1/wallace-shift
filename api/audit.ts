/**
 * Live site audit for the /approach page.
 *
 * RUNTIME — why this is not an edge function.
 * ----------------------------------------------------------------------
 * It was, and that was the single biggest defect in the feature. The edge
 * runtime must return its first byte within 25s. Measured PageSpeed times
 * for real small-business sites:
 *
 *     reply365.ai              11.5s
 *     brown-roofing.com        21.9s
 *     centuryroofingkc.com     24.6s
 *     cathywangdesign.com      28.0s
 *     troofs.com               28.6s
 *     twista.com               54.2s
 *     services.mistersparky.com 73.1s
 *
 * Six of seven exceeded the ceiling, so the audit failed for most visitors
 * and no timeout value could have fixed it. The Node runtime takes a
 * `maxDuration` instead, which buys the headroom the work actually needs.
 *
 * The visitor no longer waits on a spinner for this: the request is fired
 * from the top of the page and the result is rendered at the bottom, so the
 * wait is spent reading the three stages. See SiteAudit.tsx.
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
 * the visitor's site; we never do. There is no SSRF surface to defend.
 *
 * It also gets us past bot protection. Fetching these same sites directly
 * takes ~0.3s rather than ~30s, but cathywangdesign.com and
 * services.mistersparky.com both answer a plain server-side request with
 * HTTP 403 — Cloudflare-class filtering that a browser user-agent does not
 * satisfy. Lighthouse drives real Chrome and gets through.
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
 *                      The free tier is 25,000 requests/day.
 *
 * Optional environment variables (rate limiting):
 *   RATE_LIMIT_REDIS_URL    Upstash Redis REST endpoint.
 *   RATE_LIMIT_REDIS_TOKEN  Its bearer token.
 *
 * Upstash speaks HTTP, so this needs no client library — one fetch, in
 * keeping with the project's lean dependency rule. While either variable
 * is unset the endpoint still works but is UNTHROTTLED: the cache above is
 * then the only thing standing between a bored person with a loop and your
 * daily PageSpeed quota.
 */

/**
 * 60s is the Hobby plan's ceiling. It does not cover every site — the
 * 73s outlier above still fails — but it turns "fails for six of seven"
 * into "fails for roughly one of seven", and that failure is now reported
 * honestly instead of arriving after a long wait.
 */
export const config = { maxDuration: 60 }

const PSI = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed'

/** Leaves ~5s under the function ceiling to serialise and return real JSON
 *  rather than letting the platform emit its own error page. */
const TIMEOUT_MS = 55_000

const MAX_URL_LENGTH = 2048

/** Distinct audits allowed per IP per window. Generous — a real visitor
 *  checks one or two sites; this only stops automated abuse. */
const RATE_LIMIT = 12
const RATE_WINDOW_S = 3600

/** How long the edge serves a cached audit for the same URL. */
const CACHE_S = 3600
const STALE_S = 86_400

/** Filmstrip frames kept. Lighthouse returns ~10 at ~4KB each; this many
 *  tells the loading story without bloating the cached JSON. */
const MAX_FRAMES = 6

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

type Audit = {
  score?: number | null
  displayValue?: string
  numericValue?: number
  title?: string
  details?: { data?: string; items?: Array<{ data?: string; timing?: number }> }
}

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
  // whole category was being run for something already known.
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
    | {
        categories?: Record<string, { score?: number }>
        audits?: Record<string, Audit>
        finalUrl?: string
      }
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

  /* Lighthouse renders the page in real Chrome and hands back what it saw.
     The previous version discarded all of it and displayed seven booleans,
     which is why a 30-second wait felt like it returned nothing. The
     screenshot is the whole point: it is the visitor's own site, and we
     already paid for it. */
  const shot = audits['final-screenshot']?.details?.data ?? null
  const frames = (audits['screenshot-thumbnails']?.details?.items ?? [])
    .filter((f) => typeof f.data === 'string')
    .slice(0, MAX_FRAMES)
    .map((f) => ({ data: f.data as string, timing: f.timing ?? null }))

  /* Real numbers, not bands. `numericValue` is milliseconds (or unitless
     for CLS); `displayValue` is Lighthouse's own formatted string, which is
     already localised and correctly rounded — so display that and keep the
     raw value for anything that needs to compare. */
  const metric = (id: string) => ({
    display: audits[id]?.displayValue ?? null,
    value: typeof audits[id]?.numericValue === 'number' ? audits[id].numericValue : null,
  })

  return json(
    {
      ok: true,
      url: lh.finalUrl ?? target,
      screenshot: shot,
      frames,
      scores: {
        performance: pct(lh.categories.performance?.score),
        seo: pct(lh.categories.seo?.score),
        accessibility: pct(lh.categories.accessibility?.score),
      },
      metrics: {
        lcp: metric('largest-contentful-paint'),
        cls: metric('cumulative-layout-shift'),
        tbt: metric('total-blocking-time'),
        fcp: metric('first-contentful-paint'),
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
