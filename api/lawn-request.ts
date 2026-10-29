/**
 * Service requests from the lawn estimator.
 *
 *   POST /api/lawn-request   ServiceRequestBody (src/demos/lawn/estimate/types.ts)
 *   → { ok: true, price } or { ok: false, error, range? }
 *
 * The address is resolved again here and its distance from the business
 * re-checked, so a request outside the service radius is refused whatever
 * the page said. The per-visit price is recomputed from this deployment's
 * rates. Until Resend and the destination inbox are configured
 * (api/_lib/lawn/config.ts) the answer is `not_configured` and the page
 * says so: nothing is ever reported as sent that wasn't.
 */

import type { IncomingMessage, ServerResponse } from 'node:http'
import {
  CONTACT_METHODS, EXTRAS, FREQUENCIES, TIMINGS,
  type ContactMethod, type Extra, type Frequency, type Timing,
} from '../src/demos/lawn/estimate/types.js'
import { MAX_LAWN_SQFT, MIN_LAWN_SQFT, visitPrice } from '../src/demos/lawn/estimate/pricing.js'
import { header, isRateLimited, sendJson } from './_lib/roof/http.js'
import { mailFromEnv, pricingFromEnv, rangeOf } from './_lib/lawn/config.js'
import { LawnError, handleLawn, sendLawnError } from './_lib/lawn/http.js'
import { locate } from './_lib/lawn/lookup.js'

export const config = { maxDuration: 15 }

const RESEND_ENDPOINT = 'https://api.resend.com/emails'
const MAX_BYTES = 12_000
/** A household sends one, maybe two; this stops the form being used as a relay. */
const RATE_LIMIT = 6
const RATE_WINDOW_S = 3600

const LABELS = {
  frequency: { weekly: 'Weekly', biweekly: 'Every two weeks', once: 'One-time mow' } satisfies Record<Frequency, string>,
  timing: { asap: 'As soon as possible', week: 'Within a week or two', flexible: 'Flexible' } satisfies Record<Timing, string>,
  contact: { text: 'Text', call: 'Call', email: 'Email' } satisfies Record<ContactMethod, string>,
  extras: {
    shrubs: 'Shrub trimming', leaves: 'Leaf removal', limbs: 'Tree limb removal', seeding: 'Seeding',
    fertilizing: 'Fertilizing', weeds: 'Weed pulling', cleanup: 'Porch & driveway blow-off',
  } satisfies Record<Extra, string>,
}

async function readBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  if (!/^application\/json(?:\s*;|$)/i.test(header(req, 'content-type') ?? '')) throw new LawnError('invalid')
  const parsed = (req as IncomingMessage & { body?: unknown }).body
  let raw: string
  if (parsed !== undefined) {
    raw = Buffer.isBuffer(parsed) ? parsed.toString('utf8') : typeof parsed === 'string' ? parsed : JSON.stringify(parsed)
  } else {
    const chunks: Buffer[] = []
    let bytes = 0
    for await (const chunk of req) {
      const value = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
      bytes += value.length
      if (bytes > MAX_BYTES) throw new LawnError('invalid')
      chunks.push(value)
    }
    raw = Buffer.concat(chunks).toString('utf8')
  }
  if (Buffer.byteLength(raw) > MAX_BYTES) throw new LawnError('invalid')
  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    throw new LawnError('invalid')
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new LawnError('invalid')
  return value as Record<string, unknown>
}

/** Single-line text: collapsed so a newline can't forge another labelled line in the email. */
function line(value: unknown, max: number, required = true): string {
  const cleaned = typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : ''
  if ((required && !cleaned) || cleaned.length > max) throw new LawnError('invalid')
  return cleaned
}

function choice<T extends string>(value: unknown, options: readonly T[]): T {
  if (typeof value !== 'string' || !(options as readonly string[]).includes(value)) throw new LawnError('invalid')
  return value as T
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  await handleLawn(res, 'lawn-request', async () => {
    if (req.method !== 'POST') return sendLawnError(res, 'invalid')
    const body = await readBody(req)

    // Honeypot: answer like a success so a bot has nothing to retry against.
    if (typeof body.company === 'string' && body.company.trim()) return sendJson(res, { ok: true, price: { low: 0, high: 0 } })

    const name = line(body.name, 120)
    const phone = line(body.phone, 40)
    const email = line(body.email, 200)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || phone.replace(/\D/g, '').length < 10) throw new LawnError('invalid')
    const contact = choice(body.contact, CONTACT_METHODS)
    const frequency = choice(body.frequency, FREQUENCIES)
    const timing = choice(body.timing, TIMINGS)
    const extras = Array.isArray(body.extras) ? [...new Set(body.extras.map((extra) => choice(extra, EXTRAS)))] : []
    const notes = typeof body.notes === 'string' ? body.notes.trim().slice(0, 2000) : ''
    const lawnSqFt = Math.round(Number(body.lawnSqFt))
    if (!Number.isFinite(lawnSqFt) || lawnSqFt < MIN_LAWN_SQFT || lawnSqFt > MAX_LAWN_SQFT) throw new LawnError('invalid')

    const id = typeof body.id === 'string' && body.id.length <= 1200 ? body.id : null
    const address = id ? null : line(body.address, 200)
    if (await isRateLimited(req, 'lawn-request', RATE_LIMIT, RATE_WINDOW_S)) return sendLawnError(res, 'rate_limited')

    const place = await locate(id ? { kind: 'suggestion', id } : { kind: 'address', address: address as string })
    const range = rangeOf(place.location)
    if (range && !range.inRange) return sendLawnError(res, 'out_of_range', range)

    const { low, high } = visitPrice(lawnSqFt, frequency, pricingFromEnv())
    const mail = mailFromEnv()
    if (!mail) return sendLawnError(res, 'not_configured')

    const text = [
      `Name: ${name}`,
      `Phone: ${phone}`,
      `Email: ${email}`,
      `Prefers: ${LABELS.contact[contact]}`,
      '',
      `Address: ${place.formatted}`,
      ...(range ? [`Distance: ${range.miles} miles (service radius ${range.radiusMiles})`] : []),
      `Lawn: about ${lawnSqFt.toLocaleString('en-US')} sq ft (measured from aerial imagery; confirm on site)`,
      `Mowing: ${LABELS.frequency[frequency]}, estimated $${low}–$${high} per visit`,
      `Also interested in: ${extras.length ? extras.map((extra) => LABELS.extras[extra]).join(', ') : 'Nothing else'}`,
      `Start: ${LABELS.timing[timing]}`,
      ...(notes ? ['', 'Notes:', notes] : []),
      '',
    ].join('\n')

    let response: Response
    try {
      response = await fetch(RESEND_ENDPOINT, {
        method: 'POST',
        headers: { authorization: `Bearer ${mail.apiKey}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          from: mail.from,
          to: [mail.to],
          reply_to: email,
          subject: `Lawn request: ${name}, ${place.formatted.split(',')[0]}`,
          text,
        }),
        signal: AbortSignal.timeout(8000),
      })
    } catch {
      return sendLawnError(res, 'send_failed')
    }
    if (!response.ok) return sendLawnError(res, 'send_failed')
    sendJson(res, { ok: true, price: { low, high } })
  })
}
