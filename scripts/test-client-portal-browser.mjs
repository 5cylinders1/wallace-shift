import assert from 'node:assert/strict'
import { mkdir, readFile } from 'node:fs/promises'
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
    if (body.action === 'quote') {
      const amount = record.invoices.find(i => i.id === body.invoiceId)?.amount ?? record.amount
      result.quote = { bps: 300, fee: Math.round(amount * .03), total: amount + Math.round(amount * .03), invoiceId: body.invoiceId, recurringTotal: record.amount + Math.round(record.amount * .03), initialTotal: record.initialPayment ? Math.round(record.initialPayment.amount * 1.03) : undefined, card: 'visa ending 4242' }
    }
    if (body.action === 'authorize') { assert.equal(body.consent, true); record.autopay = { enabled: true, feeBps: 300 }; result.scheduled = true }
    if (body.action === 'report-payment') { record.invoices[0].method = body.method; record.invoices[0].reference = body.reference; record.invoices[0].reportedAt = new Date().toISOString() }
    if (body.action === 'record-payment') { assert.equal(body.confirmed, true); record.invoices[0].status = 'paid'; record.invoices[0].paidAt = new Date().toISOString() }
    if (body.action === 'create') { assert.equal(body.cadence, 'monthly'); assert.equal(body.amount, 45000); assert.deepEqual(body.initialPayment, { amount: 120000, due: today }); assert.equal(body.firstDue, '2099-01-31'); assert.equal(body.endDate, '2099-04-30'); record = { ...record, ...body, state: 'draft', signature: undefined, invoices: [] }; result.id = record.id }
    if (body.action === 'issue') { record.state = 'issued'; record.issueEmail = { id: 'sample-mail', state: 'failed', startedAt: new Date().toISOString() }; result.emailStatus = 'failed' }
    if (body.action === 'retry-issue-email') { record.issueEmail.state = 'sent'; record.issueEmail.sentAt = new Date().toISOString(); result.emailStatus = 'sent' }
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
  await page.getByRole('heading', { name: 'Review and sign your agreement', exact: true }).waitFor()
  await page.getByLabel('Full legal name').fill('Sample Signer')
  assert.equal(await page.getByRole('checkbox').count(), 1)
  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: 'Sign agreement and continue to Stripe', exact: true }).click()
  await page.getByRole('button', { name: 'Agreement & signature' }).click()
  await page.getByText('Signed by Sample Signer', { exact: true }).waitFor()
  const downloadEvent = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download signed copy' }).click()
  assert.match((await downloadEvent).suggestedFilename(), /agreement\.txt$/)
  await page.getByRole('button', { name: 'Invoices & payments' }).click()
  // The exact payment quote opens automatically after signing.
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
  await page.getByLabel('Billing schedule').selectOption('monthly')
  await page.getByLabel('Recurring amount (USD)').fill('450.00')
  await page.getByLabel('Recurring start date').fill('2099-01-31')
  await page.getByLabel('Recurring end date (optional)').fill('2099-04-30')
  await page.getByLabel('Include a separate initial payment').uncheck()
  assert.equal(await page.getByLabel('Initial payment amount (USD)').count(), 0)
  await page.getByLabel('Include a separate initial payment').check()
  await page.getByLabel('Initial payment amount (USD)').fill('1200.00')
  await page.getByLabel('Initial payment date').fill(today)
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'Recurring form must fit mobile')
  await page.screenshot({ path: `${output}/owner-create-mobile.png`, fullPage: true })
  await page.setViewportSize({ width: 1440, height: 1100 })
  await page.screenshot({ path: `${output}/owner-create-desktop.png`, fullPage: true })
  await page.getByRole('button', { name: 'Create draft & review agreement' }).click()
  await page.getByRole('button', { name: 'Issue agreement & invoices' }).click()
  await page.getByRole('button', { name: 'Retry invoice email' }).waitFor()
  await page.reload()
  await page.getByRole('button', { name: 'Retry invoice email' }).click()
  await page.getByText('Invoice email sent', { exact: true }).waitFor()
  assert.equal(await page.getByRole('button', { name: 'Issue agreement & invoices' }).count(), 0)
  await page.screenshot({ path: `${output}/owner-email-status.png`, fullPage: true })
  admin = false
  record = { ...record, state: 'issued', signature: { name: 'Sample Signer', email: sample.email, at: new Date().toISOString(), hash: 'test-hash' }, nextDue: '2099-01-31', invoices: [{ id: 'SAMPLE-002', due: today, amount: record.amount, fee: 1350, status: 'paid' }] }
  await page.reload()
  record.invoices = [
    { id: 'SAMPLE-INITIAL', kind: 'initial', due: today, amount: 120000, fee: 0, status: 'open' },
    { id: 'SAMPLE-RECURRING', kind: 'recurring', due: '2099-01-31', amount: 45000, fee: 0, status: 'open' },
  ]
  await page.reload()
  assert.equal(await page.getByRole('button', { name: 'Review payment total', exact: true }).count(), 0)
  await page.getByRole('button', { name: 'Authorize payment schedule' }).waitFor()
  await page.getByText('Payment authorization terms', { exact: true }).click()
  assert.match(await page.locator('.cp-payment-terms').innerText(), /1,236.00/)
  assert.match(await page.locator('.cp-payment-terms').innerText(), /463.50/)
  assert.match(await page.locator('.cp-payment-terms').innerText(), /2099-04-30/)
  assert.equal(await page.getByRole('button', { name: 'Authorize payment schedule' }).isDisabled(), true)
  await page.screenshot({ path: `${output}/split-schedule-desktop.png`, fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
  await page.screenshot({ path: `${output}/split-schedule-mobile.png`, fullPage: true })
  record.invoices.forEach(i => { i.status = 'paid' })
  record.nextDue = '2099-02-28'
  await page.reload()
  await page.getByRole('heading', { name: 'Upcoming automatic payments' }).waitFor()
  assert.equal(await page.getByRole('button', { name: 'Pay by cash, check, or Zelle with no fee' }).count(), 0)
  await page.getByRole('button', { name: 'Review future payment authorization' }).click()
  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: 'Authorize future payments', exact: true }).click()
  assert.equal(record.autopay.enabled, true)
  assert.equal(sent.some(action => action.action === 'pay'), false, 'This test must not submit a payment')
  if (process.env.PORTAL_EMAIL_PREVIEW_DIR) {
    const html = await readFile(`${process.env.PORTAL_EMAIL_PREVIEW_DIR}/invoice-email.html`, 'utf8')
    for (const [name, width] of [['desktop', 900], ['mobile', 390]]) {
      const emailPage = await browser.newPage({ viewport: { width, height: 1100 } })
      await emailPage.setContent(html)
      assert.equal(await emailPage.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'Invoice email must fit its viewport')
      assert.equal(await emailPage.getByRole('heading', { level: 1 }).count(), 1)
      await emailPage.screenshot({ path: `${output}/invoice-email-${name}.png`, fullPage: true })
      await emailPage.close()
    }
  }
  assert.deepEqual(errors, [])
  console.log(JSON.stringify({ passed: true, scope: 'Mocked sample records; no payments or emails sent', screenshots: output, checked: ['sign in', 'signature and download', 'fee disclosure and consent gate', 'offline pending state', 'owner receipt confirmation', 'issue invoice email failure and retry', 'separate initial and recurring terms', 'optional initial payment', 'recurring end date', 'per invoice quote and consent', 'future automatic payment authorization', '390px overflow', 'browser runtime errors'] }, null, 2))
} catch (error) {
  await page.screenshot({ path: `${output}/failure.png`, fullPage: true })
  console.error(JSON.stringify({ errors, failedRequests, body: (await page.locator('body').innerText()).slice(0, 2500), html: (await page.content()).slice(0, 2500) }))
  throw error
} finally { await browser.close() }
