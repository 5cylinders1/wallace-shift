/**
 * Bounds for a measured lawn. Shared by the page and /api/lawn-request,
 * which passes the size along with a consultation request as context only.
 */

/** Lawns outside this are a typo or a field: the size is left out of the request. */
export const MIN_LAWN_SQFT = 300
export const MAX_LAWN_SQFT = 220_000

export const SQFT_PER_ACRE = 43_560
