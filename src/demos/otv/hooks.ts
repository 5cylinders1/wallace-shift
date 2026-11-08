import { useSyncExternalStore } from 'react'

/** A media query as state; false before hydration. */
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

/** Wide, fine-pointer screens get the pinned and hover-driven layouts. */
export const useDesktop = () => useMedia('(min-width: 1024px) and (hover: hover) and (pointer: fine)')

export const pad2 = (n: number) => String(n).padStart(2, '0')
