import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

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
const privateHtml = output.filter(path => /^demos\/(?!roofers-offer\/).*\.html$/.test(path))
assert.equal(privateHtml.length, 14, 'Every private demo entry must be emitted')
for (const path of privateHtml) {
  const html = await readFile(new URL(path, root), 'utf8')
  const bundles = [...html.matchAll(/(?:src|href)="([^"?]+\.(?:js|css))(?:\?[^" ]*)?"/g)].map(match => match[1])
  assert.ok(bundles.length, `Missing compiled bundles: ${path}`)
  for (const bundle of bundles) assert.ok(bundle.startsWith('/demo-assets/'), `${path} exposes ${bundle}`)
}
for (const path of ['index.html', 'request-demo/index.html', 'demos/roofers-offer/index.html']) {
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
console.log(`Demo build boundary verified: ${privateHtml.length} documents and ${privateJs.length} private JavaScript bundles.`)
