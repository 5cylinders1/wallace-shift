import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { suggest } from './api'
import type { AddressSuggestion } from './types'

export type AddressTarget = { id: string; label: string } | { address: string; label: string }

interface Props {
  busy: boolean
  onSubmit: (target: AddressTarget) => void
  /** Shown inside the field, e.g. after "Change address". */
  initial?: string
  autoFocus?: boolean
}

/** ARIA 1.2 combobox: type, arrow through suggestions, Enter to look one up. */
export default function AddressSearch({ busy, onSubmit, initial = '', autoFocus = false }: Props) {
  const id = useId()
  const input = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState(initial)
  const [options, setOptions] = useState<AddressSuggestion[]>([])
  const [active, setActive] = useState(-1)
  const [open, setOpen] = useState(false)
  const [hint, setHint] = useState<'offline' | 'slow' | null>(null)

  useEffect(() => {
    if (autoFocus) input.current?.focus()
  }, [autoFocus])

  useEffect(() => {
    const q = query.trim()
    if (q.length < 3) return
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      const result = await suggest(q, controller.signal)
      if (controller.signal.aborted) return
      if (result.ok) {
        setOptions(result.suggestions)
        setActive(-1)
        setHint(null)
      } else {
        setOptions([])
        setHint(result.error === 'not_configured' ? 'offline' : 'slow')
      }
    }, 200)
    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [query])

  const visible = open && query.trim().length >= 3 ? options : []

  const choose = (option: AddressSuggestion) => {
    const label = [option.primary, option.secondary].filter(Boolean).join(', ')
    setQuery(label)
    setOpen(false)
    onSubmit({ id: option.id, label })
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (busy) return
    if (active >= 0 && visible[active]) return choose(visible[active])
    const text = query.trim()
    if (text.length >= 5) {
      setOpen(false)
      onSubmit({ address: text, label: text })
    }
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!visible.length) return
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      setOpen(true)
      const step = event.key === 'ArrowDown' ? 1 : -1
      setActive((current) => (current + step + visible.length) % visible.length)
    } else if (event.key === 'Escape') {
      setOpen(false)
      setActive(-1)
    }
  }

  return (
    <form className="tw-search" onSubmit={submit} role="search">
      <label htmlFor={`${id}-input`} className="tw-search-label">Your address</label>
      <div className="tw-search-row">
        <svg className="tw-search-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z" fill="none" stroke="currentColor" strokeWidth="1.6" /><circle cx="12" cy="9.5" r="2.4" fill="currentColor" /></svg>
        <input
          ref={input}
          id={`${id}-input`}
          type="text"
          inputMode="text"
          autoComplete="street-address"
          enterKeyHint="search"
          placeholder="Start typing your street address"
          role="combobox"
          aria-expanded={visible.length > 0}
          aria-controls={`${id}-list`}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 && visible[active] ? `${id}-option-${active}` : undefined}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          onKeyDown={onKeyDown}
        />
        <button type="submit" className="tw-button tw-button-ink" disabled={busy || query.trim().length < 5}>
          {busy ? 'Measuring…' : 'Measure my lawn'}
        </button>
      </div>
      <ul id={`${id}-list`} role="listbox" className="tw-search-list" hidden={!visible.length} aria-label="Matching addresses">
        {visible.map((option, index) => (
          <li
            key={option.id}
            id={`${id}-option-${index}`}
            role="option"
            aria-selected={index === active}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => choose(option)}
          >
            <strong>{option.primary}</strong>
            <span>{option.secondary}</span>
          </li>
        ))}
      </ul>
      {hint && query.trim().length >= 3 && (
        <p className="tw-search-hint" role="status">
          {hint === 'offline' ? 'Address suggestions aren’t connected here.' : 'Suggestions are slow right now.'} Type your full address and press Enter.
        </p>
      )}
    </form>
  )
}
