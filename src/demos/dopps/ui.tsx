import { useEffect, useRef, useState } from 'react'
import { openState } from './schedule'

export function Arrow() {
  return (
    <svg className="dp-arrow" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M3 10h13M11 5l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function Star() {
  return (
    <svg className="dp-star" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M10 1.6l2.6 5.5 6 .7-4.5 4.1 1.2 5.9L10 14.9l-5.3 2.9 1.2-5.9L1.4 7.8l6-.7z" />
    </svg>
  )
}

export function Stars() {
  return <span className="dp-stars" role="img" aria-label="5 out of 5 stars">{[0, 1, 2, 3, 4].map((i) => <Star key={i} />)}</span>
}

/** Open or closed in Overland Park's time zone, refreshed each minute. */
export function OpenStatus({ className = '' }: { className?: string }) {
  const [state, setState] = useState<ReturnType<typeof openState>>(null)
  useEffect(() => {
    const tick = () => setState(openState())
    tick()
    const timer = window.setInterval(tick, 60_000)
    return () => window.clearInterval(timer)
  }, [])
  return (
    <span className={`dp-open ${className}`} data-open={state?.open || undefined}>
      <span className="dp-open-dot" aria-hidden="true" />
      {state ? state.text : 'Open Monday, Wednesday & Friday'}
    </span>
  )
}

const format = (s: number) => (s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : `${s}s`)

/** A small countdown for held stretches. Announces only the finish, not every second. */
export function HoldTimer({ seconds, label }: { seconds: number; label: string }) {
  const [left, setLeft] = useState(seconds)
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(false)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (!running) return
    timer.current = window.setInterval(() => {
      setLeft((l) => {
        if (l <= 1) {
          window.clearInterval(timer.current)
          setRunning(false)
          setDone(true)
          return 0
        }
        return l - 1
      })
    }, 1000)
    return () => window.clearInterval(timer.current)
  }, [running])

  const toggle = () => {
    if (running) {
      setRunning(false)
      return
    }
    if (left === 0 || done) setLeft(seconds)
    setDone(false)
    setRunning(true)
  }

  const progress = 1 - left / seconds
  return (
    <span className="dp-timer">
      <button type="button" onClick={toggle} aria-pressed={running} aria-label={running ? `Pause ${label} timer` : `Start ${format(seconds)} timer for ${label}`}>
        <svg viewBox="0 0 36 36" aria-hidden="true">
          <circle cx="18" cy="18" r="15.5" className="dp-timer-track" />
          <circle cx="18" cy="18" r="15.5" className="dp-timer-fill" style={{ strokeDashoffset: `${(1 - progress) * 97.4}` }} />
        </svg>
        <span className="dp-timer-text">{running || left < seconds ? format(left) : `${format(seconds)} timer`}</span>
      </button>
      <span className="dp-visually-hidden" aria-live="polite">{done ? `${label}: time’s up.` : ''}</span>
    </span>
  )
}
