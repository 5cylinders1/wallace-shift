import { next, rewrite } from '@vercel/functions'

// The root HTML file takes precedence over vercel.json rewrites. Select the
// roofing gallery before Vercel serves that file; all other routes bypass this.
export const config = { matcher: '/' }

export default function middleware(request: Request): Response {
  const url = new URL(request.url)
  if (url.hostname !== 'roofers.wallaceshift.com' || url.pathname !== '/') {
    return next()
  }

  // Change only the pathname, keeping campaign and inquiry query parameters.
  url.pathname = '/demos/roofers-offer'
  return rewrite(url)
}
