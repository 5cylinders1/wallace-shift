import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import Header, { Wordmark } from './Header'
import Hero, { Stars } from './Hero'
import Estimator from './estimate/Estimator'
import ProjectFilm from './ProjectFilm'
import { business, faqs, reviews, services, warranties, work } from './content'

gsap.registerPlugin(ScrollTrigger, useGSAP)

/** FAQPage data built from the same answers the page shows, so the two can't drift. */
const faqSchema = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map(({ q, a }) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
})

function Proof() {
  return (
    <section className="ll-proof" aria-label={`Why homeowners choose ${business.shortName}`}>
      <div className="ll-proof-inner">
        <div className="ll-proof-item">
          <Stars />
          <p><strong>{business.rating.toFixed(1)} on Google</strong>Across {business.reviewCount} Google reviews</p>
        </div>
        <div className="ll-proof-item">
          <svg className="ll-proof-icon" viewBox="0 0 40 40" aria-hidden="true"><path d="M20 4 7 9v10c0 8.4 5.6 14.6 13 17 7.4-2.4 13-8.6 13-17V9L20 4Z" fill="none" stroke="currentColor" strokeWidth="1.4" /><path d="m14 20 4.2 4.2L27 15.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <p><strong>5-year hardscape warranty</strong>Settling or defects repaired at no cost</p>
        </div>
        <div className="ll-proof-item">
          <svg className="ll-proof-icon" viewBox="0 0 40 40" aria-hidden="true"><path d="M6 33h28M9 33V19l11-9 11 9v14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" /><path d="M16 33v-8h8v8" fill="none" stroke="currentColor" strokeWidth="1.4" /></svg>
          <p><strong>No-cost consultation</strong>Tell us what you have in mind</p>
        </div>
      </div>
    </section>
  )
}

function Services() {
  return (
    <section id="services" className="ll-section ll-services" aria-labelledby="ll-services-title">
      <div className="ll-section-head ll-reveal">
        <p className="ll-eyebrow">Services</p>
        <h2 id="ll-services-title">Everything outside, <em>designed as one.</em></h2>
        <p>We take a project from the first idea through design to the finished installation and walkthrough, for any size budget.</p>
      </div>
      <div className="ll-service-list">
        {services.map((service, index) => (
          <article key={service.id} className={`ll-service ll-reveal${service.image ? '' : ' is-text'}`}>
            {service.image && (
              <div className="ll-service-media">
                <img
                  src={service.image.src}
                  srcSet={`${service.image.src.replace('.webp', '-small.webp')} 720w, ${service.image.src} ${service.image.width}w`}
                  sizes="(max-width: 760px) 100vw, 46vw"
                  alt={service.image.alt}
                  width={service.image.width}
                  height={service.image.height}
                  loading="lazy"
                  decoding="async"
                />
              </div>
            )}
            <div className="ll-service-copy">
              <p className="ll-service-index">0{index + 1}</p>
              <h3>{service.title}</h3>
              <p>{service.body}</p>
              <ul>{service.items.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function Work() {
  return (
    <section id="work" className="ll-section ll-work" aria-labelledby="ll-work-title">
      <div className="ll-section-head ll-reveal">
        <p className="ll-eyebrow">Our work</p>
        <h2 id="ll-work-title">Projects big and small, <em>across the metro.</em></h2>
        <p>Patios, kitchens, fire features and gardens we’ve built for homeowners around Kansas City.</p>
      </div>
      <ProjectFilm />
      <ul className="ll-work-grid">
        {work.map((item) => (
          <li key={item.src} className={`ll-reveal${item.wide ? ' is-wide' : ''}`}>
            <img
              src={item.src}
              srcSet={`${item.small} 600w, ${item.src} 1000w`}
              sizes={item.wide ? '(max-width: 760px) 100vw, 66vw' : '(max-width: 760px) 100vw, 33vw'}
              alt={item.alt}
              width={1000}
              height={667}
              loading="lazy"
              decoding="async"
            />
          </li>
        ))}
      </ul>
      <p className="ll-more-link ll-reveal">
        <a href={business.instagram} target="_blank" rel="noreferrer">More projects on Instagram ↗</a>
      </p>
    </section>
  )
}

function About() {
  return (
    <section id="about" className="ll-section ll-about" aria-labelledby="ll-about-title">
      <div className="ll-about-inner">
        <figure className="ll-about-media ll-reveal">
          <img src="/demos/lawn/about.webp" alt="Two of the Lareau crew setting a large planter bowl on a new patio" width={1280} height={720} loading="lazy" decoding="async" />
        </figure>
        <div className="ll-about-copy ll-reveal">
          <p className="ll-eyebrow">The Lareau difference</p>
          <h2 id="ll-about-title">A family business, <em>since {business.founded}.</em></h2>
          <p>Bob Lareau earned his horticulture degree at K-State in 1978 and spent 19 years in the nursery and landscape industry. Lareau Landscape &amp; Design has been a family business since {business.founded}: his sons, Taylor and Hunter, worked beside him part time from middle school and joined full time in 2009 and 2012.</p>
          <p>Today the team brings a combined 55+ years of experience, with several members certified by both the Interlocking Concrete Pavement Institute (ICPI) and the National Concrete Masonry Association (NCMA).</p>
          <blockquote>
            <p>“We believe in our ability to install lasting hardscape which is why we put such a long warranty on them.”</p>
          </blockquote>
          <dl className="ll-warranties">
            {warranties.map((item) => (
              <div key={item.label}>
                <dt><strong>{item.term}</strong>{item.label}</dt>
                <dd>{item.body}</dd>
              </div>
            ))}
          </dl>
          <div className="ll-about-actions">
            <a className="ll-button ll-button-ink" href="#plan">Plan my project</a>
            <a className="ll-button ll-button-line" href={`mailto:${business.email}`}>Email us</a>
          </div>
        </div>
      </div>
    </section>
  )
}

function Reviews() {
  return (
    <section id="reviews" className="ll-section ll-reviews" aria-labelledby="ll-reviews-title">
      <div className="ll-section-head ll-reveal">
        <p className="ll-eyebrow">Reviews</p>
        <h2 id="ll-reviews-title">{business.rating.toFixed(1)} on Google. <em>In their words.</em></h2>
        <p>Rated five stars by all {business.reviewCount} Google reviewers. These are the reviews with something to say, quoted as written.</p>
      </div>
      <ul className="ll-review-list">
        {reviews.map((review) => (
          <li key={review.name} className="ll-review ll-reveal">
            <figure>
              {review.source === 'Google' ? <Stars /> : <p className="ll-review-source">From lareaulandscape.com</p>}
              <blockquote>
                <p className="ll-review-highlight">“{review.highlight}”</p>
                <p>{review.text}</p>
              </blockquote>
              <figcaption><strong>{review.name}</strong>{review.source === 'Google' ? 'Google review' : 'Testimonial'}</figcaption>
            </figure>
          </li>
        ))}
      </ul>
      <p className="ll-more-link ll-reveal">
        <a href={business.google} target="_blank" rel="noreferrer">Read every review on Google ↗</a>
      </p>
    </section>
  )
}

function Faq() {
  return (
    <section id="faq" className="ll-section ll-faq" aria-labelledby="ll-faq-title">
      <div className="ll-faq-inner">
        <div className="ll-section-head ll-reveal">
          <p className="ll-eyebrow">Questions</p>
          <h2 id="ll-faq-title">Good to know.</h2>
          <p>Serving homes across {business.area} from {business.home}.</p>
        </div>
        <div className="ll-faq-list">
          {faqs.map(({ q, a }) => (
            <details key={q} className="ll-reveal">
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: faqSchema }} />
    </section>
  )
}

function Closing() {
  return (
    <section className="ll-closing" aria-labelledby="ll-closing-title">
      <picture>
        <source media="(max-width: 760px)" srcSet="/demos/lawn/closing-mobile.webp" />
        <img src="/demos/lawn/closing.webp" alt="" loading="lazy" decoding="async" />
      </picture>
      <div className="ll-closing-inner ll-reveal">
        <h2 id="ll-closing-title">Ready for the backyard <em>you’ve been picturing?</em></h2>
        <p>Start with a no-cost consultation. Plan it on your yard here, or give us a call.</p>
        <div className="ll-hero-actions">
          <a className="ll-button ll-button-green" href="#plan">Plan my project</a>
          <a className="ll-button ll-button-ghost" href={business.phoneHref}>Call {business.phone}</a>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="ll-footer">
      <div className="ll-footer-inner">
        <div className="ll-footer-brand">
          <Wordmark />
          <p>Landscape design and installation across {business.area}, family-owned since {business.founded}.</p>
        </div>
        <address className="ll-footer-contact">
          <span>{business.home}</span>
          <a href={business.phoneHref}>{business.phone}</a>
          <a href={`mailto:${business.email}`}>{business.email}</a>
          <span className="ll-footer-hours">{business.hoursShort}</span>
          <a href={business.instagram} target="_blank" rel="noreferrer">Instagram ↗</a>
          <a href={business.google} target="_blank" rel="noreferrer">Google reviews ↗</a>
        </address>
        <nav className="ll-footer-nav" aria-label="Footer">
          <a href="#plan">Plan your project</a>
          <a href="#services">Services</a>
          <a href="#work">Our work</a>
          <a href="#about">About</a>
          <a href="#reviews">Reviews</a>
          <a href="#faq">FAQ</a>
        </nav>
      </div>
      <p className="ll-footer-fine">
        © {new Date().getFullYear()} {business.name}. Website concept: the hero yard is a generated illustration; the other photos and the film are the company’s own, from lareaulandscape.com. Lawn measurements use public USDA aerial imagery.
      </p>
    </footer>
  )
}

/** Phones only (CSS), and only once the hero, which has its own actions, has scrolled by. */
function StickyBar() {
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const after = document.querySelector('.ll-proof')
    if (!after) return
    // Read the latest entry: during load one batch can hold a stale "visible" entry before the hero has its full height.
    // The root is shrunk by a pixel because a full-height hero leaves the proof bar edge-adjacent, which counts as intersecting.
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[entries.length - 1]
      setShown(entry.isIntersecting || entry.boundingClientRect.top < 0)
    }, { rootMargin: '0px 0px -1px 0px' })
    observer.observe(after)
    return () => observer.disconnect()
  }, [])
  return (
    <div className={`ll-sticky${shown ? ' is-shown' : ''}`} role="region" aria-label="Quick contact" inert={!shown}>
      <a className="ll-button ll-button-green" href="#plan">Plan my project</a>
      <a className="ll-sticky-call" href={business.phoneHref} aria-label={`Call ${business.phone}`}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.6 3.5 9 3l1.6 4.2-1.9 1.4a11.5 11.5 0 0 0 6.7 6.7l1.4-1.9L21 15l-.5 2.4a2.4 2.4 0 0 1-2.6 1.9C10.3 18.6 5.4 13.7 4.7 6.1a2.4 2.4 0 0 1 1.9-2.6Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg>
      </a>
      <a className="ll-sticky-call" href={`mailto:${business.email}`} aria-label={`Email ${business.email}`}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 6h17v12h-17zM3.5 6.5l8.5 6.5 8.5-6.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg>
      </a>
    </div>
  )
}

export default function LareauApp() {
  const root = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    const media = gsap.matchMedia()
    media.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.utils.toArray<HTMLElement>('.ll-reveal').forEach((element) => {
        gsap.from(element, {
          autoAlpha: 0,
          y: 22,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: { trigger: element, start: 'top 88%', once: true },
        })
      })
    })
    return () => media.revert()
  }, { scope: root })

  return (
    <div ref={root} id="top" className="ll-app">
      <Header />
      <main id="main">
        <Hero />
        <Proof />
        <section id="plan" className="ll-section ll-estimate" aria-labelledby="ll-plan-title">
          <div className="ll-section-head ll-reveal">
            <p className="ll-eyebrow">Free consultation</p>
            <h2 id="ll-plan-title">Plan your project <em>on your own yard.</em></h2>
            <p>Enter your address. We pull up your property from above and measure the lawn, you pick what you’re planning, and we follow up to set up a no-cost consultation.</p>
          </div>
          <Estimator />
        </section>
        <Services />
        <Work />
        <About />
        <Reviews />
        <Faq />
        <Closing />
      </main>
      <Footer />
      <StickyBar />
    </div>
  )
}
