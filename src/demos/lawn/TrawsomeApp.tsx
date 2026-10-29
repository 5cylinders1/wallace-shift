import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import Header, { Wordmark } from './Header'
import Hero, { FaveMark } from './Hero'
import Estimator from './estimate/Estimator'
import { business, faqs, neighborThemes, services, serviceTowns } from './content'

gsap.registerPlugin(ScrollTrigger, useGSAP)

/** FAQPage data built from the same answers the page shows, so the two can't drift. */
const faqSchema = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map(({ q, a }) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
})

const years = business.faveYears

function Proof() {
  return (
    <section className="tw-proof" aria-label="Why neighbors choose Trawsome">
      <div className="tw-proof-inner">
        <div className="tw-proof-item">
          <FaveMark />
          <p><strong>Neighborhood Favorite</strong>Voted on Nextdoor in {years.slice(0, -1).join(', ')} and {years[years.length - 1]}</p>
        </div>
        <div className="tw-proof-item">
          <svg className="tw-proof-icon" viewBox="0 0 40 40" aria-hidden="true"><path d="M20 4 7 9v10c0 8.4 5.6 14.6 13 17 7.4-2.4 13-8.6 13-17V9L20 4Z" fill="none" stroke="currentColor" strokeWidth="1.4" /><path d="m14 20 4.2 4.2L27 15.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <p><strong>Satisfaction guaranteed</strong>Not happy? Ben will make it right.</p>
        </div>
        <div className="tw-proof-item">
          <svg className="tw-proof-icon" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="14" r="6" fill="none" stroke="currentColor" strokeWidth="1.4" /><path d="M8 34c1.6-6.6 6.2-10 12-10s10.4 3.4 12 10" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
          <p><strong>Local &amp; owner-run</strong>Ben Traw, a local college student</p>
        </div>
      </div>
    </section>
  )
}

function Services() {
  return (
    <section id="services" className="tw-section tw-services" aria-labelledby="tw-services-title">
      <div className="tw-section-head tw-reveal">
        <p className="tw-eyebrow">Services</p>
        <h2 id="tw-services-title">Everything your yard needs, <em>done right.</em></h2>
        <p>Whatever lawn service you need, Ben enjoys making it look Trawsome.</p>
      </div>
      <div className="tw-service-list">
        {services.map((service, index) => (
          <article key={service.id} className={`tw-service tw-reveal${service.image ? '' : ' is-text'}`}>
            {service.image && (
              <div className="tw-service-media">
                <img
                  src={service.image.src}
                  srcSet={`${service.image.src.replace('.webp', '-small.webp')} 720w, ${service.image.src} 1200w`}
                  sizes="(max-width: 760px) 100vw, 46vw"
                  alt={service.image.alt}
                  width={1200}
                  height={800}
                  loading="lazy"
                  decoding="async"
                />
              </div>
            )}
            <div className="tw-service-copy">
              <p className="tw-service-index">0{index + 1}</p>
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

function About() {
  return (
    <section id="about" className="tw-section tw-about" aria-labelledby="tw-about-title">
      <div className="tw-about-inner">
        <div className="tw-about-mark tw-reveal" aria-hidden="true">
          <span>BT</span>
        </div>
        <div className="tw-about-copy tw-reveal">
          <p className="tw-eyebrow">Meet your lawn guy</p>
          <h2 id="tw-about-title">Hi, I’m Ben.</h2>
          <blockquote>
            <p>“Whether it’s mowing, trimming, seeding, fertilizing, shrub trimming, tree limb and leaf removal, or blowing off porches and driveways, I enjoy making lawns look Trawsome.”</p>
          </blockquote>
          <p>Ben Traw is a local college student. Running Trawsome lets him pursue his education and save for the future, one well-kept yard at a time.</p>
          <p className="tw-about-guarantee"><strong>His guarantee:</strong> “I personally guarantee your satisfaction with my work. If you’re not happy, I’ll make it right.”</p>
          <div className="tw-about-actions">
            <a className="tw-button tw-button-ink" href="#estimate">Get my instant price</a>
            <a className="tw-button tw-button-line" href={business.smsHref}>Text Ben</a>
          </div>
        </div>
      </div>
    </section>
  )
}

function Neighbors() {
  return (
    <section className="tw-section tw-neighbors" aria-labelledby="tw-neighbors-title">
      <div className="tw-section-head tw-reveal">
        <p className="tw-eyebrow">On Nextdoor</p>
        <h2 id="tw-neighbors-title">What neighbors say.</h2>
        <p>Highlights from Nextdoor’s summary of neighbor recommendations, and a Neighborhood Favorite four years running.</p>
      </div>
      <ul className="tw-themes">
        {neighborThemes.map((theme) => (
          <li key={theme.title} className="tw-reveal">
            <h3>{theme.title}</h3>
            <p>{theme.body}</p>
          </li>
        ))}
      </ul>
      <p className="tw-neighbors-link tw-reveal">
        <a href={business.nextdoor} target="_blank" rel="noreferrer">Read recommendations on Nextdoor ↗</a>
      </p>
    </section>
  )
}

function Faq() {
  return (
    <section id="faq" className="tw-section tw-faq" aria-labelledby="tw-faq-title">
      <div className="tw-faq-inner">
        <div className="tw-section-head tw-reveal">
          <p className="tw-eyebrow">Questions</p>
          <h2 id="tw-faq-title">Good to know.</h2>
          <p>Serving {serviceTowns.slice(0, -1).join(', ')} and {serviceTowns[serviceTowns.length - 1]}, Kansas.</p>
        </div>
        <div className="tw-faq-list">
          {faqs.map(({ q, a }) => (
            <details key={q} className="tw-reveal">
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
    <section className="tw-closing" aria-labelledby="tw-closing-title">
      <picture>
        <source media="(max-width: 760px)" srcSet="/demos/lawn/hero-finished-mobile.webp" />
        <img src="/demos/lawn/hero-finished.webp" alt="" loading="lazy" decoding="async" />
      </picture>
      <div className="tw-closing-inner tw-reveal">
        <h2 id="tw-closing-title">Ready for a lawn that looks <em>Trawsome?</em></h2>
        <p>Get your price in under a minute, or reach Ben directly.</p>
        <div className="tw-hero-actions">
          <a className="tw-button tw-button-lime" href="#estimate">Get my instant price</a>
          <a className="tw-button tw-button-ghost" href={business.phoneHref}>Call {business.phone}</a>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="tw-footer">
      <div className="tw-footer-inner">
        <div className="tw-footer-brand">
          <Wordmark />
          <p>Lawn mowing, trimming and seasonal cleanups around {business.home}.</p>
        </div>
        <address className="tw-footer-contact">
          <span>{business.ownerFull}</span>
          <a href={business.phoneHref}>{business.phone}</a>
          <a href={`mailto:${business.email}`}>{business.email}</a>
          <a href={business.nextdoor} target="_blank" rel="noreferrer">Nextdoor ↗</a>
        </address>
        <nav className="tw-footer-nav" aria-label="Footer">
          <a href="#estimate">Instant price</a>
          <a href="#services">Services</a>
          <a href="#about">About Ben</a>
          <a href="#faq">FAQ</a>
        </nav>
      </div>
      <p className="tw-footer-fine">
        A website concept prepared for {business.name} by <a href="https://wallaceshift.com" target="_blank" rel="noreferrer">Wallace Shift</a>. Yard photographs are generated illustrations, not photos of a client’s property. Lawn measurements use public USDA aerial imagery.
      </p>
    </footer>
  )
}

/** Phones only (CSS), and only once the hero, which has its own actions, has scrolled by. */
function StickyBar() {
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const after = document.querySelector('.tw-proof')
    if (!after) return
    const observer = new IntersectionObserver(([entry]) => setShown(entry.isIntersecting || entry.boundingClientRect.top < 0))
    observer.observe(after)
    return () => observer.disconnect()
  }, [])
  return (
    <div className={`tw-sticky${shown ? ' is-shown' : ''}`} role="region" aria-label="Quick contact" inert={!shown}>
      <a className="tw-button tw-button-lime" href="#estimate">Get my price</a>
      <a className="tw-sticky-call" href={business.phoneHref} aria-label={`Call ${business.phone}`}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.6 3.5 9 3l1.6 4.2-1.9 1.4a11.5 11.5 0 0 0 6.7 6.7l1.4-1.9L21 15l-.5 2.4a2.4 2.4 0 0 1-2.6 1.9C10.3 18.6 5.4 13.7 4.7 6.1a2.4 2.4 0 0 1 1.9-2.6Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg>
      </a>
      <a className="tw-sticky-call" href={business.smsHref} aria-label={`Text ${business.phone}`}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v11H9l-5 4V5Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg>
      </a>
    </div>
  )
}

export default function TrawsomeApp() {
  const root = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    const media = gsap.matchMedia()
    media.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.utils.toArray<HTMLElement>('.tw-reveal').forEach((element) => {
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
    <div ref={root} id="top" className="tw-app">
      <Header />
      <main id="main">
        <Hero />
        <Proof />
        <section id="estimate" className="tw-section tw-estimate" aria-labelledby="tw-estimate-title">
          <div className="tw-section-head tw-reveal">
            <p className="tw-eyebrow">Instant price</p>
            <h2 id="tw-estimate-title">Your lawn, priced <em>in a minute.</em></h2>
            <p>Enter your address. We find the grass on your lot from above, you fine-tune it, and the price updates as you go.</p>
          </div>
          <Estimator />
        </section>
        <Services />
        <About />
        <Neighbors />
        <Faq />
        <Closing />
      </main>
      <Footer />
      <StickyBar />
    </div>
  )
}
