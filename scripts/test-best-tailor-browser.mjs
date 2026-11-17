import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { playwright } from '../videos/contractor-previews/runtime.mjs'

const origin = process.env.BEST_TAILOR_ORIGIN || 'http://127.0.0.1:5194'
// Keep the earlier business-identity review separate from the bridal/form revision.
const output = new URL('../docs/review/sues-tailor/bridal/', import.meta.url)
const { chromium } = await playwright()
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const errors = []
const results = []
const axe = process.env.AXE_PATH ? await readFile(process.env.AXE_PATH, 'utf8') : null
await mkdir(output, { recursive: true })

try {
  for (const width of [320, 390, 768, 1024, 1440, 1920]) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' })
    page.on('pageerror', error => errors.push(error.message))
    const outgoingSubmissions = []
    page.on('request', request => { if (request.method() === 'POST') outgoingSubmissions.push(request.url()) })
    const response = await page.goto(`${origin}/demo/sues-tailor`, { waitUntil: 'networkidle' })
    assert.equal(response.status(), 200)
    assert.match(response.headers()['x-robots-tag'], /noindex/)
    assert.match(await page.locator('meta[name="robots"]').getAttribute('content'), /noindex, nofollow/)
    await page.evaluate(() => document.fonts.ready)
    assert.equal(await page.locator('h1').count(), 1)
    assert.equal(await page.locator('main').count(), 1)
    assert.doesNotMatch(await page.locator('body').innerText(), /Best Tailor|Wallace Shift|website concept|Christine Antes|Frank Gilkey|942-1042|15009 Metcalf/i)
    assert.match(await page.locator('body').innerText(), /Sue’s Tailor Shop/)
    assert.match(await page.title(), /Sue’s Tailor Shop/)
    await page.waitForFunction(() => [...document.querySelectorAll('.bt-dress-image')].every(image => image.complete && image.naturalWidth === 640 && image.naturalHeight === 1086))
    assert.equal(await page.locator('.bt-dress-image').count(), 3)
    assert.ok(await page.evaluate(() => document.fonts.check('16px "Libre Caslon Display"')))
    const dimensions = await page.evaluate(() => ({ viewport: innerWidth, scroll: document.documentElement.scrollWidth }))
    assert.ok(dimensions.scroll <= width + 1, `No overflow at ${width}: ${JSON.stringify(dimensions)}`)
    assert.equal(await page.locator('.bt-bridal-copy').getByRole('link', { name: 'Request a fitting', exact: true }).getAttribute('href'), '#request-fitting')
    for (const link of await page.locator('a[href^="tel:"]').all()) assert.equal(await link.getAttribute('href'), 'tel:+19139441983')
    for (const link of await page.locator('a[href^="https://www.google.com/maps/dir/"]').all()) {
      assert.match(new URL(await link.getAttribute('href')).searchParams.get('destination'), /14873 Metcalf/)
    }

    const stages = page.getByRole('group', { name: 'Explore the fitting stages' })
    for (const [name, heading] of [['The small details', 'A little care, everywhere.'], ['The final try-on', 'Ready for your moment.'], ['The first fitting', 'It begins with you.']]) {
      const control = stages.getByRole('button', { name, exact: true })
      await control.focus()
      await page.keyboard.press('Enter')
      assert.equal(await control.getAttribute('aria-pressed'), 'true')
      assert.equal(await stages.locator('[aria-pressed="true"]').count(), 1)
      assert.equal(await page.locator('.bt-dress-image[aria-hidden="false"]').count(), 1)
      assert.equal(await page.locator('.bt-dress-image.is-active').evaluate(image => getComputedStyle(image).opacity), '1')
      assert.equal(await page.locator('#bt-dress-detail').getByRole('heading', { name: heading, exact: true }).isVisible(), true)
    }
    assert.equal(await page.locator('.bt-dress-image.is-active').evaluate(image => getComputedStyle(image).transitionDuration), '0s', 'Reduced motion removes dress crossfades')

    const dresses = page.getByRole('button', { name: 'Dresses for special occasions', exact: true })
    const everyday = page.getByRole('button', { name: 'Everyday dresses & skirts', exact: true })
    await everyday.click()
    await dresses.focus()
    await page.keyboard.press('Enter')
    assert.equal(await dresses.getAttribute('aria-expanded'), 'true')
    await page.locator('.bt-service-content:not([hidden])').getByText('Bring the shoes and undergarments', { exact: false }).waitFor({ state: 'visible' })
    assert.equal(await everyday.getAttribute('aria-expanded'), 'false')
    await page.keyboard.press('Space')
    assert.equal(await dresses.getAttribute('aria-expanded'), 'false')
    await dresses.click()

    assert.equal(await page.getByRole('button', { name: 'Previous reviews' }).isDisabled(), true)
    await page.getByRole('button', { name: 'Next reviews' }).click()
    assert.equal(await page.getByText('Scarlett', { exact: true }).isVisible(), true)
    assert.equal(await page.locator('.bt-stars[aria-label="5 out of 5 stars"]').count(), 3)
    assert.equal(await page.getByRole('button', { name: 'Next reviews' }).isDisabled(), true)
    await page.getByRole('button', { name: 'Previous reviews' }).click()
    assert.equal(await page.getByText('Sophie Oatman', { exact: true }).isVisible(), true)

    if (width <= 850) {
      await page.evaluate(() => scrollTo(0, 0))
      const menu = page.locator('.bt-menu-button')
      await menu.click()
      assert.equal(await menu.getAttribute('aria-expanded'), 'true')
      await page.keyboard.press('Escape')
      assert.equal(await menu.getAttribute('aria-expanded'), 'false')
      assert.equal(await menu.evaluate(button => button === document.activeElement), true)
      await menu.click()
      await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Visit Sue', exact: true }).click()
      assert.equal(await menu.getAttribute('aria-expanded'), 'false')
      assert.match(page.url(), /#visit$/)
    }

    const fitting = page.locator('#request-fitting')
    const storageBefore = await page.evaluate(() => ({ local: { ...localStorage }, session: { ...sessionStorage } }))
    await fitting.getByRole('button', { name: 'Review fitting request', exact: true }).click()
    const errorSummary = fitting.locator('.bt-fitting-error-summary')
    await errorSummary.waitFor({ state: 'visible' })
    await page.waitForFunction(() => document.activeElement?.classList.contains('bt-fitting-error-summary'))
    assert.equal(await fitting.locator('[aria-invalid="true"]').count(), 3, 'Empty form identifies the required name, contact and garment')
    await errorSummary.getByRole('link', { name: 'Enter your name.', exact: true }).click()
    const name = fitting.getByLabel('Your name (required)', { exact: true })
    assert.equal(await name.evaluate(input => input === document.activeElement), true)
    await name.fill('Demo Visitor')
    await fitting.getByRole('radio', { name: 'Email', exact: true }).check()
    await fitting.getByLabel('Email address (required)', { exact: true }).fill('sample@example.test')
    await fitting.getByLabel('Garment or service (required)', { exact: true }).selectOption('Wedding dress')
    await fitting.getByLabel('A little more about your piece (optional)', { exact: true }).fill('Sample request: discuss the hem and straps.')
    // A future Monday, using the business calendar rather than the test host's timezone.
    const calendarDay = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
    const monday = new Date(`${calendarDay}T12:00:00Z`)
    monday.setUTCDate(monday.getUTCDate() + 14)
    while (monday.getUTCDay() !== 1) monday.setUTCDate(monday.getUTCDate() + 1)
    const saturday = new Date(monday); saturday.setUTCDate(saturday.getUTCDate() - 2)
    const eventDay = new Date(monday); eventDay.setUTCDate(eventDay.getUTCDate() + 21)
    await fitting.getByLabel('Event date (optional)', { exact: true }).fill(eventDay.toISOString().slice(0, 10))
    await fitting.getByLabel('Preferred fitting day (optional)', { exact: true }).fill(saturday.toISOString().slice(0, 10))
    await fitting.getByRole('button', { name: 'Review fitting request', exact: true }).click()
    assert.equal(await fitting.getByLabel('Preferred fitting day (optional)', { exact: true }).getAttribute('aria-invalid'), 'true')
    await errorSummary.getByRole('link', { name: /Choose a weekday/ }).waitFor({ state: 'visible' })
    await fitting.getByLabel('Preferred fitting day (optional)', { exact: true }).fill(monday.toISOString().slice(0, 10))
    await fitting.getByRole('button', { name: 'Review fitting request', exact: true }).click()
    await fitting.getByRole('heading', { name: 'Your fitting details.', exact: true }).waitFor({ state: 'visible' })
    await page.waitForFunction(() => document.activeElement?.textContent === 'Your fitting details.')
    assert.equal(await fitting.getByText('Nothing has been sent or booked.', { exact: true }).isVisible(), true)
    assert.match(await fitting.locator('.bt-fitting-summary').innerText(), /Demo Visitor[\s\S]*sample@example.test[\s\S]*Wedding dress[\s\S]*Sample request/)
    assert.equal(await fitting.getByRole('link', { name: 'Call Sue to arrange a fitting', exact: true }).getAttribute('href'), 'tel:+19139441983')
    await fitting.getByRole('button', { name: 'Edit details', exact: true }).click()
    assert.equal(await name.inputValue(), 'Demo Visitor')
    assert.equal(await fitting.getByLabel('Email address (required)', { exact: true }).inputValue(), 'sample@example.test')
    await fitting.getByRole('radio', { name: 'Phone call', exact: true }).check()
    await fitting.getByLabel('Phone number (required)', { exact: true }).fill('913 555 0123')
    await fitting.getByRole('button', { name: 'Review fitting request', exact: true }).click()
    await fitting.getByRole('heading', { name: 'Your fitting details.', exact: true }).waitFor({ state: 'visible' })
    assert.match(await fitting.locator('.bt-fitting-summary').innerText(), /913 555 0123/)
    assert.doesNotMatch(await fitting.locator('.bt-fitting-summary').innerText(), /sample@example.test/)
    await fitting.getByRole('button', { name: 'Clear details', exact: true }).click()
    assert.equal(await name.inputValue(), '')
    assert.equal(await fitting.getByLabel('Phone number (required)', { exact: true }).inputValue(), '')
    assert.equal(await fitting.getByLabel('Garment or service (required)', { exact: true }).inputValue(), '')
    assert.equal(await fitting.getByLabel('Event date (optional)', { exact: true }).inputValue(), '')
    assert.deepEqual(await page.evaluate(() => ({ local: { ...localStorage }, session: { ...sessionStorage } })), storageBefore, 'The form does not write browser storage')
    assert.deepEqual(outgoingSubmissions, [], 'The preview form sends no POST requests')
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `No overflow after interactive flows at ${width}`)

    await page.evaluate(() => { location.hash = ''; scrollTo(0, 0); document.activeElement?.blur() })
    let accessibility = 'not run'
    if (width === 1440 || width === 390) {
      if (axe) {
        await page.addScriptTag({ content: axe })
        const scan = await page.evaluate(async () => window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } }))
        const violations = scan.violations.map(rule => ({ id: rule.id, nodes: rule.nodes.map(node => ({ target: node.target, summary: node.failureSummary })) }))
        assert.deepEqual(violations, [], `Accessibility at ${width}`)
        accessibility = { violations: 0, manualReview: scan.incomplete.map(rule => rule.id) }
      }
      await page.screenshot({ path: new URL(width === 1440 ? 'desktop.png' : 'mobile.png', output).pathname, fullPage: true })
      await page.screenshot({ path: new URL(width === 1440 ? 'desktop-hero.png' : 'mobile-hero.png', output).pathname })
      const reviewControl = page.getByRole('button', { name: 'Next reviews' })
      await reviewControl.focus()
      await page.keyboard.press('Tab')
      await page.keyboard.press('Shift+Tab')
      assert.equal(await reviewControl.evaluate(button => getComputedStyle(button).outlineColor), 'rgb(247, 243, 235)')
      await page.screenshot({ path: new URL(width === 1440 ? 'desktop-review-focus.png' : 'mobile-review-focus.png', output).pathname })
      if (width === 390) {
        const quickContact = page.getByRole('navigation', { name: 'Quick contact' })
        assert.equal(await quickContact.count(), 1)
        const callLink = quickContact.getByRole('link', { name: 'Call Sue', exact: true })
        await callLink.focus()
        assert.equal(await callLink.getAttribute('href'), 'tel:+19139441983')
        assert.equal(await callLink.evaluate(link => getComputedStyle(link).outlineColor), 'rgb(247, 243, 235)')
        await page.screenshot({ path: new URL('mobile-contact-focus.png', output).pathname })
      }
    }
    results.push({ width, noOverflow: true, dressImagesLoaded: true, dressStagesKeyboard: true, reducedMotion: true, accordionKeyboard: true, reviewNavigation: true, fittingValidation: true, fittingReviewEditClear: true, fittingNoNetworkOrStorage: true, mobileMenu: width <= 850 ? true : 'not applicable', accessibility })
    await page.close()
  }
  assert.deepEqual(errors, [], 'No browser runtime errors')
  const context = await browser.newContext()
  for (const path of ['/demo/sues-tailor/', '/demo/best-tailor/', '/demos/best-tailor/index.html', '/demos/best-tailor/media/first-fitting.webp', '/demos/best-tailor/media/small-details.webp', '/demos/best-tailor/media/final-fitting.webp', '/demos/best-tailor/fonts/libre-caslon-display.ttf']) {
    const response = await context.request.get(`${origin}${path}`)
    assert.equal(response.status(), 200, path)
  }
  await context.close()
  await writeFile(new URL('browser-results.json', output), `${JSON.stringify({ results, runtimeErrors: errors, checkedAt: '2026-11-17', environment: 'local Vite development preview' }, null, 2)}\n`)
  console.log(`Sue’s Tailor Shop bridal revision: ${results.length} viewport checks passed; dress stages, reduced motion, accordion, reviews, appointment preview validation/edit/clear, no form transmission, mobile navigation and public routes passed.`)
} finally {
  await browser.close()
}
