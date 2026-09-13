/**
 * Client half of the enquiry pipeline.
 *
 * The endpoint is `/api/contact` — a serverless function that holds the
 * Resend key, so nothing secret reaches the browser. See `api/contact.ts`
 * for the environment variables it needs.
 */
export const CONTACT_ENDPOINT: string | null = '/api/contact'

export type ContactPayload = {
  name: string
  email: string
  message: string
  /** Structured context, all optional: an enquiry is still valid without
   *  any of it, and the endpoint only adds the ones that were answered. */
  website?: string
  noWebsite?: boolean
  service?: string
  package?: string
  budget?: string
  /** Honeypot. Always empty for a real person; see ContactForm. */
  company?: string
}

export type ContactResult =
  | { ok: true }
  | { ok: false; reason: 'not_configured' | 'invalid' | 'network_error' }

type ApiBody = { ok?: unknown; error?: unknown }

export async function submitContactRequest(
  payload: ContactPayload,
): Promise<ContactResult> {
  if (!CONTACT_ENDPOINT) {
    return { ok: false, reason: 'not_configured' }
  }

  try {
    const response = await fetch(CONTACT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const body = (await response.json().catch(() => null)) as ApiBody | null

    // Anything that is not this API's own JSON is treated as "no inbox
    // wired up". The dev server has no serverless functions and answers
    // with the SPA's HTML and a 200 — reporting that as a delivered
    // message would be a fake confirmation, which is worse than an honest
    // failure.
    if (!body || typeof body.ok !== 'boolean') {
      return { ok: false, reason: 'not_configured' }
    }

    if (body.ok) return { ok: true }
    if (body.error === 'not_configured') {
      return { ok: false, reason: 'not_configured' }
    }
    if (body.error === 'invalid') return { ok: false, reason: 'invalid' }
    return { ok: false, reason: 'network_error' }
  } catch {
    return { ok: false, reason: 'network_error' }
  }
}
