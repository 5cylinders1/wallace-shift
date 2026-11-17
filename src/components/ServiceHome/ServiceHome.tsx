import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import './base.css'
import './refined.css'
import './purchase.css'
import InquiryJourney from './InquiryJourney'
import Guarantee from './Guarantee'
import Upgrades from './Upgrades'
import Systems from './Systems'
import Process from './Process'
import PackageArtwork from './PackageArtwork'
import Questions from './Questions'
import CallRequestDialog, { type InquiryMode } from './CallRequestDialog'
import ContactChoices from './ContactChoices'
import './divider-free.css'
import './service-home.css'

const email = 'mailto:matthew@wallaceshift.com?subject=Question%20about%20my%20website'
const offerPaths = { website: '/offers/contractor-websites', lead: '/offers/lead-page-follow-up' }
function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d={diagonal ? 'M6 18 18 6M6 6h12v12' : 'M4 12h16m-6-6 6 6-6 6'} /></svg>
}
function Plus() { return <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><path d="M9 3v12M3 9h12" /></svg> }
function WebsiteDemo() {
  const [demo, setDemo] = useState('northvane')
  const [play, setPlay] = useState(false)
  const names: Record<string, string> = { northvane: 'Roofing', tambour: 'Kitchens', stillwater: 'Pools' }
  return <div className="r-website-demo">
    <div className="r-example-top"><span>Website examples</span><div role="group" aria-label="Choose a website example">{Object.entries(names).map(([key, label]) => <button key={key} aria-pressed={demo === key} onClick={() => { setDemo(key); setPlay(false) }}>{label}</button>)}</div></div>
    <div className="r-screen">{play ? <video controls autoPlay playsInline preload="none" key={demo} poster={`/media/demo-previews/${demo}.jpg`} aria-label={`${names[demo]} website walkthrough`}><source src={`/media/demo-previews/${demo}.mp4`} type="video/mp4" /><track kind="captions" src={`/media/demo-previews/${demo}.vtt`} srcLang="en" label="English" /></video> : <button className="m-watch" aria-label={`Watch the walkthrough: ${names[demo].toLowerCase()} website`} onClick={() => setPlay(true)}><img src={`/media/demo-previews/${demo}.jpg`} alt={`${names[demo]} website design concept by Wallace Shift`} width="1200" height="675" fetchPriority="high" /><span><svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="m6 3 11 7-11 7Z" /></svg>Watch the walkthrough</span></button>}</div>
    <div className="r-example-caption"><p>Fictional demo brands. Advanced tools shown are scoped separately.</p><a href="#work">Follow the inquiry<Arrow /></a></div>
    {play && <p className="r-credit">Music: <a href="https://www.scottbuckley.com.au/library/a-kind-of-hope/">A Kind Of Hope by Scott Buckley</a>, <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>. Edited with narration.</p>}
  </div>
}

function Hero({ onRequestCall, onBookMeeting }: { onRequestCall: () => void; onBookMeeting: () => void }) {
  return <section className="r-hero" id="examples">
    <div className="r-wrap r-hero-grid">
      <div className="r-hero-copy">
        <h1>Websites &<br /><em>lead pages.</em></h1>
        <p>Get a business website with monthly care, or a focused lead page with automatic follow up.</p>
        <div className="home-contact-options">
          <p className="home-contact-label">Let’s talk about what you need</p>
          <ContactChoices onRequestCall={onRequestCall} onBookMeeting={onBookMeeting} />
        </div>
        <p className="p-call-next-step">No need to choose a package first.</p>
        <div className="r-opening-prices">
          <a href="#website-package"><span>Website, hosting & care</span><strong>$250 <small>/month</small></strong></a>
          <a href="#lead-package"><span>Lead page & follow up</span><strong>$1,500 <small>once for setup</small></strong></a>
        </div>
        <p className="p-opening-note">Package details and any additional costs below.</p>
      </div>
      <WebsiteDemo />
    </div>
    <div className="r-wrap r-hero-foot"><p>Built in Greater Kansas City. Available remotely.</p><a href="/services">Need a custom CRM or connected system?<Arrow diagonal /></a></div>
  </section>
}

const comparisons = [
  ['Best fit', 'A new or improved business website', 'One service, offer or campaign'],
  ['What we build', 'Business website. Page count agreed in scope.', 'One focused lead page'],
  ['Inquiry capture', 'Included, with an agreed destination', 'Included, with an agreed destination'],
  ['Automatic follow up', 'Not included. Can be scoped separately.', 'One agreed workflow included'],
  ['Text messaging readiness', 'Only if separately scoped. Sender approval may be required.', 'If SMS is selected, required registration or verification must be approved before sending.'],
  ['Hosting and maintenance', 'Included within the agreed care scope', 'Hosting may recur. Ongoing management excluded.'],
  ['SEO', 'Basic on page SEO included', 'SEO campaign not included. Page setup agreed in scope.'],
  ['Build or setup charge', 'Website build included in $250/month', '$1,500 once for the agreed page and workflow'],
  ['Continuing costs', '$250/month, plus agreed domain or paid services', 'Hosting, software and message usage may recur'],
  ['After launch', 'Technical maintenance. Update allowance agreed.', 'Tested handoff. Client manages the agreed tools.'],
  ['Ownership and exit', 'Ownership, term and cancellation agreed in writing', 'Ownership, access and handoff rights agreed in writing'],
  ['Advertising', 'Ad spend and campaign management excluded', 'Ad spend and campaign management excluded'],
  ['Client software', 'Agreement and invoice portal. No customer CRM.', 'Agreement and invoice portal. No customer CRM.'],
]
const comparisonHighlights = [0, 1, 3, 8, 9]
function ComparisonRows({ rows }: { rows: typeof comparisons }) {
  return rows.map(([label, website, lead]) => <tr key={label} role="row">
    <th scope="row" role="rowheader">{label}</th>
    <td role="cell">{website}</td>
    <td role="cell">{lead}</td>
  </tr>)
}
function PackageComparison() {
  const [expanded, setExpanded] = useState(false)
  return <section className="r-section p-comparison" id="compare" aria-labelledby="compare-heading">
    <div className="r-wrap">
      <div className="r-section-head p-comparison-heading">
        <h2 id="compare-heading">The differences,<br /><em>at a glance.</em></h2>
        <p>Compare what is included and what happens after launch. These are two different services, so start with the work you need.</p>
      </div>
      <table className="p-comparison-table" role="table">
        <caption className="p-visually-hidden">Website care and lead page setup comparison</caption>
        <thead role="rowgroup"><tr role="row">
          <th scope="col" role="columnheader" className="p-criterion-heading">What to consider</th>
          <th scope="col" role="columnheader"><span className="p-column-title">Website & care</span><span className="p-column-price">$250<small>/month</small></span><span className="p-column-note">Website build included</span></th>
          <th scope="col" role="columnheader"><span className="p-column-title">Lead page & follow up</span><span className="p-column-price">$1,500<small>once for setup</small></span><span className="p-column-note">Running costs may continue</span></th>
        </tr></thead>
        <tbody role="rowgroup"><ComparisonRows rows={comparisonHighlights.map(index => comparisons[index])} /></tbody>
        <tbody role="rowgroup" id="comparison-details" hidden={!expanded}><ComparisonRows rows={comparisons.filter((_, index) => !comparisonHighlights.includes(index))} /></tbody>
      </table>
      <div className="p-comparison-actions">
        <button type="button" className="p-comparison-toggle" aria-expanded={expanded} aria-controls="comparison-details" onClick={() => setExpanded(!expanded)}>
          {expanded ? 'Show fewer details' : 'Show all package details'}<Plus />
        </button>
        <p>{expanded ? 'All 13 comparison points shown.' : 'Also compare hosting, SEO, ownership, SMS and exclusions.'}</p>
      </div>
    </div>
    <aside className="p-both" aria-labelledby="both-heading"><div className="r-wrap p-both-content">
      <h3 id="both-heading">Need <em>both?</em></h3>
      <div><p>We can scope them together and identify shared work.</p><small>There is no automatic bundle price.</small></div>
      <a href="#questions" className="m-button">Talk through the fit<Arrow /></a>
    </div></aside>
  </section>
}
type PackageId = 'website' | 'lead'
const packageContent = {
  website: {
    name: 'Business website', accent: '& care',
    fit: 'Show your services, work and service area in one place, with ongoing technical care.',
    price: '$250', cadence: '/month',
    included: ['Website build and inquiry form with agreed routing', 'Hosting and technical maintenance', 'Basic on page SEO'],
    after: 'Your team handles replies. We maintain the website within the agreed care scope.',
    costs: 'Domain registration and paid services may cost extra.',
    terms: 'Page count, update allowance, minimum term, cancellation and ownership are agreed before payment.',
    action: 'Explore website care', example: 'Explore website examples', exampleHref: '#examples',
  },
  lead: {
    name: 'Lead page', accent: '& automatic follow up',
    fit: 'Give one service or campaign its own inquiry and follow up path, alongside your existing website.',
    price: '$1,500', cadence: 'once for setup',
    included: ['One focused page with inquiry capture and routing', 'One agreed automatic follow up workflow', 'Workflow testing and handoff'],
    after: 'Your team operates the agreed tools and handles replies. Ongoing workflow management is separate.',
    costs: 'Hosting, software and message usage may add recurring costs.',
    terms: 'Tools, access, ownership and running costs are agreed before payment. Advertising is separate.',
    action: 'Explore lead page setup', example: 'Try the inquiry example', exampleHref: '#work',
  },
}
function PackageIcon({ kind }: { kind: PackageId }) {
  return <svg viewBox="0 0 32 32" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {kind === 'website' ? <><rect x="3" y="5" width="26" height="22" rx="3" /><path d="M3 11h26M8 8h.1m3 0h.1M8 16h7v6H8zM20 16h4m-4 5h4" /></> : <><rect x="3" y="4" width="17" height="23" rx="3" /><path d="M8 10h7m-7 5h5m6 3h10m-4-4 4 4-4 4M8 22h4" /></>}
  </svg>
}
function Check() { return <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="m4 10 4 4 8-8" /></svg> }
function packageFromHash(): PackageId | undefined {
  if (window.location.hash === '#website-package') return 'website'
  if (window.location.hash === '#lead-package') return 'lead'
}
function PackageCard({ kind, selected }: { kind: PackageId; selected: boolean }) {
  const item = packageContent[kind]
  return <article className={`p-package ${selected ? 'is-selected' : ''}`} id={`${kind}-package`} aria-labelledby={`${kind}-package-heading`}>
    <header className="p-package-heading">
      <div className="p-package-overview">
        <div className="p-package-purpose"><span className="p-package-icon"><PackageIcon kind={kind} /></span><div><h3 id={`${kind}-package-heading`}>{item.name}<br /><em>{item.accent}</em></h3><p>{item.fit}</p></div></div>
        <PackageArtwork kind={kind} />
      </div>
      <div className="p-package-price"><div className="p-price">{item.price}<span>{item.cadence}</span></div><span className="p-package-selection">{selected ? <><Check />Your selected starting point</> : 'Also available'}</span></div>
    </header>
    <div className="p-package-body">
      <div className="p-package-scope"><h4>What is included</h4><ul>{item.included.map(text => <li key={text}><Check /><span>{text}</span></li>)}</ul><div className="p-package-after"><h4>After delivery</h4><p>{item.after}</p></div></div>
      <aside className="p-package-terms" aria-label={`${item.name} costs and commitment`}><h4>Costs & commitment</h4><p className="p-cost-note">{item.costs}</p><p>{item.terms}</p>{kind === 'lead' && <div className="p-sms-note"><h4>Using text messages?</h4><p>Automated texts to US customers from a local 10 digit number require A2P 10DLC registration before sending. Approval can take several business days or longer and may delay SMS launch.</p></div>}</aside>
    </div>
    <footer className="p-package-actions"><div><a className="m-button" href={offerPaths[kind]}>{item.action}<Arrow /></a><a href="#guarantee" className="p-policy-link">Proposed 30 day guarantee</a></div><a href={item.exampleHref} className="p-example-link">{item.example}<Arrow /></a></footer>
  </article>
}
function Packages() {
  const [selected, setSelected] = useState<PackageId>('website')
  const [docked, setDocked] = useState(false)
  const sectionRef = useRef<HTMLElement>(null)
  const slotRef = useRef<HTMLDivElement>(null)
  const selectorRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const fullPanelHeight = useRef(0)
  const scrollFrame = useRef(0)

  // Keep one set of controls mounted so focus survives docking and package reordering.
  useLayoutEffect(() => {
    const slot = slotRef.current
    const selector = selectorRef.current
    if (!slot || !selector) return
    slot.style.minHeight = docked ? `${fullPanelHeight.current}px` : ''
    if (docked) {
      const measureOffset = () => sectionRef.current?.style.setProperty('--package-scroll-offset', `${selector.getBoundingClientRect().bottom + 24}px`)
      measureOffset()
      const observer = new ResizeObserver(measureOffset)
      observer.observe(selector)
      return () => observer.disconnect()
    }
    const measure = () => { fullPanelHeight.current = selector.getBoundingClientRect().height }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(selector)
    return () => observer.disconnect()
  }, [docked])

  useEffect(() => {
    let frame = 0
    const update = () => {
      const slot = slotRef.current
      const section = sectionRef.current
      if (!slot || !section) return
      const threshold = Math.min(180, window.innerHeight / 3)
      setDocked(slot.getBoundingClientRect().bottom <= threshold && section.getBoundingClientRect().bottom > threshold + 80)
    }
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(update) }
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => { cancelAnimationFrame(frame); window.removeEventListener('scroll', schedule); window.removeEventListener('resize', schedule) }
  }, [])

  const choose = useCallback((kind: PackageId, updateHistory = true) => {
    flushSync(() => { setSelected(kind); setDocked(true) })
    const hash = `#${kind}-package`
    if (updateHistory && window.location.hash !== hash) window.history.pushState(window.history.state, '', hash)
    const firstPackage = listRef.current?.firstElementChild
    if (!firstPackage || !selectorRef.current) return
    const top = window.scrollY + firstPackage.getBoundingClientRect().top - selectorRef.current.getBoundingClientRect().bottom - 24
    window.scrollTo({ top, behavior: 'instant' })
  }, [])

  useEffect(() => {
    let cancelled = false
    const followHash = () => {
      const kind = packageFromHash()
      if (kind) choose(kind, false)
    }
    // Fragment navigation can precede React mounting and web font layout.
    void document.fonts.ready.then(() => {
      if (cancelled) return
      scrollFrame.current = requestAnimationFrame(() => {
        if (packageFromHash()) followHash()
        else if (window.location.hash === '#packages') sectionRef.current?.scrollIntoView()
      })
    })
    window.addEventListener('hashchange', followHash)
    return () => { cancelled = true; cancelAnimationFrame(scrollFrame.current); window.removeEventListener('hashchange', followHash) }
  }, [choose])

  const order: PackageId[] = selected === 'website' ? ['website', 'lead'] : ['lead', 'website']
  return <section className="r-section r-light p-packages" id="packages" ref={sectionRef}>
    <div className="p-package-intro">
      <div className="p-package-intro-copy">
        <h2>Choose the work.<br /><em>Know the commitment.</em></h2>
        <p>A website for your whole business, or a focused page for one offer. Each has its own scope and way of working.</p>
        <a className="m-text-link" href="#compare">Compare what is included<Arrow /></a>
      </div>
      <div className="p-starting-slot" ref={slotRef}><div className={`p-starting-point ${docked ? 'is-docked' : ''}`} ref={selectorRef}>
        <h3 id="starting-point-heading">What do you need right now?</h3>
        <p>Jump straight to the details that fit.</p>
        <div className="p-starting-links" role="group" aria-label="Choose which package to read first">
          {(['website', 'lead'] as const).map(kind => <button key={kind} id={`package-choice-${kind}`} type="button" aria-label={kind === 'website' ? 'I need a business website' : 'I need a page for one offer'} aria-pressed={selected === kind} aria-controls={`${kind}-package`} onClick={event => { event.currentTarget.focus({ preventScroll: true }); choose(kind) }}><span><strong>{kind === 'website' ? 'I need a business website' : 'I need a page for one offer'}</strong><span>{kind === 'website' ? 'A new or clearer site, with ongoing care.' : 'One focused page and a follow up workflow.'}</span></span><span className="p-route-arrow">{selected === kind ? <Check /> : <Arrow />}</span></button>)}
        </div>
        <div className="p-starting-help"><p>Need both, or not sure?</p><a href="#questions">Ask Matthew a question<Arrow diagonal /></a></div>
      </div></div>
    </div>
    <div className="r-wrap p-package-list" ref={listRef}>{order.map(kind => <PackageCard key={kind} kind={kind} selected={selected === kind} />)}</div>
    <span className="p-visually-hidden" role="status">{selected === 'website' ? 'Business website and care' : 'Lead page and automatic follow up'} shown first. Both packages remain available.</span>
  </section>
}

function Showcase() {
  return <section className="r-showcase"><div className="r-wrap"><img src="/media/wallace-shift-hero-poster.webp" alt="Wallace Shift sculptural logo reflected in water" width="1916" height="1080" loading="lazy" /><div><h2>Explore our<br /><em>other dimension.</em></h2><p>Our interactive design experience is here when you want to explore it.</p><a href="/showcase" className="m-text-link">Open the interactive showcase<Arrow diagonal /></a></div></div></section>
}
function Contact() {
  return <section className="r-section r-contact" id="questions"><div className="r-wrap"><div><h2>Start with<br /><em>a question.</em></h2><p>Tell Matthew what you want to improve, or what you want to understand. You do not need to know the solution.</p></div><div><a href={email} className="m-button">Ask Matthew a question<Arrow /></a><a className="m-text-link" href="/contact">Tell us about your project<Arrow /></a><p>Questions are welcome before you choose.</p></div></div></section>
}
export default function ServiceHome() {
  const [requestOpen, setRequestOpen] = useState(false)
  const [requestMode, setRequestMode] = useState<InquiryMode>('phone')
  const openRequest = useCallback(() => { setRequestMode('phone'); setRequestOpen(true) }, [])
  const openMeeting = useCallback(() => { setRequestMode('meeting'); setRequestOpen(true) }, [])
  const closeRequest = useCallback(() => setRequestOpen(false), [])
  return <div className="m-page r-page p-page service-home"><Hero onRequestCall={openRequest} onBookMeeting={openMeeting} /><Packages /><PackageComparison /><InquiryJourney /><Guarantee /><Upgrades /><Process /><Systems /><Questions /><Showcase /><Contact /><CallRequestDialog open={requestOpen} mode={requestMode} onModeChange={setRequestMode} onClose={closeRequest} /></div>
}
