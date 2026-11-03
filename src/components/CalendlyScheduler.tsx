import { useEffect, useEffectEvent, useRef, useState } from 'react'

interface CalendlyEmbed {
  initInlineWidget: (options: { url: string; parentElement: HTMLElement }) => void
}

declare global {
  interface Window { Calendly?: CalendlyEmbed }
}

const widgetScriptUrl = 'https://assets.calendly.com/assets/external/widget.js'
let pendingWidget: Promise<CalendlyEmbed> | undefined

function loadWidget(): Promise<CalendlyEmbed> {
  if (window.Calendly?.initInlineWidget) return Promise.resolve(window.Calendly)
  if (pendingWidget) return pendingWidget

  const request = new Promise<CalendlyEmbed>((resolve, reject) => {
    const script = document.createElement('script')
    const fail = () => {
      window.clearTimeout(timeout)
      script.remove()
      reject(new Error('Calendly could not load.'))
    }
    const timeout = window.setTimeout(fail, 15000)
    script.src = widgetScriptUrl
    script.async = true
    script.onerror = fail
    script.onload = () => {
      window.clearTimeout(timeout)
      if (window.Calendly?.initInlineWidget) resolve(window.Calendly)
      else fail()
    }
    document.head.append(script)
  })
  pendingWidget = request.catch(error => {
    pendingWidget = undefined
    throw error
  })
  return pendingWidget
}

function isScheduledPayload(payload: unknown): boolean {
  if (!payload || typeof payload !== 'object') return false
  const { event, invitee } = payload as { event?: { uri?: unknown }; invitee?: { uri?: unknown } }
  if (typeof event?.uri !== 'string' || typeof invitee?.uri !== 'string') return false

  // Calendly documents both unversioned event URIs and /api/v2/ invitee URIs.
  const eventId = /^https:\/\/api\.calendly\.com\/(?:api\/v2\/)?scheduled_events\/([\w-]+)$/.exec(event.uri)?.[1]
  const inviteeEventId = /^https:\/\/api\.calendly\.com\/(?:api\/v2\/)?scheduled_events\/([\w-]+)\/invitees\/[\w-]+$/.exec(invitee.uri)?.[1]
  return Boolean(eventId && eventId === inviteeEventId)
}

interface SchedulerProps {
  eventUrl: string
  onScheduled: () => void
}

export function CalendlyScheduler({ eventUrl, onScheduled }: SchedulerProps) {
  const [attempt, setAttempt] = useState(0)
  return <Widget key={`${eventUrl}:${attempt}`} eventUrl={eventUrl} onScheduled={onScheduled} onRetry={() => setAttempt(value => value + 1)} />
}

function Widget({ eventUrl, onScheduled, onRetry }: SchedulerProps & { onRetry: () => void }) {
  const widgetRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'slow' | 'failed'>('loading')
  const notifyScheduled = useEffectEvent(onScheduled)

  useEffect(() => {
    const container = widgetRef.current
    if (!container) return
    let active = true
    let confirmed = false
    let timeout: number | undefined

    function handleMessage(message: MessageEvent) {
      if (message.origin !== 'https://calendly.com' || !message.source || confirmed) return
      if (message.source !== container?.querySelector('iframe')?.contentWindow) return
      const data = message.data
      if (data?.event === 'calendly.event_scheduled' && isScheduledPayload(data.payload)) {
        confirmed = true
        notifyScheduled()
      } else if (data?.event === 'calendly.event_type_viewed' || data?.event === 'calendly.date_and_time_selected') {
        window.clearTimeout(timeout)
        setStatus('ready')
      }
    }

    window.addEventListener('message', handleMessage)
    loadWidget().then(widget => {
      if (!active) return
      widget.initInlineWidget({ url: eventUrl, parentElement: container })
      timeout = window.setTimeout(() => setStatus('slow'), 15000)
    }).catch(() => {
      if (active) setStatus('failed')
    })

    return () => {
      active = false
      window.clearTimeout(timeout)
      window.removeEventListener('message', handleMessage)
      container.replaceChildren()
    }
  }, [eventUrl])

  return <div aria-label="Consultation calendar" role="region">
    {status === 'loading' && <p className="qf-booking-load-status" role="status">Loading appointment times…</p>}
    {(status === 'slow' || status === 'failed') && <div className="qf-booking-load-status">
      <p role="status">{status === 'slow' ? 'The calendar is taking longer than usual to load.' : 'The calendar could not be loaded.'} You can try again or request a phone call above.</p>
      <button className="qf-text-link" type="button" onClick={onRetry}>Reload calendar</button>
    </div>}
    <div ref={widgetRef} className="qf-booking-frame" data-auto-load="false" style={status === 'failed' ? { display: 'none' } : undefined} />
  </div>
}
