import { useState } from 'react'
import { areaPages, business, href, isServiceChoice, serviceChoices, servicePages } from './content'
import { Icon, type IconName, Stars } from './icons'
import { SiteFrame } from './Layout'
import { useLocationSearch } from './location'
import QuoteForm from './QuoteForm'
import ServiceAreaMap from './ServiceAreaMap'
import { serviceAreas } from './serviceAreas'

// The Base44 build's hero illustration, served through its media CDN's resize
// path (the original PNG is 1024 square and 1.7 MB).
const heroImage = 'https://media.base44.com/images/public/6b0459b0732a6b4f82d4372b/74a9cb1883f056167de2b32a38d8d2a0_generated_82e2d1a0.png'
const heroFile = heroImage.split('/').pop()
const heroAt = (width: number) => `${heroImage}/v1/fit/w_${width},h_${width},q_90,usm_0.66_1.00_0.01,enc_auto,quality_auto/${heroFile}`

const services: [icon: IconName, text: string, cta: string, page?: string][] = [
  ['snowflake', 'Keep your property comfortable year-round with furnace and air conditioner installation, replacement, and repair.', 'Explore Heating & Cooling', servicePages[0][0]],
  ['flame', 'Replace an aging or failed water heater. We’ll talk through your hot water needs and help you choose the right size.', 'Explore Water Heater Services', servicePages[1][0]],
  ['droplets', 'Interested in whole-house water filtration? Tell us about your water concerns and ask about availability.', 'Ask About Filtration'],
  ['refrigerator', 'Ask about selecting, replacing, or servicing an appliance at your property.', 'Explore Appliance Services', servicePages[2][0]],
  ['hammer', 'Tell us about your kitchen, bath, or other indoor remodeling project and ask about scope.', 'Explore Interior Remodels', servicePages[3][0]],
  ['house', 'Planning an exterior update? Ask what’s available for your property and timeline.', 'Explore Exterior Remodels', servicePages[4][0]],
]

const reviews: [name: string, quote: string][] = [
  ['Jen Sol', 'Great service and very knowledgeable of his craft.'],
  ['Evan Johnson', 'Eddie at American Mechanical KC came through big time — he had the exact part we needed and made sure we were taken care of.'],
]

const areaLinks = new Map(areaPages.map(([path, name]) => [name, path]))

export default function HomePage() {
  // `?service=` preselects the quote form, as the Base44 route did, until the
  // visitor picks a service themselves.
  const requested = new URLSearchParams(useLocationSearch()).get('service')
  const [chosen, setService] = useState<string | null>(null)
  const service = chosen ?? (isServiceChoice(requested) ? requested : '')

  return <SiteFrame>
    <Hero />
    <section id="services" className="am-section am-shell">
      <p className="am-kicker"><span /> WHAT WE DO</p><h2>How can we help?</h2>
      <p className="am-section-intro">We focus on work that lasts and fair pricing, whether it’s for your home or business.</p>
      <div className="am-services">{services.map(([icon, text, cta, page], i) => <article className="am-card" key={cta}>
        <div className="am-card-top"><Icon name={icon} size={25} /><span>{i < 2 ? `0${i + 1}` : 'ASK ABOUT AVAILABILITY'}</span></div>
        <h3>{serviceChoices[i]}</h3><p>{text}</p>
        {page ? <a href={href(page)}>{cta}<Icon name="arrow-right" size={16} /></a> : <a href="#quote" onClick={() => setService(serviceChoices[i])}>{cta}<Icon name="arrow-right" size={16} /></a>}
      </article>)}</div>
    </section>
    <section className="am-urgent"><div className="am-shell am-urgent-row">
      <div><p className="am-kicker"><span /> EMERGENCY SERVICE</p><h2>Need help now?</h2><p>Call to describe the issue and check the next available service time. Don’t wait on the quote form.</p></div>
      <a className="am-btn am-primary" href={business.phoneHref}><Icon name="phone" size={18} /> Call {business.phoneDisplay}</a>
    </div></section>
    <section id="reviews" className="am-shell am-section">
      <p className="am-kicker"><span /> FROM KANSAS CITY CUSTOMERS</p><h2>What customers say</h2>
      <p className="am-section-intro">Rated <strong>{business.rating} out of 5</strong> from {business.reviewCount} reviews on Google.</p>
      <div className="am-reviews">{reviews.map(([name, quote]) => <figure key={name} className="am-card am-review">
        <div role="img" aria-label="5 stars"><Stars /></div>
        <blockquote>“{quote}”</blockquote>
        <figcaption>{name} <span>· Google review excerpt</span></figcaption>
      </figure>)}</div>
      <a className="am-review-link" href={business.google} target="_blank" rel="noreferrer">Read all reviews on Google <Icon name="arrow-up-right" size={16} /></a>
    </section>
    <ServiceAreas />
    <QuoteForm service={service} setService={setService} />
  </SiteFrame>
}

function Hero() {
  return <section className="am-hero"><div className="am-shell am-hero-grid">
    <div className="am-hero-copy">
      <p className="am-kicker"><span /> KANSAS CITY HEATING, COOLING &amp; HOT WATER</p>
      <h1>Comfort you<br className="am-desktop" /> can <em>count on.</em></h1>
      <p className="am-intro">HVAC and water heater installation for homes and businesses across Greater Kansas City. Get a quote for your next project, or call when it can’t wait.</p>
      <div className="am-actions">
        <a className="am-btn am-primary" href="#quote">Request a Quote <Icon name="arrow-right" size={18} /></a>
        <a className="am-btn am-outline" href={business.phoneHref}><Icon name="phone" size={17} /> Emergency Service</a>
      </div>
      <a className="am-hero-review" href="#reviews"><span aria-hidden="true"><Stars /></span><strong>{business.rating}</strong> <span>from {business.reviewCount} Google reviews</span></a>
    </div>
    <figure className="am-hero-figure">
      <img src={heroAt(1024)} srcSet={`${heroAt(640)} 640w, ${heroAt(1024)} 1024w`} sizes="(max-width: 660px) calc(100vw - 36px), 46vw"
        width={1024} height={1024} className="am-hero-image" loading="eager" fetchPriority="high"
        alt="Illustration of a clean mechanical room with HVAC equipment, copper piping, and a water heater" />
      <figcaption><span><Icon name="map-pin" size={15} /> LOCALLY BASED IN KANSAS CITY</span><Icon name="arrow-down-right" size={19} /></figcaption>
    </figure>
  </div></section>
}

function ServiceAreas() {
  const total = serviceAreas.reduce((count, { cities }) => count + cities.length, 0)
  return <section id="locations" className="am-detail-related" aria-labelledby="service-areas-title">
    <div className="am-shell">
      <p className="am-kicker"><span /> SERVICE AREAS</p>
      <h2 id="service-areas-title">Serving Greater Kansas City</h2>
      <p className="am-section-intro">We serve communities on both sides of the state line. Include your ZIP code when you request a quote so we can confirm availability for your address.</p>
      <figure className="am-area-map">
        <div className="am-area-frame"><ServiceAreaMap /></div>
        <figcaption><span aria-hidden="true" className="am-area-swatch" /><span>The shaded circle shows our general service area, not an exact boundary.</span></figcaption>
      </figure>
      <details className="am-area-list">
        <summary>View all {total} service areas</summary>
        <div className="am-area-grid">{serviceAreas.map(({ state, abbreviation, cities }) => <div className="am-card am-detail-card" key={state}>
          <h3>{state}</h3>
          <ul aria-label={`${state} service areas`} className={abbreviation === 'MO' ? 'am-area-cities am-area-cities-wide' : 'am-area-cities'}>
            {cities.map(([city]) => {
              const name = `${city}, ${abbreviation}`
              const path = areaLinks.get(name)
              return <li key={name}>{path ? <a href={href(path)}><span>{name}</span><Icon name="arrow-right" size={14} /></a> : name}</li>
            })}
          </ul>
        </div>)}</div>
      </details>
    </div>
  </section>
}
