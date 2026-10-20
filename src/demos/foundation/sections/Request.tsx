import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { BRIEF_EVENT, clearBrief, readBrief } from '../brief'
import { business } from '../content'
import { symptoms } from '../symptoms'

type Situation = 'own' | 'buying' | 'selling'
interface Photo { name: string; url: string }

const TIMES = ['Weekday mornings', 'Weekday afternoons', 'Evenings', 'Saturdays']
const STEPS = ['What you’re seeing', 'Photos', 'The house', 'Contact']

/**
 * A short request in four steps. Nothing here is sent: this is a design
 * concept, and the preview at the end says so plainly. On a live site the
 * `Request` object below is the integration boundary.
 */
export default function Request() {
  const id = useId()
  const [step, setStep] = useState(0)
  const [done, setDone] = useState(false)
  const [picked, setPicked] = useState<string[]>(() => readBrief().symptoms)
  const [source, setSource] = useState<string | undefined>(() => readBrief().source)
  const [note, setNote] = useState(() => readBrief().note ?? '')
  const [photos, setPhotos] = useState<Photo[]>([])
  const [zip, setZip] = useState('')
  const [situation, setSituation] = useState<Situation>('own')
  const [closing, setClosing] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [times, setTimes] = useState<string[]>([])
  const [error, setError] = useState('')
  const headingRef = useRef<HTMLHeadingElement>(null)
  const photosRef = useRef(photos)

  useEffect(() => { photosRef.current = photos }, [photos])
  useEffect(() => () => photosRef.current.forEach(photo => URL.revokeObjectURL(photo.url)), [])

  useEffect(() => {
    const update = () => {
      const brief = readBrief()
      setPicked(brief.symptoms)
      setSource(brief.source)
      if (brief.note) setNote(brief.note)
      setStep(0)
      setDone(false)
    }
    window.addEventListener(BRIEF_EVENT, update)
    return () => window.removeEventListener(BRIEF_EVENT, update)
  }, [])

  const toggle = (list: string[], value: string) => (list.includes(value) ? list.filter(item => item !== value) : [...list, value])
  const addPhotos = (files: FileList | null) => {
    if (!files) return
    const next = Array.from(files).filter(file => file.type.startsWith('image/')).slice(0, 6 - photos.length).map(file => ({ name: file.name, url: URL.createObjectURL(file) }))
    setPhotos(previous => [...previous, ...next])
  }
  const removePhoto = (photo: Photo) => { URL.revokeObjectURL(photo.url); setPhotos(previous => previous.filter(item => item !== photo)) }

  const valid = (): string => {
    if (step === 2 && !/^\d{5}$/.test(zip.trim())) return 'Enter a 5-digit ZIP code.'
    if (step === 2 && situation !== 'own' && !closing) return 'Add your closing date, or choose “I own it”.'
    if (step === 3 && !name.trim()) return 'Add your name.'
    if (step === 3 && !phone.trim() && !email.trim()) return 'Add a phone number or an email so we can reply.'
    if (step === 3 && email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Check the email address.'
    return ''
  }
  const next = (event: FormEvent) => {
    event.preventDefault()
    const problem = valid()
    setError(problem)
    if (problem) return
    if (step < STEPS.length - 1) setStep(step + 1)
    else setDone(true)
    requestAnimationFrame(() => headingRef.current?.focus())
  }
  const back = () => { setError(''); setStep(Math.max(0, step - 1)); requestAnimationFrame(() => headingRef.current?.focus()) }
  const restart = () => { clearBrief(); setDone(false); setStep(0); setPicked([]); setNote(''); setSource(undefined) }

  const chosen = symptoms.filter(item => picked.includes(item.slug))

  return <section id="request" className="dt-request" aria-labelledby={`${id}-title`}>
    <div className="dt-wrap dt-request-grid">
      <div className="dt-request-copy">
        <p className="dt-eyebrow">Book an inspection</p>
        <h2 id={`${id}-title`}>Tell us what you’re seeing.</h2>
        <p>Four short steps. Photos help us arrive with the right equipment. If you’re buying or selling, add your closing date and we’ll plan around it.</p>
        <p className="dt-request-phone">Prefer to talk? <a href={business.phoneHref}>{business.phone}</a></p>
      </div>
      <div className="dt-request-card">
        {done ? <div className="dt-request-done">
          <h3 ref={headingRef} tabIndex={-1}>Preview of your request</h3>
          <p className="dt-demo-note">This is a design concept, so nothing was sent. On a live site this would go straight to Datum’s scheduling team.</p>
          <dl className="dt-summary">
            <div><dt>Seeing</dt><dd>{chosen.length ? chosen.map(item => item.short).join(', ') : 'Not specified'}{note ? ` · ${note}` : ''}</dd></div>
            <div><dt>Photos</dt><dd>{photos.length ? `${photos.length} attached` : 'None'}</dd></div>
            <div><dt>House</dt><dd>ZIP {zip} · {situation === 'own' ? 'Owner' : situation === 'buying' ? `Buying, closing ${closing}` : `Selling, closing ${closing}`}</dd></div>
            <div><dt>Contact</dt><dd>{name} · {[phone, email].filter(Boolean).join(' · ')}{times.length ? ` · ${times.join(', ')}` : ''}</dd></div>
          </dl>
          <button type="button" className="dt-button dt-button-line" onClick={restart}>Start again</button>
        </div> : <form onSubmit={next} noValidate>
          <ol className="dt-progress" aria-label="Steps">
            {STEPS.map((label, index) => <li key={label} className={index === step ? 'is-current' : index < step ? 'is-done' : ''} aria-current={index === step ? 'step' : undefined}><span className="dt-mono">{index + 1}</span>{label}</li>)}
          </ol>
          <h3 ref={headingRef} tabIndex={-1} className="dt-request-step">{STEPS[step]}</h3>

          {step === 0 && <fieldset>
            <legend className="dt-visually-hidden">What you’re seeing</legend>
            {source && <p className="dt-fine">Added from the {source.toLowerCase()}.</p>}
            <div className="dt-chips">
              {symptoms.map(item => <button key={item.slug} type="button" aria-pressed={picked.includes(item.slug)} onClick={() => setPicked(toggle(picked, item.slug))}>{item.short}</button>)}
            </div>
            <label htmlFor={`${id}-note`}>Anything else? <span>(optional)</span></label>
            <textarea id={`${id}-note`} rows={3} value={note} onChange={event => setNote(event.target.value)} placeholder="Where it is, when you noticed it, whether it has changed" />
          </fieldset>}

          {step === 1 && <fieldset>
            <legend className="dt-visually-hidden">Photos</legend>
            <label className="dt-drop" htmlFor={`${id}-photos`}>
              <span>Add up to six photos</span>
              <span className="dt-fine">Put a coin or ruler beside a crack for scale. Photos stay in this browser.</span>
            </label>
            <input id={`${id}-photos`} className="dt-file" type="file" accept="image/*" multiple onChange={event => { addPhotos(event.target.files); event.target.value = '' }} />
            {photos.length > 0 && <ul className="dt-thumbs">{photos.map(photo => <li key={photo.url}>
              <img src={photo.url} alt={photo.name} />
              <button type="button" onClick={() => removePhoto(photo)} aria-label={`Remove ${photo.name}`}>×</button>
            </li>)}</ul>}
          </fieldset>}

          {step === 2 && <fieldset>
            <legend className="dt-visually-hidden">The house</legend>
            <label htmlFor={`${id}-zip`}>ZIP code</label>
            <input id={`${id}-zip`} inputMode="numeric" autoComplete="postal-code" maxLength={5} value={zip} onChange={event => setZip(event.target.value.replace(/\D/g, ''))} />
            <p className="dt-label" id={`${id}-situation`}>This house is</p>
            <div className="dt-segment" role="group" aria-labelledby={`${id}-situation`}>
              {([['own', 'I own it'], ['buying', 'I’m buying it'], ['selling', 'I’m selling it']] as [Situation, string][]).map(([value, label]) => <button key={value} type="button" aria-pressed={situation === value} onClick={() => setSituation(value)}>{label}</button>)}
            </div>
            {situation !== 'own' && <>
              <label htmlFor={`${id}-closing`}>Closing date</label>
              <input id={`${id}-closing`} type="date" value={closing} onChange={event => setClosing(event.target.value)} />
            </>}
          </fieldset>}

          {step === 3 && <fieldset>
            <legend className="dt-visually-hidden">Contact</legend>
            <label htmlFor={`${id}-name`}>Name</label>
            <input id={`${id}-name`} autoComplete="name" value={name} onChange={event => setName(event.target.value)} />
            <div className="dt-two">
              <div><label htmlFor={`${id}-phone`}>Mobile</label><input id={`${id}-phone`} type="tel" autoComplete="tel" value={phone} onChange={event => setPhone(event.target.value)} /></div>
              <div><label htmlFor={`${id}-email`}>Email</label><input id={`${id}-email`} type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} /></div>
            </div>
            <p className="dt-label" id={`${id}-times`}>Good times to visit <span>(optional)</span></p>
            <div className="dt-chips" role="group" aria-labelledby={`${id}-times`}>
              {TIMES.map(time => <button key={time} type="button" aria-pressed={times.includes(time)} onClick={() => setTimes(toggle(times, time))}>{time}</button>)}
            </div>
          </fieldset>}

          {error && <p className="dt-error" role="alert">{error}</p>}
          <div className="dt-form-nav">
            {step > 0 && <button type="button" className="dt-text-button" onClick={back}>← Back</button>}
            <button type="submit" className="dt-button dt-button-ink">{step < STEPS.length - 1 ? 'Continue' : 'Preview request'} <span aria-hidden="true">→</span></button>
          </div>
        </form>}
      </div>
    </div>
  </section>
}
