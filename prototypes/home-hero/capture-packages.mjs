// Captures the package cards and the package checkout panel at desktop, tablet and phone widths.
// Usage: node prototypes/home-hero/capture-packages.mjs <label>   (dev server on HERO_PREVIEW_URL)
import { mkdir } from 'node:fs/promises'
import { playwright } from '../../videos/contractor-previews/runtime.mjs'

const label = process.argv[2] ?? 'after'
const base = process.env.HERO_PREVIEW_URL ?? 'http://localhost:5173'
const out = new URL(`./review/${label}/`, import.meta.url).pathname
await mkdir(out, { recursive: true })
const { chromium } = await playwright()
const browser = await chromium.launch({ channel: 'chrome', headless: true })
for (const [name, width, height, phone] of [['desktop', 1440, 900, false], ['tablet', 1024, 768, false], ['iphone', 390, 664, true]]) {
  for (const kind of ['website', 'lead']) {
    const page = await browser.newPage({ viewport: { width, height }, isMobile: phone, hasTouch: phone })
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.goto(`${base}/#${kind}-package`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1200)
    await page.evaluate(() => document.querySelectorAll('iframe[src*="reply365"]').forEach(frame => (frame.closest('body > *') ?? frame).remove()))
    const card = page.locator(`#${kind}-package`)
    await card.screenshot({ path: `${out}card-${kind}-${name}.jpg`, type: 'jpeg', quality: 80 })
    const box = await card.boundingBox()
    await page.locator(`#${kind}-package .pc-buy`).click()
    await page.waitForTimeout(500)
    await page.screenshot({ path: `${out}checkout-${kind}-${name}.jpg`, type: 'jpeg', quality: 80 })
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
    console.log(`${name.padEnd(8)} ${kind.padEnd(8)} card ${Math.round(box.width)}×${Math.round(box.height)}${overflow ? '  OVERFLOW' : ''}${errors.length ? `  ERRORS ${errors[0]}` : ''}`)
    await page.close()
  }
}
await browser.close()
