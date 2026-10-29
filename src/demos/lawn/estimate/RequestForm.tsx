import { useId, useRef, useState, type FormEvent } from 'react'
import { business } from '../content'
import { ERROR_TEXT, requestService } from './api'
import type { ContactMethod, Extra, Frequency, LawnErrorCode, ServiceRange, Timing } from './types'

interface Props {
  target: { id: string } | { address: string }
  addressLabel: string
  lawnSqFt: number
  frequency: Frequency
  price: { low: number; high: number }
  onBack: () => void
}

const EXTRA_LABELS: Record<Extra, string> = {
  shrubs: 'Shrub trimming',
  leaves: 'Leaf removal',
  limbs: 'Tree limb removal',
  weeds: 'Weed removal',
  seeding: 'Seeding',
  fertilizing: 'Fertilizing',
  cleanup: 'One-time cleanup',
}
const CONTACT_LABELS: Record<ContactMethod, string> = { text: 'Text me', call: 'Call me', email: 'Email me' }
const TIMING_LABELS: Record<Timing, string> = { asap: 'As soon as possible', week: 'In the next week or two', flexible: 'I’m flexible' }

type Field = 'name' | 'phone' | 'email'
type Outcome = { kind: 'sent' } | { kind: 'not_configured' } | { kind: 'out_of_range'; range?: ServiceRange } | { kind: 'error'; code: LawnErrorCode }

function validate(values: Record<Field, string>): Partial<Record<Field, string>> {
  const errors: Partial<Record<Field, string>> = {}
  if (!values.name.trim()) errors.name = 'Please add your name.'
  if (values.phone.replace(/\D/g, '').length < 10) errors.phone = 'Please add a 10-digit phone number.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) errors.email = 'Please add an email address like name@example.com.'
  return errors
}

export default function RequestForm({ target, addressLabel, lawnSqFt, frequency, price, onBack }: Props) {
  const id = useId()
  const form = useRef<HTMLFormElement>(null)
  const [values, setValues] = useState<Record<Field, string>>({ name: '', phone: '', email: '' })
  const [contact, setContact] = useState<ContactMethod>('text')
  const [extras, setExtras] = useState<Extra[]>([])
  const [timing, setTiming] = useState<Timing>('asap')
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({})
  const [sending, setSending] = useState(false)
  const [outcome, setOutcome] = useState<Outcome | null>(null)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const found = validate(values)
    setErrors(found)
    const first = (['name', 'phone', 'email'] as Field[]).find((field) => found[field])
    if (first) return form.current?.querySelector<HTMLInputElement>(`[name="${first}"]`)?.focus()
    setSending(true)
    const result = await requestService({
      ...target,
      name: values.name.trim(),
      phone: values.phone.trim(),
      email: values.email.trim(),
      contact,
      frequency,
      lawnSqFt,
      extras,
      timing,
      notes: notes.trim(),
      company: (new FormData(event.currentTarget).get('company') as string | null) ?? '',
    })
    setSending(false)
    if (result.ok) setOutcome({ kind: 'sent' })
    else if (result.error === 'not_configured') setOutcome({ kind: 'not_configured' })
    else if (result.error === 'out_of_range') setOutcome({ kind: 'out_of_range', range: result.range })
    else setOutcome({ kind: 'error', code: result.error })
  }

  if (outcome?.kind === 'sent') {
    return (
      <div className="tw-request-done" role="status">
        <p className="tw-eyebrow">Request sent</p>
        <h3>Thanks, {values.name.trim().split(' ')[0]}.</h3>
        <p>Ben has your address, lawn size and estimate of ${price.low}–${price.high} a mow. He’ll {contact === 'email' ? 'email' : contact} you to confirm a first visit.</p>
      </div>
    )
  }
  if (outcome?.kind === 'not_configured') {
    return (
      <div className="tw-request-done is-preview" role="status">
        <p className="tw-eyebrow">Preview only</p>
        <h3>Nothing was sent.</h3>
        <p>This concept isn’t connected to Ben’s inbox yet, so your request stayed on this page. To book now, call or text {business.phone}.</p>
        <div className="tw-request-actions">
          <a className="tw-button tw-button-ink" href={business.smsHref}>Text Ben</a>
          <a className="tw-button tw-button-line" href={business.phoneHref}>Call {business.phone}</a>
        </div>
        <button type="button" className="tw-link" onClick={() => setOutcome(null)}>Edit request</button>
      </div>
    )
  }

  const field = (name: Field, label: string, type: string, autoComplete: string, inputMode?: 'tel' | 'email') => (
    <div className={`tw-field${errors[name] ? ' has-error' : ''}`}>
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
      {errors[name] && <p id={`${id}-${name}-error`} className="tw-field-error">{errors[name]}</p>}
    </div>
  )

  return (
    <form ref={form} className="tw-request" onSubmit={submit} noValidate>
      <div className="tw-request-head">
        <button type="button" className="tw-link" onClick={onBack}>← Back to estimate</button>
        <p className="tw-request-summary">
          <strong>{lawnSqFt.toLocaleString('en-US')} sq ft · ${price.low}–${price.high} per mow</strong>
          <span>Request service at {addressLabel.split(',')[0]}</span>
        </p>
      </div>

      <div className="tw-request-grid">
        {field('name', 'Name', 'text', 'name')}
        {field('phone', 'Mobile phone', 'tel', 'tel', 'tel')}
        <div className="tw-request-span">{field('email', 'Email', 'email', 'email', 'email')}</div>
      </div>

      <fieldset className="tw-chips">
        <legend>Best way to reach you</legend>
        {(Object.keys(CONTACT_LABELS) as ContactMethod[]).map((method) => (
          <label key={method} className="tw-chip">
            <input type="radio" name="contact" value={method} checked={contact === method} onChange={() => setContact(method)} />
            <span>{CONTACT_LABELS[method]}</span>
          </label>
        ))}
      </fieldset>

      <fieldset className="tw-chips">
        <legend>Anything else? <span>Quoted after a look</span></legend>
        {(Object.keys(EXTRA_LABELS) as Extra[]).map((extra) => (
          <label key={extra} className="tw-chip">
            <input
              type="checkbox"
              name="extras"
              value={extra}
              checked={extras.includes(extra)}
              onChange={(event) => setExtras((current) => (event.target.checked ? [...current, extra] : current.filter((item) => item !== extra)))}
            />
            <span>{EXTRA_LABELS[extra]}</span>
          </label>
        ))}
      </fieldset>

      <fieldset className="tw-chips">
        <legend>When should Ben start?</legend>
        {(Object.keys(TIMING_LABELS) as Timing[]).map((option) => (
          <label key={option} className="tw-chip">
            <input type="radio" name="timing" value={option} checked={timing === option} onChange={() => setTiming(option)} />
            <span>{TIMING_LABELS[option]}</span>
          </label>
        ))}
      </fieldset>

      <div className="tw-field">
        <label htmlFor={`${id}-notes`}>Notes <span>Optional</span></label>
        <textarea id={`${id}-notes`} name="notes" rows={3} maxLength={2000} placeholder="Gate code, dog in the back yard, areas to skip…" value={notes} onChange={(event) => setNotes(event.target.value)} />
      </div>

      {/* Honeypot: off-screen, never focusable, so only bots fill it. */}
      <div className="tw-honeypot" aria-hidden="true">
        <label htmlFor={`${id}-company`}>Company</label>
        <input id={`${id}-company`} name="company" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      {outcome?.kind === 'out_of_range' && (
        <p className="tw-request-alert" role="alert">
          {outcome.range ? `This address is about ${outcome.range.miles} miles away, outside the ${outcome.range.radiusMiles}-mile service area.` : ERROR_TEXT.out_of_range} Call or text {business.phone} to ask about it.
        </p>
      )}
      {outcome?.kind === 'error' && <p className="tw-request-alert" role="alert">{ERROR_TEXT[outcome.code]}</p>}

      <button type="submit" className="tw-button tw-button-lime tw-request-submit" disabled={sending}>
        {sending ? 'Sending…' : 'Request service'}
      </button>
      <p className="tw-request-fine">No payment now. Ben confirms your price before the first mow.</p>
    </form>
  )
}
