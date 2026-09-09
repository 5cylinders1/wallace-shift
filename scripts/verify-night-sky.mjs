/** Visibility/reduced-motion checks; not a GPU or photographic sky review. */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { transpileModule } from 'typescript'

const source = await readFile(new URL('../src/components/experiments/water-hero/nightSkyState.ts', import.meta.url), 'utf8')
const javascript = transpileModule(source, { compilerOptions: { target: 9, module: 7 } }).outputText
const { sampleNightSky } = await import(`data:text/javascript;base64,${Buffer.from(javascript).toString('base64')}`)

await test('stars and fog diminish continuously through the water crossing', () => {
  let previous = sampleNightSky(0, 1, 0, false)
  for (let i = 0; i <= 1000; i++) {
    const sky = sampleNightSky(i / 1000, 1, 30, false)
    assert.ok(sky.stars >= 0 && sky.stars <= previous.stars)
    assert.ok(sky.fog >= 0 && sky.fog <= previous.fog)
    previous = sky
  }
  assert.deepEqual(sampleNightSky(1, 1, 30, false), { visible: false, stars: 0, fog: 0, fogTime: 30 })
})

await test('blackout extinguishes every sky contribution and reverse restores the same state', () => {
  const expected = sampleNightSky(.24, .9, 40, false)
  const black = sampleNightSky(0, 0, 40, false)
  assert.equal(black.visible, false)
  assert.equal(black.stars, 0)
  assert.equal(black.fog, 0)
  sampleNightSky(1, 0, 100, false)
  assert.deepEqual(sampleNightSky(.24, .9, 40, false), expected)
})

await test('reduced motion freezes mist while preserving the static night sky', () => {
  const expected = sampleNightSky(0, 1, 0, true)
  for (const time of [0, 1, 30, 3000]) assert.deepEqual(sampleNightSky(0, 1, time, true), expected)
  assert.ok(expected.stars > 0 && expected.fog > 0)
})
