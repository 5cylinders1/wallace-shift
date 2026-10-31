import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { playwright } from '../videos/contractor-previews/runtime.mjs'
const base = process.env.PORTAL_TEST_URL ?? 'http://127.0.0.1:5182'
const output = '/tmp/wallace-client-portal-review'
await mkdir(output, { recursive: true })
const { chromium } = await playwright()
const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  for (const scenario of ['direct', 'checkout-retry', 'expired', 'offline']) {
    const page = await browser.newPage({ viewport: { width: scenario === 'direct' ? 1440 : 390, height: 1000 } })
    const errors = []; page.on('pageerror', e => errors.push(e.message))
    const actions = []; let signedIn = false, failSetup = scenario === 'checkout-retry'
    const record = { id: 'invitation-test', client: 'Sample client', email: 'sample@example.test', title: 'Website setup and ongoing support', state: 'issued', cadence: scenario === 'offline' ? 'once' : 'monthly', amount: 500, firstDue: '2099-01-01', endDate: '2099-06-01', initialPayment: { amount: 1000, due: '2099-01-01' }, agreementHash: 'test-hash', agreement: 'SERVICE AGREEMENT\n\nWallace Shift LLC and Sample client\n\nThis is a browser test only. No real contract is signed.\n\nScope: Website setup and ongoing support.\n\nInitial payment: $10.00 on January 1, 2099.\nRecurring service: $5.00 monthly from January 1 through June 1, 2099.\n\nReview the agreement, then sign below. Automatic payments require separate approval.', audit: [], invoices: [{ id: 'initial', kind: 'initial', amount: 1000, fee: 0, due: '2099-01-01', status: 'open' }, { id: 'recurring', kind: 'recurring', amount: 500, fee: 0, due: '2099-01-01', status: 'open' }], hasCard: false }
    await page.route('**/api/client-portal', async route => {
      const req = route.request(); let result = { ok: true }, status = 200
      if (req.method() === 'GET') result = { ok: true, authenticated: signedIn, admin: false, email: record.email, engagements: signedIn ? [record] : [], stripeReady: true, instructions: { zelle: 'Sample payment instructions.' } }
      else {
        const body = req.postDataJSON(); actions.push(body.action)
        if (body.action === 'open-invitation') { if (scenario === 'expired') { status = 401; result = { ok: false, error: 'invitation_expired' } } else signedIn = true }
        if (body.action === 'sign') { assert.equal(body.consent, true); record.signature = { name: body.name, email: record.email, at: new Date().toISOString(), hash: 'test-hash' } }
        if (body.action === 'setup-card') { assert.ok(record.signature); if (failSetup) { failSetup = false; status = 502; result = { ok: false, error: 'stripe_unavailable' } } else result.url = `${base}/__stripe-checkout-test` }
        if (body.action === 'finish-setup') { assert.equal(body.sessionId, 'cs_test'); record.hasCard = true }
        if (body.action === 'quote') result.quote = { total: 1000, fee: 0, bps: 0, recurringTotal: 500, initialTotal: 1000, invoiceId: 'initial', card: 'Visa ending 4242' }
        if (body.action === 'pay') { assert.equal(body.consent, true); assert.equal(body.total, 1000); assert.equal(body.recurringTotal, 500); record.autopay = { enabled: true }; result.scheduled = true }
      }
      await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(result) })
    })
    await page.route('**/__stripe-checkout-test', route => route.fulfill({ contentType: 'text/html', body: `<h1>Mock Stripe card setup</h1><a href="${base}/client-portal?engagement=invitation-test&setup=cs_test">Return after saving card</a>` }))
    await page.goto(`${base}/client-portal?engagement=invitation-test#access=${'e'.repeat(64)}`)
    if (scenario === 'expired') {
      await page.getByRole('alert').filter({ hasText: 'expired or was already used' }).waitFor()
      await page.getByLabel('Email address').waitFor()
      assert.equal(page.url().includes('#access'), false)
      await page.screenshot({ path: `${output}/invitation-expired-mobile.png`, fullPage: true })
      await page.close(); continue
    }
    await page.getByRole('heading', { name: 'Review and sign your agreement', exact: true }).waitFor()
    assert.equal(page.url().includes('#access'), false)
    assert.equal(await page.getByLabel('Email address').count(), 0)
    assert.equal(actions.filter(a => a === 'open-invitation').length, 1)
    await page.screenshot({ path: `${output}/invitation-sign-${scenario}.png`, fullPage: true })
    await page.getByLabel('Full legal name').fill('Sample Client')
    await page.getByRole('checkbox').check()
    if (scenario === 'offline') {
      await page.getByLabel('How would you like to pay?').selectOption('offline')
      await page.getByRole('button', { name: 'Sign agreement and view payment instructions' }).click()
      await page.getByText('Sample payment instructions.', { exact: true }).waitFor()
      assert.equal(actions.includes('setup-card'), false)
      await page.close(); continue
    }
    await page.getByRole('button', { name: 'Sign agreement and continue to Stripe' }).click()
    if (scenario === 'checkout-retry') {
      await page.getByRole('alert').filter({ hasText: 'Your agreement is signed.' }).waitFor()
      assert.equal(await page.getByRole('button', { name: 'Sign agreement and continue to Stripe' }).count(), 0)
      await page.screenshot({ path: `${output}/invitation-checkout-error-mobile.png`, fullPage: true })
      await page.getByRole('button', { name: 'Continue to Stripe', exact: true }).click()
    }
    await page.getByRole('heading', { name: 'Mock Stripe card setup' }).waitFor()
    assert.equal(actions.includes('pay'), false)
    await page.getByRole('link', { name: 'Return after saving card' }).click()
    await page.getByRole('heading', { name: 'Confirm your payment', exact: true }).waitFor()
    const pay = page.getByRole('button', { name: 'Authorize payment schedule', exact: true })
    await pay.waitFor()
    assert.equal(await pay.isDisabled(), true)
    assert.equal(actions.filter(a => a === 'finish-setup').length, 1)
    assert.equal(actions.includes('pay'), false)
    assert.equal(page.url().includes('setup='), false)
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
    await page.screenshot({ path: `${output}/invitation-confirm-${scenario}.png`, fullPage: true })
    await page.getByRole('checkbox').check(); await pay.click()
    await page.getByRole('heading', { name: 'Your payment schedule is confirmed', exact: true }).waitFor()
    assert.equal(await page.getByRole('button', { name: 'Authorize payment schedule' }).count(), 0)
    await page.reload()
    await page.getByRole('heading', { name: 'Your payment schedule is confirmed', exact: true }).waitFor()
    assert.equal(actions.filter(a => a === 'pay').length, 1)
    assert.equal(actions.filter(a => a === 'sign').length, 1)
    assert.deepEqual(errors, [])
    await page.screenshot({ path: `${output}/invitation-complete-${scenario}.png`, fullPage: true })
    await page.close()
  }
  console.log('PASS: private link, direct agreement, signature to Stripe, automatic return and quote, explicit authorization, saved completion, checkout retry, expired link recovery, and offline choice. Mock data only.')
} finally { await browser.close() }
