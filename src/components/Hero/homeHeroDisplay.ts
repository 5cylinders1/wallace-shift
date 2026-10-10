/** Touch-first devices use the Studio still. The live scene is an
 * enhancement for larger screens with precise pointing and motion enabled. */
export const HOME_HERO_DESKTOP_QUERY = '(min-width: 1024px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)'

export function getInteractiveHomeHeroSnapshot(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(HOME_HERO_DESKTOP_QUERY).matches
}

export function subscribeInteractiveHomeHero(onChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const query = window.matchMedia(HOME_HERO_DESKTOP_QUERY)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

export const getStaticHomeHeroSnapshot = () => false
