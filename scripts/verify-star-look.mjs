/** Run: node scripts/verify-star-look.mjs
 * Pure intent/spring regressions; browser overscroll and sky appearance
 * still require device verification. No DOM or WebGL context is mocked.
 */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

const source = await readFile(new URL('../src/components/experiments/water-hero/starLookInteraction.ts', import.meta.url), 'utf8')
const javascript = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext },
}).outputText
const {
  createStarLookState, inputStarLook, advanceStarLook, wheelPixels,
  STAR_LOOK_QUIET_MS, STAR_LOOK_ELEVATION,
} = await import(`data:text/javascript;base64,${Buffer.from(javascript).toString('base64')}`)

function pumped(hz = 60) {
  let state = createStarLookState()
  for (let i = 0; i < hz; i++) {
    const now = i * 1000 / hz
    state = inputStarLook(state, -20, now, true, true)
    state = advanceStarLook(state, 1 / hz, now, true, true)
  }
  return state
}

await test('startup and restored scroll positions never manufacture upward intent', () => {
  for (const atTop of [true, false]) {
    let state = createStarLookState()
    for (let i = 0; i < 120; i++) state = advanceStarLook(state, 1 / 60, i * 1000 / 60, true, atTop)
    assert.equal(state.lift, 0)
    assert.equal(state.target, 0)
  }
  const state = createStarLookState()
  assert.equal(inputStarLook(state, -100, 0, true, false), state, 'synthetic input ignored')
  assert.equal(inputStarLook(state, -100, 0, false, true), state, 'input away from top ignored')
  assert.equal(inputStarLook(state, NaN, 0, true, true), state, 'invalid input ignored')
})

await test('upward wheel and touch intent accumulate into a bounded camera lift', () => {
  let state = createStarLookState()
  state = inputStarLook(state, -2, 0, true, true)
  assert.equal(state.target, 0, 'incidental noise stays below the intent threshold')
  const first = inputStarLook(state, -70, 20, true, true)
  const second = inputStarLook(first, -70, 40, true, true)
  assert.ok(second.target > first.target)
  for (const hz of [30, 60, 144]) {
    const active = pumped(hz)
    assert.ok(active.lift > .9 && active.lift <= 1, `sustained lift at ${hz} Hz`)
    assert.equal(active.target, 1)
    const enormous = inputStarLook(active, -1e9, 1000, true, true)
    assert.equal(enormous.target, 1, 'large input is bounded')
  }
})

await test('stopping upward input automatically springs back without waiting for downscroll', () => {
  for (const hz of [30, 60, 144]) {
    let state = pumped(hz)
    const lastUp = state.lastUpMs
    state = advanceStarLook(state, 0, lastUp + STAR_LOOK_QUIET_MS - 1, true, true)
    assert.equal(state.target, 1, 'continuous gesture remains engaged')
    state = advanceStarLook(state, 1 / hz, lastUp + STAR_LOOK_QUIET_MS + 1, true, true)
    assert.equal(state.target, 0, 'quiet gesture releases automatically')
    for (let i = 1; i <= hz * 2; i++) {
      state = advanceStarLook(state, 1 / hz, lastUp + STAR_LOOK_QUIET_MS + 1 + i * 1000 / hz, true, true)
      assert.ok(state.lift >= 0 && state.lift <= 1, 'spring never leaves its safe range')
    }
    assert.equal(state.lift, 0, `camera settles to exact rest at ${hz} Hz`)
    assert.equal(state.velocity, 0)
  }
})

await test('downward input releases faster and blocked states immediately restore the authored camera', () => {
  const active = pumped()
  const down = inputStarLook(active, 30, 1000, true, true)
  assert.equal(down.target, 0)
  assert.equal(down.fastReturn, true)
  const released = advanceStarLook(down, 1 / 60, 1017, true, false)
  assert.ok(released.lift < active.lift)
  assert.deepEqual(advanceStarLook(active, 1 / 60, 1017, false, true), createStarLookState(),
    'reduced motion, pinned review, hidden document and large jumps cannot retain tilt')
})

await test('wheel units normalize and the upward view includes the authored Milky Way band', () => {
  assert.equal(wheelPixels(-3, 1, 800), -48)
  assert.equal(wheelPixels(-1, 2, 800), -160)
  assert.equal(wheelPixels(40, 0, 800), 40)
  assert.equal(wheelPixels(NaN, 0, 800), 0)
  // The procedural plane normal (.93,.26,.11) places its core at
  // azimuth zero, approximately 23 degrees above the forward -Z horizon.
  const bandElevation = Math.atan(.11 / .26)
  const halfFov = 16 * Math.PI / 180
  assert.ok(Math.abs(bandElevation * 180 / Math.PI - 23) < 1)
  assert.ok(Math.abs(bandElevation - STAR_LOOK_ELEVATION) < 3 * Math.PI / 180,
    'the bright band lies near the centre of the fully lifted camera')
  assert.ok(bandElevation > STAR_LOOK_ELEVATION - halfFov)
  assert.ok(bandElevation < STAR_LOOK_ELEVATION + halfFov)
})
