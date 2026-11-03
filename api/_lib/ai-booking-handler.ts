import { randomBytes, randomInt } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { DemoError, demoCookie, demoJson, nodeDemoOrigin, nodeHeader, readDemoCookie } from './demo-access.js'
import { demoAgreementStore, reserveVerificationCode } from './demo-agreement-store.js'
import { readOpportunityBody, validateOpportunity } from './ai-opportunity-validation.js'
import { hash, identity } from './portal-auth.js'
import { getValue, redis, setValue } from './portal-store.js'
import { CALENDAR_SCOPE, calendarConfiguration, calendarConnection, connectCalendar, findBooking, type CalendarConnection } from './ai-booking-calendar.js'
import { aiOffer, isAiBookingQualified, routeAiOpportunity, type AiQualificationAnswers } from '../../src/content/aiOffer.js'

export const config = { maxDuration: 60, api: { bodyParser: false } }
const PENDING = 'wallace_booking_pending'
const SESSION = 'wallace_booking_session'
const OAUTH = 'wallace_calendar_state'
const TTL = 600
const SESSION_TTL = 8 * 3600
const answerFields = ['businessType', 'workflows', 'workflowDetails', 'currentTools', 'weeklyHours', 'impacts', 'role', 'approverAvailability', 'revenue', 'aiExperience', 'aiBarriers', 'budget', 'timing'] as const
type Intent = { attemptId: string; email: string; name: string; answers: AiQualificationAnswers; startedAt: number }
type Challenge = { nonce: string; recipientHash: string; exp: number; intent: Intent }
type BookingSession = { intent: Intent; expiresAt: number }
type OAuthState = { owner: string; sessionHash: string; expiresAt: number }
type BookingRecord = { id: string; email: string; name: string; start: string; end: string; method: 'google_meet'; answers: AiQualificationAnswers; verifiedAt: string; googleEventId: string; attemptId: string }
const pendingKey = (nonce: string) => `booking:pending:${hash(nonce)}`
const proofKey = (nonce: string) => `booking:proof:${hash(nonce)}`
const validAttempt = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)

async function requireOwner(req: IncomingMessage) {
  const who = await identity(req)
  if (!who?.admin) throw new DemoError('forbidden', 403)
  return who
}
async function readyConnection(): Promise<CalendarConnection | null> {
  try {
    demoAgreementStore()
    const from = process.env.CONTACT_FROM_EMAIL?.trim()
    if (!process.env.RESEND_API_KEY?.trim() || !from || /[\r\n]/.test(from)) return null
    return await calendarConnection()
  } catch (error) {
    if (error instanceof DemoError && ['calendar_not_configured', 'portal_not_configured', 'not_configured'].includes(error.code)) return null
    throw error
  }
}
function validateIntent(body: Record<string, unknown>): Intent {
  if (Object.keys(body).some(key => !['action', 'attemptId', 'email', 'name', 'answers', 'company'].includes(key)) || !validAttempt(body.attemptId) || body.company !== '') throw new DemoError('invalid', 400)
  if (!body.answers || typeof body.answers !== 'object' || Array.isArray(body.answers) || Object.keys(body.answers).some(key => !(answerFields as readonly string[]).includes(key))) throw new DemoError('invalid', 400)
  const answers = body.answers as AiQualificationAnswers
  let offerApplies: boolean
  try { offerApplies = routeAiOpportunity(answers) !== 'resource' } catch { throw new DemoError('invalid', 400) }
  // Reuse the strict quiz schema. These temporary contact values are not saved as an application.
  const { application } = validateOpportunity({ ...answers, submissionId: body.attemptId, offerVersion: aiOffer.version, name: body.name === undefined || body.name === '' ? 'Booking visitor' : body.name, businessName: 'Booking consultation', email: body.email, website: '', nextStep: 'consultation', packageId: '', contactMethod: 'email', phone: '', offerAcknowledged: offerApplies, contactConsent: true, company: '' })
  if (!isAiBookingQualified(application)) throw new DemoError('not_qualified', 400)
  return { attemptId: body.attemptId, email: application.email, name: body.name ? application.name : '', answers: Object.fromEntries(answerFields.map(key => [key, application[key]])) as AiQualificationAnswers, startedAt: Date.now() }
}
const LIMIT = `-- ai-booking:limit
if tonumber(redis.call('GET', KEYS[1]) or '0') >= 8 then return 0 end
redis.call('INCR', KEYS[1])
redis.call('EXPIRE', KEYS[1], 3600, 'NX')
return 1`
async function limitSend(req: IncomingMessage): Promise<void> {
  const ip = process.env.VERCEL === '1' ? nodeHeader(req, 'x-vercel-forwarded-for') : req.socket?.remoteAddress
  if (!ip || !/^[\da-fA-F:.]+$/.test(ip)) throw new DemoError('forbidden', 403)
  if (await redis(['EVAL', LIMIT, 1, `ai-booking:ip:${hash(ip)}:${Math.floor(Date.now() / 3_600_000)}`]) !== 1) throw new DemoError('rate_limited', 429)
}
const VERIFY = `-- ai-booking:verify
local pendingRaw = redis.call('GET', KEYS[2])
if not pendingRaw then return 'code_expired' end
local pending = cjson.decode(pendingRaw)
if pending.exp <= tonumber(ARGV[2]) then return 'code_expired' end
local verified = redis.call('GET', KEYS[3])
if verified then
  if verified == ARGV[1] then return 'ok' end
  return 'code_invalid'
end
local raw = redis.call('GET', KEYS[1])
if not raw then return 'code_expired' end
local code = cjson.decode(raw)
if code.expiresAt <= tonumber(ARGV[2]) then return 'code_expired' end
if code.recipientHash ~= pending.recipientHash or code.email ~= pending.intent.email then return 'code_invalid' end
if code.attempts >= 5 then return 'rate_limited' end
code.attempts = code.attempts + 1
if code.codeHash ~= ARGV[1] then
  redis.call('SET', KEYS[1], cjson.encode(code), 'KEEPTTL')
  return 'code_invalid'
end
redis.call('SET', KEYS[3], ARGV[1], 'EX', pending.exp - tonumber(ARGV[2]))
redis.call('DEL', KEYS[1])
return 'ok'`
const CONSUME_STATE = `-- ai-booking:oauth-state
local raw = redis.call('GET', KEYS[1])
if not raw then return 0 end
local state = cjson.decode(raw)
if state.owner ~= ARGV[1] or state.sessionHash ~= ARGV[2] or state.expiresAt <= tonumber(ARGV[3]) then return 0 end
redis.call('DEL', KEYS[1])
return 1`
const SAVE_BOOKING = `-- ai-booking:save
redis.call('SET', KEYS[1], ARGV[1], 'NX')
redis.call('ZADD', KEYS[2], 'NX', ARGV[2], ARGV[3])
return 1`

async function status(req: IncomingMessage, res: ServerResponse, attemptId: string | null): Promise<void> {
  const connection = await readyConnection()
  const token = readDemoCookie(nodeHeader(req, 'cookie'), SESSION)
  const session = validAttempt(attemptId) && /^[a-f0-9]{64}$/.test(token) ? await getValue<BookingSession>(`booking:session:${hash(token)}`) : null
  if (!session || session.expiresAt <= Date.now() || session.intent.attemptId !== attemptId) {
    demoJson(res, 200, { ok: true, status: 'unverified', configured: Boolean(connection) }); return
  }
  if (!connection) { demoJson(res, 200, { ok: true, status: 'waiting', configured: false }); return }
  // A retry of the same verified code may create a new cookie. Share the poll
  // budget across those cookies and tabs rather than allowing duplicate reads.
  const cacheKey = `booking:status:${hash(`${session.intent.attemptId}:${session.intent.email}`)}:${connection.id}`
  const cached = await getValue<{ checkedAt: number; status: 'confirmed' | 'waiting' }>(cacheKey)
  if (cached && cached.checkedAt > Date.now() - 8000) { demoJson(res, 200, { ok: true, status: cached.status, configured: true }); return }
  // A short distributed lock bounds provider polling across tabs and concurrent requests.
  if (await redis(['SET', `portal:${cacheKey}:lock`, '1', 'EX', 8, 'NX']) !== 'OK') {
    demoJson(res, 200, { ok: true, status: 'waiting', configured: true }); return
  }
  const event = await findBooking(connection, session.intent.email, session.intent.startedAt)
  if (event) {
    // The OAuth grant changes on reconnect. The event's organizer identifies
    // the actual calendar even when the configured calendar ID is "primary".
    const id = hash(JSON.stringify([connection.owner, connection.calendarId, event.organizer!.email!.trim().toLowerCase(), event.id]))
    const record: BookingRecord = { id, email: session.intent.email, name: session.intent.name, start: event.start!.dateTime!, end: event.end!.dateTime!, method: 'google_meet', answers: session.intent.answers, verifiedAt: new Date().toISOString(), googleEventId: event.id!, attemptId: session.intent.attemptId }
    await redis(['EVAL', SAVE_BOOKING, 2, `portal:booking:record:${id}`, 'portal:booking:records', JSON.stringify(record), Date.now(), id])
  }
  const result = event ? 'confirmed' : 'waiting'
  await setValue(cacheKey, { checkedAt: Date.now(), status: result }, 8)
  demoJson(res, 200, { ok: true, status: result, configured: true })
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  let callback = false
  let origin = ''
  try {
    if (!['GET', 'POST'].includes(req.method ?? '')) { res.setHeader('allow', 'GET, POST'); throw new DemoError('method_not_allowed', 405) }
    origin = nodeDemoOrigin(req)
    const url = new URL(req.url ?? '/api/ai-booking', origin)
    if (req.method === 'GET') {
      const action = url.searchParams.get('action')
      if (action === 'connection') {
        await requireOwner(req)
        let configured = true; let connected = false; let details = {}
        try { const config = calendarConfiguration(); details = { calendarId: config.calendarId, bookingTitle: config.bookingTitle }; connected = Boolean(await calendarConnection()) }
        catch (error) { if (error instanceof DemoError && ['calendar_not_configured', 'portal_not_configured'].includes(error.code)) configured = false; else throw error }
        demoJson(res, 200, { ok: true, configured, connected, ...details }); return
      }
      if (action === 'bookings') {
        await requireOwner(req)
        const ids = await redis(['ZREVRANGE', 'portal:booking:records', 0, 99])
        if (!Array.isArray(ids)) throw new DemoError('storage_unavailable', 503)
        const records = await Promise.all(ids.map(id => getValue<BookingRecord>(`booking:record:${id}`)))
        const bookings = records.filter((item): item is BookingRecord => Boolean(item)).map(({ id, email, start, end, method, answers, verifiedAt }) => ({ id, email, start, end, method, answers, verifiedAt }))
        demoJson(res, 200, { ok: true, bookings }); return
      }
      if (action === 'oauth-callback') {
        callback = true
        const who = await requireOwner(req)
        const state = url.searchParams.get('state') ?? ''
        const cookie = readDemoCookie(nodeHeader(req, 'cookie'), OAUTH)
        if (!/^[a-f0-9]{64}$/.test(state) || state !== cookie) throw new DemoError('invalid_state', 400)
        const sessionHash = hash(readDemoCookie(nodeHeader(req, 'cookie'), 'wallace_client_session'))
        if (await redis(['EVAL', CONSUME_STATE, 1, `portal:booking:oauth:${hash(state)}`, who.email, sessionHash, Date.now()]) !== 1) throw new DemoError('invalid_state', 400)
        const code = url.searchParams.get('code')
        if (!code || code.length > 4096 || url.searchParams.has('error')) throw new DemoError('calendar_connection_cancelled', 400)
        await connectCalendar(code, `${origin}/api/ai-booking?action=oauth-callback`)
        res.setHeader('set-cookie', demoCookie(OAUTH, '', origin, 0))
        res.setHeader('location', '/client-portal?calendar=connected')
        demoJson(res, 303, { ok: true }); return
      }
      if (action && action !== 'status') throw new DemoError('invalid', 400)
      await status(req, res, url.searchParams.get('attemptId')); return
    }
    if (nodeHeader(req, 'origin') !== origin || nodeHeader(req, 'sec-fetch-site') === 'cross-site') throw new DemoError('forbidden', 403)
    const body = await readOpportunityBody(req)
    if (body.action === 'connect') {
      if (Object.keys(body).some(key => key !== 'action')) throw new DemoError('invalid', 400)
      const who = await requireOwner(req)
      const config = calendarConfiguration()
      const state = randomBytes(32).toString('hex')
      const record: OAuthState = { owner: who.email, sessionHash: hash(readDemoCookie(nodeHeader(req, 'cookie'), 'wallace_client_session')), expiresAt: Date.now() + TTL * 1000 }
      await setValue(`booking:oauth:${hash(state)}`, record, TTL)
      res.setHeader('set-cookie', demoCookie(OAUTH, state, origin, TTL))
      const params = new URLSearchParams({ client_id: config.clientId, redirect_uri: `${origin}/api/ai-booking?action=oauth-callback`, response_type: 'code', scope: CALENDAR_SCOPE, access_type: 'offline', prompt: 'consent', state })
      demoJson(res, 200, { ok: true, url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` }); return
    }
    if (!await readyConnection()) throw new DemoError('calendar_not_connected', 503)
    if (body.action === 'send-code') {
      const intent = validateIntent(body)
      await limitSend(req)
      const intentKey = `portal:booking:intent:${hash(`${intent.attemptId}:${intent.email}`)}`
      const fingerprint = hash(JSON.stringify({ email: intent.email, answers: intent.answers }))
      // Preserve the first intent time across verification resends for the same quiz.
      await redis(['SET', intentKey, JSON.stringify({ startedAt: intent.startedAt, fingerprint }), 'EX', SESSION_TTL, 'NX'])
      const raw = await redis(['GET', intentKey])
      const saved = typeof raw === 'string' ? JSON.parse(raw) as { startedAt: number; fingerprint: string } : null
      if (!saved || saved.fingerprint !== fingerprint) throw new DemoError('attempt_conflict', 409)
      intent.startedAt = saved.startedAt
      const nonce = randomBytes(32).toString('hex')
      const challenge: Challenge = { nonce, recipientHash: hash(intent.email), exp: Math.floor(Date.now() / 1000) + TTL, intent }
      const code = randomInt(0, 1_000_000).toString().padStart(6, '0')
      await reserveVerificationCode(challenge, intent.email, hash(`${nonce}:${code}`), undefined, 'ai-booking')
      await setValue(pendingKey(nonce), challenge, TTL)
      res.setHeader('set-cookie', demoCookie(PENDING, nonce, origin, TTL))
      try {
        const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'content-type': 'application/json', 'idempotency-key': `ai-booking/${nonce}` }, body: JSON.stringify({ from: process.env.CONTACT_FROM_EMAIL!.trim(), to: [intent.email], subject: 'Your Wallace Shift booking verification code', text: `Your verification code is ${code}. It expires in 10 minutes. Do not share it. Enter it to connect your quiz answers to your consultation booking. Use this email address when you book with Google. This code does not book an appointment.` }), signal: AbortSignal.timeout(10000) })
        if (!response.ok) throw new Error('Email rejected')
      } catch { throw new DemoError('email_unavailable', 503) }
      demoJson(res, 200, { ok: true }); return
    }
    if (body.action !== 'verify-code' || Object.keys(body).some(key => !['action', 'code'].includes(key)) || typeof body.code !== 'string' || !/^\d{6}$/.test(body.code)) throw new DemoError('invalid_code', 400)
    const nonce = readDemoCookie(nodeHeader(req, 'cookie'), PENDING)
    if (!/^[a-f0-9]{64}$/.test(nonce)) throw new DemoError('code_expired', 400)
    const digest = hash(`${nonce}:${body.code}`)
    const verified = await redis(['EVAL', VERIFY, 3, `ai-booking:code:${nonce}`, `portal:${pendingKey(nonce)}`, `portal:${proofKey(nonce)}`, digest, Math.floor(Date.now() / 1000)])
    if (verified !== 'ok') throw new DemoError(['code_expired', 'code_invalid', 'rate_limited'].includes(String(verified)) ? String(verified) : 'storage_unavailable', verified === 'rate_limited' ? 429 : verified === 'code_expired' || verified === 'code_invalid' ? 400 : 503)
    const pending = await getValue<Challenge>(pendingKey(nonce))
    if (!pending || await redis(['GET', `portal:${proofKey(nonce)}`]) !== digest) throw new DemoError('code_expired', 400)
    const token = randomBytes(32).toString('hex')
    await setValue(`booking:session:${hash(token)}`, { intent: pending.intent, expiresAt: Date.now() + SESSION_TTL * 1000 } satisfies BookingSession, SESSION_TTL)
    res.setHeader('set-cookie', demoCookie(SESSION, token, origin, SESSION_TTL))
    demoJson(res, 200, { ok: true })
  } catch (error) {
    const failure = error instanceof DemoError ? error : new DemoError('temporarily_unavailable', 503)
    if (callback && origin) {
      res.setHeader('set-cookie', demoCookie(OAUTH, '', origin, 0))
      res.setHeader('location', '/client-portal?calendar=error')
      demoJson(res, 303, { ok: false }); return
    }
    if (failure.status === 429) res.setHeader('retry-after', '60')
    demoJson(res, failure.status, { ok: false, error: failure.code })
  }
}
