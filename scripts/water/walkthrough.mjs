// Walks the Riffle demo in a real browser at each viewport and checks it as it goes:
// no console errors, no sideways scroll, the plumbing states report correctly.
// Screenshots go to output/water/shots/ for looking at.
//
// Needs the dev server: launch config `riffle-demo-preview`, port 5184.
//   node scripts/water/walkthrough.mjs [origin]
import { mkdir } from 'node:fs/promises'
import { playwright } from '../../videos/contractor-previews/runtime.mjs'

const origin = process.argv[2] || 'http://localhost:5184'
const out = new URL('../../output/water/shots/', import.meta.url).pathname
await mkdir(out, { recursive: true })

const { chromium } = await playwright()
const browser = await chromium.launch({ channel: 'chrome', args: ['--use-angle=metal', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] })
const failures = []
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ` (${detail})` : ''}`)
  if (!ok) failures.push(name)
}

const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'laptop', width: 1024, height: 768 },
  { name: 'phone', width: 390, height: 844, mobile: true },
  { name: 'small', width: 360, height: 700, mobile: true },
]

const stops = [
  ['hero', null, 0],
  ['coverage-none', '#coverage', 0],
  ['coverage-tap', '#coverage', 1],
  ['coverage-whole', '#coverage', 2],
  ['system-closed', '#system', 0],
  ['system-sediment', '#system', 1],
  ['system-carbon', '#system', 2],
  ['system-scale', '#system', 3],
  ['system-tracer', '#system', 4],
  ['rooms-kitchen', '#rooms', 0],
  ['rooms-shower', '#rooms', 1],
  ['rooms-machines', '#rooms', 2],
  ['study', '.rf-study', 0],
  ['volume', '.rf-volume', 0],
]

for (const viewport of viewports) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: viewport.mobile ? 2 : 1,
    isMobile: Boolean(viewport.mobile),
    hasTouch: Boolean(viewport.mobile),
  })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()) })
  await page.goto(`${origin}/riffle`, { waitUntil: 'load' })
  await page.waitForFunction(() => document.querySelector('.rf-stage.is-ready'), null, { timeout: 60000 })
  const waved = await page.waitForFunction(() => window.riffle.plumbing.treatedOf('shower') === 1, null, { timeout: 25000 }).then(() => true, () => false)
  check(`${viewport.name}: hero wave finishes clean`, waved)
  await page.waitForTimeout(1500)

  for (const [name, selector, step] of stops) {
    if (selector) {
      await page.evaluate(([sel, index]) => {
        const nodes = document.querySelector(sel).querySelectorAll('[data-step]')
        const rect = nodes[index].getBoundingClientRect()
        window.scrollTo({ top: window.scrollY + rect.top + rect.height * 0.4 - innerHeight * 0.55, behavior: 'instant' })
      }, [selector, step])
      await page.waitForTimeout(name.startsWith('coverage') || name === 'study' || name === 'volume' ? 5200 : 3200)
    }
    if (name === 'coverage-none') check(`${viewport.name}: raw water reads 0 of 8`, /^0 of 8/.test(await page.locator('.rf-count').innerText()))
    if (name === 'coverage-tap') check(`${viewport.name}: under-sink filter reads 1 of 8`, /^1 of 8/.test(await page.locator('.rf-count').innerText()))
    if (name === 'coverage-whole') check(`${viewport.name}: whole-house reads 8 of 8`, /^8 of 8/.test(await page.locator('.rf-count').innerText()))
    await page.screenshot({ path: `${out}${viewport.name}-${name}.jpg`, quality: 82, type: 'jpeg' })
  }

  // Controls: the visitor's choice wins over scroll position until the next step.
  await page.evaluate(() => {
    const node = document.querySelector('#coverage').querySelectorAll('[data-step]')[0]
    const rect = node.getBoundingClientRect()
    window.scrollTo({ top: window.scrollY + rect.top + rect.height * 0.4 - innerHeight * 0.55, behavior: 'instant' })
  })
  await page.waitForTimeout(800)
  await page.getByRole('radio', { name: /whole-house/i }).click()
  await page.waitForTimeout(6000)
  check(`${viewport.name}: switch to whole-house by hand`, /^8 of 8/.test(await page.locator('.rf-count').innerText()))

  await page.evaluate(() => {
    const node = document.querySelector('#system').querySelectorAll('[data-step]')[4]
    const rect = node.getBoundingClientRect()
    window.scrollTo({ top: window.scrollY + rect.top + rect.height * 0.4 - innerHeight * 0.55, behavior: 'instant' })
  })
  await page.waitForTimeout(2200)
  await page.getByRole('radio', { name: 'Lead' }).click()
  await page.waitForTimeout(3000)
  check(`${viewport.name}: lead is honest about getting through`, /gets through/i.test(await page.locator('.rf-readout').innerText()))
  await page.screenshot({ path: `${out}${viewport.name}-tracer-lead.jpg`, quality: 82, type: 'jpeg' })

  const study = page.locator('.rf-study')
  await study.locator('input[type="range"]').first().evaluate((input) => {
    input.scrollIntoView({ block: 'center', behavior: 'instant' })
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
    set.call(input, '15')
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await page.waitForTimeout(3500)
  const lost = await study.locator('.rf-metrics dd').first().innerText()
  check(`${viewport.name}: 15 years at 15 gpg, 50 gal/day costs 12%`, lost === '12%', lost)
  await page.screenshot({ path: `${out}${viewport.name}-study-15y.jpg`, quality: 82, type: 'jpeg' })

  // The price: both answers move it, and the schedule form carries it along.
  const cost = page.locator('#cost')
  const setRange = (input, value) => input.evaluate((node, next) => {
    node.scrollIntoView({ block: 'center', behavior: 'instant' })
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
    set.call(node, next)
    node.dispatchEvent(new Event('input', { bubbles: true }))
  }, value)
  const home = cost.getByLabel(/size of your home/i)
  const people = cost.getByLabel(/people at home/i)
  const price = () => cost.locator('.rf-quote-price').innerText()
  await setRange(home, '1500')
  await setRange(people, '2')
  check(`${viewport.name}: small home, two people prices the small system`, await price() === '$2,950', await price())
  await setRange(people, '4')
  check(`${viewport.name}: two more people moves the price`, await price() === '$3,850', await price())
  check(`${viewport.name}: says the household set the size`, /household sets/i.test(await cost.locator('.rf-cost-why').innerText()))
  await setRange(home, '4000')
  check(`${viewport.name}: a bigger home moves the price`, await price() === '$5,200', await price())
  check(`${viewport.name}: says the home set the size`, /home sets/i.test(await cost.locator('.rf-cost-why').innerText()))
  await page.waitForTimeout(600)
  await page.screenshot({ path: `${out}${viewport.name}-cost.jpg`, quality: 82, type: 'jpeg' })
  await cost.locator('.rf-quote').screenshot({ path: `${out}${viewport.name}-cost-panel.jpg`, quality: 82, type: 'jpeg' })
  await cost.getByRole('link', { name: 'Schedule this installation' }).click()
  await page.waitForTimeout(1200)
  check(`${viewport.name}: the form carries the price`, /Riffle 4\.0[\s\S]*\$5,200/.test(await page.locator('.rf-form-quote').innerText()))

  for (const [name, sel] of [['answers', '#answers'], ['schedule', '#schedule']]) {
    await page.locator(sel).scrollIntoViewIfNeeded()
    await page.waitForTimeout(500)
    await page.screenshot({ path: `${out}${viewport.name}-${name}.jpg`, quality: 82, type: 'jpeg' })
  }

  const form = page.locator('.rf-form')
  await form.getByLabel('Your name').fill('Test Visitor')
  await form.getByLabel('Phone or email').fill('visitor@example.test')
  await form.getByLabel('ZIP code').fill('66101')
  await form.getByLabel('Preferred day').fill(await form.getByLabel('Preferred day').getAttribute('min'))
  await form.getByRole('button', { name: 'Schedule my installation' }).click()
  check(`${viewport.name}: the form admits it is a demo`, /nothing was sent/i.test(await form.locator('.rf-form-note:not(.rf-form-well)').innerText()))
  await form.getByLabel('Where does your water come from?').selectOption('well')
  check(`${viewport.name}: a well gets tested before a date is held`, /test first/i.test(await form.locator('.rf-form-well').innerText()))

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  check(`${viewport.name}: no sideways scroll`, overflow <= 0, `${overflow}px`)
  check(`${viewport.name}: no console errors`, errors.length === 0, errors.slice(0, 3).join(' | '))
  await context.close()
}

// Reduced motion: nothing flies or flows, and the page starts in its final state.
{
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(`${origin}/riffle`, { waitUntil: 'load' })
  await page.waitForFunction(() => document.querySelector('.rf-stage.is-ready'), null, { timeout: 60000 })
  check('reduced motion: clean water with no wave', await page.evaluate(() => window.riffle.plumbing.treatedOf('shower') === 1))
  const before = await page.evaluate(() => window.riffle.camera.position.toArray())
  await page.waitForTimeout(1500)
  const after = await page.evaluate(() => window.riffle.camera.position.toArray())
  check('reduced motion: the camera holds still', before.every((value, index) => Math.abs(value - after[index]) < 0.001))
  check('reduced motion: no errors', errors.length === 0, errors[0] ?? '')
  await page.screenshot({ path: `${out}reduced-motion.jpg`, quality: 82, type: 'jpeg' })
  await context.close()
}

// No WebGL: the still takes over and the page still says everything.
{
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  await context.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function getContext(type, ...rest) {
      return String(type).startsWith('webgl') ? null : original.call(this, type, ...rest)
    }
  })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(`${origin}/riffle`, { waitUntil: 'load' })
  await page.waitForSelector('.rf-site.is-static', { timeout: 15000 })
  check('no WebGL: falls back to the still', await page.locator('.rf-stage-poster img').evaluate((image) => image.complete && image.naturalWidth > 0))
  check('no WebGL: controls that only move the model are hidden', await page.locator('#coverage .rf-dock').isHidden())
  check('no WebGL: no errors', errors.length === 0, errors[0] ?? '')
  await page.screenshot({ path: `${out}no-webgl.jpg`, quality: 82, type: 'jpeg' })
  await context.close()
}

await browser.close()

if (failures.length) {
  console.error(`\n${failures.length} failed`)
  process.exit(1)
}
console.log('\nAll checks passed.')
