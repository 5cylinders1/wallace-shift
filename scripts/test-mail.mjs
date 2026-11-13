import assert from 'node:assert/strict'
import { beforeEach, after, test } from 'node:test'
import { randomUUID } from 'node:crypto'
import { Readable } from 'node:stream'
import { mkdtemp, mkdir, readFile, writeFile, symlink, rm } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { pathToFileURL, fileURLToPath } from 'node:url'
import ts from 'typescript'

const root = fileURLToPath(new URL('../', import.meta.url))
const temporary = await mkdtemp(join(tmpdir(), 'wallace-mail-test-'))
await symlink(join(root, 'node_modules'), join(temporary, 'node_modules'), 'dir')
const compiled = new Map()
async function compile(relative) {
  if (compiled.has(relative)) return compiled.get(relative)
  const target = join(temporary, `${relative}.mjs`); compiled.set(relative, target)
  let source = ts.transpileModule(await readFile(join(root, relative), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext, esModuleInterop: true } }).outputText
  for (const match of [...source.matchAll(/(from\s+|import\(\s*)(['"])(\.[^'"]+)\2/g)]) {
    const path = await compile(join(dirname(relative), match[3].replace(/\.js$/, '.ts')))
    source = source.replace(match[0], `${match[1]}${JSON.stringify(pathToFileURL(path).href)}`)
  }
  await mkdir(dirname(target), { recursive: true }); await writeFile(target, source); return target
}
const load = async file => import(pathToFileURL(await compile(file)).href)
const { default: handler } = await load('api/_lib/mail-handler.ts')
const { default: deployedHandler, config: deployedConfig } = await load('api/demo-admin.ts')
const { mailKey, mailHash, userKey } = await load('api/_lib/mail-store.ts')
const { cleanMailHtml, mailAttachments } = await load('api/_lib/mail-content.ts')
const { MAIL_LIMITS } = await load('src/mail/model.ts')
const savedEnv = { ...process.env }, savedFetch = globalThis.fetch
const origin = 'http://localhost:5176'
const matthew = 'matthew@wallaceshift.com', bella = 'bella@wallaceshift.com'
const token = 'a'.repeat(64), otherToken = 'b'.repeat(64)
let values, expires, sorted, emailRequests, accepted, mode, now
const get = key => {
  if (expires.has(key) && expires.get(key) <= now) { values.delete(key); expires.delete(key) }
  return values.get(key) ?? null
}
const set = (key, value, ttl) => { values.set(key, value); if (ttl) expires.set(key, now + ttl * 1000); else expires.delete(key) }
const increment = (key, ttl) => { const before = get(key); values.set(key, String(Number(before ?? 0) + 1)); if (before === null) expires.set(key, now + ttl * 1000); return Number(values.get(key)) }

// Isolated Redis command model. Every provider request is mocked, including OTP.
function redis(command) {
  const [verb, key, value, ...rest] = command
  if (verb === 'GET') return get(key)
  if (verb === 'SET') { set(key, value, rest[0] === 'EX' ? Number(rest[1]) : undefined); return 'OK' }
  if (verb === 'DEL') { const present = values.has(key); values.delete(key); expires.delete(key); return present ? 1 : 0 }
  if (verb === 'MGET') return command.slice(1).map(get)
  if (verb === 'ZREVRANGE') return [...(sorted.get(key) ?? [])].sort((a, b) => b[1] - a[1]).slice(value, Number(rest[0]) + 1).map(([id]) => id)
  assert.equal(verb, 'EVAL')
  const count = Number(value), keys = rest.slice(0, count), args = rest.slice(count)
  const operation = key.split('\n')[0]
  if (operation === '-- wallace-mail:limit') return increment(keys[0], Number(args[0]))
  if (operation === '-- wallace-mail:challenge') {
    if (get(keys[1]) !== null) return 0
    if (Number(get(keys[2]) ?? 0) >= 15 || Number(get(keys[3]) ?? 0) >= 5 || Number(get(keys[4]) ?? 0) >= 100) return 0
    for (let i = 2; i <= 4; i++) increment(keys[i], i === 4 ? 86400 : 3600)
    set(keys[1], '1', 60); set(keys[0], args[0], 600); return 1
  }
  if (operation === '-- wallace-mail:verify') {
    const raw = get(keys[0]); if (!raw) return ['code_expired']
    const item = JSON.parse(raw)
    if (item.expiresAt <= Number(args[2])) { values.delete(keys[0]); return ['code_expired'] }
    if (item.origin !== args[1]) return ['code_invalid']
    if (item.attempts >= 5) return ['rate_limited']
    item.attempts++
    if (item.digest !== args[0]) { values.set(keys[0], JSON.stringify(item)); return ['code_invalid'] }
    values.delete(keys[0]); return ['ok', item.email]
  }
  if (operation === '-- wallace-mail:cas') {
    if (get(keys[0]) !== args[0]) return 0
    set(keys[0], args[1]); return 1
  }
  if (operation === '-- wallace-mail:reserve-send') {
    const old = get(keys[0]); if (old) return old
    if (Number(get(keys[3]) ?? 0) >= 60 || Number(get(keys[4]) ?? 0) >= 250 || Number(get(keys[5]) ?? 0) >= 500) return 'rate_limited'
    for (let i = 3; i <= 5; i++) increment(keys[i], i === 3 ? 3600 : 86400)
    set(keys[0], args[0]); set(keys[1], args[1], 86400)
    const index = sorted.get(keys[2]) ?? new Map(); index.set(args[3], Number(args[2])); sorted.set(keys[2], new Map([...index].sort((a, b) => b[1] - a[1]).slice(0, 50)))
    return args[0]
  }
  throw new Error(`Unexpected script ${operation}`)
}
beforeEach(() => {
  process.env.NODE_ENV = 'test'; process.env.VERCEL_ENV = 'development'; delete process.env.VERCEL
  Object.assign(process.env, { DEMO_AUDIT_REDIS_URL: 'https://mail-redis.example.test', DEMO_AUDIT_REDIS_TOKEN: 'fake', RESEND_API_KEY: 'fake', CONTACT_FROM_EMAIL: 'login@example.test' })
  delete process.env.MAIL_LOGIN_FROM_EMAIL
  values = new Map(); expires = new Map(); sorted = new Map(); emailRequests = []; accepted = new Map(); mode = 'ok'; now = Date.now()
  for (const [key, email] of [[token, matthew], [otherToken, bella]]) set(mailKey(`session:${mailHash(key)}`), JSON.stringify({ email, origin }), 28800)
  globalThis.fetch = async (url, init) => {
    if (url === 'https://mail-redis.example.test') {
      if (mode === 'storage-failed') throw new Error('Storage offline')
      const command = JSON.parse(init.body)
      if (mode === 'commit-lost' && command[0] === 'EVAL' && command[1].startsWith('-- wallace-mail:cas') && JSON.parse(command.at(-1)).status === 'sent') throw new Error('Storage failed after provider accepted')
      return Response.json({ result: redis(command) })
    }
    assert.equal(url, 'https://api.resend.com/emails')
    const key = init.headers['idempotency-key']; emailRequests.push({ key, body: init.body })
    if (mode === 'reject') return Response.json({ message: 'Unavailable' }, { status: 503 })
    if (accepted.has(key)) assert.equal(accepted.get(key), init.body)
    else accepted.set(key, init.body)
    if (mode === 'lost-response') throw new Error('Provider accepted but response lost')
    return Response.json({ id: `email-${accepted.size}` })
  }
})
after(async () => { globalThis.fetch = savedFetch; for (const key of Object.keys(process.env)) if (!(key in savedEnv)) delete process.env[key]; Object.assign(process.env, savedEnv); await rm(temporary, { recursive: true, force: true }) })
async function call(body, cookie = `wallace_mail_session=${token}`, overrides = {}) {
  const req = { method: body ? 'POST' : 'GET', url: '/api/mail', socket: { remoteAddress: '127.0.0.1' }, body, headers: { host: 'localhost:5176', origin, 'content-type': 'application/json', cookie, ...overrides.headers }, ...overrides }
  if (overrides.headers) req.headers = { host: 'localhost:5176', origin, 'content-type': 'application/json', cookie, ...overrides.headers }
  const res = { statusCode: 200, headers: {}, setHeader(key, value) { this.headers[key] = value }, end(value) { this.body = JSON.parse(value) } }
  await (overrides.dispatch ?? handler)(req, res); return res
}
const draft = overrides => ({ action: 'send', id: randomUUID(), from: matthew, to: ['client@example.test'], cc: [], bcc: [], subject: 'Project update', html: '<p>Hello <strong>there</strong>.</p>', attachments: [], ...overrides })
const cookieFrom = (response, name) => [response.headers['set-cookie']].flat().find(cookie => cookie.startsWith(`${name}=`)).split(';')[0]
async function challenge(email = matthew) {
  const response = await call({ action: 'send-code', email }, '')
  assert.equal(response.statusCode, 200)
  return { cookie: cookieFrom(response, 'wallace_mail_pending'), code: JSON.parse(emailRequests.at(-1).body).text.match(/code is (\d{6})/)[1] }
}

test('requires verified staff session for all content and sending; unrelated portal sessions confer no access', async () => {
  for (const cookie of ['', `wallace_client_session=${token}`, `wallace_mail_session=${token}; wallace_mail_session=${token}`]) {
    assert.deepEqual((await call(undefined, cookie)).body, { authenticated: false })
    assert.equal((await call(draft(), cookie)).statusCode, 401)
    assert.equal((await call({ action: 'save-signature', sender: matthew, html: '<p>Name</p>' }, cookie)).statusCode, 401)
  }
  assert.equal(emailRequests.length, 0)
})
test('deployed dispatcher preserves mail authentication for the public alias, rewrite, and parsed query', async () => {
  assert.equal(deployedConfig.api.bodyParser, false)
  const config = JSON.parse(await readFile(join(root, 'vercel.json'), 'utf8'))
  assert.equal(config.rewrites.find(rule => rule.source === '/api/mail').destination, '/api/demo-admin?mail=team')
  for (const route of [{ url: '/api/mail' }, { url: '/api/demo-admin?mail=team' }, { url: '/api/demo-admin', query: { mail: 'team' } }]) {
    const options = { ...route, dispatch: deployedHandler }
    const anonymous = await call(undefined, '', options)
    assert.equal(anonymous.statusCode, 200)
    assert.deepEqual(anonymous.body, { authenticated: false })
    assert.match(anonymous.headers['cache-control'], /no-store/)
    assert.equal((await call(draft(), '', options)).statusCode, 401)
    assert.equal((await call({ action: 'send-code', email: 'outside@example.test' }, '', options)).body.error, 'work_email_required')
    const member = await call(undefined, `wallace_mail_session=${token}`, options)
    assert.equal(member.statusCode, 200)
    assert.equal(member.body.authenticated, true)
    assert.equal(member.body.email, matthew)
    assert.deepEqual(member.body.messages, [])
  }
  assert.equal(emailRequests.length, 0)
})
test('rejects outside domains and lookalikes; allows exact domain after single-use verification', async () => {
  for (const email of ['a@example.test', 'a@wallaceshift.com.evil.test', 'a@sub.wallaceshift.com', 'a@wallaceshift.com\nBcc:x@evil.test', 'a..b@wallaceshift.com']) assert.equal((await call({ action: 'send-code', email }, '')).statusCode, 403)
  assert.equal(emailRequests.length, 0)
  const pending = await challenge(' New.Person@WallaceShift.com ')
  assert.deepEqual(JSON.parse(emailRequests[0].body).to, ['new.person@wallaceshift.com'])
  assert.equal((await call(undefined, pending.cookie)).body.authenticated, false)
  const verified = await call({ action: 'verify-code', code: pending.code }, pending.cookie)
  assert.equal(verified.body.authenticated, true); assert.equal(verified.body.email, 'new.person@wallaceshift.com')
  const session = cookieFrom(verified, 'wallace_mail_session')
  assert.match(verified.headers['set-cookie'][0], /HttpOnly; SameSite=Lax/)
  assert.equal((await call(undefined, session)).body.authenticated, true)
  assert.equal((await call({ action: 'verify-code', code: pending.code }, pending.cookie)).body.error, 'code_expired')
  await call({ action: 'logout' }, session)
  assert.equal((await call(undefined, session)).body.authenticated, false)
})
test('codes expire, rate limits persist across cookies, and five wrong guesses lock a challenge', async () => {
  const pending = await challenge()
  assert.equal((await call({ action: 'send-code', email: matthew }, '')).statusCode, 429)
  const wrong = pending.code === '000000' ? '000001' : '000000'
  for (let i = 0; i < 5; i++) assert.equal((await call({ action: 'verify-code', code: wrong }, pending.cookie)).body.error, 'code_invalid')
  assert.equal((await call({ action: 'verify-code', code: pending.code }, pending.cookie)).statusCode, 429)
  const another = await challenge(bella); now += 600001
  assert.equal((await call({ action: 'verify-code', code: another.code }, another.cookie)).body.error, 'code_expired')
})
test('cooldown retries do not burn code budgets and only five actual reservations exhaust the hourly allowance', async () => {
  await challenge()
  const rejected = await Promise.all(Array.from({ length: 10 }, () => call({ action: 'send-code', email: matthew }, '')))
  assert.ok(rejected.every(response => response.statusCode === 429))
  assert.equal(emailRequests.length, 1)
  const emailCounter = [...values.keys()].find(key => key.includes(`login-email:${mailHash(matthew)}:`))
  const ipCounter = [...values.keys()].find(key => key.includes(`login-ip:${mailHash('127.0.0.1')}:`))
  const globalCounter = [...values.keys()].find(key => key.includes(':login-global:'))
  for (const key of [emailCounter, ipCounter, globalCounter]) assert.equal(Number(get(key)), 1)
  for (let i = 1; i < 5; i++) { now += 60001; await challenge() }
  assert.equal(emailRequests.length, 5)
  for (const key of [emailCounter, ipCounter, globalCounter]) assert.equal(Number(get(key)), 5)
  now += 60001
  assert.equal((await call({ action: 'send-code', email: matthew }, '')).statusCode, 429)
  assert.equal(emailRequests.length, 5)
  // A rejected mailbox cap does not consume the IP or environment budget.
  for (const key of [emailCounter, ipCounter, globalCounter]) assert.equal(Number(get(key)), 5)
})
test('sessions are bound to origin and environment and contain only exact-domain identities', async () => {
  assert.equal((await call(undefined, undefined, { headers: { host: 'wallaceshift.com' } })).body.authenticated, false)
  process.env.VERCEL_ENV = 'production'
  assert.equal((await call(undefined)).body.authenticated, false)
  process.env.VERCEL_ENV = 'development'
  set(mailKey(`session:${mailHash(token)}`), JSON.stringify({ email: 'outsider@example.test', origin }), 28800)
  assert.equal((await call(undefined)).body.authenticated, false)
})
test('sign-in rate limiting trusts the socket locally and only Vercel client headers in production', async () => {
  const spoofed = await call({ action: 'send-code', email: matthew }, '', { headers: { 'x-vercel-forwarded-for': '198.51.100.10', 'x-forwarded-for': '198.51.100.20' } })
  assert.equal(spoofed.statusCode, 200)
  assert.ok([...values.keys()].some(key => key.includes(`login-ip:${mailHash('127.0.0.1')}`)))
  assert.ok(![...values.keys()].some(key => key.includes(mailHash('198.51.100.10'))))
  process.env.VERCEL = '1'; process.env.VERCEL_ENV = 'production'
  const headers = { host: 'wallaceshift.com', origin: 'https://wallaceshift.com' }
  assert.equal((await call({ action: 'send-code', email: bella }, '', { headers: { ...headers, 'x-forwarded-for': '198.51.100.10' } })).statusCode, 403)
  for (const invalid of ['198.51.100.10, 198.51.100.20', '::::', '999.999.999.999']) assert.equal((await call({ action: 'send-code', email: bella }, '', { headers: { ...headers, 'x-vercel-forwarded-for': invalid } })).statusCode, 403)
  const pending = await call({ action: 'send-code', email: bella }, '', { headers: { ...headers, 'x-vercel-forwarded-for': '2001:db8::1' } })
  assert.equal(pending.statusCode, 200); assert.match(pending.headers['set-cookie'], /; Secure$/)
  assert.ok([...values.keys()].some(key => key.startsWith('wallace-mail:production:') && key.includes(`login-ip:${mailHash('2001:db8::1')}`)))
})
test('cross-origin, malformed JSON, oversized, and non-POST mutations are rejected', async () => {
  assert.equal((await call(draft(), undefined, { headers: { origin: 'https://evil.test' } })).statusCode, 403)
  assert.equal((await call(draft(), undefined, { headers: { 'sec-fetch-site': 'cross-site' } })).statusCode, 403)
  assert.equal((await call(draft(), undefined, { headers: { 'content-type': 'text/plain' } })).statusCode, 400)
  assert.equal((await call('{')).statusCode, 400)
  assert.equal((await call([])).statusCode, 400)
  assert.equal((await call(draft(), undefined, { method: 'DELETE' })).statusCode, 405)
  assert.equal((await call(draft(), undefined, { headers: { 'content-length': '4400001' } })).statusCode, 413)
  assert.equal(emailRequests.length, 0)
})
test('signatures persist per verified user and sender with dangerous markup removed', async () => {
  const html = '<table style="border-collapse:collapse"><tr><td><b>Matthew</b><img src="https://example.test/logo.png" onerror="alert(1)"><a href="javascript:alert(1)">bad</a><script>alert(1)</script></td></tr></table>'
  const saved = await call({ action: 'save-signature', sender: matthew, html })
  assert.equal(saved.statusCode, 200)
  assert.match(saved.body.signatures[matthew], /<table/); assert.match(saved.body.signatures[matthew], /https:\/\/example.test/)
  assert.doesNotMatch(saved.body.signatures[matthew], /script|onerror|javascript/)
  assert.equal((await call(undefined)).body.signatures[matthew], saved.body.signatures[matthew])
  assert.equal((await call(undefined, `wallace_mail_session=${otherToken}`)).body.signatures[matthew], '')
  assert.equal(saved.body.signatures[bella], '')
  assert.equal((await call({ action: 'save-signature', sender: 'attacker@example.test', html })).body.error, 'invalid_sender')
  assert.equal((await call({ action: 'save-signature', sender: matthew, html: 'x'.repeat(30001) })).statusCode, 413)
})
test('sanitizer removes active HTML, CSS and unsafe URL schemes while retaining email formatting', () => {
  const safe = cleanMailHtml('<p style="color:#123456;position:fixed;background-image:url(https://evil.test)">Text</p><img src="data:image/svg+xml,bad"><iframe src="https://evil.test"></iframe><a href="//evil.test">link</a><svg onload="alert(1)"></svg>')
  assert.match(safe, /color:#123456/); assert.doesNotMatch(safe, /position|url\(|data:|iframe|svg|onload|href/)
})
test('sends either allowed identity with To/Cc/Bcc, sanitized HTML/plain text and attachments', async () => {
  for (const from of [matthew, bella]) {
    const message = draft({ from, cc: ['cc@example.test'], bcc: ['private@example.test'], html: '<p>Hello <b>friend</b></p><script>alert(1)</script>', attachments: [{ filename: 'brief.pdf', content: Buffer.from('pdf sample').toString('base64'), contentType: 'application/pdf' }] })
    const response = await call(message)
    assert.equal(response.body.message.status, 'sent'); assert.equal(response.body.message.from, from)
    assert.equal(response.body.message.attachments[0].size, 10)
    const email = JSON.parse(emailRequests.at(-1).body)
    assert.ok(email.from.endsWith(`<${from}>`)); assert.equal(email.reply_to, from)
    assert.deepEqual(email.cc, message.cc); assert.deepEqual(email.bcc, message.bcc)
    assert.doesNotMatch(email.html, /<script/); assert.equal(email.text, 'Hello friend')
    assert.equal(email.attachments[0].content_type, 'application/pdf')
    assert.equal(Buffer.from(email.attachments[0].content, 'base64').toString(), 'pdf sample')
    assert.equal(get(userKey(matthew, `payload:${message.id}`)), null)
  }
  const history = (await call(undefined)).body.messages
  assert.equal(history.length, 2); assert.equal(JSON.stringify(history).includes('fingerprint'), false); assert.equal(JSON.stringify(history).includes('content_type'), false)
  assert.equal((await call(undefined, `wallace_mail_session=${otherToken}`)).body.messages.length, 0)
})
test('server validates sender, recipients, subject, content, and file limits independently of client', async () => {
  for (const overrides of [{ from: 'evil@example.test' }, { to: ['a@example.test\r\nBcc:evil@example.test'] }, { to: [] }, { to: Array.from({ length: 51 }, (_, i) => `person${i}@example.test`) }, { subject: 'Subject\r\nBcc:evil@example.test' }, { subject: '' }, { html: '<script>bad()</script>' }, { html: 'x'.repeat(100001) }, { attachments: [{ filename: '../brief.pdf', content: '', contentType: 'application/pdf' }] }, { attachments: [{ filename: 'script.js', content: '', contentType: 'text/javascript' }] }, { attachments: [{ filename: 'brief.pdf', content: 'invalid!', contentType: 'application/pdf' }] }, { attachments: [{ filename: 'brief.pdf', content: '', contentType: 'application/pdf\r\nX: y' }] }]) assert.ok((await call(draft(overrides))).statusCode >= 400, JSON.stringify(overrides).slice(0, 200))
  assert.equal(emailRequests.length, 0)
  const max = Buffer.alloc(MAIL_LIMITS.attachmentBytes).toString('base64')
  assert.equal(mailAttachments([{ filename: 'max.pdf', content: max, contentType: 'application/pdf' }])[0].content, max)
  assert.throws(() => mailAttachments([{ filename: 'max.pdf', content: max }, { filename: 'extra.txt', content: 'YQ==' }]), /attachments_too_large/)
})
test('duplicate/concurrent sends use a single immutable provider request and cannot cross users', async () => {
  const message = draft()
  const responses = await Promise.all([call(message), call(message), call(message)])
  assert.ok(responses.every(response => response.statusCode === 200))
  assert.equal(accepted.size, 1)
  assert.equal((await call(message)).body.message.status, 'sent')
  assert.equal(emailRequests.length, 1)
  assert.equal((await call({ ...message, html: '<p>Changed</p>' })).body.error, 'message_changed')
  assert.equal((await call({ action: 'retry-send', id: message.id }, `wallace_mail_session=${otherToken}`)).body.error, 'message_not_found')
})
test('lost provider responses and temporary failures retry the frozen payload and idempotency key', async () => {
  const message = draft(); mode = 'lost-response'
  assert.equal((await call(message)).body.message.status, 'failed')
  assert.equal(accepted.size, 1)
  await call({ action: 'save-signature', sender: matthew, html: '<p>New signature</p>' })
  mode = 'ok'
  assert.equal((await call({ action: 'retry-send', id: message.id })).body.message.status, 'sent')
  assert.equal(accepted.size, 1); assert.deepEqual(emailRequests[0], emailRequests[1])
  assert.equal((await call({ action: 'retry-send', id: randomUUID() })).body.error, 'message_not_found')
})
test('uncertain sends outside the safe retry window require review instead of risking duplicates', async () => {
  const message = draft(); mode = 'lost-response'
  await call(message)
  const key = userKey(matthew, `message:${message.id}`), record = JSON.parse(get(key))
  record.createdAt = new Date(Date.now() - 24 * 3600000).toISOString(); set(key, JSON.stringify(record))
  mode = 'ok'
  assert.equal((await call({ action: 'retry-send', id: message.id })).body.message.status, 'review')
  assert.equal(emailRequests.length, 1)
})
test('a lost durable confirmation after provider acceptance retries only after its lease and never duplicates', async () => {
  const message = draft(); mode = 'commit-lost'
  assert.equal((await call(message)).statusCode, 503)
  assert.equal(accepted.size, 1)
  mode = 'ok'
  assert.equal((await call({ action: 'retry-send', id: message.id })).body.message.status, 'pending')
  assert.equal(emailRequests.length, 1)
  const key = userKey(matthew, `message:${message.id}`), record = JSON.parse(get(key))
  record.lease.until = Date.now() - 1; set(key, JSON.stringify(record))
  assert.equal((await call({ action: 'retry-send', id: message.id })).body.message.status, 'sent')
  assert.equal(accepted.size, 1); assert.deepEqual(emailRequests[0], emailRequests[1])
})
test('missing provider config and failed storage stop delivery without fabricated success', async () => {
  delete process.env.RESEND_API_KEY
  assert.equal((await call(draft())).body.error, 'email_not_configured')
  process.env.RESEND_API_KEY = 'fake'; mode = 'storage-failed'
  assert.equal((await call(draft())).statusCode, 503)
  assert.equal((await call(undefined)).statusCode, 503)
  assert.equal(emailRequests.length, 0)
})
test('request streaming handles raw JSON as used by deployed serverless dispatch', async () => {
  const message = draft(), req = Readable.from([Buffer.from(JSON.stringify(message))])
  Object.assign(req, { method: 'POST', headers: { host: 'localhost:5176', origin, 'content-type': 'application/json', cookie: `wallace_mail_session=${token}` }, socket: { remoteAddress: '127.0.0.1' } })
  const res = { statusCode: 200, headers: {}, setHeader(key, value) { this.headers[key] = value }, end(value) { this.body = JSON.parse(value) } }
  await handler(req, res)
  assert.equal(res.body.message.status, 'sent')
  assert.match(res.headers['cache-control'], /no-store/)
})
