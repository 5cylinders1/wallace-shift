import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test, beforeEach } from 'node:test'
import ts from 'typescript'

// Run the actual standalone TS module without adding a test framework/runtime.
const source = await readFile(new URL('../src/demos/roofers-2/estimateContext.ts', import.meta.url), 'utf8')
const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext } })
const { saveRoofEstimate, readRoofEstimate, clearRoofEstimate } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)
const key = 'estate-demo-roof-estimate-v1'
let saved
beforeEach(() => {
  saved = new Map()
  globalThis.sessionStorage = { getItem: name => saved.get(name) ?? null, setItem: (name, value) => saved.set(name, value), removeItem: name => saved.delete(name) }
})
const address = { formatted: '123 Example St, Kansas City, MO 64112', street: '123 Example St', city: 'Kansas City', state: 'MO', zip: '64112' }
const estimate = (source = 'outline') => ({ low: 15000, high: 20000, summary: 'A planning range', roof: {
  source, address: address.formatted, footprintSqFt: 2000, roofSqFt: 2236, squares: 23, pitch: 6, buildings: 1,
  confidence: 'High', measuredPitch: 5.8, measuredBy: 'google-solar', measuredAt: new Date().toISOString(), solar: { kw: 7, yearlyKwh: 10000 },
} })

test('an explicit save carries the address, estimate and provider provenance', () => {
  const value = estimate('measured')
  assert.equal(readRoofEstimate(), null)
  assert.equal(saved.size, 0)
  assert.equal(saveRoofEstimate(value, address), true)
  assert.deepEqual(readRoofEstimate().ballpark, value)
  assert.deepEqual(readRoofEstimate().address, address)
})

test('sample and home-size estimates never carry a property address', () => {
  for (const source of ['sample', 'home-size']) {
    assert.equal(saveRoofEstimate(estimate(source), address), true)
    assert.equal(readRoofEstimate().address, null)
    assert.equal(readRoofEstimate().ballpark.roof.address, null)
  }
})

test('unknown stored fields, including contact details, are not carried forward', () => {
  saveRoofEstimate(estimate(), { ...address, email: 'person@example.com' })
  const value = JSON.parse(saved.get(key))
  value.contact = { name: 'Person', phone: '555-0100' }
  value.ballpark.email = 'person@example.com'
  saved.set(key, JSON.stringify(value))
  const context = readRoofEstimate()
  assert.equal('contact' in context, false)
  assert.equal('email' in context.ballpark, false)
  assert.equal('email' in context.address, false)
})

test('expired or far-future estimates are removed', () => {
  for (const offset of [-25 * 60 * 60 * 1000, 60 * 60 * 1000]) {
    saveRoofEstimate(estimate(), address)
    const value = JSON.parse(saved.get(key))
    value.createdAt = new Date(Date.now() + offset).toISOString()
    saved.set(key, JSON.stringify(value))
    assert.equal(readRoofEstimate(), null)
    assert.equal(saved.has(key), false)
  }
})

test('malformed saved JSON is discarded', () => {
  saved.set(key, '{oops')
  assert.equal(readRoofEstimate(), null)
  assert.equal(saved.has(key), false)
})

test('invalid ranges, sources and roof quantities are rejected without stale data', () => {
  for (const value of [
    { ...estimate(), low: 25000 },
    { ...estimate(), high: Infinity },
    { ...estimate(), roof: { ...estimate().roof, source: 'made-up' } },
    { ...estimate(), roof: { ...estimate().roof, source: ['sample'] } },
    { ...estimate(), roof: { ...estimate().roof, buildings: 1.5 } },
    { ...estimate(), roof: { ...estimate().roof, roofSqFt: -1 } },
  ]) {
    saveRoofEstimate(estimate(), address)
    assert.equal(saveRoofEstimate(value, address), false)
    assert.equal(readRoofEstimate(), null)
  }
})

test('malformed stored nested values are rejected on read', () => {
  saveRoofEstimate(estimate(), address)
  const value = JSON.parse(saved.get(key))
  value.address.street = { unexpected: 'object' }
  saved.set(key, JSON.stringify(value))
  assert.equal(readRoofEstimate(), null)
})

test('clear removes only the estimator handoff', () => {
  saved.set('another-key', 'keep')
  saveRoofEstimate(estimate(), address)
  clearRoofEstimate()
  assert.equal(readRoofEstimate(), null)
  assert.equal(saved.get('another-key'), 'keep')
})

test('disabled browser storage is a safe, explicit failure', () => {
  globalThis.sessionStorage = { getItem() { throw Error('Disabled') }, setItem() { throw Error('Disabled') }, removeItem() { throw Error('Disabled') } }
  assert.equal(saveRoofEstimate(estimate(), address), false)
  assert.equal(readRoofEstimate(), null)
  assert.doesNotThrow(clearRoofEstimate)
})
