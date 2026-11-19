// Lists every block of text in the inquiry journey section and flags text that appears more than once.
// Usage: node prototypes/inquiry-journey/audit.mjs <label>   (dev server on JOURNEY_PREVIEW_URL, default http://localhost:5173)
// A block is the nearest non-inline element holding the text, so "01 Capture the request." counts once.
// Hidden copies (visibility hidden, display none, or screen-reader-only) are counted and marked.
import { mkdir, writeFile } from 'node:fs/promises'
import { playwright } from '../../videos/contractor-previews/runtime.mjs'

const label = process.argv[2] ?? 'after'
const base = process.env.JOURNEY_PREVIEW_URL ?? 'http://localhost:5173'
const out = new URL(`./review/${label}/`, import.meta.url).pathname
await mkdir(out, { recursive: true })
const { chromium } = await playwright()
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto(`${base}/`, { waitUntil: 'networkidle' })
const items = await page.evaluate(() => {
  const section = document.getElementById('work')
  const blockOf = node => {
    let element = node.parentElement
    while (element !== section && ['inline', 'contents'].includes(getComputedStyle(element).display) && element.tagName !== 'A') element = element.parentElement
    return element
  }
  const hidden = element => {
    for (let current = element; current && current !== section; current = current.parentElement) {
      const style = getComputedStyle(current)
      if (style.visibility === 'hidden' || style.display === 'none' || current.classList.contains('p-visually-hidden')) return true
    }
    return false
  }
  const blocks = new Map()
  const walker = document.createTreeWalker(section, NodeFilter.SHOW_TEXT)
  while (walker.nextNode()) {
    const node = walker.currentNode
    if (!node.textContent.trim() || node.parentElement.closest('svg')) continue
    const block = blockOf(node)
    blocks.set(block, `${blocks.get(block) ?? ''} ${node.textContent}`)
  }
  return [...blocks].map(([element, text]) => ({ text: text.replace(/\s+/g, ' ').trim(), element: `${element.tagName.toLowerCase()}${element.className && typeof element.className === 'string' ? `.${element.className.trim().split(/\s+/).join('.')}` : ''}`, hidden: hidden(element), decorative: Boolean(element.closest('[aria-hidden="true"]')) }))
})
await browser.close()
const counts = items.reduce((map, item) => map.set(item.text, (map.get(item.text) ?? 0) + 1), new Map())
const repeats = [...counts].filter(([, count]) => count > 1).map(([text, count]) => ({ text, count }))
await writeFile(`${out}audit.json`, JSON.stringify({ blocks: items.length, hidden: items.filter(item => item.hidden).length, repeats, items }, null, 2))
for (const item of items) console.log(`${item.hidden ? 'hidden ' : item.decorative ? 'picture' : '       '}  ${item.text.slice(0, 90).padEnd(90)}  ${item.element}`)
console.log(`\n${items.length} text blocks, ${items.filter(item => item.hidden).length} hidden, ${items.filter(item => item.decorative).length} inside pictures.`)
console.log(repeats.length ? `Repeated: ${repeats.map(r => `"${r.text}" ×${r.count}`).join('; ')}` : 'No text repeats.')
