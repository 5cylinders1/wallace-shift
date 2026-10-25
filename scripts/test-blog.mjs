import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { access, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { loadBlogModules } from './load-blog-module.mjs'

const modules = await loadBlogModules()
const { loadPosts, renderMarkdown } = modules.content
const { buildBlog, indexDocument, postDocument, rssFeed, blogSitemapEntries } = modules.publish
const temporary = await mkdtemp(join(tmpdir(), 'wallace-blog-tests-'))
const now = new Date('2026-10-24T20:00:00Z')
let iteration = 0
after(async () => { await modules.cleanup(); await rm(temporary, { recursive: true, force: true }) })

function article(overrides = {}, body = '## A practical example\n\nThis is the complete, useful article body. [Services](/services)\n\n## Next steps\n\nChoose the next action.') {
  const data = {
    status: 'published', slug: 'choose-a-crm', title: 'How do you choose a CRM?',
    description: 'Compare the workflow, ownership, and next steps before choosing a CRM.',
    question: 'How do you choose a CRM?', answer: 'Start with the work your team needs to do, then compare the tools.',
    category: 'Custom CRMs', author: { name: 'Matthew Wallace', url: '/about' },
    publishedAt: '2026-10-23T09:00:00-05:00', ...overrides,
  }
  // JSON is valid YAML and keeps fixture values precise.
  return `---\n${JSON.stringify(data)}\n---\n${body}\n`
}

async function fixture(files = {}) {
  const root = join(temporary, String(iteration++))
  const postsDir = join(root, 'content/blog/posts')
  const outDir = join(root, 'dist')
  await mkdir(postsDir, { recursive: true })
  await mkdir(join(root, 'blog'), { recursive: true })
  await mkdir(outDir, { recursive: true })
  await writeFile(join(root, 'blog/blog.css'), 'body { color: black; }')
  await writeFile(join(outDir, 'sitemap.xml'), '<?xml version="1.0"?><urlset><url><loc>https://wallaceshift.com/services</loc></url></urlset>')
  for (const [name, source] of Object.entries(files)) await writeFile(join(postsDir, name), source)
  return { root, postsDir, outDir }
}

test('drafts and future articles stay out of the published list, feed, and sitemap', async () => {
  const { postsDir } = await fixture({
    'real.md': article(),
    'draft.md': '---\nstatus: draft\n---\nPRIVATE DRAFT BODY',
    'future.md': article({ slug: 'future-article', title: 'PRIVATE FUTURE TITLE', publishedAt: '2099-01-01T09:00:00Z' }),
  })
  const posts = await loadPosts(postsDir, now)
  assert.deepEqual(posts.map(post => post.slug), ['choose-a-crm'])
  for (const output of [indexDocument(posts, '/style.css'), rssFeed(posts), blogSitemapEntries(posts)]) assert.doesNotMatch(output, /PRIVATE|future-article/)
})

test('empty hub is noindex and absent from sitemap with no fake articles', () => {
  const html = indexDocument([], '/style.css')
  assert.match(html, /name="robots" content="noindex, follow"/)
  assert.equal(blogSitemapEntries([]), '')
  assert.doesNotMatch(rssFeed([]), /<item>/)
  assert.doesNotMatch(html, /"@type":"BlogPosting"/)
})

test('published article contains complete crawlable text and unique canonical metadata', async () => {
  const { postsDir } = await fixture({ 'real.md': article() })
  const posts = await loadPosts(postsDir, now)
  const html = postDocument(posts[0], posts, '/style.css')
  assert.match(html, /This is the complete, useful article body/)
  assert.match(html, /Start with the work your team needs to do/)
  assert.match(html, /rel="canonical" href="https:\/\/wallaceshift.com\/blog\/choose-a-crm"/)
  assert.equal((html.match(/<title>/g) ?? []).length, 1)
  assert.equal((html.match(/name="description"/g) ?? []).length, 1)
  assert.equal((html.match(/<h1(?:\s|>)/g) ?? []).length, 1)
  assert.doesNotMatch(html, /<script(?! type="application\/ld\+json")/)
  const schema = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])
  const post = schema['@graph'].find(item => item['@type'] === 'BlogPosting')
  assert.equal(post.author.name, 'Matthew Wallace')
  assert.equal(post.author.url, 'https://wallaceshift.com/about')
  assert.equal(post.datePublished, '2026-10-23T09:00:00-05:00')
  assert.equal(post.dateModified, undefined)
  assert.ok(schema['@graph'].some(item => item['@type'] === 'BreadcrumbList'))
})

test('hub becomes indexable when the first article is published', async () => {
  const { postsDir } = await fixture({ 'real.md': article() })
  const posts = await loadPosts(postsDir, now)
  assert.match(indexDocument(posts, '/style.css'), /name="robots" content="index, follow/)
  assert.match(blogSitemapEntries(posts), /<loc>https:\/\/wallaceshift.com\/blog<\/loc>/)
})

test('metadata and structured data cannot break out of their HTML context', async () => {
  const { postsDir } = await fixture({ 'real.md': article({ title: '</script><script>alert("x")</script> & title' }) })
  const posts = await loadPosts(postsDir, now)
  const html = postDocument(posts[0], posts, '/style.css')
  assert.doesNotMatch(html, /<script>alert/)
  assert.match(html, /&lt;\/script&gt;/)
  assert.doesNotThrow(() => JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]))
})

test('duplicate slugs fail the build, including future publications', async () => {
  const { postsDir } = await fixture({ 'a.md': article(), 'b.md': article({ publishedAt: '2099-01-01T09:00:00Z' }) })
  await assert.rejects(loadPosts(postsDir, now), /duplicate slug/)
})

test('invalid status, metadata, slugs, and dates fail with actionable errors', async () => {
  for (const [overrides, error] of [
    [{ status: 'publshed' }, /status must/], [{ title: '' }, /title must/], [{ slug: '../escape' }, /slug must/],
    [{ publishedAt: '2026-10-23' }, /timezone/], [{ publishedAt: '2026-02-30T09:00:00Z' }, /calendar/],
    [{ updatedAt: '2026-10-22T09:00:00Z' }, /cannot precede/], [{ updatedAt: '2099-01-01T09:00:00Z' }, /cannot be in the future/],
    [{ author: { name: 'Someone', url: 'javascript:alert(1)' } }, /profile URL/],
    [{ image: { src: '//example.test/image.jpg', alt: 'image' } }, /image.src/],
  ]) {
    const { postsDir } = await fixture({ 'invalid.md': article(overrides) })
    await assert.rejects(loadPosts(postsDir, now), error)
  }
})

test('headings have stable unique anchors and code samples remain usable', () => {
  const result = renderMarkdown('## Next steps\n\nText.\n\n## Next steps\n\n```html\n<script>example()</script>\n```', 'fixture.md')
  assert.deepEqual(result.toc.map(item => item.id), ['section-next-steps', 'section-next-steps-2'])
  assert.match(result.html, /&lt;script&gt;/)
  assert.throws(() => renderMarkdown('# Second title', 'fixture.md'), /start body headings/)
  const collisions = renderMarkdown('## Item\n\n## Item\n\n## Item 2\n\n## Item', 'fixture.md')
  assert.equal(new Set(collisions.toc.map(item => item.id)).size, 4)
})

test('raw HTML and unsafe links are rejected, including nested links', () => {
  for (const markdown of ['<script>alert(1)</script>', '[unsafe](javascript:alert%281%29)', '[unsafe](data:text/html,bad)', '**[unsafe](//example.test)**', '![image](javascript:evil)', '![](/image.webp)']) {
    assert.throws(() => renderMarkdown(markdown, 'fixture.md'), /raw HTML|unsafe|alt text/)
  }
  assert.doesNotThrow(() => renderMarkdown('[safe](https://example.test/a?x=1&y=2) [local](/services) [section](#section-one)', 'fixture.md'))
})

test('front matter cannot select gray-matter JavaScript evaluation', async () => {
  const { postsDir } = await fixture({ 'invalid.md': '---js\n({status: "draft"})\n---\nbody' })
  await assert.rejects(loadPosts(postsDir, now), /JavaScript front matter/)
})

test('build writes static pages, preserves main sitemap, and removes withdrawn article output', async () => {
  const { root, outDir, postsDir } = await fixture({ 'real.md': article() })
  const { cssPath } = await buildBlog(root, outDir, now)
  await access(join(outDir, cssPath.slice(1)))
  assert.match(await readFile(join(outDir, 'blog/choose-a-crm/index.html'), 'utf8'), /complete, useful article body/)
  const sitemap = await readFile(join(outDir, 'sitemap.xml'), 'utf8')
  assert.match(sitemap, /https:\/\/wallaceshift.com\/services/)
  assert.equal((sitemap.match(/<loc>https:\/\/wallaceshift.com\/blog<\/loc>/g) ?? []).length, 1)
  await writeFile(join(postsDir, 'real.md'), article({ status: 'draft' }))
  await buildBlog(root, outDir, now)
  await assert.rejects(access(join(outDir, 'blog/choose-a-crm/index.html')))
  assert.doesNotMatch(await readFile(join(outDir, 'sitemap.xml'), 'utf8'), /\/blog/)
  assert.doesNotMatch(await readFile(join(outDir, 'blog/feed.xml'), 'utf8'), /choose-a-crm/)
})

test('preview serves exact built content with canonical redirects and real 404s', async () => {
  const { root, outDir } = await fixture({ 'real.md': article() })
  await buildBlog(root, outDir, now)
  let handler
  const plugin = modules.plugin.blogPlugin()
  plugin.configurePreviewServer({ config: { root, build: { outDir: 'dist' } }, middlewares: { use(value) { handler = value } } })
  async function request(url) {
    const res = { statusCode: 200, headers: {}, setHeader(name, value) { this.headers[name] = value }, end(body) { this.body = body } }
    await handler({ url, method: 'GET' }, res, error => { if (error) throw error; res.passed = true })
    return res
  }
  assert.equal((await request('/blog/choose-a-crm')).statusCode, 200)
  assert.equal((await request('/blog/missing')).statusCode, 404)
  assert.equal((await request('/blog/not/a/route')).statusCode, 404)
  assert.equal((await request('/blog/')).statusCode, 308)
  assert.equal((await request('/blog/index.html')).headers.Location, '/blog')
  assert.equal((await request('/services')).passed, true)
  assert.match((await request('/blog/feed.xml')).headers['Content-Type'], /rss/)
})

test('development serves static articles, blocks indexing, and keeps drafts unavailable', async () => {
  const { root } = await fixture({
    'real.md': article({ publishedAt: '2000-01-01T09:00:00Z' }),
    'draft.md': article({ status: 'draft', slug: 'private-draft', title: 'PRIVATE DRAFT' }),
  })
  let handler
  modules.plugin.blogPlugin().configureServer({
    config: { root }, watcher: { add() {}, on() {} }, ws: { send() {} },
    middlewares: { use(value) { handler = value } },
  })
  async function request(url, method = 'GET') {
    const res = { statusCode: 200, headers: {}, setHeader(name, value) { this.headers[name] = value }, end(body) { this.body = body } }
    await handler({ url, method }, res, error => { if (error) throw error; res.passed = true })
    return res
  }
  const post = await request('/blog/choose-a-crm')
  assert.equal(post.statusCode, 200)
  assert.match(post.body, /complete, useful article body/)
  assert.equal(post.headers['X-Robots-Tag'], 'noindex, nofollow')
  assert.equal((await request('/blog/private-draft')).statusCode, 404)
  assert.doesNotMatch((await request('/blog')).body, /PRIVATE DRAFT/)
  assert.equal((await request('/blog', 'HEAD')).body, undefined)
})
