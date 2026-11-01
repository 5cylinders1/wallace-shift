import { next, rewrite } from '@vercel/functions'
import { gateDemoRequest, isProtectedDemoPath, PRIVATE_CACHE } from './api/_lib/demo-access.js'

export const config = { runtime: 'nodejs', matcher: '/:path*' }

export default async function middleware(request: Request): Promise<Response> {
  const denied = await gateDemoRequest(request)
  if (denied) return denied
  const url = new URL(request.url)
  // Each public collection has its own canonical host. Do not serve the main
  // site's sitemap under these hosts or advertise fictional/private demos.
  const collectionHost = ['roofers.wallaceshift.com', 'contractors.wallaceshift.com'].includes(url.hostname)
  if (collectionHost && url.pathname === '/sitemap.xml') {
    return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://${url.hostname}/</loc></url></urlset>\n`, {
      headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
    })
  }
  if (collectionHost && url.pathname === '/robots.txt') {
    return new Response(`User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: https://${url.hostname}/sitemap.xml\n`, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
    })
  }
  // Root HTML otherwise takes precedence over each collection's rewrite.
  if (url.hostname === 'roofers.wallaceshift.com' && url.pathname === '/') {
    url.pathname = '/demos/roofers-offer'
    return rewrite(url)
  }
  if (url.hostname === 'contractors.wallaceshift.com' && url.pathname === '/') {
    url.pathname = '/demos/contractors'
    return rewrite(url)
  }
  if (!isProtectedDemoPath(url.pathname)) return next()
  return next({ headers: {
    'cache-control': PRIVATE_CACHE,
    'cdn-cache-control': 'no-store',
    'vercel-cdn-cache-control': 'no-store',
    'x-robots-tag': 'noindex, nofollow',
    'referrer-policy': 'no-referrer',
  } })
}
