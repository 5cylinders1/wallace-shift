/** Pure URL/preset checks; does not claim browser layout verification. */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

async function sourceModule(file, replacements = []) {
  let source = await readFile(new URL(`../src/components/experiments/water-hero/${file}.ts`, import.meta.url), 'utf8')
  for (const [from, to] of replacements) source = source.replace(from, to)
  const js = ts.transpileModule(source, { compilerOptions: {
    target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext,
  } }).outputText
  return `data:text/javascript;base64,${Buffer.from(js).toString('base64')}`
}

const configUrl = await sourceModule('waterHeroConfig')
const { PREFERRED_LOGO_APPEARANCE, PREVIEW_LOGO_APPEARANCE, HOMEPAGE_LOGO_APPEARANCE } = await import(configUrl)
const { readLogoAppearance, logoAppearanceUrl } = await import(await sourceModule('logoAppearance', [
  ["from './waterHeroConfig'", `from '${configUrl}'`],
]))

await test('LED remains preferred while absent and unsupported selections open the glass preview', () => {
  assert.equal(PREFERRED_LOGO_APPEARANCE, 'led')
  assert.equal(PREVIEW_LOGO_APPEARANCE, 'glass')
  assert.equal(HOMEPAGE_LOGO_APPEARANCE, 'studio')
  for (const search of ['', '?quality=low', '?look=', '?look=unknown', '?look=GLASS']) {
    assert.equal(readLogoAppearance(search), 'glass', search)
  }
  for (const look of ['led', 'electric', 'glass', 'chrome', 'frosted', 'pearl', 'copper', 'mercury', 'cutlight', 'studio']) {
    assert.equal(readLogoAppearance(`?progress=.68&look=${look}`), look)
  }
})

await test('switching each look retains the current route, pinned pose, query values and fragment', () => {
  const original = new URL('https://example.test/experiments/water-hero?progress=0.68&quality=low&debug=1&channel=2&tag=a&tag=b&note=deep%20blue#held-pose')
  const preserved = [...original.searchParams]
  let current = original
  for (const look of ['glass', 'led', 'electric', 'chrome', 'frosted', 'pearl', 'copper', 'mercury', 'cutlight', 'studio', 'glass', 'led']) {
    const result = logoAppearanceUrl(current.href, look)
    assert.ok(result.startsWith('/experiments/water-hero?'), 'replaceState receives the current relative route')
    current = new URL(result, original.origin)
    assert.equal(current.origin, original.origin)
    assert.equal(current.pathname, original.pathname)
    assert.equal(current.hash, original.hash)
    assert.deepEqual([...current.searchParams].filter(([key]) => key !== 'look'), preserved)
    assert.deepEqual(current.searchParams.getAll('look'), [look])
    assert.equal(readLogoAppearance(current.search), look)
  }
})

await test('replacing a selection collapses duplicate look keys without altering unrelated duplicates', () => {
  const result = new URL(logoAppearanceUrl('https://example.test/experiments/water-hero?look=led&tag=a&look=electric&tag=b#stars', 'glass'), 'https://example.test')
  assert.deepEqual(result.searchParams.getAll('look'), ['glass'])
  assert.deepEqual(result.searchParams.getAll('tag'), ['a', 'b'])
  assert.equal(result.hash, '#stars')
  assert.equal(logoAppearanceUrl(result.href, 'glass'), `${result.pathname}${result.search}${result.hash}`)
})
