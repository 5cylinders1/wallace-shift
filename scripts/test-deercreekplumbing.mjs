import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import ts from 'typescript'

const root = fileURLToPath(new URL('../', import.meta.url))
const source = await readFile(join(root, 'src/demos/deercreekplumbing/data.ts'), 'utf8')
const js = ts.transpileModule(source, {compilerOptions:{target:ts.ScriptTarget.ES2023,module:ts.ModuleKind.ESNext}}).outputText
const { BASE, ORIGIN, pages } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`)
const paths = new Set(pages.map(page => BASE + (page.slug ? '/' + page.slug : '')))
assert.equal(BASE, '/demo/deercreekplumbing')
assert.equal(pages.length, 13)
const titles = new Set()
const descriptions = new Set()
for (const page of pages) {
  const path = BASE + (page.slug ? '/' + page.slug : '')
  await test(`independent concept ${path}`, async () => {
    const html = await readFile(join(root, 'dist', path.slice(1), 'index.html'), 'utf8')
    assert.equal((html.match(/<h1\b/g) ?? []).length, 1)
    assert.equal((html.match(/<title>/g) ?? []).length, 1)
    assert.ok(html.includes(`<link rel="canonical" href="${ORIGIN}${path}" />`))
    assert.ok(html.includes('content="noindex, nofollow"'))
    const title = html.match(/<title>(.*?)<\/title>/)?.[1]
    const description = html.match(/<meta name="description" content="(.*?)"/)?.[1]
    assert.ok(title && !titles.has(title)); titles.add(title)
    assert.ok(description && !descriptions.has(description)); descriptions.add(description)
    const json = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    assert.equal(json.length, 1)
    const graph = JSON.parse(json[0][1])['@graph']
    assert.equal(new Set(graph.map(node=>node['@id'])).size, graph.length)
    assert.ok(graph.some(node=>node['@type']==='Plumber'))
    assert.ok(graph.some(node=>node['@id']===`${ORIGIN}${path}#webpage`))
    assert.ok(!graph.some(node=>node.aggregateRating || node.review))
    if (page.kind==='service') {
      assert.ok(graph.some(node=>node['@type']==='Service'))
      assert.ok(graph.some(node=>node['@type']==='FAQPage' && node.mainEntity.length))
    }
    for (const [,url] of html.matchAll(/href="(\/demo\/deercreekplumbing[^"?#]*)/g)) assert.ok(paths.has(url), url)
    assert.doesNotMatch(html, /href="\/demo\/deercreek(?:["/#?])/)
    for (const image of html.match(/<img\b[^>]*>/g)??[]) assert.match(image,/\balt="/)
    assert.ok(!html.includes('/demo-assets/'))
    assert.ok(html.includes('data-dcp-slug='))
  })
}
await test('both concepts keep separate public routes', async () => {
  const config=JSON.parse(await readFile(join(root,'vercel.json'),'utf8'))
  assert.ok(!config.redirects.some(rule=>rule.source.startsWith('/demo/deercreek')))
  const first=await readFile(join(root,'dist/demo/deercreek/index.html'),'utf8')
  assert.ok(first.includes('data-dc-slug='))
  assert.ok(first.includes('href="https://wallaceshift.com/demo/deercreek"'))
  for(const source of [BASE,BASE+'/:path*']) assert.ok(config.headers.some(rule=>rule.source===source && rule.headers.some(header=>header.key==='X-Robots-Tag' && header.value==='noindex, nofollow')))
  assert.ok(!(await readFile(join(root,'dist/sitemap.xml'),'utf8')).includes(BASE))
})
