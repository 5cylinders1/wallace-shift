import { useSyncExternalStore } from 'react'

/** A media query as state; false on the server and before hydration. */
export function useMedia(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const media = window.matchMedia(query)
      media.addEventListener('change', onChange)
      return () => media.removeEventListener('change', onChange)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

export const useReducedMotion = () => useMedia('(prefers-reduced-motion: reduce)')
