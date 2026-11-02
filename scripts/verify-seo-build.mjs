/** Checks deployed HTML, not source-string promises: content, heading order,
 * metadata, entity graphs, sitemap membership, and private-page boundaries. */
import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'
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

const { routeMeta, SITE_ORIGIN } = await import(await compileModule('src/content/routeMeta.ts'))
const { serializeJsonLd, ORGANIZATION_ID, WEBSITE_ID } = await import(await compileModule('src/content/structuredData.ts'))
const read = path => readFile(join(root, path), 'utf8')
const escape = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
const sitemap = await read('dist/sitemap.xml')
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1])
const publicRoutes = routeMeta.filter(route => !route.noindex)
const titles = new Set()
const descriptions = new Set()

for (const route of routeMeta) {
  await test(`built SEO document: ${route.path}`, async () => {
    const relative = route.path === '/404' ? 'dist/404.html' : `dist${route.path === '/' ? '' : route.path}/index.html`
    const html = await read(relative)
    const canonical = `${SITE_ORIGIN}${route.path}`
    assert.equal((html.match(/<title>/g) ?? []).length, 1, 'exactly one title')
    assert.ok(html.includes(`<title>${escape(route.title)}</title>`), 'the route owns its title')
    assert.equal((html.match(/<meta\b[^>]*name="description"/g) ?? []).length, 1, 'one description')
    assert.ok(html.includes(`name="description" content="${escape(route.description)}"`))
    assert.equal((html.match(/<link\b[^>]*rel="canonical"/g) ?? []).length, 1, 'one canonical')
    assert.ok(html.includes(`rel="canonical" href="${canonical}"`))
    assert.ok(html.includes(`property="og:url" content="${canonical}"`))
    assert.ok(html.includes(`property="og:title" content="${escape(route.title)}"`))
    assert.ok(html.includes(`name="twitter:title" content="${escape(route.title)}"`))

    const scripts = [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)]
    assert.equal(scripts.length, 1, 'one page graph')
    const graph = JSON.parse(scripts[0][1])
    assert.equal(graph['@context'], 'https://schema.org')
    assert.ok(graph['@graph'].some(node => node['@id'] === ORGANIZATION_ID))
    assert.ok(graph['@graph'].some(node => node['@id'] === WEBSITE_ID))
    const page = graph['@graph'].find(node => node['@id'] === `${canonical}#webpage`)
    assert.ok(page, 'a page-specific entity exists')
    assert.equal(page.url, canonical)
    assert.equal(page.name, route.title)
    const ids = graph['@graph'].map(node => node['@id'])
    assert.equal(new Set(ids).size, ids.length, 'entity IDs are unique within a page')
    assert.ok(!graph['@graph'].some(node => node.aggregateRating || node.review), 'no invented ratings or reviews')

    if (route.noindex) {
      assert.match(html, /name="robots" content="noindex/)
      assert.ok(!urls.includes(canonical), 'private, experimental, and draft documents stay out of the sitemap')
      if (!route.publicDraft) {
        assert.doesNotMatch(html, /src="\/site-analytics\.js"/, 'private pages do not load public analytics')
        return
      }
      assert.equal(route.navLabel, undefined, 'a review draft is not promoted in public navigation')
      assert.match(html, /src="\/site-analytics\.js"/, 'a public draft retains the consent-based bootstrap')
    } else {
      assert.ok(urls.includes(canonical), 'every indexed public route is in the sitemap')
      assert.match(html, /name="robots" content="index, follow, max-image-preview:large"/)
    }
    assert.ok(!titles.has(route.title), 'public page titles are unique')
    assert.ok(!descriptions.has(route.description), 'public page descriptions are unique')
    titles.add(route.title)
    descriptions.add(route.description)
    assert.match(html, /<main\b[^>]*id="main"/, 'initial HTML contains the actual main content')
    const headings = [...html.matchAll(/<h([1-6])(?:\s[^>]*)?>([\s\S]*?)<\/h\1>/g)]
    assert.equal(headings.filter(match => match[1] === '1').length, 1, 'exactly one rendered H1')
    assert.equal(headings[0]?.[1], '1', 'the document starts its heading outline with H1')
    for (let i = 0; i < headings.length; i += 1) {
      assert.ok(headings[i][2].replace(/<[^>]*>/g, '').trim(), 'headings contain text')
      if (i) assert.ok(Number(headings[i][1]) <= Number(headings[i - 1][1]) + 1,
        `heading levels do not skip from H${headings[i - 1][1]} to H${headings[i][1]}`)
    }
    assert.ok(html.includes('data-route-path='), 'the client hydrates the same route snapshot')
    if (route.publicDraft) {
      // The qualification funnel deliberately omits the full marketing menu.
      for (const href of ['/', '/contact', '/privacy']) assert.ok(html.includes(`href="${href}"`), 'draft funnel retains essential navigation')
    } else assert.ok((html.match(/<a\b[^>]*href=/g) ?? []).length > 5, 'crawlable navigation is available without JavaScript')
    for (const img of html.matchAll(/<img\b[^>]*>/g)) assert.match(img[0], /\balt=/, 'images have a meaningful or intentionally empty alt attribute')
    if (route.path !== '/' && !route.noindex) {
      const breadcrumb = graph['@graph'].find(node => node['@type'] === 'BreadcrumbList')
      assert.ok(breadcrumb, 'inner pages have a breadcrumb graph')
      assert.equal(breadcrumb.itemListElement.at(-1).item, canonical)
      assert.deepEqual(breadcrumb.itemListElement.map(item => item.position), breadcrumb.itemListElement.map((_, index) => index + 1))
    }
    const service = graph['@graph'].find(node => node['@type'] === 'Service')
    if (route.serviceType) {
      assert.ok(service, 'a service landing page describes its actual service')
      assert.equal(service.serviceType, route.serviceType)
      assert.equal(service.provider['@id'], ORGANIZATION_ID)
    } else assert.ok(!service, 'general pages do not claim to be individual services')
  })
}

await test('sitemap and robots expose only canonical public documents', async () => {
  assert.match(sitemap, /<urlset xmlns="http:\/\/www.sitemaps.org\/schemas\/sitemap\/0.9">/)
  assert.equal(new Set(urls).size, urls.length, 'no duplicated sitemap URLs')
  for (const url of urls) {
    const parsed = new URL(url)
    assert.equal(parsed.origin, SITE_ORIGIN)
    assert.equal(parsed.search, '')
    assert.equal(parsed.hash, '')
    assert.ok(parsed.pathname === '/' || !parsed.pathname.endsWith('/'), 'one canonical slash style')
    assert.ok(!/^\/(?:demos|experiments|api|client-portal)(?:\/|$)/.test(parsed.pathname), 'samples and private routes are excluded')
    await access(join(root, 'dist', parsed.pathname.slice(1), 'index.html'))
  }
  const robots = await read('dist/robots.txt')
  assert.ok(robots.includes(`Sitemap: ${SITE_ORIGIN}/sitemap.xml`))
  assert.match(robots, /Disallow: \/api\//)
  assert.ok(!robots.includes('Disallow: /\n'), 'public pages remain crawlable')
  const notFound = await read('dist/404.html')
  assert.match(notFound, /<h1(?:\s|>)/, '404 response contains a readable page without JavaScript')
  assert.match(notFound, /name="robots" content="noindex/)
})

await test('JSON-LD escaping keeps embedded content inside the data script', () => {
  const value = { text: '</script><script>alert("sample")</script> & \u2028\u2029' }
  const encoded = serializeJsonLd(value)
  assert.ok(!encoded.includes('<'))
  assert.ok(!encoded.includes('>'))
  assert.ok(!encoded.includes('&'))
  assert.deepEqual(JSON.parse(encoded), value)
})

console.log(`SEO build verification covered ${publicRoutes.length} public marketing pages and ${urls.length} sitemap URLs.`)
