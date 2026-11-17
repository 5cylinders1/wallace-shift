/**
 * Client half of the enquiry pipeline.
 *
 * The endpoint is `/api/contact` — a serverless function that holds the
 * Resend key, so nothing secret reaches the browser. See `api/contact.ts`
 * for the environment variables it needs.
 */
export const CONTACT_ENDPOINT: string | null = '/api/contact'

export type ContactOffer = 'website' | 'lead-follow-up'
export type ContactReadiness = 'ready' | 'questions' | 'planning'
export type ContactTiming = 'soon' | 'later' | 'exploring'
export type ContactDecisionRole = 'owner' | 'shared' | 'researching'

export type ContactPayload = {
  /** Stable for retries of one inquiry. No personal data is encoded here. */
  requestId?: string
  name: string
  email: string
  /** Phone callbacks may leave email empty. All other requests require email. */
  contactMethod?: 'phone' | 'email'
  phone?: string
  message: string
  /** Structured context, all optional: an enquiry is still valid without
   *  any of it, and the endpoint only adds the ones that were answered. */
  website?: string
  noWebsite?: boolean
  service?: string
  package?: string
  budget?: string
  /** The endpoint supplies the offer's canonical name, price and page.
   *  These optional answers provide context; none is an eligibility gate. */
  offer?: ContactOffer
  businessName?: string
  readiness?: ContactReadiness
  timing?: ContactTiming
  decisionRole?: ContactDecisionRole
  /** The demo the visitor came from, e.g. `deercreek`. The endpoint keeps
   *  its own allowlist and drops anything it does not recognise. */
  source?: string
  /** Fixed project context carried from the demo's website invitation. */
  project?: 'website'
  /** Honeypot. Always empty for a real person; see ContactForm. */
  company?: string
}

export type ContactResult =
  | { ok: true }
  | { ok: false; reason: 'not_configured' | 'invalid' | 'network_error' }

type ApiBody = { ok?: unknown; error?: unknown }

export async function submitContactRequest(
  payload: ContactPayload,
  options: { signal?: AbortSignal } = {},
): Promise<ContactResult> {
  if (!CONTACT_ENDPOINT) {
    return { ok: false, reason: 'not_configured' }
  }

  try {
    const response = await fetch(CONTACT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: options.signal,
    })

    const body = (await response.json().catch(() => null)) as ApiBody | null
    if (options.signal?.aborted) return { ok: false, reason: 'network_error' }

    // Anything that is not this API's own JSON is treated as "no inbox
    // wired up". The dev server has no serverless functions and answers
    // with the SPA's HTML and a 200 — reporting that as a delivered
    // message would be a fake confirmation, which is worse than an honest
    // failure.
    if (!body || typeof body.ok !== 'boolean') {
      return { ok: false, reason: 'not_configured' }
    }

    if (response.ok && body.ok) return { ok: true }
    if (body.error === 'not_configured') {
      return { ok: false, reason: 'not_configured' }
    }
    if (body.error === 'invalid') return { ok: false, reason: 'invalid' }
    return { ok: false, reason: 'network_error' }
  } catch {
    return { ok: false, reason: 'network_error' }
  }
}
