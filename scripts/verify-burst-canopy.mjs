import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { PerspectiveCamera, Vector3 } from 'three'
import ts from 'typescript'
async function sourceModule(relativePath) {
  const source = await readFile(new URL(relativePath, import.meta.url), 'utf8')
  const javascript = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext },
  }).outputText
  return import(`data:text/javascript;base64,${Buffer.from(javascript).toString('base64')}`)
}
const { CANOPY_COUNTS, CANOPY_PILLARS, CANOPY_OVERHANG_START, createCanopySeeds, sampleCanopyLight } = await sourceModule('../src/components/experiments/water-hero/canopyField.ts')
const { sampleDescent } = await sourceModule('../src/components/experiments/water-hero/sceneDirector.ts')
const seeds = createCanopySeeds(CANOPY_COUNTS.high)
await test('quality tiers preserve the world formations with a bounded wisp budget', () => {
  assert.deepEqual(CANOPY_COUNTS, { high: 60000, medium: 36000, low: 18000 })
  for (const count of Object.values(CANOPY_COUNTS)) {
    const field = createCanopySeeds(count)
    assert.deepEqual(field, seeds.slice(0, count))
    assert.ok(field.filter(s => s.soft).length > count * .005)
    assert.ok(field.filter(s => s.soft).length < count * .010)
    assert.ok(field.every(s => !s.soft || s.size <= .32))
    for (let i = 0; i < CANOPY_PILLARS.length; i++) {
      assert.ok(field.filter(s => s.pillar === i).length > count * (i < CANOPY_OVERHANG_START ? .034 : .020),
        'even the low tier retains a dense body in every formation')
    }
  }
})
await test('visible grain has a substantial body with sparse larger accents confined to near water', () => {
  for (const count of Object.values(CANOPY_COUNTS)) {
    const fine = seeds.slice(0, count).filter(s => !s.soft)
    assert.ok(fine.every(s => s.size >= .013 && s.size <= .085))
    assert.ok(fine.filter(s => s.size <= .028).length > fine.length * .78)
    assert.ok(fine.filter(s => s.size > .028 && s.size <= .045).length > fine.length * .12)
    const accents = fine.filter(s => s.size >= .050)
    assert.ok(accents.length > fine.length * .005 && accents.length < fine.length * .012)
    assert.ok(accents.every(s => s.z > 1.2), 'large glints only occupy the near layers')
  }
})
await test('hanging formations have unequal depths, lengths and genuinely tapered tips', () => {
  assert.ok(CANOPY_PILLARS.length >= 20 && CANOPY_PILLARS.length <= 26)
  assert.ok(seeds.filter(s => s.pillar >= 0).length > seeds.length * .90)
  assert.ok(new Set(CANOPY_PILLARS.map(p => p.length)).size >= 15)
  assert.ok(new Set(CANOPY_PILLARS.map(p => Math.floor((p.z + 4.5) / 1.25))).size >= 7,
    'formations are staggered within far, middle and near depth ranges')
  for (let i = 0; i < CANOPY_PILLARS.length; i++) {
    const column = CANOPY_PILLARS[i]
    const field = seeds.filter(s => s.pillar === i)
    const shoulders = [], tips = []
    for (const seed of field) {
      const down = (column.top - seed.y) / column.length
      const centerX = column.x + column.lean * down + Math.sin(down * 5 + i) * .11 * down
      const centerZ = column.z + Math.sin(down * 3.5 + i) * .19 * down
      const distance = Math.hypot(seed.x - centerX, (seed.z - centerZ) / .78)
      if (down < .2) shoulders.push(distance)
      if (down > .85) tips.push(distance)
    }
    const mean = values => values.reduce((a, b) => a + b, 0) / values.length
    assert.ok(tips.length > 40 && shoulders.length > 200)
    assert.ok(mean(tips) < mean(shoulders) * .28, `pillar ${i} tapers to a point`)
  }
  assert.ok(seeds.filter(s => s.z < -1.5).length > seeds.length * .25)
  assert.ok(seeds.filter(s => s.z > 1.0).length > seeds.length * .23)
  assert.ok(Math.max(...seeds.map(s => s.z)) - Math.min(...seeds.map(s => s.z)) > 8)
  assert.ok(Math.max(...seeds.map(s => s.y)) - Math.min(...seeds.map(s => s.y)) > 7)
})
await test('denser formations preserve an open foreground passage instead of becoming a curtain', () => {
  const foreground = seeds.filter(s => s.z > 1 && s.y < -2.7)
  const passage = foreground.filter(s => Math.abs(s.x) < .55)
  assert.equal(passage.filter(s => s.pillar >= 0).length, 0,
    'the central passage is clear of foreground formations below their short hanging tips')
  assert.ok(passage.length < foreground.length * .03, 'only sparse independent matter crosses the passage')
  assert.ok(foreground.filter(s => s.x < -.55).length > foreground.length * .25)
  assert.ok(foreground.filter(s => s.x > .55).length > foreground.length * .25)
  for (const seed of seeds) {
    assert.ok(Object.values(seed).every(Number.isFinite))
    assert.ok(Math.abs(seed.x) < 5.5 && seed.z > -4.8 && seed.z < 4.9 && seed.y > -7.6)
  }
})
await test('the entire fixed volume and its vertical eddies stay submerged before any scroll reveal', async () => {
  assert.ok(Math.max(...seeds.map(s => s.y)) + .045 < -.07,
    'the new overhead shoulders and their vertical motion remain below the water')
  const source = await readFile(new URL('../src/components/experiments/water-hero/UnderwaterBurst.tsx', import.meta.url), 'utf8')
  assert.doesNotMatch(source, /uLogoY|uHeightScale|uSpread/, 'scroll cannot inflate or carry the particle volume')
  const positionUpdate = source.slice(source.indexOf('vec3 p = position;'), source.indexOf('vec4 view ='))
  assert.doesNotMatch(positionUpdate, /uColorOrigin|uProgress/, 'light may follow the logo but geometry must remain world anchored')
  assert.match(source, /if \(worldY >= -\.025\) discard/, 'whole sprites are clipped at the waterline')
})

await test('submerged overhangs reach the top edge during entry without moving the camera or field with scroll', () => {
  const desktopEntry = sampleDescent(.475).camera, desktopEnd = sampleDescent(.54).camera
  for (const aspect of [16/9, 21/9, 390/844]) {
    const entry = sampleDescent(.475, aspect).camera, end = sampleDescent(.54, aspect).camera
    const framing = [entry[0] - desktopEntry[0], entry[2] - desktopEntry[2],
      Math.max(0, end[2] - entry[2] - (desktopEnd[2] - desktopEntry[2])),
      end[0] - entry[0] - (desktopEnd[0] - desktopEntry[0])]
    // Use the smallest budget; these exact seeds persist across all poses.
    const field = createCanopySeeds(CANOPY_COUNTS.low, ...framing)
    assert.deepEqual(field, createCanopySeeds(CANOPY_COUNTS.high, ...framing).slice(0, CANOPY_COUNTS.low))
    const camera = new PerspectiveCamera(32, aspect, .025, 400), point = new Vector3()
    for (const p of (aspect > 1 ? [.475, .49, .54] : [.49, .50, .54])) {
      const pose = sampleDescent(p, aspect)
      camera.position.set(...pose.camera); camera.lookAt(...pose.target); camera.updateMatrixWorld()
      const strips = [0, 0, 0]
      let oldFieldAtTop = 0
      for (const seed of field) {
        point.set(seed.x, seed.y, seed.z).project(camera)
        if (Math.abs(point.x) < 1 && Math.abs(point.z) < 1 && point.y > .85 && point.y < 1.15) {
          strips[Math.min(2, Math.floor((point.x + 1) * 1.5))]++
          if (seed.pillar < CANOPY_OVERHANG_START) oldFieldAtTop++
        }
      }
      const total = strips.reduce((sum, n) => sum + n, 0)
      assert.ok(total >= (aspect > 1 ? 20 : 15), `entry top coverage at ${aspect}/${p}: ${strips}`)
      assert.ok(strips.every(n => n > 0), `separate formations cover left, center and right: ${strips}`)
      assert.ok(total > oldFieldAtTop, 'the overhead layer resolves the former empty upper frame')
    }
    const overhead = field.filter(seed => seed.pillar >= CANOPY_OVERHANG_START)
    assert.ok(overhead.every(seed => seed.y < -.12 && seed.y > -1.1),
      'short tips pass overhead rather than becoming a full-height foreground curtain')
  }
})
await test('colored light lasts through the half turn and settles into a living text backdrop', () => {
  for (const p of [0, .25, .435]) assert.equal(sampleCanopyLight(p), 0)
  for (const p of [.54, .62, .68, .80]) assert.equal(sampleCanopyLight(p), 1)
  assert.ok(sampleCanopyLight(.94) > .30)
  assert.ok(sampleCanopyLight(1) > .15 && sampleCanopyLight(1) < .25)
  const values = [.45, .54, .68, .85, 1].map(sampleCanopyLight)
  for (const p of [1, .85, .68, .54, .45]) sampleCanopyLight(p)
  assert.deepEqual([.45, .54, .68, .85, 1].map(sampleCanopyLight), values)
})
for (const aspect of [16/9, 390/844]) {
  await test(`camera reveals several fixed pillars across distinct depth layers, aspect ${aspect.toFixed(3)}`, () => {
    const camera = new PerspectiveCamera(32, aspect, .025, 400)
    const point = new Vector3()
    const at = p => {
      const pose = sampleDescent(p, aspect)
      camera.position.set(...pose.camera); camera.lookAt(...pose.target); camera.updateMatrixWorld()
    }
    for (const p of [.49, .54, .62, .68, .80]) {
      at(p)
      let visible = 0
      const pillars = new Set(), layers = [0, 0, 0]
      for (const seed of seeds) {
        point.set(seed.x, seed.y, seed.z).project(camera)
        if (Math.abs(point.x) < 1 && Math.abs(point.y) < 1 && Math.abs(point.z) < 1) {
          visible++
          if (seed.pillar >= 0) pillars.add(seed.pillar)
          layers[seed.z > 1 ? 0 : seed.z < -1.5 ? 2 : 1]++
        }
      }
      assert.ok(visible > seeds.length * .15, `${visible}/${seeds.length} at ${p}`)
      assert.ok(pillars.size >= 10, `${pillars.size} formations at ${p}`)
      assert.ok(layers.every(n => n > 200), `visible near/mid/far at ${p}: ${layers}`)
    }
    const travel = z => {
      at(.54)
      const start = point.set(.9, -2.4, z).project(camera).y
      at(.68)
      return Math.abs(point.set(.9, -2.4, z).project(camera).y - start)
    }
    assert.ok(travel(3.5) > travel(-3.5) * (aspect > 1 ? 2.5 : 1.45), 'near formations pass faster than distant formations')
  })
}
await test('physical grain sizes produce distinct far, middle and close projected scales before shader caps', () => {
  const median = values => values.sort((a, b) => a - b)[Math.floor(values.length / 2)]
  for (const [aspect, height] of [[16/9, 1080], [390/844, 844]]) {
    const pose = sampleDescent(.68, aspect)
    const camera = new PerspectiveCamera(32, aspect, .025, 400)
    camera.position.set(...pose.camera); camera.lookAt(...pose.target); camera.updateMatrixWorld()
    const scale = camera.projectionMatrix.elements[5] * height * .5
    const far = [], middle = [], near = [], accents = []
    for (const seed of seeds.filter(s => !s.soft)) {
      const projected = new Vector3(seed.x, seed.y, seed.z).project(camera)
      if (Math.abs(projected.x) > 1 || Math.abs(projected.y) > 1) continue
      const distance = -new Vector3(seed.x, seed.y, seed.z).applyMatrix4(camera.matrixWorldInverse).z
      const diameter = seed.size * scale / distance
      if (seed.size >= .05) accents.push(diameter)
      else if (seed.z < -1.5) far.push(diameter)
      else if (seed.z > 1.2) near.push(diameter)
      else middle.push(diameter)
    }
    assert.ok(median(far) > (aspect > 1 ? 2.5 : 1.1), 'far grain retains visible body')
    assert.ok(median(near) > median(far) * (aspect > 1 ? 1.8 : 1.35), 'depth produces distinct projected scale')
    assert.ok(median(accents) > median(near) * 2.2, 'rare close glints can read separately from the body')
    console.log(`Uncapped CSS diameters at aspect ${aspect.toFixed(3)}: far ${median(far).toFixed(1)}, middle ${median(middle).toFixed(1)}, near ${median(near).toFixed(1)}, accents ${median(accents).toFixed(1)} px`)
  }
})
console.log('CPU world geometry and parallax checks do not verify GPU appearance.')
