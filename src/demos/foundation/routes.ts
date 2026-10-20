import { useEffect, useState } from 'react'

/**
 * Datum is one document with a few pages. On the contractors host it lives
 * at /datum; the local entry is /demos/foundation/. Links stay inside
 * whichever one is being viewed.
 */
const location = typeof window === 'undefined' ? undefined : window.location
export const BASE = location?.pathname.startsWith('/datum') ? '/datum' : '/demos/foundation'

export type Page =
  | { kind: 'home' }
  | { kind: 'cracks' }
  | { kind: 'crack'; slug: string }
  | { kind: 'log' }
  | { kind: 'report' }

export const href = {
  home: (hash = '') => `${BASE}${BASE === '/datum' ? '' : '/'}${hash}`,
  cracks: () => `${BASE}/cracks`,
  crack: (slug: string) => `${BASE}/cracks/${slug}`,
  log: () => `${BASE}/crack-log`,
  report: () => `${BASE}/report`,
}

export const galleryPath = location?.hostname === 'contractors.wallaceshift.com' ? '/' : '/demos/contractors/'

function parse(pathname: string): Page {
  const rest = pathname.slice(BASE.length).replace(/^\/+|\/+$/g, '')
  const [first, second] = rest.split('/')
  if (first === 'cracks' && second) return { kind: 'crack', slug: second }
  if (first === 'cracks') return { kind: 'cracks' }
  if (first === 'crack-log') return { kind: 'log' }
  if (first === 'report') return { kind: 'report' }
  return { kind: 'home' }
}

/** Client-side navigation: same-document links swap the page and keep history. */
export function navigate(to: string) {
  const url = new URL(to, window.location.href)
  if (url.pathname === window.location.pathname && url.hash) {
    window.history.pushState(null, '', url)
    document.getElementById(url.hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    return
  }
  window.history.pushState(null, '', url)
  window.dispatchEvent(new PopStateEvent('popstate'))
  if (url.hash) requestAnimationFrame(() => requestAnimationFrame(() => document.getElementById(url.hash.slice(1))?.scrollIntoView({ block: 'start' })))
  else window.scrollTo({ top: 0 })
}

export function usePage(): Page {
  const [page, setPage] = useState<Page>(() => parse(window.location.pathname))
  useEffect(() => {
    const update = () => setPage(parse(window.location.pathname))
    window.addEventListener('popstate', update)
    return () => window.removeEventListener('popstate', update)
  }, [])
  return page
}

/** Intercepts plain left clicks on same-document links. */
export function onLink(event: React.MouseEvent<HTMLAnchorElement>) {
  const anchor = event.currentTarget
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || anchor.target) return
  const url = new URL(anchor.href, window.location.href)
  if (url.origin !== window.location.origin || !url.pathname.startsWith(BASE)) return
  event.preventDefault()
  navigate(url.pathname + url.search + url.hash)
}
