import type { LookupResponse, RoofErrorCode, SuggestResponse } from './types'

/**
 * Browser half of the roof tool. Provider keys live only in the
 * serverless functions; these calls go to our own /api routes.
 *
 * Anything that is not our API's JSON is reported as `not_configured`: a
 * static preview (or the dev server before a key is set) answers /api/* with
 * an HTML page, and pretending that was a result would be worse than saying
 * plainly that live measurement is not connected.
 */

const SUGGEST_ENDPOINT = '/api/roof-suggest'
const LOOKUP_ENDPOINT = '/api/roof-lookup'

type Body = { ok?: unknown; error?: unknown }

const KNOWN_ERRORS: RoofErrorCode[] = ['not_configured', 'invalid', 'address_not_found', 'no_footprint', 'rate_limited', 'busy', 'upstream']

async function getJson<T extends { ok: boolean }>(url: string, signal?: AbortSignal): Promise<T | { ok: false; error: RoofErrorCode }> {
  try {
    const response = await fetch(url, { signal, headers: { accept: 'application/json' } })
    const type = response.headers.get('content-type') ?? ''
    if (!type.includes('application/json')) return { ok: false, error: 'not_configured' }
    const body = (await response.json().catch(() => null)) as Body | null
    if (!body || typeof body.ok !== 'boolean') return { ok: false, error: 'not_configured' }
    if (body.ok) return body as unknown as T
    const error = KNOWN_ERRORS.includes(body.error as RoofErrorCode) ? (body.error as RoofErrorCode) : 'upstream'
    return { ok: false, error }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    return { ok: false, error: 'upstream' }
  }
}

export function suggestAddresses(query: string, signal?: AbortSignal) {
  const params = new URLSearchParams({ q: query })
  return getJson<Extract<SuggestResponse, { ok: true }>>(`${SUGGEST_ENDPOINT}?${params}`, signal)
}

export type LookupTarget = { kind: 'suggestion'; id: string } | { kind: 'address'; address: string }

export function lookupRoof(target: LookupTarget, signal?: AbortSignal): Promise<LookupResponse> {
  const params = new URLSearchParams(target.kind === 'suggestion' ? { id: target.id } : { address: target.address })
  return getJson<Extract<LookupResponse, { ok: true }>>(`${LOOKUP_ENDPOINT}?${params}`, signal)
}
