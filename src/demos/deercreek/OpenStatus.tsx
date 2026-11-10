import { useEffect, useState } from 'react'
import { business } from './content'

type Status = { open: boolean; text: string } | null

const OPEN_MIN = 8 * 60
const CLOSE_MIN = 16 * 60 + 30
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

/** Office status in Olathe's time zone, whatever the visitor's clock says.
 * Rendered after hydration so the static HTML never claims a stale state. */
function officeStatus(date = new Date()): Status {
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(date)
    const get = (type: string) => parts.find(part => part.type === type)?.value ?? ''
    const day = get('weekday')
    const minutes = Number(get('hour')) * 60 + Number(get('minute'))
    const weekday = WEEKDAYS.includes(day)
    if (weekday && minutes >= OPEN_MIN && minutes < CLOSE_MIN) return { open: true, text: 'Office open now, until 4:30 p.m.' }
    if (weekday && minutes < OPEN_MIN) return { open: false, text: 'Office opens today at 8:00 a.m.' }
    if (weekday && day !== 'Fri') return { open: false, text: 'Office closed. Opens tomorrow at 8:00 a.m.' }
    return { open: false, text: 'Office closed. Opens Monday at 8:00 a.m.' }
  } catch {
    return null
  }
}

export default function OpenStatus({ className = '' }: { className?: string }) {
  const [status, setStatus] = useState<Status>(null)
  useEffect(() => {
    const tick = () => setStatus(officeStatus())
    tick()
    const timer = window.setInterval(tick, 60_000)
    return () => window.clearInterval(timer)
  }, [])
  return (
    <span className={`dc-open ${className}`} data-state={status ? (status.open ? 'open' : 'closed') : 'static'}>
      <span className="dc-open-dot" aria-hidden="true" />
      {status ? status.text : `Office hours ${business.hours.short}, ${business.hours.label}`}
    </span>
  )
}
