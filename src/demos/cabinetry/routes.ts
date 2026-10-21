import { useEffect, useState } from 'react'
import { flushSync } from 'react-dom'

/**
 * Tambour is one document with several pages. On the contractors host it
 * lives at /tambour; the local entry is /demos/cabinetry/. Links stay inside
 * whichever one is being viewed.
 */
const location = typeof window === 'undefined' ? undefined : window.location
export const BASE = location?.pathname.startsWith('/tambour') ? '/tambour' : '/demos/cabinetry'

export const PAGES = ['kitchens', 'baths', 'built-ins', 'workshop', 'investment', 'consultation', 'photography'] as const
export type PageName = typeof PAGES[number]
export type Page = { kind: 'home' } | { kind: PageName }

export const href = {
  home: (hash = '') => `${BASE}${BASE === '/tambour' ? '' : '/'}${hash}`,
  page: (name: PageName, hash = '') => `${BASE}/${name}${hash}`,
}

export const galleryPath = location?.hostname === 'contractors.wallaceshift.com' ? '/' : '/demos/contractors/'

function parse(pathname: string): Page {
  const first = pathname.slice(BASE.length).replace(/^\/+|\/+$/g, '').split('/')[0]
  return (PAGES as readonly string[]).includes(first) ? { kind: first as PageName } : { kind: 'home' }
}

/** Client-side navigation: same-document links swap the page and keep history. */
export function navigate(to: string) {
  const url = new URL(to, window.location.href)
  if (url.pathname === window.location.pathname && url.hash) {
    window.history.pushState(null, '', url)
    document.getElementById(url.hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    return
  }
  // The new page is rendered synchronously inside the update, so the
  // transition captures it at the top: it rolls up over the old page.
  const swap = () => {
    flushSync(() => {
      window.history.pushState(null, '', url)
      window.dispatchEvent(new PopStateEvent('popstate'))
    })
    if (!url.hash) window.scrollTo({ top: 0 })
  }
  const root = document.documentElement
  if (document.startViewTransition && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    root.dataset.transition = 'page'
    document.startViewTransition(swap).finished.finally(() => { delete root.dataset.transition })
  } else swap()
  if (url.hash) scrollToHash(url.hash)
}

/** Scrolls to an anchor once it exists: parts of a page can render a moment after it. */
export function scrollToHash(hash: string, tries = 90) {
  const target = document.getElementById(hash.slice(1))
  if (target) { requestAnimationFrame(() => target.scrollIntoView({ block: 'start' })); return }
  if (tries > 0) requestAnimationFrame(() => scrollToHash(hash, tries - 1))
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
