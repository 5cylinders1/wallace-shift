/** Focused Velar startup sampling: five fresh contexts, then five starts in the
 * fifth context with its cache retained. No full films, retries, forced play,
 * cache-busting, autoplay override, authentication, or network throttling.
 *
 * node videos/contractor-previews/narrated-startup-qa.mjs
 * BASE_URL=https://contractors.wallaceshift.com/ \
 * OUTPUT_DIR=output/live-narrated-previews node videos/contractor-previews/narrated-startup-qa.mjs
 * Output: <OUTPUT_DIR or output/narrated-previews>/velar/startup-qa/report.json
 */
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { playwright, root } from './runtime.mjs'

const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:5176/demos/contractors/'
assert(['http:', 'https:'].includes(new URL(baseUrl).protocol), 'BASE_URL must be an HTTP(S) gallery URL')
const outputRoot = process.env.OUTPUT_DIR ? resolve(root, process.env.OUTPUT_DIR) : join(root, 'output/narrated-previews')
const out = join(outputRoot, 'velar', 'startup-qa')
const repetitions = 5
const viewport = { width: 1440, height: 1000 }
const expectedVideo = '/media/demo-previews/velar.mp4'
const report = {
  id: 'velar', target: baseUrl, recordedAt: new Date().toISOString(), viewport,
  method: {
    cold: 'Five separate unauthenticated browser contexts, one initial navigation and Watch click each. Fresh context means browser-storage/cache isolation, not a cold OS, DNS, connection pool or CDN.',
    warm: 'Five new-page navigations in the retained fifth context after its cold start. Browser caching is left enabled and observed. A full MP4 is not preloaded; cache reuse is not assumed.',
    start: 'Browser-clock trusted Watch click to the first requestVideoFrameCallback callback. This observes compositor handoff, not physical-display latency. No fallback Play click or media.play() call is made.',
    browsing: 'Wait for load, locate and scroll the Velar Watch button into view, then allow 1000ms for initial browsing before measuring and clicking.',
    transfer: 'CDP encodedDataLength: completed request totals, or response-header estimate plus received chunks for requests still in flight. Resource Timing totals are included separately; cross-origin/cache zeros limit those totals.',
    playback: 'Installed headless Chrome; only its default --mute-audio argument is removed. Ordinary autoplay policy and HTTP caching remain enabled. Stop shortly after first-frame evidence rather than playing a complete film.',
    limitations: 'Ten unthrottled desktop lab starts, not field percentiles, physical-phone measurements, a subjective listening review, or buyer validation. A new page resets prior document user activation; the Watch click supplies the current gesture.',
  },
  runs: [], errors: [],
}

function check(run, name, passed, details) {
  run.checks.push({ name, passed: Boolean(passed), ...(details === undefined ? {} : { details }) })
  assert(passed, name)
}

async function measureStart(context, phase, iteration) {
  const run = { phase, iteration, checks: [], errors: [], requests: [], observedCache: [], passed: false }
  report.runs.push(run)
  const page = await context.newPage()
  const cdp = await context.newCDPSession(page)
  const transfers = new Map()
  let cleanup = false
  page.on('pageerror', error => run.errors.push({ kind: 'pageerror', message: error.message }))
  page.on('request', request => {
    if (/\.mp4(?:[?#]|$)/i.test(request.url())) run.requests.push({ path: new URL(request.url()).pathname, phase: cleanup ? 'cleanup' : 'measurement' })
  })
  page.on('requestfailed', request => {
    if (!cleanup) run.errors.push({ kind: 'requestfailed', path: new URL(request.url()).pathname, message: request.failure()?.errorText })
  })
  await cdp.send('Network.enable')
  cdp.on('Network.requestWillBeSent', event => {
    // Redirects reuse request IDs; account for each completed redirect response.
    const previous = transfers.get(event.requestId)
    const redirects = previous?.redirectBytes || 0
    transfers.set(event.requestId, { path: new URL(event.request.url).pathname, headers: 0, chunks: 0, finished: null, redirectBytes: redirects + (event.redirectResponse?.encodedDataLength || 0), cached: false })
  })
  cdp.on('Network.requestServedFromCache', event => {
    const item = transfers.get(event.requestId)
    if (item) item.cached = true
  })
  cdp.on('Network.responseReceived', event => {
    const item = transfers.get(event.requestId)
    if (!item) return
    item.headers = event.response.encodedDataLength || 0
    item.cached ||= Boolean(event.response.fromDiskCache || event.response.fromPrefetchCache)
    item.serviceWorker = Boolean(event.response.fromServiceWorker)
    item.status = event.response.status
  })
  cdp.on('Network.dataReceived', event => {
    const item = transfers.get(event.requestId)
    if (item) item.chunks += event.encodedDataLength || 0
  })
  cdp.on('Network.loadingFinished', event => {
    const item = transfers.get(event.requestId)
    if (item) item.finished = event.encodedDataLength
  })
  const transferred = () => {
    const rows = [...transfers.values()]
    const bytes = item => item.redirectBytes + (item.finished ?? item.headers + item.chunks)
    return {
      totalEncodedBytes: rows.reduce((total, item) => total + bytes(item), 0),
      mp4EncodedBytes: rows.filter(item => /\.mp4$/i.test(item.path)).reduce((total, item) => total + bytes(item), 0),
      requestCount: rows.length, completedRequests: rows.filter(item => item.finished !== null).length,
      inFlightRequests: rows.filter(item => item.finished === null).length,
    }
  }
  await page.addInitScript(() => {
    const state = window.__startupQA = { watchClicks: 0, trustedClick: null, clickedAt: null, firstFrameAt: null, presentationTime: null, mediaTime: null, presentedFrames: null, firstPlayingAt: null, frameCallbackSupported: null }
    const seen = new WeakSet()
    const observe = video => {
      if (!(video instanceof HTMLVideoElement) || seen.has(video)) return
      seen.add(video)
      state.frameCallbackSupported = typeof video.requestVideoFrameCallback === 'function'
      video.addEventListener('playing', () => { if (state.firstPlayingAt === null) state.firstPlayingAt = performance.now() }, { once: true })
      if (state.frameCallbackSupported) video.requestVideoFrameCallback((now, metadata) => {
        if (state.firstFrameAt !== null) return
        state.firstFrameAt = now
        state.presentationTime = metadata.presentationTime
        state.mediaTime = metadata.mediaTime
        state.presentedFrames = metadata.presentedFrames
      })
    }
    new MutationObserver(records => {
      for (const record of records) for (const node of record.addedNodes) {
        observe(node)
        if (node instanceof Element) node.querySelectorAll('video').forEach(observe)
      }
    }).observe(document, { childList: true, subtree: true })
  })
  try {
    const response = await page.goto(baseUrl, { waitUntil: 'load', timeout: 45000 })
    const card = page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'Velar Roof Atelier', exact: true }) })
    const watch = card.getByRole('button', { name: 'Watch demo', exact: true })
    await watch.waitFor({ state: 'visible', timeout: 15000 })
    await watch.scrollIntoViewIfNeeded()
    await page.waitForTimeout(1000)
    run.navigation = await page.evaluate(() => {
      const entry = performance.getEntriesByType('navigation')[0]
      const resources = performance.getEntriesByType('resource')
      return {
        measuredAtMs: performance.now(), domContentLoadedMs: entry?.domContentLoadedEventEnd,
        loadMs: entry?.loadEventEnd, navigationType: entry?.type,
        resourceTimingTransferredBytes: (entry?.transferSize || 0) + resources.reduce((total, item) => total + item.transferSize, 0),
        resourceCount: resources.length,
      }
    })
    run.initialTransfer = transferred()
    run.initialMp4Requests = [...run.requests]
    check(run, 'Public gallery returns 200', response?.status() === 200, response?.status())
    check(run, 'No authentication cookie supplied', (await context.cookies()).length === 0)
    check(run, 'Navigation timing is populated', run.navigation.domContentLoadedMs > 0 && run.navigation.loadMs >= run.navigation.domContentLoadedMs)
    check(run, 'Initial browsing requests no MP4', run.initialMp4Requests.length === 0, run.initialMp4Requests)
    check(run, 'Initial browsing transfers no MP4 bytes', run.initialTransfer.mp4EncodedBytes === 0, run.initialTransfer.mp4EncodedBytes)
    check(run, 'Initial browsing mounts no video', await page.locator('video').count() === 0)
    // Bind to the exact accessible Watch locator selected above. Raw textContent
    // also includes the decorative aria-hidden arrow, so comparing it with the
    // accessible name would miss the real click while playback succeeds.
    await watch.evaluate(button => button.addEventListener('click', event => {
      const state = window.__startupQA
      state.watchClicks++
      state.trustedClick = event.isTrusted
      state.clickedAt = performance.now()
    }, { capture: true }))
    await watch.click()
    await page.waitForFunction(() => {
      const video = document.querySelector('dialog video')
      const state = window.__startupQA
      return state.frameCallbackSupported === false || (state.firstFrameAt !== null && video && !video.paused && video.currentTime > 0 && video.readyState >= 2)
    }, null, { timeout: 30000 })
    const observed = await page.evaluate(() => {
      const video = document.querySelector('dialog video')
      return {
        ...window.__startupQA, sampledAtMs: performance.now(), source: video?.currentSrc ? new URL(video.currentSrc).pathname : null,
        paused: video?.paused, currentTime: video?.currentTime, muted: video?.muted, volume: video?.volume,
        decodedFrames: video?.getVideoPlaybackQuality().totalVideoFrames,
        activeMediaCount: [...document.querySelectorAll('video,audio')].filter(media => !media.paused && !media.ended).length,
        error: video?.error ? { code: video.error.code, message: video.error.message } : null,
      }
    })
    run.firstFrame = observed
    run.transferAtFirstFrameObservation = transferred()
    check(run, 'Frame callback is supported', observed.frameCallbackSupported)
    check(run, 'One trusted Watch click starts playback', observed.watchClicks === 1 && observed.trustedClick === true && !observed.paused && observed.currentTime > 0)
    check(run, 'Expected public video plays', observed.source === expectedVideo, observed.source)
    check(run, 'First frame follows the Watch click', observed.clickedAt !== null && observed.firstFrameAt >= observed.clickedAt && observed.decodedFrames > 0)
    check(run, 'Playback starts audible', observed.muted === false && observed.volume > 0)
    check(run, 'Only one player is active', observed.activeMediaCount === 1 && await page.locator('video').count() === 1)
    check(run, 'No media error', observed.error === null, observed.error)
    check(run, 'Only Velar video is requested', run.requests.every(request => request.path === expectedVideo), run.requests)
    run.clickToFirstFrameMs = observed.firstFrameAt - observed.clickedAt
    run.clickToPlayingMs = observed.firstPlayingAt === null ? null : observed.firstPlayingAt - observed.clickedAt
    check(run, 'No runtime or pre-cleanup request failures', run.errors.length === 0, run.errors)
    run.passed = true
  } catch (error) {
    run.errors.push({ kind: 'measurement', message: error.stack || error.message })
  } finally {
    run.observedCache = [...transfers.values()].map(item => ({ path: item.path, cached: item.cached, serviceWorker: Boolean(item.serviceWorker), status: item.status }))
    run.finalTransfer = transferred()
    cleanup = true
    // Use the public Close control. Closing the page aborts any later buffering;
    // those expected cancellations are outside the measurement window.
    const close = page.getByRole('button', { name: 'Close demo preview', exact: true })
    if (await close.count()) await close.click().catch(() => {})
    await page.close()
  }
  console.log(`${phase} ${iteration}/${repetitions}: ${run.passed ? `${run.clickToFirstFrameMs.toFixed(1)}ms click to first frame` : 'failed; see report'}`)
}

function distribution(values) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b)
  if (!sorted.length) return { count: 0 }
  const middle = sorted.length / 2
  return { count: sorted.length, min: sorted[0], median: Number.isInteger(middle) ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[Math.floor(middle)], p95NearestRank: sorted[Math.ceil(sorted.length * 0.95) - 1], max: sorted.at(-1) }
}

await mkdir(out, { recursive: true })
const { chromium } = await playwright()
const browser = await chromium.launch({ channel: 'chrome', headless: true, ignoreDefaultArgs: ['--mute-audio'] })
let retainedContext
try {
  for (let iteration = 1; iteration <= repetitions; iteration++) {
    const context = await browser.newContext({ viewport, deviceScaleFactor: 1 })
    if (iteration === repetitions) retainedContext = context
    try { await measureStart(context, 'cold', iteration) } finally { if (context !== retainedContext) await context.close() }
  }
  assert(report.runs.find(run => run.phase === 'cold' && run.iteration === repetitions)?.passed, 'The fifth cold start did not pass, so its retained context cannot supply a valid warm cohort. No extra priming or retry is performed.')
  for (let iteration = 1; iteration <= repetitions; iteration++) await measureStart(retainedContext, 'warm', iteration)
} catch (error) {
  report.errors.push(error.stack || error.message)
} finally {
  await browser.close()
  report.summary = Object.fromEntries(['cold', 'warm'].map(phase => {
    const runs = report.runs.filter(run => run.phase === phase)
    return [phase, {
      attempted: runs.length, passed: runs.filter(run => run.passed).length,
      clickToFirstFrameMs: distribution(runs.filter(run => run.passed).map(run => run.clickToFirstFrameMs)),
      domContentLoadedMs: distribution(runs.map(run => run.navigation?.domContentLoadedMs)),
      loadMs: distribution(runs.map(run => run.navigation?.loadMs)),
      initialTransferredBytes: distribution(runs.map(run => run.initialTransfer?.totalEncodedBytes)),
      initialMp4RequestCounts: runs.map(run => run.initialMp4Requests?.length ?? null),
      runsWithObservedCachedMp4: runs.filter(run => run.observedCache?.some(item => item.path === expectedVideo && item.cached)).length,
    }]
  }))
  report.passed = report.errors.length === 0 && report.runs.length === repetitions * 2 && report.runs.every(run => run.passed)
  await writeFile(join(out, 'report.json'), `${JSON.stringify(report, null, 2)}\n`)
  console.log(JSON.stringify({ passed: report.passed, summary: report.summary, report: join(out, 'report.json'), errors: report.errors }, null, 2))
}
process.exitCode = report.passed ? 0 : 1
