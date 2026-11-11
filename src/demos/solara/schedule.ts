import { HOURS } from './content'

const ZONE = 'America/Chicago'
const WEEKDAY_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }

/** Wall-clock parts in the salon's time zone, whatever the visitor's clock says. */
function salonNow(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: ZONE, weekday: 'short', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', hourCycle: 'h23',
  }).formatToParts(date)
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? ''
  return {
    weekday: WEEKDAY_INDEX[get('weekday')] ?? 0,
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    minutes: Number(get('hour')) * 60 + Number(get('minute')),
  }
}

export function clock(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 12 && m === 0) return 'noon'
  const suffix = h < 12 ? 'a.m.' : 'p.m.'
  const hour = h % 12 === 0 ? 12 : h % 12
  return m ? `${hour}:${String(m).padStart(2, '0')} ${suffix}` : `${hour} ${suffix}`
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export interface OpenState {
  open: boolean
  text: string
}

export function openState(date = new Date()): OpenState | null {
  try {
    const now = salonNow(date)
    const today = HOURS[now.weekday]
    if (now.minutes >= today.open && now.minutes < today.close) return { open: true, text: `Open now · until ${clock(today.close)}` }
    if (now.minutes < today.open) return { open: false, text: `Opens today at ${clock(today.open)}` }
    const next = (now.weekday + 1) % 7
    return { open: false, text: `Closed now · opens tomorrow at ${clock(HOURS[next].open)}` }
  } catch {
    return null
  }
}

export interface BookableDay {
  /** YYYY-MM-DD in the salon's time zone. */
  iso: string
  weekday: number
  label: string
  short: string
  date: number
  month: string
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/**
 * The next `count` days the salon is open, starting tomorrow. SoLara is open
 * every day, so this is simply the calendar; the request still needs Lara to
 * confirm, which the form says.
 */
export function bookableDays(count = 14, date = new Date()): BookableDay[] {
  const now = salonNow(date)
  const days: BookableDay[] = []
  // Noon UTC on the salon's calendar date avoids any DST edge.
  const base = Date.UTC(now.year, now.month - 1, now.day, 12)
  for (let offset = 1; days.length < count && offset < 60; offset++) {
    const d = new Date(base + offset * 86_400_000)
    const weekday = d.getUTCDay()
    if (!HOURS[weekday]) continue
    const iso = d.toISOString().slice(0, 10)
    const month = MONTHS[d.getUTCMonth()]
    days.push({
      iso,
      weekday,
      label: `${DAY_NAMES[weekday]}, ${month} ${d.getUTCDate()}`,
      short: DAY_NAMES[weekday].slice(0, 3),
      date: d.getUTCDate(),
      month,
    })
  }
  return days
}

export interface TimeWindow {
  id: string
  label: string
}

/** Preference windows inside the day's opening hours, rather than slots we cannot know. */
export function windowsFor(weekday: number): TimeWindow[] {
  const { open, close } = HOURS[weekday]
  const cuts = open === 11 * 60 ? [open, 13 * 60, 15 * 60, 17 * 60, close] : [open, 12 * 60, 14 * 60, close]
  const windows = cuts.slice(0, -1).map((start, i) => {
    const end = cuts[i + 1]
    return { id: `${start}-${end}`, label: `${capital(clock(start))} – ${clock(end)}` }
  })
  return [...windows, { id: 'any', label: 'Any time that day' }]
}

const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

export function dayLabel(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`)
  return `${DAY_NAMES[d.getUTCDay()]}, ${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`
}
