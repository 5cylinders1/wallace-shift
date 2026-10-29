import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { preview } from 'vite'
import { createAgreementTestStore } from './demo-agreement-test-store.mjs'
import { contractorPreviewFiles } from './contractor-preview-contract.mjs'

// Exercise actual built HTML/assets and Node handlers over loopback HTTP.
// The empty Vite root/env directory prevents its loadEnv hook from reading real
// local credentials. Outbound calls are blocked except mocked email/Redis APIs.
const root = fileURLToPath(new URL('../', import.meta.url))
const dist = join(root, 'dist')
const environment = await mkdtemp(join(tmpdir(), 'wallace-demo-preview-test-'))
const savedEnv = { ...process.env }
const savedFetch = globalThis.fetch
const sends = []
const store = createAgreementTestStore()
const privateFiles = []
let server
let origin
let checks = 0

async function walk(directory, prefix = '', result = privateFiles) {
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const path = `${prefix}/${item.name}`
    if (item.isDirectory()) await walk(join(directory, item.name), path, result)
    else if (item.name.endsWith('.html') && !/^\/(?:roofers-offer|contractors|bucyrus-auto|lawn)\//.test(path)) result.push(`/demos${path}`)
  }
}
function assetsFrom(html) {
  return [...new Set([...html.matchAll(/<(?:script|link)\b[^>]*\b(?:src|href)="([^"]+)"/g)].map(match => match[1]).filter(path => path.startsWith('/')))]
}
async function request(path, options = {}) {
  const response = await fetch(`${origin}${path}`, { redirect: 'manual', signal: AbortSignal.timeout(5000), ...options })
  const body = options.method === 'HEAD' ? '' : await response.text()
  return { status: response.status, headers: response.headers, body }
}
async function checkStatus(path, status, options = {}) {
  const result = await request(path, options)
  assert.equal(result.status, status, `${path}: expected ${status}, received ${result.status}: ${result.body.slice(0, 100)}`)
  checks++
  return result
}
function responseCookie(result, name) {
  return result.headers.getSetCookie().find(value => value.startsWith(name + '='))?.split(';')[0]
}
function postAgreement(body, cookie) {
  return { method: 'POST', headers: { origin, 'content-type': 'application/json', cookie }, body: JSON.stringify(body) }
}

try {
  for (const key of Object.keys(process.env)) {
    if (/^(?:DEMO_|RESEND_|CONTACT_|RATE_LIMIT_|KV_REST_API_|UPSTASH_REDIS_REST_)/.test(key) || key === 'VERCEL') delete process.env[key]
  }
  process.env.NODE_ENV = 'development'
  process.env.DEMO_ACCESS_SECRET = randomBytes(32).toString('hex')
  process.env.DEMO_ACCESS_ORIGIN = 'http://127.0.0.1:1'
  process.env.RESEND_API_KEY = 'fixture-key-never-real'
  process.env.DEMO_ADMIN_EMAIL = 'owner@example.test'
  process.env.CONTACT_TO_EMAIL = 'reviewer@example.test'
  process.env.CONTACT_FROM_EMAIL = 'Wallace Shift <site@example.test>'
  process.env.DEMO_AUDIT_REDIS_URL = 'https://redis.example.test'
  process.env.DEMO_AUDIT_REDIS_TOKEN = 'fixture-audit-token'
  globalThis.fetch = async (input, init) => {
    const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url)
    if (url.href === 'https://api.resend.com/emails') {
      assert.equal(init?.headers?.authorization, 'Bearer fixture-key-never-real')
      const email = JSON.parse(init.body)
      assert.ok(email.to.length === 1 && ['reviewer@example.test', 'prospect@example.test', 'owner@example.test'].includes(email.to[0]))
      sends.push(email)
      return Response.json({ id: 'preview-test-provider-accepted' })
    }
    if (url.origin === 'https://redis.example.test') {
      assert.equal(init?.headers?.authorization, 'Bearer fixture-audit-token')
      return store.fetch(url, init)
    }
    if (url.hostname !== '127.0.0.1' || (origin && url.origin !== origin)) throw new Error(`Test blocked outbound network to ${url.origin}`)
    return savedFetch(input, init)
  }

  await walk(join(dist, 'demos'))
  const sourcePrivateFiles = []
  await walk(join(root, 'demos'), '', sourcePrivateFiles)
  assert.deepEqual(privateFiles.toSorted(), sourcePrivateFiles.toSorted(), 'Expected every private demo HTML entry in the release output')
  const privateAssets = (await readdir(join(dist, 'demo-assets'))).filter(file => /\.(?:js|css)$/.test(file))
  assert.ok(privateAssets.some(file => file.endsWith('.js')))
  assert.ok(privateAssets.some(file => file.endsWith('.css')))
  server = await preview({
    root: environment,
    envDir: environment,
    configFile: join(root, 'vite.config.ts'),
    logLevel: 'error',
    build: { outDir: dist },
    preview: { host: '127.0.0.1', port: 0, strictPort: true, open: false },
  })
  const address = server.httpServer.address()
  assert.ok(address && typeof address !== 'string')
  origin = `http://127.0.0.1:${address.port}`
  process.env.DEMO_ACCESS_ORIGIN = origin

  const aliases = ['/northvane', '/northvane/insurance', '/northvane/prices', '/northvane/warranty', '/northvane/faq', '/alder-stone', '/alder-stone/process', '/alder-stone/insurance', '/alder-stone/cost', '/alder-stone/estimate', '/contour', '/halcyon', '/velar', '/stratum', '/roofing-dashboard', '/datum', '/datum/cracks/horizontal-crack', '/datum/report', '/tambour', '/tambour/kitchens', '/tambour/consultation', '/stillwater', '/mitre']
  for (const path of [...aliases, ...privateFiles]) {
    const result = await checkStatus(path, 303)
    assert.match(result.headers.get('location'), /^\/request-demo\/\?demo=(?:roofers(?:-\d|-dashboard)?|foundation|cabinetry(?:-2)?|pools)$/)
    assert.match(result.headers.get('cache-control'), /no-store/)
  }
  const privatePaths = [
    ...privateAssets.map(file => `/demo-assets/${file}`),
    '/demos/roofers-4/estate-flight.mp4', '/demos/roofers-4/estate-poster.jpg', '/demos/roofers-4/material-slate.jpg', '/demos/roofers-2/sample-roof.svg', '/demos/foundation/hero-poster.jpg', '/demos/cabinetry/hero/framing.webp',
    '/api/roof-suggest?q=test', '/api/roof-measure', '/api/roof-measure.ts', '/api/roof-render',
    '/%68alcyon/estate-flight.mp4', '/demo-assets%2Fprivate.js',
    '/src/demos/pools/main.tsx', '/demos/pools/private.webp',
  ]
  for (const path of privatePaths) {
    const result = await checkStatus(path, 403)
    assert.match(result.headers.get('cache-control'), /no-store/)
  }

  for (const path of ['/', '/request-demo/', '/demo-agreement/', '/demo-admin/', '/demos/roofers-offer/', '/demos/contractors/', '/bucyrus-auto', '/demos/bucyrus-auto/', '/demos/roofers-3/preview.jpg', '/demos/roofers-4/preview.jpg', '/demos/roofers-5/hero-poster.jpg', '/demos/roofers-6/preview.jpg', '/demos/foundation/preview.jpg', '/demos/cabinetry/preview.jpg', '/demos/cabinetry-2/preview.jpg', '/demos/pools/preview.jpg', '/trawsome', '/demos/lawn/', '/demos/lawn/preview.jpg']) await checkStatus(path, 200)
  for (const file of contractorPreviewFiles) {
    const path = `/${file}`
    const response = await checkStatus(path, 200, { method: 'HEAD' })
    assert.ok(Number(response.headers.get('content-length')) > 0, `${path} must contain media`)
    const expectedType = file.endsWith('.mp4') ? 'video/mp4' : file.endsWith('.jpg') ? 'image/jpeg' : 'text/vtt'
    assert.ok(response.headers.get('content-type')?.startsWith(expectedType), `${path} must be served as ${expectedType}`)
    if (file.endsWith('.mp4')) {
      const partial = await checkStatus(path, 206, { headers: { range: 'bytes=0-31' } })
      assert.match(partial.headers.get('content-range'), /^bytes 0-31\/\d+$/)
      assert.equal(partial.headers.get('content-length'), '32')
    } else if (file.endsWith('.vtt')) {
      assert.match((await checkStatus(path, 200)).body, /^WEBVTT\s/)
    }
  }
  for (const path of ['/request-demo/', '/demo-agreement/', '/demo-admin/', '/demos/roofers-offer/', '/demos/contractors/', '/demos/lawn/']) {
    const page = await request(path)
    for (const asset of assetsFrom(page.body)) {
      assert.equal(asset.startsWith('/demo-assets/'), false, `${path} imports a private generated asset`)
      await checkStatus(asset, 200, { method: 'HEAD' })
    }
  }

  const submitted = await checkStatus('/api/demo-request', 200, {
    method: 'POST',
    headers: { origin, 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Preview Tester', businessName: 'Fixture Roofing', email: 'prospect@example.test', website: 'example.test', message: 'Fixture request; never send to a real inbox.', company: '', demo: 'roofers-4' }),
  })
  assert.deepEqual(JSON.parse(submitted.body), { ok: true })
  assert.equal(submitted.headers.get('set-cookie'), null)
  assert.equal(sends.length, 1)
  assert.deepEqual(sends[0].to, ['reviewer@example.test'])
  assert.equal(sends[0].reply_to, 'prospect@example.test')
  const invite = sends[0].text.match(/http:\/\/127\.0\.0\.1:\d+\/api\/demo-access\?token=[A-Za-z0-9_.-]+/)?.[0]
  assert.ok(invite, 'Internal review email must contain its fixture invitation')
  assert.equal(submitted.body.includes('token'), false)
  const started = await checkStatus(new URL(invite).pathname + new URL(invite).search, 303)
  assert.equal(started.headers.get('location'), '/demo-agreement/')
  assert.ok(started.headers.getSetCookie().find(value => value.startsWith('wallace_demo_access=')).includes('Max-Age=0;'))
  const pending = responseCookie(started, 'wallace_demo_pending')
  assert.ok(pending)
  await checkStatus('/halcyon', 303, { headers: { cookie: pending } })
  await checkStatus('/demo-assets/' + privateAssets[0], 403, { headers: { cookie: pending } })
  await checkStatus('/api/demo-agreement', 403)
  const status = JSON.parse((await checkStatus('/api/demo-agreement', 200, { headers: { cookie: pending } })).body)
  assert.equal(status.verified, false)
  assert.equal(status.email, undefined)
  const acceptance = { action: 'accept', name: 'Preview Tester', businessName: 'Fixture Roofing', accepted: true, authority: true, agreementVersion: status.agreementVersion, agreementHash: status.agreementHash }
  await checkStatus('/api/demo-agreement', 403, postAgreement(acceptance, pending))
  await checkStatus('/api/demo-agreement', 403, postAgreement({ action: 'send-code', email: 'wrong@example.test' }, pending))
  const codeSent = await checkStatus('/api/demo-agreement', 200, postAgreement({ action: 'send-code', email: 'prospect@example.test' }, pending))
  assert.equal(JSON.parse(codeSent.body).ok, true)
  assert.equal(sends.length, 2)
  assert.deepEqual(sends[1].to, ['prospect@example.test'])
  const code = sends[1].text.match(/^\d{6}$/m)?.[0]
  assert.ok(code)
  assert.equal(codeSent.body.includes(code), false)
  await checkStatus('/api/demo-agreement', 429, postAgreement({ action: 'send-code', email: 'prospect@example.test' }, pending))
  const verified = await checkStatus('/api/demo-agreement', 200, postAgreement({ action: 'verify-code', code }, pending))
  const proof = responseCookie(verified, 'wallace_demo_verified')
  assert.ok(proof)
  const consentCookie = pending + '; ' + proof
  await checkStatus('/demo-assets/' + privateAssets[0], 403, { headers: { cookie: consentCookie } })
  await checkStatus('/api/demo-agreement', 400, postAgreement({ action: 'verify-code', code }, pending))
  await checkStatus('/api/demo-agreement', 400, postAgreement({ ...acceptance, accepted: false }, consentCookie))
  await checkStatus('/api/demo-agreement', 400, postAgreement({ ...acceptance, authority: false }, consentCookie))
  await checkStatus('/api/demo-agreement', 409, postAgreement({ ...acceptance, agreementVersion: 'stale' }, consentCookie))
  assert.equal(store.records().length, 0)
  const unlocked = await checkStatus('/api/demo-agreement', 200, postAgreement(acceptance, consentCookie))
  assert.equal(JSON.parse(unlocked.body).redirectTo, '/halcyon')
  const setCookie = unlocked.headers.getSetCookie().find(value => value.startsWith('wallace_demo_access='))
  assert.match(setCookie, /HttpOnly; SameSite=Lax/)
  assert.equal(setCookie.includes('Domain='), false)
  const cookie = setCookie.split(';')[0]
  const authorized = { headers: { cookie } }
  const [record] = store.records()
  assert.equal(record.verifiedEmail, 'prospect@example.test')
  assert.equal(record.person, 'Preview Tester')
  assert.equal(record.agreementVersion, status.agreementVersion)
  assert.equal(record.agreementHash, status.agreementHash)
  assert.match(record.agreementText, /Wallace Shift LLC/)
  assert.equal(store.expirations.has(`demo-agreement:acceptance:${record.id}`), false)

  // Check actual preview response headers after the static-file middleware ran.
  // A pre-gate header alone is insufficient if sirv replaces it afterward.
  for (const path of aliases) {
    const result = await checkStatus(path, 200, authorized)
    assert.match(result.headers.get('cache-control'), /no-store/, `Private HTML cache header overwritten: ${path}`)
  }
  for (const path of privateFiles) {
    const result = await checkStatus(path, 200, authorized)
    assert.match(result.headers.get('cache-control'), /no-store/, `Private HTML cache header overwritten: ${path}`)
    for (const asset of assetsFrom(result.body)) {
      const loaded = await checkStatus(asset, 200, { ...authorized, method: 'HEAD' })
      assert.match(loaded.headers.get('cache-control'), /no-store/, `Private asset cache header overwritten: ${asset}`)
    }
  }
  const privateMedia = await checkStatus('/demos/roofers-4/estate-flight.mp4', 200, { ...authorized, method: 'HEAD' })
  assert.match(privateMedia.headers.get('cache-control'), /no-store/)
  for (const file of privateAssets) {
    const asset = await checkStatus(`/demo-assets/${file}`, 200, { ...authorized, method: 'HEAD' })
    assert.match(asset.headers.get('cache-control'), /no-store/)
  }

  // Change a significant signature character; the last base64url character
  // contains unused padding bits and can change without changing decoded bytes.
  const signatureStart = cookie.lastIndexOf('.') + 1
  const tampered = cookie.slice(0, signatureStart) + (cookie[signatureStart] === 'A' ? 'B' : 'A') + cookie.slice(signatureStart + 1)
  await checkStatus('/demo-assets/' + privateAssets[0], 403, { headers: { cookie: tampered } })
  await checkStatus('/halcyon', 303, { headers: { cookie: 'wallace_demo_access=invalid' } })
  await checkStatus('/demo-assets/' + privateAssets[0], 403)
  const invalidInvite = await checkStatus('/api/demo-access?token=invalid', 303)
  assert.ok(invalidInvite.headers.getSetCookie().every(value => value.includes('Max-Age=0;')))
  assert.equal(invalidInvite.headers.get('location'), '/request-demo/?access=expired')
  assert.equal(sends.length, 2)

  // Owner sign-in is independent of invitations and never creates NDA evidence.
  const anonymousAdmin = await checkStatus('/api/demo-admin', 200)
  assert.deepEqual(JSON.parse(anonymousAdmin.body), { ok: true, authenticated: false, pending: false })
  assert.match(anonymousAdmin.headers.get('cache-control'), /no-store/)
  const guestAdmin = await checkStatus('/api/demo-admin', 200, authorized)
  assert.equal(JSON.parse(guestAdmin.body).authenticated, false)
  const ownerCodeSent = await checkStatus('/api/demo-admin', 200, postAgreement({ action: 'send-code' }, ''))
  assert.equal(JSON.parse(ownerCodeSent.body).ok, true)
  assert.equal(sends.length, 3)
  assert.deepEqual(sends[2].to, ['owner@example.test'])
  const ownerCode = sends[2].text.match(/^\d{6}$/m)?.[0]
  assert.ok(ownerCode)
  assert.equal(ownerCodeSent.body.includes(ownerCode), false)
  const ownerPending = responseCookie(ownerCodeSent, 'wallace_demo_admin_pending')
  assert.ok(ownerPending)
  const pendingOwnerStatus = await checkStatus('/api/demo-admin', 200, { headers: { cookie: ownerPending } })
  assert.deepEqual(JSON.parse(pendingOwnerStatus.body), { ok: true, authenticated: false, pending: true })
  await checkStatus('/halcyon', 303, { headers: { cookie: ownerPending } })
  await checkStatus('/demo-assets/' + privateAssets[0], 403, { headers: { cookie: ownerPending } })
  await checkStatus('/api/demo-admin', 429, postAgreement({ action: 'send-code' }, ''))
  const ownerVerified = await checkStatus('/api/demo-admin', 200, postAgreement({ action: 'verify-code', code: ownerCode }, ownerPending))
  const ownerCookie = responseCookie(ownerVerified, 'wallace_demo_admin')
  assert.ok(ownerCookie)
  assert.match(ownerVerified.headers.getSetCookie().find(value => value.startsWith('wallace_demo_admin=')), /; Max-Age=2592000; HttpOnly; SameSite=Lax/)
  assert.ok(ownerVerified.headers.getSetCookie().find(value => value.startsWith('wallace_demo_admin_pending=')).includes('Max-Age=0;'))
  const ownerOptions = { headers: { cookie: ownerCookie } }
  const ownerStatus = await checkStatus('/api/demo-admin', 200, ownerOptions)
  assert.equal(JSON.parse(ownerStatus.body).authenticated, true)
  await checkStatus('/api/demo-admin', 400, postAgreement({ action: 'verify-code', code: ownerCode }, ownerPending))
  await checkStatus('/api/demo-agreement', 403, ownerOptions)
  for (const path of aliases) {
    const page = await checkStatus(path, 200, ownerOptions)
    assert.match(page.headers.get('cache-control'), /no-store/)
  }
  for (const file of privateAssets) {
    const asset = await checkStatus(`/demo-assets/${file}`, 200, { ...ownerOptions, method: 'HEAD' })
    assert.match(asset.headers.get('cache-control'), /no-store/)
  }
  assert.deepEqual(store.records(), [record], 'Owner access must not add or alter prospect agreement evidence')
  const signedOut = await checkStatus('/api/demo-admin', 200, postAgreement({ action: 'logout' }, ownerCookie))
  for (const name of ['wallace_demo_admin', 'wallace_demo_admin_pending', 'wallace_demo_access', 'wallace_demo_pending', 'wallace_demo_verified']) {
    assert.ok(signedOut.headers.getSetCookie().find(value => value.startsWith(name + '=')).includes('Max-Age=0;'))
  }
  const clearedOwner = signedOut.headers.getSetCookie().map(value => value.split(';')[0]).join('; ')
  assert.equal(JSON.parse((await checkStatus('/api/demo-admin', 200, { headers: { cookie: clearedOwner } })).body).authenticated, false)
  await checkStatus('/halcyon', 303, { headers: { cookie: clearedOwner } })
  await checkStatus('/demo-assets/' + privateAssets[0], 403, { headers: { cookie: clearedOwner } })
  await checkStatus('/halcyon', 200, authorized)
  assert.equal(sends.length, 3)
  console.log(`Demo preview HTTP integration passed: ${checks} route/asset responses; ${privateFiles.length} private documents; isolated public assets; manual approval; verified email; explicit NDA acceptance; persisted evidence; owner code sign-in and logout; guest/admin separation; signed cookies; no-store. Three mocked emails and modeled Redis operations; no external network or live provider calls.`)
} finally {
  if (server) {
    server.httpServer.closeIdleConnections?.()
    server.httpServer.closeAllConnections?.()
    await new Promise((resolve, reject) => server.httpServer.close(error => error ? reject(error) : resolve()))
  }
  globalThis.fetch = savedFetch
  for (const key of Object.keys(process.env)) if (!Object.hasOwn(savedEnv, key)) delete process.env[key]
  Object.assign(process.env, savedEnv)
  await rm(environment, { recursive: true, force: true })
}
