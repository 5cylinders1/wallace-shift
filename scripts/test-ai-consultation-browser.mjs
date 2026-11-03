import assert from 'node:assert/strict'
import { mkdir, readFile } from 'node:fs/promises'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
import { playwright } from '../videos/contractor-previews/runtime.mjs'

const widgetUrl = 'https://assets.calendly.com/assets/external/widget.js'
const widget = process.env.CALENDLY_TEST_WIDGET_PATH
  ? await readFile(process.env.CALENDLY_TEST_WIDGET_PATH, 'utf8')
  : `window.Calendly = { initInlineWidget({ url, parentElement }) {
      const frame = document.createElement('iframe')
      frame.src = url
      parentElement.append(frame)
    } }`
const payload = {
  event: { uri: 'https://api.calendly.com/scheduled_events/local-booking' },
  invitee: { uri: 'https://api.calendly.com/api/v2/scheduled_events/local-booking/invitees/local-visitor' },
}
const scheduled = { event: 'calendly.event_scheduled', payload }
function testServer(googleFallback) {
  return createServer({
    configFile: false, plugins: [react()], logLevel: 'error',
    define: { 'import.meta.env.VITE_CALENDLY_EVENT_URL': googleFallback ? '""' : 'undefined' },
    server: { host: '127.0.0.1', port: 0, hmr: false, open: false },
  })
}

async function finishQuiz(page) {
  const choose = label => page.getByText(label, { exact: true }).click()
  const next = () => page.getByRole('button', { name: 'Continue', exact: true }).click()
  await choose('We struggle to respond to inquiries quickly')
  await next()
  await choose('$250,000 to $999,999')
  await next()
  await choose('6 to 10 hours')
  await choose('Work or responses are delayed')
  await next()
  await choose('We have not explored it')
  await next()
  await page.getByLabel('Anything else we should understand about the work? (optional)').waitFor()
  await next()
  await choose('I own the business and can approve the purchase')
  await next()
  await choose('Yes, I can approve that investment')
  await choose('Now')
  await page.getByRole('button', { name: 'Send answers and see times' }).click()
}

async function check(browser, server, viewport, reducedMotion, googleFallback = false) {
  const page = await browser.newPage({ viewport, reducedMotion, serviceWorkers: 'block' })
  const origin = server.resolvedUrls.local[0]
  const errors = []
  let summaries = 0
  page.on('pageerror', err => errors.push(err.message))
  // Provider and API traffic stays in this test, even if real credentials exist in .env.local.
  await page.route('**/*', async route => {
    const target = new URL(route.request().url())
    if (target.href === widgetUrl) return route.fulfill({ contentType: 'application/javascript', body: widget })
    if (target.origin === 'https://calendar.google.com') return route.fulfill({ contentType: 'text/html', body: '<title>Local Google schedule</title>' })
    if (target.origin === 'https://calendly.com') return route.fulfill({ contentType: 'text/html', body: '<title>Local booking simulation</title><p>Consultation scheduler</p>' })
    if (target.origin !== new URL(origin).origin) return route.abort()
    if (target.pathname === '/api/ai-booking') {
      assert.equal(route.request().postDataJSON().action, 'quiz-summary')
      summaries++
      return route.fulfill({ json: { ok: true, notification: 'sent' } })
    }
    if (target.pathname === '/api/ai-checkout' && route.request().method() === 'GET') return route.fulfill({ json: { ok: true, ready: true } })
    if (target.pathname.startsWith('/api/')) return route.abort()
    await route.continue()
  })

  try {
    await page.goto(new URL('/offers/ai-business-integration', origin).href)
    await finishQuiz(page)
    if (googleFallback) {
      const link = page.getByRole('link', { name: /Open in Google Calendar/ })
      await link.waitFor()
      const googleFrame = page.getByTitle('Wallace Shift consultation times in Google Calendar')
      assert.equal(await googleFrame.getAttribute('src'), (await link.getAttribute('href')) + '?gv=true')
      assert.equal(await page.locator('video, .qf-walkthrough-offers').count(), 0)
      await page.getByRole('button', { name: 'Prefer a phone call without email?' }).click()
      await page.getByLabel('Phone number').waitFor()
      assert.equal(await page.locator('video, .qf-walkthrough-offers').count(), 0)
      assert.deepEqual(errors, [])
      console.log('Passed Google booking and phone fallback without a Calendly event URL.')
      return
    }
    const frame = await page.locator('.qf-booking-frame iframe').elementHandle().then(element => element.contentFrame())
    await frame.waitForURL(url => url.origin === 'https://calendly.com' && url.pathname === '/matthew-wallaceshift/consultation')
    const post = value => frame.evaluate(data => window.parent.postMessage(data, '*'), value)
    await post({ event: 'calendly.event_type_viewed' })
    await post({ event: 'calendly.date_and_time_selected' })
    await post({ event: 'calendly.popup_closed' })
    await post({ ...scheduled, payload: { event: payload.event } })
    // Correct shape with the wrong origin or from another frame must not advance.
    await page.evaluate(data => {
      const frameSource = document.querySelector('.qf-booking-frame iframe').contentWindow
      for (const [origin, source] of [['https://example.invalid', frameSource], ['https://calendly.com', window]]) {
        window.dispatchEvent(new MessageEvent('message', { data, origin, source }))
      }
    }, scheduled)
    await page.getByRole('heading', { name: 'Book your free consultation.' }).waitFor()
    assert.equal(await page.locator('video, .qf-walkthrough-offers').count(), 0)
    assert.equal(summaries, 1)

    await post(scheduled)
    const player = page.locator('.qf-walkthrough-player video')
    await player.waitFor()
    await page.waitForFunction(() => {
      const rect = document.querySelector('video').getBoundingClientRect()
      return document.activeElement?.id === 'qf-walkthrough-title' && rect.top >= 0 && rect.bottom <= innerHeight + 1
    })
    assert.equal(await page.locator('.qf-booking-frame, .qf-walkthrough-offers').count(), 0)
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
    if (process.env.CONSULTATION_TEST_SCREENSHOTS) {
      await mkdir(process.env.CONSULTATION_TEST_SCREENSHOTS, { recursive: true })
      await page.screenshot({ path: `${process.env.CONSULTATION_TEST_SCREENSHOTS}/confirmed-film-${viewport.width}.png` })
    }
    await player.evaluate(video => video.dispatchEvent(new Event('ended')))
    assert.equal(await page.locator('.qf-walkthrough-offers').count(), 0)
    await player.evaluate(async video => {
      video.muted = true
      video.playbackRate = 4
      await video.play()
    })
    assert.equal(await page.locator('.qf-walkthrough-offers').count(), 0)
    await page.getByRole('button', { name: 'Buy AI Inquiry Assistant' }).click()
    await page.getByRole('heading', { name: 'Complete your purchase.' }).waitFor()
    await page.getByRole('button', { name: 'Back to packages' }).click()
    await page.getByRole('button', { name: 'Buy AI Inquiry Assistant' }).waitFor()
    assert.equal(await page.locator('.qf-booking-frame').count(), 0)
    assert.deepEqual(errors, [])
    console.log(`Passed ${viewport.width}px booking, film, offers, and checkout return.`)
  } finally {
    await page.close()
  }
}

const { chromium } = await playwright()
const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  for (const googleFallback of [false, true]) {
    const server = await testServer(googleFallback)
    try {
      await server.listen()
      if (!googleFallback) {
        await check(browser, server, { width: 1280, height: 900 }, 'no-preference')
        await check(browser, server, { width: 390, height: 844 }, 'reduce')
      } else {
        await check(browser, server, { width: 390, height: 844 }, 'reduce', true)
      }
    } finally {
      await server.close()
    }
  }
} finally {
  await browser.close()
}
