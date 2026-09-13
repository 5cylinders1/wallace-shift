/** Route, accessibility, and retained-file checks only; no browser rendering. */
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'
import { renderToStaticMarkup } from 'react-dom/server'

const root = new URL('../', import.meta.url)
const read = path => readFile(new URL(path, root), 'utf8')
const dataUrl = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`
async function moduleUrl(path, dependencies = {}) {
  let source = await read(path)
  for (const [name, url] of Object.entries(dependencies)) source = source.replaceAll(`from '${name}'`, `from '${url}'`)
  source = source.replace(/^import '\.\/[^']+\.css'\n/gm, '')
  return dataUrl(ts.transpileModule(source, { compilerOptions: {
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.ESNext,
    jsx: ts.JsxEmit.ReactJSX,
  } }).outputText.replaceAll('"react/jsx-runtime"', JSON.stringify(import.meta.resolve('react/jsx-runtime'))))
}

const routesUrl = await moduleUrl('src/content/routeMeta.ts')
const { PIT_STOP_EXPERIMENT_PATH, routeMeta, navRoutes, knownPaths } = await import(routesUrl)

await test('pit stop is an isolated lazy experiment, with noindex metadata and no navigation entry', async () => {
  assert.equal(PIT_STOP_EXPERIMENT_PATH, '/experiments/pit-stop')
  const route = routeMeta.find(item => item.path === PIT_STOP_EXPERIMENT_PATH)
  assert.equal(route.noindex, true)
  assert.equal(route.robots, 'noindex, nofollow')
  assert.equal(route.priority, 0)
  assert.equal(navRoutes.some(item => item.path === PIT_STOP_EXPERIMENT_PATH), false)
  assert.ok(knownPaths.includes(PIT_STOP_EXPERIMENT_PATH))
  const app = await read('src/App.tsx')
  assert.match(app, /const PitStopExperimentPage = lazy\(\(\) =>\s*import\('\.\/pages\/PitStopExperimentPage'\)/)
  assert.match(app, /\[PIT_STOP_EXPERIMENT_PATH\]: PitStopExperimentPage/)
  const branch = app.slice(app.indexOf('if (Experiment)'), app.indexOf('const Page ='))
  assert.match(branch, /<Experiment \/>/)
  assert.doesNotMatch(branch, /<SiteHeader|<SiteFooter/)
})

await test('portfolio page reuses the original scene and restores crawler policy after client navigation', async () => {
  const effects = []
  const events = []
  globalThis.__pitStopEffects = effects
  globalThis.__pitStopMetaCalls = events
  const { PitStopExperimentPage } = await import(await moduleUrl('src/pages/PitStopExperimentPage.tsx', {
    react: dataUrl('export const useEffect = effect => globalThis.__pitStopEffects.push(effect);'),
    '../components/ApproachSummary/ApproachSummary': dataUrl(`import {createElement} from '${import.meta.resolve('react')}';export const ApproachSummary=()=>createElement('section',{'data-original-pit-stop':true});`),
    '../components/PageLink/PageLink': dataUrl(`import {createElement} from '${import.meta.resolve('react')}';export const PageLink=({children,...props})=>createElement('a',props,children);`),
    '../content/routeMeta': routesUrl,
    '../hooks/useDocumentMeta': dataUrl('export const useRouteMeta = path => globalThis.__pitStopMetaCalls.push(path);'),
  }))
  const originalDocument = globalThis.document
  try {
    const html = renderToStaticMarkup(PitStopExperimentPage())
    assert.match(html, /class="pit-stop-experiment"/)
    assert.equal((html.match(/data-original-pit-stop/g) ?? []).length, 1)
    assert.match(html, /<h1[^>]*>The pit stop\.<\/h1>/)
    assert.match(html, /href="\/"/)
    assert.deepEqual(events, [PIT_STOP_EXPERIMENT_PATH])
    const existing = { content: 'index, follow' }
    globalThis.document = { head: { querySelector: () => existing } }
    const cleanupExisting = effects[0]()
    assert.equal(existing.content, 'noindex, nofollow')
    cleanupExisting()
    assert.equal(existing.content, 'index, follow')
    let removedPrerendered = false
    const prerendered = { content: 'noindex, nofollow', remove: () => { removedPrerendered = true } }
    globalThis.document = { head: { querySelector: () => prerendered } }
    const cleanupPrerendered = effects[0]()
    cleanupPrerendered()
    assert.equal(removedPrerendered, true)
    let appended = null
    let removed = false
    globalThis.document = {
      head: { querySelector: () => null, appendChild: meta => { appended = meta } },
      createElement: () => ({ remove: () => { removed = true } }),
    }
    const cleanupNew = effects[0]()
    assert.equal(appended.name, 'robots')
    assert.equal(appended.content, 'noindex, nofollow')
    cleanupNew()
    assert.equal(removed, true)
  } finally {
    globalThis.document = originalDocument
    delete globalThis.__pitStopEffects
    delete globalThis.__pitStopMetaCalls
  }
})

await test('all retired media and original pit-stop source are retained with matching archive hashes', async () => {
  const directory = new URL('archive/homepage-2026-09-10/', root)
  const manifest = JSON.parse(await readFile(new URL('manifest.json', directory), 'utf8'))
  const hash = bytes => createHash('sha256').update(bytes).digest('hex')
  assert.equal(manifest.assets.length, 10)
  for (const asset of manifest.assets) {
    const saved = await readFile(new URL(asset.savedAs, directory))
    assert.equal(saved.length, asset.bytes)
    assert.equal(hash(saved), asset.sha256)
    assert.equal(hash(await readFile(new URL(asset.original, root))), asset.sha256)
  }
  const tarPath = new URL(manifest.sourceArchive, directory)
  assert.equal(hash(await readFile(tarPath)), manifest.sourceArchiveSha256)
  for (const supplement of manifest.supplements) {
    const supplementPath = new URL(supplement.archive, directory)
    assert.equal(hash(await readFile(supplementPath)), supplement.sha256)
    for (const file of supplement.files) {
      assert.match(file.source, /^git:/)
      assert.equal(hash(execFileSync('tar', ['-xOf', supplementPath.pathname, file.archiveEntry])), file.sha256)
    }
  }
  const originalScene = manifest.sourceFiles.filter(file => /^src\/components\/(ApproachSummary|Approach)\//.test(file.original))
  assert.ok(originalScene.length >= 10)
  for (const source of originalScene) {
    const archived = execFileSync('tar', ['-xOf', tarPath.pathname, source.archiveEntry])
    assert.equal(hash(archived), source.sha256)
    assert.equal(hash(await readFile(new URL(source.original, root))), source.sha256)
  }
  const vercelIgnore = await read('.vercelignore')
  assert.match(vercelIgnore, /^\/archive\/homepage-2026-09-10\/$/m)
  assert.doesNotMatch(vercelIgnore, /^\/public\/media\/$/m)
})
