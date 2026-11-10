import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { DemoError } from './demo-access.js'
import { ownerEmail, hash } from './portal-auth.js'
import { getValue, redis } from './portal-store.js'
import { aiConsultation } from '../../src/content/aiConsultation.js'

export const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events.readonly'
const CONNECTION = 'booking:calendar'
type Sealed = { iv: string; tag: string; ciphertext: string }
export type CalendarConnection = { id: string; owner: string; calendarId: string; clientHash: string; refreshToken: Sealed; connectedAt: string }
export type CalendarEvent = { id?: string; status?: string; summary?: string; created?: string; organizer?: { self?: boolean; email?: string }; start?: { dateTime?: string }; end?: { dateTime?: string }; attendees?: { email?: string; responseStatus?: string }[] }
let cachedAccess: { id: string; token: string; expires: number } | undefined

export function calendarConfiguration() {
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID?.trim()
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET?.trim()
  const key = process.env.GOOGLE_CALENDAR_TOKEN_KEY?.trim()
  const calendarId = process.env.GOOGLE_CALENDAR_ID?.trim() || 'primary'
  const bookingTitle = process.env.GOOGLE_CALENDAR_BOOKING_TITLE?.trim() || 'Wallace Shift - Project Consultation'
  if (!clientId || !clientSecret || !key || !/^[a-fA-F0-9]{64}$/.test(key) || calendarId.length > 254 || bookingTitle.length > 200) throw new DemoError('calendar_not_configured', 503)
  return { clientId, clientSecret, key: Buffer.from(key, 'hex'), calendarId, bookingTitle, owner: ownerEmail() }
}
function seal(value: string): Sealed {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', calendarConfiguration().key, iv)
  cipher.setAAD(Buffer.from('wallace-calendar-refresh-v1'))
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  return { iv: iv.toString('hex'), tag: cipher.getAuthTag().toString('hex'), ciphertext: ciphertext.toString('hex') }
}
function unseal(value: Sealed): string {
  const decipher = createDecipheriv('aes-256-gcm', calendarConfiguration().key, Buffer.from(value.iv, 'hex'))
  decipher.setAAD(Buffer.from('wallace-calendar-refresh-v1'))
  decipher.setAuthTag(Buffer.from(value.tag, 'hex'))
  return Buffer.concat([decipher.update(Buffer.from(value.ciphertext, 'hex')), decipher.final()]).toString('utf8')
}
export async function calendarConnection(): Promise<CalendarConnection | null> {
  const config = calendarConfiguration()
  const connection = await getValue<CalendarConnection>(CONNECTION)
  if (!connection || connection.owner !== config.owner || connection.calendarId !== config.calendarId || connection.clientHash !== hash(config.clientId)) return null
  try { if (!unseal(connection.refreshToken)) return null } catch { return null }
  return connection
}
async function tokenRequest(params: Record<string, string>) {
  let response: Response
  try {
    response = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(params).toString(), signal: AbortSignal.timeout(10000) })
  } catch { throw new DemoError('calendar_unavailable', 503) }
  const token = await response.json() as { access_token?: string; refresh_token?: string; expires_in?: number; scope?: string; error?: string }
  if (!response.ok || typeof token.access_token !== 'string' || !token.access_token) throw new DemoError(token.error === 'invalid_grant' ? 'calendar_reconnect_required' : 'calendar_unavailable', 503)
  if (token.scope && !token.scope.split(' ').includes(CALENDAR_SCOPE)) throw new DemoError('calendar_scope_required', 503)
  return token
}
async function calendarPage(accessToken: string, calendarId: string, params: URLSearchParams): Promise<{ items?: CalendarEvent[]; nextPageToken?: string }> {
  let response: Response
  try {
    response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`, { headers: { authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(10000) })
  } catch { throw new DemoError('calendar_unavailable', 503) }
  if (!response.ok) throw new DemoError(response.status === 401 || response.status === 403 ? 'calendar_reconnect_required' : 'calendar_unavailable', 503)
  return await response.json() as { items?: CalendarEvent[]; nextPageToken?: string }
}
export async function connectCalendar(code: string, redirectUri: string): Promise<void> {
  const config = calendarConfiguration()
  const token = await tokenRequest({ code, client_id: config.clientId, client_secret: config.clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code' })
  // Prove the chosen calendar can be read with the granted scope before saving it.
  await calendarPage(token.access_token!, config.calendarId, new URLSearchParams({ maxResults: '1', timeMin: new Date().toISOString(), fields: 'items(id)' }))
  // A fresh grant may use a different Google account. Never pair its access
  // token with a refresh token from a previous account's primary calendar.
  const refresh = token.refresh_token
  if (!refresh) throw new DemoError('calendar_refresh_required', 503)
  const connection: CalendarConnection = { id: randomBytes(16).toString('hex'), owner: config.owner, calendarId: config.calendarId, clientHash: hash(config.clientId), refreshToken: seal(refresh), connectedAt: new Date().toISOString() }
  await redis(['SET', `portal:${CONNECTION}`, JSON.stringify(connection)])
  cachedAccess = { id: connection.id, token: token.access_token!, expires: Date.now() + Math.min(Number(token.expires_in) || 3600, 3600) * 1000 - 60000 }
}
async function accessToken(connection: CalendarConnection): Promise<string> {
  if (cachedAccess?.id === connection.id && cachedAccess.expires > Date.now()) return cachedAccess.token
  const config = calendarConfiguration()
  const token = await tokenRequest({ client_id: config.clientId, client_secret: config.clientSecret, refresh_token: unseal(connection.refreshToken), grant_type: 'refresh_token' })
  cachedAccess = { id: connection.id, token: token.access_token!, expires: Date.now() + Math.min(Number(token.expires_in) || 3600, 3600) * 1000 - 60000 }
  return cachedAccess.token
}
export function isMatchingBooking(event: CalendarEvent, email: string, intentStartedAt: number, now = Date.now()): boolean {
  const title = calendarConfiguration().bookingTitle
  const summary = event.summary ?? ''
  const titleMatches = summary === title || [' (', ' - ', ' – ', ': '].some(separator => summary.startsWith(`${title}${separator}`))
  const start = Date.parse(event.start?.dateTime ?? '')
  const end = Date.parse(event.end?.dateTime ?? '')
  const created = Date.parse(event.created ?? '')
  const organizerEmail = event.organizer?.email?.trim() ?? ''
  return Boolean(event.id && event.status === 'confirmed' && event.organizer?.self === true && organizerEmail.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(organizerEmail) && titleMatches && start > now && end - start === aiConsultation.durationMinutes * 60000 && created >= intentStartedAt - 5 * 60000 && created <= now + 60000 && event.attendees?.some(attendee => attendee.email?.trim().toLowerCase() === email && ['accepted', 'tentative', 'needsAction'].includes(attendee.responseStatus ?? '')))
}
export async function findBooking(connection: CalendarConnection, email: string, startedAt: number): Promise<CalendarEvent | null> {
  try {
    const deadline = Date.now() + 35000
    const token = await accessToken(connection)
    const params = new URLSearchParams({ timeMin: new Date().toISOString(), singleEvents: 'true', showDeleted: 'false', orderBy: 'startTime', maxResults: '2500', q: email, fields: 'nextPageToken,items(id,status,summary,created,start(dateTime),end(dateTime),organizer(self,email),attendees(email,responseStatus))' })
    const matches: CalendarEvent[] = []
    for (let page = 0; page < 10; page++) {
      if (Date.now() > deadline) throw new DemoError('calendar_unavailable', 503)
      const result = await calendarPage(token, connection.calendarId, params)
      if (!Array.isArray(result.items) && result.items !== undefined) throw new DemoError('calendar_unavailable', 503)
      for (const event of result.items ?? []) if (isMatchingBooking(event, email, startedAt)) matches.push(event)
      if (matches.length > 1) return null
      if (!result.nextPageToken) return matches[0] ?? null
      params.set('pageToken', result.nextPageToken)
    }
    // An incomplete result set cannot establish that the booking is unambiguous.
    throw new DemoError('calendar_unavailable', 503)
  } catch (error) {
    if (error instanceof DemoError && error.code === 'calendar_reconnect_required') {
      cachedAccess = undefined
      // Do not invalidate a newer grant connected while this check was running.
      await redis(['EVAL', `-- ai-booking:disconnect
local raw = redis.call('GET', KEYS[1])
if raw and cjson.decode(raw).id == ARGV[1] then redis.call('DEL', KEYS[1]) end
return 1`, 1, `portal:${CONNECTION}`, connection.id])
    }
    throw error
  }
}
