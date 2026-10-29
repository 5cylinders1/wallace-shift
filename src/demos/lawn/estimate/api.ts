/** Browser side of /api/lawn-*: typed calls that never throw. */

import type { AddressSuggestion, Credit, LawnErrorCode, LookupResponse, ServiceRequestBody, ServiceRequestResponse } from './types'

type Failure = { ok: false; error: LawnErrorCode }

/** The dev server answers unknown routes with HTML; anything that isn't our JSON is a failure, never a success. */
async function call<T extends { ok: boolean }>(input: string, init?: RequestInit): Promise<T | Failure> {
  try {
    const response = await fetch(input, init)
    const body = (await response.json().catch(() => null)) as T | Failure | null
    if (body && typeof body === 'object' && typeof body.ok === 'boolean') return body
    return { ok: false, error: response.status === 429 ? 'rate_limited' : 'upstream' }
  } catch {
    return { ok: false, error: 'upstream' }
  }
}

export const suggest = (q: string, signal: AbortSignal) =>
  call<{ ok: true; suggestions: AddressSuggestion[]; credits: Credit[] }>(`/api/lawn-suggest?q=${encodeURIComponent(q)}`, { signal })

export const lookup = (target: { id: string } | { address: string }): Promise<LookupResponse> =>
  call<LookupResponse & { ok: true }>(`/api/lawn-lookup?${new URLSearchParams(target)}`) as Promise<LookupResponse>

export const requestService = (body: ServiceRequestBody) =>
  call<ServiceRequestResponse & { ok: true }>('/api/lawn-request', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }) as Promise<ServiceRequestResponse>

/** Loads an aerial so its pixels can be read (NAIP sends Access-Control-Allow-Origin: *). */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.decoding = 'async'
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error(`image failed: ${src}`))
    image.src = src
  })
}

export const ERROR_TEXT: Record<LawnErrorCode, string> = {
  not_configured: 'The estimator isn’t connected yet.',
  invalid: 'Something in that request didn’t look right. Please check it and try again.',
  address_not_found: 'We couldn’t find that address. Try picking one from the list.',
  out_of_range: 'That address is outside the service area.',
  rate_limited: 'Too many tries in a short time. Please wait a few minutes.',
  busy: 'The map service is busy. Please try again in a moment.',
  upstream: 'The map service didn’t answer. Please try again.',
  send_failed: 'Your request didn’t go through. Please try again, or call or text instead.',
}
