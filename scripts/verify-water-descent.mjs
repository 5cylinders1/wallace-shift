/** Run with `node scripts/verify-water-descent.mjs`. No browser or new dependencies.
 * Verifies motion contracts and DOM visibility; it does not validate rendered optics.
 */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import * as nodeModule from 'node:module'
import test from 'node:test'
import { Euler, PerspectiveCamera, Vector3 } from 'three'

async function sourceModule(relativePath, replacements = []) {
  let source = await readFile(new URL(relativePath, import.meta.url), 'utf8')
  for (const [before, after] of replacements) source = source.replace(before, after)
  const javascript = typeof nodeModule.stripTypeScriptTypes === 'function'
    ? nodeModule.stripTypeScriptTypes(source)
    : (await import('typescript')).transpileModule(source, {
      compilerOptions: { target: 9, module: 7 }, // ES2022, ES2022
    }).outputText
  return `data:text/javascript;base64,${Buffer.from(javascript).toString('base64')}`
}

const directorUrl = await sourceModule('../src/components/experiments/water-hero/sceneDirector.ts')
const { sampleDescent, DESCENT_POSES, TURN_END, SPLIT_START, SPLIT_END } = await import(directorUrl)
const radians = Math.PI / 180
const close = (actual, expected, message, tolerance = 1e-10) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${message}: ${actual} vs ${expected}`)
const bounded = (value, min, max, message) =>
  assert.ok(Number.isFinite(value) && value >= min - 1e-10 && value <= max + 1e-10, `${message}: ${value}`)
const motion = pose => [pose.logoY, pose.yaw, pose.pitch, ...pose.camera, ...pose.target]

await test('authored beats retain synchronized height and rotation with wider submerged framing', () => {
  const submergedZ = new Map([[.54, 6.7], [.68, 6.7]])
  DESCENT_POSES.forEach((key, index) => {
    if (index) assert.ok(key.at > DESCENT_POSES[index - 1].at)
    const actual = sampleDescent(key.at)
    close(actual.logoY, key.logoY, `logo Y at ${key.at}`)
    close(actual.yaw, key.yaw * radians, `yaw at ${key.at}`)
    close(actual.pitch, key.pitch * radians, `pitch at ${key.at}`)
    const z = key.at <= .25 ? DESCENT_POSES[0].camera[2]
      : key.at >= TURN_END ? 7.35 : submergedZ.get(key.at) ?? key.camera[2]
    close(actual.camera[2], z, `camera standoff at ${key.at}`)
    close(actual.camera[1], key.camera[1], `unchanged camera height at ${key.at}`)
    close(actual.camera[0] / z, key.at <= .25 ? 0 : key.camera[0] / key.camera[2], `camera azimuth at ${key.at}`)
  })
})

await test('the opening holds exactly, joins smoothly, and preserves the accepted crossing path', () => {
  for (const aspect of [.25, 390 / 844, .75, 16 / 9, 2.4]) {
    const opening = sampleDescent(0, aspect)
    for (let i = 0; i <= 250; i++) {
      const pose = sampleDescent(i / 1000, aspect)
      assert.deepEqual(motion(pose), motion(opening), `stationary reveal at ${i / 1000}/${aspect}`)
    }
  }
  // At the midpoint of the release, the camera is halfway from its opening
  // pose to the preserved pre-reveal .30 camera. The logo descent is unchanged.
  const acceptedAt30 = [.06608343887655617, .12000000000000001, 6.835358218791188]
  sampleDescent(.30).camera.forEach((coordinate, axis) => {
    close(coordinate, (sampleDescent(0).camera[axis] + acceptedAt30[axis]) * .5, `continuous release axis ${axis}`)
  })
  for (const [p, camera] of [
    [.35, [.12, .14, 5.7]],
    [.40, [.19832222572291877, .12328785811732604, 4.688147472312987]],
    [.43, [.24, .10, 4.3]],
  ]) {
    sampleDescent(p).camera.forEach((coordinate, axis) => close(coordinate, camera[axis], `accepted approach at ${p}/${axis}`))
  }
  for (const aspect of [.25, 390 / 844, .75, 16 / 9, 2.4]) {
    close(sampleDescent(.445, aspect).camera[1], .05323937090228231, `upper crossing at ${aspect}`)
    close(sampleDescent(.46, aspect).camera[1], -.05004681464809602, `lower crossing at ${aspect}`)
    close(sampleDescent(.46, aspect).underwater, .7185694606363517, `medium timing at ${aspect}`)
    assert.ok(sampleDescent(.54, aspect).camera[2] >= 6.7 - 1e-10, `room for underwater matter at ${aspect}`)
  }
})

await test('identity stays intact, the logo remains upright, and turning waits for full submersion', () => {
  for (let i = 0; i <= 10_000; i++) {
    const p = i / 10_000
    const pose = sampleDescent(p)
    close(pose.pitch, 0, `upright logo throughout descent and split at ${p}`)
    if (p <= .25) {
      close(pose.logoY, .54, `identity height at ${p}`)
      close(pose.yaw, 0, `identity yaw at ${p}`)
    }
    if (p <= .43) close(pose.yaw, 0, `no crossing spin at ${p}`)
    // The reviewed mark is approximately 1.10 world units high. This
    // conservative envelope checks that its top has cleared the water.
    if (pose.yaw > 1e-8) assert.ok(pose.logoY + .55 < 0, `turn before fully submerged at ${p}`)
  }
})

await test('one half-turn stays lit and settles at exactly 180 degrees', () => {
  let previousYaw = 0
  for (let i = 0; i <= 10_000; i++) {
    const p = i / 10_000
    const pose = sampleDescent(p)
    assert.ok(pose.yaw >= previousYaw - 1e-12, `rotation reverses at ${p}`)
    close(pose.lightLevel, 1, `readable light throughout the turn and reveal at ${p}`)
    if (p >= TURN_END) close(pose.yaw, Math.PI, `completed half-turn holds at ${p}`)
    previousYaw = pose.yaw
  }
  assert.ok(sampleDescent(TURN_END - .001).yaw < Math.PI, 'the turn completes at its authored ending')
  close(sampleDescent(TURN_END).yaw - sampleDescent(.43).yaw, Math.PI, 'exactly one half-turn')
})

await test('samples remain finite and bounded without channel overshoot', () => {
  for (const aspect of [.25, .5, .75, 1, 16 / 9, 2.4]) {
    for (let i = -100; i <= 1100; i++) {
      const p = i / 1000
      const pose = sampleDescent(p, aspect)
      bounded(pose.logoY, -4.15, .56, `height ${p}/${aspect}`)
      bounded(pose.yaw, 0, Math.PI, `yaw ${p}/${aspect}`)
      close(pose.pitch, 0, `upright pitch ${p}/${aspect}`)
      for (const name of ['progress', 'underwater', 'tension', 'particles', 'particleDepth', 'extinction', 'edgeLight', 'shimmerLight', 'lightLevel', 'blackout', 'split']) {
        bounded(pose[name], 0, 1, `${name} ${p}/${aspect}`)
      }
      assert.ok(motion(pose).every(Number.isFinite), `finite transform ${p}/${aspect}`)
      assert.deepEqual(pose.target, [0, pose.logoY, 0], `camera follows the mark throughout the reveal at ${p}/${aspect}`)
    }
  }
  assert.deepEqual(sampleDescent(-10), sampleDescent(0))
  assert.deepEqual(sampleDescent(10), sampleDescent(1))
})

await test('camera and logo velocities are continuous across every authored boundary', () => {
  const epsilon = 1e-6
  // This aspect makes the portrait minimum meet a camera key exactly,
  // exposing a derivative discontinuity from a hard max framing clamp.
  const framingBoundaryAspect = 2 / (2 * Math.tan(16 * radians) * .72 * 4.15)
  for (const aspect of [.5, .75, 1, framingBoundaryAspect, 16 / 9, 2.4]) {
    // The split must also ease into and out of its movement independently.
    const channels = pose => [...motion(pose), pose.split]
    for (const at of [...new Set([...DESCENT_POSES.map(key => key.at), SPLIT_START, SPLIT_END])]) {
      const before = channels(sampleDescent(at - epsilon, aspect))
      const current = channels(sampleDescent(at, aspect))
      const after = channels(sampleDescent(at + epsilon, aspect))
      current.forEach((_, channel) => {
        const left = (current[channel] - before[channel]) / epsilon
        const right = (after[channel] - current[channel]) / epsilon
        close(left, right, `velocity channel ${channel} at ${at}, aspect ${aspect}`, .005)
      })
    }
  }
})

await test('stop, reverse and arbitrary scroll jumps reconstruct the same transforms', () => {
  const checkpoints = [0, .14, .25, .349, .40, .43, .477, .54, .68, SPLIT_START, TURN_END, .86, .891, SPLIT_END, 1]
  const expected = checkpoints.map(p => sampleDescent(p, .5625))
  for (const index of [14, 2, 10, 1, 7, 0, 5, 9, 4, 8, 6, 3, 11, 13, 12]) {
    const current = sampleDescent(checkpoints[index], .5625)
    assert.deepEqual(current, expected[index], `jump to ${checkpoints[index]}`)
    assert.deepEqual(sampleDescent(checkpoints[index], .5625), current, 'held sample')
  }
  for (let i = checkpoints.length - 1; i >= 0; i--) {
    assert.deepEqual(sampleDescent(checkpoints[i], .5625), expected[i])
  }
})

await test('desktop and portrait cameras keep the mark inside the viewport', () => {
  // Project a conservative envelope of the reviewed 2 x 1.10 mark,
  // including thickness, using the actual Three camera mathematics.
  for (const aspect of [.25, 390 / 844, 768 / 1024, 1, 16 / 9, 2.4]) {
    for (let i = 0; i <= Math.round(SPLIT_START * 100); i++) {
      const pose = sampleDescent(i / 100, aspect)
      const camera = new PerspectiveCamera(32, aspect, .025, 400)
      camera.position.set(...pose.camera)
      camera.lookAt(...pose.target)
      camera.updateMatrixWorld()
      const rotation = new Euler(pose.pitch, pose.yaw, 0, 'YXZ')
      const corners = []
      for (const x of [-1, 1]) for (const y of [-.55, .55]) for (const z of [-.12, .12]) {
        const point = new Vector3(x, y, z).applyEuler(rotation)
        point.y += pose.logoY
        point.project(camera)
        corners.push(point)
        bounded(point.x, -.85, .85, `horizontal framing at ${i / 100}/${aspect}`)
        bounded(point.y, -.85, .85, `vertical framing at ${i / 100}/${aspect}`)
        bounded(point.z, -1, 1, `clip depth at ${i / 100}/${aspect}`)
      }
      if (i === 0 && aspect < 1) {
        const width = (Math.max(...corners.map(v => v.x)) - Math.min(...corners.map(v => v.x))) / 2
        bounded(width, aspect < .55 ? .64 : .50, .76, `portrait identity width at ${aspect}`)
      }
    }
  }
})

await test('camera and logo settle before the split and stay readable throughout the reveal', () => {
  assert.ok(SPLIT_START > TURN_END, 'the completed half-turn settles before splitting')
  for (const aspect of [.25, 390 / 844, .75, 16 / 9, 2.4]) {
    const held = sampleDescent(TURN_END, aspect)
    close(held.camera[0], 0, `final camera has no lateral angle at ${aspect}`)
    close(held.camera[1], held.logoY, `final camera is level with the logo at ${aspect}`)
    close(held.yaw, Math.PI, `final logo faces the straight-on camera at ${aspect}`)
    for (let i = 800; i <= 1000; i++) {
      const pose = sampleDescent(i / 1000, aspect)
      motion(pose).forEach((value, channel) => close(value, motion(held)[channel], `held pose at ${i / 1000}/${aspect}/${channel}`))
      assert.equal(pose.blackout, 0, 'no opaque veil covers the revealed header')
      assert.equal(pose.extinction, 0, 'metal remains readable while parting')
      assert.equal(pose.lightLevel, 1)
      assert.equal(pose.shimmerLight, 1)
      assert.equal(pose.edgeLight, 0)
    }
  }
})

await test('split progress is bounded, monotonic, and reversible without hiding the environment', () => {
  assert.equal(sampleDescent(SPLIT_START).split, 0)
  assert.equal(sampleDescent(SPLIT_END).split, 1)
  const samples = []
  let previous = 0
  for (let i = 0; i <= 1000; i++) {
    const p = i / 1000, pose = sampleDescent(p)
    assert.ok(pose.split >= previous, `split cannot reverse while scrolling down at ${p}`)
    if (p <= SPLIT_START) assert.equal(pose.split, 0)
    if (p >= SPLIT_END) assert.equal(pose.split, 1)
    assert.equal(pose.blackout, 0)
    samples.push(pose.split)
    previous = pose.split
  }
  for (let i = 1000; i >= 0; i--) assert.equal(sampleDescent(i / 1000).split, samples[i], `reverse split at ${i / 1000}`)
  assert.ok(sampleDescent(.86).particles > 0, 'matter surrounds the parting logo')
  let previousParticles = sampleDescent(.86).particles
  for (let i = 861; i <= 1000; i++) {
    const particles = sampleDescent(i / 1000).particles
    assert.ok(particles <= previousParticles + 1e-12, 'matter settles gently during the reveal')
    assert.ok(previousParticles - particles < .02, 'matter cannot disappear abruptly')
    previousParticles = particles
  }
})

await test('hidden hero controls lose focus and reverse restores their accessibility', async () => {
  const openingUrl = await sourceModule('../src/components/experiments/water-hero/openingReveal.ts')
  const uiUrl = await sourceModule('../src/components/experiments/water-hero/heroUiProgress.ts', [
    ["from './sceneDirector'", `from '${directorUrl}'`],
    ["from './openingReveal'", `from '${openingUrl}'`],
  ])
  const { applyHeroUiProgress } = await import(uiUrl)
  const focused = { blur() { globalThis.document.activeElement = null } }
  const element = dataset => ({ dataset, style: {}, inert: false, attributes: {},
    setAttribute(name, value) { this.attributes[name] = value },
    contains(candidate) { return candidate === focused },
  })
  const header = element({ inStart: '-1', inEnd: '0', outStart: '.25', outEnd: '.35', shift: '0' })
  const copy = element({ inStart: '-1', inEnd: '0', outStart: '.25', outEnd: '.35' })
  const root = { querySelectorAll: () => [header, copy], querySelector: () => null }
  const previousDocument = globalThis.document
  globalThis.document = { activeElement: focused }
  try {
    applyHeroUiProgress(root, 0, false)
    assert.equal(header.style.opacity, '1')
    assert.equal(copy.style.opacity, '1')
    applyHeroUiProgress(root, .25, false)
    assert.equal(copy.style.opacity, '1', 'finished headline holds until the camera release')
    applyHeroUiProgress(root, .35, false)
    assert.equal(header.inert, true)
    assert.equal(header.style.visibility, 'hidden')
    assert.equal(copy.attributes['aria-hidden'], 'true')
    assert.equal(globalThis.document.activeElement, null)
    applyHeroUiProgress(root, SPLIT_END, false)
    assert.equal(header.inert, true)
    applyHeroUiProgress(root, .1, false)
    assert.equal(header.inert, false)
    assert.equal(header.style.visibility, 'visible')
    applyHeroUiProgress(root, 1, true)
    assert.equal(copy.style.opacity, '1')
    assert.equal(header.inert, false)
  } finally {
    if (previousDocument === undefined) delete globalThis.document
    else globalThis.document = previousDocument
  }
})
