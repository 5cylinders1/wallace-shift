// Renders the poster stills and lander preview from the live engine, so they
// always match the real model. Needs the dev server (launch config
// `riffle-demo-preview`, port 5184) and cwebp.
//   node scripts/water/stills.mjs [origin]
import { execFileSync } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { playwright } from '../../videos/contractor-previews/runtime.mjs'

const origin = process.argv[2] || 'http://localhost:5184'
const raw = new URL('../../output/water/stills/', import.meta.url).pathname
const media = new URL('../../public/demos/water/', import.meta.url).pathname
await mkdir(raw, { recursive: true })

const { chromium } = await playwright()
const browser = await chromium.launch({ channel: 'chrome', args: ['--use-angle=metal', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] })

async function grab(name, width, height, camera) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 })
  const page = await context.newPage()
  await page.goto(`${origin}/riffle`, { waitUntil: 'load' })
  await page.waitForFunction(() => document.querySelector('.rf-stage.is-ready'), null, { timeout: 60000 })
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(6500)
  const data = await page.evaluate((shot) => {
    const engine = window.riffle
    const target = structuredClone(engine.target)
    target.mode = 'whole'
    target.drift = 0
    if (shot) target.camera = { ...target.camera, ...shot }
    engine.setActive(false)
    engine.setTarget(target, true)
    for (let i = 0; i < 40; i++) engine.step(0.1)
    return engine.capture('image/png')
  }, camera)
  const path = `${raw}${name}.png`
  await writeFile(path, Buffer.from(data.split(',')[1], 'base64'))
  await context.close()
  return path
}

const webp = (from, to) => execFileSync('cwebp', ['-quiet', '-q', '84', '-m', '6', from, '-o', `${media}${to}`])

webp(await grab('poster', 1920, 1200), 'poster.webp')
webp(await grab('poster-narrow', 860, 1720), 'poster-narrow.webp')
const preview = await grab('preview', 1200, 630, { distance: 37, offsetX: 0, offsetY: 0, azimuth: -7, elevation: 4, target: [-1.9, 1.9, 0], fov: 28 })
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', preview, '-q:v', '3', `${media}preview.jpg`])

await browser.close()
console.log('Wrote poster.webp, poster-narrow.webp and preview.jpg')
