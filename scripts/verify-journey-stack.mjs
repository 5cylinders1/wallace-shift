/** Fallback panel stacking and the separate desktop scene gate.
 * Source contracts supplement rendered forward/reverse browser checks. */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

const root = new URL('../', import.meta.url)
const read = path => readFile(new URL(path, root), 'utf8')
const css = await read('src/components/HomeJourney/HomeJourney.css')
const journey = await read('src/components/HomeJourney/HomeJourney.tsx')
const scene = await read('src/components/HomeJourney/LogoJourneyScene.tsx')
const display = ts.transpileModule(await read('src/components/HomeJourney/homeJourneyDisplay.ts'), {
  compilerOptions: { module: ts.ModuleKind.ESNext },
}).outputText
const { HOME_JOURNEY_MOTION_QUERY, getInteractiveHomeJourneySnapshot,
  subscribeInteractiveHomeJourney, getStaticHomeJourneySnapshot } = await import(
  `data:text/javascript;base64,${Buffer.from(display).toString('base64')}`)

const mobileBlock = (() => {
  const start = css.indexOf('@media (max-width: 1023px)')
  assert.ok(start >= 0, 'the mobile layout has a block')
  let depth = 0
  for (let i = css.indexOf('{', start); i < css.length; i += 1) {
    if (css[i] === '{') depth += 1
    else if (css[i] === '}' && (depth -= 1) === 0) return css.slice(start, i + 1)
  }
  throw new Error('unterminated mobile block')
})()
const rule = (block, selector) => {
  const at = block.indexOf(selector)
  assert.ok(at >= 0, `${selector} has a rule`)
  return block.slice(at, block.indexOf('}', at) + 1)
}

await test('the travelling journey has its own responsive gate and releases its media listener', () => {
  assert.equal(HOME_JOURNEY_MOTION_QUERY,
    '(min-width: 1024px) and (pointer: fine) and (prefers-reduced-motion: no-preference)')
  assert.ok(!journey.includes('../Hero/homeHeroDisplay'), 'enabling the mobile hero cannot enable the desktop journey')
  assert.match(journey, /useSyncExternalStore\(subscribeInteractiveHomeJourney, getInteractiveHomeJourneySnapshot, getStaticHomeJourneySnapshot\)/)
  assert.equal(getStaticHomeJourneySnapshot(), false)
  assert.equal(getInteractiveHomeJourneySnapshot(), false, 'server markup remains complete without a scene')
  const originalWindow = globalThis.window
  const listeners = new Set()
  const query = {
    matches: false,
    addEventListener(type, listener) { assert.equal(type, 'change'); listeners.add(listener) },
    removeEventListener(type, listener) { assert.equal(type, 'change'); listeners.delete(listener) },
  }
  try {
    globalThis.window = { matchMedia(media) { assert.equal(media, HOME_JOURNEY_MOTION_QUERY); return query } }
    let changes = 0
    const unsubscribe = subscribeInteractiveHomeJourney(() => { changes++ })
    assert.equal(getInteractiveHomeJourneySnapshot(), false)
    query.matches = true
    listeners.forEach(listener => listener())
    assert.equal(changes, 1)
    assert.equal(getInteractiveHomeJourneySnapshot(), true)
    unsubscribe()
    assert.equal(listeners.size, 0)
  } finally {
    if (originalWindow === undefined) delete globalThis.window
    else globalThis.window = originalWindow
  }
})

await test('the live scene still owns these panels where it runs', () => {
  // Everything added here hangs off `data-live="false"`, which is the state the
  // page is already in wherever the scene is absent — touch, narrow, reduced
  // motion, or a WebGL failure. Nothing reaches the running scene.
  for (const line of mobileBlock.split('\n')) {
    if (!line.includes('.journey-process')) continue
    assert.match(line, /data-live="false"/, `${line.trim()} is scoped to the fallback`)
  }
  // The stage the director pins, the absolute panels and the wipe transforms
  // are all left exactly as they were.
  assert.match(css, /\.journey-process__stage \{ position: sticky; top: var\(--journey-header-offset\)/)
  assert.match(css, /\.journey-process__panel \{ position: absolute; inset: 0;/)
  assert.match(css, /--journey-find-wipe/)

  // Rendered unconditionally rather than behind `live`: the page is prerendered
  // with the scene absent, so gating the markup would serve one tree and
  // hydrate a different one.
  assert.match(journey, /<JourneyStageArt stage=\{processPanels\[index\]\} \/>/)
  assert.ok(!/live && <JourneyStageArt/.test(journey))
})

await test('fallback steps hold only after all of their content can be read', () => {
  const panel = rule(css, '.home-journey[data-live="false"] .journey-process__step {')
  assert.match(panel, /position: sticky/)
  assert.match(panel, /inset: auto;/, 'desktop bottom constraint cannot pin the next panel early')
  assert.match(panel, /top: min\(var\(--journey-header-offset\), calc\(100svh - var\(--journey-panel-height, 0px\)\)\)/,
    'a tall panel scrolls to its bottom before holding')
  assert.match(panel, /min-height: calc\(100svh - var\(--journey-header-offset\)\)/)
  assert.match(journey, /panel.style.setProperty\('--journey-panel-height', `\$\{panel.offsetHeight\}px`\)/)
  assert.match(journey, /observer.observe\(panel, \{ box: 'border-box' \}\)/)
  assert.match(journey, /removeProperty\('--journey-panel-height'\)/)
  assert.match(journey, /removeProperty\('--journey-panel-padding'\)/,
    'desktop padding measurements are released when switching to mobile')
  const reducedMotion = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'))
  assert.match(reducedMotion, /\.journey-process__step \{ position: relative; top: auto; min-height: 0;/)
})

await test('fallback panels keep their readable copy and opaque stacking order', () => {
  assert.match(mobileBlock, /\.journey-process__copy \{ width: 100%;/)
  // Desktop keeps the existing order and opaque grounds for the live wipe.
  const order = ['intro', 'find', 'make', 'launch'].map(name => {
    const at = css.indexOf(`.journey-process__panel--${name} {`)
    return Number(css.slice(at, css.indexOf('}', at)).match(/z-index: (\d)/)[1])
  })
  assert.deepEqual(order, [0, 1, 2, 3])
  for (const name of ['find', 'make', 'launch']) {
    const at = css.indexOf(`.journey-process__panel--${name} {`)
    assert.match(css.slice(at, css.indexOf('}', at)), /background: #[0-9a-f]{6}/,
      `${name} has an opaque ground to cover with`)
  }
})

await test('the scene covers its container, and the renderer keeps up with it', () => {
  // The canvas is `width: 100%` of the layout viewport, and not everything that
  // changes that box fires a window resize — the document's scrollbar arriving
  // or leaving does not, and neither does a resize that happened while the tab
  // was in the background, where no frames ran to deliver the observation.
  // Left behind, the renderer keeps the older size and three writes it onto the
  // element as inline pixels: the scene ends in a hard line partway across the
  // section with the page's own ground beside it.

  // Insurance first — the element always covers its box, so a renderer that is
  // behind for a frame scales rather than exposing an edge. `!important` is
  // what beats three's inline size; without it this rule does nothing.
  assert.match(css,
    /\.home-journey__visual canvas \{ width: 100% !important; height: 100% !important; \}/)

  // And the renderer is kept in step, so that scaling is never actually seen.
  const effect = scene.slice(scene.indexOf('const host = gl.domElement.parentElement'))
  const body = effect.slice(0, effect.indexOf('window.addEventListener(\'scroll\''))
  assert.match(body, /new ResizeObserver\(fit\)/, 'the container box is observed')
  assert.match(body, /setSize\(width, height\)/, 'and applied to the renderer')
  // `frameloop="never"`: nothing draws on its own, so a new buffer without a
  // frame stays the colour it was cleared to.
  assert.match(scene, /frameloop="never"/)
  assert.match(body, /setSize\(width, height\)\s*\n\s*\/\/[\s\S]*?\n\s*wake\(\)/,
    'and a frame is asked for')
  // Measured against what was last applied, not against the canvas's own box:
  // the stylesheet holds that box at 100% of the container, so it agrees with
  // the container even while the renderer does not.
  assert.match(body, /Math\.abs\(width - applied\.width\)/)
  assert.ok(!/gl\.domElement\.(clientWidth|getBoundingClientRect)/.test(body))
  assert.match(scene, /if \(boxes\) boxes\.disconnect\(\)/, 'and released on the way out')
})
