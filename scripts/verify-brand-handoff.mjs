/** Scroll math and mask checks only; these do not render a browser or GPU. */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

async function moduleUrl(path, dependencies = {}) {
  let source = await readFile(new URL(path, import.meta.url), 'utf8')
  for (const [name, url] of Object.entries(dependencies)) source = source.replace(`from '${name}'`, `from '${url}'`)
  const output = ts.transpileModule(source, { compilerOptions: {
    target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext,
  } }).outputText
  return `data:text/javascript;base64,${Buffer.from(output).toString('base64')}`
}
const source = '../src/components/'
const water = `${source}experiments/water-hero/`
const director = await moduleUrl(`${water}sceneDirector.ts`)
const mask = await moduleUrl(`${water}handoffProgress.ts`, { './sceneDirector': director })
const wipe = await moduleUrl(`${source}BrandStatement/brandStatementWipe.ts`)
const config = await moduleUrl(`${water}waterHeroConfig.ts`)
const { logoRevealClip } = await import(mask)
const { getBrandStatementWipe, getBrandStatementBandPct } = await import(wipe)
const { STAGE_SCROLL_SVH } = await import(config)
const { SPLIT_START } = await import(director)
const { BRAND_REVEAL_START_SVH, BRAND_REVEAL_OVERLAP_SVH, BRAND_HANDOFF_HEIGHT_SVH,
  BRAND_WIPE_TRAVEL_SVH, getBrandHandoffFrame } = await import(await moduleUrl(`${source}Hero/brandHandoffProgress.ts`, {
  '../BrandStatement/brandStatementWipe': wipe,
  '../experiments/water-hero/handoffProgress': mask,
  '../experiments/water-hero/sceneDirector': director,
  '../experiments/water-hero/waterHeroConfig': config,
}))
const contour = { rows: [-1, -.3, 0, .3, 1], left: [-.6, -.22, -.1, -.35, -.8],
  right: [.7, .4, .17, .28, .5], version: 1, open: true, complete: false }
const complete = { ...contour, complete: true }
const offset = scroll => (BRAND_REVEAL_START_SVH - scroll) / 100
const at = (scroll, shape = scroll >= 490 ? complete : contour, height = 900) =>
  getBrandHandoffFrame(Math.max(0, Math.min(1, scroll / (STAGE_SCROLL_SVH - 100))), offset(scroll), shape, height)
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-10, `${actual} ≠ ${expected}`)

await test('the integrated statement starts at the logo split and releases only after its light hold', () => {
  near(BRAND_REVEAL_START_SVH, (STAGE_SCROLL_SVH - 100) * SPLIT_START)
  near(STAGE_SCROLL_SVH - BRAND_REVEAL_OVERLAP_SVH, BRAND_REVEAL_START_SVH)
  near(BRAND_REVEAL_START_SVH + BRAND_HANDOFF_HEIGHT_SVH - 100, STAGE_SCROLL_SVH + BRAND_WIPE_TRAVEL_SVH)
  near(BRAND_REVEAL_START_SVH, 410)
  near(BRAND_HANDOFF_HEIGHT_SVH, 335)
  assert.equal(at(645).wipeProgress, 1)
  assert.equal(at(700).wipeProgress, 1)
})

await test('headline follows the real contour with a gradual fade; paragraph follows, with no competing entrance', () => {
  for (const scroll of [0, 300, 400, 410]) {
    assert.equal(at(scroll).active, false)
    assert.equal(at(scroll).headingOpacity, 0)
  }
  const partial = at(430)
  near(partial.headingOpacity, .5)
  assert.equal(partial.bodyOpacity, 0)
  assert.equal(partial.clip, logoRevealClip(contour, { left: 0, top: 0, width: 1, height: 1 }))
  near(at(475).bodyOpacity, .5)
  assert.equal(at(490).clip, 'none')
  assert.equal(at(490).headingOpacity, 1)
  assert.equal(at(490).bodyOpacity, 1)
  assert.equal(at(430, null).active, false)
  assert.equal(at(430, { ...contour, open: false }).active, false)
})

await test('the dark backplate fades in after the split, and white never covers the moving logo', () => {
  assert.equal(at(490).backgroundOpacity, 0)
  near(at(537.5).backgroundOpacity, .5)
  assert.equal(at(575).backgroundOpacity, 1)
  for (const scroll of [410, 430, 490, 500, 550, 575, 600, 608]) {
    assert.equal(at(scroll).wipeProgress, 0)
    assert.equal(at(scroll).plane, getBrandStatementWipe(170).plane)
  }
  assert.equal(at(608).headingOpacity, 1)
  assert.equal(at(608).bodyOpacity, 1)
})

await test('post-canvas scroll drives the original diagonal black-to-bone wipe while scene progress is clamped', () => {
  const start = STAGE_SCROLL_SVH + BRAND_WIPE_TRAVEL_SVH * .2
  const end = STAGE_SCROLL_SVH + BRAND_WIPE_TRAVEL_SVH * .85
  const middle = at((start + end) / 2)
  near(middle.wipeProgress, .5)
  const coordinates = [...middle.plane.matchAll(/(-?[\d.]+)%/g)].map(match => Number(match[1]))
  coordinates.forEach((value, index) => near(value, [0, 75, 100, 20, 100, 100, 0, 100][index]))
  near(at(end).wipeProgress, 1)
  assert.equal(at(end + .01).plane, 'polygon(0% -20%, 100% -75%, 100% 100%, 0% 100%)')
  assert.equal(at(645).clip, 'none')
  assert.equal(at(645).backgroundOpacity, 1)
})

await test('reverse and deep scroll restoration reconstruct the same scene without a timer or stale contour', () => {
  const positions = [0, 410, 425, 460, 490, 537.5, 600, 615, 630, 645, 720]
  const forward = positions.map(scroll => at(scroll))
  for (const [index, scroll] of positions.entries()) assert.deepEqual(at(scroll), forward[index])
  for (let i = positions.length - 1; i >= 0; i--) assert.deepEqual(at(positions[i]), forward[i])
  const restored = getBrandHandoffFrame(0, offset(645), null, 900)
  assert.equal(restored.active, true)
  assert.equal(restored.headingOpacity, 1)
  assert.equal(restored.bodyOpacity, 1)
  assert.equal(restored.clip, 'none')
  assert.equal(restored.wipeProgress, 1)
  assert.equal(at(400, complete).active, false, 'a stale completed contour cannot expose the statement on reverse')
})

await test('viewport resizing keeps the contour in canvas coordinates and the edge band at three pixels', () => {
  for (const height of [400, 768, 900, 1200]) {
    near(getBrandStatementBandPct(height) / 100 * height, 3)
    assert.equal(at(430, contour, height).clip, at(430).clip)
    assert.equal(at(625, complete, height).plane, at(625).plane)
    assert.notEqual(at(625, complete, height).edge, at(625, complete, height + 10).edge)
  }
  assert.equal(getBrandStatementBandPct(0), .4)
})

await test('portrait copy clears the opening logo and settles only as the halves leave', () => {
  for (const scroll of [410, 430, 450, 470]) assert.equal(at(scroll).mobileClearance, 1)
  assert.ok(at(485).mobileClearance > 0 && at(485).mobileClearance < 1)
  for (const scroll of [500, 600, 645]) assert.equal(at(scroll).mobileClearance, 0)
  assert.equal(getBrandHandoffFrame(0, offset(645), null, 844).mobileClearance, 0,
    'a restored post-canvas statement keeps its settled placement before the scene catches up')
})
