import { useState, type CSSProperties, type ReactNode } from 'react'
import { business, href, promises, reviews, reviewStats, services, type Faq, type Review, type ReviewTag, type Service } from './content'
import { ArrowIcon, CalendarIcon, CheckIcon, PhoneIcon, ServiceIcon, ShieldIcon, Stars } from './Icons'

export function Section({ id, tone = 'paper', className = '', labelledBy, children }: { id?: string; tone?: 'paper' | 'sand' | 'night' | 'white'; className?: string; labelledBy?: string; children: ReactNode }) {
  return (
    <section id={id} className={`dc-section dc-tone-${tone} ${className}`} aria-labelledby={labelledBy}>
      <div className="dc-wrap">{children}</div>
    </section>
  )
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="dc-eyebrow">{children}</p>
}

export function CallBook({ service, tone = 'light' }: { service?: string; tone?: 'light' | 'dark' }) {
  return (
    <div className={`dc-cta-row dc-cta-${tone}`}>
      <a className="dc-button dc-button-large" href={`${href('schedule')}${service ? `?service=${service}` : ''}`}><CalendarIcon /> Book a visit</a>
      <a className="dc-button dc-button-large dc-button-quiet" href={business.phoneHref}><PhoneIcon /> Call {business.phone}</a>
    </div>
  )
}

export function RatingBadge({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  return (
    <a className={`dc-rating dc-rating-${tone}`} href={href('reviews')}>
      <Stars label="Rated 5.0 out of 5" />
      <span><strong>{reviewStats.rating}</strong> from <span className="dc-count" style={{ '--to': reviewStats.count } as CSSProperties}>{reviewStats.count}</span> Google reviews</span>
    </a>
  )
}

export function ReviewCard({ review, headingLevel = 3 }: { review: Review; headingLevel?: 3 | 4 }) {
  const Heading = headingLevel === 3 ? 'h3' : 'h4'
  return (
    <figure className="dc-review">
      <Stars count={review.stars} label={`${review.stars} out of 5 stars`} />
      <blockquote><p>{review.text}</p></blockquote>
      <figcaption>
        <Heading className="dc-review-name">{review.name}</Heading>
        <span className="dc-review-meta">{review.source} review · {review.year}</span>
      </figcaption>
    </figure>
  )
}

/** Native disclosure widgets: they work without JavaScript and with every
 * screen reader. Questions are not headings because <summary> is a button. */
export function FaqList({ faqs }: { faqs: Faq[] }) {
  return (
    <div className="dc-faqs">
      {faqs.map(faq => (
        <details key={faq.q} className="dc-faq">
          <summary><span className="dc-faq-q">{faq.q}</span></summary>
          <div className="dc-faq-a"><p>{faq.a}</p></div>
        </details>
      ))}
    </div>
  )
}

export function PromiseList({ limit = promises.length }: { limit?: number }) {
  return (
    <ul className="dc-promises">
      {promises.slice(0, limit).map(item => (
        <li key={item.title}><ShieldIcon size={22} /><span><strong>{item.title}</strong> {item.text}</span></li>
      ))}
    </ul>
  )
}

const processSteps = [
  { title: 'Call, text or book online', text: 'Tell us what’s going on. The office confirms a time with you, usually within a day.' },
  { title: 'Same-day estimate', text: 'A licensed plumber looks at the problem and explains what’s causing it.' },
  { title: 'The price before the work', text: 'You get options and an upfront price. Nothing starts until you say yes.' },
  { title: 'Booties on, mess out', text: 'We protect your floors, do the work properly and clean up after ourselves.' },
  { title: 'Covered for a year', text: 'Parts and labor are under warranty for a full year, on top of manufacturer warranties.' },
]

export function ProcessSteps({ headingLevel = 3 }: { headingLevel?: 3 | 4 }) {
  const Heading = headingLevel === 3 ? 'h3' : 'h4'
  return (
    <ol className="dc-process">
      {processSteps.map((step, index) => (
        <li key={step.title} style={{ '--i': index } as CSSProperties}>
          <span className="dc-process-num" aria-hidden="true">{index + 1}</span>
          <Heading>{step.title}</Heading>
          <p>{step.text}</p>
        </li>
      ))}
    </ol>
  )
}

export function ServiceRows({ list = services, headingLevel = 3 }: { list?: Service[]; headingLevel?: 3 | 4 }) {
  const Heading = headingLevel === 3 ? 'h3' : 'h4'
  return (
    <ul className="dc-service-rows">
      {list.map(service => (
        <li key={service.slug}>
          <a href={href(`services/${service.slug}`)}>
            <ServiceIcon slug={service.slug} size={34} />
            <span className="dc-service-row-text">
              <Heading className="dc-service-row-name">{service.name}</Heading>
              <span className="dc-service-row-short">{service.short}</span>
            </span>
            <ArrowIcon size={22} />
          </a>
        </li>
      ))}
    </ul>
  )
}

export function CheckList({ items, columns = 2 }: { items: string[]; columns?: 1 | 2 }) {
  return (
    <ul className={`dc-checklist dc-cols-${columns}`}>
      {items.map(item => <li key={item}><CheckIcon size={20} /><span>{item}</span></li>)}
    </ul>
  )
}

const FILTERS: Array<{ id: string; label: string; tags: ReviewTag[] }> = [
  { id: 'all', label: 'All', tags: [] },
  { id: 'water', label: 'Water heaters', tags: ['water-heaters'] },
  { id: 'drains', label: 'Drains, sewer & sump', tags: ['drain-cleaning', 'sewer-line-repair', 'sump-pumps'] },
  { id: 'leaks', label: 'Leaks, toilets & gas', tags: ['leak-repair', 'toilet-repair', 'gas-lines'] },
  { id: 'projects', label: 'Projects & commercial', tags: ['remodels-new-construction', 'commercial-plumbing', 'radiant-heat-boilers'] },
  { id: 'emergency', label: 'Emergencies', tags: ['emergency'] },
  { id: 'pricing', label: 'Fair pricing', tags: ['pricing'] },
]

export function ReviewBrowser() {
  const [filter, setFilter] = useState('all')
  const active = FILTERS.find(item => item.id === filter)!
  const shown = active.tags.length ? reviews.filter(review => review.tags.some(tag => active.tags.includes(tag))) : reviews
  return (
    <div className="dc-review-browser">
      <div className="dc-filter" role="group" aria-label="Filter reviews by topic">
        {FILTERS.map(item => (
          <button key={item.id} type="button" className="dc-chip" aria-pressed={filter === item.id} onClick={() => setFilter(item.id)}>{item.label}</button>
        ))}
      </div>
      <p className="dc-filter-count" aria-live="polite">Showing {shown.length} of {reviews.length} quoted reviews{active.tags.length ? ` about ${active.label.toLowerCase()}` : ''}.</p>
      <div className="dc-review-grid">
        {shown.map(review => <ReviewCard key={review.name + review.year} review={review} />)}
      </div>
    </div>
  )
}
