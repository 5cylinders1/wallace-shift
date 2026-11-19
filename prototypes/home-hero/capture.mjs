// Captures the homepage hero at desktop, tablet and the visible area of two phones, plus a blurred
// "squint test" copy of each, and measures where each hero element sits against the first screen.
// Usage: node prototypes/home-hero/capture.mjs <label>   (dev server on HERO_PREVIEW_URL, default http://localhost:5173)
import { mkdir, writeFile } from 'node:fs/promises'
import { playwright } from '../../videos/contractor-previews/runtime.mjs'

const label = process.argv[2] ?? 'before'
const base = process.env.HERO_PREVIEW_URL ?? 'http://localhost:5173'
const out = new URL(`./review/${label}/`, import.meta.url).pathname
await mkdir(out, { recursive: true })
// Phone sizes are the visible page area after browser toolbars, not the device size.
const sizes = [['desktop', 1440, 900, false], ['tablet', 1024, 768, false], ['iphone', 390, 664, true], ['android', 360, 640, true]]
// Selectors for both the current hero and the redesign; missing ones are reported as absent.
const parts = {
  headline: '.r-hero h1', summary: '.r-hero-copy > p', primary: '.r-hero .m-button', meetLink: '.r-hero .r-question-link',
  priceWebsite: '.r-hero a[href="#website-package"]', priceLead: '.r-hero a[href="#lead-package"]',
  demoTabs: '.r-example-top', demo: '.r-screen',
}
const { chromium } = await playwright()
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const results = []
for (const [name, width, height, phone] of sizes) {
  const page = await browser.newPage({ viewport: { width, height }, isMobile: phone, hasTouch: phone, deviceScaleFactor: 1 })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(`${base}/`, { waitUntil: 'networkidle' })
  // The Reply365 chat frame refuses to load on localhost and renders as an empty box. In production its
  // launcher sits in the bottom-right corner; it is hidden here so captures show only the hero.
  await page.waitForTimeout(900)
  await page.evaluate(() => document.querySelectorAll('iframe[src*="reply365"], iframe[title="Website chat"]').forEach(frame => (frame.closest('body > *') ?? frame).remove()))
  const layout = await page.evaluate(({ parts, height }) => {
    const found = {}
    for (const [key, selector] of Object.entries(parts)) {
      const element = document.querySelector(selector)
      if (!element) { found[key] = null; continue }
      const box = element.getBoundingClientRect()
      found[key] = { top: Math.round(box.top + scrollY), bottom: Math.round(box.bottom + scrollY), left: Math.round(box.left), width: Math.round(box.width), height: Math.round(box.height), firstScreen: box.bottom + scrollY <= height }
    }
    const hero = document.querySelector('.r-hero')?.getBoundingClientRect()
    return { parts: found, heroBottom: Math.round((hero?.bottom ?? 0) + scrollY), overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth }
  }, { parts, height })
  // Order in which a reader meets each part: top to bottom, then left to right.
  layout.readingOrder = Object.entries(layout.parts).filter(([, box]) => box).sort(([, a], [, b]) => a.top - b.top || a.left - b.left).map(([key]) => key)
  await page.screenshot({ path: `${out}${name}.jpg`, type: 'jpeg', quality: 80, clip: { x: 0, y: 0, width, height: Math.max(height, Math.min(layout.heroBottom, height * 3)) } })
  await page.screenshot({ path: `${out}${name}-first-screen.jpg`, type: 'jpeg', quality: 80 })
  await page.addStyleTag({ content: `body { filter: blur(${phone ? 5 : 9}px); }` })
  await page.waitForTimeout(150)
  await page.screenshot({ path: `${out}${name}-blur.jpg`, type: 'jpeg', quality: 70 })
  results.push({ size: name, width, height, ...layout, errors })
  await page.close()
}
await browser.close()
await writeFile(`${out}layout.json`, JSON.stringify(results, null, 2))
for (const r of results) {
  const shown = Object.entries(r.parts).filter(([, box]) => box).map(([key, box]) => `${key}${box.firstScreen ? '' : '↓'}`)
  console.log(`${r.size.padEnd(8)} ${r.width}×${r.height}  hero ends ${r.heroBottom}px  order: ${r.readingOrder.join(' → ')}  | below first screen: ${shown.filter(s => s.endsWith('↓')).join(', ') || 'none'}${r.overflowX ? '  OVERFLOW' : ''}${r.errors.length ? '  ERRORS' : ''}`)
}
