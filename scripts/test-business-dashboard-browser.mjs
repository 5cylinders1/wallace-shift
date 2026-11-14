import assert from 'node:assert/strict'
import { mkdir, readFile } from 'node:fs/promises'
import { playwright } from '../videos/contractor-previews/runtime.mjs'

const base = process.env.DASHBOARD_TEST_URL ?? 'http://127.0.0.1:5184'
const output = '/tmp/wallace-business-dashboard-review'
await mkdir(output, { recursive: true })
const { chromium } = await playwright()
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 1080 } })
const errors = [], requests = []
page.on('pageerror', error => errors.push(error.message))
const time = '2026-11-13T16:00:00.000Z'
const definitions = [
  ['portal', 'Wallace Shift client portal', 'operations'], ['ga4', 'Google Analytics', 'website'],
  ['search-console', 'Google Search Console', 'seo'], ['mail', 'Wallace Shift Mail', 'email'],
  ['google-ads', 'Google Ads', 'advertising'], ['instagram', 'Instagram', 'social'],
  ['facebook', 'Facebook', 'social'], ['meta-ads', 'Meta Ads', 'advertising'], ['linkedin-ads', 'LinkedIn Ads', 'advertising'],
]
function snapshot(days) {
  const sources = definitions.map(([id, name, category]) => ({
    id, name, category, description: 'Sample fixture for browser verification only.',
    status: ['portal', 'ga4', 'search-console'].includes(id) ? 'connected' : id === 'mail' ? 'needs-sign-in' : 'needs-setup',
    statusDetail: id === 'ga4' ? 'Sample reporting retrieved. Currently unavailable: live visitor count.' : 'Sample connection state for browser verification.',
    freshness: 'Test fixture. Not real business data.', checkedAt: time, dataThrough: '2026-11-12', timeZone: 'America/Chicago',
    metrics: [], setup: { steps: ['Sample setup instruction. Do not enter real credentials in this test.'], docsUrl: 'https://example.test/documentation' },
  }))
  sources[0].metrics = [
    { id: 'collected', label: 'Recorded payments', value: 1250, format: 'currency', note: 'Sample paid total for testing only.' },
    { id: 'outstanding', label: 'Outstanding invoices', value: 500, format: 'currency', note: 'Sample current balance.' },
    { id: 'activeEngagements', label: 'Active agreements', value: 2, format: 'number', note: 'Sample agreement count.' },
  ]
  sources[1].metrics = [{ id: 'sessions', label: 'Sessions', value: 42, format: 'number', note: 'Sample selected-period traffic.' }]
  sources[1].series = { label: 'Sessions', points: [{ date: '2026-11-10', value: 1 }, { date: '2026-11-12', value: 42 }] }
  sources[1].table = { title: 'Top pages', columns: [{ key: 'page', label: 'Page' }, { key: 'views', label: 'Views', format: 'number' }], rows: [{ page: '/sample-page', views: 42 }] }
  sources[2].metrics = [{ id: 'clicks', label: 'Search clicks', value: 12, format: 'number', note: 'Sample search report.' }]
  sources[2].table = { title: 'Top search queries', columns: [{ key: 'query', label: 'Search query' }, { key: 'position', label: 'Avg. position', format: 'decimal' }], rows: [{ query: 'sample search query', position: 8.5 }] }
  return {
    schemaVersion: 1, generatedAt: time, environment: 'development',
    range: { days, startDate: days === 7 ? '2026-11-06' : days === 90 ? '2026-08-15' : '2026-10-14', endDate: '2026-11-12', timeZone: 'America/Chicago' },
    sources, brief: [{ id: 'sample', title: 'Sample observation', detail: 'Browser test evidence only. No messages or actions were sent.', sourceIds: ['portal'], severity: 'attention' }],
    agentPolicy: { mode: 'read-only', executionEnabled: false, summaryMethod: 'rules', allowed: ['Read this sample snapshot'], requiresApproval: ['Send messages', 'Change advertising budgets'], note: 'No AI model or autonomous executor is connected.' },
  }
}
let owner = true, responseMode = 'ok'
await page.route('**/*', async route => {
  const request = route.request(), url = new URL(request.url())
  if (url.origin !== new URL(base).origin) return route.abort()
  if (url.pathname === '/api/client-portal') {
    assert.equal(request.method(), 'GET', 'Browser verification must not mutate portal records')
    return route.fulfill({ json: { ok: true, authenticated: true, admin: owner, email: 'sample-owner@example.test', engagements: [] } })
  }
  if (url.pathname === '/api/business-dashboard') {
    assert.equal(request.method(), 'GET')
    requests.push(url.searchParams.get('days'))
    if (responseMode === 'error') return route.fulfill({ status: 503, json: { ok: false, error: 'dashboard_unavailable' } })
    if (responseMode === 'expired') return route.fulfill({ status: 401, json: { ok: false, error: 'access_required' } })
    return route.fulfill({ json: { ok: true, snapshot: snapshot(Number(url.searchParams.get('days'))) } })
  }
  if (url.pathname === '/api/ai-booking') return route.fulfill({ json: { ok: true, configured: false, connected: false } })
  if (url.pathname.startsWith('/api/')) throw new Error(`Unexpected API request: ${url.pathname}`)
  return route.continue()
})
try {
  await page.goto(`${base}/client-portal?view=business`)
  await page.getByRole('heading', { name: 'Business overview', exact: true }).waitFor()
  await page.getByText('3 of 9 sources reporting').waitFor()
  assert.equal(await page.locator('main').count(), 1)
  assert.equal(await page.getByLabel('Refresh every minute').isChecked(), false)
  await page.screenshot({ path: `${output}/overview-desktop.png`, fullPage: true })
  await page.getByRole('button', { name: 'Website & SEO', exact: true }).click()
  await page.getByRole('cell', { name: '/sample-page' }).waitFor()
  await page.getByRole('cell', { name: 'sample search query' }).waitFor()
  await page.getByRole('heading', { name: 'Sessions by day' }).waitFor()
  await page.getByText('View daily data', { exact: true }).click()
  await page.getByRole('cell', { name: 'Nov 10, 2026' }).waitFor()
  await page.screenshot({ path: `${output}/website-desktop.png`, fullPage: true })
  await page.getByText('Sample reporting retrieved. Currently unavailable: live visitor count.', { exact: true }).waitFor()
  await page.getByLabel('Reporting period').selectOption('7')
  await page.getByText(/Nov 6, 2026 – Nov 12, 2026/).waitFor()
  assert.equal(requests.at(-1), '7')
  await page.getByRole('button', { name: 'Connections', exact: true }).click()
  for (const name of ['Google Ads', 'Meta Ads', 'LinkedIn Ads', 'Instagram', 'Facebook']) {
    const details = page.locator('details').filter({ has: page.locator('summary strong', { hasText: new RegExp(`^${name}$`) }) })
    await details.locator('summary').click()
    await details.getByText('Sample setup instruction. Do not enter real credentials in this test.').waitFor({ state: 'visible' })
  }
  assert.equal(await page.getByText('Gmail / Google Workspace', { exact: true }).count(), 0)
  assert.equal(await page.getByText('Additional CRM', { exact: true }).count(), 0)
  await page.screenshot({ path: `${output}/connections-desktop.png`, fullPage: true })
  await page.getByRole('button', { name: 'Agent briefing', exact: true }).click()
  const downloaded = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download data snapshot' }).click()
  const artifact = await downloaded
  const exported = JSON.parse(await readFile(await artifact.path(), 'utf8'))
  assert.equal(exported.range.days, 7)
  assert.equal(exported.agentPolicy.executionEnabled, false)
  assert.equal(exported.sources.length, 9)
  await page.setViewportSize({ width: 390, height: 844 })
  for (const label of ['Overview', 'Website & SEO', 'Social & advertising', 'Agent briefing', 'Connections']) {
    await page.getByRole('button', { name: label, exact: true }).click()
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${label} must fit mobile viewport`)
  }
  await page.getByRole('button', { name: 'Overview', exact: true }).click()
  await page.screenshot({ path: `${output}/overview-mobile.png`, fullPage: true })
  responseMode = 'error'
  await page.getByRole('button', { name: 'Refresh data', exact: true }).click()
  await page.getByRole('alert').getByText(/Showing the previous snapshot/).waitFor()
  assert.equal(await page.getByText('3 of 9 sources reporting').count(), 1)
  responseMode = 'ok'
  await page.getByRole('button', { name: 'Try again', exact: true }).click()
  await page.getByRole('alert').waitFor({ state: 'detached' })
  responseMode = 'expired'
  await page.getByRole('button', { name: 'Refresh data', exact: true }).click()
  await page.getByRole('link', { name: 'Sign in to the owner account' }).waitFor()
  assert.equal(await page.getByText('3 of 9 sources reporting').count(), 0, 'Expired session must clear business data')
  owner = false; responseMode = 'ok'
  const before = requests.length
  await page.goto(`${base}/client-portal?view=business`)
  await page.getByRole('heading', { name: 'Your workspace is ready.' }).waitFor()
  assert.equal(requests.length, before, 'Client account must never request owner reports')
  owner = true
  await page.goto(`${base}/client-portal`)
  await page.getByRole('button', { name: 'Business dashboard', exact: true }).click()
  await page.getByRole('heading', { name: 'Business overview', exact: true }).waitFor()
  await page.getByRole('button', { name: 'Agreements & billing', exact: true }).click()
  await page.getByRole('heading', { name: 'No current agreements.' }).waitFor()
  assert.equal(new URL(page.url()).searchParams.has('view'), false)
  assert.deepEqual(errors, [])
  console.log(`Dashboard browser checks passed. Sample screenshots: ${output}`)
} finally { await browser.close() }
