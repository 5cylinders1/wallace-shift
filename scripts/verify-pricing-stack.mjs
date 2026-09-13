/** The mobile pricing page: three areas layered as a tab slideshow, each
 * holding three packages that stack vertically. Source and stylesheet
 * contracts; the travel itself is a browser behaviour these cannot see. */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const root = new URL('../', import.meta.url)
const read = path => readFile(new URL(path, root), 'utf8')
const css = await read('src/components/Pricing/PricingDeck.css')
const source = await read('src/components/Pricing/PricingDeck.tsx')
const navCss = await read('src/components/Pricing/PricingNav.css')
const pricing = await read('src/content/pricing.ts')
const packageData = await read('src/components/Pricing/pricingPackageData.ts')
const engagement = await read('src/components/Pricing/EngagementRows.tsx')
const tierTable = await read('src/components/Pricing/TierTable.tsx')
const packageView = await read('src/components/Pricing/PricingPackage.tsx')
const tierCss = await read('src/components/Pricing/TierTable.css')
const rootCss = await read('src/index.css')

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
const outside = css.replace(mobileBlock, '')

await test('everything new is mobile-only; the desktop deck is untouched', () => {
  for (const rule of ['position: absolute', 'position: sticky', '--pricing-area-layer',
    '--pricing-package-height', '--pricing-freeze-top',
    '--pricing-frame-top', 'pricing-deck__panel--frozen',
    'pricing-deck__panel--sliding', 'overflow-x: clip']) {
    assert.ok(mobileBlock.includes(rule), `${rule} is defined for the mobile layout`)
    assert.ok(!outside.includes(rule), `${rule} does not leak onto the desktop deck`)
  }
  assert.match(outside, /scroll-snap-type: x mandatory/, 'the desktop deck still snaps')
  assert.match(outside, /grid-auto-flow: column/, 'and is still a horizontal track')
  assert.match(source, /const DECK_QUERY = '\(min-width: 1024px\)'/)
  // The engagement areas present as packages only below the deck breakpoint;
  // their established row layout above it is untouched.
  assert.match(engagement, /const PACKAGE_QUERY = '\(max-width: 1023px\)'/)
  assert.match(engagement, /asPackages \?/, 'the row layout is the other branch')
  assert.match(engagement, /engagement-row/, 'and still exists')

  // The card's three text roles were named, not changed: each default is the
  // exact value it replaced, so the desktop table computes identically and
  // only the mobile stack ever restates one.
  assert.match(tierCss, /--tier-body: #3d4143;/)
  assert.match(tierCss, /--tier-quiet: var\(--color-muted-on-bone\);/)
  assert.match(tierCss, /--tier-accent: var\(--color-ember-deep\);/)
  assert.ok(!/#3d4143|color: var\(--color-muted-on-bone\)|var\(--color-ember-deep\)/
    .test(tierCss.slice(tierCss.indexOf('.tier__bar'))), 'no literal survives alongside them')
  assert.ok(!/--tier-(body|quiet|accent):/.test(outside))
})

await test('the layout mode is read from something no transient state touches', () => {
  // Two detectors were tried and both were wrong in ways that only showed up
  // at the worst moment. Overflow: the layered layout parks inactive areas off
  // to the right, so `scrollWidth > clientWidth` is true there too, and every
  // mobile tab took the deck's path. A panel's position: an area held to the
  // frame mid-slide is `fixed` rather than `absolute`, so the layout read as a
  // deck for exactly as long as a slide lasted — and the slide never ended.
  assert.match(source, /getComputedStyle\(track\)\.display === 'grid'/,
    'the mode comes from the track display, which only the stylesheet sets')
  // The body only — the two rejected approaches are named in the comment
  // above it, which is where the reasoning belongs.
  const body = source.slice(source.indexOf('function isHorizontal'))
  const detector = body.slice(0, body.indexOf('\n}') + 2)
  assert.doesNotMatch(detector, /scrollWidth/, 'never from overflow')
  assert.doesNotMatch(detector, /firstElementChild/, 'never from a panel that can be frozen')
})

await test('the three areas are a layered stack, and only one is exposed', () => {
  assert.match(mobileBlock, /\.pricing-deck__panel \{[^}]*position: absolute/s)
  const layers = [...mobileBlock.matchAll(/--pricing-area-layer: (\d+)/g)].map(m => Number(m[1]))
  assert.deepEqual(layers, [2, 3], 'later areas sit above earlier ones')
  // `visibility` rather than `display`: the other two stay measurable, which
  // is what lets a tab land on a package it has not shown yet, and are still
  // out of the tab order and the accessibility tree.
  assert.match(mobileBlock, /\[data-active='false'\] \{ visibility: hidden/)
  assert.ok(!/display: none/.test(mobileBlock), 'hidden areas stay measurable')
  // Clip, not hidden. `hidden` makes this a scroll container and every package
  // inside would stick to the track rather than to the viewport.
  assert.match(mobileBlock, /overflow-x: clip/)
  assert.ok(!/overflow-x: hidden/.test(mobileBlock), 'never hidden, which would break every hold')
  const barLayer = Number(navCss.match(/\.pricing-nav \{[^}]*z-index: (\d+)/s)[1])
  for (const [, layer] of mobileBlock.matchAll(/z-index: (\d+)/g)) {
    assert.ok(Number(layer) < barLayer, `${layer} stays beneath the bar at ${barLayer}`)
  }
})

await test('a package fills the frame, holds at its own end, and is ridden over', () => {
  // The hold is `frame - the package's own height`, so a package taller than
  // the frame is read all the way through before it stops. That offset is
  // negative for those and holds them with their head above the bar, which is
  // the accepted cost of being able to reach the end of a long scope list.
  // `min()` keeps a package shorter than the frame at the bar instead of
  // pushing it down the screen.
  assert.match(mobileBlock,
    /\.tier \{[^}]*top: min\(\s*var\(--pricing-frame-top[^)]*\),\s*calc\(100svh - var\(--pricing-package-height/s)
  assert.ok(!/\.tier \{[^}]*bottom: 0/s.test(mobileBlock), 'never pinned by its bottom edge')
  assert.match(mobileBlock, /min-height: calc\(100svh - var\(--pricing-frame-top/,
    'each package is at least the height of the frame')
  // No CSS length knows a package's height, so it is measured and written back.
  assert.match(source, /setProperty\(\s*'--pricing-package-height',/, 'each package is measured')
  assert.match(source, /new ResizeObserver\(measure\)/, 'and re-measured as content moves')
  const layers = [...mobileBlock.matchAll(/--pricing-package-layer: (\d+)/g)].map(m => Number(m[1]))
  assert.deepEqual(layers, [2, 3], 'later packages ride over earlier ones')
})

await test('each level has a surface of its own, far enough apart to see', () => {
  const channel = c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  const luminance = hex => {
    const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
  }
  const contrast = (a, b) => {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
    return (hi + 0.05) / (lo + 0.05)
  }
  /** The root block only: the palette is restated later for the portfolio
   *  pages, and those values are not what the pricing page renders. */
  const palette = rootCss.slice(0, rootCss.indexOf('}'))
  const token = name => {
    const declared = palette.match(new RegExp(`${name}: ([^;]+);`))[1]
    return declared.startsWith('#') ? declared : token(declared.slice(4, -1))
  }

  const surfaces = [...mobileBlock.matchAll(
    /\.tier:nth-child\((\d)\) \{ background: (#[0-9a-f]{6}); \}/g)]
  assert.deepEqual(surfaces.map(m => m[1]), ['1', '2', '3'], 'three levels, three surfaces')
  const ramp = surfaces.map(m => m[2])
  assert.match(mobileBlock, /\.tier \{[^}]*background: var\(--color-bone\)/s,
    'with a ground under them, because covering is the whole mechanism')

  // The first attempt at this stepped about 1.10 between neighbours and read
  // as one surface, not three. A step has to be big enough to see across the
  // hard edge where one package covers another.
  for (let i = 1; i < ramp.length; i += 1) {
    const step = contrast(ramp[i - 1], ramp[i])
    assert.ok(step >= 1.2, `${ramp[i - 1]} to ${ramp[i]} is only ${step.toFixed(2)}`)
  }
  // And the closing card has to break away from the level it covers, or the
  // stack does not read as having ended.
  assert.ok(contrast(ramp[2], token('--color-bone')) >= 1.4)

  // How far the ramp can run is set by contrast. Each level restates the
  // card's text roles as its surface deepens; whatever it does not restate
  // falls back to the card's own default.
  const roles = ['--tier-body', '--tier-quiet', '--tier-accent']
  const base = Object.fromEntries(roles.map(role => {
    const declared = tierCss.match(new RegExp(`${role}: (.+);`))[1]
    return [role, declared.startsWith('#') ? declared : token(declared.slice(4, -1))]
  }))
  ramp.forEach((surface, i) => {
    const block = mobileBlock.match(
      new RegExp(`\\.tier:nth-child\\(${i + 1}\\) \\{\\n([^}]*)\\n  \\}`))
    const level = { ...base }
    for (const role of roles) {
      const override = block?.[1].match(new RegExp(`${role}: (#[0-9a-f]{6});`))
      if (override) level[role] = override[1]
    }
    // Ink never moves; it has room on every surface here.
    for (const ink of [token('--color-ink'), ...Object.values(level)]) {
      const ratio = contrast(ink, surface)
      assert.ok(ratio >= 4.5, `level ${i + 1}: ${ink} on ${surface} is ${ratio.toFixed(2)}:1`)
    }
    // Supporting text stays quieter than body text on every surface.
    assert.ok(contrast(level['--tier-body'], surface) > contrast(level['--tier-quiet'], surface),
      `level ${i + 1} keeps body darker than quiet`)
  })
})

await test('the packages hold into the area, not into their own wrapper', () => {
  // A sticky box is bounded by its containing block. While that block ended
  // at the last package there was nothing left to hold into: the last package
  // never held and nothing ever rode over it. Collapsing both wrappers hands
  // the packages the area's section, which continues through the closing card.
  const collapsed = mobileBlock.slice(
    mobileBlock.indexOf('.pricing-deck__panel > .tier-table > .container'),
  )
  const rule = collapsed.slice(0, collapsed.indexOf('}') + 1)
  for (const selector of [
    '.pricing-deck__panel > .tier-table > .container',
    '.pricing-deck__panel > .engagement-group > .container',
    '.pricing-deck__panel .tier-table__grid',
  ]) {
    assert.ok(rule.includes(selector), `${selector} is collapsed`)
  }
  assert.match(rule, /display: contents/)
  // The care band has a column of its own inside it; collapsing that one
  // would strip the gutters off the closing card.
  assert.ok(!/\.website-care > \.container/.test(mobileBlock))
  assert.ok(!/^\s*\.container \{/m.test(mobileBlock), 'and no blanket .container rule')

  // A collapsed wrapper takes its column with it, so every child it used to
  // hold has to carry one itself or the area loses its gutters.
  const column = mobileBlock.slice(mobileBlock.indexOf('.pricing-deck__panel .tier-table__intro'))
  const columnRule = column.slice(0, column.indexOf('}') + 1)
  for (const selector of ['.tier-table__intro', '.engagement-group__intro', '.tier',
    '.website-standard', '.engagement-group__outro']) {
    assert.ok(columnRule.includes(selector), `${selector} carries the column`)
  }
  assert.match(columnRule, /max-width: var\(--container-max\)/)
  assert.match(columnRule, /padding-inline: var\(--gutter\)/)
})

await test('a package holds only while something is coming up behind it', () => {
  // Holding is what lets the next card ride over it. The last package of an
  // engagement area has a closing note under it and nothing else, so there is
  // nothing to ride over it and it leaves with the page instead of stopping
  // against a bar nothing ever arrives at.
  assert.match(mobileBlock,
    /\.pricing-deck__panel \.engagement-group \.tier:last-child \{\s*position: relative;\s*\}/)
  // The website area does have one: the care band is the maintenance package
  // that sits under the third level, and it fills the frame so it can cover a
  // package completely rather than passing over it as a strip.
  const care = mobileBlock.slice(mobileBlock.indexOf('.pricing-deck__panel .website-care'))
  const careRule = care.slice(0, care.indexOf('}') + 1)
  assert.match(careRule, /z-index: 5/)
  assert.match(careRule, /min-height: calc\(100svh - var\(--pricing-frame-top/)
  // And what rides over a package has to be opaque, or the package reads
  // straight through it.
  assert.match(mobileBlock, /\.website-standard,[\s\S]*?z-index: 4/)
  assert.match(mobileBlock, /\.website-standard,[\s\S]*?background: var\(--color-bone\)/)
  assert.match(engagement, /className="engagement-group__outro"/,
    'the engagement areas have the same closing block')
})

await test('the travel and the scroll are sequenced, not run together', () => {
  // A tab change from halfway down an area used to move several things at
  // once: the page jumped to the new area's top while the slide ran, and the
  // area being left was pinned to the frame — which snapped it to its own top
  // under the incoming one. Nothing scrolls and no height changes while the
  // slide runs, so the area being left stays exactly where the visitor left it.
  const slide = source.slice(source.indexOf('const forward = index > from'))
  const body = slide.slice(0, slide.indexOf('const items = Array.from'))
  assert.ok(!/scrollTo/.test(body), 'the slide itself never scrolls')
  assert.ok(!/--pricing-track-lock/.test(body),
    'and never resizes the page under it, which would clamp the scroll')
  // The area being left is no longer held; it has no reason to move.
  assert.match(body, /const moving = forward \? \[target\] : leaving/)
  const leavingLoop = body.slice(body.indexOf('for (const panel of leaving)'))
  assert.ok(!/--frozen/.test(leavingLoop.slice(0, leavingLoop.indexOf('\n      }'))),
    'the area being left is not held to the frame — nothing moves under it')

  // The arriving area is, at the position the page is about to take — without
  // that it slides in showing whatever is at the visitor's depth rather than
  // its beginning, and the scroll afterwards would be a visible lurch.
  assert.match(body, /target\.style\.setProperty\(\s*'--pricing-freeze-top',\s*`\$\{trackTop - destination\}px`/)
  assert.match(body, /target\.classList\.add\('pricing-deck__panel--frozen'\)/)
  assert.match(mobileBlock, /--frozen \{[^}]*top: var\(--pricing-freeze-top/s)

  // Then, and only then, the page moves.
  assert.match(body, /timer: window\.setTimeout\(\(\) => land\(destination\), SLIDE_MS/)
  assert.match(source, /const land = useCallback\(\s*\(destination: number\) => \{\s*window\.scrollTo/)
  // Reduced motion skips the travel but still has to arrive.
  assert.match(body, /if \(reducedMotion\) \{\s*land\(destination\)/)
})

await test('one edge serves both directions, and going back moves everything above', () => {
  assert.match(source, /const OFF_STAGE = 'translateX\(100%\)'/)
  assert.match(source, /const ON_STAGE = 'translateX\(0\)'/)
  // Forward, the arriving area travels in from the edge. Back, everything
  // above the target travels out to the same edge — including whatever sits
  // between, which is what makes a two-step jump read as one gesture.
  assert.match(source, /panels\.slice\(index \+ 1, from \+ 1\)/,
    'going back moves every area above the target, not only the current one')
  assert.match(source, /forward \? \[panels\[from\]\] :/,
    'going forward only the area being left is involved')
  assert.match(source, /forward \? OFF_STAGE : ON_STAGE/, 'the arriving area starts off stage')
  assert.match(source, /forward \? ON_STAGE : OFF_STAGE/, 'and the leaving areas end there')
})

await test('a slide always ends, in one place, and never strands an area', () => {
  // The arriving area is fixed to the frame and translated off it for the
  // length of the slide. Waiting on `transitionend` alone would strand it
  // there, held and half-translated, if the transition never fired — and the
  // page would never make the second half of the move either.
  assert.match(source, /window\.setTimeout\(\(\) => land\(destination\), SLIDE_MS \+ \d+\)/)
  assert.match(source, /endSlide\(\)\n/, 'a new slide ends any slide still running')
  assert.match(source, /useEffect\(\(\) => endSlide, \[endSlide\]\)/,
    'unmounting mid-slide cannot leave an area fixed')
  // Both directions end in the same steady state, so neither has to unwind
  // itself and a half-finished one cannot leave a contradictory layout.
  const settle = source.slice(source.indexOf('const settlePanels'))
  assert.match(settle, /classList\.remove\(/)
  assert.match(settle, /i <= activeRef\.current \? ON_STAGE : OFF_STAGE/)
  assert.match(settle, /dataset\.active = i === activeRef\.current/)
  assert.match(settle, /--pricing-track-lock/, 'and the track takes the active area\'s height')
})

await test('a tab lands on where its first package lives, not where it is held', () => {
  // Sticky is a form of relative positioning, so a held package reports its
  // stuck position from a bounding rect and from `offsetTop` alike. Reading
  // either dropped the visitor into the middle of a package that happened to
  // be holding rather than at its first line.
  const measure = source.slice(source.indexOf('const firstPackageTop'))
  assert.match(measure, /box\.style\.position = 'static'/)
  assert.ok(measure.indexOf("= 'static'") < measure.indexOf('getBoundingClientRect'))
  assert.match(measure, /box\.style\.position = held/, 'and the hold is restored')
  assert.match(source, /const destination = firstPackageTop\(target\)/)
  // Measured before anything is frozen: a fixed area's box is the frame's.
  const slide = source.slice(source.indexOf('const forward = index > from'))
  assert.ok(slide.indexOf('firstPackageTop(target)') < slide.indexOf('--frozen'),
    'the landing is measured before any area is held to the frame')

  // `auto` is not a jump: it defers to CSS, and the page sets
  // `scroll-behavior: smooth`. The area being left is frozen to the frame for
  // the length of the slide so this scroll happens behind it, and a glide
  // would still be travelling when the freeze lifts.
  assert.match(source, /window\.scrollTo\(\{ top: destination, behavior: 'instant' \}\)/)
})

await test('every area presents through the same package component', () => {
  // Parity is structural rather than a copy of the markup, so a change to one
  // area is a change to all three.
  assert.match(tierTable, /<PricingPackage/, 'the website tiers render through it')
  assert.match(engagement, /<PricingPackage/, 'and so do the engagement areas')
  assert.match(packageData, /packageFromTier/)
  assert.match(packageData, /packageFromEngagement/)
  // The drafted copy has to stay flagged until it is reviewed.
  assert.match(pricing, /DRAFTED BY CLAUDE ON 2026-09-12 — NOT YET APPROVED/,
    'the drafted package copy is marked unapproved in the content file')
  for (const field of ['category', 'tagline', 'bestFor', 'scope', 'ctaLabel']) {
    assert.match(pricing, new RegExp(`  ${field}\\?: `), `${field} is optional`)
  }
  // Optional: a block simply does not render while its field is absent, so a
  // field withdrawn in review cannot leave an empty labelled section behind.
  assert.match(packageData, /item\.category/)
  assert.match(packageView, /data\.bestFor \? \(/, 'the best-for block is gated on having one')
})
