import assert from 'node:assert/strict'
import { after, beforeEach, test } from 'node:test'
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath, pathToFileURL } from 'node:url'
import ts from 'typescript'

// Compile the real dispatcher and handlers without loading .env files or
// contacting geocoders, Redis, or email providers. All fetches are blocked or mocked.
const root = fileURLToPath(new URL('../', import.meta.url))
const temporary = await mkdtemp(join(tmpdir(), 'wallace-lawn-api-test-'))
const savedEnv = { ...process.env }
const savedFetch = globalThis.fetch
const compiled = new Map()
async function compile(relative) {
  if (compiled.has(relative)) return compiled.get(relative)
  const outputPath = join(temporary, `${relative}.mjs`)
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
const { default: handler, config } = await import(pathToFileURL(await compile('api/lawn.ts')).href)

beforeEach(() => {
  for (const key of Object.keys(process.env)) {
    if (/^(GEOAPIFY_|LAWN_|RESEND_|CONTACT_|RATE_LIMIT_|KV_REST_API_|UPSTASH_REDIS_REST_)/.test(key)) delete process.env[key]
  }
  globalThis.fetch = async () => { throw new Error('Unexpected outbound request in lawn API test') }
})
after(async () => {
  for (const key of Object.keys(process.env)) if (!Object.hasOwn(savedEnv, key)) delete process.env[key]
  Object.assign(process.env, savedEnv)
  globalThis.fetch = savedFetch
  await rm(temporary, { recursive: true, force: true })
})

async function call(url, options = {}) {
  const req = { url, method: 'GET', headers: { 'content-type': 'application/json', 'x-real-ip': '192.0.2.1' }, ...options }
  const res = {
    statusCode: 200, headers: {}, body: undefined,
    setHeader(key, value) { this.headers[key] = value },
    end(value) { this.body = JSON.parse(value) },
  }
  await handler(req, res)
  return { status: res.statusCode, headers: res.headers, body: res.body }
}
const urls = action => [`/api/lawn-${action}`, `/api/lawn?action=${action}`]
const queryJoin = url => url.includes('?') ? '&' : '?'

test('legacy rewrites and local mounts share one deployed lawn function', async () => {
  const vercel = JSON.parse(await readFile(join(root, 'vercel.json'), 'utf8'))
  const vite = await readFile(join(root, 'vite.config.ts'), 'utf8')
  for (const action of ['lookup', 'suggest', 'request']) {
    assert.equal(vercel.rewrites.find(rule => rule.source === `/api/lawn-${action}`)?.destination, `/api/lawn?action=${action}`)
    assert.ok(vite.includes(`'/api/lawn-${action}': '/api/lawn.ts'`))
  }
  assert.ok(vite.includes("'/api/lawn': '/api/lawn.ts'"))
  assert.equal(config.maxDuration, 20)
})

test('deployed entry inventory stays within 12 functions including Node middleware', async context => {
  async function entries(directory) {
    const files = []
    for (const item of await readdir(directory, { withFileTypes: true })) {
      if (item.name.startsWith('_') || item.name.startsWith('.')) continue
      const path = join(directory, item.name)
      if (item.isDirectory()) files.push(...await entries(path))
      else if (/\.(?:[cm]?[jt]s|py|go|rb)$/.test(item.name) && !/\.d\.ts$/.test(item.name)) files.push(path)
    }
    return files
  }
  const functions = await entries(join(root, 'api'))
  const total = functions.length + 1 // middleware.ts uses the Node runtime.
  assert.ok(total <= 12, `${functions.length} API entries plus middleware exceed the deployment's 12-function limit`)
  assert.equal(functions.filter(path => path.includes('/lawn')).length, 1)
  context.diagnostic(`${functions.length} API functions plus Node middleware: ${total} total.`)
})

test('query parameters reach lookup/suggest handlers on both URL forms', async () => {
  for (const action of ['lookup', 'suggest']) {
    const query = action === 'lookup' ? 'address=7400%20Main%20Street' : 'q=7400%20Main'
    for (const url of urls(action)) {
      const invalid = await call(url)
      assert.equal(invalid.status, 400)
      assert.equal(invalid.body.error, 'invalid')
      const valid = await call(url + queryJoin(url) + query)
      assert.deepEqual(valid.body, { ok: false, error: 'not_configured' })
      assert.equal(valid.status, 200)
      assert.equal(valid.headers['cache-control'], 'no-store')
    }
  }
  assert.equal((await call('/api/lawn?q=7400', { query: { action: 'suggest' } })).body.error, 'not_configured')
})

test('request bodies and method validation survive dispatch without sending anything', async () => {
  for (const url of urls('request')) {
    assert.equal((await call(url)).status, 400)
    assert.equal((await call(url, { method: 'POST', body: '{' })).status, 400)
    assert.equal((await call(url, { method: 'POST', body: {} })).status, 400)
    // Existing honeypot response proves the POST/body reached the request handler.
    const honeypot = await call(url, { method: 'POST', body: { company: 'test bot trap' } })
    assert.deepEqual(honeypot.body, { ok: true, price: { low: 0, high: 0 } })
    assert.equal(honeypot.headers['cache-control'], 'no-store')
  }
  for (const action of ['lookup', 'suggest']) {
    for (const url of urls(action)) assert.equal((await call(url, { method: 'POST' })).status, 400)
  }
})

test('legacy paths cannot be overridden and invalid selectors never dispatch', async () => {
  const result = await call('/api/lawn-suggest?action=request', { method: 'POST', body: { company: 'test bot trap' } })
  assert.equal(result.status, 400, 'The legacy suggest path must retain GET-only behavior')
  for (const url of ['/api/lawn', '/api/lawn?action=unknown', '/api/lawn?action=toString', '/api/lawn?action=lookup&action=request', '/api/other?action=lookup']) {
    assert.deepEqual((await call(url)).body, { ok: false, error: 'not_found' })
    assert.equal((await call(url)).status, 404)
  }
  assert.equal((await call('/api/lawn', { query: { action: ['lookup', 'request'] } })).status, 404)
})

test('aliases retain the same per-action rate limit scopes', async () => {
  process.env.GEOAPIFY_API_KEY = 'fixture-only'
  process.env.RATE_LIMIT_REDIS_URL = 'https://redis.example.test'
  process.env.RATE_LIMIT_REDIS_TOKEN = 'fixture-only'
  const keys = []
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'https://redis.example.test/pipeline')
    keys.push(JSON.parse(options.body)[0][1])
    return Response.json([{ result: 1000 }, { result: 1 }])
  }
  const request = { method: 'POST', body: { name: 'Test', phone: '9135550123', email: 'test@example.test', contact: 'text', frequency: 'weekly', timing: 'week', lawnSqFt: 2000, address: '7400 Main Street' } }
  for (const action of ['lookup', 'suggest', 'request']) {
    const query = action === 'lookup' ? 'address=7400%20Main%20Street' : action === 'suggest' ? 'q=7400' : ''
    for (const url of urls(action)) {
      const result = await call(url + (query ? queryJoin(url) + query : ''), action === 'request' ? request : {})
      assert.equal(result.status, 429)
      assert.equal(result.body.error, 'rate_limited')
      assert.equal(result.headers['cache-control'], 'no-store')
    }
    assert.ok(keys.at(-1).startsWith(`lawn-${action}:192.0.2.1:`))
    assert.equal(keys.at(-1), keys.at(-2), 'Both aliases must share the same counter')
  }
  assert.equal(keys.length, 6)
})
