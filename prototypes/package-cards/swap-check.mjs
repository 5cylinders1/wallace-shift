// Switches the stacked cards back and forth and checks the page doesn't jump: the stack keeps its
// height, the back card stays unclickable, the swap animation finishes, and nothing errors.
// Usage: node prototypes/package-cards/swap-check.mjs   (dev server on CARDS_PREVIEW_URL)
import { playwright } from '../../videos/contractor-previews/runtime.mjs'

const base = process.env.CARDS_PREVIEW_URL ?? 'http://localhost:5173'
const { chromium } = await playwright()
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const results = []
for (const [name, width, height, phone] of [['desktop', 1440, 900, false], ['tablet', 1024, 768, false], ['iphone', 390, 664, true]]) {
  const page = await browser.newPage({ viewport: { width, height }, isMobile: phone, hasTouch: phone })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(`${base}/#website-package`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)
  const state = () => page.evaluate(() => {
    const stack = document.querySelector('.p-package-stack')
    const front = stack.querySelector('.p-package.is-selected')
    const back = stack.querySelector('.p-package:not(.is-selected)')
    return { stack: stack.offsetHeight, front: front.id, backInert: back.inert, inline: [...stack.querySelectorAll('.p-package')].map(card => card.getAttribute('style') ?? '').join('|') }
  })
  const before = await state()
  const heights = [before.stack]
  for (const _ of [1, 2]) {
    await page.locator('.p-stack-tab').evaluate(tab => tab.click())
    await page.waitForTimeout(1300)
    heights.push((await state()).stack)
  }
  const after = await state()
  const ok = heights.every(value => value === heights[0]) && after.front === before.front && after.backInert && !after.inline.trim().replace(/\|/g, '') && !errors.length
  results.push(ok)
  console.log(`${ok ? 'pass' : 'FAIL'} ${name}: stack ${heights.join(' → ')}px over two swaps, back card unclickable ${after.backInert}, animation styles cleared ${!after.inline.trim().replace(/\|/g, '')}${errors.length ? `, errors: ${errors[0]}` : ''}`)
  await page.close()
}
await browser.close()
process.exitCode = results.every(Boolean) ? 0 : 1
