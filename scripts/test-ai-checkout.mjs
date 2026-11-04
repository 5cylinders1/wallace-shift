import assert from 'node:assert/strict'
import { beforeEach, after, test } from 'node:test'
import { randomUUID } from 'node:crypto'
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { pathToFileURL, fileURLToPath } from 'node:url'
import ts from 'typescript'
import { createAgreementTestStore } from './demo-agreement-test-store.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))
const temporary = await mkdtemp(join(tmpdir(), 'wallace-checkout-test-'))
const compiled = new Map()
async function compile(relative) {
  if (compiled.has(relative)) return compiled.get(relative)
  const target = join(temporary, `${relative}.mjs`); compiled.set(relative, target)
  let source = ts.transpileModule(await readFile(join(root, relative), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext } }).outputText
  for (const match of [...source.matchAll(/(from\s+)(['"])(\.[^'"]+)\2/g)]) {
    const path = await compile(join(dirname(relative), match[3].replace(/\.js$/, '.ts')))
    source = source.replace(match[0], `from ${JSON.stringify(pathToFileURL(path).href)}`)
  }
  await mkdir(dirname(target), { recursive: true }); await writeFile(target, source); return target
}
const load = async file => import(pathToFileURL(await compile(file)).href)
const { default: handler } = await load('api/_lib/ai-checkout-handler.ts')
const { default: deployed } = await load('api/demo-admin.ts')
const { default: portal } = await load('api/_lib/client-portal-handler.ts')
const { aiOffer, aiPackages, legacyAiPackages } = await load('src/content/aiOffer.ts')
const { hash, createPurchaseSession } = await load('api/_lib/portal-auth.ts')
const { draft, changeLedger } = await load('api/_lib/portal-ledger.ts')
const { aiSubscriptionPlans } = await load('src/content/aiSubscriptionOffer.ts')
const savedEnv = { ...process.env }; const savedFetch = globalThis.fetch
let store, emails, failEmail, failLedgerOnce, failSessionOnce, stripeCalls, allowPaymentMocks
const answers = { businessType: '', workflows: ['inquiries'], workflowDetails: '', currentTools: 'Website and Gmail', weeklyHours: '6_10', impacts: ['delay'], impactDetails: '', role: 'owner', approverAvailability: '', revenue: '250k_1m', aiExperience: 'new', aiBarriers: [], budget: 'ready', timing: 'soon' }
const body = (overrides = {}) => ({ action: 'send-code', submissionId: randomUUID(), offerVersion: aiOffer.version, packageId: 'assistant', interval: 'monthly', name: 'Buyer Name', businessName: 'Buyer Company', email: 'buyer@example.test', answers, authorityConfirmed: true, company: '', ...overrides })
const ledger = () => JSON.parse(store.values.get('portal:engagements') ?? '[]')
beforeEach(() => {
  process.env.VERCEL_ENV = 'development'
  Object.assign(process.env, { DEMO_AUDIT_REDIS_URL: 'https://redis.example.test', DEMO_AUDIT_REDIS_TOKEN: 'fake', PORTAL_ADMIN_EMAIL: 'owner@example.test', STRIPE_SECRET_KEY: 'sk_test_fake', STRIPE_PUBLISHABLE_KEY: 'pk_test_fake', STRIPE_WEBHOOK_SECRET: 'whsec_fake', RESEND_API_KEY: 'fake', CONTACT_FROM_EMAIL: 'billing@example.test' })
  store = createAgreementTestStore(); emails = []; failEmail = false; failLedgerOnce = false; failSessionOnce = false; stripeCalls = []; allowPaymentMocks = false
  globalThis.fetch = async (url, init) => {
    if (String(url).startsWith('https://redis.example.test')) {
      if (new URL(url).pathname === '/pipeline') return store.fetch(url, init)
      const command = JSON.parse(init.body); const [verb, key, value] = command
      if (verb === 'GET') return Response.json({ result: store.values.get(key) ?? null })
      if (verb === 'SET') {
        if (failSessionOnce && key.startsWith('portal:session:')) { failSessionOnce = false; throw new Error('Session write unavailable') }
        store.values.set(key, value); return Response.json({ result: 'OK' })
      }
      if (verb === 'EVAL') {
        const script = command[1]
        if (script.startsWith('-- ai-checkout:limit')) {
          const key = command[3]; const count = Number(store.values.get(key) ?? 0)
          if (count >= 8) return Response.json({ result: 0 })
          store.values.set(key, count + 1); return Response.json({ result: 1 })
        }
        if (script.startsWith('-- ai-checkout:verify')) {
          const [, , , codeKey, pendingKey, proofKey, digest, now] = command
          const pending = JSON.parse(store.values.get(pendingKey) ?? 'null')
          if (!pending || pending.exp <= now) return Response.json({ result: 'code_expired' })
          const verified = store.values.get(proofKey)
          if (verified) return Response.json({ result: verified === digest ? 'ok' : 'code_invalid' })
          const code = JSON.parse(store.values.get(codeKey) ?? 'null')
          if (!code || code.expiresAt <= now) return Response.json({ result: 'code_expired' })
          if (code.recipientHash !== pending.recipientHash || code.email !== pending.purchase.email) return Response.json({ result: 'code_invalid' })
          if (code.attempts >= 5) return Response.json({ result: 'rate_limited' })
          code.attempts++
          if (code.codeHash !== digest) { store.values.set(codeKey, JSON.stringify(code)); return Response.json({ result: 'code_invalid' }) }
          store.values.set(proofKey, digest); store.values.delete(codeKey)
          return Response.json({ result: 'ok' })
        }
        if (failLedgerOnce) { failLedgerOnce = false; throw new Error('Ledger unavailable') }
        const [, , , ledgerKey, before, next] = command
        if ((store.values.get(ledgerKey) ?? '[]') !== before) return Response.json({ result: 0 })
        store.values.set(ledgerKey, next); return Response.json({ result: 1 })
      }
      throw new Error(`Unexpected Redis command ${verb}`)
    }
    if (url === 'https://api.resend.com/emails') {
      if (failEmail) return Response.json({ error: 'Unavailable' }, { status: 503 })
      emails.push(JSON.parse(init.body)); return Response.json({ id: 'email_test' })
    }
    if (String(url).startsWith('https://api.stripe.com/')) {
      stripeCalls.push({ url, init })
      if (!allowPaymentMocks) throw new Error('Checkout bootstrap must not charge')
      const path = String(url).split('/v1/')[1]
      if (path === 'customers') return Response.json({ id: 'cus_checkout_test' })
      if (path === 'checkout/sessions') return Response.json({ id: 'cs_checkout_test', url: 'https://checkout.stripe.com/test', expires_at: Date.now() / 1000 + 3600 })
      if (path === 'checkout/sessions/cs_checkout_test') return Response.json({ status: 'complete', customer: 'cus_checkout_test', setup_intent: 'seti_checkout_test' })
      if (path === 'setup_intents/seti_checkout_test') return Response.json({ status: 'succeeded', customer: 'cus_checkout_test', payment_method: 'pm_checkout_test' })
      if (path === 'payment_methods/pm_checkout_test') return Response.json({ id: 'pm_checkout_test', customer: 'cus_checkout_test', type: 'card', card: { funding: 'debit', brand: 'visa', last4: '4242', country: 'US' }, billing_details: { address: { country: 'US', state: 'KS' } } })
      if (path === 'payment_intents') {
        const params = new URLSearchParams(init.body)
        return Response.json({ id: 'pi_checkout_test', status: 'succeeded', customer: 'cus_checkout_test', amount: Number(params.get('amount')), currency: 'usd', metadata: { engagement: params.get('metadata[engagement]'), invoice: params.get('metadata[invoice]'), attempt: params.get('metadata[attempt]') }, latest_charge: { receipt_url: 'https://pay.stripe.com/receipts/test', amount_refunded: 0, disputed: false } })
      }
      throw new Error(`Unexpected Stripe path: ${path}`)
    }
    throw new Error(`Unexpected network access ${url}`)
  }
})
after(async () => { globalThis.fetch = savedFetch; for (const key of Object.keys(process.env)) if (!Object.hasOwn(savedEnv, key)) delete process.env[key]; Object.assign(process.env, savedEnv); await rm(temporary, { recursive: true, force: true }) })
async function call(input, cookie = '', options = {}) {
  const req = { url: '/api/ai-checkout', method: input ? 'POST' : 'GET', socket: { remoteAddress: '127.0.0.1' }, headers: { host: 'localhost:5176', origin: 'http://localhost:5176', 'content-type': 'application/json', cookie }, body: input ? JSON.stringify(input) : undefined, ...options }
  const res = { headers: {}, statusCode: 200, setHeader(key, value) { this.headers[key] = value }, end(value) { this.body = JSON.parse(value) } }
  await (options.dispatch ?? handler)(req, res); return res
}
function cookie(response) { return String(response.headers['set-cookie']).split(';')[0] }
async function start(input = body()) {
  const response = await call(input)
  assert.equal(response.statusCode, 200, JSON.stringify(response.body))
  return { cookie: cookie(response), code: emails.at(-1).text.match(/code is (\d{6})/)[1], input }
}
const verify = challenge => call({ action: 'verify-code', code: challenge.code }, challenge.cookie)

test('configuration readiness fails closed without secrets or email side effects', async () => {
  assert.deepEqual((await call()).body, { ok: true, ready: true })
  delete process.env.STRIPE_WEBHOOK_SECRET
  assert.deepEqual((await call()).body, { ok: true, ready: false })
  assert.equal((await call(body())).body.error, 'stripe_not_configured')
  assert.equal(emails.length, 0); assert.equal(store.values.size, 0)
})
test('public checkout rewrite reaches same handler without adding a serverless function', async () => {
  const config = JSON.parse(await readFile(join(root, 'vercel.json'), 'utf8'))
  assert.equal(config.rewrites.find(item => item.source === '/api/ai-checkout').destination, '/api/demo-admin?offer=checkout')
  assert.equal((await call(undefined, '', { dispatch: deployed, url: '/api/demo-admin?offer=checkout' })).body.ready, true)
  assert.equal((await call(undefined, '', { dispatch: deployed, url: '/api/ai-checkout' })).body.ready, true)
})
test('checkout requires a complete mode-matched Stripe configuration for its deployment', async () => {
  for (const [environment, secret, publishable, webhook, expected] of [
    ['production', 'sk_test_example', 'pk_test_example', 'whsec_example', false],
    ['preview', 'sk_live_example', 'pk_live_example', 'whsec_example', false],
    ['development', 'rk_test_example', 'pk_live_example', 'whsec_example', false],
    ['production', 'rk_live_example', 'pk_live_example', 'whsec_example', true],
    ['preview', 'rk_test_example', 'pk_test_example', 'whsec_example', true],
    ['production', 'sk_live_example', '', 'whsec_example', false],
    ['production', '', 'pk_live_example', 'whsec_example', false],
    ['production', 'rk_live_', 'pk_live_example', 'whsec_example', false],
    ['production', 'sk_live_example', 'pk_live_example', 'wrong-prefix', false],
  ]) {
    Object.assign(process.env, { VERCEL_ENV: environment, STRIPE_SECRET_KEY: secret, STRIPE_PUBLISHABLE_KEY: publishable, STRIPE_WEBHOOK_SECRET: webhook })
    assert.equal((await call()).body.ready, expected)
    if (!expected) assert.equal((await call(body())).body.error, 'stripe_not_configured')
  }
  assert.equal(emails.length, 0)
  assert.equal(store.values.size, 0)
})
test('rejects cross origin requests and unsupported payloads before sending', async () => {
  assert.equal((await call(body(), '', { headers: { host: 'localhost:5176', origin: 'https://attacker.example', 'content-type': 'application/json' } })).statusCode, 403)
  for (const input of [body({ amount: 1 }), body({ packageId: 'unknown' }), body({ packageId: 'inquiry' }), body({ packageId: 'notes' }), body({ interval: undefined }), body({ interval: 'quarterly' }), body({ interval: '__proto__' }), body({ authorityConfirmed: false }), body({ answers: {} }), body({ answers: { ...answers, amount: 1 } }), body({ company: 'bot' })]) assert.equal((await call(input)).statusCode, 400)
  assert.equal((await call(body({ offerVersion: 'old' }))).statusCode, 409)
  assert.equal(emails.length, 0)
})
test('checkout rejects unexplained other consequences before any email or engagement', async () => {
  for (const impactDetails of ['', '   ', 'x'.repeat(1501), 42]) assert.equal((await call(body({ answers: { ...answers, impacts: ['other'], impactDetails } }))).statusCode, 400)
  assert.equal(emails.length, 0); assert.equal(ledger().length, 0)
})
test('email verification is mandatory and failed codes cannot create an engagement', async () => {
  const challenge = await start()
  assert.equal(ledger().length, 0)
  assert.equal((await call({ action: 'verify-code', code: challenge.code })).body.error, 'code_expired')
  const wrong = challenge.code === '000000' ? '000001' : '000000'
  for (let index = 0; index < 5; index++) assert.equal((await call({ action: 'verify-code', code: wrong }, challenge.cookie)).body.error, 'code_invalid')
  assert.equal((await verify(challenge)).statusCode, 429)
  assert.equal(ledger().length, 0); assert.equal(stripeCalls.length, 0)
})
test('verified setup requests freeze the selected interval and scope without starting a trial, invoice or payment', async () => {
  for (const [interval, plan] of Object.entries(aiSubscriptionPlans)) {
    const challenge = await start(body({ interval, email: `${interval}@example.test` }))
    const response = await verify(challenge)
    assert.equal(response.statusCode, 200)
    const e = ledger().find(item => item.selfService.orderId === challenge.input.submissionId)
    assert.equal(e.amount, plan.amount)
    assert.equal(e.cadence, interval)
    assert.equal(e.state, 'issued')
    assert.equal(e.signature, undefined)
    assert.equal(e.invoices.length, 0)
    assert.equal(e.firstDue, '')
    assert.equal(e.nextDue, undefined)
    assert.equal(e.aiSubscription.plan, interval)
    assert.equal(e.aiSubscription.trialStart, undefined)
    assert.equal(e.aiSubscription.trialEnd, undefined)
    assert.equal(e.agreementHash, hash(e.agreement))
    assert.equal(e.title, aiPackages.assistant.name)
    assert.match(e.agreement, /AI CHATBOT AND PHONE AGENT SERVICE AGREEMENT/)
    assert.ok(e.agreement.includes(new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(plan.amount / 100)))
    assert.ok(!e.scope.includes('Included business website'))
    assert.deepEqual(e.selfService.answers, answers)
    assert.equal(e.selfService.packageId, 'assistant')
    assert.equal(e.selfService.orderId, challenge.input.submissionId)
    assert.equal(e.selfService.ownerNotification.state, 'sent')
    const notice = emails.find(item => item.subject === `AI service setup requested: ${e.client}` && item.text.includes(`Selected payment interval: ${interval}`))
    assert.deepEqual(notice.to, ['owner@example.test'])
    assert.match(notice.text, /No trial or payment has started/)
    assert.ok(notice.text.includes(`Amount after the free month: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(plan.amount / 100)}`))
    assert.ok(notice.text.includes(`http://localhost:5176/client-portal?engagement=${e.id}`))
    assert.equal(response.body.url, `/client-portal?engagement=${e.id}`)
    const session = await call(undefined, cookie(response), { dispatch: portal, url: '/api/client-portal' })
    assert.equal(session.body.authenticated, true)
    assert.equal(session.body.admin, false)
    assert.deepEqual(session.body.engagements.map(item => item.id), [e.id])
    assert.equal(stripeCalls.length, 0)
  }
})
test('a verified retry preserves an existing frozen setup agreement instead of rebuilding its terms', async () => {
  const challenge = await start(body({ interval: 'six_months' }))
  await verify(challenge)
  const [existing] = ledger()
  existing.scope = 'Previously issued immutable scope.'
  existing.agreement = 'Previously issued immutable agreement.'
  existing.agreementHash = hash(existing.agreement)
  existing.selfService.offerVersion = 'previous-issued-version'
  store.values.set('portal:engagements', JSON.stringify([existing]))
  assert.equal((await verify(challenge)).statusCode, 200)
  assert.deepEqual(ledger(), [existing])
})
test('signing and saving a payment card do not activate or charge a new subscription', async () => {
  const response = await verify(await start())
  const buyerCookie = cookie(response)
  const [e] = ledger()
  const portalCall = input => call(input, buyerCookie, { dispatch: portal, url: '/api/client-portal' })
  assert.equal((await portalCall({ action: 'sign', id: e.id, name: 'Buyer Name', consent: true, agreementHash: e.agreementHash })).statusCode, 200)
  allowPaymentMocks = true
  assert.equal((await portalCall({ action: 'setup-card', id: e.id })).body.url, 'https://checkout.stripe.com/test')
  assert.equal((await portalCall({ action: 'finish-setup', id: e.id, sessionId: 'cs_checkout_test' })).statusCode, 200)
  const [saved] = ledger()
  assert.equal(saved.aiSubscription.trialStart, undefined)
  assert.equal(saved.nextDue, undefined)
  assert.equal(saved.invoices.length, 0)
  assert.equal(saved.autopay?.enabled, undefined)
  assert.equal(stripeCalls.some(request => request.url.endsWith('/payment_intents')), false)
})
test('buying with the owner email cannot grant administrative privileges', async () => {
  const response = await verify(await start(body({ email: process.env.PORTAL_ADMIN_EMAIL })))
  const session = await call(undefined, cookie(response), { dispatch: portal, url: '/api/client-portal' })
  assert.equal(session.body.admin, false)
  const forbidden = await call({ action: 'create', title: 'Bad' }, cookie(response), { dispatch: portal, url: '/api/client-portal' })
  assert.equal(forbidden.statusCode, 404); assert.equal(ledger().length, 1)
})
test('a purchase session cannot read or act on other engagements for the same email', async () => {
  const response = await verify(await start())
  const [first] = ledger()
  const other = { ...structuredClone(first), id: randomUUID(), title: 'Another project' }
  store.values.set('portal:engagements', JSON.stringify([first, other]))
  const session = await call(undefined, cookie(response), { dispatch: portal, url: '/api/client-portal' })
  assert.deepEqual(session.body.engagements.map(item => item.id), [first.id])
  const attempt = await call({ action: 'sign', id: other.id, name: 'Buyer Name', consent: true, agreementHash: other.agreementHash }, cookie(response), { dispatch: portal, url: '/api/client-portal' })
  assert.equal(attempt.statusCode, 404)
  assert.equal(ledger()[1].signature, undefined)
})
test('repeated and concurrent verification creates only one setup agreement without an invoice', async () => {
  const challenge = await start(body({ interval: 'yearly' }))
  const responses = await Promise.all([verify(challenge), verify(challenge), verify(challenge)])
  assert.ok(responses.every(response => response.statusCode === 200))
  assert.equal(new Set(responses.map(response => response.body.url)).size, 1)
  assert.equal(ledger().length, 1); assert.equal(ledger()[0].invoices.length, 0); assert.equal(ledger()[0].amount, aiSubscriptionPlans.yearly.amount)
  assert.equal(emails.filter(item => item.subject.startsWith('AI service setup requested:')).length, 1)
})
test('verified proof survives ledger and session write failures without duplicate orders', async () => {
  const challenge = await start()
  failLedgerOnce = true
  assert.equal((await verify(challenge)).statusCode, 503)
  failSessionOnce = true
  assert.equal((await verify(challenge)).statusCode, 503)
  assert.equal((await verify(challenge)).statusCode, 200)
  assert.equal(ledger().length, 1)
  assert.equal(emails.length, 2, 'One verification code and one setup notice survive the retries.')
  assert.equal(emails.filter(item => item.subject.startsWith('AI service setup requested:')).length, 1)
})
test('another verified buyer cannot reuse an existing order identity', async () => {
  const first = await start(); await verify(first)
  const second = await start(body({ submissionId: first.input.submissionId, email: 'other@example.test' }))
  assert.equal((await verify(second)).body.error, 'submission_conflict')
  assert.equal(ledger().length, 1)
})
test('expired checkout proof is rejected even after successful verification', async () => {
  const challenge = await start(); await verify(challenge)
  const key = [...store.values.keys()].find(key => key.startsWith('portal:checkout:pending:'))
  const pending = JSON.parse(store.values.get(key)); pending.exp = Math.floor(Date.now() / 1000) - 1; store.values.set(key, JSON.stringify(pending))
  assert.equal((await verify(challenge)).body.error, 'code_expired')
})
test('email transport errors never create an engagement or report success', async () => {
  failEmail = true
  assert.equal((await call(body())).body.error, 'email_unavailable')
  assert.equal(ledger().length, 0)
})
test('email cooldown prevents repeated sends and purchase code cannot sign or pay', async () => {
  const challenge = await start()
  assert.equal((await call(challenge.input)).statusCode, 429)
  const response = await verify(challenge)
  const e = ledger()[0]
  const payment = await call({ action: 'setup-card', id: e.id }, cookie(response), { dispatch: portal, url: '/api/client-portal' })
  assert.equal(payment.body.error, 'signature_required')
  assert.equal(e.signature, undefined); assert.equal(stripeCalls.length, 0)
})
test('a previously issued legacy package still signs and pays its frozen terms with the original paid-project handoff', async () => {
  const impactDetails = 'Customers repeat their requests.\nWe lose the previous conversation.'
  const legacy = legacyAiPackages.inquiry
  const e = draft({ client: 'Existing Buyer Company', email: 'buyer@example.test', title: legacy.name,
    scope: `${legacy.scope.join('\n')}\nIncluded business website: ${aiOffer.websiteScope}.`,
    exclusions: legacy.boundary, delivery: legacy.delivery,
    amount: legacy.price * 100, cadence: 'once', firstDue: new Date().toISOString().slice(0, 10),
  }, 'Historical fixture')
  e.selfService = { orderId: randomUUID(), packageId: 'inquiry', offerVersion: '2026-11-02-3', buyerName: 'Buyer Name', answers: { ...answers, impacts: ['other', 'delay'], impactDetails }, fingerprint: 'frozen-legacy-order' }
  changeLedger([e], { action: 'issue', id: e.id }, { email: 'owner@example.test', admin: true })
  store.values.set('portal:engagements', JSON.stringify([e]))
  const buyerCookie = String(await createPurchaseSession(e.email, e.id, 'http://localhost:5176')).split(';')[0]
  assert.equal(e.selfService.answers.impactDetails, impactDetails)
  const portalCall = input => call(input, buyerCookie, { dispatch: portal, url: '/api/client-portal' })
  const signed = await portalCall({ action: 'sign', id: e.id, name: 'Buyer Name', consent: true, agreementHash: e.agreementHash })
  assert.equal(signed.statusCode, 200)
  assert.equal(ledger()[0].signature.hash, e.agreementHash)
  assert.equal(ledger()[0].invoices[0].status, 'open')
  assert.equal(emails.length, 0, 'Signing a legacy agreement does not send a paid project')
  allowPaymentMocks = true
  const setup = await portalCall({ action: 'setup-card', id: e.id })
  assert.equal(setup.body.url, 'https://checkout.stripe.com/test')
  assert.equal((await portalCall({ action: 'finish-setup', id: e.id, sessionId: 'cs_checkout_test' })).statusCode, 200)
  assert.equal(ledger()[0].invoices[0].status, 'open', 'Saving a card is not a payment')
  const invoiceId = e.invoices[0].id
  const { quote } = (await portalCall({ action: 'quote', id: e.id, invoiceId })).body
  assert.equal(quote.total, legacyAiPackages.inquiry.price * 100); assert.equal(quote.fee, 0)
  const charge = { action: 'pay', id: e.id, invoiceId, total: quote.total, consent: true }
  assert.equal((await portalCall({ ...charge, consent: false })).statusCode, 409)
  assert.equal(stripeCalls.some(call => call.url.endsWith('/payment_intents')), false)
  const paid = await portalCall(charge)
  assert.equal(paid.statusCode, 200); assert.equal(paid.body.status, 'succeeded')
  const saved = ledger()[0]
  assert.equal(saved.invoices[0].status, 'paid'); assert.equal(saved.invoices[0].method, 'stripe'); assert.equal(saved.selfService.ownerNotification.state, 'sent')
  assert.equal(emails.length, 1); assert.deepEqual(emails[0].to, [process.env.PORTAL_ADMIN_EMAIL])
  assert.ok(emails[0].text.includes('Website and Gmail')); assert.ok(emails[0].text.includes(e.id)); assert.ok(emails[0].text.includes('agreement is signed'))
  assert.ok(emails[0].text.includes(impactDetails))
  assert.equal((await portalCall(charge)).statusCode, 409)
  assert.equal(stripeCalls.filter(call => call.url.endsWith('/payment_intents')).length, 1)
})
test('a sandbox purchase proof cannot create an agreement or a session in production', async t => {
  const priorMode = process.env.VERCEL_ENV
  t.after(() => {
    if (priorMode === undefined) delete process.env.VERCEL_ENV
    else process.env.VERCEL_ENV = priorMode
  })
  process.env.VERCEL_ENV = 'preview'
  const sandbox = await start()
  assert.equal((await verify(sandbox)).statusCode, 200)
  const sandboxLedger = store.values.get('portal:engagements')
  Object.assign(process.env, { VERCEL_ENV: 'production', STRIPE_SECRET_KEY: 'sk_live_fake', STRIPE_PUBLISHABLE_KEY: 'pk_live_fake' })
  const replay = await verify(sandbox)
  assert.equal(replay.body.error, 'code_expired')
  assert.equal(replay.headers['set-cookie'], undefined)
  assert.equal(store.values.has('portal:live:engagements'), false)

  const fresh = await start()
  const purchase = await verify(fresh)
  assert.equal(purchase.statusCode, 200)
  const liveLedger = JSON.parse(store.values.get('portal:live:engagements'))
  assert.equal(liveLedger.length, 1)
  assert.equal(liveLedger[0].selfService.orderId, fresh.input.submissionId)
  assert.equal(store.values.get('portal:engagements'), sandboxLedger)
  assert.equal(stripeCalls.length, 0)
})
