import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'
import react from '@vitejs/plugin-react'
import { createServer, type Plugin, type ResolvedConfig } from 'vite'

export const bucyrusPaths = [
  '/bucyrus-auto',
  '/bucyrus-auto/services/maintenance',
  '/bucyrus-auto/services/auto-repair',
  '/bucyrus-auto/services/drivetrain',
  '/bucyrus-auto/services/modifications',
  '/bucyrus-auto/vehicle-guide',
] as const

interface RenderedBucyrus {
  html: string
  title: string
  description: string
  canonical: string
  jsonLd: object
  robots: string
}
type RenderBucyrus = (path: string) => RenderedBucyrus | null
const entry = 'demos/bucyrus-auto/index.html'
const renderEntry = '/src/demos/bucyrus-auto/render.tsx'
const robots = 'noindex, nofollow'

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function attribute(tag: string, name: string) {
  return tag.match(new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, 'i'))?.[2]
}

function documentFor(template: string, path: string, page: RenderedBucyrus) {
  // The owner has not approved indexing. Fail instead of silently publishing
  // an indexable page if a future route accidentally drops the demo policy.
  if (page.robots !== robots) throw new Error(`Bucyrus route ${path} must remain ${robots}`)
  const imageTag = template.match(/<meta\b[^>]*\bproperty=["']og:image["'][^>]*>/i)?.[0]
  const image = (imageTag && attribute(imageTag, 'content')) || 'https://wallaceshift.com/media/bucyrus/hero-1.webp'
  const metadata = [
    `<title>${escapeHtml(page.title)}</title>`,
    `<meta name="description" content="${escapeHtml(page.description)}" />`,
    `<meta name="robots" content="${robots}" />`,
    `<link rel="canonical" href="${escapeHtml(page.canonical)}" />`,
    '<meta property="og:type" content="website" />',
    '<meta property="og:site_name" content="Bucyrus Auto &amp; Drivetrain" />',
    `<meta property="og:title" content="${escapeHtml(page.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(page.description)}" />`,
    `<meta property="og:url" content="${escapeHtml(page.canonical)}" />`,
    `<meta property="og:image" content="${escapeHtml(image)}" />`,
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${escapeHtml(page.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(page.description)}" />`,
    `<meta name="twitter:image" content="${escapeHtml(image)}" />`,
    `<meta name="twitter:url" content="${escapeHtml(page.canonical)}" />`,
    `<script type="application/ld+json">${JSON.stringify(page.jsonLd).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029')}</script>`,
  ].join('\n    ')
  const withoutMetadata = template
    .replace(/<title\b[^>]*>[\s\S]*?<\/title>\s*/gi, '')
    .replace(/<meta\b[^>]*>\s*/gi, tag => {
      const key = (attribute(tag, 'name') || attribute(tag, 'property') || '').toLowerCase()
      return key === 'description' || key === 'robots' || key.startsWith('og:') || key.startsWith('twitter:') ? '' : tag
    })
    .replace(/<link\b[^>]*>\s*/gi, tag => attribute(tag, 'rel')?.toLowerCase() === 'canonical' ? '' : tag)
    .replace(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>\s*/gi, '')
  // Each entry document has one root wrapper. Greedy matching also supports a
  // repeat render from an already populated build without truncating nested divs.
  const rootPattern = /<div\b(?=[^>]*\bid=["']root["'])[^>]*>[\s\S]*<\/div>/i
  if (!rootPattern.test(withoutMetadata)) throw new Error(`Missing root element in ${entry}`)
  return withoutMetadata
    .replace('</head>', `    ${metadata}\n  </head>`)
    .replace(rootPattern, () => `<div id="root" data-bucyrus-path="${escapeHtml(path)}">${page.html}</div>`)
}

function requestedPath(request: IncomingMessage) {
  const url = new URL(request.url ?? '/', 'http://localhost')
  const namespace = /^\/(?:bucyrus-auto|demos\/bucyrus-auto)(?:\/|$)/.test(url.pathname)
  if (!namespace) return null
  const normalized = url.pathname.replace(/\/index\.html$/, '').replace(/\/+$/, '')
  return normalized === '/demos/bucyrus-auto' ? '/bucyrus-auto' : normalized
}

function respond(request: IncomingMessage, response: ServerResponse, status: number, body: string) {
  response.statusCode = status
  response.setHeader('Content-Type', 'text/html; charset=utf-8')
  response.setHeader('X-Robots-Tag', robots)
  response.setHeader('Cache-Control', 'no-store')
  response.end(request.method === 'HEAD' ? undefined : body)
}

function isSupported(request: IncomingMessage, response: ServerResponse, path: string) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.setHeader('Allow', 'GET, HEAD')
    respond(request, response, 405, '<!doctype html><title>Method not allowed</title><h1>Method not allowed</h1>')
    return false
  }
  if (!(bucyrusPaths as readonly string[]).includes(path)) {
    respond(request, response, 404, '<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex, nofollow"><title>Page not found | Bucyrus Auto &amp; Drivetrain</title></head><body><main><h1>Page not found</h1><p>This page is not part of the Bucyrus demo.</p><a href="/bucyrus-auto">Return to Bucyrus Auto &amp; Drivetrain</a></main></body></html>')
    return false
  }
  return true
}

/** Public static HTML only: no new serverless function or sitemap entry. */
export function bucyrusPlugin(): Plugin {
  let config: ResolvedConfig
  return {
    name: 'wallace-shift-bucyrus-static-pages',
    configResolved(resolved) { config = resolved },
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const path = requestedPath(request)
        if (path === null) return next()
        if (!isSupported(request, response, path)) return
        try {
          const { renderBucyrus } = await server.ssrLoadModule(renderEntry) as { renderBucyrus: RenderBucyrus }
          const page = renderBucyrus(path)
          if (!page) throw new Error(`Missing Bucyrus renderer for ${path}`)
          const template = await readFile(join(server.config.root, entry), 'utf8')
          const html = await server.transformIndexHtml(path, documentFor(template, path, page))
          respond(request, response, 200, html)
        } catch (error) { next(error as Error) }
      })
    },
    configurePreviewServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const path = requestedPath(request)
        if (path === null) return next()
        if (!isSupported(request, response, path)) return
        try {
          const html = await readFile(join(resolve(server.config.root, server.config.build.outDir), path.slice(1), 'index.html'), 'utf8')
          respond(request, response, 200, html)
        } catch (error) { next(error as Error) }
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
          server: { middlewareMode: true, watch: null },
        })
        try {
          const { renderBucyrus } = await renderer.ssrLoadModule(renderEntry) as { renderBucyrus: RenderBucyrus }
          for (const path of bucyrusPaths) {
            const page = renderBucyrus(path)
            if (!page) throw new Error(`Missing Bucyrus renderer for ${path}`)
            const html = documentFor(template, path, page)
            const destination = join(output, path.slice(1), 'index.html')
            await mkdir(dirname(destination), { recursive: true })
            await writeFile(destination, html)
            if (path === '/bucyrus-auto') await writeFile(join(output, entry), html)
          }
        } finally { await renderer.close() }
        this.info(`rendered ${bucyrusPaths.length} Bucyrus pages with initial HTML; indexing remains disabled`)
      },
    },
  }
}
