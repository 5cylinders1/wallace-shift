import { useEffect, useRef, useState } from 'react'
import { clearBrief, updateBrief, useBrief } from '../brief'
import { business, sampleName } from '../content'
import { money } from '../pricing'
import { href, onLink } from '../routes'

const ROOMS = ['Kitchen', 'Primary bath', 'Guest bath', 'Powder room', 'Built-ins or closet', 'Laundry or mudroom']
const SCOPES = [
  { id: 'cabinetry', label: 'Cabinetry only', detail: 'Someone else is handling the rest' },
  { id: 'remodel', label: 'The whole remodel', detail: 'Design, cabinetry and trades' },
  { id: 'unsure', label: 'Not sure yet', detail: 'Help me work it out' },
]
const TIMING = ['Within 3 months', 'In 3 to 6 months', 'In 6 to 12 months', 'Just exploring']
const BUDGETS = ['Under $50,000', '$50,000 to $100,000', '$100,000 to $200,000', 'Over $200,000', 'Not sure yet']
const VISITS = ['Weekday daytime', 'Weekday evening', 'Saturday']
const STEPS = ['Your project', 'Timing', 'Style', 'Contact']

interface Upload { id: string; url: string; name: string }

function Chips({ legend, options, value, multiple = false, onChange }: { legend: string; options: string[]; value: string[]; multiple?: boolean; onChange: (next: string[]) => void }) {
  return <fieldset className="tb-chips">
    <legend>{legend}</legend>
    <div className="tb-chips-row">
      {options.map(option => {
        const on = value.includes(option)
        return <label key={option} className={on ? 'is-active' : ''}>
          <input type={multiple ? 'checkbox' : 'radio'} name={legend} checked={on}
            onChange={() => onChange(multiple ? (on ? value.filter(item => item !== option) : [...value, option]) : [option])} />
          {option}
        </label>
      })}
    </div>
  </fieldset>
}

export default function ConsultationPage() {
  const brief = useBrief()
  const [step, setStep] = useState(0)
  const [sent, setSent] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [rooms, setRooms] = useState<string[]>([])
  const [scope, setScope] = useState('')
  const [timing, setTiming] = useState<string[]>([])
  const [budget, setBudget] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [uploads, setUploads] = useState<Upload[]>([])
  const [contact, setContact] = useState({ name: '', email: '', phone: '', zip: '', visit: VISITS[0] })
  const errorRef = useRef<HTMLDivElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const uploadsRef = useRef(uploads)
  useEffect(() => { uploadsRef.current = uploads }, [uploads])
  useEffect(() => () => uploadsRef.current.forEach(upload => URL.revokeObjectURL(upload.url)), [])

  const validate = (index: number): string[] => {
    if (index === 0) return [...(rooms.length ? [] : ['Choose at least one room.']), ...(scope ? [] : ['Tell us how much of the room you want us to take on.'])]
    if (index === 1) return [...(timing.length ? [] : ['Choose when you would like to start.']), ...(budget.length || brief.plan ? [] : ['Choose a budget range, or “Not sure yet”.'])]
    if (index === 3) {
      const list: string[] = []
      if (!contact.name.trim()) list.push('Add your name.')
      if (!/^\S+@\S+\.\S+$/.test(contact.email.trim())) list.push('Add an email address we can reply to.')
      if (!/^\d{5}$/.test(contact.zip.trim())) list.push('Add a five-digit ZIP code so we know the area.')
      return list
    }
    return []
  }

  const next = () => {
    const list = validate(step)
    setErrors(list)
    if (list.length) { requestAnimationFrame(() => errorRef.current?.focus()); return }
    if (step < STEPS.length - 1) { setStep(step + 1); requestAnimationFrame(() => headingRef.current?.focus()) }
    else { setSent(true); requestAnimationFrame(() => headingRef.current?.focus()) }
  }
  const back = () => { setErrors([]); setStep(Math.max(0, step - 1)); requestAnimationFrame(() => headingRef.current?.focus()) }

  const addFiles = (files: FileList | null) => {
    if (!files) return
    const added = Array.from(files).filter(file => file.type.startsWith('image/')).slice(0, Math.max(0, 6 - uploads.length))
      .map(file => ({ id: `${file.name}-${file.size}-${file.lastModified}`, url: URL.createObjectURL(file), name: file.name }))
    setUploads(current => [...current, ...added])
  }
  const removeUpload = (id: string) => setUploads(current => {
    const gone = current.find(item => item.id === id)
    if (gone) URL.revokeObjectURL(gone.url)
    return current.filter(item => item.id !== id)
  })

  const restart = () => {
    uploads.forEach(upload => URL.revokeObjectURL(upload.url))
    setUploads([]); setRooms([]); setScope(''); setTiming([]); setBudget([]); setNotes('')
    setContact({ name: '', email: '', phone: '', zip: '', visit: VISITS[0] })
    setStep(0); setSent(false); setErrors([]); clearBrief()
  }

  const briefCard = <aside className="tb-brief" aria-label="Your brief">
    <p className="tb-label">Your brief</p>
    <div className="tb-brief-row">
      <h3>Sample box</h3>
      {brief.samples.length ? <ul className="tb-brief-samples">{brief.samples.map(id => <li key={id}>{sampleName(id)}
        <button type="button" onClick={() => updateBrief(current => ({ ...current, samples: current.samples.filter(item => item !== id) }))} aria-label={`Remove ${sampleName(id)}`}>×</button></li>)}</ul>
        : <p className="tb-muted">No samples chosen.</p>}
      <a className="tb-link-small" href={href.home('#materials')} onClick={onLink}>Choose samples</a>
    </div>
    <div className="tb-brief-row">
      <h3>Planning range</h3>
      {brief.plan ? <p>{money(brief.plan.low)} to {money(brief.plan.high)}<br /><span className="tb-muted">{brief.plan.label}</span></p> : <p className="tb-muted">Not set.</p>}
      <a className="tb-link-small" href={href.page('investment')} onClick={onLink}>{brief.plan ? 'Adjust the range' : 'Build a range'}</a>
    </div>
  </aside>

  if (sent) {
    return <main id="main" className="tb-consult-page">
      <section className="tb-wrap tb-consult-done" aria-labelledby="tb-done-title">
        <div className="tb-demo-notice" role="status">
          <strong>This is a demo. Nothing has been sent.</strong> In a live site this request would go to Tambour’s inbox and CRM, and you would get an email confirming your visit window.
        </div>
        <p className="tb-label">Request preview</p>
        <h1 id="tb-done-title" ref={headingRef} tabIndex={-1}>Here’s what we would receive, <em>{contact.name.split(' ')[0] || 'thank you'}.</em></h1>
        <dl className="tb-review">
          <div><dt>Rooms</dt><dd>{rooms.join(', ')}</dd></div>
          <div><dt>Scope</dt><dd>{SCOPES.find(item => item.id === scope)?.label}</dd></div>
          <div><dt>Timing</dt><dd>{timing[0]}</dd></div>
          <div><dt>Budget</dt><dd>{budget[0] ?? (brief.plan ? `${money(brief.plan.low)} to ${money(brief.plan.high)} (planning range)` : 'Not given')}</dd></div>
          <div><dt>Samples</dt><dd>{brief.samples.length ? brief.samples.map(sampleName).join(', ') : 'None'}</dd></div>
          <div><dt>Notes</dt><dd>{notes || 'None'}</dd></div>
          <div><dt>Photos</dt><dd>{uploads.length ? `${uploads.length} attached (kept on this device)` : 'None'}</dd></div>
          <div><dt>Contact</dt><dd>{contact.name} · {contact.email}{contact.phone ? ` · ${contact.phone}` : ''} · {contact.zip}</dd></div>
          <div><dt>Visit</dt><dd>{contact.visit}</dd></div>
        </dl>
        <div className="tb-actions">
          <button type="button" className="tb-button tb-button-ink" onClick={restart}>Start over</button>
          <a className="tb-button tb-button-line" href={href.home()} onClick={onLink}>Back to the home page</a>
        </div>
      </section>
    </main>
  }

  return <main id="main" className="tb-consult-page">
    <section className="tb-page-head" aria-labelledby="tb-page-title">
      <div className="tb-wrap">
        <p className="tb-label">Design consultation</p>
        <h1 id="tb-page-title" tabIndex={-1}>Bring the room. <em>We’ll bring the samples.</em></h1>
        <p className="tb-page-lede">Four short steps. We will reply within one business day to set a time to visit, measure and talk it through. Prefer to call? {business.phone}.</p>
      </div>
    </section>
    <section className="tb-wrap tb-consult" aria-label="Consultation request">
      <form className="tb-consult-form" noValidate onSubmit={event => { event.preventDefault(); next() }}>
        <ol className="tb-steps" aria-label="Steps">
          {STEPS.map((label, n) => <li key={label} className={n === step ? 'is-current' : n < step ? 'is-done' : ''} aria-current={n === step ? 'step' : undefined}>
            <span aria-hidden="true">{n + 1}</span>{label}
          </li>)}
        </ol>
        <h2 className="tb-h3" ref={headingRef} tabIndex={-1}>Step {step + 1} of {STEPS.length}: {STEPS[step]}</h2>
        {errors.length > 0 && <div ref={errorRef} className="tb-errors" role="alert" tabIndex={-1}>
          <p>Before you continue:</p>
          <ul>{errors.map(error => <li key={error}>{error}</li>)}</ul>
        </div>}

        {step === 0 && <>
          <Chips legend="Which rooms?" options={ROOMS} value={rooms} multiple onChange={setRooms} />
          <fieldset className="tb-segmented">
            <legend>How much should we take on?</legend>
            <div className="tb-segmented-row">
              {SCOPES.map(option => <label key={option.id} className={scope === option.id ? 'is-active' : ''}>
                <input type="radio" name="tb-consult-scope" checked={scope === option.id} onChange={() => setScope(option.id)} />
                <strong>{option.label}</strong><span>{option.detail}</span>
              </label>)}
            </div>
          </fieldset>
        </>}

        {step === 1 && <>
          <Chips legend="When would you like to start?" options={TIMING} value={timing} onChange={setTiming} />
          <Chips legend={brief.plan ? 'Budget (optional, you saved a planning range)' : 'Budget'} options={BUDGETS} value={budget} onChange={setBudget} />
        </>}

        {step === 2 && <>
          <div className="tb-field">
            <label htmlFor="tb-notes">What isn’t working in the room today?</label>
            <textarea id="tb-notes" rows={5} value={notes} onChange={event => setNotes(event.target.value)} placeholder="Not enough drawers, a dark corner, an island no one sits at…" />
          </div>
          <div className="tb-field">
            <label htmlFor="tb-photos">Photos of the room (optional, up to 6)</label>
            <input id="tb-photos" type="file" accept="image/*" multiple onChange={event => { addFiles(event.target.files); event.target.value = '' }} />
            <p className="tb-hint">Photos stay on this device in the demo. They are previewed here and not uploaded.</p>
            {uploads.length > 0 && <ul className="tb-uploads">
              {uploads.map(upload => <li key={upload.id}><img src={upload.url} alt={`Preview of ${upload.name}`} />
                <button type="button" onClick={() => removeUpload(upload.id)} aria-label={`Remove ${upload.name}`}>×</button></li>)}
            </ul>}
          </div>
        </>}

        {step === 3 && <div className="tb-field-grid">
          <div className="tb-field"><label htmlFor="tb-name">Name</label><input id="tb-name" autoComplete="name" value={contact.name} onChange={event => setContact({ ...contact, name: event.target.value })} required /></div>
          <div className="tb-field"><label htmlFor="tb-email">Email</label><input id="tb-email" type="email" autoComplete="email" value={contact.email} onChange={event => setContact({ ...contact, email: event.target.value })} required /></div>
          <div className="tb-field"><label htmlFor="tb-phone">Phone (optional)</label><input id="tb-phone" type="tel" autoComplete="tel" value={contact.phone} onChange={event => setContact({ ...contact, phone: event.target.value })} /></div>
          <div className="tb-field"><label htmlFor="tb-zip">ZIP code</label><input id="tb-zip" inputMode="numeric" autoComplete="postal-code" maxLength={5} value={contact.zip} onChange={event => setContact({ ...contact, zip: event.target.value })} required /></div>
          <div className="tb-field is-full">
            <Chips legend="Best time for a visit" options={VISITS} value={[contact.visit]} onChange={value => setContact({ ...contact, visit: value[0] })} />
          </div>
        </div>}

        <div className="tb-form-nav">
          {step > 0 && <button type="button" className="tb-button tb-button-line" onClick={back}>Back</button>}
          <button type="submit" className="tb-button tb-button-ink">{step === STEPS.length - 1 ? 'Preview my request' : 'Continue'}</button>
        </div>
        <p className="tb-fine">Demo form: nothing you enter here is sent or stored beyond this browser tab.</p>
      </form>
      {briefCard}
    </section>
  </main>
}
