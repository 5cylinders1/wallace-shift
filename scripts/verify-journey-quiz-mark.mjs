/** The quiz mark's free rotation and its answered-question charge. These are
 * controller and renderer-state contracts; they cannot verify how the throw
 * feels in a browser or how the charge finally reads on the GPU. */
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

const { createJourneySpin } = await load('journeySpin')
const { createJourneyPower } = await load('journeyPower')
const { sampleJourneyFrame, QUIZ_POWER } = await load('journeyDirector')
const { createJourneyGather, sampleJourneySurface } = await load('journeyGather')

const close = (actual, expected, message) =>
  assert.ok(Math.abs(actual - expected) < 1e-6, `${message ?? 'value'}: ${actual} vs ${expected}`)
/** How far a quaternion turns, in radians, ignoring which way it points. */
const turn = q => 2 * Math.atan2(Math.hypot(q.x, q.y, q.z), Math.abs(q.w))
/** Total arc actually travelled. Comparing accumulated orientations directly
 * would alias: past half a turn, more spin reads as less. */
const coast = (spin, seconds, presence = 1, step = 1 / 60) => {
  let previous = spin.advance(0, presence).clone()
  let arc = 0
  for (let elapsed = 0; elapsed < seconds; elapsed += step) {
    spin.advance(step, presence)
    arc += turn(previous.clone().invert().multiply(spin.applied))
    previous = spin.applied.clone()
  }
  return arc
}
/** Drag along a straight line in the mark's own normalized coordinates. */
const drag = (spin, from, to, { steps = 12, seconds = .2, start = 0 } = {}) => {
  spin.grab(from[0], from[1], start)
  for (let i = 1; i <= steps; i++) {
    const t = i / steps
    spin.move(from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t,
      start + seconds * t)
  }
}

await test('a flat drag turns the mark on all three axes, not just two', () => {
  const spin = createJourneySpin()
  // A horizontal drag across the middle is a pure turn about the screen's
  // vertical axis, which is what a plain two-axis mapping also produces.
  drag(spin, [-.5, 0], [.5, 0])
  spin.release()
  const straight = spin.advance(0, 1).clone()
  assert.ok(Math.abs(straight.y) > .05, 'a horizontal drag yaws the mark')
  assert.ok(Math.abs(straight.z) < 1e-6, 'a drag through the centre carries no roll')

  // The same drag taken high across the mark has to roll it as well: this is
  // the whole reason the controller projects onto a trackball.
  const rolled = createJourneySpin()
  drag(rolled, [-.62, .55], [.62, .55])
  rolled.release()
  const q = rolled.advance(0, 1).clone()
  assert.ok(Math.abs(q.z) > .02, `an off-centre drag rolls the mark (z=${q.z})`)
  assert.ok(Math.abs(q.y) > .02, 'and still yaws it')
  const pitched = createJourneySpin()
  drag(pitched, [0, -.5], [0, .5])
  pitched.release()
  assert.ok(Math.abs(pitched.advance(0, 1).x) > .05, 'a vertical drag pitches the mark')
})

await test('the throw carries the speed of the drag and nothing else moves', () => {
  const gentle = createJourneySpin()
  drag(gentle, [-.2, 0], [.2, 0], { seconds: .6 })
  gentle.release()
  const fast = createJourneySpin()
  drag(fast, [-.6, 0], [.6, 0], { seconds: .12 })
  fast.release()
  assert.ok(fast.coasting && gentle.coasting, 'both throws leave the mark turning')
  const fastTravel = coast(fast, .5)
  const gentleTravel = coast(gentle, .5)
  assert.ok(fastTravel > gentleTravel * 1.5,
    `a harder throw spins further (${fastTravel} vs ${gentleTravel})`)

  // A drag with no movement at release must not fling the mark at all.
  const held = createJourneySpin()
  drag(held, [-.3, .1], [.3, .1], { seconds: .2 })
  for (let i = 0; i < 12; i++) held.move(.3, .1, .2 + i * .05)
  held.release()
  assert.equal(held.coasting, false, 'letting go while still does not throw the mark')

  // The controller only ever produces rotation: its output stays a unit
  // quaternion, so the renderer can never pick up a translation from it.
  for (const spin of [fast, gentle, held]) {
    close(spin.applied.length(), 1, 'the applied rotation stays normalized')
  }
})

await test('a throw slows to a stop instead of spinning forever', () => {
  const spin = createJourneySpin()
  drag(spin, [-.7, .2], [.7, -.2], { seconds: .1 })
  spin.release()
  let previous = Infinity
  for (let second = 0; second < 3; second++) {
    const travelled = coast(spin, 1)
    assert.ok(travelled <= previous + 1e-9, 'each second of coasting turns less than the last')
    previous = travelled
  }
  coast(spin, 20)
  assert.equal(spin.coasting, false, 'the mark comes to rest')
  const resting = spin.applied.clone()
  assert.ok(coast(spin, 3) < 1e-9, 'a rested mark holds its orientation exactly')
  assert.ok(turn(resting.clone().invert().multiply(spin.applied)) < 1e-9)
})

await test('a violent throw is capped, and broken input never corrupts the orientation', () => {
  const spin = createJourneySpin()
  spin.grab(-.9, 0, 0)
  // One enormous sample in a single millisecond: the raw angular velocity
  // here is far past anything a hand can produce.
  spin.move(.9, 0, .001)
  spin.release()
  const travelled = coast(spin, .25)
  assert.ok(travelled < Math.PI * 2, `a capped throw cannot strobe (${travelled} rad in 0.25s)`)

  const broken = createJourneySpin()
  broken.grab(NaN, Infinity, NaN)
  broken.move(NaN, NaN, NaN)
  broken.release()
  broken.advance(NaN, NaN)
  for (const component of ['x', 'y', 'z', 'w']) {
    assert.ok(Number.isFinite(broken.applied[component]), `${component} stays finite`)
  }
  close(broken.applied.length(), 1)
})

await test('the mark returns to its scroll pose as the quiz leaves, and remembers the reader', () => {
  const spin = createJourneySpin()
  drag(spin, [-.5, .3], [.5, -.3])
  spin.release()
  coast(spin, 4)
  const held = spin.advance(0, 1).clone()
  assert.ok(turn(held) > .1, 'the regression needs a mark the reader actually turned')

  close(turn(spin.advance(0, 0)), 0, 'no quiz on screen means the composed scroll pose alone')
  const half = spin.advance(0, .5)
  assert.ok(turn(half) > 0 && turn(half) < turn(held),
    'the reader\'s rotation retires continuously with the section')
  assert.ok(turn(spin.advance(0, 1).clone().invert().multiply(held)) < 1e-9,
    'scrolling back finds the same orientation the reader left')

  spin.cancel()
  assert.equal(spin.coasting, false)
  assert.equal(spin.grabbed, false)
  assert.ok(turn(spin.advance(0, 1).clone().invert().multiply(held)) < 1e-9,
    'cancelling stops the motion without discarding the orientation')
})

await test('an unanswered quiz is cold metal and each answer carries it further', () => {
  const layout = {
    viewportHeight: 900, viewportWidth: 1440, headerOffset: 83,
    servicesTop: 4000, servicesRowsBottom: 6000, servicesHeaderHeight: 300,
    servicesHeadingRight: 700, servicesHeadingBaseline: 200, entranceDistance: 600,
    processTop: 7000, processHeight: 6500, processHeadingRight: 700,
    quizTop: 14000, closingTop: 15600, end: 18000,
  }
  const atQuiz = (level, surge = 0) => sampleJourneyFrame(layout.quizTop + 200, layout, { level, surge })

  const cold = atQuiz(0)
  close(cold.quiz, 1, 'the quiz chapter owns the mark')
  close(cold.power, 0)
  close(cold.finish, QUIZ_POWER.finishFloor, 'an untouched quiz shows inert metal')
  close(cold.charge, QUIZ_POWER.chargeFloor, 'and an unlit contour')

  let previousFinish = cold.finish
  let previousCharge = cold.charge
  for (const answered of [1, 2, 3]) {
    const frame = atQuiz(answered / 3)
    assert.ok(frame.finish > previousFinish, `answer ${answered} lifts the surface`)
    assert.ok(frame.charge > previousCharge, `answer ${answered} lifts the contour`)
    close(frame.power, answered / 3)
    previousFinish = frame.finish
    previousCharge = frame.charge
  }
  close(atQuiz(1).finish, 1, 'a finished quiz reaches the same crystal the page ends on')

  // Committing to an answer flashes through the contour without changing
  // where the surface has actually got to.
  const surged = atQuiz(2 / 3, 1)
  assert.ok(surged.charge > atQuiz(2 / 3).charge, 'a surge brightens the contour')
  close(surged.finish, atQuiz(2 / 3).finish, 'a surge does not advance the surface')
  close(surged.surge, 1)

  // Everywhere else on the page the charge simply does not exist.
  for (const scroll of [layout.servicesTop + 100, layout.processTop + 3000]) {
    const frame = sampleJourneyFrame(scroll, layout, { level: 1, surge: 1 })
    close(frame.power, 0, 'the charge is absent outside the quiz')
    close(frame.surge, 0)
    close(frame.quiz, 0)
  }
  // The closing water composition always gets the finished mark, whether or
  // not the reader played along.
  const closing = sampleJourneyFrame(layout.closingTop + 200, layout, { level: 0, surge: 0 })
  close(closing.finish, 1, 'the closing mark is never left cold')
  close(closing.charge, .12)
  close(closing.quiz, 0, 'and can never be grabbed')
  assert.deepEqual(sampleJourneyFrame(layout.quizTop + 200, layout),
    atQuiz(0), 'omitting the charge entirely matches an unanswered quiz')
})

await test('the quiz charge sits behind the mark, follows it, and releases once', () => {
  const charge = createJourneyPower()
  const frame = (overrides = {}) => ({
    visible: 1, power: .66, surge: 0, centerX: .9, centerY: -.05, markWidth: .42, ...overrides,
  })
  charge.update(frame())
  assert.equal(charge.mesh.visible, true)
  assert.ok(charge.mesh.position.z < 0, 'the charge is a backlight, not a rim')
  assert.ok(charge.mesh.renderOrder < 0)
  assert.equal(charge.mesh.material.depthWrite, false)
  assert.equal(charge.mesh.material.premultipliedAlpha, true,
    'the canvas is transparent over the quiz panel, so additive blending would replace it')
  close(charge.mesh.position.x, .9)
  close(charge.mesh.position.y, -.05)
  const spread = charge.mesh.scale.x
  charge.update(frame({ markWidth: .84 }))
  close(charge.mesh.scale.x, spread * 2, 'the charge grows with the mark it sits behind')

  charge.update(frame({ power: 0 }))
  assert.equal(charge.mesh.visible, false, 'an unanswered quiz has no charge to show')
  charge.update(frame({ visible: 0 }))
  assert.equal(charge.mesh.visible, false)
  charge.update(frame({ surge: 1 }))
  close(charge.mesh.material.uniforms.uSurge.value, 1)
  charge.update(frame({ power: NaN, surge: Infinity, markWidth: NaN, centerX: NaN }))
  for (const [name, uniform] of Object.entries(charge.mesh.material.uniforms)) {
    assert.ok(Number.isFinite(uniform.value), `${name} stays finite`)
  }

  let disposals = 0
  charge.mesh.material.addEventListener('dispose', () => { disposals++ })
  charge.dispose()
  charge.dispose()
  assert.equal(disposals, 1, 'the charge releases its material exactly once')
  charge.update(frame())
  assert.equal(charge.mesh.visible, false, 'a disposed charge stays down')
})


/** A mesh whose world matrix is not the identity, so the sampler has to
 * actually transform what it reads rather than returning raw buffers. */
function placedBox(size = 2, offset = new three.Vector3(3, -1, .5)) {
  const mesh = new three.Mesh(new three.BoxGeometry(size, size, size))
  mesh.position.copy(offset)
  mesh.updateMatrixWorld(true)
  return mesh
}
const counter = (start = 1) => { let n = start; return () => (n = (n * 16807) % 2147483647) / 2147483647 }

await test('the charge field samples the real surface, weighted by area', () => {
  const box = placedBox()
  const points = sampleJourneySurface([box], 600, counter())
  assert.equal(points.length, 600)
  const bounds = new three.Box3().setFromObject(box).expandByScalar(1e-6)
  for (const point of points) {
    assert.ok(bounds.containsPoint(point.position), 'every mote lands on the authored mesh')
    close(point.normal.length(), 1, 'normals are usable for the settle offset')
  }

  // Two triangles, one a hundred times the area of the other: the sampler
  // must follow area, not vertex or triangle count, or the settled skin
  // would clump on whichever half happens to be more finely tessellated.
  const geometry = new three.BufferGeometry()
  geometry.setAttribute('position', new three.BufferAttribute(new Float32Array([
    0, 0, 0, 10, 0, 0, 0, 10, 0,
    100, 0, 0, 101, 0, 0, 100, 1, 0,
  ]), 3))
  geometry.computeVertexNormals()
  const mixed = new three.Mesh(geometry)
  mixed.updateMatrixWorld(true)
  const spread = sampleJourneySurface([mixed], 2000, counter(7))
  const onLarge = spread.filter(point => point.position.x < 50).length
  assert.ok(onLarge / 2000 > .95 && onLarge / 2000 < 1,
    `area weighting favours the large face (${onLarge} of 2000)`)

  // The field must be identical on every load, so nothing about the section
  // depends on which visit this is.
  const first = sampleJourneySurface([box], 40, counter(99))
  const second = sampleJourneySurface([box], 40, counter(99))
  assert.deepEqual(first.map(p => p.position.toArray()), second.map(p => p.position.toArray()))
  assert.throws(() => sampleJourneySurface([], 10, counter()),
    /no sampleable surface/, 'a mark with no geometry is a build failure, not a silent empty field')
})

await test('motes start loose around the mark and settle onto it as answers land', () => {
  const box = placedBox(2, new three.Vector3(0, 0, 0))
  const gather = createJourneyGather([box], new three.Vector3(0, 0, 0), 1, 500)
  const geometry = gather.points.geometry
  const surface = geometry.getAttribute('position')
  const scatter = geometry.getAttribute('aScatter')
  const normals = geometry.getAttribute('aNormal')
  assert.equal(surface.count, 500)
  assert.equal(scatter.count, 500)
  assert.equal(geometry.getAttribute('aSeed').count, 500)
  let loosest = 0, looseTotal = 0, settledTotal = 0
  for (let i = 0; i < surface.count; i++) {
    const settled = new three.Vector3().fromBufferAttribute(surface, i).length()
    const loose = new three.Vector3().fromBufferAttribute(scatter, i).length()
    assert.ok(Number.isFinite(settled) && Number.isFinite(loose))
    assert.ok(settled <= Math.sqrt(3) + 1e-6, 'settled motes sit on the mark')
    // Loose and settled positions are independent draws, so the claim is
    // about the cloud as a whole: nothing starts at the centre, and the
    // field as a whole sits well outside the mark it will settle onto.
    assert.ok(loose > .5, 'no mote starts inside the mark')
    loosest = Math.max(loosest, loose)
    looseTotal += loose
    settledTotal += settled
    close(new three.Vector3().fromBufferAttribute(normals, i).length(), 1)
  }
  assert.ok(loosest > 1.6, 'the loose cloud reaches well beyond the mark')
  assert.ok(looseTotal / surface.count > settledTotal / surface.count * 1.3,
    'the loose state is visibly a surrounding volume, not a blob on the mark')

  gather.update({ visible: 1, power: .33, surge: 0, time: 2, pixelRatio: 2 })
  assert.equal(gather.points.visible, true)
  const uniforms = gather.points.material.uniforms
  close(uniforms.uGather.value, .33)
  close(uniforms.uPixelRatio.value, 2)
  // Depth ordering is what makes the settled skin read as wrapped around a
  // solid object rather than floating in front of it.
  assert.ok(gather.points.renderOrder > 2, 'motes draw after the mark that occludes them')
  assert.equal(gather.points.material.depthTest, true)
  assert.equal(gather.points.material.depthWrite, false)
  assert.equal(gather.points.material.blending, three.AdditiveBlending,
    'motes are light added over pixels the mark has already composited')

  gather.update({ visible: 0, power: 1, surge: 1, time: 3, pixelRatio: 2 })
  assert.equal(gather.points.visible, false, 'the field is absent outside the quiz')
  gather.update({ visible: 1, power: NaN, surge: Infinity, time: NaN, pixelRatio: NaN })
  for (const [name, uniform] of Object.entries(uniforms)) {
    if (typeof uniform.value === 'number') {
      assert.ok(Number.isFinite(uniform.value), `${name} stays finite`)
    }
  }

  let disposals = 0
  gather.points.geometry.addEventListener('dispose', () => { disposals++ })
  gather.dispose()
  gather.dispose()
  assert.equal(disposals, 1, 'the field releases its buffers exactly once')
  gather.update({ visible: 1, power: 1, surge: 0, time: 4, pixelRatio: 1 })
  assert.equal(gather.points.visible, false, 'a disposed field stays down')
})
