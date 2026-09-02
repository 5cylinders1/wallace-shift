/**
 * Contact form endpoint.
 *
 * The enquiry form cannot talk to Resend directly: doing so would ship the
 * API key to every visitor. This function is the only thing that holds it,
 * and it reads every value from the environment so no address or key is
 * ever committed.
 *
 * Required environment variables (Vercel → Settings → Environment
 * Variables). Until all three exist the endpoint reports `not_configured`
 * rather than failing, so the form keeps telling visitors the truth:
 *
 *   RESEND_API_KEY      Resend API key.
 *   CONTACT_TO_EMAIL    Where enquiries land, e.g. messages@wallaceshift.com
 *   CONTACT_FROM_EMAIL  Verified sender on the Resend domain, e.g.
 *                       "Wallace Shift <noreply@wallaceshift.com>"
 */

export const config = { runtime: 'edge' }

const RESEND_ENDPOINT = 'https://api.resend.com/emails'

/** Length caps — a genuine enquiry never approaches these, and they stop
 *  the endpoint being used to relay bulk content. */
const MAX_NAME = 120
const MAX_EMAIL = 200
const MAX_MESSAGE = 5000

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

/** Returns the trimmed string, or null if it is missing, empty, or over
 *  its cap. */
function cleanField(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (trimmed === '' || trimmed.length > max) return null
  return trimmed
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return json({ ok: false, error: 'method_not_allowed' }, 405)
  }

  const apiKey = process.env.RESEND_API_KEY
  const to = process.env.CONTACT_TO_EMAIL
  const from = process.env.CONTACT_FROM_EMAIL

  // Reported distinctly from a send failure: the form shows "not connected
  // to an inbox yet" for this, which stays accurate until the mailbox and
  // the key both exist.
  if (!apiKey || !to || !from) {
    return json({ ok: false, error: 'not_configured' }, 503)
  }

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return json({ ok: false, error: 'invalid' }, 400)
  }

  // Honeypot. The field is off-screen and never focusable, so a human
  // cannot fill it. Answer 200 so a bot gets no failure signal to retry
  // against, but send nothing.
  if (typeof body.company === 'string' && body.company.trim() !== '') {
    return json({ ok: true }, 200)
  }

  const name = cleanField(body.name, MAX_NAME)
  const email = cleanField(body.email, MAX_EMAIL)
  const message = cleanField(body.message, MAX_MESSAGE)

  if (!name || !email || !message) {
    return json({ ok: false, error: 'invalid' }, 400)
  }

  // Deliberately permissive: the real validation is the reply bouncing.
  // This only rejects input that cannot be an address at all.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ ok: false, error: 'invalid' }, 400)
  }

  let response: Response
  try {
    response = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        // So replying in the mail client answers the enquirer directly
        // rather than the noreply sender.
        reply_to: email,
        subject: `New enquiry from ${name}`,
        text: `Name: ${name}\nEmail: ${email}\n\n${message}\n`,
      }),
    })
  } catch {
    return json({ ok: false, error: 'send_failed' }, 502)
  }

  if (!response.ok) {
    return json({ ok: false, error: 'send_failed' }, 502)
  }

  return json({ ok: true }, 200)
}
