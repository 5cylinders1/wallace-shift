/** The closing section's entrance. Rendered-markup and source contracts; the
 * animation itself is a browser behaviour these checks cannot observe. */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

const root = new URL('../', import.meta.url)
const read = path => readFile(new URL(path, root), 'utf8')

await test('a slide starts off the page, lands, and is skipped for reduced motion', async () => {
  const source = await read('src/components/Reveal/Reveal.tsx')
  // Off its own width, so the start is outside the element whatever column
  // it happens to sit in.
  assert.match(source, /xPercent\?: number/, 'the slide distance is a percentage of the element')
  assert.match(source, /sliding \? \{ opacity: 0, xPercent, y: 0 \}/,
    'a sliding reveal starts off the page rather than below its place')
  assert.match(source, /xPercent: 0/, 'and lands on it')
  // Reduced motion has to clear the offset too, or the content stays parked
  // off the page forever.
  assert.match(source, /gsap\.set\(el, \{ opacity: 1, y: 0, xPercent: 0 \}\)/,
    'reduced motion clears the horizontal offset, not only the vertical one')
  assert.match(source, /dependencies: \[reducedMotion, delay, y, xPercent\]/,
    'the offset is part of the effect it drives')
})

await test('a sliding reveal never waits on the element it has moved off the page', async () => {
  const source = await read('src/components/Reveal/Reveal.tsx')
  // The deadlock this prevents: IntersectionObserver clips against ancestor
  // overflow, and a sliding reveal starts fully outside a section that must
  // clip. Watching the element itself reports it as never intersecting, so it
  // is never animated in, so it never comes into view. The content is simply
  // gone. Watch the untransformed parent, which is exactly as visible as the
  // place the element is travelling to.
  assert.match(source, /const watched = \(sliding && el\.parentElement\) \|\| el/,
    'a sliding reveal watches its untransformed parent')
  assert.match(source, /observer\.observe\(watched\)/, 'and observes that')
  assert.match(source, /observer\.unobserve\(watched\)/, 'and releases the same element')
  assert.doesNotMatch(source, /observer\.(un)?observe\(el\)/,
    'the moved element is never the one being watched')
})

await test('the closing halves arrive from the sides they belong to', async () => {
  const source = await read('src/components/ContactCta/ContactCta.tsx')
  const compiled = ts.transpileModule(source, { compilerOptions: {
    target: ts.ScriptTarget.ESNext, jsx: ts.JsxEmit.Preserve,
  } }).outputText
  const offsets = [...compiled.matchAll(/xPercent=\{sceneBackground \? (-?\d+) : undefined\}/g)]
    .map(match => Number(match[1]))
  assert.equal(offsets.length, 4, 'three copy blocks and the enquiry card')
  assert.equal(offsets.filter(value => value < 0).length, 3, 'the copy comes from the left')
  assert.equal(offsets.filter(value => value > 0).length, 1, 'the enquiry comes from the right')
  for (const offset of offsets) {
    assert.ok(Math.abs(offset) > 100,
      `${offset}% starts fully outside the element rather than nudging it`)
  }
  // Only the homepage composition slides; /contact and any other caller keep
  // the original rise.
  assert.match(compiled, /sceneBackground \? -?125 : undefined/,
    'the slide is gated on the scene background')

  // An element parked a full width off its place needs its section to clip,
  // or the page gains a horizontal scrollbar until the animation lands.
  const css = await read('src/components/ContactCta/ContactCta.css')
  assert.match(css, /\.contact-cta \{[^}]*overflow: hidden/s,
    'the section clips the off-page start')
})
