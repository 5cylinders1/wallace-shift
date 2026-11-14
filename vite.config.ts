import { createServer, defineConfig, loadEnv, type Plugin, type UserConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { SITE_ORIGIN, routeMeta } from './src/content/routeMeta.ts'
import { serializeJsonLd, structuredDataForRoute } from './src/content/structuredData.ts'
import { gateDemoRequest, isProtectedDemoPath } from './api/_lib/demo-access.ts'
import demoRequestHandler from './api/demo-request.ts'
import demoAccessHandler from './api/demo-access.ts'
import demoAgreementHandler from './api/demo-agreement.ts'
import demoAdminHandler from './api/demo-admin.ts'
import clientPortalHandler from './api/_lib/client-portal-handler.ts'
import mailHandler from './api/_lib/mail-handler.ts'
import { blogPlugin } from './blog/vite-plugin.ts'
import { bucyrusPlugin } from './bucyrus/vite-plugin.ts'
import { deerCreekPlugin } from './deercreek/vite-plugin.ts'
import { deerCreekPlumbingPlugin } from './deercreekplumbing/vite-plugin.ts'

/**
 * Emits one real HTML file per route, plus `sitemap.xml` and `robots.txt`.
 *
 * Public pages contain the actual React content as initial HTML, with
 * matching metadata and JSON-LD. The browser hydrates that same tree before
 * starting its animations. Search crawlers and visitors without JavaScript
 * can therefore read the same headings, text, and links.
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

    closeBundle: {
      // The blog appends its entries in a post hook after this sitemap exists.
      order: 'pre',
      sequential: true,
      async handler() {
        const outDir = 'dist'
        const template = await readFile(join(outDir, 'index.html'), 'utf8')
        const renderer = await createServer({
          configFile: false,
          plugins: [react()],
          appType: 'custom',
          logLevel: 'error',
          server: { middlewareMode: true, watch: null, hmr: false, ws: false },
        })

        try {
          const { renderPage } = await renderer.ssrLoadModule('/src/render.tsx') as { renderPage: (path: string) => string }
          for (const route of routeMeta) {
            const canonical = `${SITE_ORIGIN}${route.path}`
            // Private and experimental documents must never inherit a tracker
            // from the public homepage template, even before its runtime guard.
            // An explicitly public draft is unindexed, not a private document.
            let routeTemplate = route.noindex && !route.publicDraft
              ? template
                .replace(/<script\b[^>]*\bsrc=["']\/site-analytics\.js["'][^>]*>[\s\S]*?<\/script>\s*/gi, '')
                .replace(/<link\b[^>]*\bhref=["']\/analytics-consent\.css["'][^>]*>\s*/gi, '')
              : template
            if (route.path === '/client-portal' || route.path === '/mail') {
              routeTemplate = routeTemplate.replace(/<meta\b[^>]*\bname=["']referrer["'][^>]*>\s*/gi, '')
            }
            const head = [
              `<title>${escapeHtml(route.title)}</title>`,
              `<meta name="description" content="${escapeHtml(route.description)}" />`,
              `<link rel="canonical" href="${canonical}" />`,
              `<meta property="og:type" content="website" />`,
              `<meta property="og:site_name" content="Wallace Shift" />`,
              '<meta property="og:locale" content="en_US" />',
              `<meta property="og:title" content="${escapeHtml(route.title)}" />`,
              `<meta property="og:description" content="${escapeHtml(route.description)}" />`,
              `<meta property="og:url" content="${canonical}" />`,
              `<meta property="og:image" content="${SITE_ORIGIN}/media/wallace-shift-hero-poster.webp" />`,
              '<meta property="og:image:alt" content="Wallace Shift business systems and AI integration" />',
              `<meta name="twitter:card" content="summary_large_image" />`,
              `<meta name="twitter:title" content="${escapeHtml(route.title)}" />`,
              `<meta name="twitter:description" content="${escapeHtml(route.description)}" />`,
              `<meta name="twitter:image" content="${SITE_ORIGIN}/media/wallace-shift-hero-poster.webp" />`,
              route.path === '/client-portal' || route.path === '/mail'
                ? '<meta name="referrer" content="no-referrer" />'
                : '',
              route.noindex
                ? `<meta name="robots" content="${escapeHtml(route.robots ?? 'noindex')}" />`
                : '<meta name="robots" content="index, follow, max-image-preview:large" />',
              `<script id="page-structured-data" type="application/ld+json">${serializeJsonLd(structuredDataForRoute(route.path))}</script>`,
            ]
              .filter(Boolean)
              .join('\n    ')

            // The template's own title/description are the homepage's. Strip
            // them so each route carries exactly one of each.
            const html = routeTemplate
              .replace(/<title>[\s\S]*?<\/title>\s*/, '')
              .replace(/<meta\s+name="description"[\s\S]*?\/>\s*/, '')
              .replace('</head>', `  ${head}\n  </head>`)
              .replace('<div id="root"></div>', () => route.noindex && !route.publicDraft && route.path !== '/404'
                ? '<div id="root"></div>'
                : `<div id="root" data-route-path="${escapeHtml(route.path)}">${renderPage(route.path)}</div>`)

            // `/404` is emitted as `404.html` at the root, which is the file
            // Vercel serves (with a real 404 status) for unmatched paths.
            const target =
              route.path === '/404'
                ? join(outDir, '404.html')
                : join(outDir, route.path.replace(/^\//, ''), 'index.html')

            await mkdir(dirname(target), { recursive: true })
            await writeFile(target, html, 'utf8')
          }
          const { renderCollection } = await renderer.ssrLoadModule('/src/render-collections.tsx') as {
            renderCollection: (collection: 'contractors' | 'roofers-offer') => string
          }
          for (const collection of ['contractors', 'roofers-offer'] as const) {
            const target = join(outDir, 'demos', collection, 'index.html')
            const document = await readFile(target, 'utf8')
            if (!document.includes('<div id="root"></div>')) throw new Error(`Missing empty root for ${collection}`)
            await writeFile(target, document.replace('<div id="root"></div>',
              () => `<div id="root" data-collection="${collection}">${renderCollection(collection)}</div>`), 'utf8')
          }
        } finally { await renderer.close() }

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
Disallow: /api/

Sitemap: ${SITE_ORIGIN}/sitemap.xml
`
        await writeFile(join(outDir, 'robots.txt'), robots, 'utf8')

        this.info?.(
          `rendered public HTML and metadata for ${routeMeta.length} routes, sitemap.xml, robots.txt`,
        )
      },
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
  '/api/ai-booking': '/api/_lib/ai-booking-handler.ts',
  '/api/ai-checkout': '/api/_lib/ai-checkout-handler.ts',
  '/api/ai-opportunity': '/api/_lib/ai-opportunity-handler.ts',
  '/api/roof-suggest': '/api/roof-suggest.ts',
  '/api/roof-lookup': '/api/roof-lookup.ts',
  '/api/roof-measure': '/api/roof-measure.ts',
  '/api/roof-render': '/api/roof-render.ts',
  '/api/lawn': '/api/lawn.ts',
  '/api/lawn-suggest': '/api/lawn.ts',
  '/api/lawn-lookup': '/api/lawn.ts',
  '/api/lawn-request': '/api/lawn.ts',
  '/api/paint-render': '/api/lawn.ts',
  '/api/paint-request': '/api/lawn.ts',
}

function devApiRoutes(): Plugin {
  return {
    name: 'wallace-shift-dev-api-routes',
    apply: 'serve',
    configureServer(server) {
      const env = loadEnv(server.config.mode, server.config.root, '')
      // Server-side settings only: never anything a VITE_ prefix would expose.
      for (const [key, value] of Object.entries(env)) {
        if (/^(OPENAI_API_KEY$|ROOF_|LAWN_|PAINT_|RESEND_API_KEY$|CONTACT_(FROM|TO)_EMAIL$|AI_OPPORTUNITY_(TO_EMAIL|ENABLED)$|DEMO_AUDIT_REDIS_(URL|TOKEN)$|(?:PORTAL|DEMO)_ADMIN_EMAIL$|GEOAPIFY_|MAPBOX_|INSTANT_ROOFER_|GOOGLE_CALENDAR_|GOOGLE_SOLAR_|GOOGLE_MAPS_|OVERPASS_|RATE_LIMIT_|KV_REST_API_(URL|TOKEN)$|UPSTASH_REDIS_REST_(URL|TOKEN)$)/.test(key) && !process.env[key]) process.env[key] = value
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

/** Mirror the production gate in local dev and built-output previews. This
 * runs before aliases and static files, so a direct asset URL is checked too. */
function demoAccessRoutes(): Plugin {
  const install = (server: import('vite').ViteDevServer | import('vite').PreviewServer) => {
    const env = loadEnv(server.config.mode, server.config.root, '')
    for (const [key, value] of Object.entries(env)) {
      if (/^(DEMO_|PORTAL_|MAIL_|STRIPE_|DASHBOARD_|CRON_SECRET$|RESEND_API_KEY$|CONTACT_|RATE_LIMIT_|KV_REST_API_|UPSTASH_REDIS_REST_)/.test(key) && !process.env[key]) process.env[key] = value
    }
    server.middlewares.use(async (req, res, next) => {
      try {
        const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`)
        const headers = new Headers()
        for (const [key, value] of Object.entries(req.headers)) {
          if (typeof value === 'string') headers.set(key, value)
          else if (value) headers.set(key, value.join(', '))
        }
        const blocked = await gateDemoRequest(new Request(url, { method: req.method, headers }))
        if (blocked) {
          res.statusCode = blocked.status
          blocked.headers.forEach((value, key) => res.setHeader(key, value))
          res.end(Buffer.from(await blocked.arrayBuffer()))
          return
        }
        if (/^\/(?:bucyrus-auto|trawsome|complete-painting|riffle|demo\/anthony|demo\/otv|demo\/deercreek|demo\/deercreekplumbing|demo\/solara|demo\/dopps|demos\/bucyrus-auto|demos\/lawn|demos\/painting|demos\/water|demos\/otv|demos\/deercreek|demos\/deercreekplumbing|demos\/solara|demos\/dopps)(?:\/|$)/.test(url.pathname)) res.setHeader('X-Robots-Tag', 'noindex, nofollow')
        if (isProtectedDemoPath(url.pathname)) {
          res.setHeader('Cache-Control', 'private, no-store')
        }
        if (url.pathname === '/api/demo-request') return await demoRequestHandler(req, res)
        if (url.pathname === '/api/demo-access') return await demoAccessHandler(req, res)
        if (url.pathname === '/api/demo-agreement') return await demoAgreementHandler(req, res)
        if (url.pathname === '/api/demo-admin') return await demoAdminHandler(req, res)
        if (url.pathname === '/api/business-dashboard') return await demoAdminHandler(req, res)
        if (url.pathname === '/api/client-portal') return await clientPortalHandler(req, res)
        if (url.pathname === '/api/mail') return await mailHandler(req, res)
        next()
      } catch {
        if (!res.headersSent) {
          res.statusCode = 503
          res.setHeader('Cache-Control', 'no-store')
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ ok: false, error: 'unavailable' }))
        }
      }
    })
  }
  return {
    name: 'wallace-shift-demo-access',
    configureServer: install,
    configurePreviewServer: install,
  }
}

/** Fail the public build if a future import pulls private demo implementation
 * into a publicly downloadable bundle (including CSS and ?raw imports). */
function publicDemoBoundary(): Plugin {
  return {
    name: 'wallace-shift-public-demo-boundary',
    apply: 'build',
    transform(_code, id) {
      if (/\/src\/(?:roofing-dashboard\/|demos\/(?!roofers-offer\/|contractors\/|bucyrus-auto\/|lawn\/|painting\/|water\/|otv\/|deercreek\/|deercreekplumbing\/|solara\/|dopps\/))/.test(id)) {
        this.error(`Private demo module imported by the public build: ${id}`)
      }
    },
  }
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
        '/roofing-dashboard': '/demos/roofers-dashboard/index.html',
        '/alder-stone': '/demos/roofers-2/index.html',
        ...Object.fromEntries(['process', 'insurance', 'cost', 'estimate'].map(page =>
          [`/alder-stone/${page}`, `/demos/roofers-2/${page}/index.html`])),
        '/contour': '/demos/roofers-3/index.html',
        '/halcyon': '/demos/roofers-4/index.html',
        '/velar': '/demos/roofers-5/index.html',
        '/stratum': '/demos/roofers-6/index.html',
        '/stillwater': '/demos/pools/index.html',
        '/trawsome': '/demos/lawn/index.html',
        '/complete-painting': '/demos/painting/index.html',
        '/riffle': '/demos/water/index.html',
        '/demo/otv': '/demos/otv/index.html',
        '/demo/solara': '/demos/solara/index.html',
        '/demo/dopps': '/demos/dopps/index.html',
        '/mitre': '/demos/cabinetry-2/index.html',
        '/bucyrus-auto': '/demos/bucyrus-auto/index.html',
        // A static copy of a prospect's live site, served from public/.
        '/demo/anthony': '/demo/anthony/index.html',
      }
      if (destinations[alias]) {
        req.url = `${destinations[alias]}${url.search}`
        return next()
      }
      // Datum is one document with its own pages (symptoms, crack log, report).
      if (/^\/datum(?:\/[^.]*)?$/.test(alias) || /^\/demos\/foundation\/[^.]+$/.test(alias)) {
        req.url = `/demos/foundation/index.html${url.search}`
        return next()
      }
      // Tambour is one document too (kitchens, baths, studio, workshop, ...).
      if (/^\/tambour(?:\/[^.]*)?$/.test(alias) || /^\/demos\/cabinetry\/[^.]+$/.test(alias)) {
        req.url = `/demos/cabinetry/index.html${url.search}`
        return next()
      }
      if (!/^\/demos\/(?:roofers(?:\/(?:insurance|prices|warranty|faq))?|roofers-dashboard|roofers-offer|roofers-2(?:\/(?:process|insurance|cost|estimate))?|roofers-3|roofers-4|roofers-5|roofers-6|foundation|cabinetry|cabinetry-2|pools|lawn|painting|water|otv|solara|dopps|contractors|bucyrus-auto)$/.test(url.pathname)) return next()
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

export default defineConfig(({ mode }): UserConfig => ({
  plugins: [react(), ...(mode === 'demos' ? [] : [prerenderRoutes(), publicDemoBoundary(), blogPlugin(), bucyrusPlugin(), deerCreekPlugin(), deerCreekPlumbingPlugin()]), demoAccessRoutes(), devApiRoutes(), roofingDemoRoutes()],
  // The public pass copies static media once. The second pass adds only the
  // demo documents and their fully isolated JS/CSS dependency graph.
  build: {
    copyPublicDir: mode !== 'demos',
    emptyOutDir: mode !== 'demos',
    assetsDir: mode === 'demos' ? 'demo-assets' : 'assets',
    sourcemap: false,
    rolldownOptions: {
      // Separate builds prevent shared chunks from making demo source
      // available through the public gallery's /assets directory.
      input: mode !== 'demos' ? {
        main: 'index.html',
        roofersOffer: 'demos/roofers-offer/index.html',
        contractors: 'demos/contractors/index.html',
        bucyrusAuto: 'demos/bucyrus-auto/index.html',
        lawnTrawsome: 'demos/lawn/index.html',
        paintingComplete: 'demos/painting/index.html',
        waterRiffle: 'demos/water/index.html',
        otvOpenTelevision: 'demos/otv/index.html',
        deerCreekPlumbing: 'demos/deercreek/index.html',
        deerCreekPlumbingSecondConcept: 'demos/deercreekplumbing/index.html',
        solaraSalon: 'demos/solara/index.html',
        doppsChiropractic: 'demos/dopps/index.html',
        requestDemo: 'request-demo/index.html',
        demoAgreement: 'demo-agreement/index.html',
        demoAdmin: 'demo-admin/index.html',
      } : {
        roofers: 'demos/roofers/index.html',
        roofersInsurance: 'demos/roofers/insurance/index.html',
        roofersPrices: 'demos/roofers/prices/index.html',
        roofersWarranty: 'demos/roofers/warranty/index.html',
        roofersFaq: 'demos/roofers/faq/index.html',
        roofersDashboard: 'demos/roofers-dashboard/index.html',
        roofersEstate: 'demos/roofers-2/index.html',
        roofersEstateProcess: 'demos/roofers-2/process/index.html',
        roofersEstateInsurance: 'demos/roofers-2/insurance/index.html',
        roofersEstateCost: 'demos/roofers-2/cost/index.html',
        roofersEstateEstimate: 'demos/roofers-2/estimate/index.html',
        roofersContour: 'demos/roofers-3/index.html',
        roofersHalcyon: 'demos/roofers-4/index.html',
        roofersVelar: 'demos/roofers-5/index.html',
        roofersStratum: 'demos/roofers-6/index.html',
        foundationDatum: 'demos/foundation/index.html',
        cabinetryTambour: 'demos/cabinetry/index.html',
        cabinetryMitre: 'demos/cabinetry-2/index.html',
        poolsStillwater: 'demos/pools/index.html',
      },
    },
  },
}))
