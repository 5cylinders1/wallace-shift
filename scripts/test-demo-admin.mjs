import assert from 'node:assert/strict'
import { after, beforeEach, test } from 'node:test'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { Readable } from 'node:stream'
import { fileURLToPath, pathToFileURL } from 'node:url'
import ts from 'typescript'
import { createAgreementTestStore } from './demo-agreement-test-store.mjs'

// Real handlers and grant checks, with fresh modules and isolated mock providers.
// Never load local environment files or allow real network/email requests.
const root = fileURLToPath(new URL('../', import.meta.url))
const temporary = await mkdtemp(join(tmpdir(), 'wallace-demo-admin-tests-'))
const savedEnv = { ...process.env }
const savedFetch = globalThis.fetch
const savedNow = Date.now
const origin = 'https://roofers.wallaceshift.com'
const owner = 'owner@example.test'
let iteration = 0
let access, handler, agreement, agreementHandler, sends, store, providerStatus, mailFails, redisMode, now

async function loadModules() {
  const directory = join(temporary, String(iteration++))
  const compiled = new Map()
  async function compile(relative) {
    if (compiled.has(relative)) return compiled.get(relative)
    const outputPath = join(directory, `${relative}.mjs`)
    compiled.set(relative, outputPath)
    let output = ts.transpileModule(await readFile(join(root, relative), 'utf8'), {
      compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext },
    }).outputText
    for (const match of [...output.matchAll(/(from\s+)(['"])(\.[^'"]+)\2/g)]) {
      const dependency = join(dirname(relative), match[3].replace(/\.js$/, '.ts'))
      output = output.replace(match[0], `from ${JSON.stringify(pathToFileURL(await compile(dependency)).href)}`)
    }
    await mkdir(dirname(outputPath), { recursive: true })
    await writeFile(outputPath, output)
    return outputPath
  }
  const load = async relative => import(pathToFileURL(await compile(relative)).href)
  access = await load('api/_lib/demo-access.ts')
  handler = (await load('api/demo-admin.ts')).default
  agreement = (await load('src/content/demoAgreement.ts')).demoAgreement
  agreementHandler = (await load('api/demo-agreement.ts')).default
}

async function invoke(body = { action: 'send-code' }, options = {}) {
  const req = Readable.from(options.chunks ?? [options.raw ?? JSON.stringify(body)])
  req.method = options.method ?? 'POST'
  req.url = '/api/demo-admin'
  req.headers = { host: 'roofers.wallaceshift.com', origin, 'content-type': 'application/json', ...options.headers }
  req.socket = { remoteAddress: options.ip ?? '127.0.0.1' }
  if (options.preparsed) req.body = body
  const res = {
    headers: {}, statusCode: 200,
    setHeader(name, value) { this.headers[name.toLowerCase()] = value },
    end(value) { this.raw = value; if (value) this.body = JSON.parse(value) },
  }
  await (options.handler ?? handler)(req, res)
  return res
}

function cookieHeader(response, name) {
  const headers = response.headers['set-cookie']
  return (Array.isArray(headers) ? headers : [headers]).find(value => value?.startsWith(name + '='))
}
const cookie = (response, name) => cookieHeader(response, name)?.split(';')[0]
const codeFrom = email => email.text.match(/^\d{6}$/m)?.[0]
function tamper(token) {
  const offset = token.lastIndexOf('.') + 1
  return token.slice(0, offset) + (token[offset] === 'A' ? 'B' : 'A') + token.slice(offset + 1)
}
async function start(options = {}) {
  const response = await invoke({ action: 'send-code' }, options)
  assert.equal(response.statusCode, 200)
  const pending = cookie(response, access.DEMO_ADMIN_PENDING_COOKIE)
  const code = codeFrom(sends.at(-1))
  assert.ok(pending, 'Sending a code must create a pending cookie')
  assert.ok(code, 'Owner email must contain a six-digit verification code')
  return { response, pending, code }
}
const verify = ({ pending, code }, options = {}) => invoke({ action: 'verify-code', code }, { ...options, headers: { cookie: pending, ...options.headers } })
const status = cookieValue => invoke({}, { method: 'GET', headers: { cookie: cookieValue } })
const gate = (path, cookieValue, targetOrigin = origin) => access.gateDemoRequest(new Request(targetOrigin + path, { headers: { cookie: cookieValue } }))

beforeEach(async () => {
  for (const key of Object.keys(process.env)) {
    if (/^(?:DEMO_|RESEND_|CONTACT_|RATE_LIMIT_|KV_REST_API_|UPSTASH_REDIS_REST_)/.test(key) || key === 'VERCEL') delete process.env[key]
  }
  process.env.NODE_ENV = 'production'
  process.env.DEMO_ACCESS_SECRET = 'fixture-admin-secret-not-real-0123456789'
  process.env.DEMO_ADMIN_EMAIL = owner
  process.env.RESEND_API_KEY = 'fixture-key-never-real'
  process.env.CONTACT_TO_EMAIL = 'reviewer@example.test'
  process.env.CONTACT_FROM_EMAIL = 'Wallace Shift <site@example.test>'
  process.env.DEMO_AUDIT_REDIS_URL = 'https://redis.example.test'
  process.env.DEMO_AUDIT_REDIS_TOKEN = 'fixture-audit-token'
  now = Math.floor(savedNow() / 3_600_000) * 3_600_000 + 10_000
  Date.now = () => now
  sends = []; store = createAgreementTestStore(); providerStatus = 200; mailFails = false; redisMode = 'ok'
  globalThis.fetch = async (url, init) => {
    if (String(url).startsWith('https://redis.example.test/')) {
      assert.equal(init.headers.authorization, 'Bearer fixture-audit-token')
      if (redisMode === 'fail') throw new Error('Synthetic store outage')
      if (redisMode === 'malformed') return Response.json([{ result: null }])
      return store.fetch(url, init)
    }
    assert.equal(url, 'https://api.resend.com/emails', 'No real outbound request is permitted')
    assert.equal(init.headers.authorization, 'Bearer fixture-key-never-real')
    sends.push(JSON.parse(init.body))
    if (mailFails) throw new Error('Synthetic mail outage')
    return Response.json({ id: 'fixture-message' }, { status: providerStatus })
  }
  await loadModules()
})

after(async () => {
  for (const key of Object.keys(process.env)) if (!Object.hasOwn(savedEnv, key)) delete process.env[key]
  Object.assign(process.env, savedEnv)
  globalThis.fetch = savedFetch
  Date.now = savedNow
  await rm(temporary, { recursive: true, force: true })
})

test('status is private, reveals no configured address, and does not send email', async () => {
  const result = await status('')
  assert.equal(result.statusCode, 200)
  assert.deepEqual(result.body, { ok: true, authenticated: false, pending: false })
  assert.match(result.headers['cache-control'], /no-store/)
  assert.equal(result.raw.includes(owner), false)
  assert.equal(result.headers['set-cookie'], undefined)
  assert.equal(sends.length, 0)
})

test('only the normalized configured owner receives a code; client recipient cannot redirect delivery', async () => {
  process.env.DEMO_ADMIN_EMAIL = '  OWNER@EXAMPLE.TEST  '
  const result = await invoke({ action: 'send-code', email: 'attacker@example.test' })
  assert.equal(result.statusCode, 200)
  assert.equal(access.demoAdminEmail(), owner)
  assert.deepEqual(sends[0].to, [owner])
  const code = codeFrom(sends[0])
  assert.ok(code)
  assert.equal(result.raw.includes(code), false)
  assert.equal(result.raw.includes(owner), false)
  assert.equal(result.raw.includes(process.env.DEMO_ACCESS_SECRET), false)
  const header = cookieHeader(result, access.DEMO_ADMIN_PENDING_COOKIE)
  assert.match(header, /; Path=\/; Max-Age=600; HttpOnly; SameSite=Lax; Secure$/)
  assert.equal(header.includes('Domain='), false)
  const payload = Buffer.from(header.split('=')[1].split('.')[0], 'base64url').toString('utf8')
  assert.equal(payload.includes(owner), false, 'Admin token must not reveal the owner email')
  assert.equal(payload.includes(code), false, 'Admin token must not contain its code')
})

test('review mailbox is the owner fallback; malformed explicit owner fails closed', async () => {
  delete process.env.DEMO_ADMIN_EMAIL
  assert.equal(access.demoAdminEmail(), 'reviewer@example.test')
  await start()
  assert.deepEqual(sends[0].to, ['reviewer@example.test'])
  process.env.DEMO_ADMIN_EMAIL = 'bad@example.test\r\nBcc: attacker@example.test'
  const invalid = await invoke()
  assert.equal(invalid.statusCode, 503)
  assert.equal(sends.length, 1)
})

test('owner verifies once and receives a 30-day host-only session without an agreement record', async () => {
  const attempt = await start()
  assert.deepEqual((await status(attempt.pending)).body, { ok: true, authenticated: false, pending: true })
  assert.equal((await gate('/halcyon', attempt.pending)).status, 303)
  assert.equal((await gate('/demo-assets/private.js', attempt.pending)).status, 403)
  const result = await verify(attempt)
  assert.equal(result.statusCode, 200)
  assert.equal(result.body.ok, true)
  const header = cookieHeader(result, access.DEMO_ADMIN_COOKIE)
  assert.match(header, /; Path=\/; Max-Age=2592000; HttpOnly; SameSite=Lax; Secure$/)
  assert.equal(header.includes('Domain='), false)
  assert.match(cookieHeader(result, access.DEMO_ADMIN_PENDING_COOKIE), /Max-Age=0;/)
  const admin = cookie(result, access.DEMO_ADMIN_COOKIE)
  assert.equal((await status(admin)).body.authenticated, true)
  assert.equal((await verify(attempt)).statusCode, 400, 'A verified code must be consumed')
  assert.deepEqual(store.records(), [], 'Owner sign-in must not fabricate prospect NDA evidence')
  assert.equal(cookieHeader(result, access.DEMO_COOKIE), undefined)
  const payload = Buffer.from(admin.split('=')[1].split('.')[0], 'base64url').toString('utf8')
  assert.equal(payload.includes(owner), false)
  assert.equal(payload.includes('agreementVersion'), false)
})

test('admin session authorizes every private alias, asset, and API on its own origin only', async () => {
  const session = access.createDemoAdminGrant('admin-session', origin)
  const admin = `${access.DEMO_ADMIN_COOKIE}=${session}`
  for (const path of [...Object.values(access.DEMO_PATHS), '/demos/roofers-4/index.html', '/demo-assets/private.js', '/api/roof-suggest', '/src/demos/roofers-4/main.tsx']) {
    assert.equal(await gate(path, admin), null, path)
    assert.ok(await gate(path, admin, 'https://wallaceshift.com'), `${path} must not accept a cross-host admin token`)
  }
  assert.equal(await gate('/demo-admin/', ''), null, 'Owner sign-in page must be reachable without access')
})

test('admin grants reject tampering, expiration, future issue dates, and wrong kinds', () => {
  const seconds = Math.floor(now / 1000)
  const token = access.createDemoAdminGrant('admin-session', origin, seconds)
  assert.equal(access.DEMO_ADMIN_SECONDS, 30 * 24 * 60 * 60)
  assert.ok(access.verifyDemoGrant(token, origin, 'admin-session', seconds))
  assert.equal(access.verifyDemoGrant(tamper(token), origin, 'admin-session', seconds), null)
  assert.equal(access.verifyDemoGrant(token, origin, 'admin-session', seconds + access.DEMO_ADMIN_SECONDS), null)
  assert.equal(access.verifyDemoGrant(token, origin, 'admin-session', seconds - 31), null)
  assert.equal(access.verifyDemoGrant(token, origin, 'admin-pending', seconds), null)
  assert.equal(access.verifyDemoGrant(token, origin, 'session', seconds), null)
  const pending = access.createDemoAdminGrant('admin-pending', origin, seconds)
  assert.equal(access.verifyDemoGrant(pending, origin, 'admin-pending', seconds + 600), null)
})

test('guest grants and cookies cannot authenticate as admin or stand in for owner pending cookies', async () => {
  const invitation = access.createDemoInvite('roofers-4', owner)
  const grant = access.verifyDemoGrant(invitation, origin, 'invite')
  const guest = access.signDemoGrant({ ...grant, kind: 'session', agreementVersion: agreement.version, agreementHash: access.DEMO_AGREEMENT_HASH, acceptanceId: 'a'.repeat(64) })
  for (const token of [invitation, guest, access.createDemoAdminGrant('admin-pending', origin)]) {
    assert.equal((await status(`${access.DEMO_ADMIN_COOKIE}=${token}`)).body.authenticated, false)
    assert.equal((await gate('/demo-assets/private.js', `${access.DEMO_ADMIN_COOKIE}=${token}`)).status, 403)
  }
  assert.equal((await status(`${access.DEMO_COOKIE}=${guest}`)).body.authenticated, false)
  assert.equal((await invoke({ action: 'verify-code', code: '123456' }, { headers: { cookie: `${access.DEMO_ADMIN_PENDING_COOKIE}=${invitation}` } })).statusCode, 403)
  assert.equal((await gate('/demo-assets/private.js', `${access.DEMO_COOKIE}=${access.createDemoAdminGrant('admin-session', origin)}`)).status, 403)
})

test('owner session cannot satisfy the guest agreement workflow', async () => {
  const admin = `${access.DEMO_ADMIN_COOKIE}=${access.createDemoAdminGrant('admin-session', origin)}`
  const result = await invoke({}, { handler: agreementHandler, method: 'GET', headers: { cookie: admin } })
  assert.equal(result.statusCode, 403)
  assert.deepEqual(store.records(), [])
})

test('owner or signing-secret rotation invalidates issued admin sessions', async () => {
  const admin = `${access.DEMO_ADMIN_COOKIE}=${access.createDemoAdminGrant('admin-session', origin)}`
  assert.equal((await status(admin)).body.authenticated, true)
  process.env.DEMO_ADMIN_EMAIL = 'replacement@example.test'
  assert.equal((await status(admin)).body.authenticated, false)
  assert.equal((await gate('/demo-assets/private.js', admin)).status, 403)
  process.env.DEMO_ADMIN_EMAIL = owner
  process.env.DEMO_ACCESS_SECRET = 'replacement-fixture-signing-secret-0123456789'
  assert.equal((await status(admin)).body.authenticated, false)
  assert.equal((await gate('/demo-assets/private.js', admin)).status, 403)
})

test('owner changes invalidate pending codes and cannot transfer a verification to a new owner', async () => {
  const attempt = await start()
  process.env.DEMO_ADMIN_EMAIL = 'replacement@example.test'
  assert.equal((await verify(attempt)).statusCode, 403)
  assert.deepEqual(store.records(), [])
})

test('duplicate cookies and tampered pending cookies fail closed', async () => {
  const attempt = await start()
  assert.equal((await verify({ ...attempt, pending: attempt.pending + '; ' + attempt.pending })).statusCode, 403)
  assert.equal((await verify({ ...attempt, pending: tamper(attempt.pending) })).statusCode, 403)
  const admin = `${access.DEMO_ADMIN_COOKIE}=${access.createDemoAdminGrant('admin-session', origin)}`
  assert.equal((await status(admin + '; ' + admin)).body.authenticated, false)
  assert.equal((await gate('/demo-assets/private.js', admin + '; ' + admin)).status, 403)
})

test('POST operations require known host, matching origin, and same-site metadata', async () => {
  for (const action of ['send-code', 'verify-code', 'logout']) {
    for (const headers of [
      { origin: 'https://attacker.example.test' },
      { origin: undefined },
      { host: 'attacker.example.test', origin: 'https://attacker.example.test' },
      { origin: 'https://wallaceshift.com' },
      { 'sec-fetch-site': 'cross-site' },
    ]) assert.equal((await invoke({ action, code: '123456' }, { headers })).statusCode, 403, `${action}: ${JSON.stringify(headers)}`)
  }
  assert.equal((await invoke({}, { method: 'GET', headers: { host: 'attacker.example.test' } })).statusCode, 403)
  assert.equal(sends.length, 0)
})

test('malformed, oversized, streamed and preparsed bodies cannot send codes', async () => {
  for (const [body, options, expected] of [
    [{ action: 'send-code' }, { raw: '{' }, 400],
    [{ action: 'send-code' }, { headers: { 'content-type': 'text/plain' } }, 400],
    [{ action: 'send-code' }, { headers: { 'content-length': '2001' } }, 413],
    [{ action: 'send-code' }, { raw: 'x'.repeat(2001) }, 413],
    [{ action: 'send-code' }, { chunks: ['x'.repeat(1500), 'x'.repeat(600)] }, 413],
    [{ action: 'send-code', extra: 'x'.repeat(2001) }, { preparsed: true }, 413],
    [[], {}, 400], [null, {}, 400], [{ action: 'unknown' }, {}, 400],
    [{ action: 'send-code' }, { method: 'PUT' }, 405],
  ]) assert.equal((await invoke(body, options)).statusCode, expected)
  assert.equal(sends.length, 0)
  assert.equal((await invoke({ action: 'send-code' }, { preparsed: true })).statusCode, 200)
})

test('verification requires a valid pending cookie and exactly six decimal digits', async () => {
  assert.equal((await invoke({ action: 'verify-code', code: '123456' })).statusCode, 403)
  const attempt = await start()
  for (const code of ['', '12345', '1234567', '１２３４５６', 123456, '123456\n']) {
    assert.equal((await verify({ ...attempt, code })).statusCode, 400)
  }
  assert.equal((await verify(attempt)).statusCode, 200, 'Malformed codes must not consume valid attempts')
})

test('a code can only be used with its own pending token and expires after ten minutes', async () => {
  const attempt = await start()
  const unrelated = `${access.DEMO_ADMIN_PENDING_COOKIE}=${access.createDemoAdminGrant('admin-pending', origin)}`
  assert.equal((await verify({ ...attempt, pending: unrelated })).statusCode, 400)
  now += 600_000
  assert.deepEqual((await status(attempt.pending)).body, { ok: true, authenticated: false, pending: false })
  assert.equal((await verify(attempt)).statusCode, 403)
})

test('five wrong codes lock verification even when the next code is correct', async () => {
  const attempt = await start()
  const wrong = attempt.code === '000000' ? '111111' : '000000'
  for (let tries = 0; tries < 5; tries++) assert.equal((await verify({ ...attempt, code: wrong })).statusCode, 400)
  const locked = await verify(attempt)
  assert.equal(locked.statusCode, 429)
  assert.equal(cookie(locked, access.DEMO_ADMIN_COOKIE), undefined)
})

test('mailbox cooldown survives fresh browsers and hourly limits apply across new pending tokens', async () => {
  const first = await start()
  assert.equal((await invoke()).statusCode, 429, 'Clearing cookies must not evade the mailbox cooldown')
  assert.equal((await invoke({ action: 'send-code' }, { headers: { cookie: first.pending }, ip: '127.0.0.2' })).statusCode, 429)
  now += 61_000
  await start()
  now += 61_000
  await start()
  now += 61_000
  assert.equal((await invoke()).statusCode, 429)
  assert.equal(sends.length, 3)
  const keys = store.calls.flatMap(commands => commands.flatMap(command => command.slice(3, 3 + Number(command[2]))))
  assert.ok(keys.some(key => key.startsWith('demo-admin:')), 'Admin OTP records need a separate namespace')
  assert.ok(keys.every(key => !key.startsWith('demo-agreement:')), 'Owner login must not use prospect OTP records')
})

test('missing or partial configuration cannot send email or grant access', async () => {
  for (const name of ['DEMO_ACCESS_SECRET', 'RESEND_API_KEY', 'CONTACT_FROM_EMAIL', 'DEMO_AUDIT_REDIS_URL', 'DEMO_AUDIT_REDIS_TOKEN']) {
    const value = process.env[name]
    delete process.env[name]
    const result = await invoke()
    assert.equal(result.statusCode, 503, name)
    assert.equal(cookie(result, access.DEMO_ADMIN_COOKIE), undefined)
    process.env[name] = value
  }
  delete process.env.DEMO_ADMIN_EMAIL
  delete process.env.CONTACT_TO_EMAIL
  assert.equal((await invoke()).statusCode, 503)
  assert.equal(sends.length, 0)
})

test('Redis failure or malformed results fail closed before any owner email', async () => {
  for (const mode of ['fail', 'malformed']) {
    redisMode = mode
    const result = await invoke()
    assert.equal(result.statusCode, 503)
    assert.equal(cookie(result, access.DEMO_ADMIN_COOKIE), undefined)
  }
  assert.equal(sends.length, 0)
})

test('verification fails closed during a Redis outage and succeeds only after the store recovers', async () => {
  const attempt = await start()
  redisMode = 'fail'
  const result = await verify(attempt)
  assert.equal(result.statusCode, 503)
  assert.equal(cookie(result, access.DEMO_ADMIN_COOKIE), undefined)
  redisMode = 'ok'
  assert.equal((await verify(attempt)).statusCode, 200)
})

test('mail rejection and transport failure do not claim a code was delivered', async () => {
  providerStatus = 500
  const rejected = await invoke()
  assert.equal(rejected.statusCode, 503)
  assert.equal(rejected.body.ok, false)
  assert.equal(cookie(rejected, access.DEMO_ADMIN_COOKIE), undefined)
  now += 61_000
  providerStatus = 200; mailFails = true
  const failed = await invoke()
  assert.equal(failed.statusCode, 503)
  assert.equal(failed.body.ok, false)
  assert.equal(cookie(failed, access.DEMO_ADMIN_COOKIE), undefined)
})

test('logout clears all owner and visitor cookies so this browser becomes locked', async () => {
  const result = await invoke({ action: 'logout' })
  assert.equal(result.statusCode, 200)
  for (const name of [access.DEMO_ADMIN_COOKIE, access.DEMO_ADMIN_PENDING_COOKIE, access.DEMO_COOKIE, access.DEMO_PENDING_COOKIE, access.DEMO_PROOF_COOKIE]) {
    assert.match(cookieHeader(result, name), /; Path=\/; Max-Age=0; HttpOnly; SameSite=Lax; Secure$/)
  }
  const cookies = result.headers['set-cookie'].map(value => value.split(';')[0]).join('; ')
  assert.equal((await status(cookies)).body.authenticated, false)
  assert.equal((await gate('/demo-assets/private.js', cookies)).status, 403)
  assert.equal(sends.length, 0)
})
