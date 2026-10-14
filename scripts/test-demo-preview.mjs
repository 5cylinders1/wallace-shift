import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { preview } from 'vite'

// Exercise actual built HTML/assets and Node handlers over loopback HTTP.
// The empty Vite root/env directory prevents its loadEnv hook from reading real
// local credentials. All outbound fetch is blocked except a mocked Resend send.
const root = fileURLToPath(new URL('../', import.meta.url))
const dist = join(root, 'dist')
const environment = await mkdtemp(join(tmpdir(), 'wallace-demo-preview-test-'))
const savedEnv = { ...process.env }
const savedFetch = globalThis.fetch
const sends = []
const privateFiles = []
let server
let origin
let checks = 0

async function walk(directory, prefix = '') {
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const path = `${prefix}/${item.name}`
    if (item.isDirectory()) await walk(join(directory, item.name), path)
    else if (item.name.endsWith('.html') && !path.startsWith('/roofers-offer/')) privateFiles.push(`/demos${path}`)
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

try {
  for (const key of Object.keys(process.env)) {
    if (/^(?:DEMO_|RESEND_|CONTACT_|RATE_LIMIT_|KV_REST_API_|UPSTASH_REDIS_REST_)/.test(key) || key === 'VERCEL') delete process.env[key]
  }
  process.env.NODE_ENV = 'development'
  process.env.DEMO_ACCESS_SECRET = randomBytes(32).toString('hex')
  process.env.DEMO_ACCESS_ORIGIN = 'http://127.0.0.1:1'
  process.env.RESEND_API_KEY = 'fixture-key-never-real'
  process.env.CONTACT_TO_EMAIL = 'reviewer@example.test'
  process.env.CONTACT_FROM_EMAIL = 'Wallace Shift <site@example.test>'
  globalThis.fetch = async (input, init) => {
    const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url)
    if (url.href === 'https://api.resend.com/emails') {
      assert.equal(init?.headers?.authorization, 'Bearer fixture-key-never-real')
      const email = JSON.parse(init.body)
      assert.deepEqual(email.to, ['reviewer@example.test'])
      sends.push(email)
      return Response.json({ id: 'preview-test-provider-accepted' })
    }
    if (url.hostname !== '127.0.0.1' || (origin && url.origin !== origin)) throw new Error(`Test blocked outbound network to ${url.origin}`)
    return savedFetch(input, init)
  }

  await walk(join(dist, 'demos'))
  assert.equal(privateFiles.length, 14, 'Expected all fourteen private demo HTML outputs')
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

  const aliases = ['/northvane', '/northvane/insurance', '/northvane/prices', '/northvane/warranty', '/northvane/faq', '/alder-stone', '/alder-stone/process', '/alder-stone/insurance', '/alder-stone/cost', '/alder-stone/estimate', '/contour', '/halcyon', '/velar', '/roofing-dashboard']
  for (const path of [...aliases, ...privateFiles]) {
    const result = await checkStatus(path, 303)
    assert.match(result.headers.get('location'), /^\/request-demo\/\?demo=roofers(?:-\d|-dashboard)?$/)
    assert.match(result.headers.get('cache-control'), /no-store/)
  }
  const privatePaths = [
    ...privateAssets.map(file => `/demo-assets/${file}`),
    '/demos/roofers-4/estate-flight.mp4', '/demos/roofers-4/estate-poster.jpg', '/demos/roofers-4/material-slate.jpg', '/demos/roofers-2/sample-roof.svg',
    '/api/roof-suggest?q=test', '/api/roof-measure', '/api/roof-measure.ts', '/api/roof-render',
    '/%68alcyon/estate-flight.mp4', '/demo-assets%2Fprivate.js',
  ]
  for (const path of privatePaths) {
    const result = await checkStatus(path, 403)
    assert.match(result.headers.get('cache-control'), /no-store/)
  }

  for (const path of ['/', '/request-demo/', '/demos/roofers-offer/', '/demos/roofers-3/preview.jpg', '/demos/roofers-4/preview.jpg', '/demos/roofers-5/hero-poster.jpg']) await checkStatus(path, 200)
  for (const path of ['/request-demo/', '/demos/roofers-offer/']) {
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
  assert.equal(sends[0].reply_to, 'prospect@example.test')
  const invite = sends[0].text.match(/http:\/\/127\.0\.0\.1:\d+\/api\/demo-access\?token=[A-Za-z0-9_.-]+/)?.[0]
  assert.ok(invite, 'Internal review email must contain its fixture invitation')
  assert.equal(submitted.body.includes('token'), false)
  const unlocked = await checkStatus(new URL(invite).pathname + new URL(invite).search, 303)
  assert.equal(unlocked.headers.get('location'), '/halcyon')
  const setCookie = unlocked.headers.get('set-cookie')
  assert.match(setCookie, /HttpOnly; SameSite=Lax/)
  assert.equal(setCookie.includes('Domain='), false)
  const cookie = setCookie.split(';')[0]
  const authorized = { headers: { cookie } }

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
  assert.equal(invalidInvite.headers.get('set-cookie'), null)
  assert.equal(invalidInvite.headers.get('location'), '/request-demo/?access=expired')
  assert.equal(sends.length, 1)
  console.log(`Demo preview HTTP integration passed: ${checks} route/asset responses; fourteen private documents; isolated public assets; manual approval; signed cookie; no-store. One mocked internal email; no external network or live provider calls.`)
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
