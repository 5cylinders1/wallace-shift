import { useSyncExternalStore } from 'react'

/** The page's query string as React state. The server and hydration render
 * see an empty query (matching the static HTML); React then re-renders with
 * the real one. `pushQuery` updates the URL and every subscriber. */
const CHANGE = 'am:locationchange'

function subscribe(onChange: () => void) {
  window.addEventListener('popstate', onChange)
  window.addEventListener(CHANGE, onChange)
  return () => {
    window.removeEventListener('popstate', onChange)
    window.removeEventListener(CHANGE, onChange)
  }
}

export function useLocationSearch(): string {
  return useSyncExternalStore(subscribe, () => window.location.search, () => '')
}

export function pushUrl(url: string) {
  window.history.pushState(null, '', url)
  window.dispatchEvent(new Event(CHANGE))
}
