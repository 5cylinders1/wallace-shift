import { useEffect, useId, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { links, practice, symptoms } from './content'
import { WINDOWS, bookableDays } from './schedule'
import { submitVisit, type SubmitResult } from './submit'
import { Arrow } from './ui'

const REASONS = [...symptoms.map((s) => s.label), 'Wellness check-up', 'Sports injury', 'Auto accident', 'Something else']
const PATIENTS = ['Me', 'My child', 'Me, and I’m pregnant'] as const

const validPhone = (v: string) => {
  const d = v.replace(/\D/g, '')
  return d.length === 10 || (d.length === 11 && d.startsWith('1'))
}
const validEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim())

function Field({ label, error, optional, children }: { label: string; error?: string; optional?: boolean; children: (p: { id: string; 'aria-invalid'?: true; 'aria-describedby'?: string }) => ReactNode }) {
  const id = useId()
  return (
    <div className="dp-field" data-invalid={error ? true : undefined}>
      <label htmlFor={id}>{label}{optional && <span className="dp-optional"> (optional)</span>}</label>
      {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': error ? `${id}-e` : undefined })}
      {error && <p className="dp-error" id={`${id}-e`}>{error}</p>}
    </div>
  )
}

type Errors = Partial<Record<'reason' | 'day' | 'first' | 'last' | 'phone' | 'email' | 'newPatient', string>>

export default function Booking({ reason, setReason }: { reason: string; setReason: (r: string) => void }) {
  const days = useMemo(() => bookableDays(3), [])
  const form = useRef<HTMLFormElement>(null)
  const result = useRef<HTMLDivElement>(null)
  const [patient, setPatient] = useState<string>(PATIENTS[0])
  const [newPatient, setNewPatient] = useState('')
  const [day, setDay] = useState('')
  const [window_, setWindow] = useState<string>('any')
  const [first, setFirst] = useState('')
  const [last, setLast] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [accident, setAccident] = useState(false)
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState<Errors>({})
  const [sending, setSending] = useState(false)
  const [outcome, setOutcome] = useState<SubmitResult | null>(null)

  useEffect(() => { if (outcome) result.current?.focus() }, [outcome])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const next: Errors = {}
    if (!reason) next.reason = 'Choose what you’re coming in for.'
    if (!newPatient) next.newPatient = 'Let us know if you’ve been in before.'
    if (!day) next.day = 'Choose a day.'
    if (!first.trim()) next.first = 'Please add a first name.'
    if (!last.trim()) next.last = 'Please add a last name.'
    if (!validPhone(phone)) next.phone = 'Please enter a 10-digit phone number.'
    if (email.trim() && !validEmail(email)) next.email = 'That email address looks incomplete.'
    setErrors(next)
    if (Object.keys(next).length) {
      window.requestAnimationFrame(() => form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
      return
    }
    setSending(true)
    const response = await submitVisit({
      reason, patient, newPatient, day: days.find((d) => d.iso === day)?.label ?? day,
      window: WINDOWS.find((w) => w.id === window_)?.label ?? window_, firstName: first, lastName: last, phone, email, autoAccident: accident, notes,
    })
    setSending(false)
    setOutcome(response)
  }

  const reset = () => {
    setOutcome(null); setDay(''); setWindow('any'); setNotes(''); setErrors({})
  }

  return (
    <section id="book" className="dp-section dp-book" aria-labelledby="book-title">
      <div className="dp-wrap dp-book-grid">
        <div className="dp-book-intro" data-rise>
          <p className="dp-eyebrow">Book a visit</p>
          <h2 id="book-title" className="dp-h2">Tell us what’s going on. <span>We’ll find a time.</span></h2>
          <p className="dp-lede">Request a time below and the office will confirm it with you. Prefer to pick a slot yourself? Dopps Chiropractic also books online.</p>
          <div className="dp-book-links">
            <a className="dp-btn dp-btn--outline" href={links.square} target="_blank" rel="noopener noreferrer">Book instantly online <Arrow /></a>
            <a className="dp-book-call" href={practice.phoneHref}>or call {practice.phone}</a>
          </div>
          <p className="dp-book-note">Open Monday, Wednesday and Friday, 9 a.m. to 7 p.m.</p>
        </div>

        <div className="dp-book-panel" data-rise>
          {outcome ? (
            <div ref={result} className="dp-result" tabIndex={-1} role="status">
              {outcome.status === 'demo' && (
                <>
                  <p className="dp-result-label">Preview only</p>
                  <p className="dp-result-title">Your request was not sent.</p>
                  <p>This page is a preview of a new Dopps Chiropractic website and this form isn’t connected yet. To book now, use the practice’s online scheduler or call.</p>
                  <div className="dp-actions">
                    <a className="dp-btn dp-btn--dark" href={links.square} target="_blank" rel="noopener noreferrer">Book online <Arrow /></a>
                    <a className="dp-btn dp-btn--outline" href={practice.phoneHref}>Call {practice.phone}</a>
                  </div>
                </>
              )}
              {outcome.status === 'sent' && <p className="dp-result-title">Thanks, {first}. The office will be in touch to confirm your time.</p>}
              {outcome.status === 'error' && <p className="dp-result-title">That didn’t go through. Please call {practice.phone}.</p>}
              <button type="button" className="dp-link-btn" onClick={reset}>Start over</button>
            </div>
          ) : (
            <form ref={form} className="dp-form" onSubmit={submit} noValidate aria-label="Request a visit">
              <Field label="What’s the visit for?" error={errors.reason}>
                {(p) => (
                  <select {...p} value={reason} onChange={(e) => setReason(e.target.value)}>
                    <option value="">Choose one</option>
                    {REASONS.map((r) => <option key={r}>{r}</option>)}
                  </select>
                )}
              </Field>

              <div className="dp-field-row">
                <Field label="Who is it for?">
                  {(p) => (
                    <select {...p} value={patient} onChange={(e) => setPatient(e.target.value)}>
                      {PATIENTS.map((x) => <option key={x}>{x}</option>)}
                    </select>
                  )}
                </Field>
                <fieldset className="dp-fieldset" aria-describedby={errors.newPatient ? 'np-e' : undefined}>
                  <legend>Been here before?</legend>
                  <div className="dp-chips">
                    {['New patient', 'Returning'].map((v) => (
                      <label key={v} className="dp-chip" data-on={newPatient === v || undefined}>
                        <input type="radio" name="np" value={v} checked={newPatient === v} aria-invalid={errors.newPatient ? true : undefined} onChange={() => setNewPatient(v)} />
                        {v}
                      </label>
                    ))}
                  </div>
                  {errors.newPatient && <p className="dp-error" id="np-e">{errors.newPatient}</p>}
                </fieldset>
              </div>

              <fieldset className="dp-fieldset" aria-describedby={errors.day ? 'day-e' : 'day-h'}>
                <legend>Preferred day</legend>
                <p className="dp-hint" id="day-h">The office is open Monday, Wednesday and Friday.</p>
                <div className="dp-days">
                  {days.map((d) => (
                    <label key={d.iso} className="dp-day" data-on={day === d.iso || undefined}>
                      <input type="radio" name="day" value={d.iso} checked={day === d.iso} aria-label={d.label} aria-invalid={errors.day ? true : undefined} onChange={() => setDay(d.iso)} />
                      <span aria-hidden="true">{d.short}</span>
                      <strong aria-hidden="true">{d.date}</strong>
                      <span aria-hidden="true">{d.month}</span>
                    </label>
                  ))}
                </div>
                {errors.day && <p className="dp-error" id="day-e">{errors.day}</p>}
              </fieldset>

              <fieldset className="dp-fieldset">
                <legend>Time of day</legend>
                <div className="dp-chips">
                  {WINDOWS.map((w) => (
                    <label key={w.id} className="dp-chip" data-on={window_ === w.id || undefined}>
                      <input type="radio" name="window" value={w.id} checked={window_ === w.id} onChange={() => setWindow(w.id)} />
                      {w.label}
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="dp-field-row">
                <Field label="First name" error={errors.first}>{(p) => <input {...p} autoComplete="given-name" value={first} onChange={(e) => setFirst(e.target.value)} />}</Field>
                <Field label="Last name" error={errors.last}>{(p) => <input {...p} autoComplete="family-name" value={last} onChange={(e) => setLast(e.target.value)} />}</Field>
              </div>
              <div className="dp-field-row">
                <Field label="Mobile phone" error={errors.phone}>{(p) => <input {...p} type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />}</Field>
                <Field label="Email" optional error={errors.email}>{(p) => <input {...p} type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />}</Field>
              </div>

              <label className="dp-check">
                <input type="checkbox" checked={accident} onChange={(e) => setAccident(e.target.checked)} />
                <span>This is about an auto accident</span>
              </label>

              <Field label="Anything Dr. Rory should know?" optional>
                {(p) => <textarea {...p} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="When it started, what makes it better or worse" />}
              </Field>

              <button type="submit" className="dp-btn dp-btn--dark dp-btn--block" disabled={sending}>{sending ? 'Sending…' : 'Request this visit'} <Arrow /></button>
              <p className="dp-form-note">Please don’t include detailed medical history here. In an emergency, call 911.</p>
            </form>
          )}
        </div>
      </div>
    </section>
  )
}
