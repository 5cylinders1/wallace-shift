/** Checks the built Deer Creek Plumbing concept (run after `vite build`):
 * every page's metadata and JSON-LD, heading order, image text, internal
 * links, palette contrast and the service-area lookup. */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { dirname, extname, join, resolve } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const root = fileURLToPath(new URL('../', import.meta.url))
const modules = new Map()
async function compileModule(path) {
  if (modules.has(path)) return modules.get(path)
  const absolute = resolve(root, path)
  let javascript = ts.transpileModule(await readFile(absolute, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext },
  }).outputText
  for (const match of [...javascript.matchAll(/from (['"])([^'"]+)\1/g)]) {
    const specifier = match[2]
    const target = specifier.startsWith('.')
      ? await compileModule(resolve(dirname(absolute), specifier + (extname(specifier) ? '' : '.ts')))
      : import.meta.resolve(specifier)
    javascript = javascript.replace(match[0], `from ${JSON.stringify(target)}`)
  }
  const url = `data:text/javascript;base64,${Buffer.from(javascript).toString('base64')}`
  modules.set(path, url)
  return url
}

const { pages, SITE } = await import(await compileModule('src/demos/deercreek/content.ts'))
const { lookupArea } = await import(await compileModule('src/demos/deercreek/area.ts'))
const paths = pages.map(page => (page.slug ? `${SITE.base}/${page.slug}` : SITE.base))
const known = new Set(paths)
const titles = new Set()
const descriptions = new Set()

for (const path of paths) {
  await test(`built page ${path}`, async () => {
    const html = await readFile(join(root, 'dist', path.slice(1), 'index.html'), 'utf8')
    const canonical = `${SITE.origin}${path}`
    const title = html.match(/<title>([^<]+)<\/title>/g) ?? []
    assert.equal(title.length, 1, 'one title')
    assert.ok(!titles.has(title[0]), 'unique title'); titles.add(title[0])
    const description = html.match(/<meta name="description" content="([^"]+)"/g) ?? []
    assert.equal(description.length, 1, 'one description')
    assert.ok(!descriptions.has(description[0]), 'unique description'); descriptions.add(description[0])
    assert.equal((html.match(/rel="canonical"/g) ?? []).length, 1, 'one canonical')
    assert.ok(html.includes(`<link rel="canonical" href="${canonical}" />`), 'canonical is the clean public URL')
    assert.ok(html.includes(`property="og:url" content="${canonical}"`))
    assert.equal((html.match(/name="robots"/g) ?? []).length, 1, 'one robots tag')
    assert.ok(html.includes('<meta name="robots" content="noindex, nofollow" />'), 'the concept stays unindexed')
    assert.ok(!html.includes('/demo-assets/'), 'no private demo bundles')

    const scripts = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    assert.equal(scripts.length, 1, 'one JSON-LD graph')
    const graph = JSON.parse(scripts[0][1])['@graph']
    const ids = graph.map(node => node['@id'])
    assert.equal(new Set(ids).size, ids.length, 'unique @ids')
    const business = graph.find(node => node['@type'] === 'Plumber')
    assert.ok(business, 'Plumber entity')
    assert.equal(business.telephone, '+1-913-440-9102')
    assert.equal(business.address.postalCode, '66062')
    assert.ok(!graph.some(node => node.aggregateRating || node.review), 'no third-party reviews marked up')
    const page = graph.find(node => node['@id'] === `${canonical}#webpage`)
    assert.ok(page, 'page entity')
    assert.equal(page.url, canonical)
    if (path !== SITE.base) assert.ok(graph.some(node => node['@type'] === 'BreadcrumbList'), 'breadcrumb')
    if (path.includes('/services/')) {
      assert.ok(graph.some(node => node['@type'] === 'Service' && node.provider['@id'] === business['@id']), 'Service entity')
      assert.ok(graph.some(node => node['@type'] === 'FAQPage' && node.mainEntity.length > 0), 'FAQPage entity')
    }

    const body = html.slice(html.indexOf('<div id="root"'))
    assert.equal((body.match(/<h1\b/g) ?? []).length, 1, 'exactly one h1')
    const levels = [...body.matchAll(/<h([1-6])\b/g)].map(match => Number(match[1]))
    levels.forEach((level, index) => { if (index) assert.ok(level <= levels[index - 1] + 1, `heading jumps from h${levels[index - 1]} to h${level}`) })
    for (const image of body.match(/<img\b[^>]*>/g) ?? []) assert.match(image, /\balt="/, `image needs alt text: ${image}`)
    assert.ok(body.includes('id="main"'), 'main landmark target')
    assert.ok(body.includes('Skip to main content'), 'skip link')
    for (const [, href] of body.matchAll(/href="(\/demo\/deercreek[^"#?]*)/g)) assert.ok(known.has(href.replace(/\/$/, '')), `internal link resolves: ${href}`)
    assert.doesNotMatch(body, /lorem ipsum|\bTODO\b|\bundefined\b|\bNaN\b/)
  })
}

test('palette contrast', () => {
  const luminance = hex => {
    const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(c => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }
  const ratio = (a, b) => { const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05) }
  const pairs = [
    ['#0f1a24', '#f7f4ee', 7], ['#34424f', '#f7f4ee', 7], ['#34424f', '#efe8dc', 7], ['#154c80', '#f7f4ee', 7], ['#154c80', '#ffffff', 7],
    ['#8a3d16', '#f7f4ee', 4.5], ['#ffffff', '#a6481b', 4.5], ['#ffffff', '#8a3a14', 4.5], ['#f4f1ea', '#0b1724', 7],
    ['#dbe3ea', '#0b1724', 7], ['#9ccaf2', '#0b1724', 7], ['#f2b48c', '#0b1724', 7], ['#a3221b', '#fbe5e2', 4.5], ['#1d6b3a', '#ffffff', 4.5],
  ]
  for (const [fg, bg, min] of pairs) assert.ok(ratio(fg, bg) >= min, `${fg} on ${bg} is ${ratio(fg, bg).toFixed(2)}:1, needs ${min}:1`)
})

test('service area lookup', () => {
  const found = query => { const result = lookupArea(query); assert.equal(result.kind, 'found', query); return result }
  assert.equal(found('66062').band, 'core')
  assert.equal(found("Lee's Summit").band, 'core')
  assert.equal(found('lees summit, mo').label, "Lee's Summit, MO")
  assert.equal(found('Overland Park KS').band, 'core')
  assert.equal(found('Blue Springs').band, 'edge')
  assert.equal(found('Topeka').band, 'outside')
  assert.equal(lookupArea('Kansas City').kind, 'choose')
  assert.equal(lookupArea('90210').kind, 'unknown-zip')
  assert.equal(lookupArea('Springfield, IL').kind, 'not-found')
  assert.equal(lookupArea('  ').kind, 'empty')
})
