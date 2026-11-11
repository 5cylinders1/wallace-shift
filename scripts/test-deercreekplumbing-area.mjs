/** Local lookup regressions. No geocoding requests or customer data leave this test. */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { dirname, extname, resolve } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const root = fileURLToPath(new URL('../', import.meta.url))
const modules = new Map()
async function compileModule(path) {
  const absolute = resolve(root, path)
  if (modules.has(absolute)) return modules.get(absolute)
  let javascript = ts.transpileModule(await readFile(absolute, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext },
  }).outputText
  for (const match of [...javascript.matchAll(/from (['"])([^'"]+)\1/g)]) {
    const target = await compileModule(resolve(dirname(absolute), match[2] + (extname(match[2]) ? '' : '.ts')))
    javascript = javascript.replace(match[0], `from ${JSON.stringify(target)}`)
  }
  const url = `data:text/javascript;base64,${Buffer.from(javascript).toString('base64')}`
  modules.set(absolute, url)
  return url
}

const { lookupServiceArea, locationMessage } = await import(await compileModule('src/demos/deercreekplumbing/serviceArea.ts'))
const { zipPoints, placePoints } = await import(await compileModule('src/demos/deercreekplumbing/serviceAreaData.ts'))

test('66085 is recognized, including whitespace and ZIP+4, without promising coverage', () => {
  const result = lookupServiceArea('66085')
  assert.equal(result.kind, 'found')
  assert.equal(result.zip, '66085')
  assert.match(result.label, /Overland Park \/ Stilwell, KS/)
  assert.equal(result.named, false)
  assert.match(result.detail, /office confirms service for your exact address/)
  assert.deepEqual(lookupServiceArea(' 66085 '), result)
  assert.deepEqual(lookupServiceArea('66085-1234'), result)
  assert.deepEqual(lookupServiceArea('６６０８５'), result)
  assert.doesNotMatch(result.detail, /outside|not in|guarantee|radius|miles|same day/i)
})

test('regional ZIPs and town/state pairs all resolve without a tiny coverage whitelist', () => {
  assert.ok(zipPoints.length > 100)
  assert.ok(placePoints.length > 100)
  for (const [zip] of zipPoints) assert.equal(lookupServiceArea(zip).kind, 'found', zip)
  for (const [name, state] of placePoints) {
    const result = lookupServiceArea(`${name}, ${state}`)
    assert.equal(result.kind, 'found', `${name}, ${state}`)
    assert.equal(result.label, `${name}, ${state}`)
  }
})

test('town input tolerates common punctuation, capitalization, spacing, and state names', () => {
  const examples = [
    ['  oLaThE,   kAnSaS ', 'Olathe, KS'],
    ['Overland   Park KS', 'Overland Park, KS'],
    ['Lee’s Summit, Missouri', "Lee's Summit, MO"],
    ['Lees Summit MO', "Lee's Summit, MO"],
    ['Desoto, K.S.', 'De Soto, KS'],
    ['KCK', 'Kansas City, KS'],
    ['K.C.M.O.', 'Kansas City, MO'],
    ['Stilwell', 'Stilwell, KS'],
    ['Stilwell, Kansas', 'Stilwell, KS'],
  ]
  for (const [input, expected] of examples) {
    const result = lookupServiceArea(input)
    assert.equal(result.kind, 'found', input)
    assert.equal(result.label, expected, input)
  }
})

test('ambiguous Kansas City asks for the state and each choice is independently resolvable', () => {
  for (const input of ['Kansas City', 'KC', 'K.C.']) {
    const result = lookupServiceArea(input)
    assert.equal(result.kind, 'choose', input)
    assert.deepEqual(result.options.map(option => option.label), ['Kansas City, KS', 'Kansas City, MO'])
    for (const option of result.options) assert.equal(lookupServiceArea(option.value).label, option.label)
  }
  assert.equal(lookupServiceArea('Kansas City, Missouri').label, 'Kansas City, MO')
  assert.equal(lookupServiceArea('Kansas City Kansas').label, 'Kansas City, KS')
  assert.equal(lookupServiceArea('KCK, MO').kind, 'invalid')
  assert.equal(lookupServiceArea('KCMO, KS').kind, 'invalid')
})

test('empty, malformed, and unrecognized inputs get distinct actionable responses', () => {
  for (const input of ['', ' \n\t ']) assert.equal(lookupServiceArea(input).kind, 'empty')
  for (const input of ['6608', '660850', '66085-123', '66085-12345', '66085abc', '123 Olathe', 'Olathe, KS, USA', 'Olathe, XX', '<script>', 'a'.repeat(81)]) {
    assert.equal(lookupServiceArea(input).kind, 'invalid', input)
  }
  for (const input of ['90210', 'New York', 'Stilwell, MO', 'Nonexistentville']) {
    const result = lookupServiceArea(input)
    assert.equal(result.kind, 'unknown', input)
    assert.match(result.detail, /[Cc]all/)
    assert.doesNotMatch(result.detail, /outside.*service|do not serve|not covered/i)
  }
})

test('only advertised towns are called named, and booking copy uses the same lookup', () => {
  assert.equal(lookupServiceArea('Olathe').named, true)
  assert.equal(lookupServiceArea('Paola').named, true)
  assert.equal(lookupServiceArea('Louisburg').named, true)
  assert.equal(lookupServiceArea('Overland Park').named, false)
  assert.equal(lookupServiceArea('Stilwell').named, false)
  assert.match(locationMessage('66085'), /Overland Park \/ Stilwell, KS.*office confirms/)
  assert.match(locationMessage('Kansas City'), /Which location.*Choose the matching town and state/)
  assert.match(locationMessage(''), /Enter your town or ZIP code/)
})
