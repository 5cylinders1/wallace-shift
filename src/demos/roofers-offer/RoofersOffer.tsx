import { useEffect, useRef, useState, type FormEvent } from 'react'
import { submitContactRequest } from '../../lib/contactAdapter'
import { automationGroups, featuredAutomations } from './automationMenu'
import {
  roofingContactEmail,
  roofingDemoHref,
  roofingDesigns,
  roofingOffer,
  roofingMonthlyMinimum,
  roofingCommitmentMonths,
  type RoofingDesign,
} from './catalog'

const dollars = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const monthlyMinimum = dollars.format(roofingMonthlyMinimum)
const commitmentMinimum = dollars.format(roofingMonthlyMinimum * roofingCommitmentMonths)
const automationCount = automationGroups.reduce((total, group) => total + group.items.length, 0)

function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return <span aria-hidden="true">{diagonal ? '↗' : '→'}</span>
}

function Wordmark() {
  return <a className="ro-wordmark" href="https://www.wallaceshift.com/" aria-label="Wallace Shift home">
    <img src="/brand/wallace-shift-logo-white.svg" alt="" width="28" height="17" />
    <span>WALLACE SHIFT</span>
  </a>
}

function DesignCard({ design, onChoose }: { design: RoofingDesign; onChoose: (id: string) => void }) {
  const available = design.status === 'available'
  const demoHref = roofingDemoHref(design, window.location.hostname)
  return <article className="ro-design">
    <a className="ro-design-image" href={demoHref} aria-label={`Request access to the ${design.name} demo`}>
      <img src={design.thumbnail} alt={design.thumbnailAlt} width="1440" height="900" loading="lazy" />
      <span className="ro-preview-label">Request demo access <Arrow diagonal /></span>
    </a>
    <div className="ro-design-body">
      <div className="ro-card-meta"><span>DESIGN {design.number}</span><span className={`ro-status ${available ? 'is-available' : 'is-claimed'}`}><i aria-hidden="true" />{available ? 'Available to request' : 'Claimed'}</span></div>
      <h3>{design.name}</h3>
      <p className="ro-character">{design.character}</p>
      <p className="ro-description">{design.description}</p>
      <ul className="ro-features">{design.features?.map(feature => <li key={feature}>{feature}</li>)}</ul>
      <div className="ro-card-actions">
        <a href={demoHref}>Request demo access <Arrow diagonal /></a>
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
      service: 'Roofing website + CRM + managed automation',
      package: design ? `Roofing collection: ${design.name}` : 'Roofing collection: help me choose',
      message: [
        `Roofing company: ${company}`,
        `Requested design: ${design?.name ?? 'I would like help choosing a design'}`,
        `Offer: ${roofingOffer}`,
        `Acknowledged: the website + CRM offer requires ${roofingCommitmentMonths} months of paid managed automation starting at ${monthlyMinimum}/month, with scope and final pricing agreed in writing before commitment.`,
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
      <nav aria-label="Main navigation"><a href="#collection">The collection</a><a href="#automation">What we automate</a><a href="#offer">The offer</a></nav>
      <a className="ro-header-cta" href="#enquire">Let’s talk <Arrow diagonal /></a>
    </header>

    <main id="main">
      <section className="ro-hero" aria-labelledby="hero-heading">
        <div className="ro-wrap">
        <div className="ro-hero-top"><p className="ro-eyebrow">Websites, CRM & automation for roofers</p><span className="ro-edition">THE COLLECTION / 01—05</span></div>
        <div className="ro-hero-layout">
          <div className="ro-hero-heading"><h1 id="hero-heading">Built to win<br />the <em>right</em> work.</h1><p>A memorable website. A connected customer system. Less chasing between the first inquiry and the final review.</p><div className="ro-hero-actions"><a className="ro-button ro-button-light" href="#collection">Find your website <Arrow /></a><a className="ro-hero-link" href="#automation">See what we can automate <span aria-hidden="true">↓</span></a></div></div>
          <div className="ro-offer-card">
            <p className="ro-eyebrow">A limited collection. Five client places.</p>
            <h2><span>Motion website</span><span>+ roofing CRM.</span><em>Included.</em></h2>
            <p className="ro-offer-note">Your website build and CRM setup are included at no additional charge with a {roofingCommitmentMonths}-month managed automation plan.</p>
            <p className="ro-offer-price"><span>Managed automation starts at</span><strong>{monthlyMinimum}<small>/month</small></strong></p>
            <div className="ro-offer-rule"><span>Final price depends on your workflows, integrations and support needs.</span><a href="#offer">See plan details <Arrow /></a></div>
          </div>
        </div>
        <div className="ro-hero-foot"><span>Designed by Wallace Shift</span><span>{readyDesigns.length} live demos{upcomingDesigns.length > 0 && <><i aria-hidden="true">/</i> {upcomingDesigns.length} in progress</>}</span><a href="#automation">Explore the possibilities <span aria-hidden="true">↓</span></a></div>
        </div>
      </section>

      <section className="ro-collection" id="collection" aria-labelledby="collection-heading">
        <div className="ro-wrap">
          <div className="ro-section-intro"><div><p className="ro-eyebrow">01 / Find your direction</p><h2 id="collection-heading">Different character.<br /><em>One higher standard.</em></h2></div><p>Find a direction, then request access to explore the complete site. Each is a starting point for your company’s brand, services and service area.</p></div>
          <div className="ro-design-grid">{readyDesigns.map(design => <DesignCard key={design.id} design={design} onChoose={chooseDesign} />)}</div>
          {upcomingDesigns.length > 0 && <div className="ro-upcoming-grid">{upcomingDesigns.map(design => <article className="ro-upcoming" key={design.id}><span className="ro-upcoming-number" aria-hidden="true">{design.number}</span><div><p className="ro-eyebrow">Design {design.number} / Coming soon</p><h3>{design.name}</h3><p>The next addition to the collection.</p></div><span className="ro-upcoming-mark" aria-hidden="true">/</span></article>)}</div>}
          <p className="ro-demo-note">All five roofing brands are illustrative contractor concepts. Content, imagery and tools shown in the demos are examples; your final website, CRM setup and automation scope will be agreed together.</p>
        </div>
      </section>

      <section className="ro-dashboard-section" id="dashboard" aria-labelledby="dashboard-heading">
        <div className="ro-wrap">
          <div className="ro-dashboard">
            <div className="ro-dashboard-preview">
              <a className="ro-dashboard-image" href="/roofing-dashboard" aria-label="Request access to the roofing dashboard demo">
                <img src="/demos/roofers-offer/dashboard.jpg" alt="Roofing dashboard showing sample storm areas and nearby customer properties on a map" width="1440" height="1248" loading="lazy" />
              </a>
              <p className="ro-dashboard-caption"><span>Sample storm map</span><span>Map © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a></span></p>
            </div>
            <div className="ro-dashboard-body">
              <p className="ro-eyebrow">02 / Your included CRM</p>
              <h2 id="dashboard-heading">One place for the next step.</h2>
              <p>Keep customers, properties and project activity connected. Your CRM setup includes tools for:</p>
              <ul className="ro-crm-features">
                <li>Customer & property records</li><li>Severe-weather maps & customer outreach</li><li>Customer progress portal</li><li>Lead & review follow-up</li><li>Paid ads management</li><li>Social media management</li>
              </ul>
              <p className="ro-crm-note">Ads and social media tools are included. Done-for-you campaign and content management are priced separately by scope.</p>
              <a className="ro-button ro-button-dark" href="/roofing-dashboard">Request dashboard access <Arrow diagonal /></a>
              <p className="ro-preview-note">This preview uses sample data and shows part of the CRM. Live connections and workflows are configured for your agreed plan.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="ro-automation ro-wrap" id="automation" aria-labelledby="automation-heading">
        <div className="ro-section-intro"><div><p className="ro-eyebrow">03 / Good places to start</p><h2 id="automation-heading">Less chasing.<br /><em>More work moving forward.</em></h2></div><p>Start with the repetitive work costing your team time or leaving opportunities waiting. We set up the agreed workflows, monitor them and handle fixes.</p></div>
        <div className="ro-workflows">
          {featuredAutomations.map((automation, index) => <article key={automation.id}>
            <span className="ro-workflow-number">{String(index + 1).padStart(2, '0')}</span>
            <h3>{automation.title}</h3><p>{automation.description}</p>
            <dl className="ro-workflow-benefits"><div><dt>Time back</dt><dd>{automation.timeBenefit}</dd></div><div><dt>Financial upside</dt><dd>{automation.moneyBenefit}</dd></div></dl>
          </article>)}
        </div>
        <details className="ro-automation-library">
          <summary><span><strong>Explore all {automationCount} automation ideas</strong><span>From the first inquiry to the next referral.</span></span><span className="ro-disclosure-icon" aria-hidden="true" /></summary>
          <div className="ro-library-body">
            <p className="ro-library-intro">Build a plan around the work you actually do. Choose the workflows your team needs; setup and management are priced around that agreed scope.</p>
            {automationGroups.map(group => <section key={group.id} aria-labelledby={`automation-group-${group.id}`} className="ro-library-group">
              <div className="ro-library-heading"><h3 id={`automation-group-${group.id}`}>{group.title}</h3><p>{group.description}</p></div>
              <ul>{group.items.map(item => <li key={item.id}><h4>{item.title}</h4><p>{item.description}</p></li>)}</ul>
            </section>)}
          </div>
        </details>
        <p className="ro-scope-note">Your workflow selection, connections and service scope are agreed before you commit. Benefits depend on your starting process and how your team uses the system.</p>
        <a className="ro-button ro-button-light" href="#enquire">Find the right starting point <Arrow /></a>
      </section>

      <section className="ro-plan ro-wrap" id="offer" aria-labelledby="offer-heading">
        <div className="ro-terms"><div><p className="ro-eyebrow">04 / How the offer works</p><h2 id="offer-heading">Website + CRM included.<br /><em>Automation managed for you.</em></h2><p className="ro-plan-price">From <strong>{monthlyMinimum}/month</strong> for {roofingCommitmentMonths} months.</p><p className="ro-plan-note">{commitmentMinimum} minimum service commitment at the starting price. Your final monthly fee depends on workflow complexity, integrations and support. Ad spend, platform subscriptions and third-party usage are separate.</p></div><ol><li><span>01</span><div><strong>Choose your direction</strong><p>Pick a website design and show us where leads, jobs or follow-ups get held up.</p></div></li><li><span>02</span><div><strong>Agree on the complete scope</strong><p>We confirm the included website build and CRM setup, your initial automations, ongoing support and final monthly price in writing.</p></div></li><li><span>03</span><div><strong>Launch, then keep it working</strong><p>We adapt the site to your business, configure your CRM and agreed workflows, then monitor and maintain them. New workflows and substantial changes are scoped separately.</p></div></li></ol></div>
      </section>

      <section className="ro-enquire" id="enquire" aria-labelledby="enquire-heading">
        <div className="ro-wrap ro-enquire-layout">
          <div className="ro-enquire-copy"><p className="ro-eyebrow">05 / Make your next move</p><h2 id="enquire-heading">See your business<br /><em>in the collection.</em></h2><p>Tell us which direction feels right and what you want to improve. We’ll talk through the fit, availability and the automation plan.</p><div className="ro-enquire-note"><span aria-hidden="true">↗</span><p>Five client places in this offer. An inquiry starts the conversation; it doesn’t reserve a design or commit you to a contract.</p></div><a className="ro-email" href={`mailto:${roofingContactEmail}`}>{roofingContactEmail} <Arrow diagonal /></a></div>
          <div className="ro-form-panel">
            {status === 'sent' ? <div className="ro-success" role="status"><span aria-hidden="true">↗</span><p className="ro-eyebrow">Inquiry received</p><h3 ref={successHeading} tabIndex={-1}>Let’s build from here.</h3><p>Thanks for telling us about your business. We’ll follow up personally to confirm design availability and discuss scope and pricing. Your design is not reserved yet.</p><button type="button" className="ro-text-button" onClick={() => { setStatus('idle'); setSelectedDesign('') }}>Send another inquiry <Arrow /></button></div> : <form ref={formRef} onSubmit={handleSubmit} aria-describedby="ro-form-terms">
              <div className="ro-form-row"><label htmlFor="ro-name">Your name<input ref={nameInput} id="ro-name" name="name" autoComplete="name" required maxLength={120} placeholder="First and last name" disabled={status === 'submitting'} /></label><label htmlFor="ro-email">Work email<input id="ro-email" name="email" type="email" autoComplete="email" required maxLength={200} placeholder="you@company.com" disabled={status === 'submitting'} /></label></div>
              <div className="ro-form-row"><label htmlFor="ro-business">Roofing company<input ref={businessInput} id="ro-business" name="roofing-business" autoComplete="organization" required maxLength={200} placeholder="Your company name" disabled={status === 'submitting'} /></label><label htmlFor="ro-website">Current website <span className="ro-optional">(optional)</span><input id="ro-website" name="website" type="url" autoComplete="url" maxLength={300} placeholder="https://" disabled={status === 'submitting'} /></label></div>
              <label htmlFor="ro-design">Which design caught your eye?<select id="ro-design" name="design" value={selectedDesign} onChange={event => setSelectedDesign(event.target.value)} disabled={status === 'submitting'}><option value="">I’d like help choosing</option>{availableDesigns.map(design => <option key={design.id} value={design.id}>{design.number} — {design.name}</option>)}</select></label>
              <label htmlFor="ro-message">What would you like to improve? <span className="ro-optional">(optional)</span><textarea id="ro-message" name="message" rows={3} maxLength={3000} placeholder="Better inquiries, faster follow-up, less time on admin…" disabled={status === 'submitting'} /></label>
              <div className="ro-honeypot" aria-hidden="true"><label htmlFor="ro-company-check">Company<input id="ro-company-check" name="company" value={honeypot} onChange={event => setHoneypot(event.target.value)} tabIndex={-1} autoComplete="off" /></label></div>
              <label className="ro-acknowledgement"><input name="acknowledged" type="checkbox" required disabled={status === 'submitting'} /><span>I understand the website + CRM offer requires {roofingCommitmentMonths} months of paid managed automation starting at {monthlyMinimum}/month, with scope and final pricing agreed before I commit.</span></label>
              <button className="ro-button ro-button-dark ro-submit" type="submit" disabled={status === 'submitting'}>{status === 'submitting' ? 'Sending your inquiry…' : 'Ask about the offer'}<Arrow /></button>
              <p id="ro-form-terms" className="ro-form-terms">No payment is collected here. We’ll use your details to respond to this inquiry. <a href="https://www.wallaceshift.com/privacy">Privacy policy</a></p>
              <div className="ro-form-feedback" aria-live="polite">{status === 'invalid' && <p role="alert">Please check your details and choose an available design, then try again.</p>}{(status === 'not_configured' || status === 'error') && <p role="alert">Your inquiry hasn’t been sent. Please try again or email <a href={`mailto:${roofingContactEmail}`}>{roofingContactEmail}</a>.</p>}</div>
            </form>}
          </div>
        </div>
      </section>
    </main>
    <footer className="ro-footer ro-wrap"><Wordmark /><p>Thoughtful websites. Useful automation.</p><div><a href="https://www.wallaceshift.com/">Visit the studio <Arrow diagonal /></a><a className="ro-admin-link" href="/demo-admin/">Admin sign in</a><span>© {new Date().getFullYear()} Wallace Shift</span></div></footer>
  </div>
}
