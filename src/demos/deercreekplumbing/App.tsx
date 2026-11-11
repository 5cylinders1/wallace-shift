import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { services, pages, href } from './data'
import { AreaChecker, BookingForm } from './LeadTools'
import './site.css'

const media = '/demos/deercreek/photos/'
const phone = '(913) 440-9102'
const tel = 'tel:+19134409102'
const google = 'https://maps.google.com/maps?cid=6948310473349042081'
const facebook = 'https://www.facebook.com/DeerCreekPlumbing/reviews'
const mail = 'deercreekplumbinginc@gmail.com'

export function Arrow() { return <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 12h15M13 5l7 7-7 7" /></svg> }
function LinkButton({ children, to = 'schedule', quiet = false }: {children: ReactNode; to?: string; quiet?: boolean}) {
  return <a className={`dcp-button${quiet ? ' dcp-button-quiet' : ''}`} href={to.startsWith('tel:') ? to : href(to)}>{children}<Arrow /></a>
}
function Photo({ name, alt, eager = false, className = '' }: {name:string; alt:string; eager?:boolean; className?:string}) {
  return <img className={`dcp-photo ${className}`} src={`${media}${name}-800.webp`} srcSet={`${media}${name}-800.webp 800w, ${media}${name}-1600.webp 1600w`} sizes="(max-width: 760px) 100vw, 65vw" width="800" height="535" alt={alt} loading={eager ? 'eager' : 'lazy'} fetchPriority={eager ? 'high' : 'auto'} />
}
function subscribeReading(notify: () => void) {
  window.addEventListener('dcp-reading-change', notify)
  return () => window.removeEventListener('dcp-reading-change', notify)
}
function readingSnapshot() {
  return (document.documentElement.hasAttribute('data-dcp-large') ? 1 : 0) | (document.documentElement.hasAttribute('data-dcp-still') ? 2 : 0)
}
function ReadingOptions() {
  const preferences = useSyncExternalStore(subscribeReading, readingSnapshot, () => 0)
  const large = Boolean(preferences & 1)
  const still = Boolean(preferences & 2)
  function change(key: 'large'|'still', value: boolean) {
    const settings = {large, still, [key]:value}
    document.documentElement.toggleAttribute('data-dcp-large', settings.large)
    document.documentElement.toggleAttribute('data-dcp-still', settings.still)
    try { localStorage.setItem('dcp-reading', JSON.stringify(settings)) } catch { /* no persistence required */ }
    window.dispatchEvent(new Event('dcp-reading-change'))
  }
  return <details className="dcp-reading"><summary>Reading options</summary><div className="dcp-reading-panel"><label><input type="checkbox" checked={large} onChange={e=>change('large',e.target.checked)} />Larger text</label><label><input type="checkbox" checked={still} onChange={e=>change('still',e.target.checked)} />Reduce motion</label><a href={href('accessibility')}>Accessibility information</a></div></details>
}
function Header({slug}:{slug:string}) {
  const [open,setOpen]=useState(false)
  const menu=useRef<HTMLButtonElement>(null)
  useEffect(()=> { if(!open)return; const close=(e:KeyboardEvent)=>{if(e.key==='Escape'){setOpen(false);menu.current?.focus()}};document.addEventListener('keydown',close);return()=>document.removeEventListener('keydown',close) },[open])
  return <>
    <a className="dcp-skip" href="#main">Skip to content</a>
    <div className="dcp-demo">Website concept by Wallace Shift. Online requests are a demo and are not sent.</div>
    <header className="dcp-header dcp-wrap">
      <a href={href()} className="dcp-brand" aria-label="Deer Creek Plumbing home"><img src="/demos/deercreek/mark-ink.png" alt="" width="48" height="46" /><span>Deer Creek<br /><strong>Plumbing</strong></span></a>
      <button className="dcp-menu" ref={menu} aria-expanded={open} aria-controls="dcp-navigation" onClick={()=>setOpen(!open)}>{open?'Close menu':'Menu'}</button>
      <nav id="dcp-navigation" className="dcp-nav" data-open={open} aria-label="Main navigation">
        {[['services','Services'],['service-area','Service area'],['reviews','Reviews'],['about','Our story']].map(([path,label])=><a key={path} href={href(path)} aria-current={slug===path?'page':undefined}>{label}</a>)}
        <a className="dcp-nav-call" href={tel}>{phone}</a>
      </nav>
      <ReadingOptions />
    </header>
  </>
}
function Footer() {
 return <footer className="dcp-footer"><div className="dcp-wrap"><div className="dcp-footer-top"><h2>Let’s get it sorted.</h2><LinkButton>Request service</LinkButton></div><div className="dcp-footer-grid"><div><a className="dcp-footer-brand" href={href()}>Deer Creek Plumbing</a><p>Locally owned. Here for your home.<br />Serving the Kansas City metro since 2017.</p></div><div><h3>Talk to the team</h3><a href={tel}>{phone}</a><a href={`mailto:${mail}`}>{mail}</a><p>Monday to Friday<br />8:00 a.m. to 4:30 p.m.</p></div><div><h3>Find your way</h3><a href={href('services')}>Plumbing services</a><a href={href('service-area')}>Check your service area</a><a href={href('accessibility')}>Accessibility</a><a href={google}>Google Business Profile</a><a href={facebook}>Facebook recommendations</a></div></div><div className="dcp-footer-bottom"><p>19968 W 162nd St, Olathe, KS 66062</p><p>Independent website concept by <a href="https://wallaceshift.com">Wallace Shift</a></p></div></div></footer>
}
const reviewSummaries = [
  {name:'Spencer D.',source:'Google',text:'Help coordinating a water heater warranty exchange for a rental property.'},
  {name:'Ashleigh A.',source:'Google',text:'Kind service, timely repairs and clear explanations throughout the job.'},
  {name:'Micah K.',source:'Google',text:'Punctual arrival, upfront pricing and careful cleanup.'},
  {name:'Dawn W.',source:'Google',text:'Helpful explanations and advice on preventing future plumbing problems.'},
  {name:'Noemi H.',source:'Facebook',text:'Clear communication and a quick repair to a leaking water pipe.'},
  {name:'Jerry F.',source:'Facebook',text:'Recommends the team for honesty and reliability.'},
]
function ReviewList({limit=6}:{limit?:number}) {
 return <div className="dcp-review-list">{reviewSummaries.slice(0,limit).map(r=><article className="dcp-review" key={r.name}><p>{r.text}</p><footer><strong>{r.name}</strong><a href={r.source==='Google'?google:facebook}>{r.source==='Google'?'Google review':'Facebook recommendation'} <span aria-hidden="true">↗</span></a></footer></article>)}</div>
}
function Home() {
 return <>
  <section className="dcp-hero dcp-wrap" aria-labelledby="hero-title"><div className="dcp-hero-heading"><h1 id="hero-title">Plumbing.<br />With care.</h1><div className="dcp-hero-intro"><p>Local plumbing for Olathe and the Kansas City metro. Family owned since 2017, with a one year parts and labor warranty.</p><LinkButton>Request service</LinkButton><a className="dcp-text-link" href={tel}>Or call {phone}</a></div></div>
    <div className="dcp-hero-stage"><div className="dcp-hero-photo"><Photo name="pipe-vise" alt="A Deer Creek plumber carefully working on copper pipe at a red pipe vise" eager /></div><div className="dcp-quick-start"><h2>What needs fixing?</h2><form action={href('schedule')} method="get"><label htmlFor="dcp-quick-service">Choose your service</label><select id="dcp-quick-service" name="service" defaultValue=""><option value="">I’m not sure yet</option>{services.map(s=><option key={s.slug} value={s.slug}>{s.name}</option>)}</select><button className="dcp-button dcp-button-light" type="submit">Start a request <Arrow /></button></form><div className="dcp-hero-review"><span className="dcp-rating">5.0 out of 5</span><a href={google}>286 Google reviews <span aria-hidden="true">↗</span></a><small>Verified November 10, 2026</small></div></div></div>
  </section>
  <section className="dcp-section dcp-wrap" aria-labelledby="services-title"><div className="dcp-section-heading"><h2 id="services-title">A fix for the everyday.</h2><p>Hot water, clear drains and a home that works. Get help with the problem in front of you, or plan the next improvement.</p></div><div className="dcp-service-feature"><a className="dcp-image-link" href={href('services/water-heaters')}><Photo name="overhead" alt="A Deer Creek plumber adjusts pipework with two wrenches" /><h3>Hot water, handled.<Arrow /></h3><p>Water heater repair and replacement</p></a><a className="dcp-image-link" href={href('services/drain-cleaning')}><Photo name="framing" alt="A Deer Creek plumber fits drain pipe in a framed interior wall" /><h3>Keep things moving.<Arrow /></h3><p>Drain cleaning and plumbing repairs</p></a></div><div className="dcp-service-links">{services.filter(s=>!['water-heaters','drain-cleaning'].includes(s.slug)).map(s=><a key={s.slug} href={href(`services/${s.slug}`)}>{s.name}<Arrow /></a>)}</div></section>
  <section className="dcp-reviews-section" aria-labelledby="reviews-title"><div className="dcp-wrap"><div className="dcp-section-heading"><h2 id="reviews-title">Word around town.</h2><div><p>Clear explanations. Respect for your home. People who show up ready to help.</p><p className="dcp-small">Summaries of customer reviews, not direct quotations.</p></div></div><ReviewList limit={3}/><a className="dcp-text-link" href={href('reviews')}>Meet the reviews behind the words <Arrow /></a></div></section>
  <section className="dcp-section dcp-wrap dcp-care" aria-labelledby="care-title"><div className="dcp-care-photo"><Photo name="site-layout" alt="A Deer Creek plumber measures new pipe locations at a construction site" /></div><div className="dcp-care-copy"><h2 id="care-title">Your home.<br />Your needs.</h2><p>Good service starts with listening. Request email instead of a call, extra time at the door, or a conversation about sensory or mobility needs.</p><p>Our booking demo makes room for those preferences. The team confirms what can be arranged before a real visit.</p><LinkButton>Plan your visit</LinkButton><a className="dcp-text-link" href={href('accessibility')}>Explore accessibility</a></div></section>
  <section className="dcp-area-section" aria-labelledby="area-title"><div className="dcp-wrap dcp-area-layout"><div><h2 id="area-title">Close to home.</h2><p>Based in Olathe, serving the Kansas City metro. Enter your town or ZIP code to explore the service area.</p><a className="dcp-text-link" href={href('service-area')}>See service area details <Arrow /></a></div><AreaChecker /></div></section>
  <section className="dcp-section dcp-wrap dcp-faq-section" aria-labelledby="faq-title"><h2 id="faq-title">A few good answers.</h2><div className="dcp-faqs"><Faq question="Can you help with a water heater today?">Deer Creek advertises same-day water heater service. Call {phone} so the office can confirm availability for your address and situation.</Faq><Faq question="Is the work covered by a warranty?">Deer Creek’s published policy includes a one year parts and labor warranty on services and honors manufacturer warranties. Ask the team about the terms for your work.</Faq><Faq question="Does this demo book a real visit?">No. The form lets you explore a service request, including a preferred day and communication needs. Nothing is sent and no appointment is reserved. Call or email the business for service.</Faq><Faq question="Can I choose how the team contacts me?">Yes. The demo includes email, phone and text preferences. Email requests do not require a phone number. Visit preferences are optional and should be discussed with the team.</Faq></div></section>
 </>
}
function Faq({question,children}:{question:string;children:ReactNode}) { return <details><summary>{question}<span aria-hidden="true">+</span></summary><p>{children}</p></details> }
function PageIntro({title,children}:{title:string;children:ReactNode}) {return <section className="dcp-page-intro dcp-wrap"><nav aria-label="Breadcrumb"><a href={href()}>Home</a><span aria-hidden="true"> / </span><span>{title}</span></nav><h1>{title}</h1><div className="dcp-intro-copy">{children}</div></section>}
function ServicePage({slug}:{slug:string}) {
 const service=services.find(s=>s.slug===slug)!
 return <><PageIntro title={service.name}><p>{service.intro}</p><LinkButton to={`schedule?service=${service.slug}`}>Request this service</LinkButton></PageIntro><section className="dcp-wrap dcp-service-detail dcp-section"><div><h2>Let’s find the right fix.</h2><p>{service.summary}</p><ul className="dcp-bullet-list">{service.points.map(p=><li key={p}>{p}</li>)}</ul><p>Serving Olathe and the Kansas City metro. The office confirms coverage, timing and the scope of work with you.</p><p><a href={tel}>Call {phone}</a> or <a href={`mailto:${mail}`}>email the team</a>.</p></div><img className="dcp-photo" src={service.image} alt={service.alt} width="800" height="535" loading="lazy" /></section><section className="dcp-section dcp-wrap dcp-faq-section"><h2>Good to know.</h2><div className="dcp-faqs">{service.faq.map(f=><Faq key={f.q} question={f.q}>{f.a}</Faq>)}</div></section><section className="dcp-wrap dcp-related"><h2>More ways we can help.</h2><div className="dcp-service-links">{services.filter(s=>s.slug!==slug).map(s=><a href={href(`services/${s.slug}`)} key={s.slug}>{s.name}<Arrow /></a>)}</div></section></>
}
function OtherPage({slug}:{slug:string}) {
 if(slug.startsWith('services/'))return <ServicePage slug={slug.split('/')[1]} />
 switch(slug) {
 case 'services': return <><PageIntro title="Plumbing services."><p>Repairs, replacements and new projects for homes and businesses in Olathe and the Kansas City metro.</p></PageIntro><section className="dcp-wrap dcp-service-directory" aria-label="Available services">{services.map(s=><article key={s.slug}><h2><a href={href(`services/${s.slug}`)}>{s.name}<Arrow /></a></h2><p>{s.summary}</p></article>)}</section><div className="dcp-wrap dcp-service-other"><h2>Have another project?</h2><p>Deer Creek also lists gas line inspections, toilets, radiant heat, boilers, remodels and new construction. Tell the team what you have in mind.</p><LinkButton>Ask about your project</LinkButton></div></>
 case 'service-area': return <><PageIntro title="Around the neighborhood."><p>Deer Creek is based at 19968 W 162nd St in Olathe and advertises service across the Kansas City metropolitan area.</p></PageIntro><section className="dcp-wrap dcp-section dcp-area-layout"><div><h2>Check your location.</h2><p>Olathe, Louisburg and Paola are named on the business’s current website. Other metro locations should be confirmed directly with the office.</p><p>This checker uses town and ZIP matches as a starting point. It does not verify an exact address or promise availability.</p><a className="dcp-text-link" href={google}>Open the business location in Google Maps <Arrow /></a></div><AreaChecker /></section><section className="dcp-wrap dcp-location-note"><h2>A person confirms the plan.</h2><p>Call <a href={tel}>{phone}</a> or email <a href={`mailto:${mail}`}>{mail}</a> with your location and the work you need. The office confirms coverage and availability for your address.</p></section></>
 case 'reviews': return <><PageIntro title="Good words. Real neighbors."><p>Google’s public profile shows 5.0 out of 5 from 286 reviews, verified November 10, 2026. Facebook shows two recommendations.</p><div className="dcp-inline-links"><a href={google}>Read all reviews on Google ↗</a><a href={facebook}>Read Facebook recommendations ↗</a></div></PageIntro><section className="dcp-wrap dcp-section"><h2>What customers noticed.</h2><p>These are short summaries of selected reviews. They are not direct quotes or a complete transcript. Names are shortened for this concept.</p><ReviewList /></section><section className="dcp-review-context"><div className="dcp-wrap dcp-two-column"><h2>The full picture.</h2><div><p>The Google profile includes 282 five-star, two four-star and two one-star reviews. All 286 public Google entries and both Facebook recommendations informed the research for this concept.</p><p>Recurring themes include fair pricing, punctuality, clear explanations and care in the home. The profile also includes feedback about missed follow-up. Visit Google to read the full range of experiences.</p><a href={google}>Read the full range of feedback on Google</a></div></div></section></>
 case 'about':return <><PageIntro title="Local people. Good work."><p>Deer Creek Plumbing is a family and locally owned business serving the Kansas City metro since 2017. Beau leads the business with a focus on helping neighbors keep their homes working.</p></PageIntro><section className="dcp-wrap dcp-section dcp-care"><Photo name="framing" alt="A Deer Creek plumber installing pipework inside a home under construction" /><div><h2>The details matter.</h2><p>The business’s published commitments include licensed and insured plumbers, shoe covers to protect floors, same-day estimates and a one year parts and labor warranty.</p><p>Customers frequently mention clear explanations, helpful advice and the care taken in their homes. This concept brings that same clarity to choosing a service and requesting a visit.</p><LinkButton>Tell us what you need</LinkButton></div></section></>
 case 'schedule':return <><PageIntro title="Let’s plan your visit."><p>Tell us what you need and how you prefer to be contacted. This is a demo: nothing is sent and no appointment is reserved.</p></PageIntro><section className="dcp-wrap dcp-booking-layout"><BookingForm /><aside><h2>Prefer to talk?</h2><p><a href={tel}>{phone}</a></p><p><a href={`mailto:${mail}`}>{mail}</a></p><p>Monday to Friday<br />8:00 a.m. to 4:30 p.m.</p><h3>Need urgent help?</h3><p>Call the business for availability. This demo form is not monitored.</p><h3>Make the visit easier.</h3><p>Share practical communication or arrival preferences. You do not need to disclose a diagnosis or medical information.</p></aside></section></>
 case 'accessibility':return <><PageIntro title="Built for more people."><p>Being able to find help should feel straightforward. Accessibility is part of this website’s design, content and forms.</p></PageIntro><section className="dcp-wrap dcp-section dcp-accessibility"><h2>Our accessibility target.</h2><p>This concept targets WCAG 2.2 level AA. It includes semantic headings, descriptive labels, keyboard access, visible focus, readable contrast and layouts that adapt to smaller screens and larger text.</p><h2>Read it your way.</h2><p>Use Reading options in the header to enlarge text or reduce motion. The site also respects your device’s reduced-motion setting. All content remains available without animation, and you can use your browser’s zoom controls.</p><h2>Choose how to connect.</h2><p>The request form supports email without a phone number. Optional notes let you ask about communication, mobility or sensory needs. The team must confirm practical arrangements for a real visit.</p><h2>Testing and limitations.</h2><p>Automated accessibility checks and keyboard testing help identify barriers, but they do not establish complete accessibility or legal compliance. Testing with VoiceOver or NVDA and with people with disabilities is still needed before the final client launch. External Google and Facebook pages follow their own accessibility practices.</p><h2>Tell us what gets in the way.</h2><p>For a problem with this demo, email <a href="mailto:matthew@wallaceshift.com">matthew@wallaceshift.com</a>. For plumbing help, contact Deer Creek at <a href={tel}>{phone}</a> or <a href={`mailto:${mail}`}>{mail}</a>.</p></section></>
 default:return null
 }
}
export default function App({slug=''}:{slug?:string}) {
 // Keep every document independent and readable before React hydrates.
 const known=pages.some(p=>p.slug===slug)
 return <div className="dcp-site"><Header slug={slug}/><main id="main" tabIndex={-1}>{!known?<PageIntro title="Page not found."><a href={href()}>Return home</a></PageIntro>:slug===''?<Home/>:<OtherPage slug={slug}/>}</main><Footer/></div>
}
