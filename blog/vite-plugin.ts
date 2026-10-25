import { readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import type { Plugin, ResolvedConfig } from 'vite'
import { loadPosts } from './content.ts'
import { buildBlog, indexDocument, notFoundDocument, postDocument, rssFeed } from './publish.ts'

/** Real HTML for every blog page. No SPA fallback or browser rendering required. */
export function blogPlugin(): Plugin {
  let config: ResolvedConfig
  return {
    name: 'wallace-shift-blog',
    configResolved(resolved) { config = resolved },
    closeBundle: {
      order: 'post',
      sequential: true,
      async handler() {
        if (config.command !== 'build') return
        const { posts } = await buildBlog(config.root, resolve(config.root, config.build.outDir))
        this.info(`generated /blog and ${posts.length} published articles, RSS, and sitemap entries`)
      },
    },
    configureServer(server) {
      server.watcher.add([join(server.config.root, 'content/blog'), join(server.config.root, 'blog')])
      server.watcher.on('change', file => {
        if (/\/(?:content\/blog|blog)\//.test(file)) server.ws.send({ type: 'full-reload' })
      })
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url ?? '/', 'http://localhost')
        if (url.pathname !== '/blog' && !url.pathname.startsWith('/blog/')) return next()
        try {
          const cssPath = '/blog/assets/blog.css'
          const posts = await loadPosts(join(server.config.root, 'content/blog/posts'))
          let body: string
          let contentType = 'text/html; charset=utf-8'
          if (url.pathname === cssPath) {
            body = await readFile(join(server.config.root, 'blog/blog.css'), 'utf8')
            contentType = 'text/css; charset=utf-8'
          } else if (url.pathname === '/blog/feed.xml') {
            body = rssFeed(posts)
            contentType = 'application/rss+xml; charset=utf-8'
          } else {
            const canonicalPath = url.pathname.replace(/\/index\.html$/, '').replace(/\/+$/, '')
            const post = posts.find(item => canonicalPath === `/blog/${item.slug}`)
            if (canonicalPath === '/blog' || post) {
              if (url.pathname !== canonicalPath) { res.statusCode = 308; res.setHeader('Location', canonicalPath + url.search); res.end(); return }
              body = post ? postDocument(post, posts, cssPath) : indexDocument(posts, cssPath)
            } else { res.statusCode = 404; body = notFoundDocument(cssPath) }
          }
          res.setHeader('Content-Type', contentType)
          res.setHeader('Cache-Control', 'no-store')
          res.setHeader('X-Robots-Tag', 'noindex, nofollow')
          res.end(req.method === 'HEAD' ? undefined : body)
        } catch (error) { next(error as Error) }
      })
    },
    configurePreviewServer(server) {
      // Serve the exact built snapshot. A future publication time passing does
      // not publish content until a new build is deployed.
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url ?? '/', 'http://localhost')
        if (url.pathname !== '/blog' && !url.pathname.startsWith('/blog/')) return next()
        const path = url.pathname.replace(/\/index\.html$/, '').replace(/\/+$/, '')
        let relative: string | undefined
        let contentType = 'text/html; charset=utf-8'
        if (path === '/blog') relative = 'blog/index.html'
        else if (/^\/blog\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(path)) relative = `${path.slice(1)}/index.html`
        else if (path === '/blog/feed.xml') { relative = 'blog/feed.xml'; contentType = 'application/rss+xml; charset=utf-8' }
        else if (/^\/blog\/assets\/blog-[a-f0-9]+\.css$/.test(path)) { relative = path.slice(1); contentType = 'text/css; charset=utf-8' }
        try {
          if (!relative) throw Object.assign(new Error('Not found'), { code: 'ENOENT' })
          const body = await readFile(join(resolve(server.config.root, server.config.build.outDir), relative), 'utf8')
          if (url.pathname !== path) { res.statusCode = 308; res.setHeader('Location', path + url.search); res.end(); return }
          res.setHeader('Content-Type', contentType)
          res.end(req.method === 'HEAD' ? undefined : body)
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') return next(error as Error)
          res.statusCode = 404
          res.setHeader('Content-Type', 'text/html; charset=utf-8')
          res.setHeader('X-Robots-Tag', 'noindex')
          const hub = await readFile(join(resolve(server.config.root, server.config.build.outDir), 'blog/index.html'), 'utf8').catch(() => '')
          const cssPath = hub.match(/rel="stylesheet" href="(\/blog\/assets\/[^" ]+)"/)?.[1] ?? ''
          res.end(req.method === 'HEAD' ? undefined : notFoundDocument(cssPath))
        }
      })
    },
  }
}
