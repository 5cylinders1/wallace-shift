/** Scroll/ambient motion contracts. Numeric trajectory checks cannot verify
 * final browser composition, material appearance, or GPU frame timing. */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

const source = await readFile(new URL('../src/components/HomeJourney/journeyFrictionMotion.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: {
  target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext,
} }).outputText
const { createJourneyFrictionMotion } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)

const state = (overrides = {}) => ({
  time: 0, width: 1280, height: 720, headerOffset: 83,
  baseX: 900, baseY: 260, logoWidth: 180, logoHeight: 100,
  copyRight: 640, copyBottom: 375,
  findWipe: 1, makeWipe: 0, makeEdge: 2, dock: 0, retire: 0, rise: 0,
  ...overrides,
})

const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)
function travel(controller, frames = 360, overrides = {}) {
  let pose
  for (let i = 0; i <= frames; i++) pose = controller.update(state({ ...overrides, time: i / 60 }))
  return pose
}
function freeze(controller) {
  const moving = travel(controller)
  const makeEdge = (moving.y + state().logoHeight / 2 - 2) / state().height
  const input = state({ time: 6.01, makeWipe: .25, makeEdge })
  return { pose: controller.update(input), input }
}

await test('Find assembly travels over time while staying inside the viewport and outside the copy', () => {
  const controller = createJourneyFrictionMotion()
  const input = state()
  const first = controller.update(input)
  let furthest = 0, previous = first
  let priorDx = 0, priorDy = 0, turns = 0
  for (let i = 1; i <= 1800; i++) {
    const pose = controller.update({ ...input, time: i / 60 })
    assert.ok([pose.x, pose.y, pose.yaw].every(Number.isFinite))
    assert.ok(pose.x - input.logoWidth / 2 >= 0 && pose.x + input.logoWidth / 2 <= input.width,
      'the moving logo never runs off the left or right of the viewport')
    assert.ok(pose.y - input.logoHeight / 2 >= input.headerOffset
      && pose.y + input.logoHeight / 2 <= input.height,
    'the moving logo stays below navigation and above the viewport bottom')
    assert.ok(pose.x - input.logoWidth / 2 >= input.copyRight
      || pose.y - input.logoHeight / 2 >= input.copyBottom,
    'the assembly does not pass over the upper-left process copy')
    furthest = Math.max(furthest, distance(first, pose))
    const dx = pose.x - previous.x, dy = pose.y - previous.y
    if (priorDx * dx < 0 || priorDy * dy < 0) turns++
    if (Math.abs(dx) > 1e-6) priorDx = dx
    if (Math.abs(dy) > 1e-6) priorDy = dy
    previous = pose
  }
  assert.ok(furthest > input.logoWidth * .25, 'Find motion changes the position substantially, not just the material')
  assert.ok(turns > 0, 'the assembly redirects at its safe travel boundaries')
})

await test('the Make edge freezes the current assembly and time cannot move it during the wipe', () => {
  const controller = createJourneyFrictionMotion()
  const { pose: held, input } = freeze(controller)
  for (const progress of [.3, .5, .8, 1]) {
    const pose = controller.update({ ...input, time: 20 + progress * 30,
      makeWipe: progress, makeEdge: input.makeEdge * (1 - progress), dock: 0 })
    assert.ok(distance(pose, held) < 1e-7, 'the skin wipe must not chase a moving silhouette')
    assert.ok(Math.abs(pose.yaw - held.yaw) < 1e-7, 'the orientation also holds during the skin change')
  }
  for (const progress of [.8, .5, .2, .01]) {
    const pose = controller.update({ ...input, time: 80 + progress,
      makeWipe: progress, makeEdge: 1 - progress, dock: 0 })
    assert.ok(distance(pose, held) < 1e-7,
      'reversing the wipe uncovers the originally captured position instead of restarting the bounce')
    assert.ok(Math.abs(pose.yaw - held.yaw) < 1e-7)
  }
})

await test('post-wipe docking is controlled by scroll, reversible, and ends at the right-hand vertical center', () => {
  const controller = createJourneyFrictionMotion()
  const { pose: held, input } = freeze(controller)
  const samples = new Map()
  for (const dock of [0, .25, .5, .75, 1]) {
    const pose = controller.update({ ...input, time: 8 + dock,
      makeWipe: 1, makeEdge: -.1, dock })
    samples.set(dock, pose)
  }
  assert.ok(distance(samples.get(0), held) < 1e-7, 'docking begins exactly at the frozen assembly position')
  const end = samples.get(1)
  assert.ok(Math.abs(end.y - (input.headerOffset + input.height) / 2) < 1e-7,
    'the settled logo is vertically centered beneath the navigation')
  assert.ok(end.x > input.width / 2, 'the settled composition reserves the left side for copy')
  assert.ok(Math.abs(end.yaw) < 1e-7, 'the docked logo settles straight on')
  for (const dock of [1, .75, .5, .25, 0]) {
    const pose = controller.update({ ...input, time: 60 + dock,
      makeWipe: 1, makeEdge: -.1, dock })
    const expected = samples.get(dock)
    assert.ok(distance(pose, expected) < 1e-7, 'reverse scrolling reconstructs the same dock position')
    assert.ok(Math.abs(pose.yaw - expected.yaw) < 1e-7)
  }
})

await test('reversing Find carries the current bouncing pose smoothly back to the blueprint anchor', () => {
  const controller = createJourneyFrictionMotion()
  const moving = travel(controller)
  const input = state()
  assert.ok(distance(moving, { x: input.baseX, y: input.baseY }) > 1,
    'the regression must start away from the original blueprint position')
  const nearBoundary = controller.update({ ...input, time: 6.01, findWipe: .998 })
  assert.ok(distance(nearBoundary, moving)
    < distance(moving, { x: input.baseX, y: input.baseY }) * .01,
  'starting the reverse wipe must not snap straight to the blueprint anchor')
  for (const progress of [.75, .5, .25, .01, .25, .5, .75]) {
    const pose = controller.update({ ...input, time: 20 + progress, findWipe: progress })
    const expected = {
      x: input.baseX + (moving.x - input.baseX) * progress,
      y: input.baseY + (moving.y - input.baseY) * progress,
    }
    assert.ok(distance(pose, expected) < 1e-7,
      'the reverse wipe uses the captured bounce location and the current scroll progress')
    assert.ok(Math.abs(pose.yaw - moving.yaw * progress) < 1e-7)
  }
  const reset = controller.update({ ...input, time: 40, findWipe: 0 })
  assert.deepEqual(reset, { x: input.baseX, y: input.baseY, yaw: 0, rise: 0 },
    'fully returning to the blueprint resets the exact anchored pose')
})

await test('retirement hands back the supplied base pose and returning before Find resets the motion', () => {
  const controller = createJourneyFrictionMotion()
  freeze(controller)
  const retired = state({ time: 20, makeWipe: 1, makeEdge: -.1, dock: 1,
    retire: 1, baseX: 780, baseY: 395 })
  const restored = controller.update(retired)
  assert.ok(Math.abs(restored.x - retired.baseX) < 1e-7)
  assert.ok(Math.abs(restored.y - retired.baseY) < 1e-7)
  assert.ok(Math.abs(restored.yaw) < 1e-7)
  const before = state({ time: 21, findWipe: 0, baseX: 900, baseY: 260 })
  const reset = controller.update(before)
  assert.deepEqual(reset, { x: before.baseX, y: before.baseY, yaw: 0, rise: 0 })
  const fresh = createJourneyFrictionMotion()
  fresh.update(before)
  for (let i = 0; i < 180; i++) {
    const input = state({ time: 21 + i / 60 })
    assert.deepEqual(controller.update(input), fresh.update(input),
      're-entering Find cannot inherit an earlier frozen or docked location')
  }
})
