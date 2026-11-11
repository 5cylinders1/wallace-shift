/**
 * Where booking requests and questions go. SoLara has not chosen a
 * destination (an inbox, Square Appointments, or a text line), so these stay
 * null and both forms say plainly that nothing was sent. Point them at an
 * HTTPS endpoint that accepts the JSON payloads below to go live; the
 * confirmation screens then switch to "sent".
 */
export const BOOKING_ENDPOINT: string | null = null
export const INQUIRY_ENDPOINT: string | null = null

export interface BookingRequest {
  services: string[]
  day: string
  window: string
  firstName: string
  lastName: string
  phone: string
  email: string
  visited: string
  colorHistory: string
  contact: string
  notes: string
}

export interface InquiryRequest {
  topic: string
  name: string
  email: string
  phone: string
  message: string
  /** File names only; a live endpoint would take the images as multipart. */
  photos: string[]
}

export type SubmitResult = { status: 'sent' } | { status: 'demo' } | { status: 'error' }

async function post(endpoint: string | null, body: unknown): Promise<SubmitResult> {
  if (!endpoint) return { status: 'demo' }
  try {
    const response = await fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
    return response.ok ? { status: 'sent' } : { status: 'error' }
  } catch {
    return { status: 'error' }
  }
}

export const submitBooking = (request: BookingRequest) => post(BOOKING_ENDPOINT, request)
export const submitInquiry = (request: InquiryRequest) => post(INQUIRY_ENDPOINT, request)
