import { useId, useRef, useState, type FormEvent } from 'react'
import { business } from '../content'
import { ERROR_TEXT, requestService } from './api'
import { CONTACT_LABELS, PROJECT_LABELS, TIMING_LABELS } from './labels'
import type { ContactMethod, LawnErrorCode, Project, Timing } from './types'

interface Props {
  target: { id: string } | { address: string }
  addressLabel: string
  /** Rounded and in range, or null when the lawn couldn't be measured. */
  lawnSqFt: number | null
  projects: Project[]
  onBack: () => void
}

type Field = 'name' | 'phone' | 'email'
type Outcome = { kind: 'sent' } | { kind: 'not_configured' } | { kind: 'error'; code: LawnErrorCode }

function validate(values: Record<Field, string>): Partial<Record<Field, string>> {
  const errors: Partial<Record<Field, string>> = {}
  if (!values.name.trim()) errors.name = 'Please add your name.'
  if (values.phone.replace(/\D/g, '').length < 10) errors.phone = 'Please add a 10-digit phone number.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) errors.email = 'Please add an email address like name@example.com.'
  return errors
}

export default function RequestForm({ target, addressLabel, lawnSqFt, projects, onBack }: Props) {
  const id = useId()
  const form = useRef<HTMLFormElement>(null)
  const [values, setValues] = useState<Record<Field, string>>({ name: '', phone: '', email: '' })
  const [contact, setContact] = useState<ContactMethod>('text')
  const [timing, setTiming] = useState<Timing>('season')
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState<Partial<Record<Field | 'notes', string>>>({})
  const [sending, setSending] = useState(false)
  const [outcome, setOutcome] = useState<Outcome | null>(null)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const found: Partial<Record<Field | 'notes', string>> = validate(values)
    if (!projects.length && !notes.trim()) found.notes = 'Tell us a little about the project, or go back and pick one.'
    setErrors(found)
    const first = (['name', 'phone', 'email', 'notes'] as const).find((field) => found[field])
    if (first) return form.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus()
    setSending(true)
    const result = await requestService({
      ...target,
      name: values.name.trim(),
      phone: values.phone.trim(),
      email: values.email.trim(),
      contact,
      lawnSqFt,
      projects,
      timing,
      notes: notes.trim(),
      company: (new FormData(event.currentTarget).get('company') as string | null) ?? '',
    })
    setSending(false)
    if (result.ok) setOutcome({ kind: 'sent' })
    else if (result.error === 'not_configured') setOutcome({ kind: 'not_configured' })
    else setOutcome({ kind: 'error', code: result.error })
  }

  if (outcome?.kind === 'sent') {
    return (
      <div className="ll-request-done" role="status">
        <p className="ll-eyebrow">Request sent</p>
        <h3>Thanks, {values.name.trim().split(' ')[0]}.</h3>
        <p>We have your address and project. We’ll {contact === 'email' ? 'email' : contact} you to set up your free consultation.</p>
      </div>
    )
  }
  if (outcome?.kind === 'not_configured') {
    return (
      <div className="ll-request-done is-preview" role="status">
        <p className="ll-eyebrow">Preview only</p>
        <h3>Nothing was sent.</h3>
        <p>This concept isn’t connected to an inbox yet, so your request stayed on this page. To set up a consultation now, call {business.phone} or email {business.email}.</p>
        <div className="ll-request-actions">
          <a className="ll-button ll-button-ink" href={business.phoneHref}>Call {business.phone}</a>
          <a className="ll-button ll-button-line" href={`mailto:${business.email}`}>Email us</a>
        </div>
        <button type="button" className="ll-link" onClick={() => setOutcome(null)}>Edit request</button>
      </div>
    )
  }

  const field = (name: Field, label: string, type: string, autoComplete: string, inputMode?: 'tel' | 'email') => (
    <div className={`ll-field${errors[name] ? ' has-error' : ''}`}>
      <label htmlFor={`${id}-${name}`}>{label}</label>
      <input
        id={`${id}-${name}`}
        name={name}
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete}
        value={values[name]}
        aria-invalid={Boolean(errors[name])}
        aria-describedby={errors[name] ? `${id}-${name}-error` : undefined}
        onChange={(event) => {
          setValues((current) => ({ ...current, [name]: event.target.value }))
          if (errors[name]) setErrors((current) => ({ ...current, [name]: undefined }))
        }}
      />
      {errors[name] && <p id={`${id}-${name}-error`} className="ll-field-error">{errors[name]}</p>}
    </div>
  )

  return (
    <form ref={form} className="ll-request" onSubmit={submit} noValidate>
      <div className="ll-request-head">
        <button type="button" className="ll-link" onClick={onBack}>← Back to your yard</button>
        <p className="ll-request-summary">
          <strong>{projects.length ? projects.map((project) => PROJECT_LABELS[project]).join(', ') : 'Free consultation'}</strong>
          <span>At {addressLabel.split(',')[0]}{lawnSqFt ? ` · about ${lawnSqFt.toLocaleString('en-US')} sq ft of lawn` : ''}</span>
        </p>
      </div>

      <div className="ll-request-grid">
        {field('name', 'Name', 'text', 'name')}
        {field('phone', 'Mobile phone', 'tel', 'tel', 'tel')}
        <div className="ll-request-span">{field('email', 'Email', 'email', 'email', 'email')}</div>
      </div>

      <fieldset className="ll-chips">
        <legend>Best way to reach you</legend>
        {(Object.keys(CONTACT_LABELS) as ContactMethod[]).map((method) => (
          <label key={method} className="ll-chip">
            <input type="radio" name="contact" value={method} checked={contact === method} onChange={() => setContact(method)} />
            <span>{CONTACT_LABELS[method]}</span>
          </label>
        ))}
      </fieldset>

      <fieldset className="ll-chips">
        <legend>When are you hoping to start?</legend>
        {(Object.keys(TIMING_LABELS) as Timing[]).map((option) => (
          <label key={option} className="ll-chip">
            <input type="radio" name="timing" value={option} checked={timing === option} onChange={() => setTiming(option)} />
            <span>{TIMING_LABELS[option]}</span>
          </label>
        ))}
      </fieldset>

      <div className={`ll-field${errors.notes ? ' has-error' : ''}`}>
        <label htmlFor={`${id}-notes`}>Tell us about your project <span>{projects.length ? 'Optional' : 'Required'}</span></label>
        <textarea
          id={`${id}-notes`}
          name="notes"
          rows={4}
          maxLength={2000}
          placeholder="What you’d like to change, problem areas like drainage, ideas you’ve seen…"
          value={notes}
          aria-invalid={Boolean(errors.notes)}
          aria-describedby={errors.notes ? `${id}-notes-error` : undefined}
          onChange={(event) => {
            setNotes(event.target.value)
            if (errors.notes) setErrors((current) => ({ ...current, notes: undefined }))
          }}
        />
        {errors.notes && <p id={`${id}-notes-error`} className="ll-field-error">{errors.notes}</p>}
      </div>

      {/* Honeypot: off-screen, never focusable, so only bots fill it. */}
      <div className="ll-honeypot" aria-hidden="true">
        <label htmlFor={`${id}-company`}>Company</label>
        <input id={`${id}-company`} name="company" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      {outcome?.kind === 'error' && <p className="ll-request-alert" role="alert">{ERROR_TEXT[outcome.code]}</p>}

      <button type="submit" className="ll-button ll-button-green ll-request-submit" disabled={sending}>
        {sending ? 'Sending…' : 'Request my free consultation'}
      </button>
      <p className="ll-request-fine">The consultation is free.</p>
    </form>
  )
}
