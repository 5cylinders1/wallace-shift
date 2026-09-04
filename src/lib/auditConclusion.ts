import { conclusions, type ConclusionCopy } from '../content/audit'
import type { AuditResult } from '../hooks/useSiteAudit'

/**
 * Core Web Vitals boundaries, as Google publishes them. Using the real
 * thresholds rather than invented ones means the conclusion agrees with
 * any other tool the visitor runs afterwards — including Google's own,
 * which they may well check.
 */
const FCP_POOR = 3000
const FCP_SLOW = 1800
const LCP_POOR = 4000
/** Exported: the findings list must judge LCP by the same number the
 *  conclusion does, or the page contradicts itself in public. */
export const LCP_SLOW = 2500
const CLS_POOR = 0.25
const CLS_SHIFTY = 0.1

export interface Conclusion extends Omit<ConclusionCopy, 'headline'> {
  id: string
  /** Fully resolved — domain and measurement already substituted. */
  headline: string
  /** True when nothing needed attention, so the UI can present it as the
   *  good news it is rather than styling it as a finding. */
  clear: boolean
  /** True when nothing was measurable — neither a pass nor a failure. */
  inconclusive: boolean
}

function seconds(ms: number): string {
  return `${(ms / 1000).toFixed(1)} seconds`
}

/**
 * Picks the single most consequential true statement about a site.
 *
 * Order is by what it costs the business, not by how easy it is to sell:
 * a "Not secure" warning in the address bar outranks a missing meta
 * description, and both outrank an unlabelled decorative image.
 *
 * A check that returned `null` never produces a conclusion. Null means
 * Lighthouse did not report it, not that it passed and not that it failed
 * — and stating something we did not measure is the one failure mode this
 * whole feature cannot survive.
 */
export function pickConclusion(result: AuditResult): Conclusion {
  const c = result.checks
  const m = result.metrics
  const fcp = m.fcp?.value
  const lcp = m.lcp?.value
  const cls = m.cls?.value

  // `false` explicitly, never falsy — `null` must not match.
  const failed = (v: boolean | null | undefined) => v === false

  let id = 'clear'
  let value: string | null = null

  if (failed(c.https)) {
    id = 'https'
  } else if (failed(c.viewport)) {
    id = 'viewport'
  } else if (typeof fcp === 'number' && fcp >= FCP_POOR) {
    id = 'fcp'
    value = seconds(fcp)
  } else if (typeof lcp === 'number' && lcp >= LCP_POOR) {
    id = 'lcp'
    value = seconds(lcp)
  } else if (typeof cls === 'number' && cls >= CLS_POOR) {
    id = 'cls'
  } else if (typeof fcp === 'number' && fcp >= FCP_SLOW) {
    id = 'fcp'
    value = seconds(fcp)
  } else if (typeof lcp === 'number' && lcp >= LCP_SLOW) {
    id = 'lcp'
    value = seconds(lcp)
  } else if (failed(c.contrast)) {
    id = 'contrast'
  } else if (failed(c.metaDescription)) {
    id = 'metaDescription'
  } else if (typeof cls === 'number' && cls >= CLS_SHIFTY) {
    id = 'cls'
  } else if (failed(c.altText)) {
    id = 'altText'
  } else if (failed(c.linkNames)) {
    id = 'linkNames'
  }

  /* "Passed every check" is only sayable when something was actually
     checked. If Lighthouse reported no booleans and no numbers, an
     all-clear would be asserting a result we never measured. */
  if (id === 'clear') {
    const measuredChecks = Object.values(c).filter(
      (v) => typeof v === 'boolean',
    ).length
    const measuredMetrics = [fcp, lcp, cls].filter(
      (v) => typeof v === 'number',
    ).length
    if (measuredChecks === 0 && measuredMetrics === 0) id = 'inconclusive'
  }

  const copy = conclusions[id] ?? conclusions.clear
  let host: string
  try {
    host = new URL(result.url).hostname.replace(/^www\./, '')
  } catch {
    host = result.url
  }

  const headline = copy.headline
    .replace('{site}', host)
    .replace('{value}', value ?? '')
    // Guard against a double space if a {value} slot ever goes unfilled.
    .replace(/\s{2,}/g, ' ')
    .trim()

  return {
    id,
    headline,
    matters: copy.matters,
    change: copy.change,
    stage: copy.stage,
    clear: id === 'clear',
    inconclusive: id === 'inconclusive',
  }
}
