import { useEffect, useRef, useState, type FormEvent } from 'react'
import RoofVisualizer, { type RoofSelection } from './RoofVisualizer'
import Investment from './Investment'
import OwnerPortal from './OwnerPortal'

const collection = [
  { name: 'Natural slate', tag: 'Quarried. Individual. Enduring.', image: 'material-slate.jpg', text: 'Stone with depth, variation and a quiet sense of permanence. Pair the roof with considered copper details and an engineered structural review.' },
  { name: 'Standing-seam metal', tag: 'Precise lines. A modern expression.', image: 'material-metal.jpg', text: 'A clean architectural rhythm for contemporary homes. Finish, seam profile, thermal movement and detailing are specified as one complete system.' },
  { name: 'Cedar shake', tag: 'Warmth that evolves with the home.', image: 'material-cedar.jpg', text: 'Natural texture and an organic palette, selected with the local climate, maintenance plan and applicable fire requirements in mind.' },
  { name: 'Clay tile', tag: 'Sculptural form. Timeless character.', image: 'material-clay.jpg', text: 'Rich earth tones and unmistakable dimension. The tile profile, roof pitch and supporting structure work together to create the right silhouette.' },
]

function Mark() {
  return <a className="va-wordmark" href="#top" aria-label="Velar Roof Atelier home"><span className="va-mark" aria-hidden="true">V</span><span><strong>VELAR</strong><small>ROOF ATELIER</small></span></a>
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
    <div className="va-hero-top"><span>Exceptional homes. Considered roofs.</span><span className="va-hero-edition">THE ATELIER / 01</span></div>
    <div className="va-hero-copy"><p className="va-eyebrow">The architecture of lasting beauty</p><h1 id="va-hero-title">A roof worthy of<br />everything <em>beneath it.</em></h1><div className="va-hero-bottom"><p>Architectural roofing, thoughtfully specified.<br />A personal experience, from first sketch to final detail.</p><a className="va-button va-button-cream" href="#roof-studio">Envision your home <span aria-hidden="true">↗</span></a></div></div>
    <div className="va-film-bar"><div className="va-scene-dots" aria-label={`Film scene ${scene + 1} of 3`}>{['The country estate', 'The coastal residence', 'The courtyard villa'].map((label, index) => <span className={index === scene ? 'active' : ''} key={label}><i />{index === scene && label}</span>)}</div><div><span>AI concept film</span>{!failed && <button type="button" onClick={toggle} aria-label={playing ? 'Pause hero film' : 'Play hero film'}>{playing ? 'Ⅱ' : '▷'} <span>{playing ? 'Pause' : 'Play'}</span></button>}</div></div>
  </section>
}

function Materials() {
  const [selected, setSelected] = useState(0)
  const material = collection[selected]
  return <section className="va-materials va-wrap" id="materials" aria-labelledby="va-material-title">
    <div className="va-section-heading va-reveal"><div><p className="va-eyebrow">02 / The material library</p><h2 id="va-material-title">Character, in<br /><em>every course.</em></h2></div><p>A beautiful roof begins with the right conversation between the material, the architecture and the place you call home.</p></div>
    <div className="va-material-layout va-reveal"><div className="va-material-image"><img key={material.image} src={`/demos/roofers-4/${material.image}`} alt={`${material.name} roof detail on a luxury home — concept imagery`} loading="lazy" /><span className="va-image-caption">MATERIAL STUDY / {String(selected + 1).padStart(2, '0')}</span></div><div className="va-material-menu"><div role="tablist" aria-orientation="vertical" aria-label="Explore architectural materials">{collection.map((item, index) => <button key={item.name} role="tab" id={`va-material-tab-${index}`} aria-controls="va-material-panel" aria-selected={selected === index} tabIndex={selected === index ? 0 : -1} onClick={() => setSelected(index)} onKeyDown={event => { if (['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft', 'Home', 'End'].includes(event.key)) { event.preventDefault(); const next = event.key === 'Home' ? 0 : event.key === 'End' ? 3 : (index + (event.key === 'ArrowDown' || event.key === 'ArrowRight' ? 1 : 3)) % 4; setSelected(next); document.getElementById(`va-material-tab-${next}`)?.focus() } }}><span><small>0{index + 1}</small>{item.name}</span><span aria-hidden="true">↗</span></button>)}</div><div id="va-material-panel" role="tabpanel" aria-labelledby={`va-material-tab-${selected}`}><p className="va-material-tag">{material.tag}</p><p>{material.text}</p><a className="va-text-link" href="#roof-studio">Open roof studio <span aria-hidden="true">→</span></a></div></div></div>
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
  return <section className="va-consultation" id="consultation" aria-labelledby="va-consultation-title"><div className="va-wrap va-consultation-grid"><div className="va-reveal"><p className="va-eyebrow">A personal introduction</p><h2 id="va-consultation-title">Let’s consider<br /><em>what comes next.</em></h2><p>Whether you are shaping a new home or reimagining the one you love, begin with a considered plan.</p><div className="va-consultation-promise"><span aria-hidden="true">✧</span><p>A dedicated point of contact.<br />A clear scope. A thoughtful next step.</p></div></div><div className="va-reveal">{brief ? <div className="va-brief" ref={result} tabIndex={-1}><p className="va-eyebrow">Your project brief</p><h3>A good place to begin.</h3><p>This demo prepared your brief locally. No request has been sent or appointment booked.</p><pre>{brief}</pre><button className="va-button" type="button" onClick={downloadBrief}>Save project brief <span aria-hidden="true">↓</span></button><button className="va-text-link" type="button" onClick={() => { setBrief(''); requestAnimationFrame(() => firstField.current?.focus()) }}>Edit your details</button></div> : null}<form hidden={!!brief} onSubmit={prepare}><div className="va-form-row"><label>Your name<input ref={firstField} name="name" autoComplete="name" required placeholder="First and last name" maxLength={120} /></label><label>Email address<input name="email" type="email" autoComplete="email" required placeholder="you@example.com" maxLength={200} /></label></div><div className="va-form-row"><label>Your project<select name="project"><option>A roof replacement</option><option>A new custom home</option><option>Roof stewardship or repairs</option><option>Exploring the possibilities</option></select></label><label>City / region<input name="location" required placeholder="Where you call home" maxLength={200} /></label></div><label>Tell us what you have in mind<textarea name="notes" rows={3} placeholder="Your architecture, your priorities, your timeline…" maxLength={3000} /></label>{selection && <p className="va-form-selection">Your roof studio selection: {selection.materialName} / {selection.finish}</p>}<button className="va-button va-button-cream" type="submit">Prepare my project brief <span aria-hidden="true">↗</span></button><p className="va-form-note">Demo only. Your details stay in this browser; this form creates an unsent preview.</p></form></div></div></section>
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
  return <div className="va-site" id="top"><a className="va-skip" href="#main">Skip to content</a><header className="va-header"><Mark /><button className="va-mobile-menu" type="button" aria-expanded={menuOpen} aria-controls="va-nav" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? 'Close' : 'Menu'} <span aria-hidden="true">{menuOpen ? '×' : '+'}</span></button><nav id="va-nav" className={menuOpen ? 'open' : ''} aria-label="Main navigation" onClick={() => setMenuOpen(false)}><a href="#roof-studio">Roof studio</a><a href="#materials">Materials</a><a href="#investment">The investment</a><a href="#owner-portal">Owner experience</a><a className="va-mobile-cta" href="#consultation">Begin a conversation ↗</a></nav><a className="va-nav-cta" href="#consultation">Begin a conversation <span aria-hidden="true">↗</span></a></header><main id="main"><Hero /><section className="va-studio va-wrap" id="roof-studio" aria-labelledby="va-studio-title"><div className="va-section-heading va-reveal"><div><p className="va-eyebrow">01 / Your personal roof studio</p><h2 id="va-studio-title">See the possibilities.<br /><em>Keep the perspective.</em></h2></div><p>Your home, your proportions, a new material palette. Explore finishes on your own photograph and shape an initial project budget.</p></div><RoofVisualizer onSelection={setSelection} /></section><div className="va-manifesto"><div className="va-wrap va-reveal"><p className="va-eyebrow">Considered above. Beautiful below.</p><p className="va-manifesto-statement">The roof is the final line of your architecture.<br />Give it the same care as <em>everything within.</em></p><div className="va-values"><span>Architectural integrity</span><i aria-hidden="true">✧</i><span>Complete system performance</span><i aria-hidden="true">✧</i><span>Personal stewardship</span></div></div></div><Materials /><Investment /><section className="va-service va-wrap" id="experience" aria-labelledby="va-service-title"><div className="va-section-heading va-reveal"><div><p className="va-eyebrow">04 / The white-glove approach</p><h2 id="va-service-title">An exceptional roof.<br /><em>An effortless experience.</em></h2></div><p>A single project lead coordinates the people, the details and the decisions. You see what matters, while we take care of what comes next.</p></div><div className="va-service-grid va-reveal">{[{title:'Listen & survey',text:'An on-site assessment, your architectural intentions and a measured understanding of the existing roof.'},{title:'Specify with care',text:'Material samples, structural considerations and a detailed scope covering the whole roofing system.'},{title:'Deliver with discretion',text:'A planned schedule, protected grounds, coordinated trades and a documented daily site update.'},{title:'Steward for the future',text:'A final walkthrough, product and workmanship terms, care guidance and a complete project record.'}].map((step,index) => <article key={step.title}><span className="va-step">0{index + 1}</span><h3>{step.title}</h3><p>{step.text}</p></article>)}</div></section><OwnerPortal /><section className="va-questions va-wrap" aria-labelledby="va-questions-title"><div className="va-reveal"><p className="va-eyebrow">A few thoughtful answers</p><h2 id="va-questions-title">Clarity, from<br /><em>the beginning.</em></h2></div><div className="va-question-list va-reveal">{[{q:'Can a heavier material work on my home?',a:'Slate and clay may require a structural review. The existing framing, material weight, roof pitch and local building requirements all shape the specification. A photograph alone cannot establish suitability.'},{q:'What does a complete roofing system include?',a:'The visible finish is one part. Deck condition, underlayment, ventilation, drainage, flashing and fasteners are specified together. Your proposal should make the included work and assumptions clear.'},{q:'Can you coordinate with my architect or builder?',a:'The demo service is designed around one project lead, with agreed decision points for your architect, builder and household. A real contractor would confirm the team, schedule and responsibilities in your written scope.'},{q:'How do insurance, financing and warranties fit in?',a:'For an eligible insurance claim, document the roof condition and confirm coverage directly with your insurer. Financing, if offered, should come with written lender terms. Product and workmanship warranties are separate; ask for the coverage, exclusions and maintenance requirements before committing.'}].map(item => <details key={item.q}><summary>{item.q}<span aria-hidden="true">+</span></summary><p>{item.a}</p></details>)}</div></section><Consultation selection={selection} /></main><footer className="va-footer va-wrap"><div><Mark /><p>The architecture of lasting beauty.</p></div><a href="/demos/roofers-offer/">Explore the Wallace Shift collection <span aria-hidden="true">↗</span></a><p className="va-demo-disclosure">Velar Roof Atelier is a fictional contractor concept by Wallace Shift. Imagery is AI-generated concept art; pricing and portal records are illustrative. No contractor service, valuation, warranty or booking is provided by this demo.</p><div className="va-footer-bottom"><span>WALLACE SHIFT / CONCEPT 05</span><a href="#top">Back to the roofline ↑</a></div></footer></div>
}
