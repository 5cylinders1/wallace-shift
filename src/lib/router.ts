/**
 * A two-page site does not justify a routing dependency, so this is the
 * smallest thing that works: History API navigation, a subscription hook,
 * and cross-page anchor handling. Anything more complex than a second
 * top-level page should retire this in favour of a real router.
 */
import { useEffect, useState } from 'react'

export const routes = {
  home: '/',
  pricing: '/pricing',
} as const

export type RoutePath = (typeof routes)[keyof typeof routes]

const ROUTE_CHANGE_EVENT = 'ws:routechange'

/** Trailing slashes and an empty pathname all collapse to '/'. */
export function normalizePath(pathname: string): string {
  const trimmed = pathname.replace(/\/+$/, '')
  return trimmed === '' ? '/' : trimmed
}

export function useRoutePath(): string {
  const [path, setPath] = useState(() =>
    normalizePath(window.location.pathname),
  )

  useEffect(() => {
    const sync = () => setPath(normalizePath(window.location.pathname))
    // `popstate` covers browser back/forward; the custom event covers our
    // own pushState calls, which deliberately do not fire popstate.
    window.addEventListener('popstate', sync)
    window.addEventListener(ROUTE_CHANGE_EVENT, sync)
    return () => {
      window.removeEventListener('popstate', sync)
      window.removeEventListener(ROUTE_CHANGE_EVENT, sync)
    }
  }, [])

  return path
}

/**
 * Scrolls to whatever the current URL points at: its anchor, or the top of
 * the page when there is no hash.
 *
 * `behavior` is omitted for a link within the current page, so the jump
 * inherits the document's own `scroll-behavior` and feels identical to the
 * site's plain `<a href="#...">` anchors. Arriving on a different route
 * passes 'instant' instead: smooth-scrolling thousands of pixels through a
 * page the visitor has not seen yet is not a transition, it is a wait.
 */
export function scrollToRouteTarget(behavior?: ScrollBehavior) {
  const hash = window.location.hash
  if (hash) {
    const target = document.getElementById(hash.slice(1))
    if (target) {
      target.scrollIntoView(behavior ? { block: 'start', behavior } : { block: 'start' })
      return
    }
  }
  window.scrollTo({ top: 0, behavior: behavior ?? 'auto' })
}

export function navigate(href: string) {
  const url = new URL(href, window.location.origin)
  const changedPage =
    normalizePath(url.pathname) !== normalizePath(window.location.pathname)

  window.history.pushState(null, '', `${url.pathname}${url.hash}`)

  if (changedPage) {
    // The incoming page owns this scroll. It cannot happen here: the
    // target does not exist until React commits the new page, and
    // ScrollTrigger's post-route refresh restores the scroll offset it
    // recorded, which would undo a jump made before it. App performs both
    // in order once the new page has mounted.
    window.dispatchEvent(new Event(ROUTE_CHANGE_EVENT))
    return
  }

  // Same page: the anchor is already in the document, but a link inside
  // the mobile menu still has the body's `overflow: hidden` on it until
  // React commits the menu close, so this waits one frame.
  requestAnimationFrame(() => scrollToRouteTarget())
}
