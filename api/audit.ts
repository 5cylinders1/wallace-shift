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
 */

export const config = { runtime: 'edge' }

const PSI = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed'

/** PSI regularly takes 15s+. Edge gives us 25s, so this leaves headroom
 *  to return a useful timeout message rather than a platform error page. */
const TIMEOUT_MS = 20_000

const MAX_URL_LENGTH = 2048

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  })
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
  if (request.method !== 'POST') {
    return json({ ok: false, error: 'method_not_allowed' }, 405)
  }

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return json({ ok: false, error: 'invalid' }, 400)
  }

  const target = normalizeUrl(body.url)
  if (!target) {
    return json({ ok: false, error: 'invalid_url' }, 400)
  }

  const params = new URLSearchParams({ url: target, strategy: 'mobile' })
  for (const c of ['performance', 'seo', 'accessibility', 'best-practices']) {
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
        bestPractices: pct(lh.categories['best-practices']?.score),
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
        https: has('is-on-https'),
        contrast: has('color-contrast'),
        altText: has('image-alt'),
        linkNames: has('link-name'),
      },
    },
    200,
  )
}
