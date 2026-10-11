import { useEffect, useRef, useState, type FormEvent } from 'react'
import { submitContactRequest } from '../../lib/contactAdapter'
import {
  roofingContactEmail,
  roofingDemoHref,
  roofingDesigns,
  roofingOffer,
  type RoofingDesign,
} from './catalog'

function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return <span aria-hidden="true">{diagonal ? '↗' : '→'}</span>
}

function Wordmark() {
  return <a className="ro-wordmark" href="https://www.wallaceshift.com/" aria-label="Wallace Shift home">
    <span>WALLACE</span><i aria-hidden="true">/</i><span>SHIFT</span>
  </a>
}

function DesignCard({ design, onChoose }: { design: RoofingDesign; onChoose: (id: string) => void }) {
  const available = design.status === 'available'
  const demoHref = roofingDemoHref(design, window.location.hostname)
  return <article className="ro-design">
    <a className="ro-design-image" href={demoHref} aria-label={`Explore the ${design.name} demo`}>
      <img src={design.thumbnail} alt={design.thumbnailAlt} width="1440" height="900" loading="lazy" />
      <span className="ro-preview-label">Explore the live site <Arrow diagonal /></span>
    </a>
    <div className="ro-design-body">
      <div className="ro-card-meta"><span>DESIGN {design.number}</span><span className={`ro-status ${available ? 'is-available' : 'is-claimed'}`}><i aria-hidden="true" />{available ? 'Available to request' : 'Claimed'}</span></div>
      <h3>{design.name}</h3>
      <p className="ro-character">{design.character}</p>
      <p className="ro-description">{design.description}</p>
      <ul className="ro-features">{design.features?.map(feature => <li key={feature}>{feature}</li>)}</ul>
      <div className="ro-card-actions">
        <a href={demoHref}>View live demo <Arrow diagonal /></a>
        {available && <button type="button" onClick={() => onChoose(design.id)}>Request this design <Arrow /></button>}
      </div>
    </div>
  </article>
}

type FormStatus = 'idle' | 'submitting' | 'sent' | 'invalid' | 'not_configured' | 'error'

export function RoofersOffer() {
  const readyDesigns = roofingDesigns.filter(design => design.status !== 'coming-soon')
  const upcomingDesigns = roofingDesigns.filter(design => design.status === 'coming-soon')
  const availableDesigns = roofingDesigns.filter(design => design.status === 'available')
  const [selectedDesign, setSelectedDesign] = useState('')
  const [status, setStatus] = useState<FormStatus>('idle')
  const [honeypot, setHoneypot] = useState('')
  const nameInput = useRef<HTMLInputElement>(null)
  const businessInput = useRef<HTMLInputElement>(null)
  const successHeading = useRef<HTMLHeadingElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const previousStatus = useRef<FormStatus>('idle')

  useEffect(() => {
    if (status === 'sent') successHeading.current?.focus({ preventScroll: true })
    if (status === 'idle' && previousStatus.current === 'sent') {
      nameInput.current?.focus({ preventScroll: true })
    }
    previousStatus.current = status
  }, [status])

  function chooseDesign(id: string) {
    setSelectedDesign(id)
    if (status === 'sent') setStatus('idle')
    document.getElementById('enquire')?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
      block: 'start',
    })
    // Keyboard users arrive at the same place as pointer users, without a
    // second browser scroll fighting the section's smooth scroll.
    nameInput.current?.focus({ preventScroll: true })
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (status === 'submitting') return
    const data = new FormData(event.currentTarget)
    const name = String(data.get('name') ?? '').trim()
    const email = String(data.get('email') ?? '').trim()
    const company = String(data.get('roofing-business') ?? '').trim()
    const design = availableDesigns.find(item => item.id === selectedDesign)
    if (!name || !email || !company || (selectedDesign && !design)) {
      setStatus('invalid')
      if (!name) nameInput.current?.focus()
      else if (!company) businessInput.current?.focus()
      return
    }
    setStatus('submitting')
    const website = String(data.get('website') ?? '').trim()
    const message = String(data.get('message') ?? '').trim()
    const result = await submitContactRequest({
      name,
      email,
      company: honeypot,
      website,
      service: 'Roofing website + managed automation',
      package: design ? `Roofing collection: ${design.name}` : 'Roofing collection: help me choose',
      message: [
        `Roofing company: ${company}`,
        `Requested design: ${design?.name ?? 'I would like help choosing a design'}`,
        `Offer: ${roofingOffer}`,
        'Acknowledged: the offer requires 12 months of paid managed automation, with scope and pricing agreed in writing before commitment.',
        '',
        'What the business needs:',
        message || 'I would like to discuss the right automation plan for my roofing business.',
      ].join('\n'),
    })
    if (result.ok) {
      setStatus('sent')
      formRef.current?.reset()
      setHoneypot('')
      return
    }
    setStatus(result.reason === 'network_error' ? 'error' : result.reason)
  }

  return <div className="ro-site">
    <a className="ro-skip" href="#main">Skip to content</a>
    <header className="ro-header ro-wrap">
      <Wordmark />
      <nav aria-label="Main navigation"><a href="#collection">The collection</a><a href="#automation">The offer</a><a className="ro-header-cta" href="#enquire">Let’s talk <Arrow diagonal /></a></nav>
    </header>

    <main id="main">
      <section className="ro-hero ro-wrap" aria-labelledby="hero-heading">
        <div className="ro-hero-top"><p className="ro-eyebrow">Websites & automation for roofers</p><span className="ro-edition">THE COLLECTION / 01—05</span></div>
        <div className="ro-hero-layout">
          <div className="ro-hero-heading"><h1 id="hero-heading">Built to win<br />the <em>right</em> work.</h1><p>Make the first impression count. Then give every good inquiry a clear path to the next step.</p><a className="ro-button ro-button-light" href="#collection">Find your website <Arrow /></a></div>
          <div className="ro-offer-card"><p className="ro-eyebrow">A limited collection. Five client places.</p><p className="ro-offer-value"><span>$5,000</span><span>website value</span></p><h2>{roofingOffer}</h2><p className="ro-offer-note">Choose a design. Make it your brand. Pair it with a paid automation plan built around your business.</p><div className="ro-offer-rule"><span>Website included</span><span>12 months of managed automation</span></div></div>
        </div>
        <div className="ro-hero-foot"><span>Designed by Wallace Shift</span><span>{readyDesigns.length} live demos <i aria-hidden="true">/</i> {upcomingDesigns.length} in progress</span><a href="#collection">Explore below <span aria-hidden="true">↓</span></a></div>
      </section>

      <section className="ro-collection" id="collection" aria-labelledby="collection-heading">
        <div className="ro-wrap">
          <div className="ro-section-intro"><div><p className="ro-eyebrow">01 / Find your direction</p><h2 id="collection-heading">Different character.<br /><em>One higher standard.</em></h2></div><p>Explore the complete sites, not just a picture. Each is a starting point for your company’s brand, services and service area.</p></div>
          <div className="ro-design-grid">{readyDesigns.map(design => <DesignCard key={design.id} design={design} onChoose={chooseDesign} />)}</div>
          <div className="ro-upcoming-grid">{upcomingDesigns.map(design => <article className="ro-upcoming" key={design.id}><span className="ro-upcoming-number" aria-hidden="true">{design.number}</span><div><p className="ro-eyebrow">Design {design.number} / Coming soon</p><h3>{design.name}</h3><p>The next addition to the collection.</p></div><span className="ro-upcoming-mark" aria-hidden="true">/</span></article>)}</div>
          <p className="ro-demo-note">Northvane Roofing and Alder & Stone are illustrative contractor brands. Content, imagery and tools shown in the demos are examples; your final website and automation scope will be agreed together.</p>
        </div>
      </section>

      <section className="ro-dashboard-section" id="dashboard" aria-labelledby="dashboard-heading">
        <div className="ro-wrap">
          <div className="ro-dashboard">
            <div className="ro-dashboard-preview">
              <a className="ro-dashboard-image" href="/roofing-dashboard" aria-label="Explore the roofing dashboard demo">
                <img src="/demos/roofers-offer/dashboard.jpg" alt="Roofing dashboard showing sample storm areas and nearby customer properties on a map" width="1440" height="1248" loading="lazy" />
              </a>
              <p className="ro-dashboard-caption"><span>Sample storm map</span><span>Map © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a></span></p>
            </div>
            <div className="ro-dashboard-body">
              <p className="ro-eyebrow">Included with all sites</p>
              <h2 id="dashboard-heading">Your roofing dashboard.</h2>
              <p>Explore storm maps, customer records and inspection follow-ups in an interactive demo with sample data.</p>
              <a className="ro-button ro-button-dark" href="/roofing-dashboard">View dashboard demo <Arrow diagonal /></a>
            </div>
          </div>
        </div>
      </section>

      <section className="ro-automation ro-wrap" id="automation" aria-labelledby="automation-heading">
        <div className="ro-section-intro"><div><p className="ro-eyebrow">02 / More than a website</p><h2 id="automation-heading">A strong front door.<br /><em>A better way to follow through.</em></h2></div><p>Managed automation connects the repetitive steps behind your business. We agree on the workflows, set them up and manage them with you.</p></div>
        <div className="ro-workflows">
          <article><span className="ro-workflow-number">01</span><h3>Capture the right details</h3><p>Give new inquiries a clear route in. Collect the property, project and contact information your team needs to take the next step.</p></article>
          <article><span className="ro-workflow-number">02</span><h3>Keep the next step moving</h3><p>Build a process for routing inquiries, following up on estimates or coordinating appointments around the tools you already use.</p></article>
          <article><span className="ro-workflow-number">03</span><h3>Keep it working for you</h3><p>Have someone responsible for maintaining and refining your agreed workflows as your business and needs change.</p></article>
        </div>
        <p className="ro-scope-note">These are example workflows. Your plan, service scope and pricing are confirmed in writing before you commit.</p>
        <div className="ro-terms"><div><p className="ro-eyebrow">How the offer works</p><h3>Your website is included.<br />The automation is a paid service.</h3></div><ol><li><span>01</span><div><strong>Choose your direction</strong><p>Explore a live demo and tell us about your roofing business.</p></div></li><li><span>02</span><div><strong>Agree on the plan</strong><p>We confirm design availability, the website scope and the price of your 12-month managed automation commitment.</p></div></li><li><span>03</span><div><strong>Make it yours</strong><p>Once the agreement is in place, we adapt the website to your business and put your agreed workflows into action.</p></div></li></ol></div>
      </section>

      <section className="ro-enquire" id="enquire" aria-labelledby="enquire-heading">
        <div className="ro-wrap ro-enquire-layout">
          <div className="ro-enquire-copy"><p className="ro-eyebrow">03 / Make your next move</p><h2 id="enquire-heading">See your business<br /><em>in the collection.</em></h2><p>Tell us which direction feels right and what you want to improve. We’ll talk through the fit, availability and the automation plan.</p><div className="ro-enquire-note"><span aria-hidden="true">↗</span><p>Five client places in this offer. An inquiry starts the conversation; it doesn’t reserve a design or commit you to a contract.</p></div><a className="ro-email" href={`mailto:${roofingContactEmail}`}>{roofingContactEmail} <Arrow diagonal /></a></div>
          <div className="ro-form-panel">
            {status === 'sent' ? <div className="ro-success" role="status"><span aria-hidden="true">↗</span><p className="ro-eyebrow">Inquiry received</p><h3 ref={successHeading} tabIndex={-1}>Let’s build from here.</h3><p>Thanks for telling us about your business. We’ll follow up personally to confirm design availability and discuss scope and pricing. Your design is not reserved yet.</p><button type="button" className="ro-text-button" onClick={() => { setStatus('idle'); setSelectedDesign('') }}>Send another inquiry <Arrow /></button></div> : <form ref={formRef} onSubmit={handleSubmit} aria-describedby="ro-form-terms">
              <div className="ro-form-row"><label htmlFor="ro-name">Your name<input ref={nameInput} id="ro-name" name="name" autoComplete="name" required maxLength={120} placeholder="First and last name" disabled={status === 'submitting'} /></label><label htmlFor="ro-email">Work email<input id="ro-email" name="email" type="email" autoComplete="email" required maxLength={200} placeholder="you@company.com" disabled={status === 'submitting'} /></label></div>
              <div className="ro-form-row"><label htmlFor="ro-business">Roofing company<input ref={businessInput} id="ro-business" name="roofing-business" autoComplete="organization" required maxLength={200} placeholder="Your company name" disabled={status === 'submitting'} /></label><label htmlFor="ro-website">Current website <span className="ro-optional">(optional)</span><input id="ro-website" name="website" type="url" autoComplete="url" maxLength={300} placeholder="https://" disabled={status === 'submitting'} /></label></div>
              <label htmlFor="ro-design">Which design caught your eye?<select id="ro-design" name="design" value={selectedDesign} onChange={event => setSelectedDesign(event.target.value)} disabled={status === 'submitting'}><option value="">I’d like help choosing</option>{availableDesigns.map(design => <option key={design.id} value={design.id}>{design.number} — {design.name}</option>)}</select></label>
              <label htmlFor="ro-message">What would you like to improve? <span className="ro-optional">(optional)</span><textarea id="ro-message" name="message" rows={3} maxLength={3000} placeholder="Better inquiries, faster follow-up, less time on admin…" disabled={status === 'submitting'} /></label>
              <div className="ro-honeypot" aria-hidden="true"><label htmlFor="ro-company-check">Company<input id="ro-company-check" name="company" value={honeypot} onChange={event => setHoneypot(event.target.value)} tabIndex={-1} autoComplete="off" /></label></div>
              <label className="ro-acknowledgement"><input name="acknowledged" type="checkbox" required disabled={status === 'submitting'} /><span>I understand the website offer requires a 12-month commitment to paid managed automation, with pricing agreed before I commit.</span></label>
              <button className="ro-button ro-button-dark ro-submit" type="submit" disabled={status === 'submitting'}>{status === 'submitting' ? 'Sending your inquiry…' : 'Ask about the offer'}<Arrow /></button>
              <p id="ro-form-terms" className="ro-form-terms">No payment is collected here. We’ll use your details to respond to this inquiry. <a href="https://www.wallaceshift.com/privacy">Privacy policy</a></p>
              <div className="ro-form-feedback" aria-live="polite">{status === 'invalid' && <p role="alert">Please check your details and choose an available design, then try again.</p>}{(status === 'not_configured' || status === 'error') && <p role="alert">Your inquiry hasn’t been sent. Please try again or email <a href={`mailto:${roofingContactEmail}`}>{roofingContactEmail}</a>.</p>}</div>
            </form>}
          </div>
        </div>
      </section>
    </main>
    <footer className="ro-footer ro-wrap"><Wordmark /><p>Thoughtful websites. Useful automation.</p><div><a href="https://www.wallaceshift.com/">Visit the studio <Arrow diagonal /></a><span>© {new Date().getFullYear()} Wallace Shift</span></div></footer>
  </div>
}
