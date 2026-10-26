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
      service: 'Roofing CRM plan + free Motion website',
      package: design ? `Roofing collection: ${design.name}` : 'Roofing collection: design undecided',
      message: [
        `Roofing company: ${company}`,
        `Requested design: ${design?.name ?? 'No design selected; discuss the workflow first'}`,
        `Offer: ${roofingOffer}`,
        `Acknowledged: the free website requires purchase of a roofing CRM plan with ${roofingCommitmentMonths} months of managed automation starting at ${monthlyMinimum}/month, with scope and final pricing agreed in writing before commitment.`,
        '',
        'What the business needs:',
        message || 'I would like to discuss a roofing CRM plan and the free Motion website offer.',
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
      <nav aria-label="Main navigation"><a href="#dashboard">The CRM</a><a href="#automation">Workflows</a><a href="#collection">Website demos</a></nav>
      <a className="ro-header-cta" href="#enquire">Discuss your needs <Arrow diagonal /></a>
    </header>

    <main id="main">
      <section className="ro-hero" aria-labelledby="hero-heading">
        <div className="ro-wrap">
        <div className="ro-hero-top"><p className="ro-eyebrow">CRM & workflow automation for roofers</p><span className="ro-edition">THE COLLECTION / 01—{String(readyDesigns.length).padStart(2, '0')}</span></div>
        <div className="ro-hero-layout">
          <div className="ro-hero-heading"><h1 id="hero-heading">Keep the next<br />step <em>in sight.</em></h1><p>Connect inquiries, customer records and follow-up in a roofing CRM shaped around your team. Give every opportunity a next step and owners a clearer view of the work.</p><div className="ro-hero-actions"><a className="ro-button ro-button-light" href="#enquire">Discuss your workflows <Arrow /></a><a className="ro-hero-link" href="#dashboard">Explore the CRM demo <span aria-hidden="true">↓</span></a></div></div>
          <div className="ro-offer-card">
            <p className="ro-eyebrow">A limited collection. Five client places.</p>
            <h2><span>Free Motion</span><em>website.</em></h2>
            <p className="ro-offer-condition">With purchase of a roofing CRM plan.</p>
            <p className="ro-offer-note">Your plan covers CRM setup and managed automation for {roofingCommitmentMonths} months. The website build is free within the agreed scope.</p>
            <p className="ro-offer-price"><span>CRM + managed automation starts at</span><strong>{monthlyMinimum}<small>/month</small></strong></p>
            <div className="ro-offer-rule"><span>Final price depends on your workflows, integrations and support needs.</span><a href="#offer">See plan details <Arrow /></a></div>
          </div>
        </div>
        <div className="ro-hero-foot"><span>Built by Wallace Shift</span><span>{readyDesigns.length} website concepts{upcomingDesigns.length > 0 && <><i aria-hidden="true">/</i> {upcomingDesigns.length} in progress</>}</span><a href="#automation">Explore workflow options <span aria-hidden="true">↓</span></a></div>
        </div>
      </section>

      <section className="ro-collection" id="collection" aria-labelledby="collection-heading">
        <div className="ro-wrap">
          <div className="ro-section-intro"><div><p className="ro-eyebrow">01 / The customer-facing part</p><h2 id="collection-heading">A clearer inquiry.<br /><em>A useful first step.</em></h2></div><p>Your website helps homeowners explain what they need. Explore a design direction, then plan how those inquiries should reach your CRM and the people responsible for following up.</p></div>
          <div className="ro-design-grid">{readyDesigns.map(design => <DesignCard key={design.id} design={design} onChoose={chooseDesign} />)}</div>
          {upcomingDesigns.length > 0 && <div className="ro-upcoming-grid">{upcomingDesigns.map(design => <article className="ro-upcoming" key={design.id}><span className="ro-upcoming-number" aria-hidden="true">{design.number}</span><div><p className="ro-eyebrow">Design {design.number} / Coming soon</p><h3>{design.name}</h3><p>The next addition to the collection.</p></div><span className="ro-upcoming-mark" aria-hidden="true">/</span></article>)}</div>}
          <p className="ro-demo-note">Every roofing brand in the collection is an illustrative contractor concept. Content, imagery and tools shown in the demos are examples; your final website, CRM setup and automation scope will be agreed together.</p>
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
              <p className="ro-eyebrow">02 / Customer records & operations</p>
              <h2 id="dashboard-heading">One place for the next step.</h2>
              <p>A CRM keeps customer details, properties and project activity together so your team can see who needs a response and what happens next. The roofing offer includes tools for:</p>
              <ul className="ro-crm-features">
                <li>Customer & property records</li><li>Severe-weather maps & outreach worklists</li><li>Customer progress portal</li><li>Lead & review follow-up</li><li>Paid advertising tools</li><li>Social media tools</li>
              </ul>
              <p className="ro-crm-note">Ads and social media tools are included. Done-for-you campaign and content management are priced separately by scope.</p>
              <a className="ro-button ro-button-dark" href="/roofing-dashboard">Request dashboard access <Arrow diagonal /></a>
              <p className="ro-preview-note">This demo uses fictional records. It sends no messages and books no real appointments. Your agreed plan defines the live connections and workflows to be implemented.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="ro-automation ro-wrap" id="automation" aria-labelledby="automation-heading">
        <div className="ro-section-intro"><div><p className="ro-eyebrow">03 / Workflows to consider</p><h2 id="automation-heading">Less chasing.<br /><em>More work moving forward.</em></h2></div><p>Start with missed calls, open estimates or information being entered twice. We map the handoffs, agree which workflows to build, then monitor and maintain them.</p></div>
        <div className="ro-workflows">
          {featuredAutomations.map((automation, index) => <article key={automation.id}>
            <span className="ro-workflow-number">{String(index + 1).padStart(2, '0')}</span>
            <h3>{automation.title}</h3><p>{automation.description}</p>
            <dl className="ro-workflow-benefits"><div><dt>Less manual work</dt><dd>{automation.timeBenefit}</dd></div><div><dt>Why it matters</dt><dd>{automation.moneyBenefit}</dd></div></dl>
          </article>)}
        </div>
        <details className="ro-automation-library">
          <summary><span><strong>Explore all {automationCount} automation ideas</strong><span>From the first inquiry to the next referral.</span></span><span className="ro-disclosure-icon" aria-hidden="true" /></summary>
          <div className="ro-library-body">
            <p className="ro-library-intro">These are options for a scoped implementation, not live integrations or a promise to include every workflow. We choose the useful ones with you and price their setup and management around the agreed scope.</p>
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
        <div className="ro-terms"><div><p className="ro-eyebrow">04 / How the offer works</p><h2 id="offer-heading">Purchase your roofing CRM.<br /><em>Get the website free.</em></h2><p className="ro-plan-price">CRM and managed automation from <strong>{monthlyMinimum}/month</strong> for {roofingCommitmentMonths} months.</p><p className="ro-plan-note">{commitmentMinimum} minimum service commitment at the starting price. The Motion website build is free with your CRM plan. Your final monthly fee depends on workflow complexity, integrations and support. Ad spend, platform subscriptions and third party usage are separate.</p></div><ol><li><span>01</span><div><strong>Map the work</strong><p>Show us how inquiries become estimates and jobs, which tools you use and where follow up gets held up.</p></div></li><li><span>02</span><div><strong>Agree on the complete scope</strong><p>We confirm your paid CRM plan, the free website build, initial automations, ongoing support and final monthly price in writing.</p></div></li><li><span>03</span><div><strong>Launch, then keep it working</strong><p>We configure your CRM and agreed workflows, adapt the site to your business, then monitor and maintain the system. New workflows and substantial changes are scoped separately.</p></div></li></ol></div>
      </section>

      <section className="ro-enquire" id="enquire" aria-labelledby="enquire-heading">
        <div className="ro-wrap ro-enquire-layout">
          <div className="ro-enquire-copy"><p className="ro-eyebrow">05 / Start with the work</p><h2 id="enquire-heading">Where does<br /><em>follow-up stall?</em></h2><p>Tell us about your current tools, missed handoffs and the work you want to improve. We’ll discuss the fit and scope; you do not need to choose a website first.</p><div className="ro-enquire-note"><span aria-hidden="true">↗</span><p>Five client places in this offer. An inquiry starts the conversation; it doesn’t reserve a design or commit you to a contract.</p></div><a className="ro-email" href={`mailto:${roofingContactEmail}`}>{roofingContactEmail} <Arrow diagonal /></a></div>
          <div className="ro-form-panel">
            {status === 'sent' ? <div className="ro-success" role="status"><span aria-hidden="true">↗</span><p className="ro-eyebrow">Inquiry received</p><h3 ref={successHeading} tabIndex={-1}>Let’s build from here.</h3><p>Thanks for telling us about your business. We’ll follow up personally to confirm design availability and discuss scope and pricing. Your design is not reserved yet.</p><button type="button" className="ro-text-button" onClick={() => { setStatus('idle'); setSelectedDesign('') }}>Send another inquiry <Arrow /></button></div> : <form ref={formRef} onSubmit={handleSubmit} aria-describedby="ro-form-terms">
              <div className="ro-form-row"><label htmlFor="ro-name">Your name<input ref={nameInput} id="ro-name" name="name" autoComplete="name" required maxLength={120} placeholder="First and last name" disabled={status === 'submitting'} /></label><label htmlFor="ro-email">Work email<input id="ro-email" name="email" type="email" autoComplete="email" required maxLength={200} placeholder="you@company.com" disabled={status === 'submitting'} /></label></div>
              <div className="ro-form-row"><label htmlFor="ro-business">Roofing company<input ref={businessInput} id="ro-business" name="roofing-business" autoComplete="organization" required maxLength={200} placeholder="Your company name" disabled={status === 'submitting'} /></label><label htmlFor="ro-website">Current website <span className="ro-optional">(optional)</span><input id="ro-website" name="website" type="url" autoComplete="url" maxLength={300} placeholder="https://" disabled={status === 'submitting'} /></label></div>
              <label htmlFor="ro-design">Website direction <span className="ro-optional">(optional)</span><select id="ro-design" name="design" value={selectedDesign} onChange={event => setSelectedDesign(event.target.value)} disabled={status === 'submitting'}><option value="">Let’s discuss the workflow first</option>{availableDesigns.map(design => <option key={design.id} value={design.id}>{design.number} — {design.name}</option>)}</select></label>
              <label htmlFor="ro-message">Where is work getting held up? <span className="ro-optional">(optional)</span><textarea id="ro-message" name="message" rows={3} maxLength={3000} placeholder="Which tools do you use? Where do calls, estimates or job updates need someone to chase the next step?" disabled={status === 'submitting'} /></label>
              <div className="ro-honeypot" aria-hidden="true"><label htmlFor="ro-company-check">Company<input id="ro-company-check" name="company" value={honeypot} onChange={event => setHoneypot(event.target.value)} tabIndex={-1} autoComplete="off" /></label></div>
              <label className="ro-acknowledgement"><input name="acknowledged" type="checkbox" required disabled={status === 'submitting'} /><span>I understand the free website requires purchase of a roofing CRM plan with {roofingCommitmentMonths} months of managed automation starting at {monthlyMinimum}/month, with scope and final pricing agreed before I commit.</span></label>
              <button className="ro-button ro-button-dark ro-submit" type="submit" disabled={status === 'submitting'}>{status === 'submitting' ? 'Sending your inquiry…' : 'Ask about the offer'}<Arrow /></button>
              <p id="ro-form-terms" className="ro-form-terms">No payment is collected here. We’ll use your details to respond to this inquiry. <a href="https://www.wallaceshift.com/privacy">Privacy policy</a></p>
              <div className="ro-form-feedback" aria-live="polite">{status === 'invalid' && <p role="alert">Please check your name, email and company. If you selected a design, it must still be available.</p>}{(status === 'not_configured' || status === 'error') && <p role="alert">Your inquiry hasn’t been sent. Please try again or email <a href={`mailto:${roofingContactEmail}`}>{roofingContactEmail}</a>.</p>}</div>
            </form>}
          </div>
        </div>
      </section>
    </main>
    <footer className="ro-footer ro-wrap"><Wordmark /><p>Connected records. Clearer next steps.</p><div><a href="https://www.wallaceshift.com/">Explore Wallace Shift <Arrow diagonal /></a><a className="ro-admin-link" href="/demo-admin/">Admin sign in</a><span>© {new Date().getFullYear()} Wallace Shift</span></div></footer>
  </div>
}
