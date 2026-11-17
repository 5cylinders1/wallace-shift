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
const MAX_PHONE = 40
const MAX_MESSAGE = 5000
/** The structured fields are chosen from short lists, so anything longer
 *  than this did not come from the form and is dropped rather than relayed. */
const MAX_CHOICE = 80
const MAX_URL = 300

/** Trusted offer context. Prices and URLs are never taken from a submitted
 *  package label, so an inquiry always identifies the offer actually chosen. */
const OFFERS: Record<string, { name: string; price: string; path: string; tag: string }> = {
  website: {
    name: 'Website with hosting, maintenance and basic SEO',
    price: '$250/month',
    path: '/offers/contractor-websites',
    tag: 'Website offer',
  },
  'lead-follow-up': {
    name: 'Lead page plus automatic follow up',
    price: '$1,500 one time',
    path: '/offers/lead-page-follow-up',
    tag: 'Lead page offer',
  },
}

const READINESS: Record<string, string> = {
  ready: 'Ready to discuss the offer',
  questions: 'I need more information',
  planning: 'Planning for the future',
}
const TIMING: Record<string, string> = {
  soon: 'Soon',
  later: 'Later',
  exploring: 'Still exploring',
}
const DECISION_ROLES: Record<string, string> = {
  owner: 'Owner or decision maker',
  shared: 'Deciding with someone else',
  researching: 'Researching for the business',
}

function allowedValue<T>(choices: Record<string, T>, value: unknown): T | undefined {
  return typeof value === 'string' && Object.hasOwn(choices, value)
    ? choices[value]
    : undefined
}

/** Demos whose "Discuss my website" link carries a source id to /contact.
 *  Kept here rather than trusted from the client: an id the endpoint does
 *  not know is dropped, so the email only ever names a real demo. */
const DEMO_SOURCES: Record<string, { line: string; tag: string }> = {
  deercreek: {
    line: 'Deer Creek Plumbing website demo (/demo/deercreek)',
    tag: 'Deer Creek demo',
  },
  deercreekplumbing: {
    line: 'Deer Creek Plumbing website demo (/demo/deercreekplumbing)',
    tag: 'Deer Creek Plumbing demo',
  },
}

function demoSource(value: unknown): { line: string; tag: string } | null {
  return typeof value === 'string' && Object.hasOwn(DEMO_SOURCES, value)
    ? DEMO_SOURCES[value]
    : null
}

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

/** Optional context. Absent, unanswered or over-length all become empty, so
 *  a missing answer never blocks an enquiry. Line breaks are collapsed: these
 *  are single-line choices, and they are rendered into a plain-text body
 *  where a stray newline would forge another labelled line. */
function optionalField(value: unknown, max: number): string {
  const cleaned = cleanField(value, max)
  return cleaned === null ? '' : cleaned.replace(/[\r\n]+/g, ' ')
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
    const parsed: unknown = await request.json()
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return json({ ok: false, error: 'invalid' }, 400)
    }
    body = parsed as Record<string, unknown>
  } catch {
    return json({ ok: false, error: 'invalid' }, 400)
  }

  // Honeypot. The field is off-screen and never focusable, so a human
  // cannot fill it. Answer 200 so a bot gets no failure signal to retry
  // against, but send nothing.
  if (typeof body.company === 'string' && body.company.trim() !== '') {
    return json({ ok: true }, 200)
  }

  // Optional so existing contact forms keep working. Identical retries from
  // the call dialog reuse this key; Resend deduplicates them for 24 hours.
  let requestId: string | undefined
  if (body.requestId !== undefined) {
    if (typeof body.requestId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.requestId)) {
      return json({ ok: false, error: 'invalid' }, 400)
    }
    requestId = body.requestId.toLowerCase()
  }

  const name = cleanField(body.name, MAX_NAME)?.replace(/[\r\n]+/g, ' ')
  const email = cleanField(body.email, MAX_EMAIL)
  const contactMethod = body.contactMethod === undefined ? 'email' : body.contactMethod
  const phone = cleanField(body.phone, MAX_PHONE)?.replace(/\s+/g, ' ')
  const message = cleanField(body.message, MAX_MESSAGE)
  const website = body.noWebsite === true
    ? 'No website yet'
    : optionalField(body.website ?? body.existingWebsite, MAX_URL)
  const service = optionalField(body.service, MAX_CHOICE)
  const packageChoice = optionalField(body.package, MAX_CHOICE)
  const budget = optionalField(body.budget, MAX_CHOICE)
  const source = demoSource(body.source)
  const project = body.project === 'website' ? 'Website project' : ''
  const offer = allowedValue(OFFERS, body.offer)
  const businessName = optionalField(body.businessName, MAX_NAME)
  const readiness = allowedValue(READINESS, body.readiness)
  const timing = allowedValue(TIMING, body.timing)
  const decisionRole = allowedValue(DECISION_ROLES, body.decisionRole)

  if (!name || !message || (contactMethod !== 'phone' && contactMethod !== 'email')) {
    return json({ ok: false, error: 'invalid' }, 400)
  }

  // Email remains required for existing forms. A phone callback can omit it,
  // but an optional address must still be valid before it becomes reply-to.
  const emailOmitted = body.email === undefined || (typeof body.email === 'string' && body.email.trim() === '')
  if ((!emailOmitted || contactMethod === 'email') && (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    return json({ ok: false, error: 'invalid' }, 400)
  }

  const phoneOmitted = body.phone === undefined || (typeof body.phone === 'string' && body.phone.trim() === '')
  const phoneDigits = phone?.replace(/\D/g, '').length ?? 0
  if ((!phoneOmitted || contactMethod === 'phone') && (!phone || !/^\+?[\d(). -]+$/.test(phone) || phoneDigits < 7 || phoneDigits > 15)) {
    return json({ ok: false, error: 'invalid' }, 400)
  }

  let response: Response
  try {
    response = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
        ...(requestId ? { 'Idempotency-Key': `contact/${requestId}` } : {}),
      },
      body: JSON.stringify({
        from,
        to: [to],
        // Never invent an email address for a phone-only callback.
        ...(email ? { reply_to: email } : {}),
        subject: `New enquiry from ${name}${offer ? ` (${offer.tag})` : source ? ` (${source.tag})` : ''}`,
        text: [
          `Name: ${name}`,
          ...(email ? [`Email: ${email}`] : []),
          ...(phone ? [`Phone: ${phone}`] : []),
          ...(contactMethod === 'phone' ? ['Reply preference: Phone callback'] : []),
          ...(offer ? [
            `Offer: ${offer.name}`,
            `Advertised price: ${offer.price}`,
            `Offer page: https://wallaceshift.com${offer.path}`,
          ] : []),
          ...(businessName ? [`Business: ${businessName}`] : []),
          ...(source ? [`Source: ${source.line}`] : []),
          ...(project ? [`Project: ${project}`] : []),
          ...(website ? [`Website: ${website}`] : []),
          ...(service ? [`Service: ${service}`] : []),
          ...(!offer && packageChoice ? [`Package: ${packageChoice}`] : []),
          ...(budget ? [`Budget: ${budget}`] : []),
          ...(readiness ? [`Readiness: ${readiness}`] : []),
          ...(timing ? [`Timing: ${timing}`] : []),
          ...(decisionRole ? [`Decision role: ${decisionRole}`] : []),
          '',
          message,
          '',
        ].join('\n'),
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
