import {
  serviceRecommendations,
  type ServiceKey,
  type ServiceRecommendation,
} from '../content/shiftQuiz'

/**
 * The Shift Finder's result travels to the contact page in the URL —
 * `/contact?shift=custom-web-app` — rather than through an in-page event.
 *
 * A query parameter survives a full page load, can be linked from an
 * email or an ad, is visible in analytics, and works when the quiz and
 * the form are on different pages. The event this replaced satisfied none
 * of those.
 */
export const SHIFT_PARAM = 'shift'

export function shiftHandoffHref(key: ServiceKey): string {
  return `/contact?${SHIFT_PARAM}=${encodeURIComponent(key)}`
}

/**
 * Reads the recommendation out of a query string. Returns null for a
 * missing or unrecognised value, so a hand-edited or stale link degrades
 * to an ordinary contact form rather than an error.
 *
 * Takes the search string rather than reading `window` so it is a pure
 * function of router state — a component calling this re-computes when
 * the URL changes instead of being stuck with what was there at mount.
 */
export function readShiftHandoff(
  search: string,
): ServiceRecommendation | null {
  const raw = new URLSearchParams(search).get(SHIFT_PARAM)
  if (!raw) return null

  return serviceRecommendations[raw as ServiceKey] ?? null
}
