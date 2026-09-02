import { defineConfig, type Plugin } from 'vite'
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
          route.noindex ? `<meta name="robots" content="noindex" />` : '',
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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export default defineConfig({
  plugins: [react(), prerenderRoutes()],
})
