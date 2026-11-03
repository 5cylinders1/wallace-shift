import assert from 'node:assert/strict'
import { beforeEach, after, test } from 'node:test'
import { randomBytes, randomUUID } from 'node:crypto'
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { pathToFileURL, fileURLToPath } from 'node:url'
import ts from 'typescript'
import { createAgreementTestStore } from './demo-agreement-test-store.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))
const temporary = await mkdtemp(join(tmpdir(), 'wallace-booking-test-'))
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
const { default: handler } = await load('api/_lib/ai-booking-handler.ts')
const { default: deployed } = await load('api/demo-admin.ts')
const { isMatchingBooking, CALENDAR_SCOPE } = await load('api/_lib/ai-booking-calendar.ts')
const { hash, identity } = await load('api/_lib/portal-auth.ts')
const savedEnv = { ...process.env }; const savedFetch = globalThis.fetch; const savedNow = Date.now
let store, emails, tokenRequests, calendarRequests, events, nextEvents, tokenFailure, eventFailure, missingRefresh, missingScope, failSessionOnce, offset
const answers = { businessType: '', workflows: ['inquiries'], workflowDetails: '', currentTools: 'Website and Gmail', weeklyHours: '6_10', impacts: ['delay'], role: 'owner', approverAvailability: '', revenue: '250k_1m', aiExperience: 'new', aiBarriers: [], budget: 'ready', timing: 'soon' }
const body = (overrides = {}) => ({ action: 'send-code', attemptId: randomUUID(), email: 'visitor@example.test', answers, company: '', ...overrides })
const event = (overrides = {}) => ({ id: 'event-123', status: 'confirmed', summary: 'Wallace Shift - Project Consultation', created: new Date(Date.now()).toISOString(), organizer: { self: true, email: 'owner@example.test' }, start: { dateTime: new Date(Date.now() + 86400000).toISOString() }, end: { dateTime: new Date(Date.now() + 86400000 + 45 * 60000).toISOString() }, attendees: [{ email: 'visitor@example.test', responseStatus: 'needsAction' }], ...overrides })
function get(key) {
  if (store.expirations.has(key) && store.expirations.get(key) <= Date.now()) { store.values.delete(key); store.expirations.delete(key) }
  return store.values.get(key)
}
function put(key, value, options = []) {
  if (options.includes('NX') && get(key) !== undefined) return null
  store.values.set(key, value)
  if (options.includes('EX')) store.expirations.set(key, Date.now() + Number(options[options.indexOf('EX') + 1]) * 1000)
  return 'OK'
}
function evaluate(command) {
  const [,,count] = command; const keys = command.slice(3, 3 + count); const args = command.slice(3 + count)
  const operation = command[1].split('\n')[0]
  if (operation === '-- ai-booking:limit') {
    const n = Number(get(keys[0]) ?? 0); if (n >= 8) return 0
    put(keys[0], n + 1, ['EX', 3600]); return 1
  }
  if (operation === '-- ai-booking:oauth-state') {
    const value = JSON.parse(get(keys[0]) ?? 'null')
    if (!value || value.owner !== args[0] || value.sessionHash !== args[1] || value.expiresAt <= args[2]) return 0
    store.values.delete(keys[0]); return 1
  }
  if (operation === '-- ai-booking:verify') {
    const pending = JSON.parse(get(keys[1]) ?? 'null')
    if (!pending || pending.exp <= args[1]) return 'code_expired'
    const proof = get(keys[2]); if (proof) return proof === args[0] ? 'ok' : 'code_invalid'
    const code = JSON.parse(get(keys[0]) ?? 'null')
    if (!code || code.expiresAt <= args[1]) return 'code_expired'
    if (code.recipientHash !== pending.recipientHash || code.email !== pending.intent.email) return 'code_invalid'
    if (code.attempts >= 5) return 'rate_limited'
    code.attempts++
    if (code.codeHash !== args[0]) { put(keys[0], JSON.stringify(code)); return 'code_invalid' }
    put(keys[2], args[0], ['EX', pending.exp - args[1]]); store.values.delete(keys[0]); return 'ok'
  }
  if (operation === '-- ai-booking:save') {
    put(keys[0], args[0], ['NX'])
    const index = get(keys[1]) ?? new Map(); if (!index.has(args[2])) index.set(args[2], Number(args[1])); put(keys[1], index); return 1
  }
  if (operation === '-- ai-booking:disconnect') {
    if (JSON.parse(get(keys[0]) ?? 'null')?.id === args[0]) store.values.delete(keys[0]); return 1
  }
  throw new Error(`Unexpected Redis operation ${operation}`)
}
beforeEach(() => {
  Object.assign(process.env, { DEMO_AUDIT_REDIS_URL: 'https://redis.example.test', DEMO_AUDIT_REDIS_TOKEN: 'fake', PORTAL_ADMIN_EMAIL: 'owner@example.test', RESEND_API_KEY: 'fake', CONTACT_FROM_EMAIL: 'hello@example.test', GOOGLE_CALENDAR_CLIENT_ID: 'client.example.test', GOOGLE_CALENDAR_CLIENT_SECRET: 'client-secret-test', GOOGLE_CALENDAR_TOKEN_KEY: 'ab'.repeat(32) })
  delete process.env.GOOGLE_CALENDAR_ID; delete process.env.GOOGLE_CALENDAR_BOOKING_TITLE
  store = createAgreementTestStore(); emails = []; tokenRequests = []; calendarRequests = []; events = []; nextEvents = undefined; tokenFailure = 0; eventFailure = 0; missingRefresh = false; missingScope = false; failSessionOnce = false; offset = 0
  Date.now = () => savedNow() + offset
  globalThis.fetch = async (url, init) => {
    const address = String(url)
    if (address.startsWith('https://redis.example.test')) {
      if (new URL(url).pathname === '/pipeline') return store.fetch(url, init)
      const command = JSON.parse(init.body); const [verb, key, value, ...options] = command
      if (verb === 'GET') return Response.json({ result: get(key) ?? null })
      if (verb === 'SET') {
        if (failSessionOnce && key.startsWith('portal:booking:session:')) { failSessionOnce = false; throw new Error('Write failed') }
        return Response.json({ result: put(key, value, options) })
      }
      if (verb === 'ZREVRANGE') return Response.json({ result: [...(get(key) ?? new Map()).entries()].sort((a,b) => b[1] - a[1]).slice(Number(value), Number(options[0]) + 1).map(([id]) => id) })
      if (verb === 'EVAL') return Response.json({ result: evaluate(command) })
      throw new Error(`Unexpected Redis command ${verb}`)
    }
    if (address === 'https://api.resend.com/emails') { emails.push(JSON.parse(init.body)); return Response.json({ id: 'email_test' }) }
    if (address === 'https://oauth2.googleapis.com/token') {
      const params = new URLSearchParams(init.body); tokenRequests.push(params)
      if (tokenFailure) return Response.json({ error: tokenFailure === 400 ? 'invalid_grant' : 'provider_error', private: 'must not leak' }, { status: tokenFailure })
      return Response.json({ access_token: 'access-secret-test', ...(missingRefresh ? {} : { refresh_token: 'refresh-secret-test' }), expires_in: 3600, scope: missingScope ? 'openid' : CALENDAR_SCOPE })
    }
    if (address.startsWith('https://www.googleapis.com/calendar/v3/calendars/')) {
      calendarRequests.push(new URL(url))
      if (eventFailure) return Response.json({ private: 'must not leak' }, { status: eventFailure })
      const query = new URL(url).searchParams
      if (query.get('maxResults') === '1') return Response.json({ items: [] })
      return Response.json({ items: query.has('pageToken') ? nextEvents : events, ...(!query.has('pageToken') && nextEvents ? { nextPageToken: 'second-page' } : {}) })
    }
    throw new Error(`Unexpected real network request: ${url}`)
  }
})
after(async () => { globalThis.fetch = savedFetch; Date.now = savedNow; for (const key of Object.keys(process.env)) if (!Object.hasOwn(savedEnv, key)) delete process.env[key]; Object.assign(process.env, savedEnv); await rm(temporary, { recursive: true, force: true }) })
async function call(input, cookie = '', options = {}) {
  const req = { url: '/api/ai-booking', method: input ? 'POST' : 'GET', socket: { remoteAddress: '127.0.0.1' }, headers: { host: 'localhost:5176', origin: 'http://localhost:5176', 'content-type': 'application/json', cookie }, body: input ? JSON.stringify(input) : undefined, ...options }
  const res = { headers: {}, statusCode: 200, setHeader(key, value) { this.headers[key] = value }, end(value) { this.body = JSON.parse(value) } }
  await (options.dispatch ?? handler)(req, res); return res
}
const cookie = response => String(response.headers['set-cookie']).split(';')[0]
function owner(scoped = false) {
  const token = randomBytes(32).toString('hex'); put(`portal:session:${hash(token)}`, JSON.stringify({ email: 'owner@example.test', ...(scoped ? { engagementId: 'purchase123' } : {}) }))
  return `wallace_client_session=${token}`
}
async function connect() {
  const ownerCookie = owner()
  const result = await call({ action: 'connect' }, ownerCookie)
  assert.equal(result.statusCode, 200, JSON.stringify(result.body))
  const state = new URL(result.body.url).searchParams.get('state')
  const callbackCookie = `${ownerCookie}; ${cookie(result)}`
  const response = await call(undefined, callbackCookie, { url: `/api/ai-booking?action=oauth-callback&state=${state}&code=test-code` })
  assert.equal(response.headers.location, '/client-portal?calendar=connected')
  return { ownerCookie, callbackCookie, state, result, response }
}
async function start(input = body()) {
  const response = await call(input)
  assert.equal(response.statusCode, 200, JSON.stringify(response.body))
  return { cookie: cookie(response), code: emails.at(-1).text.match(/code is (\d{6})/)[1], input }
}
const verify = challenge => call({ action: 'verify-code', code: challenge.code }, challenge.cookie)
async function visitor(input = body()) {
  const challenge = await start(input); const response = await verify(challenge)
  assert.equal(response.statusCode, 200)
  return { ...challenge, cookie: cookie(response) }
}
const poll = (visitor, attemptId = visitor.input.attemptId) => call(undefined, visitor.cookie, { url: `/api/ai-booking?attemptId=${attemptId}` })

test('unconfigured or unconnected provider fails closed without sending email', async () => {
  assert.deepEqual((await call()).body, { ok: true, status: 'unverified', configured: false })
  delete process.env.GOOGLE_CALENDAR_TOKEN_KEY
  const result = await call(undefined, owner(), { url: '/api/ai-booking?action=connection' })
  assert.deepEqual(result.body, { ok: true, configured: false, connected: false })
  assert.equal((await call(body())).body.error, 'calendar_not_connected'); assert.equal(emails.length, 0)
})
test('owner status, connection and stored quizzes reject public and purchase-scoped access', async () => {
  for (const session of ['', owner(true)]) {
    for (const action of ['connection', 'bookings']) assert.equal((await call(undefined, session, { url: `/api/ai-booking?action=${action}` })).statusCode, 403)
    assert.equal((await call({ action: 'connect' }, session)).statusCode, 403)
  }
  assert.equal(tokenRequests.length, 0)
})
test('OAuth uses narrow offline scope, bound state and encrypted durable refresh credentials', async () => {
  const result = await connect(); const url = new URL(result.result.body.url)
  assert.equal(url.origin, 'https://accounts.google.com'); assert.equal(url.searchParams.get('scope'), CALENDAR_SCOPE)
  assert.equal(url.searchParams.get('access_type'), 'offline'); assert.equal(url.searchParams.get('prompt'), 'consent')
  assert.equal(url.searchParams.get('redirect_uri'), 'http://localhost:5176/api/ai-booking?action=oauth-callback')
  assert.match(result.result.headers['set-cookie'], /HttpOnly; SameSite=Lax/)
  assert.match(result.response.headers['cache-control'], /no-store/)
  const stored = get('portal:booking:calendar'); assert.ok(stored); assert.ok(!stored.includes('refresh-secret-test')); assert.ok(!stored.includes('access-secret-test'))
  assert.ok(!store.expirations.has('portal:booking:calendar'))
  const status = await call(undefined, result.ownerCookie, { url: '/api/ai-booking?action=connection' })
  assert.equal(status.body.connected, true); assert.ok(!JSON.stringify(status.body).includes('secret'))
  assert.equal(calendarRequests[0].searchParams.get('maxResults'), '1')
})
test('OAuth callback requires matching state cookie, owner session, unexpired and unused durable state', async () => {
  const session = owner(); const response = await call({ action: 'connect' }, session)
  const state = new URL(response.body.url).searchParams.get('state')
  const url = `/api/ai-booking?action=oauth-callback&state=${state}&code=test`
  for (const invalidCookie of ['', session, `${owner()}; ${cookie(response)}`, `${owner(true)}; ${cookie(response)}`]) {
    assert.equal((await call(undefined, invalidCookie, { url })).headers.location, '/client-portal?calendar=error')
  }
  assert.equal(tokenRequests.length, 0)
  assert.equal((await call(undefined, `${session}; ${cookie(response)}`, { url })).headers.location, '/client-portal?calendar=connected')
  assert.equal((await call(undefined, `${session}; ${cookie(response)}`, { url })).headers.location, '/client-portal?calendar=error')
  assert.equal(tokenRequests.length, 1)
  const next = await call({ action: 'connect' }, session); offset += 601000
  assert.equal((await call(undefined, `${session}; ${cookie(next)}`, { url: `/api/ai-booking?action=oauth-callback&state=${new URL(next.body.url).searchParams.get('state')}&code=test` })).headers.location, '/client-portal?calendar=error')
})
test('OAuth rejects missing refresh credentials, missing scope and unreadable calendar without saving connection', async () => {
  for (const failure of ['refresh', 'scope', 'provider']) {
    missingRefresh = failure === 'refresh'; missingScope = failure === 'scope'; eventFailure = failure === 'provider' ? 403 : 0
    const session = owner(); const response = await call({ action: 'connect' }, session); const state = new URL(response.body.url).searchParams.get('state')
    const result = await call(undefined, `${session}; ${cookie(response)}`, { url: `/api/ai-booking?action=oauth-callback&state=${state}&code=test` })
    assert.equal(result.headers.location, '/client-portal?calendar=error'); assert.equal(get('portal:booking:calendar'), undefined)
    assert.ok(!JSON.stringify(result).includes('must not leak'))
  }
})
test('changing encryption key, owner or calendar disables the saved connection', async () => {
  const connected = await connect()
  process.env.GOOGLE_CALENDAR_TOKEN_KEY = 'cd'.repeat(32)
  assert.equal((await call(undefined, connected.ownerCookie, { url: '/api/ai-booking?action=connection' })).body.connected, false)
  process.env.GOOGLE_CALENDAR_TOKEN_KEY = 'ab'.repeat(32); process.env.GOOGLE_CALENDAR_ID = 'another@example.test'
  assert.equal((await call()).body.configured, false)
})
test('public API rewrite dispatches without adding a serverless function and Vite forwards only server configuration', async () => {
  const config = JSON.parse(await readFile(join(root, 'vercel.json'), 'utf8'))
  assert.equal(config.rewrites.find(item => item.source === '/api/ai-booking').destination, '/api/demo-admin?offer=booking')
  for (const url of ['/api/ai-booking', '/api/demo-admin?offer=booking']) assert.equal((await call(undefined, '', { dispatch: deployed, url })).body.status, 'unverified')
  const vite = await readFile(join(root, 'vite.config.ts'), 'utf8')
  assert.ok(vite.includes("'/api/ai-booking': '/api/_lib/ai-booking-handler.ts'")); assert.ok(vite.includes('|GOOGLE_CALENDAR_|'))
})
test('rejects cross origin and malformed or unqualified submissions without contacting visitor', async () => {
  await connect()
  assert.equal((await call(body(), '', { headers: { host: 'localhost:5176', origin: 'https://attacker.example', 'content-type': 'application/json' } })).statusCode, 403)
  for (const input of [body({ attemptId: 'bad' }), body({ company: 'bot' }), body({ amount: 1 }), body({ answers: {} }), body({ answers: { ...answers, unknown: true } }), body({ answers: { ...answers, budget: 'needs_approval' } }), body({ answers: { ...answers, timing: 'quarter' } }), body({ email: 'not-email' })]) assert.equal((await call(input)).statusCode, 400)
  assert.equal(emails.length, 0)
})
test('qualification follows investment and timing rather than revenue or role and saves normalized answers before verification', async () => {
  await connect()
  const input = body({ email: ' VISITOR@example.test ', answers: { ...answers, role: 'researcher', approverAvailability: 'not_sure', revenue: 'not_yet', timing: 'now' } })
  // Use an actual valid nonowner role option from the shared schema.
  const content = await load('src/content/aiOffer.ts')
  input.answers.role = content.roleOptions.find(item => !['owner', 'decision_maker'].includes(item.value)).value
  input.answers.approverAvailability = content.approverOptions.at(-1).value
  input.answers.revenue = content.revenueOptions[0].value
  const challenge = await start(input)
  const pending = JSON.parse([...store.values.entries()].find(([key]) => key.startsWith('portal:booking:pending:'))[1])
  assert.equal(pending.intent.email, 'visitor@example.test'); assert.equal(pending.intent.answers.timing, 'now')
  assert.equal(emails.length, 1); assert.deepEqual(emails[0].to, ['visitor@example.test'])
  assert.equal((await poll(challenge)).body.status, 'unverified'); assert.equal(get('portal:booking:records'), undefined)
})
test('codes are mandatory, bounded, single purpose and do not grant portal access', async () => {
  await connect(); const challenge = await start()
  assert.equal((await call({ action: 'verify-code', code: challenge.code })).body.error, 'code_expired')
  const response = await verify(challenge); assert.equal(response.statusCode, 200)
  assert.match(response.headers['set-cookie'], /wallace_booking_session=.*HttpOnly/)
  assert.equal(await identity({ headers: { cookie: cookie(response) } }), null)
  assert.equal((await call(undefined, cookie(response), { url: '/api/ai-booking?action=bookings' })).statusCode, 403)
  assert.deepEqual((await poll({ ...challenge, cookie: cookie(response) })).body, { ok: true, status: 'waiting', configured: true })
})
test('wrong codes reach the attempt cap and expired codes cannot verify', async () => {
  await connect(); const challenge = await start()
  const wrong = challenge.code === '000000' ? '000001' : '000000'
  for (let n = 0; n < 5; n++) assert.equal((await call({ action: 'verify-code', code: wrong }, challenge.cookie)).body.error, 'code_invalid')
  assert.equal((await verify(challenge)).statusCode, 429)
  offset += 601000; assert.equal((await verify(challenge)).body.error, 'code_expired')
})
test('verified code proof survives a failed session write and can safely retry', async () => {
  await connect(); const challenge = await start(); failSessionOnce = true
  assert.equal((await verify(challenge)).statusCode, 503)
  assert.equal((await verify(challenge)).statusCode, 200)
  assert.equal((await verify(challenge)).statusCode, 200)
})
test('resending preserves initial intent time and refuses different answers under the same attempt', async () => {
  await connect(); const input = body(); await start(input)
  const intentKey = [...store.values.keys()].find(key => key.startsWith('portal:booking:intent:'))
  const initial = JSON.parse(get(intentKey)).startedAt
  offset += 61000; await start(input)
  assert.equal(JSON.parse(get(intentKey)).startedAt, initial)
  assert.equal((await call({ ...input, answers: { ...answers, timing: 'now' } })).body.error, 'attempt_conflict')
})
test('recipient cooldown and IP cap limit verification delivery', async () => {
  await connect(); const input = body(); await start(input)
  assert.equal((await call(input)).statusCode, 429)
  for (let n = 0; n < 6; n++) await start(body({ email: `visitor${n}@example.test` }))
  assert.equal((await call(body({ email: 'last@example.test' }))).statusCode, 429)
  assert.equal(emails.length, 7)
})
test('only current verified attempt can poll and confirmed result exposes no event or attendee data', async () => {
  const connected = await connect(); const session = await visitor(); events = [event()]
  assert.deepEqual((await poll(session, randomUUID())).body, { ok: true, status: 'unverified', configured: true })
  const before = calendarRequests.length
  const response = await poll(session)
  assert.deepEqual(response.body, { ok: true, status: 'confirmed', configured: true })
  assert.equal(calendarRequests.length, before + 1)
  const bookings = await call(undefined, connected.ownerCookie, { url: '/api/ai-booking?action=bookings' })
  assert.equal(bookings.body.bookings.length, 1); assert.deepEqual(bookings.body.bookings[0].answers, answers)
  assert.equal(bookings.body.bookings[0].email, 'visitor@example.test'); assert.equal(bookings.body.bookings[0].googleEventId, undefined)
  assert.equal(get('portal:engagements'), undefined); assert.equal(emails.length, 1)
  await poll(session); assert.equal(calendarRequests.length, before + 1)
})
test('requires owner organizer, exact verified attendee, configured title, future 45 minute confirmed appointment and recent creation', () => {
  const now = Date.now()
  for (const responseStatus of ['accepted', 'tentative', 'needsAction']) assert.equal(isMatchingBooking(event({ attendees: [{ email: 'VISITOR@example.test', responseStatus }] }), 'visitor@example.test', now), true)
  for (const invalid of [
    { status: 'cancelled' }, { status: 'tentative' }, { organizer: { self: false } }, { organizer: {} }, { organizer: { self: true } }, { summary: 'Another appointment' }, { summary: 'Wallace Shift - Project ConsultationEvil' },
    { attendees: [{ email: 'other@example.test', responseStatus: 'accepted' }] }, { attendees: [{ email: 'visitor@example.test', responseStatus: 'declined' }] }, { attendees: [{ email: 'visitor@example.test' }] }, { attendees: [{ email: 'visitor@example.test', responseStatus: 'unknown' }] },
    { created: new Date(now - 301000).toISOString() }, { created: 'invalid' }, { start: { dateTime: new Date(now - 1000).toISOString() } }, { start: { date: '2026-11-04' } }, { end: { dateTime: new Date(now + 86400000 + 30 * 60000).toISOString() } },
  ]) assert.equal(isMatchingBooking(event(invalid), 'visitor@example.test', now), false, JSON.stringify(invalid))
  assert.equal(isMatchingBooking(event({ summary: 'Wallace Shift - Project Consultation (Visitor)' }), 'visitor@example.test', now), true)
})
test('ambiguous matching appointments never choose one and pagination preserves ambiguity', async () => {
  await connect(); const session = await visitor(); events = [event(), event({ id: 'event-second' })]
  assert.equal((await poll(session)).body.status, 'waiting'); assert.equal(get('portal:booking:records'), undefined)
  offset += 9000; events = [event()]; nextEvents = [event({ id: 'second-page-event' })]
  assert.equal((await poll(session)).body.status, 'waiting'); assert.equal(get('portal:booking:records'), undefined)
  assert.equal(calendarRequests.at(-1).searchParams.get('pageToken'), 'second-page')
})
test('provider outage does not confirm, leak provider data or discard the saved connection', async () => {
  await connect(); const session = await visitor(); eventFailure = 503
  const response = await poll(session)
  assert.equal(response.statusCode, 503); assert.equal(response.body.error, 'calendar_unavailable')
  assert.ok(!JSON.stringify(response).includes('must not leak')); assert.ok(get('portal:booking:calendar'))
  assert.equal(get('portal:booking:records'), undefined)
})
test('revoked calendar permission invalidates only the saved connection and requires reconnect', async () => {
  await connect(); const session = await visitor(); eventFailure = 403
  assert.equal((await poll(session)).body.error, 'calendar_reconnect_required')
  assert.equal(get('portal:booking:calendar'), undefined)
  assert.deepEqual((await poll(session)).body, { ok: true, status: 'waiting', configured: false })
})
test('expired access tokens refresh privately and invalid_grant disables automatic confirmation', async () => {
  await connect(); const session = await visitor(); offset += 3600000; tokenFailure = 400
  const response = await poll(session)
  assert.equal(response.body.error, 'calendar_reconnect_required')
  assert.equal(tokenRequests.at(-1).get('grant_type'), 'refresh_token')
  assert.equal(tokenRequests.at(-1).get('refresh_token'), 'refresh-secret-test')
  assert.equal(get('portal:booking:calendar'), undefined)
})
test('cancelled bookings are no longer confirmed after short cache expiry', async () => {
  await connect(); const session = await visitor(); events = [event()]
  assert.equal((await poll(session)).body.status, 'confirmed')
  offset += 9000; events = [event({ status: 'cancelled' })]
  assert.equal((await poll(session)).body.status, 'waiting')
})

test('reconnecting cannot silently pair a new Google account with an old refresh token', async () => {
  const connected = await connect(); const before = get('portal:booking:calendar'); missingRefresh = true
  const result = await call({ action: 'connect' }, connected.ownerCookie); const state = new URL(result.body.url).searchParams.get('state')
  const response = await call(undefined, `${connected.ownerCookie}; ${cookie(result)}`, { url: `/api/ai-booking?action=oauth-callback&state=${state}&code=another-account-code` })
  assert.equal(response.headers.location, '/client-portal?calendar=error')
  assert.equal(get('portal:booking:calendar'), before)
})
test('verification retries share one poll budget and confirmed record', async () => {
  await connect(); const challenge = await start(); events = [event()]
  const firstCookie = cookie(await verify(challenge)); const secondCookie = cookie(await verify(challenge))
  assert.notEqual(firstCookie, secondCookie)
  const first = { ...challenge, cookie: firstCookie }; const second = { ...challenge, cookie: secondCookie }
  const before = calendarRequests.length
  assert.equal((await poll(first)).body.status, 'confirmed')
  assert.equal((await poll(second)).body.status, 'confirmed')
  assert.equal(calendarRequests.length, before + 1)
  assert.equal(get('portal:booking:records').size, 1)
})
test('parallel tabs share the distributed poll lock and cannot duplicate saved records', async () => {
  await connect(); const session = await visitor(); events = [event()]
  const before = calendarRequests.length
  const results = await Promise.all([poll(session), poll(session)])
  assert.ok(results.some(result => result.body.status === 'confirmed'))
  assert.equal(calendarRequests.length, before + 1)
  assert.equal(get('portal:booking:records').size, 1)
})

test('reconnecting the same calendar keeps one booking while another primary calendar stays distinct', async () => {
  await connect(); const session = await visitor(); events = [event()]
  assert.equal((await poll(session)).body.status, 'confirmed')
  const firstId = [...get('portal:booking:records').keys()][0]
  const firstRecord = get(`portal:booking:record:${firstId}`)
  await connect(); events = [event({ organizer: { self: true, email: 'OWNER@example.test' } })]
  assert.equal((await poll(session)).body.status, 'confirmed')
  assert.equal(get('portal:booking:records').size, 1)
  assert.equal(get(`portal:booking:record:${firstId}`), firstRecord)
  await connect(); events = [event({ organizer: { self: true, email: 'another-account@example.test' } })]
  assert.equal((await poll(session)).body.status, 'confirmed')
  assert.equal(get('portal:booking:records').size, 2)
})
