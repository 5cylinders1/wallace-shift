/** Actual GLB geometry checks. These do not validate browser/GPU appearance. */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { Box3, Vector3 } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import ts from 'typescript'

const modules = new Map()
async function sourceModule(url) {
  if (modules.has(url.href)) return modules.get(url.href)
  let javascript = ts.transpileModule(await readFile(url, 'utf8'), { compilerOptions: {
    target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext,
  } }).outputText
  for (const match of [...javascript.matchAll(/from ['"]([^'"]+)['"]/g)]) {
    const specifier = match[1]
    const resolved = specifier.startsWith('.')
      ? await sourceModule(new URL(`${specifier}.ts`, url)) : import.meta.resolve(specifier)
    javascript = javascript.replace(match[0], `from '${resolved}'`)
  }
  const result = `data:text/javascript;base64,${Buffer.from(javascript).toString('base64')}`
  modules.set(url.href, result)
  return result
}
const base = new URL('../src/components/experiments/water-hero/', import.meta.url)
const { buildGlassGeometry } = await import(await sourceModule(new URL('glassGeometry.ts', base)))
const bytes = await readFile(new URL('../public/models/ws_logo.glb', import.meta.url))
const { scene } = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '')
const meshes = []
scene.traverse(mesh => { if (mesh.isMesh) meshes.push(mesh) })
const positions = (geometry, ids) => ids.map(id => new Vector3().fromBufferAttribute(geometry.attributes.position, id))
function triangles(geometry) {
  const result = [], count = geometry.index?.count ?? geometry.attributes.position.count
  for (let i = 0; i < count; i += 3) result.push([0, 1, 2].map(corner => geometry.index?.getX(i + corner) ?? i + corner))
  return result
}
const areaOf = ([a, b, c]) => b.clone().sub(a).cross(c.clone().sub(a)).length() / 2

// Test against the original triangles' projected union, independently of the
// new helper's contour recovery. This includes the full original bevel outline.
function projectedContains(point, sourceTriangles) {
  return sourceTriangles.some(([a, b, c]) => {
    const cross = (u, v, w) => (v.x - u.x) * (w.z - u.z) - (v.z - u.z) * (w.x - u.x)
    const area = cross(a, b, c)
    if (Math.abs(area) < 1e-12) return false
    const u = cross(point, b, c) / area, v = cross(a, point, c) / area, w = 1 - u - v
    return Math.min(u, v, w) >= -2e-5
  })
}

await test('glass preserves the exact source bounds and stays inside its full projected silhouette without source mutation', t => {
  for (const mesh of meshes) {
    const source = mesh.geometry, before = source.toJSON()
    const sourceAttributes = { ...source.attributes }, sourceIndex = source.index
    const glass = buildGlassGeometry(source)
    t.after(() => glass.dispose())
    assert.notEqual(glass, source)
    assert.deepEqual(glass.boundingBox, new Box3().setFromBufferAttribute(source.attributes.position))
    const projected = triangles(source).map(ids => positions(source, ids))
    for (let i = 0; i < glass.attributes.position.count; i++) {
      const point = new Vector3().fromBufferAttribute(glass.attributes.position, i)
      assert.ok(projectedContains(point, projected), `${mesh.name}: rounded shoulder must stay inside the original silhouette`)
    }
    for (const ids of triangles(glass)) {
      const triangle = positions(glass, ids)
      const center = triangle.reduce((sum, point) => sum.add(point), new Vector3()).multiplyScalar(1 / 3)
      assert.ok(projectedContains(center, projected), `${mesh.name}: caps must not bridge the open logo notches`)
    }
    assert.deepEqual(source.toJSON(), before)
    for (const [name, attribute] of Object.entries(sourceAttributes)) assert.equal(source.attributes[name], attribute)
    assert.equal(source.index, sourceIndex)
  }
})

await test('glass has substantially broader rounded shoulders and optically flat local +/-Y faces', t => {
  const capArea = geometry => {
    const box = new Box3().setFromBufferAttribute(geometry.attributes.position)
    let area = 0
    for (const ids of triangles(geometry)) {
      const triangle = positions(geometry, ids)
      if (triangle.every(p => Math.abs(p.y - box.min.y) < 1e-7) || triangle.every(p => Math.abs(p.y - box.max.y) < 1e-7)) area += areaOf(triangle)
    }
    return area
  }
  for (const mesh of meshes) {
    const source = mesh.geometry, glass = buildGlassGeometry(source)
    t.after(() => glass.dispose())
    const sourceY = new Set(Array.from({ length: source.attributes.position.count }, (_, i) => source.attributes.position.getY(i).toFixed(7)))
    const glassY = new Set(Array.from({ length: glass.attributes.position.count }, (_, i) => glass.attributes.position.getY(i).toFixed(7)))
    assert.ok(glassY.size >= 26 && glassY.size > sourceY.size, 'twelve shoulder steps replace the original five')
    const originalDepth = glass.boundingBox.max.y - Math.min(...[...sourceY].map(Number).filter(y => y > 0))
    const glassDepth = glass.boundingBox.max.y - Math.min(...[...glassY].map(Number).filter(y => y > 0))
    assert.ok(glassDepth > originalDepth * 4.5, 'the rounded shoulder extends five times farther through the extrusion')
    const relativeFaceArea = capArea(glass) / capArea(source)
    assert.ok(relativeFaceArea > .60 && relativeFaceArea < .85, 'a substantial visible shoulder surrounds the retained clear face')
    const normal = glass.attributes.normal, position = glass.attributes.position
    for (let i = 0; i < position.count; i++) {
      if (Math.abs(position.getY(i) - glass.boundingBox.max.y) < 1e-7) assert.deepEqual([normal.getX(i), normal.getY(i), normal.getZ(i)], [0, 1, 0])
      if (Math.abs(position.getY(i) - glass.boundingBox.min.y) < 1e-7) assert.deepEqual([normal.getX(i), normal.getY(i), normal.getZ(i)], [0, -1, 0])
    }
    t.diagnostic(`${mesh.name}: ${glassY.size} depth rings, ${(relativeFaceArea * 100).toFixed(1)}% of the original flat-face area remains`)
  }
})

await test('rounded pieces remain closed, consistently wound solids with finite smooth normals', t => {
  for (const mesh of meshes) {
    const glass = buildGlassGeometry(mesh.geometry)
    t.after(() => glass.dispose())
    const edges = new Map(), normal = glass.attributes.normal
    let volume = 0
    for (const ids of triangles(glass)) {
      const [a, b, c] = positions(glass, ids)
      const face = b.clone().sub(a).cross(c.clone().sub(a))
      assert.ok(face.length() > 1e-12, 'no degenerate bevel or cap triangles')
      const average = ids.reduce((sum, id) => sum.add(new Vector3().fromBufferAttribute(normal, id)), new Vector3())
      assert.ok(face.dot(average) > 0, 'smooth corner normals must face the same side as the triangles')
      volume += a.dot(b.clone().cross(c)) / 6
      for (let side = 0; side < 3; side++) {
        const from = ids[side], to = ids[(side + 1) % 3], key = `${Math.min(from, to)},${Math.max(from, to)}`
        const edge = edges.get(key) ?? { count: 0, winding: 0 }
        edge.count++; edge.winding += from < to ? 1 : -1
        edges.set(key, edge)
      }
    }
    assert.ok(volume > 0)
    for (const edge of edges.values()) assert.deepEqual(edge, { count: 2, winding: 0 }, 'every edge joins two oppositely directed triangles')
    for (let i = 0; i < normal.count; i++) {
      const value = new Vector3().fromBufferAttribute(normal, i)
      assert.ok(value.toArray().every(Number.isFinite))
      assert.ok(Math.abs(value.length() - 1) < 1e-6)
    }
  }
})
