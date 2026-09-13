/** Real Three.js resource and animation contracts for the Find the friction
 * field. These Node checks do not verify browser/GPU-rendered appearance. */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import * as three from 'three'
import ts from 'typescript'

const repo = new URL('../', import.meta.url)
const modules = new Map()
async function moduleUrl(url) {
  if (modules.has(url.href)) return modules.get(url.href)
  let source = ts.transpileModule(await readFile(url, 'utf8'), { compilerOptions: {
    target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext,
  } }).outputText
  const imports = ts.createSourceFile(url.pathname, source, ts.ScriptTarget.Latest, true)
    .statements.filter(ts.isImportDeclaration)
  for (const node of imports.reverse()) {
    const name = node.moduleSpecifier.text
    const replacement = name.startsWith('.')
      ? await moduleUrl(new URL(`${name}.ts`, url))
      : import.meta.resolve(name)
    source = source.slice(0, node.moduleSpecifier.getStart()) + JSON.stringify(replacement)
      + source.slice(node.moduleSpecifier.end)
  }
  const result = `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`
  modules.set(url.href, result)
  return result
}

const { createJourneyFriction } = await import(await moduleUrl(
  new URL('src/components/HomeJourney/journeyFriction.ts', repo)))

const state = (overrides = {}) => ({
  visible: 1, time: 3, findEdge: .14, makeEdge: .91,
  drawingHeight: 1440, pixelRatio: 2,
  centerX: .64, centerY: .3, logoWidth: .52,
  viewportWidth: 1280, viewportHeight: 720, headerOffset: 83,
  pointerX: .5, pointerY: .4, pointerActive: false,
  ...overrides,
})

function resources(group) {
  const nodes = [], geometries = new Set(), materials = new Set()
  group.traverse(node => {
    nodes.push(node)
    if (node.geometry instanceof three.BufferGeometry) geometries.add(node.geometry)
    for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
      if (material instanceof three.Material) materials.add(material)
    }
  })
  return { nodes, geometries, materials }
}

function attributes(group) {
  return resources(group).nodes.filter(node => node.geometry).map(node => ({
    name: node.name,
    attributes: Object.fromEntries(Object.entries(node.geometry.attributes).map(([name, attribute]) => [name, {
      itemSize: attribute.itemSize, count: attribute.count, values: Array.from(attribute.array),
    }])),
  }))
}

await test('friction field builds deterministic finite particle and cage resources', () => {
  const first = createJourneyFriction(), second = createJourneyFriction()
  try {
    assert.ok(first.group instanceof three.Group)
    assert.equal(first.group.visible, false, 'the field starts hidden until its stage is active')
    const owned = resources(first.group)
    const particles = owned.nodes.find(node => node instanceof three.Points)
    const cage = first.group.getObjectByName('JourneyFriction_Cage')
    assert.ok(particles, 'the diagnostic field includes actual point geometry')
    assert.ok(cage instanceof three.Mesh, 'the enclosure uses real geometry rather than a DOM illustration')
    assert.ok(particles.geometry.attributes.position.count > 800,
      'the viewport field has more particles than the superseded compact 800-point logo cloud')
    const captured = attributes(first.group)
    assert.deepEqual(attributes(second.group), captured, 'reloading produces the same seeded composition')
    for (const item of captured) {
      for (const [name, attribute] of Object.entries(item.attributes)) {
        assert.ok(attribute.count > 0, `${item.name}.${name} is populated`)
        assert.ok(attribute.values.every(Number.isFinite), `${item.name}.${name} contains only finite values`)
      }
    }
    for (const material of owned.materials) {
      assert.ok(material instanceof three.ShaderMaterial)
      assert.equal(material.depthWrite, false, 'diagnostic marks do not occlude the independent logo')
    }
    for (const geometry of owned.geometries) assert.ok(!resources(second.group).geometries.has(geometry),
      'each field owns its resources for safe disposal')
  } finally { first.dispose(); second.dispose() }
})

await test('cage follows the logo while the scene-wide particle field remains anchored to the viewport', () => {
  const field = createJourneyFriction()
  try {
    const particles = field.group.getObjectByName('JourneyFriction_Particles')
    const cage = field.group.getObjectByName('JourneyFriction_Cage')
    const cageRig = cage.parent
    assert.notEqual(cageRig, field.group, 'the cage needs its own moving attachment inside the stationary field')
    const first = state()
    field.update(first)
    field.group.updateMatrixWorld(true)
    const particleWorld = particles.matrixWorld.clone()
    assert.deepEqual(field.group.position.toArray(), [0, 0, 0])
    assert.deepEqual(field.group.scale.toArray(), [1, 1, 1])
    assert.deepEqual(cageRig.position.toArray(), [first.centerX, first.centerY, 0])
    assert.deepEqual(cageRig.scale.toArray(), [first.logoWidth, first.logoWidth, first.logoWidth])
    const next = state({ centerX: -.3, centerY: -.44, logoWidth: 1.04 })
    field.update(next)
    field.group.updateMatrixWorld(true)
    assert.deepEqual(cageRig.position.toArray(), [next.centerX, next.centerY, 0])
    assert.deepEqual(cageRig.scale.toArray(), [next.logoWidth, next.logoWidth, next.logoWidth])
    assert.ok(particles.matrixWorld.equals(particleWorld),
      'moving or resizing the logo must not drag or scale the full-page particle field')
    for (const material of resources(field.group).materials) {
      assert.equal(material.uniforms.uAspect.value, first.viewportWidth / first.viewportHeight)
      assert.deepEqual(material.uniforms.uCenter.value.toArray(), [next.centerX, next.centerY])
    }
  } finally { field.dispose() }
})

await test('elapsed time rotates the cage while particle positions and logo attachment stay stable', () => {
  const field = createJourneyFriction()
  try {
    const cage = field.group.getObjectByName('JourneyFriction_Cage')
    const particles = field.group.getObjectByName('JourneyFriction_Particles')
    field.update(state({ time: 2 }))
    const firstRotation = cage.quaternion.clone()
    const pointRotation = particles.quaternion.clone()
    const attachmentRotation = field.group.quaternion.clone()
    const position = field.group.position.clone()
    const source = attributes(field.group)
    field.update(state({ time: 8 }))
    assert.ok(cage.quaternion.angleTo(firstRotation) > .0001, 'the frame visibly changes orientation over time')
    assert.ok(particles.quaternion.angleTo(pointRotation) < 1e-8,
      'the background particles do not rotate as a rigid cage decoration')
    assert.ok(field.group.position.equals(position), 'rotation does not drift away from the logo center')
    assert.ok(field.group.quaternion.angleTo(attachmentRotation) < 1e-8,
      'cage rotation does not propagate to the logo attachment or its particle sibling')
    assert.deepEqual(attributes(field.group), source, 'time animation leaves the seeded particle buffers intact')
    field.update(state({ time: 2 }))
    assert.ok(cage.quaternion.angleTo(firstRotation) < 1e-7,
      'the same elapsed time reconstructs the same pose after reverse navigation')
  } finally { field.dispose() }
})

await test('cage and particles share exact Find/Make and header masks in physical drawing pixels', () => {
  const field = createJourneyFriction()
  try {
    const sample = state({ findEdge: .23, makeEdge: .72, drawingHeight: 1008, pixelRatio: 1.4, time: 7 })
    field.update(sample)
    const materials = [...resources(field.group).materials]
    assert.ok(materials.length >= 2, 'both the cage and particle passes are represented')
    for (const [name, expected] of Object.entries({
      uTime: sample.time, uFindEdge: sample.findEdge, uMakeEdge: sample.makeEdge,
      uDrawingHeight: sample.drawingHeight, uPixelRatio: sample.pixelRatio,
      uHeaderEdge: sample.headerOffset / sample.viewportHeight,
      uAspect: sample.viewportWidth / sample.viewportHeight,
    })) {
      for (const material of materials) {
        assert.equal(material.uniforms[name].value, expected)
        assert.equal(material.uniforms[name], materials[0].uniforms[name],
          `${name} updates all diagnostic passes atomically`)
      }
    }
    field.update(state({ drawingHeight: 2160, pixelRatio: 3, findEdge: -.5, makeEdge: .36 }))
    for (const material of materials) {
      assert.equal(material.uniforms.uDrawingHeight.value, 2160)
      assert.equal(material.uniforms.uPixelRatio.value, 3)
      assert.equal(material.uniforms.uFindEdge.value, -.5)
      assert.equal(material.uniforms.uMakeEdge.value, .36)
    }
  } finally { field.dispose() }
})

await test('pointer influence shares world coordinates across the effects and fades out when the pointer leaves', () => {
  const field = createJourneyFriction()
  try {
    const materials = [...resources(field.group).materials]
    field.update(state({ time: 1, pointerActive: false }))
    for (const name of ['uPointer', 'uPointerActive', 'uPointerRadius', 'uLogoVelocity']) {
      for (const material of materials) assert.equal(material.uniforms[name], materials[0].uniforms[name],
        `${name} must update the cage and particles consistently`)
    }
    for (let i = 0; i < 90; i++) field.update(state({
      time: 1 + i / 60, pointerX: -.6, pointerY: -.25, pointerActive: true,
    }))
    const uniforms = materials[0].uniforms
    assert.deepEqual(uniforms.uPointer.value.toArray(), [-.6, -.25])
    assert.ok(uniforms.uPointerActive.value > .5 && uniforms.uPointerActive.value <= 1,
      'an active pointer establishes a visible bounded influence')
    assert.ok(uniforms.uPointerRadius.value > 0 && Number.isFinite(uniforms.uPointerRadius.value))
    const active = uniforms.uPointerActive.value
    field.update(state({ time: 3, pointerActive: false }))
    assert.ok(uniforms.uPointerActive.value < active, 'pointer leave starts removing its influence')
    for (let i = 0; i < 120; i++) field.update(state({ time: 3 + i / 60, pointerActive: false }))
    assert.ok(uniforms.uPointerActive.value < .01, 'the released pointer does not leave a permanent field disturbance')
    assert.ok(uniforms.uLogoVelocity.value.toArray().every(Number.isFinite))
  } finally { field.dispose() }
})

await test('off-stage updates hide the field and reuse the existing resources through repeated crossings', () => {
  const field = createJourneyFriction()
  try {
    const initial = resources(field.group)
    const cage = field.group.getObjectByName('JourneyFriction_Cage')
    for (const hidden of [state({ visible: 0 }), state({ findEdge: 1 }), state({ makeEdge: 0 })]) {
      field.update(state())
      assert.equal(field.group.visible, true)
      const rest = cage.quaternion.clone()
      const times = [...initial.materials].map(material => material.uniforms.uTime.value)
      field.update({ ...hidden, time: 999 })
      assert.equal(field.group.visible, false, 'hidden, not-arrived, and covered stages all stop drawing')
      assert.ok(cage.quaternion.angleTo(rest) < 1e-8, 'off-stage updates skip frame rotation work')
      assert.deepEqual([...initial.materials].map(material => material.uniforms.uTime.value), times,
        'off-stage updates do not keep advancing material animation')
    }
    for (let i = 0; i < 60; i++) {
      field.update(state({ time: i, visible: i % 3 ? 1 : 0 }))
      const current = resources(field.group)
      assert.deepEqual(current.nodes, initial.nodes)
      assert.deepEqual(current.geometries, initial.geometries)
      assert.deepEqual(current.materials, initial.materials)
    }
  } finally { field.dispose() }
})

await test('friction field disposes every owned resource exactly once', () => {
  const field = createJourneyFriction()
  const owned = resources(field.group)
  const disposals = new Map([...owned.geometries, ...owned.materials].map(resource => [resource, 0]))
  for (const resource of disposals.keys()) resource.addEventListener('dispose', () => {
    disposals.set(resource, disposals.get(resource) + 1)
  })
  field.update(state())
  field.dispose()
  field.dispose()
  assert.ok(disposals.size > 0)
  for (const [resource, count] of disposals) assert.equal(count, 1, `${resource.type} disposes exactly once`)
  assert.equal(field.group.visible, false)
  field.update(state({ time: 100 }))
  assert.equal(field.group.visible, false, 'updates cannot resurrect disposed drawing resources')
})
