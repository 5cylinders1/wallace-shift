import { demoHandoffs, type DemoHandoff, type DemoHandoffId } from '../content/demoHandoff'

/**
 * A demo's "Discuss my website" link lands on `/contact?demo=<id>`. Like the
 * Shift Finder's `?shift=`, a query parameter survives a full page load and
 * works across the separately built demo and marketing bundles.
 */
export const DEMO_PARAM = 'demo'

export function demoHandoffHref(id: DemoHandoffId): string {
  return `/contact?${DEMO_PARAM}=${encodeURIComponent(id)}`
}

/** Null for a missing or unknown id, so a stale or hand-edited link falls
 *  back to the ordinary contact page. Pure, like readShiftHandoff. */
export function readDemoHandoff(search: string): DemoHandoff | null {
  const raw = new URLSearchParams(search).get(DEMO_PARAM)
  if (!raw || !Object.hasOwn(demoHandoffs, raw)) return null
  return demoHandoffs[raw as DemoHandoffId]
}
