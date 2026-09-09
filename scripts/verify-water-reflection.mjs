/** Pure projection regression. No browser/GL context or rendered-optics claim. */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { HalfFloatType, LinearFilter, LinearMipmapLinearFilter, PerspectiveCamera, Vector3 } from 'three'
import { transpileModule } from 'typescript'

const text = (await readFile(new URL('../src/components/experiments/water-hero/waterReflectionCamera.ts', import.meta.url), 'utf8'))
  .replace("from 'three'", `from '${import.meta.resolve('three')}'`)
const javascript = transpileModule(text, { compilerOptions: { target: 9, module: 7 } }).outputText
const { createReflectionScratch, updateWaterReflectionCamera } = await import(`data:text/javascript;base64,${Buffer.from(javascript).toString('base64')}`)
const targetText = (await readFile(new URL('../src/components/experiments/water-hero/waterReflectionTarget.ts', import.meta.url), 'utf8'))
  .replace("from 'three'", `from '${import.meta.resolve('three')}'`)
const targetJs = transpileModule(targetText, { compilerOptions: { target: 9, module: 7 } }).outputText
const { createWaterReflectionTarget } = await import(`data:text/javascript;base64,${Buffer.from(targetJs).toString('base64')}`)
const close = (actual, expected, message) => assert.ok(actual.distanceTo(expected) < 1e-10, message)
const mirror = (point, waterY) => new Vector3(point.x, 2 * waterY - point.y, point.z)
const eyeAndGaze = [
  [[0, .10, 7.9], [0, .56, 0]],
  [[.12, .14, 5.7], [0, .28, 0]],
  [[.24, .10, 4.3], [0, -.62, 0]],
]
const makeCamera = (eye, target, aspect = 16 / 9) => {
  const camera = new PerspectiveCamera(32, aspect, .025, 400)
  camera.position.set(...eye)
  camera.lookAt(new Vector3(...target))
  camera.updateMatrixWorld()
  return camera
}

await test('reflection eye, gaze and up are mirrored across the actual water level', () => {
  for (const [eye, target] of eyeAndGaze) {
    for (const waterY of [0, -.7, 1.2]) {
      const source = makeCamera(eye, target)
      const reflected = new PerspectiveCamera()
      const scratch = createReflectionScratch()
      updateWaterReflectionCamera(source, reflected, waterY, scratch)
      const worldEye = source.getWorldPosition(new Vector3())
      const gaze = source.getWorldDirection(new Vector3()).add(worldEye)
      const up = new Vector3().setFromMatrixColumn(source.matrixWorld, 1).normalize()
      close(reflected.position, mirror(worldEye, waterY), 'eye must be below the plane whenever source is above')
      close(scratch.target, mirror(gaze, waterY), 'gaze mirrors without an extra negation')
      close(reflected.up, new Vector3(up.x, -up.y, up.z), 'up mirrors as a direction')
      close(reflected.getWorldDirection(new Vector3()), scratch.target.clone().sub(reflected.position).normalize(), 'camera looks toward the mirrored gaze')
    }
  }
})

await test('above-water front faces stay visible to the reflection camera in the opening composition', () => {
  const source = makeCamera([0, .10, 7.9], [0, .56, 0])
  const reflected = new PerspectiveCamera()
  updateWaterReflectionCamera(source, reflected, 0, createReflectionScratch())
  assert.ok(reflected.position.y < 0)
  assert.ok(reflected.position.z > 0, 'reflection must see the silver front, not the back of the mark')
  for (const x of [-1, 0, 1]) {
    for (const y of [.01, .56, 1.11]) {
      const world = new Vector3(x, y, 0)
      const view = world.clone().applyMatrix4(reflected.matrixWorldInverse)
      const ndc = world.clone().project(reflected)
      assert.ok(view.z < -reflected.near, 'above-water geometry is in front of the mirrored eye')
      assert.ok(Math.abs(ndc.x) < 1 && Math.abs(ndc.y) < 1, 'opening reflection fits the render target')
    }
  }
})

await test('reflected projections correspond to virtual geometry mirrored below the water', () => {
  for (const [eye, target] of eyeAndGaze) {
    const source = makeCamera(eye, target)
    const reflected = new PerspectiveCamera()
    updateWaterReflectionCamera(source, reflected, 0, createReflectionScratch())
    for (const point of [new Vector3(-.7, .2, 0), new Vector3(.6, .9, -.15), new Vector3(0, 0, 2)]) {
      const actual = point.clone().project(reflected)
      const virtual = mirror(point, 0).project(source)
      // A camera must keep a right-handed basis, so mirroring its up/gaze
      // reverses texture X. The projector applies the same reversal to water.
      close(actual, new Vector3(-virtual.x, virtual.y, virtual.z), 'reflection represents the same virtual image')
    }
  }
})

await test('reflection preserves source projection including portrait and camera view offsets', () => {
  for (const aspect of [.5625, .75, 16 / 9, 2.4]) {
    const source = makeCamera([.2, .18, 8], [0, .56, 0], aspect)
    source.setViewOffset(1600, 900, 100, 20, 1400, 850)
    const reflected = new PerspectiveCamera()
    updateWaterReflectionCamera(source, reflected, 0, createReflectionScratch())
    assert.deepEqual(reflected.projectionMatrix.elements, source.projectionMatrix.elements)
    assert.deepEqual(reflected.projectionMatrixInverse.elements, source.projectionMatrixInverse.elements)
    assert.equal(reflected.near, source.near)
    assert.equal(reflected.far, source.far)
  }
})

await test('reflection targets preserve HDR detail and provide filtered mip levels at every tier', () => {
  for (const [width, height] of [[1024, 576], [640, 360], [384, 683]]) {
    const target = createWaterReflectionTarget(width, height)
    assert.equal(target.texture.type, HalfFloatType)
    assert.equal(target.texture.generateMipmaps, true)
    assert.equal(target.texture.minFilter, LinearMipmapLinearFilter)
    assert.equal(target.texture.magFilter, LinearFilter)
    assert.equal(target.depthBuffer, true)
    assert.equal(target.width, width)
    assert.equal(target.height, height)
    target.dispose()
  }
})
