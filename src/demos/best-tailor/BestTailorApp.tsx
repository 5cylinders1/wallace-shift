import { useEffect, useRef, useState } from 'react'
import { business, reviews } from './data'
import AppointmentRequest from './AppointmentRequest'
import DressStory from './DressStory'

const { phoneHref: phone, directions, reviewsUrl } = business

function Icon({ name, className = '' }: { name: 'arrow' | 'phone' | 'pin' | 'plus' | 'star' | 'chevron' | 'needle'; className?: string }) {
  const paths = {
    arrow: <><path d="M4 12h15M13 5l7 7-7 7" /></>,
    phone: <path d="m8 3 3 5-3 3c1.6 2.6 2.4 3.4 5 5l3-3 5 3c0 3-2 5-5 5C9 20 4 15 3 8c0-3 2-5 5-5Z" />,
    pin: <><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    plus: <path d="M5 12h14M12 5v14" />,
    star: <path d="m12 2 3 6.3 7 .9-5.1 4.9 1.3 6.9-6.2-3.4L5.8 21l1.3-6.9L2 9.2l7-.9L12 2Z" />,
    chevron: <path d="m9 5 7 7-7 7" />,
    needle: <><path d="m6 22 13-18c2-3 5-1 3 2L6 22ZM18 6l2-2" /><path d="M19 4C8-4-2 7 7 12s12 2 9 8" /></>,
  }
  return <svg className={`bt-icon ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}

const services = [
  { title: 'Dresses for special occasions', description: 'A meaningful day deserves a thoughtful fitting. Discuss the hem, straps, and fit of a bridesmaid, prom, or evening dress. Have a wedding gown? Ask Sue about your particular dress and the work you have in mind.', tags: 'Bridesmaids · Prom · Evening wear · Wedding dress inquiries', bring: 'Bring the shoes and undergarments you plan to wear, and share your event date when arranging your fitting.' },
  { title: 'Everyday dresses & skirts', description: 'The sundress you wear all summer. The skirt that almost fits. Talk through the small changes that help your favorite pieces feel comfortable and personal.', tags: 'Dresses · Skirts · Hems · Fit adjustments', bring: 'Try your piece on before your fitting and make a note of what feels too long, loose, or uncomfortable.' },
  { title: 'Denim & wardrobe favorites', description: 'Your favorite pair, with a fit that feels like you. Ask about hemming, waist adjustments, or alterations to trousers, shirts, jackets, and suits.', tags: 'Jeans · Trousers · Shirts · Jackets', bring: 'Bring the shoes you usually wear with your pants so you can discuss the right finished length.' },
  { title: 'Mending & repairs', description: 'Give well-loved pieces another chapter. From torn denim to a damaged favorite dress, ask Sue about a thoughtful repair that keeps your wardrobe in use.', tags: 'Denim repairs · Dresses · Garment mending', bring: 'Bring the item so Sue can assess the material, damage, and repair options before quoting the work.' },
]

export default function SuesTailorApp() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeService, setActiveService] = useState<number | null>(0)
  const [reviewPage, setReviewPage] = useState(0)
  const menuButton = useRef<HTMLButtonElement>(null)
  const navigation = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    function dismiss(event: KeyboardEvent) {
      if (event.key === 'Escape') { setMenuOpen(false); menuButton.current?.focus() }
    }
    function outside(event: PointerEvent) {
      if (!navigation.current?.contains(event.target as Node) && !menuButton.current?.contains(event.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('keydown', dismiss)
    document.addEventListener('pointerdown', outside)
    return () => { document.removeEventListener('keydown', dismiss); document.removeEventListener('pointerdown', outside) }
  }, [menuOpen])

  return <div className="bt-site" id="top">
    <a className="bt-skip" href="#main">Skip to content</a>
    <header className="bt-header">
      <a className="bt-brand" href="#top" aria-label="Sue’s Tailor Shop home"><Icon name="needle" /><span>Sue’s Tailor Shop<small>OVERLAND PARK, KANSAS</small></span></a>
      <button ref={menuButton} type="button" className="bt-menu-button" aria-expanded={menuOpen} aria-controls="bt-navigation" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? 'Close' : 'Menu'}<span className={menuOpen ? 'is-open' : ''} aria-hidden="true"><i /><i /></span></button>
      <nav ref={navigation} id="bt-navigation" className={`bt-nav ${menuOpen ? 'is-open' : ''}`} aria-label="Main navigation">
        <a href="#alterations" onClick={() => setMenuOpen(false)}>Alterations & repairs</a>
        <a href="#kind-words" onClick={() => setMenuOpen(false)}>Kind words</a>
        <a href="#visit" onClick={() => setMenuOpen(false)}>Visit Sue</a>
        <a className="bt-header-call" href="#request-fitting" onClick={() => setMenuOpen(false)}>Request a fitting <Icon name="arrow" /></a>
      </nav>
    </header>

    <main id="main">
      <DressStory />

      <div className="bt-welcome-line"><p>The dress is yours.<em> Let’s make the fit yours, too.</em></p><a href="#alterations">Explore alterations <Icon name="arrow" /></a></div>

      <section className="bt-services bt-container" id="alterations" aria-labelledby="services-title">
        <div className="bt-services-intro">
          <h2 id="services-title">Your favorites.<br /><em>Fitted to you.</em></h2>
          <p>The bridesmaid dress. Your favorite denim. Something special you can’t wait to wear.</p>
          <p>Sometimes, a thoughtful alteration is all it takes to make a piece feel right again.</p>
          <a className="bt-text-link" href="#request-fitting">Tell us about your piece <Icon name="arrow" /></a>
          <div className="bt-thread-mark" aria-hidden="true"><svg viewBox="0 0 240 90" fill="none"><path d="M2 62c58-44 68 34 122-1s84-49 67-19-54 9-25-21 45 3 72-14" stroke="currentColor" strokeWidth="1.5" /></svg></div>
        </div>
        <div className="bt-service-list">
          {services.map((service, index) => <article className={`bt-service ${activeService === index ? 'is-expanded' : ''}`} key={service.title}>
            <h3><button type="button" onClick={() => setActiveService(activeService === index ? null : index)} aria-expanded={activeService === index} aria-controls={`service-${index}`} id={`service-heading-${index}`}>{service.title}<Icon name="plus" /></button></h3>
            <div id={`service-${index}`} role="region" aria-labelledby={`service-heading-${index}`} hidden={activeService !== index} className="bt-service-content">
              <p>{service.description}</p><p className="bt-service-tags">{service.tags}</p>
              <div className="bt-fitting-tip"><strong>A little fitting tip</strong><p>{service.bring}</p></div>
            </div>
          </article>)}
          <p className="bt-service-footnote">Every piece is different. Call to discuss your garment, timing, and a quote.</p>
        </div>
      </section>

      <section className="bt-process" aria-labelledby="process-title">
        <div className="bt-container bt-process-inner">
          <h2 id="process-title">Let’s make it<br /><em>feel right.</em></h2>
          <ol>
            <li><span aria-hidden="true">1</span><div><h3>Make time for your fitting.</h3><p>Sue works by appointment so your fitting gets her full attention. Share your garment and event date when you call to arrange a time.</p></div></li>
            <li><span aria-hidden="true">2</span><div><h3>Bring the whole picture.</h3><p>Your garment, the right shoes, and an idea of how you’d like it to fit. Discuss the work and price together.</p></div></li>
            <li><span aria-hidden="true">3</span><div><h3>Look forward to wearing it.</h3><p>Confirm your collection date with the shop, then make room for an old favorite that feels new again.</p></div></li>
          </ol>
        </div>
      </section>

      <section className="bt-reviews" id="kind-words" aria-labelledby="reviews-title">
        <div className="bt-container">
          <div className="bt-section-heading"><h2 id="reviews-title">Kind words.<br /><em>From around the neighborhood.</em></h2><a className="bt-text-link" href={reviewsUrl} target="_blank" rel="noreferrer">Read the reviews on Google <Icon name="arrow" /></a></div>
          <p className="bt-review-rating"><Icon name="star" /><strong>{business.rating} on Google</strong><span>{business.reviewCount} reviews · Checked November 17, 2026</span></p>
          <div className="bt-review-grid" aria-live="polite" aria-atomic="true">
            {reviews.slice(reviewPage * 3, reviewPage * 3 + 3).map(review => <figure className="bt-review" key={review.name}>
              <div className="bt-stars" role="img" aria-label={`${review.rating} out of 5 stars`}>{Array.from({ length: review.rating }, (_, index) => <Icon key={index} name="star" />)}</div>
              <p className="bt-review-summary">{review.summary}</p>
              <figcaption><strong>{review.name}</strong><span>{review.topic} · Review summary</span></figcaption>
            </figure>)}
          </div>
          <div className="bt-review-bottom"><p>Highlights summarized from selected Google reviews. Read the original reviews above.</p><div className="bt-review-controls"><span>{reviewPage + 1} / 2</span><button type="button" aria-label="Previous reviews" disabled={reviewPage === 0} onClick={() => setReviewPage(0)}><Icon name="chevron" className="bt-previous" /></button><button type="button" aria-label="Next reviews" disabled={reviewPage === 1} onClick={() => setReviewPage(1)}><Icon name="chevron" /></button></div></div>
        </div>
      </section>

      <AppointmentRequest />

      <section className="bt-visit bt-container" id="visit" aria-labelledby="visit-title">
        <div className="bt-visit-copy"><h2 id="visit-title">A good fit is<br /><em>closer than you think.</em></h2><p>You’ll find Sue’s Tailor Shop on Metcalf in South Overland Park. Call to arrange your fitting. Appointments are required.</p><a className="bt-button bt-button-burgundy" href={phone}><Icon name="phone" /> Call {business.phone} <Icon name="arrow" /></a><p className="bt-visit-access">Onsite parking · Wheelchair accessible entrance</p></div>
        <div className="bt-address-panel">
          <div className="bt-address-title"><Icon name="needle" /><span>Come say hello.</span></div>
          <address>{business.name}<br />{business.street}<br />{business.city}</address>
          <a className="bt-text-link" href={directions} target="_blank" rel="noreferrer">Get directions <Icon name="arrow" /></a>
          <div className="bt-hours"><strong>Shop hours · By appointment</strong><dl>{business.hours.map(({ days, time }) => <div key={days}><dt>{days}</dt><dd>{time}</dd></div>)}</dl><p>Call ahead for appointments and holiday hours.</p><a href={phone}>{business.phone}</a></div>
        </div>
      </section>
    </main>

    <footer className="bt-footer"><div className="bt-container"><div className="bt-footer-top"><a href="#top" className="bt-footer-brand">Sue’s Tailor Shop<span>Clothes you love. A fit that feels like you.</span></a><a href="#top" className="bt-back-top">Back to top <Icon name="arrow" /></a></div><div className="bt-footer-bottom"><p>Sue’s Tailor Shop · Overland Park, Kansas</p><p>Illustrative photography.</p><a href={reviewsUrl} target="_blank" rel="noreferrer">Find us on Google <Icon name="arrow" /></a></div></div></footer>
    <nav className="bt-mobile-actions" aria-label="Quick contact"><a href="#request-fitting">Request a fitting <Icon name="arrow" /></a><a href={phone}><Icon name="phone" /> Call Sue</a></nav>
  </div>
}
