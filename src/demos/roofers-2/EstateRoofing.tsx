import { useEffect, useState } from 'react'
import FilmHero from './FilmHero'
import GuidePage from './Guides'
import ProjectForm from './ProjectForm'

const base = '/demos/roofers-2/'
const pages = [{ id: 'process', label: 'The process' }, { id: 'insurance', label: 'Insurance' }, { id: 'cost', label: 'Cost & financing' }]

function viewedGuides(): string[] {
  try {
    const saved: unknown = JSON.parse(sessionStorage.getItem('estate-demo-viewed-guides') ?? '[]')
    return Array.isArray(saved) ? saved.filter((id): id is string => typeof id === 'string' && pages.some(page => page.id === id)) : []
  } catch { return [] }
}

function Brand() {
  return <a className="er-brand" href={base} aria-label="Alder and Stone Roofing home"><svg viewBox="0 0 44 42" fill="none" aria-hidden="true"><path d="M3 33 22 7l19 26M10 33 22 17l12 16M18 33h8" stroke="currentColor" strokeWidth="1.4" /><path d="M3 38h38" stroke="currentColor" /></svg><span>ALDER <i>&</i> STONE<small>ROOFING & EXTERIORS</small></span></a>
}

function Home() {
  const [audience, setAudience] = useState<'home' | 'business'>('home')
  return <main id="main"><FilmHero /><section className="er-essentials er-wrap" id="essentials">
    <div className="er-section-heading"><p className="er-eyebrow">LESS UNCERTAINTY. MORE CONFIDENCE.</p><h2>Good decisions start<br />with <em>clear answers.</em></h2><p>A roof is a significant investment. Before the inspection, get a clear view of your options and the questions worth asking.</p></div>
    <div className="er-guide-list">
      <a href={`${base}process/`}><span className="er-guide-num">01</span><div><span className="er-eyebrow">THE WORK</span><h3>What happens to my home?</h3><p>From protection and tear-off to cleanup. Know what to expect, how to plan, and what a warranty really covers.</p></div><span className="er-round-arrow" aria-hidden="true">↗</span></a>
      <a href={`${base}insurance/`}><span className="er-guide-num">02</span><div><span className="er-eyebrow">THE CLAIM</span><h3>Could insurance help?</h3><p>Understand storm damage, deductibles, depreciation, and the steps between filing a claim and getting paid.</p></div><span className="er-round-arrow" aria-hidden="true">↗</span></a>
      <a href={`${base}cost/`}><span className="er-guide-num">03</span><div><span className="er-eyebrow">THE INVESTMENT</span><h3>What will I need to budget?</h3><p>See what shapes your estimate, compare payment options, and explore a monthly payment example.</p></div><span className="er-round-arrow" aria-hidden="true">↗</span></a>
    </div>
  </section>
  <section className="er-property-section"><div className="er-property-image"><img src="/demos/roofers-2/house-poster.webp" alt="Stone home and detailed roof in a landscaped setting" loading="lazy" width="1920" height="1080" /><span>EVERY PROPERTY HAS A DIFFERENT STORY.</span></div><div className="er-property-content"><p className="er-eyebrow">A PLAN THAT FITS YOUR PROPERTY</p><div className="er-audience-toggle" aria-label="Property guidance"><button type="button" aria-pressed={audience === 'home'} onClick={() => setAudience('home')}>For your home</button><button type="button" aria-pressed={audience === 'business'} onClick={() => setAudience('business')}>For your business</button></div><h2>{audience === 'home' ? <>Your home.<br />Your <em>peace of mind.</em></> : <>Your building.<br />Your <em>business continuity.</em></>}</h2><p>{audience === 'home' ? 'A leak, a recent storm, or a roof showing its age. Start with the condition of your roof and a practical plan for protecting the life beneath it.' : 'Flat roofs, occupied buildings, tenant access, and operating hours require a different conversation. Share how your building works so the inspection addresses it.'}</p><ul>{(audience === 'home' ? ['Repair or replacement, based on condition', 'A written scope before you commit', 'Property protection and a cleanup plan'] : ['Building use, ownership and access', 'Drainage, penetrations and roof-system needs', 'A schedule around your operations']).map(s => <li key={s}><span aria-hidden="true">✓</span>{s}</li>)}</ul><a href={`${base}estimate/`} className="er-text-link">Tell us about your property <span aria-hidden="true">↗</span></a></div></section>
  <section className="er-next er-wrap"><div><p className="er-eyebrow">THE NEXT STEP IS A CONVERSATION.</p><h2>A little information.<br /><em>A more useful inspection.</em></h2></div><div><p>Tell us what you’re seeing, when you’d like to act, and how you’re thinking about payment. Your project brief puts the right details in the right hands.</p><a className="er-button er-button-dark" href={`${base}estimate/`}>Build my project brief <span aria-hidden="true">↗</span></a><small>About 3 minutes · No estimate without an inspection</small></div></section>
  </main>
}

export default function EstateRoofing() {
  const [menu, setMenu] = useState(false)
  const path = window.location.pathname.replace(/\/$/, '')
  const selected = path.split('/').pop()
  const page = selected === 'process' || selected === 'insurance' || selected === 'cost' || selected === 'estimate' ? selected : 'home'
  useEffect(() => {
    if (pages.some(guide => guide.id === page)) {
      try { sessionStorage.setItem('estate-demo-viewed-guides', JSON.stringify([...new Set([...viewedGuides(), page])])) } catch { /* Private browsing may disable storage. */ }
    }
  }, [page])
  return <div className="er-site"><a className="er-skip" href="#main">Skip to content</a><header className="er-header"><Brand /><nav className={menu ? 'is-open' : ''} aria-label="Primary">{pages.map(p => <a key={p.id} href={`${base}${p.id}/`} aria-current={page === p.id ? 'page' : undefined}>{p.label}</a>)}<a href={`${base}estimate/`} className="er-nav-cta" aria-current={page === 'estimate' ? 'page' : undefined}>Start your project <span aria-hidden="true">↗</span></a></nav><button className="er-menu" type="button" aria-expanded={menu} aria-label={menu ? 'Close navigation' : 'Open navigation'} onClick={() => setMenu(!menu)}>{menu ? 'Close −' : 'Menu +'}</button></header>
    {page === 'home' ? <Home /> : page === 'estimate' ? <main id="main" className="er-estimate-page er-wrap"><div className="er-estimate-intro"><a href={base} className="er-back">← Back to the overview</a><p className="er-eyebrow">LET’S START WITH YOUR PROPERTY</p><h1>A better brief.<br /><em>A better first conversation.</em></h1><p>Share the details you know. “Not sure” is always a useful answer; the inspection fills in the gaps.</p></div><ProjectForm educationContext={viewedGuides()} /></main> : <main id="main"><GuidePage page={page} /></main>}
    <footer className="er-footer"><div className="er-wrap er-footer-main"><Brand /><p>Protecting the place<br />you build your life around.</p><a href={`${base}estimate/`}>Let’s talk about your roof <span aria-hidden="true">↗</span></a></div><div className="er-wrap er-footer-base"><span>ALDER & STONE IS A FICTIONAL DEMO BRAND.</span><span>Concept 02 · Crafted by <a href="/">Wallace Shift</a></span><span>No services or financing are offered through this demo.</span></div></footer>
  </div>
}
