/** Validate the public subdomain landers and the noindex utility documents.
 * Default: inspect deployable HTML after build. --source: inspect entry HTML.
 * Render collection components to verify their landmarks and heading outline. */
import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ts from 'typescript'

const root = fileURLToPath(new URL('../', import.meta.url))
const sourceOnly = process.argv.includes('--source')
const base = sourceOnly ? root : join(root, 'dist')
const organizationId = 'https://wallaceshift.com/#organization'
const collections = [
  {
    file: 'demos/contractors/index.html', canonical: 'https://contractors.wallaceshift.com/', type: 'CollectionPage',
    component: 'src/demos/contractors/ContractorsLander.tsx', exportName: 'default', heading: /contractor\s+CRMs/i,
    sections: ['offer', 'demos', 'built', 'access'],
  },
  {
    file: 'demos/roofers-offer/index.html', canonical: 'https://roofers.wallaceshift.com/', type: 'WebPage',
    component: 'src/demos/roofers-offer/RoofersOffer.tsx', exportName: 'RoofersOffer', heading: /roofing\s+CRM/i,
    sections: ['collection', 'dashboard', 'automation', 'offer', 'enquire'],
  },
]
const utilities = [
  { file: 'request-demo/index.html', path: '/request-demo' },
  { file: 'demo-admin/index.html', path: '/demo-admin' },
  { file: 'demo-agreement/index.html', path: '/demo-agreement' },
  { file: 'wallace-shift-consultations/index.html', path: '/wallace-shift-consultations', public: true },
  { file: 'wallace-shift-consultations/privacy.html', path: '/wallace-shift-consultations/privacy', public: true },
  { file: 'wallace-shift-consultations/terms.html', path: '/wallace-shift-consultations/terms', public: true },
]

function canonicalOf(html, file) {
  const links = [...html.matchAll(/<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"[^>]*>/g)]
  assert.equal(links.length, 1, `${file}: one canonical URL`)
  assert.equal((html.match(/<title>/g) ?? []).length, 1, `${file}: one title`)
  assert.equal((html.match(/name="description"/g) ?? []).length, 1, `${file}: one description`)
  return links[0][1]
}

const modules = new Map()
async function compileModule(url) {
  if (modules.has(url.href)) return modules.get(url.href)
  const source = await readFile(url, 'utf8')
  let javascript = ts.transpileModule(source, { compilerOptions: {
    target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText
  for (const match of [...javascript.matchAll(/^import (.+?) from (['"])([^'"]+)\2;/gm)]) {
    const specifier = match[3]
    let target
    if (!specifier.startsWith('.')) target = import.meta.resolve(specifier)
    else {
      for (const extension of ['.ts', '.tsx']) {
        try { target = await compileModule(new URL(specifier + extension, url)); break } catch (error) {
          if (error.code !== 'ENOENT') throw error
        }
      }
      assert.ok(target, `Unresolved collection import: ${specifier}`)
    }
    javascript = javascript.replace(match[0], `import ${match[1]} from ${JSON.stringify(target)};`)
  }
  const compiled = `data:text/javascript;base64,${Buffer.from(javascript).toString('base64')}`
  modules.set(url.href, compiled)
  return compiled
}

async function verifyCollectionOutline(collection) {
  const collectionModule = await import(await compileModule(pathToFileURL(join(root, collection.component))))
  const Component = collectionModule[collection.exportName]
  // Actual server rendering must not need a browser or run effects, media,
  // analytics, or form submission. Host-specific links use the server snapshot.
  const html = renderToStaticMarkup(createElement(Component))
  const mains = [...html.matchAll(/<main\b[^>]*>([\s\S]*?)<\/main>/g)]
  assert.equal(mains.length, 1, `${collection.component}: one main landmark`)
  const main = mains[0][1]
  assert.match(mains[0][0], /^<main id="main">/, 'skip link targets main')
  assert.ok(html.indexOf('</header>') >= 0 && html.indexOf('</header>') < mains[0].index, 'page header precedes main')
  assert.ok(html.indexOf('<footer') >= mains[0].index + mains[0][0].length, 'page footer follows main')
  assert.ok(!/<(?:header|footer)\b/.test(main), 'page header and footer stay outside main')
  for (const id of collection.sections) assert.match(main, new RegExp(`<section\\b[^>]*id="${id}"`), `${id} belongs to main`)
  const headings = [...html.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/g)]
  assert.equal(headings.filter(heading => heading[1] === '1').length, 1, 'one rendered H1')
  assert.match(main, /<h1\b/, 'the H1 belongs to main')
  assert.match(headings[0][2].replace(/<[^>]+>/g, ' '), collection.heading)
  let previousLevel = 0
  for (const heading of headings) {
    const level = Number(heading[1])
    assert.ok(level <= previousLevel + 1, `${collection.component}: heading skips H${previousLevel} to H${level}`)
    previousLevel = level
  }
  if (collection.exportName === 'RoofersOffer') {
    const text = headings.map(heading => heading[2].replace(/<[^>]+>/g, '')).join('\n')
    for (const phrase of ['Roofing CRM for your team.', 'Free Motion website.', 'A clearer inquiry. A useful first step.',
      'Less chasing. More work moving forward.', 'Purchase a CRM integrated with AI. Get the website free.', 'Where does follow-up stall?']) {
      assert.ok(text.includes(phrase), `hard line breaks preserve readable heading text: ${phrase}`)
    }
  }
  for (const category of main.matchAll(/<section id="(category-[^"]+)"/g)) {
    assert.match(main, new RegExp(`<h2 id="${category[1]}-title">`), 'demo categories use H2 above the H3 demo cards')
  }
  return html
}

const sitemap = sourceOnly ? '' : await readFile(join(base, 'sitemap.xml'), 'utf8')
for (const collection of collections) {
  const html = await readFile(join(base, collection.file), 'utf8')
  assert.equal(canonicalOf(html, collection.file), collection.canonical)
  assert.match(html, /name="robots" content="index, follow, max-image-preview:large"/)
  assert.ok(html.includes(`property="og:url" content="${collection.canonical}"`))
  for (const name of ['title', 'description', 'image']) assert.match(html, new RegExp(`name="twitter:${name}" content="[^"]+"`))
  const scripts = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
  assert.equal(scripts.length, 1, `${collection.file}: one JSON-LD graph`)
  const graph = JSON.parse(scripts[0][1])['@graph']
  const organization = graph.find(node => node['@id'] === organizationId)
  const website = graph.find(node => node['@type'] === 'WebSite')
  const page = graph.find(node => node['@type'] === collection.type)
  assert.equal(organization.name, 'Wallace Shift')
  assert.equal(website.url, collection.canonical)
  assert.equal(website.publisher['@id'], organizationId)
  assert.equal(page.url, collection.canonical)
  assert.equal(page.isPartOf['@id'], website['@id'])
  assert.equal(new Set(graph.map(node => node['@id'])).size, graph.length)
  assert.ok(!graph.some(node => node.review || node.aggregateRating || node.address), 'no fabricated clients, reviews, or private address')
  const image = html.match(/property="og:image" content="([^"]+)"/)[1]
  await access(join(sourceOnly ? join(root, 'public') : base, new URL(image).pathname.slice(1)))
  const rendered = await verifyCollectionOutline(collection)
  if (!sourceOnly) {
    assert.doesNotMatch(html, /<div id="root"><\/div>/, 'public collection has actual initial HTML')
    assert.match(html, /<div id="root" data-collection="(?:contractors|roofers-offer)">/)
    const heading = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/)
    assert.ok(heading, 'the built document includes its H1 without JavaScript')
    assert.match(heading[1].replace(/<[^>]+>/g, ' '), collection.heading)
    assert.equal((html.match(/<h1\b/g) ?? []).length, 1, 'one built H1')
    assert.match(html, /<main id="main">/, 'initial content has the main landmark')
    for (const id of collection.sections) assert.ok(html.includes(`id="${id}"`), `${id} is present before hydration`)
    for (const match of rendered.matchAll(/<a\b[^>]*href="([^"]+)"/g)) {
      assert.ok(html.includes(`href="${match[1]}"`), 'server output retains canonical-host navigation links')
    }
    const source = await readFile(join(root, collection.file), 'utf8')
    const sourceSchema = source.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]
    assert.deepEqual(graph, JSON.parse(sourceSchema)['@graph'], 'prerendering preserves the collection schema')
  }
  if (!sourceOnly) assert.ok(!sitemap.includes(`<loc>${collection.canonical}</loc>`), 'subdomain canonicals do not enter the main-host sitemap')
}

for (const utility of utilities) {
  const file = sourceOnly && utility.public ? join('public', utility.file) : utility.file
  const html = await readFile(join(base, file), 'utf8')
  const canonical = `https://wallaceshift.com${utility.path}`
  assert.equal(canonicalOf(html, file), canonical)
  assert.match(html, /name="robots" content="noindex, nofollow"/)
  if (utility.public) assert.equal((html.match(/<h1(?:\s|>)/g) ?? []).length, 1)
  if (!sourceOnly) assert.ok(!sitemap.includes(`<loc>${canonical}</loc>`), `${file}: noindex utilities stay out of sitemap`)
}

if (!sourceOnly) {
  const path = '/offers/ai-business-integration'
  const file = `${path.slice(1)}/index.html`
  const html = await readFile(join(base, file), 'utf8')
  const canonical = `https://wallaceshift.com${path}`
  assert.equal(canonicalOf(html, file), canonical)
  assert.match(html, /name="robots" content="noindex, nofollow"/)
  assert.ok(!sitemap.includes(`<loc>${canonical}</loc>`), 'offer draft stays out of the sitemap')
  assert.ok(html.includes(`data-route-path="${path}"`), 'offer draft is rendered before hydration')
  assert.equal((html.match(/<h1(?:\s|>)/g) ?? []).length, 1, 'offer has one readable initial H1')
  assert.match(html, /<main id="main">/, 'offer content belongs to the main landmark')
  assert.equal((html.match(/src="\/site-analytics\.js"/g) ?? []).length, 1, 'public offer uses one consent-controlled bootstrap')
}

console.log(`Marketing entry ${sourceOnly ? 'source' : 'build'} SEO verified: ${collections.length} public subdomain pages and ${utilities.length} noindex utility documents.`)
