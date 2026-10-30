import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { playwright } from '../videos/contractor-previews/runtime.mjs'

const base = process.env.PORTAL_TEST_URL ?? 'http://127.0.0.1:5182'
const output = '/tmp/wallace-client-portal-review'
await mkdir(output, { recursive: true })
const { chromium } = await playwright()
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } })
const errors = []; page.on('pageerror', error => errors.push(error.message))
const failedRequests = []; page.on('requestfailed', request => failedRequests.push({ url: request.url(), failure: request.failure() }))
const today = new Date().toISOString().slice(0, 10)
const sample = {
  id: 'sample-client', revision: 1, createdAt: new Date().toISOString(), client: 'Sample client (browser test)', email: 'sample@example.test', title: 'Website & client intake',
  scope: 'A website and connected client enquiry form. Sample data for browser verification only.', exclusions: 'Hosting and third party subscriptions.', delivery: 'Review the pages and submit a test enquiry.',
  amount: 240000, cadence: 'once', firstDue: today, endDate: '', state: 'issued',
  agreement: 'SERVICE AGREEMENT\n\nSample agreement for browser verification only.\n\nWallace Shift LLC and Sample client.\nGoverning law: Kansas.\n\nReview and sign before payment. No real agreement is signed in this test.', agreementHash: 'test-hash',
  invoices: [{ id: 'SAMPLE-001', due: today, amount: 240000, fee: 0, status: 'open' }], audit: [{ at: new Date().toISOString(), actor: 'Sample owner', action: 'Sample agreement issued' }], hasCard: true,
}
let loggedIn = false, admin = false, record = structuredClone(sample), sent = []
await page.route('**/api/client-portal', async route => {
  const request = route.request(); let result = { ok: true }
  if (request.method() === 'GET') result = { ...result, authenticated: loggedIn, admin, email: admin ? 'owner@example.test' : sample.email, engagements: loggedIn ? [record] : [], stripeReady: true, publishableKey: 'pk_test_fake', instructions: { zelle: 'Sample instructions only. Do not send money.', cash: 'Sample pickup arrangement.', check: 'Sample payee details.' } }
  else {
    const body = request.postDataJSON(); sent.push(body)
    if (body.action === 'verify-code') loggedIn = true
    if (body.action === 'sign') { assert.equal(body.consent, true); assert.equal(body.agreementHash, 'test-hash'); record.signature = { name: body.name, email: sample.email, at: new Date().toISOString(), hash: 'test-hash' } }
    if (body.action === 'quote') result.quote = { bps: 300, fee: Math.round(record.amount * .03), total: record.amount + Math.round(record.amount * .03), card: 'visa ending 4242' }
    if (body.action === 'authorize') { assert.equal(body.consent, true); record.autopay = { enabled: true, feeBps: 300 }; result.scheduled = true }
    if (body.action === 'report-payment') { record.invoices[0].method = body.method; record.invoices[0].reference = body.reference; record.invoices[0].reportedAt = new Date().toISOString() }
    if (body.action === 'record-payment') { assert.equal(body.confirmed, true); record.invoices[0].status = 'paid'; record.invoices[0].paidAt = new Date().toISOString() }
    if (body.action === 'create') { assert.equal(body.cadence, 'monthly'); assert.equal(body.amount, 45000); record = { ...record, ...body, state: 'draft', signature: undefined, invoices: [] }; result.id = record.id }
    if (body.action === 'logout') loggedIn = false
  }
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(result) })
})
try {
  await page.goto(`${base}/client-portal`)
  await page.getByRole('heading', { name: 'Welcome back' }).waitFor()
  await page.screenshot({ path: `${output}/login-desktop.png`, fullPage: true })
  await page.getByLabel('Email address').fill(sample.email)
  await page.getByRole('button', { name: 'Email me a sign in code' }).click()
  await page.getByLabel('Sign in code').fill('123456')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await page.getByRole('button', { name: 'Review agreement', exact: true }).click()
  await page.getByLabel('Full legal name').fill('Sample Signer')
  assert.equal(await page.getByRole('checkbox').count(), 1)
  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: 'Sign agreement', exact: true }).click()
  await page.getByText('Signed by Sample Signer', { exact: true }).waitFor()
  const downloadEvent = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download signed copy' }).click()
  assert.match((await downloadEvent).suggestedFilename(), /agreement\.txt$/)
  await page.getByRole('button', { name: 'Invoices & payments' }).click()
  await page.getByRole('button', { name: 'Review payment total' }).click()
  await page.getByText('Credit card fee (3%)', { exact: true }).waitFor()
  assert.equal(await page.getByRole('button', { name: 'Pay $2,472.00', exact: true }).isDisabled(), true)
  await page.screenshot({ path: `${output}/client-desktop.png`, fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: `${output}/client-mobile.png`, fullPage: true })
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'Mobile must not overflow horizontally')
  await page.getByRole('button', { name: 'Pay by cash, check, or Zelle with no fee' }).click()
  await page.getByLabel('Payment reference or delivery details').fill('Sample transfer reference')
  await page.getByRole('button', { name: 'Report payment sent' }).click()
  await page.getByText('Awaiting receipt confirmation', { exact: true }).waitFor()
  assert.equal(record.invoices[0].status, 'open')
  admin = true; await page.reload()
  await page.getByText('Record payment received', { exact: true }).click()
  await page.getByLabel('Receipt or deposit reference').fill('Sample cleared receipt')
  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: 'Confirm receipt & mark paid' }).click()
  await page.getByRole('button', { name: 'Download receipt' }).waitFor()
  await page.getByRole('button', { name: 'New agreement', exact: true }).click()
  await page.getByLabel('Client or legal business name').fill('New sample client')
  await page.getByLabel('Client email', { exact: true }).fill('new@example.test')
  await page.getByLabel('Project or service name').fill('Monthly support')
  await page.getByLabel('Scope of work').fill('Sample support scope.')
  await page.getByLabel('Exclusions and third party costs').fill('Sample exclusions.')
  await page.getByLabel('Delivery, milestones, and acceptance criteria').fill('Sample acceptance criteria.')
  await page.getByLabel('Full invoice amount (USD)').fill('450.00')
  await page.getByLabel('Billing schedule').selectOption('monthly')
  await page.getByLabel('First invoice due').fill(today)
  await page.setViewportSize({ width: 1440, height: 1100 })
  await page.screenshot({ path: `${output}/owner-create-desktop.png`, fullPage: true })
  await page.getByRole('button', { name: 'Create draft & review agreement' }).click()
  await page.getByRole('button', { name: 'Issue agreement & first invoice' }).waitFor()
  admin = false
  record = { ...record, state: 'issued', signature: { name: 'Sample Signer', email: sample.email, at: new Date().toISOString(), hash: 'test-hash' }, nextDue: '2099-01-31', invoices: [{ id: 'SAMPLE-002', due: today, amount: record.amount, fee: 1350, status: 'paid' }] }
  await page.reload()
  await page.getByRole('heading', { name: 'Upcoming automatic payments' }).waitFor()
  assert.equal(await page.getByRole('button', { name: 'Pay by cash, check, or Zelle with no fee' }).count(), 0)
  await page.getByRole('button', { name: 'Review future payment authorization' }).click()
  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: 'Authorize future payments', exact: true }).click()
  assert.equal(record.autopay.enabled, true)
  assert.equal(sent.some(action => action.action === 'pay'), false, 'This test must not submit a payment')
  assert.deepEqual(errors, [])
  console.log(JSON.stringify({ passed: true, scope: 'Mocked sample records; no payments or emails sent', screenshots: output, checked: ['sign in', 'signature and download', 'fee disclosure and consent gate', 'offline pending state', 'owner receipt confirmation', 'recurring draft creation', 'future automatic payment authorization', '390px overflow', 'browser runtime errors'] }, null, 2))
} catch (error) {
  await page.screenshot({ path: `${output}/failure.png`, fullPage: true })
  console.error(JSON.stringify({ errors, failedRequests, body: (await page.locator('body').innerText()).slice(0, 2500), html: (await page.content()).slice(0, 2500) }))
  throw error
} finally { await browser.close() }
