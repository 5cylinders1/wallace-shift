/**
 * The per-visit mowing estimate. Shared by the page (instant updates while
 * the homeowner edits the lawn) and /api/lawn-request (which recomputes it
 * from the deployment's own rates before anything reaches the inbox).
 */

import type { Frequency, LawnPricing } from './types.js'

/** Lawns outside this are a typo or a field: the page asks for a call instead. */
export const MIN_LAWN_SQFT = 300
export const MAX_LAWN_SQFT = 220_000

export interface VisitPrice {
  /** Midpoint, whole dollars. */
  price: number
  low: number
  high: number
}

export function visitPrice(lawnSqFt: number, frequency: Frequency, pricing: LawnPricing): VisitPrice {
  const weekly = pricing.base + (Math.max(0, lawnSqFt) / 1000) * pricing.per1000SqFt
  const price = Math.max(pricing.minimum, weekly * pricing.factors[frequency])
  // Whole dollars, and never a range that dips under the minimum.
  const low = Math.max(pricing.minimum, Math.floor(price * (1 - pricing.spread)))
  const high = Math.max(low, Math.ceil(price * (1 + pricing.spread)))
  return { price: Math.round(price), low, high }
}

export const SQFT_PER_ACRE = 43_560
