/** Focused paused native-control geometry/screenshot check, without full replay.
 * PREVIEW_IDS=velar,stratum,datum node videos/contractor-previews/narrated-controls-qa.mjs
 * BASE_URL=https://contractors.wallaceshift.com/ OUTPUT_DIR=output/live-narrated-previews node ...
 * Default IDs are films with local narrated delivery and timeline reports.
 * Native controls are exposed by pause + ordinary pointer hover, never CSS.
 * Screenshot inspection is still needed to verify the actual native panel.
 */
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { playwright, root } from './runtime.mjs'
import { contractorPreviewIds } from '../../scripts/contractor-preview-contract.mjs'

const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:5176/demos/contractors/'
const outputRoot = process.env.OUTPUT_DIR ? resolve(root, process.env.OUTPUT_DIR) : join(root, 'output/narrated-previews')
const ids = process.env.PREVIEW_IDS ? process.env.PREVIEW_IDS.split(',').map(id => id.trim()).filter(Boolean) : contractorPreviewIds.filter(id => existsSync(join(root, 'output/narrated-previews', id, 'delivery-probe.json')) && existsSync(join(root, 'output/narrated-previews', id, 'edit-timeline.json')))
assert(ids.length && new Set(ids).size === ids.length, 'No completed films or duplicate IDs')
for (const id of ids) assert(contractorPreviewIds.includes(id), `Unknown preview: ${id}`)
const names = { northvane: 'Northvane Roofing', 'alder-stone': 'Alder & Stone', contour: 'Contour Roofing', halcyon: 'Halcyon Roofworks', velar: 'Velar Roof Atelier', stratum: 'Stratum Roofing Co.', datum: 'Datum', tambour: 'Tambour', mitre: 'Mitre & Rift', stillwater: 'Stillwater Pool Co.', 'roofing-crm': 'Roofing CRM workspace' }
const results = { velar: 'planning', stratum: 'finish', datum: 'result', mitre: 'finished', stillwater: 'brief', 'roofing-crm': 'inspection', tambour: 'result' }
const orientations = [{ id: 'portrait', width: 390, height: 844 }, { id: 'landscape', width: 844, height: 390 }]
const contextModes = [
  { id: 'desktop', isMobile: false, hasTouch: false, viewports: [{ id: 'desktop', width: 1440, height: 1000 }] },
  { id: 'phone', isMobile: true, hasTouch: true, viewports: orientations },
]
const inputs = new Map()
for (const id of ids) {
  const timeline = JSON.parse(await readFile(join(root, 'output/narrated-previews', id, 'edit-timeline.json'), 'utf8'))
  const shot = timeline.shots.find(item => item.id === (results[id] || 'brief'))
  assert(shot, `${id}: important result shot missing`)
  const cue = timeline.captions.filter(item => item.start >= shot.start && item.end <= shot.start + shot.duration + 0.03).at(-1)
  assert(cue && cue.end > cue.start, `${id}: result caption missing`)
  inputs.set(id, { timeline, shot, cue, target: Math.max(cue.start + 0.05, cue.end - Math.min(0.3, (cue.end - cue.start) / 3)) })
}
const summary = { target: baseUrl, recordedAt: new Date().toISOString(), ids, method: 'One real Watch click in each desktop and phone context per film; pause and seek to the late portion of a result caption, then expose native controls by pointer hover at desktop 1440x1000, phone portrait 390x844, and phone landscape 844x390.', limitation: 'Geometry and screenshot evidence only. This is not a repeated complete playback, human listening, physical-device certification, or a passed visual review of the browser-native controls.', films: [] }
await mkdir(outputRoot, { recursive: true })
const { chromium } = await playwright()
const browser = await chromium.launch({ channel: 'chrome', headless: true, ignoreDefaultArgs: ['--mute-audio'] })
try {
  for (const id of ids) {
    const out = join(outputRoot, id, 'controls-qa')
    await mkdir(out, { recursive: true })
    const { timeline, shot, cue, target } = inputs.get(id)
    const report = { id, target: baseUrl, recordedAt: new Date().toISOString(), scene: shot.id, targetTime: target, expectedCaption: cue.text, orientations: [], errors: [], visualReview: 'Pending screenshot inspection; native-control bounds are not inferred from inaccessible shadow DOM.' }
    summary.films.push(report)
    for (const contextMode of contextModes) {
      const firstViewport = contextMode.viewports[0]
      const context = await browser.newContext({ viewport: { width: firstViewport.width, height: firstViewport.height }, isMobile: contextMode.isMobile, hasTouch: contextMode.hasTouch, deviceScaleFactor: 1 })
      const page = await context.newPage()
      page.on('pageerror', error => report.errors.push(error.message))
      try {
        const response = await page.goto(baseUrl, { waitUntil: 'load', timeout: 45000 })
        assert.equal(response?.status(), 200, 'Public gallery should return 200')
        const watch = page.getByRole('article').filter({ has: page.getByRole('heading', { name: names[id], exact: true }) }).getByRole('button', { name: 'Watch demo', exact: true })
        await watch.click()
        await page.waitForFunction(() => { const video = document.querySelector('dialog video'); return video && !video.paused && video.currentTime > 0 }, null, { timeout: 30000 })
        const video = page.getByRole('dialog').locator('video')
        assert(await video.evaluate((element, duration) => Math.abs(element.duration - duration) < 0.25, timeline.total), 'Video duration must match local edit timeline')
        for (const orientation of contextMode.viewports) {
          await page.setViewportSize({ width: orientation.width, height: orientation.height })
          await video.evaluate((element, time) => new Promise((resolve, reject) => {
            element.pause(); element.muted = true
            const timer = setTimeout(() => reject(new Error('Result-frame seek timed out')), 10000)
            const done = () => { clearTimeout(timer); resolve() }
            if (Math.abs(element.currentTime - time) < 0.02) { done(); return }
            element.addEventListener('seeked', done, { once: true }); element.currentTime = time
          }), target)
          await video.scrollIntoViewIfNeeded()
          const box = await video.boundingBox()
          assert(box, 'Video has a visible box')
          await video.hover({ position: { x: box.width / 2, y: box.height - 24 } })
          await page.waitForTimeout(300)
          const geometry = await video.evaluate(element => {
            const box = element.getBoundingClientRect(), style = getComputedStyle(element)
            const scale = Math.min(box.width / element.videoWidth, box.height / element.videoHeight)
            const width = element.videoWidth * scale, height = element.videoHeight * scale
            const position = style.objectPosition.split(/\s+/)
            const offset = (value, free) => value.endsWith('%') ? parseFloat(value) * free / 100 : parseFloat(value)
            const left = box.left + offset(position[0], box.width - width)
            const top = box.top + offset(position[1], box.height - height)
            const picture = { left, top, width, height, right: left + width, bottom: top + height }
            return {
              videoBox: { left: box.left, top: box.top, width: box.width, height: box.height, bottom: box.bottom },
              objectFit: style.objectFit, objectPosition: style.objectPosition, picture,
              // All current encoded compositions reserve their last 180 of 1080
              // source pixels for burned captions; this is design-based geometry.
              inferredCaptionBand: { top: picture.bottom - 180 * scale, bottom: picture.bottom, height: 180 * scale },
              bottomRailPx: box.bottom - picture.bottom, controls: element.controls, paused: element.paused,
              currentTime: element.currentTime, muted: element.muted, coarsePointer: matchMedia('(pointer: coarse)').matches,
              mediaError: element.error?.message || null, viewport: { width: innerWidth, height: innerHeight },
            }
          })
          const checks = [
            { name: 'Pointer matches the requested desktop or touch context', passed: geometry.coarsePointer === contextMode.hasTouch },
            { name: 'Native controls enabled and video paused', passed: geometry.controls && geometry.paused },
            { name: 'Picture is contained and top aligned', passed: geometry.objectFit === 'contain' && Math.abs(geometry.picture.top - geometry.videoBox.top) < 0.5 },
            { name: 'At least 50px below picture for native controls', passed: geometry.bottomRailPx >= 50 },
            { name: 'Whole picture and caption band fit in viewport', passed: geometry.picture.left >= -1 && geometry.picture.right <= orientation.width + 1 && geometry.picture.top >= -1 && geometry.picture.bottom <= orientation.height + 1 },
            { name: 'Paused time is inside intended caption', passed: geometry.currentTime >= cue.start && geometry.currentTime <= cue.end },
            { name: 'No media error', passed: geometry.mediaError === null },
          ]
          const filename = `${orientation.id}-${shot.id}.png`
          await page.screenshot({ path: join(out, filename) })
          report.orientations.push({ orientation: orientation.id, screenshot: filename, geometry, checks, passed: checks.every(check => check.passed), nativeControlsVisibility: 'Requested with pause + ordinary hover; inspect the screenshot to confirm panel visibility and separation from captions.' })
        }
        await page.getByRole('button', { name: 'Close demo preview', exact: true }).click()
      } catch (error) {
        report.errors.push(error.stack || error.message)
        await page.screenshot({ path: join(out, `${contextMode.id}-failure.png`) }).catch(() => {})
      } finally {
        await context.close()
      }
    }
    report.passed = report.errors.length === 0 && report.orientations.length === contextModes.reduce((count, mode) => count + mode.viewports.length, 0) && report.orientations.every(mode => mode.passed)
    await writeFile(join(out, 'report.json'), `${JSON.stringify(report, null, 2)}\n`)
    console.log(`${id}: ${report.passed ? 'geometry passed; inspect paused controls screenshots' : 'FAILED; inspect report'}`)
  }
} finally {
  await browser.close()
  summary.passed = summary.films.length === ids.length && summary.films.every(film => film.passed)
  await writeFile(join(outputRoot, 'mobile-controls-report.json'), `${JSON.stringify(summary, null, 2)}\n`)
}
process.exitCode = summary.passed ? 0 : 1
