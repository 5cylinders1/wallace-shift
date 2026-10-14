import assert from 'node:assert/strict'
import { after, beforeEach, test } from 'node:test'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { Readable } from 'node:stream'
import { fileURLToPath, pathToFileURL } from 'node:url'
import ts from 'typescript'

// Execute real handlers with isolated environment and mocked providers only.
// No local environment file is read and no email can leave this test suite.
const root = fileURLToPath(new URL('../', import.meta.url))
const temporary = await mkdtemp(join(tmpdir(), 'wallace-demo-access-tests-'))
const savedEnv = { ...process.env }
const savedFetch = globalThis.fetch
const savedError = console.error
const origin = 'https://roofers.wallaceshift.com'
let iteration = 0
let access, requestHandler, inviteHandler, middleware, sends, providerStatus, failFetch, redisMode

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
    setHeader(name, value) { this.headers[name.toLowerCase()] = value },
    end(value) { this.raw = value; if (value) this.body = JSON.parse(value) },
  }
  await handler(req, res)
  return res
}
const getInvite = () => sends[0].text.match(/https:\/\/[^\s]+\/api\/demo-access\?token=([^\s]+)/)?.[1]
function session(demo = 'roofers-4') {
  const invite = access.createDemoInvite(demo)
  return access.signDemoGrant({ ...access.verifyDemoGrant(invite, origin, 'invite'), kind: 'session' })
}

beforeEach(async () => {
  for (const key of ['RATE_LIMIT_REDIS_URL', 'RATE_LIMIT_REDIS_TOKEN', 'KV_REST_API_URL', 'KV_REST_API_TOKEN', 'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN', 'DEMO_ACCESS_ORIGIN', 'VERCEL']) delete process.env[key]
  process.env.NODE_ENV = 'production'
  process.env.DEMO_ACCESS_SECRET = 'fixture-secret-not-a-real-secret-0123456789'
  process.env.RESEND_API_KEY = 'fixture-resend-key'
  process.env.CONTACT_TO_EMAIL = 'review@example.test'
  process.env.CONTACT_FROM_EMAIL = 'Wallace Shift <site@example.test>'
  sends = []; providerStatus = 200; failFetch = false; redisMode = 'ok'
  console.error = () => undefined
  globalThis.fetch = async (url, init) => {
    if (String(url).startsWith('https://redis.example.test')) {
      if (redisMode === 'fail') throw new Error('Synthetic store outage')
      return Response.json([{ result: redisMode === 'limit' ? 100 : 1 }, { result: 1 }])
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
  const token = access.createDemoInvite('roofers-4', now)
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
  for (const path of ['/northvane', '/alder-stone/process', '/contour/', '/halcyon/index.html', '/velar', '/roofing-dashboard', '/demos/roofers-4/index.html', '/%68alcyon', '/demos%2Froofers-4/']) {
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
  for (const path of ['/', '/request-demo/', '/assets/public.js', '/demos/roofers-offer/index.html', '/src/demos/roofers-offer/main.tsx', '/demos/roofers-3/preview.jpg', '/demos/roofers-4/preview.jpg', '/demos/roofers-5/hero-poster.jpg']) assert.equal(await access.gateDemoRequest(new Request(origin + path)), null, path)
  assert.equal((await access.gateDemoRequest(new Request(origin + '/demos/roofers-4/preview.jpg/extra')))?.status, 303)
})

test('session authorizes all demo resources on its origin only; invite cannot be a cookie', async () => {
  const token = session()
  for (const path of ['/northvane', '/velar', '/demo-assets/any.js', '/api/roof-suggest']) assert.equal(await access.gateDemoRequest(new Request(origin + path, { headers: { cookie: `${access.DEMO_COOKIE}=${token}` } })), null)
  const wrong = await access.gateDemoRequest(new Request('https://wallaceshift.com/demo-assets/any.js', { headers: { cookie: `${access.DEMO_COOKIE}=${token}` } }))
  assert.equal(wrong.status, 403)
  const invite = await access.gateDemoRequest(new Request(origin + '/demo-assets/any.js', { headers: { cookie: `${access.DEMO_COOKIE}=${access.createDemoInvite('roofers-4')}` } }))
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
  assert.deepEqual(sends[0].to, ['review@example.test'])
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

test('redeeming approved invitation sets secure HttpOnly host cookie and canonical token-free redirect', async () => {
  const token = access.createDemoInvite('roofers-4')
  const result = await invoke(inviteHandler, undefined, { method: 'GET', url: `/api/demo-access?token=${token}&next=https://attacker.test` })
  assert.equal(result.statusCode, 303)
  assert.equal(result.headers.location, '/halcyon')
  assert.match(result.headers['set-cookie'], /; Path=\/; Max-Age=\d+; HttpOnly; SameSite=Lax; Secure$/)
  assert.equal(result.headers['set-cookie'].includes('Domain='), false)
  assert.equal(result.headers.location.includes(token), false)
  assert.match(result.headers['cache-control'], /no-store/)
  const cookie = result.headers['set-cookie'].split(';')[0]
  assert.equal(await access.gateDemoRequest(new Request(origin + '/velar', { headers: { cookie } })), null)
})

test('invalid, expired and cross-host invitation cannot set cookie or open an external redirect', async () => {
  const token = access.createDemoInvite('roofers-4', Math.floor(Date.now() / 1000) - access.DEMO_ACCESS_SECONDS)
  for (const url of ['/api/demo-access?token=invalid', `/api/demo-access?token=${token}`, `/api/demo-access?token=${token}&token=second`]) {
    const result = await invoke(inviteHandler, undefined, { method: 'GET', url })
    assert.equal(result.headers['set-cookie'], undefined)
    assert.equal(result.headers.location, '/request-demo/?access=expired')
  }
  const otherHost = await invoke(inviteHandler, undefined, { method: 'GET', url: `/api/demo-access?token=${access.createDemoInvite('roofers-4')}`, headers: { host: 'wallaceshift.com' } })
  assert.equal(otherHost.headers['set-cookie'], undefined)
})

test('loopback development supports matching local invitation origin without Secure cookie', async () => {
  process.env.NODE_ENV = 'development'
  process.env.DEMO_ACCESS_ORIGIN = 'http://127.0.0.1:5174'
  const token = access.createDemoInvite('roofers-3')
  const result = await invoke(inviteHandler, undefined, { method: 'GET', url: `/api/demo-access?token=${token}`, headers: { host: '127.0.0.1:5174', origin: 'http://127.0.0.1:5174' } })
  assert.equal(result.headers.location, '/contour')
  assert.equal(result.headers['set-cookie'].includes('; Secure'), false)
  const cookie = result.headers['set-cookie'].split(';')[0]
  assert.equal(await access.gateDemoRequest(new Request('http://127.0.0.1:5174/contour', { headers: { cookie } })), null)
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
