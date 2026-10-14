/** Screen size and pointer type affect quality, not access to the scene.
 * Keep the quiet still for visitors who explicitly request reduced motion. */
export const HOME_HERO_MOTION_QUERY = '(prefers-reduced-motion: no-preference)'

export function getInteractiveHomeHeroSnapshot(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(HOME_HERO_MOTION_QUERY).matches
}

export function subscribeInteractiveHomeHero(onChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const query = window.matchMedia(HOME_HERO_MOTION_QUERY)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

export const getStaticHomeHeroSnapshot = () => false
