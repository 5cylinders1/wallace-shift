import assert from 'node:assert/strict'
import { after, beforeEach, test } from 'node:test'
import { mkdtemp, mkdir, readFile, writeFile, symlink, rm } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath, pathToFileURL } from 'node:url'
import ts from 'typescript'

const root = fileURLToPath(new URL('../', import.meta.url))
const temporary = await mkdtemp(join(tmpdir(), 'wallace-dashboard-test-'))
await symlink(join(root, 'node_modules'), join(temporary, 'node_modules'), 'dir')
const compiled = new Map()
async function compile(relative) {
  if (compiled.has(relative)) return compiled.get(relative)
  const target = join(temporary, `${relative}.mjs`); compiled.set(relative, target)
  let source = ts.transpileModule(await readFile(join(root, relative), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext, esModuleInterop: true } }).outputText
  for (const match of [...source.matchAll(/(from\s+|import\(\s*)(['"])(\.[^'"]+)\2/g)]) {
    const path = await compile(join(dirname(relative), match[3].replace(/\.js$/, '.ts')))
    source = source.replace(match[0], `${match[1]}${JSON.stringify(pathToFileURL(path).href)}`)
  }
  await mkdir(dirname(target), { recursive: true }); await writeFile(target, source); return target
}
const load = async path => import(pathToFileURL(await compile(path)).href)
const { default: handler, dashboardRange, portalDashboardSource, dashboardBrief } = await load('api/_lib/business-dashboard-handler.ts')
const { default: deployedHandler } = await load('api/demo-admin.ts')
const { hash } = await load('api/_lib/portal-auth.ts')
const { mailKey, mailHash, userKey } = await load('api/_lib/mail-store.ts')
const { loadBusinessDashboardGoogle } = await load('api/_lib/business-dashboard-google.ts')
const savedEnv = { ...process.env }, savedFetch = globalThis.fetch
const ownerToken = 'a'.repeat(64), clientToken = 'b'.repeat(64), purchaseToken = 'c'.repeat(64), mailboxToken = 'd'.repeat(64)
const ownerEmail = 'owner@example.test', mailboxEmail = 'matthew@wallaceshift.com'
const origin = 'http://localhost:5176'
const now = new Date('2026-11-13T16:00:00Z'), range = dashboardRange(7, now)
let values, requests, googleMode, realtimeReportOverride, ledgerFailure, rate, mailMessages
const gaRow = (values, dimensions = []) => ({ metricValues: values.map(value => ({ value: String(value) })), dimensionValues: dimensions.map(value => ({ value })) })
const report = (names, rows) => ({ metricHeaders: names.map(name => ({ name })), rows, metadata: { timeZone: 'America/Chicago' }, rowCount: rows.length })
const searchReport = rows => ({ rows, responseAggregationType: 'byProperty' })
function configureGoogle() {
  Object.assign(process.env, { DASHBOARD_GOOGLE_CLIENT_ID: 'client-secret-id', DASHBOARD_GOOGLE_CLIENT_SECRET: 'secret-client-value', DASHBOARD_GOOGLE_REFRESH_TOKEN: 'secret-refresh-value', DASHBOARD_GA4_PROPERTY_ID: '561794453', DASHBOARD_SEARCH_CONSOLE_SITE_URL: 'sc-domain:wallaceshift.com' })
}
beforeEach(() => {
  for (const key of Object.keys(process.env)) if (key.startsWith('DASHBOARD_')) delete process.env[key]
  Object.assign(process.env, { NODE_ENV: 'test', VERCEL_ENV: 'development', DEMO_AUDIT_REDIS_URL: 'https://dashboard-redis.example.test', DEMO_AUDIT_REDIS_TOKEN: 'secret-store-token', PORTAL_ADMIN_EMAIL: ownerEmail })
  delete process.env.VERCEL
  values = new Map(); requests = []; googleMode = 'okay'; realtimeReportOverride = undefined; ledgerFailure = false; rate = 0; mailMessages = []
  values.set(`portal:session:${hash(ownerToken)}`, JSON.stringify({ email: ownerEmail }))
  values.set(`portal:session:${hash(clientToken)}`, JSON.stringify({ email: 'client@example.test' }))
  values.set(`portal:session:${hash(purchaseToken)}`, JSON.stringify({ email: ownerEmail, engagementId: 'purchase' }))
  values.set(mailKey(`session:${mailHash(mailboxToken)}`), JSON.stringify({ email: mailboxEmail, origin }))
  globalThis.fetch = async (url, init = {}) => {
    requests.push({ url: String(url), init })
    if (url === 'https://dashboard-redis.example.test') {
      const command = JSON.parse(init.body)
      if (command[0] === 'GET') {
        if (ledgerFailure && command[1] === 'portal:engagements') return Response.json({ error: 'secret failure body' }, { status: 503 })
        return Response.json({ result: values.get(command[1]) ?? null })
      }
      if (command[0] === 'EVAL') return Response.json({ result: ++rate })
      if (command[0] === 'ZREVRANGE') return Response.json({ result: mailMessages.map(message => message.id) })
      if (command[0] === 'MGET') return Response.json({ result: command.slice(1).map(key => values.get(key) ?? null) })
      throw new Error(`Unexpected operation ${command[0]}`)
    }
    assert.equal(init.redirect, 'error')
    if (url === 'https://oauth2.googleapis.com/token') {
      if (googleMode === 'token-error') return Response.json({ error_description: 'secret-refresh-value' }, { status: 400 })
      return Response.json({ access_token: 'secret-access-value' })
    }
    assert.equal(init.headers.authorization, 'Bearer secret-access-value')
    const body = JSON.parse(init.body)
    if (String(url).includes('analyticsdata.googleapis.com')) {
      if (googleMode === 'malformed-ga') return Response.json({})
      if (String(url).endsWith(':runRealtimeReport')) {
        assert.deepEqual(body.minuteRanges, [{ startMinutesAgo: 29, endMinutesAgo: 0 }])
        assert.equal(body.dateRanges, undefined)
        if (googleMode === 'realtime-error') return Response.json({ error: 'secret-access-value' }, { status: 429 })
        if (realtimeReportOverride !== undefined) return Response.json(realtimeReportOverride)
        return Response.json(report(['activeUsers'], [gaRow([3])]))
      }
      if (googleMode === 'empty') return Response.json(report(body.metrics.map(item => item.name), []))
      if (body.dimensions?.[0]?.name === 'date') return Response.json(report(['sessions'], [gaRow([11], ['20261112']), gaRow([9], ['20261110'])]))
      if (body.dimensions?.[0]?.name === 'pagePath') return Response.json(report(['screenPageViews'], [gaRow([17], ['/services'])]))
      return Response.json(report(['activeUsers', 'sessions', 'screenPageViews', 'keyEvents'], [gaRow([20, 24, 35, 2])]))
    }
    if (String(url).includes('googleapis.com/webmasters/')) {
      assert.ok(String(url).includes('sc-domain%3Awallaceshift.com'))
      assert.equal(body.dataState, 'final')
      if (googleMode === 'malformed-search') return Response.json({})
      if (googleMode === 'empty') return Response.json({ responseAggregationType: 'byProperty' })
      const metrics = { clicks: 8, impressions: 200, ctr: 0.04, position: 12.7 }
      return Response.json(searchReport([{ ...metrics, keys: body.dimensions[0] === 'date' ? ['2026-11-10'] : body.dimensions[0] === 'query' ? ['business systems kansas city'] : [] }]))
    }
    throw new Error(`Unexpected provider ${url}`)
  }
})
after(async () => { globalThis.fetch = savedFetch; for (const key of Object.keys(process.env)) if (!(key in savedEnv)) delete process.env[key]; Object.assign(process.env, savedEnv); await rm(temporary, { recursive: true, force: true }) })
async function call({ token = ownerToken, method = 'GET', url = '/api/business-dashboard', headers = {}, query, dispatch = handler } = {}) {
  const req = { url, method, socket: { remoteAddress: '127.0.0.1' }, headers: { host: 'localhost:5176', cookie: `wallace_client_session=${token}`, ...headers }, query }
  const response = { headers: {}, statusCode: 200, setHeader(key, value) { this.headers[key.toLowerCase()] = value }, end(value) { this.body = JSON.parse(value) } }
  await dispatch(req, response); return response
}
test('owner authorization precedes any reporting reads; purchase grants never become owner grants', async () => {
  configureGoogle()
  for (const [token, expected] of [['', 401], [clientToken, 403], [purchaseToken, 403]]) {
    requests.length = 0
    const response = await call({ token })
    assert.equal(response.statusCode, expected)
    assert.ok(requests.every(request => request.url === 'https://dashboard-redis.example.test' && JSON.parse(request.init.body)[1].includes('session:')))
    assert.match(response.headers['cache-control'], /no-store/)
    assert.equal(response.headers['vercel-cdn-cache-control'], 'no-store')
  }
})
test('only GET and same-site known origins are accepted', async () => {
  assert.equal((await call({ method: 'POST' })).statusCode, 405)
  assert.equal((await call({ headers: { 'sec-fetch-site': 'cross-site' } })).statusCode, 403)
  assert.equal((await call({ headers: { host: 'evil.example.test' } })).statusCode, 403)
  assert.equal(requests.length, 0)
})
test('date ranges use complete Chicago calendar days across DST and reject ambiguous ranges', async () => {
  assert.deepEqual(range, { days: 7, startDate: '2026-11-06', endDate: '2026-11-12', timeZone: 'America/Chicago' })
  assert.deepEqual(dashboardRange(7, new Date('2026-11-02T04:30:00Z')), { days: 7, startDate: '2026-10-25', endDate: '2026-10-31', timeZone: 'America/Chicago' })
  for (const url of ['/api/business-dashboard?days=0', '/api/business-dashboard?days=7&days=30', '/api/business-dashboard?days=7.0', '/api/business-dashboard?days=365']) assert.equal((await call({ url })).statusCode, 400)
  assert.equal((await call({ query: { days: ['7', '30'] } })).statusCode, 400)
  const response = await call({ url: '/api/demo-admin', query: { dashboard: 'business', days: '90' }, dispatch: deployedHandler })
  assert.equal(response.statusCode, 200); assert.equal(response.body.snapshot.range.days, 90)
})
test('missing setup never invents data and catalog contains only requested business systems', async () => {
  const response = await call()
  assert.equal(response.statusCode, 200)
  const snapshot = response.body.snapshot
  assert.deepEqual(snapshot.sources.map(source => source.id).sort(), ['portal', 'ga4', 'search-console', 'mail', 'google-ads', 'meta-ads', 'facebook', 'instagram', 'linkedin-ads'].sort())
  assert.equal(snapshot.sources.find(source => source.id === 'portal').status, 'connected')
  assert.equal(snapshot.sources.find(source => source.id === 'mail').status, 'needs-sign-in')
  for (const source of snapshot.sources.filter(source => !['mail', 'portal'].includes(source.id))) { assert.equal(source.status, 'needs-setup'); assert.deepEqual(source.metrics, []) }
  assert.equal(snapshot.agentPolicy.executionEnabled, false)
  assert.equal(snapshot.agentPolicy.summaryMethod, 'rules')
  assert.equal(snapshot.environment, 'development')
  assert.ok(requests.every(request => request.url === 'https://dashboard-redis.example.test'))
})
test('portal summaries exclude draft invoices, retain archived receipts, and distinguish period payments from current balances', () => {
  const invoice = { id: 'paid', amount: 10000, fee: 300, refunded: 2000, status: 'paid', paidAt: '2026-11-10T20:00:00Z', due: '2026-11-01' }
  const source = portalDashboardSource([
    { state: 'issued', invoices: [invoice, { id: 'open', amount: 7000, fee: 0, status: 'open', due: '2026-11-01' }] },
    { state: 'complete', archivedAt: '2026-11-01', invoices: [{ ...invoice, amount: 2000, fee: 0, refunded: 0 }] },
    { state: 'draft', invoices: [{ ...invoice, amount: 900000 }] },
    { state: 'complete', invoices: [{ ...invoice, paidAt: '2026-10-10T20:00:00Z' }] },
  ], range, now)
  const metric = id => source.metrics.find(metric => metric.id === id).value
  assert.equal(metric('collected'), 103)
  assert.equal(metric('outstanding'), 70)
  assert.equal(metric('overdueInvoices'), 1)
  assert.equal(metric('activeEngagements'), 1)
  assert.equal(dashboardBrief([source])[0].id, 'past-due')
  assert.ok(!JSON.stringify(source).includes('paidAt'))
})
test('Google reporting parses totals, page/query tables and an independent last-30-minute live count', async () => {
  configureGoogle()
  const [ga, search] = await loadBusinessDashboardGoogle(range, now)
  assert.equal(ga.status, 'connected'); assert.equal(search.status, 'connected')
  assert.equal(ga.metrics.find(metric => metric.id === 'sessions').value, 24)
  assert.equal(ga.metrics.find(metric => metric.id === 'realtimeUsers').value, 3)
  assert.equal(ga.dataThrough, '2026-11-12')
  assert.deepEqual(ga.series.points.map(point => point.date), ['2026-11-10', '2026-11-12'])
  assert.equal(ga.table.rows[0].page, '/services')
  assert.equal(search.metrics.find(metric => metric.id === 'ctr').value, 4)
  assert.equal(search.metrics.find(metric => metric.id === 'position').value, 12.7)
  assert.equal(search.timeZone, 'America/Los_Angeles')
  assert.equal(search.table.rows[0].query, 'business systems kansas city')
  assert.equal(requests.filter(request => request.url === 'https://oauth2.googleapis.com/token').length, 1)
  assert.ok(!JSON.stringify([ga, search]).includes('secret-'))
})
test('a failed realtime report preserves verified historical data without a fabricated zero live count', async () => {
  configureGoogle(); googleMode = 'realtime-error'
  const [ga] = await loadBusinessDashboardGoogle(range, now)
  assert.equal(ga.status, 'connected')
  assert.ok(!ga.metrics.some(metric => metric.id === 'realtimeUsers'))
  assert.match(ga.statusDetail, /unavailable: live visitor count/)
})
test('Google kind-only empty realtime reports show zero without losing historical metrics', async () => {
  configureGoogle(); realtimeReportOverride = { kind: 'analyticsData#runRealtimeReport' }
  const [ga] = await loadBusinessDashboardGoogle(range, now)
  assert.equal(ga.status, 'connected')
  assert.equal(ga.metrics.find(metric => metric.id === 'realtimeUsers').value, 0)
  assert.equal(ga.metrics.find(metric => metric.id === 'sessions').value, 24)
  assert.doesNotMatch(ga.statusDetail, /unavailable/)
})
test('malformed realtime successes remain unavailable instead of becoming zero', async () => {
  configureGoogle()
  const kind = 'analyticsData#runRealtimeReport'
  for (const response of [
    {},
    { kind: 'analyticsData#runReport' },
    { ...report(['activeUsers'], [gaRow([3])]), kind: 'analyticsData#runReport' },
    { kind, rowCount: 3 },
    { kind, rows: [gaRow([3])] },
    { kind, metricHeaders: {}, rows: [] },
    { kind, metricHeaders: [], rows: [] },
    { kind, metricHeaders: [{ name: 123 }], rows: [] },
    { kind, metricHeaders: [{ name: 'activeUsers' }], rows: {} },
    { kind, metricHeaders: [{ name: 'activeUsers' }], rows: [gaRow(['invalid'])] },
  ]) {
    realtimeReportOverride = response
    const [ga] = await loadBusinessDashboardGoogle(range, now)
    assert.equal(ga.status, 'connected')
    assert.equal(ga.metrics.find(metric => metric.id === 'sessions').value, 24)
    assert.ok(!ga.metrics.some(metric => metric.id === 'realtimeUsers'), JSON.stringify(response))
    assert.match(ga.statusDetail, /unavailable: live visitor count/)
  }
})
test('valid empty provider reports return zero totals; malformed successes are unavailable', async () => {
  configureGoogle(); googleMode = 'empty'
  let [ga, search] = await loadBusinessDashboardGoogle(range, now)
  assert.equal(ga.status, 'connected'); assert.equal(search.status, 'connected')
  assert.equal(ga.metrics.find(metric => metric.id === 'sessions').value, 0)
  assert.equal(search.metrics.find(metric => metric.id === 'clicks').value, 0)
  assert.ok(!search.metrics.some(metric => metric.id === 'position'))
  googleMode = 'malformed-ga'; [ga, search] = await loadBusinessDashboardGoogle(range, now)
  assert.equal(ga.status, 'error'); assert.deepEqual(ga.metrics, []); assert.equal(search.status, 'connected')
  googleMode = 'malformed-search'; [ga, search] = await loadBusinessDashboardGoogle(range, now)
  assert.equal(search.status, 'error'); assert.deepEqual(search.metrics, []); assert.equal(ga.status, 'connected')
})
test('OAuth and independent source failures are isolated and secret response details are discarded', async () => {
  configureGoogle(); googleMode = 'token-error'; ledgerFailure = true
  const response = await call()
  assert.equal(response.statusCode, 200)
  for (const id of ['portal', 'ga4', 'search-console']) assert.equal(response.body.snapshot.sources.find(source => source.id === id).status, 'error')
  assert.equal(response.body.snapshot.sources.find(source => source.id === 'instagram').status, 'needs-setup')
  assert.ok(!JSON.stringify(response.body).includes('secret-'))
})
test('mail reads require its separate session and aggregate only retained records without content leakage', async () => {
  const date = dashboardRange(30).endDate
  mailMessages = [
    { id: 'one', createdAt: `${date}T18:00:00Z`, status: 'sent', subject: 'private subject', html: 'private body', to: ['private@example.test'] },
    { id: 'two', createdAt: `${date}T18:00:00Z`, status: 'review', subject: 'private subject' },
    { id: 'three', createdAt: '2000-01-01T18:00:00Z', status: 'sent' },
  ]
  for (const message of mailMessages) values.set(userKey(mailboxEmail, `message:${message.id}`), JSON.stringify(message))
  let response = await call()
  assert.equal(response.body.snapshot.sources.find(source => source.id === 'mail').status, 'needs-sign-in')
  assert.ok(!requests.some(request => JSON.parse(request.init.body)[0] === 'MGET'))
  response = await call({ headers: { cookie: `wallace_client_session=${ownerToken}; wallace_mail_session=${mailboxToken}` } })
  const mail = response.body.snapshot.sources.find(source => source.id === 'mail')
  assert.equal(mail.status, 'connected')
  assert.equal(mail.metrics.find(metric => metric.id === 'sent').value, 1)
  assert.equal(mail.metrics.find(metric => metric.id === 'needsReview').value, 1)
  assert.match(mail.freshness, /50 records/)
  assert.ok(!JSON.stringify(response.body).includes('private'))
})
test('owner request rate is bounded before external reports start', async () => {
  configureGoogle(); rate = 12
  const response = await call()
  assert.equal(response.statusCode, 429); assert.equal(response.headers['retry-after'], '60')
  assert.ok(requests.every(request => request.url === 'https://dashboard-redis.example.test'))
})
