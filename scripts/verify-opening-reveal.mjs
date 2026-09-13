/** Pure scroll choreography and DOM emphasis checks; no browser rendering. */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { transpileModule } from 'typescript'

async function sourceUrl(name, replacements = []) {
  let source = await readFile(new URL(`../src/components/experiments/water-hero/${name}.ts`, import.meta.url), 'utf8')
  for (const [from, to] of replacements) source = source.replace(from, to)
  const js = transpileModule(source, { compilerOptions: { target: 9, module: 7 } }).outputText
  return `data:text/javascript;base64,${Buffer.from(js).toString('base64')}`
}
const openingUrl = await sourceUrl('openingReveal')
const { OPENING_REVEAL, sampleOpeningReveal } = await import(openingUrl)
const { sampleDescent } = await import(await sourceUrl('sceneDirector'))
const { applyHeroUiProgress } = await import(await sourceUrl('heroUiProgress', [
  ["from './openingReveal'", `from '${openingUrl}'`],
]))
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-10, `${a} vs ${b}`)

await test('scroll beats provide a readable rest, a moving centre trace, a face reveal and a wide finished hold', () => {
  for (const p of [0, .01, OPENING_REVEAL.restEnd]) {
    assert.deepEqual(sampleOpeningReveal(p), { trace: 0, traceStrength: 0, surface: 0, prominence: 0, resting: true })
  }
  const tracing = sampleOpeningReveal(.055)
  assert.ok(tracing.trace > 0 && tracing.trace < 1)
  assert.equal(tracing.traceStrength, 1)
  assert.equal(tracing.surface, 0)
  const energizing = sampleOpeningReveal(.1075)
  close(energizing.surface, .5)
  assert.ok(energizing.traceStrength > 0 && energizing.traceStrength < 1)
  assert.equal(energizing.trace, 1)
  for (const p of [.145, .17, .21, .25, .40, 1]) {
    assert.deepEqual(sampleOpeningReveal(p), { trace: 1, traceStrength: 0, surface: 1, prominence: 1, resting: false })
  }
})

await test('all samples are bounded, continuous and reversible, with no history or elapsed time', () => {
  const forward = []
  for (let i = 0; i <= 1000; i++) {
    const sample = sampleOpeningReveal(i / 1000)
    for (const key of ['trace', 'traceStrength', 'surface', 'prominence']) {
      assert.ok(Number.isFinite(sample[key]) && sample[key] >= 0 && sample[key] <= 1)
    }
    assert.equal(sample.prominence, sample.surface)
    if (i) {
      assert.ok(sample.trace >= forward[i - 1].trace)
      assert.ok(sample.surface >= forward[i - 1].surface)
    }
    forward.push(sample)
  }
  for (let i = 1000; i >= 0; i--) assert.deepEqual(sampleOpeningReveal(i / 1000), forward[i])
  for (const i of [45, 150, 0, 250, 95, 32, 145]) assert.deepEqual(sampleOpeningReveal(i / 1000), forward[i])
  for (const p of [.025, .037, .07, .09, .145, .25]) {
    const before = sampleOpeningReveal(p - 1e-7), after = sampleOpeningReveal(p + 1e-7)
    for (const key of ['trace', 'traceStrength', 'surface', 'prominence']) assert.ok(Math.abs(before[key] - after[key]) < .0001)
  }
})

await test('reduced motion is immediately finished and clamped inputs remain safe', () => {
  const finished = { trace: 1, traceStrength: 0, surface: 1, prominence: 1, resting: false }
  for (const p of [-Infinity, 0, .06, .11, .25, 1, Infinity, NaN]) assert.deepEqual(sampleOpeningReveal(p, true), finished)
  assert.deepEqual(sampleOpeningReveal(-Infinity), sampleOpeningReveal(0))
  assert.deepEqual(sampleOpeningReveal(Infinity), sampleOpeningReveal(1))
  assert.deepEqual(sampleOpeningReveal(NaN), sampleOpeningReveal(0))
})

await test('all responsive camera compositions remain identical for the entire finished hold', () => {
  for (const aspect of [.25, 390 / 844, .75, 1, 16 / 9, 2.4]) {
    const opening = sampleDescent(0, aspect)
    for (const p of [.025, .055, .09, .12, .145, .20, OPENING_REVEAL.holdEnd]) {
      const held = sampleDescent(p, aspect)
      assert.deepEqual(held.camera, opening.camera)
      assert.deepEqual(held.target, opening.target)
      assert.equal(held.logoY, opening.logoY)
      assert.equal(held.yaw, opening.yaw)
    }
  }
})

await test('headline emphasis follows the material reveal while both words remain semantic and visible', () => {
  const word = () => ({ style: {}, attributes: {}, inert: false })
  const before = word(), after = word()
  const headline = {
    dataset: { inStart: '-1', inEnd: '0', outStart: '.25', outEnd: '.35', shift: '22' },
    style: {}, inert: false, attributes: {}, contains: () => false,
    setAttribute(name, value) { this.attributes[name] = value },
  }
  const root = {
    querySelector(selector) { return selector.includes('before') ? before : after },
    querySelectorAll() { return [headline] },
  }
  const priorDocument = globalThis.document
  globalThis.document = { activeElement: null }
  try {
    applyHeroUiProgress(root, 0, false)
    close(Number(before.style.opacity), .9); close(Number(after.style.opacity), .38)
    applyHeroUiProgress(root, .1075, false)
    close(Number(before.style.opacity), .675); close(Number(after.style.opacity), .69)
    for (const p of [.145, .20, .25]) {
      applyHeroUiProgress(root, p, false)
      close(Number(before.style.opacity), .45); close(Number(after.style.opacity), 1)
      assert.equal(headline.style.opacity, '1')
      assert.equal(headline.attributes['aria-hidden'], 'false')
      assert.equal(headline.inert, false)
    }
    assert.deepEqual(before.attributes, {}); assert.deepEqual(after.attributes, {})
    assert.equal(before.inert, false); assert.equal(after.inert, false)
    applyHeroUiProgress(root, .30, false)
    close(Number(headline.style.opacity), .5)
    applyHeroUiProgress(root, .35, false)
    assert.equal(headline.attributes['aria-hidden'], 'true')
    applyHeroUiProgress(root, .025, false)
    close(Number(after.style.opacity), .38)
    assert.equal(headline.attributes['aria-hidden'], 'false')
    applyHeroUiProgress(root, 0, true)
    close(Number(after.style.opacity), 1)
    close(Number(before.style.opacity), .45)
    assert.equal(headline.style.transform, 'none')
  } finally {
    if (priorDocument === undefined) delete globalThis.document
    else globalThis.document = priorDocument
  }
})

await test('markup keeps the experiment copy and links, with the original landing copy/form sharing its finished hold and exit', async () => {
  const markup = await readFile(new URL('../src/components/experiments/water-hero/HeroUI.tsx', import.meta.url), 'utf8')
  for (const group of ['masthead', 'eyebrow', 'statement']) {
    const tag = markup.match(new RegExp(`className="water-hero__${group}"[^>]*`))?.[0]
    assert.ok(tag, `${group} retains its progress attributes`)
    assert.match(tag, /data-out-start="0\.25"/)
    assert.match(tag, /data-out-end="0\.35"/)
  }
  assert.match(markup, /data-out-start="0.10"/)
  assert.match(markup, />Overlooked<\/span>/)
  assert.match(markup, /Unforgettable/)
  assert.match(markup, /A shift in perspective/)
  assert.equal((markup.match(/href="\/"/g) ?? []).length, 2)
  const landing = await readFile(new URL('../src/components/experiments/water-hero/LandingHeroUI.tsx', import.meta.url), 'utf8')
  const content = landing.match(/className="water-hero__landing-content"[^>]+/)?.[0]
  assert.ok(content)
  assert.match(content, /data-out-start="0\.25"/)
  assert.match(content, /data-out-end="0\.35"/)
})
