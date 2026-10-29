import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { access as fileAccess, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join, posix } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath, pathToFileURL } from 'node:url'
import ts from 'typescript'

// Exercise the real access gate without cookies, credentials or provider calls.
// No local environment file is read. The build test checks an existing dist;
// run npm run build first when changing entry points or emitted asset routing.
const root = fileURLToPath(new URL('../', import.meta.url))
const temporary = await mkdtemp(join(tmpdir(), 'wallace-bucyrus-public-tests-'))
const savedSecret = process.env.DEMO_ACCESS_SECRET
const savedFetch = globalThis.fetch
delete process.env.DEMO_ACCESS_SECRET
globalThis.fetch = async () => { throw new Error('Public route tests must not make network requests') }

after(async () => {
  if (savedSecret === undefined) delete process.env.DEMO_ACCESS_SECRET
  else process.env.DEMO_ACCESS_SECRET = savedSecret
  globalThis.fetch = savedFetch
  await rm(temporary, { recursive: true, force: true })
})

const compiled = new Map()
async function compile(relative) {
  if (compiled.has(relative)) return compiled.get(relative)
  const outputPath = join(temporary, `${relative}.mjs`)
  compiled.set(relative, outputPath)
  let output = ts.transpileModule(await readFile(join(root, relative), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext },
  }).outputText
  for (const match of [...output.matchAll(/(from\s+)(['"])(\.[^'"]+)\2/g)]) {
    const dependency = join(dirname(relative), match[3].replace(/\.js$/, '.ts'))
    output = output.replace(match[0], `from ${JSON.stringify(pathToFileURL(await compile(dependency)).href)}`)
  }
  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(outputPath, output)
  return outputPath
}

const { DEMO_PATHS, gateDemoRequest, isProtectedDemoPath } = await import(pathToFileURL(await compile('api/_lib/demo-access.ts')).href)
const origin = 'https://wallaceshift.com'
const publicPaths = [
  '/bucyrus-auto', '/bucyrus-auto/',
  '/demos/bucyrus-auto', '/demos/bucyrus-auto/', '/demos/bucyrus-auto/index.html',
  '/src/demos/bucyrus-auto/main.tsx',
  '/media/bucyrus/hero-1.webp', '/media/bucyrus/film-engine.webp', '/media/bucyrus/logo.jpg',
]

test('Bucyrus alias, document, source entry and imagery are public without a session or secret', async () => {
  for (const path of publicPaths) {
    assert.equal(isProtectedDemoPath(path), false, path)
    for (const method of ['GET', 'HEAD']) {
      for (const host of [origin, 'https://contractors.wallaceshift.com']) {
        const response = await gateDemoRequest(new Request(host + path, { method }))
        assert.equal(response, null, `${method} ${host}${path}`)
      }
    }
  }
})

test('making Bucyrus public does not grant access to private peer demos or bundles', async () => {
  assert.ok(!Object.values(DEMO_PATHS).includes('/bucyrus-auto'), 'Bucyrus must not require a private demo invitation')
  for (const [demo, alias] of Object.entries(DEMO_PATHS)) {
    for (const path of [alias, `${alias}/`, `/demos/${demo}/index.html`]) {
      assert.equal(isProtectedDemoPath(path), true, path)
      const response = await gateDemoRequest(new Request(origin + path))
      assert.equal(response?.status, 303, path)
      assert.equal(response.headers.get('location'), `/request-demo/?demo=${demo}`, path)
    }
  }
  for (const path of ['/demo-assets/private.js', '/src/demos/roofers/main.tsx', '/demos/bucyrus-auto-private/index.html', '/src/demos/bucyrus-auto-private/main.tsx']) {
    assert.equal(isProtectedDemoPath(path), true, path)
    const response = await gateDemoRequest(new Request(origin + path))
    assert.equal(response?.status, path.endsWith('.html') ? 303 : 403, path)
  }
})

function sourceMatches(source, path) {
  if (source.endsWith('/:path*')) {
    const prefix = source.slice(0, -'/:path*'.length)
    return path === prefix || path.startsWith(`${prefix}/`)
  }
  return source === path
}

function assertNoindex(value, context) {
  const directives = value.toLowerCase().split(/\s*,\s*/)
  assert.ok(directives.includes('noindex'), `${context}: missing noindex`)
  assert.ok(directives.includes('nofollow'), `${context}: missing nofollow`)
}

function attributes(tag) {
  return Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(["'])(.*?)\2/g)].map(match => [match[1].toLowerCase(), match[3]]))
}

function verifyDocumentMetadata(html, context) {
  const tags = [...html.matchAll(/<(?:meta|link)\b[^>]*>/gi)].map(match => attributes(match[0]))
  const robots = tags.filter(tag => tag.name?.toLowerCase() === 'robots')
  assert.equal(robots.length, 1, `${context}: one robots directive is required`)
  assertNoindex(robots[0].content ?? '', context)
  const canonicals = tags.filter(tag => tag.rel?.toLowerCase() === 'canonical')
  assert.equal(canonicals.length, 1, `${context}: one canonical URL is required`)
  assert.equal(canonicals[0].href, `${origin}/bucyrus-auto`, context)
  assert.equal(tags.find(tag => tag.property === 'og:url')?.content, `${origin}/bucyrus-auto`, context)
  assert.equal(tags.find(tag => tag.property === 'og:image')?.content, `${origin}/media/bucyrus/hero-1.webp`, context)
  assert.equal(tags.find(tag => tag.rel === 'icon')?.href, '/media/bucyrus/logo.jpg', context)
  assert.match(html, /<title>[^<]*Bucyrus Auto/i, `${context}: wrong document title`)
}

test('Vercel header rules contain only valid flat key/value header entries', async () => {
  const config = JSON.parse(await readFile(join(root, 'vercel.json'), 'utf8'))
  assert.ok(Array.isArray(config.headers), 'Vercel headers must be an array of route rules')
  for (const [ruleIndex, rule] of config.headers.entries()) {
    assert.equal(typeof rule.source, 'string', `headers[${ruleIndex}].source must be a route string`)
    assert.ok(Array.isArray(rule.headers), `headers[${ruleIndex}].headers must be an array`)
    for (const [headerIndex, header] of rule.headers.entries()) {
      const context = `headers[${ruleIndex}].headers[${headerIndex}]`
      assert.ok(header !== null && typeof header === 'object' && !Array.isArray(header), `${context} must be a header object`)
      assert.deepEqual(Object.keys(header).sort(), ['key', 'value'], `${context} must contain key/value, not a nested route rule`)
      assert.equal(typeof header.key, 'string', `${context}.key must be a string`)
      assert.equal(typeof header.value, 'string', `${context}.value must be a string`)
    }
  }
})

test('Vercel exposes the dedicated alias and keeps the gallery at the contractors root', async () => {
  const config = JSON.parse(await readFile(join(root, 'vercel.json'), 'utf8'))
  const rewrite = config.rewrites.find(rule => rule.source === '/bucyrus-auto')
  assert.ok(rewrite, 'Missing /bucyrus-auto rewrite')
  assert.equal(rewrite.destination.replace(/\/$/, ''), '/demos/bucyrus-auto')
  assert.ok(config.rewrites.some(rule => rule.source === '/' && rule.destination.replace(/\/$/, '') === '/demos/contractors' && rule.has?.some(condition => condition.type === 'host' && condition.value === 'contractors.wallaceshift.com')), 'The contractors hostname must retain its gallery root')
  for (const path of ['/bucyrus-auto', '/bucyrus-auto/', '/demos/bucyrus-auto', '/demos/bucyrus-auto/', '/demos/bucyrus-auto/index.html']) {
    const values = config.headers.filter(rule => sourceMatches(rule.source, path)).flatMap(rule => rule.headers)
      .filter(header => header.key.toLowerCase() === 'x-robots-tag').map(header => header.value)
    assert.ok(values.length, `Missing X-Robots-Tag header for ${path}`)
    assertNoindex(values.join(', '), path)
  }
})

test('old contractors alias redirects only that demo to the main domain', async () => {
  const config = JSON.parse(await readFile(join(root, 'vercel.json'), 'utf8'))
  const redirect = config.redirects.find(rule => rule.source === '/bucyrus-auto')
  assert.ok(redirect, 'Missing old-host redirect')
  assert.equal(redirect.destination, `${origin}/bucyrus-auto`)
  assert.equal(redirect.permanent, true)
  assert.deepEqual(redirect.has, [{ type: 'host', value: 'contractors.wallaceshift.com' }], 'Redirect must not match the main domain or change the gallery root')
  assert.equal(config.trailingSlash, false, 'Trailing slash aliases normalize before the exact-path redirect')
})

test('dedicated source document is unindexed and canonicalizes to the public alias', async () => {
  const html = await readFile(join(root, 'demos/bucyrus-auto/index.html'), 'utf8')
  verifyDocumentMetadata(html, 'Source document')
  assert.match(html, /src="\/src\/demos\/bucyrus-auto\/main\.tsx"/, 'Source entry must be independent of the gallery')
  const gallery = await readFile(join(root, 'src/demos/contractors/ContractorsLander.tsx'), 'utf8')
  const catalog = await readFile(join(root, 'src/demos/contractors/catalog.ts'), 'utf8')
  assert.doesNotMatch(gallery + catalog, /bucyrus/i, 'The restored gallery must not contain a Bucyrus tile or mount')
})

test('built Bucyrus document and its dependency graph use public emitted assets', async context => {
  try { await fileAccess(join(root, 'dist')) } catch (error) {
    if (error.code !== 'ENOENT') throw error
    context.skip('No dist directory; run npm run build to verify emitted assets')
    return
  }
  const html = await readFile(join(root, 'dist/demos/bucyrus-auto/index.html'), 'utf8')
  verifyDocumentMetadata(html, 'Built document')
  assert.doesNotMatch(html, /\/demo-assets\//, 'Public document cannot load gated bundles')
  const entries = [...html.matchAll(/(?:src|href)="([^"?]+\.(?:js|css))(?:\?[^" ]*)?"/g)].map(match => match[1])
  assert.ok(entries.length > 0, 'Missing compiled JS/CSS')
  const pending = [...entries]
  const inspected = new Set()
  while (pending.length) {
    const path = pending.pop()
    if (inspected.has(path)) continue
    inspected.add(path)
    assert.ok(path.startsWith('/assets/'), `Public Bucyrus bundle outside /assets/: ${path}`)
    assert.equal(isProtectedDemoPath(path), false, path)
    const source = await readFile(join(root, 'dist', path.slice(1)), 'utf8')
    assert.doesNotMatch(source, /\/demo-assets\//, `Dependency on a gated bundle: ${path}`)
    if (!path.endsWith('.js')) continue
    for (const match of source.matchAll(/(?:from\s*|import\s*\(\s*|import\s*)["']((?:\.\.?\/|\/assets\/)[^"']+\.(?:js|css))["']/g)) {
      pending.push(match[1].startsWith('/') ? match[1] : posix.resolve(posix.dirname(path), match[1]))
    }
  }
  for (const path of ['/media/bucyrus/hero-1.webp', '/media/bucyrus/film-engine.webp', '/media/bucyrus/logo.jpg']) {
    await fileAccess(join(root, 'dist', path.slice(1)))
    assert.equal(await gateDemoRequest(new Request(origin + path)), null, path)
  }
  context.diagnostic(`Verified ${inspected.size} public emitted JS/CSS files and representative imagery.`)
})
