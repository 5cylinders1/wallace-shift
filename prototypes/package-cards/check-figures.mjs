// Checks every price and count shown on the package cards and in the comparison table against
// src/content/packagePurchase.ts, the source the agreement is built from. Fails if a card says
// something the package terms don't.
// Usage: node prototypes/package-cards/check-figures.mjs   (dev server on CARDS_PREVIEW_URL, default http://localhost:5173)
// Add SELF_TEST=1 to confirm it catches a wrong figure.
import { playwright } from '../../videos/contractor-previews/runtime.mjs'

const base = process.env.CARDS_PREVIEW_URL ?? 'http://localhost:5173'
const { chromium } = await playwright()
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto(`${base}/`, { waitUntil: 'networkidle' })
// SELF_TEST=1 plants a wrong price and a wrong page count on the website card to prove the check fails.
if (process.env.SELF_TEST) await page.evaluate(() => document.getElementById('website-package').append(' $300 a month for 9 pages'))
const report = await page.evaluate(async () => {
  // Vite serves the TypeScript source as a module, so this reads the same data the page uses.
  const { packagePurchases, packageTotal } = await import('/src/content/packagePurchase.ts')
  const words = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, twelve: 12, thirty: 30 }
  const digits = text => text.toLowerCase().replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten|twelve|thirty)\b/g, word => String(words[word]))
  const money = cents => `$${(cents / 100).toLocaleString('en-US')}`
  const text = node => node.textContent.replace(/\s+/g, ' ').trim()
  const units = /(\d+)\s+(pages?|hours?|days?|monthly payments|payments)/gi
  const results = []
  const columnFor = { website: 2, lead: 3 }
  for (const [id, item] of Object.entries(packagePurchases)) {
    const source = digits([...item.terms, item.scope, item.exclusions, item.delivery].join(' '))
    const allowedMoney = new Set([money(item.amount), money(packageTotal(id))])
    const card = text(document.getElementById(`${id}-package`))
    const column = [...document.querySelectorAll('#compare tr')].map(row => row.children[columnFor[id] - 1]).filter(Boolean).map(text).join(' ')
    for (const [where, shown] of [['card', card], ['comparison table', column]]) {
      for (const figure of new Set(shown.match(/\$[\d,]+/g) ?? [])) {
        results.push({ ok: allowedMoney.has(figure), line: `${id} ${where}: ${figure} ${allowedMoney.has(figure) ? 'matches the price' : `is not ${[...allowedMoney].join(' or ')}`}` })
      }
      for (const match of new Set([...digits(shown).matchAll(units)].map(m => `${m[1]} ${m[2].toLowerCase()}`))) {
        // "8 pages" must appear in the terms as "8 pages"; "2 hours" as "two hours", and so on.
        const ok = source.includes(match) || source.includes(match.replace(/s$/, ''))
        results.push({ ok, line: `${id} ${where}: "${match}" ${ok ? 'is in the package terms' : 'is NOT in the package terms'}` })
      }
    }
  }
  return results
})
await browser.close()
for (const { ok, line } of report) console.log(`${ok ? 'pass' : 'FAIL'} ${line}`)
process.exitCode = report.every(result => result.ok) ? 0 : 1
