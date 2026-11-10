import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'
import react from '@vitejs/plugin-react'
import { createServer, type Plugin, type ResolvedConfig } from 'vite'

/** The Deer Creek Plumbing concept: 18 static, server-rendered pages under
 * /demo/deercreek, each with its own metadata and JSON-LD graph. Modelled on
 * bucyrus/vite-plugin.ts. No serverless function and no sitemap entry. */
interface RenderedPage {
  slug: string
  html: string
  title: string
  description: string
  canonical: string
  jsonLd: object
  robots: string
}
interface Renderer {
  renderDeerCreek: (path: string) => RenderedPage | null
  deerCreekPaths: string[]
}

const entry = 'demos/deercreek/index.html'
const renderEntry = '/src/demos/deercreek/render.tsx'
const base = '/demo/deercreek'
const robots = 'noindex, nofollow'
const image = 'https://wallaceshift.com/demos/deercreek/photos/truck-1600.webp'

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function attribute(tag: string, name: string) {
  return tag.match(new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, 'i'))?.[2]
}

export function deerCreekDocument(template: string, page: RenderedPage) {
  // The owner has not approved indexing. Fail rather than publish an indexable page.
  if (page.robots !== robots) throw new Error(`Deer Creek page ${page.canonical} must remain ${robots}`)
  const metadata = [
    `<title>${escapeHtml(page.title)}</title>`,
    `<meta name="description" content="${escapeHtml(page.description)}" />`,
    `<meta name="robots" content="${robots}" />`,
    `<link rel="canonical" href="${escapeHtml(page.canonical)}" />`,
    '<meta property="og:type" content="website" />',
    '<meta property="og:site_name" content="Deer Creek Plumbing" />',
    '<meta property="og:locale" content="en_US" />',
    `<meta property="og:title" content="${escapeHtml(page.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(page.description)}" />`,
    `<meta property="og:url" content="${escapeHtml(page.canonical)}" />`,
    `<meta property="og:image" content="${image}" />`,
    '<meta property="og:image:alt" content="A Deer Creek Plumbing plumber leaning out of the company truck" />',
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${escapeHtml(page.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(page.description)}" />`,
    `<meta name="twitter:image" content="${image}" />`,
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
  // The template body holds only the root wrapper (Vite moves the module
  // script into <head> on build), so a greedy match spans exactly that div.
  const rootPattern = /<div\b(?=[^>]*\bid=["']root["'])[^>]*>[\s\S]*<\/div>/i
  if (!rootPattern.test(withoutMetadata)) throw new Error(`Missing root element in ${entry}`)
  return withoutMetadata
    .replace('</head>', `    ${metadata}\n  </head>`)
    .replace(rootPattern, () => `<div id="root" data-dc-slug="${escapeHtml(page.slug)}">${page.html}</div>`)
}

function requestedPath(request: IncomingMessage) {
  const url = new URL(request.url ?? '/', 'http://localhost')
  if (!/^\/(?:demo\/deercreek|demos\/deercreek)(?:\/|$)/.test(url.pathname)) return null
  // Assets (anything with a file extension other than .html) are left to Vite.
  if (/\.[a-z0-9]+$/i.test(url.pathname) && !url.pathname.endsWith('/index.html')) return null
  const normalized = url.pathname.replace(/\/index\.html$/, '').replace(/\/+$/, '')
  return normalized.replace(/^\/demos\/deercreek/, base)
}

function respond(request: IncomingMessage, response: ServerResponse, status: number, body: string) {
  response.statusCode = status
  response.setHeader('Content-Type', 'text/html; charset=utf-8')
  response.setHeader('X-Robots-Tag', robots)
  response.setHeader('Cache-Control', 'no-store')
  response.end(request.method === 'HEAD' ? undefined : body)
}

const notFound = '<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex, nofollow"><title>Page not found | Deer Creek Plumbing</title></head><body><main><h1>Page not found</h1><p>This page is not part of the Deer Creek Plumbing concept.</p><a href="/demo/deercreek">Return to Deer Creek Plumbing</a></main></body></html>'

export function deerCreekPlugin(): Plugin {
  let config: ResolvedConfig
  return {
    name: 'wallace-shift-deercreek-static-pages',
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
          const { renderDeerCreek } = await server.ssrLoadModule(renderEntry) as Renderer
          const page = renderDeerCreek(path)
          if (!page) return respond(request, response, 404, notFound)
          const template = await readFile(join(server.config.root, entry), 'utf8')
          respond(request, response, 200, await server.transformIndexHtml(path, deerCreekDocument(template, page)))
        } catch (error) { next(error as Error) }
      })
    },
    configurePreviewServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const path = requestedPath(request)
        if (path === null) return next()
        try {
          const html = await readFile(join(resolve(server.config.root, server.config.build.outDir), path.slice(1), 'index.html'), 'utf8')
          respond(request, response, 200, html)
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
          const { renderDeerCreek, deerCreekPaths } = await renderer.ssrLoadModule(renderEntry) as Renderer
          for (const path of deerCreekPaths) {
            const page = renderDeerCreek(path)
            if (!page) throw new Error(`Missing Deer Creek renderer for ${path}`)
            const html = deerCreekDocument(template, page)
            const destination = join(output, path.slice(1), 'index.html')
            await mkdir(dirname(destination), { recursive: true })
            await writeFile(destination, html)
            if (path === base) await writeFile(join(output, entry), html)
          }
          this.info(`rendered ${deerCreekPaths.length} Deer Creek pages with initial HTML; indexing remains disabled`)
        } finally { await renderer.close() }
      },
    },
  }
}
