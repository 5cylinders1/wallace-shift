/** The approach panels where the live scene does not reach: the mark drawn
 * from the approved SVG, and the panels stacked the way the pricing packages
 * are. Source and stylesheet contracts; the travel itself is a browser
 * behaviour these cannot see. */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const root = new URL('../', import.meta.url)
const read = path => readFile(new URL(path, root), 'utf8')
const css = await read('src/components/HomeJourney/HomeJourney.css')
const journey = await read('src/components/HomeJourney/HomeJourney.tsx')
const art = await read('src/components/HomeJourney/JourneyStageArt.tsx')

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

await test('a panel fills the frame, holds at its own end, and is ridden over', () => {
  const panel = rule(mobileBlock, '.home-journey[data-live="false"] .journey-process__panel {')
  assert.match(panel, /position: sticky/)

  // The live stage gives every panel `inset: 0` so it fills one frame. The
  // `bottom: 0` inside that shorthand is a second sticky constraint, and it
  // pins each panel's bottom edge to the bottom of the frame — which drags all
  // of them up onto each other the moment the section appears. It has to be
  // cleared, and before the one edge this needs is set.
  assert.match(panel, /inset: auto;[\s\S]*top: min\(/,
    'the frame-filling inset is cleared first')
  assert.match(panel, /top: min\(\s*var\(--journey-header-offset\),\s*calc\(100svh - var\(--journey-panel-height/)

  assert.match(mobileBlock,
    /\.journey-process__step \{\s*min-height: calc\(100svh - var\(--journey-header-offset\)\);\s*\}/)

  // No CSS length knows a panel's height, so it is measured and written back —
  // and only where the director is not already driving these panels.
  assert.match(journey, /if \(!root \|\| live\) return/)
  assert.match(journey, /setProperty\(`?'--journey-panel-height'/)
  assert.match(journey, /new ResizeObserver\(measure\)/)
  assert.match(journey, /removeProperty\('--journey-panel-height'\)/,
    'and cleared when the scene takes over')
})

await test('a panel holds only while something is coming up behind it', () => {
  // Nothing follows the last panel inside the section to ride over it, so it
  // leaves with the page instead of stopping against an edge nothing arrives
  // at — and the edge goes with the hold, or a relatively positioned box is
  // displaced down the page by it.
  const last = rule(mobileBlock, '.journey-process__panel--launch {')
  assert.match(last, /position: relative/)
  assert.match(last, /top: auto/)

  // The z-order and the opaque grounds are the live scene's own, unchanged —
  // which is what makes this the same layered look rather than a copy of it.
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
