import assert from 'node:assert/strict'
import { beforeEach, after, test } from 'node:test'
import { randomUUID } from 'node:crypto'
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { pathToFileURL, fileURLToPath } from 'node:url'
import ts from 'typescript'
import { createAgreementTestStore } from './demo-agreement-test-store.mjs'

// Self-service purchase of the homepage website and lead page packages.
const root = fileURLToPath(new URL('../', import.meta.url))
const temporary = await mkdtemp(join(tmpdir(), 'wallace-package-checkout-test-'))
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
const { default: handler, issuePackagePurchase } = await load('api/_lib/package-checkout-handler.ts')
const { default: deployed } = await load('api/demo-admin.ts')
const { PACKAGE_TERMS_VERSION } = await load('src/content/packagePurchase.ts')
const { changeLedger } = await load('api/_lib/portal-ledger.ts')
const { notifyAiPurchase } = await load('api/_lib/ai-purchase-notification.ts')
const savedEnv = { ...process.env }; const savedFetch = globalThis.fetch
let store, emails, stripeCalls
const today = () => new Date().toISOString().slice(0, 10)
const body = (overrides = {}) => ({ action: 'send-code', submissionId: randomUUID(), packageId: 'website', termsVersion: PACKAGE_TERMS_VERSION, name: 'Buyer Name', businessName: 'Buyer Roofing LLC', email: 'buyer@example.test', authorityConfirmed: true, company: '', ...overrides })
const ledger = () => JSON.parse(store.values.get('portal:engagements') ?? '[]')
beforeEach(() => {
  process.env.VERCEL_ENV = 'development'
  Object.assign(process.env, { DEMO_AUDIT_REDIS_URL: 'https://redis.example.test', DEMO_AUDIT_REDIS_TOKEN: 'fake', PORTAL_ADMIN_EMAIL: 'owner@example.test', STRIPE_SECRET_KEY: 'sk_test_fake', STRIPE_PUBLISHABLE_KEY: 'pk_test_fake', STRIPE_WEBHOOK_SECRET: 'whsec_fake', RESEND_API_KEY: 'fake', CONTACT_FROM_EMAIL: 'billing@example.test' })
  store = createAgreementTestStore(); emails = []; stripeCalls = []
  globalThis.fetch = async (url, init) => {
    if (String(url).startsWith('https://redis.example.test')) {
      if (new URL(url).pathname === '/pipeline') return store.fetch(url, init)
      const command = JSON.parse(init.body); const [verb, key, value] = command
      if (verb === 'GET') return Response.json({ result: store.values.get(key) ?? null })
      if (verb === 'SET') { store.values.set(key, value); return Response.json({ result: 'OK' }) }
      if (verb === 'EVAL') {
        const script = command[1]
        if (script.startsWith('-- package-checkout:limit')) {
          const limitKey = command[3]; const count = Number(store.values.get(limitKey) ?? 0)
          if (count >= 8) return Response.json({ result: 0 })
          store.values.set(limitKey, count + 1); return Response.json({ result: 1 })
        }
        if (script.startsWith('-- package-checkout:verify')) {
          const [, , , codeKey, pendingKey, proofKey, digest, now] = command
          const pending = JSON.parse(store.values.get(pendingKey) ?? 'null')
          if (!pending || pending.exp <= now) return Response.json({ result: 'code_expired' })
          const verified = store.values.get(proofKey)
          if (verified) return Response.json({ result: verified === digest ? 'ok' : 'code_invalid' })
          const code = JSON.parse(store.values.get(codeKey) ?? 'null')
          if (!code || code.expiresAt <= now) return Response.json({ result: 'code_expired' })
          if (code.recipientHash !== pending.recipientHash || code.email !== pending.purchase.email) return Response.json({ result: 'code_invalid' })
          if (code.codeHash !== digest) return Response.json({ result: 'code_invalid' })
          store.values.set(proofKey, digest); store.values.delete(codeKey)
          return Response.json({ result: 'ok' })
        }
        const [, , , ledgerKey, before, next] = command
        if ((store.values.get(ledgerKey) ?? '[]') !== before) return Response.json({ result: 0 })
        store.values.set(ledgerKey, next); return Response.json({ result: 1 })
      }
      throw new Error(`Unexpected Redis command ${verb}`)
    }
    if (url === 'https://api.resend.com/emails') { emails.push(JSON.parse(init.body)); return Response.json({ id: 'email_test' }) }
    if (String(url).startsWith('https://api.stripe.com/')) { stripeCalls.push(url); throw new Error('Checkout must not touch Stripe') }
    throw new Error(`Unexpected network access ${url}`)
  }
})
after(async () => { globalThis.fetch = savedFetch; for (const key of Object.keys(process.env)) if (!Object.hasOwn(savedEnv, key)) delete process.env[key]; Object.assign(process.env, savedEnv); await rm(temporary, { recursive: true, force: true }) })
async function call(input, cookie = '', options = {}) {
  const req = { url: options.url ?? '/api/package-checkout', method: input ? 'POST' : 'GET', socket: { remoteAddress: '127.0.0.1' }, headers: { host: 'localhost:5176', origin: 'http://localhost:5176', 'content-type': 'application/json', cookie }, body: input ? JSON.stringify(input) : undefined }
  const res = { headers: {}, statusCode: 200, setHeader(key, value) { this.headers[key] = value }, end(value) { this.body = JSON.parse(value) } }
  await (options.dispatch ?? handler)(req, res); return res
}
const cookie = response => String(response.headers['set-cookie']).split(';')[0]
async function purchase(input = body()) {
  const sent = await call(input)
  assert.equal(sent.statusCode, 200, JSON.stringify(sent.body))
  const code = emails.at(-1).text.match(/code is (\d{6})/)[1]
  return call({ action: 'verify-code', code }, cookie(sent))
}

test('the public route reaches the handler through the shared function and reports readiness', async () => {
  const config = JSON.parse(await readFile(join(root, 'vercel.json'), 'utf8'))
  assert.equal(config.rewrites.find(item => item.source === '/api/package-checkout').destination, '/api/demo-admin?offer=package')
  assert.deepEqual((await call(undefined, '', { dispatch: deployed, url: '/api/demo-admin?offer=package' })).body, { ok: true, ready: true, termsVersion: PACKAGE_TERMS_VERSION })
  delete process.env.STRIPE_SECRET_KEY
  assert.equal((await call()).body.ready, false)
})

test('website purchase issues a month-to-month agreement with the first $250 due today and no charge yet', async () => {
  const verified = await purchase()
  assert.equal(verified.statusCode, 200, JSON.stringify(verified.body))
  const [e] = ledger()
  assert.equal(verified.body.url, `/client-portal?engagement=${e.id}`)
  assert.match(String(verified.headers['set-cookie']), /HttpOnly/i)
  assert.equal(e.state, 'issued'); assert.equal(e.cadence, 'monthly'); assert.equal(e.amount, 25000); assert.equal(e.client, 'Buyer Roofing LLC')
  assert.deepEqual(e.invoices.map(invoice => [invoice.amount, invoice.due, invoice.status, invoice.kind]), [[25000, today(), 'open', 'recurring']])
  assert.ok(e.nextDue > today())
  assert.equal(e.selfService.packageId, 'website'); assert.equal(e.selfService.answers, undefined); assert.equal(e.selfService.offerVersion, PACKAGE_TERMS_VERSION)
  for (const phrase of ['BUSINESS WEBSITE AND CARE AGREEMENT', 'up to 8 pages', 'two hours a month', 'no minimum term', 'within 30 days of the first payment, Provider refunds that first payment', 'end of the current monthly billing period', 'taken offline unless service is reinstated', '12 monthly payments', 'Governing law: Kansas']) assert.ok(e.agreement.includes(phrase), phrase)
  assert.ok(emails.some(email => email.to[0] === 'owner@example.test' && /Business website & care purchased online/.test(email.subject)))
  assert.equal(stripeCalls.length, 0)
})

test('lead page purchase issues $750 due today and says the second $750 comes at launch', async () => {
  await purchase(body({ packageId: 'lead' }))
  const [e] = ledger()
  assert.equal(e.cadence, 'once'); assert.equal(e.amount, 75000); assert.equal(e.nextDue, undefined)
  assert.deepEqual(e.invoices.map(invoice => [invoice.amount, invoice.due, invoice.status]), [[75000, today(), 'open']])
  for (const phrase of ['LEAD PAGE AND AUTOMATIC FOLLOW UP AGREEMENT', '$1,500.00 USD in two payments', 'invoiced when the page and workflow go live', 'A2P 10DLC']) assert.ok(e.agreement.includes(phrase), phrase)
})

test('purchase details are validated before any code is sent', async () => {
  for (const [override, error] of [[{ authorityConfirmed: false }, 'authority_required'], [{ termsVersion: 'old' }, 'offer_changed'], [{ packageId: 'assistant' }, 'invalid'], [{ company: 'bot' }, 'invalid'], [{ email: 'not-an-email' }, 'invalid_fields'], [{ name: '' }, 'invalid_fields'], [{ extra: 1 }, 'invalid']]) {
    const response = await call(body(override))
    assert.equal(response.body.error, error, JSON.stringify(override))
  }
  assert.equal(emails.length, 0)
})

test('repeating an order returns the same agreement; changed details for that order are refused', async () => {
  const order = { orderId: randomUUID(), packageId: 'website', termsVersion: PACKAGE_TERMS_VERSION, name: 'Buyer', businessName: 'Biz', email: 'b@example.test', fingerprint: 'one' }
  const first = await issuePackagePurchase(order, 'http://localhost:5176')
  assert.equal(await issuePackagePurchase(order, 'http://localhost:5176'), first)
  await assert.rejects(issuePackagePurchase({ ...order, fingerprint: 'two' }, 'http://localhost:5176'), /submission_conflict|DemoError/)
  assert.equal(ledger().length, 1)
})

test('the owner sends the lead page launch invoice only after the deposit is paid, once', async () => {
  await purchase(body({ packageId: 'lead' }))
  const entries = ledger(); const e = entries[0]
  const owner = { email: 'owner@example.test', admin: true }
  e.signature = { name: 'Buyer', email: e.email, at: new Date().toISOString(), hash: e.agreementHash, consent: 'test' }
  assert.throws(() => changeLedger(entries, { action: 'launch-invoice', id: e.id }, owner), /deposit_unpaid|DemoError/)
  assert.throws(() => changeLedger(entries, { action: 'launch-invoice', id: e.id }, { email: e.email, admin: false }), /forbidden|DemoError/)
  e.invoices[0].status = 'paid'
  changeLedger(entries, { action: 'launch-invoice', id: e.id }, owner)
  assert.deepEqual(e.invoices.map(invoice => [invoice.id.endsWith('-launch'), invoice.amount, invoice.status]), [[false, 75000, 'paid'], [true, 75000, 'open']])
  assert.throws(() => changeLedger(entries, { action: 'launch-invoice', id: e.id }, owner), /launch_invoice_exists|DemoError/)
})

test('a website purchase cannot receive a launch invoice, and package payments never trigger the AI paid-project email', async () => {
  await purchase()
  const entries = ledger(); const e = entries[0]
  e.signature = { name: 'Buyer', email: e.email, at: new Date().toISOString(), hash: e.agreementHash, consent: 'test' }
  assert.throws(() => changeLedger(entries, { action: 'launch-invoice', id: e.id }, { email: 'owner@example.test', admin: true }), /launch_invoice_unavailable|DemoError/)
  e.cadence = 'once'; e.invoices[0].status = 'paid'; e.invoices[0].method = 'stripe'; e.invoices[0].paymentIntent = 'pi_test'
  store.values.set('portal:engagements', JSON.stringify(entries))
  const before = emails.length
  await notifyAiPurchase(e.id)
  assert.equal(emails.length, before)
  assert.equal(ledger()[0].selfService.ownerNotification, undefined)
})
