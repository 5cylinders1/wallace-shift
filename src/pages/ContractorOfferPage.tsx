import { PageLink } from '../components/PageLink/PageLink'
import { Arrow, FollowUpOfferDemo, WebsiteOfferDemo } from '../components/ContractorOfferDemo'
import { ContractorOfferInquiry } from '../components/ContractorOfferInquiry'
import { contractorOffers, type ContractorOfferId } from '../content/contractorOffers'
import { business } from '../content/siteConfig'
import { useRouteMeta } from '../hooks/useDocumentMeta'
import './ContractorOfferPage.css'

export function ContractorOfferPage({ offerId }: { offerId: ContractorOfferId }) {
  const offer = contractorOffers[offerId]
  const isWebsite = offerId === 'website'
  const alternative = contractorOffers[isWebsite ? 'lead-follow-up' : 'website']
  useRouteMeta(offer.path)
  return <div className={`co-page co-page--${offerId}`}>
    <a className="co-skip" href="#main">Skip to content</a>
    <header className="co-header co-wrap">
      <PageLink href="/" className="co-brand"><img src="/brand/wallace-shift-logo-white.svg" alt="" width="28" height="17" /><span>WALLACE SHIFT</span></PageLink>
      <nav aria-label="Offer navigation"><a href="#demo">Demo</a><a href="#pricing">Pricing</a><a href="#questions">Questions</a></nav>
      <a href="#inquiry" className="co-header-cta">Let’s talk <Arrow /></a>
    </header>
    <main id="main">
      <section className="co-hero co-wrap" aria-labelledby="offer-heading">
        <div className="co-hero-copy">
          <h1 id="offer-heading">{offer.heading}<br /><em>{offer.emphasis}</em></h1>
          <p className="co-intro">{offer.intro}</p>
          <div className="co-hero-price"><strong>{offer.price}</strong><span>{offer.interval}</span></div>
          <p className="co-price-note">{offer.priceNote}</p>
          {!isWebsite && <p className="co-recurring-note">Software, hosting and message usage may cost extra.</p>}
          <div className="co-hero-actions"><a className="co-button" href="#demo">{isWebsite ? 'Watch the website demos' : 'Try the follow up demo'} <Arrow /></a><a className="co-inline-link" href="#inquiry">{offer.cta}</a></div>
          <p className="co-location">Built by Wallace Shift in Greater Kansas City.</p>
        </div>
        <a className="co-hero-visual" href="#demo" aria-label={isWebsite ? 'Explore the website demos' : 'Explore the lead page and follow up demo'}>
          <div className="co-browser-bar"><span className="co-browser-dots" aria-hidden="true"><i /><i /><i /></span><span>{isWebsite ? 'A look at what is possible' : 'From interest to a conversation'}</span></div>
          <img src="/media/demo-previews/northvane.jpg" alt="Northvane Roofing website concept showing a house and a roof planning experience" width="1600" height="900" fetchPriority="high" />
          <div className="co-visual-caption">{isWebsite ? <><span>Roofing · Kitchens · Pools</span><strong>Explore the design directions <Arrow /></strong></> : <><span>Lead page → Inquiry → Follow up</span><strong>See the complete journey <Arrow /></strong></>}</div>
          <p className="co-hero-disclosure">Fictional demo. Advanced features are scoped separately.</p>
        </a>
      </section>

      <div className="co-light">
        <section id="demo" className="co-section co-wrap" aria-labelledby="demo-heading">
          <div className="co-section-heading"><h2 id="demo-heading">{isWebsite ? <>See the work.<br /><em>Before we talk.</em></> : <>Try the journey.<br /><em>No form required.</em></>}</h2><p>{isWebsite ? 'Explore a few website concepts. The videos are open to everyone, so you can get a feel for the design before sharing your details.' : 'A sample roof repair request shows the page, confirmation and follow up working together. Try each step at your own pace.'}</p></div>
          {isWebsite ? <WebsiteOfferDemo /> : <FollowUpOfferDemo />}
        </section>

        <section id="pricing" className="co-section co-pricing co-wrap" aria-labelledby="pricing-heading">
          <div className="co-price-overview"><h2 id="pricing-heading">{offer.scopeTitle}</h2><div className="co-price-display"><strong>{offer.price}</strong><span>{offer.interval}</span></div><p>{offer.priceNote}</p><p className="co-fit">{offer.fit}</p><a className="co-button" href="#inquiry">{offer.cta} <Arrow /></a></div>
          <div className="co-scope"><dl>{offer.scope.map(([title, detail]) => <div key={title}><dt>{title}</dt><dd>{detail}</dd></div>)}</dl><div className="co-cost-note"><h3>What is separate</h3><p>{offer.exclusions}</p></div><p className="co-small">{offer.terms}</p></div>
        </section>

        <section id="questions" className="co-section co-faq co-wrap" aria-labelledby="questions-heading"><div><h2 id="questions-heading">A few things<br /><em>worth knowing.</em></h2><p>Still have a question? You do not need to be ready to buy to <a href="#inquiry">get in touch</a>.</p></div><div>{offer.faqs.map(([question, answer]) => <details key={question}><summary>{question}<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="m5 9 7 7 7-7" /></svg></summary><p>{answer}</p></details>)}</div></section>

        <section id="inquiry" className="co-section co-wrap co-inquiry-section" aria-label={`${offer.name} inquiry`}><ContractorOfferInquiry key={offer.id} offer={offer.id} priceLabel={offer.priceLabel} offerName={offer.name} /></section>
        <aside className="co-alternative co-wrap"><div><h2>{isWebsite ? 'Already have a website you like?' : 'Need a complete business website?'}</h2><p>{isWebsite ? 'Give a specific service its own lead page and automatic follow up.' : 'Get a website with hosting, maintenance and basic SEO included.'}</p></div><PageLink href={alternative.path}>{alternative.name}<span>{alternative.priceLabel} <Arrow /></span></PageLink></aside>
      </div>
    </main>
    <footer className="co-footer co-wrap"><div><PageLink href="/" className="co-brand">WALLACE SHIFT</PageLink><p>Websites and connected workflows.<br />Greater Kansas City and remotely.</p></div><div className="co-footer-links"><PageLink href="/about">Meet Wallace Shift</PageLink><PageLink href="/contact">Contact</PageLink><PageLink href="/privacy">Privacy</PageLink>{business.email && <a href={`mailto:${business.email}`}>Email Matthew</a>}</div></footer>
  </div>
}
