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
function testServer(eventUrlOverride) {
  return createServer({
    configFile: false, plugins: [react()], logLevel: 'error',
    define: { 'import.meta.env.VITE_CALENDLY_EVENT_URL': JSON.stringify(eventUrlOverride) ?? 'undefined' },
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

async function check(browser, server, viewport, reducedMotion, directFallback = false) {
  const page = await browser.newPage({ viewport, reducedMotion, serviceWorkers: 'block' })
  const origin = server.resolvedUrls.local[0]
  const errors = []
  let summaries = 0
  const setupRequests = []
  page.on('pageerror', err => errors.push(err.message))
  // Provider and API traffic stays in this test, even if real credentials exist in .env.local.
  await page.route('**/*', async route => {
    const target = new URL(route.request().url())
    if (target.href === widgetUrl) return route.fulfill({ contentType: 'application/javascript', body: widget })
    if (target.origin === 'https://calendly.com') return route.fulfill({ contentType: 'text/html', body: '<title>Local booking simulation</title><p>Consultation scheduler</p>' })
    if (target.origin !== new URL(origin).origin) return route.abort()
    if (target.pathname === '/api/ai-booking') {
      assert.equal(route.request().postDataJSON().action, 'quiz-summary')
      summaries++
      return route.fulfill({ json: { ok: true, notification: 'sent' } })
    }
    if (target.pathname === '/api/ai-checkout' && route.request().method() === 'GET') return route.fulfill({ json: { ok: true, ready: true } })
    if (target.pathname === '/api/ai-checkout' && route.request().method() === 'POST') {
      const request = route.request().postDataJSON()
      assert.equal(request.action, 'send-code')
      setupRequests.push(request)
      return route.fulfill({ json: { ok: true } })
    }
    if (target.pathname.startsWith('/api/')) return route.abort()
    await route.continue()
  })

  try {
    await page.goto(new URL('/offers/ai-business-integration', origin).href)
    await finishQuiz(page)
    if (directFallback) {
      const link = page.getByRole('link', { name: /Open calendar in a new tab/ })
      await link.waitFor()
      assert.equal(await link.getAttribute('href'), 'https://calendly.com/matthew-wallaceshift/consultation')
      assert.equal(await link.getAttribute('target'), '_blank')
      assert.deepEqual(new Set((await link.getAttribute('rel')).split(/\s+/)), new Set(['noopener', 'noreferrer']))
      assert.match(await page.locator('.qf-booking-instruction').innerText(), /free 30 minute Google Meet/)
      assert.equal(await page.locator('iframe, video, .qf-walkthrough-offers').count(), 0)
      await page.getByRole('button', { name: 'Prefer a phone call without email?' }).click()
      await page.getByLabel('Phone number').waitFor()
      assert.equal(await page.getByText(/Share your details to arrange a free 30 minute phone call/).isVisible(), true)
      assert.equal(await page.locator('video, .qf-walkthrough-offers').count(), 0)
      assert.deepEqual(errors, [])
      console.log('Passed direct 30 minute Calendly booking and phone fallback without a valid embed URL.')
      return
    }
    assert.match(await page.locator('.qf-booking-instruction').innerText(), /free 30 minute Google Meet/)
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
    await page.getByRole('button', { name: 'Request free month', exact: true }).waitFor()
    assert.equal(await page.locator('.qf-walkthrough-package').count(), 1)
    const offers = page.locator('.qf-walkthrough-offers')
    assert.equal(await offers.getByRole('radio').count(), 3)
    assert.equal(await offers.getByRole('radio', { name: /\$750 monthly/ }).isChecked(), true)
    assert.equal(await offers.getByText(/100 phone minutes and 500 AI replies included\. Each AI call is limited to 15 minutes/).isVisible(), true)
    assert.equal(await offers.getByText(/A payment card and your authorization are required before the free month starts/).isVisible(), true)
    await offers.getByRole('radio', { name: /\$4,050 every six months/ }).check()
    assert.equal(await offers.getByText(/Free business website included/).count(), 0)
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
    if (process.env.CONSULTATION_TEST_SCREENSHOTS) await page.screenshot({ path: `${process.env.CONSULTATION_TEST_SCREENSHOTS}/subscription-offer-${viewport.width}.png`, fullPage: true })
    await page.getByRole('button', { name: 'Request free month', exact: true }).click()
    await page.getByRole('heading', { name: 'Request your free month.' }).waitFor()
    assert.equal(await page.getByRole('radio', { name: /\$4,050 every six months/ }).isChecked(), true)
    assert.equal(await page.getByText(/^Trial: 100 phone minutes and 500 AI replies/).isVisible(), true)
    await page.getByLabel('Your full legal name').fill('Sample Buyer')
    await page.getByLabel('Legal business name').fill('Sample Business')
    await page.getByLabel('Email address', { exact: true }).fill('buyer@example.test')
    await page.getByLabel('I am authorized to arrange this service for the business.').check()
    await page.getByRole('button', { name: 'Send verification code' }).click()
    await page.getByLabel('Verification code').waitFor()
    assert.equal(setupRequests.length, 1)
    assert.equal(setupRequests[0].packageId, 'assistant')
    assert.equal(setupRequests[0].interval, 'six_months')
    assert.equal(Object.hasOwn(setupRequests[0], 'amount'), false, 'The server determines the recurring amount.')
    await page.getByRole('radio', { name: /\$7,200 every twelve months/ }).check()
    assert.equal(await page.getByLabel('Verification code').count(), 0, 'Changing the interval invalidates the old verification step.')
    assert.equal(await page.getByLabel('Email address', { exact: true }).inputValue(), 'buyer@example.test')
    await page.getByRole('button', { name: 'Send verification code' }).click()
    await page.getByLabel('Verification code').waitFor()
    assert.equal(setupRequests.length, 2)
    assert.equal(setupRequests[1].interval, 'yearly')
    assert.notEqual(setupRequests[1].submissionId, setupRequests[0].submissionId)
    if (process.env.CONSULTATION_TEST_SCREENSHOTS) await page.screenshot({ path: `${process.env.CONSULTATION_TEST_SCREENSHOTS}/subscription-request-${viewport.width}.png`, fullPage: true })
    await page.getByRole('button', { name: 'Back to offer' }).click()
    await page.getByRole('button', { name: 'Request free month', exact: true }).waitFor()
    assert.equal(await page.getByRole('radio', { name: /\$7,200 every twelve months/ }).isChecked(), true)
    assert.equal(await page.locator('.qf-booking-frame').count(), 0)
    assert.deepEqual(errors, [])
    console.log(`Passed ${viewport.width}px booking, single bundle, prepaid intervals, verification reset, and checkout return.`)
  } finally {
    await page.close()
  }
}

async function checkCalendarRecovery(browser, server, failure) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' })
  const origin = new URL(server.resolvedUrls.local[0])
  const errors = []
  let scriptRequests = 0
  page.on('pageerror', error => errors.push(error.message))
  await page.clock.install()
  // Context routing also intercepts the direct-booking tab's first request.
  await page.context().route('**/*', async route => {
    const target = new URL(route.request().url())
    if (target.href === widgetUrl) {
      scriptRequests++
      if (failure === 'script' && scriptRequests === 1) return route.abort('blockedbyclient')
      return route.fulfill({ contentType: 'application/javascript', body: widget })
    }
    if (target.origin === 'https://calendly.com') return route.fulfill({ contentType: 'text/html', body: '<title>Local booking simulation</title><p>Consultation scheduler</p>' })
    if (target.origin !== origin.origin) return route.abort()
    if (target.pathname === '/api/ai-booking') {
      assert.equal(route.request().postDataJSON().action, 'quiz-summary')
      return route.fulfill({ json: { ok: true, notification: 'sent' } })
    }
    if (target.pathname === '/api/ai-checkout' && route.request().method() === 'GET') return route.fulfill({ json: { ok: true, ready: true } })
    if (target.pathname.startsWith('/api/')) return route.abort()
    return route.continue()
  })

  try {
    await page.goto(new URL('/offers/ai-business-integration', origin).href)
    await finishQuiz(page)
    const calendar = page.getByRole('region', { name: 'Consultation calendar' })
    const retry = calendar.getByRole('button', { name: 'Reload calendar' })
    const frames = page.locator('.qf-booking-frame iframe')
    const getFrame = async () => {
      await frames.waitFor({ state: 'attached' })
      const frame = await frames.elementHandle().then(element => element.contentFrame())
      await frame.waitForURL(url => url.origin === 'https://calendly.com' && url.pathname === '/matthew-wallaceshift/consultation')
      return frame
    }
    let initialFrame
    if (failure !== 'script') {
      initialFrame = await getFrame()
      await page.clock.fastForward(16000)
      await calendar.getByRole('status').filter({ hasText: /taking longer than usual/ }).waitFor()
      assert.equal(await frames.count(), 1, 'A slow embed stays mounted for late recovery.')
    } else {
      await calendar.getByRole('status').filter({ hasText: /could not be loaded/ }).waitFor()
      assert.equal(await frames.count(), 0)
    }
    await retry.waitFor()
    assert.equal(await page.locator('.qf-booking-frame').isVisible(), false, 'Failed embeds must not leave a blank calendar-sized gap.')

    const directLink = page.getByRole('link', { name: 'Open calendar in a new tab', exact: true })
    await directLink.waitFor()
    assert.equal(await directLink.getAttribute('href'), 'https://calendly.com/matthew-wallaceshift/consultation')
    assert.equal(await directLink.getAttribute('target'), '_blank')
    assert.deepEqual(new Set((await directLink.getAttribute('rel')).split(/\s+/)), new Set(['noopener', 'noreferrer']))
    const [bookingTab] = await Promise.all([page.waitForEvent('popup'), directLink.click()])
    await bookingTab.waitForLoadState('domcontentloaded')
    assert.equal(bookingTab.url(), await directLink.getAttribute('href'))
    assert.equal(await bookingTab.evaluate(() => window.opener), null)
    await bookingTab.close()
    assert.equal(await page.locator('video, .qf-walkthrough-offers').count(), 0, 'Opening Calendly does not confirm a booking.')
    await page.getByRole('heading', { name: 'Book your free consultation.' }).waitFor()

    if (failure !== 'slow-recovery') await retry.click()
    const recoveredFrame = failure === 'slow-recovery' ? initialFrame : await getFrame()
    await recoveredFrame.evaluate(() => window.parent.postMessage({ event: 'calendly.event_type_viewed' }, '*'))
    await retry.waitFor({ state: 'hidden' })
    await frames.waitFor({ state: 'visible' })
    assert.equal(await frames.count(), 1, 'Recovery must not duplicate the scheduler.')
    if (initialFrame) assert.equal(initialFrame.isDetached(), failure !== 'slow-recovery')
    if (failure === 'script') assert.equal(scriptRequests, 2, 'Retry must reload a previously blocked widget script.')
    await page.clock.fastForward(16000)
    assert.equal(await retry.count(), 0, 'Ready calendars must not return to the timeout state.')
    assert.equal(await directLink.isVisible(), true, 'The direct booking option remains available after recovery.')
    assert.equal(await page.locator('video, .qf-walkthrough-offers').count(), 0)
    assert.deepEqual(errors, [])
    console.log(`Passed Calendly ${failure} fallback, direct booking, and recovery.`)
  } finally {
    await page.close()
  }
}

const { chromium } = await playwright()
const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  for (const eventUrlOverride of [undefined, '', 'https://invalid.example.test/consultation']) {
    const server = await testServer(eventUrlOverride)
    try {
      await server.listen()
      if (eventUrlOverride === undefined) {
        await check(browser, server, { width: 1280, height: 900 }, 'no-preference')
        await check(browser, server, { width: 390, height: 844 }, 'reduce')
        for (const failure of ['script', 'slow-retry', 'slow-recovery']) await checkCalendarRecovery(browser, server, failure)
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
