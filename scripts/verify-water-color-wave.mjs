/** Verify timing from the actual scalar GLSL functions. GPU appearance is separate. */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'
const source = await readFile(new URL('../src/components/experiments/water-hero/shaders/underwaterColor.ts', import.meta.url), 'utf8')
const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext } }).outputText
const { COLOR_WAVE, underwaterColorGLSL } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)
const smoothstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t) }
function scalarFunction(name) {
  const match = underwaterColorGLSL.match(new RegExp(`float ${name}\\(([^)]*)\\)\\s*\\{([^}]*)\\}`))
  assert.ok(match, `${name} remains an independently verifiable scalar function`)
  const args = match[1].split(',').map(arg => arg.trim().replace(/^float /, ''))
  const fn = new Function('smoothstep', ...args, match[2])
  return (...values) => fn(smoothstep, ...values)
}
const phase = scalarFunction('underwaterPhase'), front = scalarFunction('underwaterFront')
const fraction = value => value - Math.floor(value)
const pulse = (distance, time) => front(fraction(phase(distance, time)))

await test('the same light crest reaches successive depth layers after its physical travel delay', () => {
  for (const cycle of [0, 1, 25]) {
    const centerTime = (cycle + .08) * COLOR_WAVE.seconds
    assert.equal(pulse(0, centerTime), 1)
    for (const distance of [.5, 1, 2, 4, 6, 8]) {
      const arrival = centerTime + distance / COLOR_WAVE.speed
      assert.ok(Math.abs(phase(distance, arrival) - phase(0, centerTime)) < 1e-12)
      assert.equal(pulse(distance, arrival), 1)
      assert.ok(phase(distance, centerTime) < phase(0, centerTime), 'outer matter receives the front later')
    }
  }
})
await test('a held pose repeatedly pulses, with a faster attack and slower decay and no cycle flash', () => {
  assert.ok(COLOR_WAVE.release - COLOR_WAVE.peak > COLOR_WAVE.attack * 3)
  assert.equal(front(0), 0); assert.equal(front(1), 0)
  assert.equal(front(COLOR_WAVE.peak), 1)
  assert.equal(front(COLOR_WAVE.release), 0)
  for (let i = 0; i <= 1000; i++) {
    const value = front(i / 1000)
    assert.ok(Number.isFinite(value) && value >= 0 && value <= 1)
  }
  for (const distance of [0, 2, 5, 8]) {
    const boundary = 4 * COLOR_WAVE.seconds + distance / COLOR_WAVE.speed
    assert.ok(Math.abs(pulse(distance, boundary + 1e-5) - pulse(distance, boundary - 1e-5)) < 1e-6)
    for (const t of [0, .35, 1, 2, 3]) {
      assert.ok(Math.abs(pulse(distance, t) - pulse(distance, t + COLOR_WAVE.seconds)) < 1e-12)
    }
  }
})
await test('both particle populations bind the shared front to color and projected grain diameter', async () => {
  for (const component of ['UnderwaterBurst', 'UnderwaterFlow']) {
    const shader = await readFile(new URL(`../src/components/experiments/water-hero/${component}.tsx`, import.meta.url), 'utf8')
    assert.match(shader, /vec4 light = underwaterLight\([^;]+uColorOrigin, uTime\)/)
    assert.match(shader, /float pulseScale = mix\([^;]+light\.a\)/)
    assert.match(shader, /pulseScale[^;]+uPointScale/)
    assert.match(shader, /uColorOrigin[^\n]+set\(0, pose\.logoY \+ \.35, 0\)/)
    assert.match(shader, /toneMapped: false/, 'high-exposure logo lighting must not bleach the particle colors')
    assert.doesNotMatch(shader, /#include <tonemapping_fragment>/)
  }
  // These are per-grain light/size changes, not a swelling world volume.
  const canopy = await readFile(new URL('../src/components/experiments/water-hero/UnderwaterBurst.tsx', import.meta.url), 'utf8')
  assert.doesNotMatch(canopy.slice(canopy.indexOf('vec3 p = position;'), canopy.indexOf('vec4 view =')), /pulseScale|uColorOrigin/)
})
