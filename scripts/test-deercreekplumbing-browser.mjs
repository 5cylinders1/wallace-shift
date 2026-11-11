/** Run against `vite dev` or a built `vite preview` server.
 * DEERCREEK_ORIGIN=http://127.0.0.1:5188 node scripts/test-deercreekplumbing-browser.mjs
 * AXE_PATH points to a local axe-core browser bundle for the WCAG scan.
 */
import assert from 'node:assert/strict'
import { mkdir, readFile } from 'node:fs/promises'
import ts from 'typescript'
import { playwright } from '../videos/contractor-previews/runtime.mjs'

const origin = process.env.DEERCREEK_ORIGIN || 'http://127.0.0.1:5188'
const output = process.env.DEERCREEK_SCREENSHOTS || '/tmp/deercreekplumbing-browser'
const javascript = ts.transpileModule(await readFile(new URL('../src/demos/deercreekplumbing/data.ts', import.meta.url), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext } }).outputText
const { BASE, pages } = await import(`data:text/javascript;base64,${Buffer.from(javascript).toString('base64')}`)
const axe = process.env.AXE_PATH ? await readFile(process.env.AXE_PATH, 'utf8') : null
const url = slug => `${origin}${BASE}${slug ? `/${slug}` : ''}`
await mkdir(output, { recursive: true })
const { chromium } = await playwright()
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const findings = []

async function overflow(page, label) {
  const measurement = await page.evaluate(() => ({ viewport: innerWidth, page: document.documentElement.scrollWidth }))
  assert.ok(measurement.page <= measurement.viewport + 1, `${label} overflows: ${JSON.stringify(measurement)}`)
}
async function loadPictures(page) {
  for (const picture of await page.locator('img').all()) await picture.scrollIntoViewIfNeeded()
  await page.waitForFunction(() => [...document.images].every(image => image.complete && image.naturalWidth > 0))
  await page.evaluate(async () => { await document.fonts.ready; scrollTo(0, 0) })
}
async function scan(page, label) {
  if (!axe) return
  await page.addScriptTag({ content: axe })
  const result = await page.evaluate(async () => window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } }))
  const violations = result.violations.map(rule => ({ id: rule.id, impact: rule.impact, description: rule.description, nodes: rule.nodes.map(node => ({ target: node.target, summary: node.failureSummary })) }))
  if (violations.length) findings.push({ label, violations })
  console.log(`${label}: ${violations.length} axe violations (${result.incomplete.map(rule => rule.id).join(', ') || 'no'} checks need manual review)`)
}

try {
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' })
  const errors = []
  desktop.on('pageerror', error => errors.push(error.message))
  for (const route of pages) {
    const response = await desktop.goto(url(route.slug), { waitUntil: 'networkidle' })
    assert.equal(response.status(), 200, route.slug)
    assert.equal(await desktop.locator('h1').count(), 1, route.slug)
    assert.equal(await desktop.locator('main').count(), 1, route.slug)
    await loadPictures(desktop)
    await overflow(desktop, `${route.slug || 'home'} at 1440`)
    await scan(desktop, route.slug || 'home')
  }
  assert.deepEqual(errors, [], 'no hydration or browser errors')
  await desktop.close()

  for (const width of [320, 390, 768, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' })
    await page.goto(url(''), { waitUntil: 'networkidle' })
    await loadPictures(page)
    await overflow(page, `home at ${width}`)
    await page.screenshot({ path: `${output}/home-${width}.png`, fullPage: true })
    await page.keyboard.press('Tab')
    assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Skip to content')
    await page.keyboard.press('Enter')
    assert.equal(await page.evaluate(() => document.activeElement.id), 'main')
    if (width <= 900) {
      const menu = page.getByRole('button', { name: 'Menu', exact: true })
      await menu.click()
      assert.equal(await page.locator('#dcp-navigation').isVisible(), true)
      await page.keyboard.press('Escape')
      assert.equal(await page.locator('#dcp-navigation').isVisible(), false)
      assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Menu')
    }
    const checker = page.getByRole('form', { name: 'Service area checker' })
    await checker.getByLabel('Your town or ZIP code').fill('66062')
    await checker.getByRole('button', { name: 'Check location' }).click()
    assert.match(await page.locator('.dcp-checker-result').innerText(), /Olathe.*confirm your exact address/)
    await checker.getByLabel('Your town or ZIP code').fill('90210')
    await checker.getByRole('button', { name: 'Check location' }).click()
    assert.match(await page.locator('.dcp-checker-result').innerText(), /cannot confirm.*not a decision/s)
    await page.goto(url('schedule'), { waitUntil: 'networkidle' })
    const review = page.getByRole('button', { name: 'Review demo request' })
    await review.click()
    assert.equal(await page.locator('.dcp-error-summary').evaluate(el => el === document.activeElement), true)
    assert.equal(await page.locator('.dcp-error-summary li').count(), 4)
    await page.locator('.dcp-error-summary a').first().click()
    assert.equal(await page.evaluate(() => document.activeElement.tagName), 'SELECT')
    await page.getByLabel('Service (required)', { exact: true }).selectOption('water-heaters')
    await page.getByLabel('Service ZIP code (required)', { exact: true }).fill('66062')
    await page.getByLabel('Your name (required)', { exact: true }).fill('Demo Visitor')
    await page.getByLabel('Email (required)', { exact: true }).fill('demo@example.com')
    assert.equal(await page.getByLabel('Phone (optional)', { exact: true }).inputValue(), '')
    await page.getByLabel('Anything that would make the visit easier? (optional)', { exact: true }).fill('Email is easiest. Please allow extra time at the door.')
    await overflow(page, `form at ${width}`)
    const requests = []
    const record = request => requests.push(request.url())
    page.on('request', record)
    await review.click()
    await page.getByRole('heading', { name: 'Your demo request is ready.' }).waitFor()
    assert.match(await page.locator('.dcp-booking-review').innerText(), /Nothing was sent. No visit is booked./)
    assert.equal(await page.getByRole('heading', { name: 'Your demo request is ready.' }).evaluate(el => el === document.activeElement), true)
    assert.deepEqual(requests, [], 'demo review sends no request')
    page.off('request', record)
    await overflow(page, `review at ${width}`)
    await scan(page, `review at ${width}`)
    await page.screenshot({ path: `${output}/review-${width}.png`, fullPage: true })
    await page.getByRole('button', { name: 'Edit demo details' }).click()
    await page.getByLabel('Contact preference', { exact: true }).selectOption('call')
    await review.click()
    assert.equal(await page.locator('.dcp-error-summary li').count(), 1)
    await page.getByLabel('Phone (required)', { exact: true }).fill('9135550123')
    await page.getByLabel('Email (optional)', { exact: true }).fill('')
    await review.click()
    await page.getByRole('heading', { name: 'Your demo request is ready.' }).waitFor()
    await page.goto(url(''), { waitUntil: 'networkidle' })
    await page.getByText('Reading options', { exact: true }).click()
    await page.getByLabel('Larger text', { exact: true }).check()
    await page.getByLabel('Reduce motion', { exact: true }).check()
    await overflow(page, `larger text home at ${width}`)
    await page.reload({ waitUntil: 'networkidle' })
    assert.equal(await page.locator('html').getAttribute('data-dcp-large'), '')
    assert.equal(await page.locator('html').getAttribute('data-dcp-still'), '')
    assert.equal(await page.locator('h1').evaluate(el => getComputedStyle(el).animationName), 'none')
    await page.close()
    console.log(`Passed keyboard, coverage, email-only and phone-only requests, local-only review, reading preferences and reflow at ${width}px.`)
  }
  const noScript = await browser.newPage({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } })
  await noScript.goto(url('schedule'))
  assert.equal(await noScript.getByRole('button', { name: 'Review demo request' }).isDisabled(), true)
  assert.match(await noScript.locator('noscript').innerText(), /interactive demo needs JavaScript/)
  await noScript.close()
  console.log('Passed no-JavaScript contact fallback and disabled demo form.')
  if (findings.length) console.log(JSON.stringify(findings, null, 2))
  assert.deepEqual(findings, [], 'axe violations need resolution')
  console.log(axe ? 'Automated WCAG scan passed; manual assistive technology review is still needed.' : 'Axe scan skipped: set AXE_PATH to a local axe-core bundle.')
} finally { await browser.close() }
