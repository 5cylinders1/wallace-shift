// Measures both package cards (the stacked "rolodex" under the hero) and screenshots them.
// Usage: node prototypes/package-cards/measure.mjs <label>   (dev server on CARDS_PREVIEW_URL, default http://localhost:5173)
// For each width and card it records: card height and whether content is cut off, where each row starts (from the
// card's top, so the two cards can be compared row by row), words on the card, and how often each number appears.
import { mkdir, writeFile } from 'node:fs/promises'
import { playwright } from '../../videos/contractor-previews/runtime.mjs'

const label = process.argv[2] ?? 'before'
const base = process.env.CARDS_PREVIEW_URL ?? 'http://localhost:5173'
const out = new URL(`./review/${label}/`, import.meta.url).pathname
await mkdir(out, { recursive: true })
const sizes = [['desktop', 1440, 900, false], ['tablet', 1024, 768, false], ['iphone', 390, 664, true], ['android', 360, 640, true]]
// Rows in reading order. Missing rows are recorded as null, so a rebuilt card can use different classes.
// Each row lists the rebuilt class first and the original class after it, so both versions measure.
const rows = { name: 'h3', fit: '.pc-identity p', price: '.pc-price', schedule: ':is(.pc-schedule, .pc-today)', buy: '.pc-buy', learn: '.pc-learn', included: '.pc-included h4', includedLast: '.pc-included li:last-child', includedNote: '.pc-included .pc-note', terms: ':is(.pc-know, .pc-terms) h4', termsLast: ':is(.pc-know dl > div, .pc-terms li):last-child', termsNote: '.pc-terms .pc-note', footer: ':is(.pc-see, .pc-footer)' }
const numbers = ['$250', '$750', '$1,500', '30', '12', '8', '2', '10']
const { chromium } = await playwright()
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const results = []
for (const [size, width, height, phone] of sizes) {
  for (const kind of ['website', 'lead']) {
    const page = await browser.newPage({ viewport: { width, height }, isMobile: phone, hasTouch: phone })
    await page.goto(`${base}/#${kind}-package`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1200)
    await page.evaluate(() => document.querySelectorAll('iframe[src*="reply365"]').forEach(frame => (frame.closest('body > *') ?? frame).remove()))
    const data = await page.evaluate(({ kind, rows, numbers }) => {
      const card = document.getElementById(`${kind}-package`)
      const box = card.getBoundingClientRect()
      const top = selector => { const node = card.querySelector(selector); if (!node) return null; const r = node.getBoundingClientRect(); return Math.round(r.top - box.top) }
      // Text a sighted visitor reads: skip the screen-reader-only copy.
      const walker = document.createTreeWalker(card, NodeFilter.SHOW_TEXT)
      let text = ''
      while (walker.nextNode()) { const parent = walker.currentNode.parentElement; if (!parent.closest('.p-visually-hidden')) text += ` ${walker.currentNode.textContent}` }
      text = text.replace(/\s+/g, ' ').trim()
      const count = value => (text.match(new RegExp(`(^|[^\\d,])${value.replace(/[$]/g, '\\$')}(?![\\d,])`, 'g')) ?? []).length
      // Is every link and button actually visible inside the card, or cut off by it?
      const controls = [...card.querySelectorAll('a, button')].map(node => {
        const r = node.getBoundingClientRect()
        const inside = r.bottom <= box.bottom + 1 && r.top >= box.top - 1
        return { label: node.textContent.replace(/\s+/g, ' ').trim().slice(0, 40), inside, bottom: Math.round(r.bottom - box.top) }
      })
      const style = getComputedStyle(card)
      return {
        height: Math.round(box.height), contentHeight: card.scrollHeight, overflow: style.overflow,
        rows: Object.fromEntries(Object.entries(rows).map(([key, selector]) => [key, top(selector)])),
        words: text.split(' ').length,
        numbers: Object.fromEntries(numbers.map(value => [value, count(value)])),
        controls, text,
      }
    }, { kind, rows, numbers })
    await page.locator(`#${kind}-package`).screenshot({ path: `${out}${size}-${kind}.jpg`, type: 'jpeg', quality: 80 })
    results.push({ size, width, kind, ...data })
    await page.close()
  }
}
await browser.close()
await writeFile(`${out}measurements.json`, JSON.stringify(results, null, 2))
for (const size of sizes.map(([name]) => name)) {
  const [website, lead] = ['website', 'lead'].map(kind => results.find(r => r.size === size && r.kind === kind))
  console.log(`${size}: card heights website ${website.height} (content ${website.contentHeight})  lead ${lead.height} (content ${lead.contentHeight})`)
  console.log(`  words website ${website.words}  lead ${lead.words}`)
  console.log(`  row tops (website / lead): ${Object.keys(rows).map(key => `${key} ${website.rows[key]}/${lead.rows[key]}`).join('  ')}`)
  console.log(`  numbers website ${JSON.stringify(website.numbers)}  lead ${JSON.stringify(lead.numbers)}`)
  const cut = [...website.controls.filter(c => !c.inside).map(c => `website "${c.label}"`), ...lead.controls.filter(c => !c.inside).map(c => `lead "${c.label}"`)]
  console.log(`  cut off: ${cut.length ? cut.join(', ') : 'nothing'}`)
}
