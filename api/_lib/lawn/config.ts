/**
 * What the yard planner reads from the environment. All of it is
 * server-side.
 *
 * Consultation requests (Resend):
 *
 *   RESEND_API_KEY               Shared with the studio's contact form.
 *   LAREAU_REQUEST_TO_EMAIL      Where Lareau Landscape & Design's requests land.
 *                                Unset: the page says nothing was sent.
 *   LAREAU_REQUEST_FROM_EMAIL    Verified Resend sender; falls back to CONTACT_FROM_EMAIL.
 *
 * The names are the business's own so that no inbox configured for an
 * earlier concept on this route can receive its requests.
 */

import type { LatLng } from '../../../src/demos/lawn/estimate/types.js'

/**
 * Ranks address suggestions around Lenexa, Kansas, where the business is
 * based (a rounded city-level point, not its address). There is no service
 * radius: Lareau works across the Kansas City metro and every address is
 * accepted.
 */
const LENEXA: LatLng = { lat: 38.96, lng: -94.77 }
export const searchBias = (): LatLng => LENEXA

export function mailFromEnv(): { apiKey: string; to: string; from: string } | null {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  const to = process.env.LAREAU_REQUEST_TO_EMAIL?.trim()
  const from = (process.env.LAREAU_REQUEST_FROM_EMAIL ?? process.env.CONTACT_FROM_EMAIL)?.trim()
  return apiKey && to && from ? { apiKey, to, from } : null
}
