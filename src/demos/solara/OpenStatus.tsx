import { useEffect, useState } from 'react'
import { openState, type OpenState } from './schedule'

/** Open or closed in Overland Park's time zone, refreshed each minute. */
export default function OpenStatus({ className = '' }: { className?: string }) {
  const [state, setState] = useState<OpenState | null>(null)
  useEffect(() => {
    const tick = () => setState(openState())
    tick()
    const timer = window.setInterval(tick, 60_000)
    return () => window.clearInterval(timer)
  }, [])
  if (!state) return <span className={`sl-open ${className}`}>Open 7 days</span>
  return (
    <span className={`sl-open ${className}`} data-open={state.open || undefined}>
      <span className="sl-open-dot" aria-hidden="true" />
      {state.text}
    </span>
  )
}
