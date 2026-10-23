import assert from 'node:assert/strict'
import { after, beforeEach, test } from 'node:test'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { Readable } from 'node:stream'
import { fileURLToPath, pathToFileURL } from 'node:url'
import ts from 'typescript'
import { createAgreementTestStore } from './demo-agreement-test-store.mjs'

// Execute real handlers with isolated environment and mocked providers only.
// No local environment file is read and no email can leave this test suite.
const root = fileURLToPath(new URL('../', import.meta.url))
const temporary = await mkdtemp(join(tmpdir(), 'wallace-demo-access-tests-'))
const savedEnv = { ...process.env }
const savedFetch = globalThis.fetch
const savedError = console.error
const origin = 'https://roofers.wallaceshift.com'
let iteration = 0
let access, agreement, agreementStore, requestHandler, inviteHandler, agreementHandler, middleware, sends, providerStatus, failFetch, redisMode, store
const email = 'taylor@example.test'

async function loadModules() {
  const directory = join(temporary, String(iteration++))
  const compiled = new Map()
  async function compile(relative) {
    if (compiled.has(relative)) return compiled.get(relative)
    const outputPath = join(directory, `${relative}.mjs`)
    compiled.set(relative, outputPath)
    let output = ts.transpileModule(await readFile(join(root, relative), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext } }).outputText
    for (const match of [...output.matchAll(/(from\s+)(['"])(\.[^'"]+)\2/g)]) {
      const dependency = join(dirname(relative), match[3].replace(/\.js$/, '.ts'))
      output = output.replace(match[0], `from ${JSON.stringify(pathToFileURL(await compile(dependency)).href)}`)
    }
    output = output.replace(/from (['"])@vercel\/functions\1/g, `from ${JSON.stringify(import.meta.resolve('@vercel/functions'))}`)
    await mkdir(dirname(outputPath), { recursive: true })
    await writeFile(outputPath, output)
    return outputPath
  }
  const load = async relative => import(pathToFileURL(await compile(relative)).href)
  access = await load('api/_lib/demo-access.ts')
  requestHandler = (await load('api/demo-request.ts')).default
  inviteHandler = (await load('api/demo-access.ts')).default
  middleware = (await load('middleware.ts')).default
  agreement = await load('src/content/demoAgreement.ts')
  agreementStore = await load('api/_lib/demo-agreement-store.ts')
  agreementHandler = (await load('api/demo-agreement.ts')).default
}

function payload(overrides = {}) { return { name: 'Taylor Person', businessName: 'Example Roofing', email: 'taylor@example.test', website: 'https://example.test', message: 'Please share the demo.', company: '', demo: 'roofers-4', ...overrides } }
async function invoke(handler = requestHandler, body = payload(), options = {}) {
  const req = Readable.from(options.chunks ?? [options.raw ?? JSON.stringify(body)])
  req.method = options.method ?? 'POST'
  req.url = options.url ?? '/api/demo-request'
  req.headers = { host: 'roofers.wallaceshift.com', origin, 'content-type': 'application/json', ...options.headers }
  req.socket = { remoteAddress: options.ip ?? '127.0.0.1' }
  if (options.preparsed) req.body = body
  const res = {
    headers: {}, statusCode: 200,
    setHeader(name, value) { options.onSetHeader?.(name, value); this.headers[name.toLowerCase()] = value },
    end(value) { this.raw = value; if (value) this.body = JSON.parse(value) },
  }
  await handler(req, res)
  return res
}
const getInvite = () => sends[0].text.match(/https:\/\/[^\s]+\/api\/demo-access\?token=([^\s]+)/)?.[1]
function session(demo = 'roofers-4') {
  const invite = access.createDemoInvite(demo, email)
  return access.signDemoGrant({ ...access.verifyDemoGrant(invite, origin, 'invite'), kind: 'session', agreementVersion: agreement.demoAgreement.version, agreementHash: access.DEMO_AGREEMENT_HASH, acceptanceId: 'a'.repeat(64) })
}

beforeEach(async () => {
  for (const key of ['RATE_LIMIT_REDIS_URL', 'RATE_LIMIT_REDIS_TOKEN', 'KV_REST_API_URL', 'KV_REST_API_TOKEN', 'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN', 'DEMO_ACCESS_ORIGIN', 'DEMO_AUDIT_REDIS_URL', 'DEMO_AUDIT_REDIS_TOKEN', 'VERCEL']) delete process.env[key]
  process.env.NODE_ENV = 'production'
  process.env.DEMO_ACCESS_SECRET = 'fixture-secret-not-a-real-secret-0123456789'
  process.env.RESEND_API_KEY = 'fixture-resend-key'
  process.env.CONTACT_TO_EMAIL = 'review@example.test'
  process.env.DEMO_REQUEST_TO_EMAIL = 'demo-review@example.test'
  process.env.CONTACT_FROM_EMAIL = 'Wallace Shift <site@example.test>'
  sends = []; providerStatus = 200; failFetch = false; redisMode = 'ok'; store = createAgreementTestStore()
  console.error = () => undefined
  globalThis.fetch = async (url, init) => {
    if (String(url).startsWith('https://redis.example.test')) {
      if (redisMode === 'fail') throw new Error('Synthetic store outage')
      if (redisMode === 'limit') return Response.json([{ result: 100 }, { result: 1 }])
      return store.fetch(url, init)
    }
    assert.equal(url, 'https://api.resend.com/emails')
    sends.push(JSON.parse(init.body))
    if (failFetch) throw new Error('Synthetic send failure')
    return Response.json({ id: 'fixture-message' }, { status: providerStatus })
  }
  await loadModules()
})

after(async () => {
  for (const key of Object.keys(process.env)) if (!Object.hasOwn(savedEnv, key)) delete process.env[key]
  Object.assign(process.env, savedEnv)
  globalThis.fetch = savedFetch
  console.error = savedError
  await rm(temporary, { recursive: true, force: true })
})

test('signed grants reject tampering, expired/future grants, wrong kind and different origins', () => {
  const now = Math.floor(Date.now() / 1000)
  const token = access.createDemoInvite('roofers-4', email, now)
  const grant = access.verifyDemoGrant(token, origin, 'invite', now)
  assert.equal(grant.demo, 'roofers-4')
  assert.equal(access.verifyDemoGrant(token, origin, 'session', now), null)
  assert.equal(access.verifyDemoGrant(token, 'https://wallaceshift.com', 'invite', now), null)
  assert.equal(access.verifyDemoGrant(token, origin, 'invite', now + access.DEMO_ACCESS_SECONDS), null)
  assert.equal(access.verifyDemoGrant(token, origin, 'invite', now - 31), null)
  const changed = Buffer.from(JSON.stringify({ ...grant, exp: grant.exp + 1 })).toString('base64url') + '.' + token.split('.')[1]
  assert.equal(access.verifyDemoGrant(changed, origin, 'invite', now), null)
  assert.equal(access.verifyDemoGrant('malformed', origin, 'invite', now), null)
})

test('documents redirect while assets, API aliases, and encoded paths deny without a cookie', async () => {
  for (const path of ['/northvane', '/alder-stone/process', '/contour/', '/halcyon/index.html', '/velar', '/stratum', '/demos/roofers-6/', '/roofing-dashboard', '/demos/roofers-4/index.html', '/%68alcyon', '/demos%2Froofers-4/', '/datum', '/datum/cracks/horizontal-crack', '/demos/foundation/', '/demos/foundation/report', '/tambour', '/tambour/workshop', '/demos/cabinetry/', '/demos/cabinetry/kitchens', '/mitre', '/demos/cabinetry-2/', '/demos/cabinetry-2/index.html']) {
    const response = await access.gateDemoRequest(new Request(origin + path))
    assert.equal(response?.status, 303, path)
    assert.match(response.headers.get('location'), /^\/request-demo\/\?demo=/)
    assert.match(response.headers.get('cache-control'), /no-store/)
  }
  for (const path of ['/demo-assets/private.js', '/dist/demo-assets/private.js', '/dist/demos/roofers-4/film.mp4', '/@fs/tmp/project/dist/demo-assets/private.js', '/@fs/tmp/project/dist/demos/roofers-4/film.mp4', '/demos/roofers-4/film.mp4', '/api/roof-lookup', '/api/roof-measure.ts', '/api/roof-render?download=yes', '/src/demos/roofers-4/main.tsx', '/src/roofing-dashboard/main.tsx', '/public/demos/roofers-4/film.mp4', '/@fs/tmp/project/src/demos/roofers/main.tsx', '/%64emo-assets%2Fprivate.js', '/demos/%252e%252e/demo-assets/private.js']) {
    const response = await access.gateDemoRequest(new Request(origin + path, { headers: { accept: 'text/html' } }))
    assert.equal(response?.status, 403, path)
  }
})

test('only exact previews, gallery and public asset namespace remain public', async () => {
  for (const path of ['/', '/request-demo/', '/demo-agreement/', '/assets/public.js', '/demos/roofers-offer/index.html', '/src/demos/roofers-offer/main.tsx', '/demos/contractors/index.html', '/src/demos/contractors/main.tsx', '/demos/roofers-3/preview.jpg', '/demos/roofers-4/preview.jpg', '/demos/roofers-5/hero-poster.jpg', '/demos/roofers-6/preview.jpg', '/demos/foundation/preview.jpg', '/demos/cabinetry/preview.jpg', '/demos/cabinetry-2/preview.jpg', '/demos/pools/preview.jpg']) assert.equal(await access.gateDemoRequest(new Request(origin + path)), null, path)
  assert.equal((await access.gateDemoRequest(new Request(origin + '/demos/roofers-4/preview.jpg/extra')))?.status, 303)
})

test('Stillwater aliases use the pool access request and keep implementation private', async () => {
  for (const path of ['/stillwater', '/stillwater/', '/demos/pools', '/demos/pools/', '/demos/pools/index.html', '/%73tillwater']) {
    const response = await access.gateDemoRequest(new Request(origin + path))
    assert.equal(response?.status, 303, path)
    assert.equal(response.headers.get('location'), '/request-demo/?demo=pools', path)
  }
  for (const path of ['/src/demos/pools/main.tsx', '/demos/pools/private.webp', '/public/demos/pools/private.webp']) {
    assert.equal((await access.gateDemoRequest(new Request(origin + path)))?.status, 403, path)
  }
  const invite = access.createDemoInvite('pools', email)
  assert.equal(access.verifyDemoGrant(invite, origin, 'invite').demo, 'pools')
  const authorized = { headers: { cookie: `${access.DEMO_COOKIE}=${session()}` } }
  assert.equal(await access.gateDemoRequest(new Request(origin + '/stillwater', authorized)), null)
})

test('session authorizes all demo resources on its origin only; invite cannot be a cookie', async () => {
  const token = session()
  for (const path of ['/northvane', '/velar', '/demo-assets/any.js', '/api/roof-suggest']) assert.equal(await access.gateDemoRequest(new Request(origin + path, { headers: { cookie: `${access.DEMO_COOKIE}=${token}` } })), null)
  const wrong = await access.gateDemoRequest(new Request('https://wallaceshift.com/demo-assets/any.js', { headers: { cookie: `${access.DEMO_COOKIE}=${token}` } }))
  assert.equal(wrong.status, 403)
  const invite = await access.gateDemoRequest(new Request(origin + '/demo-assets/any.js', { headers: { cookie: `${access.DEMO_COOKIE}=${access.createDemoInvite('roofers-4', email)}` } }))
  assert.equal(invite.status, 403)
})

test('missing secret fails closed without sending or exposing private assets', async () => {
  delete process.env.DEMO_ACCESS_SECRET
  assert.equal((await access.gateDemoRequest(new Request(origin + '/demo-assets/private.js'))).status, 403)
  const response = await invoke()
  assert.equal(response.statusCode, 503)
  assert.equal(response.body.error, 'not_configured')
  assert.equal(sends.length, 0)
})

test('successful request emails only reviewer and returns no invitation, secret, or access cookie', async () => {
  const response = await invoke()
  assert.equal(response.statusCode, 200)
  assert.deepEqual(response.body, { ok: true })
  assert.equal(response.headers['set-cookie'], undefined)
  assert.deepEqual(sends[0].to, ['demo-review@example.test'])
  assert.equal(sends[0].reply_to, payload().email)
  const token = getInvite()
  assert.ok(token)
  assert.ok(access.verifyDemoGrant(token, origin, 'invite'))
  assert.equal(response.raw.includes(token), false)
  assert.equal(response.raw.includes(process.env.DEMO_ACCESS_SECRET), false)
  assert.match(sends[0].text, /manually send/)
})

test('provider rejection and transport failures never claim request success', async () => {
  providerStatus = 500
  const rejected = await invoke()
  assert.equal(rejected.statusCode, 502)
  assert.equal(rejected.body.error, 'send_failed')
  failFetch = true
  const failed = await invoke()
  assert.equal(failed.statusCode, 502)
  assert.equal(failed.body.ok, false)
})

test('missing mail config returns not_configured without sending', async () => {
  delete process.env.RESEND_API_KEY
  const result = await invoke()
  assert.equal(result.statusCode, 503)
  assert.equal(result.body.error, 'not_configured')
  assert.equal(sends.length, 0)
})

test('honeypot is a quiet success without sending or issuing access', async () => {
  const result = await invoke(requestHandler, payload({ company: 'bot-filled' }))
  assert.deepEqual(result.body, { ok: true })
  assert.equal(sends.length, 0)
  assert.equal(result.headers['set-cookie'], undefined)
})

test('request validation rejects spoofed origin, CRLF, oversize, malformed and unexpected methods', async () => {
  const requests = [
    [payload(), { headers: { origin: 'https://attacker.test' } }, 403],
    [payload(), { headers: { host: 'attacker.test', origin: 'https://attacker.test' } }, 403],
    [payload({ name: 'Person\r\nBcc: attacker@example.test' }), {}, 400],
    [payload({ email: 'person@example.test\r\nBcc: attacker@example.test' }), {}, 400],
    [payload({ website: 'javascript:alert(1)' }), {}, 400],
    [payload(), { raw: 'x'.repeat(12_001) }, 413],
    [payload(), { raw: '{' }, 400],
    [[], {}, 400],
    [payload(), { method: 'GET' }, 405],
  ]
  for (const [body, options, status] of requests) assert.equal((await invoke(requestHandler, body, options)).statusCode, status)
  assert.equal(sends.length, 0)
})

test('preparsed bodies follow same validation and size limits', async () => {
  assert.equal((await invoke(requestHandler, payload(), { preparsed: true })).statusCode, 200)
  assert.equal((await invoke(requestHandler, payload({ message: 'x'.repeat(12_001) }), { preparsed: true })).statusCode, 413)
})

test('local fallback rate limits repeated requests to three per IP', async () => {
  for (let attempt = 0; attempt < 3; attempt++) assert.equal((await invoke()).statusCode, 200)
  const limited = await invoke()
  assert.equal(limited.statusCode, 429)
  assert.equal(sends.length, 3)
})

test('configured failed, partial or over-limit Redis fails closed', async () => {
  process.env.RATE_LIMIT_REDIS_URL = 'https://redis.example.test'
  process.env.RATE_LIMIT_REDIS_TOKEN = 'fixture-token'
  redisMode = 'fail'
  assert.equal((await invoke()).statusCode, 503)
  redisMode = 'limit'
  assert.equal((await invoke()).statusCode, 429)
  delete process.env.RATE_LIMIT_REDIS_TOKEN
  assert.equal((await invoke()).statusCode, 503)
  assert.equal(sends.length, 0)
})

test('redeeming invitation starts agreement with host-only pending cookie and clears access', async () => {
  const token = access.createDemoInvite('roofers-4', email)
  const result = await invoke(inviteHandler, undefined, { method: 'GET', url: `/api/demo-access?token=${token}&next=https://attacker.test` })
  assert.equal(result.statusCode, 303)
  assert.equal(result.headers.location, '/demo-agreement/')
  const cookies = result.headers['set-cookie']
  assert.ok(Array.isArray(cookies))
  for (const cookie of cookies) {
    assert.match(cookie, /; Path=\/; Max-Age=\d+; HttpOnly; SameSite=Lax; Secure$/)
    assert.equal(cookie.includes('Domain='), false)
  }
  assert.match(cookies.find(value => value.startsWith(access.DEMO_COOKIE + '=')), /Max-Age=0;/)
  assert.match(cookies.find(value => value.startsWith(access.DEMO_PROOF_COOKIE + '=')), /Max-Age=0;/)
  assert.equal(result.headers.location.includes(token), false)
  assert.match(result.headers['cache-control'], /no-store/)
  const cookie = cookies.map(value => value.split(';')[0]).join('; ')
  assert.equal((await access.gateDemoRequest(new Request(origin + '/velar', { headers: { cookie } }))).status, 303)
  assert.equal((await access.gateDemoRequest(new Request(origin + '/demo-assets/private.js', { headers: { cookie } }))).status, 403)
})

test('invalid, expired, duplicate-token and cross-host invitations clear all access cookies', async () => {
  const token = access.createDemoInvite('roofers-4', email, Math.floor(Date.now() / 1000) - access.DEMO_ACCESS_SECONDS)
  for (const url of ['/api/demo-access?token=invalid', `/api/demo-access?token=${token}`, `/api/demo-access?token=${token}&token=second`]) {
    const result = await invoke(inviteHandler, undefined, { method: 'GET', url })
    assert.ok(result.headers['set-cookie'].every(cookie => cookie.includes('Max-Age=0;')))
    assert.equal(result.headers.location, '/request-demo/?access=expired')
  }
  const otherHost = await invoke(inviteHandler, undefined, { method: 'GET', url: `/api/demo-access?token=${access.createDemoInvite('roofers-4', email)}`, headers: { host: 'wallaceshift.com' } })
  assert.ok(otherHost.headers['set-cookie'].every(cookie => cookie.includes('Max-Age=0;')))
})

test('loopback development supports local pending cookie without Secure but cannot open demo', async () => {
  process.env.NODE_ENV = 'development'
  process.env.DEMO_ACCESS_ORIGIN = 'http://127.0.0.1:5174'
  const token = access.createDemoInvite('roofers-3', email)
  const result = await invoke(inviteHandler, undefined, { method: 'GET', url: `/api/demo-access?token=${token}`, headers: { host: '127.0.0.1:5174', origin: 'http://127.0.0.1:5174' } })
  assert.equal(result.headers.location, '/demo-agreement/')
  assert.ok(result.headers['set-cookie'].every(cookie => !cookie.includes('; Secure')))
  const cookie = result.headers['set-cookie'].map(value => value.split(';')[0]).join('; ')
  assert.equal((await access.gateDemoRequest(new Request('http://127.0.0.1:5174/contour', { headers: { cookie } }))).status, 303)
})


test('middleware preserves public gallery rewrite and applies no-store on granted private responses', async () => {
  const gallery = await middleware(new Request(origin + '/?utm_source=fixture'))
  assert.equal(gallery.headers.get('x-middleware-rewrite'), origin + '/demos/roofers-offer?utm_source=fixture')
  const studio = await middleware(new Request('https://wallaceshift.com/'))
  assert.equal(studio.headers.get('x-middleware-next'), '1')
  assert.equal(studio.headers.get('x-middleware-rewrite'), null)
  const granted = await middleware(new Request(origin + '/demo-assets/private.js', { headers: { cookie: `${access.DEMO_COOKIE}=${session()}` } }))
  assert.equal(granted.headers.get('x-middleware-next'), '1')
  assert.match(granted.headers.get('cache-control'), /private, no-store/)
  assert.equal(granted.headers.get('cdn-cache-control'), 'no-store')
  assert.equal(granted.headers.get('vercel-cdn-cache-control'), 'no-store')
  assert.equal((await middleware(new Request(origin + '/demo-assets/private.js'))).status, 403)
})

test('business website without scheme is normalized before reaching internal reviewer', async () => {
  const result = await invoke(requestHandler, payload({ website: 'example.test', demo: 'roofers-5' }))
  assert.equal(result.statusCode, 200)
  assert.match(sends[0].text, /Website: https:\/\/example.test/)
  assert.equal(access.verifyDemoGrant(getInvite(), origin, 'invite').demo, 'roofers-5')
})

function configureAudit() {
  process.env.DEMO_AUDIT_REDIS_URL = 'https://redis.example.test'
  process.env.DEMO_AUDIT_REDIS_TOKEN = 'fixture-audit-token'
}
function pendingCookie(token = access.createDemoInvite('roofers-4', email)) { return `${access.DEMO_PENDING_COOKIE}=${token}` }
function responseCookie(result, name) {
  return [result.headers['set-cookie']].flat().find(value => value?.startsWith(name + '='))?.split(';')[0]
}
function acceptBody(overrides = {}) {
  return { action: 'accept', name: 'Taylor Person', businessName: 'Example Roofing', accepted: true, authority: true, agreementVersion: agreement.demoAgreement.version, agreementHash: access.DEMO_AGREEMENT_HASH, ...overrides }
}
function agreementRequest(body, cookie, options = {}) {
  return invoke(agreementHandler, body, { url: '/api/demo-agreement', ...options, headers: { cookie, ...options.headers } })
}
async function verifiedCookies(cookie = pendingCookie()) {
  const sent = await agreementRequest({ action: 'send-code', email }, cookie)
  assert.equal(sent.statusCode, 200)
  const code = sends.at(-1).text.match(/^\d{6}$/m)?.[0]
  assert.ok(code)
  const result = await agreementRequest({ action: 'verify-code', code }, cookie)
  assert.equal(result.statusCode, 200)
  return { cookie: cookie + '; ' + responseCookie(result, access.DEMO_PROOF_COOKIE), code, pending: cookie }
}

test('v2 invitations hide email and reject legacy or incomplete sessions', async () => {
  const token = access.createDemoInvite('roofers-4', ' Taylor@Example.Test ')
  const grant = access.verifyDemoGrant(token, origin, 'invite')
  assert.equal(grant.recipientHash, access.recipientEmailHash(email))
  assert.equal(grant.v, 2)
  assert.equal(Buffer.from(token.split('.')[0], 'base64url').toString().includes(email), false)
  assert.equal(Buffer.from(token.split('.')[0], 'base64url').toString().includes('Taylor'), false)
  for (const data of [{ ...grant, v: 1 }, { ...grant, kind: 'session' }, { ...grant, kind: 'session', agreementVersion: 'old', agreementHash: access.DEMO_AGREEMENT_HASH, acceptanceId: 'a'.repeat(64) }]) {
    const signed = access.signDemoGrant(data)
    assert.equal(access.verifyDemoGrant(signed, origin, data.kind), null)
    assert.equal((await access.gateDemoRequest(new Request(origin + '/demo-assets/test.js', { headers: { cookie: `${access.DEMO_COOKIE}=${signed}` } }))).status, 403)
  }
})

test('agreement status requires approved invitation and never leaks recipient before verification', async () => {
  const missing = await agreementRequest(undefined, '', { method: 'GET' })
  assert.equal(missing.statusCode, 403)
  assert.equal(missing.body.error, 'invite_required')
  const cookie = pendingCookie()
  const status = await agreementRequest(undefined, cookie, { method: 'GET' })
  assert.deepEqual(status.body, { ok: true, demo: 'roofers-4', verified: false, agreementVersion: agreement.demoAgreement.version, agreementHash: access.DEMO_AGREEMENT_HASH })
  assert.equal(status.headers['set-cookie'], undefined)
  assert.match(status.headers['cache-control'], /no-store/)
  assert.equal((await agreementRequest(undefined, `${cookie}; ${cookie}`, { method: 'GET' })).statusCode, 403)
})

test('forwarded link cannot send verification to another recipient or open demos', async () => {
  configureAudit()
  const cookie = pendingCookie()
  const result = await agreementRequest({ action: 'send-code', email: 'other@example.test' }, cookie)
  assert.equal(result.statusCode, 403)
  assert.equal(result.body.error, 'email_mismatch')
  assert.equal(sends.length, 0)
  assert.equal(store.calls.length, 0)
  assert.equal((await agreementRequest(acceptBody(), cookie)).body.error, 'verification_required')
})

test('OTP is emailed only to approved mailbox, stored as hash, single-use, and cannot itself unlock demos', async () => {
  configureAudit()
  const { cookie, pending, code } = await verifiedCookies()
  assert.deepEqual(sends[0].to, [email])
  assert.match(sends[0].text, /does not accept the agreement/)
  const reserved = JSON.parse(store.calls[0][0][7])
  const invite = access.verifyDemoGrant(access.readDemoCookie(pending, access.DEMO_PENDING_COOKIE), origin, 'invite')
  assert.equal(reserved.codeHash, access.verificationCodeHash(invite.nonce, code))
  assert.notEqual(reserved.codeHash, code)
  assert.equal(Object.hasOwn(reserved, 'code'), false)
  const proof = access.verifyDemoGrant(access.readDemoCookie(cookie, access.DEMO_PROOF_COOKIE), origin, 'proof')
  assert.equal(proof.verifiedEmail, email)
  assert.equal(proof.exp - proof.iat, access.DEMO_VERIFICATION_SECONDS)
  const status = await agreementRequest(undefined, cookie, { method: 'GET' })
  assert.equal(status.body.verified, true)
  assert.equal(status.body.email, email)
  const replay = await agreementRequest({ action: 'verify-code', code }, pending)
  assert.equal(replay.statusCode, 400)
  assert.equal(replay.body.error, 'code_expired')
  assert.equal(replay.headers['set-cookie'], undefined)
  assert.equal((await access.gateDemoRequest(new Request(origin + '/demo-assets/test.js', { headers: { cookie } }))).status, 403)
  assert.equal(store.records().length, 0)
})

test('OTP rejects incorrect codes and locks after five attempts', async () => {
  configureAudit()
  const cookie = pendingCookie()
  assert.equal((await agreementRequest({ action: 'send-code', email }, cookie)).statusCode, 200)
  const code = sends[0].text.match(/^\d{6}$/m)[0]
  const wrong = code === '000000' ? '111111' : '000000'
  for (let attempt = 0; attempt < 5; attempt++) assert.equal((await agreementRequest({ action: 'verify-code', code: wrong }, cookie)).body.error, 'code_invalid')
  const locked = await agreementRequest({ action: 'verify-code', code }, cookie)
  assert.equal(locked.statusCode, 429)
  assert.equal(locked.body.error, 'rate_limited')
  assert.equal(locked.headers['set-cookie'], undefined)
})

test('expired OTP is rejected and original invite expiry caps verification storage', async () => {
  configureAudit()
  const now = Math.floor(Date.now() / 1000)
  const token = access.createDemoInvite('roofers-4', email, now - access.DEMO_ACCESS_SECONDS + 30)
  const cookie = pendingCookie(token)
  assert.equal((await agreementRequest({ action: 'send-code', email }, cookie)).statusCode, 200)
  const reservation = store.calls.at(-1)[0]
  assert.ok(Number(reservation.at(-1)) <= 30)
  const key = [...store.values.keys()].find(value => value.startsWith('demo-agreement:code:'))
  const record = JSON.parse(store.values.get(key))
  record.expiresAt = now - 1
  store.values.set(key, JSON.stringify(record))
  const code = sends[0].text.match(/^\d{6}$/m)[0]
  assert.equal((await agreementRequest({ action: 'verify-code', code }, cookie)).body.error, 'code_expired')
})

test('code sends enforce cooldown, mailbox hourly budget across invites, and global budget', async () => {
  configureAudit()
  const cookie = pendingCookie()
  assert.equal((await agreementRequest({ action: 'send-code', email }, cookie)).statusCode, 200)
  assert.equal((await agreementRequest({ action: 'send-code', email }, cookie)).statusCode, 429)
  assert.equal((await agreementRequest({ action: 'send-code', email }, pendingCookie())).statusCode, 200)
  assert.equal((await agreementRequest({ action: 'send-code', email }, pendingCookie())).statusCode, 200)
  assert.equal((await agreementRequest({ action: 'send-code', email }, pendingCookie())).statusCode, 429)
  assert.equal(sends.length, 3)
  const day = `demo-agreement:send:day:${Math.floor(Date.now() / 86_400_000)}`
  store.values.set(day, 200)
  const otherEmail = 'next@example.test'
  const otherCookie = pendingCookie(access.createDemoInvite('roofers-4', otherEmail))
  assert.equal((await agreementRequest({ action: 'send-code', email: otherEmail }, otherCookie)).statusCode, 429)
  assert.equal(sends.length, 3)
})

test('acceptance requires exact current terms, explicit consent, authority, and valid identity fields', async () => {
  configureAudit()
  const { cookie } = await verifiedCookies()
  for (const [overrides, error] of [
    [{ accepted: false }, 'acceptance_required'], [{ accepted: 'true' }, 'acceptance_required'],
    [{ authority: false }, 'acceptance_required'], [{ authority: undefined }, 'acceptance_required'],
    [{ agreementVersion: 'old' }, 'agreement_changed'], [{ agreementHash: '0'.repeat(64) }, 'agreement_changed'],
    [{ name: '' }, 'invalid'], [{ businessName: '' }, 'invalid'], [{ name: 'x\r\ny' }, 'invalid'],
  ]) {
    const result = await agreementRequest(acceptBody(overrides), cookie)
    assert.equal(result.body.error, error)
    assert.equal(result.headers['set-cookie'], undefined)
  }
  assert.equal(store.records().length, 0)
})

test('acceptance writes immutable exact terms and verified identity before issuing limited session', async () => {
  configureAudit()
  const { cookie } = await verifiedCookies()
  const result = await agreementRequest(acceptBody(), cookie, {
    onSetHeader(name, value) {
      if (name === 'set-cookie' && [value].flat().some(item => item.startsWith(access.DEMO_COOKIE + '='))) assert.equal(store.records().length, 1, 'Audit must be written before session cookie')
    },
  })
  assert.equal(result.statusCode, 200)
  assert.deepEqual(result.body, { ok: true, redirectTo: '/halcyon' })
  const [record] = store.records()
  assert.equal(record.person, 'Taylor Person')
  assert.equal(record.businessName, 'Example Roofing')
  assert.equal(record.verifiedEmail, email)
  assert.equal(record.agreementText, agreement.agreementText)
  assert.equal(record.agreementVersion, agreement.demoAgreement.version)
  assert.equal(record.agreementHash, access.DEMO_AGREEMENT_HASH)
  assert.equal(record.accepted, true)
  assert.equal(record.authority, true)
  assert.ok(Number.isFinite(Date.parse(record.acceptedAt)))
  assert.equal(store.expirations.has(`demo-agreement:acceptance:${record.id}`), false, 'Acceptance must not expire automatically')
  const authorized = responseCookie(result, access.DEMO_COOKIE)
  const grant = access.verifyDemoGrant(authorized.split('=')[1], origin, 'session')
  const pending = access.verifyDemoGrant(access.readDemoCookie(cookie, access.DEMO_PENDING_COOKIE), origin, 'invite')
  assert.equal(grant.exp, pending.exp)
  assert.equal(grant.acceptanceId, record.id)
  assert.equal(await access.gateDemoRequest(new Request(origin + '/demo-assets/test.js', { headers: { cookie: authorized } })), null)
  assert.ok(result.headers['set-cookie'].filter(value => !value.startsWith(access.DEMO_COOKIE + '=')).every(value => value.includes('Max-Age=0;')))
  const retry = await agreementRequest(acceptBody(), cookie)
  assert.equal(retry.statusCode, 200)
  assert.deepEqual(store.records(), [record])
  const changed = await agreementRequest(acceptBody({ name: 'Different Person' }), cookie)
  assert.equal(changed.statusCode, 409)
  assert.equal(changed.body.error, 'identity_mismatch')
  assert.equal(changed.headers['set-cookie'], undefined)
  assert.deepEqual(store.records(), [record])
})

test('expired or different-invite verification proof cannot accept agreement', async () => {
  configureAudit()
  const { cookie } = await verifiedCookies()
  const proof = access.verifyDemoGrant(access.readDemoCookie(cookie, access.DEMO_PROOF_COOKIE), origin, 'proof')
  const expired = access.signDemoGrant({ ...proof, iat: proof.iat - 601, exp: proof.iat - 1 })
  const pending = access.readDemoCookie(cookie, access.DEMO_PENDING_COOKIE)
  const cases = [
    `${access.DEMO_PENDING_COOKIE}=${pending}; ${access.DEMO_PROOF_COOKIE}=${expired}`,
    `${pendingCookie()}; ${access.DEMO_PROOF_COOKIE}=${access.readDemoCookie(cookie, access.DEMO_PROOF_COOKIE)}`,
  ]
  for (const cookies of cases) assert.equal((await agreementRequest(acceptBody(), cookies)).body.error, 'verification_required')
  assert.equal(store.records().length, 0)
})

test('missing, partial or failed durable storage and failed mail fail closed', async () => {
  const pending = pendingCookie()
  assert.equal((await agreementRequest({ action: 'send-code', email }, pending)).body.error, 'not_configured')
  process.env.DEMO_AUDIT_REDIS_URL = 'https://redis.example.test'
  assert.equal((await agreementRequest({ action: 'send-code', email }, pending)).body.error, 'not_configured')
  assert.equal(sends.length, 0)
  configureAudit()
  redisMode = 'fail'
  assert.equal((await agreementRequest({ action: 'send-code', email }, pending)).statusCode, 503)
  assert.equal(sends.length, 0)
  redisMode = 'ok'
  const { cookie } = await verifiedCookies()
  redisMode = 'fail'
  const accepted = await agreementRequest(acceptBody(), cookie)
  assert.equal(accepted.statusCode, 503)
  assert.equal(accepted.headers['set-cookie'], undefined)
  assert.equal(store.records().length, 0)
  redisMode = 'ok'; providerStatus = 500
  const failedMail = await agreementRequest({ action: 'send-code', email }, pendingCookie())
  assert.equal(failedMail.statusCode, 503)
  assert.equal(failedMail.headers['set-cookie'], undefined)
})

test('agreement API rejects cross-site, malformed, oversized, unexpected and preparsed invalid requests', async () => {
  configureAudit()
  const cookie = pendingCookie()
  for (const [body, options, status] of [
    [{ action: 'send-code', email }, { headers: { origin: 'https://attacker.test' } }, 403],
    [{ action: 'send-code', email }, { headers: { 'sec-fetch-site': 'cross-site' } }, 403],
    [{ action: 'send-code', email }, { headers: { 'content-type': 'text/plain' } }, 400],
    [{ action: 'send-code', email }, { raw: 'x'.repeat(12_001) }, 413],
    [{ action: 'send-code', email }, { raw: '{' }, 400],
    [[], {}, 400], [{ action: 'unknown' }, {}, 400],
    [{ action: 'send-code', email }, { method: 'PUT' }, 405],
    [{ action: 'verify-code', code: '1'.repeat(12_001) }, { preparsed: true }, 413],
  ]) {
    const result = await agreementRequest(body, cookie, options)
    assert.equal(result.statusCode, status)
    assert.equal(result.headers['set-cookie'], undefined)
  }
  assert.equal(sends.length, 0)
  assert.equal(store.calls.length, 0)
})

test('audit store accepts configured shared Redis fallback but rejects partial dedicated overrides', async () => {
  process.env.RATE_LIMIT_REDIS_URL = 'https://redis.example.test'
  process.env.RATE_LIMIT_REDIS_TOKEN = 'fixture-shared-token'
  assert.equal(agreementStore.demoAgreementStore().from, 'RATE_LIMIT_REDIS_URL')
  assert.equal((await agreementRequest({ action: 'send-code', email }, pendingCookie())).statusCode, 200)
  process.env.DEMO_AUDIT_REDIS_TOKEN = 'partial'
  assert.throws(() => agreementStore.demoAgreementStore(), /not_configured/)
})

test('proof expiry during body upload or durable save never issues an access session', async () => {
  configureAudit()
  const { cookie } = await verifiedCookies()
  const realNow = Date.now
  const baseline = realNow()
  const mockedFetch = globalThis.fetch
  let clock = baseline
  Date.now = () => clock
  try {
    async function* delayedBody() {
      clock = baseline + (access.DEMO_VERIFICATION_SECONDS + 1) * 1000
      yield JSON.stringify(acceptBody())
    }
    const uploaded = await agreementRequest(acceptBody(), cookie, { chunks: delayedBody() })
    assert.equal(uploaded.body.error, 'verification_required')
    assert.equal(uploaded.headers['set-cookie'], undefined)
    assert.equal(store.records().length, 0)
    clock = baseline
    globalThis.fetch = async (url, init) => {
      const result = await mockedFetch(url, init)
      if (String(url).startsWith('https://redis.example.test') && init.body.includes('demo-agreement:save-acceptance')) clock = baseline + (access.DEMO_VERIFICATION_SECONDS + 1) * 1000
      return result
    }
    const persisted = await agreementRequest(acceptBody(), cookie)
    assert.equal(persisted.body.error, 'verification_required')
    assert.equal(persisted.headers['set-cookie'], undefined)
    assert.equal(store.records().length, 1, 'Retain acceptance evidence even if proof expires while storage responds')
  } finally {
    Date.now = realNow
    globalThis.fetch = mockedFetch
  }
})
