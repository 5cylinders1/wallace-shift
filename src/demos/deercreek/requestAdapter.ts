/**
 * Where booking requests go. Deer Creek has not chosen a destination yet
 * (their inbox, a CRM, or a scheduling tool such as Housecall Pro or
 * ServiceTitan), so this stays null and the form says plainly that nothing
 * was sent. Set an HTTPS endpoint that accepts the JSON payload below to go
 * live; the success screen then switches to "Request sent".
 */
export const REQUEST_ENDPOINT: string | null = null

export interface ScheduleRequest {
  service: string
  /** The problem-finder choice, if the visitor came from it. */
  issue: string
  details: string
  urgency: string
  zip: string
  property: string
  day: string
  window: string
  name: string
  phone: string
  email: string
  contact: string
  preferences: string[]
  notes: string
}

export type SubmitResult = { status: 'sent' } | { status: 'demo' } | { status: 'error' }

export async function submitRequest(request: ScheduleRequest): Promise<SubmitResult> {
  if (!REQUEST_ENDPOINT) return { status: 'demo' }
  try {
    const response = await fetch(REQUEST_ENDPOINT, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(request) })
    return response.ok ? { status: 'sent' } : { status: 'error' }
  } catch {
    return { status: 'error' }
  }
}
