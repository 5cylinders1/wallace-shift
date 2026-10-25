import { createServer } from 'node:http'
import { mkdtemp, readFile, realpath, rm, stat, writeFile } from 'node:fs/promises'
import { basename, extname, isAbsolute, join, relative, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath, pathToFileURL } from 'node:url'
import matter from 'gray-matter'
import { loadBlogModules } from './load-blog-module.mjs'

const ORIGIN = 'https://wallaceshift.com'
const CSS_PATH = '/blog/assets/blog-preview.css'
const inside = (parent, child) => {
  const path = relative(parent, child)
  return path !== '..' && !path.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`) && !isAbsolute(path)
}
const imageTypes = { '.avif': 'image/avif', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.svg': 'image/svg+xml' }

/** Prepare one local review snapshot. The source and production build are untouched. */
export async function prepareDraftPreview(rootPath, inputPath) {
  const root = await realpath(rootPath)
  const postsDirectory = await realpath(join(root, 'content/blog/posts'))
  const sourcePath = await realpath(inputPath)
  if (!inside(root, postsDirectory) || !inside(postsDirectory, sourcePath) || extname(sourcePath) !== '.md' || !(await stat(sourcePath)).isFile()) {
    throw new Error('Choose one .md file inside this repository’s content/blog/posts directory.')
  }
  const rejectJavaScript = () => { throw new Error('JavaScript front matter is not supported.') }
  const parsed = matter(await readFile(sourcePath, 'utf8'), { language: 'yaml', engines: { js: rejectJavaScript, javascript: rejectJavaScript } })
  if (!['draft', 'published'].includes(parsed.data.status)) throw new Error('Source status must be draft or published.')
  const temporary = await mkdtemp(join(tmpdir(), 'wallace-blog-preview-'))
  let modules
  const cleanup = async () => { await modules?.cleanup(); await rm(temporary, { recursive: true, force: true }) }
  try {
    modules = await loadBlogModules()
    const now = new Date()
    const metadata = { ...parsed.data, status: 'published', publishedAt: now.toISOString().replace(/\.\d{3}Z$/, 'Z') }
    delete metadata.updatedAt
    // JSON is valid YAML. The synthetic timestamp exists only for validation;
    // it is removed from every rendered publication claim below.
    await writeFile(join(temporary, 'preview.md'), `---\n${JSON.stringify(metadata)}\n---\n${parsed.content}`)
    const [post] = await modules.content.loadPosts(temporary, now)
    if (!post) throw new Error('The article could not be prepared for review.')
    const pathname = `/blog/${post.slug}`
    const assets = new Map()
    assets.set(CSS_PATH, { body: await readFile(join(root, 'blog/blog.css')), type: 'text/css; charset=utf-8' })
    const publicRoot = await realpath(join(root, 'public'))

    async function readAsset(path, parent) {
      try {
        const actual = await realpath(path)
        if (!inside(parent, actual) || actual !== path || !(await stat(actual)).isFile()) throw new Error(`Unsafe preview asset: ${path}`)
        return await readFile(actual)
      } catch (error) { if (error.code === 'ENOENT') return undefined; throw error }
    }
    for (const [url, type] of [
      ['/favicon.svg', 'image/svg+xml'], ['/favicon-512.png', 'image/png'],
      ['/brand/wallace-shift-logo-white.svg', 'image/svg+xml'], ['/brand/wallace-shift-logo-black.svg', 'image/svg+xml'],
    ]) {
      const body = await readAsset(join(publicRoot, url.slice(1)), publicRoot)
      if (body) assets.set(url, { body, type })
    }
    async function articleAsset(url, type) {
      const draftDirectory = join(root, 'content/blog/assets', post.slug)
      const body = await readAsset(join(publicRoot, url.slice(1)), publicRoot)
        ?? await readAsset(join(draftDirectory, basename(url)), draftDirectory)
      if (!body) throw new Error(`Preview asset not found: ${url}. Place it in public or content/blog/assets/${post.slug}/.`)
      assets.set(url, { body, type })
    }
    if (post.image?.src.startsWith('/')) {
      if (!/^\/media\/blog\/[a-z0-9][a-z0-9._-]*\.(avif|webp|png|jpe?g|gif|svg)$/i.test(post.image.src)) throw new Error('Local feature images must use /media/blog/<filename> with a supported image extension.')
      await articleAsset(post.image.src, imageTypes[extname(post.image.src).toLowerCase()])
    }
    for (const match of post.html.matchAll(/<a\b[^>]*\bhref="(\/resources\/[a-z0-9][a-z0-9._-]*\.pdf)"/gi)) {
      await articleAsset(match[1], 'application/pdf')
    }
    const escape = modules.content.escapeHtml
    const byline = `<div class="blog-byline"><a href="${escape(post.author.url)}">By ${escape(post.author.name)}</a><span>Draft · awaiting review</span><span>${post.readingMinutes} min read</span></div>`
    let html = modules.publish.postDocument(post, [post], CSS_PATH)
      .replace(/<title>/, '<title>[Draft] ')
      .replace(/<meta name="robots"[^>]*>/, '<meta name="robots" content="noindex, nofollow" />')
      .replace(/\s*<meta property="article:(?:published|modified)_time"[^>]*>/g, '')
      .replace(/\s*<script type="application\/ld\+json">[\s\S]*?<\/script>/g, '')
      .replace(/\s*<link rel="alternate"[^>]*>/g, '')
      .replace(/<meta property="og:type" content="article" \/>/, '<meta property="og:type" content="website" />')
      .replace(/<div class="blog-byline">[\s\S]*?<\/div>/, () => byline)
      .replace('<main id="main">', '<aside role="note" style="padding:16px 24px;background:#f4d88b;color:#171b20;text-align:center;font:600 14px/1.5 Manrope,system-ui,sans-serif">Draft preview · awaiting review. This local preview does not publish the article.</aside><main id="main">')
    // Navigation goes to the real site; local anchors and explicitly allowed
    // review assets stay here. No general public-directory server is mounted.
    html = html.replace(/href="(\/(?!\/)[^"]*)"/g, (attribute, href) => {
      const path = href.split(/[?#]/)[0]
      return assets.has(path) || path === pathname ? attribute : `href="${ORIGIN}${href}"`
    })
    return { html, assets, pathname, cleanup }
  } catch (error) { await cleanup(); throw error }
}

export function previewHandler(preview, port) {
  return (req, res) => {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow')
    res.setHeader('Cache-Control', 'no-store')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Referrer-Policy', 'no-referrer')
    const send = (status, body, type = 'text/plain; charset=utf-8') => {
      res.statusCode = status
      res.setHeader('Content-Type', type)
      res.setHeader('Content-Length', Buffer.byteLength(body))
      res.end(req.method === 'HEAD' ? undefined : body)
    }
    if (![ `127.0.0.1:${port}`, `localhost:${port}` ].includes(req.headers.host)) return send(403, 'Local preview only.')
    if (!['GET', 'HEAD'].includes(req.method)) { res.setHeader('Allow', 'GET, HEAD'); return send(405, 'Method not allowed.') }
    let path
    try { path = new URL(req.url ?? '/', `http://127.0.0.1:${port}`).pathname } catch { return send(400, 'Invalid URL.') }
    if (path === '/' || path === preview.pathname) return send(200, preview.html, 'text/html; charset=utf-8')
    const asset = preview.assets.get(path)
    if (asset) return send(200, asset.body, asset.type)
    return send(404, 'This resource is not part of the local draft preview.')
  }
}

async function main() {
  const args = process.argv.slice(2)
  if (!args[0] || (args.length !== 1 && (args.length !== 3 || args[1] !== '--port'))) throw new Error('Usage: node scripts/preview-blog-post.mjs content/blog/posts/FILE.md [--port 4175]')
  const port = args[2] === undefined ? 4175 : Number(args[2])
  if (!Number.isInteger(port) || port < 1024 || port > 65535 || (args[2] !== undefined && !/^\d+$/.test(args[2]))) throw new Error('Port must be an integer between 1024 and 65535.')
  const preview = await prepareDraftPreview(fileURLToPath(new URL('../', import.meta.url)), resolve(args[0]))
  const server = createServer(previewHandler(preview, port))
  let stopping = false
  async function stop() {
    if (stopping) return
    stopping = true
    server.closeAllConnections()
    await new Promise(resolveClose => server.close(resolveClose))
    await preview.cleanup()
  }
  process.once('SIGINT', () => { void stop() })
  process.once('SIGTERM', () => { void stop() })
  try {
    await new Promise((resolveListen, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolveListen) })
    console.log(`Draft preview: http://127.0.0.1:${port}${preview.pathname}\nSource unchanged. Restart this command after editing. Press Ctrl+C to stop.`)
  } catch (error) { await preview.cleanup(); throw error }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1 })
}
