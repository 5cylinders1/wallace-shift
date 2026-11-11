import { useId, type ReactNode } from 'react'
import { salon } from './content'

export function Star({ filled = true }: { filled?: boolean }) {
  return (
    <svg className="sl-star" viewBox="0 0 20 20" aria-hidden="true" data-filled={filled || undefined}>
      <path d="M10 1.6l2.6 5.5 6 .7-4.5 4.1 1.2 5.9L10 14.9l-5.3 2.9 1.2-5.9L1.4 7.8l6-.7z" />
    </svg>
  )
}

export function Stars({ count = 5, label }: { count?: number; label?: string }) {
  return (
    <span className="sl-stars" role="img" aria-label={label ?? `${count} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => <Star key={i} filled={i < count} />)}
    </span>
  )
}

export function Arrow() {
  return (
    <svg className="sl-arrow" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M3 10h13M11 5l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function Check() {
  return (
    <svg className="sl-check" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M4 10.5l4 4 8-9" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

interface FieldProps {
  label: string
  error?: string
  hint?: string
  optional?: boolean
  className?: string
  children: (props: { id: string; 'aria-invalid'?: true; 'aria-describedby'?: string }) => ReactNode
}

/** Label, control, hint and error wired together for screen readers. */
export function Field({ label, error, hint, optional, className = '', children }: FieldProps) {
  const id = useId()
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined
  return (
    <div className={`sl-field ${className}`} data-invalid={error ? true : undefined}>
      <label htmlFor={id}>
        {label}
        {optional && <span className="sl-optional"> (optional)</span>}
      </label>
      {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy })}
      {hint && <p className="sl-hint" id={hintId}>{hint}</p>}
      {error && <p className="sl-error" id={errorId}>{error}</p>}
    </div>
  )
}

/** Shown wherever a form would send something. Plain about it, in the salon's own voice. */
export function NotSent({ what, onReset }: { what: string; onReset?: () => void }) {
  return (
    <div className="sl-notsent" role="status" aria-live="polite" tabIndex={-1}>
      <p className="sl-notsent-label">Preview only</p>
      <p className="sl-notsent-title">Your {what} was not sent.</p>
      <p>
        This page is a preview of a new SoLara website and its forms are not connected yet.
        To book or ask a question now, call Lara at <a href={salon.phoneHref}>{salon.phone}</a>.
      </p>
      {onReset && <button type="button" className="sl-link-btn" onClick={onReset}>Start again</button>}
    </div>
  )
}
