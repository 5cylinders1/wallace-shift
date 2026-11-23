/**
 * Where quote requests go. The Base44 build saved them to its own
 * QuoteRequest entity; this copy has no destination yet, so the endpoint stays
 * null and the form says plainly that nothing was sent. Point it at an HTTPS
 * endpoint that accepts the JSON below to go live; the form then reports
 * "received" only after that endpoint answers OK.
 */
export const QUOTE_ENDPOINT: string | null = null

export interface QuoteRequest {
  name: string
  phone: string
  email: string
  zip: string
  service: string
  property: string
  details: string
}

export type SubmitResult = 'sent' | 'demo' | 'error'

export async function submitQuote(request: QuoteRequest): Promise<SubmitResult> {
  if (!QUOTE_ENDPOINT) return 'demo'
  try {
    const response = await fetch(QUOTE_ENDPOINT, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(request) })
    return response.ok ? 'sent' : 'error'
  } catch {
    return 'error'
  }
}

/** The same checks the Base44 server function ran before saving. */
export function validQuote(request: QuoteRequest): boolean {
  const digits = request.phone.replace(/\D/g, '').length
  return request.name.trim().length >= 2 && (digits === 10 || digits === 11) && /^[+\d().\s-]+$/.test(request.phone)
}
