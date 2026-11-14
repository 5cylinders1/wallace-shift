import type { DashboardSource, DashboardSnapshot } from '../../src/business-dashboard/model.js'

type Row = { dimensionValues?: { value?: string }[]; metricValues?: { value?: string }[] }
type Report = { kind?: string; rows?: Row[]; metricHeaders?: { name?: string }[]; metadata?: { timeZone?: string } }
type SearchRow = { keys?: string[]; clicks: number; impressions: number; ctr: number; position: number }
type SearchReport = { rows?: SearchRow[]; responseAggregationType?: string }
type Range = DashboardSnapshot['range']
const googleSetup = [
  'Create a Google Cloud OAuth web application and enable the Analytics Data API and Search Console API.',
  'Authorize the reporting account with analytics.readonly and webmasters.readonly scopes and offline access.',
  'Store DASHBOARD_GOOGLE_CLIENT_ID, DASHBOARD_GOOGLE_CLIENT_SECRET and DASHBOARD_GOOGLE_REFRESH_TOKEN as server environment variables. Never use VITE_ variables.',
]
const configured = () => ['DASHBOARD_GOOGLE_CLIENT_ID', 'DASHBOARD_GOOGLE_CLIENT_SECRET', 'DASHBOARD_GOOGLE_REFRESH_TOKEN'].every(key => Boolean(process.env[key]?.trim()))
export function googleDashboardSources(): DashboardSource[] {
  return [
    { id: 'ga4', name: 'Google Analytics', category: 'website', description: 'Visitors, sessions, page performance and a live visitor count.', status: 'needs-setup', statusDetail: 'Reporting access is not configured.', freshness: 'Historical reports can change during processing. The live count covers the last 30 minutes.', checkedAt: null, dataThrough: null, metrics: [], setup: { steps: [...googleSetup, 'Set DASHBOARD_GA4_PROPERTY_ID to the numeric property ID. The documented Wallace Shift property is 561794453; confirm access in Google Analytics.'], docsUrl: 'https://developers.google.com/analytics/devguides/reporting/data/v1/quickstart-client-libraries', href: 'https://analytics.google.com/' } },
    { id: 'search-console', name: 'Google Search Console', category: 'seo', description: 'Search clicks, impressions, queries and average search position.', status: 'needs-setup', statusDetail: 'Search reporting access is not configured.', freshness: 'Finalized daily search data. Recent dates may not be available yet; average position is not a live rank tracker.', checkedAt: null, dataThrough: null, timeZone: 'America/Los_Angeles', metrics: [], setup: { steps: [...googleSetup, 'Verify the website in Search Console and set DASHBOARD_SEARCH_CONSOLE_SITE_URL to its exact property name, for example sc-domain:wallaceshift.com.'], docsUrl: 'https://developers.google.com/webmaster-tools/v1/searchanalytics/query', href: 'https://search.google.com/search-console' } },
  ]
}
async function readJson<T>(url: string, init: RequestInit): Promise<T> {
  const result = await fetch(url, { ...init, redirect: 'error', signal: AbortSignal.timeout(10000) })
  if (!result.ok) throw new Error('provider_unavailable')
  return await result.json() as T
}
async function accessToken(): Promise<string> {
  const result = await readJson<{ access_token?: unknown }>('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'refresh_token', client_id: process.env.DASHBOARD_GOOGLE_CLIENT_ID!.trim(), client_secret: process.env.DASHBOARD_GOOGLE_CLIENT_SECRET!.trim(), refresh_token: process.env.DASHBOARD_GOOGLE_REFRESH_TOKEN!.trim() }) })
  if (typeof result.access_token !== 'string' || !result.access_token || /[\r\n]/.test(result.access_token)) throw new Error('provider_unavailable')
  return result.access_token
}
function numeric(value: unknown): number {
  if ((typeof value !== 'number' && typeof value !== 'string') || value === '' || !Number.isFinite(Number(value)) || Number(value) < 0) throw new Error('invalid_provider_response')
  return Number(value)
}
function metrics(row: Row | undefined, count: number): number[] {
  if (!row) return Array<number>(count).fill(0)
  if (!Array.isArray(row.metricValues) || row.metricValues.length < count) throw new Error('invalid_provider_response')
  return row.metricValues.slice(0, count).map(value => numeric(value.value))
}
function rows(report: Report): Row[] {
  if (!report || typeof report !== 'object' || !Array.isArray(report.metricHeaders) || !report.metricHeaders.length || report.metricHeaders.some(header => typeof header.name !== 'string') || (report.rows !== undefined && !Array.isArray(report.rows))) throw new Error('invalid_provider_response')
  return report.rows ?? []
}
function realtimeRows(report: Report): Row[] {
  const kind = 'analyticsData#runRealtimeReport'
  if (report?.kind !== undefined && report.kind !== kind) throw new Error('invalid_provider_response')
  // Google can omit every default-valued field for an empty realtime report.
  // Accept only the observed kind-only response; other shapes stay strict.
  if (report?.kind === kind && Object.keys(report).length === 1) return []
  return rows(report)
}
function dimension(row: Row, index = 0): string {
  const value = row.dimensionValues?.[index]?.value
  if (typeof value !== 'string') throw new Error('invalid_provider_response')
  return value.slice(0, 500)
}
function reportDate(value: string): string {
  if (!/^\d{8}$/.test(value)) throw new Error('invalid_provider_response')
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`
}
async function analytics(source: DashboardSource, range: Range, token: string, now: string): Promise<DashboardSource> {
  const property = process.env.DASHBOARD_GA4_PROPERTY_ID!.trim()
  if (!/^\d+$/.test(property)) throw new Error('invalid_configuration')
  const call = (method: string, body: unknown) => readJson<Report>(`https://analyticsdata.googleapis.com/v1beta/properties/${property}:${method}`, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify(body) })
  const dateRanges = [{ startDate: range.startDate, endDate: range.endDate }]
  const metricNames = ['activeUsers', 'sessions', 'screenPageViews', 'keyEvents']
  const [summary, daily, pages, realtime] = await Promise.allSettled([
    call('runReport', { dateRanges, metrics: metricNames.map(name => ({ name })) }),
    call('runReport', { dateRanges, dimensions: [{ name: 'date' }], metrics: [{ name: 'sessions' }], orderBys: [{ dimension: { dimensionName: 'date' } }], limit: 100 }),
    call('runReport', { dateRanges, dimensions: [{ name: 'pagePath' }], metrics: [{ name: 'screenPageViews' }], orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }], limit: 10 }),
    call('runRealtimeReport', { metrics: [{ name: 'activeUsers' }], minuteRanges: [{ startMinutesAgo: 29, endMinutesAgo: 0 }] }),
  ])
  if (summary.status !== 'fulfilled') throw new Error('provider_unavailable')
  const values = metrics(rows(summary.value)[0], 4)
  const metricLabels = ['Active visitors', 'Sessions', 'Page views', 'Key events']
  const ids = ['activeUsers', 'sessions', 'pageViews', 'keyEvents']
  const result: DashboardSource = { ...source, status: 'connected', checkedAt: now, timeZone: summary.value.metadata?.timeZone ?? 'Property reporting time zone', statusDetail: 'Reporting access verified. Data reflects consented and measured traffic only.', metrics: values.map((value, index) => ({ id: ids[index], label: metricLabels[index], value, format: 'number', note: index === 3 ? 'All key events configured in GA4; not necessarily qualified leads or sales.' : `Reported for ${range.startDate} through ${range.endDate}.` })) }
  const unavailable: string[] = []
  if (daily.status === 'fulfilled') {
    try {
      const points = rows(daily.value).map(row => ({ date: reportDate(dimension(row)), value: metrics(row, 1)[0] })).sort((a, b) => a.date.localeCompare(b.date))
      result.series = { label: 'Sessions', points }
      result.dataThrough = points.at(-1)?.date ?? null
    } catch { unavailable.push('daily trend') }
  } else unavailable.push('daily trend')
  if (pages.status === 'fulfilled') {
    try { result.table = { title: 'Top pages', columns: [{ key: 'page', label: 'Page' }, { key: 'views', label: 'Views', format: 'number' }], rows: rows(pages.value).map(row => ({ page: dimension(row), views: metrics(row, 1)[0] })) } }
    catch { unavailable.push('top pages') }
  } else unavailable.push('top pages')
  if (realtime.status === 'fulfilled') {
    try { result.metrics.push({ id: 'realtimeUsers', label: 'Visitors in last 30 min', value: metrics(realtimeRows(realtime.value)[0], 1)[0], format: 'number', note: `GA4 Realtime checked at ${now}; separate from the selected date range.` }) }
    catch { unavailable.push('live visitor count') }
  } else unavailable.push('live visitor count')
  if (unavailable.length) result.statusDetail += ` Currently unavailable: ${unavailable.join(', ')}.`
  return result
}
function searchRows(report: SearchReport): SearchRow[] {
  if (!report || typeof report !== 'object' || (!Array.isArray(report.rows) && typeof report.responseAggregationType !== 'string') || (report.rows !== undefined && !Array.isArray(report.rows))) throw new Error('invalid_provider_response')
  return (report.rows ?? []).map(row => ({ ...row, clicks: numeric(row.clicks), impressions: numeric(row.impressions), ctr: numeric(row.ctr), position: numeric(row.position) }))
}
async function searchConsole(source: DashboardSource, range: Range, token: string, now: string): Promise<DashboardSource> {
  const site = process.env.DASHBOARD_SEARCH_CONSOLE_SITE_URL!.trim()
  if (site.length > 500 || !/^(sc-domain:[a-z\d.-]+|https?:\/\/[^\s]+)$/i.test(site)) throw new Error('invalid_configuration')
  const call = (dimensions: string[], rowLimit: number) => readJson<SearchReport>(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify({ startDate: range.startDate, endDate: range.endDate, type: 'web', dataState: 'final', dimensions, rowLimit }) })
  const [summary, queries, dates] = await Promise.allSettled([call([], 1), call(['query'], 20), call(['date'], 100)])
  if (summary.status !== 'fulfilled') throw new Error('provider_unavailable')
  const total = searchRows(summary.value)[0]
  const result: DashboardSource = { ...source, status: 'connected', checkedAt: now, statusDetail: 'Reporting access verified. Query details omit anonymized queries and are limited to the top 20 returned rows.', metrics: [
    { id: 'clicks', label: 'Search clicks', value: total?.clicks ?? 0, format: 'number', note: 'Google web search clicks in the selected dates.' },
    { id: 'impressions', label: 'Search impressions', value: total?.impressions ?? 0, format: 'number', note: 'Google web search impressions in the selected dates.' },
    { id: 'ctr', label: 'Click through rate', value: (total?.ctr ?? 0) * 100, format: 'percent', note: 'Clicks divided by impressions for the property.' },
    ...(total && total.impressions > 0 ? [{ id: 'position', label: 'Average position', value: total.position, format: 'decimal' as const, note: 'Average topmost result position across impressions; not a fixed or live keyword rank.' }] : []),
  ] }
  const unavailable: string[] = []
  if (queries.status === 'fulfilled') {
    try { result.table = { title: 'Top search queries', columns: [{ key: 'query', label: 'Search query' }, { key: 'clicks', label: 'Clicks', format: 'number' }, { key: 'impressions', label: 'Impressions', format: 'number' }, { key: 'position', label: 'Avg. position', format: 'decimal' }], rows: searchRows(queries.value).map(row => {
      if (typeof row.keys?.[0] !== 'string') throw new Error('invalid_provider_response')
      return { query: row.keys[0].slice(0, 500), clicks: row.clicks, impressions: row.impressions, position: row.position }
    }) } } catch { unavailable.push('query details') }
  } else unavailable.push('query details')
  if (dates.status === 'fulfilled') {
    try {
      const points = searchRows(dates.value).map(row => {
        if (!row.keys?.[0] || !/^\d{4}-\d{2}-\d{2}$/.test(row.keys[0])) throw new Error('invalid_provider_response')
        return { date: row.keys[0], value: row.clicks }
      }).sort((a, b) => a.date.localeCompare(b.date))
      result.series = { label: 'Search clicks', points }; result.dataThrough = points.at(-1)?.date ?? null
    } catch { unavailable.push('daily trend') }
  } else unavailable.push('daily trend')
  if (unavailable.length) result.statusDetail += ` Currently unavailable: ${unavailable.join(', ')}.`
  return result
}
export async function loadBusinessDashboardGoogle(range: Range, now = new Date()): Promise<DashboardSource[]> {
  const sources = googleDashboardSources()
  const ready = sources.map(source => configured() && Boolean(process.env[source.id === 'ga4' ? 'DASHBOARD_GA4_PROPERTY_ID' : 'DASHBOARD_SEARCH_CONSOLE_SITE_URL']?.trim()))
  if (!ready.some(Boolean)) return sources
  // A fresh access token is held only in this request's memory, never returned or logged.
  const token = accessToken()
  return await Promise.all(sources.map(async (source, index) => {
    if (!ready[index]) return source
    try {
      const result = await (source.id === 'ga4' ? analytics : searchConsole)(source, range, await token, now.toISOString())
      return { ...result, checkedAt: new Date().toISOString() }
    }
    catch { return { ...source, status: 'error' as const, checkedAt: now.toISOString(), statusDetail: 'Google reporting could not be read. Check the authorized account, API access, scopes and server configuration, then refresh.' } }
  }))
}
