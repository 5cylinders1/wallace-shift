/** CPU checks for the single split-revealed HTML handoff; no browser layout claim. */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

async function sourceModule(path, replacements = []) {
  let source = await readFile(new URL(path, import.meta.url), 'utf8')
  for (const [from, to] of replacements) source = source.replace(from, to)
  const javascript = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext },
  }).outputText
  return `data:text/javascript;base64,${Buffer.from(javascript).toString('base64')}`
}
const director = await sourceModule('../src/components/experiments/water-hero/sceneDirector.ts')
const { SPLIT_START, SPLIT_END } = await import(director)
const handoff = await sourceModule('../src/components/experiments/water-hero/handoffProgress.ts', [
  ["from './sceneDirector'", `from '${director}'`],
])
const { applyHandoffProgress, logoRevealClip } = await import(handoff)
const originalDocument = globalThis.document
globalThis.document = { activeElement: null }

function fixture() {
  const element = (start, end) => ({
    dataset: { handoffStart: String(start), handoffEnd: String(end) },
    style: {}, inert: false, attributes: {},
    setAttribute(name, value) { this.attributes[name] = value },
    contains(candidate) { return this === candidate },
    blur() { globalThis.document.activeElement = null },
  })
  const label = element(.89, .96), body = element(.945, .985), link = element(.965, .995)
  const elements = [label, body, link]
  const stage = { style: {} }, aperture = element(0, 1)
  const root = { inert: false, attributes: {},
    setAttribute(name, value) { this.attributes[name] = value },
    querySelector: selector => selector === '[data-split-aperture]' ? aperture : stage,
    querySelectorAll: () => elements,
  }
  return { root, stage, aperture, elements, label, body, link }
}
const offset = p => (SPLIT_START - p) * 5
const contour = { rows: [-1, -.3, 0, .3, 1], left: [-.6, -.22, -.1, -.35, -.8],
  right: [.7, .4, .17, .28, .5], version: 1, open: true, complete: false }
const complete = { ...contour, complete: true }
const bounds = { left: .2, top: .3, width: .6, height: .4 }
const apply = (root, p, shape = p >= SPLIT_END ? complete : contour, sectionOffset = offset(p), inspecting = false) =>
  applyHandoffProgress(root, p, sectionOffset, false, 5, inspecting, shape, bounds)

await test('the incoming heading stays hidden until the half-turn has finished and the pieces begin parting', () => {
  const { root, stage, aperture } = fixture()
  for (const p of [0, .43, .68, .80, SPLIT_START]) {
    apply(root, p)
    assert.equal(stage.style.visibility, 'hidden')
    assert.equal(aperture.style.visibility, 'hidden')
    assert.equal(root.inert, true)
  }
})

await test('the shaped heading opens with the split and support follows separation', () => {
  const { root, aperture, body, link } = fixture()
  apply(root, .90)
  assert.equal(aperture.style.visibility, 'visible')
  assert.equal(aperture.style.clipPath, logoRevealClip(contour, bounds))
  assert.ok(aperture.style.clipPath.startsWith('polygon('))
  assert.equal(body.style.opacity, '0')
  assert.equal(link.inert, true)
  apply(root, SPLIT_END)
  assert.equal(aperture.style.clipPath, 'none')
  apply(root, 1)
  assert.equal(link.style.opacity, '1')
  assert.equal(link.inert, false)
})

await test('the contour-revealed heading gains opacity smoothly and scrubs back through the same fade', () => {
  const { root, aperture } = fixture()
  const samples = new Map()
  let previous = 0
  for (let step = 0; step <= 80; step++) {
    const p = SPLIT_START + step / 1000
    apply(root, p, contour)
    const opacity = Number(aperture.style.opacity)
    assert.ok(opacity >= previous && opacity <= 1)
    assert.ok(opacity - previous < .025, 'small scroll steps cannot flash the heading to full white')
    assert.equal(aperture.style.clipPath, logoRevealClip(contour, bounds), 'fade preserves the actual shape mask')
    assert.equal(aperture.style.transform, undefined, 'fade does not move the heading away from its projected contour')
    samples.set(p, opacity)
    previous = opacity
  }
  apply(root, .83, contour)
  assert.ok(Number(aperture.style.opacity) > 0 && Number(aperture.style.opacity) < .1, 'the first open frames are faint')
  apply(root, .86, contour)
  assert.ok(Math.abs(Number(aperture.style.opacity) - .5) < 1e-12)
  apply(root, .90, contour)
  assert.equal(aperture.style.opacity, '1')
  for (const [p, expected] of [...samples].reverse()) {
    apply(root, p, contour)
    assert.equal(Number(aperture.style.opacity), expected, 'reverse reconstructs opacity without a timer')
  }
  assert.equal(aperture.style.opacity, '0')
  assert.equal(root.inert, true)
})

await test('the HTML polygon preserves asymmetric angled edges in the measured heading box', () => {
  const polygon = logoRevealClip(contour, bounds)
  const points = [...polygon.matchAll(/(-?[\d.]+)% (-?[\d.]+)%/g)].map(match => match.slice(1).map(Number))
  assert.equal(points.length, contour.rows.length * 2)
  const expected = contour.rows.map((y, i) => [contour.left[i], y])
    .concat([...contour.rows].reverse().map((y, i) => [contour.right[contour.rows.length - 1 - i], y]))
  for (let i = 0; i < points.length; i++) {
    const x = 2 * (points[i][0] / 100 * bounds.width + bounds.left) - 1
    const y = 1 - 2 * (points[i][1] / 100 * bounds.height + bounds.top)
    assert.ok(Math.abs(x - expected[i][0]) < 1e-6, 'NDC X survives DOM width/offset mapping')
    assert.ok(Math.abs(y - expected[i][1]) < 1e-6, 'NDC Y survives DOM height/offset mapping')
  }
  assert.ok(new Set(points.slice(0, contour.rows.length).map(point => point[0])).size > 3, 'left edge is not a rectangular door')
  assert.notEqual(points[2][0] + points.at(-3)[0], 100, 'asymmetry follows the real halves instead of a mirrored mask')
})

await test('a missing or closed geometry channel cannot reveal progress-driven rectangular text', () => {
  const { root, aperture } = fixture()
  apply(root, .90, null)
  assert.equal(aperture.style.visibility, 'hidden')
  apply(root, .90, { ...contour, open: false })
  assert.equal(aperture.style.visibility, 'hidden', 'no text can cover metal before the central gap opens')
  apply(root, .90, contour)
  assert.equal(aperture.style.visibility, 'visible')
})

await test('one fully revealed heading continues beyond sticky release without a second entrance or black gate', () => {
  const { root, aperture, stage, elements } = fixture()
  apply(root, 1)
  const finalAperture = { ...aperture.style }
  const finalCopy = elements.map(element => ({ ...element.style }))
  assert.equal(stage.style.visibility, 'visible')
  for (const sectionOffset of [-1, -1.4, -1.9]) {
    apply(root, 1, complete, sectionOffset)
    assert.deepEqual(aperture.style, finalAperture)
    assert.deepEqual(elements.map(element => element.style), finalCopy)
    assert.equal(root.inert, false)
  }
})

await test('reverse closes the aperture and removes hidden link focus; a direct jump restores it immediately', () => {
  const { root, aperture, elements, link } = fixture()
  apply(root, 1)
  const final = elements.map(element => ({ ...element.style }))
  globalThis.document.activeElement = link
  apply(root, .78, { ...contour, open: false })
  assert.equal(globalThis.document.activeElement, null)
  assert.equal(root.inert, true)
  assert.equal(aperture.style.visibility, 'hidden')
  apply(root, 1)
  assert.deepEqual(elements.map(element => element.style), final)
})

await test('reduced motion exposes the section directly and pinned inspection uses the same reveal', () => {
  const { root, stage, aperture, elements } = fixture()
  applyHandoffProgress(root, 0, 5, true)
  assert.equal(root.inert, false)
  assert.equal(aperture.style.clipPath, 'none')
  assert.equal(aperture.style.opacity, '1')
  for (const element of elements) assert.equal(element.style.opacity, '1')
  apply(root, .90, contour, 4, true)
  assert.equal(stage.style.visibility, 'visible')
  assert.equal(root.attributes['data-inspection'], 'true')
})

if (originalDocument === undefined) delete globalThis.document
else globalThis.document = originalDocument
