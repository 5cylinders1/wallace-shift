import { useEffect, useRef, useState, type FormEvent } from 'react'
import { brand, serviceOptions, type ServiceValue } from '../content'

export interface Brief {
  service?: ServiceValue
  source?: string
  notes?: string
}

export interface DesignSummary {
  title: string
  detail: string
  range: string
}

/** Integration boundary for a future contractor endpoint. Nothing is sent. */
interface Request {
  name: string
  phone: string
  email: string
  address: string
  service: string
  timing: string
  notes: string
  design?: DesignSummary
}

const timings = ['As soon as possible', 'Within a month', 'In the next few months', 'Just planning ahead']

interface BookingProps {
  brief: Brief & { version: number }
  design: DesignSummary | null
  onClearDesign: () => void
}

export default function Booking({ brief, design, onClearDesign }: BookingProps) {
  const [preview, setPreview] = useState<Request | null>(null)
  const [draft, setDraft] = useState<Request | null>(null)
  const [includeDesign, setIncludeDesign] = useState(true)
  const heading = useRef<HTMLHeadingElement>(null)

  useEffect(() => { if (preview) heading.current?.focus() }, [preview])

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const field = (key: string) => String(data.get(key) ?? '').trim()
    const request: Request = {
      name: field('name'), phone: field('phone'), email: field('email'), address: field('address'),
      service: serviceOptions.find(option => option.value === field('service'))?.label ?? 'Not sure yet',
      timing: field('timing'), notes: field('notes'),
      design: includeDesign && design ? design : undefined,
    }
    setDraft(request)
    setPreview(request)
  }

  const defaults = draft ?? { name: '', phone: '', email: '', address: '', service: '', timing: timings[0], notes: brief.notes ?? '' }
  const serviceDefault = draft ? serviceOptions.find(option => option.label === draft.service)?.value ?? 'unsure' : brief.service ?? 'unsure'

  return <section id="book" className="st-book st-opaque" aria-labelledby="st-book-title">
    <div className="st-wrap st-book-grid">
      <div className="st-book-copy">
        <p className="st-kicker st-kicker-light"><span>07</span>Book an inspection</p>
        <h2 id="st-book-title">See your roof <em>layer by layer.</em></h2>
        <p className="st-lede">A free inspection with photos of everything we find, an honest outlook and a written scope if you need one. No pressure, no surprise invoice.</p>
        <ul className="st-book-points">
          <li>Drone and hands-on inspection</li>
          <li>Marked-up photo report</li>
          <li>Plain-language next steps</li>
        </ul>
        <p className="st-book-contact"><a href={brand.phoneHref}>{brand.phone}</a><span>{brand.area}</span></p>
      </div>

      <div className="st-book-card">
        {preview ? <div className="st-preview" role="status">
          <p className="st-kicker"><span>✓</span>Request prepared</p>
          <h3 ref={heading} tabIndex={-1}>Thanks, {preview.name.split(' ')[0] || 'there'}. Here’s what Stratum would receive.</h3>
          <dl>
            <div><dt>Service</dt><dd>{preview.service}</dd></div>
            <div><dt>Timing</dt><dd>{preview.timing}</dd></div>
            <div><dt>Contact</dt><dd>{[preview.email, preview.phone].filter(Boolean).join(' · ')}</dd></div>
            {preview.address && <div><dt>Address</dt><dd>{preview.address}</dd></div>}
            {preview.design && <div><dt>Studio design</dt><dd>{preview.design.title}<br /><small>{preview.design.detail} · {preview.design.range}</small></dd></div>}
            {preview.notes && <div><dt>Notes</dt><dd>{preview.notes}</dd></div>}
          </dl>
          <p className="st-preview-note">This is a demo, so nothing has been sent. On a live site this request would go straight to the contractor’s inbox and CRM.</p>
          <button type="button" className="st-button st-button-dark" onClick={() => setPreview(null)}>Edit request</button>
        </div> : <form key={`${brief.version}-${draft ? 'draft' : 'new'}`} onSubmit={submit} noValidate={false}>
          <div className="st-form-row">
            <label><span>Full name</span><input name="name" autoComplete="name" required maxLength={120} defaultValue={defaults.name} /></label>
            <label><span>Phone</span><input name="phone" type="tel" autoComplete="tel" maxLength={40} defaultValue={defaults.phone} /></label>
          </div>
          <div className="st-form-row">
            <label><span>Email</span><input name="email" type="email" autoComplete="email" required maxLength={200} defaultValue={defaults.email} /></label>
            <label><span>Property address <span className="st-optional">(optional)</span></span><input name="address" autoComplete="street-address" maxLength={240} defaultValue={defaults.address} /></label>
          </div>
          <div className="st-form-row">
            <label><span>What do you need?</span>
              <select name="service" defaultValue={serviceDefault}>
                {serviceOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label><span>Timing</span>
              <select name="timing" defaultValue={defaults.timing}>
                {timings.map(item => <option key={item}>{item}</option>)}
              </select>
            </label>
          </div>
          <label><span>Anything we should know? <span className="st-optional">(optional)</span></span><textarea name="notes" rows={3} maxLength={2000} defaultValue={defaults.notes} placeholder="Leaks, storm dates, access, questions…" /></label>
          {brief.source && <p className="st-brief-source">Prefilled from the {brief.source.toLowerCase()}.</p>}
          {design && <div className="st-design-chip">
            <label className="st-check"><input type="checkbox" checked={includeDesign} onChange={event => setIncludeDesign(event.target.checked)} /><span>Include my studio design</span></label>
            <p><strong>{design.title}</strong>{design.detail} · {design.range}</p>
            <button type="button" className="st-text-button" onClick={onClearDesign}>Remove</button>
          </div>}
          <button type="submit" className="st-button st-button-copper st-button-wide">Request my inspection <span aria-hidden="true">→</span></button>
          <p className="st-fine">Demo form: nothing is sent or stored. Your details stay in this browser tab.</p>
        </form>}
      </div>
    </div>
  </section>
}
