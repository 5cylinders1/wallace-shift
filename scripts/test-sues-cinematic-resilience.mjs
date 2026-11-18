import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { playwright } from '../videos/contractor-previews/runtime.mjs'

const origin = process.env.SUES_TAILOR_ORIGIN || 'http://127.0.0.1:5194'
assert.ok(['127.0.0.1', 'localhost'].includes(new URL(origin).hostname), 'Local public preview only')
const output = new URL('../docs/review/sues-tailor/cinematic/resilience-results.json', import.meta.url)
const mediaPath = '/demos/best-tailor/media/cinematic/'
const framePattern = /\/cinematic\/(?:mobile\/)?frame-(\d+)\.webp(?:\?|$)/
const rootSelector = '.bt-assembly'
const report = {
  checkedAt: new Date().toISOString(), origin, status: 'running',
  environment: 'Isolated headless Chrome with no authentication cookies; public local route',
  method: 'Native wheel seeks, real viewport changes, held or missing HTTP responses, and sampled pixels from the visible canvas or poster. No timeline mutation or exact resample hash requirement.',
  cases: [], runtimeErrors: [],
}
await mkdir(new URL('.', output), { recursive: true })
const { chromium } = await playwright()
const browser = await chromium.launch({ channel: 'chrome', headless: true })
report.browser = browser.version()

function installSampling() {
  const diagnostic = document.createElement('canvas')
  diagnostic.width = 64
  diagnostic.height = 64
  const context = diagnostic.getContext('2d', { willReadFrequently: true })
  window.__resilienceSamples = []
  window.__resilienceMonitoring = false
  window.__sampleResilience = () => {
    const root = document.querySelector('.bt-assembly')
    if (!root) return null
    const mode = root.dataset.assemblyMode
    const canvas = root.querySelector('.bt-assembly-canvas')
    const poster = root.querySelector('.bt-assembly-poster')
    const visible = mode === 'cinematic' ? canvas : poster
    const style = getComputedStyle(visible)
    const rect = visible.getBoundingClientRect()
    const loaded = visible === canvas ? canvas.width > 0 && canvas.height > 0 : poster.complete && poster.naturalWidth > 0
    let min = 255, max = 0, sum = 0, square = 0, bright = 0, error = null
    if (loaded) {
      try {
        context.clearRect(0, 0, 64, 64)
        context.drawImage(visible, 0, 0, 64, 64)
        const data = context.getImageData(0, 0, 64, 64).data
        for (let index = 0; index < data.length; index += 4) {
          const value = (data[index] + data[index + 1] + data[index + 2]) / 3
          min = Math.min(min, value); max = Math.max(max, value)
          sum += value; square += value * value
          if (value > 65) bright++
        }
      } catch (problem) { error = problem.message }
    }
    const variance = square / 4096 - (sum / 4096) ** 2
    const visibleInLayout = style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0 && rect.width > 0 && rect.height > 0
    return {
      time: performance.now(), viewport: innerWidth, mode,
      frame: Number(root.dataset.assemblyFrame), target: Number(root.dataset.assemblyTargetFrame),
      progress: Number(root.dataset.assemblyProgress), count: Number(root.dataset.assemblyFrameCount),
      canvas: { width: canvas.width, height: canvas.height },
      poster: { source: poster.currentSrc, loaded: poster.complete && poster.naturalWidth > 0 },
      pinCount: document.querySelectorAll('.pin-spacer').length,
      pixels: { min: Number(min.toFixed(2)), max: Number(max.toFixed(2)), variance: Number(variance.toFixed(2)), brightFraction: bright / 4096, error },
      visibleInLayout, loaded,
      nonblank: Boolean(loaded && visibleInLayout && !error && max - min > 25 && variance > 30 && bright / 4096 > 0.005),
    }
  }
  const tick = () => {
    if (window.__resilienceMonitoring) {
      const sample = window.__sampleResilience()
      if (sample && window.__resilienceSamples.length < 1500) window.__resilienceSamples.push(sample)
    }
    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}

async function sample(page) {
  return page.evaluate(() => window.__sampleResilience())
}

function assertVisible(state, label) {
  assert.ok(state?.nonblank, `${label}: expected visible image pixels, received ${JSON.stringify(state)}`)
  assert.ok(['cinematic', 'static'].includes(state.mode), `${label}: recognized display mode`)
}

async function ready(page, mode) {
  await page.waitForFunction(({ selector, mode }) => {
    const root = document.querySelector(selector)
    const poster = root?.querySelector('.bt-assembly-poster')
    return root?.dataset.assemblyReady === 'true' && root.dataset.assemblyMode === mode
      && poster?.complete && poster.naturalWidth > 0
      && (mode !== 'cinematic' || Number(root.dataset.assemblyFrame) >= 0)
  }, { selector: rootSelector, mode }, { timeout: 15000 })
}

async function openPage(context, entry) {
  assert.deepEqual(await context.cookies(), [], 'No authenticated browser context')
  const page = await context.newPage()
  await page.addInitScript(installSampling)
  page.on('pageerror', error => report.runtimeErrors.push({ case: entry.name, message: error.message }))
  entry.requests = { manifests: [], frames: 0, writeMethods: [] }
  page.on('request', request => {
    const pathname = new URL(request.url()).pathname
    if (pathname.startsWith(mediaPath) && pathname.endsWith('/manifest.json')) entry.requests.manifests.push(pathname)
    if (framePattern.test(request.url())) entry.requests.frames++
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method())) entry.requests.writeMethods.push(request.method())
  })
  const response = await page.goto(`${origin}/demo/sues-tailor`, { waitUntil: 'domcontentloaded' })
  assert.equal(response.status(), 200)
  assert.match(response.headers()['x-robots-tag'] || '', /noindex/)
  await page.evaluate(() => document.fonts.ready)
  return page
}

async function nativeSeek(page, fraction) {
  const delta = await page.locator(rootSelector).evaluate((root, fraction) => {
    const start = Number(root.dataset.assemblyStart)
    const end = Number(root.dataset.assemblyEnd)
    return Math.round(start + (end - start) * fraction) - scrollY
  }, fraction)
  await page.mouse.move(page.viewportSize().width / 2, 400)
  await page.mouse.wheel(0, delta)
  await page.waitForTimeout(90)
}

async function assertContactAnchor(page) {
  const width = page.viewportSize().width
  const navigation = page.getByRole('navigation', { name: width <= 850 ? 'Quick contact' : 'Main navigation' })
  const link = navigation.getByRole('link', { name: 'Request a fitting', exact: false })
  assert.equal(await link.getAttribute('href'), '#request-fitting')
  await link.click()
  await page.waitForFunction(() => {
    const rect = document.getElementById('request-fitting').getBoundingClientRect()
    return location.hash === '#request-fitting' && rect.top >= -5 && rect.top < innerHeight * 0.45
  }, null, { timeout: 6000 })
  return true
}

async function runCase(name, options, task) {
  const entry = { name, status: 'running' }
  report.cases.push(entry)
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference', ...options })
  try {
    await task(context, entry)
    assert.deepEqual(entry.requests?.writeMethods, [], `${name}: no transmission`)
    entry.status = 'passed'
    console.log(`${name}: passed`)
  } catch (error) {
    entry.status = 'failed'
    entry.failure = error.stack || String(error)
    throw error
  } finally {
    await context.close()
    await writeFile(output, `${JSON.stringify(report, null, 2)}\n`)
  }
}

try {
  await runCase('Delayed frames, rapid native seeks, and resize while pending', {}, async (context, entry) => {
    const manifestResponse = await context.request.get(`${origin}${mediaPath}manifest.json`)
    assert.equal(manifestResponse.status(), 200)
    const { frameCount } = await manifestResponse.json()
    let hold = true
    let release
    const gate = new Promise(resolve => { release = resolve })
    entry.heldRequests = []
    await context.route(framePattern, async route => {
      const number = Number(route.request().url().match(framePattern)[1])
      if (hold && number > 8 && number < frameCount) {
        entry.heldRequests.push({ number, path: new URL(route.request().url()).pathname })
        await gate
      }
      await route.continue().catch(() => {})
    })
    try {
      const page = await openPage(context, entry)
      await ready(page, 'cinematic')
      entry.initial = await sample(page)
      assertVisible(entry.initial, 'Initial frame')
      await page.evaluate(() => { window.__resilienceMonitoring = true })
      for (const fraction of [0.72, 0.23, 0.86]) await nativeSeek(page, fraction)
      await page.waitForFunction(() => {
        const root = document.querySelector('.bt-assembly')
        return Number(root.dataset.assemblyTargetFrame) > 8 && root.dataset.assemblyFrame !== root.dataset.assemblyTargetFrame
      })
      entry.pendingBeforeResize = await sample(page)
      assertVisible(entry.pendingBeforeResize, 'Pending target before resize')
      assert.ok(entry.heldRequests.length > 0, 'Frame responses were actually held')
      await page.setViewportSize({ width: 1200, height: 820 })
      await page.waitForTimeout(180)
      await nativeSeek(page, 0.84)
      entry.pendingAfterResize = await sample(page)
      assertVisible(entry.pendingAfterResize, 'Pending target after resize')
      assert.notEqual(entry.pendingAfterResize.canvas.width, entry.initial.canvas.width, 'The canvas really resized')
      assert.notEqual(entry.pendingAfterResize.frame, entry.pendingAfterResize.target, 'The target is still pending while responses are held')
      hold = false
      release()
      await page.waitForFunction(() => {
        const root = document.querySelector('.bt-assembly')
        return root.dataset.assemblyMode === 'cinematic' && Number(root.dataset.assemblyFrame) > 8 && root.dataset.assemblyFrame === root.dataset.assemblyTargetFrame
      }, null, { timeout: 15000 })
      entry.recovered = await sample(page)
      assertVisible(entry.recovered, 'Decoded target catches up')
      assert.equal(entry.recovered.pinCount, 1)
      const samples = await page.evaluate(() => { window.__resilienceMonitoring = false; return window.__resilienceSamples })
      entry.sampleCount = samples.length
      entry.blankSamples = samples.filter(item => !item.nonblank)
      entry.observedModes = [...new Set(samples.map(item => item.mode))]
      entry.minimumSampledVariance = Math.min(...samples.map(item => item.pixels.variance))
      assert.ok(samples.length > 5, 'Multiple actual rendering frames were sampled')
      assert.deepEqual(entry.blankSamples, [], 'No blank canvas or missing poster during seek/resize/recovery')
    } finally {
      hold = false
      release()
    }
  })

  await runCase('Live landscape to portrait to landscape manifest switching', {}, async (context, entry) => {
    const page = await openPage(context, entry)
    await ready(page, 'cinematic')
    entry.states = []
    for (const width of [1440, 390, 1440]) {
      const beforeRequests = entry.requests.manifests.length
      if (width !== page.viewportSize().width) await page.setViewportSize({ width, height: 900 })
      await ready(page, 'cinematic')
      await page.waitForFunction(mobile => {
        const source = document.querySelector('.bt-assembly-poster').currentSrc
        return source.includes('/cinematic/mobile/') === mobile
      }, width <= 600)
      await nativeSeek(page, 0.48)
      await page.waitForFunction(() => {
        const root = document.querySelector('.bt-assembly')
        return root.dataset.assemblyMode === 'cinematic' && root.dataset.assemblyFrame === root.dataset.assemblyTargetFrame
      })
      const state = await sample(page)
      assertVisible(state, `Viewport ${width}`)
      assert.equal(state.pinCount, 1, `Exactly one pin at ${width}`)
      const expectedManifest = `${mediaPath}${width <= 600 ? 'mobile/' : ''}manifest.json`
      assert.equal(entry.requests.manifests.at(-1), expectedManifest)
      if (entry.states.length) assert.ok(entry.requests.manifests.length > beforeRequests, 'Viewport crossing requested its corresponding manifest')
      entry.states.push({ width, manifest: expectedManifest, ...state })
    }
  })

  await runCase('Reduced motion loads a static poster without frame requests', { viewport: { width: 390, height: 900 }, reducedMotion: 'reduce' }, async (context, entry) => {
    const page = await openPage(context, entry)
    await ready(page, 'static')
    await page.waitForTimeout(600)
    entry.state = await sample(page)
    assertVisible(entry.state, 'Reduced-motion poster')
    assert.equal(entry.state.pinCount, 0)
    assert.equal(entry.requests.frames, 0, 'Reduced motion does not fetch cinematic frame files')
    assert.equal(await page.locator(rootSelector).getAttribute('data-reduced-motion'), 'true')
    entry.appointmentAnchorWorks = await assertContactAnchor(page)
  })

  for (const failure of ['manifest', 'frame']) {
    await runCase(`Missing ${failure} falls back to a visible poster and usable appointment anchor`, { viewport: { width: failure === 'manifest' ? 390 : 1440, height: 900 } }, async (context, entry) => {
      entry.injectedFailures = []
      const pattern = failure === 'manifest' ? /\/cinematic\/(?:mobile\/)?manifest\.json(?:\?|$)/ : /\/cinematic\/(?:mobile\/)?frame-0001\.webp(?:\?|$)/
      await context.route(pattern, async route => {
        entry.injectedFailures.push(new URL(route.request().url()).pathname)
        await route.fulfill({ status: 404, contentType: 'text/plain', body: 'Intentional local resilience fixture: unavailable asset' })
      })
      const page = await openPage(context, entry)
      await ready(page, 'static')
      entry.state = await sample(page)
      assertVisible(entry.state, `Missing ${failure} poster`)
      assert.ok(entry.injectedFailures.length > 0, 'Failure was actually injected')
      assert.equal(entry.state.pinCount, 0, 'Fallback removes pinning')
      assert.equal(entry.state.frame, -1)
      entry.appointmentAnchorWorks = await assertContactAnchor(page)
    })
  }
  assert.deepEqual(report.runtimeErrors, [], 'No uncaught browser runtime errors')
  report.status = 'passed'
  console.log('Cinematic resilience: all five focused cases passed.')
} catch (error) {
  report.status = 'failed'
  report.failure = error.stack || String(error)
  throw error
} finally {
  await writeFile(output, `${JSON.stringify(report, null, 2)}\n`)
  await browser.close()
}
