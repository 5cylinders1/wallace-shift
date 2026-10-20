import { accessHref, demoHref, nextTrades, trades, type TradeDemo } from './catalog'

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

function DemoCard({ demo, host }: { demo: TradeDemo; host: string }) {
  const href = demoHref(demo, host)
  return <article className="ct-demo">
    <a className="ct-demo-image" href={href} aria-label={`${demo.collectionUrl ? 'Open' : 'View'} ${demo.name}, ${demo.trade}`}>
      <img src={demo.thumbnail} alt={demo.thumbnailAlt} width="1200" height="630" loading="lazy" />
      {demo.isNew && <span className="ct-badge">New</span>}
    </a>
    <div className="ct-demo-body">
      <p className="ct-demo-trade">{demo.trade}{demo.count ? ` · ${demo.count}` : ''}</p>
      <h3>{demo.name}</h3>
      <p className="ct-demo-summary">{demo.summary}</p>
      <ul className="ct-features">{demo.features.map(feature => <li key={feature}>{feature}</li>)}</ul>
      <div className="ct-demo-actions">
        {demo.collectionUrl
          ? <a className="ct-link-strong" href={href}>Open the collection <Arrow diagonal /></a>
          : <>
            <a className="ct-link-strong" href={href}>View the demo <Arrow /></a>
            <a className="ct-link" href={accessHref(demo)}>Request access</a>
          </>}
      </div>
    </div>
  </article>
}

export default function ContractorsLander() {
  const host = typeof window === 'undefined' ? '' : window.location.hostname
  const featured = trades.find(demo => demo.featured) ?? trades.find(demo => demo.isNew) ?? trades[0]
  return <div className="ct-site">
    <a className="ct-skip" href="#main">Skip to content</a>
    <div className="ct-dark">
      <header className="ct-wrap ct-header">
        <Wordmark />
        <nav aria-label="Contractors">
          <a href="#demos">Demos</a>
          <a href="#built">What they do</a>
          <a href="#access">Access</a>
        </nav>
        <a className="ct-header-cta" href="/request-demo/">Request access <Arrow diagonal /></a>
      </header>
      <main id="main">
        <section className="ct-wrap ct-hero" aria-labelledby="ct-title">
          <div className="ct-hero-copy">
            <p className="ct-eyebrow">Website demos for high-ticket trades</p>
            <h1 id="ct-title">Websites that explain the work <em>before the first call.</em></h1>
            <p className="ct-lede">Each demo is a working website for one trade, built around the questions its customers ask before they pick up the phone. Explore the collection, then request private access to the one that fits your business.</p>
            <div className="ct-actions">
              <a className="ct-button" href="#demos">See the demos <Arrow /></a>
              <a className="ct-button ct-button-line" href={accessHref(featured)}>Request access</a>
            </div>
          </div>
          <a className="ct-hero-feature" href={demoHref(featured, host)}>
            <img src={featured.thumbnail} alt={featured.thumbnailAlt} width="1200" height="630" fetchPriority="high" />
            <span className="ct-hero-feature-label"><span>New · {featured.trade}</span><strong>{featured.name} <Arrow /></strong></span>
          </a>
        </section>
      </main>
    </div>

    <section id="demos" className="ct-light ct-section" aria-labelledby="demos-title">
      <div className="ct-wrap">
        <div className="ct-section-head">
          <p className="ct-eyebrow">The collection</p>
          <h2 id="demos-title">One working demo per trade, <em>and growing.</em></h2>
        </div>
        <div className="ct-demos">{trades.map(demo => <DemoCard key={demo.id} demo={demo} host={host} />)}</div>
        <div className="ct-next">
          <p className="ct-eyebrow">Next in the collection</p>
          <ul>{nextTrades.map(trade => <li key={trade}>{trade}</li>)}</ul>
          <p className="ct-next-ask">Don’t see your trade? <a href={`${STUDIO}/contact`}>Tell us what you do <Arrow diagonal /></a></p>
        </div>
      </div>
    </section>

    <section id="built" className="ct-light ct-section ct-section-rule" aria-labelledby="built-title">
      <div className="ct-wrap">
        <div className="ct-section-head">
          <p className="ct-eyebrow">What every demo is built to do</p>
          <h2 id="built-title">Turn a worried search into a <em>booked visit.</em></h2>
        </div>
        <ol className="ct-columns">
          <li><span>01</span><h3>Show what customers can’t see</h3><p>The problem behind the wall, under the floor or up on the roof, made visible: live 3D sections, before-and-after views, previews on their own home.</p></li>
          <li><span>02</span><h3>Answer the first question</h3><p>“Is this serious?” and “What will it cost?” answered on the page, with decoders, estimators and planning prices, so the next step is obvious.</p></li>
          <li><span>03</span><h3>Make the request easy</h3><p>Short, stepped requests with photos attached, and room for the automations behind them: instant replies, reminders and follow-up.</p></li>
        </ol>
      </div>
    </section>

    <section id="access" className="ct-dark ct-section" aria-labelledby="access-title">
      <div className="ct-wrap ct-access">
        <div>
          <p className="ct-eyebrow">How access works</p>
          <h2 id="access-title">The demos are private. <em>Access takes a minute.</em></h2>
        </div>
        <ol className="ct-steps">
          <li><span>1</span><div><h3>Request access</h3><p>Tell us your name, business and email.</p></div></li>
          <li><span>2</span><div><h3>Verify and agree</h3><p>Confirm your email and accept a short evaluation and confidentiality agreement.</p></div></li>
          <li><span>3</span><div><h3>Explore</h3><p>Your access lasts 72 hours, across every demo on that site.</p></div></li>
        </ol>
        <a className="ct-button" href="/request-demo/">Request access <Arrow diagonal /></a>
      </div>
    </section>

    <footer className="ct-dark ct-footer">
      <div className="ct-wrap ct-footer-inner">
        <Wordmark />
        <p>Design. Technology. Momentum.</p>
        <nav aria-label="Footer">
          <a href={`${STUDIO}/`}>Studio</a>
          <a href={`${STUDIO}/services`}>Services</a>
          <a href={`${STUDIO}/contact`}>Contact</a>
        </nav>
        <p className="ct-copyright">© {new Date().getFullYear()} Wallace Shift. Demo brands are fictional.</p>
      </div>
    </footer>
  </div>
}
