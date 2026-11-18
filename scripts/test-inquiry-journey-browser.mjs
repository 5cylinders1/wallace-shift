/**
 * Focused scroll regression for the live local inquiry journey.
 * Start the app separately, then run: node scripts/test-inquiry-journey-browser.mjs
 * INQUIRY_JOURNEY_ORIGIN defaults to http://127.0.0.1:5186.
 * Evidence stays in /tmp (override INQUIRY_JOURNEY_REVIEW_DIR).
 * This test only scrolls and expands a local comparison; only Google Fonts are
 * allowed off-origin. API, chat and other remote traffic remain blocked.
 */
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { playwright } from '../videos/contractor-previews/runtime.mjs'

const origin = process.env.INQUIRY_JOURNEY_ORIGIN || 'http://127.0.0.1:5186'
assert.ok(['localhost', '127.0.0.1'].includes(new URL(origin).hostname), 'Use a local app only')
const output = process.env.INQUIRY_JOURNEY_REVIEW_DIR || '/tmp/wallace-shift-inquiry-journey-review'
await mkdir(output, { recursive: true })
const { chromium } = await playwright()
const results = []
let browser

async function frame(page, duration = 0) {
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  if (duration) await page.waitForTimeout(duration)
}

async function scrollTo(page, top) {
  await page.evaluate(value => window.scrollTo({ top: value, behavior: 'instant' }), top)
  await frame(page)
}

async function visualState(page) {
  return page.locator('#work').evaluate(root => {
    const element = selector => root.querySelector(selector)
    const style = selector => getComputedStyle(element(selector))
    const bounds = node => {
      const rect = node.getBoundingClientRect()
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, bottom: rect.bottom }
    }
    const visible = node => {
      const css = getComputedStyle(node)
      return css.visibility === 'visible' && css.display !== 'none' && Number(css.opacity) > .99
    }
    const matrix = selector => {
      const value = new DOMMatrixReadOnly(style(selector).transform)
      return { scaleX: value.a, scaleY: value.d, x: value.e, y: value.f }
    }
    const captions = [...root.querySelectorAll('.ij-caption-copy')]
    return {
      scrollY,
      viewport: { width: innerWidth, height: innerHeight },
      root: bounds(root),
      header: bounds(document.querySelector('.site-header')),
      heading: bounds(element('#inquiry-heading')),
      headingBar: bounds(element('.ij-heading')),
      scene: bounds(element('.ij-scene')),
      recipient: bounds(element('.ij-team-portrait')),
      record: {
        visible: visible(element('.ij-record')),
        opacity: Number(style('.ij-record').opacity),
        transform: matrix('.ij-record'),
        bounds: bounds(element('.ij-record')),
        text: element('.ij-record').textContent,
      },
      email: { visible: visible(element('.ij-email-example')), opacity: Number(style('.ij-email-example').opacity), transform: matrix('.ij-email-example') },
      dockOpacity: Number(style('.ij-envelope-dock').opacity),
      travelerOpacity: Number(style('.ij-traveler').opacity),
      routesVisible: style('.ij-route-lines').display !== 'none',
      routeOffsets: [...root.querySelectorAll('.ij-route-ink')].map(path => Number.parseFloat(getComputedStyle(path).strokeDashoffset)),
      badgeOpacity: Number(style('.ij-team-badge').opacity),
      deliveredEnvelopeFill: style('.ij-portrait-envelope').fill,
      optionIconColors: [...root.querySelectorAll('.ij-delivery-options li svg')].map(icon => getComputedStyle(icon).color),
      captions: captions.map((node, index) => ({ index, visible: visible(node), ariaHidden: node.getAttribute('aria-hidden'), title: node.querySelector('h3').textContent })),
      explanations: [...root.querySelectorAll('.ij-explanation-copy')].map(node => ({ visible: visible(node), text: node.textContent })),
      stage: root.dataset.stage,
      counter: element('.ij-progress-count').textContent,
      overflow: root.scrollWidth > root.clientWidth + 1 || document.documentElement.scrollWidth > innerWidth + 1,
      held: element('.ij-scroll-track').dataset.held,
      storyPosition: style('.ij-story').position,
      pinSpacers: root.querySelectorAll('.pin-spacer').length,
    }
  })
}

function assertHeading(state, label) {
  assert.ok(state.heading.y >= state.header.bottom - 1, `${label}: heading clears navigation (${state.heading.y} >= ${state.header.bottom})`)
  assert.ok(state.heading.bottom <= state.viewport.height + 1, `${label}: whole heading stays in the viewport`)
  assert.ok(state.heading.width > 0 && state.heading.height > 0, `${label}: heading is rendered`)
}

function identity(matrix, label) {
  assert.ok(Math.abs(matrix.scaleX - 1) < .01 && Math.abs(matrix.scaleY - 1) < .01, `${label}: content remains fully expanded`)
  assert.ok(Math.abs(matrix.x) < 1 && Math.abs(matrix.y) < 1, `${label}: content is at its final position`)
}

function assertComplete(state, label, reduced = false) {
  assert.ok(state.record.visible && state.record.opacity >= .99, `${label}: complete lead card is visible`)
  identity(state.record.transform, `${label}: lead card`)
  assert.ok(state.record.bounds.width > 180 && state.record.bounds.height > 250, `${label}: lead card has its full visual footprint`)
  assert.match(state.record.text, /Alex Morgan.*123 Example Lane.*Contact and project details together/s, `${label}: full lead details are present`)
  assert.ok(state.email.visible && state.email.opacity >= .99, `${label}: confirmation email remains visible`)
  identity(state.email.transform, `${label}: confirmation email`)
  assert.ok(state.dockOpacity <= .01, `${label}: unopened envelope dock stays hidden`)
  assert.ok(state.travelerOpacity <= .01, `${label}: moving envelope is no longer floating over the completed scene`)
  assert.ok(state.badgeOpacity >= .99, `${label}: delivery badge is visible`)
  assert.equal(state.deliveredEnvelopeFill, 'rgb(23, 92, 153)', `${label}: recipient holds the delivered blue envelope`)
  assert.ok(state.optionIconColors.every(color => color === 'rgb(23, 92, 153)'), `${label}: delivery options retain their completed color`)
  assert.equal(state.stage, '3', `${label}: third stage is retained`)
  assert.equal(state.overflow, false, `${label}: no horizontal overflow`)
  if (reduced) {
    assert.ok(state.captions.every(item => item.visible), `${label}: reduced motion exposes every step as static text`)
    assert.ok(state.explanations.every(item => item.visible), `${label}: reduced motion exposes every explanation`)
    assert.equal(state.routesVisible, false, `${label}: reduced motion hides animated paths`)
    assert.equal(state.pinSpacers, 0, `${label}: reduced motion does not pin the story`)
    assert.notEqual(state.storyPosition, 'fixed', `${label}: reduced motion uses normal scrolling`)
  } else {
    assert.deepEqual(state.captions.filter(item => item.visible).map(item => item.title), ['Put it in the right hands.'], `${label}: final caption is the only visible step`)
    assert.ok(state.explanations[2].visible && !state.explanations[0].visible && !state.explanations[1].visible, `${label}: final explanation is visible`)
    assert.ok(state.routeOffsets.every(offset => Number.isFinite(offset) && Math.abs(offset) <= 1), `${label}: both connector paths remain fully drawn`)
    assert.equal(state.counter.trim(), '03 / 03', `${label}: completed progress is shown`)
  }
}

async function capture(page, key, name) {
  await page.screenshot({ path: `${output}/${key}-${name}.png` })
}

async function bringIntoView(page, selector) {
  const top = await page.locator(selector).evaluate(element => {
    const header = document.querySelector('.site-header').getBoundingClientRect()
    const heading = document.querySelector('.ij-heading').getBoundingClientRect()
    const headingSpace = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : heading.height
    return scrollY + element.getBoundingClientRect().top - header.height - headingSpace - 16
  })
  await scrollTo(page, top)
  await frame(page, 220)
}

async function run(viewport, reducedMotion = 'no-preference') {
  const key = `${viewport.width}x${viewport.height}-${reducedMotion}`
  const page = await browser.newPage({ viewport, reducedMotion, serviceWorkers: 'block' })
  const errors = []
  const checkpoints = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => {
    if (/hydrat|Minified React error #(?:418|419|421|423|425)/i.test(message.text())) errors.push(message.text())
  })
  await page.route('**/*', route => {
    const url = new URL(route.request().url())
    if (['https://fonts.googleapis.com', 'https://fonts.gstatic.com'].includes(url.origin)) return route.continue()
    if (url.origin !== new URL(origin).origin || url.pathname.startsWith('/api/')) return route.abort()
    return route.continue()
  })
  try {
    await page.goto(new URL('/', origin).href, { waitUntil: 'networkidle' })
    await page.locator('#work #inquiry-heading').waitFor()
    await page.evaluate(async () => { await document.fonts.ready })
    await frame(page, 300)
    const initial = await visualState(page)
    const start = Math.max(0, initial.scrollY + initial.root.y - viewport.height * .6)
    let firstStageScroll = start

    if (reducedMotion === 'reduce') {
      await bringIntoView(page, '#inquiry-heading')
      const state = await visualState(page)
      assertComplete(state, `${key}: initial static layout`, true)
      assertHeading(state, `${key}: static heading`)
      await capture(page, key, 'static-heading')
      firstStageScroll = state.scrollY
    } else {
      const seen = new Set()
      const increment = Math.max(60, Math.round(viewport.height / 12))
      let passed = false
      for (let i = 0; i < 160; i++) {
        await scrollTo(page, start + i * increment)
        let state = await visualState(page)
        assert.equal(state.overflow, false, `${key}: no overflow during scroll`)
        const active = state.captions.filter(item => item.visible)
        const stage = active.length === 1 ? active[0].index + 1 : null
        const sceneOnScreen = state.scene.y < viewport.height && state.scene.bottom > state.header.bottom
        const unfinished = state.routeOffsets.some(offset => Math.abs(offset) > 1) || state.travelerOpacity > .01
        if (sceneOnScreen && unfinished) assertHeading(state, `${key}: active stage ${stage}`)
        const stableStage = stage === 1 ? state.record.opacity <= .01 && state.dockOpacity >= .99 : state.record.opacity >= .99
        if (sceneOnScreen && stableStage && stage && !seen.has(stage)) {
          await frame(page, 220)
          state = await visualState(page)
          assertHeading(state, `${key}: stage ${stage}`)
          seen.add(stage)
          if (stage === 1) firstStageScroll = state.scrollY
          checkpoints.push({ name: `stage-${stage}`, ...state })
          await capture(page, key, `stage-${stage}`)
        }
        if (state.root.bottom < -32) { passed = true; break }
      }
      assert.equal(passed, true, `${key}: scroll traversal passed the whole journey`)
      assert.deepEqual([...seen], [1, 2, 3], `${key}: first pass visibly progresses through all three steps`)
    }

    const end = await visualState(page)
    await scrollTo(page, end.scrollY + end.root.bottom + 100)
    await frame(page, 220)
    assertComplete(await visualState(page), `${key}: after passing`, reducedMotion === 'reduce')
    await scrollTo(page, firstStageScroll)
    await frame(page, 220)
    const returned = await visualState(page)
    assertHeading(returned, `${key}: return to beginning`)
    assertComplete(returned, `${key}: return to beginning`, reducedMotion === 'reduce')
    checkpoints.push({ name: 'returned-complete', ...returned })
    await capture(page, key, 'returned-complete')

    // On narrow screens the card and recipient cannot share a viewport.
    // Bring each into view so evidence captures the actual completed artwork.
    for (const [selector, name] of [['.ij-record', 'completed-record'], ['.ij-team-portrait', 'completed-recipient']]) {
      await bringIntoView(page, selector)
      const state = await visualState(page)
      if (reducedMotion !== 'reduce') assertHeading(state, `${key}: ${name}`)
      assertComplete(state, `${key}: ${name}`, reducedMotion === 'reduce')
      const artwork = selector === '.ij-record' ? state.record.bounds : state.recipient
      const top = reducedMotion === 'reduce' ? state.header.bottom : state.headingBar.bottom
      assert.ok(artwork.y >= top - 1 && artwork.bottom <= state.viewport.height + 1, `${key}: ${name} is actually in view below the header`)
      await capture(page, key, name)
    }

    // Expanding content above the journey invokes its real ResizeObserver /
    // ScrollTrigger refresh path, without importing or mutating animation state.
    const comparison = page.locator('#compare').getByRole('button', { name: 'Show all package details', exact: true })
    await comparison.evaluate(button => button.click())
    await frame(page, 350)
    await bringIntoView(page, '.ij-record')
    assertComplete(await visualState(page), `${key}: upstream layout refresh`, reducedMotion === 'reduce')
    await capture(page, key, 'after-layout-refresh')

    const resized = viewport.width > 900 ? { width: 768, height: 1024 } : { width: 1024, height: 900 }
    await page.setViewportSize(resized)
    await frame(page, 350)
    await bringIntoView(page, '.ij-record')
    assertComplete(await visualState(page), `${key}: changed layout breakpoint`, reducedMotion === 'reduce')
    await capture(page, key, 'after-breakpoint-resize')
    await page.setViewportSize(viewport)
    await frame(page, 350)
    await bringIntoView(page, '.ij-record')
    assertComplete(await visualState(page), `${key}: original viewport restored`, reducedMotion === 'reduce')

    if (viewport.width > 900 && reducedMotion !== 'reduce') {
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await frame(page, 250)
      await bringIntoView(page, '.ij-record')
      assertComplete(await visualState(page), `${key}: reduce motion after completion`, true)
      await page.emulateMedia({ reducedMotion: 'no-preference' })
      await frame(page, 250)
      await bringIntoView(page, '.ij-record')
      assertComplete(await visualState(page), `${key}: restore motion after completion`)
    }
    assert.deepEqual(errors, [], `${key}: runtime errors`)
    results.push({ viewport, reducedMotion, passed: true, checkpoints })
    console.log(`PASS ${key}: heading clearance, ${reducedMotion === 'reduce' ? 'static reading order' : 'three visible steps'}, completed artwork after return, layout refresh and resize.`)
  } catch (error) {
    await capture(page, key, 'failure').catch(() => {})
    results.push({ viewport, reducedMotion, passed: false, error: error.message, state: await visualState(page).catch(() => null), checkpoints })
    throw error
  } finally { await page.close() }
}

try {
  browser = await chromium.launch({ channel: 'chrome', headless: true })
  await run({ width: 1440, height: 1100 })
  await run({ width: 1440, height: 900 })
  await run({ width: 1720, height: 978 })
  await run({ width: 768, height: 1024 })
  await run({ width: 390, height: 844 })
  await run({ width: 1440, height: 1000 }, 'reduce')
  await run({ width: 390, height: 844 }, 'reduce')
  console.log(`Inquiry journey checks passed. Evidence: ${output}`)
} finally {
  await writeFile(`${output}/results.json`, JSON.stringify({ origin, results, note: 'Local browser rendering with Google Fonts allowed; API, chat and other remote requests blocked. No inquiries or bookings submitted.' }, null, 2))
  await browser?.close()
}
