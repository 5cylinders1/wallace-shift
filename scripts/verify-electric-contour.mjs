/** Pure authored-geometry regressions. No browser or GPU rendering. */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { BufferGeometry, Float32BufferAttribute } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import ts from 'typescript'

const source = await readFile(new URL('../src/components/experiments/water-hero/electricContour.ts', import.meta.url), 'utf8')
const javascript = ts.transpileModule(source, { compilerOptions: {
  target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext,
} }).outputText.replace("from 'three'", `from '${import.meta.resolve('three')}'`)
const { buildElectricContour, ELECTRIC_CONTOUR_SCALE, ELECTRIC_CONTOUR_MAX_SEGMENTS } = await import(
  `data:text/javascript;base64,${Buffer.from(javascript).toString('base64')}`)
const bytes = await readFile(new URL('../public/models/ws_logo.glb', import.meta.url))
const { scene } = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '')
const meshes = []
scene.traverse(mesh => { if (mesh.isMesh) meshes.push(mesh) })
const endpointKey = (x, z) => `${x.toFixed(7)},${z.toFixed(7)}`
const segmentKey = segment => [endpointKey(segment.x, segment.y), endpointKey(segment.z, segment.w)].sort().join('|')
const contourKeys = segments => segments.map(segmentKey).sort()

await test('actual GLB pieces produce 11 and 4 closed segments without front triangulation diagonals', () => {
  for (const mesh of meshes) {
    const geometry = mesh.geometry, position = geometry.attributes.position, normal = geometry.attributes.normal, index = geometry.index
    const segments = buildElectricContour(geometry)
    assert.equal(segments.length, mesh.name === 'WS_Left' ? 11 : 4)
    const degree = new Map(), edges = new Map()
    for (let i = 0; i < index.count; i += 3) {
      const ids = [index.getX(i), index.getX(i + 1), index.getX(i + 2)]
      if (!ids.every(id => normal.getY(id) > .9999)) continue
      for (let edge = 0; edge < 3; edge++) {
        const a = ids[edge], b = ids[(edge + 1) % 3]
        const key = [endpointKey(position.getX(a) * ELECTRIC_CONTOUR_SCALE, position.getZ(a) * ELECTRIC_CONTOUR_SCALE),
          endpointKey(position.getX(b) * ELECTRIC_CONTOUR_SCALE, position.getZ(b) * ELECTRIC_CONTOUR_SCALE)].sort().join('|')
        edges.set(key, (edges.get(key) ?? 0) + 1)
      }
    }
    assert.ok([...edges.values()].some(count => count === 2), 'the front really contains internal diagonals to exclude')
    for (const segment of segments) {
      assert.ok(segment.toArray().every(Number.isFinite))
      assert.equal(edges.get(segmentKey(segment)), 1, 'returned segments must be true boundary edges')
      for (const key of [endpointKey(segment.x, segment.y), endpointKey(segment.z, segment.w)]) degree.set(key, (degree.get(key) ?? 0) + 1)
    }
    assert.ok([...degree.values()].every(count => count === 2), 'all perimeter endpoints are joined')
    assert.equal(new Set(contourKeys(segments)).size, segments.length)
  }
})

await test('building the contour does not modify any source attribute, index, or geometry bounds', () => {
  for (const mesh of meshes) {
    const geometry = mesh.geometry
    const attributes = Object.entries(geometry.attributes).map(([name, attribute]) => [name, attribute, attribute.array.slice()])
    const index = geometry.index, indices = index.array.slice(), box = geometry.boundingBox, sphere = geometry.boundingSphere
    buildElectricContour(geometry)
    for (const [name, attribute, data] of attributes) {
      assert.equal(geometry.getAttribute(name), attribute)
      assert.deepEqual(attribute.array, data)
    }
    assert.equal(geometry.index, index)
    assert.deepEqual(index.array, indices)
    assert.equal(geometry.boundingBox, box)
    assert.equal(geometry.boundingSphere, sphere)
  }
})

await test('duplicated non-indexed front corners cancel the same internal edges', () => {
  for (const mesh of meshes) {
    const nonIndexed = mesh.geometry.toNonIndexed()
    assert.deepEqual(contourKeys(buildElectricContour(nonIndexed)), contourKeys(buildElectricContour(mesh.geometry)))
    nonIndexed.dispose()
  }
})

await test('tiny duplicated-corner rounding differences keep the front perimeter closed', () => {
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute([
    0, 0, 0, 0, 0, .1, .1, 0, .1,
    .00000001, 0, -.00000001, .10000001, 0, .10000001, .1, 0, 0,
  ], 3))
  geometry.setAttribute('normal', new Float32BufferAttribute(Array.from({ length: 6 }, () => [0, 1, 0]).flat(), 3))
  const segments = buildElectricContour(geometry), degree = new Map()
  assert.equal(segments.length, 4, 'nearly identical diagonal endpoints must weld')
  for (const segment of segments) {
    for (const key of [endpointKey(segment.x, segment.y), endpointKey(segment.z, segment.w)]) degree.set(key, (degree.get(key) ?? 0) + 1)
  }
  assert.ok([...degree.values()].every(count => count === 2))
  geometry.dispose()
})

await test('a contour exceeding the uniform budget fails with the actual count and supported limit', () => {
  const geometry = new BufferGeometry(), sides = ELECTRIC_CONTOUR_MAX_SEGMENTS + 1
  const positions = [0, 0, 0], indices = []
  for (let i = 0; i < sides; i++) {
    const angle = i / sides * Math.PI * 2
    positions.push(Math.cos(angle) * .1, 0, -Math.sin(angle) * .1)
    indices.push(0, i + 1, (i + 1) % sides + 1)
  }
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('normal', new Float32BufferAttribute(Array.from({ length: sides + 1 }, () => [0, 1, 0]).flat(), 3))
  geometry.setIndex(indices)
  assert.throws(() => buildElectricContour(geometry), /17 boundary segments; the shader supports at most 16/)
  geometry.dispose()
})
