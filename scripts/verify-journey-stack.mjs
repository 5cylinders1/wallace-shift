/** The approach panels where the live scene does not reach: the mark drawn
 * from the approved SVG, with mobile copy and art in natural document flow.
 * Source contracts cannot establish rendered browser placement. */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

const root = new URL('../', import.meta.url)
const read = path => readFile(new URL(path, root), 'utf8')
const css = await read('src/components/HomeJourney/HomeJourney.css')
const journey = await read('src/components/HomeJourney/HomeJourney.tsx')
const art = await read('src/components/HomeJourney/JourneyStageArt.tsx')
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
  assert.match(css, /\.journey-stage-art \{[^}]*display: none/s,
    'the art is off until the fallback turns it on')
  assert.match(css, /\.home-journey\[data-live="false"\] \.journey-stage-art \{[^}]*display: block/s)
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

await test('the art is the approved mark, not a drawing of it', () => {
  // The shape comes from the logo file through a mask. Nothing here describes
  // geometry, so there is no second copy of the mark to drift from the first.
  assert.match(css, /mask: url\('\/brand\/wallace-shift-logo-black\.svg'\) center \/ contain no-repeat/)
  assert.match(css, /-webkit-mask: url\('\/brand\/wallace-shift-logo-black\.svg'\)/,
    'with the prefixed form for older Safari')
  assert.ok(!/<svg|<path|viewBox|\bd="M/.test(art), 'the component draws nothing itself')
  assert.ok(!/clip-path: polygon/.test(css.slice(css.indexOf('.journey-stage-art'))),
    'and nothing traces it a second way')

  // Each stage changes the light on the mark and the ground behind it. Three
  // stages, three treatments, all from the one silhouette.
  for (const stage of ['find', 'make', 'launch']) {
    assert.match(css, new RegExp(`\\.journey-stage-art--${stage} \\.journey-stage-art__mark`))
    assert.match(css, new RegExp(`\\.journey-stage-art--${stage} \\.journey-stage-art__field`))
  }

  // Slow, and only where motion is welcome.
  const motion = css.slice(css.indexOf('@media (prefers-reduced-motion: no-preference)'))
  for (const name of ['journey-art-survey', 'journey-art-shift', 'journey-art-settle']) {
    assert.match(motion, new RegExp(`animation: ${name} \\d+s`))
    assert.match(css, new RegExp(`@keyframes ${name}`))
  }
})

await test('mobile panels follow document flow without viewport-sized empty space', () => {
  const panel = rule(mobileBlock, '.home-journey[data-live="false"] .journey-process__panel {')
  assert.match(panel, /position: relative/)
  assert.match(panel, /inset: auto;/, 'desktop frame constraints do not displace mobile panels')
  assert.match(mobileBlock,
    /\.journey-process__step \{\s*min-height: 0;\s*\}/)
  assert.ok(!journey.includes('--journey-panel-height'), 'mobile needs no viewport-dependent sticky measurement')
  assert.match(journey, /removeProperty\('--journey-panel-padding'\)/,
    'desktop padding measurements are released when switching to mobile')
})

await test('mobile artwork follows readable full-width copy within each stage', () => {
  assert.match(mobileBlock, /\.journey-process__copy \{ width: 100%;/)
  const art = rule(mobileBlock, '.home-journey[data-live="false"] .journey-stage-art {')
  assert.match(art, /flex: none;/)
  assert.match(art, /min-height: 0;/)
  assert.match(art, /margin: 30px auto 0;/)
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
