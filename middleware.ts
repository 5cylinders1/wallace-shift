import { next, rewrite } from '@vercel/functions'
import { gateDemoRequest, isProtectedDemoPath, PRIVATE_CACHE } from './api/_lib/demo-access.js'

export const config = { runtime: 'nodejs', matcher: '/:path*' }

export default async function middleware(request: Request): Promise<Response> {
  const denied = await gateDemoRequest(request)
  if (denied) return denied
  const url = new URL(request.url)
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
