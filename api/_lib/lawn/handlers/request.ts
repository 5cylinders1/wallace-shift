/**
 * Consultation requests from the yard planner.
 *
 *   POST /api/lawn-request   ServiceRequestBody (src/demos/lawn/estimate/types.ts)
 *   → { ok: true } or { ok: false, error }
 *
 * The address is resolved again here, so the email carries the geocoder's
 * address rather than whatever the page sent. The measured lawn size rides
 * along as context only; nothing is priced. Until Resend and the destination
 * inbox are configured (api/_lib/lawn/config.ts) the answer is
 * `not_configured` and the page says so: nothing is ever reported as sent
 * that wasn't.
 */

import type { IncomingMessage, ServerResponse } from 'node:http'
import {
  CONTACT_METHODS, PROJECTS, TIMINGS,
  type ContactMethod, type Project, type Timing,
} from '../../../../src/demos/lawn/estimate/types.js'
import { MAX_LAWN_SQFT, MIN_LAWN_SQFT } from '../../../../src/demos/lawn/estimate/area.js'
import { header, isRateLimited, sendJson } from '../../roof/http.js'
import { mailFromEnv } from '../config.js'
import { LawnError, handleLawn, sendLawnError } from '../http.js'
import { locate } from '../lookup.js'

const RESEND_ENDPOINT = 'https://api.resend.com/emails'
const MAX_BYTES = 12_000
/** A household sends one, maybe two; this stops the form being used as a relay. */
const RATE_LIMIT = 6
const RATE_WINDOW_S = 3600

const LABELS = {
  timing: { season: 'This season', months: 'In the next few months', planning: 'Just planning ahead' } satisfies Record<Timing, string>,
  contact: { text: 'Text', call: 'Call', email: 'Email' } satisfies Record<ContactMethod, string>,
  projects: {
    patio: 'Patio', walls: 'Retaining wall or steps', kitchen: 'Outdoor kitchen', fire: 'Fire pit or fireplace',
    planting: 'Trees, shrubs & perennials', lighting: 'Landscape lighting', drainage: 'Drainage', sprinklers: 'Sprinkler system',
  } satisfies Record<Project, string>,
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
    if (typeof body.company === 'string' && body.company.trim()) return sendJson(res, { ok: true })

    const name = line(body.name, 120)
    const phone = line(body.phone, 40)
    const email = line(body.email, 200)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || phone.replace(/\D/g, '').length < 10) throw new LawnError('invalid')
    const contact = choice(body.contact, CONTACT_METHODS)
    const timing = choice(body.timing, TIMINGS)
    const projects = Array.isArray(body.projects) ? [...new Set(body.projects.map((project) => choice(project, PROJECTS)))] : []
    const notes = typeof body.notes === 'string' ? body.notes.trim().slice(0, 2000) : ''
    if (!projects.length && !notes) throw new LawnError('invalid')
    let lawnSqFt: number | null = null
    if (body.lawnSqFt !== null && body.lawnSqFt !== undefined) {
      lawnSqFt = Math.round(Number(body.lawnSqFt))
      if (!Number.isFinite(lawnSqFt) || lawnSqFt < MIN_LAWN_SQFT || lawnSqFt > MAX_LAWN_SQFT) throw new LawnError('invalid')
    }

    const id = typeof body.id === 'string' && body.id.length <= 1200 ? body.id : null
    const address = id ? null : line(body.address, 200)
    if (await isRateLimited(req, 'lawn-request', RATE_LIMIT, RATE_WINDOW_S)) return sendLawnError(res, 'rate_limited')

    const place = await locate(id ? { kind: 'suggestion', id } : { kind: 'address', address: address as string })
    const mail = mailFromEnv()
    if (!mail) return sendLawnError(res, 'not_configured')

    const text = [
      `Name: ${name}`,
      `Phone: ${phone}`,
      `Email: ${email}`,
      `Prefers: ${LABELS.contact[contact]}`,
      '',
      `Address: ${place.formatted}`,
      `Planning: ${projects.length ? projects.map((project) => LABELS.projects[project]).join(', ') : 'See notes'}`,
      `Timing: ${LABELS.timing[timing]}`,
      ...(lawnSqFt ? [`Lawn: about ${lawnSqFt.toLocaleString('en-US')} sq ft (measured from aerial imagery; confirm on site)`] : []),
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
          subject: `Consultation request: ${name}, ${place.formatted.split(',')[0]}`,
          text,
        }),
        signal: AbortSignal.timeout(8000),
      })
    } catch {
      return sendLawnError(res, 'send_failed')
    }
    if (!response.ok) return sendLawnError(res, 'send_failed')
    sendJson(res, { ok: true })
  })
}
