import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { access, mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { prepareDraftPreview, previewHandler } from './preview-blog-post.mjs'

const roots = []
const previews = []
after(async () => {
  await Promise.all(previews.map(preview => preview.cleanup()))
  await Promise.all(roots.map(root => rm(root, { recursive: true, force: true })))
})

async function fixture(overrides = {}) {
  const root = await mkdtemp(join(tmpdir(), 'wallace-draft-preview-test-'))
  roots.push(root)
  const source = join(root, 'content/blog/posts/article.md')
  const assetsDirectory = join(root, 'content/blog/assets/review-example')
  for (const directory of ['content/blog/posts', 'content/blog/assets/review-example', 'public/resources', 'public/demos/private', 'blog']) await mkdir(join(root, directory), { recursive: true })
  await writeFile(join(root, 'blog/blog.css'), 'body { color: black; }')
  await writeFile(join(assetsDirectory, 'feature.webp'), 'image fixture')
  await writeFile(join(assetsDirectory, 'checklist.pdf'), '%PDF-1.7\nreview fixture')
  await writeFile(join(assetsDirectory, 'private-notes.txt'), 'PRIVATE NOTES')
  await writeFile(join(root, 'public/resources/unrelated.pdf'), 'UNRELATED RESOURCE')
  await writeFile(join(root, 'public/demos/private/source.js'), 'PRIVATE DEMO')
  const metadata = {
    status: 'draft', slug: 'review-example', title: 'What should you review?',
    description: 'A draft for review.', question: 'What should you check?', answer: 'Review the content and examples.',
    category: 'Websites', author: { name: 'Matthew Wallace', url: '/about' },
    // Deliberately invalid for publication: preview must not borrow these dates.
    publishedAt: 'DRAFT ONLY', updatedAt: '2099-01-01T09:00:00Z',
    image: { src: '/media/blog/feature.webp', alt: 'Draft illustration' }, ...overrides,
  }
  const original = `---\n${JSON.stringify(metadata)}\n---\n## Next steps\n\n[Checklist](/resources/checklist.pdf), [services](/services), and [this section](#section-next-steps).`
  await writeFile(source, original)
  return { root, source, assetsDirectory, original }
}

async function prepare(input) {
  const preview = await prepareDraftPreview(input.root, input.source)
  previews.push(preview)
  return preview
}

test('draft review leaves source and build untouched, hides publication claims, and maps only intended assets', async () => {
  const input = await fixture()
  const preview = await prepare(input)
  assert.equal(await readFile(input.source, 'utf8'), input.original)
  await assert.rejects(access(join(input.root, 'dist')))
  assert.match(preview.html, /Draft · awaiting review/)
  assert.match(preview.html, /name="robots" content="noindex, nofollow"/)
  assert.doesNotMatch(preview.html, /article:published_time|article:modified_time|application\/ld\+json|Published <time|DRAFT ONLY|2099-01-01/)
  assert.match(preview.html, /rel="canonical" href="https:\/\/wallaceshift.com\/blog\/review-example"/)
  assert.match(preview.html, /href="https:\/\/wallaceshift.com\/services"/)
  assert.match(preview.html, /href="\/resources\/checklist.pdf"/)
  assert.match(preview.html, /href="#section-next-steps"/)
  assert.equal(preview.assets.get('/media/blog/feature.webp').type, 'image/webp')
  assert.equal(preview.assets.get('/resources/checklist.pdf').type, 'application/pdf')
  assert.equal(preview.assets.has('/resources/unrelated.pdf'), false)
  assert.equal(preview.assets.has('/content/blog/assets/review-example/private-notes.txt'), false)
})

test('request handler honors GET/HEAD, rejects other hosts and methods, and never serves unlisted files', async () => {
  const preview = await prepare(await fixture())
  const handle = previewHandler(preview, 4175)
  function request(url, method = 'GET', host = '127.0.0.1:4175') {
    const response = { headers: {}, setHeader(name, value) { this.headers[name] = value }, end(body) { this.body = body } }
    handle({ url, method, headers: { host } }, response)
    assert.equal(response.headers['Cache-Control'], 'no-store')
    assert.equal(response.headers['X-Robots-Tag'], 'noindex, nofollow')
    return response
  }
  assert.equal(request('/').statusCode, 200)
  assert.equal(request('/blog/review-example').statusCode, 200)
  assert.equal(request('/blog/review-example', 'HEAD').body, undefined)
  assert.equal(request('/resources/checklist.pdf').headers['Content-Type'], 'application/pdf')
  assert.equal(request('/blog/assets/blog-preview.css').headers['Content-Type'], 'text/css; charset=utf-8')
  for (const path of ['/resources/unrelated.pdf', '/demos/private/source.js', '/content/blog/assets/review-example/private-notes.txt', '/resources/%2e%2e/private-notes.txt', '/missing']) assert.equal(request(path).statusCode, 404)
  assert.equal(request('/missing', 'HEAD').body, undefined)
  assert.equal(request('/', 'POST').statusCode, 405)
  assert.equal(request('/', 'POST').headers.Allow, 'GET, HEAD')
  assert.equal(request('/', 'GET', 'outside.example:4175').statusCode, 403)
})

test('preview rejects sources outside posts, invalid source statuses, invalid metadata, and executable front matter', async () => {
  const input = await fixture()
  const outside = join(input.root, 'outside.md')
  await writeFile(outside, input.original)
  await assert.rejects(prepareDraftPreview(input.root, outside), /inside this repository/)
  const link = join(input.root, 'content/blog/posts/linked.md')
  await symlink(outside, link)
  await assert.rejects(prepareDraftPreview(input.root, link), /inside this repository/)
  const invalidStatus = await fixture({ status: 'ready' })
  await assert.rejects(prepareDraftPreview(invalidStatus.root, invalidStatus.source), /Source status/)
  const invalidTitle = await fixture({ title: '' })
  await assert.rejects(prepareDraftPreview(invalidTitle.root, invalidTitle.source), /title must/)
  await writeFile(input.source, '---js\n({status: "draft"})\n---\nbody')
  await assert.rejects(prepareDraftPreview(input.root, input.source), /JavaScript front matter/)
})

test('draft asset lookup cannot follow symlinks outside the article asset directory', async () => {
  const input = await fixture()
  await rm(join(input.assetsDirectory, 'checklist.pdf'))
  await symlink(join(input.root, 'public/resources/unrelated.pdf'), join(input.assetsDirectory, 'checklist.pdf'))
  await assert.rejects(prepareDraftPreview(input.root, input.source), /Unsafe preview asset/)
  const invalidImage = await fixture({ image: { src: '/demos/private/preview.webp', alt: 'Private demo' } })
  await assert.rejects(prepareDraftPreview(invalidImage.root, invalidImage.source), /Local feature images must/)
})
