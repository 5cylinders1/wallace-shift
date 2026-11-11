import { HOURS } from './content'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }

/** The clinic's wall clock in Overland Park, whatever the visitor's time zone. */
function clinicNow(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', weekday: 'short', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(date)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  return { weekday: INDEX[get('weekday')] ?? 0, year: Number(get('year')), month: Number(get('month')), day: Number(get('day')), minutes: Number(get('hour')) * 60 + Number(get('minute')) }
}

export const clock = (minutes: number) => {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 12 && m === 0) return 'noon'
  const hour = h % 12 === 0 ? 12 : h % 12
  return `${hour}${m ? `:${String(m).padStart(2, '0')}` : ''} ${h < 12 ? 'a.m.' : 'p.m.'}`
}

export function openState(date = new Date()): { open: boolean; text: string } | null {
  try {
    const now = clinicNow(date)
    const today = HOURS[now.weekday]
    if (today && now.minutes >= today.open && now.minutes < today.close) return { open: true, text: `Open now · until ${clock(today.close)}` }
    if (today && now.minutes < today.open) return { open: false, text: `Opens today at ${clock(today.open)}` }
    for (let ahead = 1; ahead <= 7; ahead++) {
      const day = (now.weekday + ahead) % 7
      const hours = HOURS[day]
      if (hours) return { open: false, text: `Closed now · opens ${ahead === 1 ? 'tomorrow' : DAYS[day]} at ${clock(hours.open)}` }
    }
    return null
  } catch {
    return null
  }
}

export const todayIndex = () => clinicNow().weekday

export interface BookableDay { iso: string; weekday: number; label: string; short: string; date: number; month: string }

/** Open days over the next three weeks, starting tomorrow. */
export function bookableDays(weeks = 3, date = new Date()): BookableDay[] {
  const now = clinicNow(date)
  const base = Date.UTC(now.year, now.month - 1, now.day, 12)
  const out: BookableDay[] = []
  for (let offset = 1; offset <= weeks * 7; offset++) {
    const d = new Date(base + offset * 86_400_000)
    const weekday = d.getUTCDay()
    if (!HOURS[weekday]) continue
    out.push({ iso: d.toISOString().slice(0, 10), weekday, label: `${DAYS[weekday]}, ${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`, short: DAYS[weekday].slice(0, 3), date: d.getUTCDate(), month: MONTHS[d.getUTCMonth()] })
  }
  return out
}

export const WINDOWS = [
  { id: '9-11', label: '9 – 11 a.m.' },
  { id: '11-1', label: '11 a.m. – 1 p.m.' },
  { id: '1-3', label: '1 – 3 p.m.' },
  { id: '3-5', label: '3 – 5 p.m.' },
  { id: '5-7', label: '5 – 7 p.m.' },
  { id: 'any', label: 'Any time' },
] as const

export const hoursRows = [
  { days: 'Monday', idx: 1 },
  { days: 'Tuesday', idx: 2 },
  { days: 'Wednesday', idx: 3 },
  { days: 'Thursday', idx: 4 },
  { days: 'Friday', idx: 5 },
  { days: 'Saturday', idx: 6 },
  { days: 'Sunday', idx: 0 },
].map((row) => {
  const h = HOURS[row.idx]
  return { ...row, hours: h ? `${clock(h.open)} – ${clock(h.close)}` : 'Closed' }
})
