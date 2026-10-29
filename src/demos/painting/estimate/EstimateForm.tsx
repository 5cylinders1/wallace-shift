import { useState, type FormEvent } from 'react'
import { business } from '../content'
import {
  CONTACT_LABELS, CONTACT_METHODS, PROJECT_LABELS, PROJECTS, TIMING_LABELS, TIMINGS,
  type ContactMethod, type EstimateRequestBody, type EstimateResponse, type Project, type Timing,
} from './types'

type Status = 'idle' | 'sending' | 'sent' | 'not_configured' | 'rate_limited' | 'invalid' | 'failed'

const MESSAGES: Record<Exclude<Status, 'idle' | 'sending' | 'sent'>, string> = {
  not_configured: `Online requests aren’t connected on this preview yet, so nothing was sent. Please call or text ${business.phone} instead.`,
  rate_limited: `That’s a lot of requests from one connection. Please call or text ${business.phone} instead.`,
  invalid: 'Please check your name, a 10-digit phone number, a valid email and at least one kind of project.',
  failed: `Your request couldn’t be sent just now. Please try again, or call or text ${business.phone}.`,
}

export default function EstimateForm({ colors, onClearColors }: { colors: string; onClearColors: () => void }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [contact, setContact] = useState<ContactMethod>('call')
  const [location, setLocation] = useState('')
  const [projects, setProjects] = useState<Project[]>(['exterior'])
  const [timing, setTiming] = useState<Timing>('season')
  const [notes, setNotes] = useState('')
  const [company, setCompany] = useState('')
  const [status, setStatus] = useState<Status>('idle')

  const toggle = (project: Project) =>
    setProjects((list) => list.includes(project) ? list.filter((item) => item !== project) : [...list, project])

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (status === 'sending') return
    if (!projects.length || phone.replace(/\D/g, '').length < 10) return setStatus('invalid')
    setStatus('sending')
    const body: EstimateRequestBody = { name, phone, email, contact, location, projects, timing, colors: colors || undefined, notes: notes || undefined, company }
    try {
      const response = await fetch('/api/paint-request', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
      const result = await response.json() as EstimateResponse
      if (result.ok) return setStatus('sent')
      setStatus(result.error === 'send_failed' ? 'failed' : result.error)
    } catch {
      setStatus('failed')
    }
  }

  if (status === 'sent') {
    return (
      <div className="cp-form-done" role="status">
        <h3>Thanks, {name.split(' ')[0]}. Your request is in.</h3>
        <p>We’ll {contact === 'email' ? 'email' : contact} you soon. Want to talk sooner? Call or text {business.phone}.</p>
      </div>
    )
  }

  return (
    <form className="cp-form" onSubmit={submit} noValidate={false}>
      <div className="cp-form-grid">
        <label className="cp-field">
          <span>Name</span>
          <input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" required maxLength={120} />
        </label>
        <label className="cp-field">
          <span>Phone</span>
          <input value={phone} onChange={(event) => setPhone(event.target.value)} type="tel" autoComplete="tel" inputMode="tel" required maxLength={40} />
        </label>
        <label className="cp-field">
          <span>Email</span>
          <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" required maxLength={200} />
        </label>
        <label className="cp-field">
          <span>Town or address</span>
          <input value={location} onChange={(event) => setLocation(event.target.value)} autoComplete="street-address" required maxLength={200} placeholder="e.g. Bonner Springs" />
        </label>
      </div>

      <fieldset className="cp-field-set">
        <legend>What needs painting?</legend>
        <div className="cp-pills">
          {PROJECTS.map((project) => (
            <label key={project} className={`cp-pill${projects.includes(project) ? ' is-on' : ''}`}>
              <input type="checkbox" checked={projects.includes(project)} onChange={() => toggle(project)} />
              {PROJECT_LABELS[project]}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="cp-form-grid">
        <fieldset className="cp-field-set">
          <legend>When?</legend>
          <div className="cp-pills">
            {TIMINGS.map((value) => (
              <label key={value} className={`cp-pill${timing === value ? ' is-on' : ''}`}>
                <input type="radio" name="cp-timing" checked={timing === value} onChange={() => setTiming(value)} />
                {TIMING_LABELS[value]}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="cp-field-set">
          <legend>Best way to reach you</legend>
          <div className="cp-pills">
            {CONTACT_METHODS.map((value) => (
              <label key={value} className={`cp-pill${contact === value ? ' is-on' : ''}`}>
                <input type="radio" name="cp-contact" checked={contact === value} onChange={() => setContact(value)} />
                {CONTACT_LABELS[value]}
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      {colors && (
        <p className="cp-form-colors">
          <span>Colors from the studio</span>
          <strong>{colors}</strong>
          <button type="button" className="cp-link" onClick={onClearColors}>Remove</button>
        </p>
      )}

      <label className="cp-field">
        <span>Anything we should know? <small>(optional)</small></span>
        <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} maxLength={2000} placeholder="Rooms, square footage, problem spots, the best time to stop by…" />
      </label>

      <label className="cp-honeypot" aria-hidden="true">
        Company
        <input value={company} onChange={(event) => setCompany(event.target.value)} tabIndex={-1} autoComplete="off" />
      </label>

      <div className="cp-form-submit">
        <button type="submit" className="cp-button cp-button-ochre" disabled={status === 'sending'}>
          {status === 'sending' ? 'Sending…' : 'Request my estimate'}
        </button>
        <p>Or call or text <a href={business.phoneHref}>{business.phone}</a></p>
      </div>
      {status !== 'idle' && status !== 'sending' && <p className="cp-form-error" role="alert">{MESSAGES[status]}</p>}
    </form>
  )
}
