import assert from 'node:assert/strict'
import { mkdir, readFile } from 'node:fs/promises'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
import ts from 'typescript'
import { playwright } from '../videos/contractor-previews/runtime.mjs'

const compile = source => ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext } }).outputText
const url = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`
const offerUrl = url(compile(await readFile(new URL('../src/content/aiSubscriptionOffer.ts', import.meta.url), 'utf8')))
const { subscriptionPreview, subscriptionView } = await import(url(compile(await readFile(new URL('../src/client-portal/ai-subscription.ts', import.meta.url), 'utf8')).replaceAll("'../content/aiSubscriptionOffer.js'", `'${offerUrl}'`)))
const output = process.env.SUBSCRIPTION_TEST_SCREENSHOTS ?? '/tmp/wallace-ai-subscription-review'
const trialToday = '2028-01-31'
const paidToday = '2028-07-31'
const sample = {
  id: 'sample-ai-service', revision: 1, createdAt: `${trialToday}T12:00:00Z`, client: 'Sample business (browser test)', email: 'sample@example.test', title: 'AI Chatbot + AI Phone Agent',
  scope: 'Sample subscription for browser verification only. Existing website chatbot and phone agent.', exclusions: 'No new website.', delivery: 'Both services must be ready before activation.',
  amount: 405000, cadence: 'six_months', firstDue: '', endDate: '', state: 'issued',
  agreement: 'SAMPLE AI SERVICE AGREEMENT\nSample record for browser verification only. No real agreement or charge is created.', agreementHash: 'sample-ai-agreement',
  signature: { name: 'Sample Signer', email: 'sample@example.test', at: `${trialToday}T12:00:00Z`, hash: 'sample-ai-agreement', consent: 'Sample signature only.' },
  hasCard: true, invoices: [], audit: [],
  aiSubscription: { version: 1, plan: 'six_months', createdAt: `${trialToday}T12:00:00Z`, readiness: { chatbot: false, phone: false, at: `${trialToday}T12:00:00Z`, reference: '' }, changes: [], usage: [] },
}
const legacy = { ...structuredClone(sample), id: 'sample-legacy-project', title: 'Legacy website project', amount: 250000, cadence: 'once', firstDue: trialToday, aiSubscription: undefined, invoices: [{ id: 'SAMPLE-LEGACY-PAID', due: trialToday, amount: 250000, fee: 0, status: 'paid', method: 'stripe' }] }

async function check(browser, server, viewport) {
  const page = await browser.newPage({ viewport, reducedMotion: 'reduce', serviceWorkers: 'block' })
  const origin = new URL(server.resolvedUrls.local[0]).origin
  const errors = [], sent = []
  let record = structuredClone(sample), today = trialToday, gatewayReady = false
  page.on('pageerror', error => errors.push(error.message))
  await page.route('**/*', async route => {
    const request = route.request(), target = new URL(request.url())
    // Only the Vite source and this in-memory session can be reached. No Stripe, email or live API calls.
    if (target.origin !== origin) return route.abort()
    if (target.pathname === '/api/client-portal') {
      if (request.method() === 'GET') return route.fulfill({ json: {
        ok: true, authenticated: true, admin: false, email: record.email, stripeReady: true, publishableKey: 'pk_test_browser_only',
        engagements: [{ ...record, subscriptionPreview: subscriptionPreview(record.aiSubscription, today), subscriptionView: subscriptionView(record.aiSubscription, today) }, legacy],
      } })
      const body = request.postDataJSON(); sent.push(body)
      assert.equal(body.id, record.id)
      const s = record.aiSubscription
      if (body.action === 'subscription-start') {
        assert.deepEqual({ consent: body.consent, startDate: body.startDate, trialEnd: body.trialEnd, total: body.total }, { consent: true, startDate: '2028-01-31', trialEnd: '2028-02-29', total: 405000 })
        if (!gatewayReady) return route.fulfill({ status: 409, json: { ok: false, error: 'service_setup_pending' } })
        s.trialStart = body.startDate; s.trialEnd = body.trialEnd; s.billingAnchor = body.trialEnd; s.nextDue = body.trialEnd
        s.trialStartedAt = '2028-01-31T14:00:00.000Z'; s.trialEndsAt = '2028-02-29T14:00:00.000Z'; s.renewalAuthorized = true
        record.firstDue = body.trialEnd; record.nextDue = body.trialEnd
        record.autopay = { enabled: true, at: `${today}T12:00:00Z`, feeBps: 0, consent: 'Sample explicit schedule confirmation.' }
      } else if (body.action === 'subscription-change-plan') {
        assert.equal(body.consent, true); assert.equal(body.effectiveDate, '2029-01-31')
        assert.equal(body.total, body.plan === 'monthly' ? 75000 : 405000)
        s.pendingPlan = { plan: body.plan, effectiveDate: body.effectiveDate, requestedAt: `${today}T12:00:00Z`, consent: 'Sample explicit interval confirmation.' }
      } else if (body.action === 'subscription-withdraw-change') {
        delete s.pendingPlan
        record.autopay.enabled = false; s.renewalAuthorized = false
      } else if (body.action === 'subscription-authorize') {
        assert.equal(body.consent, true); assert.equal(body.total, 720000); assert.equal(body.nextChargeDate, '2029-01-31')
        record.autopay.enabled = true; s.renewalAuthorized = true
      } else if (body.action === 'subscription-topup') {
        assert.equal(body.consent, true); assert.equal(body.total, 4000); assert.match(body.requestId, /^[a-f\d-]{36}$/i)
        s.phoneCreditSeconds = (s.phoneCreditSeconds ?? 0) + 6000
      } else if (body.action === 'cancel') {
        s.canceledAt = `${today}T12:00:00Z`; delete s.pendingPlan; delete s.nextDue; delete record.nextDue
        record.state = 'canceled'; record.autopay.enabled = false
      } else if (body.action === 'quote') {
        const invoice = record.invoices.find(item => item.id === body.invoiceId)
        assert.equal(invoice.id, 'SAMPLE-RENEWAL')
        return route.fulfill({ json: { ok: true, quote: { bps: 0, fee: 0, total: invoice.amount, invoiceId: invoice.id, recurringTotal: record.amount, card: 'visa ending 4242' } } })
      } else if (body.action === 'pay') {
        assert.equal(body.invoiceId, 'SAMPLE-RENEWAL'); assert.equal(body.consent, true); assert.equal(body.total, 720000)
        const invoice = record.invoices.find(item => item.id === body.invoiceId)
        invoice.status = 'paid'; invoice.paidAt = `${today}T14:01:00Z`; s.paymentStatus = 'succeeded'
        s.paidUntil = invoice.subscriptionPeriod.end; s.nextDue = invoice.subscriptionPeriod.end; record.nextDue = s.nextDue
      } else {
        assert.fail(`Unexpected action: ${body.action}`)
      }
      return route.fulfill({ json: { ok: true } })
    }
    if (target.pathname.startsWith('/api/')) return route.abort()
    return route.continue()
  })
  const snapshot = async name => {
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${name} must fit ${viewport.width}px`)
    await page.screenshot({ path: `${output}/${name}-${viewport.width}.png`, fullPage: true })
  }
  try {
    await page.goto(`${origin}/client-portal?engagement=${sample.id}`)
    const panel = page.getByRole('region', { name: 'AI service subscription' })
    await panel.getByRole('heading', { name: 'Setup in progress' }).waitFor()
    const projects = page.getByRole('combobox', { name: /Your project/ })
    assert.equal(await projects.isVisible(), true, 'A selected subscription must not hide older projects.')
    await projects.selectOption(legacy.id)
    await page.getByRole('heading', { name: legacy.title, exact: true }).waitFor()
    await projects.selectOption(sample.id)
    await panel.getByRole('heading', { name: 'Setup in progress' }).waitFor()
    assert.equal(await panel.getByRole('button', { name: 'Start free month', exact: true }).count(), 0)
    assert.equal(await page.getByRole('button', { name: 'Review future payment authorization' }).count(), 0)
    await page.getByText('No payment is due now. The first base invoice is created when your free month ends, unless you cancel first.', { exact: true }).waitFor()
    await snapshot('setup-pending')

    record.aiSubscription.readiness.chatbot = true; record.aiSubscription.readiness.phone = true
    await page.reload()
    await panel.getByRole('heading', { name: 'Ready to start your free month' }).waitFor()
    const activation = panel.locator('form').filter({ has: page.getByRole('heading', { name: 'Start your free calendar month' }) })
    assert.match(await activation.innerText(), /Start when you confirm/)
    assert.match(await activation.innerText(), /Free month ends:[^\n]*2028-02-29[^\n]*14:00[^\n]*UTC/)
    assert.match(await activation.innerText(), /First charge: \$4,050\.00 on 2028-02-29[^\n]*14:00[^\n]*UTC[^\n]*then every six months/)
    const start = activation.getByRole('button', { name: 'Start free month', exact: true })
    assert.equal(await start.isDisabled(), true)
    await snapshot('activation-review')
    await activation.getByRole('checkbox').check(); await start.click()
    await page.getByText('Both services must be ready in Reply365 before the free month can start.', { exact: true }).waitFor()
    assert.equal(record.aiSubscription.trialStart, undefined, 'Gateway failure must leave the trial unstarted.')
    assert.equal(record.invoices.length, 0)
    gatewayReady = true
    await activation.getByRole('checkbox').check(); await start.click()
    await panel.getByRole('heading', { name: 'Free month active' }).waitFor()
    assert.equal(record.invoices.length, 0, 'Activation creates no base invoice or charge.')
    assert.match(await panel.innerText(), /\$4,050\.00 on 2028-02-29[^\n]*14:00[^\n]*UTC/)
    assert.match(await panel.innerText(), /0 \/ 100 included phone minutes used/)
    assert.equal(await panel.getByRole('button', { name: 'Buy 100 extra minutes for $40', exact: true }).count(), 0, 'Free usage cannot become a paid purchase during the trial.')
    record.aiSubscription.usage = [{ periodStart: trialToday, phoneSeconds: 6000, chatReplies: 500 }]
    await page.reload()
    await panel.getByText('A trial allowance has been reached. The affected AI channel is paused. No extra charges are created.', { exact: true }).waitFor()
    await panel.getByText('Trial allowance ends 2028-02-29 at 14:00 UTC.', { exact: true }).waitFor()
    await page.getByRole('button', { name: 'Cancel renewal', exact: true }).click()
    await page.getByRole('button', { name: 'Confirm cancellation', exact: true }).click()
    await panel.getByText(/Renewal is canceled\. No new base charge/).waitFor()
    assert.equal(record.invoices.length, 0)
    assert.match(await panel.innerText(), /remaining service continues until 2028-02-29[^\n]*14:00[^\n]*UTC/)
    await snapshot('trial-canceled')

    // Separate, explicitly prepaid fixture: halfway through an annual paid service period.
    today = paidToday
    record = structuredClone(sample)
    record.amount = 720000; record.cadence = 'yearly'; record.firstDue = '2028-01-31'; record.nextDue = '2029-01-31'
    record.autopay = { enabled: true, at: '2027-12-31T12:00:00Z', feeBps: 0, consent: 'Sample annual schedule.' }
    record.aiSubscription = {
      ...record.aiSubscription, plan: 'yearly', readiness: { chatbot: true, phone: true, at: '2027-12-31T12:00:00Z', reference: '' },
      trialStart: '2027-12-31', trialEnd: '2028-01-31', trialStartedAt: '2027-12-31T14:00:00.000Z', trialEndsAt: '2028-01-31T14:00:00.000Z', renewalAuthorized: true, billingAnchor: '2028-01-31', paidUntil: '2029-01-31', nextDue: '2029-01-31',
      usage: [{ periodStart: paidToday, phoneSeconds: 24000, chatReplies: 1600 }],
    }
    record.invoices = [{ id: 'SAMPLE-ANNUAL-PAID', due: '2028-01-31', amount: 720000, fee: 0, status: 'paid', method: 'stripe', paidAt: '2028-01-31T00:01:00Z', subscriptionPeriod: { start: '2028-01-31', end: '2029-01-31', plan: 'yearly' } }]
    await page.reload()
    await panel.getByRole('heading', { name: 'Paid service active' }).waitFor()
    assert.match(await panel.innerText(), /\$7,200\.00 on 2029-01-31[^\n]*14:00[^\n]*UTC/)
    assert.match(await panel.innerText(), /400 \/ 500 included phone minutes used/)
    await panel.getByText('You have used at least 80% of an included allowance.', { exact: true }).waitFor()
    await panel.getByText('Next allowance reset: 2028-08-31 at 14:00 UTC.', { exact: true }).waitFor()
    assert.equal(await page.getByRole('heading', { name: 'Upcoming automatic payments' }).count(), 0, 'Generic recurring controls must not conflict with subscription controls.')
    const topup = panel.getByRole('button', { name: 'Buy 100 extra minutes for $40', exact: true })
    assert.equal(await topup.isDisabled(), true)
    await panel.getByLabel(/I authorize this one-time \$40\.00 purchase using my saved card/).check()
    await topup.click()
    await panel.getByText('100.0', { exact: true }).waitFor()
    assert.equal(await topup.isDisabled(), true, 'Each extra-minute purchase needs fresh consent.')
    assert.equal(sent.filter(item => item.action === 'subscription-topup').length, 1)
    assert.equal(record.aiSubscription.phoneCreditSeconds, 6000)
    const paidRecord = structuredClone(record)

    const interval = panel.locator('form').filter({ has: page.locator('select') })
    await interval.getByRole('combobox', { name: /New payment interval/ }).selectOption('six_months')
    await interval.getByRole('checkbox').check()
    await interval.getByRole('button', { name: 'Schedule interval change', exact: true }).click()
    await panel.getByText(/Scheduled: Every six months, \$4,050\.00 on 2029-01-31/).waitFor()
    assert.equal(record.aiSubscription.plan, 'yearly'); assert.equal(record.aiSubscription.paidUntil, '2029-01-31')
    assert.equal(record.invoices.length, 1, 'A pending interval change must not create an immediate base charge.')
    await snapshot('pending-interval')
    await panel.getByRole('button', { name: 'Withdraw pending change', exact: true }).click()
    await page.getByText('Pending interval change removed. Review and authorize your restored payment schedule before renewal.', { exact: true }).waitFor()
    assert.equal(record.aiSubscription.pendingPlan, undefined)
    assert.equal(record.autopay.enabled, false, 'Withdrawal cannot silently restore a different automatic amount.')
    assert.match(await panel.innerText(), /\$7,200\.00 on 2029-01-31[^\n]*14:00[^\n]*UTC/)
    const reauthorize = panel.locator('form').filter({ has: page.getByRole('heading', { name: 'Authorize your payment schedule', exact: true }) })
    assert.match(await reauthorize.innerText(), /I authorize \$7,200\.00 on 2029-01-31 at 14:00 UTC/)
    await reauthorize.getByRole('checkbox').check()
    await reauthorize.getByRole('button', { name: 'Authorize payment schedule', exact: true }).click()
    await page.getByText('The displayed payment schedule is authorized for your saved card.', { exact: true }).waitFor()
    assert.equal(record.autopay.enabled, true)
    await interval.getByRole('combobox', { name: /New payment interval/ }).selectOption('monthly')
    await interval.getByRole('checkbox').check()
    await interval.getByRole('button', { name: 'Schedule interval change', exact: true }).click()
    await panel.getByText(/Scheduled: Monthly, \$750\.00 on 2029-01-31/).waitFor()
    await page.getByRole('button', { name: 'Cancel renewal', exact: true }).click()
    await page.getByText(/Cancel renewal\? Your remaining free or paid service continues until 2029-01-31/).waitFor()
    await page.getByRole('button', { name: 'Confirm cancellation', exact: true }).click()
    await panel.getByText(/Renewal is canceled\. No new base charge/).waitFor()
    assert.equal(record.aiSubscription.pendingPlan, undefined)
    assert.equal(record.aiSubscription.paidUntil, '2029-01-31', 'Canceling halfway through the annual period preserves the remaining six months.')
    assert.equal(record.autopay.enabled, false)
    assert.equal(await panel.getByRole('combobox', { name: /New payment interval/ }).count(), 0)
    assert.match(await panel.innerText(), /remaining service continues until 2029-01-31[^\n]*14:00[^\n]*UTC/)
    await snapshot('annual-canceled')

    today = '2029-01-31'; await page.reload()
    await panel.getByRole('heading', { name: 'Service ended' }).waitFor()
    assert.equal(await panel.getByRole('button', { name: 'Buy 100 extra minutes for $40', exact: true }).count(), 0)
    assert.equal(await panel.getByText('Next base charge', { exact: true }).count(), 0)
    await snapshot('service-ended')

    // At renewal, optional credit must not hide base payment authentication or reset controls.
    record = structuredClone(paidRecord); today = '2029-01-31'
    record.invoices.push(
      { id: 'SAMPLE-ABANDONED-CREDIT', due: '2028-12-01', amount: 4000, fee: 0, status: 'open', subscriptionCredit: { phoneSeconds: 6000 } },
      { id: 'SAMPLE-RENEWAL', due: today, amount: 720000, fee: 0, status: 'processing', kind: 'recurring', subscriptionPeriod: { start: today, end: '2030-01-31', plan: 'yearly' } },
    )
    record.aiSubscription.paymentStatus = 'processing'
    await page.reload()
    await panel.getByRole('heading', { name: 'Payment processing', exact: true }).waitFor()
    assert.equal(await panel.getByRole('heading', { name: 'Paid service active', exact: true }).count(), 0)
    assert.equal(await panel.getByRole('button', { name: 'Buy 100 extra minutes for $40', exact: true }).count(), 0)
    assert.match(await panel.innerText(), /Payment has not been confirmed[\s\S]*2029-01-31 at 15:00 UTC/)
    await snapshot('processing-grace')
    record.aiSubscription.paymentStatus = 'requires_action'
    await page.reload()
    await panel.getByRole('heading', { name: 'Payment required to resume service', exact: true }).waitFor()
    const primaryInvoice = page.locator('.cp-invoice').first()
    await primaryInvoice.getByRole('heading', { name: '$7,200.00', exact: true }).waitFor()
    assert.equal(await primaryInvoice.getByRole('button', { name: 'Reset a failed payment', exact: true }).isVisible(), true)
    await primaryInvoice.getByRole('button', { name: 'Review existing payment', exact: true }).click()
    await primaryInvoice.getByRole('button', { name: 'Resume authorized payment', exact: true }).click()
    await panel.getByRole('heading', { name: 'Paid service active', exact: true }).waitFor()
    const creditInvoice = page.locator('.cp-invoice').filter({ has: page.getByRole('heading', { name: '$40.00', exact: true }) })
    assert.equal(await creditInvoice.getByRole('button', { name: 'Review payment total', exact: true }).isVisible(), true, 'Optional purchase can be managed after base recovery.')
    await page.getByText('Other invoices and upcoming charges (2)', { exact: true }).click()
    assert.equal(await page.locator('.cp-invoice').count(), 3, 'Other subscription invoices retain complete panels and receipts.')
    await snapshot('base-payment-recovered')

    record = structuredClone(paidRecord); today = '2030-02-01'
    record.invoices.push({ id: 'SAMPLE-EXPIRED-RENEWAL', due: '2029-01-31', amount: 720000, fee: 0, status: 'open', kind: 'recurring', subscriptionPeriod: { start: '2029-01-31', end: '2030-01-31', plan: 'yearly' } })
    await page.reload()
    await panel.getByRole('heading', { name: 'Service restart needs review', exact: true }).waitFor()
    assert.equal(await panel.getByRole('link', { name: 'Contact Wallace Shift', exact: true }).isVisible(), true)
    assert.equal(await panel.getByRole('button', { name: 'Authorize payment schedule', exact: true }).count(), 0)
    assert.equal(await panel.getByRole('button', { name: 'Buy 100 extra minutes for $40', exact: true }).count(), 0)
    assert.equal(await page.getByRole('button', { name: 'Review payment total', exact: true }).count(), 0)
    assert.equal(await panel.getByRole('combobox', { name: /New payment interval/ }).count(), 0)
    await snapshot('elapsed-period-recovery')
    assert.deepEqual(errors, [])
    assert.equal(sent.filter(item => item.action === 'pay').length, 1, 'Only the explicit mocked base renewal recovery submits payment.')
    assert.equal(sent.some(item => ['authorize', 'run-billing', 'setup-card'].includes(item.action)), false)
    console.log(`Passed ${viewport.width}px subscription portal: exact trial dates, readiness failure, zero-charge trial cancellation, prepaid usage, explicit minute purchase, next-cycle change/withdrawal, retained annual service and expiration.`)
  } catch (error) {
    await page.screenshot({ path: `${output}/failure-${viewport.width}.png`, fullPage: true })
    console.error(JSON.stringify({ errors, actions: sent.map(item => item.action), body: (await page.locator('body').innerText()).slice(0, 5000) }))
    throw error
  } finally { await page.close() }
}

await mkdir(output, { recursive: true })
const server = await createServer({ configFile: false, plugins: [react()], logLevel: 'error', server: { host: '127.0.0.1', port: 0, hmr: false, open: false } })
await server.listen()
const { chromium } = await playwright()
let browser
try {
  browser = await chromium.launch({ channel: 'chrome', headless: true })
  await check(browser, server, { width: 1440, height: 1100 })
  await check(browser, server, { width: 390, height: 844 })
  console.log(JSON.stringify({ passed: true, scope: 'Browser controls with a mocked session and server-computed dates. No live payments or emails. Billing correctness is covered separately by controlled-clock server tests.', screenshots: output }, null, 2))
} finally { await browser?.close(); await server.close() }
