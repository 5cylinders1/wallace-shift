/**
 * Where visit requests go. Dopps Chiropractic already books through Square
 * Appointments, so the form's honest fallback links there. Point this at an HTTPS
 * endpoint that accepts the JSON below (an inbox relay, or a Square integration)
 * to go live; the confirmation then switches to "sent".
 */
export const REQUEST_ENDPOINT: string | null = null

export interface VisitRequest {
  reason: string
  patient: string
  newPatient: string
  day: string
  window: string
  firstName: string
  lastName: string
  phone: string
  email: string
  autoAccident: boolean
  notes: string
}

export type SubmitResult = { status: 'sent' } | { status: 'demo' } | { status: 'error' }

export async function submitVisit(request: VisitRequest): Promise<SubmitResult> {
  if (!REQUEST_ENDPOINT) return { status: 'demo' }
  try {
    const response = await fetch(REQUEST_ENDPOINT, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(request) })
    return response.ok ? { status: 'sent' } : { status: 'error' }
  } catch {
    return { status: 'error' }
  }
}
