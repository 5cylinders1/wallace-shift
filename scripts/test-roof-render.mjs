import assert from 'node:assert/strict'
import { after, afterEach, beforeEach, test } from 'node:test'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { Readable } from 'node:stream'
import { fileURLToPath, pathToFileURL } from 'node:url'
import ts from 'typescript'

// The real handler and validation are executed. Every outbound fetch is mocked;
// no local credential is loaded and these checks cannot buy an OpenAI image.
const root = fileURLToPath(new URL('../', import.meta.url))
const temporary = await mkdtemp(join(tmpdir(), 'velar-roof-render-tests-'))
const savedEnv = { ...process.env }
const originalFetch = globalThis.fetch
const originalError = console.error
let iteration = 0
let state
let handler
let validation
let provider

async function modules() {
  const directory = join(temporary, String(iteration++))
  const compiled = new Map()
  async function compile(relative) {
    if (compiled.has(relative)) return compiled.get(relative)
    const outputPath = join(directory, `${relative}.mjs`)
    compiled.set(relative, outputPath)
    const source = await readFile(resolve(root, relative), 'utf8')
    let output = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext } }).outputText
    for (const match of [...output.matchAll(/(from\s+)(['"])(\.[^'"]+)\2/g)]) {
      const dependency = join(dirname(relative), match[3].replace(/\.js$/, '.ts'))
      output = output.replace(match[0], `from ${JSON.stringify(pathToFileURL(await compile(dependency)).href)}`)
    }
    await mkdir(dirname(outputPath), { recursive: true })
    await writeFile(outputPath, output)
    return outputPath
  }
  const load = async relative => import(pathToFileURL(await compile(relative)).href)
  return {
    handler: (await load('api/roof-render.ts')).default,
    validation: await load('api/_lib/roof-render/validation.ts'),
    provider: await load('api/_lib/roof-render/provider.ts'),
  }
}

// Format-header fixtures let us probe dimension limits without allocating large
// decoded images. They are used only by the mocked image service.
function jpeg(width = 1200, height = 800) {
  const bytes = Buffer.from([255, 216, 255, 192, 0, 11, 8, 0, 0, 0, 0, 1, 1, 17, 0, 255, 218, 0, 8, 1, 1, 0, 0, 63, 0, 1, 255, 217])
  bytes.writeUInt16BE(height, 7)
  bytes.writeUInt16BE(width, 9)
  return bytes
}
function photo(width, height) { return `data:image/jpeg;base64,${jpeg(width, height).toString('base64')}` }
function body(overrides = {}) { return { photo: photo(), materialId: 'slate', finishId: 'blue-gray', quality: 'low', consent: true, ...overrides } }
const usage = { input_tokens: 1200, input_tokens_details: { image_tokens: 1000, text_tokens: 200 }, output_tokens: 174, total_tokens: 1374 }

async function request(payload = body(), options = {}, endpoint = handler) {
  const raw = options.raw ?? JSON.stringify(payload)
  const req = Readable.from(options.chunks ?? [raw])
  req.method = options.method ?? 'POST'
  req.headers = { 'content-type': 'application/json', host: '127.0.0.1:5174', origin: 'http://127.0.0.1:5174', ...options.headers }
  req.socket = { remoteAddress: options.remoteAddress ?? '127.0.0.1' }
  if (options.preparsed) req.body = payload
  const res = {
    statusCode: 200, headers: {}, headersSent: false,
    setHeader(name, value) { this.headers[name] = value },
    end(value) { this.headersSent = true; this.body = JSON.parse(value) },
  }
  await endpoint(req, res)
  return res
}

beforeEach(async () => {
  process.env.NODE_ENV = 'development'
  process.env.OPENAI_API_KEY = 'fixture-key-never-a-real-secret'
  for (const key of ['VERCEL', 'ROOF_RENDER_ENABLED', 'ROOF_RENDER_ORIGIN', 'ROOF_RENDER_DAILY_CAP', 'ROOF_RENDER_PER_HOUR', 'RATE_LIMIT_REDIS_URL', 'RATE_LIMIT_REDIS_TOKEN', 'KV_REST_API_URL', 'KV_REST_API_TOKEN', 'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN']) delete process.env[key]
  state = { providerCalls: [], redisCalls: [], counts: new Map(), failRedis: false }
  console.error = () => undefined
  globalThis.fetch = async (url, init) => {
    if (String(url).includes('redis.example.test')) {
      const commands = JSON.parse(init.body)
      state.redisCalls.push(commands)
      if (state.failRedis) throw new Error('Synthetic Redis outage')
      return Response.json(commands.map(([name, key]) => {
        if (name === 'INCR') { const count = (state.counts.get(key) ?? 0) + 1; state.counts.set(key, count); return { result: count } }
        if (name === 'EXPIRE') return { result: 1 }
        throw new Error(`Unexpected limiter command ${name}`)
      }))
    }
    assert.equal(url, 'https://api.openai.com/v1/images/edits')
    const asked = JSON.parse(init.body)
    state.providerCalls.push(asked)
    if (state.gate) await state.gate()
    if (state.throwProvider) throw state.throwProvider
    if (state.providerError) return Response.json(state.providerError.body, { status: state.providerError.status })
    const [width, height] = asked.size.split('x').map(Number)
    return Response.json(state.providerBody ?? { data: [{ b64_json: jpeg(width, height).toString('base64') }], usage })
  }
  ;({ handler, validation, provider } = await modules())
})
afterEach(() => {
  globalThis.fetch = originalFetch
  console.error = originalError
  for (const key of Object.keys(process.env)) if (!(key in savedEnv)) delete process.env[key]
  Object.assign(process.env, savedEnv)
})
after(async () => { await rm(temporary, { recursive: true, force: true }) })

test('a paid edit has a fixed model, one image, bounded quality and a roof-only prompt', async () => {
  const response = await request()
  assert.equal(response.body.ok, true)
  assert.equal(response.body.model, 'gpt-image-2')
  assert.equal(response.body.costUsd, 0.01422)
  assert.deepEqual(response.body.usage, usage)
  assert.equal(response.headers['cache-control'], 'private, no-store')
  assert.equal(response.body.image.startsWith('data:image/jpeg;base64,'), true)
  assert.equal(JSON.stringify(response.body).includes('fixture-key'), false)
  const asked = state.providerCalls[0]
  assert.equal(asked.n, 1)
  assert.equal(asked.size, '1536x1024')
  assert.equal(asked.quality, 'low')
  assert.equal(asked.output_format, 'jpeg')
  assert.equal(asked.input_fidelity, undefined)
  assert.deepEqual(asked.images, [{ image_url: body().photo }])
  assert.match(asked.prompt, /Replace only the existing roof covering/)
  assert.match(asked.prompt, /Never change a horizontal surface/)
  assert.match(asked.prompt, /retain all horizontal timber entry canopies/)
  assert.match(asked.prompt, /true slope and perspective/)
  assert.match(asked.prompt, /Do not crop/)
})

test('invalid consent, materials, custom prompts, models, quality and remote photos never call the provider', async () => {
  const invalid = [
    { consent: false }, { consent: 'true' }, { materialId: 'unknown' }, { materialId: '__proto__' },
    { finishId: 'zinc' }, { finishId: 'constructor' }, { quality: 'high' }, { model: 'expensive' },
    { prompt: 'arbitrary generation' }, { photo: 'https://example.test/home.jpg' },
    { photo: 'data:image/svg+xml;base64,PHN2Zz4=' },
    { photo: `data:image/png;base64,${jpeg().toString('base64')}` },
  ]
  for (const invalidBody of invalid) {
    const response = await request(body(invalidBody))
    assert.equal(response.body.ok, false)
    assert.equal(response.statusCode, 400)
  }
  assert.equal(state.providerCalls.length, 0)
})

test('oversized image dimensions, body bytes, panoramas and malformed JSON fail before spending', async () => {
  for (const [payload, options, status] of [
    [body({ photo: photo(3000, 1200) }), {}, 413],
    [body({ photo: photo(2560, 2560) }), {}, 413],
    [body({ photo: photo(1200, 100) }), {}, 413],
    [body({ photo: photo(1600, 400) }), {}, 400],
    [body(), { raw: '{invalid json}' }, 400],
    [body(), { headers: { 'content-length': String(validation.MAX_BODY_BYTES + 1) } }, 413],
    [body(), { chunks: [' '.repeat(validation.MAX_BODY_BYTES), 'over-bound'] }, 413],
    [body(), { headers: { 'content-type': 'text/plain' } }, 400],
  ]) assert.equal((await request(payload, options)).statusCode, status)
  assert.equal(state.providerCalls.length, 0)
})

test('loopback access requires the real socket and local Host, and rejects cross-site browser requests', async () => {
  const denied = [
    { remoteAddress: '192.0.2.10' },
    { headers: { host: 'attacker.test', origin: 'https://attacker.test' } },
    { headers: { origin: 'https://attacker.test' } },
    { headers: { 'sec-fetch-site': 'cross-site' } },
    { remoteAddress: '192.0.2.10', headers: { 'x-forwarded-for': '127.0.0.1', 'x-forwarded-host': '127.0.0.1:5174' } },
  ]
  for (const options of denied) assert.equal((await request(body(), options)).body.error, 'disabled')
  assert.equal(state.providerCalls.length, 0)
})

test('status exposes availability without making a paid call; missing credentials are actionable', async () => {
  const status = await request(undefined, { method: 'GET' })
  assert.equal(status.body.enabled, true)
  assert.equal(status.body.configured, true)
  assert.equal(JSON.stringify(status.body).includes('fixture-key'), false)
  delete process.env.OPENAI_API_KEY
  assert.equal((await request(undefined, { method: 'GET' })).body.enabled, false)
  const response = await request()
  assert.equal(response.body.error, 'not_configured')
  assert.equal(response.statusCode, 503)
  assert.equal(state.providerCalls.length, 0)
})

test('exact duplicate requests share an in-flight purchase and then a private bounded cache', async () => {
  let release
  let started
  const ready = new Promise(resolveReady => { started = resolveReady })
  const gate = new Promise(resolveGate => { release = resolveGate })
  state.gate = async () => { started(); await gate }
  const first = request()
  await ready
  const second = request()
  release()
  const [one, two] = await Promise.all([first, second])
  assert.equal(state.providerCalls.length, 1)
  assert.equal(one.body.cached, false)
  assert.equal(two.body.cached, true)
  assert.equal(two.body.costUsd, 0)
  assert.equal(two.body.usage, null)
  assert.equal(one.body.image, two.body.image)
  assert.equal((await request()).body.cached, true)
  assert.equal(state.providerCalls.length, 1)
  assert.equal((await request(body({ finishId: 'graphite' }))).body.cached, false)
  assert.equal(state.providerCalls.length, 2)
})

test('different photos or quality settings keep separate results and preserve portrait framing', async () => {
  const first = await request(body({ photo: photo(800, 1200) }))
  assert.equal(first.body.width, 1024)
  assert.equal(first.body.height, 1536)
  assert.equal((await request(body({ photo: photo(800, 1200), quality: 'medium' }))).body.cached, false)
  assert.equal((await request()).body.cached, false)
  assert.equal(state.providerCalls.length, 3)
})

test('only two distinct paid calls run concurrently', async () => {
  let release
  const gate = new Promise(resolveGate => { release = resolveGate })
  let started
  const ready = new Promise(resolveReady => { started = resolveReady })
  state.gate = async () => { if (state.providerCalls.length === 2) started(); await gate }
  const first = request()
  const second = request(body({ finishId: 'graphite' }))
  await ready
  const third = await request(body({ materialId: 'cedar', finishId: 'honey' }))
  assert.equal(third.body.error, 'busy')
  assert.equal(state.providerCalls.length, 2)
  release()
  await Promise.all([first, second])
})

test('local daily and per-visitor caps block new purchases while a cache hit costs nothing', async () => {
  process.env.ROOF_RENDER_DAILY_CAP = '1'
  assert.equal((await request()).body.ok, true)
  assert.equal((await request()).body.cached, true)
  assert.equal((await request(body({ finishId: 'graphite' }))).body.error, 'limit_reached')
  assert.equal(state.providerCalls.length, 1)
  const fresh = (await modules()).handler
  process.env.ROOF_RENDER_PER_HOUR = '1'
  process.env.ROOF_RENDER_DAILY_CAP = '20'
  assert.equal((await request(body(), {}, fresh)).body.ok, true)
  assert.equal((await request(body({ finishId: 'graphite' }), {}, fresh)).body.error, 'rate_limited')
})

function production() {
  process.env.NODE_ENV = 'production'
  process.env.VERCEL = '1'
  process.env.ROOF_RENDER_ENABLED = 'true'
  process.env.ROOF_RENDER_ORIGIN = 'https://velar.example.test'
  process.env.RATE_LIMIT_REDIS_URL = 'https://redis.example.test'
  process.env.RATE_LIMIT_REDIS_TOKEN = 'fixture-redis-token'
  return { remoteAddress: '192.0.2.10', headers: { host: 'velar.example.test', origin: 'https://velar.example.test', 'x-vercel-forwarded-for': '198.51.100.11' } }
}

test('public rendering is disabled by default and fails closed without a persistent limiter', async () => {
  process.env.NODE_ENV = 'production'
  assert.equal((await request()).body.error, 'disabled')
  const options = production()
  delete process.env.RATE_LIMIT_REDIS_TOKEN
  assert.equal((await request(body(), options)).body.error, 'disabled')
  assert.equal(state.providerCalls.length, 0)
  assert.equal(state.redisCalls.length, 0)
})

test('public calls use persistent limits and cannot bypass their daily cap with another worker', async () => {
  const options = production()
  process.env.ROOF_RENDER_DAILY_CAP = '1'
  assert.equal((await request(body(), options)).body.ok, true)
  const independentHandler = (await modules()).handler
  assert.equal((await request(body({ finishId: 'graphite' }), options, independentHandler)).body.error, 'limit_reached')
  assert.equal(state.providerCalls.length, 1)
  assert.equal(state.redisCalls.length, 4)
  for (const commands of state.redisCalls) assert.match(commands[0][1], /^velar-roof-render:/)
})

test('limiter outages and spoofed public origins fail before a provider call', async () => {
  const options = production()
  state.failRedis = true
  assert.equal((await request(body(), options)).body.error, 'busy')
  options.headers.origin = 'https://attacker.test'
  assert.equal((await request(body({ finishId: 'graphite' }), options)).body.error, 'disabled')
  assert.equal(state.providerCalls.length, 0)
})

test('provider auth, quota and rejected-photo errors expose only safe actionable messages', async () => {
  const cases = [
    [401, { code: 'invalid_api_key', message: 'unsafe provider detail fixture-key' }, 'provider_auth'],
    [429, { code: 'insufficient_quota' }, 'provider_quota'],
    [400, { code: 'moderation_blocked', type: 'image_generation_user_error' }, 'photo_rejected'],
  ]
  for (const [status, error, code] of cases) {
    state.providerError = { status, body: { error } }
    const fresh = (await modules()).handler
    const response = await request(body(), {}, fresh)
    assert.equal(response.body.error, code)
    assert.equal(JSON.stringify(response.body).includes('fixture-key'), false)
    assert.equal(response.headers['cache-control'], 'private, no-store')
  }
})

test('an uncertain or timed-out response cannot immediately buy the same image again', async () => {
  state.throwProvider = new DOMException('synthetic timeout', 'TimeoutError')
  assert.equal((await request()).body.error, 'timed_out')
  assert.equal((await request()).body.error, 'busy')
  assert.equal(state.providerCalls.length, 1)
  const fresh = (await modules()).handler
  state.throwProvider = undefined
  state.providerBody = { data: [{ b64_json: 'broken-result' }] }
  assert.equal((await request(body(), {}, fresh)).body.error, 'upstream')
  assert.equal((await request(body(), {}, fresh)).body.error, 'busy')
  assert.equal(state.providerCalls.length, 2)
})

test('missing or inconsistent usage never invents an API cost', async () => {
  assert.equal(provider.parseUsage(undefined), null)
  assert.equal(provider.parseUsage({ ...usage, input_tokens: 10 }), null)
  assert.equal(provider.parseUsage({ ...usage, output_tokens_details: { image_tokens: 100, text_tokens: 74 } }), null)
  assert.equal(provider.usageCostUsd(null), null)
  state.providerBody = { data: [{ b64_json: jpeg(1536, 1024).toString('base64') }] }
  const response = await request(body(), { preparsed: true })
  assert.equal(response.body.ok, true)
  assert.equal(response.body.usage, null)
  assert.equal(response.body.costUsd, null)
})
