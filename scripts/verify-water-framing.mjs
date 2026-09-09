/** Run: node scripts/verify-water-framing.mjs
 * Loads the actual GLB and projects its world bounds through the authored
 * cameras. This checks geometry/framing, not browser rendering or optics.
 * Uses the project's existing Three and TypeScript dependencies only.
 */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { Box3, Group, PerspectiveCamera, Vector3 } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import ts from 'typescript'

async function sourceModule(relativePath) {
  const source = await readFile(new URL(relativePath, import.meta.url), 'utf8')
  const javascript = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext },
  }).outputText
  return import(`data:text/javascript;base64,${Buffer.from(javascript).toString('base64')}`)
}

const { sampleDescent, TURN_END, SPLIT_START } = await sourceModule(
  '../src/components/experiments/water-hero/sceneDirector.ts',
)
const { CAMERA, LOGO_TARGET_WIDTH, NODE_NAMES, WATER_LEVEL, WS_LOGO_URL } = await sourceModule(
  '../src/components/experiments/water-hero/waterHeroConfig.ts',
)
const bytes = await readFile(new URL(`../public${WS_LOGO_URL}`, import.meta.url))
const gltf = await new GLTFLoader().parseAsync(
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  '',
)
for (const name of Object.values(NODE_NAMES)) {
  assert.ok(gltf.scene.getObjectByName(name), `GLB contains ${name}`)
}

const rawBounds = new Box3().setFromObject(gltf.scene)
const rawSize = rawBounds.getSize(new Vector3())
const rawCenter = rawBounds.getCenter(new Vector3())
const scale = LOGO_TARGET_WIDTH / rawSize.x
// The presentation convention stands the Blender-authored XZ plate up.
// It lives on an outer group and preserves the GLB hierarchy and pivots.
const orient = new Group()
orient.rotation.x = Math.PI / 2
orient.scale.setScalar(scale)
orient.position.copy(rawCenter.applyAxisAngle(new Vector3(1, 0, 0), Math.PI / 2).multiplyScalar(-scale))
orient.add(gltf.scene)
const rig = new Group()
rig.add(orient)

const viewports = [
  ['narrow portrait', .25],
  ['phone portrait', 390 / 844],
  ['tablet portrait', 768 / 1024],
  ['desktop', 16 / 9],
  ['ultrawide', 21 / 9],
]
const summaries = []

function frameActualLogo(progress, aspect) {
  const pose = sampleDescent(progress, aspect)
  const camera = new PerspectiveCamera(CAMERA.fov, aspect, CAMERA.near, CAMERA.far)
  camera.position.set(...pose.camera)
  camera.lookAt(...pose.target)
  camera.updateMatrixWorld()
  rig.position.y = pose.logoY
  rig.rotation.set(pose.pitch, pose.yaw, 0, 'YXZ')
  rig.updateMatrixWorld(true)
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  const point = new Vector3()
  gltf.scene.traverse(mesh => {
    const positions = mesh.geometry?.getAttribute('position')
    if (!positions) return
    for (let i = 0; i < positions.count; i++) {
      point.fromBufferAttribute(positions, i).applyMatrix4(mesh.matrixWorld).project(camera)
      minX = Math.min(minX, point.x)
      maxX = Math.max(maxX, point.x)
      minY = Math.min(minY, point.y)
      maxY = Math.max(maxY, point.y)
    }
  })
  return { width: (maxX - minX) / 2, height: (maxY - minY) / 2, minX, maxX, minY, maxY }
}

await test('opening matches the production reference scale, grounding and horizon', () => {
  // Supplied production screenshot: mark about 25% wide/high, centered,
  // lower edge near 63% down the image. Keep margin for its video movement.
  const pose = sampleDescent(0, 16 / 9)
  const camera = new PerspectiveCamera(CAMERA.fov, 16 / 9, CAMERA.near, CAMERA.far)
  camera.position.set(...pose.camera)
  camera.lookAt(...pose.target)
  camera.updateMatrixWorld()
  rig.position.y = pose.logoY
  rig.rotation.set(pose.pitch, pose.yaw, 0, 'YXZ')
  rig.updateMatrixWorld(true)
  const points = []
  gltf.scene.traverse(mesh => {
    const positions = mesh.geometry?.getAttribute('position')
    if (!positions) return
    for (let i = 0; i < positions.count; i++) {
      points.push(new Vector3().fromBufferAttribute(positions, i).applyMatrix4(mesh.matrixWorld).project(camera))
    }
  })
  const x = points.map(point => point.x), y = points.map(point => point.y)
  const width = (Math.max(...x) - Math.min(...x)) / 2
  const height = (Math.max(...y) - Math.min(...y)) / 2
  const bottom = (1 - Math.min(...y)) / 2
  const center = new Vector3(0, pose.logoY, 0).project(camera)
  const horizon = (1 - new Vector3(0, WATER_LEVEL, -100000).project(camera).y) / 2
  const clearance = new Box3().setFromObject(gltf.scene).min.y - WATER_LEVEL
  console.log(`Production opening match: ${(width * 100).toFixed(1)}% wide, ${(height * 100).toFixed(1)}% high, `
    + `bottom ${(bottom * 100).toFixed(1)}%, horizon ${(horizon * 100).toFixed(1)}%, clearance ${clearance.toFixed(3)}.`)
  assert.ok(width >= .23 && width <= .28, 'production-scale desktop mark')
  assert.ok(height >= .23 && height <= .28, 'production-scale desktop height')
  assert.ok(Math.abs(center.x) < .02 && Math.abs(center.y) < .02, 'centered composition')
  assert.ok(bottom >= .61 && bottom <= .65, 'base meets water in the lower middle of frame')
  assert.ok(horizon >= .58 && horizon <= .63, 'low horizon matches production')
  assert.ok(clearance < 0 && clearance > -.02, 'mark makes shallow physical contact with the surface')
})

for (const [label, aspect] of viewports) {
  await test(`actual GLB stays framed with safe clipping: ${label}`, () => {
    const camera = new PerspectiveCamera(CAMERA.fov, aspect, CAMERA.near, CAMERA.far)
    const bounds = new Box3()
    let maxWidth = 0
    let maxHeight = 0
    let minimumCameraDepth = Infinity
    let minimumTurningClearance = Infinity
    let cameraCrossing = null
    let previousCameraY = Infinity

    for (let i = 0; i <= Math.round(SPLIT_START * 1000); i++) {
      const progress = i / 1000
      const pose = sampleDescent(progress, aspect)
      camera.position.set(...pose.camera)
      camera.lookAt(...pose.target)
      camera.updateMatrixWorld()
      rig.position.y = pose.logoY
      rig.rotation.set(pose.pitch, pose.yaw, 0, 'YXZ')
      rig.updateMatrixWorld(true)
      bounds.setFromObject(gltf.scene)

      const projectedX = []
      const projectedY = []
      for (const x of [bounds.min.x, bounds.max.x]) {
        for (const y of [bounds.min.y, bounds.max.y]) {
          for (const z of [bounds.min.z, bounds.max.z]) {
            const point = new Vector3(x, y, z)
            const viewDepth = -point.clone().applyMatrix4(camera.matrixWorldInverse).z
            minimumCameraDepth = Math.min(minimumCameraDepth, viewDepth)
            assert.ok(viewDepth > CAMERA.near && viewDepth < CAMERA.far, `clip planes at p=${progress}`)
            point.project(camera)
            assert.ok(Number.isFinite(point.x) && Number.isFinite(point.y), `finite projection at p=${progress}`)
            assert.ok(Math.abs(point.x) <= 1 && Math.abs(point.y) <= 1, `inside viewport at p=${progress}`)
            projectedX.push(point.x)
            projectedY.push(point.y)
          }
        }
      }
      maxWidth = Math.max(maxWidth, (Math.max(...projectedX) - Math.min(...projectedX)) / 2)
      maxHeight = Math.max(maxHeight, (Math.max(...projectedY) - Math.min(...projectedY)) / 2)

      if (pose.yaw > 1e-8) {
        const clearance = WATER_LEVEL - bounds.max.y
        minimumTurningClearance = Math.min(minimumTurningClearance, clearance)
        assert.ok(clearance > 0, `complete mark underwater before turning at p=${progress}`)
      }
      if (pose.camera[1] <= WATER_LEVEL && previousCameraY > WATER_LEVEL) cameraCrossing = progress
      previousCameraY = pose.camera[1]
    }

    assert.ok(cameraCrossing !== null, 'camera crosses the surface')
    summaries.push({ label, maxWidth, maxHeight, minimumCameraDepth, minimumTurningClearance, cameraCrossing })
  })
}

await test('viewport reframing preserves camera crossing time', () => {
  const first = summaries[0].cameraCrossing
  for (const summary of summaries) assert.equal(summary.cameraCrossing, first)
})

for (const [label, aspect] of viewports) {
  await test(`submerged camera leaves room around the actual turning logo: ${label}`, () => {
    let maxWidth = 0, maxHeight = 0
    for (let i = 54; i <= 80; i++) {
      const frame = frameActualLogo(i / 100, aspect)
      maxWidth = Math.max(maxWidth, frame.width)
      maxHeight = Math.max(maxHeight, frame.height)
      assert.ok(frame.minX > -.75 && frame.maxX < .75, `lateral particle margin at p=${i / 100}`)
      assert.ok(frame.minY > -.75 && frame.maxY < .75, `vertical particle margin at p=${i / 100}`)
    }
    if (aspect === 16 / 9) {
      assert.ok(maxWidth >= .25 && maxWidth <= .305, `desktop submerged width ${(maxWidth * 100).toFixed(1)}%`)
      assert.ok(maxHeight <= .32, `desktop submerged height ${(maxHeight * 100).toFixed(1)}%`)
    }
    if (aspect < 1) assert.ok(maxWidth <= .50, `portrait room for suspended matter: ${(maxWidth * 100).toFixed(1)}%`)
    console.log(`${label} submerged actual GLB: width ≤ ${(maxWidth * 100).toFixed(1)}%, height ≤ ${(maxHeight * 100).toFixed(1)}%.`)
  })
}

// The unsplit GLB stops here: intentional piece exits are verified separately.
for (const [label, aspect] of [['desktop', 16 / 9], ['phone portrait', 390 / 844]]) {
  await test(`completed half-turn settles at a stable screen anchor before the split: ${label}`, () => {
    const settled = frameActualLogo(TURN_END, aspect)
    const splitStart = frameActualLogo(SPLIT_START, aspect)
    for (const coordinate of Object.keys(settled)) {
      assert.ok(Math.abs(settled[coordinate] - splitStart[coordinate]) < 1e-10,
        `settled ${coordinate} must hold before pieces move`)
    }
    const pose = sampleDescent(SPLIT_START, aspect)
    const camera = new PerspectiveCamera(CAMERA.fov, aspect, CAMERA.near, CAMERA.far)
    camera.position.set(...pose.camera)
    camera.lookAt(...pose.target)
    camera.updateMatrixWorld()
    assert.ok(camera.getWorldDirection(new Vector3()).distanceTo(new Vector3(0, 0, -1)) < 1e-10,
      'final view is perpendicular to the upright logo face')
    const center = new Vector3(0, pose.logoY, 0).project(camera)
    assert.ok(Math.abs(center.x) < 1e-10 && Math.abs(center.y) < 1e-10, 'split opens around screen center')
    assert.ok(settled.width >= .25 && settled.width <= .50, 'parting mark remains readable with lateral room')
    assert.ok(settled.minX > -.65 && settled.maxX < .65, 'room on both sides before outward travel')
  })
}

for (const summary of summaries) {
  console.log(`${summary.label}: width ≤ ${(summary.maxWidth * 100).toFixed(1)}%, `
    + `height ≤ ${(summary.maxHeight * 100).toFixed(1)}%, `
    + `camera depth ≥ ${summary.minimumCameraDepth.toFixed(3)}, `
    + `turn clearance ≥ ${summary.minimumTurningClearance.toFixed(3)}, `
    + `camera crosses at ${summary.cameraCrossing}`)
}
