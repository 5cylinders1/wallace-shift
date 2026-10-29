/**
 * Lawn endpoints answer in their own error vocabulary (LawnErrorCode) but
 * reuse the roof estimator's plumbing: the geocoder and footprint sources
 * throw RoofError, which is translated here.
 */

import type { ServerResponse } from 'node:http'
import type { LawnErrorCode, ServiceRange } from '../../../src/demos/lawn/estimate/types.js'
import { RoofError, sendJson } from '../roof/http.js'

/** Dead ends a visitor can act on are answers (200), as in the roof endpoints. */
const STATUS: Record<LawnErrorCode, number> = {
  not_configured: 200,
  invalid: 400,
  address_not_found: 200,
  out_of_range: 200,
  rate_limited: 429,
  busy: 503,
  upstream: 502,
  send_failed: 502,
}

export class LawnError extends Error {
  readonly code: LawnErrorCode
  readonly range: ServiceRange | undefined
  constructor(code: LawnErrorCode, range?: ServiceRange) {
    super(code)
    this.code = code
    this.range = range
  }
}

export function sendLawnError(res: ServerResponse, code: LawnErrorCode, range?: ServiceRange): void {
  sendJson(res, { ok: false, error: code, ...(range ? { range } : {}) }, STATUS[code])
}

function fromRoof(error: RoofError): LawnErrorCode {
  switch (error.code) {
    case 'invalid':
    case 'address_not_found':
    case 'busy':
    case 'rate_limited':
    case 'not_configured':
      return error.code
    case 'timed_out':
      return 'busy'
    default:
      return 'upstream'
  }
}

export async function handleLawn(res: ServerResponse, label: string, run: () => Promise<void>): Promise<void> {
  try {
    await run()
  } catch (error) {
    if (res.headersSent) return
    if (error instanceof LawnError) return sendLawnError(res, error.code, error.range)
    if (error instanceof RoofError) {
      const code = fromRoof(error)
      if (code === 'upstream' || code === 'busy') console.error(`[${label}] ${error.code}: ${error.message}`)
      return sendLawnError(res, code)
    }
    console.error(`[${label}] unexpected:`, error)
    sendLawnError(res, 'upstream')
  }
}
