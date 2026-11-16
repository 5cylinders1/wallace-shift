import { useState, type KeyboardEvent } from 'react'
import { createRoot } from 'react-dom/client'
import '../../../src/index.css'
import '../mockups.css'
import './refined.css'

const email = 'mailto:matthew@wallaceshift.com?subject=Question%20about%20my%20website'
const offerPaths = { website: '/offers/contractor-websites', lead: '/offers/lead-page-follow-up' }
function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d={diagonal ? 'M6 18 18 6M6 6h12v12' : 'M4 12h16m-6-6 6 6-6 6'} /></svg>
}
function Plus() { return <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><path d="M9 3v12M3 9h12" /></svg> }
function Header() {
  const [open, setOpen] = useState(false)
  return <header className="m-header"><a className="m-skip" href="#main">Skip to content</a><a href="#main" className="m-brand"><img src="/brand/wallace-shift-logo-white.svg" width="22" height="14" alt="" />WALLACE SHIFT</a><nav className={`m-nav ${open ? 'is-open' : ''}`} aria-label="Primary">{[['See the work', '#work'], ['Packages', '#packages'], ['How it works', '#process']].map(([label, href]) => <a key={href} href={href} onClick={() => setOpen(false)}>{label}</a>)}</nav><a className="m-header-contact" href="#questions">Ask a question<Arrow diagonal /></a><button className="m-menu" aria-label={open ? 'Close navigation' : 'Open navigation'} aria-expanded={open} onClick={() => setOpen(!open)}>{open ? 'Close' : 'Menu'}</button></header>
}

function WebsiteDemo() {
  const [demo, setDemo] = useState('northvane')
  const [play, setPlay] = useState(false)
  const names: Record<string, string> = { northvane: 'Roofing', tambour: 'Kitchens', stillwater: 'Pools' }
  return <div className="r-website-demo">
    <div className="r-example-top"><span>Website examples</span><div role="group" aria-label="Choose a website example">{Object.entries(names).map(([key, label]) => <button key={key} aria-pressed={demo === key} onClick={() => { setDemo(key); setPlay(false) }}>{label}</button>)}</div></div>
    <div className="r-screen">{play ? <video controls autoPlay playsInline preload="none" key={demo} poster={`/media/demo-previews/${demo}.jpg`} aria-label={`${names[demo]} website walkthrough`}><source src={`/media/demo-previews/${demo}.mp4`} type="video/mp4" /><track kind="captions" src={`/media/demo-previews/${demo}.vtt`} srcLang="en" label="English" /></video> : <button className="m-watch" aria-label={`Watch ${names[demo].toLowerCase()} website walkthrough`} onClick={() => setPlay(true)}><img src={`/media/demo-previews/${demo}.jpg`} alt={`${names[demo]} website design concept by Wallace Shift`} width="1200" height="675" /><span><svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="m6 3 11 7-11 7Z" /></svg>Watch the walkthrough</span></button>}</div>
    <div className="r-example-caption"><p>Fictional demo brands. Advanced tools shown are scoped separately.</p><a href="#work">Follow the inquiry<Arrow /></a></div>
    {play && <p className="r-credit">Music: <a href="https://www.scottbuckley.com.au/library/a-kind-of-hope/">A Kind Of Hope by Scott Buckley</a>, <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>. Edited with narration.</p>}
  </div>
}

function Hero() {
  return <section className="r-hero"><div className="r-wrap r-hero-grid"><div className="r-hero-copy"><h1>Make your work<br />easy to <em>choose.</em></h1><p>A clear website helps customers understand your business. A connected follow up gives their inquiry a next step.</p><div className="r-opening-prices"><a href="#website-package"><span>Website, hosting & care</span><strong>$250 <small>/month</small></strong></a><a href="#lead-package"><span>Lead page & follow up</span><strong>$1,500 <small>once</small></strong></a></div><div className="r-hero-actions"><a href="#packages" className="m-button">Compare the packages<Arrow /></a><a href="#questions" className="r-question-link">Just have a question?</a></div></div><WebsiteDemo /></div><div className="r-wrap r-hero-foot"><p>Built in Greater Kansas City. Available remotely.</p><a href="/services">Need a custom CRM or connected system?<Arrow diagonal /></a></div></section>
}

const journey = [
  { title: 'Show what you do.', description: 'Your services, work and service area in one clear place. Give a customer enough information to decide whether to get in touch.', label: 'Website package or focused lead page' },
  { title: 'Capture what matters.', description: 'Collect the project details you need and send them to the inbox or compatible tool your team uses.', label: 'Inquiry form in both packages' },
  { title: 'Make the response clear.', description: 'Acknowledge the request, follow up at agreed times and hand the conversation to your team when the customer replies.', label: 'Automatic follow up in the $1,500 package' },
]
function tabKey(event: KeyboardEvent, index: number, count: number, choose: (index: number) => void, prefix: string) {
  let next: number | undefined
  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % count
  if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index + count - 1) % count
  if (event.key === 'Home') next = 0
  if (event.key === 'End') next = count - 1
  if (next !== undefined) { event.preventDefault(); choose(next); document.getElementById(`${prefix}-${next}`)?.focus() }
}
function Journey() {
  const [stage, setStage] = useState(0)
  const [replied, setReplied] = useState(false)
  const choose = (next: number) => { setStage(next); setReplied(false); document.getElementById(`journey-${next}`)?.focus() }
  return <section className="r-section r-light" id="work"><div className="r-wrap">
    <div className="r-section-head"><h2>From the first look<br />to the <em>next conversation.</em></h2><p>See the path for a roof repair inquiry. Each part has a job to do.</p></div>
    <div className="r-journey"><div className="r-stages" role="tablist" aria-label="Explore the inquiry journey" aria-orientation="vertical">{journey.map((item, i) => <button key={item.title} id={`journey-${i}`} role="tab" aria-selected={stage === i} aria-controls="journey-panel" tabIndex={stage === i ? 0 : -1} onClick={() => choose(i)} onKeyDown={e => tabKey(e, i, 3, choose, 'journey')}><span className="r-stage-number">{i + 1}</span><span><strong>{item.title}</strong><span className="r-stage-description">{item.description}</span><span className="r-stage-label">{item.label}</span></span><Arrow /></button>)}</div>
    <div className="r-journey-panel" id="journey-panel" role="tabpanel" tabIndex={0} aria-labelledby={`journey-${stage}`}>
      <div className="r-panel-label"><span>Illustrative customer journey</span><span>{stage + 1} of 3</span></div>
      {stage === 0 && <div className="r-look"><img src="/media/demo-previews/northvane.jpg" width="1200" height="675" alt="Fictional roofing website showing its services and inquiry button" loading="lazy" /><div><h3>“Can someone help with my roof?”</h3><p>A customer can see the service, explore your work and find the inquiry button.</p><button className="m-text-link" onClick={() => choose(1)}>See the inquiry<Arrow /></button></div></div>}
      {stage === 1 && <div className="r-inquiry"><div className="r-inquiry-heading"><span>New roof repair inquiry</span><span className="r-sample-tag">Example</span></div><dl><div><dt>Project</dt><dd>Water around a skylight</dd></div><div><dt>Location</dt><dd>Kansas City</dd></div><div><dt>Preferred contact</dt><dd>Email</dd></div></dl><div className="r-destination"><svg width="24" height="24" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.4" fill="none" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 6 9 7 9-7" /></svg><div><strong>Delivered to the agreed inbox or tool</strong><p>Your team gets the details needed to respond.</p></div></div><button className="m-text-link" onClick={() => choose(2)}>See the follow up<Arrow /></button><p className="r-panel-fine">This example does not collect or send information.</p></div>}
      {stage === 2 && <div className="r-response"><div className="r-response-row"><span className="r-dot" /><div><span>After the inquiry</span><p>“Thanks for getting in touch. We have your roof repair request.”</p></div></div><div className="r-response-row"><span className="r-dot" /><div><span>At the agreed follow up time</span><p>“Are you still looking for help? Reply here and we can discuss the next step.”</p></div></div><div aria-live="polite" className={`r-reply ${replied ? 'is-replied' : ''}`}><strong>{replied ? 'Your team takes over.' : 'What happens when they reply?'}</strong><p>{replied ? 'In this example, the customer response stops the sequence and the conversation returns to your team.' : 'The response and stop conditions are defined before the workflow goes live.'}</p><button className="m-text-link" onClick={() => setReplied(!replied)}>{replied ? 'Reset the example' : 'Show a customer reply'}<Arrow /></button></div><p className="r-panel-fine">Illustration of a proposed setup in compatible tools. No messages are sent. Channels, timing and stop conditions depend on the agreed scope.</p></div>}
    </div></div>
  </div></section>
}

function Packages() {
  return <section className="r-section r-packages" id="packages"><div className="r-wrap"><div className="r-section-head"><h2>Start with the part<br />that needs <em>attention.</em></h2><p>You can keep a website that already works. Choose a focused page when one offer needs a clearer path.</p></div><div className="r-package-grid">
    <article id="website-package"><h3>Website, hosting & care</h3><p className="r-fit">For a new business website or a better presentation of your work.</p><div className="r-package-price">$250<span>/month</span></div><p className="r-price-detail">Website build included with the monthly package.</p><p className="r-price-extra">Domain registration and any paid services are confirmed separately.</p><ul><li>Your services, work and service area</li><li>A working inquiry form</li><li>Hosting and technical maintenance</li><li>Basic on page SEO</li></ul><a className="m-button" href={offerPaths.website}>Explore the website package<Arrow /></a><details><summary>Scope, terms and other costs<Plus /></summary><p>Page count, content responsibilities, revision and maintenance limits, ownership, minimum term and cancellation are agreed in writing before work begins.</p><p>Domain registration and any paid services are confirmed separately. Ongoing SEO campaigns, paid ads, custom CRMs and automated follow up are additional work.</p></details></article>
    <article id="lead-package"><h3>Lead page & automatic follow up</h3><p className="r-fit">For one service or campaign, alongside the website you already have.</p><div className="r-package-price">$1,500<span>once</span></div><p className="r-price-detail">One focused page and one agreed follow up workflow.</p><p className="r-price-extra">Hosting, software and message usage may add recurring costs. Confirmed before you commit.</p><ul><li>A page built around one clear offer</li><li>Project details captured and routed</li><li>Confirmation and follow up setup</li><li>Workflow testing and handoff</li></ul><a className="m-button" href={offerPaths.lead}>Explore the lead page package<Arrow /></a><details><summary>Scope, terms and other costs<Plus /></summary><p>We confirm the channel, compatible tools, messages, timing, reply handling and stop conditions before you commit.</p><p>Hosting, software and message usage may be additional recurring costs. Ad spend, campaign management, custom CRM builds and ongoing workflow management are not included.</p></details></article>
  </div><div className="r-package-note"><p>Both packages include private access to your Wallace Shift agreement and invoices.</p><a href="#process">See how working together looks<Arrow /></a></div></div></section>
}

function PortalIllustration() {
  const [tab, setTab] = useState(0)
  return <div className="r-portal"><div className="r-portal-bar"><img src="/brand/wallace-shift-logo-white.svg" alt="" width="18" height="12" /><strong>Your project with Wallace Shift</strong></div><div className="r-portal-body"><div className="r-portal-title"><h3>Business website</h3><span className="r-sample-tag">Example records</span></div><div role="tablist" aria-label="Explore the client portal" className="r-portal-tabs">{['Agreement', 'Invoices'].map((label, i) => <button key={label} role="tab" id={`portal-${i}`} aria-selected={tab === i} aria-controls="portal-panel" tabIndex={tab === i ? 0 : -1} onClick={() => setTab(i)} onKeyDown={e => tabKey(e, i, 2, setTab, 'portal')}>{label}</button>)}</div><div id="portal-panel" role="tabpanel" tabIndex={0} aria-labelledby={`portal-${tab}`} className="r-portal-content">{tab === 0 ? <><h4>Your agreed scope</h4><p>Website design, hosting, technical maintenance and basic SEO.</p><dl><div><dt>Package</dt><dd>$250/month</dd></div><div><dt>Scope and terms</dt><dd>Confirmed before work begins</dd></div></dl><p className="r-portal-disclaimer">Illustrative summary, not a contract.</p></> : <><h4>Invoices & payments</h4><div className="r-invoice-row"><div><strong>Website hosting & care</strong><span>Example monthly invoice</span></div><strong>$250.00</strong></div><p>View the amount, payment status and the invoice associated with your project.</p><p className="r-portal-disclaimer">Fictional record. No payment can be made here.</p></>}</div></div><p className="r-portal-caption">Illustration of existing client portal functions. This manages your project with Wallace Shift, not your customers or advertising accounts.</p></div>
}
function Process() {
  return <section className="r-section r-light" id="process"><div className="r-wrap r-process-grid"><div><h2>Know what you get.<br /><em>Know what happens next.</em></h2><ol>{[['Agree the work', 'We confirm the deliverables, costs, responsibilities and terms. Your questions help shape the scope.'], ['Review the working example', 'See the design and test the agreed inquiry path before launch.'], ['Launch with a clear handoff', 'Know where inquiries arrive, what the tools do and how to ask for support.']].map(([title, text], i) => <li key={title}><span>{i + 1}</span><div><h3>{title}</h3><p>{text}</p></div></li>)}</ol><p className="r-process-note">Your agreement and invoices stay together in your private client portal.</p></div><PortalIllustration /></div></section>
}

function Systems() {
  return <section className="r-systems"><div className="r-wrap"><div><h2>When the work needs<br /><em>more than a website.</em></h2><p>Customer records, handoffs and tools that do not connect can need a different solution. We scope custom CRMs, AI integrations and connected workflows separately.</p></div><a className="m-text-link" href="/services">Explore custom systems<Arrow diagonal /></a></div></section>
}
const faqs = [
  ['Is a CRM included?', 'These packages include a private portal for your agreement and invoices with Wallace Shift. They do not include software to manage your own customers. We can review a compatible CRM you already use for a follow up setup; custom CRM work is scoped separately.'],
  ['What does basic SEO cover?', 'Page titles, descriptions, headings and readable service information. Ongoing content, local SEO campaigns, link building and ranking guarantees are not part of the $250 package.'],
  ['Can you connect my existing tools?', 'We review compatibility and account access before agreeing the work. One agreed follow up setup is included in the $1,500 package. Additional connections, advertising reports and campaign management require their own scope.'],
  ['What will I pay beyond the package price?', 'For the website, we confirm any domain or paid service costs. For the lead page, hosting, software and email or SMS usage can be additional recurring costs. We identify these before you commit.'],
  ['Can I ask questions before choosing?', 'Yes. You can compare the options, discuss an existing website or plan for later. You do not need to choose a package or be ready to purchase.'],
]
function Questions() {
  return <section className="r-section r-light"><div className="r-wrap r-faq-grid"><h2>A few things<br /><em>worth knowing.</em></h2><div>{faqs.map(([question, answer]) => <details key={question}><summary>{question}<Plus /></summary><p>{answer}</p></details>)}</div></div></section>
}
function Showcase() {
  return <section className="r-showcase"><div className="r-wrap"><img src="/media/wallace-shift-hero-poster.webp" alt="Wallace Shift sculptural logo reflected in water" width="1916" height="1080" loading="lazy" /><div><h2>Explore our<br /><em>other dimension.</em></h2><p>Our interactive design experience is here when you want to explore it.</p><a href="/" target="_blank" rel="noreferrer" className="m-text-link">Open the interactive showcase<Arrow diagonal /></a></div></div></section>
}
function Contact() {
  return <section className="r-section r-contact" id="questions"><div className="r-wrap"><div><h2>Start with<br /><em>a question.</em></h2><p>Tell Matthew what you want to improve, or what you want to understand. You do not need to know the solution.</p></div><div><a href={email} className="m-button">Ask Matthew a question<Arrow /></a><a className="m-text-link" href="/contact">Tell us about your project<Arrow /></a><p>Reply within one business day.</p></div></div></section>
}
function App() {
  return <div className="m-page r-page"><Header /><main id="main"><Hero /><Journey /><Packages /><Process /><Systems /><Questions /><Showcase /><Contact /></main><footer className="r-wrap r-footer"><a href="#main" className="m-brand"><img src="/brand/wallace-shift-logo-white.svg" width="20" height="14" alt="" />WALLACE SHIFT</a><a href="/pricing">All services & pricing</a><a href="/privacy">Privacy</a><a href="./PLAN.md">Preview notes</a></footer></div>
}
const root = createRoot(document.getElementById('root')!)
root.render(<App />)
if (import.meta.hot) import.meta.hot.dispose(() => root.unmount())
