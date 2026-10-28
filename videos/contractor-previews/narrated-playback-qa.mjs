/** Full playback and sampled-frame QA for the public narrated gallery films.
 *
 * PREVIEW_IDS=velar node videos/contractor-previews/narrated-playback-qa.mjs
 * BASE_URL=https://contractors.wallaceshift.com/ PREVIEW_IDS=velar,... node ...
 * OUTPUT_DIR=output/live-narrated-previews keeps live reports separate.
 *
 * Every selected film plays in full at 1x, first desktop with sound enabled,
 * then phone muted. No authentication, autoplay override, or playback seeking
 * is used during either complete pass. Afterwards, media API controls, the
 * external caption track, and paused phone landscape frames are checked.
 * This is technical playback + sampled-frame evidence, not human listening,
 * a subjective visual review, real-device certification, or buyer validation.
 */
import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { playwright, root } from './runtime.mjs'
import { contractorPreviewIds } from '../../scripts/contractor-preview-contract.mjs'

const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:5176/demos/contractors/'
const outputRoot = process.env.OUTPUT_DIR ? resolve(root, process.env.OUTPUT_DIR) : join(root, 'output/narrated-previews')
const ids = (process.env.PREVIEW_IDS || 'velar').split(',').map(id => id.trim()).filter(Boolean)
assert(ids.length && new Set(ids).size === ids.length, 'Pass one or more unique PREVIEW_IDS')
for (const id of ids) assert(contractorPreviewIds.includes(id), `Unknown preview ID: ${id}`)
const names = {
  northvane: 'Northvane Roofing', 'alder-stone': 'Alder & Stone', contour: 'Contour Roofing',
  halcyon: 'Halcyon Roofworks', velar: 'Velar Roof Atelier', stratum: 'Stratum Roofing Co.',
  datum: 'Datum', tambour: 'Tambour', mitre: 'Mitre & Rift', stillwater: 'Stillwater Pool Co.',
  'roofing-crm': 'Roofing CRM workspace',
}
const modes = [
  { id: 'desktop-sound', viewport: { width: 1440, height: 1000 }, muted: false },
  { id: 'phone-muted', viewport: { width: 390, height: 844 }, muted: true, isMobile: true, hasTouch: true },
]
const timelines = new Map()
// Validate local edit manifests before launching any browser.
for (const id of ids) {
  const timeline = JSON.parse(await readFile(join(root, 'output/narrated-previews', id, 'edit-timeline.json'), 'utf8'))
  assert(timeline.id === id && Number.isFinite(timeline.total) && timeline.total > 0, `${id}: valid edit timeline`)
  assert(timeline.shots?.length && timeline.captions?.length, `${id}: shots and captions required`)
  for (const shot of timeline.shots) assert(Number.isFinite(shot.start) && Number.isFinite(shot.duration) && shot.duration > 1, `${id}: valid shot ${shot.id}`)
  timelines.set(id, timeline)
}

function samplesFor(timeline) {
  const shots = [...timeline.shots]
  const last = shots.at(-1)
  const end = last.start + last.duration
  if (timeline.total - end > 1) shots.push({ id: 'credits', start: end, duration: timeline.total - end })
  return shots.flatMap(shot => [
    { scene: shot.id, part: 'first', target: shot.start + Math.min(0.65, shot.duration / 4) },
    { scene: shot.id, part: 'middle', target: shot.start + shot.duration / 2 },
    { scene: shot.id, part: 'final', target: shot.start + shot.duration - Math.min(0.65, shot.duration / 4) },
  ]).sort((a, b) => a.target - b.target)
}
function check(report, name, condition, details) {
  report.checks.push({ name, passed: Boolean(condition), ...(details === undefined ? {} : { details }) })
}
async function mediaState(video) {
  return video.evaluate(element => {
    const quality = element.getVideoPlaybackQuality()
    const box = element.getBoundingClientRect()
    const scale = Math.min(box.width / element.videoWidth, box.height / element.videoHeight)
    return {
      source: element.currentSrc ? new URL(element.currentSrc).pathname : null,
      currentTime: element.currentTime, duration: element.duration,
      paused: element.paused, ended: element.ended, readyState: element.readyState,
      playbackRate: element.playbackRate, muted: element.muted, volume: element.volume,
      controls: element.controls, playsInline: element.playsInline,
      fullscreen: Boolean(document.fullscreenElement || element.webkitDisplayingFullscreen),
      videoWidth: element.videoWidth, videoHeight: element.videoHeight,
      totalVideoFrames: quality.totalVideoFrames, droppedVideoFrames: quality.droppedVideoFrames,
      decodedAudioBytes: typeof element.webkitAudioDecodedByteCount === 'number' ? element.webkitAudioDecodedByteCount : null,
      mediaError: element.error ? { code: element.error.code, message: element.error.message } : null,
      elementBox: { x: box.x, y: box.y, width: box.width, height: box.height },
      containedPicture: { width: element.videoWidth * scale, height: element.videoHeight * scale },
      // Geometry is evidence for review, not an assertion of readable text.
      pictureScale: scale,
      activeMediaCount: [...document.querySelectorAll('video,audio')].filter(media => !media.paused && !media.ended).length,
    }
  })
}
async function seekPaused(video, time) {
  await video.evaluate((element, target) => new Promise((resolve, reject) => {
    element.pause()
    const timer = setTimeout(() => { element.removeEventListener('seeked', done); reject(new Error(`Seek timed out at ${target}`)) }, 10000)
    function done() { clearTimeout(timer); resolve() }
    if (Math.abs(element.currentTime - target) < 0.02) { done(); return }
    element.addEventListener('seeked', done, { once: true })
    element.currentTime = target
  }), time)
}

const { chromium } = await playwright()
// Playwright normally mutes headless Chrome. Remove only that default; keep
// ordinary browser autoplay policy, so the real Watch gesture must start it.
const browser = await chromium.launch({ channel: 'chrome', headless: true, ignoreDefaultArgs: ['--mute-audio'] })
let failed = false
try {
  for (const id of ids) {
    const timeline = timelines.get(id)
    const out = join(outputRoot, id, 'playback-qa')
    await mkdir(out, { recursive: true })
    const report = {
      id, target: baseUrl, recordedAt: new Date().toISOString(), expectedDurationSeconds: timeline.total,
      method: 'Full playback at normal speed, sequential desktop sound-enabled and emulated phone muted, with sampled frame captures.',
      scope: {
        listening: 'Not performed. Audible element settings, decoded audio bytes where available, and complete playback do not establish human-perceived narration, music balance, synchronization, or device output quality.',
        visualReview: 'Frames are captured for inspection. Automated success does not establish mobile readability or product-story quality. Landscape is sampled after the full portrait pass.',
        buyerValidation: 'Unresolved. No representative contractor participants are recruited or tested by this script.',
        browser: 'Headless installed Chrome with its default mute-audio argument removed. Normal autoplay policy. Phone is touch/mobile emulation, not physical iOS or Android hardware.',
        controls: 'Watch and Close use actual buttons. Post-playback pause, rewind, mute and captions use HTMLMediaElement/TextTrack APIs; native-control hit targets are not exercised.',
        performance: 'One unthrottled lab run per fresh browser context; no field-performance or network-constrained claim.',
      },
      passes: [],
    }
    for (const mode of modes) {
      const passOut = join(out, mode.id)
      await mkdir(passOut, { recursive: true })
      const pass = { mode: mode.id, viewport: mode.viewport, checks: [], frames: [], landscapeFrames: [], errors: [], requests: [], captionResponses: [] }
      report.passes.push(pass)
      const context = await browser.newContext({ viewport: mode.viewport, deviceScaleFactor: 1, isMobile: Boolean(mode.isMobile), hasTouch: Boolean(mode.hasTouch) })
      const page = await context.newPage()
      page.on('pageerror', error => pass.errors.push({ kind: 'pageerror', message: error.message }))
      page.on('requestfailed', request => pass.errors.push({ kind: 'requestfailed', path: new URL(request.url()).pathname, message: request.failure()?.errorText }))
      page.on('request', request => {
        if (/\.(?:mp4|vtt)(?:\?|$)/.test(request.url())) pass.requests.push({ path: new URL(request.url()).pathname, at: Date.now() })
      })
      page.on('response', response => {
        if (/\.vtt(?:\?|$)/.test(response.url())) pass.captionResponses.push({ path: new URL(response.url()).pathname, status: response.status() })
      })
      const cdp = await context.newCDPSession(page)
      await cdp.send('Network.enable')
      const mediaRequests = new Set()
      pass.transferredMediaBytes = 0
      cdp.on('Network.responseReceived', event => { if (/\.mp4(?:\?|$)/.test(event.response.url)) mediaRequests.add(event.requestId) })
      cdp.on('Network.loadingFinished', event => { if (mediaRequests.has(event.requestId)) pass.transferredMediaBytes += event.encodedDataLength })
      await page.addInitScript(({ muted }) => {
        window.__playbackQA = { events: [], firstPlayingAt: null, endedAt: null, maxActiveMedia: 0 }
        const state = window.__playbackQA
        const configure = video => { if (muted && video instanceof HTMLVideoElement) video.muted = true }
        new MutationObserver(records => {
          for (const record of records) for (const node of record.addedNodes) {
            if (node instanceof HTMLVideoElement) configure(node)
            if (node instanceof Element) node.querySelectorAll('video').forEach(configure)
          }
        }).observe(document, { childList: true, subtree: true })
        for (const type of ['loadedmetadata', 'play', 'playing', 'pause', 'waiting', 'stalled', 'seeking', 'seeked', 'ended', 'error', 'ratechange', 'volumechange']) {
          document.addEventListener(type, event => {
            const video = event.target
            if (!(video instanceof HTMLVideoElement)) return
            if (type === 'play' && muted) video.muted = true
            const at = performance.now()
            if (type === 'playing' && state.firstPlayingAt === null) state.firstPlayingAt = at
            if (type === 'ended') state.endedAt = at
            state.maxActiveMedia = Math.max(state.maxActiveMedia, [...document.querySelectorAll('video,audio')].filter(media => !media.paused && !media.ended).length)
            state.events.push({ type, at, time: video.currentTime, rate: video.playbackRate, muted: video.muted, error: video.error?.message || null })
          }, true)
        }
      }, { muted: mode.muted })
      try {
        const response = await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 45000 })
        const card = page.getByRole('article').filter({ has: page.getByRole('heading', { name: names[id], exact: true }) })
        const watch = card.getByRole('button', { name: 'Watch demo', exact: true })
        await watch.waitFor()
        await page.waitForTimeout(500)
        check(pass, 'Public gallery returns 200', response?.status() === 200, response?.status())
        check(pass, 'No authentication cookie supplied', (await context.cookies()).length === 0)
        pass.initialMediaRequests = [...pass.requests]
        check(pass, 'Initial gallery browsing requests no full videos', !pass.requests.some(request => request.path.endsWith('.mp4')), pass.initialMediaRequests)
        check(pass, 'No initial mounted video', await page.locator('video').count() === 0)
        await watch.scrollIntoViewIfNeeded()
        const clickedAt = performance.now()
        await watch.click()
        const dialog = page.getByRole('dialog')
        const video = dialog.locator('video')
        await dialog.waitFor({ state: 'visible' })
        // Deliberately do not click the fallback Play button: one-click start
        // is a requirement, and silently rescuing it would hide a failure.
        await page.waitForFunction(() => {
          const video = document.querySelector('dialog video')
          return video && !video.paused && video.currentTime > 0 && video.readyState >= 2
        }, null, { timeout: 30000 })
        pass.clickToDecodedPlaybackMs = Math.round(performance.now() - clickedAt)
        pass.initialState = await mediaState(video)
        check(pass, 'Watch starts playback with one user click', true, pass.clickToDecodedPlaybackMs)
        check(pass, 'Correct public video source', pass.initialState.source === `/media/demo-previews/${id}.mp4`, pass.initialState.source)
        check(pass, 'Encoded duration agrees with edit timeline', Math.abs(pass.initialState.duration - timeline.total) < 0.25, pass.initialState.duration)
        check(pass, 'Expected sound state', pass.initialState.muted === mode.muted && pass.initialState.volume > 0, { muted: pass.initialState.muted, volume: pass.initialState.volume })
        check(pass, 'Native controls and inline playback enabled', pass.initialState.controls && pass.initialState.playsInline && !pass.initialState.fullscreen)
        check(pass, 'Only one player mounted', await page.locator('video').count() === 1)
        await video.scrollIntoViewIfNeeded()
        const targets = samplesFor(timeline)
        const deadline = Date.now() + (pass.initialState.duration + 35) * 1000
        let next = 0
        while (Date.now() < deadline) {
          const state = await mediaState(video)
          if (state.mediaError) throw new Error(`Media error ${state.mediaError.code}: ${state.mediaError.message}`)
          while (next < targets.length && state.currentTime >= targets[next].target) {
            const sample = targets[next++]
            const filename = `${String(next).padStart(2, '0')}-${sample.scene}-${sample.part}.png`
            await page.screenshot({ path: join(passOut, filename) })
            pass.frames.push({ ...sample, actualTime: state.currentTime, driftSeconds: state.currentTime - sample.target, file: `${mode.id}/${filename}`, state })
          }
          if (state.ended) break
          await page.waitForTimeout(120)
        }
        pass.completePlayback = await mediaState(video)
        const observed = await page.evaluate(() => window.__playbackQA)
        pass.fullPassEvents = observed.events
        pass.wallPlaybackSeconds = observed.endedAt === null || observed.firstPlayingAt === null ? null : (observed.endedAt - observed.firstPlayingAt) / 1000
        check(pass, 'Complete encoded film reaches ended', pass.completePlayback.ended && Math.abs(pass.completePlayback.currentTime - pass.completePlayback.duration) < 0.15, pass.completePlayback)
        check(pass, 'Complete pass runs in real time', pass.wallPlaybackSeconds !== null && pass.wallPlaybackSeconds >= pass.completePlayback.duration - 0.5, pass.wallPlaybackSeconds)
        check(pass, 'No seek or rate change during complete pass', !observed.events.some(event => event.type === 'seeking' || event.rate !== 1))
        check(pass, 'Sound state remains as requested through complete pass', observed.events.filter(event => ['play', 'playing', 'ended'].includes(event.type)).every(event => event.muted === mode.muted))
        check(pass, 'All planned scene frames captured', pass.frames.length === targets.length, { expected: targets.length, actual: pass.frames.length })
        check(pass, 'Scene samples within 750 ms of intended times', pass.frames.every(frame => frame.driftSeconds < 0.75), Math.max(...pass.frames.map(frame => frame.driftSeconds)))
        check(pass, 'Decoded frames available', pass.completePlayback.totalVideoFrames > 0)
        pass.droppedFrameRatio = pass.completePlayback.totalVideoFrames ? pass.completePlayback.droppedVideoFrames / pass.completePlayback.totalVideoFrames : null
        if (pass.completePlayback.decodedAudioBytes !== null) check(pass, 'Audio bytes decoded', pass.completePlayback.decodedAudioBytes > 0, pass.completePlayback.decodedAudioBytes)
        else pass.audioByteLimitation = 'This Chrome build does not expose webkitAudioDecodedByteCount. Verify the encoded audio stream and loudness with the separate delivery report.'
        check(pass, 'No simultaneous media playback observed', observed.maxActiveMedia === 1)
        check(pass, 'Player remains inline', !pass.completePlayback.fullscreen)
        check(pass, 'No player error UI', await dialog.locator('.ct-preview-error').count() === 0)
        check(pass, 'Only selected video downloaded', pass.requests.filter(request => request.path.endsWith('.mp4')).every(request => request.path === `/media/demo-previews/${id}.mp4`))

        // Exercise controls only after the uninterrupted full film is complete.
        await video.evaluate(element => { element.muted = !element.muted })
        const toggled = await mediaState(video)
        await video.evaluate(element => { element.muted = !element.muted })
        check(pass, 'Mute changes and restores', toggled.muted !== mode.muted && (await mediaState(video)).muted === mode.muted)
        await seekPaused(video, Math.min(3, timeline.total / 4))
        await video.evaluate(element => element.play())
        await page.waitForTimeout(400)
        await video.evaluate(element => element.pause())
        const paused = await mediaState(video)
        await page.waitForTimeout(300)
        const stillPaused = await mediaState(video)
        check(pass, 'Pause holds current time', stillPaused.paused && Math.abs(paused.currentTime - stillPaused.currentTime) < 0.02)
        await seekPaused(video, 0)
        check(pass, 'Rewind returns to the beginning', (await mediaState(video)).currentTime < 0.02)

        await video.evaluate(element => { for (const track of element.textTracks) track.mode = 'showing' })
        await page.waitForFunction(() => {
          const track = document.querySelector('dialog video track')
          return track?.readyState === 2 && track.track.cues?.length > 0
        }, null, { timeout: 15000 })
        pass.captions = await video.evaluate(element => [...element.querySelectorAll('track')].map(track => ({
          source: new URL(track.src).pathname, language: track.srclang, kind: track.kind, readyState: track.readyState, mode: track.track.mode,
          cues: [...track.track.cues].map(cue => ({ text: cue.text, start: cue.startTime, end: cue.endTime })),
        })))
        const english = pass.captions.find(track => track.language === 'en' && track.kind === 'captions')
        check(pass, 'Public English caption track loads', english?.readyState === 2 && english.source === `/media/demo-previews/${id}.vtt`, pass.captionResponses)
        check(pass, 'Caption text and times match narration timeline', english?.cues.length === timeline.captions.length && english.cues.every((cue, index) => cue.text === timeline.captions[index].text && Math.abs(cue.start - timeline.captions[index].start) < 0.02 && Math.abs(cue.end - timeline.captions[index].end) < 0.02))
        const cue = timeline.captions[Math.floor(timeline.captions.length / 2)]
        await seekPaused(video, (cue.start + cue.end) / 2)
        await page.waitForFunction(() => [...document.querySelector('dialog video').textTracks].some(track => track.mode === 'showing' && track.activeCues?.length > 0), null, { timeout: 5000 })
        check(pass, 'Enabled captions expose an active cue at the sampled time', true)
        await page.screenshot({ path: join(passOut, 'native-captions.png') })
        pass.captionScreenshot = `${mode.id}/native-captions.png`
        await video.evaluate(element => { for (const track of element.textTracks) track.mode = 'disabled' })
        check(pass, 'Caption track can be turned off', await video.evaluate(element => [...element.textTracks].every(track => track.mode === 'disabled')))
        if (mode.isMobile) {
          await page.setViewportSize({ width: 844, height: 390 })
          for (const shot of timeline.shots) {
            const target = shot.start + shot.duration / 2
            await seekPaused(video, target)
            await video.scrollIntoViewIfNeeded()
            await page.screenshot({ path: join(passOut, `landscape-${shot.id}.png`) })
            pass.landscapeFrames.push({ scene: shot.id, target, file: `${mode.id}/landscape-${shot.id}.png`, state: await mediaState(video) })
          }
          check(pass, 'Landscape samples remain inline', pass.landscapeFrames.every(frame => frame.state.playsInline && !frame.state.fullscreen))
          await page.setViewportSize(mode.viewport)
        }
        pass.allEvents = await page.evaluate(() => window.__playbackQA.events)
        await dialog.getByRole('button', { name: 'Close demo preview' }).click()
        await dialog.waitFor({ state: 'detached' })
        check(pass, 'Closing removes the player', await page.locator('video').count() === 0)
        check(pass, 'Watch regains focus', await watch.evaluate(element => document.activeElement === element))
      } catch (error) {
        pass.errors.push({ kind: 'fatal', message: error.stack || error.message })
        check(pass, 'Playback QA completes', false, error.message)
        await page.screenshot({ path: join(passOut, 'failure.png') }).catch(() => {})
      } finally {
        check(pass, 'No browser or media request errors', pass.errors.length === 0, pass.errors)
        pass.passed = pass.checks.every(result => result.passed)
        failed ||= !pass.passed
        await writeFile(join(passOut, 'results.json'), `${JSON.stringify(pass, null, 2)}\n`)
        // Context teardown may cancel a normal outstanding range request;
        // those cancellations are outside the completed playback observation.
        page.removeAllListeners('requestfailed')
        page.removeAllListeners('pageerror')
        await context.close()
        console.log(`${id} ${mode.id}: ${pass.passed ? 'passed' : 'FAILED'} (${pass.frames.length} full-pass frame samples)`)
      }
    }
    report.passed = report.passes.every(pass => pass.passed)
    report.completedAt = new Date().toISOString()
    await writeFile(join(out, 'report.json'), `${JSON.stringify(report, null, 2)}\n`)
    console.log(`Report: ${join(out, 'report.json')}`)
  }
} finally {
  await browser.close()
}
process.exitCode = failed ? 1 : 0
