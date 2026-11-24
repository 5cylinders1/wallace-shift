/**
 * The contract between the lawn serverless function (api/lawn.ts) and
 * the yard planner on the page. Type-only apart from the shared choice lists,
 * so the functions can import it without bundling any of the front end.
 */

import type { AddressSuggestion, Credit, LatLng, LocationPrecision, RoofAddress } from '../../roofers/roof/types.js'

export type { AddressSuggestion, Credit, LatLng, LocationPrecision }
export type LawnAddress = RoofAddress

export type LawnErrorCode =
  | 'not_configured'
  | 'invalid'
  | 'address_not_found'
  | 'rate_limited'
  | 'busy'
  | 'upstream'
  | 'send_failed'

/** What the homeowner is planning; Lareau's own service list. */
export const PROJECTS = ['patio', 'walls', 'kitchen', 'fire', 'planting', 'lighting', 'drainage', 'sprinklers'] as const
export type Project = (typeof PROJECTS)[number]

export const TIMINGS = ['season', 'months', 'planning'] as const
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
  /** Measured or adjusted on the page; null when the lawn couldn't be measured. */
  lawnSqFt: number | null
  projects: Project[]
  timing: Timing
  notes: string
  /** Honeypot: never filled by a person. */
  company?: string
}

export type ServiceRequestResponse = { ok: true } | { ok: false; error: LawnErrorCode }
