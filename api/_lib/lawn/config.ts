/**
 * Everything the lawn estimator reads from the environment. All of it is
 * server-side: the page receives the rates with each lookup, and the
 * business's coordinates never leave this file (only distances do).
 *
 * Pricing, per mowing visit (dollars):
 *
 *   LAWN_PRICE_BASE              Default 25. Flat part of every visit.
 *   LAWN_PRICE_PER_1000_SQFT     Default 3.25. Added per 1,000 sq ft of lawn.
 *   LAWN_PRICE_MINIMUM           Default 35. No visit is quoted below this.
 *   LAWN_BIWEEKLY_FACTOR         Default 1.2. Every-two-weeks visits cost more (taller grass).
 *   LAWN_ONE_TIME_FACTOR         Default 1.5. A single mow, no schedule.
 *   LAWN_PRICE_SPREAD            Default 0.1. The range shown is price ± this share.
 *
 *   While none of the three rates (base, per 1,000, minimum) is set, the
 *   page labels its figures as sample rates.
 *
 * Service area:
 *
 *   LAWN_SERVICE_ORIGIN          "lat,lng" of the business, e.g. "38.767,-94.679"
 *                                (Google Maps → right-click → copy coordinates).
 *                                Unset: every address is accepted.
 *   LAWN_SERVICE_RADIUS_MILES    Default 15. Straight-line miles from the origin.
 *
 * Service requests (Resend):
 *
 *   RESEND_API_KEY               Shared with the studio's contact form.
 *   LAWN_REQUEST_TO_EMAIL        Where requests land.
 *   LAWN_REQUEST_FROM_EMAIL      Verified Resend sender; falls back to CONTACT_FROM_EMAIL.
 */

import type { Frequency, LatLng, LawnPricing, ServiceRange } from '../../../src/demos/lawn/estimate/types.js'

const number = (name: string, fallback: number, min: number, max: number): number => {
  const raw = process.env[name]?.trim()
  if (!raw) return fallback
  const value = Number(raw)
  if (!Number.isFinite(value) || value < min || value > max) {
    console.error(`[lawn] ignoring ${name}=${raw}: expected a number from ${min} to ${max}`)
    return fallback
  }
  return value
}

export function pricingFromEnv(): LawnPricing {
  const rates = ['LAWN_PRICE_BASE', 'LAWN_PRICE_PER_1000_SQFT', 'LAWN_PRICE_MINIMUM']
  const factors: Record<Frequency, number> = {
    weekly: 1,
    biweekly: number('LAWN_BIWEEKLY_FACTOR', 1.2, 1, 3),
    once: number('LAWN_ONE_TIME_FACTOR', 1.5, 1, 4),
  }
  return {
    base: number('LAWN_PRICE_BASE', 25, 0, 500),
    per1000SqFt: number('LAWN_PRICE_PER_1000_SQFT', 3.25, 0, 100),
    minimum: number('LAWN_PRICE_MINIMUM', 35, 0, 1000),
    factors,
    spread: number('LAWN_PRICE_SPREAD', 0.1, 0, 0.5),
    sample: rates.every((name) => !process.env[name]?.trim()),
  }
}

function origin(): LatLng | null {
  const [lat, lng] = (process.env.LAWN_SERVICE_ORIGIN ?? '').split(',').map((part) => Number(part.trim()))
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && (lat !== 0 || lng !== 0) ? { lat, lng } : null
}

/** Ranks address suggestions near the business first. */
export const searchBias = (): LatLng | null => origin()

const EARTH_MILES = 3958.8

function haversineMiles(a: LatLng, b: LatLng): number {
  const rad = Math.PI / 180
  const dLat = (b.lat - a.lat) * rad
  const dLng = (b.lng - a.lng) * rad
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_MILES * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** Null while the business location isn't configured. */
export function rangeOf(point: LatLng): ServiceRange | null {
  const from = origin()
  if (!from) return null
  const radiusMiles = number('LAWN_SERVICE_RADIUS_MILES', 15, 0.5, 200)
  const miles = haversineMiles(from, point)
  return { miles: Math.round(miles * 10) / 10, radiusMiles, inRange: miles <= radiusMiles }
}

export function mailFromEnv(): { apiKey: string; to: string; from: string } | null {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  const to = process.env.LAWN_REQUEST_TO_EMAIL?.trim()
  const from = (process.env.LAWN_REQUEST_FROM_EMAIL ?? process.env.CONTACT_FROM_EMAIL)?.trim()
  return apiKey && to && from ? { apiKey, to, from } : null
}
