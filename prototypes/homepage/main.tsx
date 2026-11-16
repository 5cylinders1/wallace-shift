import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import '../../src/index.css'
import './mockups.css'

const directions = [
  { id: 'offers', name: 'Offers first', note: 'A clear starting price and a useful next step before the story.' },
  { id: 'examples', name: 'Examples first', note: 'Show what the work looks like, followed by a concise price comparison.' },
  { id: 'needs', name: 'Choose by need', note: 'Help people recognize their situation before choosing a service.' },
] as const
type Direction = typeof directions[number]['id']
const offers = {
  website: { title: 'Website, hosting & care', price: '$250', frequency: '/month', href: '/offers/contractor-websites', text: 'A business website with hosting, maintenance and basic SEO.', benefit: 'Give customers a clear picture of your work and an easy way to contact you.', detail: 'Website build included. Page scope, service limits and ownership terms agreed before work begins.', action: 'Explore the website offer' },
  followup: { title: 'Lead page & follow up', price: '$1,500', frequency: 'once', href: '/offers/lead-page-follow-up', text: 'One focused lead page and one automatic follow up workflow.', benefit: 'Connect your ad to a clear offer, then give every inquiry a next step.', detail: 'Page and workflow setup. Hosting, software and message usage may cost extra.', action: 'Explore the lead page offer' },
}

function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">{diagonal ? <path d="M6 18 18 6M6 6h12v12" /> : <path d="M4 12h16m-6-6 6 6-6 6" />}</svg>
}

function Header() {
  const [open, setOpen] = useState(false)
  return <header className="m-header">
    <a className="m-skip" href="#main">Skip to content</a>
    <a href="#main" className="m-brand"><img src="/brand/wallace-shift-logo-white.svg" alt="" width="22" height="14" /> WALLACE SHIFT</a>
    <nav aria-label="Primary" className={open ? 'm-nav is-open' : 'm-nav'}>
      {[['Services', '#offers'], ['Examples', '#examples'], ['Pricing', '#offers'], ['Our approach', '#approach']].map(([label, href]) => <a key={label} href={href} onClick={() => setOpen(false)}>{label}</a>)}
    </nav>
    <a className="m-header-contact" href="#questions">Let’s talk <Arrow diagonal /></a>
    <button className="m-menu" aria-expanded={open} aria-label={open ? 'Close navigation' : 'Open navigation'} onClick={() => setOpen(!open)}>{open ? 'Close' : 'Menu'}</button>
  </header>
}

function Price({ offer }: { offer: keyof typeof offers }) {
  const item = offers[offer]
  return <span className="m-price">{item.price}<span>{item.frequency}</span></span>
}

function OfferCard({ offer, compact = false }: { offer: keyof typeof offers; compact?: boolean }) {
  const item = offers[offer]
  return <article className={`m-offer${compact ? ' m-offer--compact' : ''}`}>
    <div className="m-offer-top"><h3>{item.title}</h3><Price offer={offer} /></div>
    <p>{compact ? item.text : item.benefit}</p>
    {!compact && <ul className="m-inclusions">{(offer === 'website' ? ['Website design and build', 'Hosting and technical maintenance', 'Basic on page SEO'] : ['One focused campaign page', 'Inquiry capture and routing', 'One automatic follow up workflow']).map(item => <li key={item}>{item}</li>)}</ul>}
    <a href={item.href} className="m-text-link">{item.action}<Arrow /></a>
    <p className="m-fine">{item.detail}</p>
  </article>
}

function SystemsLink() {
  return <div className="m-systems-link"><div><h3>Already have a website? Connect the work behind it.</h3><p>Custom CRMs, practical AI and workflows built around your team.</p></div><a href="/services" className="m-text-link">Explore custom systems<Arrow /></a></div>
}

function OffersSection() {
  return <section className="m-section m-light" id="offers"><div className="m-container">
    <div className="m-section-intro"><h2>Two clear ways<br />to <em>get started.</em></h2><p>Start with the part of your business that needs attention. See the scope and examples before starting a conversation.</p></div>
    <div className="m-offer-grid"><OfferCard offer="website" /><OfferCard offer="followup" /></div><SystemsLink />
  </div></section>
}

function WebsitePreview({ hero = false }: { hero?: boolean }) {
  const [demo, setDemo] = useState('northvane')
  const [play, setPlay] = useState(false)
  const names: Record<string, string> = { northvane: 'Roofing', tambour: 'Kitchens', stillwater: 'Pools' }
  return <div className={`m-demo${hero ? ' m-demo--hero' : ''}`}>
    <div className="m-demo-toolbar"><span>Website concepts</span><div role="group" aria-label="Choose an example">{Object.entries(names).map(([id, label]) => <button aria-pressed={id === demo} key={id} onClick={() => { setDemo(id); setPlay(false) }}>{label}</button>)}</div></div>
    <div className="m-demo-screen">{play ? <video controls autoPlay playsInline preload="none" key={demo} poster={`/media/demo-previews/${demo}.jpg`} aria-label={`${names[demo]} website preview`}><source src={`/media/demo-previews/${demo}.mp4`} type="video/mp4" /><track kind="captions" src={`/media/demo-previews/${demo}.vtt`} srcLang="en" label="English" /></video> : <button className="m-watch" onClick={() => setPlay(true)} aria-label={`Watch ${names[demo].toLowerCase()} website example`}><img src={`/media/demo-previews/${demo}.jpg`} alt={`${names[demo]} website concept by Wallace Shift`} width="1200" height="675" /><span><svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="m6 3 11 7-11 7Z" /></svg>Watch the example</span></button>}</div>
    <p className="m-fine">Fictional demo brands. Advanced features shown are quoted separately.</p>
    {play && <p className="m-fine">Music: <a href="https://www.scottbuckley.com.au/library/a-kind-of-hope/">A Kind Of Hope by Scott Buckley</a>, <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>. Edited with narration.</p>}
  </div>
}

function WorkflowPreview() {
  const [step, setStep] = useState(0)
  const steps = [
    ['Inquiry received', 'A customer asks about a roof repair.', 'Project details arrive in your agreed inbox or tool.'],
    ['Confirmation sent', '“Thanks for getting in touch. We have your request.”', 'An automatic acknowledgment confirms the inquiry arrived.'],
    ['Follow up scheduled', '“Are you still looking for help with your roof?”', 'An agreed follow up gives the customer a clear way to reply.'],
    ['Your team takes over', 'The customer replies. Scheduled follow up stops.', 'Your team continues the conversation.'],
  ]
  return <div className="m-workflow"><div className="m-workflow-heading"><span>Example follow up sequence</span><span>{step + 1} / 4</span></div><ol aria-label="Example sequence">{steps.map(([title], i) => <li key={title} aria-current={i === step ? 'step' : undefined} className={i <= step ? 'is-reached' : ''}><span>{i + 1}</span>{title}</li>)}</ol><div className="m-message" aria-live="polite"><h3>{steps[step][1]}</h3><p>{steps[step][2]}</p></div><button className="m-text-link" onClick={() => setStep((step + 1) % steps.length)}>{step === 3 ? 'Restart the example' : 'See the next step'}<Arrow /></button><p className="m-fine">Illustration only. No messages are sent. Channels, timing and stop conditions are agreed for your business.</p></div>
}

function ExamplesSection() {
  return <section className="m-section m-dark" id="examples"><div className="m-container"><div className="m-section-intro"><h2>See the work.<br /><em>Understand the difference.</em></h2><p>A website helps people understand your business. A connected response helps your team take the conversation forward.</p></div><div className="m-examples-grid"><WebsitePreview /><WorkflowPreview /></div></div></section>
}

function Approach() {
  return <section id="approach" className="m-section m-light"><div className="m-container m-approach"><div><h2>A clear scope.<br /><em>A clear next step.</em></h2><a href="/approach" className="m-text-link">How we work<Arrow /></a></div><ol>{[['Talk through the need', 'Show us your website or tell us where inquiries and handoffs get stuck. Questions are welcome.'], ['Agree what is included', 'We confirm deliverables, responsibilities, costs and terms before you commit.'], ['Build, test and hand over', 'Review the work, test the customer journey and understand what happens after launch.']].map(([title, description], i) => <li key={title}><span>{i + 1}</span><div><h3>{title}</h3><p>{description}</p></div></li>)}</ol></div></section>
}

function Questions() {
  const questions = [
    ['What if I already have a website?', 'You can keep it. A focused lead page can sit alongside your current site, and we can review a particular workflow without replacing your whole system.'],
    ['What does basic SEO include?', 'Page titles, descriptions, headings and readable service information. Ongoing content, link building, local SEO campaigns and ranking guarantees are not included in the $250 website package.'],
    ['Are there other costs?', 'For the monthly website, we confirm page scope, service limits, ownership, minimum term and cancellation in writing. The $1,500 offer covers page and workflow setup; hosting, software and message usage are separate where needed.'],
    ['Can I talk to you before choosing?', 'Yes. You can ask about the work, compare options or plan for later. You do not need to choose a package or be ready to purchase.'],
  ]
  return <section className="m-section m-light m-faq"><div className="m-container"><div className="m-section-intro"><h2>Before you <em>decide.</em></h2><p>The details should be clear before the commitment.</p></div>{questions.map(([question, answer]) => <details key={question}><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div></section>
}

function Showcase() {
  return <section className="m-showcase"><div className="m-container"><img src="/media/wallace-shift-hero-poster.webp" alt="Wallace Shift sculptural logo reflected in water" width="1916" height="1080" loading="lazy" /><div><h2>A little more{' '}<br /><em>Wallace Shift.</em></h2><p>Explore the immersive side of our design work, at your own pace.</p><a href="/" target="_blank" rel="noreferrer" className="m-text-link">Explore the interactive experience<Arrow diagonal /></a></div></div></section>
}

function Contact() {
  return <section id="questions" className="m-section m-contact"><div className="m-container"><div><h2>Let’s find your<br /><em>starting point.</em></h2><p>A question is enough. Tell Matthew what you are considering and what you want to understand.</p></div><div className="m-contact-actions"><a className="m-button" href="mailto:matthew@wallaceshift.com?subject=Question%20about%20Wallace%20Shift">Ask Matthew a question<Arrow /></a><a href="/contact" className="m-text-link">Tell us about your project<Arrow /></a><p className="m-fine">Reply within one business day.<br />Greater Kansas City and remote.</p></div></div></section>
}

function Footer() {
  return <footer className="m-footer m-container"><a href="#main" className="m-brand"><img src="/brand/wallace-shift-logo-white.svg" alt="" width="22" height="14" />WALLACE SHIFT</a><p>Software. Workflows. Progress.</p><a href="/pricing">All services & pricing</a><a href="/privacy">Privacy</a></footer>
}

function OffersFirst() {
  return <><section className="m-hero m-hero--offers"><div className="m-container m-hero-grid"><div className="m-hero-copy"><h1>A better website.<br />A clearer<br /><em>next step.</em></h1><p>Websites, lead pages and connected systems for service businesses. Know what you get, what it costs and how to begin.</p><div className="m-actions"><a href="#examples" className="m-button">See what we build<Arrow /></a><a href="#questions" className="m-text-link">Ask a question</a></div><p className="m-location">Built in Greater Kansas City. Available remotely.</p></div><div className="m-hero-offers" id="offers"><OfferCard offer="website" compact /><OfferCard offer="followup" compact /></div></div></section><div className="m-dark"><div className="m-container"><SystemsLink /></div></div><ExamplesSection /><Approach /><Questions /><Showcase /><Contact /></>
}

function ExamplesFirst() {
  return <><section className="m-hero m-hero--examples" id="examples"><div className="m-container"><div className="m-example-hero-grid"><div className="m-hero-copy"><h1>Your work,<br /><em>well presented.</em><br />Your inquiries,<br /><em>followed through.</em></h1><p>See how we bring a service business online and connect the next step behind every inquiry.</p><a href="#offers" className="m-button">Compare the two offers<Arrow /></a></div><WebsitePreview hero /></div><div className="m-price-strip"><a href="/offers/contractor-websites"><span>Website, hosting & care</span><Price offer="website" /><Arrow /></a><a href="/offers/lead-page-follow-up"><span>Lead page & follow up</span><Price offer="followup" /><Arrow /></a></div></div></section><OffersSection /><section className="m-section m-dark"><div className="m-container m-followup-feature"><div><h2>The page is just<br /><em>the beginning.</em></h2><p>A customer makes an inquiry. Your team gets the details. An agreed workflow handles the acknowledgment and follow up.</p><a href="/offers/lead-page-follow-up" className="m-text-link">See the $1,500 offer<Arrow /></a></div><WorkflowPreview /></div></section><Approach /><Showcase /><Questions /><Contact /></>
}

function NeedsFirst() {
  return <><section className="m-hero m-hero--needs"><div className="m-container"><div className="m-needs-heading"><h1>What would move<br />your business <em>forward?</em></h1><p>A clearer website. A better response to inquiries. Less scattered work. Start where you need us.</p></div><div className="m-needs-list" id="offers"><a href="/offers/contractor-websites"><div><h2>“I need a better website.”</h2><p>Your work, services and contact details in one clear place.</p></div><div><span>Website, hosting & care</span><Price offer="website" /></div><Arrow diagonal /></a><a href="/offers/lead-page-follow-up"><div><h2>“I want more from my inquiries.”</h2><p>A focused lead page with an automatic next step.</p></div><div><span>Lead page & follow up</span><Price offer="followup" /></div><Arrow diagonal /></a><a href="/services"><div><h2>“Our tools don’t work together.”</h2><p>Connect customer records, handoffs and your team’s work.</p></div><div><span>Custom CRM, AI & workflows</span><strong className="m-custom-label">Scope it together</strong></div><Arrow diagonal /></a></div><div className="m-needs-bottom"><p>You don’t need to know the solution yet.</p><a href="#questions" className="m-text-link">Start with a question<Arrow /></a></div></div></section><ExamplesSection /><Approach /><Questions /><Showcase /><Contact /></>
}

function App() {
  const initial = new URLSearchParams(location.search).get('view')
  const [view, setView] = useState<Direction>(directions.some(d => d.id === initial) ? initial as Direction : 'offers')
  const [showNote, setShowNote] = useState(false)
  const [captureMode] = useState(new URLSearchParams(location.search).has('clean'))
  const [clean, setClean] = useState(captureMode)
  const direction = directions.find(d => d.id === view)!
  function choose(next: Direction) { setView(next); setShowNote(false); history.replaceState(null, '', `?view=${next}${clean ? '&clean=1' : ''}`); window.scrollTo({ top: 0, behavior: 'instant' }) }
  useEffect(() => { document.title = `${direction.name} | Wallace Shift homepage preview` }, [direction.name])
  return <div className={`m-page m-page--${view}`}><Header /><main id="main">{view === 'offers' ? <OffersFirst /> : view === 'examples' ? <ExamplesFirst /> : <NeedsFirst />}</main><Footer />
    {!clean && <aside className="m-review" aria-label="Homepage concept review"><div><span className="m-review-label">Homepage preview</span><div className="m-review-options" role="group" aria-label="Choose a homepage layout">{directions.map((d, i) => <button key={d.id} aria-pressed={view === d.id} onClick={() => choose(d.id)}><span>{i + 1}</span>{d.name}</button>)}</div></div><button className="m-review-why" aria-expanded={showNote} onClick={() => setShowNote(!showNote)}>About this layout</button><button aria-label="Hide preview controls" className="m-review-close" onClick={() => setClean(true)}>×</button>{showNote && <div className="m-review-note"><strong>{direction.name}</strong><p>{direction.note}</p><p>Local design preview. The current homepage is unchanged. Offer links open the existing local offer pages. The showcase link opens the existing homepage experience.</p><a href="./PLAN.md">Read the modification plan</a></div>}</aside>}
    {clean && !captureMode && <button className="m-restore-review" onClick={() => setClean(false)}>Compare layouts</button>}
  </div>
}

const root = createRoot(document.getElementById('root')!)
root.render(<App />)
if (import.meta.hot) import.meta.hot.dispose(() => root.unmount())
