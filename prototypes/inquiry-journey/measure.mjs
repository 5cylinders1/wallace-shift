// Measures the inquiry journey section ("The website is the start") and screenshots it at each step.
// Usage: [AXE_PATH=/path/to/axe.min.js] node prototypes/inquiry-journey/measure.mjs <label>   (dev server on JOURNEY_PREVIEW_URL, default http://localhost:5173)
// It reads the section's own scroll trigger to land on fixed points: mid step 1, mid step 2, and fully delivered.
import { mkdir, writeFile } from 'node:fs/promises'
import { playwright } from '../../videos/contractor-previews/runtime.mjs'

const label = process.argv[2] ?? 'before'
const base = process.env.JOURNEY_PREVIEW_URL ?? 'http://localhost:5173'
const out = new URL(`./review/${label}/`, import.meta.url).pathname
await mkdir(out, { recursive: true })
const sizes = [['desktop', 1440, 900, false], ['tablet', 1024, 768, false], ['iphone', 390, 664, true], ['android', 360, 640, true]]
const points = [['step1', .25], ['step2', .58], ['delivered', 1]]
const { chromium } = await playwright()
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const results = []
for (const [size, width, height, phone] of sizes) {
  const page = await browser.newPage({ viewport: { width, height }, isMobile: phone, hasTouch: phone })
  await page.goto(`${base}/`, { waitUntil: 'networkidle' })
  await page.evaluate(() => document.querySelectorAll('iframe[src*="reply365"]').forEach(frame => (frame.closest('body > *') ?? frame).remove()))
  await page.evaluate(() => document.getElementById('work')?.scrollIntoView())
  await page.waitForTimeout(1200)
  // The page bundles GSAP as a module, so load the same ScrollTrigger instance the app already imported.
  const range = await page.evaluate(async () => {
    const url = performance.getEntriesByType('resource').map(entry => entry.name).find(name => /gsap_ScrollTrigger|ScrollTrigger\.js/.test(name))
    if (!url) return null
    const { ScrollTrigger } = await import(url)
    const trigger = ScrollTrigger.getById('inquiry-journey')
    return trigger ? { start: trigger.start, end: trigger.end, pinned: Boolean(trigger.pin) } : null
  })
  if (!range) { results.push({ size, error: 'scroll trigger not reachable' }); await page.close(); continue }
  const result = { size, width, height, pinned: range.pinned, scrollLength: Math.round(range.end - range.start), steps: {} }
  for (const [name, progress] of points) {
    await page.evaluate(y => window.scrollTo(0, y), range.start + (range.end - range.start) * progress + (progress === 1 ? 4 : 0))
    await page.waitForTimeout(700)
    const shot = await page.evaluate(() => {
      const box = selector => { const element = document.querySelector(selector); if (!element) return null; const r = element.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), width: Math.round(r.width), height: Math.round(r.height), centerX: Math.round(r.left + r.width / 2), centerY: Math.round(r.top + r.height / 2) } }
      const section = document.getElementById('work')
      // The rebuilt section uses one frame per step and an h3 per step; the original used three different stations.
      const rebuilt = Boolean(document.querySelector('.ij-frame'))
      const pick = (after, before) => box(rebuilt ? after : before)
      const type = selector => { const element = document.querySelector(selector); if (!element) return null; const style = getComputedStyle(element); return `${style.fontSize} ${style.fontWeight}` }
      return {
        stage: section?.dataset.stage,
        caption: rebuilt ? document.querySelector('.ij-step[data-state="current"] h3')?.textContent?.trim() : [...document.querySelectorAll('.ij-caption-copy')].find(element => element.style.visibility !== 'hidden')?.textContent?.trim(),
        scene: box('.ij-scene'),
        story: box('.ij-story'),
        frames: rebuilt ? [...document.querySelectorAll('.ij-frame')].map(element => { const r = element.getBoundingClientRect(); return { top: Math.round(r.top * 10) / 10, height: Math.round(r.height * 10) / 10, centerY: Math.round((r.top + r.height / 2) * 10) / 10 } }) : null,
        pictures: { customer: pick('.ij-step:nth-child(1) .ij-frame', '.ij-phone'), inquiry: pick('.ij-step:nth-child(2) .ij-frame', '.ij-record'), team: pick('.ij-step:nth-child(3) .ij-frame', '.ij-team-portrait') },
        art: { customer: box(rebuilt ? '.ij-phone-art' : '.ij-phone'), inquiry: box(rebuilt ? '.ij-mail-card' : '.ij-record'), team: box('.ij-team-portrait') },
        labels: { customer: pick('.ij-step:nth-child(1) h3', '.ij-customer .ij-station-label'), inquiry: pick('.ij-step:nth-child(2) h3', '.ij-email-example'), team: pick('.ij-step:nth-child(3) h3', '.ij-team .ij-station-label') },
        labelType: rebuilt ? [1, 2, 3].map(n => type(`.ij-step:nth-child(${n}) h3`)) : [type('.ij-customer .ij-station-label'), type('.ij-email-example > span'), type('.ij-team .ij-station-label')],
        heading: { height: box('.ij-heading')?.height, position: getComputedStyle(document.querySelector('.ij-heading')).position },
        connectors: [...document.querySelectorAll('.ij-route-segment')].map(path => {
          if (!path.getAttribute('d')) return null
          const length = path.getTotalLength(), a = path.getPointAtLength(0), b = path.getPointAtLength(length)
          const origin = path.ownerSVGElement.getBoundingClientRect()
          return { length: Math.round(length * 10) / 10, angle: Math.round(Math.atan2(b.y - a.y, b.x - a.x) * 1800 / Math.PI) / 10, rise: Math.round(b.y - a.y), run: Math.round(b.x - a.x), from: [Math.round(origin.left + a.x), Math.round(origin.top + a.y)], to: [Math.round(origin.left + b.x), Math.round(origin.top + b.y)] }
        }),
      }
    })
    await page.screenshot({ path: `${out}${size}-${name}.jpg`, type: 'jpeg', quality: 78 })
    result.steps[name] = shot
    // Optional accessibility check of the finished section: AXE_PATH=/path/to/axe.min.js
    if (process.env.AXE_PATH && name === 'delivered') {
      await page.addScriptTag({ path: process.env.AXE_PATH })
      result.axe = await page.evaluate(async () => (await window.axe.run(document.getElementById('work'), { resultTypes: ['violations'] })).violations.map(v => `${v.id} ${v.impact} (${v.nodes.length})`))
    }
  }
  results.push(result)
  await page.close()
}
await browser.close()
await writeFile(`${out}measurements.json`, JSON.stringify(results, null, 2))
for (const r of results) {
  if (r.error) { console.log(r.size, r.error); continue }
  const d = r.steps.delivered
  const p = d.pictures, l = d.labels
  console.log(`${r.size.padEnd(8)} ${r.pinned ? 'pinned' : 'scrolls'} over ${r.scrollLength}px`)
  console.log(`  story ${d.story?.height}px  heading ${d.heading?.height}px ${d.heading?.position}  label type ${d.labelType.join(' / ')}`)
  console.log(`  picture heights  customer ${p.customer?.height}  inquiry ${p.inquiry?.height}  team ${p.team?.height}${d.frames ? `  (frames ${d.frames.map(f => `${f.height}@${f.centerY}`).join(', ')})` : ''}`)
  console.log(`  picture centres  customer ${p.customer?.centerY}  inquiry ${p.inquiry?.centerY}  team ${p.team?.centerY}  (spread ${Math.max(...Object.values(p).map(x => x?.centerY ?? 0)) - Math.min(...Object.values(p).map(x => x?.centerY ?? 0))}px)`)
  console.log(`  label tops       customer ${l.customer?.top}  inquiry ${l.inquiry?.top}  team ${l.team?.top}`)
  console.log(`  connectors       ${d.connectors.map(c => c ? `${c.angle}° (${c.length}px)` : 'none').join('  ')}`)
  console.log(`  captions         ${['step1', 'step2', 'delivered'].map(k => r.steps[k].caption?.slice(0, 40)).join(' | ')}`)
  if (r.axe) console.log(`  axe              ${r.axe.length ? r.axe.join(', ') : 'no violations'}`)
}
