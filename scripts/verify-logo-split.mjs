/** Actual GLB + Three projection checks for the half-turn split. No GPU render. */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { Box3, Group, PerspectiveCamera, Vector3 } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import ts from 'typescript'

const sourceModules = new Map()
async function sourceModuleUrl(url) {
  if (sourceModules.has(url.href)) return sourceModules.get(url.href)
  const source = await readFile(url, 'utf8')
  let javascript = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext },
  }).outputText
  for (const match of [...javascript.matchAll(/from ['"]([^'"]+)['"]/g)]) {
    const specifier = match[1]
    const resolved = specifier.startsWith('.')
      ? await sourceModuleUrl(new URL(`${specifier}.ts`, url)) : import.meta.resolve(specifier)
    javascript = javascript.replace(match[0], `from '${resolved}'`)
  }
  const result = `data:text/javascript;base64,${Buffer.from(javascript).toString('base64')}`
  sourceModules.set(url.href, result)
  return result
}
async function sourceModule(path) {
  return import(await sourceModuleUrl(new URL(path, import.meta.url)))
}
const { sampleDescent, SPLIT_START, SPLIT_END } = await sourceModule('../src/components/experiments/water-hero/sceneDirector.ts')
const { applyLogoSplit, createLogoSplitScratch, restoreLogoHalves } = await sourceModule('../src/components/experiments/water-hero/logoSplit.ts')
const { buildGlassGeometry } = await sourceModule('../src/components/experiments/water-hero/glassGeometry.ts')
const { NODE_NAMES, WS_LOGO_URL, LOGO_TARGET_WIDTH } = await sourceModule('../src/components/experiments/water-hero/waterHeroConfig.ts')
const bytes = await readFile(new URL(`../public${WS_LOGO_URL}`, import.meta.url))
const { scene } = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '')
const proxy = scene.clone(true)
const capture = object => ({ position: object.position.clone(), quaternion: object.quaternion.clone(), scale: object.scale.clone() })
const left = scene.getObjectByName(NODE_NAMES.left), right = scene.getObjectByName(NODE_NAMES.right)
const nodes = { left, right, proxyLeft: proxy.getObjectByName(NODE_NAMES.left), proxyRight: proxy.getObjectByName(NODE_NAMES.right),
  baseline: { left: capture(left), right: capture(right) } }
const bounds = new Box3().setFromObject(scene)
const scale = LOGO_TARGET_WIDTH / bounds.getSize(new Vector3()).x
const center = bounds.getCenter(new Vector3()).applyAxisAngle(new Vector3(1, 0, 0), Math.PI / 2).multiplyScalar(-scale)
const presentation = new Group()
presentation.rotation.x = Math.PI / 2
presentation.scale.setScalar(scale)
presentation.position.copy(center)
presentation.add(scene, proxy)
const rig = new Group()
rig.add(presentation)
const scratch = createLogoSplitScratch()

function projectPart(part, camera) {
  const box = new Box3().setFromObject(part)
  const xs = []
  for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
    xs.push(new Vector3(x, y, z).project(camera).x)
  }
  return { min: Math.min(...xs), max: Math.max(...xs), center: (Math.min(...xs) + Math.max(...xs)) / 2 }
}

function projectedTriangles(part, camera) {
  const triangles = []
  part.traverse(mesh => {
    if (!mesh.isMesh) return
    const positions = mesh.geometry.getAttribute('position'), index = mesh.geometry.index
    const vertices = Array.from({ length: positions.count }, (_, i) =>
      new Vector3().fromBufferAttribute(positions, i).applyMatrix4(mesh.matrixWorld).project(camera))
    for (let i = 0; i < (index?.count ?? positions.count); i += 3) {
      triangles.push([0, 1, 2].map(j => vertices[index ? index.getX(i + j) : i + j]))
    }
  })
  return triangles
}

// An independent scan through projected triangle faces, with no use of the
// implementation's edge cache or contour samples.
function triangleSpan(triangles, y) {
  let min = Infinity, max = -Infinity
  for (const triangle of triangles) for (let side = 0; side < 3; side++) {
    const a = triangle[side], b = triangle[(side + 1) % 3]
    if (y < Math.min(a.y, b.y) || y > Math.max(a.y, b.y)) continue
    if (Math.abs(a.y - b.y) < 1e-10) { min = Math.min(min, a.x, b.x); max = Math.max(max, a.x, b.x) }
    else {
      const x = a.x + (b.x - a.x) * (y - a.y) / (b.y - a.y)
      min = Math.min(min, x); max = Math.max(max, x)
    }
  }
  return { min, max }
}

function contourAt(contour, y, side) {
  let row = 1
  while (row < contour.rows.length - 1 && contour.rows[row] < y) row++
  const t = (y - contour.rows[row - 1]) / (contour.rows[row] - contour.rows[row - 1])
  return contour[side][row - 1] + (contour[side][row] - contour[side][row - 1]) * t
}

for (const [label, aspect] of [['narrow', .25], ['phone', 390 / 844], ['tablet', .75], ['desktop', 16 / 9], ['ultrawide', 21 / 9]]) {
  await test(`actual halves leave their visible sides completely: ${label}`, () => {
    const camera = new PerspectiveCamera(32, aspect, .025, 400)
    const pose = sampleDescent(SPLIT_END, aspect)
    camera.position.set(...pose.camera)
    camera.lookAt(...pose.target)
    camera.updateMatrixWorld()
    rig.position.y = pose.logoY
    rig.rotation.set(pose.pitch, pose.yaw, 0, 'YXZ')
    applyLogoSplit(nodes, rig, camera, 0, scratch)
    const initial = [projectPart(left, camera), projectPart(right, camera)]
    const materialOrigins = [left, right].map(part => rig.worldToLocal(part.getWorldPosition(new Vector3())))
    assert.ok(initial[0].center > 0 && initial[1].center < 0, 'half turn reverses authored visible sides')
    let previous = initial
    for (let step = 1; step <= 100; step++) {
      applyLogoSplit(nodes, rig, camera, step / 100, scratch)
      const current = [projectPart(left, camera), projectPart(right, camera)]
      assert.ok(current[0].min > previous[0].min, 'visible right moves right')
      assert.ok(current[1].max < previous[1].max, 'visible left moves left')
      assert.ok(scratch.reveal.rows.every(Number.isFinite) && scratch.reveal.left.every(Number.isFinite)
        && scratch.reveal.right.every(Number.isFinite), 'projected contours stay finite')
      previous = current
    }
    assert.ok(previous[0].min >= 1.09, 'right trailing edge clears the viewport')
    assert.ok(previous[1].max <= -1.09, 'left trailing edge clears the viewport')
    assert.equal(scratch.reveal.complete, true, 'the fully cleared viewport reveals all text')
    for (const [part, materialOffset, origin] of [[left, scratch.leftOffset, materialOrigins[0]], [right, scratch.rightOffset, materialOrigins[1]]]) {
      const textureOrigin = rig.worldToLocal(part.getWorldPosition(new Vector3())).sub(materialOffset)
      assert.ok(textureOrigin.distanceTo(origin) < 1e-10, 'surface texture travels with its original half')
    }
    assert.deepEqual(nodes.proxyLeft.position, nodes.left.position)
    assert.deepEqual(nodes.proxyRight.position, nodes.right.position)
    const finalPositions = [left.position.clone(), right.position.clone()]
    applyLogoSplit(nodes, rig, camera, .2, scratch)
    applyLogoSplit(nodes, rig, camera, 1, scratch)
    assert.deepEqual([left.position, right.position], finalPositions, 'jump reconstructs the exact exit')
    applyLogoSplit(nodes, rig, camera, 0, scratch)
    assert.deepEqual(left.position, nodes.baseline.left.position)
    assert.deepEqual(right.position, nodes.baseline.right.position)
    assert.equal(scratch.leftOffset.length(), 0, 'material coordinates restore with the piece')
  })
}

await test('the reveal follows actual triangle silhouettes while keeping type clear of both metal halves', () => {
  let compared = 0
  for (const aspect of [.25, 390 / 844, 16 / 9, 21 / 9]) {
    const camera = new PerspectiveCamera(32, aspect, .025, 400)
    const pose = sampleDescent(SPLIT_END, aspect)
    camera.position.set(...pose.camera)
    camera.lookAt(...pose.target)
    camera.updateMatrixWorld()
    rig.position.y = pose.logoY
    rig.rotation.set(pose.pitch, pose.yaw, 0, 'YXZ')
    for (const amount of [.001, .025, .08, .25, .5, .85]) {
      applyLogoSplit(nodes, rig, camera, amount, scratch, 1920)
      const visibleLeft = projectedTriangles(right, camera), visibleRight = projectedTriangles(left, camera)
      const contour = scratch.reveal
      assert.ok(contour.rows.every((y, i) => i === 0 || y > contour.rows[i - 1]), 'polygon traces have strict ordered heights')
      let firstLeft = null, varied = false
      for (let row = 1; row < contour.rows.length; row++) {
        for (const fraction of [.1, .5, .9]) {
          const y = contour.rows[row - 1] + (contour.rows[row] - contour.rows[row - 1]) * fraction
          const a = triangleSpan(visibleLeft, y), b = triangleSpan(visibleRight, y)
          if (!Number.isFinite(a.max) || !Number.isFinite(b.min)) continue
          const leftEdge = contourAt(contour, y, 'left'), rightEdge = contourAt(contour, y, 'right')
          if (rightEdge - leftEdge > 1e-8) {
            assert.ok(leftEdge >= a.max + 2 / 1920 - 1e-6, `left contour covers actual metal at ${aspect}/${amount}/${y}`)
            assert.ok(rightEdge <= b.min - 2 / 1920 + 1e-6, `right contour covers actual metal at ${aspect}/${amount}/${y}`)
            compared++
          }
          if (firstLeft === null) firstLeft = leftEdge
          if (Math.abs(leftEdge - firstLeft) > .025) varied = true
        }
      }
      assert.ok(varied, 'actual angled inner contour is retained instead of its vertical bounding box')
    }
  }
  assert.ok(compared > 1000, 'verified open contour intervals against independent triangle slices')
})

await test('contours reconstruct on reverse, update on resize, and fully clear before the final frame', () => {
  for (const aspect of [.25, 390 / 844, 16 / 9, 21 / 9]) {
    const camera = new PerspectiveCamera(32, aspect, .025, 400)
    const pose = sampleDescent(SPLIT_END, aspect)
    camera.position.set(...pose.camera); camera.lookAt(...pose.target); camera.updateMatrixWorld()
    rig.position.y = pose.logoY; rig.rotation.set(pose.pitch, pose.yaw, 0, 'YXZ')
    applyLogoSplit(nodes, rig, camera, .4, scratch, 1920)
    const saved = { rows: [...scratch.reveal.rows], left: [...scratch.reveal.left], right: [...scratch.reveal.right] }
    const version = scratch.reveal.version
    applyLogoSplit(nodes, rig, camera, .4, scratch, 1920)
    assert.equal(scratch.reveal.version, version, 'held pose does not rebuild contours')
    applyLogoSplit(nodes, rig, camera, .4, scratch, 390)
    assert.ok(scratch.reveal.version > version, 'CSS pixel clearance responds to viewport resizing')
    applyLogoSplit(nodes, rig, camera, .7, scratch, 390)
    applyLogoSplit(nodes, rig, camera, .4, scratch, 1920)
    for (const key of ['rows', 'left', 'right']) assert.deepEqual(scratch.reveal[key], saved[key], 'reverse restores exact contour')
    applyLogoSplit(nodes, rig, camera, .999, scratch, 390)
    assert.equal(scratch.reveal.complete, false)
    assert.ok(scratch.reveal.left.every(x => x < -1) && scratch.reveal.right.every(x => x > 1),
      'all viewport rows, including extrapolated ones, clear before clip removal')
    applyLogoSplit(nodes, rig, camera, 0, scratch)
    assert.equal(scratch.reveal.open, false)
    assert.equal(scratch.reveal.rows.length, 0)
  }
})

await test('switching actual GLB geometry at a held split rebuilds the contour and restores the original LED mask', () => {
  const parts = [left, right]
  const original = parts.map(part => part.geometry)
  const glass = original.map(buildGlassGeometry)
  assert.ok(glass.every((geometry, i) => geometry.getAttribute('position').count > original[i].getAttribute('position').count),
    'the rounded glass has more vertices than the original cached projection buffers')
  const snapshot = reveal => ({ rows: [...reveal.rows], left: [...reveal.left], right: [...reveal.right] })
  let compared = 0
  try {
    for (const aspect of [390 / 844, 16 / 9]) {
      const camera = new PerspectiveCamera(32, aspect, .025, 400)
      const pose = sampleDescent(SPLIT_END, aspect)
      camera.position.set(...pose.camera); camera.lookAt(...pose.target); camera.updateMatrixWorld()
      rig.position.y = pose.logoY; rig.rotation.set(pose.pitch, pose.yaw, 0, 'YXZ')
      const held = createLogoSplitScratch()
      applyLogoSplit(nodes, rig, camera, .26, held, 1920)
      const ledMask = snapshot(held.reveal), version = held.reveal.version
      parts.forEach((part, i) => { part.geometry = glass[i] })
      applyLogoSplit(nodes, rig, camera, .26, held, 1920)
      assert.equal(held.reveal.version, version + 1, 'geometry alone invalidates the held camera/amount shortcut')
      for (const [i, part] of parts.entries()) {
        const [record] = held.contourMeshes.get(part)
        assert.equal(record.geometry, glass[i])
        assert.equal(record.points.length, glass[i].getAttribute('position').count * 2)
      }
      const contour = held.reveal
      assert.ok(contour.rows.every(Number.isFinite) && contour.left.every(Number.isFinite) && contour.right.every(Number.isFinite))
      const visibleLeft = projectedTriangles(right, camera), visibleRight = projectedTriangles(left, camera)
      for (let row = 1; row < contour.rows.length; row++) {
        const y = (contour.rows[row - 1] + contour.rows[row]) * .5
        const a = triangleSpan(visibleLeft, y), b = triangleSpan(visibleRight, y)
        if (!Number.isFinite(a.max) || !Number.isFinite(b.min)) continue
        const leftEdge = contourAt(contour, y, 'left'), rightEdge = contourAt(contour, y, 'right')
        if (rightEdge - leftEdge <= 1e-8) continue
        assert.ok(leftEdge >= a.max + 2 / 1920 - 1e-6, 'glass mask covers the independently projected left silhouette')
        assert.ok(rightEdge <= b.min - 2 / 1920 + 1e-6, 'glass mask covers the independently projected right silhouette')
        compared++
      }
      const glassVersion = held.reveal.version
      applyLogoSplit(nodes, rig, camera, .26, held, 1920)
      assert.equal(held.reveal.version, glassVersion, 'unchanged glass geometry keeps the held-pose optimization')
      parts.forEach((part, i) => { part.geometry = original[i] })
      applyLogoSplit(nodes, rig, camera, .26, held, 1920)
      assert.equal(held.reveal.version, glassVersion + 1)
      assert.deepEqual(snapshot(held.reveal), ledMask, 'LED/electric recover their exact original masks')
    }
    assert.ok(compared > 100, 'compared the denser glass against independent triangle slices at desktop and mobile aspects')
  } finally {
    parts.forEach((part, i) => { part.geometry = original[i] })
    glass.forEach(geometry => geometry.dispose())
    restoreLogoHalves(nodes)
  }
})

await test('split begins only after 180 degrees and cleanup restores every authored transform', () => {
  assert.equal(sampleDescent(SPLIT_START).yaw, Math.PI)
  assert.equal(sampleDescent(SPLIT_START).split, 0)
  assert.equal(sampleDescent(SPLIT_END).split, 1)
  left.position.set(3, 4, 5)
  right.quaternion.set(.2, .1, .3, .9).normalize()
  nodes.proxyLeft.scale.setScalar(2)
  restoreLogoHalves(nodes)
  for (const [part, proxyPart, baseline] of [[left, nodes.proxyLeft, nodes.baseline.left], [right, nodes.proxyRight, nodes.baseline.right]]) {
    for (const property of ['position', 'quaternion', 'scale']) {
      assert.deepEqual(part[property].toArray(), baseline[property].toArray())
      assert.deepEqual(proxyPart[property].toArray(), baseline[property].toArray())
    }
  }
})
