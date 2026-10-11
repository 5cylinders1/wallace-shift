import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { SITE_ORIGIN, routeMeta } from './src/content/routeMeta.ts'

/**
 * Emits one real HTML file per route, plus `sitemap.xml` and `robots.txt`.
 *
 * The app is still a client-rendered SPA — this does not prerender page
 * content. What it does is give every URL its own document with the
 * correct title, description, canonical, and Open Graph tags baked into
 * the markup, which is what link-preview scrapers (iMessage, WhatsApp,
 * Slack, Facebook) read. Those scrapers do not execute JavaScript, so
 * without this every shared link previews as the homepage — or as
 * nothing.
 *
 * It also means `/services` is a file the host can serve directly, so the
 * catch-all rewrite that used to return the homepage with HTTP 200 for
 * every unmatched URL is no longer needed. `404.html` handles those.
 */
function prerenderRoutes(): Plugin {
  return {
    name: 'wallace-shift-prerender-routes',
    apply: 'build',
    enforce: 'post',

    async closeBundle() {
      const outDir = 'dist'
      const template = await readFile(join(outDir, 'index.html'), 'utf8')

      for (const route of routeMeta) {
        const canonical = `${SITE_ORIGIN}${route.path}`
        const head = [
          `<title>${escapeHtml(route.title)}</title>`,
          `<meta name="description" content="${escapeHtml(route.description)}" />`,
          `<link rel="canonical" href="${canonical}" />`,
          `<meta property="og:type" content="website" />`,
          `<meta property="og:site_name" content="Wallace Shift" />`,
          `<meta property="og:title" content="${escapeHtml(route.title)}" />`,
          `<meta property="og:description" content="${escapeHtml(route.description)}" />`,
          `<meta property="og:url" content="${canonical}" />`,
          `<meta property="og:image" content="${SITE_ORIGIN}/media/wallace-shift-hero-poster.webp" />`,
          `<meta name="twitter:card" content="summary_large_image" />`,
          `<meta name="twitter:title" content="${escapeHtml(route.title)}" />`,
          `<meta name="twitter:description" content="${escapeHtml(route.description)}" />`,
          `<meta name="twitter:image" content="${SITE_ORIGIN}/media/wallace-shift-hero-poster.webp" />`,
          route.noindex
            ? `<meta name="robots" content="${escapeHtml(route.robots ?? 'noindex')}" />`
            : '',
        ]
          .filter(Boolean)
          .join('\n    ')

        // The template's own title/description are the homepage's. Strip
        // them so each route carries exactly one of each.
        const html = template
          .replace(/<title>[\s\S]*?<\/title>\s*/, '')
          .replace(/<meta\s+name="description"[\s\S]*?\/>\s*/, '')
          .replace('</head>', `  ${head}\n  </head>`)

        // `/404` is emitted as `404.html` at the root, which is the file
        // Vercel serves (with a real 404 status) for unmatched paths.
        const target =
          route.path === '/404'
            ? join(outDir, '404.html')
            : join(outDir, route.path.replace(/^\//, ''), 'index.html')

        await mkdir(dirname(target), { recursive: true })
        await writeFile(target, html, 'utf8')
      }

      const indexed = routeMeta.filter((route) => !route.noindex)

      const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${indexed
  .map(
    (route) =>
      `  <url>\n    <loc>${SITE_ORIGIN}${route.path}</loc>\n    <priority>${route.priority.toFixed(1)}</priority>\n  </url>`,
  )
  .join('\n')}
</urlset>
`
      await writeFile(join(outDir, 'sitemap.xml'), sitemap, 'utf8')

      const robots = `User-agent: *
Allow: /

Sitemap: ${SITE_ORIGIN}/sitemap.xml
`
      await writeFile(join(outDir, 'robots.txt'), robots, 'utf8')

      this.info?.(
        `prerendered ${routeMeta.length} routes, sitemap.xml, robots.txt`,
      )
    },
  }
}

/**
 * Runs the roofing demo's serverless functions inside `vite dev`.
 *
 * On Vercel each file in /api is its own function. Locally there is no
 * function runtime, so without this the roof tool could only ever report
 * "not connected". These handlers use the plain Node (req, res) signature,
 * which is exactly what a Connect middleware receives, so they mount
 * directly. Keys come from `.env.local` (never committed), e.g.
 *
 *   GEOAPIFY_API_KEY=...
 *
 * See docs/roofing-demo.md for the full list.
 *
 * Only these routes are mounted; the studio site's own endpoints keep
 * their existing behaviour.
 */
const DEV_API_ROUTES: Record<string, string> = {
  '/api/roof-suggest': '/api/roof-suggest.ts',
  '/api/roof-lookup': '/api/roof-lookup.ts',
  '/api/roof-measure': '/api/roof-measure.ts',
}

function devApiRoutes(): Plugin {
  return {
    name: 'wallace-shift-dev-api-routes',
    apply: 'serve',
    configureServer(server) {
      const env = loadEnv(server.config.mode, server.config.root, '')
      // Server-side settings only: never anything a VITE_ prefix would expose.
      for (const [key, value] of Object.entries(env)) {
        if (/^(ROOF_|GEOAPIFY_|MAPBOX_|INSTANT_ROOFER_|GOOGLE_SOLAR_|GOOGLE_MAPS_|OVERPASS_|RATE_LIMIT_|KV_REST_API_(URL|TOKEN)$|UPSTASH_REDIS_REST_(URL|TOKEN)$)/.test(key) && !process.env[key]) process.env[key] = value
      }
      server.middlewares.use(async (req, res, next) => {
        const path = (req.url ?? '').split('?')[0]
        const file = DEV_API_ROUTES[path]
        if (!file) return next()
        try {
          const mod = await server.ssrLoadModule(file)
          await mod.default(req, res)
        } catch (error) {
          server.config.logger.error(`[dev api] ${path}: ${String(error)}`)
          if (!res.headersSent) {
            res.statusCode = 502
            res.setHeader('content-type', 'application/json')
            res.end(JSON.stringify({ ok: false, error: 'upstream' }))
          }
        }
      })
    },
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// Mirror the public aliases in dev/preview without changing the browser URL.
// Legacy directory entries still accept pasted links without their slash.
function roofingDemoRoutes(): Plugin {
  const route = (req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse, next: () => void) => {
      const url = new URL(req.url ?? '/', 'http://localhost')
      const alias = url.pathname.replace(/\/$/, '')
      const destinations: Record<string, string> = {
        '/northvane': '/demos/roofers/index.html',
        ...Object.fromEntries(['insurance', 'prices', 'warranty', 'faq'].map(page =>
          [`/northvane/${page}`, `/demos/roofers/${page}/index.html`])),
        '/alder-stone': '/demos/roofers-2/index.html',
        ...Object.fromEntries(['process', 'insurance', 'cost', 'estimate'].map(page =>
          [`/alder-stone/${page}`, `/demos/roofers-2/${page}/index.html`])),
      }
      if (destinations[alias]) {
        req.url = `${destinations[alias]}${url.search}`
        return next()
      }
      if (!/^\/demos\/(?:roofers(?:\/(?:insurance|prices|warranty|faq))?|roofers-offer|roofers-2(?:\/(?:process|insurance|cost|estimate))?)$/.test(url.pathname)) return next()
      res.statusCode = 302
      res.setHeader('Location', `${url.pathname}/${url.search}`)
      res.end()
    }
  return {
    name: 'roofing-demo-routes',
    configureServer(server) { server.middlewares.use(route) },
    configurePreviewServer(server) { server.middlewares.use(route) },
  }
}

export default defineConfig({
  plugins: [react(), prerenderRoutes(), devApiRoutes(), roofingDemoRoutes()],
  build: {
    rolldownOptions: {
      // Sales demos are separate documents with their own bundle, so a
      // prospect opening one never downloads the studio site (or its
      // WebGL), and the studio site never ships demo code. Each is served
      // at /demos/<vertical> and, on its own subdomain, by a host rewrite
      // in vercel.json.
      input: {
        main: 'index.html',
        roofers: 'demos/roofers/index.html',
        roofersInsurance: 'demos/roofers/insurance/index.html',
        roofersPrices: 'demos/roofers/prices/index.html',
        roofersWarranty: 'demos/roofers/warranty/index.html',
        roofersFaq: 'demos/roofers/faq/index.html',
        roofersOffer: 'demos/roofers-offer/index.html',
        roofersEstate: 'demos/roofers-2/index.html',
        roofersEstateProcess: 'demos/roofers-2/process/index.html',
        roofersEstateInsurance: 'demos/roofers-2/insurance/index.html',
        roofersEstateCost: 'demos/roofers-2/cost/index.html',
        roofersEstateEstimate: 'demos/roofers-2/estimate/index.html',
      },
    },
  },
})
