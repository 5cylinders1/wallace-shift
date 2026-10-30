import assert from 'node:assert/strict'
import { beforeEach, after, test } from 'node:test'
import { createHmac } from 'node:crypto'
import { Readable } from 'node:stream'
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { pathToFileURL, fileURLToPath } from 'node:url'
import ts from 'typescript'
import { createAgreementTestStore } from './demo-agreement-test-store.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))
const temporary = await mkdtemp(join(tmpdir(), 'wallace-portal-test-'))
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
const { default: handler } = await load('api/_lib/client-portal-handler.ts')
const { default: deployedHandler, config: deployedConfig } = await load('api/demo-admin.ts')
const { draft, changeLedger, generateDueInvoices } = await load('api/_lib/portal-ledger.ts')
const { mutateLedger } = await load('api/_lib/portal-store.ts')
const { hash, ownerEmail } = await load('api/_lib/portal-auth.ts')
const { nextDueDate, createInvoice } = await load('src/client-portal/model.ts')
const { surchargeBps, verifyWebhook, charge, reconcileIntent, resetFailedPayment } = await load('api/_lib/portal-stripe.ts')
const savedEnv = { ...process.env }; const savedFetch = globalThis.fetch
let store, stripeCalls, stripeResult, deliveredEmails, failStripe
const owner = { email: 'owner@example.test', admin: true }
const client = { email: 'client@example.test', admin: false }
const adminToken = 'a'.repeat(64), clientToken = 'b'.repeat(64), strangerToken = 'c'.repeat(64)
const today = new Date().toISOString().slice(0, 10)
const card = { id: 'pm_test', customer: 'cus_test', type: 'card', card: { funding: 'credit', brand: 'visa', last4: '4242', country: 'US' }, billing_details: { address: { country: 'US', state: 'KS' } } }
function engagement(cadence = 'once', signed = true) {
  const e = draft({ client: 'Example client', email: client.email, title: 'Test project', scope: 'A defined test deliverable.', exclusions: 'Hosting is billed separately.', delivery: 'Acceptance by written review.', amount: 10000, cadence, firstDue: today }, owner.email)
  changeLedger([e], { action: 'issue', id: e.id }, owner)
  if (signed) changeLedger([e], { action: 'sign', id: e.id, name: 'Test Signer', consent: true, agreementHash: e.agreementHash }, client)
  e.stripeCustomer = 'cus_test'; e.paymentMethod = 'pm_test'; return e
}
function phased(initialDue = today, recurringDue = today, endDate = '') {
  const e = draft({ client: 'Example client', email: client.email, title: 'Setup and support', scope: 'Initial setup and recurring support.', exclusions: 'Hosting excluded.', delivery: 'Client review.', amount: 45000, cadence: 'monthly', firstDue: recurringDue, endDate, initialPayment: { amount: 120000, due: initialDue } }, owner.email)
  changeLedger([e], { action: 'issue', id: e.id }, owner)
  changeLedger([e], { action: 'sign', id: e.id, name: 'Test Signer', consent: true, agreementHash: e.agreementHash }, client)
  e.stripeCustomer = 'cus_test'; e.paymentMethod = 'pm_test'; return e
}
const save = entries => store.values.set('portal:engagements', JSON.stringify(entries))
const ledger = () => JSON.parse(store.values.get('portal:engagements') ?? '[]')
beforeEach(() => {
  Object.assign(process.env, { DEMO_AUDIT_REDIS_URL: 'https://redis.example.test', DEMO_AUDIT_REDIS_TOKEN: 'fake', PORTAL_ADMIN_EMAIL: owner.email, STRIPE_SECRET_KEY: 'sk_test_fake', STRIPE_PUBLISHABLE_KEY: 'pk_test_fake', STRIPE_WEBHOOK_SECRET: 'whsec_fake', RESEND_API_KEY: 'fake', CONTACT_FROM_EMAIL: 'billing@example.test', PORTAL_ZELLE_INSTRUCTIONS: 'Use the verified test instructions.', PORTAL_SURCHARGE_APPROVED: 'true', PORTAL_CARD_COST_BPS: '300', PORTAL_SURCHARGE_CAP_BPS: '300', PORTAL_SURCHARGE_STATES: 'KS' })
  store = createAgreementTestStore(); stripeCalls = []; stripeResult = undefined; deliveredEmails = []; failStripe = false
  for (const [token, email] of [[adminToken, owner.email], [clientToken, client.email], [strangerToken, 'stranger@example.test']]) store.values.set(`portal:session:${hash(token)}`, JSON.stringify({ email }))
  globalThis.fetch = async (url, init) => {
    if (String(url).startsWith('https://redis.example.test')) {
      if (new URL(url).pathname === '/pipeline') return store.fetch(url, init)
      const command = JSON.parse(init.body); const [verb, key, value] = command
      if (verb === 'GET') return Response.json({ result: store.values.get(key) ?? null })
      if (verb === 'SET') { store.values.set(key, value); return Response.json({ result: 'OK' }) }
      if (verb === 'DEL') { store.values.delete(key); return Response.json({ result: 1 }) }
      if (verb === 'EVAL') {
        const [, , , ledgerKey, before, next] = command
        if ((store.values.get(ledgerKey) ?? '[]') !== before) return Response.json({ result: 0 })
        store.values.set(ledgerKey, next); return Response.json({ result: 1 })
      }
      throw new Error(`Unexpected Redis operation: ${verb}`)
    }
    if (url === 'https://api.resend.com/emails') { deliveredEmails.push(JSON.parse(init.body)); return Response.json({ id: 'test-email' }) }
    if (String(url).startsWith('https://api.stripe.com/v1/')) {
      stripeCalls.push({ url, init }); const path = String(url).split('/v1/')[1]
      if (path === 'payment_methods/pm_test') return Response.json(card)
      if (failStripe) throw new Error('Simulated lost network response')
      if (path === 'payment_intents') {
        const params = new URLSearchParams(init.body)
        const intent = { ...stripeResult, id: `pi_test${params.get('metadata[attempt]').replaceAll('-', '')}`, customer: 'cus_test', amount: Number(params.get('amount')), currency: 'usd', metadata: { engagement: params.get('metadata[engagement]'), invoice: params.get('metadata[invoice]'), attempt: params.get('metadata[attempt]') }, status: stripeResult?.status ?? 'succeeded' }
        stripeResult = intent
        return Response.json(intent)
      }
      if (path.startsWith('payment_intents/pi_test')) return Response.json(stripeResult)
      throw new Error(`Unexpected Stripe path: ${path}`)
    }
    throw new Error(`Unexpected network access: ${url}`)
  }
})
after(async () => { globalThis.fetch = savedFetch; for (const key of Object.keys(process.env)) if (!Object.hasOwn(savedEnv, key)) delete process.env[key]; Object.assign(process.env, savedEnv); await rm(temporary, { recursive: true, force: true }) })
async function call(body, token = clientToken, options = {}) {
  const req = { url: '/api/client-portal', method: body ? 'POST' : 'GET', socket: { remoteAddress: '127.0.0.1' }, headers: { host: 'localhost:5176', origin: 'http://localhost:5176', 'content-type': 'application/json', cookie: `wallace_client_session=${token}` }, body: body ? JSON.stringify(body) : undefined, ...options }
  const response = { headers: {}, statusCode: 200, setHeader(key, value) { this.headers[key] = value }, end(value) { this.body = JSON.parse(value) } }
  await (options.dispatch ?? handler)(req, response); return response
}
test('deployed rewrite shares existing function and preserves raw webhook bytes', async () => {
  const config = JSON.parse(await readFile(join(root, 'vercel.json'), 'utf8'))
  assert.equal(config.rewrites.find(rule => rule.source === '/api/client-portal').destination, '/api/demo-admin?portal=client')
  assert.equal(deployedConfig.api.bodyParser, false)
  assert.ok(config.crons.some(cron => cron.path === '/api/client-portal?action=cron'))
  save([engagement()])
  const response = await call(undefined, clientToken, { url: '/api/demo-admin?portal=client', dispatch: deployedHandler })
  assert.equal(response.statusCode, 200); assert.equal(response.body.engagements.length, 1)
})
test('deployed owner sign in accepts Vercel parsed JSON and reuses the demo owner', async () => {
  delete process.env.PORTAL_ADMIN_EMAIL
  process.env.DEMO_ADMIN_EMAIL = owner.email
  const response = await call({ action: 'send-code', email: owner.email }, '', {
    url: '/api/demo-admin?portal=client', dispatch: deployedHandler,
    body: { action: 'send-code', email: owner.email },
  })
  assert.equal(response.statusCode, 200)
  assert.equal(deliveredEmails.length, 1)
  assert.deepEqual(deliveredEmails[0].to, [owner.email])
  assert.equal((await call(undefined, adminToken)).body.admin, true)
})
test('owner configuration respects explicit override and contact fallback without accepting malformed overrides', () => {
  process.env.DEMO_ADMIN_EMAIL = 'demo@example.test'
  assert.equal(ownerEmail(), owner.email)
  delete process.env.PORTAL_ADMIN_EMAIL
  assert.equal(ownerEmail(), 'demo@example.test')
  delete process.env.DEMO_ADMIN_EMAIL
  process.env.CONTACT_TO_EMAIL = 'contact@example.test'
  assert.equal(ownerEmail(), 'contact@example.test')
  process.env.PORTAL_ADMIN_EMAIL = 'invalid-address'
  assert.throws(ownerEmail, /portal_not_configured/)
  delete process.env.PORTAL_ADMIN_EMAIL; delete process.env.CONTACT_TO_EMAIL
  assert.throws(ownerEmail, /portal_not_configured/)
})
test('parsed JSON requests retain validation and body limits', async () => {
  const oversized = await call({}, '', { body: { action: 'send-code', email: owner.email, extra: 'x'.repeat(65536) } })
  assert.equal(oversized.statusCode, 413)
  assert.equal((await call({}, '', { body: ['send-code'] })).statusCode, 400)
  assert.equal((await call({}, '', { body: null })).statusCode, 400)
  assert.equal(deliveredEmails.length, 0)
})
test('Stripe uses restored raw stream when Vercel exposes a parsed body', async () => {
  const raw = '{ "type": "account.updated", "data": { "object": { "id": "acct_test" } } }\n'
  const timestamp = Math.floor(Date.now() / 1000)
  const signature = createHmac('sha256', process.env.STRIPE_WEBHOOK_SECRET).update(`${timestamp}.${raw}`).digest('hex')
  for (const [wire, status] of [[raw, 200], [JSON.stringify(JSON.parse(raw)), 400]]) {
    const stream = Readable.from([Buffer.from(wire)])
    const response = await call({}, '', {
      url: '/api/demo-admin?portal=client&action=webhook', dispatch: deployedHandler,
      body: JSON.parse(raw), on: stream.on.bind(stream),
      headers: { 'stripe-signature': `t=${timestamp},v1=${signature}` },
    })
    assert.equal(response.statusCode, status)
  }
  assert.equal((await call({}, '', { url: '/api/client-portal?action=webhook', body: JSON.parse(raw) })).body.error, 'raw_body_required')
})
test('missing email configuration fails before consuming verification budgets', async () => {
  delete process.env.RESEND_API_KEY
  const response = await call({ action: 'send-code', email: owner.email }, '')
  assert.equal(response.body.error, 'email_not_configured')
  assert.equal([...store.values.keys()].some(key => key.startsWith('client-portal:')), false)
  assert.equal(deliveredEmails.length, 0)
})
test('email transport failure returns an actionable sign in error', async () => {
  const configuredFetch = globalThis.fetch
  globalThis.fetch = (url, init) => {
    if (url === 'https://api.resend.com/emails') throw new Error('Simulated transport failure')
    return configuredFetch(url, init)
  }
  const response = await call({ action: 'send-code', email: owner.email }, '')
  assert.equal(response.statusCode, 503)
  assert.equal(response.body.error, 'email_unavailable')
})
test('private access and role boundaries: no anonymous or other-client record leakage', async () => {
  const e = engagement(); save([e])
  const anonymous = await call(undefined, '')
  assert.equal(anonymous.body.authenticated, false)
  assert.equal(anonymous.headers['cache-control'], 'private, no-store, max-age=0')
  assert.equal((await call(undefined, strangerToken)).body.engagements.length, 0)
  assert.equal((await call({ action: 'sign', id: e.id }, strangerToken)).statusCode, 404)
  assert.equal((await call({ action: 'issue', id: e.id })).statusCode, 403)
  const visible = (await call()).body.engagements[0]
  assert.equal(visible.stripeCustomer, undefined); assert.equal(visible.paymentMethod, undefined)
})
test('cross-origin mutation and unsigned payments fail closed', async () => {
  const e = engagement('once', false); save([e])
  assert.equal((await call({ action: 'pay', id: e.id, invoiceId: e.invoices[0].id, consent: true, total: 10300 })).statusCode, 409)
  assert.equal((await call({ action: 'record-payment', id: e.id, invoiceId: e.invoices[0].id, confirmed: true, amount: 10000, method: 'cash', reference: 'Receipt' }, adminToken)).statusCode, 409)
  const response = await call({ action: 'cancel', id: e.id }, clientToken, { headers: { host: 'localhost:5176', origin: 'https://attacker.test', 'content-type': 'application/json' } })
  assert.equal(response.statusCode, 403)
})
test('signatures bind exact terms, identity and timestamp and cannot be overwritten', () => {
  const e = engagement('once', false)
  assert.throws(() => changeLedger([e], { action: 'sign', id: e.id, consent: true, name: 'Signer', agreementHash: 'outdated' }, client))
  changeLedger([e], { action: 'sign', id: e.id, consent: true, name: 'Signer', agreementHash: e.agreementHash }, client)
  assert.equal(e.signature.email, client.email); assert.equal(e.signature.hash, hash(e.agreement)); assert.ok(e.signature.at)
  assert.throws(() => changeLedger([e], { action: 'sign', id: e.id, consent: true, name: 'Replacement', agreementHash: e.agreementHash }, client))
  assert.match(e.agreement, /Governing law: Kansas/)
})
test('offline report never marks paid; only an owner can confirm full receipt', async () => {
  const e = engagement(); save([e]); const base = { id: e.id, invoiceId: e.invoices[0].id, method: 'zelle', reference: 'Test transaction' }
  assert.equal((await call({ ...base, action: 'report-payment' })).statusCode, 200)
  assert.equal(ledger()[0].invoices[0].status, 'open')
  assert.equal((await call({ ...base, action: 'record-payment', confirmed: true, amount: 10000 })).statusCode, 403)
  assert.equal((await call({ ...base, action: 'record-payment', confirmed: true, amount: 9999 }, adminToken)).statusCode, 400)
  assert.equal((await call({ ...base, action: 'record-payment', confirmed: true, amount: 10000 }, adminToken)).statusCode, 200)
  assert.equal(ledger()[0].invoices[0].receivedBy, owner.email)
})
test('recurring invoices reject offline methods and calendar drift', () => {
  const e = engagement('monthly')
  assert.throws(() => changeLedger([e], { action: 'report-payment', id: e.id, invoiceId: e.invoices[0].id, method: 'cash', reference: 'cash' }, client))
  assert.equal(nextDueDate('2028-01-31', 'monthly', '2028-01-31'), '2028-02-29')
  assert.equal(nextDueDate('2028-02-29', 'monthly', '2028-01-31'), '2028-03-31')
  assert.equal(nextDueDate('2028-02-29', 'yearly', '2028-02-29'), '2029-02-28')
  assert.equal(nextDueDate(today, 'once', today), undefined)
})
test('surcharge is credit-only, jurisdiction gated, and capped by actual cost', () => {
  assert.equal(surchargeBps(card), 300)
  for (const funding of ['debit', 'prepaid', 'unknown']) assert.equal(surchargeBps({ ...card, card: { ...card.card, funding } }), 0)
  assert.equal(surchargeBps({ ...card, billing_details: { address: { country: 'US', state: 'MA' } } }), 0)
  process.env.PORTAL_CARD_COST_BPS = '250'; assert.equal(surchargeBps(card), 250)
  process.env.PORTAL_SURCHARGE_APPROVED = 'false'; assert.equal(surchargeBps(card), 0)
})
test('recurring generation requires signature and authorization, respects end dates and open balances', () => {
  const e = engagement('monthly'); e.nextDue = today; e.invoices[0].status = 'paid'
  assert.equal(generateDueInvoices([e], today), 0)
  e.autopay = { enabled: true, feeBps: 300 }; e.invoices = []
  assert.equal(generateDueInvoices([e], today), 1)
  assert.equal(generateDueInvoices([e], '2099-01-01'), 0)
  e.invoices[0].status = 'paid'; e.endDate = today
  assert.equal(generateDueInvoices([e], '2099-01-01'), 0)
  changeLedger([e], { action: 'cancel', id: e.id }, client)
  assert.equal(e.autopay.enabled, false); assert.equal(e.nextDue, undefined)
  assert.equal(generateDueInvoices([e], '2099-01-01'), 0)
})
test('atomic storage preserves concurrent updates', async () => {
  const e = engagement(); save([e])
  await Promise.all([mutateLedger(entries => { entries[0].audit.push({ action: 'first' }) }), mutateLedger(entries => { entries[0].audit.push({ action: 'second' }) })])
  assert.ok(ledger()[0].audit.some(v => v.action === 'first')); assert.ok(ledger()[0].audit.some(v => v.action === 'second'))
})
test('server ignores client prices and requires explicit fee consent', async () => {
  const e = engagement(); save([e]); const base = { action: 'pay', id: e.id, invoiceId: e.invoices[0].id }
  assert.equal((await call({ ...base, consent: false, total: 10300 })).statusCode, 409)
  assert.equal((await call({ ...base, consent: true, total: 100 })).statusCode, 409)
  assert.equal(stripeCalls.filter(v => v.url.endsWith('/payment_intents')).length, 0)
  assert.equal((await call({ ...base, consent: true, total: 10300 })).statusCode, 200)
  assert.equal(ledger()[0].invoices[0].status, 'paid')
  assert.equal(ledger()[0].invoices[0].fee, 300)
  assert.equal((await call({ ...base, consent: true, total: 10300 })).statusCode, 409)
})
test('uncertain retries share one Stripe idempotency key', async () => {
  const e = engagement(); save([e]); failStripe = true
  await assert.rejects(charge(e, e.invoices[0], 'http://localhost:5176', false, 300))
  failStripe = false
  const pending = ledger()[0]
  await charge(pending, pending.invoices[0], 'http://localhost:5176', false, 300)
  const attempts = stripeCalls.filter(v => v.url.endsWith('/payment_intents'))
  assert.equal(attempts.length, 2); assert.equal(attempts[0].init.headers['Idempotency-Key'], attempts[1].init.headers['Idempotency-Key'])
  assert.equal(ledger()[0].invoices[0].status, 'paid')
})
test('concurrent payment requests use the same reserved Stripe attempt', async () => {
  const e = engagement(); save([e])
  await Promise.allSettled([charge(e, e.invoices[0], 'http://localhost:5176', false), charge(e, e.invoices[0], 'http://localhost:5176', false)])
  const attempts = stripeCalls.filter(v => v.url.endsWith('/payment_intents'))
  assert.ok(attempts.length > 0)
  assert.equal(new Set(attempts.map(v => v.init.headers['Idempotency-Key'])).size, 1)
  assert.equal(ledger()[0].invoices[0].status, 'paid')
})
test('scheduled recurring authorization does not charge early and cron rejects missing secret', async () => {
  const e = engagement('monthly'); e.invoices[0].due = '2099-01-01'; save([e])
  const response = await call({ action: 'pay', id: e.id, invoiceId: e.invoices[0].id, consent: true, total: 10300 })
  assert.equal(response.statusCode, 200); assert.equal(response.body.scheduled, true)
  assert.equal(ledger()[0].autopay.enabled, true)
  assert.equal(stripeCalls.filter(v => v.url.endsWith('/payment_intents')).length, 0)
  assert.equal((await call(undefined, '', { url: '/api/client-portal?action=cron' })).statusCode, 403)
})
test('future payment reauthorization works between invoices without making a charge', async () => {
  const e = engagement('monthly'); e.invoices[0].status = 'paid'; save([e])
  const response = await call({ action: 'authorize', id: e.id, consent: true, total: 10300 })
  assert.equal(response.statusCode, 200); assert.equal(response.body.scheduled, true)
  assert.equal(ledger()[0].autopay.enabled, true)
  assert.equal(stripeCalls.filter(v => v.url.endsWith('/payment_intents')).length, 0)
})
test('canceling a recurring plan preserves payment of balances without restarting automatic billing', async () => {
  const e = engagement('monthly'); changeLedger([e], { action: 'cancel', id: e.id }, client); save([e])
  assert.equal((await call({ action: 'pay', id: e.id, invoiceId: e.invoices[0].id, consent: true, total: 10300 })).statusCode, 200)
  assert.equal(ledger()[0].state, 'canceled'); assert.notEqual(ledger()[0].autopay?.enabled, true)
  assert.equal(ledger()[0].invoices[0].status, 'paid')
})
test('uncertain attempt older than Stripe retention is blocked instead of double charging', async () => {
  const e = engagement(); save([e]); failStripe = true
  await assert.rejects(charge(e, e.invoices[0], 'http://localhost:5176', false))
  const pending = ledger()[0]; pending.invoices[0].attempt.startedAt = '2020-01-01T00:00:00Z'; save([pending]); failStripe = false
  await assert.rejects(charge(pending, pending.invoices[0], 'http://localhost:5176', false), /payment_needs_reconciliation/)
})
test('declined payments stay unpaid; stale events cannot bind to a new attempt', async () => {
  const e = engagement(); save([e]); stripeResult = { status: 'requires_payment_method' }
  await charge(e, e.invoices[0], 'http://localhost:5176', false)
  assert.equal(ledger()[0].invoices[0].status, 'processing')
  const declined = ledger()[0]; await resetFailedPayment(declined, declined.invoices[0])
  const fresh = ledger()[0]; fresh.invoices[0].attempt = { id: 'new-attempt', fee: 300 }; save([fresh])
  await reconcileIntent({ ...stripeResult, status: 'succeeded' })
  assert.equal(ledger()[0].invoices[0].status, 'open'); assert.equal(ledger()[0].invoices[0].paymentIntent, undefined)
})
test('webhook verification rejects wrong secrets, stale payloads and tampered bytes', () => {
  const now = Date.now(); const timestamp = Math.floor(now / 1000); const raw = '{"type":"payment_intent.succeeded"}'
  const signature = createHmac('sha256', 'secret').update(`${timestamp}.${raw}`).digest('hex')
  verifyWebhook(raw, `t=${timestamp},v1=${signature}`, 'secret', now)
  assert.throws(() => verifyWebhook(`${raw} `, `t=${timestamp},v1=${signature}`, 'secret', now))
  assert.throws(() => verifyWebhook(raw, `t=${timestamp},v1=${signature}`, 'wrong', now))
  assert.throws(() => verifyWebhook(raw, `t=${timestamp},v1=${signature}`, 'secret', now + 301000))
})
test('passwordless sign in sends only to known accounts, codes are single use, logout revokes sessions', async () => {
  save([engagement()])
  const sent = await call({ action: 'send-code', email: client.email }, '')
  assert.equal(sent.statusCode, 200); assert.equal(deliveredEmails.length, 1)
  const code = deliveredEmails[0].text.match(/\b\d{6}\b/)[0]
  const pendingCookie = sent.headers['set-cookie'].split(';')[0]
  const headers = { host: 'localhost:5176', origin: 'http://localhost:5176', 'content-type': 'application/json', cookie: pendingCookie }
  const verified = await call({ action: 'verify-code', code }, '', { headers })
  assert.equal(verified.statusCode, 200)
  assert.equal((await call({ action: 'verify-code', code }, '', { headers })).statusCode, 400)
  const cookie = verified.headers['set-cookie'][0].split(';')[0]
  assert.equal((await call(undefined, '', { headers: { ...headers, cookie } })).body.authenticated, true)
  await call({ action: 'logout' }, '', { headers: { ...headers, cookie } })
  assert.equal((await call(undefined, '', { headers: { ...headers, cookie } })).body.authenticated, false)
  const unknown = await call({ action: 'send-code', email: 'unknown@example.test' }, '')
  assert.equal(unknown.statusCode, 200); assert.equal(deliveredEmails.length, 1)
})

test('initial payment has independent terms, invoice identity, and calendar anchor', () => {
  const e = phased(today, '2099-01-31', '2099-04-30')
  assert.deepEqual(e.invoices.map(i => [i.kind, i.amount, i.due]), [['initial', 120000, today], ['recurring', 45000, '2099-01-31']])
  assert.equal(e.nextDue, '2099-02-28')
  assert.match(e.agreement, /1,200.00/); assert.match(e.agreement, /450.00/)
  assert.match(e.agreement, /2099-01-31/); assert.match(e.agreement, /2099-04-30/)
  assert.equal(e.signature.hash, hash(e.agreement))
  assert.equal(new Set(phased().invoices.map(i => i.id)).size, 2)
  const legacy = engagement('monthly'); delete legacy.invoices[0].kind
  assert.equal(legacy.invoices[0].id, createInvoice(legacy, today).id)
  assert.equal(legacy.initialPayment, undefined)
})
test('draft rejects invalid initial amounts and dates and reversed recurring dates', () => {
  const body = { ...phased(), state: undefined }
  for (const initialPayment of [null, [], { amount: 0, due: today }, { amount: 49, due: today }, { amount: 1.5, due: today }, { amount: 100000001, due: today }, { amount: 100, due: '2020-01-01' }, { amount: 100, due: '2099-01-01' }, { amount: 100, due: '2027-02-30' }]) {
    assert.throws(() => draft({ ...body, initialPayment }, owner.email))
  }
  assert.throws(() => draft({ ...body, cadence: 'once' }, owner.email))
  assert.throws(() => draft({ ...body, firstDue: '2099-01-31', endDate: '2099-01-30' }, owner.email))
  assert.equal(draft({ ...body, initialPayment: undefined }, owner.email).invoices.length, 0)
})
test('each phase is quoted separately and both totals require consent before payment', async () => {
  const e = phased(today, '2099-01-31'); save([e])
  const initialQuote = (await call({ action: 'quote', id: e.id, invoiceId: e.invoices[0].id })).body.quote
  const recurringQuote = (await call({ action: 'quote', id: e.id, invoiceId: e.invoices[1].id })).body.quote
  assert.equal(initialQuote.total, 123600); assert.equal(initialQuote.fee, 3600)
  assert.equal(initialQuote.recurringTotal, 46350); assert.equal(initialQuote.invoiceId, e.invoices[0].id)
  assert.equal(recurringQuote.total, 46350); assert.equal(recurringQuote.fee, 1350)
  const body = { action: 'pay', id: e.id, invoiceId: e.invoices[0].id, consent: true, total: 123600, initialTotal: 123600, recurringTotal: 46350 }
  assert.equal((await call({ ...body, recurringTotal: 45000 })).body.error, 'quote_changed')
  assert.equal((await call({ ...body, invoiceId: e.invoices[1].id, total: 46350 })).body.error, 'earlier_invoice_required')
  assert.equal((await call(body)).statusCode, 200)
  const saved = ledger()[0]
  assert.deepEqual(saved.invoices.map(i => [i.status, i.fee]), [['paid', 3600], ['open', 0]])
  assert.equal(saved.autopay.agreementHash, e.agreementHash)
  assert.match(saved.autopay.consent, /1,236.00/); assert.match(saved.autopay.consent, /463.50/)
  assert.match(saved.autopay.consent, /2099-01-31/)
  assert.equal((await call({ action: 'run-billing' }, adminToken)).body.attempted, 0)
})
test('future initial payment authorizes both phases without charging early', async () => {
  const e = phased('2099-01-01', '2099-02-01'); save([e])
  const result = await call({ action: 'pay', id: e.id, invoiceId: e.invoices[0].id, consent: true, total: 123600, initialTotal: 123600, recurringTotal: 46350 })
  assert.equal(result.body.scheduled, true)
  assert.equal(ledger()[0].autopay.enabled, true)
  assert.equal((await call({ action: 'run-billing' }, adminToken)).body.attempted, 0)
  assert.equal(stripeCalls.filter(v => v.url.endsWith('/payment_intents')).length, 0)
  await assert.rejects(charge(ledger()[0], ledger()[0].invoices[0], 'http://localhost:5176', true), /payment_not_ready/)
})
test('billing settles initial then recurring on the same day with distinct idempotency keys', async () => {
  const e = phased(today, today, today)
  e.autopay = { enabled: true, feeBps: 300, agreementHash: e.agreementHash }; save([e])
  const result = await call({ action: 'run-billing' }, adminToken)
  assert.equal(result.body.attempted, 2); assert.deepEqual(result.body.failed, [])
  const attempts = stripeCalls.filter(v => v.url.endsWith('/payment_intents'))
  assert.deepEqual(attempts.map(v => Number(new URLSearchParams(v.init.body).get('amount'))), [123600, 46350])
  assert.equal(new Set(attempts.map(v => v.init.headers['Idempotency-Key'])).size, 2)
  assert.ok(ledger()[0].invoices.every(i => i.status === 'paid'))
  assert.equal((await call({ action: 'run-billing' }, adminToken)).body.attempted, 0)
})
test('initial failure blocks recurring charges and old generic authorization cannot cover initial payments', async () => {
  const e = phased(); e.autopay = { enabled: true, feeBps: 300 }; save([e])
  assert.deepEqual((await call({ action: 'run-billing' }, adminToken)).body.failed, [e.id])
  assert.equal(stripeCalls.filter(v => v.url.endsWith('/payment_intents')).length, 0)
  e.autopay.agreementHash = e.agreementHash; save([e]); stripeResult = { status: 'requires_payment_method' }
  assert.equal((await call({ action: 'run-billing' }, adminToken)).body.attempted, 1)
  assert.deepEqual(ledger()[0].invoices.map(i => i.status), ['processing', 'open'])
  assert.equal((await call({ action: 'run-billing' }, adminToken)).body.attempted, 0)
})
test('inclusive recurring end date stops generation and overdue automatic attempts after it', async () => {
  const e = engagement('monthly'); e.endDate = today; e.autopay = { enabled: true, feeBps: 300 }
  e.invoices = []; e.nextDue = today
  assert.equal(generateDueInvoices([e], today), 1)
  assert.equal(generateDueInvoices([e], '2099-01-01'), 0)
  // An already-issued unpaid invoice remains payable, but must not auto-charge past the end.
  e.endDate = '2020-01-01'; save([e])
  assert.equal((await call({ action: 'run-billing' }, adminToken)).body.attempted, 0)
  await assert.rejects(charge(e, e.invoices[0], 'http://localhost:5176', true), /payment_not_ready/)
  assert.equal((await call({ action: 'pay', id: e.id, invoiceId: e.invoices[0].id, total: 10300, consent: true })).statusCode, 200)
  assert.equal(ledger()[0].invoices[0].attempt.automatic, false)
})
