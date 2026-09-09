/** Analytic particle checks; these do not validate rendered appearance. */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { transpileModule } from 'typescript'
import { PerspectiveCamera, Vector3 } from 'three'

async function load(name) {
  const source = await readFile(new URL(`../src/components/experiments/water-hero/${name}.ts`, import.meta.url), 'utf8')
  const javascript = transpileModule(source, { compilerOptions: { target: 9, module: 7 } }).outputText
  return import(`data:text/javascript;base64,${Buffer.from(javascript).toString('base64')}`)
}
const { createFlowSeeds, sampleFlowParticle } = await load('underwaterFlowField')
const { sampleDescent } = await load('sceneDirector')
const seeds = createFlowSeeds(2600)
const base = { time: 11, cursorX: 0, cursorY: -2.8, cursorStrength: 0 }
const sample = (seed, state = base) => {
  const out = { x: 0, y: 0, z: 0, alpha: 0, dx: 0, dy: 1, dz: 0 }
  sampleFlowParticle(seed, state, out)
  return out
}

await test('quality tiers preserve deterministic particle identities', () => {
  assert.deepEqual(createFlowSeeds(850), seeds.slice(0, 850))
  assert.deepEqual(createFlowSeeds(1700), seeds.slice(0, 1700))
  assert.deepEqual(createFlowSeeds(2600), seeds)
})

await test('every point remains finite and bounded near its permanent world anchor', () => {
  for (const time of [0, 11, 100, 1000, 10000]) {
    for (const seed of seeds) {
      const out = sample(seed, { ...base, time })
      assert.ok(Object.values(out).every(Number.isFinite))
      assert.ok(out.alpha >= 0 && out.alpha <= 1)
      assert.ok(out.y < 0, 'ambient evolution cannot lift matter into the air')
      assert.ok(Math.abs(out.x) < 5 && out.z > -3 && out.z < 3.3 && out.y > -8.2)
      assert.ok(Math.hypot(out.x - seed.x, out.y - seed.y, out.z - seed.z) < .272,
        'local evolution never expands the field or transports its anchors')
    }
  }
})

await test('logo travel, turn, ending release and scroll reversal never move or clear the world field', () => {
  for (const seed of seeds) {
    const expected = sample(seed)
    for (const progress of [0, .54, .80, 1, .68, 0]) {
      const pose = sampleDescent(progress)
      const state = { ...base, progress, logoY: pose.logoY, yaw: pose.yaw, release: pose.particleDepth }
      assert.deepEqual(sample(seed, state), expected, 'position, opacity and velocity are independent of the emblem')
    }
  }
})

await test('cursor parting is outward, bounded, and completely reversible at every depth', () => {
  let affected = 0
  for (const seed of seeds) {
    const before = sample(seed)
    const state = { ...base, cursorX: before.x + .2, cursorY: before.y + .2, cursorStrength: 1 }
    const after = sample(seed, state)
    const displacement = Math.hypot(after.x - before.x, after.y - before.y)
    assert.ok(displacement < .28)
    assert.equal(after.z, before.z)
    assert.ok(Math.hypot(after.x - state.cursorX, after.y - state.cursorY)
      >= Math.hypot(before.x - state.cursorX, before.y - state.cursorY))
    if (displacement > .01) affected++
    assert.deepEqual(sample(seed, { ...state, cursorStrength: 0 }), before)
    if (after.y >= 0) assert.equal(after.alpha, 0)
  }
  assert.ok(affected > seeds.length * .9)
})

await test('currents are continuous and their streak direction matches local motion', () => {
  for (const time of [0, 11, 1000]) for (const seed of seeds) {
    const before = sample(seed, { ...base, time: time - .0001 })
    const middle = sample(seed, { ...base, time })
    const after = sample(seed, { ...base, time: time + .0001 })
    for (const [axis, velocity] of [['x', 'dx'], ['y', 'dy'], ['z', 'dz']]) {
      assert.ok(Math.abs((after[axis] - before[axis]) / .0002 - middle[velocity]) < 1e-8)
    }
    assert.ok(Math.hypot(middle.dx, middle.dy, middle.dz) > .0001)
    assert.ok(Math.hypot(middle.dx, middle.dy, middle.dz) < .04, 'small evolving currents never become an emitter')
  }
})

await test('fine suspension and a minority of threads occupy real foreground and background depth', () => {
  assert.ok(seeds.filter(seed => seed.size < .010).length > seeds.length * .94)
  assert.ok(seeds.filter(seed => seed.near).length < seeds.length * .04)
  assert.ok(seeds.filter(seed => !seed.filament).length > seeds.length * .65)
  assert.ok(seeds.filter(seed => seed.highlight).length < seeds.length * .05)
  const points = seeds.map(seed => sample(seed))
  assert.ok(points.filter(p => p.z < -1.5).length > points.length * .20)
  assert.ok(points.filter(p => p.z > 1.5).length > points.length * .20)
  const far = seeds.filter(p => !p.near && p.z < -1.5)
  const middle = seeds.filter(p => !p.near && p.z > .5)
  const meanSize = values => values.reduce((sum, p) => sum + p.size, 0) / values.length
  assert.ok(meanSize(far) < meanSize(middle) * .87, 'far matter has a smaller physical sprite')
})

await test('desktop and phone cameras reveal existing matter at every underwater beat and quality tier', () => {
  const projected = new Vector3()
  for (const aspect of [16 / 9, 390 / 844]) {
    for (const progress of [.54, .68, .80, .98]) {
      const pose = sampleDescent(progress, aspect)
      const camera = new PerspectiveCamera(32, aspect, .025, 400)
      camera.position.fromArray(pose.camera)
      camera.lookAt(...pose.target)
      camera.updateMatrixWorld()
      for (const count of [850, 1700, 2600]) {
        const visible = seeds.slice(0, count).map(seed => sample(seed)).filter(p => {
          projected.set(p.x, p.y, p.z).project(camera)
          return Math.abs(projected.x) < 1 && Math.abs(projected.y) < 1 && p.alpha > .05
        })
        assert.ok(visible.length > count * .24, 'the camera continues to encounter the fixed volume')
        assert.ok(visible.filter(p => p.z > 1.5).length > count * .025, 'near suspension remains visible')
        assert.ok(visible.filter(p => p.z < -1.5).length > count * .075, 'far suspension remains visible')
        assert.ok(visible.filter(p => p.y > pose.logoY).length > visible.length * .15)
        assert.ok(visible.filter(p => p.y < pose.logoY).length > visible.length * .15)
      }
    }
  }
})

await test('world depth creates differential camera parallax without changing the field', () => {
  const camera = new PerspectiveCamera(32, 16 / 9, .025, 400)
  camera.position.set(0, -2.8, 6.7)
  camera.lookAt(0, -2.8, 0)
  camera.updateMatrixWorld()
  const points = seeds.map(seed => sample(seed))
  const start = points.map(p => new Vector3(p.x, p.y, p.z).project(camera).x)
  camera.position.x = .2
  camera.lookAt(.2, -2.8, 0)
  camera.updateMatrixWorld()
  const shifts = points.map((p, i) => ({ z: p.z,
    distance: Math.abs(new Vector3(p.x, p.y, p.z).project(camera).x - start[i]) }))
  const mean = values => values.reduce((sum, p) => sum + p.distance, 0) / values.length
  assert.ok(mean(shifts.filter(p => p.z > 1.5)) > mean(shifts.filter(p => p.z < -1.5)) * 1.7)
  assert.deepEqual(seeds.map(seed => sample(seed)), points)
})
