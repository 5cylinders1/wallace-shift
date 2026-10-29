import { useEffect, useId, useRef, useState, type FormEvent, type InvalidEvent } from 'react'

type Field = 'name' | 'email' | 'phone' | 'vehicle' | 'service' | 'date'
type RequestDetails = Record<Field, string>

const EMPTY_REQUEST: RequestDetails = { name: '', email: '', phone: '', vehicle: '', service: '', date: '' }

function localToday() {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/** This demo deliberately has no API call or persistent storage. The studio's
 * contact endpoint is not the shop's inbox and must not receive these details. */
export default function BucyrusAppointment() {
  const id = useId()
  const [details, setDetails] = useState<RequestDetails>(EMPTY_REQUEST)
  const [errors, setErrors] = useState<Partial<RequestDetails>>({})
  const [preview, setPreview] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)
  const resultRef = useRef<HTMLDivElement>(null)
  const restoreFocus = useRef(false)

  useEffect(() => {
    if (preview) resultRef.current?.focus()
    else if (restoreFocus.current) nameRef.current?.focus()
  }, [preview])

  function update(field: Field, value: string) {
    setDetails(previous => ({ ...previous, [field]: value }))
    setErrors(previous => ({ ...previous, [field]: undefined }))
  }

  function invalid(event: InvalidEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const input = event.currentTarget
    setErrors(previous => ({ ...previous, [input.name]: input.validationMessage }))
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const cleaned = Object.fromEntries(Object.entries(details).map(([key, value]) => [key, value.trim()])) as RequestDetails
    const nextErrors: Partial<RequestDetails> = {}
    if (!cleaned.name) nextErrors.name = 'Please enter your name.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned.email)) nextErrors.email = 'Please enter a valid email address.'
    if (!cleaned.vehicle) nextErrors.vehicle = 'Please enter your vehicle’s year, make and model.'
    if (!cleaned.service) nextErrors.service = 'Please tell us what your vehicle needs.'
    if (cleaned.date && cleaned.date < localToday()) nextErrors.date = 'Please choose today or a future date.'
    setErrors(nextErrors)
    setDetails(cleaned)
    const firstInvalid = Object.keys(nextErrors)[0]
    if (firstInvalid) {
      const input = event.currentTarget.elements.namedItem(firstInvalid)
      if (input instanceof HTMLElement) input.focus()
      return
    }
    restoreFocus.current = true
    setPreview(true)
  }

  function clear() {
    setDetails(EMPTY_REQUEST)
    setErrors({})
    restoreFocus.current = true
    setPreview(false)
    nameRef.current?.focus()
  }

  function fieldProps(field: Field) {
    return {
      id: `${id}-${field}`,
      name: field,
      value: details[field],
      'aria-invalid': Boolean(errors[field]),
      'aria-describedby': errors[field] ? `${id}-${field}-error` : field === 'date' ? `${id}-date-help` : undefined,
      onInvalid: invalid,
    }
  }

  function fieldError(field: Field) {
    return errors[field] && <span className="ba-error" id={`${id}-${field}-error`}>{errors[field]}</span>
  }

  return <div className="ba-form">
    <div className="ba-form-notice" id={`${id}-notice`}>
      <strong>Try the appointment demo</strong>
      <p>This form creates a preview in your browser. Details are not sent or saved. To request service, call <a href="tel:+19134209865">(913) 420-9865</a>.</p>
    </div>

    {preview ? <div className="ba-form-result" ref={resultRef} tabIndex={-1} aria-labelledby={`${id}-result`}>
      <h3 id={`${id}-result`}>Request preview ready. Nothing has been sent or booked.</h3>
      <p>Here’s how your appointment request would look. Call the shop to discuss service and confirm availability.</p>
      <dl className="ba-request-summary">
        <div><dt>Name</dt><dd>{details.name}</dd></div>
        <div><dt>Email</dt><dd>{details.email}</dd></div>
        {details.phone && <div><dt>Phone</dt><dd>{details.phone}</dd></div>}
        <div><dt>Vehicle</dt><dd>{details.vehicle}</dd></div>
        <div><dt>Service or concern</dt><dd>{details.service}</dd></div>
        <div><dt>Preferred date</dt><dd>{details.date ? new Date(`${details.date}T12:00:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Flexible'} — not confirmed</dd></div>
      </dl>
      <div className="ba-form-footer">
        <button type="button" className="ba-button" onClick={() => setPreview(false)}>Edit request <span aria-hidden="true">↗</span></button>
        <button type="button" className="ba-button-secondary" onClick={clear}>Clear details</button>
      </div>
    </div> : <form onSubmit={submit} aria-describedby={`${id}-notice`}>
      <p className="ba-required-note">Fields marked * are required.</p>
      <div className="ba-form-grid">
        <div className="ba-field">
          <label htmlFor={`${id}-name`}>Your name *</label>
          <input {...fieldProps('name')} ref={nameRef} type="text" autoComplete="name" required maxLength={120} onChange={event => update('name', event.target.value)} placeholder="First and last name" />
          {fieldError('name')}
        </div>
        <div className="ba-field">
          <label htmlFor={`${id}-email`}>Email address *</label>
          <input {...fieldProps('email')} type="email" autoComplete="email" required maxLength={200} onChange={event => update('email', event.target.value)} placeholder="you@example.com" />
          {fieldError('email')}
        </div>
        <div className="ba-field">
          <label htmlFor={`${id}-phone`}>Phone <span>(optional)</span></label>
          <input {...fieldProps('phone')} type="tel" autoComplete="tel" maxLength={40} onChange={event => update('phone', event.target.value)} placeholder="(913) 555-0123" />
          {fieldError('phone')}
        </div>
        <div className="ba-field">
          <label htmlFor={`${id}-date`}>Preferred date <span>(optional)</span></label>
          <input {...fieldProps('date')} type="date" min={localToday()} max="2099-12-31" onChange={event => update('date', event.target.value)} />
          <span className="ba-field-help" id={`${id}-date-help`}>A preference, not a confirmed appointment.</span>
          {fieldError('date')}
        </div>
        <div className="ba-field ba-field-wide">
          <label htmlFor={`${id}-vehicle`}>Your vehicle *</label>
          <input {...fieldProps('vehicle')} type="text" required maxLength={160} onChange={event => update('vehicle', event.target.value)} placeholder="Year, make and model" />
          {fieldError('vehicle')}
        </div>
        <div className="ba-field ba-field-wide">
          <label htmlFor={`${id}-service`}>What can we help with? *</label>
          <textarea {...fieldProps('service')} required maxLength={2000} rows={4} onChange={event => update('service', event.target.value)} placeholder="Tell us about a repair, maintenance that’s due, or a modification you have in mind." />
          {fieldError('service')}
        </div>
      </div>
      <div className="ba-form-footer">
        <button type="submit" className="ba-button">Preview appointment request <span aria-hidden="true">↗</span></button>
        <button type="button" className="ba-button-secondary" onClick={clear}>Clear form</button>
      </div>
      <p className="ba-form-fineprint">Demo only. No appointment is reserved, and no message is sent.</p>
    </form>}
  </div>
}
