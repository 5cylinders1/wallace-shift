import type { IncomingMessage, ServerResponse } from 'node:http'
import { timingSafeEqual } from 'node:crypto'
import { DemoError, demoJson, nodeDemoOrigin, nodeHeader } from './demo-access.js'
import { identity, login, type Identity } from './portal-auth.js'
import { allEngagements, audit, getValue, mutateLedger, setValue } from './portal-store.js'
import { accessible, changeLedger, draft, field, generateDueInvoices } from './portal-ledger.js'
import { charge, finishSetup, handleStripeEvent, quote, refreshPayments, resetFailedPayment, setupCard } from './portal-stripe.js'
import { paymentConsent } from '../../src/client-portal/model.js'
import type { Engagement } from '../../src/client-portal/model.js'

export const config = { maxDuration: 60, api: { bodyParser: false } }
async function rawBody(req: IncomingMessage, requireRaw = false): Promise<string> {
  const parsed = (req as IncomingMessage & { body?: unknown }).body
  if (parsed !== undefined) {
    if (Buffer.isBuffer(parsed) || typeof parsed === 'string' || !requireRaw) {
      const raw = Buffer.isBuffer(parsed) ? parsed.toString('utf8') : typeof parsed === 'string' ? parsed : JSON.stringify(parsed)
      if (typeof raw !== 'string') throw new DemoError('invalid_fields', 400)
      if (Buffer.byteLength(raw) > 65536) throw new DemoError('too_large', 413)
      return raw
    }
    // Vercel's Node helpers expose parsed req.body AND restore the original
    // bytes through data/end events. Never reconstruct a signed webhook from JSON.
    if (typeof req.on !== 'function') throw new DemoError('raw_body_required', 400)
  }
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []; let size = 0; let settled = false
    const finish = (error?: Error) => {
      if (settled) return
      settled = true; clearTimeout(timer)
      if (error) reject(error)
      else resolve(Buffer.concat(chunks).toString('utf8'))
    }
    const timer = setTimeout(() => finish(new DemoError('invalid_fields', 408)), 10000)
    req.on('data', (chunk: Buffer | string) => {
      if (settled) return
      const buffer = Buffer.from(chunk); size += buffer.length
      if (size > 65536) { finish(new DemoError('too_large', 413)); return }
      chunks.push(buffer)
    })
    req.on('end', () => finish())
    req.on('error', () => finish(new DemoError('invalid_fields', 400)))
    req.on('aborted', () => finish(new DemoError('invalid_fields', 400)))
  })
}
function clientView(e: Engagement, who: Identity): unknown {
  if (who.admin) return e
  const view = structuredClone(e)
  delete view.stripeCustomer; delete view.paymentMethod; delete view.setup
  view.invoices.forEach(invoice => { delete invoice.attempt })
  return { ...view, hasCard: Boolean(e.paymentMethod) }
}
async function runBilling(origin: string): Promise<{ generated: number; attempted: number; failed: string[] }> {
  const generated = await mutateLedger(entries => generateDueInvoices(entries, new Date().toISOString().slice(0, 10)))
  const entries = await allEngagements(); const failed: string[] = []; let attempted = 0
  // Round-robin continuation prevents a slow processor or blocked record starving later clients.
  const started = Date.now()
  const cursor = await getValue<string>('billing-cursor') ?? ''
  const due = entries.filter(v => v.state === 'issued' && v.autopay?.enabled && v.invoices.some(i => i.status === 'open' && !i.attempt && i.due <= new Date().toISOString().slice(0, 10))).sort((a, b) => a.id.localeCompare(b.id))
  const ordered = [...due.filter(e => e.id > cursor), ...due.filter(e => e.id <= cursor)]
  for (const e of ordered) {
    if (Date.now() - started > 28000) break
    const invoice = e.invoices.find(i => i.status === 'open' && !i.attempt && i.due <= new Date().toISOString().slice(0, 10))!
    try { await charge(e, invoice, origin, true); attempted++ } catch { failed.push(e.id) }
    await setValue('billing-cursor', e.id, 7 * 86400)
  }
  return { generated, attempted, failed }
}
export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    const url = new URL(req.url ?? '/', 'http://local.invalid')
    if (url.searchParams.get('action') === 'webhook') {
      if (req.method !== 'POST') throw new DemoError('method_not_allowed', 405)
      await handleStripeEvent(await rawBody(req, true), nodeHeader(req, 'stripe-signature') ?? '')
      demoJson(res, 200, { ok: true }); return
    }
    const origin = nodeDemoOrigin(req)
    if (url.searchParams.get('action') === 'cron') {
      if (req.method !== 'GET') throw new DemoError('method_not_allowed', 405)
      const expected = Buffer.from(`Bearer ${process.env.CRON_SECRET ?? ''}`); const actual = Buffer.from(nodeHeader(req, 'authorization') ?? '')
      if (!process.env.CRON_SECRET || actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new DemoError('forbidden', 403)
      const result = await runBilling(origin)
      demoJson(res, result.failed.length ? 503 : 200, { ok: !result.failed.length, ...result }); return
    }
    if (req.method !== 'POST' && req.method !== 'GET') throw new DemoError('method_not_allowed', 405)
    if (req.method === 'POST' && (nodeHeader(req, 'origin') !== origin || nodeHeader(req, 'sec-fetch-site') === 'cross-site' || !nodeHeader(req, 'content-type')?.startsWith('application/json'))) throw new DemoError('forbidden', 403)
    const body = req.method === 'POST' ? JSON.parse(await rawBody(req)) as Record<string, unknown> : {}
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new DemoError('invalid_fields', 400)
    if (['send-code', 'verify-code', 'logout'].includes(String(body.action))) {
      await login(req, res, origin, body); demoJson(res, 200, { ok: true }); return
    }
    const who = await identity(req)
    if (req.method === 'GET') {
      if (!who) { demoJson(res, 200, { ok: true, authenticated: false }); return }
      const entries = (await allEngagements()).filter(e => who.admin || (e.email === who.email && e.state !== 'draft'))
      demoJson(res, 200, { ok: true, authenticated: true, ...who, engagements: entries.map(e => clientView(e, who)),
        stripeReady: Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PUBLISHABLE_KEY && process.env.STRIPE_WEBHOOK_SECRET),
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY ?? '',
        instructions: { cash: process.env.PORTAL_CASH_INSTRUCTIONS ?? '', check: process.env.PORTAL_CHECK_INSTRUCTIONS ?? '', zelle: process.env.PORTAL_ZELLE_INSTRUCTIONS ?? '' },
      }); return
    }
    if (!who) throw new DemoError('access_required', 401)
    if (body.action === 'create' && who.admin) {
      const e = draft(body, who.email)
      await mutateLedger(entries => { entries.push(e) })
      demoJson(res, 200, { ok: true, id: e.id }); return
    }
    if (body.action === 'run-billing' && who.admin) { demoJson(res, 200, { ok: true, ...await runBilling(origin) }); return }
    const e = accessible(await allEngagements(), body.id, who)
    if (['setup-card', 'finish-setup', 'quote', 'pay', 'authorize', 'reset-payment'].includes(String(body.action)) && who.admin) throw new DemoError('client_authorization_required', 403)
    if (body.action === 'setup-card') { demoJson(res, 200, { ok: true, url: await setupCard(e, origin) }); return }
    if (body.action === 'finish-setup') { await finishSetup(e, field(body.sessionId)); demoJson(res, 200, { ok: true }); return }
    if (body.action === 'quote') { demoJson(res, 200, { ok: true, quote: await quote(e) }); return }
    if (body.action === 'refresh') { await refreshPayments(e); demoJson(res, 200, { ok: true }); return }
    if (body.action === 'reset-payment') {
      const invoice = e.invoices.find(i => i.id === body.invoiceId)
      if (!invoice) throw new DemoError('not_found', 404)
      await resetFailedPayment(e, invoice); demoJson(res, 200, { ok: true }); return
    }
    if (body.action === 'pay' || body.action === 'authorize') {
      if (body.consent !== true || !e.signature || !['issued', 'canceled'].includes(e.state)) throw new DemoError('authorization_required', 409)
      const quoted = await quote(e)
      if (body.total !== quoted.total) throw new DemoError('quote_changed', 409)
      const automatic = e.cadence !== 'once' && e.state === 'issued'
      const invoice = e.invoices.find(i => i.id === body.invoiceId)
      const scheduleOnly = body.action === 'authorize' && automatic && !e.invoices.some(i => i.status === 'open' || i.status === 'processing') && e.nextDue && (!e.endDate || e.nextDue <= e.endDate)
      if (!scheduleOnly && (!invoice || !['open', 'processing'].includes(invoice.status))) throw new DemoError('invoice_not_open', 409)
      if (automatic) await mutateLedger(entries => {
        const current = accessible(entries, e.id, who)
        if (current.state !== 'issued' || current.paymentMethod !== e.paymentMethod) throw new DemoError('conflict_retry', 409)
        current.autopay = { enabled: true, at: new Date().toISOString(), feeBps: quoted.bps, consent: paymentConsent(e.amount, quoted.fee, e.cadence, true) }
        audit(current, who.email, 'Automatic payment authorization recorded')
      })
      if (scheduleOnly || (automatic && invoice!.due > new Date().toISOString().slice(0, 10))) { demoJson(res, 200, { ok: true, scheduled: true }); return }
      const intent = await charge(e, invoice!, origin, automatic, quoted.fee)
      demoJson(res, 200, { ok: true, status: intent.status, ...(intent.status === 'requires_action' ? { clientSecret: intent.client_secret } : {}) }); return
    }
    if (body.action === 'report-payment') {
      const instructions = { cash: process.env.PORTAL_CASH_INSTRUCTIONS, check: process.env.PORTAL_CHECK_INSTRUCTIONS, zelle: process.env.PORTAL_ZELLE_INSTRUCTIONS }
      if (!instructions[body.method as keyof typeof instructions]) throw new DemoError('payment_instructions_required', 409)
    }
    await mutateLedger(entries => changeLedger(entries, body, who))
    demoJson(res, 200, { ok: true })
  } catch (error) {
    const failure = error instanceof DemoError ? error : new DemoError(error instanceof SyntaxError ? 'invalid_fields' : 'temporarily_unavailable', error instanceof SyntaxError ? 400 : 503)
    demoJson(res, failure.status, { ok: false, error: failure.code })
  }
}
