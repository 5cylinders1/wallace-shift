import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { suggestAddresses } from './roofClient'
import { Credits } from './Credits'
import type { AddressSuggestion, Credit } from './types'

interface AddressComboboxProps {
  value: string
  onChange: (value: string) => void
  onPick: (suggestion: AddressSuggestion) => void
  /** Enter with no suggestion highlighted. */
  onSubmit: () => void
  /** A lookup is running: the field stays focusable but can't be edited. */
  busy?: boolean
  describedBy?: string
}

const MIN_QUERY = 4
const DEBOUNCE_MS = 220

/** Bolds the part of a suggestion the visitor has already typed. */
function highlight(text: string, query: string): ReactNode {
  const at = text.toLowerCase().indexOf(query.trim().toLowerCase())
  if (!query.trim() || at < 0) return text
  const end = at + query.trim().length
  return (
    <>
      {text.slice(0, at)}
      <mark>{text.slice(at, end)}</mark>
      {text.slice(end)}
    </>
  )
}

/**
 * An address field with our own suggestion list (WAI-ARIA combobox
 * pattern). Suggestions come through /api/roof-suggest; if that is
 * unavailable the field quietly works as a plain text box.
 */
export function AddressCombobox({ value, onChange, onPick, onSubmit, busy, describedBy }: AddressComboboxProps) {
  const inputId = useId()
  const listId = useId()
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const [unavailable, setUnavailable] = useState(false)
  const [credits, setCredits] = useState<Credit[]>([])
  const requestRef = useRef<AbortController | null>(null)
  const pickedRef = useRef<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const query = value.trim()
    if (unavailable || query.length < MIN_QUERY || pickedRef.current === value) {
      requestRef.current?.abort()
      return
    }
    const timer = window.setTimeout(async () => {
      requestRef.current?.abort()
      const controller = new AbortController()
      requestRef.current = controller
      try {
        const result = await suggestAddresses(query, controller.signal)
        if (controller.signal.aborted) return
        if (!result.ok) {
          if (result.error === 'not_configured') setUnavailable(true)
          setSuggestions([])
          setOpen(false)
          return
        }
        setSuggestions(result.suggestions)
        setCredits(result.credits)
        setActive(-1)
        // Never pop open over the page for someone who has moved on.
        setOpen(result.suggestions.length > 0 && document.activeElement === inputRef.current)
      } catch {
        // Aborted by a newer keystroke.
      }
    }, DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [value, unavailable])

  useEffect(() => () => requestRef.current?.abort(), [])

  const expanded = open && suggestions.length > 0
  const optionId = (index: number) => `${listId}-option-${index}`

  // Keep the highlighted address visible while arrowing through a long list.
  useEffect(() => {
    if (expanded && active >= 0) document.getElementById(optionId(active))?.scrollIntoView({ block: 'nearest' })
  })

  const choose = (suggestion: AddressSuggestion) => {
    const text = `${suggestion.primary}, ${suggestion.secondary}`
    pickedRef.current = text
    onChange(text)
    setOpen(false)
    setSuggestions([])
    onPick(suggestion)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      if (!suggestions.length) return
      event.preventDefault()
      setOpen(true)
      setActive((index) => (index + 1) % suggestions.length)
    } else if (event.key === 'ArrowUp') {
      if (!suggestions.length) return
      event.preventDefault()
      setOpen(true)
      setActive((index) => (index <= 0 ? suggestions.length - 1 : index - 1))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      if (open && active >= 0 && suggestions[active]) choose(suggestions[active])
      else {
        setOpen(false)
        onSubmit()
      }
    } else if (event.key === 'Escape') {
      if (open) {
        event.preventDefault()
        setOpen(false)
      }
    }
  }

  return (
    <div className={`rf-address${expanded ? ' is-open' : ''}`}>
      <label className="rf-address__label" htmlFor={inputId}>
        Property address
      </label>
      <div className="rf-address__field">
        <svg className="rf-address__icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="12" cy="9.5" r="2.6" fill="currentColor" />
        </svg>
        <input
          id={inputId}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={expanded}
          aria-controls={listId}
          aria-activedescendant={expanded && active >= 0 ? optionId(active) : undefined}
          aria-describedby={describedBy}
          autoComplete="street-address"
          spellCheck={false}
          placeholder="Start typing your street address"
          value={value}
          readOnly={busy}
          aria-disabled={busy || undefined}
          ref={inputRef}
          onChange={(event) => {
            pickedRef.current = null
            setActive(-1)
            // Suggestions for text that is no longer there must not be pickable.
            if (event.target.value.trim().length < MIN_QUERY) {
              setSuggestions([])
              setOpen(false)
            }
            onChange(event.target.value)
          }}
          onKeyDown={onKeyDown}
          onBlur={() => setOpen(false)}
          onFocus={() => suggestions.length && setOpen(true)}
        />
      </div>
      {/* Mouse-down is held so the input keeps focus and a click lands. */}
      <div className="rf-address__popup" hidden={!expanded} onMouseDown={(event) => event.preventDefault()}>
        <ul id={listId} role="listbox" aria-label="Address suggestions" className="rf-address__list">
          {suggestions.map((suggestion, index) => (
            <li
              key={suggestion.id}
              id={optionId(index)}
              role="option"
              aria-selected={index === active}
              className={`rf-address__option${index === active ? ' is-active' : ''}`}
              onClick={() => choose(suggestion)}
              onMouseEnter={() => setActive(index)}
            >
              <span className="rf-address__primary">{highlight(suggestion.primary, value)}</span>
              <span className="rf-address__secondary">{suggestion.secondary}</span>
            </li>
          ))}
        </ul>
        {credits.length > 0 && <Credits className="rf-address__credit" credits={credits} />}
      </div>
      <p className="rf-visually-hidden" aria-live="polite">
        {expanded ? `${suggestions.length} address${suggestions.length === 1 ? '' : 'es'} found. Use the arrow keys to choose.` : ''}
      </p>
    </div>
  )
}
