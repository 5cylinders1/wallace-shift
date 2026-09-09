/** Timing and actual angular projection checks; GPU appearance is separate. */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { PerspectiveCamera, Vector3 } from 'three'
import ts from 'typescript'

async function load(relative) {
  const source = await readFile(new URL(relative, import.meta.url), 'utf8')
  const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext } }).outputText
  return import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)
}
const { SHOOTING_STAR, advanceShootingStar, createShootingStarState, resetShootingStar } = await load('../src/components/experiments/water-hero/shootingStar.ts')
const { sampleDescent } = await load('../src/components/experiments/water-hero/sceneDirector.ts')
const tick = (state, now, allowed = true, aspect = 16 / 9) => advanceShootingStar(state, now, allowed, aspect)

function firstEvent(seed, aspect = 16 / 9) {
  const state = createShootingStarState(seed)
  for (let t = 0; t < 26; t += .025) {
    tick(state, t, true, aspect)
    if (state.events) return state
  }
  throw new Error('event never began')
}

await test('startup waits 12–25 seconds, then one event fades in and out over about a second', () => {
  const state = firstEvent(8192)
  assert.ok(state.startedAt >= SHOOTING_STAR.minWait && state.startedAt <= SHOOTING_STAR.maxWait + .025)
  assert.equal(state.gain, 0)
  const start = state.startedAt, duration = state.duration
  assert.ok(duration >= .85 && duration <= 1.15)
  const gains = []
  for (let i = 1; i <= 20; i++) {
    tick(state, start + duration * i / 20)
    gains.push(state.gain)
    assert.ok(Number.isFinite(state.gain) && state.gain >= 0 && state.gain <= 1)
  }
  assert.ok(gains[0] > 0 && gains[0] < gains[1])
  assert.ok(gains[15] > gains[17] && gains[17] > gains[18])
  assert.ok(gains[19] < 1e-12)
})

await test('seeded events vary their positions and waits without overlapping', () => {
  const a = createShootingStarState(51), b = createShootingStarState(51)
  const starts = [], ends = [], directions = []
  let previousEvents = 0
  for (let i = 0; i < 12000; i++) {
    const time = i / 40
    tick(a, time); tick(b, time)
    assert.deepEqual(a, b)
    if (a.events !== previousEvents) {
      starts.push(a.startedAt); ends.push(a.startedAt + a.duration)
      directions.push([...a.start])
      previousEvents = a.events
    }
  }
  assert.ok(starts.length > 10)
  for (let i = 1; i < starts.length; i++) {
    const gap = starts[i] - ends[i - 1]
    assert.ok(gap >= 12 && gap <= 25.05, `unexpected quiet interval ${gap}`)
    assert.notDeepEqual(directions[i], directions[i - 1])
  }
  assert.notDeepEqual(firstEvent(51).start, firstEvent(52).start)
})

await test('reduced motion, hidden sky and clock suspension cancel rather than replay an event', () => {
  for (const suspended of [false, true]) {
    const state = firstEvent(123)
    const start = state.startedAt
    tick(state, start + .15)
    assert.ok(state.gain > 0)
    if (suspended) tick(state, start + 80)
    else {
      tick(state, start + .2, false)
      tick(state, start + .25)
    }
    assert.equal(state.gain, 0)
    assert.equal(state.startedAt, Infinity)
    assert.ok(state.nextAt - state.lastTime >= 12)
  }
  const disabled = createShootingStarState(123)
  for (let time = 0; time < 100; time += .1) tick(disabled, time, false)
  assert.equal(disabled.events, 0)
  const quickTabReturn = firstEvent(9)
  resetShootingStar(quickTabReturn)
  tick(quickTabReturn, 30)
  assert.equal(quickTabReturn.gain, 0)
  assert.ok(quickTabReturn.nextAt >= 42)
})

await test('all paths stay above the horizon and intersect the opening or upward view on desktop and phone', () => {
  const sample = new Vector3(), start = new Vector3(), tangent = new Vector3()
  for (const aspect of [16 / 9, 390 / 844]) {
    const opening = sampleDescent(0, aspect)
    const camera = new PerspectiveCamera(32, aspect, .025, 400)
    const cameras = [new Vector3(...opening.target).sub(new Vector3(...opening.camera)),
      new Vector3(0, Math.sin(25 * Math.PI / 180), -Math.cos(25 * Math.PI / 180))]
    for (let seed = 1; seed <= 100; seed++) {
      const event = firstEvent(seed * 6151, aspect)
      start.fromArray(event.start); tangent.fromArray(event.tangent)
      assert.ok(Math.abs(start.length() - 1) < 1e-12)
      assert.ok(Math.abs(tangent.length() - 1) < 1e-12)
      assert.ok(Math.abs(start.dot(tangent)) < 1e-12)
      for (let i = 0; i <= 20; i++) {
        const angle = event.travel * i / 20
        sample.copy(start).multiplyScalar(Math.cos(angle)).addScaledVector(tangent, Math.sin(angle))
        assert.ok(sample.y > Math.sin(7 * Math.PI / 180), 'path crossed the horizon mask')
      }
      const middle = start.clone().multiplyScalar(Math.cos(event.travel / 2)).addScaledVector(tangent, Math.sin(event.travel / 2))
      const visible = cameras.some(target => {
        camera.lookAt(target); camera.updateMatrixWorld()
        sample.copy(middle).multiplyScalar(10).project(camera)
        return Math.abs(sample.x) < 1 && Math.abs(sample.y) < 1 && sample.z > -1 && sample.z < 1
      })
      assert.ok(visible, `event ${seed} missed both views at aspect ${aspect}`)
    }
  }
})

await test('frame updates reuse the event and vector storage, including across a reverse clock jump', () => {
  const state = firstEvent(47), start = state.start, tangent = state.tangent
  const now = state.startedAt
  for (let i = 0; i < 100; i++) tick(state, now + i / 60)
  assert.equal(state.start, start); assert.equal(state.tangent, tangent)
  tick(state, 0)
  assert.equal(state.gain, 0)
  assert.ok(state.nextAt >= 12)
})

await test('sky integration fades underwater, cancels hidden-tab events and leaves studio lighting untouched', async () => {
  const sky = await readFile(new URL('../src/components/experiments/water-hero/NightSky.tsx', import.meta.url), 'utf8')
  const shader = await readFile(new URL('../src/components/experiments/water-hero/shaders/shootingStar.ts', import.meta.url), 'utf8')
  const studio = await readFile(new URL('../src/components/experiments/water-hero/studioEnvironment.ts', import.meta.url), 'utf8')
  assert.match(sky, /!reducedMotion && document\.visibilityState !== 'hidden' && sky\.visible/)
  assert.match(sky, /meteor\.gain \* \(1 - sceneState\.underwater\) \*\* 2 \* sceneState\.lightLevel/)
  assert.match(sky, /addEventListener\('visibilitychange', reset\)/)
  assert.match(sky, /removeEventListener\('visibilitychange', reset\)/)
  assert.match(shader, /dFdx\(direction\)/)
  assert.doesNotMatch(studio, /shootingStar|uMeteor/)
})
