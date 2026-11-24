import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'
import react from '@vitejs/plugin-react'
import { createServer, type Plugin, type ResolvedConfig } from 'vite'

/** The LP Construction concept: static, server-rendered pages under
 * /demo/lp-construction, modelled on the American Mechanical plugin, plus
 * the sitemap the site would carry on its own domain. Every page stays
 * noindex while it is a concept on wallaceshift.com. */
interface RenderedPage {
  lang: 'en' | 'es'
  alternates: { lang: string; url: string }[]
  slug: string
  html: string
  title: string
  description: string
  canonical: string
  jsonLd: string
  robots: string
}
interface Renderer {
  renderLp: (path: string) => RenderedPage | null
  lpPaths: string[]
  lpSitemap: (lastModified: string) => string
}

const entry = 'demos/lp-construction/index.html'
const renderEntry = '/src/demos/lp-construction/render.tsx'
const base = '/demo/lp-construction'
const robots = 'noindex, nofollow'
const ogImage = 'https://wallaceshift.com/demos/lp-construction/hero/finished-1248.webp'

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function attribute(tag: string, name: string) {
  return tag.match(new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, 'i'))?.[2]
}

export function lpDocument(template: string, page: RenderedPage) {
  // A real business's concept on our domain must stay out of search results.
  if (page.robots !== robots) throw new Error(`LP Construction page ${page.canonical} must remain ${robots}`)
  const metadata = [
    `<title>${escapeHtml(page.title)}</title>`,
    `<meta name="description" content="${escapeHtml(page.description)}" />`,
    `<meta name="robots" content="${robots}" />`,
    `<link rel="canonical" href="${escapeHtml(page.canonical)}" />`,
    '<meta property="og:type" content="website" />',
    '<meta property="og:site_name" content="LP Construction" />',
    `<meta property="og:locale" content="${page.lang === 'es' ? 'es_US' : 'en_US'}" />`,
    ...page.alternates.map(item => `<link rel="alternate" hreflang="${item.lang}" href="${escapeHtml(item.url)}" />`),
    `<meta property="og:title" content="${escapeHtml(page.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(page.description)}" />`,
    `<meta property="og:url" content="${escapeHtml(page.canonical)}" />`,
    `<meta property="og:image" content="${ogImage}" />`,
    `<script type="application/ld+json">${page.jsonLd}</script>`,
  ].join('\n    ')
  const withoutMetadata = template
    .replace(/<title\b[^>]*>[\s\S]*?<\/title>\s*/gi, '')
    .replace(/<meta\b[^>]*>\s*/gi, tag => {
      const key = (attribute(tag, 'name') || attribute(tag, 'property') || '').toLowerCase()
      return key === 'description' || key === 'robots' || key.startsWith('og:') || key.startsWith('twitter:') ? '' : tag
    })
    .replace(/<link\b[^>]*>\s*/gi, tag => attribute(tag, 'rel')?.toLowerCase() === 'canonical' ? '' : tag)
  const rootPattern = /<div\b(?=[^>]*\bid=["']root["'])[^>]*>[\s\S]*<\/div>/i
  if (!rootPattern.test(withoutMetadata)) throw new Error(`Missing root element in ${entry}`)
  return withoutMetadata
    .replace(/<html\b[^>]*>/i, `<html lang="${page.lang}">`)
    .replace('</head>', `    ${metadata}\n  </head>`)
    .replace(rootPattern, () => `<div id="root" data-lp-slug="${escapeHtml(page.slug)}" data-lp-lang="${page.lang}">${page.html}</div>`)
}

function requestedPath(request: IncomingMessage) {
  const url = new URL(request.url ?? '/', 'http://localhost')
  if (!/^\/(?:demo|demos)\/lp-construction(?:\/|$)/.test(url.pathname)) return null
  if (url.pathname === `${base}/sitemap.xml`) return url.pathname
  // Assets (anything with a file extension other than .html) are left to Vite.
  if (/\.[a-z0-9]+$/i.test(url.pathname) && !url.pathname.endsWith('/index.html')) return null
  const normalized = url.pathname.replace(/\/index\.html$/, '').replace(/\/+$/, '')
  return normalized.replace(/^\/demos\/lp-construction/, base)
}

function respond(request: IncomingMessage, response: ServerResponse, status: number, body: string, type = 'text/html; charset=utf-8') {
  response.statusCode = status
  response.setHeader('Content-Type', type)
  response.setHeader('X-Robots-Tag', robots)
  response.setHeader('Cache-Control', 'no-store')
  response.end(request.method === 'HEAD' ? undefined : body)
}

const notFound = '<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex, nofollow"><title>Page not found | LP Construction</title></head><body><main><h1>Page not found</h1><p>This page is not part of the LP Construction concept.</p><a href="/demo/lp-construction">Return to LP Construction</a></main></body></html>'

const today = () => new Date().toISOString().slice(0, 10)

export function lpConstructionPlugin(): Plugin {
  let config: ResolvedConfig
  return {
    name: 'wallace-shift-lp-construction-static-pages',
    configResolved(resolved) { config = resolved },
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const path = requestedPath(request)
        if (path === null) return next()
        if (request.method !== 'GET' && request.method !== 'HEAD') {
          response.setHeader('Allow', 'GET, HEAD')
          return respond(request, response, 405, '<!doctype html><title>Method not allowed</title><h1>Method not allowed</h1>')
        }
        try {
          const { renderLp, lpSitemap } = await server.ssrLoadModule(renderEntry) as Renderer
          if (path.endsWith('/sitemap.xml')) return respond(request, response, 200, lpSitemap(today()), 'application/xml; charset=utf-8')
          const page = renderLp(path)
          if (!page) return respond(request, response, 404, notFound)
          const template = await readFile(join(server.config.root, entry), 'utf8')
          respond(request, response, 200, await server.transformIndexHtml(path, lpDocument(template, page)))
        } catch (error) { next(error as Error) }
      })
    },
    configurePreviewServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const path = requestedPath(request)
        if (path === null) return next()
        const output = resolve(server.config.root, server.config.build.outDir)
        try {
          if (path.endsWith('/sitemap.xml')) return respond(request, response, 200, await readFile(join(output, path.slice(1)), 'utf8'), 'application/xml; charset=utf-8')
          respond(request, response, 200, await readFile(join(output, path.slice(1), 'index.html'), 'utf8'))
        } catch { respond(request, response, 404, notFound) }
      })
    },
    closeBundle: {
      order: 'post',
      sequential: true,
      async handler() {
        if (config.command !== 'build' || config.mode === 'demos') return
        const output = resolve(config.root, config.build.outDir)
        const template = await readFile(join(output, entry), 'utf8')
        const renderer = await createServer({
          root: config.root,
          configFile: false,
          plugins: [react()],
          mode: config.mode,
          appType: 'custom',
          logLevel: 'error',
          server: { middlewareMode: true, watch: null, hmr: false, ws: false },
        })
        try {
          const { renderLp, lpPaths, lpSitemap } = await renderer.ssrLoadModule(renderEntry) as Renderer
          for (const path of lpPaths) {
            const page = renderLp(path)
            if (!page) throw new Error(`Missing LP Construction renderer for ${path}`)
            const html = lpDocument(template, page)
            const destination = join(output, path.slice(1), 'index.html')
            await mkdir(dirname(destination), { recursive: true })
            await writeFile(destination, html)
            if (path === base) await writeFile(join(output, entry), html)
          }
          await writeFile(join(output, base.slice(1), 'sitemap.xml'), lpSitemap(today()))
          this.info(`rendered ${lpPaths.length} LP Construction pages and their sitemap; indexing remains disabled`)
        } finally { await renderer.close() }
      },
    },
  }
}
