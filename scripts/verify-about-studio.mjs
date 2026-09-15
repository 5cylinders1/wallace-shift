/** Pure scroll contracts only; visual quality and media seeking require browser verification. */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

const source = await readFile(new URL('../src/components/AboutStudio/studioDirector.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: {
  target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext,
} }).outputText
const { sampleStudioJourney } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)
const continuousFields = ['film', 'opening', 'detail', 'alignment']

await test('missing measurements and overscroll preserve safe opening or final poses', () => {
  const opening = sampleStudioJourney(0)
  const ending = sampleStudioJourney(1)
  for (const progress of [undefined, NaN, Infinity, -Infinity, -100, -.01]) {
    assert.deepEqual(sampleStudioJourney(progress), opening)
  }
  for (const progress of [1.001, 2, 100]) assert.deepEqual(sampleStudioJourney(progress), ending)
  assert.equal(opening.film, 0)
  assert.equal(ending.film, 1)
})

await test('each chapter has a stationary readable hold, including the final handoff', () => {
  const holds = [
    { samples: [0, .06, .12], chapter: 0, copy: 'opening', film: 0 },
    { samples: [.44, .50, .57], chapter: 1, copy: 'detail', film: .5 },
    { samples: [.89, .95, 1], chapter: 2, copy: 'alignment', film: 1 },
  ]
  for (const hold of holds) for (const progress of hold.samples) {
    const frame = sampleStudioJourney(progress)
    assert.equal(frame.film, hold.film, `camera must rest while reading chapter ${hold.chapter + 1}`)
    assert.equal(frame.chapter, hold.chapter)
    assert.equal(frame[hold.copy], 1)
    for (const copy of ['opening', 'detail', 'alignment']) {
      if (copy !== hold.copy) assert.equal(frame[copy], 0, `chapter ${copy} must not cover the reading hold`)
    }
  }
})

await test('both journeys actually advance the camera and never run the film backward during forward scroll', () => {
  let previous = sampleStudioJourney(0).film
  let movingSamples = 0
  for (let index = 1; index <= 2000; index++) {
    const current = sampleStudioJourney(index / 2000).film
    assert.ok(current >= previous, `film ran backward at scroll progress ${index / 2000}`)
    if (current > previous) movingSamples++
    previous = current
  }
  assert.ok(movingSamples > 800, 'travel must occupy meaningful scroll distance')
  assert.ok(sampleStudioJourney(.29).film > 0 && sampleStudioJourney(.29).film < .5)
  assert.ok(sampleStudioJourney(.72).film > .5 && sampleStudioJourney(.72).film < 1)
})

await test('every visual channel stays bounded and continuous through chapter boundaries', () => {
  let previous = sampleStudioJourney(0)
  for (let index = 0; index <= 4000; index++) {
    const progress = index / 4000
    const frame = sampleStudioJourney(progress)
    for (const field of continuousFields) {
      assert.ok(Number.isFinite(frame[field]) && frame[field] >= 0 && frame[field] <= 1,
        `${field} must remain a finite normalized value at ${progress}`)
      assert.ok(Math.abs(frame[field] - previous[field]) < .005,
        `${field} visibly jumps at ${progress}`)
    }
    assert.ok([0, 1, 2].includes(frame.chapter))
    previous = frame
  }
})

await test('travel clears one copy block before introducing another', () => {
  for (let index = 0; index <= 2000; index++) {
    const progress = index / 2000
    const frame = sampleStudioJourney(progress)
    const visible = ['opening', 'detail', 'alignment'].filter(copy => frame[copy] > .001)
    assert.ok(visible.length <= 1, `competing copy appears at ${progress}: ${visible.join(', ')}`)
    const prominent = ['opening', 'detail', 'alignment'].findIndex(copy => frame[copy] >= .5)
    if (prominent !== -1) assert.equal(frame.chapter, prominent, 'the rail must identify the visible reading chapter')
  }
})

await test('reverse scrolling, large jumps, and a direct reload all restore the same pose', () => {
  const positions = Array.from({ length: 201 }, (_, index) => index / 200)
  const forward = new Map(positions.map(progress => [progress, sampleStudioJourney(progress)]))
  for (const progress of [...positions].reverse()) {
    assert.deepEqual(sampleStudioJourney(progress), forward.get(progress), `reverse scroll differs at ${progress}`)
  }
  for (const progress of [.95, .06, .5, 1, .29, 0, .72, .44]) {
    const expected = sampleStudioJourney(progress)
    sampleStudioJourney(1 - progress)
    sampleStudioJourney(0)
    assert.deepEqual(sampleStudioJourney(progress), expected, `jump or reload inherits previous scroll state at ${progress}`)
  }
})
