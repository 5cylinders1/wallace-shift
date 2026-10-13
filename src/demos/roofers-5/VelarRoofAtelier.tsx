import { useEffect, useRef, useState, type FormEvent } from 'react'
import RoofVisualizer, { type RoofSelection } from './RoofVisualizer'
import Investment from './Investment'
import OwnerPortal from './OwnerPortal'

const collection = [
  { name: 'Slate', code: '01', image: 'material-slate.jpg', note: 'Mineral depth. Tailored copper details.', text: 'A restrained stone finish for a home with presence. Structural capacity, slate selection and each junction deserve an individual specification.' },
  { name: 'Metal', code: '02', image: 'material-metal.jpg', note: 'A crisp line across the landscape.', text: 'Standing seams give contemporary architecture a deliberate rhythm. Profile, finish, thermal movement and coastal exposure inform the choice.' },
  { name: 'Cedar', code: '03', image: 'material-cedar.jpg', note: 'Natural texture, shaped by time.', text: 'A tactile finish for timber, stone and a wooded setting. Consider the local fire requirements and a realistic care programme before specifying.' },
  { name: 'Clay', code: '04', image: 'material-clay.jpg', note: 'A warmer expression of the roofline.', text: 'Dimensional tile brings a different character to the same home. Pitch, weight, drainage and the right accessory details are part of the design.' },
]

function Mark() {
  return <a className="va-wordmark" href="#top" aria-label="Velar home">
    <svg viewBox="0 0 34 28" aria-hidden="true"><path d="M2 3h7l8 19L25 3h7L17 28Z" fill="currentColor" /><path d="M11 3 17 0l6 3" fill="none" stroke="currentColor" /></svg>
    <span>VELAR<small>PRIVATE ROOF COMMISSIONS</small></span>
  </a>
}

function Hero() {
  const video = useRef<HTMLVideoElement>(null)
  const manuallyPaused = useRef(false)
  const [filmSource] = useState(() => window.matchMedia('(max-width: 720px)').matches ? '/demos/roofers-5/estate-film-mobile.mp4?v=velar-v1' : '/demos/roofers-5/estate-film.mp4?v=velar-v1')
  const [playing, setPlaying] = useState(false)
  const [failed, setFailed] = useState(false)
  const [scene, setScene] = useState(0)
  const [motionAllowed, setMotionAllowed] = useState(false)
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => { setMotionAllowed(!preference.matches); if (preference.matches) video.current?.pause() }
    update()
    preference.addEventListener('change', update)
    return () => preference.removeEventListener('change', update)
  }, [])
  useEffect(() => {
    const node = video.current
    if (!node || !motionAllowed) return
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !manuallyPaused.current) void node.play().catch(() => setPlaying(false))
      else node.pause()
    }, { threshold: 0.15 })
    observer.observe(node)
    return () => observer.disconnect()
  }, [motionAllowed])
  function toggle() {
    const node = video.current
    if (!node) return
    if (node.paused) { manuallyPaused.current = false; void node.play().catch(() => setFailed(true)) }
    else { manuallyPaused.current = true; node.pause() }
  }
  return <section className="va-hero" aria-labelledby="va-hero-title">
    <img className="va-hero-poster" src="/demos/roofers-5/hero-poster.jpg" alt="Luxury estate with carefully detailed architectural roofing" fetchPriority="high" />
    {!failed && <video ref={video} className="va-hero-film" src={filmSource} muted playsInline loop preload={motionAllowed ? 'metadata' : 'none'} poster="/demos/roofers-5/hero-poster.jpg" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onError={() => { setFailed(true); setPlaying(false) }} onTimeUpdate={event => { const node = event.currentTarget; setScene(Math.min(2, Math.floor((node.currentTime / (node.duration || 15)) * 3))) }} />}
    <div className="va-hero-shade" />
    <div className="va-hero-top"><span>A higher standard of home.</span><span className="va-hero-edition">ARCHITECTURE / MATERIAL / CARE</span></div>
    <div className="va-hero-copy"><p className="va-eyebrow">Made for a remarkable home</p><h1 id="va-hero-title">The roof.<br /><em>Reconsidered.</em></h1><div className="va-hero-bottom"><p>A considered transformation. A complete roofing system.<br />Every decision shaped around your home.</p><a className="va-button va-button-cream" href="#roof-studio">Explore your roof <span aria-hidden="true">↗</span></a></div></div>
    <div className="va-film-bar"><div className="va-scene-dots" aria-label={`Film scene ${scene + 1} of 3`}>{['The country estate', 'The coastal residence', 'The courtyard villa'].map((label, index) => <span className={index === scene ? 'active' : ''} key={label}><i />{index === scene && label}</span>)}</div><div><span>VELAR FILM / AI CONCEPT</span>{!failed && <button type="button" onClick={toggle} aria-label={playing ? 'Pause hero film' : 'Play hero film'}>{playing ? 'Ⅱ' : '▷'} <span>{playing ? 'Pause' : 'Play'}</span></button>}</div></div>
  </section>
}

function Materials() {
  return <section className="va-materials va-wrap" id="materials" aria-labelledby="va-material-title">
    <div className="va-section-heading va-reveal">
      <div><p className="va-eyebrow">The finish changes everything</p><h2 id="va-material-title">One residence.<br /><em>Four possibilities.</em></h2></div>
      <p>Our exclusive Cedar Cove concept explores how a material changes the silhouette, light and personality of a home. Start with what belongs to your architecture.</p>
    </div>
    <div className="va-material-grid va-reveal">
      {collection.map(material => <article key={material.name}>
        <div className="va-material-image"><img src={`/demos/roofers-5/${material.image}`} alt={`${material.name} roof concept for the exclusive Cedar Cove residence`} loading="lazy" /><span>{material.code} / {material.name.toUpperCase()}</span></div>
        <div className="va-material-body"><h3>{material.name}</h3><p className="va-material-note">{material.note}</p><p>{material.text}</p></div>
      </article>)}
    </div>
    <a className="va-text-link" href="#roof-studio">Find your own direction <span aria-hidden="true">↗</span></a>
  </section>
}

function Consultation({ selection }: { selection: RoofSelection | null }) {
  const [brief, setBrief] = useState('')
  const result = useRef<HTMLDivElement>(null)
  const firstField = useRef<HTMLInputElement>(null)
  useEffect(() => { if (brief) result.current?.focus() }, [brief])
  function prepare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    setBrief(['VELAR ROOF ATELIER — PRIVATE PROJECT BRIEF', 'Demo preview • not submitted', '', `Name: ${data.get('name')}`, `Email: ${data.get('email')}`, `Project: ${data.get('project')}`, `Location: ${data.get('location')}`, selection ? `Roof studio: ${selection.materialName} / ${selection.finish}; ${selection.area.toLocaleString()} sq ft; illustrative range $${selection.low.toLocaleString()}–$${selection.high.toLocaleString()}` : 'Roof studio: Selection to be discussed', '', String(data.get('notes') || 'Details to be discussed during the design consultation.')].join('\n'))
  }
  function downloadBrief() {
    const url = URL.createObjectURL(new Blob([brief], { type: 'text/plain' }))
    const link = document.createElement('a'); link.href = url; link.download = 'velar-project-brief.txt'; link.click(); URL.revokeObjectURL(url)
  }
  return <section className="va-consultation" id="consultation" aria-labelledby="va-consultation-title"><div className="va-wrap va-consultation-grid"><div className="va-reveal"><p className="va-eyebrow">Commission something considered</p><h2 id="va-consultation-title">Your home.<br /><em>Your next chapter.</em></h2><p>Tell us what your home needs and what matters to you. We’ll turn the first conversation into a clear design and delivery brief.</p><div className="va-consultation-promise"><span aria-hidden="true">✧</span><p>One lead from start to finish.<br />Decisions documented. Details looked after.</p></div></div><div className="va-reveal">{brief ? <div className="va-brief" ref={result} tabIndex={-1}><p className="va-eyebrow">Your project brief</p><h3>Your commission, outlined.</h3><p>This demo prepared your brief locally. No request has been sent or appointment booked.</p><pre>{brief}</pre><button className="va-button" type="button" onClick={downloadBrief}>Save project brief <span aria-hidden="true">↓</span></button><button className="va-text-link" type="button" onClick={() => { setBrief(''); requestAnimationFrame(() => firstField.current?.focus()) }}>Edit your details</button></div> : null}<form hidden={!!brief} onSubmit={prepare}><div className="va-form-row"><label>Your name<input ref={firstField} name="name" autoComplete="name" required placeholder="First and last name" maxLength={120} /></label><label>Email address<input name="email" type="email" autoComplete="email" required placeholder="you@example.com" maxLength={200} /></label></div><div className="va-form-row"><label>Your project<select name="project"><option>A roof replacement</option><option>A new custom home</option><option>Roof stewardship or repairs</option><option>Exploring the possibilities</option></select></label><label>City / region<input name="location" required placeholder="Where you call home" maxLength={200} /></label></div><label>Tell us what you have in mind<textarea name="notes" rows={3} placeholder="Your architecture, your priorities, your timeline…" maxLength={3000} /></label>{selection && <p className="va-form-selection">Your roof studio selection: {selection.materialName} / {selection.finish}</p>}<button className="va-button va-button-cream" type="submit">Prepare my project brief <span aria-hidden="true">↗</span></button><p className="va-form-note">Demo only. Your details stay in this browser; this form creates an unsent preview.</p></form></div></div></section>
}

export default function VelarRoofAtelier() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [selection, setSelection] = useState<RoofSelection | null>(null)
  useEffect(() => {
    const nodes = document.querySelectorAll('.va-reveal')
    const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('va-visible'); observer.unobserve(entry.target) } }), { threshold: 0.08 })
    nodes.forEach(node => observer.observe(node))
    return () => observer.disconnect()
  }, [])
  return <div className="va-site" id="top">
    <a className="va-skip" href="#main">Skip to content</a>
    <header className="va-header">
      <Mark />
      <button className="va-mobile-menu" type="button" aria-expanded={menuOpen} aria-controls="va-nav" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? 'Close' : 'Menu'} <span aria-hidden="true">{menuOpen ? '×' : '+'}</span></button>
      <nav id="va-nav" className={menuOpen ? 'open' : ''} aria-label="Main navigation" onClick={() => setMenuOpen(false)}><a href="#roof-studio">Design preview</a><a href="#materials">The finishes</a><a href="#investment">Long-term value</a><a href="#owner-portal">Your project room</a><a className="va-mobile-cta" href="#consultation">Start your commission ↗</a></nav>
      <a className="va-nav-cta" href="#consultation">Start your commission <span aria-hidden="true">↗</span></a>
    </header>
    <main id="main">
      <Hero />
      <section className="va-studio va-wrap" id="roof-studio" aria-labelledby="va-studio-title">
        <div className="va-section-heading va-reveal"><div><p className="va-eyebrow">A new view, in a few steps</p><h2 id="va-studio-title">Change the roof.<br /><em>See your home anew.</em></h2></div><p>Bring a photograph. Choose a finish. See a realistic AI design study, with the roof’s form and perspective considered for you.</p></div>
        <RoofVisualizer onSelection={setSelection} />
      </section>
      <section className="va-principles" aria-label="The Velar approach"><div className="va-wrap"><p className="va-eyebrow">Beyond the surface</p><div className="va-principle-grid"><article><span>01 / EXPRESSION</span><h3>A roof that belongs.</h3><p>Shape, profile and colour are architectural decisions. We specify the roof in conversation with the rest of your home.</p></article><article><span>02 / PROTECTION</span><h3>Performance, assembled.</h3><p>Decking, underlayment, flashing, ventilation and drainage work as one system. The finish is only the visible beginning.</p></article><article><span>03 / STEWARDSHIP</span><h3>Care that continues.</h3><p>A complete record and an agreed maintenance approach support the years after installation, as well as the day of handover.</p></article></div></div></section>
      <Materials />
      <Investment />
      <section className="va-service va-wrap" id="experience" aria-labelledby="va-service-title"><div className="va-section-heading va-reveal"><div><p className="va-eyebrow">A private commission</p><h2 id="va-service-title">Complex work.<br /><em>Quietly managed.</em></h2></div><p>Your project lead brings the architect, the roofing team and your household into one considered plan. Fewer loose ends. A clear view of the work.</p></div><div className="va-service-grid va-reveal">{[
        {title:'Understand the home',text:'A measured survey, the condition of the existing assembly and the ambitions you have for the property.'},
        {title:'Resolve the specification',text:'Physical samples, engineering where required, precise details and a written scope for the complete installation.'},
        {title:'Coordinate the commission',text:'An agreed programme, protected landscaping, planned access and concise updates from your dedicated lead.'},
        {title:'Document the handover',text:'An inspection walkthrough, approved product and workmanship terms, and a property-specific care record.'},
      ].map((step,index) => <article key={step.title}><span className="va-step">0{index + 1}</span><h3>{step.title}</h3><p>{step.text}</p></article>)}</div></section>
      <OwnerPortal />
      <section className="va-questions va-wrap" aria-labelledby="va-questions-title"><div className="va-reveal"><p className="va-eyebrow">Before the first specification</p><h2 id="va-questions-title">Good decisions<br /><em>start here.</em></h2></div><div className="va-question-list va-reveal">{[
        {q:'Can I specify any material for my roof?',a:'The roof’s structure, pitch and local requirements guide the selection. Slate and clay may call for engineering before a finish is approved. An AI study explores appearance; it does not establish suitability.'},
        {q:'How does the roof affect the whole home?',a:'The assembly manages water, airflow and heat as well as the exterior silhouette. Deck condition, flashings, underlayment and ventilation should be resolved together, with a proposal that makes the included work clear.'},
        {q:'What will I see during the commission?',a:'The project-room concept brings the agreed programme, site photography, decision records and handover documents into one place. The interactive room below uses fictional records to demonstrate that experience.'},
        {q:'How should I approach warranties, funding or a claim?',a:'Request the product and workmanship coverage in writing, including exclusions and care requirements. Review any financing with the lender. For an insurance claim, document the roof condition and establish coverage directly with the insurer before planning the work.'},
      ].map(item => <details key={item.q}><summary>{item.q}<span aria-hidden="true">+</span></summary><p>{item.a}</p></details>)}</div></section>
      <Consultation selection={selection} />
    </main>
    <footer className="va-footer va-wrap"><div><Mark /><p>Roofs for remarkable homes.</p></div><a href="/demos/roofers-offer/">The Wallace Shift collection <span aria-hidden="true">↗</span></a><p className="va-demo-disclosure">Velar is a fictional roofing brand by Wallace Shift. Its concept imagery is created exclusively for this demo. AI roof studies are visual design concepts, not product specifications. Prices and project records are illustrative; consultation requests are not sent.</p><div className="va-footer-bottom"><span>VELAR / INDEPENDENT CONCEPT 05</span><a href="#top">Return to the roofline ↑</a></div></footer>
  </div>
}
