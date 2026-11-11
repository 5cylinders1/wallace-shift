/** Local-only contextual website inquiry checks. Every contact POST is intercepted. */
import assert from 'node:assert/strict'
import { mkdir, readFile } from 'node:fs/promises'
import { playwright } from '../videos/contractor-previews/runtime.mjs'
const origin = process.env.DEERCREEK_ORIGIN || 'http://127.0.0.1:5190'
assert.ok(['127.0.0.1', 'localhost'].includes(new URL(origin).hostname), 'Use a local server only')
const output = process.env.DEERCREEK_SCREENSHOTS || 'tmp/deercreekplumbing-contact-browser'
await mkdir(output, { recursive: true })
const axe = process.env.AXE_PATH ? await readFile(process.env.AXE_PATH, 'utf8') : null
const { chromium } = await playwright()
const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  for (const width of [1440, 390, 320]) {
    const page = await browser.newPage({ viewport: { width, height: width === 1440 ? 900 : 844 }, reducedMotion: 'reduce' })
    const payloads = []
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.route('**/api/contact', async route => {
      payloads.push(route.request().postDataJSON())
      await route.fulfill({ status: payloads.length === 1 ? 500 : 200, contentType: 'application/json', body: JSON.stringify(payloads.length === 1 ? { ok: false, error: 'temporary' } : { ok: true }) })
    })
    await page.goto(`${origin}/demo/deercreekplumbing`, { waitUntil: 'networkidle' })
    assert.equal(await page.getByRole('link', { name: 'Discuss your website', exact: true }).count(), 0)
    await page.goto(`${origin}/contact?demo=deercreekplumbing&project=website`, { waitUntil: 'networkidle' })
    await page.waitForURL('**/contact?demo=deercreekplumbing&project=website')
    await page.getByRole('heading', { level: 1 }).filter({ hasText: 'Let’s discuss' }).waitFor()
    const heading = (await page.locator('h1').innerText()).replace(/\s+/g, ' ').trim()
    assert.equal(heading, 'Let’s discuss your website.')
    assert.ok(await page.getByText('Tell Matthew about your business and what customers need to understand or accomplish online.', { exact: true }).isVisible())
    const back = page.getByRole('link', { name: /Back to the demo/ })
    assert.equal(await back.getAttribute('href'), '/demo/deercreekplumbing')
    await page.evaluate(async () => { await document.fonts.ready })
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `contact overflow at ${width}`)
    let contextualViolations = []
    if (axe) {
      await page.addScriptTag({ content: axe })
      const result = await page.evaluate(() => window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } }))
      contextualViolations = result.violations.map(rule => ({ id: rule.id, targets: rule.nodes.map(node => node.target) }))
      assert.ok(contextualViolations.every(rule => rule.id === 'color-contrast' && rule.targets.every(target => target[0].startsWith('.site-footer__'))), 'No violations in the updated contact content')
      console.log(`Contact at ${width}: ${contextualViolations.length} existing shared-footer contrast rule; manual items: ${result.incomplete.map(rule => rule.id).join(', ') || 'none'}`)
    }
    await page.screenshot({ path: `${output}/contact-${width}.png`, fullPage: true })
    await page.getByLabel('Name', { exact: true }).fill('Demo Business Owner')
    await page.getByLabel('Email', { exact: true }).fill('demo@example.com')
    await page.getByLabel('About your business and website', { exact: true }).fill('Sample website inquiry. Intercepted test only.')
    await page.getByRole('button', { name: 'Send website details', exact: true }).click()
    await page.getByText('Something went wrong sending this. Please try again shortly.', { exact: true }).waitFor()
    assert.equal(await page.getByLabel('Name', { exact: true }).inputValue(), 'Demo Business Owner', 'recoverable error keeps details')
    await page.getByRole('button', { name: 'Send website details', exact: true }).click()
    await page.waitForURL('**/what-now**')
    assert.equal(payloads.length, 2)
    assert.ok(payloads.every(payload => payload.source === 'deercreekplumbing' && payload.project === 'website'))
    await page.goto(`${origin}/contact`, { waitUntil: 'networkidle' })
    assert.match(await page.locator('h1').innerText(), /AI or CRM/)
    if (axe) {
      await page.addScriptTag({ content: axe })
      const baseline = await page.evaluate(() => window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } }))
      assert.deepEqual(contextualViolations, baseline.violations.map(rule => ({ id: rule.id, targets: rule.nodes.map(node => node.target) })), 'Contextual page introduces no accessibility regression against ordinary contact')
    }
    await page.goto(`${origin}/contact?demo=deercreek`, { waitUntil: 'networkidle' })
    assert.match((await page.locator('h1').innerText()).replace(/\s+/g, ' '), /Let’s plan a website for your business\./)
    assert.deepEqual(errors, [], 'no browser errors')
    console.log(`Passed website handoff, source/project payload, error recovery, ordinary contact and Site A context at ${width}px. All POSTs intercepted.`)
    await page.close()
  }
} finally { await browser.close() }
