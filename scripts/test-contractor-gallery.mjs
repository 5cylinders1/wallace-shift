/** Public gallery browser acceptance checks.
 *
 *   node scripts/test-contractor-gallery.mjs
 *   BASE_URL=https://contractors.wallaceshift.com/ node scripts/test-contractor-gallery.mjs
 *
 * Uses an unauthenticated Chrome context and existing bundled Playwright.
 * PREVIEW_IDS=velar permits an explicitly reported partial pilot check.
 * Results are lab observations from this browser run, not field Web Vitals
 * or evidence of representative-buyer testing.
 */
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { playwright } from '../videos/contractor-previews/runtime.mjs'
import { contractorOpenDemoIds, contractorPreviewIds } from './contractor-preview-contract.mjs'

const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:5176/demos/contractors/'
const output = resolve(process.env.OUTPUT_DIR || 'output/contractor-previews')
const ids = process.env.PREVIEW_IDS ? process.env.PREVIEW_IDS.split(',') : contractorPreviewIds
for (const id of ids) assert(contractorPreviewIds.includes(id), `Unknown preview ID: ${id}`)
const names = {
  northvane: 'Northvane Roofing', 'alder-stone': 'Alder & Stone', contour: 'Contour Roofing',
  halcyon: 'Halcyon Roofworks', velar: 'Velar Roof Atelier', stratum: 'Stratum Roofing Co.',
  datum: 'Datum', tambour: 'Tambour', mitre: 'Mitre & Rift', stillwater: 'Stillwater Pool Co.',
  'roofing-crm': 'Roofing CRM workspace', trawsome: 'Trawsome Lawn Care',
}
const openDemoPaths = { trawsome: { local: '/demos/lawn/', production: '/trawsome' } }
const report = {
  target: baseUrl, recordedAt: new Date().toISOString(), mode: 'unauthenticated browser lab',
  viewport: { desktop: { width: 1440, height: 1000 }, mobile: { width: 390, height: 844 } },
  expectedInventory: contractorPreviewIds, openDemos: contractorOpenDemoIds, testedPreviewIds: ids, completeInventoryRun: ids.length === contractorPreviewIds.length,
  checks: [], navigation: {}, previews: [], mobile: {}, errors: [],
  accessibilityScope: 'DOM semantics, keyboard operation, native modal focus containment and Playwright ARIA snapshots. No axe installation or human screen-reader session.',
  audioScope: 'Checks audible player settings and decoded audio bytes where Chrome exposes them. The separate media test verifies an audio stream and measured loudness; neither establishes narration quality or a human listening review.',
  buyerEvaluation: { status: 'not performed', reason: 'Representative contractor buyers were not available in this automated browser run.' },
  metricLimitations: 'LCP/CLS and transferred bytes are one local or deployed lab navigation, without network/CPU throttling. They do not establish real-user p75 Core Web Vitals. Video start measures click to decoded playback in this browser.',
}
await mkdir(output, { recursive: true })
const { chromium } = await playwright()
const browser = await chromium.launch({ channel: 'chrome', headless: true })

function check(name, condition, details) {
  report.checks.push({ name, passed: !!condition, ...(details === undefined ? {} : { details }) })
  assert(condition, name)
}
async function attachMetrics(page) {
  await page.addInitScript(() => {
    window.__galleryMetrics = { lcp: null, cls: 0, supported: PerformanceObserver.supportedEntryTypes }
    if (PerformanceObserver.supportedEntryTypes.includes('largest-contentful-paint')) {
      new PerformanceObserver(list => {
        for (const entry of list.getEntries()) window.__galleryMetrics.lcp = entry.startTime
      }).observe({ type: 'largest-contentful-paint', buffered: true })
    }
    if (PerformanceObserver.supportedEntryTypes.includes('layout-shift')) {
      new PerformanceObserver(list => {
        for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__galleryMetrics.cls += entry.value
      }).observe({ type: 'layout-shift', buffered: true })
    }
  })
}
async function playPreview(page, id, record = true) {
  const card = page.getByRole('article').filter({ has: page.getByRole('heading', { name: names[id], exact: true }) })
  const trigger = card.getByRole('button', { name: 'Watch demo', exact: true })
  const durationLabel = (await card.locator('.ct-video-duration').innerText()).trim()
  check(`${id}: readable duration label`, /^\d+:\d{2}$/.test(durationLabel), durationLabel)
  const [minutes, seconds] = durationLabel.split(':').map(Number)
  const expectedDuration = minutes * 60 + seconds
  await trigger.scrollIntoViewIfNeeded()
  const clickedAt = performance.now()
  await trigger.click()
  const dialog = page.getByRole('dialog')
  await dialog.waitFor({ state: 'visible' })
  const video = dialog.locator('video')
  await page.waitForFunction(() => {
    const element = document.querySelector('dialog video')
    return element instanceof HTMLVideoElement && !element.paused && element.currentTime > 0 && element.readyState >= 2
  }, null, { timeout: 30000 })
  const clickToPlayingMs = performance.now() - clickedAt
  const metrics = await video.evaluate(element => ({
    source: new URL(element.currentSrc).pathname, durationSeconds: element.duration,
    currentTime: element.currentTime, videoWidth: element.videoWidth, videoHeight: element.videoHeight,
    decodedFrames: element.getVideoPlaybackQuality().totalVideoFrames,
    droppedFrames: element.getVideoPlaybackQuality().droppedVideoFrames,
    muted: element.muted, defaultMuted: element.defaultMuted, volume: element.volume, controls: element.controls,
    decodedAudioBytes: typeof element.webkitAudioDecodedByteCount === 'number' ? element.webkitAudioDecodedByteCount : null,
    captionTracks: [...element.querySelectorAll('track')].map(track => ({ kind: track.kind, source: new URL(track.src).pathname, language: track.srclang })),
  }))
  check(`${id}: expected public source`, metrics.source === `/media/demo-previews/${id}.mp4`, metrics.source)
  check(`${id}: one mounted player`, await page.locator('video').count() === 1)
  check(`${id}: decoded video frames`, metrics.decodedFrames > 0 && metrics.videoWidth > 0)
  check(`${id}: duration matches displayed label`, Math.abs(metrics.durationSeconds - expectedDuration) < 1.1, { durationLabel, actualSeconds: metrics.durationSeconds })
  check(`${id}: Watch starts with sound enabled`, !metrics.muted && !metrics.defaultMuted && metrics.volume > 0)
  check(`${id}: native playback and volume controls available`, metrics.controls)
  if (metrics.decodedAudioBytes !== null) check(`${id}: audio decoded during playback`, metrics.decodedAudioBytes > 0, metrics.decodedAudioBytes)
  check(`${id}: English caption track`, metrics.captionTracks.some(track => track.language === 'en' && track.source === `/media/demo-previews/${id}.vtt`))
  check(`${id}: optional interactive access`, await dialog.getByRole('link', { name: 'Request interactive access' }).count() === 1)
  if (record) report.previews.push({ id, durationLabel, clickToPlayingMs: Math.round(clickToPlayingMs), ...metrics })
  await page.keyboard.press('Escape')
  await dialog.waitFor({ state: 'detached' })
  check(`${id}: Escape removes player`, await page.locator('video').count() === 0)
  check(`${id}: focus restored to Watch`, await trigger.evaluate(element => document.activeElement === element))
  return { clickToPlayingMs: Math.round(clickToPlayingMs), ...metrics }
}

try {
  const context = await browser.newContext({ viewport: report.viewport.desktop })
  const page = await context.newPage()
  const mp4Requests = []
  const browserErrors = []
  page.on('request', request => { if (/\.mp4(?:\?|$)/.test(request.url())) mp4Requests.push(new URL(request.url()).pathname) })
  page.on('pageerror', error => browserErrors.push(error.message))
  const cdp = await context.newCDPSession(page)
  let transferredBytes = 0
  await cdp.send('Network.enable')
  cdp.on('Network.loadingFinished', event => { transferredBytes += event.encodedDataLength })
  await attachMetrics(page)
  const response = await page.goto(baseUrl, { waitUntil: 'networkidle' })
  await page.getByRole('heading', { name: 'Connect the first inquiry to the work ahead.' }).waitFor()
  await page.waitForTimeout(1000)
  report.navigation = await page.evaluate(() => ({
    lcpMs: window.__galleryMetrics.lcp,
    cls: window.__galleryMetrics.cls,
    domContentLoadedMs: performance.getEntriesByType('navigation')[0]?.domContentLoadedEventEnd,
    loadMs: performance.getEntriesByType('navigation')[0]?.loadEventEnd,
    resources: performance.getEntriesByType('resource').map(entry => ({ name: entry.name, transferSize: entry.transferSize, encodedBodySize: entry.encodedBodySize })),
  }))
  report.navigation.cdpTransferredBytesAtIdle = transferredBytes
  report.navigation.initialMp4Requests = [...mp4Requests]
  check('Public gallery returns HTTP 200', response?.status() === 200, response?.status())
  check('No authentication cookie supplied', (await context.cookies()).length === 0)
  check('Every individual card present', await page.getByRole('article').count() === contractorPreviewIds.length + contractorOpenDemoIds.length)
  for (const id of [...contractorPreviewIds, ...contractorOpenDemoIds]) check(`${id}: inventory card exists`, await page.getByRole('article').filter({ has: page.getByRole('heading', { name: names[id], exact: true }) }).count() === 1)
  check('All six roofing concepts in roofing category', await page.locator('#category-roofing article').count() === 6)
  check('CRM separately categorized', await page.locator('#category-business article').count() === 1 && await page.locator('#category-business').getByRole('heading', { name: names['roofing-crm'], exact: true }).count() === 1)
  check('No initial video requests', mp4Requests.length === 0, mp4Requests)
  check('No initial mounted video elements', await page.locator('video').count() === 0)
  check('Six category jump links', await page.getByRole('navigation', { name: 'Browse demos by trade' }).getByRole('link').count() === 6)
  for (const id of contractorOpenDemoIds) {
    const card = page.getByRole('article').filter({ has: page.getByRole('heading', { name: names[id], exact: true }) })
    const expectedPath = new URL(baseUrl).hostname === 'contractors.wallaceshift.com' ? openDemoPaths[id].production : openDemoPaths[id].local
    check(`${id}: open tile has no film or access request`, await card.getByRole('button', { name: 'Watch demo' }).count() === 0 && await card.getByRole('link', { name: 'Request interactive access' }).count() === 0)
    check(`${id}: open tile links to the public demo`, await card.getByRole('link', { name: 'Open the demo' }).getAttribute('href') === expectedPath && await card.getByRole('link', { name: `Open the ${names[id]} demo` }).getAttribute('href') === expectedPath)
    check(`${id}: open tile discloses a real-business concept`, /real local business/.test(await card.locator('.ct-demo-note').innerText()))
    const poster = card.locator('img')
    await poster.scrollIntoViewIfNeeded()
    check(`${id}: open tile poster loads without access`, await poster.evaluate(image => image.complete && image.naturalWidth > 0 || new Promise(done => {
      image.addEventListener('load', () => done(image.naturalWidth > 0), { once: true })
      image.addEventListener('error', () => done(false), { once: true })
      setTimeout(() => done(false), 10000)
    })))
  }
  check('Every poster has descriptive alt text', await page.locator('article img').evaluateAll(images => images.every(image => image.alt.trim().length > 12)))
  for (const category of ['pools', 'lawn', 'foundation', 'business']) check(`${category}: single-item navigation absent`, await page.locator(`#category-${category} .ct-slider-controls`).count() === 0)
  const roofRow = page.locator('#slider-roofing')
  await roofRow.scrollIntoViewIfNeeded()
  check('Roofing row visibly overflows', await roofRow.evaluate(row => row.scrollWidth > row.clientWidth + 100))
  check('Desktop next-card peek visible', await roofRow.evaluate(row => {
    const boundary = row.getBoundingClientRect()
    return [...row.children].some(card => { const box = card.getBoundingClientRect(); return box.left < boundary.right - 8 && box.right > boundary.right + 8 })
  }))
  for (let index = 0; index < 7; index++) {
    const next = page.getByRole('button', { name: 'Next roofing demo', exact: true })
    if (await next.isDisabled()) break
    await next.click()
    await page.waitForTimeout(650)
  }
  check('Last roofing card reachable by arrow', await page.locator('#category-roofing article').last().evaluate(card => {
    const box = card.getBoundingClientRect(); const row = card.closest('.ct-slider').getBoundingClientRect()
    return box.right <= row.right + 4 && box.left >= row.left - 4
  }))
  check('Next arrow disabled at end', await page.getByRole('button', { name: 'Next roofing demo', exact: true }).isDisabled())
  await roofRow.focus()
  const previousScroll = await roofRow.evaluate(row => row.scrollLeft)
  await page.keyboard.press('ArrowLeft')
  await page.waitForTimeout(650)
  check('Focused row supports keyboard arrows', await roofRow.evaluate(row => row.scrollLeft) < previousScroll - 20)
  await page.screenshot({ path: resolve(output, 'gallery-desktop.png'), fullPage: true })
  await writeFile(resolve(output, 'gallery-desktop.aria.txt'), await page.locator('body').ariaSnapshot())
  for (const id of ids) await playPreview(page, id)
  if (ids.includes('velar')) {
    await page.getByRole('article').filter({ has: page.getByRole('heading', { name: names.velar, exact: true }) }).getByRole('button', { name: 'Watch demo', exact: true }).click()
    const dialog = page.getByRole('dialog')
    await dialog.waitFor({ state: 'visible' })
    let focusContained = true
    for (const key of ['Tab', 'Shift+Tab']) {
      for (let index = 0; index < 12; index++) {
        await page.keyboard.press(key)
        focusContained &&= await dialog.evaluate(element => element.contains(document.activeElement))
      }
    }
    check('Native modal retains keyboard focus', focusContained)
    const snapshot = await dialog.ariaSnapshot()
    check('Modal ARIA snapshot names film and Close', snapshot.includes('Velar Roof Atelier') && snapshot.includes('Close demo preview'))
    await writeFile(resolve(output, 'gallery-modal.aria.txt'), snapshot)
    await page.screenshot({ path: resolve(output, 'gallery-modal.png') })
    await dialog.getByRole('button', { name: 'Close demo preview' }).click()
    check('Close button removes active video', await page.locator('video').count() === 0)
  }
  check('No uncaught gallery JavaScript errors', browserErrors.length === 0, browserErrors)
  await context.close()

  const mobileContext = await browser.newContext({ viewport: report.viewport.mobile, isMobile: true, hasTouch: true, deviceScaleFactor: 1, reducedMotion: 'reduce' })
  const mobile = await mobileContext.newPage()
  const mobileMp4 = []
  mobile.on('request', request => { if (/\.mp4(?:\?|$)/.test(request.url())) mobileMp4.push(new URL(request.url()).pathname) })
  await mobile.goto(baseUrl, { waitUntil: 'networkidle' })
  check('390px layout has no document overflow', await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
  check('Mobile browsing requests no videos', mobileMp4.length === 0)
  check('Reduced-motion preference applied', await mobile.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches && getComputedStyle(document.documentElement).scrollBehavior === 'auto'))
  const mobileRow = mobile.locator('#slider-roofing')
  await mobileRow.scrollIntoViewIfNeeded()
  const poster = mobile.locator('#category-roofing .ct-demo-image').first()
  const box = await poster.boundingBox()
  assert(box, 'Mobile poster has bounds')
  const mobileCdp = await mobileContext.newCDPSession(mobile)
  const swipeY = Math.max(100, Math.min(700, box.y + box.height / 2))
  await mobileCdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 340, y: swipeY }] })
  for (let step = 1; step <= 10; step++) {
    await mobileCdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 340 - step * 27, y: swipeY }] })
    await mobile.waitForTimeout(25)
  }
  await mobileCdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await mobile.waitForTimeout(700)
  report.mobile.touchScrollLeft = await mobileRow.evaluate(row => row.scrollLeft)
  check('Mobile touch swipe advances roofing row', report.mobile.touchScrollLeft > 30, report.mobile.touchScrollLeft)
  report.mobile.minimumSummaryFontPx = await mobile.locator('.ct-demo-summary').evaluateAll(elements => Math.min(...elements.map(element => parseFloat(getComputedStyle(element).fontSize))))
  check('Mobile card text remains at least 14px', report.mobile.minimumSummaryFontPx >= 14)
  await mobile.screenshot({ path: resolve(output, 'gallery-mobile.png'), fullPage: true })
  if (ids.includes('velar')) report.mobile.preview = await playPreview(mobile, 'velar', false)
  await mobileContext.close()
  report.passed = true
} catch (error) {
  report.passed = false
  report.errors.push(error.stack || error.message)
  process.exitCode = 1
} finally {
  await browser.close()
  await writeFile(resolve(output, 'gallery-verification.json'), `${JSON.stringify(report, null, 2)}\n`)
  console.log(JSON.stringify({ passed: report.passed, checks: report.checks.length, previews: report.previews.length, completeInventoryRun: report.completeInventoryRun, report: resolve(output, 'gallery-verification.json'), errors: report.errors }, null, 2))
}
