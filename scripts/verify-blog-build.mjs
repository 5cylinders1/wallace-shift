import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadBlogModules } from './load-blog-module.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))
const { content, cleanup } = await loadBlogModules()
try {
  const posts = await content.loadPosts(join(root, 'content/blog/posts'))
  const hub = await readFile(join(root, 'dist/blog/index.html'), 'utf8')
  const sitemap = await readFile(join(root, 'dist/sitemap.xml'), 'utf8')
  const rss = await readFile(join(root, 'dist/blog/feed.xml'), 'utf8')
  assert.match(hub, /rel="canonical" href="https:\/\/wallaceshift.com\/blog"/)
  assert.match(hub, /<main[^>]*id="main"/)
  assert.equal((hub.match(/<h1(?:\s|>)/g) ?? []).length, 1)
  const hubGraph = JSON.parse(hub.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph']
  assert.ok(hubGraph.some(node => node['@type'] === 'CollectionPage'))
  assert.ok(hubGraph.some(node => node['@id'] === 'https://wallaceshift.com/#website'))
  const css = hub.match(/rel="stylesheet" href="(\/blog\/assets\/[^" ]+)"/)[1]
  await access(join(root, 'dist', css.slice(1)))
  assert.match(await readFile(join(root, 'dist/robots.txt'), 'utf8'), /Sitemap: https:\/\/wallaceshift.com\/sitemap.xml/)
  if (!posts.length) {
    assert.match(hub, /name="robots" content="noindex, follow"/)
    assert.doesNotMatch(sitemap, /<loc>https:\/\/wallaceshift.com\/blog(?:<|\/)/)
    assert.doesNotMatch(rss, /<item>/)
  }
  for (const post of posts) {
    const html = await readFile(join(root, 'dist/blog', post.slug, 'index.html'), 'utf8')
    assert.match(html, /"@type":"BlogPosting"/)
    assert.equal((html.match(/<h1(?:\s|>)/g) ?? []).length, 1, `${post.slug}: exactly one H1`)
    let previousHeading = 0
    for (const heading of html.matchAll(/<h([1-6])(?:\s|>)/g)) {
      const current = Number(heading[1])
      assert.ok(current <= previousHeading + 1, `${post.slug}: no skipped heading level`)
      previousHeading = current
    }
    const graph = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph']
    const article = graph.find(node => node['@type'] === 'BlogPosting')
    const page = graph.find(node => node['@type'] === 'WebPage')
    assert.equal(article.mainEntityOfPage['@id'], page['@id'])
    assert.equal(article.publisher['@id'], 'https://wallaceshift.com/#organization')
    assert.match(html, /name="robots" content="index, follow/)
    assert.ok(html.includes(post.html), `${post.slug}: full Markdown body must be present in HTML`)
    assert.ok(sitemap.includes(`https://wallaceshift.com/blog/${post.slug}</loc>`))
    assert.ok(rss.includes(`https://wallaceshift.com/blog/${post.slug}</link>`))
    const analyticsScript = '<script defer src="/site-analytics.js"></script>'
    assert.equal(html.split(analyticsScript).length - 1, 1, 'includes exactly one approved analytics bootstrap')
    assert.doesNotMatch(html.replace(analyticsScript, ''), /<script(?! type="application\/ld\+json")/,
      'the article remains static HTML with no other executable scripts')
  }
  console.log(`Blog build verified: hub, ${posts.length} published articles, CSS, RSS, canonical URLs, and sitemap.`)
} finally { await cleanup() }
