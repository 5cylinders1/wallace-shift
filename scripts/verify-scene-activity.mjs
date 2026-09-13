/** Clock continuity with a real Three Clock, deterministic RAF scheduling and
 * R3F's manual advance semantics. No GPU or battery measurements are made. */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { Clock } from 'three'
import ts from 'typescript'

const source = await readFile(new URL('../src/components/experiments/water-hero/sceneActivity.ts', import.meta.url), 'utf8')
const javascript = ts.transpileModule(source, { compilerOptions: {
  target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext,
} }).outputText
const { startSceneFrames } = await import(`data:text/javascript;base64,${Buffer.from(javascript).toString('base64')}`)

function frameLoop(elapsed = 0) {
  const clock = new Clock(false)
  clock.elapsedTime = elapsed
  const draws = []
  const pending = new Map()
  let nextId = 1
  const scheduler = {
    requestAnimationFrame(callback) { const id = nextId++; pending.set(id, callback); return id },
    cancelAnimationFrame(id) { pending.delete(id) },
  }
  const state = {
    clock,
    // Installed R3F's frameloop="never" update consumes seconds directly,
    // updating elapsedTime and passing the difference to useFrame callbacks.
    advance(timestamp, globalEffects) {
      const delta = timestamp - clock.elapsedTime
      clock.oldTime = clock.elapsedTime
      clock.elapsedTime = timestamp
      draws.push({ timestamp, delta, globalEffects })
    },
  }
  return {
    state, clock, draws, pending, scheduler,
    frame(now) {
      const callbacks = [...pending.values()]
      pending.clear()
      for (const callback of callbacks) callback(now)
    },
  }
}

await test('active frames use seconds and stopping cancels pending work without changing the last scene time', () => {
  const f = frameLoop(2.5)
  const stop = startSceneFrames(f.state, f.scheduler)
  assert.equal(f.pending.size, 1)
  assert.equal(f.draws.length, 0)
  f.frame(100000)
  assert.deepEqual(f.draws[0], { timestamp: 2.5, delta: 0, globalEffects: false })
  f.frame(100016)
  assert.ok(Math.abs(f.draws[1].delta - .016) < 1e-12)
  assert.equal(f.clock.elapsedTime, 2.516)
  const cancelledCallback = [...f.pending.values()][0]
  stop()
  assert.equal(f.pending.size, 0)
  f.frame(220000)
  cancelledCallback(220000)
  assert.equal(f.draws.length, 2, 'even an already-delivered callback cannot render after cleanup')
  assert.equal(f.clock.elapsedTime, 2.516)
  assert.equal(f.pending.size, 0)
})

await test('resuming preserves pulse phase and excludes the paused wall time from the next delta', () => {
  const f = frameLoop(8)
  let stop = startSceneFrames(f.state, f.scheduler)
  f.frame(1000)
  stop()
  stop = startSceneFrames(f.state, f.scheduler)
  f.frame(601000)
  assert.equal(f.clock.elapsedTime, 8)
  assert.equal(f.draws.at(-1).delta, 0)
  f.frame(601016)
  assert.ok(Math.abs(f.draws.at(-1).delta - .016) < 1e-12)
  assert.equal(f.clock.elapsedTime, 8.016)
  assert.ok(f.draws.every(draw => draw.globalEffects === false), 'one landing hero does not advance other canvases')
  stop()
})

await test('repeated effect cleanup and activation keeps a single loop and retains elapsed time', () => {
  const f = frameLoop(1.25)
  let elapsed = 1.25
  for (let i = 0; i < 4; i++) {
    // Includes the setup/cleanup/setup sequence used by React StrictMode.
    const discarded = startSceneFrames(f.state, f.scheduler)
    discarded()
    const stop = startSceneFrames(f.state, f.scheduler)
    assert.equal(f.pending.size, 1)
    f.frame(10000 * (i + 1))
    assert.equal(f.clock.elapsedTime, elapsed)
    f.frame(10000 * (i + 1) + 20)
    assert.ok(Math.abs(f.draws.at(-1).delta - .02) < 1e-12)
    elapsed += .02
    assert.ok(Math.abs(f.clock.elapsedTime - elapsed) < 1e-12)
    stop()
    stop()
    assert.equal(f.pending.size, 0)
  }
})

await test('long stalls and nonmonotonic callbacks cannot inject a large or negative simulation step', () => {
  const f = frameLoop()
  const stop = startSceneFrames(f.state, f.scheduler)
  for (const timestamp of [5000, 5016, 9516, 9400, 9433]) f.frame(timestamp)
  const expected = [0, .016, .1, 0, .033]
  f.draws.forEach((draw, i) => assert.ok(Math.abs(draw.delta - expected[i]) < 1e-12))
  assert.ok(Math.abs(f.clock.elapsedTime - .149) < 1e-12)
  stop()
})
