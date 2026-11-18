import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'
import { playwright } from '../videos/contractor-previews/runtime.mjs'

// Public local preview only: this script deliberately does not import or mint
// an admin cookie. All animation checkpoints come from real document scroll.
const origin = process.env.SUES_TAILOR_ORIGIN || 'http://127.0.0.1:5194'
assert.ok(['localhost', '127.0.0.1'].includes(new URL(origin).hostname), 'Use a local preview origin')
// Keep the rejected cutout prototype's evidence separate from this film run.
const output = new URL('../docs/review/sues-tailor/cinematic/', import.meta.url)
const artifact = name => fileURLToPath(new URL(name, output))
const widths = process.env.SUES_WIDTHS ? process.env.SUES_WIDTHS.split(',').map(Number) : [320, 390, 768, 1440, 1920]
const checkpoints = [0, 0.25, 0.5, 0.75, 1]
const rootSelector = '[data-assembly-progress]'
const errors = []
const pixelComparisons = []
// A redraw of the SAME decoded frame can change edge filtering after Chromium
// moves a frequently read canvas between raster backends. Frame identity and
// geometry remain exact requirements; only reverse redraws allow this explicitly
// bounded RGB variance. Paused canvases must still be byte-for-byte unchanged.
const rasterTolerance = { meanAbsoluteRgb: 2, rmsRgb: 5, maxChannelDifference: 96, pixelsOver32Percent: 0.5 }
const report = {
  checkedAt: new Date().toISOString(),
  artifactType: 'Real video-derived cinematic canvas sequence',
  origin,
  environment: 'Headless local Chromium, emulated viewports at DPR 1; no authentication cookies',
  method: 'Recorded passes use small native wheel steps with instant document-scroll checkpoint correction. Other widths use requestAnimationFrame document scrollTo. Animation state is never assigned by the test.',
  runs: [],
  reducedMotion: [],
  runtimeErrors: errors,
  pixelComparisons,
  reverseRasterTolerance: { ...rasterTolerance, channelRange: '0–255', reason: 'Allows small resampling differences only when frame index, requested frame, frame count and canvas dimensions match exactly. Does not establish the cause of a mismatch.' },
  status: 'running',
}
await mkdir(output, { recursive: true })
const { chromium } = await playwright()
const browser = await chromium.launch({ channel: 'chrome', headless: true })
report.browser = browser.version()

function instrumentPerformance() {
  const metrics = window.__assemblyMetrics = { intervals: [], frameTimes: [], displayedFrames: [], longTasks: [], shifts: [], longFrames: [], captureFrames: false, supported: PerformanceObserver.supportedEntryTypes }
  let previous = null
  function frame(now) {
    if (metrics.captureFrames && previous !== null) metrics.frameTimes.push(now - previous)
    if (metrics.captureFrames) {
      const root = document.querySelector('[data-assembly-progress]')
      const index = Number(root?.dataset.assemblyFrame ?? -1)
      if (index >= 0 && metrics.displayedFrames.at(-1)?.index !== index) metrics.displayedFrames.push({ time: now, index, scrollY })
    }
    previous = metrics.captureFrames ? now : null
    requestAnimationFrame(frame)
  }
  requestAnimationFrame(frame)
  function observe(type, target, map) {
    if (!metrics.supported.includes(type)) return
    new PerformanceObserver(list => target.push(...list.getEntries().map(map))).observe({ type, buffered: true })
  }
  observe('longtask', metrics.longTasks, item => ({ start: item.startTime, duration: item.duration, name: item.name }))
  observe('layout-shift', metrics.shifts, item => ({ start: item.startTime, value: item.value, hadRecentInput: item.hadRecentInput, nodes: (item.sources || []).map(source => source.node?.className || source.node?.nodeName || null) }))
  observe('long-animation-frame', metrics.longFrames, item => ({ start: item.startTime, duration: item.duration, blockingDuration: item.blockingDuration || 0 }))
}

async function snapshot(page) {
  return page.locator(rootSelector).evaluate(async root => {
    const canvas = root.querySelector('.bt-assembly-canvas')
    const poster = root.querySelector('.bt-assembly-poster')
    const mode = root.dataset.assemblyMode
    let pixelSha256 = null
    if (mode === 'cinematic') {
      const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data
      window.__canvasPixelBuffers ||= new Map()
      window.__canvasPixelSerial = (window.__canvasPixelSerial || 0) + 1
      window.__canvasPixelBuffers.set(window.__canvasPixelSerial, pixels)
      const hash = await crypto.subtle.digest('SHA-256', pixels)
      pixelSha256 = [...new Uint8Array(hash)].map(value => value.toString(16).padStart(2, '0')).join('')
    }
    return {
      scrollY,
      mode,
      progress: Number(root.dataset.assemblyProgress) / 100,
      frame: Number(root.dataset.assemblyFrame),
      targetFrame: Number(root.dataset.assemblyTargetFrame),
      frameCount: Number(root.dataset.assemblyFrameCount),
      canvas: { width: canvas.width, height: canvas.height, pixelSha256, bufferId: mode === 'cinematic' ? window.__canvasPixelSerial : null },
      poster: { source: poster.currentSrc, loaded: poster.complete && poster.naturalWidth > 0, width: poster.naturalWidth, height: poster.naturalHeight },
    }
  })
}

async function scrollToPosition(page, target, duration = 500) {
  return page.evaluate(async ({ target, duration }) => {
    const from = scrollY
    const start = performance.now()
    const originalBehavior = document.documentElement.style.scrollBehavior
    document.documentElement.style.scrollBehavior = 'auto'
    window.__assemblyMetrics.captureFrames = true
    await new Promise(resolve => {
      const frame = now => {
        const progress = Math.min(1, (now - start) / duration)
        window.scrollTo({ top: Math.round(from + (target - from) * progress), behavior: 'instant' })
        if (progress < 1) requestAnimationFrame(frame)
        else requestAnimationFrame(() => requestAnimationFrame(resolve))
      }
      requestAnimationFrame(frame)
    })
    const end = performance.now()
    window.__assemblyMetrics.captureFrames = false
    document.documentElement.style.scrollBehavior = originalBehavior
    window.__assemblyMetrics.intervals.push({ start, end, from, to: scrollY })
    return { start, end, from, to: scrollY }
  }, { target, duration })
}

async function wheelToPosition(page, target, duration = 950) {
  const viewport = page.viewportSize()
  await page.mouse.move(viewport.width * 0.5, viewport.height * 0.45)
  const before = await page.evaluate(() => {
    window.__assemblyMetrics.captureFrames = true
    return { start: performance.now(), from: scrollY }
  })
  const steps = Math.max(1, Math.ceil(duration / 50))
  for (let step = 0; step < steps; step += 1) {
    const current = await page.evaluate(() => scrollY)
    await page.mouse.wheel(0, (target - current) / (steps - step))
    await page.waitForTimeout(50)
  }
  // Wheel input may end between integer document coordinates. Correct only
  // the native scroll position, so forward/reverse snapshots share a pixel.
  await page.evaluate(async ({ target, before }) => {
    const nativeEnd = performance.now()
    window.scrollTo({ top: target, behavior: 'instant' })
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    window.__assemblyMetrics.captureFrames = false
    window.__assemblyMetrics.intervals.push({ ...before, nativeEnd, end: performance.now(), to: scrollY, input: 'wheel' })
  }, { target, before })
}

async function settle(page, expectedProgress) {
  await page.waitForFunction(({ selector, expected }) => {
    const root = document.querySelector(selector)
    return root && root.dataset.assemblyMode === 'cinematic'
      && Math.abs(Number(root.dataset.assemblyProgress) / 100 - expected) <= 0.012
      && Number(root.dataset.assemblyFrame) >= 0
      && root.dataset.assemblyFrame === root.dataset.assemblyTargetFrame
  }, { selector: rootSelector, expected: expectedProgress }, { timeout: 6000 })
  // Allows scrub interpolation, if present, to reach its final rendered state.
  await page.waitForTimeout(180)
}

async function assertEquivalent(page, actual, expected, label, allowRasterTolerance = false) {
  assert.equal(actual.mode, expected.mode, `${label}: render mode`)
  assert.equal(actual.frame, expected.frame, `${label}: displayed frame`)
  assert.equal(actual.targetFrame, expected.targetFrame, `${label}: requested frame`)
  assert.equal(actual.frameCount, expected.frameCount, `${label}: sequence length`)
  assert.equal(actual.canvas.width, expected.canvas.width, `${label}: canvas width`)
  assert.equal(actual.canvas.height, expected.canvas.height, `${label}: canvas height`)
  const exact = actual.canvas.pixelSha256 === expected.canvas.pixelSha256
  const comparison = { label, frame: actual.frame, exactHashMatch: exact, allowRasterTolerance, meanAbsoluteRgb: 0, rmsRgb: 0, maxChannelDifference: 0, changedPixelsPercent: 0, pixelsOver8Percent: 0, pixelsOver32Percent: 0 }
  if (actual.mode === 'cinematic') {
    Object.assign(comparison, await page.evaluate(({ actualId, expectedId, exact }) => {
      const a = window.__canvasPixelBuffers.get(actualId)
      const b = window.__canvasPixelBuffers.get(expectedId)
      if (!a || !b || a.length !== b.length) throw new Error('Pixel comparison buffers are unavailable or have different dimensions')
      let sum = 0, squared = 0, max = 0, changed = 0, over8 = 0, over32 = 0
      if (!exact) {
        for (let index = 0; index < a.length; index += 4) {
          let pixelMax = 0
          for (let channel = 0; channel < 3; channel += 1) {
            const difference = Math.abs(a[index + channel] - b[index + channel])
            sum += difference
            squared += difference * difference
            max = Math.max(max, difference)
            pixelMax = Math.max(pixelMax, difference)
          }
          if (pixelMax > 0) changed++
          if (pixelMax > 8) over8++
          if (pixelMax > 32) over32++
        }
      }
      const count = a.length / 4
      window.__canvasPixelBuffers.delete(actualId)
      const round = value => Number(value.toFixed(6))
      return { meanAbsoluteRgb: round(sum / (count * 3)), rmsRgb: round(Math.sqrt(squared / (count * 3))), maxChannelDifference: max, changedPixelsPercent: round(100 * changed / count), pixelsOver8Percent: round(100 * over8 / count), pixelsOver32Percent: round(100 * over32 / count) }
    }, { actualId: actual.canvas.bufferId, expectedId: expected.canvas.bufferId, exact }))
  }
  comparison.withinRasterTolerance = Object.entries(rasterTolerance).every(([key, limit]) => comparison[key] <= limit)
  comparison.passed = exact || (allowRasterTolerance && comparison.withinRasterTolerance)
  pixelComparisons.push(comparison)
  assert.ok(comparison.passed, `${label}: actual canvas pixel difference ${JSON.stringify(comparison)}`)
  assert.deepEqual(actual.poster, expected.poster, `${label}: poster source`)
}

function assertFrame(state, expectedProgress, width) {
  assert.equal(state.mode, 'cinematic', `Real cinematic mode at ${width}`)
  assert.ok(state.frameCount > 1, `Real sequence length at ${width}`)
  assert.equal(state.frame, state.targetFrame, `Decoded displayed frame catches requested frame at ${width}`)
  assert.ok(Math.abs(state.frame - Math.round(expectedProgress * (state.frameCount - 1))) <= 1, `Scroll maps to the expected frame at ${width}`)
  assert.match(state.canvas.pixelSha256 || '', /^[a-f0-9]{64}$/, `Rendered pixel SHA-256 at ${width}`)
  assert.ok(state.canvas.width > 0 && state.canvas.height > 0, `Canvas dimensions at ${width}`)
  if (expectedProgress === 0) assert.equal(state.frame, 0, 'The first frame is displayed at the start')
  if (expectedProgress === 1) assert.equal(state.frame, state.frameCount - 1, 'The last frame is displayed at completion')
}

async function assertNoOverflow(page, label) {
  const dimensions = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }))
  assert.ok(dimensions.scroll <= dimensions.width + 1, `${label}: horizontal overflow ${JSON.stringify(dimensions)}`)
}

function summarizePerformance(metrics) {
  const duringScroll = item => metrics.intervals.some(interval => item.start < interval.end && item.start + (item.duration || 0) >= interval.start)
  const sorted = [...metrics.frameTimes].sort((a, b) => a - b)
  const percentile = fraction => sorted.length ? Number(sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))].toFixed(2)) : null
  const longTasks = metrics.longTasks.filter(duringScroll)
  const shifts = metrics.shifts.filter(duringScroll)
  return {
    sampleCount: sorted.length,
    rafP50Ms: percentile(0.5),
    rafP95Ms: percentile(0.95),
    rafMaxMs: sorted.length ? Number(sorted.at(-1).toFixed(2)) : null,
    framesOver33Ms: sorted.filter(value => value > 33.4).length,
    framesOver50Ms: sorted.filter(value => value > 50).length,
    longTasksDuringScroll: longTasks,
    longTaskTotalMs: Number(longTasks.reduce((sum, item) => sum + item.duration, 0).toFixed(2)),
    layoutShiftsDuringScroll: shifts,
    clsDuringScroll: Number(shifts.filter(item => !item.hadRecentInput).reduce((sum, item) => sum + item.value, 0).toFixed(6)),
    longAnimationFramesDuringScroll: metrics.longFrames.filter(duringScroll),
    displayedFrameChangesDuringScroll: metrics.displayedFrames.length,
    uniqueFramesDuringScroll: new Set(metrics.displayedFrames.map(item => item.index)).size,
    supportedEntryTypes: metrics.supported,
    interpretation: 'Diagnostic measurements on this local headless run; not a physical-device or production performance claim.',
  }
}

async function startTrace(context, page, width) {
  let session
  try {
    session = await context.newCDPSession(page)
    await session.send('Tracing.start', { categories: 'devtools.timeline,blink.user_timing,v8,disabled-by-default-devtools.timeline.frame', transferMode: 'ReturnAsStream' })
    return { session, width }
  } catch (error) {
    await session?.detach().catch(() => {})
    return { error: error.message }
  }
}

async function stopTrace(trace) {
  if (!trace?.session) return { recorded: false, reason: trace?.error || 'Not requested for this viewport' }
  const { session, width } = trace
  try {
    const complete = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('CDP trace completion timed out')), 10000)
      session.once('Tracing.tracingComplete', payload => { clearTimeout(timer); resolve(payload) })
    })
    await session.send('Tracing.end')
    const { stream } = await complete
    let raw = ''
    while (true) {
      const chunk = await session.send('IO.read', { handle: stream })
      raw += chunk.base64Encoded ? Buffer.from(chunk.data, 'base64').toString('utf8') : chunk.data
      if (chunk.eof) break
    }
    await session.send('IO.close', { handle: stream })
    const filename = `trace-${width}.json.gz`
    await writeFile(artifact(filename), gzipSync(raw))
    const events = JSON.parse(raw).traceEvents || []
    const counts = {}
    for (const event of events) {
      if (!['Layout', 'UpdateLayoutTree', 'Paint', 'CompositeLayers', 'FunctionCall', 'RunTask', 'AnimationFrame'].includes(event.name)) continue
      const item = counts[event.name] ||= { count: 0, totalDurationMs: 0, maxDurationMs: 0 }
      item.count += 1
      const duration = (event.dur || 0) / 1000
      item.totalDurationMs += duration
      item.maxDurationMs = Math.max(item.maxDurationMs, duration)
    }
    for (const entry of Object.values(counts)) {
      entry.totalDurationMs = Number(entry.totalDurationMs.toFixed(2))
      entry.maxDurationMs = Number(entry.maxDurationMs.toFixed(2))
    }
    return { recorded: true, file: filename, events: events.length, categories: counts, note: 'Trace includes checkpoint pixel hashing and screenshots between scroll segments. Nested event durations overlap and must not be added together.' }
  } catch (error) {
    return { recorded: false, reason: error.message }
  } finally {
    await session.detach().catch(() => {})
  }
}

async function load(page, width) {
  await page.addInitScript(instrumentPerformance)
  page.on('pageerror', error => errors.push({ width, message: error.message }))
  const response = await page.goto(`${origin}/demo/sues-tailor`, { waitUntil: 'networkidle' })
  assert.equal(response.status(), 200, `Public route at ${width}`)
  assert.match(response.headers()['x-robots-tag'] || '', /noindex/)
  await page.evaluate(() => document.fonts.ready)
  assert.equal(await page.locator(rootSelector).count(), 1)
  await page.waitForFunction(selector => {
    const root = document.querySelector(selector)
    const poster = root?.querySelector('.bt-assembly-poster')
    return root?.dataset.assemblyReady === 'true' && poster?.complete && poster.naturalWidth > 0
  }, rootSelector)
  assert.equal(await page.locator('.bt-assembly-canvas').count(), 1)
  assert.ok(Number(await page.locator(rootSelector).getAttribute('data-assembly-frame-count')) > 1, 'A real cinematic manifest is loaded')
  await assertNoOverflow(page, `Initial ${width}`)
}

async function checkContact(page, width) {
  const quickContact = page.getByRole('navigation', { name: 'Quick contact' })
  if (width <= 850) {
    assert.equal(await quickContact.isVisible(), true, `Mobile contact at ${width}`)
    const box = await quickContact.boundingBox()
    const viewport = page.viewportSize()
    assert.ok(box.y >= 0 && box.y + box.height <= viewport.height + 1, `Contact bar remains within the viewport at ${width}`)
    assert.ok(box.height >= 44, 'Mobile contact touch target remains usable')
    const fittingLink = quickContact.getByRole('link', { name: 'Request a fitting', exact: false })
    assert.equal(await fittingLink.getAttribute('href'), '#request-fitting')
    await fittingLink.click()
  } else {
    const headerLink = page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Request a fitting', exact: false })
    assert.equal(await headerLink.getAttribute('href'), '#request-fitting')
    assert.equal(await page.locator('.bt-assembly-contact').getByRole('link', { name: 'Request a fitting', exact: false }).getAttribute('href'), '#request-fitting')
    await headerLink.click()
  }
  await page.waitForFunction(() => {
    const target = document.getElementById('request-fitting')
    const rect = target.getBoundingClientRect()
    return location.hash === '#request-fitting' && rect.top >= -5 && rect.top < innerHeight * 0.45
  }, null, { timeout: 6000 })
  return { mobileBarWithinViewport: width <= 850 ? true : 'not applicable', actualAnchorClickReachedForm: true }
}

async function checkForm(page, writes) {
  const fitting = page.locator('#request-fitting')
  const before = await page.evaluate(() => ({ local: { ...localStorage }, session: { ...sessionStorage } }))
  await fitting.getByRole('button', { name: 'Review fitting request', exact: true }).click()
  await fitting.locator('.bt-fitting-error-summary').waitFor({ state: 'visible' })
  assert.equal(await fitting.locator('[aria-invalid="true"]').count(), 3)
  await fitting.getByLabel('Your name (required)', { exact: true }).fill('Assembly Demo Visitor')
  await fitting.getByRole('radio', { name: 'Email', exact: true }).check()
  await fitting.getByLabel('Email address (required)', { exact: true }).fill('sample@example.test')
  await fitting.getByLabel('Garment or service (required)', { exact: true }).selectOption('Bridesmaid dress')
  await fitting.getByLabel('A little more about your piece (optional)', { exact: true }).fill('Sample only: discuss the hem.')
  await fitting.getByRole('button', { name: 'Review fitting request', exact: true }).click()
  await fitting.getByRole('heading', { name: 'Your fitting details.', exact: true }).waitFor({ state: 'visible' })
  assert.equal(await fitting.getByText('Nothing has been sent or booked.', { exact: true }).isVisible(), true)
  assert.match(await fitting.locator('.bt-fitting-summary').innerText(), /Assembly Demo Visitor[\s\S]*sample@example.test[\s\S]*Bridesmaid dress/)
  await fitting.getByRole('button', { name: 'Edit details', exact: true }).click()
  assert.equal(await fitting.getByLabel('Your name (required)', { exact: true }).inputValue(), 'Assembly Demo Visitor')
  await fitting.getByRole('button', { name: 'Clear details', exact: true }).click()
  assert.equal(await fitting.getByLabel('Your name (required)', { exact: true }).inputValue(), '')
  assert.deepEqual(await page.evaluate(() => ({ local: { ...localStorage }, session: { ...sessionStorage } })), before, 'Form does not persist data')
  assert.deepEqual(writes, [], 'The demo form sends no POST, PUT, PATCH or DELETE requests')
  return { requiredFieldValidation: true, reviewEditClear: true, noWriteRequests: true, noStorageWrites: true }
}

try {
  for (const width of widths) {
    const recording = width === 390 || width === 1440
    const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'no-preference', ...(recording ? { recordVideo: { dir: artifact('video-raw/'), size: { width, height: 900 } } } : {}) })
    assert.deepEqual(await context.cookies(), [], 'The public demo uses no authentication cookie')
    const page = await context.newPage()
    const video = page.video()
    const videoStartedAt = Date.now()
    const writes = []
    page.on('request', request => { if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method())) writes.push({ method: request.method(), url: request.url() }) })
    let trace
    const run = { width, height: 900, checks: {}, checkpoints: [], status: 'running' }
    report.runs.push(run)
    try {
      await load(page, width)
      await page.waitForFunction(selector => {
        const root = document.querySelector(selector)
        return root.dataset.assemblyReady === 'true' && root.dataset.assemblyMode === 'cinematic' && Number(root.dataset.assemblyEnd) > Number(root.dataset.assemblyStart)
      }, rootSelector)
      const bounds = await page.locator(rootSelector).evaluate(root => ({ start: Number(root.dataset.assemblyStart), end: Number(root.dataset.assemblyEnd) }))
      assert.ok(bounds.start >= -0.01 && bounds.end > bounds.start, `Valid scroll bounds at ${width}`)
      run.bounds = bounds
      const checkpointY = progress => progress === 0 ? Math.max(0, Math.floor(bounds.start)) : progress === 1 ? Math.ceil(bounds.end) + 1 : Math.round(bounds.start + (bounds.end - bounds.start) * progress)
      await scrollToPosition(page, checkpointY(0), 250)
      await settle(page, 0)
      trace = recording ? await startTrace(context, page, width) : null
      const forward = new Map()
      const stepDuration = recording ? 950 : 300
      for (const progress of checkpoints) {
        const y = checkpointY(progress)
        if (recording && progress !== 0) await wheelToPosition(page, y, stepDuration)
        else await scrollToPosition(page, y, progress === 0 ? 120 : stepDuration)
        await settle(page, progress)
        const state = await snapshot(page)
        assertFrame(state, progress, width)
        forward.set(progress, state)
        run.checkpoints.push({ direction: 'forward', expectedProgress: progress, ...state })
        await assertNoOverflow(page, `${width} at ${progress}`)
        await page.screenshot({ path: artifact(`width-${width}-forward-${String(progress * 100).padStart(3, '0')}.png`) })
        if (progress === 0.5) {
          const paused = await snapshot(page)
          await page.waitForTimeout(recording ? 1200 : 600)
          const afterPause = await snapshot(page)
          assert.equal(afterPause.scrollY, paused.scrollY, 'The document stays still while paused')
          await assertEquivalent(page, afterPause, paused, `Paused halfway at ${width}`)
          run.checks.pauseDoesNotAdvance = true
        }
      }
      run.checks.completedLastFrame = true
      assert.equal(new Set([...forward.values()].map(state => state.canvas.pixelSha256)).size, checkpoints.length, 'Every sampled movie checkpoint has different rendered pixels')
      run.checks.checkpointsRenderDistinctPixels = true
      for (const progress of [...checkpoints].reverse().slice(1)) {
        const target = checkpointY(progress)
        if (recording) await wheelToPosition(page, target, stepDuration)
        else await scrollToPosition(page, target, stepDuration)
        await settle(page, progress)
        const state = await snapshot(page)
        await assertEquivalent(page, state, forward.get(progress), `Reverse checkpoint ${progress} at ${width}`, true)
        run.checkpoints.push({ direction: 'reverse', expectedProgress: progress, ...state })
        if (recording) await page.screenshot({ path: artifact(`width-${width}-reverse-${String(progress * 100).padStart(3, '0')}.png`) })
      }
      run.trace = await stopTrace(trace)
      trace = null
      const metrics = await page.evaluate(() => window.__assemblyMetrics)
      assert.ok(new Set(metrics.displayedFrames.map(item => item.index)).size >= checkpoints.length, 'Native scrolling visibly changes the displayed frame index')
      if (recording) {
        const wheelFrames = metrics.displayedFrames.filter(frame => metrics.intervals.some(interval => interval.input === 'wheel' && frame.time >= interval.start && frame.time <= interval.nativeEnd))
        run.checks.uniqueFramesDuringNativeWheel = new Set(wheelFrames.map(frame => frame.index)).size
        assert.ok(run.checks.uniqueFramesDuringNativeWheel >= Math.min(10, forward.get(1).frameCount), 'The movie advances through intermediate frames during wheel input, before checkpoint correction')
      }
      run.performance = summarizePerformance(metrics)
      await writeFile(artifact(`performance-raw-${width}.json`), `${JSON.stringify(metrics, null, 2)}\n`)
      run.checks.reverseMatchesForward = true
      run.checks.noOverflow = true
      // Capture mobile contact while the scroll scene is pinned, then follow its
      // real anchor. The desktop equivalent uses the prominent hero link.
      await scrollToPosition(page, Math.round((bounds.start + bounds.end) / 2), 200)
      await settle(page, 0.5)
      run.contact = await checkContact(page, width)
      if (recording) await page.screenshot({ path: artifact(`width-${width}-form-anchor.png`) })
      run.form = await checkForm(page, writes)
      await assertNoOverflow(page, `After form at ${width}`)
      assert.deepEqual(writes, [])
      run.status = 'passed'
      console.log(`${width}px: native scroll, reversible canvas pixels, pause, final movie frame, contact anchor and preview form passed`)
    } catch (error) {
      run.status = 'failed'
      run.failure = error.stack || String(error)
      await page.screenshot({ path: artifact(`failure-${width}.png`) }).catch(() => {})
      throw error
    } finally {
      if (trace) run.trace = await stopTrace(trace)
      run.recordingWallTimeSeconds = recording ? Number(((Date.now() - videoStartedAt) / 1000).toFixed(2)) : null
      await page.close()
      if (video) {
        run.video = `scroll-forward-reverse-${width}.webm`
        await video.saveAs(artifact(run.video))
        await video.delete()
      }
      await context.close()
      await writeFile(artifact('browser-results.json'), `${JSON.stringify(report, null, 2)}\n`)
    }
  }

  for (const width of widths) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'reduce' })
    const page = await context.newPage()
    try {
      await load(page, width)
      await page.waitForFunction(selector => document.querySelector(selector)?.dataset.assemblyReady === 'true', rootSelector)
      const dimensions = await page.locator(rootSelector).evaluate(root => ({ height: root.getBoundingClientRect().height, viewport: innerHeight, ancestorPin: Boolean(root.closest('.pin-spacer')), descendantPins: root.querySelectorAll('.pin-spacer').length }))
      assert.ok(dimensions.height < dimensions.viewport * 1.75, `Reduced motion has no giant scroll scene at ${width}: ${dimensions.height}px`)
      assert.equal(dimensions.ancestorPin || dimensions.descendantPins > 0, false, 'Reduced motion has no GSAP pin spacer')
      assert.equal(await page.locator(rootSelector).getAttribute('data-reduced-motion'), 'true')
      assert.equal(await page.locator(rootSelector).getAttribute('data-assembly-mode'), 'static')
      assert.equal(await page.locator('.bt-assembly-finished').isVisible(), true, 'Reduced motion displays the completed garment')
      assert.equal(await page.locator('.bt-assembly-finished').evaluate(image => image.complete && image.naturalWidth > 0), true, 'Reduced motion completed garment is loaded')
      const initial = await snapshot(page)
      await scrollToPosition(page, 500, 250)
      const scrolled = await snapshot(page)
      await assertEquivalent(page, scrolled, initial, `Reduced-motion static garment at ${width}`)
      await assertNoOverflow(page, `Reduced motion ${width}`)
      if (width === 390 || width === 1440) {
        await scrollToPosition(page, 0, 120)
        await page.screenshot({ path: artifact(`reduced-motion-${width}.png`) })
      }
      let livePreferenceSwitch = 'not run at this width'
      if (width === 1440) {
        await page.emulateMedia({ reducedMotion: 'no-preference' })
        await page.waitForFunction(selector => {
          const root = document.querySelector(selector)
          return root.dataset.reducedMotion === 'false' && root.dataset.assemblyMode === 'cinematic' && Number(root.dataset.assemblyEnd) > Number(root.dataset.assemblyStart)
        }, rootSelector)
        const midpoint = await page.locator(rootSelector).evaluate(root => Math.round((Number(root.dataset.assemblyStart) + Number(root.dataset.assemblyEnd)) / 2))
        await scrollToPosition(page, midpoint, 350)
        await settle(page, 0.5)
        await page.emulateMedia({ reducedMotion: 'reduce' })
        await page.waitForFunction(selector => {
          const root = document.querySelector(selector)
          return root.dataset.reducedMotion === 'true' && root.dataset.assemblyMode === 'static' && !root.closest('.pin-spacer') && document.querySelectorAll('.pin-spacer').length === 0
        }, rootSelector)
        assert.equal(await page.locator('.bt-assembly-finished').isVisible(), true)
        await assertNoOverflow(page, 'Live reduced-motion switch')
        assert.ok(await page.locator(rootSelector).evaluate(root => root.getBoundingClientRect().height < innerHeight * 1.75), 'Live reduced-motion switch removes long pin spacing')
        await page.emulateMedia({ reducedMotion: 'no-preference' })
        await page.waitForFunction(selector => {
          const root = document.querySelector(selector)
          return root.dataset.reducedMotion === 'false' && root.dataset.assemblyMode === 'cinematic' && Number(root.dataset.assemblyEnd) > Number(root.dataset.assemblyStart) && document.querySelectorAll('.pin-spacer').length === 1
        }, rootSelector)
        const restoredMidpoint = await page.locator(rootSelector).evaluate(root => Math.round((Number(root.dataset.assemblyStart) + Number(root.dataset.assemblyEnd)) / 2))
        await scrollToPosition(page, restoredMidpoint, 350)
        await settle(page, 0.5)
        assert.equal(await page.locator('.pin-spacer').count(), 1, 'Restoring motion creates exactly one pin')
        const restored = await snapshot(page)
        await page.waitForTimeout(600)
        await assertEquivalent(page, await snapshot(page), restored, 'Restored scene remains scroll bound')
        livePreferenceSwitch = { reducedModeRemovesPinAndSpacing: true, restoredModeCreatesOnePin: true, restoredSceneFollowsScroll: true, restoredPauseIsStable: true }
      }
      report.reducedMotion.push({ width, staticCinematicPoster: true, noPinSpacer: true, noGiantScrollSection: true, noOverflow: true, livePreferenceSwitch, ...dimensions })
    } finally {
      await context.close()
    }
  }
  assert.deepEqual(errors, [], 'No browser runtime errors')
  report.status = 'passed'
  console.log(`Sue’s cinematic canvas: ${widths.length} normal-motion and ${widths.length} reduced-motion viewport checks passed. Evidence: ${fileURLToPath(output)}`)
} catch (error) {
  report.status = 'failed'
  report.failure = error.stack || String(error)
  throw error
} finally {
  await writeFile(artifact('browser-results.json'), `${JSON.stringify(report, null, 2)}\n`)
  await browser.close()
}
