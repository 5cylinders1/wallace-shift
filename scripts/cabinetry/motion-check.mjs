#!/usr/bin/env node
/**
 * Measures Tambour's motion in headless Chrome over the DevTools protocol.
 *
 *   node --experimental-websocket scripts/cabinetry/motion-check.mjs [origin]
 *
 * Origin defaults to http://localhost:5177 (a `vite preview` of the production
 * build, started with .demo-preview.local loaded so the gate admits the local
 * admin cookie, minted by scripts/demo-preview-cookie.mjs and never printed).
 *
 * For each run it records, inside the page: long animation frames
 * (PerformanceObserver 'long-animation-frame'), rAF frame intervals during a
 * constant-speed scroll, layout shifts (CLS) and event timing for clicks (INP).
 * Runs: desktop 1440x900 and phone 390x844, each at 1x and 4x CPU throttle;
 * a reduced-motion parity check; and a screencast of the home page at the
 * reel's scroll pace. Writes output/cabinetry/motion-check/report.json,
 * screenshots and screencast frames. Diagnostic modes (one at a time):
 * SHOTS=, LOAF=, PROFILE= and NAV=, each described where it is handled.
 */
import { spawn, execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const origin = process.argv[2] ?? 'http://localhost:5177'
const ROOT = new URL('../../', import.meta.url).pathname
const OUT = join(ROOT, 'output/cabinetry/motion-check')
mkdirSync(join(OUT, 'frames'), { recursive: true })
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const PORT = 9333
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

const cookieLine = execFileSync('node', [join(ROOT, 'scripts/demo-preview-cookie.mjs'), origin], { encoding: 'utf8' })
const token = cookieLine.match(/wallace_demo_admin=([^;']+)/)?.[1]
if (!token) throw new Error('Could not mint the local preview cookie')

const profile = mkdtempSync(join(OUT, '.chrome-'))
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, '--no-first-run',
  '--no-default-browser-check', '--hide-scrollbars', '--mute-audio', '--window-size=1440,900', 'about:blank'], { stdio: 'ignore' })
let version
for (let i = 0; i < 50 && !version; i++) { try { version = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json() } catch { await sleep(200) } }
if (!version) throw new Error('Chrome did not start')

const ws = new WebSocket(version.webSocketDebuggerUrl)
await new Promise(resolve => ws.addEventListener('open', resolve, { once: true }))
let nextId = 0
const pending = new Map()
const listeners = new Set()
ws.addEventListener('message', event => {
  const message = JSON.parse(event.data)
  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id); pending.delete(message.id)
    message.error ? reject(new Error(`${message.error.message}`)) : resolve(message.result)
  } else listeners.forEach(fn => fn(message))
})
const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
  const id = ++nextId; pending.set(id, { resolve, reject })
  ws.send(JSON.stringify({ id, method, params, sessionId }))
})
const waitFor = (sessionId, method, timeout = 30000) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => { listeners.delete(fn); reject(new Error(`timeout ${method}`)) }, timeout)
  const fn = m => { if (m.sessionId === sessionId && m.method === method) { clearTimeout(timer); listeners.delete(fn); resolve(m.params) } }
  listeners.add(fn)
})

const INSTRUMENT = `(() => {
  const m = window.__m = { loaf: [], cls: 0, shifts: [], events: [], frames: [] };
  try { new PerformanceObserver(l => { for (const e of l.getEntries()) m.loaf.push({ start: Math.round(e.startTime), duration: Math.round(e.duration), blocking: Math.round(e.blockingDuration || 0), render: Math.round(e.renderStart ? e.startTime + e.duration - e.renderStart : 0), style: Math.round(e.styleAndLayoutStart ? e.startTime + e.duration - e.styleAndLayoutStart : 0), scripts: (e.scripts || []).map(x => ({ d: Math.round(x.duration), inv: x.invoker, fn: x.sourceFunctionName, src: (x.sourceURL || '').split('/').pop(), layout: Math.round(x.forcedStyleAndLayoutDuration || 0) })).filter(x => x.d >= 5) }) }).observe({ type: 'long-animation-frame', buffered: true }) } catch {}
  new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) { m.cls += e.value; m.shifts.push({ t: Math.round(e.startTime), v: +e.value.toFixed(4), nodes: (e.sources || []).map(s => s.node && (s.node.className || s.node.nodeName)).slice(0, 3) }) } }).observe({ type: 'layout-shift', buffered: true });
  new PerformanceObserver(l => { for (const e of l.getEntries()) if (e.interactionId) m.events.push({ name: e.name, duration: Math.round(e.duration), id: e.interactionId, target: e.target && (e.target.className || e.target.nodeName) }) }).observe({ type: 'event', durationThreshold: 16, buffered: true });
  m.record = false;
  const tick = t => { if (m.record) m.frames.push(t); requestAnimationFrame(tick) }; requestAnimationFrame(tick);
  window.__scroll = speed => new Promise(done => {
    const from = scrollY, max = document.documentElement.scrollHeight - innerHeight, ms = (max - from) / speed * 1000, start = performance.now();
    m.record = true; m.frames = []; m.scrollStart = performance.now();
    const step = t => { const p = Math.min(1, (t - start) / ms); scrollTo(0, from + (max - from) * p); p < 1 ? requestAnimationFrame(step) : (m.record = false, done()) };
    requestAnimationFrame(step);
  });
})()`

async function open({ width, height, mobile = false, throttle = 1, reduced = false, path = '/tambour', dpr = mobile ? 3 : 1 }) {
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' })
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true })
  for (const domain of ['Page', 'Runtime', 'Network']) await send(`${domain}.enable`, {}, sessionId)
  await send('Network.setCookie', { name: 'wallace_demo_admin', value: token, url: origin, path: '/' }, sessionId)
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: dpr, mobile }, sessionId)
  if (mobile) await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }, sessionId)
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: reduced ? 'reduce' : 'no-preference' }] }, sessionId)
  await send('Emulation.setCPUThrottlingRate', { rate: throttle }, sessionId)
  await send('Page.addScriptToEvaluateOnNewDocument', { source: INSTRUMENT }, sessionId)
  const loaded = waitFor(sessionId, 'Page.loadEventFired', 60000)
  await send('Page.navigate', { url: origin + path }, sessionId)
  await loaded
  await sleep(1500 * throttle)
  const evaluate = async expression => (await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, sessionId)).result.value
  const shot = async name => { const { data } = await send('Page.captureScreenshot', { format: 'jpeg', quality: 72 }, sessionId); writeFileSync(join(OUT, `${name}.jpg`), Buffer.from(data, 'base64')) }
  const click = async selector => {
    const box = await evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return null; el.scrollIntoView({ block: 'center' }); const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 } })()`)
    if (!box) return false
    await sleep(400)
    for (const type of ['mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x: box.x, y: box.y, button: 'left', clickCount: 1 }, sessionId)
    await sleep(700 * throttle)
    return true
  }
  const close = () => send('Target.closeTarget', { targetId })
  return { sessionId, evaluate, shot, click, close }
}

function summarise(m) {
  const intervals = m.frames.slice(1).map((t, i) => t - m.frames[i])
  const long = m.loaf.filter(f => f.duration >= 50)
  const sorted = [...intervals].sort((a, b) => a - b)
  return {
    frames: intervals.length,
    medianFrameMs: +(sorted[Math.floor(sorted.length / 2)] ?? 0).toFixed(1),
    p95FrameMs: +(sorted[Math.floor(sorted.length * 0.95)] ?? 0).toFixed(1),
    framesOver50ms: intervals.filter(d => d > 50).length,
    longAnimationFrames: long.length,
    longFramesDuringScroll: long.filter(f => f.start >= (m.scrollStart ?? Infinity)).map(f => f.duration),
    longFramesBeforeScroll: long.filter(f => f.start < (m.scrollStart ?? Infinity)).map(f => `${f.duration}ms at ${f.start}ms`),
    worstLongFrameMs: long.reduce((a, f) => Math.max(a, f.duration), 0),
    cls: +m.cls.toFixed(4),
    shifts: m.shifts.slice(0, 6),
    inpMs: m.events.reduce((a, e) => Math.max(a, e.duration), 0),
    interactions: m.events.slice(0, 20),
  }
}

const report = { origin, chrome: version.Browser, runs: {} }
async function finish() {
  ws.close()
  const exited = new Promise(resolve => chrome.once('exit', resolve))
  chrome.kill()
  await exited
  rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
}

// SHOTS="path:fraction,fraction;path:..." takes screenshots after scrolling
// to each fraction of the page and letting the motion finish, then exits.
if (process.env.PROFILE) {
  // CPU profile of a page load at 4x, aggregated by function (self and total time).
  const path = process.env.PROFILE
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' })
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true })
  for (const domain of ['Page', 'Network', 'Profiler']) await send(`${domain}.enable`, {}, sessionId)
  await send('Network.setCookie', { name: 'wallace_demo_admin', value: token, url: origin, path: '/' }, sessionId)
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false }, sessionId)
  await send('Emulation.setCPUThrottlingRate', { rate: 4 }, sessionId)
  await send('Page.navigate', { url: origin + '/tambour/photography' }, sessionId)
  await sleep(3000)
  await send('Profiler.setSamplingInterval', { interval: 100 }, sessionId)
  await send('Profiler.start', {}, sessionId)
  const loaded = waitFor(sessionId, 'Page.loadEventFired', 60000)
  await send('Page.navigate', { url: origin + path }, sessionId)
  await loaded
  await sleep(2500)
  const { profile: cpu } = await send('Profiler.stop', {}, sessionId)
  const byId = new Map(cpu.nodes.map(n => [n.id, n]))
  const parent = new Map(); cpu.nodes.forEach(n => (n.children || []).forEach(c => parent.set(c, n.id)))
  const dt = new Map(); cpu.samples.forEach((id, i) => dt.set(id, (dt.get(id) || 0) + (cpu.timeDeltas[i] || 0)))
  const self = new Map(), total = new Map()
  const key = n => `${n.callFrame.functionName || '(anon)'} ${(n.callFrame.url || '').split('/').pop()}:${n.callFrame.lineNumber}`
  for (const [id, t] of dt) {
    const n = byId.get(id); self.set(key(n), (self.get(key(n)) || 0) + t)
    const seen = new Set(); let cur = id
    while (cur) { const k = key(byId.get(cur)); if (!seen.has(k)) { total.set(k, (total.get(k) || 0) + t); seen.add(k) } cur = parent.get(cur) }
  }
  const top = map => [...map].sort((a, b) => b[1] - a[1]).slice(0, 28).map(([k, v]) => `${(v / 1000).toFixed(1).padStart(7)}ms  ${k}`)
  console.log('SELF\n' + top(self).join('\n') + '\nTOTAL\n' + top(total).join('\n'))
  const heavy = [...dt].sort((a, b) => b[1] - a[1]).filter(([id]) => !['(idle)', '(program)', '(root)', '(garbage collector)'].includes(byId.get(id).callFrame.functionName)).slice(0, 6)
  for (const [id, t] of heavy) {
    const chain = []; let cur = id
    while (cur) { const f = byId.get(cur).callFrame; chain.push(`${f.functionName || '(anon)'}@${(f.url || '').split('/').pop()}:${f.lineNumber}:${f.columnNumber}`); cur = parent.get(cur) }
    console.log(`\n${(t / 1000).toFixed(1)}ms:`, chain.slice(0, 14).join(' < '))
  }
  await finish()
  process.exit(0)
}
if (process.env.LOAF) {
  for (const path of process.env.LOAF.split(',')) {
    const page = await open({ width: 1440, height: 900, throttle: 4, path })
    const m = await page.evaluate('__m')
    console.log(path, JSON.stringify(m.loaf.filter(f => f.duration >= 50), null, 1))
    await page.close()
  }
  await finish()
  process.exit(0)
}
if (process.env.NAV) {
  // NAV=1: the phone menu navigation alone at 4x, with the long frames around
  // the tap; DPR overrides the emulated pixel ratio (default 3).
  const page = await open({ width: 390, height: 844, mobile: true, throttle: 4, path: '/tambour/kitchens', dpr: Number(process.env.DPR ?? 3) })
  // NAV=full: the lookbook viewer is opened and closed first, as in the INP run.
  if (process.env.NAV === 'full') { await page.click('.tb-hotspot:nth-child(3)'); await page.click('.tb-lookbook-item'); await sleep(1500); await page.click('.tb-viewer-close') }
  await page.click('.tb-menu-button')
  const before = await page.evaluate('performance.now()')
  await page.click('#tb-menu a[href$="/workshop"]')
  await sleep(3000)
  const m = await page.evaluate('__m')
  console.log(JSON.stringify({ events: m.events.filter(e => e.duration >= 40), loaf: m.loaf.filter(f => f.start >= before && f.duration >= 40) }, null, 1))
  await page.close()
  await finish()
  process.exit(0)
}
if (process.env.SHOTS) {
  const width = Number(process.env.WIDTH ?? 1440), height = Number(process.env.HEIGHT ?? 900)
  for (const spec of process.env.SHOTS.split(';')) {
    const [path, fractions] = spec.split(':')
    const page = await open({ width, height, mobile: width < 700, path })
    for (const fraction of fractions.split(',')) {
      // "f3:0.4" = 40% through the first build film's scroll; a plain number = fraction of the page.
      const film = fraction.startsWith('f') ? Number(fraction.slice(1).split('=')[1] ?? fraction.split(':')[1]) : null
      const target = film !== null
        ? `(() => { const s = document.querySelector('.tb-build'); const h = document.querySelector('.tb-header').offsetHeight; return s.getBoundingClientRect().top + scrollY - h + (s.offsetHeight - (innerHeight - h)) * ${film} })()`
        : `(document.documentElement.scrollHeight - innerHeight) * ${Number(fraction)}`
      await page.evaluate(`(async () => { const to = ${target}; for (let y = scrollY; Math.abs(y - to) > 1; ) { y += Math.sign(to - y) * Math.min(Math.abs(to - y), 60); scrollTo(0, y); await new Promise(r => requestAnimationFrame(r)) } })()`)
      await sleep(Number(process.env.SETTLE ?? 1800))
      await page.shot(`shot-${width}-${path.replace(/\W+/g, '_')}-${fraction}`)
    }
    await page.close()
  }
  await finish()
  process.exit(0)
}

// 1. Performance runs: scroll every page top to bottom at a constant speed.
const pages = ['/tambour', '/tambour/kitchens', '/tambour/baths', '/tambour/built-ins', '/tambour/workshop', '/tambour/investment']
const configs = [
  { name: 'desktop-1x', width: 1440, height: 900, throttle: 1 },
  { name: 'desktop-4x', width: 1440, height: 900, throttle: 4 },
  { name: 'phone-4x', width: 390, height: 844, mobile: true, throttle: 4 },
]
for (const config of configs) {
  for (const path of pages) {
    const page = await open({ ...config, path })
    await page.evaluate('__scroll(1000)')
    await sleep(1200 * config.throttle)
    const hidden = await page.evaluate(`[...document.querySelectorAll('main [data-reveal], main [data-split], main [data-uncover]')].filter(el => { const s = getComputedStyle(el); return s.visibility === 'hidden' || +s.opacity < 0.95 || (s.clipPath && s.clipPath.startsWith('inset(100')) }).map(el => el.tagName + '.' + el.className).slice(0, 8)`)
    report.runs[`${config.name} ${path}`] = { ...summarise(await page.evaluate('__m')), leftHiddenAfterScroll: hidden }
    if (path === '/tambour') await page.shot(`${config.name}-home-end`)
    await page.close()
  }
}

// 2. Interactions (INP) at 4x on desktop and phone.
for (const config of [configs[1], configs[2]]) {
  const home = await open({ ...config, path: '/tambour' })
  await home.click('#tb-tab-stone')
  await home.click('#tb-library-panel .tb-swatch-toggle')
  await home.click('.tb-faq-list summary')
  const homeInteractions = summarise(await home.evaluate('__m'))
  await home.close()
  const planner = await open({ ...config, path: '/tambour/investment' })
  await planner.click('input[name="tb-size"][value="large"]')
  await planner.click('input[name="tb-scope"][value="remodel"]')
  const plannerInteractions = summarise(await planner.evaluate('__m'))
  await planner.close()
  const kitchens = await open({ ...config, path: '/tambour/kitchens' })
  await kitchens.click('.tb-hotspot:nth-child(3)')
  await kitchens.click('.tb-lookbook-item')
  await sleep(1500)
  await kitchens.shot(`${config.name}-viewer-open`)
  await kitchens.evaluate(`window.__vt = []; const start = document.startViewTransition.bind(document); document.startViewTransition = cb => { const t = start(cb); window.__vt.push(document.documentElement.dataset.transition || 'element'); return t }`)
  await kitchens.click('.tb-viewer-close')
  // On a phone the page links are inside the menu.
  if (config.mobile) { await kitchens.click('.tb-menu-button'); await kitchens.click('#tb-menu a[href$="/workshop"]') }
  else await kitchens.click('.tb-nav a[href$="/workshop"]')
  await sleep(2000)
  const navigation = await kitchens.evaluate(`({ path: location.pathname, title: document.title, transitions: window.__vt, heading: document.activeElement && document.activeElement.textContent.slice(0, 40) })`)
  const kitchenInteractions = summarise(await kitchens.evaluate('__m'))
  await kitchens.close()
  report.runs[`${config.name} interactions`] = {
    inpMs: Math.max(homeInteractions.inpMs, plannerInteractions.inpMs, kitchenInteractions.inpMs),
    navigation,
    home: homeInteractions.interactions, planner: plannerInteractions.interactions, kitchens: kitchenInteractions.interactions,
  }
}

// 3. Reduced-motion parity: the same text and controls, all visible, with and without motion.
// Text a visitor can reach. With motion: everything in the page (scroll-driven
// chapters are reached by scrolling). Under reduced motion: only text that is
// actually rendered and visible. Closed FAQ answers are opened first in both.
const inventory = rendered => `(() => {
  document.querySelectorAll('main details').forEach(d => d.open = true);
  const main = document.querySelector('main');
  const shown = el => el.getClientRects().length && !el.closest('[aria-hidden="true"]') && getComputedStyle(el).visibility !== 'hidden' && +getComputedStyle(el).opacity > 0.95;
  const pick = el => ${rendered} ? shown(el) : !el.closest('[aria-hidden="true"]');
  const text = [...main.querySelectorAll('h1, h2, h3, p, dt, dd, summary, figcaption')].filter(pick).map(el => el.textContent.replace(/\\s+/g, ' ').trim()).filter(Boolean);
  const controls = [...main.querySelectorAll('a[href], button, input, select, textarea')].filter(pick).map(el => el.getAttribute('aria-label') || el.textContent.replace(/\\s+/g, ' ').trim() || el.name || el.type);
  return { text: [...new Set(text)], controls: [...new Set(controls)] };
})()`
for (const path of pages) {
  const motion = await open({ width: 1440, height: 900, path })
  const withMotion = await motion.evaluate(inventory(false))
  await motion.close()
  const still = await open({ width: 1440, height: 900, path, reduced: true })
  const reduced = await still.evaluate(inventory(true))
  if (path === '/tambour') { await still.shot('reduced-home-top'); await still.evaluate('scrollTo(0, innerHeight * 1.05)'); await sleep(600); await still.shot('reduced-home-chapters') }
  await still.close()
  const missing = (a, b) => a.filter(x => !b.includes(x))
  report.runs[`reduced-motion ${path}`] = {
    reachableWithMotionNotVisibleReduced: missing(withMotion.text, reduced.text),
    controlsReachableWithMotionNotVisibleReduced: missing(withMotion.controls, reduced.controls),
    textCount: { motion: withMotion.text.length, reduced: reduced.text.length },
  }
}

// 4. Screencast of the home page at the reel's pace (1,000 px/s), desktop, no throttle.
{
  const page = await open({ width: 1440, height: 900, path: '/tambour' })
  const frames = []
  const onFrame = message => {
    if (message.sessionId !== page.sessionId || message.method !== 'Page.screencastFrame') return
    const { data, metadata, sessionId: frameId } = message.params
    const file = join(OUT, 'frames', `f_${String(frames.length).padStart(5, '0')}.jpg`)
    writeFileSync(file, Buffer.from(data, 'base64'))
    frames.push({ file, t: metadata.timestamp })
    send('Page.screencastFrameAck', { sessionId: frameId }, page.sessionId).catch(() => {})
  }
  listeners.add(onFrame)
  await send('Page.startScreencast', { format: 'jpeg', quality: 75, maxWidth: 1440, maxHeight: 900, everyNthFrame: 1 }, page.sessionId)
  await sleep(800)
  await page.evaluate('__scroll(1000)')
  await sleep(1200)
  await send('Page.stopScreencast', {}, page.sessionId)
  listeners.delete(onFrame)
  writeFileSync(join(OUT, 'frames', 'frames.json'), JSON.stringify(frames))
  report.screencastFrames = frames.length
  await page.close()
}

writeFileSync(join(OUT, 'report.json'), JSON.stringify(report, null, 1))
console.log(JSON.stringify(Object.fromEntries(Object.entries(report.runs).map(([k, v]) => [k, Object.fromEntries(Object.entries(v).filter(([key]) => !['shifts', 'interactions', 'home', 'planner', 'kitchens'].includes(key)))])), null, 1))
await finish()
