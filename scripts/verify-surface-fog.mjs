/** Scene-depth/layout and visibility checks, without a browser or GL context. */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { Box3, PerspectiveCamera, Ray, Vector3 } from 'three'
import { transpileModule } from 'typescript'

async function sourceModule(path) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8')
  const javascript = transpileModule(source, { compilerOptions: { target: 9, module: 7 } }).outputText
  return import(`data:text/javascript;base64,${Buffer.from(javascript).toString('base64')}`)
}
const { SURFACE_FOG_BANKS, sampleSurfaceFog } = await sourceModule(
  '../src/components/experiments/water-hero/surfaceFogField.ts',
)
const { layoutForegroundFog, FOREGROUND_FOG_STEPS } = await sourceModule(
  '../src/components/experiments/water-hero/foregroundFogField.ts',
)
const { sampleDescent } = await sourceModule('../src/components/experiments/water-hero/sceneDirector.ts')

await test('fog occupies distinct world depths with a clear near opening around the mark', () => {
  assert.ok(SURFACE_FOG_BANKS.some(bank => bank.z < -20), 'far bank')
  assert.ok(SURFACE_FOG_BANKS.some(bank => bank.z > -10 && bank.z < 0), 'middle bank')
  assert.ok(SURFACE_FOG_BANKS.some(bank => bank.z > 0), 'near bank')
  SURFACE_FOG_BANKS.forEach((bank, index) => {
    assert.ok(bank.height > 0 && bank.height < 1.2, 'banks remain thin above the water')
    assert.ok(bank.opacity > 0 && bank.opacity <= .3, 'each bank remains translucent')
    if (index) assert.ok(bank.z > SURFACE_FOG_BANKS[index - 1].z, 'far-to-near instance order')
    if (bank.z > 0) assert.ok(Math.abs(bank.x) - bank.width * .5 > 1.5, 'near banks leave the logo centre clear')
  })
})

await test('foreground volume stays shallow and retains its opening-camera distance across viewports', () => {
  const baseline = layoutForegroundFog(16 / 9, sampleDescent(0, 16 / 9).camera[2])
  const initialNearGap = 7.9 - baseline.max[2]
  const initialFarGap = 7.9 - baseline.min[2]
  for (const aspect of [.25, 390 / 844, 768 / 1024, 16 / 9, 21 / 9, 3]) {
    const pose = sampleDescent(0, aspect)
    const layout = layoutForegroundFog(aspect, pose.camera[2])
    assert.ok([...layout.min, ...layout.max, layout.widthScale, layout.depthOffset].every(Number.isFinite))
    assert.ok(layout.widthScale >= .25 && layout.widthScale <= 1.4, 'horizontal scaling remains bounded')
    for (let axis = 0; axis < 3; axis++) assert.ok(layout.max[axis] > layout.min[axis], 'nonempty volume')
    assert.ok(layout.min[1] > 0 && layout.min[1] < .02, 'volume starts above the waterline')
    assert.ok(layout.max[1] <= 1 && layout.max[1] > .25, 'mist stays shallow, with room for rising curls')
    assert.ok(layout.max[2] - layout.min[2] < 8, 'finite integration distance')
    assert.ok(layout.min[0] < 0 && layout.max[0] > 0, 'centre rays are allowed to pass through mist')
    assert.ok(Math.abs(pose.camera[2] - layout.max[2] - initialNearGap) < 1e-10)
    assert.ok(Math.abs(pose.camera[2] - layout.min[2] - initialFarGap) < 1e-10)
    assert.ok(pose.camera[2] - layout.max[2] > .025, 'opening lens remains outside the volume')
    assert.equal(layout.min[1], baseline.min[1], 'portrait keeps the same physical floor')
    assert.equal(layout.max[1], baseline.max[1], 'portrait keeps the same physical height')
    const expected = structuredClone(layout)
    for (const progress of [.35, .54, .92, 0]) {
      sampleDescent(progress, aspect)
      assert.deepEqual(layoutForegroundFog(aspect, pose.camera[2]), expected,
        'fixed opening placement reconstructs after travel and reverse')
    }
  }
})

await test('foreground and centre viewport rays reach the volume before reaching water', () => {
  for (const aspect of [390 / 844, 768 / 1024, 16 / 9, 21 / 9]) {
    const pose = sampleDescent(0, aspect)
    const camera = new PerspectiveCamera(32, aspect, .025, 400)
    camera.position.set(...pose.camera)
    camera.lookAt(...pose.target)
    camera.updateMatrixWorld()
    const layout = layoutForegroundFog(aspect, pose.camera[2])
    const box = new Box3(new Vector3(...layout.min), new Vector3(...layout.max))
    for (const [x, y] of [[-.7, -.6], [0, -.6], [.7, -.6], [0, 0]]) {
      const direction = new Vector3(x, y, .5).unproject(camera).sub(camera.position).normalize()
      const ray = new Ray(camera.position, direction)
      const entry = ray.intersectBox(box, new Vector3())
      assert.ok(entry, `visible volume at viewport ${x}/${y}, aspect ${aspect}`)
      const distance = entry.distanceTo(camera.position)
      assert.ok(distance > camera.near && distance < camera.far, 'entry remains between clipping planes')
      if (direction.y < 0) {
        const waterDistance = -camera.position.y / direction.y
        assert.ok(distance < waterDistance, 'foreground air is encountered before the water surface')
      }
    }
  }
})

await test('quality tiers use fixed bounded ray-march budgets', () => {
  assert.deepEqual(Object.keys(FOREGROUND_FOG_STEPS).sort(), ['high', 'low', 'medium'])
  for (const steps of Object.values(FOREGROUND_FOG_STEPS)) {
    assert.ok(Number.isInteger(steps) && steps >= 8 && steps <= 20, 'bounded compile-time sample count')
  }
  assert.ok(FOREGROUND_FOG_STEPS.low < FOREGROUND_FOG_STEPS.medium)
  assert.ok(FOREGROUND_FOG_STEPS.medium < FOREGROUND_FOG_STEPS.high)
})

await test('near mist exhibits stronger parallax than distant atmosphere', () => {
  const camera = new PerspectiveCamera(32, 16 / 9, .025, 400)
  camera.position.set(0, .10, 7.9)
  camera.lookAt(0, .56, 0)
  camera.updateMatrixWorld()
  const displacement = bank => {
    const point = new Vector3(bank.x, bank.height * .5 + .018, bank.z)
    camera.position.x = 0
    camera.updateMatrixWorld()
    const start = point.clone().project(camera).x
    camera.position.x = .25
    camera.updateMatrixWorld()
    return Math.abs(point.clone().project(camera).x - start)
  }
  const far = displacement(SURFACE_FOG_BANKS[0])
  const near = displacement(SURFACE_FOG_BANKS.at(-1))
  assert.ok(near > far * 4, 'world-space depth produces substantial near/far separation')
})

await test('air fog vanishes before the lens crosses the water and extinguishes at black', () => {
  let previous = 1
  for (let i = 0; i <= 1000; i++) {
    const value = sampleSurfaceFog(i / 1000, 1, 50, false)
    assert.ok(value.gain >= 0 && value.gain <= previous)
    if (i / 1000 >= .32) assert.equal(value.visible, false)
    previous = value.gain
  }
  for (const underwater of [0, .2, .5, 1]) {
    const black = sampleSurfaceFog(underwater, 0, 50, false)
    assert.equal(black.gain, 0)
    assert.equal(black.visible, false)
  }
})

await test('reduced motion freezes bank drift and reversing restores the original atmosphere', () => {
  const still = sampleSurfaceFog(0, 1, 0, true)
  for (const time of [1, 20, 2000]) assert.deepEqual(sampleSurfaceFog(0, 1, time, true), still)
  const expected = sampleSurfaceFog(.14, .8, 20, false)
  sampleSurfaceFog(1, 0, 200, false)
  assert.deepEqual(sampleSurfaceFog(.14, .8, 20, false), expected)
})
