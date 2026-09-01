/**
 * No submission destination has been supplied for this project yet.
 * Set CONTACT_ENDPOINT to a real form-handling URL (or wire up an email
 * service) once it exists, and this adapter will start submitting for real.
 */
export const CONTACT_ENDPOINT: string | null = null

export type ContactPayload = {
  name: string
  email: string
  message: string
}

export type ContactResult =
  | { ok: true }
  | { ok: false; reason: 'not_configured' | 'network_error' }

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

    return response.ok ? { ok: true } : { ok: false, reason: 'network_error' }
  } catch {
    return { ok: false, reason: 'network_error' }
  }
}
