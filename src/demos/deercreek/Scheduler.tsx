import { useEffect, useId, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { lookupArea } from './area'
import { prefillFrom, EMPTY, type Contact, type Draft, type Property, type Urgency, type Window } from './booking'
import { business, serviceBySlug, services, visitPreferences } from './content'
import { useHydrated } from './hooks'
import { ArrowIcon, CheckIcon, PhoneIcon, ServiceIcon } from './Icons'
import { submitRequest, type SubmitResult } from './requestAdapter'

const STEPS = ['What’s wrong', 'How soon', 'Where', 'When', 'Your details', 'Review'] as const

const URGENCY: Array<[Urgency, string, string]> = [
  ['emergency', 'It’s an emergency', 'Water is leaking now, no water, or sewage backing up.'],
  ['soon', 'Within a day or two', 'It needs fixing, but it isn’t flooding.'],
  ['week', 'This week', 'Whenever you have an opening.'],
  ['flexible', 'I’m flexible', 'Planning a project or an upgrade.'],
]
const WINDOWS: Array<[Window, string]> = [['any', 'Any time'], ['morning', 'Morning, 8 a.m. to noon'], ['afternoon', 'Afternoon, noon to 4:30 p.m.']]
const PROPERTY: Array<[Property, string]> = [['home', 'My home'], ['rental', 'A rental I own or manage'], ['business', 'A business']]
const CONTACT: Array<[Contact, string]> = [['call', 'Phone call'], ['text', 'Text message'], ['email', 'Email']]

/** The next ten weekdays in Olathe's calendar, as YYYY-MM-DD with labels. */
function businessDays(count = 10) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  const [y, m, d] = parts.split('-').map(Number)
  const days: Array<{ value: string; label: string; short: string }> = []
  for (let offset = 1; days.length < count && offset < 30; offset++) {
    const date = new Date(Date.UTC(y, m - 1, d + offset, 12))
    const weekday = date.getUTCDay()
    if (weekday === 0 || weekday === 6) continue
    const value = date.toISOString().slice(0, 10)
    const label = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' })
    const short = offset === 1 ? 'Tomorrow' : date.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' })
    days.push({ value, label, short })
  }
  return days
}

const digits = (value: string) => value.replace(/\D/g, '')
const formatDay = (value: string) => value === 'first' ? 'First available' : new Date(`${value}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' })
const serviceName = (value: Draft['service']) => value === 'other' ? 'Not sure / something else' : value ? serviceBySlug(value)?.name ?? value : ''

type Errors = Partial<Record<keyof Draft, string>>

/** The form depends on today's date and the page URL, so it renders only in
 * the browser; the static HTML carries a short placeholder instead. */
export default function Scheduler() {
  return useHydrated() ? <SchedulerForm /> : <div className="dc-scheduler"><p className="dc-field-hint">Loading the request form…</p></div>
}

function SchedulerForm() {
  const id = useId()
  const [initial] = useState(() => prefillFrom(window.location.search))
  const [draft, setDraft] = useState<Draft>(initial.draft)
  // Someone who arrived with a service already chosen sees it as a summary
  // with a Change button, not the whole catalog again.
  const [catalog, setCatalog] = useState(!initial.preselected)
  const focusCatalog = useRef(false)
  const [step, setStep] = useState(0)
  const [errors, setErrors] = useState<Errors>({})
  const days = useMemo(() => businessDays(), [])
  const [result, setResult] = useState<SubmitResult | null>(null)
  const [sending, setSending] = useState(false)
  const heading = useRef<HTMLHeadingElement>(null)
  const summary = useRef<HTMLDivElement>(null)
  const moved = useRef(false)
  const announceErrors = useRef(false)

  useEffect(() => {
    if (!moved.current) return
    heading.current?.focus()
  }, [step, result])

  // "Change" reveals the catalog and moves focus to the current choice, so
  // keyboard and screen-reader users land where the decision is.
  useEffect(() => {
    if (!catalog || !focusCatalog.current) return
    focusCatalog.current = false
    document.getElementById(`${id}-service-${draft.service || services[0].slug}`)?.focus()
  }, [catalog, draft.service, id])

  // Only a failed Continue moves focus to the summary; fixing a field while
  // typing must never pull focus away from it.
  useEffect(() => {
    if (!announceErrors.current) return
    announceErrors.current = false
    summary.current?.focus()
  }, [errors])

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft(previous => ({ ...previous, [key]: value }))
    setErrors(previous => {
      if (!previous[key]) return previous
      const next = { ...previous }
      delete next[key]
      return next
    })
  }

  function validate(index: number): Errors {
    const next: Errors = {}
    if (index === 0 && !draft.service) next.service = 'Choose the service closest to what you need.'
    if (index === 1 && !draft.urgency) next.urgency = 'Choose how soon you need us.'
    if (index === 2) {
      if (!/^\d{5}$/.test(draft.zip.trim())) next.zip = 'Enter the 5-digit ZIP code where the work is.'
      if (!draft.property) next.property = 'Choose the type of property.'
    }
    if (index === 4) {
      if (!draft.name.trim()) next.name = 'Enter your name.'
      const phone = digits(draft.phone)
      if (!(phone.length === 10 || (phone.length === 11 && phone.startsWith('1')))) next.phone = 'Enter a 10-digit phone number, like (913) 555-0123.'
      if (draft.contact === 'email' && !draft.email.trim()) next.email = 'Enter an email address, or choose a phone call or text.'
      else if (draft.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim())) next.email = 'Enter an email address like name@example.com.'
    }
    return next
  }

  function go(index: number) {
    moved.current = true
    setErrors({})
    setStep(index)
  }

  function next(event: FormEvent) {
    event.preventDefault()
    const found = validate(step)
    if (Object.keys(found).length) { announceErrors.current = true; setErrors(found); return }
    go(step + 1)
  }

  async function send() {
    setSending(true)
    const outcome = await submitRequest({
      service: serviceName(draft.service), issue: draft.issue, details: draft.details.trim(), urgency: draft.urgency, zip: draft.zip.trim(), property: draft.property,
      day: draft.day, window: draft.window, name: draft.name.trim(), phone: draft.phone.trim(), email: draft.email.trim(), contact: draft.contact,
      preferences: draft.prefs, notes: draft.notes.trim(),
    })
    setSending(false)
    moved.current = true
    setResult(outcome)
  }

  function restart() {
    moved.current = true
    setDraft({ ...EMPTY })
    setCatalog(true)
    setResult(null)
    setErrors({})
    setStep(0)
  }

  const fieldId = (name: string) => `${id}-${name}`
  const describedBy = (name: keyof Draft, hint?: string) => [errors[name] ? `${fieldId(name)}-error` : '', hint ?? ''].filter(Boolean).join(' ') || undefined
  const errorText = (name: keyof Draft) => errors[name] ? <p className="dc-field-error" id={`${fieldId(name)}-error`}><span className="dc-visually-hidden">Error: </span>{errors[name]}</p> : null
  const area = /^\d{5}$/.test(draft.zip.trim()) ? lookupArea(draft.zip.trim()) : null
  const areaNote = !area ? '' : area.kind === 'found'
    ? area.band === 'core' ? 'Good news: that ZIP is in our service area.' : area.band === 'edge' ? 'That ZIP is at the edge of our area. We’ll confirm when we call.' : 'That ZIP is outside our usual area. Send the request anyway, or call to ask.'
    : 'We couldn’t place that ZIP near Kansas City. Double-check it, or call to ask.'

  if (result) {
    const sent = result.status === 'sent'
    return (
      <div className="dc-scheduler dc-scheduler-done">
        <h2 ref={heading} tabIndex={-1} className="dc-step-title">
          {sent ? 'Request sent. We’ll be in touch by the next business day.' : result.status === 'error' ? 'We couldn’t send your request.' : 'Your request is ready, but this preview doesn’t send it.'}
        </h2>
        {result.status === 'demo' && <p>This is a website concept, so nothing was sent to Deer Creek and no visit is booked. To book now, call or text <a href={business.phoneHref}>{business.phone}</a>.</p>}
        {result.status === 'error' && <p>Nothing went through. Please call or text <a href={business.phoneHref}>{business.phone}</a> and we’ll book you in.</p>}
        <Summary draft={draft} />
        <div className="dc-step-actions">
          <a className="dc-button" href={business.phoneHref}><PhoneIcon /> Call {business.phone}</a>
          <button type="button" className="dc-button dc-button-quiet" onClick={restart}>Start a new request</button>
        </div>
      </div>
    )
  }

  const errorList = Object.entries(errors) as Array<[keyof Draft, string]>
  const groupTarget = (name: keyof Draft) => name === 'service' ? `${id}-service-${services[0].slug}` : name === 'urgency' ? `${id}-urgency-emergency` : name === 'property' ? `${id}-property-home` : fieldId(name)

  let body: ReactNode = null
  const chosen = draft.service === 'other' && draft.issue ? draft.issue : serviceName(draft.service)
  if (step === 0) body = (
    <>
      {!catalog && draft.service ? (
        <div className="dc-chosen">
          {draft.service !== 'other' && <ServiceIcon slug={draft.service} size={34} />}
          <div className="dc-chosen-text">
            <p className="dc-chosen-k">Your choice</p>
            <p className="dc-chosen-name">{chosen}</p>
            {draft.issue && draft.service !== 'other' && <p className="dc-chosen-sub">What’s going on: {draft.issue}</p>}
          </div>
          <button type="button" className="dc-button dc-button-quiet dc-button-small" onClick={() => { focusCatalog.current = true; setCatalog(true) }}>Change<span className="dc-visually-hidden"> service</span></button>
        </div>
      ) : (
      <div className="dc-option-grid">
        {[...services.map(service => ({ value: service.slug, label: service.name, hint: service.short })), { value: 'other' as const, label: 'Not sure / something else', hint: 'Describe it below and we’ll sort it out.' }].map(option => (
          <label key={option.value} className="dc-option" htmlFor={`${id}-service-${option.value}`}>
            <input id={`${id}-service-${option.value}`} type="radio" name="service" value={option.value} checked={draft.service === option.value} onChange={() => set('service', option.value)} aria-invalid={Boolean(errors.service)} aria-describedby={describedBy('service')} />
            <span className="dc-option-body">
              {option.value !== 'other' && <ServiceIcon slug={option.value} size={26} />}
              <span className="dc-option-label">{option.label}</span>
              <span className="dc-option-hint">{option.hint}</span>
            </span>
          </label>
        ))}
      </div>
      )}
      {errorText('service')}
      <div className="dc-field">
        <label htmlFor={fieldId('details')}>{draft.issue ? 'Anything to add about the problem?' : 'Tell us what’s going on'} <span className="dc-optional">(optional)</span></label>
        <textarea id={fieldId('details')} rows={3} maxLength={1200} value={draft.details} onChange={event => set('details', event.target.value)} />
      </div>
    </>
  )
  if (step === 1) body = (
    <>
      <div className="dc-option-list">
        {URGENCY.map(([value, label, hint]) => (
          <label key={value} className="dc-option dc-option-row" htmlFor={`${id}-urgency-${value}`}>
            <input id={`${id}-urgency-${value}`} type="radio" name="urgency" value={value} checked={draft.urgency === value} onChange={() => set('urgency', value)} aria-invalid={Boolean(errors.urgency)} aria-describedby={describedBy('urgency')} />
            <span className="dc-option-body"><span className="dc-option-label">{label}</span><span className="dc-option-hint">{hint}</span></span>
          </label>
        ))}
      </div>
      {errorText('urgency')}
      {draft.urgency === 'emergency' && (
        <div className="dc-callout" role="note">
          <p><strong>Water leaking right now?</strong> Calling is the fastest way to reach us: <a href={business.phoneHref}>{business.phone}</a>. Shut off the main water valve while you wait.</p>
        </div>
      )}
    </>
  )
  if (step === 2) body = (
    <>
      <div className="dc-field dc-field-short">
        <label htmlFor={fieldId('zip')}>ZIP code where the work is</label>
        <input id={fieldId('zip')} type="text" inputMode="numeric" autoComplete="postal-code" maxLength={5} value={draft.zip} onChange={event => set('zip', digits(event.target.value).slice(0, 5))} aria-invalid={Boolean(errors.zip)} aria-describedby={describedBy('zip', `${fieldId('zip')}-area`)} />
        {errorText('zip')}
        <p className="dc-field-hint" id={`${fieldId('zip')}-area`} aria-live="polite">{areaNote}</p>
      </div>
      <fieldset className="dc-subfieldset">
        <legend>What kind of property?</legend>
        <div className="dc-pills">
          {PROPERTY.map(([value, label]) => (
            <label key={value} className="dc-pill" htmlFor={`${id}-property-${value}`}>
              <input id={`${id}-property-${value}`} type="radio" name="property" value={value} checked={draft.property === value} onChange={() => set('property', value)} aria-invalid={Boolean(errors.property)} aria-describedby={describedBy('property')} />
              <span>{label}</span>
            </label>
          ))}
        </div>
        {errorText('property')}
      </fieldset>
    </>
  )
  if (step === 3) body = (
    <>
      <fieldset className="dc-subfieldset">
        <legend>Preferred day</legend>
        <div className="dc-days">
          <label className="dc-day dc-day-first" htmlFor={`${id}-day-first`}>
            <input id={`${id}-day-first`} type="radio" name="day" value="first" checked={draft.day === 'first'} onChange={() => set('day', 'first')} />
            <span><strong>First available</strong><span>Soonest we can get there</span></span>
          </label>
          {days.map(day => (
            <label key={day.value} className="dc-day" htmlFor={`${id}-day-${day.value}`}>
              <input id={`${id}-day-${day.value}`} type="radio" name="day" value={day.value} checked={draft.day === day.value} onChange={() => set('day', day.value)} aria-label={day.label} />
              <span aria-hidden="true"><strong>{day.short}</strong><span>{day.label.split(', ')[1]}</span></span>
            </label>
          ))}
        </div>
        <p className="dc-field-hint">We’re open Monday to Friday. A preference, not a confirmed booking: we’ll confirm the time with you.</p>
      </fieldset>
      <fieldset className="dc-subfieldset">
        <legend>Time of day</legend>
        <div className="dc-pills">
          {WINDOWS.map(([value, label]) => (
            <label key={value} className="dc-pill" htmlFor={`${id}-window-${value}`}>
              <input id={`${id}-window-${value}`} type="radio" name="window" value={value} checked={draft.window === value} onChange={() => set('window', value)} />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </fieldset>
    </>
  )
  if (step === 4) body = (
    <>
      <div className="dc-field-grid">
        <div className="dc-field">
          <label htmlFor={fieldId('name')}>Your name</label>
          <input id={fieldId('name')} type="text" autoComplete="name" maxLength={120} value={draft.name} onChange={event => set('name', event.target.value)} aria-invalid={Boolean(errors.name)} aria-describedby={describedBy('name')} />
          {errorText('name')}
        </div>
        <div className="dc-field">
          <label htmlFor={fieldId('phone')}>Phone number</label>
          <input id={fieldId('phone')} type="tel" autoComplete="tel" maxLength={20} value={draft.phone} onChange={event => set('phone', event.target.value)} aria-invalid={Boolean(errors.phone)} aria-describedby={describedBy('phone')} />
          {errorText('phone')}
        </div>
        <div className="dc-field">
          <label htmlFor={fieldId('email')}>Email {draft.contact !== 'email' && <span className="dc-optional">(optional)</span>}</label>
          <input id={fieldId('email')} type="email" autoComplete="email" maxLength={200} value={draft.email} onChange={event => set('email', event.target.value)} aria-invalid={Boolean(errors.email)} aria-describedby={describedBy('email')} />
          {errorText('email')}
        </div>
      </div>
      <fieldset className="dc-subfieldset">
        <legend>Best way to reach you</legend>
        <div className="dc-pills">
          {CONTACT.map(([value, label]) => (
            <label key={value} className="dc-pill" htmlFor={`${id}-contact-${value}`}>
              <input id={`${id}-contact-${value}`} type="radio" name="contact" value={value} checked={draft.contact === value} onChange={() => set('contact', value)} />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="dc-subfieldset">
        <legend>Anything that would make the visit easier? <span className="dc-optional">(optional)</span></legend>
        <p className="dc-field-hint" id={`${id}-prefs-hint`}>Every household is different. Tell us what helps and we’ll plan around it.</p>
        <div className="dc-checks">
          {visitPreferences.filter(pref => !pref.includes('instead of')).map((pref, index) => (
            <label key={pref} className="dc-check" htmlFor={`${id}-pref-${index}`}>
              <input id={`${id}-pref-${index}`} type="checkbox" checked={draft.prefs.includes(pref)} onChange={event => set('prefs', event.target.checked ? [...draft.prefs, pref] : draft.prefs.filter(item => item !== pref))} />
              <span>{pref}</span>
            </label>
          ))}
        </div>
        <div className="dc-field">
          <label htmlFor={fieldId('notes')}>Anything else we should know? <span className="dc-optional">(optional)</span></label>
          <textarea id={fieldId('notes')} rows={3} maxLength={1200} value={draft.notes} onChange={event => set('notes', event.target.value)} placeholder="Gate code, where to park, the best door to use…" />
        </div>
      </fieldset>
    </>
  )
  if (step === 5) body = (
    <>
      <Summary draft={draft} onEdit={target => { if (target === 0) setCatalog(true); go(target) }} />
      <p className="dc-field-hint">We’ll contact you by the next business day to confirm a time. Nothing is booked until we do.</p>
    </>
  )

  const titles = ['What do you need help with?', 'How soon do you need us?', 'Where’s the job?', 'When works for you?', 'How do we reach you?', 'Check your request']
  const last = step === STEPS.length - 1

  return (
    <div className="dc-scheduler">
      <ol className="dc-progress" aria-label="Request steps">
        {STEPS.map((label, index) => (
          <li key={label} data-state={index < step ? 'done' : index === step ? 'current' : 'todo'} aria-current={index === step ? 'step' : undefined}>
            <span className="dc-progress-dot" aria-hidden="true">{index < step ? <CheckIcon size={14} /> : index + 1}</span>
            <span className="dc-progress-label">{label}{index < step && <span className="dc-visually-hidden"> (done)</span>}</span>
          </li>
        ))}
      </ol>
      <div className="dc-progress-pipe" aria-hidden="true"><span style={{ width: `${(step / (STEPS.length - 1)) * 100}%` }} /></div>
      <form onSubmit={next} noValidate>
        <fieldset className="dc-step">
          <legend id={`${id}-legend`}>
            <span className="dc-step-count">Step {step + 1} of {STEPS.length}</span>
            <h2 ref={heading} tabIndex={-1} className="dc-step-title">{titles[step]}</h2>
          </legend>
          {errorList.length > 0 && (
            <div ref={summary} className="dc-error-summary" role="alert" tabIndex={-1} aria-labelledby={`${id}-errors`}>
              <h3 id={`${id}-errors`}>Please check {errorList.length === 1 ? 'this' : `these ${errorList.length} things`}</h3>
              <ul>{errorList.map(([name, message]) => <li key={name}><a href={`#${groupTarget(name)}`} onClick={event => { event.preventDefault(); document.getElementById(groupTarget(name))?.focus() }}>{message}</a></li>)}</ul>
            </div>
          )}
          {body}
        </fieldset>
        <div className="dc-step-actions">
          {last ? (
            <button type="button" className="dc-button" onClick={send} disabled={sending}>{sending ? 'Sending…' : 'Send request'} <ArrowIcon /></button>
          ) : (
            <button type="submit" className="dc-button">Continue <ArrowIcon /></button>
          )}
          {step > 0 && <button type="button" className="dc-button dc-button-quiet" onClick={() => go(step - 1)}>Back</button>}
        </div>
      </form>
    </div>
  )
}

function Summary({ draft, onEdit }: { draft: Draft; onEdit?: (step: number) => void }) {
  const urgency = URGENCY.find(([value]) => value === draft.urgency)?.[1] ?? ''
  const rows: Array<[string, ReactNode, number]> = [
    ['Service', <>{serviceName(draft.service)}{draft.issue && <><br /><span className="dc-summary-sub">What’s going on: {draft.issue}</span></>}{draft.details.trim() && <><br /><span className="dc-summary-sub">{draft.details.trim()}</span></>}</>, 0],
    ['How soon', urgency, 1],
    ['Where', `ZIP ${draft.zip} · ${PROPERTY.find(([value]) => value === draft.property)?.[1] ?? ''}`, 2],
    ['When', `${formatDay(draft.day)} · ${WINDOWS.find(([value]) => value === draft.window)?.[1]}`, 3],
    ['Contact', <>{draft.name}<br />{draft.phone}{draft.email && <><br />{draft.email}</>}<br /><span className="dc-summary-sub">Prefers {CONTACT.find(([value]) => value === draft.contact)?.[1].toLowerCase()}</span></>, 4],
  ]
  if (draft.prefs.length || draft.notes.trim()) rows.push(['Visit notes', <>{draft.prefs.join('; ')}{draft.prefs.length > 0 && draft.notes.trim() && <br />}{draft.notes.trim()}</>, 4])
  return (
    <dl className="dc-summary">
      {rows.map(([label, value, target]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
          {onEdit && <dd className="dc-summary-edit"><button type="button" className="dc-link-button" onClick={() => onEdit(target)}>Change<span className="dc-visually-hidden"> {label.toLowerCase()}</span></button></dd>}
        </div>
      ))}
    </dl>
  )
}
