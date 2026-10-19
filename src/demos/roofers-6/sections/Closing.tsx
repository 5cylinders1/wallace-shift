import { brand, commitments, faqs, nav, process } from '../content'
import { Mark } from './Header'
import { galleryPath } from '../routes'

export function Process() {
  return <section id="process" className="st-process st-opaque" aria-labelledby="st-process-title">
    <div className="st-wrap">
      <div className="st-section-head st-section-head-row">
        <div>
          <p className="st-kicker"><span>06</span>How a Stratum project runs</p>
          <h2 id="st-process-title">No mystery between <em>the first look and the last nail.</em></h2>
        </div>
        <p className="st-lede">The same five steps whether it’s a storm claim, a tune-up or a new build. You always know what happens next and who is doing it.</p>
      </div>
      <ol className="st-process-list">
        {process.map((step, index) => <li key={step.title}>
          <span className="st-process-number">{String(index + 1).padStart(2, '0')}</span>
          <h3>{step.title}</h3>
          <p>{step.text}</p>
        </li>)}
      </ol>
      <div className="st-commitments">
        <h3>What you can hold us to</h3>
        <ul>
          {commitments.map(item => <li key={item.title}><strong>{item.title}</strong><span>{item.text}</span></li>)}
        </ul>
      </div>
    </div>
  </section>
}

export function Faq() {
  return <section id="faq" className="st-faq st-opaque" aria-labelledby="st-faq-title">
    <div className="st-wrap st-faq-grid">
      <div>
        <p className="st-kicker"><span>?</span>Straight answers</p>
        <h2 id="st-faq-title">Questions people ask <em>before they call.</em></h2>
      </div>
      <div className="st-faq-list">
        {faqs.map(item => <details key={item.q}>
          <summary><span>{item.q}</span><i aria-hidden="true" /></summary>
          <p>{item.a}</p>
        </details>)}
      </div>
    </div>
  </section>
}

export function Footer() {
  return <footer className="st-footer">
    <div className="st-wrap">
      <div className="st-footer-top">
        <div className="st-footer-brand">
          <Mark />
          <p><strong>{brand.full}</strong>{brand.tagline}</p>
        </div>
        <nav aria-label="Footer">
          {nav.map(item => <a key={item.href} href={item.href}>{item.label}</a>)}
          <a href="#book">Book an inspection</a>
        </nav>
        <div className="st-footer-contact">
          <a href={brand.phoneHref}>{brand.phone}</a>
          <a href={`mailto:${brand.email}`}>{brand.email}</a>
          <span>{brand.area}</span>
        </div>
      </div>
      <div className="st-footer-bottom">
        <p>Stratum Roofing Co. is a fictional contractor created by Wallace Shift to demonstrate a roofing website. The home is a real-time 3D model drawn in your browser; measurements are for that model, and prices, services and timelines are illustrative. No licences, reviews or certifications are claimed.</p>
        <div><a href={galleryPath}>All roofing designs <span aria-hidden="true">↗</span></a><a href="https://wallaceshift.com">Designed by Wallace Shift <span aria-hidden="true">↗</span></a><span>© {new Date().getFullYear()}</span></div>
      </div>
    </div>
  </footer>
}
