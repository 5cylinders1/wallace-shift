/** Contracts for the Make registration plates and the two panel environments
 * behind Transform and Resolve. These are renderer-state checks: they cannot
 * verify the final GPU composition, colour or frame timing in a browser. */
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
const load = async name => import(await moduleUrl(new URL(`src/components/HomeJourney/${name}.ts`, repo)))

const { createJourneyPlates } = await load('journeyPlates')
const { createJourneySurfaceUniforms } = await load('journeySkins')
const { createJourneyShiftRules } = await load('journeyShiftRules')
const { createJourneyAscent } = await load('journeyAscent')
const { createJourneyFrictionMotion, ASCENT_RISE } = await load('journeyFrictionMotion')

const close = (actual, expected, message) =>
  assert.ok(Math.abs(actual - expected) < 1e-6, `${message ?? 'value'}: ${actual} vs ${expected}`)
const finiteUniforms = material => {
  for (const [name, uniform] of Object.entries(material.uniforms)) {
    const value = uniform.value
    if (typeof value === 'number') assert.ok(Number.isFinite(value), `${name} is finite`)
    else if (value && typeof value.x === 'number') {
      assert.ok(Number.isFinite(value.x) && Number.isFinite(value.y), `${name} is finite`)
    }
  }
}

/** A stand-in for one authored half: the plates must reuse this exact buffer. */
function host() {
  const geometry = new three.BoxGeometry(1, .2, .6)
  const mesh = new three.Mesh(geometry, new three.MeshBasicMaterial())
  return { mesh, geometry }
}
const platesOf = mesh => mesh.children.filter(child => child.name === 'HomepageJourney_RegisterPlate')
const inMake = uniforms => {
  uniforms.uJourneySurfaceAmount.value = 1
  uniforms.uJourneyMakeEdge.value = 0
  uniforms.uJourneyLaunchEdge.value = 1
  uniforms.uJourneyDrawingHeight.value = 1440
}

await test('registration plates reuse each half\'s own geometry and never own the depth buffer', () => {
  const uniforms = createJourneySurfaceUniforms()
  const plates = createJourneyPlates(uniforms)
  const left = host(), right = host()
  plates.attach(left.mesh, left.geometry)
  plates.attach(right.mesh, right.geometry)
  const separations = platesOf(left.mesh)
  assert.equal(separations.length, 3, 'three colour separations per half')
  assert.equal(platesOf(right.mesh).length, 3)
  const materials = new Set()
  for (const [side, part] of [[left, separations], [right, platesOf(right.mesh)]]) {
    for (const plate of part) {
      assert.equal(plate.geometry, side.geometry,
        'a plate shares the authored buffer instead of cloning it')
      assert.equal(plate.material.depthTest, false)
      assert.equal(plate.material.depthWrite, false)
      assert.equal(plate.material.transparent, true)
      assert.equal(plate.material.premultipliedAlpha, true,
        'the canvas is transparent over a solid panel, so plates must not blend additively')
      assert.equal(plate.material.toneMapped, false)
      assert.ok(plate.renderOrder < 0, 'plates draw beneath the mark, never over it')
      assert.equal(plate.frustumCulled, false)
      materials.add(plate.material)
    }
  }
  assert.equal(materials.size, 3, 'both halves share one material per separation')
  for (const material of materials) {
    for (const name of Object.keys(uniforms)) {
      assert.equal(material.uniforms[name], uniforms[name],
        `${name} is the live shared panel uniform, so plates clip exactly where the panel does`)
    }
  }
  plates.dispose()
})

await test('plate slip follows the mark, stays square on screen and retires on register', () => {
  const uniforms = createJourneySurfaceUniforms()
  const plates = createJourneyPlates(uniforms)
  const part = host()
  plates.attach(part.mesh, part.geometry)
  const separations = platesOf(part.mesh)
  const material = separations[0].material
  const shown = (...args) => { plates.update(...args); return separations.every(plate => plate.visible) }

  assert.equal(shown(0, 1, .45, 1.6), false, 'nothing shows before the Make panel arrives')
  inMake(uniforms)
  assert.equal(shown(0, 1, .45, 1.6), true)
  // One world unit of slip must be the same number of pixels horizontally and
  // vertically: clip space spans two units across and down, world x spans 2*aspect.
  close(material.uniforms.uPlateSlip.value.x, .45 / 1.6, 'horizontal slip')
  close(material.uniforms.uPlateSlip.value.y, .45, 'vertical slip')
  plates.update(0, 1, .90, 1.6)
  close(material.uniforms.uPlateSlip.value.x, .90 / 1.6, 'slip grows with the mark')

  assert.equal(shown(1, 1, .45, 1.6), false, 'a fully registered plate has nothing left to show')
  assert.equal(shown(.5, 0, .45, 1.6), false, 'an invisible journey hides the plates')
  inMake(uniforms)
  uniforms.uJourneySurfaceAmount.value = 0
  assert.equal(shown(.5, 1, .45, 1.6), false, 'the blueprint chapters never carry plates')
  inMake(uniforms)
  uniforms.uJourneyLaunchEdge.value = 0
  assert.equal(shown(.5, 1, .45, 1.6), false, 'the covered Make panel takes its plates with it')

  inMake(uniforms)
  plates.update(NaN, NaN, NaN, NaN)
  for (const plate of separations) finiteUniforms(plate.material)
  plates.dispose()
})

await test('plates release their materials once and leave the authored graph intact', () => {
  const uniforms = createJourneySurfaceUniforms()
  const plates = createJourneyPlates(uniforms)
  const part = host()
  plates.attach(part.mesh, part.geometry)
  const separations = platesOf(part.mesh)
  const disposals = new Map()
  for (const plate of separations) {
    plate.material.addEventListener('dispose', () =>
      disposals.set(plate.material, (disposals.get(plate.material) ?? 0) + 1))
  }
  plates.dispose()
  plates.dispose()
  assert.equal(platesOf(part.mesh).length, 0, 'plates detach from the authored half')
  assert.equal(disposals.size, 3)
  for (const count of disposals.values()) assert.equal(count, 1, 'each material is released exactly once')
  assert.equal(part.geometry.attributes.position.count > 0, true,
    'the authored buffer belongs to the model, not to the plates')
  plates.update(.5, 1, .45, 1.6)
})

const rulesFrame = (overrides = {}) => ({
  visible: 1, align: .4, register: .4, makeEdge: .2, launchEdge: .9,
  drawingHeight: 1440, aspect: 1.6, time: 1, markX: 1.1, markY: 0,
  markWidth: .45, markHeight: .25, copyRight: -.2,
  pointerX: .5, pointerY: .2, pointerActive: true, ...overrides,
})
const ascentFrame = (overrides = {}) => ({
  visible: 1, ascent: .5, shimmer: .3, launchEdge: .2, launchBottom: .95,
  drawingHeight: 1440, aspect: 1.6, time: 1, markX: 1.1, markY: .2,
  markWidth: .45, markHeight: .25, horizonY: -.1, copyRight: -.2,
  pointerX: .5, pointerY: .2, pointerActive: true, ...overrides,
})

await test('both panel environments cover the stage behind the mark and clip to their own panel', () => {
  for (const [name, field, frame, off] of [
    ['Make drafting field', createJourneyShiftRules(), rulesFrame, [
      { makeEdge: 2 }, { makeEdge: 1 }, { launchEdge: 0 }, { visible: 0 }]],
    ['Launch ascent field', createJourneyAscent(), ascentFrame, [
      { launchEdge: 2 }, { launchEdge: 1 }, { launchBottom: 0 }, { visible: 0 }]],
  ]) {
    field.update(frame())
    assert.equal(field.mesh.visible, true, `${name} draws inside its panel`)
    close(field.mesh.scale.x, 2 * 1.6, `${name} spans the viewport width`)
    close(field.mesh.scale.y, 2, `${name} spans the viewport height`)
    assert.ok(field.mesh.position.z < 0, `${name} sits behind the mark`)
    assert.ok(field.mesh.renderOrder < -20,
      `${name} draws beneath the mark and the existing launch backlight`)
    assert.equal(field.mesh.material.depthWrite, false)
    assert.equal(field.mesh.material.premultipliedAlpha, true,
      `${name} composites over a transparent canvas, so it must be premultiplied`)
    for (const hidden of off) {
      field.update(frame(hidden))
      assert.equal(field.mesh.visible, false,
        `${name} is absent outside its panel (${JSON.stringify(hidden)})`)
    }
    field.update(frame())
    field.dispose()
    field.update(frame())
    assert.equal(field.mesh.visible, false, `${name} stays down once disposed`)
    field.dispose()
  }
})

await test('panel environments fade the pointer reading and never accept a broken frame', () => {
  for (const [field, frame] of [
    [createJourneyShiftRules(), rulesFrame], [createJourneyAscent(), ascentFrame],
  ]) {
    const active = () => field.mesh.material.uniforms.uPointerActive.value
    field.update(frame({ time: 0 }))
    assert.ok(active() < .05, 'the light starts down rather than snapping on')
    for (let step = 1; step <= 40; step++) field.update(frame({ time: step * .1 }))
    assert.ok(active() > .9, 'holding the pointer brings the reading light up')
    const lit = active()
    field.update(frame({ time: 4.1, pointerActive: false }))
    assert.ok(active() < lit, 'leaving the window fades the light instead of switching it')
    const pointer = field.mesh.material.uniforms.uPointer.value.clone()
    field.update(frame({ time: 4.2, pointerX: NaN, pointerY: Infinity }))
    assert.ok(Number.isFinite(field.mesh.material.uniforms.uPointer.value.x)
      && Number.isFinite(field.mesh.material.uniforms.uPointer.value.y),
    'a broken pointer never reaches the shader')
    field.update(frame({ time: 4.3, aspect: NaN, markWidth: NaN, drawingHeight: 0 }))
    finiteUniforms(field.mesh.material)
    assert.ok(field.mesh.material.uniforms.uDrawingHeight.value >= 1)
    assert.ok(pointer.x !== undefined)
    field.dispose()
  }
})

await test('the Launch climb is a share of the open stage and reports the horizon it left', () => {
  const controller = createJourneyFrictionMotion()
  const base = { width: 1440, height: 900, headerOffset: 83, baseX: 1100, baseY: 480,
    logoWidth: 200, logoHeight: 110, copyRight: 640, copyBottom: 500,
    findWipe: 1, makeWipe: 1, makeEdge: -.1, dock: 1, retire: 0 }
  const stage = base.height - base.headerOffset
  const docked = controller.update({ ...base, time: 1, rise: 0 })
  close(docked.rise, 0)
  close(docked.y, base.headerOffset + stage * .5, 'the mark rests at the centre of the open stage')
  const climbing = controller.update({ ...base, time: 2, rise: 1, logoWidth: 440, logoHeight: 242 })
  close(climbing.rise, stage * ASCENT_RISE, 'a full ascent climbs its documented share of the stage')
  close(climbing.y + climbing.rise, docked.y,
    'the reported climb is exactly the distance back down to the horizon the mark left')
  assert.ok(climbing.y - 242 * .5 > base.headerOffset, 'the enlarged mark still clears navigation')

  // A tall mark on a shallow stage clamps the climb instead of leaving the panel.
  const shallow = { ...base, height: 560, baseY: 300, logoWidth: 420, logoHeight: 231 }
  const clamped = controller.update({ ...shallow, time: 3, rise: 1 })
  const shallowStage = shallow.height - shallow.headerOffset
  assert.ok(clamped.rise < shallowStage * ASCENT_RISE, 'a shallow stage shortens the climb')
  assert.ok(clamped.y - shallow.logoHeight * .5 > shallow.headerOffset,
    'the clamped climb keeps the whole mark below navigation')
  const repeated = controller.update({ ...shallow, time: 4, rise: 1 })
  assert.deepEqual(repeated, clamped, 'the climb is a pure function of scroll, not an accumulator')
  const reversed = controller.update({ ...shallow, time: 5, rise: 0 })
  close(reversed.rise, 0, 'reverse scrolling puts the mark back on its horizon')
})
