import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { accessHref, categories, nextTrades, previewDuration, trades, type TradeDemo } from './catalog'
import DemoPreview from './DemoPreview'

const STUDIO = 'https://www.wallaceshift.com'

function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return <span aria-hidden="true">{diagonal ? '↗' : '→'}</span>
}

function Wordmark() {
  return <a className="ct-wordmark" href={`${STUDIO}/`} aria-label="Wallace Shift home">
    <img src="/brand/wallace-shift-logo-white.svg" alt="" width="28" height="17" />
    <span>WALLACE SHIFT</span>
  </a>
}

function DemoCard({ demo, onWatch }: { demo: TradeDemo; onWatch: (demo: TradeDemo) => void }) {
  return <article className="ct-demo">
    <button type="button" className="ct-demo-image" onClick={() => onWatch(demo)} aria-label={`Watch ${demo.name} demo, ${previewDuration(demo.durationSeconds)}`}>
      <img src={demo.thumbnail} alt={demo.thumbnailAlt} width="1600" height="900" loading="lazy" />
      <span className="ct-play" aria-hidden="true">▶</span>
      <span className="ct-video-duration">{previewDuration(demo.durationSeconds)}</span>
    </button>
    <div className="ct-demo-body">
      <p className="ct-demo-trade">{demo.trade}</p>
      <h3>{demo.name}</h3>
      <p className="ct-demo-summary">{demo.summary}</p>
      <ul className="ct-features">{demo.features.map(feature => <li key={feature}>{feature}</li>)}</ul>
      <div className="ct-demo-actions">
        <button type="button" className="ct-link-strong" onClick={() => onWatch(demo)}>Watch demo <span aria-hidden="true">▶</span></button>
        <a className="ct-link" href={accessHref(demo)}>Request interactive access <Arrow diagonal /></a>
      </div>
    </div>
  </article>
}

function CategoryRow({ category, demos, onWatch }: { category: typeof categories[number]; demos: TradeDemo[]; onWatch: (demo: TradeDemo) => void }) {
  const sliderRef = useRef<HTMLUListElement>(null)
  const [position, setPosition] = useState({ first: 0, atEnd: false })
  const multiple = demos.length > 1
  const updatePosition = useCallback(() => {
    const slider = sliderRef.current
    if (!slider) return
    const cards = Array.from(slider.children)
    const left = slider.getBoundingClientRect().left
    const first = cards.findIndex(card => card.getBoundingClientRect().right > left + 8)
    setPosition(previous => {
      const next = { first: Math.max(0, first), atEnd: slider.scrollLeft + slider.clientWidth >= slider.scrollWidth - 3 }
      return previous.first === next.first && previous.atEnd === next.atEnd ? previous : next
    })
  }, [])
  useEffect(() => {
    const slider = sliderRef.current
    if (!slider) return
    const observer = new ResizeObserver(updatePosition)
    observer.observe(slider)
    return () => observer.disconnect()
  }, [updatePosition])
  function move(direction: number) {
    const slider = sliderRef.current
    if (!slider) return
    const card = slider.children[0] as HTMLElement | undefined
    const gap = Number.parseFloat(getComputedStyle(slider).columnGap) || 0
    slider.scrollBy({ left: direction * ((card?.offsetWidth ?? slider.clientWidth) + gap), behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
  }
  function onKeyDown(event: KeyboardEvent<HTMLUListElement>) {
    if (event.target !== event.currentTarget || !multiple) return
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault()
      move(event.key === 'ArrowRight' ? 1 : -1)
    }
  }
  return <section id={`category-${category.id}`} className="ct-category" aria-labelledby={`category-${category.id}-title`}>
    <div className="ct-category-head">
      <div><p className="ct-category-count">{String(demos.length).padStart(2, '0')} {demos.length === 1 ? 'demo' : 'demos'}</p><h3 id={`category-${category.id}-title`}>{category.name}</h3><p>{category.description}</p></div>
      {multiple && <div className="ct-slider-controls">
        <span className="ct-slider-position" aria-live="polite" aria-atomic="true">{position.first + 1} / {demos.length}</span>
        <button type="button" aria-label={`Previous ${category.name.toLowerCase()} demo`} aria-controls={`slider-${category.id}`} disabled={position.first === 0} onClick={() => move(-1)}><span aria-hidden="true">←</span></button>
        <button type="button" aria-label={`Next ${category.name.toLowerCase()} demo`} aria-controls={`slider-${category.id}`} disabled={position.atEnd} onClick={() => move(1)}><span aria-hidden="true">→</span></button>
      </div>}
    </div>
    {multiple && <p id={`slider-${category.id}-help`} className="ct-slider-help">Swipe or use the arrows to explore. Keyboard: Tab through cards, or use arrow keys on the row.</p>}
    <ul ref={sliderRef} id={`slider-${category.id}`} className={`ct-slider${multiple ? '' : ' ct-slider-single'}`} aria-label={`${category.name} demos`} aria-describedby={multiple ? `slider-${category.id}-help` : undefined} tabIndex={multiple ? 0 : undefined} onScroll={updatePosition} onKeyDown={onKeyDown}>
      {demos.map(demo => <li key={demo.id}><DemoCard demo={demo} onWatch={onWatch} /></li>)}
    </ul>
  </section>
}

export default function ContractorsLander() {
  const [activeDemo, setActiveDemo] = useState<TradeDemo | null>(null)
  const watchDemo = useCallback((demo: TradeDemo) => setActiveDemo(demo), [])
  const closePreview = useCallback(() => setActiveDemo(null), [])
  const featured = trades.find(demo => demo.featured) ?? trades[0]
  return <div className="ct-site">
    <a className="ct-skip" href="#main">Skip to content</a>
    <div className="ct-dark">
      <header className="ct-wrap ct-header">
        <Wordmark />
        <nav aria-label="Contractors">
          <a href="#offer">Offer</a>
          <a href="#demos">Demos</a>
          <a href="#built">What they do</a>
          <a href="#access">Access</a>
        </nav>
        <a className="ct-header-cta" href="/request-demo/">Request access <Arrow diagonal /></a>
      </header>
      <main id="main">
        <section className="ct-wrap ct-hero" aria-labelledby="ct-title">
          <div className="ct-hero-copy">
            <p className="ct-eyebrow">Business systems for contractors / Demos</p>
            <h1 id="ct-title">Connect the first inquiry <em>to the work ahead.</em></h1>
            <p className="ct-lede">Wallace Shift builds custom CRMs, practical AI integrations and workflow automation. Explore short, public previews of website and CRM concepts: helping customers explain what they need and helping your team see the next step.</p>
            <div className="ct-actions">
              <a className="ct-button" href="#demos">Watch the demos <Arrow /></a>
              <a className="ct-button ct-button-line" href={`${STUDIO}/contact`}>Discuss your workflow</a>
            </div>
          </div>
          <button type="button" className="ct-hero-feature" onClick={() => watchDemo(featured)} aria-label={`Watch ${featured.name} preview`}>
            <img src={featured.thumbnail} alt={featured.thumbnailAlt} width="1200" height="630" fetchPriority="high" />
            <span className="ct-play" aria-hidden="true">▶</span>
            <span className="ct-hero-feature-label"><span>{previewDuration(featured.durationSeconds)} · No access request needed</span><strong>Watch {featured.name} <Arrow /></strong></span>
          </button>
        </section>
      </main>
    </div>

    <section id="offer" className="ct-offer" aria-labelledby="offer-title">
      <div className="ct-wrap ct-offer-inner">
        <div>
          <p className="ct-eyebrow">Contractor launch offer</p>
          <h2 id="offer-title">A free website <em>when you purchase a CRM integrated with AI.</em></h2>
        </div>
        <div className="ct-offer-detail">
          <p>Get a customer website designed around the same workflow as your CRM, so the first inquiry and the team’s next action have a clearer handoff.</p>
          <p className="ct-offer-note">CRM configuration, AI connections, platform costs and any work outside the agreed website scope are discussed and scoped separately.</p>
          <a className="ct-button" href={`${STUDIO}/contact`}>Discuss the offer <Arrow diagonal /></a>
        </div>
      </div>
    </section>

    <section id="demos" className="ct-light ct-section" aria-labelledby="demos-title">
      <div className="ct-wrap">
        <div className="ct-section-head">
          <p className="ct-eyebrow">The collection</p>
          <h2 id="demos-title">Explore the customer side <em>of the system.</em></h2>
        </div>
        <p className="ct-collection-intro">{trades.length} individual demos across {categories.length} categories. Watch any preview now; request access when you want to explore the interactive version.</p>
        <nav className="ct-category-nav" aria-label="Browse demos by trade">{categories.map(category => <a key={category.id} href={`#category-${category.id}`}>{category.name}<span>{trades.filter(demo => demo.category === category.id).length}</span></a>)}</nav>
        <div className="ct-category-rows">{categories.map(category => <CategoryRow key={category.id} category={category} demos={trades.filter(demo => demo.category === category.id)} onWatch={watchDemo} />)}</div>
        <div className="ct-next">
          <p className="ct-eyebrow">Planned for the collection</p>
          <ul>{nextTrades.map(trade => <li key={trade}>{trade}</li>)}</ul>
          <p className="ct-next-ask">Demo brands and project records are fictional. Live connections and automations require an agreed implementation. <a href={`${STUDIO}/contact`}>Tell us how your business works <Arrow diagonal /></a></p>
        </div>
      </div>
    </section>

    <section id="built" className="ct-light ct-section ct-section-rule" aria-labelledby="built-title">
      <div className="ct-wrap">
        <div className="ct-section-head">
          <p className="ct-eyebrow">From customer questions to team action</p>
          <h2 id="built-title">A clearer request. <em>A defined next step.</em></h2>
        </div>
        <ol className="ct-columns">
          <li><span>01</span><h3>Help customers explain the need</h3><p>Trade-specific guides, visualizers and planning tools help customers describe the property, problem or project before the first conversation.</p></li>
          <li><span>02</span><h3>Make the handoff clear</h3><p>Plan how enquiry details should reach the right customer record and team member. The roofing dashboard demonstrates a sample worklist and inspection workflow.</p></li>
          <li><span>03</span><h3>Build around the next step</h3><p>We scope the connections, reminders and follow-up around your existing tools. Monitoring keeps agreed workflows working; new capabilities are scoped as the business changes.</p></li>
        </ol>
      </div>
    </section>

    <section id="access" className="ct-dark ct-section" aria-labelledby="access-title">
      <div className="ct-wrap ct-access">
        <div>
          <p className="ct-eyebrow">Go beyond the preview</p>
          <h2 id="access-title">Watch freely. <em>Explore with access.</em></h2>
        </div>
        <ol className="ct-steps">
          <li><span>1</span><div><h3>Request access</h3><p>Tell us your name, business and email. We review each request personally.</p></div></li>
          <li><span>2</span><div><h3>Verify and agree</h3><p>If approved, use your invitation to verify your email and accept the evaluation and confidentiality agreement.</p></div></li>
          <li><span>3</span><div><h3>Explore</h3><p>Invitations expire 72 hours after issue. Explore the examples, then discuss the workflow your business needs.</p></div></li>
        </ol>
        <a className="ct-button" href="/request-demo/">Request access <Arrow diagonal /></a>
      </div>
    </section>

    {activeDemo && <DemoPreview key={activeDemo.id} demo={activeDemo} onClose={closePreview} />}

    <footer className="ct-dark ct-footer">
      <div className="ct-wrap ct-footer-inner">
        <Wordmark />
        <p>Custom systems. Connected work.</p>
        <nav aria-label="Footer">
          <a href={`${STUDIO}/`}>Wallace Shift</a>
          <a href={`${STUDIO}/services`}>Services</a>
          <a href={`${STUDIO}/contact`}>Contact</a>
        </nav>
        <p className="ct-copyright">© {new Date().getFullYear()} Wallace Shift. Demo brands are fictional.</p>
      </div>
    </footer>
  </div>
}
