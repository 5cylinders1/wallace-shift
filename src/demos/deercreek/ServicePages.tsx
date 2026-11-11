import { business, commercialList, href, residentialList, reviewsFor, serviceBySlug, services, type Service } from './content'
import { ServiceIcon } from './Icons'
import { CallBook, CheckList, Eyebrow, FaqList, ProcessSteps, PromiseList, ReviewCard, Section, ServiceRows } from './ui'

const srcSet = (src: string) => src.endsWith('-1600.webp') ? `${src.replace('-1600.webp', '-800.webp')} 800w, ${src} 1600w` : undefined

export function ServicesHub() {
  return (
    <>
      <section className="dc-page-hero" aria-labelledby="dc-page-title">
        <div className="dc-wrap dc-page-hero-inner">
          <Eyebrow>Residential & commercial plumbing</Eyebrow>
          <h1 id="dc-page-title">Plumbing services in Olathe and the Kansas City metro</h1>
          <p className="dc-lede">Licensed, insured plumbers for homes, rentals and businesses. Every service carries a 1-year parts and labor warranty, and you get the price before any work starts.</p>
          <CallBook />
        </div>
      </section>
      <Section tone="white" labelledBy="dc-hub-title">
        <h2 id="dc-hub-title" className="dc-visually-hidden">Our services</h2>
        <ul className="dc-hub-grid">
          {services.map(service => (
            <li key={service.slug} className="dc-hub-card">
              <ServiceIcon slug={service.slug} size={36} />
              <h3><a href={href(`services/${service.slug}`)}>{service.name}</a></h3>
              <p>{service.short}</p>
              <ul>{service.includes.slice(0, 3).map(item => <li key={item}>{item}</li>)}</ul>
            </li>
          ))}
        </ul>
      </Section>
      <Section tone="sand" labelledBy="dc-all-title">
        <h2 id="dc-all-title">Everything we do</h2>
        <div className="dc-two-col">
          <div>
            <h3>For homes</h3>
            <CheckList items={residentialList} />
          </div>
          <div>
            <h3>For businesses</h3>
            <CheckList items={commercialList} />
          </div>
        </div>
        <p className="dc-note">Don’t see it? Call <a href={business.phoneHref}>{business.phone}</a>. If it carries water or gas, we can probably help.</p>
      </Section>
      <Section tone="paper" labelledBy="dc-promise-title">
        <h2 id="dc-promise-title">What comes with every job</h2>
        <PromiseList />
      </Section>
    </>
  )
}

export function ServicePage({ service }: { service: Service }) {
  const related = reviewsFor(service.slug, 3)
  const others = services.filter(item => item.slug !== service.slug).slice(0, 4)
  const nearby = { 'water-heaters': ['leak-repair', 'radiant-heat-boilers'], 'drain-cleaning': ['sewer-line-repair', 'toilet-repair'], 'sewer-line-repair': ['drain-cleaning', 'sump-pumps'], 'sump-pumps': ['sewer-line-repair', 'leak-repair'], 'leak-repair': ['water-heaters', 'toilet-repair'], 'toilet-repair': ['drain-cleaning', 'leak-repair'], 'gas-lines': ['water-heaters', 'radiant-heat-boilers'], 'radiant-heat-boilers': ['water-heaters', 'gas-lines'], 'remodels-new-construction': ['commercial-plumbing', 'water-heaters'], 'commercial-plumbing': ['remodels-new-construction', 'drain-cleaning'] }[service.slug]
  const relatedServices = nearby.map(slug => serviceBySlug(slug)!).concat(others.filter(item => !nearby.includes(item.slug))).slice(0, 3)
  const portrait = service.image.h > service.image.w
  return (
    <>
      <section className="dc-page-hero dc-service-hero" aria-labelledby="dc-page-title">
        <div className="dc-wrap dc-service-hero-grid">
          <div>
            <Eyebrow>{service.eyebrow}</Eyebrow>
            <h1 id="dc-page-title">{service.h1}</h1>
            <p className="dc-lede">{service.lede}</p>
            <CallBook service={service.slug} />
            <ul className="dc-mini-promises">
              <li>1-year parts & labor warranty</li>
              <li>Price before the work</li>
              <li>Licensed & insured</li>
            </ul>
          </div>
          <figure className={`dc-service-figure${portrait ? ' is-portrait' : ''}`}>
            <img src={service.image.src} srcSet={srcSet(service.image.src)} sizes="(min-width: 900px) 42vw, 100vw" alt={service.image.alt} width={service.image.w} height={service.image.h} fetchPriority="high" />
          </figure>
        </div>
      </section>

      <Section tone="white" labelledBy="dc-includes-title">
        <div className="dc-two-col dc-two-col-wide">
          <div>
            <h2 id="dc-includes-title">{service.includesTitle}</h2>
            <CheckList items={service.includes} columns={1} />
          </div>
          <div className="dc-signs">
            <h2>{service.signsTitle}</h2>
            <ul className="dc-signs-list">{service.signs.map(sign => <li key={sign}>{sign}</li>)}</ul>
            <p className="dc-note">Not sure it’s worth a visit? Call <a href={business.phoneHref}>{business.phone}</a> and describe it. We’ll tell you honestly.</p>
          </div>
        </div>
      </Section>

      {related.length > 0 && (
        <Section tone="sand" labelledBy="dc-said-title">
          <h2 id="dc-said-title">What customers say about our {service.name.toLowerCase()} work</h2>
          <div className="dc-review-grid">
            {related.map(review => <ReviewCard key={review.name} review={review} />)}
          </div>
          <p className="dc-more-link"><a href={href('reviews')}>All reviews</a></p>
        </Section>
      )}

      <Section tone="paper" labelledBy="dc-visit-title">
        <h2 id="dc-visit-title">How a visit works</h2>
        <ProcessSteps />
      </Section>

      <Section tone="white" labelledBy="dc-sfaq-title">
        <div className="dc-faq-layout">
          <div>
            <h2 id="dc-sfaq-title">{service.name}: common questions</h2>
            <p><a href={href('faq')}>More questions and answers</a></p>
          </div>
          <FaqList faqs={service.faqs} />
        </div>
      </Section>

      <Section tone="sand" labelledBy="dc-related-title">
        <h2 id="dc-related-title">Related services</h2>
        <ServiceRows list={relatedServices} />
      </Section>

      <Section tone="night" labelledBy="dc-sfinal-title" className="dc-final">
        <div className="dc-final-inner">
          <h2 id="dc-sfinal-title">Get your {service.name.toLowerCase()} sorted</h2>
          <p className="dc-lede">Same-day estimates, and service is typically available within 24 hours.</p>
          <CallBook service={service.slug} tone="dark" />
        </div>
      </Section>
    </>
  )
}
