import type { DashboardMetric, DashboardSnapshot, DashboardSource } from '../../src/business-dashboard/model.js'

type Range = DashboardSnapshot['range']
type Json = Record<string, unknown>
type ChannelId = 'google-ads' | 'meta-ads' | 'facebook' | 'instagram' | 'linkedin-ads'
type SourceResult = Pick<DashboardSource, 'metrics' | 'statusDetail'> & Partial<Pick<DashboardSource, 'dataThrough' | 'timeZone' | 'series' | 'table'>>

// All endpoints are fixed provider origins. Credentials never enter URLs or responses.
// These adapters only read reporting data; the Google POSTs are OAuth/report queries.
class ChannelError extends Error {
  readonly kind: 'setup' | 'account-not-enabled' | 'auth' | 'provider' | 'incomplete'
  constructor(kind: 'setup' | 'account-not-enabled' | 'auth' | 'provider' | 'incomplete') { super(kind); this.kind = kind }
}

const definitions: Record<ChannelId, Omit<DashboardSource, 'status' | 'statusDetail' | 'checkedAt' | 'dataThrough' | 'metrics'>> = {
  'google-ads': {
    id: 'google-ads', name: 'Google Ads', category: 'advertising',
    description: 'Account spend, impressions, clicks and attributed conversions.',
    freshness: 'Clicks, impressions and cost usually refresh hourly. Conversions can arrive later.',
    setup: { steps: ['Enable Google Ads API access on your Google Cloud project and authorize the adwords scope.', 'Configure the account ID and server credentials, then refresh this dashboard.'], docsUrl: 'https://developers.google.com/google-ads/api/docs/api-policy/access-levels' },
  },
  'meta-ads': {
    id: 'meta-ads', name: 'Meta Ads', category: 'advertising',
    description: 'Facebook and Instagram advertising spend, impressions and link clicks.',
    freshness: 'Provider reporting can lag. A successful refresh does not mean all conversions are final.',
    setup: { steps: ['Grant ads_read access to the Meta app and reporting access to your ad account.', 'Configure the ad account ID and server access token, then refresh.'], docsUrl: 'https://developers.facebook.com/docs/marketing-api/insights/' },
  },
  facebook: {
    id: 'facebook', name: 'Facebook', category: 'social',
    description: 'Page content views and engagement reported by Meta.',
    freshness: 'Most Page insights update daily. Eligibility and metric availability vary by Page.',
    setup: { steps: ['Authorize a Page access token with read_insights and pages_read_engagement.', 'Configure the Page ID and server token. The authorizing user needs the ANALYZE Page task.'], docsUrl: 'https://developers.facebook.com/docs/graph-api/reference/insights/' },
  },
  instagram: {
    id: 'instagram', name: 'Instagram', category: 'social',
    description: 'Professional account content views and interactions.',
    freshness: 'Insights may be delayed up to 48 hours. Unavailable metrics are not reported as zero.',
    setup: { steps: ['Use an Instagram business or creator account and authorize Insights access.', 'Configure the account ID, server token and login type. Other businesses’ accounts require Advanced Access.'], docsUrl: 'https://developers.facebook.com/documentation/instagram-platform/insights' },
  },
  'linkedin-ads': {
    id: 'linkedin-ads', name: 'LinkedIn Ads', category: 'advertising',
    description: 'Account spend, impressions, clicks and website conversions.',
    freshness: 'Performance is near real time; some metrics and conversions have longer processing delays.',
    setup: { steps: ['Obtain Advertising API access and member authorization for r_ads and r_ads_reporting.', 'Configure the ad account ID and server access token. The member needs access to that account.'], docsUrl: 'https://learn.microsoft.com/en-us/linkedin/marketing/increasing-access' },
  },
}

function env(name: string): string { return process.env[name]?.trim() ?? '' }
function required(name: string, pattern?: RegExp): string {
  const value = env(name)
  if (!value || (pattern && !pattern.test(value))) throw new ChannelError('setup')
  return value
}
function version(name: string, fallback: string, pattern: RegExp): string {
  const value = env(name) || fallback
  if (!pattern.test(value)) throw new ChannelError('setup')
  return value
}
function object(value: unknown): Json { return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Json : {} }
function list(value: unknown): Json[] { return Array.isArray(value) ? value.map(object) : [] }
function numeric(value: unknown): number | null {
  if (typeof value !== 'number' && (typeof value !== 'string' || !/^\d+(?:\.\d+)?$/.test(value))) return null
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? number : null
}
function sum(rows: Json[], key: string): number | null {
  if (!rows.length) return null
  const values = rows.map(row => numeric(row[key]))
  return values.some(value => value === null) ? null : (values as number[]).reduce((total, value) => total + value, 0)
}
function metric(id: string, label: string, value: number | null, note: string, format: DashboardMetric['format'] = 'number'): DashboardMetric[] {
  return value === null ? [] : [{ id, label, value, note, format }]
}
function money(value: number | null, currency: unknown): DashboardMetric[] {
  if (typeof currency !== 'string' || !/^[A-Z]{3}$/.test(currency)) return []
  return metric('spend', `Ad spend (${currency})`, value, `Account currency: ${currency}. No currency conversion applied.`, currency === 'USD' ? 'currency' : 'decimal')
}
function validDate(value: unknown): value is string { return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T00:00:00Z`)) }
function latestDate(values: unknown[]): string | null { return values.filter(validDate).sort().at(-1) ?? null }
function reportNote(range: Range, zone: string): string { return `Requested ${range.startDate} through ${range.endDate} in ${zone}. Recent reporting may be incomplete.` }
const facebookTimeZone = 'America/Los_Angeles'
const facebookDateTime = new Intl.DateTimeFormat('en-US', {
  timeZone: facebookTimeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
})
function facebookParts(time: number): Record<string, string> {
  return Object.fromEntries(facebookDateTime.formatToParts(new Date(time)).filter(part => part.type !== 'literal').map(part => [part.type, part.value]))
}
function facebookMidnight(date: string): number {
  const target = Date.parse(`${date}T00:00:00Z`)
  let candidate = target
  // Resolve local midnight through the IANA zone rather than assuming a fixed -07/-08 offset.
  for (let attempt = 0; attempt < 3; attempt++) {
    const parts = facebookParts(candidate)
    const local = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second))
    candidate += target - local
  }
  return candidate / 1000
}
function facebookBucketDate(endTime: unknown): string | null {
  if (typeof endTime !== 'string' || !Number.isFinite(Date.parse(endTime))) return null
  // end_time is an exclusive period boundary. One millisecond before it belongs
  // to the reported Pacific calendar day, including 23-hour and 25-hour days.
  const parts = facebookParts(Date.parse(endTime) - 1)
  return `${parts.year}-${parts.month}-${parts.day}`
}
function validRange(range: Range): void {
  if (!validDate(range.startDate) || !validDate(range.endDate)) throw new ChannelError('setup')
  const days = (Date.parse(range.endDate) - Date.parse(range.startDate)) / 86_400_000 + 1
  if (days < 1 || days > 90 || ![7, 30, 90].includes(range.days)) throw new ChannelError('setup')
}

async function googleAdsAccountNotEnabled(response: Response): Promise<boolean> {
  try {
    const text = await response.text()
    if (text.length > 2_000_000) return false
    const details = list(object(object(JSON.parse(text)).error).details)
    return details.some(detail => list(detail.errors).some(error => object(error.errorCode).authorizationError === 'CUSTOMER_NOT_ENABLED'))
  } catch {
    return false
  }
}

async function request(url: string | URL, init: RequestInit = {}, provider?: 'google-ads'): Promise<unknown> {
  const response = await fetch(url, { ...init, redirect: 'error', signal: AbortSignal.timeout(8000) })
  if (!response.ok) {
    // Inspect only this structured Google Ads enum. Never propagate upstream
    // messages, which can contain tokens, account identifiers or request details.
    if (provider === 'google-ads' && response.status === 403 && await googleAdsAccountNotEnabled(response)) throw new ChannelError('account-not-enabled')
    throw new ChannelError(response.status === 401 || response.status === 403 ? 'auth' : 'provider')
  }
  const text = await response.text()
  if (text.length > 2_000_000) throw new ChannelError('incomplete')
  const value: unknown = JSON.parse(text)
  if (object(value).error) throw new ChannelError('provider')
  return value
}

async function googleAdsToken(): Promise<string> {
  if (env('DASHBOARD_GOOGLE_ADS_ACCESS_TOKEN')) return env('DASHBOARD_GOOGLE_ADS_ACCESS_TOKEN')
  const body = new URLSearchParams({
    client_id: required('DASHBOARD_GOOGLE_ADS_CLIENT_ID'), client_secret: required('DASHBOARD_GOOGLE_ADS_CLIENT_SECRET'),
    refresh_token: required('DASHBOARD_GOOGLE_ADS_REFRESH_TOKEN'), grant_type: 'refresh_token',
  })
  const result = object(await request('https://oauth2.googleapis.com/token', { method: 'POST', body }))
  if (typeof result.access_token !== 'string' || !result.access_token) throw new ChannelError('auth')
  return result.access_token
}

async function googleAds(range: Range): Promise<SourceResult> {
  const customerId = required('DASHBOARD_GOOGLE_ADS_CUSTOMER_ID', /^\d{10}$/)
  const apiVersion = version('DASHBOARD_GOOGLE_ADS_API_VERSION', 'v26', /^v\d{2}$/)
  const managerId = env('DASHBOARD_GOOGLE_ADS_LOGIN_CUSTOMER_ID')
  if (managerId && !/^\d{10}$/.test(managerId)) throw new ChannelError('setup')
  const token = await googleAdsToken()
  const headers: Record<string, string> = { authorization: `Bearer ${token}`, 'content-type': 'application/json' }
  if (managerId) headers['login-customer-id'] = managerId
  const search = async (query: string) => {
    const rows: Json[] = []
    let pageToken = ''
    for (let page = 0; page < 5; page++) {
      const result = object(await request(`https://googleads.googleapis.com/${apiVersion}/customers/${customerId}/googleAds:search`, {
        method: 'POST', headers, body: JSON.stringify({ query, ...(pageToken ? { pageToken } : {}) }),
      }, 'google-ads'))
      if (!Array.isArray(result.results) && result.results !== undefined) throw new ChannelError('provider')
      rows.push(...list(result.results))
      pageToken = typeof result.nextPageToken === 'string' ? result.nextPageToken : ''
      if (!pageToken) return rows
    }
    throw new ChannelError('incomplete')
  }
  const [accounts, rows] = await Promise.all([
    search('SELECT customer.id, customer.currency_code, customer.time_zone FROM customer LIMIT 1'),
    search(`SELECT segments.date, metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions FROM customer WHERE segments.date BETWEEN '${range.startDate}' AND '${range.endDate}' ORDER BY segments.date`),
  ])
  const account = object(accounts[0]?.customer)
  if (String(account.id) !== customerId) throw new ChannelError('auth')
  const zone = typeof account.timeZone === 'string' ? account.timeZone : 'the ad account timezone'
  const values = rows.map(row => object(row.metrics))
  const cost = sum(values, 'costMicros')
  const points = rows.flatMap(row => {
    const date = object(row.segments).date
    const value = numeric(object(row.metrics).clicks)
    return validDate(date) && value !== null ? [{ date, value }] : []
  })
  return {
    metrics: [
      ...money(cost === null ? null : cost / 1_000_000, account.currencyCode),
      ...metric('impressions', 'Impressions', sum(values, 'impressions'), 'Google Ads account impressions.'),
      ...metric('clicks', 'Clicks', sum(values, 'clicks'), 'Google Ads account clicks.'),
      ...metric('conversions', 'Attributed conversions', sum(values, 'conversions'), 'Google Ads conversion-action attribution; may be fractional and is not a count of unique CRM leads.', 'decimal'),
    ],
    dataThrough: latestDate(rows.map(row => object(row.segments).date)), timeZone: zone,
    statusDetail: `${reportNote(range, zone)} ${rows.length ? 'Account reporting retrieved.' : 'No reporting rows returned for this period.'}`,
    ...(points.length ? { series: { label: 'Google Ads clicks', points } } : {}),
  }
}

function graphUrl(path: string, params: Record<string, string>, host: 'facebook' | 'instagram' = 'facebook'): URL {
  const apiVersion = version('DASHBOARD_META_API_VERSION', 'v27.0', /^v\d{2}\.0$/)
  const url = new URL(`https://graph.${host}.com/${apiVersion}/${path}`)
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
  return url
}
async function graph(url: URL, token: string): Promise<Json> {
  return object(await request(url, { headers: { authorization: `Bearer ${token}` } }))
}

async function metaAds(range: Range): Promise<SourceResult> {
  const id = required('DASHBOARD_META_AD_ACCOUNT_ID', /^(?:act_)?\d+$/).replace(/^act_/, '')
  const token = required('DASHBOARD_META_ADS_ACCESS_TOKEN')
  const [account, response] = await Promise.all([
    graph(graphUrl(`act_${id}`, { fields: 'id,currency,timezone_name' }), token),
    graph(graphUrl(`act_${id}/insights`, {
      fields: 'spend,impressions,clicks,inline_link_clicks,date_start,date_stop', level: 'account',
      time_range: JSON.stringify({ since: range.startDate, until: range.endDate }),
    }), token),
  ])
  if (String(account.id) !== `act_${id}` || !Array.isArray(response.data)) throw new ChannelError('provider')
  const rows = list(response.data)
  // Account-level unsegmented queries have at most one row. Never silently truncate a report.
  if (rows.length > 1 || object(response.paging).next) throw new ChannelError('incomplete')
  const zone = typeof account.timezone_name === 'string' ? account.timezone_name : 'the ad account timezone'
  return {
    metrics: [
      ...money(sum(rows, 'spend'), account.currency),
      ...metric('impressions', 'Impressions', sum(rows, 'impressions'), 'Meta Ads impressions; includes Facebook and Instagram delivery.'),
      ...metric('clicks', 'All clicks', sum(rows, 'clicks'), 'All Meta ad clicks, including interactions that are not website visits.'),
      ...metric('link-clicks', 'Link clicks', sum(rows, 'inline_link_clicks'), 'Meta reported link clicks; these are not unique visitors or CRM leads.'),
    ],
    timeZone: zone, dataThrough: latestDate(rows.map(row => row.date_stop)),
    statusDetail: `${reportNote(range, zone)} ${rows.length ? 'Account totals retrieved.' : 'No reporting rows returned.'} Conversion totals are not combined across ad platforms.`,
  }
}

async function facebook(range: Range): Promise<SourceResult> {
  const id = required('DASHBOARD_FACEBOOK_PAGE_ID', /^\d+$/)
  const token = required('DASHBOARD_FACEBOOK_PAGE_ACCESS_TOKEN')
  const start = facebookMidnight(range.startDate)
  const nextDay = new Date(Date.parse(`${range.endDate}T00:00:00Z`) + 86400_000).toISOString().slice(0, 10)
  const end = facebookMidnight(nextDay)
  const response = await graph(graphUrl(`${id}/insights`, {
    metric: 'page_media_view,page_post_engagements', period: 'day', since: String(start), until: String(end),
  }), token)
  if (!Array.isArray(response.data)) throw new ChannelError('provider')
  const rows = list(response.data)
  const metrics: DashboardMetric[] = []
  const ending: string[] = []
  for (const [key, label] of [['page_media_view', 'Content views'], ['page_post_engagements', 'Post engagements']]) {
    const values = list(rows.find(row => row.name === key)?.values)
      .filter(value => { const date = facebookBucketDate(value.end_time); return date !== null && date >= range.startDate && date <= range.endDate })
    const total = sum(values, 'value')
    metrics.push(...metric(key, label, total, 'Sum of returned Pacific calendar-day Page insights, which may include paid content. Missing days are not assumed to be zero.'))
    ending.push(...values.flatMap(value => { const date = facebookBucketDate(value.end_time); return date ? [date] : [] }))
  }
  return {
    metrics, timeZone: facebookTimeZone,
    dataThrough: ending.sort().at(-1) ?? null,
    statusDetail: `${reportNote(range, facebookTimeZone)} ${metrics.length ? 'Daily Page totals retrieved using Pacific reporting dates.' : 'No eligible insights returned. Page size and metric permissions can affect availability.'}`,
  }
}

async function instagram(range: Range): Promise<SourceResult> {
  const id = required('DASHBOARD_INSTAGRAM_ACCOUNT_ID', /^\d+$/)
  const token = required('DASHBOARD_INSTAGRAM_ACCESS_TOKEN')
  const login = env('DASHBOARD_INSTAGRAM_LOGIN_TYPE') || 'instagram'
  if (!['instagram', 'facebook', 'unified'].includes(login)) throw new ChannelError('setup')
  const host = login === 'instagram' ? 'instagram' : 'facebook'
  const start = Math.floor(Date.parse(`${range.startDate}T00:00:00Z`) / 1000)
  const end = Math.floor(Date.parse(`${range.endDate}T00:00:00Z`) / 1000) + 86400 - 1
  const ranges: { start: number; end: number }[] = []
  for (let from = start; from <= end; from += 30 * 86400) ranges.push({ start: from, end: Math.min(end, from + 30 * 86400 - 1) })
  // Additive totals only: summing unique reach/accounts across chunks would double-count people.
  const batches = await Promise.all(ranges.map(async chunk => {
    const response = await graph(graphUrl(`${id}/insights`, {
      metric: 'views,total_interactions', metric_type: 'total_value', period: 'day', since: String(chunk.start), until: String(chunk.end),
    }, host), token)
    if (!Array.isArray(response.data)) throw new ChannelError('provider')
    return list(response.data)
  }))
  const metrics: DashboardMetric[] = []
  for (const [key, label] of [['views', 'Content views'], ['total_interactions', 'Interactions']]) {
    const values = batches.map(batch => ({ value: object(batch.find(row => row.name === key)?.total_value).value }))
    metrics.push(...metric(key, label, sum(values, 'value'), 'Sum of Instagram Insights totals over nonoverlapping date ranges. Interactions can include boosted content.'))
  }
  return {
    metrics, timeZone: 'UTC', dataThrough: null,
    statusDetail: `${reportNote(range, 'UTC')} ${metrics.length ? 'Insights retrieved. Meta does not provide a completeness timestamp for these totals.' : 'No eligible totals returned. Unavailable data is not zero.'}`,
  }
}

async function linkedInAds(range: Range): Promise<SourceResult> {
  const id = required('DASHBOARD_LINKEDIN_AD_ACCOUNT_ID', /^\d+$/)
  const token = required('DASHBOARD_LINKEDIN_ACCESS_TOKEN')
  const apiVersion = version('DASHBOARD_LINKEDIN_API_VERSION', '202610', /^20\d{2}(?:0[1-9]|1[0-2])$/)
  const headers = { authorization: `Bearer ${token}`, 'LinkedIn-Version': apiVersion, 'X-Restli-Protocol-Version': '2.0.0' }
  // Verify account access separately: LinkedIn analytics returns [] for both missing access and no activity.
  const account = object(await request(`https://api.linkedin.com/rest/adAccounts/${id}`, { headers }))
  if (String(account.id) !== id) throw new ChannelError('auth')
  const restDate = (value: string) => { const [year, month, day] = value.split('-').map(Number); return `(year:${year},month:${month},day:${day})` }
  const query = new URLSearchParams({
    q: 'analytics', pivot: 'ACCOUNT', timeGranularity: 'ALL',
    dateRange: `(start:${restDate(range.startDate)},end:${restDate(range.endDate)})`,
    accounts: `List(urn:li:sponsoredAccount:${id})`, fields: 'impressions,clicks,costInLocalCurrency,externalWebsiteConversions,dateRange',
  })
  const response = object(await request(`https://api.linkedin.com/rest/adAnalytics?${query}`, { headers }))
  if (!Array.isArray(response.elements)) throw new ChannelError('provider')
  const rows = list(response.elements)
  if (rows.length > 1) throw new ChannelError('incomplete')
  const end = object(object(rows[0]?.dateRange).end)
  const dataThrough = [end.year, end.month, end.day].every(value => Number.isInteger(value))
    ? `${end.year}-${String(end.month).padStart(2, '0')}-${String(end.day).padStart(2, '0')}` : null
  return {
    metrics: [
      ...money(sum(rows, 'costInLocalCurrency'), account.currency),
      ...metric('impressions', 'Impressions', sum(rows, 'impressions'), 'LinkedIn reported account impressions.'),
      ...metric('clicks', 'Chargeable clicks', sum(rows, 'clicks'), 'LinkedIn chargeable click definition; may differ from landing page visits.'),
      ...metric('conversions', 'Website conversions', sum(rows, 'externalWebsiteConversions'), 'LinkedIn attributed website conversions using campaign conversion settings. Not unique CRM leads.', 'decimal'),
    ],
    timeZone: 'UTC', dataThrough: validDate(dataThrough) ? dataThrough : null,
    statusDetail: `${reportNote(range, 'UTC')} ${rows.length ? 'Account reporting retrieved.' : 'Account access verified; no reporting rows returned.'}`,
  }
}

export async function loadBusinessDashboardChannels(range: Range, now = new Date()): Promise<DashboardSource[]> {
  const adapters: [ChannelId, (range: Range) => Promise<SourceResult>][] = [
    ['google-ads', googleAds], ['instagram', instagram], ['facebook', facebook], ['meta-ads', metaAds], ['linkedin-ads', linkedInAds],
  ]
  return Promise.all(adapters.map(async ([id, adapter]): Promise<DashboardSource> => {
    const source: DashboardSource = { ...definitions[id], status: 'needs-setup', statusDetail: '', checkedAt: null, dataThrough: null, metrics: [] }
    try {
      validRange(range)
      const result = await adapter(range)
      return { ...source, ...result, status: 'connected', checkedAt: now.toISOString() }
    } catch (error) {
      const kind = error instanceof ChannelError ? error.kind : 'provider'
      return {
        ...source, status: kind === 'setup' || kind === 'account-not-enabled' ? 'needs-setup' : kind === 'auth' ? 'needs-sign-in' : 'error',
        checkedAt: kind === 'setup' ? null : now.toISOString(),
        statusDetail: kind === 'setup' ? 'Complete the server connection settings to load this source.'
          : kind === 'account-not-enabled' ? 'Google Ads reports that this account is not enabled. Complete account signup in Google Ads, or reactivate the account if it was deactivated, then refresh.'
            : kind === 'auth' ? 'Reconnect this account and verify the app’s reporting permissions.'
              : kind === 'incomplete' ? 'The provider returned more data than this report can safely include. No partial total is shown.'
                : 'The provider could not complete this report. Check its connection settings and retry.',
      }
    }
  }))
}
