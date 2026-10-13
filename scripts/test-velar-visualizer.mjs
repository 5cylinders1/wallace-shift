import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'

// Exercise the production math without adding a test framework or browser dependency.
async function loadTypeScript(relativePath) {
  const source = await readFile(new URL(relativePath, import.meta.url), 'utf8')
  const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } })
  return import(`data:text/javascript;charset=utf-8,${encodeURIComponent(outputText)}`)
}

const geometry = await loadTypeScript('../src/demos/roofers-5/projective.ts')
const pricing = await loadTypeScript('../src/demos/roofers-5/materials.ts')
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} should equal ${expected}`)

test('a perspective mapping reaches all four visitor-specified anchors', () => {
  const quad = [{ x: 0.1, y: 0.9 }, { x: 0.9, y: 0.8 }, { x: 0.72, y: 0.1 }, { x: 0.31, y: 0.2 }]
  assert.equal(geometry.validPerspective(quad), true)
  const map = geometry.squareToQuad(quad)
  for (const [index, [u, v]] of [[0, [0, 0]], [1, [1, 0]], [2, [1, 1]], [3, [0, 1]]]) {
    close(map(u, v).x, quad[index].x); close(map(u, v).y, quad[index].y)
  }
})

test('distant material courses shrink in a projective rectangle', () => {
  const map = geometry.squareToQuad([{ x: 0, y: 1 }, { x: 1, y: 1 }, { x: 0.8, y: 0 }, { x: 0.2, y: 0 }])
  const nearWidth = map(1, 0.2).x - map(0, 0.2).x
  const farWidth = map(1, 0.8).x - map(0, 0.8).x
  assert.ok(nearWidth > farWidth)
  assert.ok(Math.abs(map(0.5, 0.5).y - 0.5) > 0.05, 'mid-slope interpolation should be projective, not a flat stamp')
})

test('hip cuts do not cause material seams to converge at the apex', () => {
  const quad = [{ x: 0, y: 1 }, { x: 1, y: 1 }, { x: 0.5, y: 0 }, { x: 0.5, y: 0 }]
  assert.equal(geometry.suggestedMode(quad), 'parallel')
  const map = geometry.parallelMap(quad)
  close(map(1, 0).x - map(0, 0).x, map(1, 1).x - map(0, 1).x)
  close(map(0.5, 1).x, 0.5); close(map(0.5, 1).y, 0)
})

test('uncrossed outlines accept concave chimney detours and reject invalid planes', () => {
  assert.equal(geometry.validOutline([{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0.6, y: 0.6 }, { x: 0, y: 1 }]), true)
  assert.equal(geometry.validOutline([{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 1, y: 0 }, { x: 0, y: 0.8 }]), false)
  assert.equal(geometry.validOutline([{ x: 0, y: 0 }, { x: 1.1, y: 0 }, { x: 0.5, y: 1 }]), false)
  assert.equal(geometry.validOutline([{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0.5, y: 0 }]), false)
  assert.equal(geometry.validPerspective([{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0.3, y: 0.3 }, { x: 0, y: 1 }]), false)
})

test('the physical roof slope uses rise over 12 and keeps texture density tied to pitch', () => {
  close(geometry.roofSlopeLength(12, 5), 13)
  close(geometry.roofSlopeLength(12, 12), Math.sqrt(288))
  assert.ok(geometry.roofSlopeLength(18, 12) > geometry.roofSlopeLength(18, 4))
})

test('the estimate uses declared roof area and complexity, with bounded invalid inputs', () => {
  assert.deepEqual(pricing.planningRange('slate', 3200, 'articulated'), [94500, 170000])
  assert.deepEqual(pricing.planningRange('standing-seam', 3200, 'estate'), [71500, 125500])
  assert.deepEqual(pricing.planningRange('cedar', -25, 'simple'), [0, 0])
  assert.deepEqual(pricing.planningRange('slate', Number.NaN, 'estate'), [0, 0])
  assert.deepEqual(pricing.planningRange('clay', 50000, 'simple'), [720000, 1400000])
})
