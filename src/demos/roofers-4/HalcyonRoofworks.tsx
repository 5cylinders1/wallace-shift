import { useCallback, useEffect, useState, type FormEvent } from 'react'
import DroneFilm from './DroneFilm'
import InvestmentIntro from './InvestmentIntro'
import ServiceJourney from './ServiceJourney'
import MaterialGallery from './MaterialGallery'
import ProcessTimeline from './ProcessTimeline'
import Visualizer, { type VisualizerSelection } from './Visualizer'
import { brand, faqs, ledgerEntries, ledgerFeatures, money } from './content'
import { roofingGalleryPath, studioUrl } from './routes'

const Arrow = () => <span aria-hidden="true">↗</span>

function Brand() {
  return <a className="hr-brand" href="#top" aria-label={`${brand.name} home`}>
    <svg viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <path d="M4 26 20 8l16 18" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M11 26 20 16l9 10" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M4 33h32" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
    <span>Halcyon<span>ROOFWORKS</span></span>
  </a>
}

/** Integration boundary for a future contractor endpoint. Nothing is sent. */
type ConsultationPreview = {
  name: string
  email: string
  address: string
  project: string
  timeline: string
  notes: string
  selection?: { material: string; finish: string; area: number; range: string }
}

const nav = [
  ['#investment', 'The investment'],
  ['#materials', 'Materials'],
  ['#visualizer', 'Visualizer'],
  ['#ledger', 'Transparency'],
  ['#process', 'Process'],
] as const

export default function HalcyonRoofworks() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [selection, setSelection] = useState<VisualizerSelection | null>(null)
  const [preview, setPreview] = useState<ConsultationPreview | null>(null)
  const [includeSelection, setIncludeSelection] = useState(true)
  const onSelection = useCallback((next: VisualizerSelection) => setSelection(next), [])

  useEffect(() => {
    if (!menuOpen) return
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setMenuOpen(false) }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [menuOpen])

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const field = (key: string) => String(data.get(key) ?? '').trim()
    setPreview({
      name: field('name'), email: field('email'), address: field('address'), project: field('project'), timeline: field('timeline'), notes: field('notes'),
      selection: includeSelection && selection && selection.area ? { material: selection.material.name, finish: selection.color.name, area: selection.area, range: `${money(selection.low)} to ${money(selection.high)}` } : undefined,
    })
    requestAnimationFrame(() => document.getElementById('consultation-preview')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  return <div className="hr-site">
    <a className="hr-skip" href="#main">Skip to content</a>
    <div className="hr-demo-bar">
      <span>Wallace Shift · Roofing demo 04 · A fictional contractor concept</span>
      <a href={roofingGalleryPath}>All designs <Arrow /></a>
    </div>
    <header className={`hr-header ${menuOpen ? 'is-open' : ''}`}>
      <div className="hr-wrap hr-header-inner">
        <Brand />
        <nav aria-label="Primary" id="hr-nav">
          {nav.map(([href, label]) => <a key={href} href={href} onClick={() => setMenuOpen(false)}>{label}</a>)}
          <a className="hr-nav-cta" href="#consultation" onClick={() => setMenuOpen(false)}>Book a consultation <Arrow /></a>
        </nav>
        <button type="button" className="hr-menu" aria-expanded={menuOpen} aria-controls="hr-nav" onClick={() => setMenuOpen(open => !open)}>{menuOpen ? 'Close' : 'Menu'}</button>
      </div>
    </header>

    <main id="main">
      <DroneFilm />

      <section className="hr-proof" aria-label="What Halcyon does">
        <div className="hr-wrap hr-proof-inner">
          <p>Luxury roof installation for custom estates. New builds, performance re-roofs, and stewardship of the roofs we build.</p>
          <ul>
            <li><b>Metal · Slate · Cedar · Clay</b> Specified like architecture</li>
            <li><b>Drone-documented</b> Every working day, in your ledger</li>
            <li><b>Written warranty</b> Workmanship and material, in one vault</li>
          </ul>
        </div>
      </section>

      <InvestmentIntro />
      <ServiceJourney />
      <MaterialGallery />

      <section className="hr-visualizer" id="visualizer">
        <div className="hr-wrap">
          <div className="hr-section-head hr-section-head-row">
            <div>
              <p className="hr-kicker"><span /> Roof visualizer</p>
              <h2>See your home in slate, metal, cedar or clay before you decide.</h2>
            </div>
            <p className="hr-lede">Upload a photo, choose your material and finish, and generate an AI roof preview. Compare it with the original and explore a planning range beside it.</p>
          </div>
          <Visualizer onSelection={onSelection} />
        </div>
      </section>

      <section className="hr-ledger" id="ledger">
        <div className="hr-wrap">
          <div className="hr-section-head">
            <p className="hr-kicker hr-kicker-light"><span /> High-transparency project management</p>
            <h2>You should never have to climb a ladder to know how your project is going.</h2>
            <p className="hr-lede">Every Halcyon client receives access to the Halcyon Ledger, our private project record. Your project lead posts drone photographs, video walk-throughs and written reports as the work happens, so the people who own the home can see the roof the way we see it.</p>
          </div>
          <div className="hr-ledger-grid">
            <div className="hr-ledger-mock" role="img" aria-label="A preview of the Halcyon Ledger client portal showing a project timeline of drone photographs, videos and reports">
              <div className="hr-ledger-top">
                <span>Halcyon Ledger</span>
                <span>Aspen Ridge residence · Standing-seam re-roof</span>
                <span className="hr-ledger-pill">Day 05 of 07</span>
              </div>
              <div className="hr-ledger-body">
                <div className="hr-ledger-hero">
                  <img src="/demos/roofers-4/material-metal.jpg" alt="" loading="lazy" width="1440" height="1080" />
                  <span>Today · 17:30 · Drone set 05 · 12 images</span>
                </div>
                <ol className="hr-ledger-list">
                  {ledgerEntries.map(entry => <li key={entry.day + entry.time}>
                    <span className="hr-ledger-when">{entry.day}<i>{entry.time}</i></span>
                    <span className="hr-ledger-kind">{entry.kind}</span>
                    <span className="hr-ledger-text">{entry.text}</span>
                  </li>)}
                </ol>
              </div>
              <p className="hr-ledger-note">Concept preview of the client portal. Access is provided with your signed proposal.</p>
            </div>
            <div className="hr-ledger-features">
              {ledgerFeatures.map(feature => <div key={feature.title}>
                <h3>{feature.title}</h3>
                <p>{feature.text}</p>
              </div>)}
              <a href="#consultation" className="hr-cta-primary">Ask for a sample project record <Arrow /></a>
            </div>
          </div>
        </div>
      </section>

      <ProcessTimeline />

      <section className="hr-faq" aria-label="Questions">
        <div className="hr-wrap hr-faq-inner">
          <div>
            <p className="hr-kicker"><span /> Questions we hear first</p>
            <h2>Straight answers, before the consultation.</h2>
          </div>
          <div className="hr-faq-list">
            {faqs.map(faq => <details key={faq.q}>
              <summary>{faq.q}</summary>
              <p>{faq.a}</p>
            </details>)}
          </div>
        </div>
      </section>

      <section className="hr-consult" id="consultation">
        <div className="hr-wrap hr-consult-inner">
          <div className="hr-consult-copy">
            <p className="hr-kicker hr-kicker-light"><span /> Book a roof consultation</p>
            <h2>Start with a survey you keep.</h2>
            <p>Tell us about the property and the project. We will walk the site with you, fly the roof and send the survey whether or not we go further together.</p>
            <ul className="hr-consult-points">
              <li>On-site consultation with a project lead, not a salesperson</li>
              <li>Drone survey and written findings within a week</li>
              <li>Fixed-scope proposal with ledger access from day one</li>
            </ul>
            <p className="hr-consult-contact">{brand.region}<br />{brand.phone} · {brand.email}</p>
          </div>
          <form className="hr-form" onSubmit={submit}>
            <label><span>Your name</span><input name="name" required autoComplete="name" /></label>
            <label><span>Email</span><input name="email" type="email" required autoComplete="email" /></label>
            <label className="hr-form-wide"><span>Property address</span><input name="address" autoComplete="street-address" placeholder="Street, city" /></label>
            <label><span>Project</span>
              <select name="project" defaultValue="re-roof">
                <option value="new-build">New custom build</option>
                <option value="re-roof">Performance re-roof</option>
                <option value="assessment">Repair or assessment</option>
              </select>
            </label>
            <label><span>Timeline</span>
              <select name="timeline" defaultValue="season">
                <option value="now">As soon as possible</option>
                <option value="season">This season</option>
                <option value="year">Within a year</option>
                <option value="planning">Still planning</option>
              </select>
            </label>
            <label className="hr-form-wide"><span>Notes</span><textarea name="notes" rows={3} placeholder="Architect, builder, materials you are drawn to, anything we should know" /></label>
            {selection && selection.area > 0 && <label className="hr-form-wide hr-form-check">
              <input type="checkbox" checked={includeSelection} onChange={event => setIncludeSelection(event.target.checked)} />
              <span>Include my visualizer selection: {selection.material.name}, {selection.color.name}, {selection.area.toLocaleString('en-US')} sq ft, {money(selection.low)} to {money(selection.high)}</span>
            </label>}
            <button type="submit" className="hr-cta-primary hr-cta-wide">Preview my request <Arrow /></button>
            <p className="hr-fine">Demo form. Nothing is sent, stored or booked; your preview appears below and clears on reload.</p>
          </form>
        </div>
        {preview && <div className="hr-wrap"><div className="hr-preview" id="consultation-preview">
          <p className="hr-kicker"><span /> Unsent preview</p>
          <h3>What Halcyon would receive</h3>
          <dl>
            <div><dt>Name</dt><dd>{preview.name}</dd></div>
            <div><dt>Email</dt><dd>{preview.email}</dd></div>
            <div><dt>Property</dt><dd>{preview.address || 'Not provided'}</dd></div>
            <div><dt>Project</dt><dd>{preview.project}</dd></div>
            <div><dt>Timeline</dt><dd>{preview.timeline}</dd></div>
            {preview.selection && <div><dt>Visualizer</dt><dd>{preview.selection.material}, {preview.selection.finish}, {preview.selection.area.toLocaleString('en-US')} sq ft, {preview.selection.range}</dd></div>}
            {preview.notes && <div><dt>Notes</dt><dd>{preview.notes}</dd></div>}
          </dl>
          <p className="hr-fine">In a live site this request would be delivered to the contractor with the survey booking. In this demo it stays in the page.</p>
        </div></div>}
      </section>
    </main>

    <footer className="hr-footer">
      <div className="hr-wrap hr-footer-inner">
        <div>
          <Brand />
          <p>{brand.tagline}</p>
        </div>
        <nav aria-label="Footer">
          {nav.map(([href, label]) => <a key={href} href={href}>{label}</a>)}
          <a href="#consultation">Consultation</a>
        </nav>
        <p className="hr-footer-fine">{brand.name} is a fictional contractor created for a website concept by <a href={studioUrl}>Wallace Shift</a>. Films and photographs are AI-generated concept imagery. Pricing, service lives and ratings are illustrative. <a href={roofingGalleryPath}>See all roofing designs</a>.</p>
      </div>
    </footer>
  </div>
}
