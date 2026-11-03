import { useEffect, useState } from 'react'
import type { AiQualificationInput } from '../content/aiOffer'
import { aiQualificationFacts } from '../lib/aiQualificationSummary'

type Connection = { configured: boolean; connected: boolean; calendarId?: string; bookingTitle?: string }
type ConfirmedBooking = { id: string; email: string; start: string; end: string; method: 'google_meet'; answers: AiQualificationInput; verifiedAt: string }
type CalendarResponse = Partial<Connection> & { ok: boolean; error?: string; url?: string; bookings?: ConfirmedBooking[] }

const configuration = [
  ['GOOGLE_CALENDAR_CLIENT_ID', 'The client ID from your Google Cloud web application.'],
  ['GOOGLE_CALENDAR_CLIENT_SECRET', 'The matching client secret, stored only on the server.'],
  ['GOOGLE_CALENDAR_TOKEN_KEY', 'A persistent encryption key with 64 hexadecimal characters, used to protect the saved Google connection.'],
] as const

async function calendarRequest(action: 'connection' | 'connect' | 'bookings', signal?: AbortSignal): Promise<CalendarResponse> {
  const response = await fetch(action === 'connect' ? '/api/ai-booking' : `/api/ai-booking?action=${action}`, {
    method: action === 'connect' ? 'POST' : 'GET',
    credentials: 'same-origin',
    cache: 'no-store',
    signal,
    headers: action === 'connect' ? { 'content-type': 'application/json' } : undefined,
    body: action === 'connect' ? JSON.stringify({ action }) : undefined,
  })
  const data = await response.json() as CalendarResponse
  if (!response.ok || !data.ok) {
    if (response.status === 401 || response.status === 403) throw new Error('Sign in to the owner account again to manage Google Calendar.')
    throw new Error(action === 'bookings' ? 'We could not load the consultations. Please try again.' : 'We could not check Google Calendar. Refresh the connection status and try again.')
  }
  return data
}

export function GoogleCalendarConnection() {
  const [connection, setConnection] = useState<Connection | null>(null)
  const [busy, setBusy] = useState<'status' | 'connect' | null>('status')
  const [showBookings, setShowBookings] = useState(false)
  const [error, setError] = useState(() => new URLSearchParams(location.search).get('calendar') === 'error' ? 'Google could not finish connecting. Try connecting again, or review the server configuration.' : '')

  useEffect(() => {
    const controller = new AbortController()
    void calendarRequest('connection', controller.signal).then(data => {
      setConnection({ configured: Boolean(data.configured), connected: Boolean(data.connected), calendarId: data.calendarId, bookingTitle: data.bookingTitle })
    }).catch(reason => {
      if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'We could not load the connection status. Please try again.')
    }).finally(() => { if (!controller.signal.aborted) setBusy(null) })
    return () => controller.abort()
  }, [])

  async function refresh() {
    setBusy('status'); setError('')
    try {
      const data = await calendarRequest('connection')
      setConnection({ configured: Boolean(data.configured), connected: Boolean(data.connected), calendarId: data.calendarId, bookingTitle: data.bookingTitle })
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'We could not load the connection status. Please try again.') }
    finally { setBusy(null) }
  }

  async function connect() {
    setBusy('connect'); setError('')
    try {
      const data = await calendarRequest('connect')
      const url = new URL(data.url ?? '')
      if (url.protocol !== 'https:' || url.hostname !== 'accounts.google.com' || url.port || url.username || url.password || url.pathname !== '/o/oauth2/v2/auth') throw new Error('Google returned an unexpected connection link. Refresh the status and try again.')
      location.assign(url.href)
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'We could not open Google. Please try again.'); setBusy(null) }
  }

  return <section className="cp-calendar" aria-labelledby="cp-calendar-heading" aria-busy={busy !== null}>
    <div className="cp-calendar-heading"><h2 id="cp-calendar-heading">Google Calendar</h2><span className="cp-status" role="status">{!connection ? busy === 'status' ? 'Checking connection' : 'Status unavailable' : connection.connected ? 'Connection saved' : connection.configured ? 'Ready to connect' : 'Setup needed'}</span></div>
    <p>Google Calendar sends new appointment confirmations and Meet links. Qualified quiz answers arrive separately at matthew@wallaceshift.com. The optional connection below was used to match bookings from the earlier funnel.</p>
    {connection?.connected && <p className="cp-calendar-detail">Calendar: <strong>{connection.calendarId ?? 'primary'}</strong>{connection.bookingTitle && <> · Consultation: <strong>{connection.bookingTitle}</strong></>}</p>}
    {error && <p className="cp-calendar-error" role="alert">{error}</p>}
    <div className="cp-calendar-actions">
      {connection?.configured && <button type="button" className="cp-secondary" disabled={busy !== null} onClick={() => void connect()}>{busy === 'connect' ? 'Opening Google…' : connection.connected ? 'Reconnect Google Calendar' : 'Connect Google Calendar'}</button>}
      <button type="button" className="cp-text-button" disabled={busy !== null} onClick={() => void refresh()}>{busy === 'status' ? 'Checking…' : 'Refresh connection status'}</button>
    </div>
    {connection && !connection.configured && <details className="cp-calendar-setup"><summary>Set up the Google connection</summary>
      <p>Enable the Google Calendar API and create an OAuth client for a web application in Google Cloud. Add these server environment variables, then redeploy and refresh the status here. Never use a VITE prefix for these values.</p>
      <dl>{configuration.map(([name, description]) => <div key={name}><dt><code>{name}</code></dt><dd>{description}</dd></div>)}</dl>
      <p><code>GOOGLE_CALENDAR_ID</code> is optional and defaults to your primary calendar. <code>GOOGLE_CALENDAR_BOOKING_TITLE</code> must match your consultation schedule title if you change the current title.</p>
      <a href="https://developers.google.com/identity/protocols/oauth2/web-server#creatingcred" target="_blank" rel="noopener noreferrer">Google OAuth setup instructions</a>
    </details>}
    {connection && <details className="cp-calendar-bookings" onToggle={event => setShowBookings(event.currentTarget.open)}><summary>Previously matched consultations and quiz answers</summary>{showBookings && <ConfirmedConsultations />}</details>}
  </section>
}

function ConfirmedConsultations() {
  const [bookings, setBookings] = useState<ConfirmedBooking[] | null>(null)
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    void calendarRequest('bookings', controller.signal).then(data => setBookings(data.bookings ?? [])).catch(reason => {
      if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'We could not load the consultations. Please try again.')
    }).finally(() => { if (!controller.signal.aborted) setBusy(false) })
    return () => controller.abort()
  }, [])
  async function refresh() {
    setBusy(true); setError('')
    try { const data = await calendarRequest('bookings'); setBookings(data.bookings ?? []) }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'We could not load the consultations. Please try again.') }
    finally { setBusy(false) }
  }
  return <div className="cp-calendar-booking-list" aria-busy={busy}>
    <p>Quiz answers saved when the funnel confirmed each booking. Check Google Calendar for later changes or cancellations.</p>
    {error && <p className="cp-calendar-error" role="alert">{error}</p>}
    {busy && !bookings && <p role="status">Loading consultations…</p>}
    {bookings?.length === 0 && <p>No consultations have been confirmed through the funnel yet.</p>}
    {bookings?.map(booking => <details key={booking.id} className="cp-calendar-booking">
      <summary><time dateTime={booking.start}>{new Date(booking.start).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</time><span>{booking.email}</span></summary>
      <dl className="cp-intake-facts">{aiQualificationFacts(booking.answers).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    </details>)}
    <button type="button" className="cp-text-button" disabled={busy} onClick={() => void refresh()}>{busy ? 'Checking…' : 'Refresh consultations'}</button>
  </div>
}
