import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { hoursTable, salon, services } from './content'
import type { Draft, Step } from './draft'
import { bookableDays, dayLabel, windowsFor } from './schedule'
import { submitBooking, type SubmitResult } from './submit'
import { Arrow, Check, Field, NotSent } from './ui'
import { focusFirstError, validEmail, validPhone } from './validate'

const STEPS = ['Services', 'Day & time', 'Your details', 'Review'] as const
const HISTORY = ['No color in the last year', 'Salon color', 'Box dye or color at home', 'Lightener, highlights or balayage', 'Not sure'] as const
const CONTACT = ['Call', 'Text', 'Email'] as const

interface Details {
  firstName: string
  lastName: string
  phone: string
  email: string
  visited: string
  colorHistory: string
  contact: string
  notes: string
}

const emptyDetails: Details = { firstName: '', lastName: '', phone: '', email: '', visited: '', colorHistory: '', contact: 'Call', notes: '' }

type Errors = Partial<Record<keyof Details | 'services' | 'day' | 'window', string>>

interface Props {
  draft: Draft
  setDraft: (update: (draft: Draft) => Draft) => void
  step: Step
  setStep: (step: Step) => void
}

export default function Booking({ draft, setDraft, step, setStep }: Props) {
  const days = useMemo(() => bookableDays(14), [])
  const [details, setDetails] = useState<Details>(emptyDetails)
  const [errors, setErrors] = useState<Errors>({})
  const [sending, setSending] = useState(false)
  const [outcome, setOutcome] = useState<SubmitResult | null>(null)
  const form = useRef<HTMLFormElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const mounted = useRef(false)

  // Each step announces itself: focus its heading after the first render.
  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return }
    heading.current?.focus({ preventScroll: true })
  }, [step, outcome])

  const selectedDay = days.find((d) => d.iso === draft.day)
  const windows = selectedDay ? windowsFor(selectedDay.weekday) : []
  const chosen = services.filter((s) => draft.services.includes(s.id))
  const windowLabel = windows.find((w) => w.id === draft.window)?.label ?? ''

  const set = <K extends keyof Details>(key: K, value: Details[K]) => setDetails((d) => ({ ...d, [key]: value }))

  const toggleService = (id: string) =>
    setDraft((d) => ({ ...d, services: d.services.includes(id) ? d.services.filter((s) => s !== id) : [...d.services, id] }))

  const validateStep = (current: Step): Errors => {
    const next: Errors = {}
    if (current === 1 && draft.services.length === 0) next.services = 'Choose at least one service. Not sure? Pick “Color consultation”.'
    if (current === 2) {
      if (!draft.day) next.day = 'Choose a day.'
      else if (!draft.window) next.window = 'Choose a time of day.'
    }
    if (current === 3) {
      if (!details.firstName.trim()) next.firstName = 'Please add your first name.'
      if (!details.lastName.trim()) next.lastName = 'Please add your last name.'
      if (!validPhone(details.phone)) next.phone = 'Please enter a 10-digit phone number.'
      if (details.email.trim() && !validEmail(details.email)) next.email = 'That email address looks incomplete.'
      if (details.contact === 'Email' && !details.email.trim()) next.email = 'Add an email, or choose call or text.'
      if (!details.visited) next.visited = 'Let Lara know if you’ve been in before.'
    }
    return next
  }

  const advance = (event: FormEvent) => {
    event.preventDefault()
    const next = validateStep(step)
    setErrors(next)
    if (Object.keys(next).length) {
      focusFirstError(form.current)
      return
    }
    if (step < 4) setStep((step + 1) as Step)
    else void send()
  }

  const send = async () => {
    setSending(true)
    const response = await submitBooking({
      services: chosen.map((s) => s.name),
      day: dayLabel(draft.day),
      window: windowLabel,
      ...details,
    })
    setSending(false)
    setOutcome(response)
  }

  const restart = () => {
    setDraft(() => ({ services: [], day: '', window: '' }))
    setDetails(emptyDetails)
    setErrors({})
    setOutcome(null)
    setStep(1)
  }

  return (
    <section id="book" className="sl-section sl-book" aria-labelledby="book-title">
      <div className="sl-wrap sl-book-grid">
        <div className="sl-book-intro" data-rise>
          <p className="sl-eyebrow">Book a visit</p>
          <h2 id="book-title" className="sl-h2">Choose a time. <em>Lara confirms it.</em></h2>
          <p className="sl-lede">
            Pick your services and a time that suits you, and Lara will get back to you to
            confirm. Nothing is booked until she does.
          </p>
          <dl className="sl-book-facts">
            {hoursTable.map((row) => (
              <div key={row.days}><dt>{row.days}</dt><dd>{row.hours}</dd></div>
            ))}
          </dl>
          <p className="sl-book-call">Rather talk it through? Call <a href={salon.phoneHref}>{salon.phone}</a>.</p>
        </div>

        <div className="sl-book-panel" data-rise>
          <ol className="sl-steps" aria-label="Booking progress">
            {STEPS.map((label, i) => {
              const n = (i + 1) as Step
              const state = outcome ? 'done' : n < step ? 'done' : n === step ? 'current' : 'todo'
              return (
                <li key={label} data-state={state} aria-current={state === 'current' ? 'step' : undefined}>
                  <span className="sl-step-dot" aria-hidden="true">{state === 'done' ? <Check /> : n}</span>
                  <span className="sl-step-label">{label}</span>
                </li>
              )
            })}
          </ol>

          {outcome ? (
            <div className="sl-form-result">
              <h3 ref={heading} tabIndex={-1} className="sl-h3 sl-visually-hidden">Request result</h3>
              {outcome.status === 'demo' && <NotSent what="booking request" onReset={restart} />}
              {outcome.status === 'sent' && (
                <div className="sl-sent" role="status">
                  <p className="sl-notsent-title">Request sent. Lara will be in touch to confirm.</p>
                  <button type="button" className="sl-link-btn" onClick={restart}>Book something else</button>
                </div>
              )}
              {outcome.status === 'error' && (
                <div className="sl-notsent" role="alert">
                  <p className="sl-notsent-title">That didn’t go through. Please try again or call {salon.phone}.</p>
                  <button type="button" className="sl-link-btn" onClick={() => setOutcome(null)}>Back to review</button>
                </div>
              )}
            </div>
          ) : (
            <form ref={form} className="sl-form sl-book-form" onSubmit={advance} noValidate aria-labelledby="book-step-title">
              <h3 id="book-step-title" ref={heading} tabIndex={-1} className="sl-h3">
                <span className="sl-step-count">Step {step} of 4</span>
                {step === 1 && 'What would you like?'}
                {step === 2 && 'When suits you?'}
                {step === 3 && 'A little about you'}
                {step === 4 && 'Check your request'}
              </h3>

              {step === 1 && (
                <fieldset className="sl-fieldset" aria-describedby={errors.services ? 'svc-error' : 'svc-hint'}>
                  <legend className="sl-visually-hidden">Services</legend>
                  <p id="svc-hint" className="sl-hint">Choose as many as you need.</p>
                  <div className="sl-service-picks">
                    {services.map((s) => {
                      const on = draft.services.includes(s.id)
                      return (
                        <label key={s.id} className="sl-pick" data-on={on || undefined}>
                          <input type="checkbox" checked={on} onChange={() => toggleService(s.id)} aria-invalid={errors.services ? true : undefined} />
                          <span className="sl-pick-box" aria-hidden="true"><Check /></span>
                          <span className="sl-pick-text">
                            <span className="sl-pick-name">{s.name}</span>
                            <span className="sl-pick-line">{s.line}</span>
                          </span>
                        </label>
                      )
                    })}
                  </div>
                  {errors.services && <p id="svc-error" className="sl-error">{errors.services}</p>}
                </fieldset>
              )}

              {step === 2 && (
                <>
                  <fieldset className="sl-fieldset" aria-describedby={errors.day ? 'day-error' : undefined}>
                    <legend className="sl-legend">Day</legend>
                    <div className="sl-days">
                      {days.map((d) => (
                        <label key={d.iso} className="sl-day" data-on={draft.day === d.iso || undefined}>
                          <input
                            type="radio"
                            name="day"
                            value={d.iso}
                            checked={draft.day === d.iso}
                            aria-invalid={errors.day ? true : undefined}
                            aria-label={d.label}
                            onChange={() => setDraft((x) => ({ ...x, day: d.iso, window: x.day === d.iso ? x.window : '' }))}
                          />
                          <span className="sl-day-name" aria-hidden="true">{d.short}</span>
                          <span className="sl-day-date" aria-hidden="true">{d.date}</span>
                          <span className="sl-day-month" aria-hidden="true">{d.month}</span>
                        </label>
                      ))}
                    </div>
                    {errors.day && <p id="day-error" className="sl-error">{errors.day}</p>}
                  </fieldset>

                  <fieldset className="sl-fieldset" disabled={!selectedDay} aria-describedby={errors.window ? 'win-error' : 'win-hint'}>
                    <legend className="sl-legend">Time of day{selectedDay ? `, ${selectedDay.label}` : ''}</legend>
                    {!selectedDay && <p id="win-hint" className="sl-hint">Choose a day first.</p>}
                    {selectedDay && <p id="win-hint" className="sl-hint">These are preferences. Lara confirms the exact start time.</p>}
                    <div className="sl-windows">
                      {windows.map((w) => (
                        <label key={w.id} className="sl-chip" data-on={draft.window === w.id || undefined}>
                          <input type="radio" name="window" value={w.id} checked={draft.window === w.id} aria-invalid={errors.window ? true : undefined} onChange={() => setDraft((x) => ({ ...x, window: w.id }))} />
                          {w.label}
                        </label>
                      ))}
                    </div>
                    {errors.window && <p id="win-error" className="sl-error">{errors.window}</p>}
                  </fieldset>
                </>
              )}

              {step === 3 && (
                <>
                  <div className="sl-field-row">
                    <Field label="First name" error={errors.firstName}>
                      {(p) => <input {...p} type="text" autoComplete="given-name" value={details.firstName} onChange={(e) => set('firstName', e.target.value)} />}
                    </Field>
                    <Field label="Last name" error={errors.lastName}>
                      {(p) => <input {...p} type="text" autoComplete="family-name" value={details.lastName} onChange={(e) => set('lastName', e.target.value)} />}
                    </Field>
                  </div>
                  <div className="sl-field-row">
                    <Field label="Mobile phone" error={errors.phone}>
                      {(p) => <input {...p} type="tel" autoComplete="tel" inputMode="tel" value={details.phone} onChange={(e) => set('phone', e.target.value)} />}
                    </Field>
                    <Field label="Email" optional={details.contact !== 'Email'} error={errors.email}>
                      {(p) => <input {...p} type="email" autoComplete="email" inputMode="email" value={details.email} onChange={(e) => set('email', e.target.value)} />}
                    </Field>
                  </div>

                  <fieldset className="sl-fieldset" aria-describedby={errors.visited ? 'visited-error' : undefined}>
                    <legend className="sl-legend">Have you been to SoLara before?</legend>
                    <div className="sl-windows">
                      {['Yes, I’m a returning client', 'No, this is my first visit'].map((v) => (
                        <label key={v} className="sl-chip" data-on={details.visited === v || undefined}>
                          <input type="radio" name="visited" value={v} checked={details.visited === v} aria-invalid={errors.visited ? true : undefined} onChange={() => set('visited', v)} />
                          {v}
                        </label>
                      ))}
                    </div>
                    {errors.visited && <p id="visited-error" className="sl-error">{errors.visited}</p>}
                  </fieldset>

                  <Field label="Color in the last 12 months" optional hint="It helps Lara plan the right time and products for your hair.">
                    {(p) => (
                      <select {...p} value={details.colorHistory} onChange={(e) => set('colorHistory', e.target.value)}>
                        <option value="">Choose one</option>
                        {HISTORY.map((h) => <option key={h}>{h}</option>)}
                      </select>
                    )}
                  </Field>

                  <fieldset className="sl-fieldset">
                    <legend className="sl-legend">Best way to confirm</legend>
                    <div className="sl-windows">
                      {CONTACT.map((c) => (
                        <label key={c} className="sl-chip" data-on={details.contact === c || undefined}>
                          <input type="radio" name="contact" value={c} checked={details.contact === c} onChange={() => set('contact', c)} />
                          {c}
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <Field label="Anything else?" optional hint="The look you’re after, a photo you love, or timing that matters.">
                    {(p) => <textarea {...p} rows={3} value={details.notes} onChange={(e) => set('notes', e.target.value)} />}
                  </Field>
                </>
              )}

              {step === 4 && (
                <dl className="sl-summary">
                  <div>
                    <dt>Services</dt>
                    <dd>{chosen.map((s) => s.name).join(', ')}</dd>
                    <button type="button" className="sl-link-btn" onClick={() => setStep(1)}>Change<span className="sl-visually-hidden"> services</span></button>
                  </div>
                  <div>
                    <dt>When</dt>
                    <dd>{dayLabel(draft.day)}, {windowLabel.toLowerCase().startsWith('any') ? 'any time' : windowLabel}</dd>
                    <button type="button" className="sl-link-btn" onClick={() => setStep(2)}>Change<span className="sl-visually-hidden"> day and time</span></button>
                  </div>
                  <div>
                    <dt>You</dt>
                    <dd>
                      {details.firstName} {details.lastName}<br />
                      {details.phone}{details.email ? ` · ${details.email}` : ''}<br />
                      Prefers: {details.contact.toLowerCase()} · {details.visited.startsWith('Yes') ? 'Returning client' : 'First visit'}
                      {details.colorHistory && <><br />Color history: {details.colorHistory.toLowerCase()}</>}
                    </dd>
                    <button type="button" className="sl-link-btn" onClick={() => setStep(3)}>Change<span className="sl-visually-hidden"> your details</span></button>
                  </div>
                  {details.notes && (
                    <div>
                      <dt>Notes</dt>
                      <dd>{details.notes}</dd>
                    </div>
                  )}
                </dl>
              )}

              <div className="sl-form-actions">
                {step > 1 && <button type="button" className="sl-btn sl-btn--ghost-dark" onClick={() => { setErrors({}); setStep((step - 1) as Step) }}>Back</button>}
                <button type="submit" className="sl-btn sl-btn--dark" disabled={sending}>
                  {step < 4 ? 'Continue' : sending ? 'Sending…' : 'Request this time'} <Arrow />
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  )
}
