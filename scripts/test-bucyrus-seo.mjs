import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { readFile, access } from 'node:fs/promises'
import { createServer as createHttpServer } from 'node:http'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
import ts from 'typescript'

const root = fileURLToPath(new URL('../', import.meta.url))
const origin = 'https://wallaceshift.com'
const pathList = [
  '/bucyrus-auto', '/bucyrus-auto/services/maintenance',
  '/bucyrus-auto/services/auto-repair', '/bucyrus-auto/services/drivetrain',
  '/bucyrus-auto/services/modifications', '/bucyrus-auto/vehicle-guide',
]

// Load the actual TS plugin without running the repository's unrelated plugins.
// Bare imports are resolved here so this in-memory module needs no temp files.
let pluginCode = ts.transpileModule(await readFile(join(root, 'bucyrus/vite-plugin.ts'), 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext },
}).outputText
pluginCode = pluginCode.replace(/from (["'])(vite|@vitejs\/plugin-react)\1/g, (_match, _quote, name) => `from ${JSON.stringify(import.meta.resolve(name))}`)
const { bucyrusPlugin, bucyrusPaths } = await import(`data:text/javascript;base64,${Buffer.from(pluginCode).toString('base64')}`)
assert.deepEqual([...bucyrusPaths], pathList, 'Static rendering must cover the agreed six pages')

function attrs(tag) {
  return Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(["'])(.*?)\2/g)].map(match => [match[1].toLowerCase(), match[3]]))
}
function tags(html, name) { return [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, 'gi'))].map(match => attrs(match[0])) }
function text(html) { return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() }
function only(values, message) { assert.equal(values.length, 1, message); return values[0] }

function checkDocument(html, path, built) {
  const title = only([...html.matchAll(/<title>(.*?)<\/title>/gi)].map(match => match[1]), `${path}: one title`)
  const meta = tags(html, 'meta')
  const value = name => only(meta.filter(tag => (tag.name || tag.property) === name), `${path}: one ${name}`).content
  const description = value('description')
  const canonical = only(tags(html, 'link').filter(tag => tag.rel === 'canonical'), `${path}: one canonical`).href
  assert.equal(canonical, origin + path)
  assert.equal(value('robots'), 'noindex, nofollow')
  assert.equal(value('og:url'), canonical)
  assert.equal(value('og:title'), title)
  assert.equal(value('og:description'), description)
  assert.equal(value('twitter:title'), title)
  assert.equal(value('twitter:description'), description)
  assert.equal(value('twitter:url'), canonical)
  assert.equal(value('twitter:card'), 'summary_large_image')
  assert.ok(value('og:image').startsWith(`${origin}/media/bucyrus/`))
  assert.equal(value('twitter:image'), value('og:image'))
  assert.ok(description.length >= 60, `${path}: descriptive summary is required`)
  const main = only([...html.matchAll(/<main\b[^>]*>([\s\S]*?)<\/main>/gi)].map(match => match[1]), `${path}: one initial main landmark`)
  const h1 = only([...main.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map(match => text(match[1])), `${path}: exactly one initial H1`)
  assert.ok(text(main).length >= 400, `${path}: initial HTML must contain substantive page content`)
  const rootTag = only(tags(html, 'div').filter(tag => tag.id === 'root'), `${path}: one hydration root`)
  assert.equal(rootTag['data-bucyrus-path'], path, `${path}: client must hydrate the same route`)
  const json = only([...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map(match => match[1]), `${path}: one JSON-LD block`)
  const schema = JSON.parse(json)
  assert.equal(schema['@context'], 'https://schema.org')
  assert.ok(JSON.stringify(schema).includes(canonical), `${path}: schema must identify this page`)
  const internal = tags(html, 'a').map(tag => tag.href).filter(href => href?.startsWith('/bucyrus-auto'))
  assert.ok(internal.length > 0, `${path}: crawlable internal links required`)
  for (const href of internal) assert.ok(pathList.includes(new URL(href, origin).pathname), `${path}: unknown internal page ${href}`)
  if (built) {
    assert.doesNotMatch(html, /\/src\/demos\/|\/demo-assets\//, `${path}: source or gated entry in public HTML`)
    const bundles = [...html.matchAll(/(?:src|href)="([^"?]+\.(?:js|css))(?:\?[^" ]*)?"/g)].map(match => match[1])
    assert.ok(bundles.some(bundle => bundle.endsWith('.js')), `${path}: missing hydration bundle`)
    assert.ok(bundles.every(bundle => bundle.startsWith('/assets/')), `${path}: bundles must use public assets`)
  }
  return { title, description, canonical, h1 }
}

test('six built pages contain unique initial content, metadata, schema and public hydration assets', async () => {
  const pages = await Promise.all(pathList.map(async path => {
    const html = await readFile(join(root, 'dist', path.slice(1), 'index.html'), 'utf8')
    const result = checkDocument(html, path, true)
    for (const tag of [...tags(html, 'script'), ...tags(html, 'link'), ...tags(html, 'img')]) {
      const url = tag.src || tag.href
      if (url?.startsWith('/assets/') || url?.startsWith('/media/bucyrus/')) await access(join(root, 'dist', url.slice(1)))
    }
    return result
  }))
  for (const key of ['title', 'description', 'canonical', 'h1']) assert.equal(new Set(pages.map(page => page[key])).size, pathList.length, `Every page needs its own ${key}`)
  const legacy = await readFile(join(root, 'dist/demos/bucyrus-auto/index.html'), 'utf8')
  checkDocument(legacy, '/bucyrus-auto', true)
  const clean = await readFile(join(root, 'dist/bucyrus-auto/index.html'), 'utf8')
  assert.equal(legacy, clean, 'The existing homepage rewrite must serve the rendered clean homepage')
  const sitemap = await readFile(join(root, 'dist/sitemap.xml'), 'utf8')
  assert.doesNotMatch(sitemap, /bucyrus-auto/, 'The unapproved demo must remain outside the sitemap')
})

let dev
after(async () => { await dev?.close() })

test('development serves initial SSR HTML and returns real 404/405 responses', async () => {
  dev = await createServer({ root, configFile: false, plugins: [react(), bucyrusPlugin()], appType: 'custom', logLevel: 'error', server: { host: '127.0.0.1', port: 0 } })
  await dev.listen()
  const address = dev.httpServer.address()
  assert.ok(address && typeof address === 'object')
  const base = `http://127.0.0.1:${address.port}`
  for (const path of pathList) {
    const response = await fetch(base + path)
    assert.equal(response.status, 200, path)
    assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow')
    checkDocument(await response.text(), path, false)
  }
  for (const path of ['/bucyrus-auto/missing', '/bucyrus-auto/services/missing', '/bucyrus-auto/services/maintenance/extra']) {
    const response = await fetch(base + path)
    assert.equal(response.status, 404, path)
    assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow')
  }
  const head = await fetch(`${base}/bucyrus-auto/services/maintenance/`, { method: 'HEAD' })
  assert.equal(head.status, 200)
  assert.equal(await head.text(), '')
  const post = await fetch(`${base}/bucyrus-auto`, { method: 'POST' })
  assert.equal(post.status, 405)
  assert.equal(post.headers.get('allow'), 'GET, HEAD')
})

test('preview serves built snapshots and unknown Bucyrus routes cannot reach SPA fallback', async () => {
  // Invoke the real preview hook in a minimal HTTP server. The explicit fallback
  // would return 200, so a lost/misordered Bucyrus handler fails this regression.
  let middleware
  const plugin = bucyrusPlugin()
  plugin.configurePreviewServer({ config: { root, build: { outDir: 'dist' } }, middlewares: { use: handler => { middleware = handler } } })
  const server = createHttpServer((request, response) => {
    middleware(request, response, error => {
      response.statusCode = error ? 500 : 200
      response.end(error ? String(error) : 'Generic SPA fallback')
    })
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  try {
    const address = server.address()
    const base = `http://127.0.0.1:${address.port}`
    for (const path of pathList) {
      const response = await fetch(base + path)
      assert.equal(response.status, 200, path)
      assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow')
      checkDocument(await response.text(), path, true)
    }
    const legacy = await fetch(`${base}/demos/bucyrus-auto/index.html`)
    assert.equal(legacy.status, 200)
    checkDocument(await legacy.text(), '/bucyrus-auto', true)
    assert.equal((await fetch(`${base}/bucyrus-auto/unknown`)).status, 404)
    assert.equal((await fetch(`${base}/bucyrus-auto/services/unknown`, { method: 'HEAD' })).status, 404)
  } finally { await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())) }
})
