import assert from 'node:assert/strict'
import { after, beforeEach, test } from 'node:test'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'

const source = await readFile(new URL('../api/_lib/business-dashboard-channels.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext } }).outputText
const { loadBusinessDashboardChannels } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)
const savedEnv = { ...process.env }, savedFetch = globalThis.fetch
const range = { days: 7, startDate: '2026-11-06', endDate: '2026-11-12', timeZone: 'America/Chicago' }
const now = new Date('2026-11-13T15:00:00Z')
let calls
const response = body => new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } })
const find = (sources, id) => sources.find(item => item.id === id)

beforeEach(() => {
  for (const key of Object.keys(process.env)) if (key.startsWith('DASHBOARD_')) delete process.env[key]
  calls = []
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), init })
    throw new Error('Unexpected upstream request')
  }
})
after(() => { process.env = savedEnv; globalThis.fetch = savedFetch })

test('unconfigured channels make no calls and never invent metrics', async () => {
  const sources = await loadBusinessDashboardChannels(range, now)
  assert.equal(sources.length, 5)
  assert.ok(sources.every(item => item.status === 'needs-setup' && item.checkedAt === null && item.metrics.length === 0))
  assert.equal(calls.length, 0)
})

test('Google Ads reporting uses fixed read endpoints, correct account currency and daily values', async () => {
  Object.assign(process.env, { DASHBOARD_GOOGLE_ADS_ACCESS_TOKEN: 'secret-google', DASHBOARD_GOOGLE_ADS_CUSTOMER_ID: '1234567890' })
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init })
    assert.equal(String(url), 'https://googleads.googleapis.com/v26/customers/1234567890/googleAds:search')
    assert.equal(init.redirect, 'error')
    assert.equal(init.headers.authorization, 'Bearer secret-google')
    const { query } = JSON.parse(init.body)
    return response(query.includes('currency_code') ? { results: [{ customer: { id: '1234567890', currencyCode: 'EUR', timeZone: 'Europe/Paris' } }] } : {
      results: [
        { segments: { date: '2026-11-06' }, metrics: { impressions: '100', clicks: '5', costMicros: '2000000', conversions: 1.5 } },
        { segments: { date: '2026-11-12' }, metrics: { impressions: '200', clicks: '10', costMicros: '3000000', conversions: 2 } },
      ],
    })
  }
  const result = find(await loadBusinessDashboardChannels(range, now), 'google-ads')
  assert.equal(result.status, 'connected')
  assert.equal(result.timeZone, 'Europe/Paris')
  assert.equal(result.dataThrough, '2026-11-12')
  assert.deepEqual(result.metrics.map(item => item.value), [5, 300, 15, 3.5])
  assert.equal(result.metrics[0].format, 'decimal')
  assert.match(result.metrics[0].label, /EUR/)
  assert.equal(result.series.points.length, 2)
  assert.equal(JSON.stringify(result).includes('secret-google'), false)
})

test('Google Ads refresh flow stays server-side and reports missing fields as unavailable', async () => {
  Object.assign(process.env, { DASHBOARD_GOOGLE_ADS_CLIENT_ID: 'test-client', DASHBOARD_GOOGLE_ADS_CLIENT_SECRET: 'client-secret', DASHBOARD_GOOGLE_ADS_REFRESH_TOKEN: 'refresh-secret', DASHBOARD_GOOGLE_ADS_CUSTOMER_ID: '1234567890' })
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init })
    if (String(url) === 'https://oauth2.googleapis.com/token') {
      assert.equal(init.body.get('grant_type'), 'refresh_token')
      return response({ access_token: 'new-token' })
    }
    assert.equal(init.headers.authorization, 'Bearer new-token')
    return response(JSON.parse(init.body).query.includes('currency_code')
      ? { results: [{ customer: { id: '1234567890', currencyCode: 'USD', timeZone: 'America/Chicago' } }] }
      : { results: [{ segments: { date: '2026-11-12' }, metrics: { clicks: '0' } }] })
  }
  const result = find(await loadBusinessDashboardChannels(range, now), 'google-ads')
  assert.deepEqual(result.metrics.map(item => [item.id, item.value]), [['clicks', 0]])
  assert.equal(calls.length, 3)
})

test('Google Ads disabled accounts show setup guidance without leaking credentials or provider details', async () => {
  Object.assign(process.env, { DASHBOARD_GOOGLE_ADS_CLIENT_ID: 'private-client', DASHBOARD_GOOGLE_ADS_CLIENT_SECRET: 'private-secret', DASHBOARD_GOOGLE_ADS_REFRESH_TOKEN: 'private-refresh', DASHBOARD_GOOGLE_ADS_CUSTOMER_ID: '1234567890' })
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init })
    if (String(url) === 'https://oauth2.googleapis.com/token') return response({ access_token: 'private-access' })
    assert.equal(init.headers.authorization, 'Bearer private-access')
    if (!JSON.parse(init.body).query.includes('currency_code')) return response({ results: [] })
    return new Response(JSON.stringify({ error: {
      code: 403, message: 'private-client private-secret private-refresh private-access account 1234567890',
      details: [{
        '@type': 'type.googleapis.com/google.ads.googleads.v26.errors.GoogleAdsFailure',
        requestId: 'private-request-id',
        errors: [{ errorCode: { authorizationError: 'CUSTOMER_NOT_ENABLED' }, message: 'private-provider-message', trigger: { stringValue: 'private-trigger' } }],
      }],
    } }), { status: 403 })
  }
  const results = await loadBusinessDashboardChannels(range, now)
  const result = find(results, 'google-ads')
  assert.equal(result.status, 'needs-setup')
  assert.equal(result.checkedAt, now.toISOString())
  assert.equal(result.dataThrough, null)
  assert.deepEqual(result.metrics, [])
  assert.equal(result.statusDetail, 'Google Ads reports that this account is not enabled. Complete account signup in Google Ads, or reactivate the account if it was deactivated, then refresh.')
  assert.equal(results.filter(item => item.checkedAt !== null).length, 1)
  assert.equal(calls.length, 3)
  const serialized = JSON.stringify(results)
  for (const value of ['private-client', 'private-secret', 'private-refresh', 'private-access', '1234567890', 'private-request-id', 'private-provider-message', 'private-trigger', 'CUSTOMER_NOT_ENABLED']) {
    assert.equal(serialized.includes(value), false)
  }
})

test('Google Ads only classifies the structured disabled-account enum and retains generic auth failures', async () => {
  Object.assign(process.env, { DASHBOARD_GOOGLE_ADS_ACCESS_TOKEN: 'private-access', DASHBOARD_GOOGLE_ADS_CUSTOMER_ID: '1234567890' })
  const bodies = [
    JSON.stringify({ error: { message: 'CUSTOMER_NOT_ENABLED private-access', details: [{ errors: [{ errorCode: { authorizationError: 'USER_PERMISSION_DENIED' } }] }] } }),
    JSON.stringify({ error: { details: [{ errors: [{ message: 'CUSTOMER_NOT_ENABLED private-access' }] }] } }),
    'malformed private-access CUSTOMER_NOT_ENABLED',
  ]
  for (const body of bodies) {
    globalThis.fetch = async () => new Response(body, { status: 403 })
    const result = find(await loadBusinessDashboardChannels(range, now), 'google-ads')
    assert.equal(result.status, 'needs-sign-in')
    assert.equal(result.statusDetail, 'Reconnect this account and verify the app’s reporting permissions.')
    assert.deepEqual(result.metrics, [])
    assert.equal(JSON.stringify(result).includes('private-access'), false)
  }
})

test('Meta ads has account-level totals without conflating link clicks and leads', async () => {
  Object.assign(process.env, { DASHBOARD_META_AD_ACCOUNT_ID: 'act_123', DASHBOARD_META_ADS_ACCESS_TOKEN: 'secret-meta' })
  globalThis.fetch = async (url, init) => {
    const parsed = new URL(url)
    calls.push({ url: String(url), init })
    assert.equal(parsed.origin, 'https://graph.facebook.com')
    assert.equal(parsed.searchParams.has('access_token'), false)
    assert.equal(init.headers.authorization, 'Bearer secret-meta')
    if (parsed.pathname.endsWith('/insights')) {
      assert.equal(parsed.searchParams.get('level'), 'account')
      assert.deepEqual(JSON.parse(parsed.searchParams.get('time_range')), { since: range.startDate, until: range.endDate })
      return response({ data: [{ spend: '12.50', impressions: '100', clicks: '9', inline_link_clicks: '4', date_stop: '2026-11-12' }] })
    }
    return response({ id: 'act_123', currency: 'USD', timezone_name: 'America/Chicago' })
  }
  const result = find(await loadBusinessDashboardChannels(range, now), 'meta-ads')
  assert.equal(result.status, 'connected')
  assert.deepEqual(result.metrics.map(item => item.value), [12.5, 100, 9, 4])
  assert.ok(result.metrics.every(item => !/conversion|lead/i.test(item.label)))
})

test('Instagram 90-day ranges use nonoverlapping additive totals and never add unique reach', async () => {
  Object.assign(process.env, { DASHBOARD_INSTAGRAM_ACCOUNT_ID: '123', DASHBOARD_INSTAGRAM_ACCESS_TOKEN: 'secret-ig' })
  const longRange = { ...range, days: 90, startDate: '2026-08-15' }
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init })
    const parsed = new URL(url)
    assert.equal(parsed.origin, 'https://graph.instagram.com')
    assert.equal(parsed.searchParams.get('metric'), 'views,total_interactions')
    assert.equal(parsed.searchParams.get('metric_type'), 'total_value')
    return response({ data: [{ name: 'views', total_value: { value: 10 } }, { name: 'total_interactions', total_value: { value: 2 } }] })
  }
  const result = find(await loadBusinessDashboardChannels(longRange, now), 'instagram')
  assert.equal(calls.length, 3)
  const chunks = calls.map(call => new URL(call.url)).sort((a, b) => Number(a.searchParams.get('since')) - Number(b.searchParams.get('since')))
  assert.equal(Number(chunks[0].searchParams.get('until')) + 1, Number(chunks[1].searchParams.get('since')))
  assert.deepEqual(result.metrics.map(item => item.value), [30, 6])
  assert.equal(result.dataThrough, null)
})

test('Instagram unavailable metrics stay absent even if other chunks return values', async () => {
  Object.assign(process.env, { DASHBOARD_INSTAGRAM_ACCOUNT_ID: '123', DASHBOARD_INSTAGRAM_ACCESS_TOKEN: 'secret-ig' })
  let count = 0
  globalThis.fetch = async () => response({ data: ++count === 1 ? [{ name: 'views', total_value: { value: 10 } }] : [] })
  const result = find(await loadBusinessDashboardChannels({ ...range, days: 90, startDate: '2026-08-15' }, now), 'instagram')
  assert.equal(result.status, 'connected')
  assert.deepEqual(result.metrics, [])
})

test('Instagram Unified Login and legacy Facebook Login use Facebook Graph with bearer tokens', async () => {
  Object.assign(process.env, { DASHBOARD_INSTAGRAM_ACCOUNT_ID: '123', DASHBOARD_INSTAGRAM_ACCESS_TOKEN: 'secret-bisu' })
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init })
    const parsed = new URL(url)
    assert.equal(parsed.origin, 'https://graph.facebook.com')
    assert.equal(parsed.pathname, '/v27.0/123/insights')
    assert.equal(parsed.searchParams.get('metric'), 'views,total_interactions')
    assert.equal(parsed.searchParams.get('metric_type'), 'total_value')
    assert.equal(parsed.searchParams.has('access_token'), false)
    assert.equal(init.headers.authorization, 'Bearer secret-bisu')
    return response({ data: [{ name: 'views', total_value: { value: 10 } }, { name: 'total_interactions', total_value: { value: 2 } }] })
  }
  for (const login of ['unified', 'facebook']) {
    process.env.DASHBOARD_INSTAGRAM_LOGIN_TYPE = login
    const result = find(await loadBusinessDashboardChannels(range, now), 'instagram')
    assert.equal(result.status, 'connected')
    assert.deepEqual(result.metrics.map(item => item.value), [10, 2])
    assert.equal(JSON.stringify(result).includes('secret-bisu'), false)
  }
  assert.equal(calls.length, 2)
})

test('Facebook includes the last Pacific reporting day ending at 08:00Z the next day', async () => {
  Object.assign(process.env, { DASHBOARD_FACEBOOK_PAGE_ID: '123', DASHBOARD_FACEBOOK_PAGE_ACCESS_TOKEN: 'secret-page' })
  globalThis.fetch = async url => {
    const params = new URL(url).searchParams
    assert.equal(Number(params.get('since')), Date.parse('2026-11-06T08:00:00Z') / 1000)
    assert.equal(Number(params.get('until')), Date.parse('2026-11-13T08:00:00Z') / 1000)
    return response({ data: [
      { name: 'page_media_view', values: [{ value: 900, end_time: '2026-11-06T08:00:00+0000' }, { value: 10, end_time: '2026-11-07T08:00:00+0000' }, { value: 20, end_time: '2026-11-13T08:00:00+0000' }, { value: 900, end_time: '2026-11-14T08:00:00+0000' }] },
      { name: 'page_post_engagements', values: [] },
    ] })
  }
  const result = find(await loadBusinessDashboardChannels(range, now), 'facebook')
  assert.equal(result.status, 'connected')
  assert.deepEqual(result.metrics.map(item => item.value), [30])
  assert.equal(result.dataThrough, '2026-11-12')
  assert.equal(result.timeZone, 'America/Los_Angeles')
  assert.match(result.metrics[0].note, /Missing days/)
})

test('Facebook Pacific date selection survives DST fall-back without shifting or losing a day', async () => {
  Object.assign(process.env, { DASHBOARD_FACEBOOK_PAGE_ID: '123', DASHBOARD_FACEBOOK_PAGE_ACCESS_TOKEN: 'secret-page' })
  const dstRange = { ...range, startDate: '2026-10-28', endDate: '2026-11-03' }
  globalThis.fetch = async url => {
    const params = new URL(url).searchParams
    assert.equal(Number(params.get('since')), Date.parse('2026-10-28T07:00:00Z') / 1000)
    assert.equal(Number(params.get('until')), Date.parse('2026-11-04T08:00:00Z') / 1000)
    return response({ data: [{ name: 'page_media_view', values: [
      { value: 999, end_time: '2026-10-28T07:00:00+0000' },
      { value: 1, end_time: '2026-10-29T07:00:00+0000' },
      { value: 2, end_time: '2026-10-30T07:00:00+0000' },
      { value: 3, end_time: '2026-10-31T07:00:00+0000' },
      { value: 4, end_time: '2026-11-01T07:00:00+0000' },
      { value: 5, end_time: '2026-11-02T08:00:00+0000' },
      { value: 6, end_time: '2026-11-03T08:00:00+0000' },
      { value: 7, end_time: '2026-11-04T08:00:00+0000' },
      { value: 999, end_time: '2026-11-05T08:00:00+0000' },
    ] }] })
  }
  const result = find(await loadBusinessDashboardChannels(dstRange, now), 'facebook')
  assert.deepEqual(result.metrics.map(item => item.value), [28])
  assert.equal(result.dataThrough, '2026-11-03')
})

test('LinkedIn validates account access, preserves API version and uses UTC reporting', async () => {
  Object.assign(process.env, { DASHBOARD_LINKEDIN_AD_ACCOUNT_ID: '123', DASHBOARD_LINKEDIN_ACCESS_TOKEN: 'secret-li' })
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init })
    const parsed = new URL(url)
    assert.equal(parsed.origin, 'https://api.linkedin.com')
    assert.equal(init.headers['LinkedIn-Version'], '202610')
    if (parsed.pathname.endsWith('/123')) return response({ id: 123, currency: 'GBP' })
    assert.equal(parsed.searchParams.get('accounts'), 'List(urn:li:sponsoredAccount:123)')
    return response({ elements: [{ impressions: 100, clicks: 10, costInLocalCurrency: '9.25', externalWebsiteConversions: 2, dateRange: { end: { year: 2026, month: 11, day: 12 } } }] })
  }
  const result = find(await loadBusinessDashboardChannels(range, now), 'linkedin-ads')
  assert.equal(result.status, 'connected')
  assert.equal(result.timeZone, 'UTC')
  assert.match(result.metrics[0].label, /GBP/)
  assert.equal(result.metrics[0].format, 'decimal')
  assert.equal(result.dataThrough, '2026-11-12')
  assert.equal(calls.length, 2)
})

test('upstream errors cannot leak bodies or secrets and fail only the affected source', async () => {
  Object.assign(process.env, { DASHBOARD_LINKEDIN_AD_ACCOUNT_ID: '123', DASHBOARD_LINKEDIN_ACCESS_TOKEN: 'secret-li' })
  globalThis.fetch = async () => new Response('secret-li and private provider response', { status: 403 })
  const results = await loadBusinessDashboardChannels(range, now)
  const result = find(results, 'linkedin-ads')
  assert.equal(result.status, 'needs-sign-in')
  assert.deepEqual(result.metrics, [])
  assert.equal(results.filter(item => item.status === 'needs-setup').length, 4)
  assert.equal(JSON.stringify(results).includes('secret-li'), false)
})

test('configuration and query injection attempts do not reach a provider', async () => {
  Object.assign(process.env, { DASHBOARD_GOOGLE_ADS_CUSTOMER_ID: '../../evil', DASHBOARD_GOOGLE_ADS_ACCESS_TOKEN: 'token', DASHBOARD_INSTAGRAM_ACCOUNT_ID: '123', DASHBOARD_INSTAGRAM_ACCESS_TOKEN: 'token', DASHBOARD_INSTAGRAM_LOGIN_TYPE: 'evil.example' })
  const sources = await loadBusinessDashboardChannels(range, now)
  assert.ok(sources.every(item => item.status === 'needs-setup'))
  assert.equal(calls.length, 0)
  const invalidRange = await loadBusinessDashboardChannels({ ...range, startDate: "2026-01-01' OR 1=1" }, now)
  assert.ok(invalidRange.every(item => item.status === 'needs-setup'))
  assert.equal(calls.length, 0)
})

test('unexpected Meta pagination is rejected instead of returning an incomplete total', async () => {
  Object.assign(process.env, { DASHBOARD_META_AD_ACCOUNT_ID: '123', DASHBOARD_META_ADS_ACCESS_TOKEN: 'secret-meta' })
  globalThis.fetch = async url => response(String(url).includes('/insights')
    ? { data: [{ spend: '12' }], paging: { next: 'https://evil.example/secret' } }
    : { id: 'act_123', currency: 'USD' })
  const result = find(await loadBusinessDashboardChannels(range, now), 'meta-ads')
  assert.equal(result.status, 'error')
  assert.deepEqual(result.metrics, [])
  assert.match(result.statusDetail, /partial total/)
})
