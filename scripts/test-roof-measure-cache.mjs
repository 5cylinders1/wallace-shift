import assert from 'node:assert/strict'
import { after, afterEach, beforeEach, test } from 'node:test'
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath, pathToFileURL } from 'node:url'
import ts from 'typescript'

// Execute the real endpoint and adapters. All fetches are intercepted; these
// fixtures never use a live API key, Redis database, or paid measurement.
const root = fileURLToPath(new URL('../', import.meta.url))
const outputRoot = await mkdtemp(join(tmpdir(), 'roof-measure-cache-tests-'))
const savedEnv = { ...process.env }
const originalFetch = globalThis.fetch
const OriginalDate = globalThis.Date
const originalError = console.error
const DAY_MS = 86_400_000
const point = { lat: 39.0453, lng: -94.5826 }
let iteration = 0
let state
let handler
let cache
let identity

async function modules() {
  const directory = join(outputRoot, String(iteration++))
  const compiled = new Map()
  async function compile(relativePath) {
    if (compiled.has(relativePath)) return compiled.get(relativePath)
    const outputPath = join(directory, `${relativePath}.mjs`)
    compiled.set(relativePath, outputPath)
    const source = await readFile(resolve(root, relativePath), 'utf8')
    let output = ts.transpileModule(source, {
      compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext },
    }).outputText
    for (const match of [...output.matchAll(/(from\s+)(['"])(\.[^'"]+)\2/g)]) {
      const specifier = match[3].replace(/\.js$/, '.ts')
      const dependency = join(dirname(relativePath), /\.tsx?$/.test(specifier) ? specifier : `${specifier}.ts`)
      output = output.replace(match[0], `from ${JSON.stringify(pathToFileURL(await compile(dependency)).href)}`)
    }
    await mkdir(dirname(outputPath), { recursive: true })
    await writeFile(outputPath, output)
    return outputPath
  }
  const load = async path => import(pathToFileURL(await compile(path)).href)
  return {
    handler: (await load('api/roof-measure.ts')).default,
    cache: await load('api/_lib/roof/measurement-cache.ts'),
    identity: await load('api/_lib/roof/measurement-identity.ts'),
  }
}

function entry(key) {
  const value = state.redis.get(key)
  if (value?.expires && value.expires <= state.now) {
    state.redis.delete(key)
    return undefined
  }
  return value
}

function redisCommand(command) {
  const [name, key, value, ...options] = command
  state.commands.push(command)
  if (state.failCommand?.(command)) throw new Error('Synthetic Redis outage')
  if (name === 'GET') return entry(key)?.value ?? null
  if (name === 'SET') {
    if (options.includes('NX') && entry(key)) return null
    const index = options.indexOf('EX')
    state.redis.set(key, { value, expires: index < 0 ? null : state.now + Number(options[index + 1]) * 1000 })
    return 'OK'
  }
  if (name === 'INCR') {
    const previous = entry(key)
    const next = Number(previous?.value ?? 0) + 1
    state.redis.set(key, { value: next, expires: previous?.expires ?? null })
    return next
  }
  if (name === 'EXPIRE') {
    const previous = entry(key)
    if (!previous || (options.includes('NX') && previous.expires)) return 0
    previous.expires = state.now + Number(value) * 1000
    return 1
  }
  if (name === 'EVAL') {
    assert.match(key, /redis\.call\('GET'/)
    const [, , keyCount, lockKey, token] = command
    assert.equal(keyCount, 1)
    if (entry(lockKey)?.value !== token) return 0
    state.redis.delete(lockKey)
    return 1
  }
  throw new Error(`Unexpected Redis command: ${name}`)
}

function instantBody(asked) {
  return {
    measurements: { sqft: { aerial: 2000, measured: 2200 }, pitch: '5/12', complexity: 1, confidence: { score: 0.4 } },
    coordinates: { latitude: asked.lat, longitude: asked.lng },
  }
}

function googleBody(asked) {
  return {
    center: { latitude: asked.lat, longitude: asked.lng },
    imageryQuality: 'HIGH', imageryDate: { year: 2026, month: 1 },
    boundingBox: {
      sw: { latitude: asked.lat - 0.0001, longitude: asked.lng - 0.0001 },
      ne: { latitude: asked.lat + 0.0001, longitude: asked.lng + 0.0001 },
    },
    solarPotential: {
      wholeRoofStats: { areaMeters2: 200, groundAreaMeters2: 180 },
      buildingStats: { groundAreaMeters2: 180 },
      roofSegmentStats: [{ pitchDegrees: 24, stats: { areaMeters2: 200 } }],
    },
  }
}

beforeEach(async () => {
  for (const key of Object.keys(process.env)) {
    if (/^(ROOF_MEASURE|INSTANT_ROOFER|GOOGLE_SOLAR|GOOGLE_MAPS_STATIC|RATE_LIMIT_REDIS|KV_REST_API|UPSTASH_REDIS_REST|VERCEL)/.test(key)) delete process.env[key]
  }
  Object.assign(process.env, {
    INSTANT_ROOFER_API_KEY: 'test-only-instant-key', GOOGLE_SOLAR_API_KEY: 'test-only-solar-key',
    RATE_LIMIT_REDIS_URL: 'https://redis.example.test', RATE_LIMIT_REDIS_TOKEN: 'test-only-redis-token',
    ROOF_MEASURE_CACHE_DAYS: '7',
  })
  state = { redis: new Map(), commands: [], providerCalls: [], now: OriginalDate.now() }
  globalThis.Date = class extends OriginalDate {
    constructor(...args) { super(...(args.length ? args : [state.now])) }
    static now() { return state.now }
  }
  console.error = () => {}
  globalThis.fetch = async (input, init = {}) => {
    const url = new URL(String(input))
    if (url.origin === 'https://redis.example.test') {
      const commands = JSON.parse(init.body)
      const result = url.pathname === '/pipeline'
        ? commands.map(command => ({ result: redisCommand(command) }))
        : { result: redisCommand(commands) }
      return Response.json(result)
    }
    if (url.origin === 'https://v5.instantroofer.com') {
      assert.equal(init.headers.authorization, 'Bearer test-only-instant-key')
      const body = JSON.parse(init.body)
      const asked = { lat: body.latitude, lng: body.longitude }
      state.providerCalls.push({ provider: 'instant-roofer', point: asked })
      await state.providerGate?.()
      return Response.json(state.providerBody?.(asked) ?? instantBody(asked))
    }
    if (url.origin === 'https://solar.googleapis.com') {
      const asked = { lat: Number(url.searchParams.get('location.latitude')), lng: Number(url.searchParams.get('location.longitude')) }
      state.providerCalls.push({ provider: 'google-solar', quality: url.searchParams.get('requiredQuality'), point: asked })
      await state.providerGate?.()
      return Response.json(googleBody(asked))
    }
    throw new Error(`Unexpected network request: ${url.origin}`)
  }
  ;({ handler, cache, identity } = await modules())
})

afterEach(() => {
  globalThis.fetch = originalFetch
  globalThis.Date = OriginalDate
  console.error = originalError
  for (const key of Object.keys(process.env)) if (!(key in savedEnv)) delete process.env[key]
  Object.assign(process.env, savedEnv)
})
after(async () => { await rm(outputRoot, { recursive: true, force: true }) })

async function request(extra = {}, useHandler = handler) {
  const params = new URLSearchParams({ lat: String(point.lat), lng: String(point.lng), provider: process.env.ROOF_MEASURE_PROVIDER ?? 'instant-roofer', ...extra })
  const response = { statusCode: 0, headers: {}, headersSent: false }
  await useHandler({ method: 'GET', url: `/api/roof-measure?${params}`, headers: { 'sec-fetch-site': 'same-origin', 'x-real-ip': '192.0.2.1' } }, {
    get headersSent() { return response.headersSent },
    set statusCode(value) { response.statusCode = value },
    setHeader(name, value) { response.headers[name] = value },
    end(body) { response.body = JSON.parse(body); response.headersSent = true },
  })
  assert.equal(response.headersSent, true)
  return response
}

const counters = () => state.commands.filter(command => command[0] === 'INCR').length
const cacheWrites = () => state.commands.filter(command => command[0] === 'SET' && !command[1].endsWith(':lock'))
const sMaxAge = response => Number(/s-maxage=(\d+)/.exec(response.headers['cache-control'])?.[1])
const building = (id = 'fixture-building', offset = 0) => ({
  id, areaSqFt: 2000, corners: 4, distanceM: 0, capturedYear: 2026,
  ring: [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, y]) => ({ lat: point.lat + offset + y * 0.0001, lng: point.lng + x * 0.0001 })),
})

test('a persisted same-pin result avoids another provider call and every spending counter', async () => {
  const first = await request()
  assert.equal(first.body.ok, true)
  assert.equal(first.body.cache, 'miss')
  assert.equal(state.providerCalls.length, 1)
  assert.equal(counters(), 3)
  const independentHandler = (await modules()).handler
  const again = await request({}, independentHandler)
  assert.equal(again.body.cache, 'hit')
  assert.deepEqual(again.body.roof, first.body.roof)
  assert.equal(again.body.measuredAt, first.body.measuredAt)
  assert.equal(again.body.expiresAt, first.body.expiresAt)
  assert.equal(state.providerCalls.length, 1)
  assert.equal(counters(), 3)
  assert.doesNotMatch(again.headers['cache-control'], /stale-while-revalidate/)
})

test('concurrent requests for one pin purchase one measurement', async () => {
  let release
  let started
  const ready = new Promise(resolveReady => { started = resolveReady })
  const gate = new Promise(resolveGate => { release = resolveGate })
  state.providerGate = async () => { started(); await gate }
  const first = request()
  await ready
  const second = request()
  release()
  const responses = await Promise.all([first, second])
  assert.ok(responses.every(response => response.body.ok))
  assert.equal(state.providerCalls.length, 1)
  assert.equal(counters(), 3)
  assert.deepEqual(responses[0].body.roof, responses[1].body.roof)
})

test('independent workers share a purchase lease even when only one request has a building token', async () => {
  const independentHandler = (await modules()).handler
  const roof = identity.signMeasurementBuilding('instant-roofer', 'fixture-open-data', building())
  let release
  let started
  const ready = new Promise(resolveReady => { started = resolveReady })
  const gate = new Promise(resolveGate => { release = resolveGate })
  state.providerGate = async () => {
    if (state.providerCalls.length === 1) { started(); await gate }
  }
  const first = request({ roof })
  await ready
  let second
  try { second = await request({}, independentHandler) } finally { release() }
  assert.equal((await first).body.ok, true)
  assert.equal(second.body.error, 'busy')
  assert.equal(state.providerCalls.length, 1)
  assert.equal(counters(), 3)
  assert.equal((await request({}, independentHandler)).body.cache, 'hit')
})

test('signed pins in one footprint share a result; neighboring and tampered footprints do not', async () => {
  const roof = identity.signMeasurementBuilding('instant-roofer', 'fixture-open-data', building())
  assert.equal(typeof roof, 'string')
  await request({ roof })
  const inside = await request({ roof, lat: String(point.lat + 0.00003) })
  assert.equal(inside.body.cache, 'hit')
  assert.equal(state.providerCalls.length, 1)
  const outside = await request({ roof, lat: String(point.lat + 0.0003) })
  assert.equal(outside.body.cache, 'miss')
  assert.equal(state.providerCalls.length, 2)
  const pieces = roof.split('.')
  const payload = JSON.parse(Buffer.from(pieces[1], 'base64url').toString())
  payload.id = 'tampered-building'
  pieces[1] = Buffer.from(JSON.stringify(payload)).toString('base64url')
  assert.equal(identity.verifyMeasurementBuilding(pieces.join('.'), 'instant-roofer', point), null)
  const tampered = await request({ roof: pieces.join('.'), lat: String(point.lat - 0.00003) })
  assert.equal(tampered.body.cache, 'miss')
  assert.equal(state.providerCalls.length, 3)
})

test('cache age and edge TTL retain the original measurement time and expire together', async () => {
  const first = await request()
  state.now += 2 * DAY_MS
  const cached = await request()
  assert.equal(cached.body.cache, 'hit')
  assert.equal(cached.body.measuredAt, first.body.measuredAt)
  assert.equal(cached.body.expiresAt, first.body.expiresAt)
  assert.equal(sMaxAge(cached), 5 * 86_400)
  state.now += 5 * DAY_MS + 1000
  const expired = await request()
  assert.equal(expired.body.cache, 'miss')
  assert.notEqual(expired.body.measuredAt, first.body.measuredAt)
  assert.equal(state.providerCalls.length, 2)
})

test('lowering retention also shortens existing entries and their edge lifetime', async () => {
  const first = await request()
  process.env.ROOF_MEASURE_CACHE_DAYS = '1'
  state.now += DAY_MS / 2
  const cached = await request()
  assert.equal(cached.body.cache, 'hit')
  assert.equal(cached.body.measuredAt, first.body.measuredAt)
  assert.equal(sMaxAge(cached), 43_200)
  assert.equal(Date.parse(cached.body.expiresAt), Date.parse(first.body.measuredAt) + DAY_MS)
  state.now += DAY_MS
  assert.equal((await request()).body.cache, 'miss')
  assert.equal(state.providerCalls.length, 2)
})

test('a provider returning another building cannot seed a shared-footprint cache entry', async () => {
  const roof = identity.signMeasurementBuilding('instant-roofer', 'fixture-open-data', building())
  state.providerBody = asked => instantBody({ ...asked, lat: point.lat + 0.001 })
  const first = await request({ roof })
  assert.equal(first.body.ok, true)
  assert.equal(cacheWrites().length, 1)
  assert.equal((await request({ roof })).body.cache, 'hit')
  const anotherPin = await request({ roof, lat: String(point.lat + 0.00003) })
  assert.equal(anotherPin.body.cache, 'miss')
  assert.equal(state.providerCalls.length, 2)
})

test('provider and Google imagery quality have separate cache entries', async () => {
  await request()
  process.env.ROOF_MEASURE_PROVIDER = 'google-solar'
  const medium = await request()
  assert.equal(medium.body.cache, 'miss')
  assert.equal(medium.body.provider, 'google-solar')
  process.env.GOOGLE_SOLAR_QUALITY = 'HIGH'
  assert.equal((await request()).body.cache, 'miss')
  process.env.GOOGLE_SOLAR_QUALITY = 'MEDIUM'
  assert.equal((await request()).body.cache, 'hit')
  assert.deepEqual(state.providerCalls.map(call => [call.provider, call.quality]), [
    ['instant-roofer', undefined], ['google-solar', 'MEDIUM'], ['google-solar', 'HIGH'],
  ])
})

test('cache read and lease outages fail closed before spending or calling the provider', async () => {
  for (const operation of ['GET', 'SET']) {
    state.failCommand = command => command[0] === operation
    const response = await request()
    assert.equal(response.body.error, 'busy')
    assert.equal(response.statusCode, 503)
    assert.equal(response.headers['cache-control'], 'no-store')
    assert.equal(state.providerCalls.length, 0)
    assert.equal(counters(), 0)
  }
})

test('a failed result write preserves the paid response and blocks an immediate duplicate purchase', async () => {
  state.failCommand = command => command[0] === 'SET' && !command[1].endsWith(':lock')
  const first = await request()
  assert.equal(first.body.ok, true)
  assert.equal(first.body.cache, 'off')
  assert.equal(first.headers['cache-control'], 'no-store')
  assert.equal(Date.parse(first.body.expiresAt), Date.parse(first.body.measuredAt) + 7 * DAY_MS)
  assert.equal(state.providerCalls.length, 1)
  state.failCommand = undefined
  const again = await request()
  assert.equal(again.body.error, 'busy')
  assert.equal(state.providerCalls.length, 1)
  assert.equal(counters(), 3)
})

test('an uncertain provider response retains its lease to prevent an immediate repeat purchase', async () => {
  state.providerBody = () => ({ measurements: {} })
  const failed = await request()
  assert.equal(failed.body.error, 'upstream')
  assert.equal(failed.headers['cache-control'], 'no-store')
  assert.equal(cacheWrites().length, 0)
  const again = await request()
  assert.equal(again.body.error, 'busy')
  assert.equal(state.providerCalls.length, 1)
  assert.equal(counters(), 3)
})

test('Instant Roofer retention requires opt-in and rejects values beyond its 30-day ceiling', async () => {
  delete process.env.ROOF_MEASURE_CACHE_DAYS
  assert.equal(cache.cacheSecondsFor('instant-roofer'), 0)
  assert.equal(cache.cacheSecondsFor('google-solar'), 7 * 86_400)
  for (const value of ['0', '-1', '1.5', '31', '100', 'not-a-number']) {
    process.env.ROOF_MEASURE_CACHE_DAYS = value
    assert.equal(cache.cacheSecondsFor('instant-roofer'), 0)
  }
  process.env.ROOF_MEASURE_CACHE_DAYS = '30'
  assert.equal(cache.cacheSecondsFor('instant-roofer'), 30 * 86_400)
  delete process.env.ROOF_MEASURE_CACHE_DAYS
  const response = await request()
  assert.equal(response.body.cache, 'off')
  assert.equal(response.body.expiresAt, null)
  assert.equal(response.headers['cache-control'], 'no-store')
  assert.equal(cacheWrites().length, 0)
})

test('disabling Google shared caching still supplies a finite expiry for per-visit state', async () => {
  process.env.ROOF_MEASURE_PROVIDER = 'google-solar'
  process.env.GOOGLE_SOLAR_CACHE_DAYS = '0'
  assert.equal(cache.cacheSecondsFor('google-solar'), 0)
  const response = await request()
  assert.equal(response.body.ok, true)
  assert.equal(response.body.cache, 'off')
  assert.equal(response.headers['cache-control'], 'no-store')
  assert.equal(Date.parse(response.body.expiresAt), Date.parse(response.body.measuredAt) + 30 * DAY_MS)
  assert.equal(cacheWrites().length, 0)
  assert.equal(state.providerCalls.length, 1)
})

test('daily caps still stop uncached purchases while an existing cache hit spends nothing', async () => {
  process.env.ROOF_MEASURE_DAILY_CAP = '1'
  assert.equal((await request()).body.ok, true)
  const count = counters()
  assert.equal((await request()).body.cache, 'hit')
  assert.equal(counters(), count)
  const denied = await request({ lat: String(point.lat + 0.001) })
  assert.equal(denied.body.error, 'limit_reached')
  assert.equal(state.providerCalls.length, 1)
  assert.equal(state.commands.filter(command => command[0] === 'INCR' && command[1].includes(':month:')).length, 1)
})

test('per-visitor and monthly caps remain enforced for uncached measurements', async () => {
  process.env.ROOF_MEASURE_PER_HOUR = '1'
  assert.equal((await request()).body.ok, true)
  assert.equal((await request({ lat: String(point.lat + 0.001) })).body.error, 'rate_limited')
  assert.equal(state.providerCalls.length, 1)
  process.env.ROOF_MEASURE_PER_HOUR = '10'
  process.env.ROOF_MEASURE_MONTHLY_CAP = '1'
  assert.equal((await request({ lat: String(point.lat + 0.002) })).body.error, 'limit_reached')
  assert.equal(state.providerCalls.length, 1)
})

test('malformed stored results are an outage, never an excuse to repurchase the roof', async () => {
  const key = cache.measurementCacheKey('instant-roofer', point)
  state.redis.set(key, { value: '{"roof":"corrupt"}', expires: state.now + DAY_MS })
  const response = await request()
  assert.equal(response.body.error, 'busy')
  assert.equal(state.providerCalls.length, 0)
  assert.equal(counters(), 0)
})

test('local development persists Instant Roofer results across module restarts and rejects expired data', async () => {
  delete process.env.RATE_LIMIT_REDIS_URL
  delete process.env.RATE_LIMIT_REDIS_TOKEN
  process.env.ROOF_MEASURE_UNMETERED = '1'
  const workingDirectory = await mkdtemp(join(outputRoot, 'local-cache-'))
  const previousDirectory = process.cwd()
  process.chdir(workingDirectory)
  try {
    const firstStore = cache.getMeasurementStore('instant-roofer')
    assert.ok(firstStore)
    const saved = {
      provider: 'instant-roofer',
      roof: { roofSqFt: 2200, footprintSqFt: 2000, pitchRise: 5, complexity: 1, confidence: { score: 0.4, label: 'High' }, point },
      credits: [{ text: 'Powered by Instant Roofer', href: 'https://www.instantroofer.com/' }],
      measuredAt: new Date().toISOString(),
      expiresAt: new Date(state.now + DAY_MS).toISOString(),
    }
    const key = cache.measurementCacheKey('instant-roofer', point)
    await firstStore.put(key, saved, 86_400)
    const files = await readdir(join(workingDirectory, 'output', 'roof-measure-cache'))
    assert.equal(files.length, 1)
    const restarted = (await modules()).cache.getMeasurementStore('instant-roofer')
    assert.deepEqual(await restarted.get(key), saved)
    state.now += DAY_MS + 1
    assert.equal(await restarted.get(key), null)
    assert.equal((await readdir(join(workingDirectory, 'output', 'roof-measure-cache'))).length, 0)
    assert.equal(state.providerCalls.length, 0)
    process.env.VERCEL = '1'
    assert.equal(cache.getMeasurementStore('instant-roofer'), null)
    assert.equal(cache.getMeasurementStore('google-solar'), null)
  } finally {
    process.chdir(previousDirectory)
  }
})

test('Google local development keeps results in memory instead of writing durable files', async () => {
  delete process.env.RATE_LIMIT_REDIS_URL
  delete process.env.RATE_LIMIT_REDIS_TOKEN
  process.env.ROOF_MEASURE_UNMETERED = '1'
  const workingDirectory = await mkdtemp(join(outputRoot, 'local-google-cache-'))
  const previousDirectory = process.cwd()
  process.chdir(workingDirectory)
  try {
    const saved = {
      provider: 'google-solar',
      roof: { roofSqFt: 2200, footprintSqFt: 2000, pitchRise: 5, complexity: 1, confidence: { score: null, label: 'High' }, point },
      credits: [{ text: 'Google Maps' }], measuredAt: new Date().toISOString(), expiresAt: new Date(state.now + DAY_MS).toISOString(),
    }
    const key = cache.measurementCacheKey('google-solar', point)
    await cache.getMeasurementStore('google-solar').put(key, saved, 86_400)
    assert.deepEqual(await cache.getMeasurementStore('google-solar').get(key), saved)
    assert.deepEqual(await readdir(workingDirectory), [])
    assert.equal(await (await modules()).cache.getMeasurementStore('google-solar').get(key), null)
    state.now += DAY_MS + 1
    assert.equal(await cache.getMeasurementStore('google-solar').get(key), null)
    assert.equal(state.providerCalls.length, 0)
  } finally {
    process.chdir(previousDirectory)
  }
})

test('a configured invalid Redis store cannot silently fall back to unmetered local storage', () => {
  process.env.RATE_LIMIT_REDIS_URL = 'rediss://redis.example.test'
  process.env.ROOF_MEASURE_UNMETERED = '1'
  assert.equal(cache.getMeasurementStore('instant-roofer'), null)
  assert.equal(cache.getMeasurementStore('google-solar'), null)
  assert.equal(state.providerCalls.length, 0)
})
