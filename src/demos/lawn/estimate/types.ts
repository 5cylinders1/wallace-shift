/**
 * The contract between the lawn serverless functions (api/lawn-*.ts) and
 * the estimator on the page. Type-only apart from the shared choice lists,
 * so the functions can import it without bundling any of the front end.
 */

import type { AddressSuggestion, Credit, LatLng, LocationPrecision, RoofAddress } from '../../roofers/roof/types.js'

export type { AddressSuggestion, Credit, LatLng, LocationPrecision }
export type LawnAddress = RoofAddress

export type LawnErrorCode =
  | 'not_configured'
  | 'invalid'
  | 'address_not_found'
  | 'out_of_range'
  | 'rate_limited'
  | 'busy'
  | 'upstream'
  | 'send_failed'

/** The rates the estimate is built from; set per deployment (api/_lib/lawn/config.ts). */
export interface LawnPricing {
  /** Per visit, before the lawn's size is added. */
  base: number
  /** Added per 1,000 sq ft of mowable lawn. */
  per1000SqFt: number
  /** No visit is quoted below this. */
  minimum: number
  /** Per-visit multipliers against a weekly visit. */
  factors: Record<Frequency, number>
  /** ± share of the price shown as the range, e.g. 0.1. */
  spread: number
  /** True while the defaults are in use: the page labels the figures as sample rates. */
  sample: boolean
}

export const FREQUENCIES = ['weekly', 'biweekly', 'once'] as const
export type Frequency = (typeof FREQUENCIES)[number]

/** Extras that are quoted after a look at the yard; the instant price is for mowing. */
export const EXTRAS = ['shrubs', 'leaves', 'limbs', 'seeding', 'fertilizing', 'weeds', 'cleanup'] as const
export type Extra = (typeof EXTRAS)[number]

export const TIMINGS = ['asap', 'week', 'flexible'] as const
export type Timing = (typeof TIMINGS)[number]

export const CONTACT_METHODS = ['text', 'call', 'email'] as const
export type ContactMethod = (typeof CONTACT_METHODS)[number]

/**
 * A square aerial view. `viewM` is the ground it spans edge to edge; the
 * imagery is Web Mercator, so the browser projects with the frame's center
 * latitude (src/demos/lawn/estimate/geo.ts).
 */
export interface LawnFrame {
  center: LatLng
  viewM: number
  /** Logical size in CSS pixels. */
  size: number
}

export interface LawnBuilding {
  id: string
  ring: LatLng[]
  areaSqFt: number
  /** Metres from the address point; 0 when the point is inside. */
  distanceM: number
}

export interface ServiceRange {
  /** Straight-line miles from the business to the address. */
  miles: number
  radiusMiles: number
  inRange: boolean
}

export interface LawnLookup {
  ok: true
  address: LawnAddress
  location: LatLng
  precision: LocationPrecision
  /** Nearest first; the estimator splits the lot between them. */
  buildings: LawnBuilding[]
  /** The building we take to be the house, or null to let the homeowner tap it. */
  home: string | null
  frame: LawnFrame
  /** Public-domain aerials for the frame: natural color to show, near-infrared to measure. */
  imagery: { photo: string; infrared: string; credits: Credit[] }
  /** Null while the business location isn't configured: every address is accepted. */
  range: ServiceRange | null
  pricing: LawnPricing
  credits: Credit[]
}

export type LookupResponse = LawnLookup | { ok: false; error: LawnErrorCode }

export interface ServiceRequestBody {
  /** The suggestion id the lookup used, so the server re-checks the same point. */
  id?: string
  address?: string
  name: string
  phone: string
  email: string
  contact: ContactMethod
  frequency: Frequency
  lawnSqFt: number
  extras: Extra[]
  timing: Timing
  notes: string
  /** Honeypot: never filled by a person. */
  company?: string
}

export type ServiceRequestResponse =
  | { ok: true; price: { low: number; high: number } }
  | { ok: false; error: LawnErrorCode; range?: ServiceRange }
