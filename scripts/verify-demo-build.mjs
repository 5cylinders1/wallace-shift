import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { contractorPreviewFiles } from './contractor-preview-contract.mjs'

// Check the actual release output, including nested pages and lazy bundles.
// This is run by npm build after both Vite passes.
const root = new URL('../dist/', import.meta.url)
async function files(directory, prefix = '') {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(entries.map(entry => {
    const path = join(prefix, entry.name)
    return entry.isDirectory() ? files(new URL(`${entry.name}/`, directory), path) : [path]
  }))
  return nested.flat()
}
const output = await files(root)
const privateHtml = output.filter(path => /^demos\/(?!roofers-offer\/|contractors\/|bucyrus-auto\/|lawn\/|painting\/).*\.html$/.test(path))
const sourceHtml = (await files(new URL('../demos/', import.meta.url)))
  .filter(path => !/^(?:roofers-offer|contractors|bucyrus-auto|lawn|painting)\//.test(path) && path.endsWith('.html'))
  .map(path => `demos/${path}`)
assert.deepEqual(privateHtml.toSorted(), sourceHtml.toSorted(), 'Every private demo entry must be emitted exactly once')
for (const path of privateHtml) {
  const html = await readFile(new URL(path, root), 'utf8')
  const bundles = [...html.matchAll(/(?:src|href)="([^"?]+\.(?:js|css))(?:\?[^" ]*)?"/g)].map(match => match[1])
  assert.ok(bundles.length, `Missing compiled bundles: ${path}`)
  for (const bundle of bundles) assert.ok(bundle.startsWith('/demo-assets/'), `${path} exposes ${bundle}`)
}
for (const path of ['index.html', 'request-demo/index.html', 'demo-agreement/index.html', 'demo-admin/index.html', 'demos/roofers-offer/index.html', 'demos/contractors/index.html', 'demos/bucyrus-auto/index.html', 'demos/lawn/index.html', 'demos/painting/index.html']) {
  const html = await readFile(new URL(path, root), 'utf8')
  assert.ok(!html.includes('/demo-assets/'), `Public page depends on private bundles: ${path}`)
}
const privateJs = output.filter(path => /^demo-assets\/.*\.js$/.test(path))
assert.ok(privateJs.length > 0, 'Private scripts must be in the protected directory')
for (const path of privateJs) {
  const source = await readFile(new URL(path, root), 'utf8')
  assert.ok(!/(?:from\s*|import\s*\()\s*["'](?:\/assets\/|\.\.\/assets\/)/.test(source), `Private bundle imports the public build: ${path}`)
}
assert.ok(!output.some(path => /\.(?:map|tsx|ts|jsx|zip|tar|gz)$/.test(path)), 'Release output must not contain source maps or source archives')
const previews = output.filter(path => path.startsWith('media/demo-previews/'))
assert.deepEqual(previews.toSorted(), contractorPreviewFiles.toSorted(), 'Every contractor concept requires exactly one public film, poster and caption file; production sources stay outside public output')
for (const path of contractorPreviewFiles) {
  const contents = await readFile(new URL(path, root))
  if (path.endsWith('.mp4')) {
    assert.ok(contents.length > 1024, `Empty preview film: ${path}`)
    assert.equal(contents.toString('ascii', 4, 8), 'ftyp', `Invalid MP4: ${path}`)
  } else if (path.endsWith('.jpg')) {
    assert.equal(contents.subarray(0, 3).toString('hex'), 'ffd8ff', `Invalid JPEG poster: ${path}`)
  } else {
    const captions = contents.toString('utf8')
    assert.match(captions, /^WEBVTT\s/, `Invalid captions: ${path}`)
    assert.match(captions, /\d{2}:\d{2}(?::\d{2})?\.\d{3} --> \d{2}:\d{2}(?::\d{2})?\.\d{3}/, `Captions have no timed cues: ${path}`)
  }
}
console.log(`Demo build boundary verified: ${privateHtml.length} documents, ${privateJs.length} private JavaScript bundles and ${previews.length} public contractor preview assets.`)
