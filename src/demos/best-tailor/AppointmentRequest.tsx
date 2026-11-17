import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { business } from './data'
import './appointment-request.css'

const garments = ['Wedding dress', 'Bridesmaid dress', 'Evening or occasion dress', 'Everyday clothing', 'Garment repair', 'Something else / not sure'] as const
type ContactMethod = 'phone' | 'email'
type Draft = {
  name: string
  contactMethod: ContactMethod
  phone: string
  email: string
  garment: string
  eventDate: string
  fittingDate: string
  notes: string
}
type Field = Exclude<keyof Draft, 'contactMethod'>
type Errors = Partial<Record<Field, string>>
const emptyDraft: Draft = { name: '', contactMethod: 'phone', phone: '', email: '', garment: '', eventDate: '', fittingDate: '', notes: '' }

function todayInKansas() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}

function dateValue(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const date = new Date(`${value}T12:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value ? date : null
}

function dateLabel(value: string) {
  return dateValue(value)?.toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) ?? value
}

function Arrow() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 12h15M13 5l7 7-7 7" /></svg>
}

/** A local preview only. No fetch, storage, message delivery, or reservation. */
export default function AppointmentRequest() {
  const id = useId()
  const [draft, setDraft] = useState<Draft>({ ...emptyDraft })
  const [errors, setErrors] = useState<Errors>({})
  const [reviewing, setReviewing] = useState(false)
  const formHeading = useRef<HTMLHeadingElement>(null)
  const reviewHeading = useRef<HTMLHeadingElement>(null)
  const errorSummary = useRef<HTMLDivElement>(null)
  const nextFocus = useRef<'form' | 'review' | 'errors' | null>(null)
  const today = todayInKansas()
  const fieldId = (field: Field) => `${id}-${field}`
  const errorId = (field: Field) => `${fieldId(field)}-error`

  useEffect(() => {
    const target = nextFocus.current
    nextFocus.current = null
    if (target === 'errors') errorSummary.current?.focus()
    if (target === 'review') reviewHeading.current?.focus()
    if (target === 'form') formHeading.current?.focus()
  }, [errors, reviewing])

  function update<K extends keyof Draft>(field: K, value: Draft[K]) {
    setDraft(current => ({ ...current, [field]: value }))
    setErrors(current => {
      const next = { ...current }
      if (field === 'contactMethod') { delete next.phone; delete next.email }
      else delete next[field as Field]
      if (field === 'eventDate') delete next.fittingDate
      return next
    })
  }

  function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next: Errors = {}
    if (!draft.name.trim()) next.name = 'Enter your name.'
    if (draft.contactMethod === 'phone') {
      const digits = draft.phone.replace(/\D/g, '')
      if (!/^[+\d().\s-]+$/.test(draft.phone.trim()) || !(digits.length === 10 || (digits.length === 11 && digits.startsWith('1')))) next.phone = 'Enter a 10-digit phone number, including the area code.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim())) next.email = 'Enter an email address like name@example.com.'
    if (!(garments as readonly string[]).includes(draft.garment)) next.garment = 'Choose your garment, or “Something else / not sure”.'
    const currentDay = todayInKansas()
    if (draft.eventDate && (!dateValue(draft.eventDate) || draft.eventDate < currentDay)) next.eventDate = 'Choose today or a future event date, or leave it blank.'
    if (draft.fittingDate) {
      const date = dateValue(draft.fittingDate)
      if (!date || draft.fittingDate < currentDay) next.fittingDate = 'Choose today or a future fitting date, or leave it blank.'
      else if ([0, 6].includes(date.getUTCDay())) next.fittingDate = 'Choose a weekday. The shop is closed on Saturday and Sunday.'
      else if (draft.eventDate && !next.eventDate && draft.fittingDate > draft.eventDate) next.fittingDate = 'Choose a fitting date on or before your event, or leave it blank.'
    }
    nextFocus.current = Object.keys(next).length ? 'errors' : 'review'
    setErrors(next)
    if (!Object.keys(next).length) setReviewing(true)
  }

  function edit() {
    nextFocus.current = 'form'
    setReviewing(false)
  }

  function clear() {
    nextFocus.current = 'form'
    setDraft({ ...emptyDraft })
    setErrors({})
    setReviewing(false)
  }

  function describedBy(field: Field, hint?: string) {
    return [hint, errors[field] ? errorId(field) : ''].filter(Boolean).join(' ') || undefined
  }

  const fieldError = (field: Field) => errors[field] ? <p className="bt-fitting-error" id={errorId(field)}>{errors[field]}</p> : null

  return <section className="bt-fitting" id="request-fitting" aria-labelledby={`${id}-title`}>
    <div className="bt-container bt-fitting-layout">
      <div className="bt-fitting-intro">
        <h2 id={`${id}-title`}>Request a fitting.</h2>
        <p>A dress for a special day. A favorite that needs a little care. Start with the details that matter to you.</p>
        <p>Fittings are by appointment only. Sue confirms the time and the work with you.</p>
        <div className="bt-fitting-call"><span>Prefer a conversation?</span><a href={business.phoneHref}>Call {business.phone} <Arrow /></a></div>
      </div>

      {reviewing ? <div className="bt-fitting-review" aria-labelledby={`${id}-review-title`}>
        <h3 ref={reviewHeading} id={`${id}-review-title`} tabIndex={-1}>Your fitting details.</h3>
        <p className="bt-fitting-notice"><strong>Nothing has been sent or booked.</strong> This is a preview request. Call Sue to arrange your fitting.</p>
        <dl className="bt-fitting-summary">
          <div><dt>Your name</dt><dd>{draft.name.trim()}</dd></div>
          <div><dt>{draft.contactMethod === 'phone' ? 'Phone number' : 'Email address'}</dt><dd>{draft[draft.contactMethod].trim()}</dd></div>
          <div><dt>Garment or service</dt><dd>{draft.garment}</dd></div>
          <div><dt>Event date</dt><dd>{draft.eventDate ? dateLabel(draft.eventDate) : 'No event date specified'}</dd></div>
          <div><dt>Preferred fitting day</dt><dd>{draft.fittingDate ? dateLabel(draft.fittingDate) : 'Flexible'}<small>A preference, subject to Sue’s confirmation.</small></dd></div>
          {draft.notes.trim() && <div><dt>A little more about your piece</dt><dd>{draft.notes.trim()}</dd></div>}
        </dl>
        <div className="bt-fitting-actions"><a className="bt-fitting-primary" href={business.phoneHref}>Call Sue to arrange a fitting <Arrow /></a><button className="bt-fitting-text-button" type="button" onClick={edit}>Edit details</button><button className="bt-fitting-text-button" type="button" onClick={clear}>Clear details</button></div>
        <p className="bt-fitting-footnote">These details have not been saved or sent. You can edit or clear them here.</p>
      </div> : <form className="bt-fitting-form" onSubmit={review} noValidate aria-labelledby={`${id}-form-title`}>
        <h3 ref={formHeading} id={`${id}-form-title`} tabIndex={-1}>Tell us about your piece.</h3>
        <p className="bt-fitting-notice"><strong>Try the request form.</strong> Nothing is sent or booked. Use sample details to explore, then call Sue for an appointment.</p>
        {Object.keys(errors).length > 0 && <div className="bt-fitting-error-summary" ref={errorSummary} tabIndex={-1} role="alert" aria-labelledby={`${id}-error-title`}>
          <h4 id={`${id}-error-title`}>A few details need your attention.</h4>
          <ul>{Object.entries(errors).map(([field, message]) => <li key={field}><a href={`#${fieldId(field as Field)}`} onClick={event => { event.preventDefault(); document.getElementById(fieldId(field as Field))?.focus() }}>{message}</a></li>)}</ul>
        </div>}
        <div className="bt-fitting-fields">
          <div className="bt-fitting-field bt-fitting-field-wide"><label htmlFor={fieldId('name')}>Your name <span>(required)</span></label><input id={fieldId('name')} name="name" autoComplete="name" value={draft.name} maxLength={120} onChange={event => update('name', event.target.value)} required aria-invalid={Boolean(errors.name)} aria-describedby={describedBy('name')} />{fieldError('name')}</div>
          <fieldset className="bt-fitting-contact bt-fitting-field-wide"><legend>How would you like to be contacted?</legend><div className="bt-fitting-contact-options">{(['phone', 'email'] as const).map(method => <label key={method}><input type="radio" name={`${id}-contact-method`} value={method} checked={draft.contactMethod === method} onChange={() => update('contactMethod', method)} />{method === 'phone' ? 'Phone call' : 'Email'}</label>)}</div></fieldset>
          <div className="bt-fitting-field bt-fitting-field-wide"><label htmlFor={fieldId(draft.contactMethod)}>{draft.contactMethod === 'phone' ? 'Phone number' : 'Email address'} <span>(required)</span></label><input key={draft.contactMethod} id={fieldId(draft.contactMethod)} name={draft.contactMethod} type={draft.contactMethod === 'phone' ? 'tel' : 'email'} autoComplete={draft.contactMethod === 'phone' ? 'tel' : 'email'} inputMode={draft.contactMethod === 'phone' ? 'tel' : 'email'} maxLength={draft.contactMethod === 'phone' ? 40 : 254} value={draft[draft.contactMethod]} onChange={event => update(draft.contactMethod, event.target.value)} required aria-invalid={Boolean(errors[draft.contactMethod])} aria-describedby={describedBy(draft.contactMethod)} />{fieldError(draft.contactMethod)}</div>
          <div className="bt-fitting-field bt-fitting-field-wide"><label htmlFor={fieldId('garment')}>Garment or service <span>(required)</span></label><select id={fieldId('garment')} name="garment" value={draft.garment} onChange={event => update('garment', event.target.value)} required aria-invalid={Boolean(errors.garment)} aria-describedby={describedBy('garment')}><option value="">Choose your piece</option>{garments.map(garment => <option key={garment} value={garment}>{garment}</option>)}</select>{fieldError('garment')}</div>
          <div className="bt-fitting-field"><label htmlFor={fieldId('eventDate')}>Event date <span>(optional)</span></label><input id={fieldId('eventDate')} name="event-date" type="date" min={today} value={draft.eventDate} onChange={event => update('eventDate', event.target.value)} aria-invalid={Boolean(errors.eventDate)} aria-describedby={describedBy('eventDate')} />{fieldError('eventDate')}</div>
          <div className="bt-fitting-field"><label htmlFor={fieldId('fittingDate')}>Preferred fitting day <span>(optional)</span></label><input id={fieldId('fittingDate')} name="fitting-date" type="date" min={today} value={draft.fittingDate} onChange={event => update('fittingDate', event.target.value)} aria-invalid={Boolean(errors.fittingDate)} aria-describedby={describedBy('fittingDate', `${id}-date-hint`)} />{fieldError('fittingDate')}</div>
          <p className="bt-fitting-date-hint bt-fitting-field-wide" id={`${id}-date-hint`}>Monday–Friday, by appointment. Your preferred day is not a reserved time.</p>
          <div className="bt-fitting-field bt-fitting-field-wide"><label htmlFor={fieldId('notes')}>A little more about your piece <span>(optional)</span></label><textarea id={fieldId('notes')} name="notes" rows={3} maxLength={1500} value={draft.notes} onChange={event => update('notes', event.target.value)} placeholder="What would you like to change about the fit?" /></div>
        </div>
        <div className="bt-fitting-actions"><button type="submit" className="bt-fitting-primary">Review fitting request <Arrow /></button><button type="button" className="bt-fitting-text-button" onClick={clear}>Clear details</button></div>
        <p className="bt-fitting-footnote">Preview only. Your details stay on this page and are not saved or sent.</p>
      </form>}
    </div>
  </section>
}
