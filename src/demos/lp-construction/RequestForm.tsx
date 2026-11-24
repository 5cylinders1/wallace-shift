import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { business, smsHref, phoneHref } from './content'
import { findFinish, findStyle } from './ideas/styles'
import { useLang } from './lang'
import { clearIdea, preparePhoto, type IdeaHandoff } from './photo'
import { emptyStart, type RequestStart } from './request/start'
import { checkZip, cleanZip } from './serviceArea'
import {
  CONTACTS, CUSTOMERS, JOBS, MAX_PHOTOS, TIMINGS,
  type Contact, type Customer, type Job, type RequestResponse, type Timing,
} from './request/types'

const ENDPOINT = '/api/trim-request'
type Field = 'zip' | 'jobs' | 'name' | 'phone' | 'email'
type Outcome = { kind: 'sent'; name: string; method: string } | { kind: 'not-sent' } | { kind: 'failed' } | { kind: 'limited' }

export default function RequestForm({ start = emptyStart }: { start?: RequestStart }) {
  const id = useId()
  const { lang, t: all } = useLang()
  const t = all.form
  const area = all.area
  const [zip, setZip] = useState(start.zip)
  const [customer, setCustomer] = useState<Customer>('homeowner')
  const [jobs, setJobs] = useState<Job[]>(start.jobs)
  const [details, setDetails] = useState('')
  const [size, setSize] = useState('')
  const [timing, setTiming] = useState<Timing>('quarter')
  const [photos, setPhotos] = useState<string[]>(start.idea && !start.idea.render && start.idea.photo ? [start.idea.photo] : [])
  const [photoError, setPhotoError] = useState(false)
  const [idea, setIdea] = useState<IdeaHandoff | null>(start.idea)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [contact, setContact] = useState<Contact>('call')
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({})
  const [sending, setSending] = useState(false)
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const summary = useRef<HTMLDivElement>(null)
  const result = useRef<HTMLDivElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => { if (outcome) result.current?.focus() }, [outcome])

  const zipArea = cleanZip(zip).length === 5 ? checkZip(zip) : null
  const toggleJob = (job: Job) => setJobs(list => list.includes(job) ? list.filter(item => item !== job) : [...list, job])

  const addPhotos = async (files: FileList | null) => {
    if (!files) return
    setPhotoError(false)
    const room = MAX_PHOTOS - photos.length
    const prepared: string[] = []
    for (const file of [...files].slice(0, room)) {
      try { prepared.push((await preparePhoto(file, 1600, 0.82)).dataUrl) } catch { setPhotoError(true) }
    }
    setPhotos(list => [...list, ...prepared].slice(0, MAX_PHOTOS))
  }

  const validate = () => {
    const found: Partial<Record<Field, string>> = {}
    if (cleanZip(zip).length !== 5) found.zip = t.errors.zip
    if (!jobs.length) found.jobs = t.errors.jobs
    if (!name.trim()) found.name = t.errors.name
    if (phone.replace(/\D/g, '').length < 10) found.phone = t.errors.phone
    if (contact === 'email' ? !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) : email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) found.email = t.errors.email
    return found
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const found = validate()
    setErrors(found)
    if (Object.keys(found).length) {
      // The summary only shows once rendered, so focus it on the next frame.
      requestAnimationFrame(() => summary.current?.focus())
      return
    }
    setSending(true)
    const form = new FormData(event.currentTarget)
    try {
      const response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({
          lang, customer, zip: cleanZip(zip), jobs, details, size, timing, name, phone, email, contact, photos,
          idea: idea ? { style: idea.style, finish: idea.finish, crown: idea.crown, render: idea.render, photo: idea.render ? idea.photo : null } : null,
          company: form.get('company') ?? '',
        }),
      })
      const body = await response.json() as RequestResponse
      if (body.ok) {
        clearIdea()
        setOutcome({ kind: 'sent', name: name.trim().split(/\s+/)[0], method: t.contacts[contact].toLowerCase() })
      } else setOutcome(body.error === 'not_configured' ? { kind: 'not-sent' } : body.error === 'rate_limited' ? { kind: 'limited' } : { kind: 'failed' })
    } catch {
      setOutcome({ kind: 'failed' })
    } finally {
      setSending(false)
    }
  }

  const fieldError = (field: Field) => errors[field] ? <p className="lp-error" id={`${id}-${field}-error`}>{errors[field]}</p> : null
  const describedBy = (field: Field, hint?: string) => [hint, errors[field] ? `${id}-${field}-error` : ''].filter(Boolean).join(' ') || undefined
  const ideaStyle = idea ? findStyle(idea.style) : undefined
  const ideaFinish = idea ? findFinish(idea.finish) : undefined

  if (outcome) {
    const message = outcome.kind === 'sent' ? t.sent(outcome.name, outcome.method) : outcome.kind === 'not-sent' ? t.notSent : outcome.kind === 'limited' ? t.limited : t.failed
    return (
      <div className="lp-request-result" ref={result} tabIndex={-1} role="status" data-outcome={outcome.kind}>
        <p>{message}</p>
        {outcome.kind !== 'sent' && (
          <div className="lp-talk lp-talk-light">
            <a className="lp-button" href={phoneHref}>{t.call} {business.phoneDisplay}</a>
            {business.textsEnabled && <a className="lp-button lp-button-quiet" href={smsHref(`${name}: ${jobs.map(job => t.jobs[job]).join(', ')} (${cleanZip(zip)})`)}>{t.callOrText}</a>}
          </div>
        )}
      </div>
    )
  }

  return (
    <form className="lp-request" onSubmit={event => void submit(event)} noValidate aria-labelledby={`${id}-title`}>
      <div className="lp-request-head">
        <h1 id={`${id}-title`}>{t.title}</h1>
      </div>
      <p className="lp-request-lede">{t.lede} {t.minimum}</p>

      <div className="lp-error-summary" ref={summary} tabIndex={-1} role={Object.keys(errors).length ? 'alert' : undefined}>
        {Object.keys(errors).length > 0 && <p>{t.errors.summary}</p>}
      </div>

      <div className="lp-field">
        <label htmlFor={`${id}-zip`}>{t.zip}</label>
        <input id={`${id}-zip`} name="zip" inputMode="numeric" autoComplete="postal-code" maxLength={10} value={zip} onChange={event => setZip(event.target.value)} aria-invalid={Boolean(errors.zip) || undefined} aria-describedby={describedBy('zip', zipArea ? `${id}-zip-area` : undefined)} required />
        {zipArea && zipArea !== 'invalid' && <p className="lp-hint" id={`${id}-zip-area`} data-area={zipArea}>{area[zipArea](cleanZip(zip))}</p>}
        {fieldError('zip')}
      </div>

      <fieldset className="lp-field">
        <legend>{t.who}</legend>
        <div className="lp-chips">
          {CUSTOMERS.map(item => (
            <label key={item} className="lp-chip"><input type="radio" name="customer" value={item} checked={customer === item} onChange={() => setCustomer(item)} /><span>{t.customers[item]}</span></label>
          ))}
        </div>
      </fieldset>

      <fieldset className="lp-field" aria-describedby={errors.jobs ? `${id}-jobs-error` : undefined}>
        <legend>{t.what}</legend>
        <div className="lp-chips">
          {JOBS.map(job => (
            <label key={job} className="lp-chip"><input type="checkbox" name="jobs" value={job} checked={jobs.includes(job)} onChange={() => toggleJob(job)} /><span>{t.jobs[job]}</span></label>
          ))}
        </div>
        {fieldError('jobs')}
      </fieldset>

      {idea && (
        <div className="lp-field lp-idea-card">
          <p className="lp-label">{t.idea}</p>
          <div className="lp-idea-body">
            {(idea.render ?? idea.photo) && <img src={(idea.render ?? idea.photo)!} alt="" width={160} height={107} />}
            <p>{ideaStyle ? all.ideas.styles[ideaStyle.id] : ''}{idea.render && ideaFinish ? `, ${all.ideas.finishes[ideaFinish.id].toLowerCase()}` : ''}{idea.render && idea.crown ? `, ${t.ideaCrown}` : ''}</p>
            <button type="button" className="lp-link-button" onClick={() => { clearIdea(); setIdea(null) }}>{t.removeIdea}</button>
          </div>
        </div>
      )}

      <div className="lp-field">
        <label htmlFor={`${id}-details`}>{t.details}</label>
        <textarea id={`${id}-details`} name="details" rows={4} maxLength={2000} value={details} onChange={event => setDetails(event.target.value)} aria-describedby={`${id}-details-hint`} />
        <p className="lp-hint" id={`${id}-details-hint`}>{t.detailsHint}</p>
      </div>

      <div className="lp-field-row">
        <div className="lp-field">
          <label htmlFor={`${id}-size`}>{t.size}</label>
          <input id={`${id}-size`} name="size" maxLength={200} value={size} onChange={event => setSize(event.target.value)} aria-describedby={`${id}-size-hint`} />
          <p className="lp-hint" id={`${id}-size-hint`}>{t.sizeHint}</p>
        </div>
        <div className="lp-field">
          <label htmlFor={`${id}-timing`}>{t.timing}</label>
          <select id={`${id}-timing`} name="timing" value={timing} onChange={event => setTiming(event.target.value as Timing)}>
            {TIMINGS.map(item => <option key={item} value={item}>{t.timings[item]}</option>)}
          </select>
        </div>
      </div>

      <div className="lp-field">
        <p className="lp-label" id={`${id}-photos-label`}>{t.photos}</p>
        <p className="lp-hint" id={`${id}-photos-hint`}>{t.photosHint}</p>
        {photos.length > 0 && (
          <ul className="lp-photo-list">
            {photos.map((src, index) => (
              <li key={src.slice(-40) + index}>
                <img src={src} alt="" width={96} height={72} />
                <button type="button" className="lp-link-button" onClick={() => setPhotos(list => list.filter((_, item) => item !== index))}>{t.removePhoto} {index + 1}</button>
              </li>
            ))}
          </ul>
        )}
        {photos.length < MAX_PHOTOS && (
          <>
            <button type="button" className="lp-button lp-button-quiet" aria-describedby={`${id}-photos-label ${id}-photos-hint`} onClick={() => fileInput.current?.click()}>{t.addPhotos}</button>
            <input ref={fileInput} className="lp-visually-hidden" type="file" accept="image/*" multiple tabIndex={-1} aria-hidden="true" onChange={event => { void addPhotos(event.target.files); event.target.value = '' }} />
          </>
        )}
        {photoError && <p className="lp-error" role="alert">{t.photoError}</p>}
      </div>

      <fieldset className="lp-field">
        <legend>{t.contactLegend}</legend>
        <div className="lp-field-row">
          <div className="lp-field">
            <label htmlFor={`${id}-name`}>{t.name}</label>
            <input id={`${id}-name`} name="name" autoComplete="name" maxLength={120} value={name} onChange={event => setName(event.target.value)} aria-invalid={Boolean(errors.name) || undefined} aria-describedby={describedBy('name')} required />
            {fieldError('name')}
          </div>
          <div className="lp-field">
            <label htmlFor={`${id}-phone`}>{t.phone}</label>
            <input id={`${id}-phone`} name="phone" type="tel" autoComplete="tel" maxLength={40} value={phone} onChange={event => setPhone(event.target.value)} aria-invalid={Boolean(errors.phone) || undefined} aria-describedby={describedBy('phone')} required />
            {fieldError('phone')}
          </div>
        </div>
        <div className="lp-field">
          <label htmlFor={`${id}-email`}>{t.email}</label>
          <input id={`${id}-email`} name="email" type="email" autoComplete="email" maxLength={200} value={email} onChange={event => setEmail(event.target.value)} aria-invalid={Boolean(errors.email) || undefined} aria-describedby={describedBy('email', `${id}-email-hint`)} />
          <p className="lp-hint" id={`${id}-email-hint`}>{t.emailHint}</p>
          {fieldError('email')}
        </div>
        <fieldset className="lp-field lp-field-inner">
          <legend>{t.contact}</legend>
          <div className="lp-chips">
            {CONTACTS.map(item => (
              <label key={item} className="lp-chip"><input type="radio" name="contact" value={item} checked={contact === item} onChange={() => setContact(item)} /><span>{t.contacts[item]}</span></label>
            ))}
          </div>
        </fieldset>
      </fieldset>

      <div className="lp-honeypot" aria-hidden="true">
        <label htmlFor={`${id}-company`}>Company</label>
        <input id={`${id}-company`} name="company" tabIndex={-1} autoComplete="off" />
      </div>

      <button type="submit" className="lp-button lp-button-accent lp-request-submit" disabled={sending}>{sending ? t.sending : t.submit}</button>
    </form>
  )
}
