/**
 * A route table for a static marketing site: History API navigation, a
 * subscription hook, and cross-page anchor handling. There is no data
 * loading, no nested layout, and no route-level code splitting to justify
 * a routing dependency, so this stays hand-rolled — but it is now driven
 * by `routeMeta` rather than a hardcoded pair of paths.
 *
 * Reach for a real router if the site ever grows dynamic segments
 * (`/work/:slug`), nested layouts, or per-route data fetching.
 */
import { createContext, useCallback, useContext, useSyncExternalStore } from 'react'
import { findRoute, knownPaths } from '../content/routeMeta'

const ROUTE_CHANGE_EVENT = 'ws:routechange'

export const NOT_FOUND_PATH = '/404'

/** Trailing slashes and an empty pathname all collapse to '/'. */
export function normalizePath(pathname: string): string {
  const trimmed = pathname.replace(/\/+$/, '')
  return trimmed === '' ? '/' : trimmed
}

/**
 * Maps a raw pathname onto a route this site actually serves. Unknown
 * paths resolve to `/404` so there is exactly one not-found page rather
 * than the old behaviour, where every unmatched URL silently rendered the
 * homepage and reported success.
 */
export function resolvePath(pathname: string): string {
  const path = normalizePath(pathname)
  return knownPaths.includes(path) ? path : NOT_FOUND_PATH
}

export interface Location {
  /** Always a path this site serves; unknown paths resolve to `/404`. */
  path: string
  /** Raw query string, including the leading '?', or ''. */
  search: string
}

/** The build and hydration share a route snapshot, without mocking window.
 * Search parameters are applied after hydration so a personalised contact
 * handoff never disagrees with the public HTML saved at build time. */
export const StaticLocationContext = createContext<Location>({ path: '/', search: '' })

let browserLocation: Location | undefined

function readLocation(): Location {
  const path = resolvePath(window.location.pathname)
  const search = window.location.search
  if (!browserLocation || browserLocation.path !== path || browserLocation.search !== search) {
    browserLocation = { path, search }
  }
  return browserLocation
}

function subscribeLocation(onChange: () => void) {
  window.addEventListener('popstate', onChange)
  window.addEventListener(ROUTE_CHANGE_EVENT, onChange)
  return () => {
    window.removeEventListener('popstate', onChange)
    window.removeEventListener(ROUTE_CHANGE_EVENT, onChange)
  }
}
/**
 * Subscribes to the current location.
 *
 * The query string is tracked as well as the path, because `/contact`
 * reads `?shift=` from it. Storing only the path meant a move between two
 * query strings on the same page produced an identical state value,
 * React bailed out of the re-render, and the page kept showing the
 * previous recommendation.
 */
export function useLocation(): Location {
  const initial = useContext(StaticLocationContext)
  const getServerSnapshot = useCallback(() => initial, [initial])
  return useSyncExternalStore(subscribeLocation, readLocation, getServerSnapshot)
}

export function useRoutePath(): string {
  return useLocation().path
}

/**
 * Scrolls to whatever the current URL points at: its anchor, or the top of
 * the page when there is no hash.
 *
 * `behavior` is omitted for a link within the current page, so the jump
 * inherits the document's own `scroll-behavior` and feels identical to the
 * site's plain `<a href="#...">` anchors.
 */
export function scrollToRouteTarget(behavior?: ScrollBehavior) {
  const hash = window.location.hash
  if (hash) {
    const target = document.getElementById(hash.slice(1))
    if (target) {
      target.scrollIntoView(
        behavior ? { block: 'start', behavior } : { block: 'start' },
      )
      return
    }
  }
  window.scrollTo({ top: 0, behavior: behavior ?? 'auto' })
}

/** Unindexed documents without the public bootstrap: the portal, the
 *  experiments, and the 404. A public draft keeps the bootstrap. */
function isPrivateDocument(pathname: string): boolean {
  const route = findRoute(normalizePath(pathname))
  return Boolean(route?.noindex && !route.publicDraft)
}

export function navigate(href: string) {
  const url = new URL(href, window.location.origin)
  // A tracker already loaded in the public document must not survive entry
  // into the portal or an experiment. Leaving those documents also needs a
  // fresh load because their HTML deliberately omits the public bootstrap.
  if (isPrivateDocument(url.pathname) || isPrivateDocument(window.location.pathname)) {
    window.location.assign(url.href)
    return
  }
  const changedPage =
    normalizePath(url.pathname) !== normalizePath(window.location.pathname)

  window.history.pushState(null, '', `${url.pathname}${url.search}${url.hash}`)

  if (changedPage) {
    // The incoming page owns this scroll: its anchor does not exist until
    // React commits, and ScrollTrigger's post-route refresh restores the
    // offset it recorded, which would undo a jump made here. `App` does
    // both, in order, once the new page has mounted.
    window.dispatchEvent(new Event(ROUTE_CHANGE_EVENT))
    return
  }

  // Same page: the anchor is already in the document, but a link inside
  // the mobile menu still has the body's `overflow: hidden` on it until
  // React commits the menu close, so this waits one frame.
  requestAnimationFrame(() => scrollToRouteTarget())
}
