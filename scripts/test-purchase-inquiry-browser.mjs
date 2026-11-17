/**
 * Production-build, local-only hero inquiry checks. All API and remote traffic is
 * intercepted: these tests cannot establish inbox delivery or book a call.
 * Run after a fresh npm run build: node scripts/test-purchase-inquiry-browser.mjs
 * Optional: AXE_PATH=/path/to/axe.min.js, PURCHASE_REVIEW_DIR=/tmp/review
 */
import assert from 'node:assert/strict'
import { mkdir, readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { preview } from 'vite'
import { playwright } from '../videos/contractor-previews/runtime.mjs'

const require = createRequire(import.meta.url)
const output = process.env.PURCHASE_REVIEW_DIR || '/tmp/wallace-shift-inquiry-review'
const routePath = '/'
const calendarUrl = 'https://calendly.com/matthew-wallaceshift/consultation'
const calendarWidgetUrl = 'https://assets.calendly.com/assets/external/widget.js'
const simulatedBooking = {
  event: 'calendly.event_scheduled',
  payload: {
    event: { uri: 'https://api.calendly.com/scheduled_events/browser-test-event' },
    invitee: { uri: 'https://api.calendly.com/scheduled_events/browser-test-event/invitees/browser-test-invitee' },
  },
}
const calendarWidget = `window.Calendly = { initInlineWidget({ url, parentElement }) {
  const frame = document.createElement('iframe');
  frame.src = url;
  frame.title = 'Simulated 20 minute Google Meet booking';
  parentElement.append(frame);
} };`
const simulatedCalendar = `<!doctype html><html lang="en"><head><title>Simulated calendar</title></head><body>
  <main><h1>Simulated 20 minute Google Meet</h1><p>This is a browser test. No appointment will be created.</p>
  <button id="confirm" type="button">Confirm simulated time</button></main>
  <script>
    parent.postMessage({ event: 'calendly.event_type_viewed' }, '*');
    document.getElementById('confirm').onclick = () => parent.postMessage(${JSON.stringify(simulatedBooking)}, '*');
  </script>
</body></html>`
const axeCandidates = [process.env.AXE_PATH]
try { axeCandidates.push(require.resolve('axe-core/axe.min.js')) } catch { /* optional local package */ }
axeCandidates.push('/tmp/wallace-homepage-decision/package/axe.min.js')
let axe
for (const path of axeCandidates.filter(Boolean)) {
  try { axe = await readFile(path, 'utf8'); break } catch { /* try the next local bundle */ }
}
assert.ok(axe, 'Axe is required. Set AXE_PATH to a local axe-core browser bundle.')
await mkdir(output, { recursive: true })

const builtHome = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8')
assert.match(builtHome, /data-route-path="\/"/, 'Build the production homepage before testing its hydration')
assert.match(builtHome, /Request a call/, 'Production HTML must prerender the callback option')
assert.match(builtHome, /Book a Google Meet/, 'Production HTML must prerender the booking option')
assert.match(builtHome, /tel:\+19133475479/, 'Production HTML must prerender the direct phone link')
// Use the real preview middleware: the blog owns static documents and clean URLs.
const server = await preview({
  logLevel: 'error',
  build: { outDir: 'dist' },
  preview: { host: '127.0.0.1', port: 0, open: false },
})
const origin = server.resolvedUrls.local[0]
const { chromium } = await playwright()
let browser
const summaries = []

function near(actual, expected, message) {
  assert.ok(Math.abs(actual - expected) <= 1, `${message}: ${actual} versus ${expected}`)
}

async function positions(page) {
  return page.evaluate(() => Object.fromEntries(['.site-header', '.r-hero h1', '.r-hero-actions .m-button', '.r-screen'].map(selector => {
    const { x, y, width, height } = document.querySelector(selector).getBoundingClientRect()
    return [selector, { x, y, width, height }]
  })))
}

function recordRuntimeErrors(page) {
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => {
    if (/hydrat|Minified React error #(?:418|419|421|423|425)/i.test(message.text())) errors.push(message.text())
  })
  return errors
}

async function assertHeaderClearance(page, label) {
  await settle(page.locator('.site-header'))
  const header = await page.locator('.site-header').boundingBox()
  const heading = await page.locator('.r-hero h1').boundingBox()
  assert.ok(header && heading && heading.y >= header.y + header.height - 1, `${label}: hero heading clears the fixed header`)
}

function unchanged(before, after, context) {
  for (const selector of Object.keys(before)) {
    for (const property of ['x', 'y', 'width', 'height']) {
      near(after[selector][property], before[selector][property], `${context}: ${selector} ${property}`)
    }
  }
}

async function settle(dialog) {
  await dialog.evaluate(async element => {
    await new Promise(requestAnimationFrame)
    await Promise.all(element.getAnimations({ subtree: true }).map(animation => animation.finished.catch(() => {})))
  })
}

async function waitForPending(promise) {
  let timer
  try {
    await Promise.race([promise, new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('Expected an intercepted call request within 10 seconds')), 10000)
    })])
  } finally { clearTimeout(timer) }
}

async function audit(page, include, label) {
  const result = await page.evaluate(async selectors => window.axe.run({ include: selectors }, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
  }), include)
  const violations = result.violations.map(rule => ({ id: rule.id, targets: rule.nodes.map(node => node.target) }))
  assert.deepEqual(violations, [], `${label}: automated accessibility violations`)
  return result.incomplete.map(rule => rule.id)
}

async function runScenario(viewport, reducedMotion) {
  const key = `${viewport.width}x${viewport.height}-${reducedMotion}`
  const page = await browser.newPage({ viewport, reducedMotion, serviceWorkers: 'block' })
  const errors = recordRuntimeErrors(page)
  const requests = []
  let responseMode = 'failure'
  let releasePending
  let pendingStarted
  const pendingRequest = new Promise(resolve => { pendingStarted = resolve })
  await page.route('**/*', async route => {
    const url = new URL(route.request().url())
    if (url.origin !== new URL(origin).origin) return route.abort()
    if (url.pathname === '/api/contact') {
      requests.push(route.request().postDataJSON())
      if (responseMode === 'pending') {
        await new Promise(resolve => { releasePending = resolve; pendingStarted() })
        return route.fulfill({ status: 500, json: { ok: false, error: 'temporary' } })
      }
      if (responseMode === 'html') return route.fulfill({ status: 200, contentType: 'text/html', body: '<html><body>Unconfigured local endpoint</body></html>' })
      if (responseMode === 'http-error') return route.fulfill({ status: 503, json: { ok: true } })
      if (responseMode === 'success') return route.fulfill({ status: 200, json: { ok: true } })
      return route.fulfill({ status: 500, json: { ok: false, error: 'temporary' } })
    }
    if (url.pathname.startsWith('/api/')) return route.abort()
    return route.continue()
  })

  try {
    await page.goto(new URL(routePath, origin).href, { waitUntil: 'networkidle' })
    await page.evaluate(async () => { await document.fonts.ready })
    await page.addScriptTag({ content: axe })
    const heroAction = page.locator('.r-hero').getByRole('button', { name: /^Request a call(?: |$)/ })
    const directCall = page.locator('.r-hero').getByRole('link', { name: 'Call directly: (913) 347-5479', exact: true })
    const bookMeeting = page.locator('.r-hero').getByRole('button', { name: /^Book a Google Meet(?: |$)/ })
    assert.equal(await directCall.getAttribute('href'), 'tel:+19133475479')
    assert.equal(await page.locator('.r-hero .contact-choice').count(), 0, `${key}: prominent contact choices are confined to the dialog`)
    assert.ok(await bookMeeting.isVisible(), `${key}: original secondary booking action remains available`)
    const actionBounds = await heroAction.boundingBox()
    assert.ok(actionBounds && actionBounds.y >= 0 && actionBounds.y + actionBounds.height <= viewport.height, `${key}: primary action visible in initial viewport`)
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${key}: no horizontal page overflow`)
    assert.equal(await page.evaluate(() => scrollY), 0, `${key}: no initial page scroll`)
    await assertHeaderClearance(page, key)
    const heroManualItems = await audit(page, ['.site-header', '.r-hero'], `${key} hero`)
    await page.screenshot({ path: `${output}/hero-${key}.png` })

    const before = await positions(page)
    await heroAction.click()
    const dialog = page.getByRole('dialog', { name: /^Request\s+a call\.?$/ })
    await dialog.waitFor({ state: 'visible' })
    assert.equal(await dialog.locator('.contact-choice').count(), 3, `${key}: dialog contains all three prominent contact choices`)
    assert.equal(await dialog.getByRole('link', { name: 'Call directly: (913) 347-5479' }).getAttribute('href'), 'tel:+19133475479')
    unchanged(before, await positions(page), `${key} opening`)
    await settle(dialog)
    unchanged(before, await positions(page), `${key} open`)
    const bounds = await dialog.boundingBox()
    near(bounds.x, 0, `${key}: dialog starts at left viewport edge`)
    near(bounds.y, 0, `${key}: dialog starts at top viewport edge`)
    near(bounds.width, viewport.width, `${key}: dialog fills viewport width`)
    near(bounds.height, viewport.height, `${key}: dialog fills viewport height`)
    const optionalDetails = dialog.locator('.call-request-details')
    assert.equal(await optionalDetails.evaluate(element => element.open), false, `${key}: optional fields start collapsed`)
    const emptyDialogManualItems = await audit(page, ['.call-request-dialog'], `${key} empty dialog`)
    await page.screenshot({ path: `${output}/dialog-empty-${key}.png` })
    // The three contact choices may make a short phone viewport scroll.
    // Every required field and submit must remain reachable inside the sheet.
    if (viewport.width === 390) {
      const stationaryPage = await positions(page)
      for (const control of [dialog.getByLabel('Your name', { exact: true }), dialog.getByLabel('Phone number', { exact: true }), dialog.getByRole('button', { name: 'Send call request', exact: true })]) {
        await control.scrollIntoViewIfNeeded()
        const controlBounds = await control.boundingBox()
        assert.ok(controlBounds && controlBounds.y >= 0 && controlBounds.y + controlBounds.height <= viewport.height + 1, `${key}: required form control can be reached inside the overlay`)
        assert.equal(await page.evaluate(() => scrollY), 0, `${key}: internal form scrolling leaves document position unchanged`)
        unchanged(stationaryPage, await positions(page), `${key}: internal form scrolling preserves background layout`)
      }
      await dialog.evaluate(element => { element.scrollTop = 0 })
    }
    if (reducedMotion === 'reduce') {
      const duration = await dialog.evaluate(element => {
        const style = getComputedStyle(element)
        return Math.max(...[style.transitionDuration, style.animationDuration].flatMap(value => value.split(',').map(item => parseFloat(item) * (item.includes('ms') ? 1 : 1000))))
      })
      assert.ok(duration <= 1, `${key}: reduced motion disables the slide`)
    }
    assert.ok(await dialog.evaluate(element => element.contains(document.activeElement)), `${key}: initial focus inside dialog`)
    for (const direction of ['Tab', 'Shift+Tab']) {
      for (let i = 0; i < 14; i++) {
        await page.keyboard.press(direction)
        assert.ok(await dialog.evaluate(element => element.contains(document.activeElement)), `${key}: ${direction} stays inside dialog`)
      }
    }
    await page.mouse.wheel(0, 600)
    assert.equal(await page.evaluate(() => scrollY), 0, `${key}: background scroll locked`)
    const name = dialog.getByLabel('Your name', { exact: true })
    const phone = dialog.getByLabel('Phone number', { exact: true })
    const email = dialog.getByLabel('Email address (optional)', { exact: true })
    const emailValue = viewport.width === 1440 ? 'owner@example.com' : ''
    const note = dialog.getByLabel('What would you like help with? (optional)', { exact: true })
    const submit = dialog.getByRole('button', { name: 'Send call request', exact: true })
    assert.equal(await note.evaluate(element => element.required), false, `${key}: note is optional`)
    assert.equal(await phone.evaluate(element => element.required), true, `${key}: phone is required for a callback`)
    assert.equal(await email.evaluate(element => element.required), false, `${key}: callback email is optional`)
    await submit.click()
    assert.equal(requests.length, 0, `${key}: empty required fields cannot submit`)
    await name.fill('Example Business Owner')
    await submit.click()
    assert.equal(requests.length, 0, `${key}: missing callback phone cannot submit`)
    await phone.fill('not-a-phone')
    await submit.click()
    assert.equal(requests.length, 0, `${key}: invalid callback phone cannot submit`)
    await phone.fill('913-555-0148')
    await optionalDetails.locator('summary').click()
    assert.equal(await optionalDetails.evaluate(element => element.open), true, `${key}: optional fields expand when requested`)
    await email.fill('not-an-email')
    await submit.click()
    assert.equal(requests.length, 0, `${key}: invalid optional email cannot submit`)
    await email.fill(emailValue)
    await note.fill('Sample request for a business website. Browser test only.')
    await page.keyboard.press('Escape')
    await dialog.waitFor({ state: 'hidden' })
    assert.ok(await heroAction.evaluate(element => document.activeElement === element), `${key}: Escape returns focus to invoking button`)
    unchanged(before, await positions(page), `${key} closed`)
    await heroAction.click()
    await dialog.waitFor({ state: 'visible' })
    await settle(dialog)
    assert.equal(await name.inputValue(), 'Example Business Owner', `${key}: name survives dismiss and reopen`)
    assert.equal(await phone.inputValue(), '913-555-0148', `${key}: callback phone survives dismiss and reopen`)
    assert.match(await note.inputValue(), /Browser test only/, `${key}: note survives dismiss and reopen`)
    await dialog.evaluate(element => { element.scrollTop = 0 })
    const dialogManualItems = await audit(page, ['.call-request-dialog'], `${key} dialog`)
    await page.screenshot({ path: `${output}/dialog-${key}.png` })

    // Hold the provider response while trying an additional submit. The
    // browser never contacts a real endpoint and only one request is allowed.
    responseMode = 'pending'
    await submit.click()
    await waitForPending(pendingRequest)
    await page.waitForFunction(() => document.querySelector('form[aria-busy="true"]'))
    for (let i = 0; i < 2; i++) await dialog.locator('form').evaluate(form => form.requestSubmit())
    assert.equal(requests.length, 1, `${key}: duplicate submits blocked while pending`)
    assert.ok(releasePending, `${key}: intercepted request is pending`)
    releasePending()
    await dialog.getByRole('alert').waitFor()
    assert.equal(await name.inputValue(), 'Example Business Owner', `${key}: failure preserves name`)
    assert.equal(await phone.inputValue(), '913-555-0148', `${key}: failure preserves callback phone`)
    assert.equal(await email.inputValue(), emailValue, `${key}: failure preserves optional email`)
    assert.match(await note.inputValue(), /Browser test only/, `${key}: failure preserves note`)
    await audit(page, ['.call-request-dialog'], `${key} error`)

    responseMode = 'html'
    await submit.click()
    await dialog.getByRole('alert').waitFor()
    assert.equal(requests.length, 2, `${key}: retry reaches endpoint`)
    assert.equal(await dialog.getByRole('heading', { name: 'Your call request has been sent.', exact: true }).count(), 0, `${key}: HTML 200 does not produce fake success`)

    responseMode = 'http-error'
    await submit.click()
    await dialog.getByRole('alert').waitFor()
    assert.equal(requests.length, 3, `${key}: HTTP error retry reaches endpoint`)
    assert.equal(await dialog.getByRole('heading', { name: 'Your call request has been sent.', exact: true }).count(), 0, `${key}: HTTP 503 with ok:true does not produce fake success`)

    // Mobile keyboard geometry is simulated, not a physical device test.
    if (viewport.width === 390) {
      await page.setViewportSize({ width: 390, height: 420 })
      await note.focus()
      await submit.scrollIntoViewIfNeeded()
      assert.ok(await submit.isVisible(), 'short viewport: submit remains reachable through internal scrolling')
      assert.equal(await page.evaluate(() => scrollY), 0, 'short viewport: underlying page remains still')
      assert.ok(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth + 1), 'short viewport: no horizontal dialog overflow')
      await page.screenshot({ path: `${output}/dialog-short-viewport-${key}.png` })
    }
    responseMode = 'success'
    await submit.click()
    const success = dialog.getByRole('heading', { name: 'Your call request has been sent.', exact: true })
    await success.waitFor()
    assert.equal(requests.length, 4, `${key}: successful retry completes once`)
    const payload = requests.at(-1)
    assert.ok(typeof payload.requestId === 'string' && payload.requestId.length > 0, `${key}: request has an idempotency ID`)
    assert.ok(requests.every(request => request.requestId === payload.requestId), `${key}: identical retries retain the same request ID`)
    assert.equal(payload.name, 'Example Business Owner')
    assert.equal(payload.contactMethod, 'phone')
    assert.equal(payload.phone, '913-555-0148')
    assert.equal(payload.email || '', emailValue)
    assert.equal(payload.service, 'Call request')
    assert.match(payload.message, /Browser test only/)
    assert.ok(!payload.offer && !payload.package, `${key}: package selection is not required`)
    assert.ok(!payload.company, `${key}: honeypot remains empty`)
    assert.match(await dialog.innerText(), /call you|phone|number/i, `${key}: callback follow up is explained`)
    await audit(page, ['.call-request-dialog'], `${key} success`)
    await page.screenshot({ path: `${output}/success-${key}.png` })
    await dialog.getByRole('button', { name: 'Close request form', exact: true }).click()
    await dialog.waitFor({ state: 'hidden' })
    assert.ok(await heroAction.evaluate(element => document.activeElement === element), `${key}: close returns focus`)
    if (viewport.width === 390) await page.setViewportSize(viewport)

    // Check closing from a scrolled position without click auto-scrolling the
    // hero trigger. This also catches desktop scrollbar compensation shifts.
    await page.evaluate(() => window.scrollTo({ top: 180, behavior: 'instant' }))
    await page.locator('.site-header--solid').waitFor()
    await settle(page.locator('.site-header'))
    const scrolled = await page.evaluate(() => scrollY)
    const scrolledPositions = await positions(page)
    await heroAction.evaluate(element => { element.focus({ preventScroll: true }); element.click() })
    await dialog.waitFor({ state: 'visible' })
    unchanged(scrolledPositions, await positions(page), `${key} scrolled opening`)
    await settle(dialog)
    unchanged(scrolledPositions, await positions(page), `${key} scrolled opening`)
    await page.keyboard.press('Escape')
    await dialog.waitFor({ state: 'hidden' })
    near(await page.evaluate(() => scrollY), scrolled, `${key}: saved scroll position restored`)
    unchanged(scrolledPositions, await positions(page), `${key} scrolled close`)
    assert.deepEqual(errors, [], `${key}: browser runtime errors`)
    summaries.push({ viewport, reducedMotion, requests: requests.length, axeViolations: 0, axeManualItems: [...new Set([...heroManualItems, ...emptyDialogManualItems, ...dialogManualItems])] })
    console.log(`PASS ${key}: first-view CTA, modal geometry/focus/scroll, draft recovery, validation, duplicate guard, stable retry ID, error/HTML/HTTP503/success, scoped axe.`)
  } finally {
    releasePending?.()
    await page.close()
  }
}

async function runMinimalCallbackScenario() {
  const viewport = { width: 390, height: 844 }
  const page = await browser.newPage({ viewport, reducedMotion: 'reduce', serviceWorkers: 'block' })
  const errors = recordRuntimeErrors(page)
  const requests = []
  await page.route('**/*', async route => {
    const url = new URL(route.request().url())
    if (url.origin !== new URL(origin).origin) return route.abort()
    if (url.pathname === '/api/contact') {
      requests.push(route.request().postDataJSON())
      return route.fulfill({ status: 200, json: { ok: true } })
    }
    if (url.pathname.startsWith('/api/')) return route.abort()
    return route.continue()
  })
  try {
    await page.goto(new URL(routePath, origin).href, { waitUntil: 'networkidle' })
    await page.locator('.r-hero').getByRole('button', { name: /^Request a call(?: |$)/ }).click()
    const dialog = page.getByRole('dialog', { name: /^Request\s+a call\.?$/ })
    await dialog.waitFor()
    await settle(dialog)
    await dialog.getByLabel('Your name', { exact: true }).fill('Minimal Callback Test')
    await dialog.getByLabel('Phone number', { exact: true }).fill('913-555-0148')
    assert.equal(await dialog.locator('.call-request-details').evaluate(element => element.open), false, 'minimal callback: optional fields remain collapsed throughout')
    assert.equal(await dialog.getByLabel('Email address (optional)', { exact: true }).isVisible(), false)
    assert.equal(await dialog.getByLabel('What would you like help with? (optional)', { exact: true }).isVisible(), false)
    await dialog.getByRole('button', { name: 'Send call request', exact: true }).click()
    await dialog.getByRole('heading', { name: 'Your call request has been sent.', exact: true }).waitFor()
    assert.equal(requests.length, 1, 'minimal callback: one request accepted')
    assert.equal(requests[0].name, 'Minimal Callback Test')
    assert.equal(requests[0].phone, '913-555-0148')
    assert.equal(requests[0].contactMethod, 'phone')
    assert.equal(requests[0].email || '', '')
    assert.equal(requests[0].message, 'Please call me about Wallace Shift services.')
    assert.deepEqual(errors, [], 'minimal callback: no hydration or runtime errors')
    await page.screenshot({ path: `${output}/minimal-callback-390x844.png` })
    summaries.push({ viewport, callback: 'name and phone only, optional fields never opened', requests: requests.length })
    console.log('PASS minimal callback: name and phone submit successfully with optional email/note left collapsed and empty.')
  } finally { await page.close() }
}

async function runBookingScenario(viewport, blocked = false) {
  const key = `booking-${viewport.width}x${viewport.height}${blocked ? '-blocked-widget' : ''}`
  const page = await browser.newPage({ viewport, reducedMotion: 'reduce', serviceWorkers: 'block' })
  const errors = recordRuntimeErrors(page)
  const apiRequests = []
  let widgetRequests = 0
  await page.route('**/*', async route => {
    const url = new URL(route.request().url())
    if (url.href === calendarWidgetUrl) {
      widgetRequests++
      if (blocked) return route.abort()
      return route.fulfill({ contentType: 'application/javascript', body: calendarWidget })
    }
    if (url.origin === 'https://calendly.com') return route.fulfill({ contentType: 'text/html', body: simulatedCalendar })
    if (url.origin !== new URL(origin).origin) return route.abort()
    if (url.pathname.startsWith('/api/')) {
      apiRequests.push(url.pathname)
      return route.abort()
    }
    return route.continue()
  })

  try {
    await page.goto(new URL(routePath, origin).href, { waitUntil: 'networkidle' })
    await page.evaluate(async () => { await document.fonts.ready })
    await page.addScriptTag({ content: axe })
    assert.equal(widgetRequests, 0, `${key}: calendar is not loaded before visitor asks to book`)
    const bookAction = page.locator('.r-hero').getByRole('button', { name: /^Book a Google Meet(?: |$)/ })
    const before = await positions(page)
    await bookAction.click()
    const bookingDialog = page.getByRole('dialog', { name: /^Book a\s+Google Meet\.?$/ })
    await bookingDialog.waitFor()
    assert.equal(await bookingDialog.locator('.contact-choice').count(), 3, `${key}: booking dialog contains all three prominent contact choices`)
    await settle(bookingDialog)
    unchanged(before, await positions(page), `${key}: booking overlay leaves underlying layout still`)
    assert.match(await bookingDialog.innerText(), /20 minute video call/, `${key}: correct meeting duration`)
    const calendar = bookingDialog.getByRole('region', { name: 'Consultation calendar', exact: true })
    const externalCalendar = calendar.getByRole('link', { name: 'Open calendar in a new tab', exact: true })
    assert.equal(await externalCalendar.getAttribute('href'), calendarUrl)
    assert.equal(await externalCalendar.getAttribute('target'), '_blank')
    assert.deepEqual(new Set((await externalCalendar.getAttribute('rel')).split(/\s+/)), new Set(['noopener', 'noreferrer']))

    if (blocked) {
      await calendar.getByText(/The calendar could not be loaded\./).waitFor()
      assert.ok(await calendar.getByRole('button', { name: 'Reload calendar', exact: true }).isVisible(), `${key}: reload available`)
      await audit(page, ['.call-request-dialog'], `${key} fallback`)
      await page.screenshot({ path: `${output}/${key}.png` })
      await bookingDialog.getByRole('button', { name: 'Request a phone call instead', exact: true }).click()
      const callbackDialog = page.getByRole('dialog', { name: /^Request\s+a call\.?$/ })
      await callbackDialog.getByLabel('Phone number', { exact: true }).waitFor()
      assert.equal(await callbackDialog.getByRole('button', { name: /^Request a call(?: |$)/ }).getAttribute('aria-pressed'), 'true')
      await page.keyboard.press('Escape')
      await callbackDialog.waitFor({ state: 'hidden' })
    } else {
      await calendar.locator('iframe').waitFor()
      const frame = calendar.frameLocator('iframe')
      await frame.getByRole('button', { name: 'Confirm simulated time', exact: true }).waitFor()
      assert.equal(await bookingDialog.getByRole('button', { name: /^Book a Google Meet(?: |$)/ }).getAttribute('aria-pressed'), 'true')
      const confirmed = page.getByRole('heading', { name: 'Your Google Meet is booked.', exact: true })
      await page.evaluate(message => window.dispatchEvent(new MessageEvent('message', {
        data: message, origin: 'https://calendly.com', source: window,
      })), simulatedBooking)
      assert.equal(await confirmed.count(), 0, `${key}: parent-window spoof cannot confirm a booking`)
      await audit(page, ['.call-request-dialog'], `${key} calendar shell`)
      await page.screenshot({ path: `${output}/${key}.png` })
      await frame.getByRole('button', { name: 'Confirm simulated time', exact: true }).click()
      await confirmed.waitFor()
      assert.match(await bookingDialog.innerText(), /calendar invitation and Google Meet link/, `${key}: confirmed next step is explicit`)
      await audit(page, ['.call-request-dialog'], `${key} confirmation`)
      await page.screenshot({ path: `${output}/${key}-confirmed.png` })
      await bookingDialog.getByRole('button', { name: 'Close request form', exact: true }).click()
      await bookingDialog.waitFor({ state: 'hidden' })
    }
    assert.ok(await bookAction.evaluate(element => document.activeElement === element), `${key}: booking dismissal restores original trigger focus`)
    unchanged(before, await positions(page), `${key}: booking dismissal preserves page layout`)
    assert.deepEqual(apiRequests, [], `${key}: booking does not send a callback inquiry`)
    assert.deepEqual(errors, [], `${key}: no browser runtime errors`)
    summaries.push({ viewport, booking: blocked ? 'blocked calendar fallback' : 'simulated provider confirmation', axeViolations: 0 })
    console.log(`PASS ${key}: separate booking action, 20 minute wording, ${blocked ? 'blocked-widget fallback to callback' : 'provider source check and simulated confirmation'}, focus/layout restoration, scoped axe.`)
  } finally { await page.close() }
}

async function localDocumentsOnly(page) {
  await page.route('**/*', route => {
    const url = new URL(route.request().url())
    if (url.origin !== new URL(origin).origin || url.pathname.startsWith('/api/')) return route.abort()
    return route.continue()
  })
}

async function runPrerenderCheck() {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, javaScriptEnabled: false, serviceWorkers: 'block' })
  await localDocumentsOnly(page)
  try {
    const response = await page.goto(new URL(routePath, origin).href)
    assert.equal(response.status(), 200, 'production homepage serves HTTP 200')
    assert.equal(await page.locator('#root').getAttribute('data-route-path'), '/', 'production HTML identifies the server-rendered route')
    assert.match(await page.locator('.r-hero h1').innerText(), /Websites.*lead pages/s, 'hero exists before JavaScript hydration')
    assert.equal(await page.locator('.r-hero .contact-choice').count(), 0, 'prerendered hero preserves its original contact treatment')
    assert.equal(await page.locator('.r-hero').getByRole('button', { name: /^Request a call(?: |$)/ }).count(), 1, 'callback button exists before hydration')
    assert.equal(await page.locator('.r-hero').getByRole('button', { name: /^Book a Google Meet(?: |$)/ }).count(), 1, 'secondary booking button exists before hydration')
    assert.equal(await page.locator('.r-hero').getByRole('link', { name: 'Call directly: (913) 347-5479', exact: true }).getAttribute('href'), 'tel:+19133475479')
    summaries.push({ productionHTML: 'original hero buttons and direct phone link rendered without JavaScript' })
    console.log('PASS production prerender: original homepage hero buttons and direct phone link exist without JavaScript.')
  } finally { await page.close() }
}

const navigationRoutes = [
  ['Services', '/services'], ['Pricing', '/pricing'], ['Approach', '/approach'],
  ['About', '/about'], ['Contact', '/contact'], ['Blog', '/blog'],
]

async function openPrimaryNavigation(page, viewport) {
  if (viewport.width > 760) return page.locator('.site-header__nav')
  const toggle = page.locator('.site-header__menu-toggle')
  if (await toggle.getAttribute('aria-expanded') !== 'true') await toggle.click()
  const menu = page.getByRole('dialog', { name: 'Mobile navigation', exact: true })
  await menu.waitFor()
  return menu.getByRole('navigation', { name: 'Primary', exact: true })
}

async function assertLeadPackageTarget(page, label) {
  await page.waitForFunction(() =>
    document.querySelector('#package-choice-lead')?.getAttribute('aria-pressed') === 'true'
    && document.querySelector('.p-package-list')?.firstElementChild?.id === 'lead-package')
  await settle(page.locator('.site-header'))
  const header = await page.locator('.site-header').boundingBox()
  const packageHeading = await page.locator('#lead-package-heading').boundingBox()
  assert.ok(header && packageHeading && packageHeading.y >= header.y + header.height - 1, `${label}: selected package heading clears fixed navigation`)
  assert.ok(packageHeading.y < await page.evaluate(() => innerHeight), `${label}: selected package heading is in view`)
  assert.equal(await page.locator('#package-choice-website').getAttribute('aria-pressed'), 'false', `${label}: only lead package selected`)
}

async function runNavigationScenario(viewport) {
  const key = `production-navigation-${viewport.width}x${viewport.height}`
  const page = await browser.newPage({ viewport, reducedMotion: 'reduce', serviceWorkers: 'block' })
  const errors = recordRuntimeErrors(page)
  await localDocumentsOnly(page)
  try {
    await page.goto(new URL(routePath, origin).href, { waitUntil: 'networkidle' })
    await page.locator('.r-hero-actions .m-button').waitFor()
    await assertHeaderClearance(page, key)
    for (const [label, path] of navigationRoutes) {
      console.log(`CHECK ${key}: ${label} navigation and return home`)
      const nav = await openPrimaryNavigation(page, viewport)
      for (const [navLabel, navPath] of navigationRoutes) {
        const link = nav.getByRole('link', { name: navLabel, exact: true })
        assert.equal(await link.getAttribute('href'), navPath, `${key}: ${navLabel} keeps its production route`)
        assert.ok(await link.isVisible(), `${key}: ${navLabel} is reachable in navigation`)
      }
      if (viewport.width <= 760 && label === 'Services') {
        await page.screenshot({ path: `${output}/${key}-menu.png` })
      }
      await nav.getByRole('link', { name: label, exact: true }).click()
      await page.waitForURL(url => url.pathname.replace(/\/$/, '') === path)
      await page.locator('.service-home').waitFor({ state: 'detached' })
      await page.locator('h1').first().waitFor()
      const homeLink = path === '/blog'
        ? page.getByRole('link', { name: 'Wallace Shift home', exact: true })
        : page.locator('.site-header__brand')
      await homeLink.click()
      await page.waitForURL(url => url.pathname === '/' && !url.hash)
      await page.locator('.r-hero-actions .m-button').waitFor()
      await assertHeaderClearance(page, `${key} return from ${label}`)
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${key}: no horizontal overflow after ${label}`)
      if (viewport.width <= 760) assert.equal(await page.locator('.site-header__menu-toggle').getAttribute('aria-expanded'), 'false', `${key}: menu closes after route navigation`)
    }

    // A real document load with the fragment exercises SSR hydration before
    // the package effect chooses and scrolls to the requested offering.
    await page.goto(new URL('/#lead-package', origin).href, { waitUntil: 'networkidle' })
    await assertLeadPackageTarget(page, key)
    await page.screenshot({ path: `${output}/${key}-lead-package.png` })
    const nav = await openPrimaryNavigation(page, viewport)
    await nav.getByRole('link', { name: 'Services', exact: true }).click()
    await page.waitForURL(url => url.pathname === '/services')
    await page.locator('.service-home').waitFor({ state: 'detached' })
    await page.goBack()
    await page.waitForURL(url => url.pathname === '/' && url.hash === '#lead-package')
    await assertLeadPackageTarget(page, `${key} history return`)
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${key}: deep link has no horizontal overflow`)
    assert.deepEqual(errors, [], `${key}: no hydration or route runtime errors`)
    summaries.push({ viewport, productionNavigation: 'all six routes away and home, direct and history lead-package links', runtimeErrors: 0 })
    console.log(`PASS ${key}: six production navigation routes, return home, SSR fragment selection, history return, fixed-header clearance and no hydration errors.`)
  } finally { await page.close() }
}

async function runScrollbarScenario() {
  const page = await browser.newPage({ viewport: { width: 1100, height: 900 }, reducedMotion: 'reduce', serviceWorkers: 'block' })
  const errors = recordRuntimeErrors(page)
  await localDocumentsOnly(page)
  try {
    await page.goto(new URL(routePath, origin).href, { waitUntil: 'networkidle' })
    await page.evaluate(async () => { await document.fonts.ready })
    const nativeWidth = await page.evaluate(() => innerWidth - document.documentElement.clientWidth)
    // Styled scrollbars can reserve a real gutter on otherwise overlay-scrollbar
    // hosts. Measure the resulting geometry; never pretend this is a Windows run.
    await page.addStyleTag({ content: 'html::-webkit-scrollbar { width: 18px; }' })
    const styledWidth = await page.evaluate(() => innerWidth - document.documentElement.clientWidth)
    if (styledWidth <= 0) {
      summaries.push({ scrollbar: { nativeWidth, styledWidth }, pending: 'This browser did not reserve a scrollbar gutter; non-overlay scrollbar geometry remains unverified.' })
      console.log(`PENDING reserved-scrollbar layout: native ${nativeWidth}px, styled ${styledWidth}px; this browser retained overlay scrollbars.`)
      return
    }

    await page.locator('#package-choice-lead').evaluate(element => element.click())
    const selector = page.locator('.p-starting-point.is-docked')
    await selector.waitFor()
    await settle(page.locator('.site-header'))
    const before = { ...await positions(page), '.p-starting-point.is-docked': await selector.boundingBox() }
    const scrollBefore = await page.evaluate(() => scrollY)
    const previousWidth = await page.evaluate(() => document.documentElement.style.getPropertyValue('--modal-scrollbar-width'))
    await page.locator('.r-hero').getByRole('button', { name: /^Request a call(?: |$)/ }).evaluate(element => {
      element.focus({ preventScroll: true })
      element.click()
    })
    const dialog = page.getByRole('dialog', { name: /^Request\s+a call\.?$/ })
    await dialog.waitFor()
    await settle(dialog)
    near(await page.evaluate(() => parseFloat(document.documentElement.style.getPropertyValue('--modal-scrollbar-width'))), styledWidth, 'modal records the actual scrollbar gutter')
    unchanged(before, { ...await positions(page), '.p-starting-point.is-docked': await selector.boundingBox() }, 'reserved scrollbar: modal opening')
    await page.keyboard.press('Escape')
    await dialog.waitFor({ state: 'hidden' })
    unchanged(before, { ...await positions(page), '.p-starting-point.is-docked': await selector.boundingBox() }, 'reserved scrollbar: modal closing')
    near(await page.evaluate(() => scrollY), scrollBefore, 'reserved scrollbar: scroll position restored')
    assert.equal(await page.evaluate(() => document.documentElement.style.getPropertyValue('--modal-scrollbar-width')), previousWidth, 'modal restores the prior scrollbar compensation')
    assert.deepEqual(errors, [], 'reserved scrollbar: no hydration or runtime errors')
    summaries.push({ scrollbar: { nativeWidth, styledWidth }, passed: 'Header, content and docked package selector preserve their rectangles through modal open/close with a measured CSS scrollbar gutter.' })
    console.log(`PASS reserved-scrollbar layout: native ${nativeWidth}px, styled ${styledWidth}px; header, content, docked selector and scroll restoration verified.`)
  } finally { await page.close() }
}

try {
  browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--disable-features=OverlayScrollbar'] })
  await runPrerenderCheck()
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1280, height: 720 }, { width: 390, height: 844 }, { width: 320, height: 568 }]) {
    await runScenario(viewport, viewport.width === 320 ? 'reduce' : 'no-preference')
  }
  await runMinimalCallbackScenario()
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) await runBookingScenario(viewport)
  await runBookingScenario({ width: 390, height: 844 }, true)
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) await runNavigationScenario(viewport)
  await runScrollbarScenario()
  console.log(JSON.stringify({ screenshots: output, scenarios: summaries, simulated: 'All callback responses and Calendly booking events; short viewport only simulates keyboard space.', pending: 'Real inbox delivery and calendar booking, physical phone keyboard, VoiceOver and prospective-user observation.' }, null, 2))
} finally {
  await browser?.close()
  await new Promise((resolve, reject) => server.httpServer.close(error => error ? reject(error) : resolve()))
}
