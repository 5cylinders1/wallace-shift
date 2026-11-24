import { useSyncExternalStore } from 'react'

function subscribeTo(query: string) {
  return (onChange: () => void) => {
    const media = window.matchMedia(query)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }
}

const reducedQuery = '(prefers-reduced-motion: reduce)'
const subscribeReduced = subscribeTo(reducedQuery)

/** False during server rendering and hydration, then the visitor's setting. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribeReduced, () => window.matchMedia(reducedQuery).matches, () => false)
}

const noop = () => () => {}
/** True only after hydration, for anything that needs the browser. */
export function useHydrated(): boolean {
  return useSyncExternalStore(noop, () => true, () => false)
}
