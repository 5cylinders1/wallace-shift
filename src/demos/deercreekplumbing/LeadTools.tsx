import { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore, type FormEvent } from 'react'
import { href, services } from './data'

const phone = '(913) 440-9102'
const phoneHref = 'tel:+19134409102'
const email = 'deercreekplumbinginc@gmail.com'

/** These are town/ZIP associations, not a geofence or a promise of coverage. */
function locationMessage(value: string) {
  const query = value.trim().toLowerCase().replace(/[,.’']/g, '').replace(/\s+(ks|kansas|mo|missouri)$/, '')
  if (!query) return 'Enter a town or a five digit ZIP code to check.'
  const named: Record<string, string> = { olathe: 'Olathe', '66061': 'Olathe', '66062': 'Olathe', paola: 'Paola', '66071': 'Paola', louisburg: 'Louisburg', '66053': 'Louisburg' }
  if (named[query]) return `${named[query]} is named in Deer Creek’s advertised service area. The office still needs to confirm your exact address and availability.`
  const metro = ['kansas city', 'overland park', 'lenexa', 'shawnee', 'leawood', 'gardner', 'spring hill', 'lees summit', 'independence', 'belton', 'raymore', 'mission', 'prairie village']
  if (metro.includes(query)) return 'That town is in the Kansas City metro. Deer Creek advertises metro service, but the office must confirm coverage for your address.'
  return 'This checker cannot confirm that location. Call or email the office with your town and address to ask about coverage. This is not a decision that your address is outside the service area.'
}

export function AreaChecker() {
  const id = useId()
  const [query, setQuery] = useState('')
  const [result, setResult] = useState('')
  function check(event: FormEvent) { event.preventDefault(); setResult(locationMessage(query)) }
  return <div className="dcp-checker">
    <form onSubmit={check} aria-label="Service area checker">
      <label htmlFor={`${id}-location`}>Your town or ZIP code</label>
      <p className="dcp-field-hint" id={`${id}-hint`}>For example, Olathe or 66062. The office confirms all coverage.</p>
      <div className="dcp-checker-row">
        <input id={`${id}-location`} name="location" value={query} onChange={e => setQuery(e.target.value)} maxLength={80} autoComplete="postal-code" aria-describedby={`${id}-hint`} />
        <button type="submit" className="dcp-button">Check location</button>
      </div>
    </form>
    <div className="dcp-checker-result" role="status" aria-live="polite" aria-atomic="true">{result && <p>{result}</p>}</div>
    <p className="dcp-field-hint">This uses town and ZIP matches, not your device’s location. No location is sent to Deer Creek.</p>
    {result && <div className="dcp-inline-links"><a href={phoneHref}>Call {phone}</a><a href={`${href('schedule')}${/^\d{5}$/.test(query.trim()) ? `?zip=${query.trim()}` : ''}`}>Try the request demo</a></div>}
  </div>
}

type ContactMethod = 'email' | 'call' | 'text'
type Draft = { service: string; details: string; zip: string; day: string; time: string; name: string; contact: ContactMethod; email: string; phone: string; preferences: string }
type Errors = Partial<Record<keyof Draft, string>>
const empty: Draft = { service: '', details: '', zip: '', day: '', time: 'Any time', name: '', contact: 'email', email: '', phone: '', preferences: '' }
function todayInOlathe() { return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()) }
const subscribe = () => () => {}

export function BookingForm() {
  const id = useId()
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false)
  const initial = useMemo(() => {
    if (!hydrated) return empty
    const params = new URLSearchParams(window.location.search)
    const service = params.get('service') ?? ''
    const zip = params.get('zip') ?? ''
    return { ...empty, service: services.some(item => item.slug === service) ? service : '', zip: /^\d{5}$/.test(zip) ? zip : '' }
  }, [hydrated])
  const [changedDraft, setDraft] = useState<Draft | null>(null)
  const draft = changedDraft ?? initial
  const [errors, setErrors] = useState<Errors>({})
  const [reviewing, setReviewing] = useState(false)
  const today = hydrated ? todayInOlathe() : ''
  const errorSummary = useRef<HTMLDivElement>(null)
  const reviewHeading = useRef<HTMLHeadingElement>(null)
  const formHeading = useRef<HTMLHeadingElement>(null)
  const focusErrors = useRef(false)
  const focusForm = useRef(false)

  useEffect(() => { if (focusErrors.current) { focusErrors.current = false; errorSummary.current?.focus() } }, [errors])
  useEffect(() => { if (reviewing) reviewHeading.current?.focus(); else if (focusForm.current) { focusForm.current = false; formHeading.current?.focus() } }, [reviewing])

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft(current => ({ ...(current ?? initial), [key]: value }))
    setErrors(current => { const next = { ...current }; delete next[key]; if (key === 'contact') { delete next.email; delete next.phone } return next })
  }
  function submit(event: FormEvent) {
    event.preventDefault()
    const next: Errors = {}
    if (!draft.service) next.service = 'Choose a service, or choose “I’m not sure yet”.'
    if (!/^\d{5}$/.test(draft.zip)) next.zip = 'Enter the five digit ZIP code where you need service.'
    if (!draft.name.trim()) next.name = 'Enter your name.'
    if (draft.contact === 'email' && !draft.email.trim()) next.email = 'Enter an email address so the office could reply by email.'
    else if (draft.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim())) next.email = 'Enter an email address like name@example.com.'
    const digits = draft.phone.replace(/\D/g, '')
    if ((draft.contact !== 'email' || digits) && !(digits.length === 10 || (digits.length === 11 && digits.startsWith('1')))) next.phone = 'Enter a ten digit phone number, including the area code.'
    if (draft.day && draft.day < todayInOlathe()) next.day = 'Choose today or a future date, or leave the date blank.'
    if (Object.keys(next).length) { focusErrors.current = true; setErrors(next); return }
    setErrors({})
    setReviewing(true)
  }
  const inputId = (name: keyof Draft) => `${id}-${name}`
  const described = (name: keyof Draft, hint?: string) => [errors[name] ? `${inputId(name)}-error` : '', hint || ''].filter(Boolean).join(' ') || undefined
  const error = (name: keyof Draft) => errors[name] ? <p className="dcp-field-error" id={`${inputId(name)}-error`}>{errors[name]}</p> : null

  if (reviewing) {
    const selectedService = services.find(item => item.slug === draft.service)?.name || 'I’m not sure yet'
    return <div className="dcp-booking-review">
      <h2 ref={reviewHeading} tabIndex={-1}>Your demo request is ready.</h2>
      <p className="dcp-form-notice"><strong>Nothing was sent. No visit is booked.</strong> This preview keeps your details only in this page while it is open. Contact the office directly to arrange service.</p>
      <dl className="dcp-request-summary">
        <div><dt>Service</dt><dd>{selectedService}</dd></div>
        {draft.details.trim() && <div><dt>What’s happening</dt><dd>{draft.details}</dd></div>}
        <div><dt>Location</dt><dd>ZIP {draft.zip}. Coverage needs confirmation.</dd></div>
        <div><dt>Preferred visit</dt><dd>{draft.day ? new Date(`${draft.day}T12:00:00Z`).toLocaleDateString('en-US', { dateStyle: 'long', timeZone: 'UTC' }) : 'First suitable day'} · {draft.time}. A preference, not an available slot.</dd></div>
        <div><dt>Contact</dt><dd>{draft.name}<br />{draft.contact === 'email' ? `Email: ${draft.email}` : `${draft.contact === 'text' ? 'Text' : 'Phone call'}: ${draft.phone}`}</dd></div>
        {draft.preferences.trim() && <div><dt>Visit preferences</dt><dd>{draft.preferences}</dd></div>}
      </dl>
      <div className="dcp-form-actions"><a className="dcp-button" href={`mailto:${email}`}>Email the office</a><a className="dcp-text-link" href={phoneHref}>Call {phone}</a></div>
      <button className="dcp-text-button" type="button" onClick={() => { focusForm.current = true; setReviewing(false) }}>Edit demo details</button>
    </div>
  }

  return <form className="dcp-booking-form" onSubmit={submit} noValidate aria-labelledby={`${id}-title`}>
    <h2 id={`${id}-title`} ref={formHeading} tabIndex={-1}>Tell us what you need.</h2>
    <p className="dcp-form-notice"><strong>Demo form.</strong> Nothing is sent to Deer Creek and no appointment is reserved. Use sample details to try it. Required fields are marked “required”.</p>
    <noscript><p>The interactive demo needs JavaScript. To arrange service, <a href={`mailto:${email}`}>email the office</a> or <a href={phoneHref}>call {phone}</a>.</p></noscript>
    {Object.keys(errors).length > 0 && <div ref={errorSummary} className="dcp-error-summary" role="alert" tabIndex={-1} aria-labelledby={`${id}-errors`}><h3 id={`${id}-errors`}>Please check your details</h3><ul>{Object.entries(errors).map(([name, message]) => <li key={name}><a href={`#${inputId(name as keyof Draft)}`} onClick={event => { event.preventDefault(); document.getElementById(inputId(name as keyof Draft))?.focus() }}>{message}</a></li>)}</ul></div>}
    <fieldset className="dcp-form-fields" disabled={!today} aria-label="Demo request details">
    <fieldset><legend>What can we help with?</legend><div className="dcp-form-grid">
      <div className="dcp-field"><label htmlFor={inputId('service')}>Service (required)</label><select id={inputId('service')} name="service" value={draft.service} onChange={e => update('service', e.target.value)} required aria-invalid={Boolean(errors.service)} aria-describedby={described('service')}><option value="">Choose a service</option>{services.map(item => <option key={item.slug} value={item.slug}>{item.name}</option>)}<option value="other">I’m not sure yet</option></select>{error('service')}</div>
      <div className="dcp-field"><label htmlFor={inputId('zip')}>Service ZIP code (required)</label><input id={inputId('zip')} name="postal-code" inputMode="numeric" autoComplete="postal-code" maxLength={5} value={draft.zip} onChange={e => update('zip', e.target.value.replace(/\D/g, '').slice(0, 5))} required aria-invalid={Boolean(errors.zip)} aria-describedby={described('zip', `${id}-zip-hint`)} />{error('zip')}<p className="dcp-field-hint" id={`${id}-zip-hint`} role="status">{draft.zip.length === 5 ? locationMessage(draft.zip) : 'The office confirms coverage for your exact address.'}</p></div>
      <div className="dcp-field dcp-field-wide"><label htmlFor={inputId('details')}>What’s happening? (optional)</label><textarea id={inputId('details')} name="details" value={draft.details} onChange={e => update('details', e.target.value)} maxLength={1500} rows={3} /></div>
    </div></fieldset>
    <fieldset><legend>When would you prefer a visit?</legend><p className="dcp-field-hint" id={`${id}-date-hint`}>These are preferences, not live availability. Leave the date blank if you are flexible. The office confirms every appointment.</p><div className="dcp-form-grid">
      <div className="dcp-field"><label htmlFor={inputId('day')}>Preferred date (optional)</label><input id={inputId('day')} name="preferred-date" type="date" min={today || undefined} value={draft.day} onChange={e => update('day', e.target.value)} aria-invalid={Boolean(errors.day)} aria-describedby={described('day', `${id}-date-hint`)} />{error('day')}</div>
      <div className="dcp-field"><label htmlFor={inputId('time')}>Time of day</label><select id={inputId('time')} name="preferred-time" value={draft.time} onChange={e => update('time', e.target.value)}><option>Any time</option><option>Morning</option><option>Afternoon</option></select></div>
    </div></fieldset>
    <fieldset><legend>How should the team reach you?</legend><div className="dcp-form-grid">
      <div className="dcp-field"><label htmlFor={inputId('name')}>Your name (required)</label><input id={inputId('name')} name="name" autoComplete="name" value={draft.name} onChange={e => update('name', e.target.value)} maxLength={120} required aria-invalid={Boolean(errors.name)} aria-describedby={described('name')} />{error('name')}</div>
      <div className="dcp-field"><label htmlFor={inputId('contact')}>Contact preference</label><select id={inputId('contact')} name="contact-preference" value={draft.contact} onChange={e => update('contact', e.target.value as ContactMethod)}><option value="email">Email</option><option value="call">Phone call</option><option value="text">Text message</option></select></div>
      <div className="dcp-field"><label htmlFor={inputId('email')}>Email ({draft.contact === 'email' ? 'required' : 'optional'})</label><input id={inputId('email')} name="email" type="email" autoComplete="email" value={draft.email} onChange={e => update('email', e.target.value)} maxLength={200} required={draft.contact === 'email'} aria-invalid={Boolean(errors.email)} aria-describedby={described('email')} />{error('email')}</div>
      <div className="dcp-field"><label htmlFor={inputId('phone')}>Phone ({draft.contact !== 'email' ? 'required' : 'optional'})</label><input id={inputId('phone')} name="tel" type="tel" autoComplete="tel" value={draft.phone} onChange={e => update('phone', e.target.value)} maxLength={25} required={draft.contact !== 'email'} aria-invalid={Boolean(errors.phone)} aria-describedby={described('phone')} />{error('phone')}</div>
    </div></fieldset>
    <div className="dcp-field"><label htmlFor={inputId('preferences')}>Anything that would make the visit easier? (optional)</label><p className="dcp-field-hint" id={`${id}-preferences-hint`}>For example, email instead of a call, extra time to answer the door, or advance notice of noise. Share practical preferences, not diagnoses or medical details.</p><textarea id={inputId('preferences')} name="visit-preferences" value={draft.preferences} onChange={e => update('preferences', e.target.value)} maxLength={1000} rows={3} aria-describedby={`${id}-preferences-hint`} /></div>
    <div className="dcp-form-actions"><button className="dcp-button" type="submit">Review demo request</button><p className="dcp-field-hint">Review your details on this page. Nothing is sent.</p></div>
    </fieldset>
  </form>
}
