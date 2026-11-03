import assert from 'node:assert/strict'
import { after, beforeEach, test } from 'node:test'
import { createHash, randomUUID } from 'node:crypto'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { Readable } from 'node:stream'
import { fileURLToPath, pathToFileURL } from 'node:url'
import ts from 'typescript'

// Real handlers and shared validation/routing, isolated Redis/Resend providers.
// Never read .env files; unexpected network destinations fail the test.
const root = fileURLToPath(new URL('../', import.meta.url))
const temporary = await mkdtemp(join(tmpdir(), 'wallace-ai-opportunity-'))
const compiled = new Map()
async function compile(relative) {
  if (compiled.has(relative)) return compiled.get(relative)
  const target = join(temporary, `${relative}.mjs`); compiled.set(relative, target)
  let source = ts.transpileModule(await readFile(join(root, relative), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext } }).outputText
  for (const match of [...source.matchAll(/(from\s+)(['"])(\.[^'"]+)\2/g)]) {
    const dependency = await compile(join(dirname(relative), match[3].replace(/\.js$/, '.ts')))
    source = source.replace(match[0], `from ${JSON.stringify(pathToFileURL(dependency).href)}`)
  }
  await mkdir(dirname(target), { recursive: true }); await writeFile(target, source); return target
}
const load = async relative => import(pathToFileURL(await compile(relative)).href)
const { default: handler } = await load('api/_lib/ai-opportunity-handler.ts')
const { default: dispatcher, config: deployedConfig } = await load('api/demo-admin.ts')
const { aiOffer, aiPackages } = await load('src/content/aiOffer.ts')
const savedEnv = { ...process.env }, savedFetch = globalThis.fetch, savedNow = Date.now
const origin = 'https://wallaceshift.com'
const adminToken = 'a'.repeat(64), clientToken = 'b'.repeat(64), scopedToken = 'c'.repeat(64)
const hash = value => createHash('sha256').update(value).digest('hex')
let values, indexes, calls, emailRequests, acceptedEmails, storeMode, mailMode, now
const keyFor = id => `ai-opportunity:application:${id}`
const stored = id => JSON.parse(values.get(keyFor(id)))
const allStored = () => [...values.entries()].filter(([key]) => key.startsWith('ai-opportunity:application:')).map(([, value]) => JSON.parse(value))

function application(overrides = {}) {
  return {
    submissionId: randomUUID(), offerVersion: aiOffer.version,
    businessType: 'Local accounting firm', workflows: ['inquiries'], workflowDetails: 'We manually read every inquiry and prepare an initial reply.',
    currentTools: 'Shared documents and email', weeklyHours: '11_20', impacts: ['delay'], timing: 'soon', role: 'owner', approverAvailability: '',
    revenue: '250k_1m', aiExperience: 'considered', aiBarriers: ['technical'], budget: 'ready',
    name: 'Example Owner', businessName: 'Example Business', email: 'person@example.test', website: 'example.test', contactMethod: 'email', phone: '',
    nextStep: 'consultation', packageId: '',
    offerAcknowledged: true, contactConsent: true, company: '', ...overrides,
  }
}

async function invoke(body = application(), options = {}) {
  const req = Readable.from(options.chunks ?? [options.raw ?? JSON.stringify(body)])
  req.method = options.method ?? 'POST'; req.url = options.url ?? `/api/ai-opportunity${options.query ?? ''}`
  if (options.platformQuery) req.query = options.platformQuery
  req.headers = { host: 'wallaceshift.com', origin, 'content-type': 'application/json', ...options.headers }
  req.socket = { remoteAddress: options.ip ?? '127.0.0.1' }
  if (options.preparsed) req.body = body
  const res = { headers: {}, statusCode: 200, setHeader(key, value) { this.headers[key.toLowerCase()] = value }, end(value) { this.body = JSON.parse(value) } }
  await (options.dispatch ?? handler)(req, res); return res
}
const ownerHeaders = { cookie: `wallace_client_session=${adminToken}` }
const retry = id => invoke({ action: 'retry_notification', applicationId: id }, { headers: ownerHeaders })

function commandResult(command) {
  const [verb, key, value] = command
  if (verb === 'GET') return values.get(key) ?? null
  if (verb === 'ZREVRANGE') {
    return [...(indexes.get(key) ?? new Map())].sort((a, b) => b[1] - a[1] || b[0].localeCompare(a[0])).slice(Number(value), Number(command[3]) + 1).map(([id]) => id)
  }
  if (verb === 'MGET') return command.slice(1).map(key => values.get(key) ?? null)
  assert.equal(verb, 'EVAL', `Unexpected Redis command ${verb}`)
  const count = Number(command[2]), keys = command.slice(3, 3 + count), args = command.slice(3 + count)
  if (key.includes('-- ai-opportunity:limit')) {
    if (Number(values.get(keys[0]) ?? 0) >= Number(args[0]) || Number(values.get(keys[1]) ?? 0) >= Number(args[1])) return 0
    for (const key of keys) values.set(key, String(Number(values.get(key) ?? 0) + 1))
    return 1
  }
  if (key.includes('-- ai-opportunity:create')) {
    if (values.has(keys[0])) return ['existing', values.get(keys[0])]
    values.set(keys[0], args[0]); const index = indexes.get(keys[1]) ?? new Map(); index.set(args[2], Number(args[1])); indexes.set(keys[1], index)
    return ['created', args[0]]
  }
  if (key.includes('-- ai-opportunity:change')) {
    if (values.get(keys[0]) !== args[0]) return 0
    values.set(keys[0], args[1]); return 1
  }
  throw new Error('Unexpected Redis script')
}

beforeEach(() => {
  for (const key of Object.keys(process.env)) if (/^(?:AI_OPPORTUNITY_|DEMO_|PORTAL_|RESEND_|CONTACT_|RATE_LIMIT_|KV_REST_API_|UPSTASH_REDIS_REST_)/.test(key) || key === 'VERCEL') delete process.env[key]
  Object.assign(process.env, { NODE_ENV: 'production', AI_OPPORTUNITY_ENABLED: 'true', DEMO_AUDIT_REDIS_URL: 'https://redis.example.test', DEMO_AUDIT_REDIS_TOKEN: 'fixture-only', PORTAL_ADMIN_EMAIL: 'owner@example.test', RESEND_API_KEY: 'fixture-mail-only', CONTACT_FROM_EMAIL: 'Wallace Shift <site@example.test>', CONTACT_TO_EMAIL: 'reviewer@example.test' })
  values = new Map(); indexes = new Map(); calls = []; emailRequests = []; acceptedEmails = new Map(); storeMode = 'ok'; mailMode = 'ok'
  now = Date.UTC(2026, 10, 1, 15); Date.now = () => now
  for (const [token, session] of [[adminToken, { email: 'owner@example.test' }], [clientToken, { email: 'client@example.test' }], [scopedToken, { email: 'owner@example.test', engagementId: 'existing-client-engagement' }]]) values.set(`portal:session:${hash(token)}`, JSON.stringify(session))
  globalThis.fetch = async (url, init) => {
    if (url === 'https://redis.example.test') {
      assert.equal(init.headers.authorization, 'Bearer fixture-only')
      const command = JSON.parse(init.body); calls.push(command)
      if (storeMode === 'offline' || (storeMode === 'create-fails' && String(command[1]).includes('-- ai-opportunity:create'))) throw new Error('Synthetic Redis outage')
      if (storeMode === 'malformed') return Response.json({ result: null })
      if (storeMode === 'finish-fails' && String(command[1]).includes('-- ai-opportunity:change') && command.at(-1).includes('"state":"sent"')) throw new Error('Lost final store write')
      return Response.json({ result: commandResult(command) })
    }
    assert.equal(url, 'https://api.resend.com/emails', 'Real network requests are forbidden')
    assert.equal(init.headers.authorization, 'Bearer fixture-mail-only')
    const payload = JSON.parse(init.body), idempotency = init.headers['idempotency-key']
    const record = allStored().find(record => idempotency === `ai-opportunity/${record.id}`)
    assert.ok(record, 'Application must be durably stored before email')
    assert.equal(record.notification.state, 'sending', 'Email attempt must be persisted first')
    assert.deepEqual(record.notification.payload, payload, 'Retry payload must match stored payload exactly')
    emailRequests.push({ payload, idempotency })
    if (mailMode === 'rejected') return Response.json({ message: 'Rejected' }, { status: 503 })
    if (acceptedEmails.has(idempotency)) assert.deepEqual(acceptedEmails.get(idempotency), payload, 'Provider idempotency must retain original payload')
    else acceptedEmails.set(idempotency, payload)
    if (mailMode === 'lost-response') throw new Error('Synthetic lost provider response after acceptance')
    return Response.json({ id: 'fixture-message-id' })
  }
})
after(async () => {
  Date.now = savedNow; globalThis.fetch = savedFetch
  for (const key of Object.keys(process.env)) if (!Object.hasOwn(savedEnv, key)) delete process.env[key]
  Object.assign(process.env, savedEnv); await rm(temporary, { recursive: true, force: true })
})

test('public alias and rewritten route share an existing function without overriding its guardrails', async () => {
  const config = JSON.parse(await readFile(join(root, 'vercel.json'), 'utf8'))
  assert.equal(config.rewrites.find(rule => rule.source === '/api/ai-opportunity')?.destination, '/api/demo-admin?offer=ai')
  assert.ok((await readFile(join(root, 'vite.config.ts'), 'utf8')).includes("'/api/ai-opportunity': '/api/_lib/ai-opportunity-handler.ts'"))
  assert.equal(deployedConfig.maxDuration, 60)
  for (const options of [
    { url: '/api/ai-opportunity' },
    { url: '/api/ai-opportunity?portal=client' },
    { url: '/api/demo-admin?offer=ai' },
    { url: '/api/demo-admin', platformQuery: { offer: 'ai' } },
  ]) {
    const body = application(); const result = await invoke(body, { ...options, dispatch: dispatcher })
    assert.equal(result.statusCode, 200); assert.equal(result.body.applicationId, body.submissionId)
  }
  assert.equal((await invoke(null, { url: '/api/demo-admin?offer=ai', method: 'GET', dispatch: dispatcher })).statusCode, 403)
})

test('stores before internal notification, normalizes details, returns no personal information', async () => {
  const body = application({ name: '  Example Owner  ', email: 'Person@Example.Test' })
  const res = await invoke(body)
  assert.equal(res.statusCode, 200)
  assert.deepEqual(res.body, { ok: true, applicationId: body.submissionId, route: 'fit_call', notification: 'sent' })
  const record = stored(body.submissionId)
  assert.equal(record.application.name, 'Example Owner'); assert.equal(record.application.email, 'person@example.test')
  assert.equal(record.application.website, 'https://example.test/')
  assert.equal(Object.hasOwn(record.application, 'company'), false); assert.equal(Object.hasOwn(record.application, 'submissionId'), false)
  assert.equal(record.notification.state, 'sent'); assert.equal(emailRequests.length, 1)
  assert.deepEqual(emailRequests[0].payload.to, ['reviewer@example.test'])
  assert.equal(emailRequests[0].payload.reply_to, 'person@example.test')
  assert.match(emailRequests[0].payload.text, /Consultation format: Google Meet/)
  assert.match(emailRequests[0].payload.text, /does not verify whether an appointment was booked/)
  assert.match(res.headers['cache-control'], /no-store/)
})

test('disabled draft and honeypot never persist or email', async () => {
  delete process.env.AI_OPPORTUNITY_ENABLED
  assert.equal((await invoke()).body.error, 'not_configured')
  process.env.AI_OPPORTUNITY_ENABLED = 'true'
  assert.deepEqual((await invoke({ company: 'spam' })).body, { ok: true })
  assert.equal(allStored().length, 0); assert.equal(calls.length, 0); assert.equal(emailRequests.length, 0)
})

test('phone consultation stores the chosen format without requiring email or inventing a reply address', async () => {
  for (const email of ['', undefined]) {
    const body = application({ contactMethod: 'call', phone: '+1 555 555 0100', email })
    const response = await invoke(body)
    assert.equal(response.statusCode, 200)
    const record = stored(body.submissionId)
    assert.equal(record.application.email, '')
    assert.equal(record.application.phone, '+1 555 555 0100')
    assert.equal(record.application.nextStep, 'consultation')
    assert.equal(record.application.packageId, '')
    assert.equal(Object.hasOwn(emailRequests.at(-1).payload, 'reply_to'), false)
    assert.match(emailRequests.at(-1).payload.text, /Requested next step: Free 45 minute consultation/)
    assert.match(emailRequests.at(-1).payload.text, /Consultation format: Phone call/)
    assert.match(emailRequests.at(-1).payload.text, /A time still needs to be arranged/)
  }
  const supplied = application({ contactMethod: 'call', phone: '+1 555 555 0100', email: 'Phone@Example.Test' })
  assert.equal((await invoke(supplied)).statusCode, 200)
  assert.equal(emailRequests.at(-1).payload.reply_to, 'phone@example.test')
  assert.equal((await invoke(application({ contactMethod: 'call', phone: '+1 555 555 0100', email: 'invalid' }))).statusCode, 400)
})

test('package requests preserve the selection and include the trusted catalog name and price for owner review', async () => {
  for (const [packageId, offer] of Object.entries(aiPackages)) {
    const body = application({ nextStep: 'package', packageId })
    const response = await invoke(body)
    assert.equal(response.statusCode, 200)
    const record = stored(body.submissionId)
    assert.equal(record.application.nextStep, 'package')
    assert.equal(record.application.packageId, packageId)
    assert.match(emailRequests.at(-1).payload.text, /Requested next step: Package/)
    assert.ok(emailRequests.at(-1).payload.text.includes(`Selected package: ${offer.name}`))
    assert.ok(emailRequests.at(-1).payload.text.includes(`Proposed package price: $${offer.price.toLocaleString('en-US')}`))
    assert.equal(Object.hasOwn(response.body, 'checkoutUrl'), false)
    const changed = await invoke({ ...body, packageId: packageId === 'inquiry' ? 'notes' : 'inquiry' })
    assert.equal(changed.statusCode, 409)
    assert.equal(changed.body.error, 'submission_conflict')
  }
})

test('submission retries and concurrent duplicates persist and notify exactly once', async () => {
  const body = application()
  const responses = await Promise.all([invoke(body), invoke(body), invoke(body)])
  for (const response of responses) { assert.equal(response.statusCode, 200); assert.equal(response.body.applicationId, body.submissionId) }
  assert.equal(allStored().length, 1); assert.equal(emailRequests.length, 1)
  const changed = await invoke({ ...body, workflowDetails: 'A different application using the same submission id.' })
  assert.equal(changed.statusCode, 409); assert.equal(changed.body.error, 'submission_conflict')
  assert.equal(stored(body.submissionId).application.workflowDetails, body.workflowDetails)
})

test('rejected notification keeps a durable application and owner can retry', async () => {
  mailMode = 'rejected'; const body = application(); const response = await invoke(body)
  assert.equal(response.body.ok, true); assert.equal(response.body.notification, 'queued')
  assert.equal(stored(body.submissionId).notification.state, 'failed')
  mailMode = 'ok'; const result = await retry(body.submissionId)
  assert.equal(result.body.application.notification.state, 'sent')
  assert.equal(acceptedEmails.size, 1); assert.equal(emailRequests.length, 2)
  assert.equal(emailRequests[0].idempotency, emailRequests[1].idempotency)
  assert.equal(Object.hasOwn(result.body.application.notification, 'payload'), false)
})

test('lost email response retries immutable payload without duplicating accepted email', async () => {
  mailMode = 'lost-response'; const body = application(); await invoke(body)
  assert.equal(acceptedEmails.size, 1)
  process.env.CONTACT_TO_EMAIL = 'changed-recipient@example.test'; mailMode = 'ok'
  await retry(body.submissionId)
  assert.equal(acceptedEmails.size, 1); assert.deepEqual(emailRequests[0].payload, emailRequests[1].payload)
  assert.equal(stored(body.submissionId).notification.state, 'sent')
})

test('notification without email configuration remains owner-recoverable', async () => {
  delete process.env.RESEND_API_KEY; const body = application(); const response = await invoke(body)
  assert.equal(response.body.ok, true); assert.equal(response.body.notification, 'queued')
  assert.equal(stored(body.submissionId).notification.error, 'email_not_configured'); assert.equal(emailRequests.length, 0)
  process.env.RESEND_API_KEY = 'fixture-mail-only'; await retry(body.submissionId)
  assert.equal(stored(body.submissionId).notification.state, 'sent')
})

test('uncertain attempts older than the provider retention safety window require manual review', async () => {
  mailMode = 'lost-response'; const body = application(); await invoke(body)
  now += 24 * 3_600_000; mailMode = 'ok'
  const result = await retry(body.submissionId)
  assert.equal(result.body.application.notification.state, 'review_required')
  assert.equal(emailRequests.length, 1)
})

test('a lost sent-state write still reports saved receipt and can be recovered without duplicate email', async () => {
  storeMode = 'finish-fails'; const body = application(); const response = await invoke(body)
  assert.equal(response.body.ok, true); assert.equal(response.body.notification, 'queued')
  assert.equal(stored(body.submissionId).notification.state, 'sending')
  storeMode = 'ok'; now += 61_000; await retry(body.submissionId)
  assert.equal(stored(body.submissionId).notification.state, 'sent'); assert.equal(acceptedEmails.size, 1)
})

test('unavailable or malformed storage never reports application success or sends mail', async () => {
  for (const mode of ['offline', 'create-fails', 'malformed']) {
    storeMode = mode; const response = await invoke()
    assert.equal(response.statusCode, 503); assert.equal(response.body.ok, false)
  }
  assert.equal(allStored().length, 0); assert.equal(emailRequests.length, 0)
})

test('missing durable storage fails closed without an in-memory fallback', async () => {
  delete process.env.DEMO_AUDIT_REDIS_URL; delete process.env.DEMO_AUDIT_REDIS_TOKEN
  assert.equal((await invoke()).statusCode, 503); assert.equal(allStored().length, 0); assert.equal(emailRequests.length, 0)
})

test('strict fields and consent reject forged or oversized submissions before persistence', async () => {
  const invalid = [
    { submissionId: 'not-a-uuid' }, { workflows: ['made-up'] }, { workflow: 'inquiries' }, { workflows: 'inquiries' },
    { workflows: [] }, { workflows: ['inquiries', 'inquiries'] }, { workflows: ['not_sure', 'admin'] },
    { workflows: null }, { workflows: [42] }, { role: 'superadmin' }, { budget: 'free' },
    { offerAcknowledged: 'true' }, { contactConsent: false }, { marketingConsent: true },
    { name: 'Owner\nInjected: content' }, { businessType: 'a'.repeat(121) }, { businessType: 42 }, { businessType: null },
    { workflowDetails: 'a'.repeat(1501) }, { frequency: 'daily' }, { timePerTask: '15_to_30' },
    { weeklyHours: 'all_day' }, { revenue: 'rich' }, { aiExperience: 'expert' },
    { approverAvailability: 'yes' }, { role: 'joint', approverAvailability: '' },
    { impacts: [] }, { impacts: ['delay', 'rework', 'cost'] }, { impacts: ['delay', 'delay'] },
    { impacts: ['not_sure', 'delay'] }, { impacts: ['unknown'] }, { impacts: 'delay' },
    { aiBarriers: [] }, { aiBarriers: ['technical', 'technical'] }, { aiBarriers: ['technical', 'value', 'time'] },
    { aiBarriers: ['unknown'] }, { aiExperience: 'new', aiBarriers: ['technical'] },
    { qualification: { route: 'fit_call', priority: 'established' } },
    { budget: 'unavailable', offerAcknowledged: true },
    { email: 'not-an-email' }, { website: 'https://user:password@example.test' }, { website: 'javascript:alert(1)' },
    { contactMethod: 'call', phone: '' }, { contactMethod: 'call', phone: 'not a phone' },
    { contactMethod: 'email', phone: '123' },
    { nextStep: 'unknown' }, { nextStep: undefined }, { packageId: 'inquiry' },
    { nextStep: 'package', packageId: '' }, { nextStep: 'package', packageId: 'invented' },
    { nextStep: 'package', packageId: 'constructor' }, { nextStep: 'package', packageId: '__proto__' },
    { nextStep: 'package', packageId: 'inquiry', email: '' }, { nextStep: 'package', packageId: 'notes', contactMethod: 'call', phone: '+1 555 555 0100' },
    { email: '' }, { packagePrice: 1 },
  ]
  for (const change of invalid) assert.equal((await invoke(application(change))).statusCode, 400, JSON.stringify(change))
  const stale = await invoke(application({ offerVersion: 'old-offer' }))
  assert.equal(stale.statusCode, 409); assert.equal(stale.body.error, 'offer_changed')
  assert.equal(allStored().length, 0); assert.equal(emailRequests.length, 0)
})

test('body size, content type, origin, host, and method boundaries are enforced', async () => {
  for (const options of [
    { headers: { origin: 'https://attacker.example' } }, { headers: { 'sec-fetch-site': 'cross-site' } }, { headers: { host: 'attacker.example' } },
  ]) assert.equal((await invoke(application(), options)).statusCode, 403)
  assert.equal((await invoke(application(), { method: 'PUT' })).statusCode, 405)
  assert.equal((await invoke(application(), { headers: { 'content-type': 'text/plain' } })).statusCode, 400)
  assert.equal((await invoke(application(), { headers: { 'content-length': '12001' } })).statusCode, 413)
  assert.equal((await invoke(application(), { chunks: ['x'.repeat(6001), 'x'.repeat(6001)] })).statusCode, 413)
  assert.equal((await invoke(null, { preparsed: true })).statusCode, 400)
  assert.equal((await invoke([], { preparsed: true })).statusCode, 400)
  assert.equal((await invoke({}, { raw: '{broken' })).statusCode, 400)
  assert.equal(allStored().length, 0)
})

test('shared rate limits reject the ninth request and do not trust local forwarded IP spoofing', async () => {
  for (let i = 0; i < 8; i++) assert.equal((await invoke(application(), { headers: { 'x-vercel-forwarded-for': `192.0.2.${i}` } })).statusCode, 200)
  const response = await invoke()
  assert.equal(response.statusCode, 429); assert.equal(response.body.error, 'rate_limited'); assert.equal(response.headers['retry-after'], '3600')
  assert.equal(allStored().length, 8); assert.equal(emailRequests.length, 8)
})

test('all public routing derives from validated answers', async () => {
  assert.equal((await invoke(application({ budget: 'unavailable', offerAcknowledged: false }))).body.route, 'resource')
  assert.equal((await invoke(application({ budget: 'value' }))).body.route, 'manual_review')
  assert.equal((await invoke(application({ workflows: ['other'] }))).body.route, 'manual_review')
  assert.equal((await invoke(application({ timing: 'quarter' }))).body.route, 'fit_call')
})

test('all four timing values are accepted and retained while unknown timing is rejected', async () => {
  for (const timing of ['now', 'soon', 'quarter', 'exploring']) {
    const body = application({ timing, offerAcknowledged: timing !== 'exploring' })
    assert.equal((await invoke(body)).statusCode, 200)
    assert.equal(stored(body.submissionId).application.timing, timing)
  }
  assert.equal((await invoke(application({ timing: 'immediately' }))).statusCode, 400)
  assert.equal(allStored().length, 4)
})

test('optional business description does not change qualification and supplied context remains saved', async () => {
  const filled = application({ businessType: '  Local accounting firm  ' })
  const blank = application({ businessType: '  ' })
  const omitted = application()
  delete omitted.businessType
  const filledResponse = await invoke(filled)
  assert.equal(filledResponse.statusCode, 200)
  const filledRecord = stored(filled.submissionId)
  assert.equal(filledRecord.application.businessType, 'Local accounting firm')
  for (const body of [blank, omitted]) {
    const response = await invoke(body)
    assert.equal(response.statusCode, 200)
    assert.equal(response.body.route, filledResponse.body.route)
    const record = stored(body.submissionId)
    assert.equal(record.application.businessType, '')
    assert.deepEqual(record.qualification, filledRecord.qualification)
  }
})

test('revenue cannot override authority, affordability, need, or readiness', async () => {
  const cases = [
    [{ role: 'researching', approverAvailability: 'no', revenue: 'over_5m', offerAcknowledged: false }, 'resource'],
    [{ role: 'joint', approverAvailability: 'no', revenue: 'over_5m', offerAcknowledged: false }, 'resource'],
    [{ budget: 'unavailable', revenue: 'over_5m', offerAcknowledged: false }, 'resource'],
    [{ workflows: ['demand'], revenue: 'over_5m', offerAcknowledged: false }, 'resource'],
    [{ timing: 'exploring', revenue: 'over_5m', offerAcknowledged: false }, 'resource'],
    [{ revenue: 'not_trading', offerAcknowledged: false }, 'resource'],
    [{ revenue: 'under_100k' }, 'fit_call'],
    [{ revenue: 'prefer_not' }, 'fit_call'],
    [{ role: 'joint', approverAvailability: 'yes' }, 'manual_review'],
  ]
  for (const [index, [change, route]] of cases.entries()) {
    const body = application(change)
    const response = await invoke(body, { ip: `192.0.2.${index + 1}` })
    assert.equal(response.statusCode, 200, JSON.stringify(change))
    assert.equal(response.body.route, route, JSON.stringify(change))
    assert.equal(stored(body.submissionId).qualification.route, route)
  }
})

test('canonical multi-select answers keep retries idempotent and branch-specific answers stay bounded', async () => {
  const body = application({ workflows: ['capacity', 'admin', 'inquiries'], impacts: ['cost', 'delay'], aiBarriers: ['value', 'technical'] })
  const first = await invoke(body)
  const retried = await invoke({ ...body, workflows: ['inquiries', 'capacity', 'admin'], impacts: ['delay', 'cost'], aiBarriers: ['technical', 'value'] })
  assert.equal(first.statusCode, 200); assert.equal(retried.statusCode, 200)
  assert.equal(allStored().length, 1); assert.equal(emailRequests.length, 1)
  assert.deepEqual(stored(body.submissionId).application.workflows, ['inquiries', 'admin', 'capacity'])
  const changed = await invoke({ ...body, workflows: ['inquiries', 'admin'] })
  assert.equal(changed.statusCode, 409); assert.equal(changed.body.error, 'submission_conflict')
  const newToAi = application({ aiExperience: 'new', aiBarriers: [], workflowDetails: '', currentTools: '' })
  assert.equal((await invoke(newToAi)).statusCode, 200)
  assert.deepEqual(stored(newToAi.submissionId).application.aiBarriers, [])
})

test('multiple problems remain intact in storage, owner review, and notification without a two-choice cap', async () => {
  const workflows = ['inquiries', 'admin', 'handoffs', 'owner', 'capacity', 'demand', 'other']
  const body = application({ workflows: [...workflows].reverse() })
  const response = await invoke(body)
  assert.equal(response.statusCode, 200)
  const record = stored(body.submissionId)
  assert.deepEqual(record.application.workflows, workflows)
  assert.equal(Object.hasOwn(record.application, 'workflow'), false)
  assert.equal(record.qualification.kind, 'consultation')
  assert.equal(record.qualification.packageId, null)
  assert.ok(emailRequests[0].payload.text.includes(`workflows: ${JSON.stringify(workflows)}`))
  const list = await invoke(null, { method: 'GET', headers: ownerHeaders })
  assert.deepEqual(list.body.applications[0].application.workflows, workflows)
})

test('mixed demand and operational issues stay eligible for consultation while uncertainty stays explicit', async () => {
  const mixed = application({ workflows: ['demand', 'inquiries'] })
  const response = await invoke(mixed)
  assert.equal(response.statusCode, 200)
  assert.notEqual(response.body.route, 'resource')
  assert.equal(stored(mixed.submissionId).qualification.kind, 'consultation')
  assert.equal(stored(mixed.submissionId).qualification.packageId, null)
  const uncertain = application({ workflows: ['not_sure'] })
  assert.equal((await invoke(uncertain)).statusCode, 200)
  assert.equal(stored(uncertain.submissionId).qualification.kind, 'consultation')
})

test('owner notification and private list include server-computed qualification, while public response does not', async () => {
  const body = application({ revenue: '1m_5m', aiBarriers: ['accuracy', 'privacy'] })
  const response = await invoke(body)
  const record = stored(body.submissionId)
  assert.equal(record.qualification.priority, 'established')
  assert.ok(record.qualification.rationale)
  assert.match(emailRequests[0].payload.text, /Qualification at submission:/)
  assert.match(emailRequests[0].payload.text, /revenue: 1m_5m/)
  assert.match(emailRequests[0].payload.text, /aiBarriers: \["accuracy","privacy"\]/)
  assert.equal(Object.hasOwn(response.body, 'qualification'), false)
  const list = await invoke(null, { method: 'GET', headers: ownerHeaders })
  assert.deepEqual(list.body.applications[0].qualification, record.qualification)
})

test('older stored applications remain owner-readable and recoverable without new qualification fields', async () => {
  delete process.env.RESEND_API_KEY
  const body = application(); await invoke(body)
  const record = stored(body.submissionId)
  delete record.qualification
  for (const key of ['weeklyHours', 'impacts', 'approverAvailability', 'revenue', 'aiExperience', 'aiBarriers', 'nextStep', 'packageId']) delete record.application[key]
  delete record.application.workflows
  record.application.workflow = 'inquiries'
  record.application.offerVersion = '2026-11-01-draft-1'
  record.application.frequency = 'daily'; record.application.timePerTask = '15_to_30'; record.application.budget = '2500_to_5000'
  values.set(keyFor(body.submissionId), JSON.stringify(record))
  const list = await invoke(null, { method: 'GET', headers: ownerHeaders })
  assert.equal(list.statusCode, 200); assert.equal(list.body.applications[0].application.frequency, 'daily')
  assert.equal(list.body.applications[0].application.workflow, 'inquiries')
  process.env.RESEND_API_KEY = 'fixture-mail-only'
  assert.equal((await retry(body.submissionId)).body.application.notification.state, 'sent')
  assert.match(emailRequests[0].payload.text, /older application has no saved qualification summary/)
  assert.match(emailRequests[0].payload.text, /workflow: inquiries/)
})

test('owner-only list and retries reject anonymous, client, and scoped owner sessions', async () => {
  const body = application(); await invoke(body)
  for (const token of ['', clientToken, scopedToken]) {
    const headers = { cookie: `wallace_client_session=${token}` }
    assert.equal((await invoke(null, { method: 'GET', headers })).statusCode, 403)
    assert.equal((await invoke({ action: 'retry_notification', applicationId: body.submissionId }, { headers })).statusCode, 403)
  }
  const result = await invoke(null, { method: 'GET', headers: ownerHeaders })
  assert.equal(result.statusCode, 200); assert.equal(result.body.applications[0].id, body.submissionId)
  assert.equal(Object.hasOwn(result.body.applications[0].notification, 'payload'), false)
  assert.equal(Object.hasOwn(result.body.applications[0].notification, 'attemptToken'), false)
  assert.equal(result.body.nextOffset, null); assert.match(result.headers['cache-control'], /no-store/)
})

test('owner pagination is bounded and remains available while public offer is disabled', async () => {
  for (let i = 0; i < 27; i++) { now += 1; assert.equal((await invoke(application(), { ip: `192.0.2.${i + 1}` })).statusCode, 200) }
  delete process.env.AI_OPPORTUNITY_ENABLED
  const first = await invoke(null, { method: 'GET', headers: ownerHeaders })
  assert.equal(first.body.applications.length, 25); assert.equal(first.body.nextOffset, 25)
  const second = await invoke(null, { method: 'GET', headers: ownerHeaders, query: '?offset=25' })
  assert.equal(second.body.applications.length, 2); assert.equal(second.body.nextOffset, null)
  const ids = [...first.body.applications, ...second.body.applications].map(record => record.id)
  assert.equal(new Set(ids).size, 27)
  assert.equal((await invoke(null, { method: 'GET', headers: ownerHeaders, query: '?offset=-1' })).statusCode, 400)
})
