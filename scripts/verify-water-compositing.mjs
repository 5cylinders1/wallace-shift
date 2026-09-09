/** Layer routing and blend regression for the hard underwater color boundary.
 * Does not exercise WebGL rasterization or prove the final visual appearance. */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { Layers } from 'three'
import ts from 'typescript'

async function sourceModule(path, replacements = []) {
  let source = await readFile(new URL(path, import.meta.url), 'utf8')
  for (const [from, to] of replacements) source = source.replace(from, to)
  const code = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext },
  }).outputText
  return `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
}
const fogUrl = await sourceModule('../src/components/experiments/water-hero/surfaceFogField.ts')
const layersUrl = await sourceModule('../src/components/experiments/water-hero/waterRenderLayers.ts', [["from './surfaceFogField'", `from '${fogUrl}'`]])
const { SUBMERGED_PARTICLE_LAYER, refractionLayerMask } = await import(layersUrl)
const { sampleDescent } = await import(await sourceModule('../src/components/experiments/water-hero/sceneDirector.ts'))
const particle = new Layers(); particle.set(SUBMERGED_PARTICLE_LAYER)
const reflection = new Layers(); reflection.set(1)
const mist = new Layers(); mist.set(2)
const beauty = new Layers(); beauty.enable(2); beauty.enable(SUBMERGED_PARTICLE_LAYER)
const refraction = new Layers()

await test('particles remain visible through the water from above and are never mirrored', () => {
  for (const cameraY of [.0001, .1, 2]) {
    refraction.mask = refractionLayerMask(beauty.mask, cameraY, 0)
    assert.ok(refraction.test(particle), 'above-water refraction needs the submerged matter')
    assert.ok(beauty.test(particle), 'normal depth testing handles water occlusion')
    assert.ok(!refraction.test(mist), 'air mist cannot be applied twice')
  }
  assert.ok(!reflection.test(particle))
})
await test('the crossing and underside fade never bake particles into their own background', () => {
  const mask = beauty.mask
  for (const aspect of [.25, 390/844, 16/9, 2.4]) {
    for (let i = 4300; i <= 5700; i++) {
      const pose = sampleDescent(i / 10000, aspect)
      refraction.mask = refractionLayerMask(mask, pose.camera[1], 0)
      assert.equal(refraction.test(particle), pose.camera[1] >= 0)
      assert.ok(beauty.test(particle), 'final pass always retains underwater particles')
      if (pose.camera[1] < 0) {
        // Any refraction contribution here previously added the particle a
        // second time on only the water-covered side of the image.
        for (const undersideFade of [0, .25, .64, .92, 1]) {
          const contribution = Number(beauty.test(particle))
            + Number(refraction.test(particle)) * (1 - undersideFade)
          assert.equal(contribution, 1)
        }
      }
    }
  }
  assert.equal(beauty.mask, mask, 'routing does not mutate the final camera')
})
await test('routing preserves unrelated layers and respects a displaced water level', () => {
  for (const mask of [1, beauty.mask, beauty.mask | (1 << 7)]) {
    const filtered = refractionLayerMask(mask, 1.9, 2)
    assert.equal(filtered & (1 << 7), mask & (1 << 7))
    assert.equal(filtered & 1, mask & 1)
    assert.equal(filtered & particle.mask, 0)
    assert.equal(refractionLayerMask(mask, 2.1, 2) & particle.mask, mask & particle.mask)
  }
})
await test('every submerged particle system and the renderer use the same routing contract', async () => {
  for (const file of ['UnderwaterBurst', 'UnderwaterFlow']) {
    const source = await readFile(new URL(`../src/components/experiments/water-hero/${file}.tsx`, import.meta.url), 'utf8')
    assert.match(source, /layers-mask=\{1 << SUBMERGED_PARTICLE_LAYER\}/, `${file} must use the isolated layer`)
  }
  const source = await readFile(new URL('../src/components/experiments/water-hero/WaterSurface.tsx', import.meta.url), 'utf8')
  assert.match(source, /camera\.layers\.mask = refractionLayerMask\(beautyLayers, camera\.position\.y, WATER_LEVEL\)/)
  assert.match(source, /finally\s*\{\s*camera\.layers\.mask = beautyLayers/)
  const scene = await readFile(new URL('../src/components/experiments/water-hero/WaterScene.tsx', import.meta.url), 'utf8')
  assert.match(scene, /camera\.layers\.enable\(SUBMERGED_PARTICLE_LAYER\)/)
  assert.match(scene, /if \(!enabled\) camera\.layers\.disable\(SUBMERGED_PARTICLE_LAYER\)/)
})
