/** Read-only deployed narrated-media and guest-route verification (Node 24).
 *
 *   node scripts/test-narrated-live-routes.mjs
 *   BASE_URL=https://contractors.wallaceshift.com/ OUTPUT_DIR=output/narrated-live node scripts/test-narrated-live-routes.mjs
 *
 * Downloads public bytes only. No browser, cookies, authentication, uploads,
 * forms, API calls, or automatic redirect following. Full bodies are hashed
 * incrementally and discarded, never saved. Local media is never modified.
 */
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { mkdir, open, stat, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { trades } from '../src/demos/contractors/catalog.ts'
import { contractorPreviewIds } from './contractor-preview-contract.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const types = { mp4: 'video/mp4', jpg: 'image/jpeg', vtt: 'text/vtt' }
const cacheHeaders = ['cache-control', 'cdn-cache-control', 'vercel-cdn-cache-control',
  'age', 'etag', 'last-modified', 'expires', 'vary', 'x-vercel-cache', 'x-vercel-id',
  'cf-cache-status', 'x-cache', 'via', 'date', 'server']

export function gateDestination(location, sourceUrl, expectedDemo) {
  if (!location) return false
  try {
    const target = new URL(location, sourceUrl)
    return target.origin === new URL(sourceUrl).origin
      && /^\/request-demo\/?$/.test(target.pathname)
      && target.searchParams.getAll('demo').length === 1
      && target.searchParams.get('demo') === expectedDemo
      && [...target.searchParams.keys()].every(key => key === 'demo')
      && !target.username && !target.password && !target.hash
  } catch { return false }
}

export function rangeMatches(value, end, total) {
  const match = /^bytes (\d+)-(\d+)\/(\d+)$/.exec(value || '')
  return !!match && Number(match[1]) === 0 && Number(match[2]) === end && Number(match[3]) === total
}

// An unexpected redirect can contain access-bearing parameters. Only the
// expected public demo key is retained in the report; no redirect is followed.
function reportUrl(value, base) {
  if (!value) return null
  try {
    const url = new URL(value, base)
    url.username = ''; url.password = ''; url.hash = ''
    for (const key of [...url.searchParams.keys()]) if (key !== 'demo') url.searchParams.set(key, '[redacted]')
    return url.href
  } catch { return '[invalid URL]' }
}

function responseMetadata(response, url) {
  return {
    url, status: response.status, statusText: response.statusText,
    location: reportUrl(response.headers.get('location'), url),
    contentType: response.headers.get('content-type'),
    contentLength: response.headers.get('content-length'),
    contentEncoding: response.headers.get('content-encoding'),
    contentRange: response.headers.get('content-range'),
    acceptRanges: response.headers.get('accept-ranges'),
    cache: Object.fromEntries(cacheHeaders.map(name => [name, response.headers.get(name)]).filter(([, value]) => value !== null)),
  }
}

export async function digestResponseBody(response, maximumBytes) {
  assert(Number.isSafeInteger(maximumBytes) && maximumBytes > 0, 'A finite positive body bound is required')
  assert(response.body, 'Response has no body')
  const reader = response.body.getReader(), hash = createHash('sha256')
  let bytes = 0
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      bytes += value.byteLength
      assert(bytes <= maximumBytes, `Body exceeds expected bound (${bytes} > ${maximumBytes} bytes); cancelled`)
      hash.update(value)
    }
    return { bytes, sha256: hash.digest('hex') }
  } catch (error) {
    await reader.cancel().catch(() => {})
    throw error
  } finally { reader.releaseLock() }
}

async function localAsset(path, prefixBytes = 1024) {
  const before = await stat(path), hash = createHash('sha256')
  assert(before.isFile() && before.size > 0, `Missing or empty local media: ${path}`)
  for await (const chunk of createReadStream(path)) hash.update(chunk)
  const file = await open(path, 'r')
  let prefix
  try {
    prefix = Buffer.alloc(Math.min(prefixBytes, before.size))
    const { bytesRead } = await file.read(prefix, 0, prefix.length, 0)
    assert.equal(bytesRead, prefix.length, 'Local prefix read was incomplete')
  } finally { await file.close() }
  const after = await stat(path)
  assert(before.size === after.size && before.mtimeMs === after.mtimeMs, 'Local media changed while hashing; retry after production finishes')
  return { path, bytes: before.size, mtimeMs: before.mtimeMs, sha256: hash.digest('hex'),
    prefixBytes: prefix.length, prefixSha256: createHash('sha256').update(prefix).digest('hex') }
}

function check(record, name, passed, details) {
  record.checks.push({ name, passed: !!passed, ...(details === undefined ? {} : { details }) })
}

function baseConfiguration() {
  const url = new URL(process.env.BASE_URL || 'https://contractors.wallaceshift.com/')
  assert(!url.username && !url.password && !url.search && !url.hash, 'BASE_URL must not contain credentials, query parameters or a fragment')
  assert(url.protocol === 'https:' || (url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)), 'Use HTTPS or an explicitly selected local HTTP server')
  const timeoutMs = Number(process.env.REQUEST_TIMEOUT_MS || 90000)
  assert(Number.isSafeInteger(timeoutMs) && timeoutMs >= 1000 && timeoutMs <= 180000, 'REQUEST_TIMEOUT_MS must be 1000–180000')
  return { target: url.href, origin: url.origin, timeoutMs,
    mediaRoot: resolve(root, process.env.PREVIEW_MEDIA_ROOT || 'public/media/demo-previews'),
    output: resolve(root, process.env.OUTPUT_DIR || 'output/narrated-previews/live-route-verification') }
}

async function get(url, timeoutMs, headers = {}) {
  return fetch(url, { method: 'GET', redirect: 'manual', credentials: 'omit',
    headers: { Accept: '*/*', 'Accept-Encoding': 'identity', ...headers },
    signal: AbortSignal.timeout(timeoutMs) })
}

async function verifyFullAsset(id, extension, configuration) {
  const url = new URL(`/media/demo-previews/${id}.${extension}`, configuration.origin).href
  const record = { id, extension, url, kind: 'full-public-GET', checks: [] }
  const started = performance.now()
  let response
  try {
    record.local = await localAsset(resolve(configuration.mediaRoot, `${id}.${extension}`))
    response = await get(url, configuration.timeoutMs)
    record.response = responseMetadata(response, url)
    check(record, 'Public asset returns 200 without authentication or redirects', response.status === 200)
    check(record, 'Expected content type', response.headers.get('content-type')?.split(';')[0].trim().toLowerCase() === types[extension], { expected: types[extension], actual: record.response.contentType })
    if (response.status !== 200) { await response.body?.cancel(); return record }
    record.received = await digestResponseBody(response, record.local.bytes)
    check(record, 'Full decoded byte count matches local file', record.received.bytes === record.local.bytes)
    check(record, 'Full SHA-256 matches local file', record.received.sha256 === record.local.sha256)
    const encoding = response.headers.get('content-encoding')?.toLowerCase()
    if (!encoding || encoding === 'identity') {
      check(record, 'Content-Length matches local and received byte counts', /^\d+$/.test(record.response.contentLength || '')
        && Number(record.response.contentLength) === record.local.bytes
        && Number(record.response.contentLength) === record.received.bytes)
    } else {
      record.lengthNote = 'Server applied content encoding despite requesting identity; Content-Length is encoded transport size. Decoded byte count and SHA-256 are compared to local bytes.'
      check(record, 'Compressed transport reports a positive Content-Length', /^\d+$/.test(record.response.contentLength || '') && Number(record.response.contentLength) > 0)
      check(record, 'MP4 is not transport-compressed', extension !== 'mp4')
    }
    const now = await stat(record.local.path)
    check(record, 'Local comparison file stayed unchanged during download', now.size === record.local.bytes && now.mtimeMs === record.local.mtimeMs)
  } catch (error) {
    record.error = `${error.name}: ${error.message}`
    check(record, 'Asset verification completes', false, record.error)
    await response?.body?.cancel().catch(() => {})
  } finally { record.elapsedMs = Math.round(performance.now() - started) }
  return record
}

async function verifyRange(id, local, configuration) {
  const url = new URL(`/media/demo-previews/${id}.mp4`, configuration.origin).href
  const record = { id, kind: 'bounded-range-GET', url, requestedRange: `bytes=0-${local.prefixBytes - 1}`, checks: [] }
  const started = performance.now()
  let response
  try {
    response = await get(url, configuration.timeoutMs, { Range: record.requestedRange })
    record.response = responseMetadata(response, url)
    const correctStatus = response.status === 206
    const correctRange = rangeMatches(record.response.contentRange, local.prefixBytes - 1, local.bytes)
    check(record, 'Range request returns 206', correctStatus)
    check(record, 'Content-Range matches requested bounds and local total size', correctRange)
    check(record, 'Range content type is video/mp4', response.headers.get('content-type')?.split(';')[0].trim().toLowerCase() === types.mp4)
    check(record, 'Range Content-Length matches bounded request', /^\d+$/.test(record.response.contentLength || '') && Number(record.response.contentLength) === local.prefixBytes)
    check(record, 'Range body uses identity content encoding', !record.response.contentEncoding || record.response.contentEncoding === 'identity')
    // If range is ignored, cancel immediately instead of downloading the film twice.
    if (!correctStatus || !correctRange) { await response.body?.cancel(); return record }
    record.received = await digestResponseBody(response, local.prefixBytes)
    check(record, 'Received range length matches request', record.received.bytes === local.prefixBytes)
    check(record, 'Range SHA-256 matches the same local byte prefix', record.received.sha256 === local.prefixSha256)
  } catch (error) {
    record.error = `${error.name}: ${error.message}`
    check(record, 'Range verification completes', false, record.error)
    await response?.body?.cancel().catch(() => {})
  } finally { record.elapsedMs = Math.round(performance.now() - started) }
  return record
}

async function verifyGuestRoute(demo, configuration) {
  const url = new URL(demo.productionPath, configuration.origin).href
  const record = { id: demo.id, kind: 'unauthenticated-interactive-alias-GET', url, expectedDemoKey: demo.accessKey, redirectFollowed: false, checks: [] }
  const started = performance.now()
  let response
  try {
    response = await get(url, configuration.timeoutMs, { Accept: 'text/html' })
    record.response = responseMetadata(response, url)
    check(record, 'Guest document reaches the source-defined 303 access gate', response.status === 303)
    check(record, 'Gate redirects to same-origin request-demo with correct demo key', gateDestination(response.headers.get('location'), url, demo.accessKey), record.response.location)
    check(record, 'Guest gated response is private and not cacheable', /(?:^|,)\s*private\b/i.test(response.headers.get('cache-control') || '') && /(?:^|,)\s*no-store\b/i.test(response.headers.get('cache-control') || ''))
    await response.body?.cancel()
  } catch (error) {
    record.error = `${error.name}: ${error.message}`
    check(record, 'Guest-route verification completes', false, record.error)
    await response?.body?.cancel().catch(() => {})
  } finally { record.elapsedMs = Math.round(performance.now() - started) }
  return record
}

export async function main() {
  const configuration = baseConfiguration()
  const films = trades.filter(demo => demo.kind === 'film')
  assert.equal(films.length, contractorPreviewIds.length, 'Gallery/acceptance inventory count differs')
  assert.deepEqual(new Set(films.map(demo => demo.id)), new Set(contractorPreviewIds), 'Gallery/acceptance inventory IDs differ')
  const report = {
    startedAt: new Date().toISOString(), target: configuration.target, origin: configuration.origin,
    mode: 'Read-only public GET requests with no authentication; redirects never followed',
    inventory: contractorPreviewIds, mediaRoot: configuration.mediaRoot, timeoutMs: configuration.timeoutMs,
    scope: 'Full media/poster/caption byte parity, bounded MP4 range support, and guest alias gate routing. Does not establish browser playback, audio perception, accessibility, buyer comprehension or authenticated demo operation.',
    cacheMethod: 'Canonical public URLs, no cache-busting query and no forced revalidation. Cache headers describe the observed response only. Node fetch has no browser cache or cookie jar here.',
    assets: [], ranges: [], routes: [],
  }
  await mkdir(configuration.output, { recursive: true })
  const filename = `routes-${report.startedAt.replace(/[:.]/g, '-')}.json`
  const save = async () => {
    report.passed = [...report.assets, ...report.ranges, ...report.routes].every(item => item.checks.length && item.checks.every(check => check.passed))
      && report.assets.length === contractorPreviewIds.length * 3
      && report.ranges.length === contractorPreviewIds.length
      && report.routes.length === contractorPreviewIds.length
    await writeFile(resolve(configuration.output, filename), `${JSON.stringify(report, null, 2)}\n`)
  }
  for (const id of contractorPreviewIds) {
    for (const extension of Object.keys(types)) report.assets.push(await verifyFullAsset(id, extension, configuration))
    const mp4 = report.assets.find(item => item.id === id && item.extension === 'mp4')
    if (mp4.local) report.ranges.push(await verifyRange(id, mp4.local, configuration))
    else report.ranges.push({ id, checks: [{ name: 'Local MP4 exists for bounded range comparison', passed: false }] })
    report.routes.push(await verifyGuestRoute(films.find(demo => demo.id === id), configuration))
    await save()
    const checked = [...report.assets, ...report.ranges, ...report.routes].filter(item => item.id === id)
    console.log(`${id}: ${checked.every(item => item.checks.every(check => check.passed)) ? 'passed' : 'FAILED'} (3 assets, bounded range, guest gate)`)
  }
  report.completedAt = new Date().toISOString()
  await save()
  await writeFile(resolve(configuration.output, 'latest.json'), `${JSON.stringify(report, null, 2)}\n`)
  console.log(JSON.stringify({ passed: report.passed, report: resolve(configuration.output, filename), assets: report.assets.length, ranges: report.ranges.length, routes: report.routes.length }))
  if (!report.passed) process.exitCode = 1
  return report
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await main().catch(error => { console.error(`${error.name}: ${error.message}`); process.exitCode = 1 })
}
