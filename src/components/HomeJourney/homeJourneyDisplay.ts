/** The travelling logo needs a wide, precise-pointer layout. The hero owns
 * its own mobile WebGL policy; this gate only controls the following story. */
export const HOME_JOURNEY_MOTION_QUERY = '(min-width: 1024px) and (pointer: fine) and (prefers-reduced-motion: no-preference)'

export function getInteractiveHomeJourneySnapshot(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(HOME_JOURNEY_MOTION_QUERY).matches
}

export function subscribeInteractiveHomeJourney(onChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const query = window.matchMedia(HOME_JOURNEY_MOTION_QUERY)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

export const getStaticHomeJourneySnapshot = () => false
