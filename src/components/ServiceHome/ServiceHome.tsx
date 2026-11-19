import { useCallback, useEffect, useLayoutEffect, useRef, useState, type MouseEvent } from 'react'
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
import CallRequestDialog, { type ContactSurface, type InquiryMode } from './CallRequestDialog'
import PackageCheckout from './PackageCheckout'
import { packagePurchases } from '../../content/packagePurchase'
import { usePackageSwap } from './usePackageSwap'
import { trackSiteEvent } from '../../lib/analytics'
import './divider-free.css'
import './service-home.css'
import './package-stack.css'
import './hero.css'
import './package-card.css'
import './closing.css'

function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d={diagonal ? 'M6 18 18 6M6 6h12v12' : 'M4 12h16m-6-6 6 6-6 6'} /></svg>
}
function Plus() { return <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><path d="M9 3v12M3 9h12" /></svg> }
function WebsiteDemo() {
  const [demo, setDemo] = useState('northvane')
  const [play, setPlay] = useState(false)
  const names: Record<string, string> = { northvane: 'Roofing', tambour: 'Kitchens', stillwater: 'Pools' }
  return <div className="r-website-demo">
    <div className="r-example-top"><div role="group" aria-label="Choose a website example">{Object.entries(names).map(([key, label]) => <button key={key} aria-pressed={demo === key} onClick={() => { setDemo(key); setPlay(false) }}>{label}</button>)}</div></div>
    <div className="r-screen">{play ? <video controls autoPlay playsInline preload="none" key={demo} poster={`/media/demo-previews/${demo}.jpg`} aria-label={`${names[demo]} website walkthrough`}><source src={`/media/demo-previews/${demo}.mp4`} type="video/mp4" /><track kind="captions" src={`/media/demo-previews/${demo}.vtt`} srcLang="en" label="English" /></video> : <button className="m-watch" aria-label={`Watch the walkthrough: ${names[demo].toLowerCase()} website`} onClick={() => setPlay(true)}><img src={`/media/demo-previews/${demo}.jpg`} alt={`${names[demo]} website design concept by Wallace Shift`} width="1200" height="675" fetchPriority="high" /><span><svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="m6 3 11 7-11 7Z" /></svg>Watch the walkthrough</span></button>}</div>
    {play && <p className="r-credit">Music: <a href="https://www.scottbuckley.com.au/library/a-kind-of-hope/">A Kind Of Hope by Scott Buckley</a>, <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>. Edited with narration.</p>}
  </div>
}

/** Each row turns its package card to the front of the stack below, even when that card's hash is already current. */
function openPackage(kind: PackageId, event: MouseEvent<HTMLAnchorElement>) {
  trackSiteEvent({ name: 'package_link', value: kind })
  event.preventDefault()
  const hash = `#${kind}-package`
  if (window.location.hash !== hash) window.history.pushState(window.history.state, '', hash)
  window.dispatchEvent(new HashChangeEvent('hashchange'))
}

// Question order: what this is, what you get, proof it's good (the demo), what it costs, what to do next.
function Hero({ onDiscuss }: { onDiscuss: () => void }) {
  return <section className="r-hero" id="examples">
    <div className="r-wrap r-hero-grid">
      <div className="r-hero-copy">
        <h1>Websites &<br /><em>lead pages.</em></h1>
        <p>Get a business website with monthly care, or a focused lead page with automatic follow up.</p>
        <WebsiteDemo />
        <ul className="r-hero-packages" aria-label="Packages">
          {(['website', 'lead'] as const).map(kind => {
            const item = packageContent[kind]
            return <li key={kind}><a className="r-hero-package" href={`#${kind}-package`} onClick={event => openPackage(kind, event)}>
              <span className="r-hero-package-name">{item.name} <span>{item.accent}</span></span>
              <span className="r-hero-package-price">{item.price}<small>{item.cadence}</small></span>
              <Arrow /><span className="p-visually-hidden">, see what is included</span>
            </a></li>
          })}
        </ul>
        <div className="r-hero-actions">
          <button type="button" className="m-button r-hero-cta" onClick={onDiscuss} aria-haspopup="dialog">Discuss your project<Arrow /></button>
        </div>
      </div>
    </div>
  </section>
}

const comparisons = [
  ['Best fit', 'A new or improved business website', 'One service, offer or campaign'],
  ['What we build', 'A business website of up to 8 pages', 'One focused lead page'],
  ['Inquiry capture', 'Included, with an agreed destination', 'Included, with an agreed destination'],
  ['Automatic follow up', 'Not included. Can be scoped separately.', 'One agreed workflow included'],
  ['Text messaging readiness', 'Only if separately scoped. Sender approval may be required.', 'If SMS is selected, required registration or verification must be approved before sending.'],
  ['Hosting and maintenance', 'Included within the agreed care scope', 'Hosting may recur. Ongoing management excluded.'],
  ['SEO', 'Basic on page SEO included', 'SEO campaign not included. Page setup agreed in scope.'],
  ['Build or setup charge', 'Website build included in $250/month', '$1,500 once for the agreed page and workflow'],
  ['Continuing costs', '$250/month, plus agreed domain or paid services', 'Hosting, software and message usage may recur'],
  ['After launch', 'Technical maintenance and up to 2 hours of small edits a month', 'Tested handoff. Client manages the agreed tools.'],
  ['Ownership and exit', 'Yours after 12 monthly payments. Month to month, with the first payment refundable within 30 days.', 'Ownership, access and handoff rights agreed in writing'],
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
function PackageComparison({ onTalk }: { onTalk: () => void }) {
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
      <button type="button" className="m-button" onClick={onTalk} aria-haspopup="dialog">Talk through the fit<Arrow /></button>
    </div></aside>
  </section>
}
type PackageId = 'website' | 'lead'
const packageContent = {
  website: {
    name: 'Business website', accent: '& care',
    fit: 'Show your services, work and service area in one place, with ongoing technical care.',
    price: '$250', cadence: '/month',
    example: 'Explore website examples', exampleHref: '#examples',
  },
  lead: {
    name: 'Lead page', accent: '& automatic follow up',
    fit: 'Give one service or campaign its own inquiry and follow up path, alongside your existing website.',
    price: '$1,500', cadence: 'once for setup',
    example: 'Try the inquiry example', exampleHref: '#work',
  },
}
function Check() { return <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="m4 10 4 4 8-8" /></svg> }
function packageFromHash(): PackageId | undefined {
  if (window.location.hash === '#website-package') return 'website'
  if (window.location.hash === '#lead-package') return 'lead'
}
/**
 * Reads in the order a buyer decides: what it is, what it costs and what you pay today, the action,
 * then what is included and what you are agreeing to. Purchase terms come from packagePurchase.ts,
 * the same source the checkout and the signed agreement use.
 */
// Both cards share one set of rows (see package-card.css): what it is beside the price, what is
// included beside "Good to know", then one link to see it. Each fact appears once.
function PackageCard({ kind, selected, onBuy }: { kind: PackageId; selected: boolean; onBuy: (kind: PackageId) => void }) {
  const item = packageContent[kind]
  const purchase = packagePurchases[kind]
  // The back card is covered except for its top edge, so keep focus and assistive tech on the front one.
  return <article className={`p-package ${selected ? 'is-selected' : ''}`} id={`${kind}-package`} aria-labelledby={`${kind}-package-heading`} data-stack-card={kind} inert={!selected}>
    <div className="pc-identity">
      <PackageArtwork kind={kind} />
      <div>
        <h3 id={`${kind}-package-heading`} tabIndex={-1}>{item.name}<br /><em>{item.accent}</em></h3>
        <p>{item.fit}</p>
      </div>
    </div>
    <div className="pc-offer">
      <p className="pc-price">{item.price}<span>{item.cadence}</span></p>
      <p className="pc-schedule">{purchase.schedule}</p>
      <button type="button" className="m-button pc-buy" onClick={() => onBuy(kind)} aria-haspopup="dialog">Buy now<span className="p-visually-hidden">: {item.name} {item.accent}</span><Arrow /></button>
    </div>
    <section className="pc-included" aria-labelledby={`${kind}-included`}>
      <h4 id={`${kind}-included`}>What’s included</h4>
      <ul>{purchase.included.map(text => <li key={text}><Check /><span>{text}</span></li>)}</ul>
    </section>
    <section className="pc-know" aria-labelledby={`${kind}-know`}>
      <h4 id={`${kind}-know`}>Good to know</h4>
      <dl>{purchase.goodToKnow.map(row => <div key={row.label}><dt>{row.label}</dt><dd>{row.text}{kind === 'website' && row.label === 'Cancelling' && <> <a href="#guarantee">How the guarantee works</a></>}</dd></div>)}</dl>
    </section>
    <a className="pc-see" href={item.exampleHref}>{item.example}<Arrow /></a>
  </article>
}
function Packages({ onBuy, onAsk }: { onBuy: (kind: PackageId) => void; onAsk: () => void }) {
  const [selected, setSelected] = useState<PackageId>('website')
  const [docked, setDocked] = useState(false)
  const sectionRef = useRef<HTMLElement>(null)
  const slotRef = useRef<HTMLDivElement>(null)
  const selectorRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const tabRef = useRef<HTMLButtonElement>(null)
  const fullPanelHeight = useRef(0)
  const scrollFrame = useRef(0)
  const animateSwap = useRef(false)
  usePackageSwap(listRef, selected, animateSwap)

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

  const choose = useCallback((kind: PackageId, { updateHistory = true, animate = true } = {}) => {
    animateSwap.current = animate
    flushSync(() => { setSelected(kind); setDocked(true) })
    const hash = `#${kind}-package`
    if (updateHistory && window.location.hash !== hash) window.history.pushState(window.history.state, '', hash)
    // The tab marks the top of the stack and is never transformed, so it measures true mid swap.
    const stackTop = tabRef.current
    if (!stackTop || !selectorRef.current) return
    const top = window.scrollY + stackTop.getBoundingClientRect().top - selectorRef.current.getBoundingClientRect().bottom - 24
    window.scrollTo({ top, behavior: 'instant' })
  }, [])

  useEffect(() => {
    let cancelled = false
    const followHash = (animate: boolean) => {
      const kind = packageFromHash()
      if (kind) choose(kind, { updateHistory: false, animate })
    }
    const onHashChange = () => {
      followHash(true)
      // Arriving from a package link: start keyboard and screen reader users on the card that came forward.
      const kind = packageFromHash()
      if (kind) document.getElementById(`${kind}-package-heading`)?.focus({ preventScroll: true })
    }
    // Fragment navigation can precede React mounting and web font layout.
    void document.fonts.ready.then(() => {
      if (cancelled) return
      scrollFrame.current = requestAnimationFrame(() => {
        if (packageFromHash()) followHash(false)
        else if (window.location.hash === '#packages') sectionRef.current?.scrollIntoView()
      })
    })
    window.addEventListener('hashchange', onHashChange)
    return () => { cancelled = true; cancelAnimationFrame(scrollFrame.current); window.removeEventListener('hashchange', onHashChange) }
  }, [choose])

  const back: PackageId = selected === 'website' ? 'lead' : 'website'
  const backItem = packageContent[back]
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
        <div className="p-starting-help"><p>Need both, or not sure?</p><button type="button" onClick={onAsk} aria-haspopup="dialog">Ask Matthew a question<Arrow /></button></div>
      </div></div>
    </div>
    <div className="r-wrap p-package-list p-package-stack" ref={listRef}>
      <button ref={tabRef} type="button" className="p-stack-tab" data-stack-tab aria-controls={`${back}-package`} onClick={() => choose(back)}>
        <span className="p-stack-tab-name"><span className="p-visually-hidden">Bring forward: </span>{backItem.name} <em>{backItem.accent}</em></span>
        <span className="p-stack-tab-price">{backItem.price}<small>{backItem.cadence}</small><Arrow /></span>
      </button>
      {(['website', 'lead'] as const).map(kind => <PackageCard key={kind} kind={kind} selected={selected === kind} onBuy={onBuy} />)}
    </div>
    <span className="p-visually-hidden" role="status">{selected === 'website' ? 'Business website and care' : 'Lead page and automatic follow up'} shown in front. Both packages remain available.</span>
  </section>
}

// The showcase is an optional detour, so it gets its own full-width image band.
// The WS stays centred; the copy sits in the dark water to its left.
function Showcase() {
  return <section className="r-showcase" aria-labelledby="showcase-heading">
    <img className="r-showcase-media" src="/media/wallace-shift-hero-poster.webp" alt="Wallace Shift sculptural logo reflected in water" width="1916" height="1080" loading="lazy" />
    <div className="r-wrap r-showcase-copy"><h2 id="showcase-heading">Explore our<br /><em>other dimension.</em></h2><p>Our interactive design experience is here when you want to explore it.</p><a href="/showcase" className="m-text-link">Open the interactive showcase<Arrow diagonal /></a></div>
  </section>
}
// The page's closing step: one question, one way to ask it.
function Contact({ onAsk }: { onAsk: () => void }) {
  return <section className="r-section r-light r-contact" id="questions" aria-labelledby="questions-heading">
    <div className="r-wrap r-contact-grid">
      <h2 id="questions-heading">Start with<br /><em>a question.</em></h2>
      <div className="r-contact-body">
        <p>Tell Matthew what you want to improve, or what you want to understand. You do not need to know the solution.</p>
        <button type="button" className="m-button" onClick={onAsk} aria-haspopup="dialog">Ask Matthew a question<Arrow /></button>
      </div>
    </div>
  </section>
}
export default function ServiceHome() {
  const [requestOpen, setRequestOpen] = useState(false)
  const [requestMode, setRequestMode] = useState<InquiryMode>('phone')
  const [requestSurface, setRequestSurface] = useState<ContactSurface>('home_hero')
  // Every way into the form opens the same panel; the surface keeps analytics honest about which one.
  const openRequest = useCallback((surface: ContactSurface) => { trackSiteEvent({ name: 'contact_open', value: surface }); setRequestSurface(surface); setRequestMode('phone'); setRequestOpen(true) }, [])
  const discussProject = useCallback(() => openRequest('home_hero'), [openRequest])
  const askFromPackages = useCallback(() => openRequest('home_packages'), [openRequest])
  const askQuestion = useCallback(() => openRequest('home_questions'), [openRequest])
  const talkThroughFit = useCallback(() => openRequest('home_comparison'), [openRequest])
  const closeRequest = useCallback(() => setRequestOpen(false), [])
  const [checkout, setCheckout] = useState<{ open: boolean; kind: PackageId }>({ open: false, kind: 'website' })
  const openCheckout = useCallback((kind: PackageId) => { trackSiteEvent({ name: 'package_checkout_open', value: kind }); setCheckout({ open: true, kind }) }, [])
  const closeCheckout = useCallback(() => setCheckout(current => ({ ...current, open: false })), [])
  return <div className="m-page r-page p-page service-home"><Hero onDiscuss={discussProject} /><Packages onBuy={openCheckout} onAsk={askFromPackages} /><PackageComparison onTalk={talkThroughFit} /><InquiryJourney /><Guarantee /><Upgrades onDiscuss={openRequest} /><Process /><Systems /><Questions /><Showcase /><Contact onAsk={askQuestion} /><CallRequestDialog open={requestOpen} surface={requestSurface} mode={requestMode} onModeChange={setRequestMode} onClose={closeRequest} />
    {/* Keyed by package so a half-finished purchase of one package never carries into the other. */}
    <PackageCheckout key={checkout.kind} open={checkout.open} packageId={checkout.kind} onClose={closeCheckout} /></div>
}
