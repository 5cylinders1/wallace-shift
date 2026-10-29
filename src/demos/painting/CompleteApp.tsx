import { useCallback, useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import Header, { Wordmark } from './Header'
import Hero from './Hero'
import ColorStudio from './visualizer/ColorStudio'
import EstimateForm from './estimate/EstimateForm'
import { business, faqs, process, services } from './content'

gsap.registerPlugin(ScrollTrigger, useGSAP)

/** FAQPage data built from the same answers the page shows, so the two can't drift. */
const faqSchema = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map(({ q, a }) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
})

function Proof() {
  const items = [
    { value: `${business.experienceYears} years`, label: 'of painting experience' },
    { value: 'Inside & out', label: 'homes and businesses' },
    { value: 'Rotten wood', label: 'removed and replaced' },
    { value: '7 days', label: 'weekdays 8–5, weekends 8–noon' },
  ]
  return (
    <section className="cp-proof" aria-label="At a glance">
      <ul className="cp-proof-inner">
        {items.map((item) => (
          <li key={item.value} className="cp-reveal">
            <strong>{item.value}</strong>
            <span>{item.label}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function Services() {
  return (
    <section id="services" className="cp-section cp-services" aria-labelledby="cp-services-title">
      <div className="cp-section-head cp-reveal">
        <p className="cp-eyebrow">Services</p>
        <h2 id="cp-services-title">One crew for the <em>whole</em> job.</h2>
        <p>Prep, repairs and paint handled together, so nothing falls between trades.</p>
      </div>
      <div className="cp-service-list">
        {services.map((service, index) => (
          <article key={service.id} className="cp-service cp-reveal">
            <div className="cp-service-media">
              <img
                src={service.image.src}
                srcSet={`${service.image.src.replace('.webp', '-small.webp')} 720w, ${service.image.src} 1200w`}
                sizes="(max-width: 760px) 100vw, 44vw"
                alt={service.image.alt}
                width={1200}
                height={800}
                loading="lazy"
                decoding="async"
              />
            </div>
            <div className="cp-service-copy">
              <p className="cp-service-index">0{index + 1}</p>
              <h3>{service.title}</h3>
              <p>{service.body}</p>
              <ul>{service.points.map((point) => <li key={point}>{point}</li>)}</ul>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function Process() {
  return (
    <section id="process" className="cp-section cp-process" aria-labelledby="cp-process-title">
      <div className="cp-process-inner">
        <div className="cp-section-head cp-reveal">
          <p className="cp-eyebrow">Process</p>
          <h2 id="cp-process-title">What a full repaint <em>involves.</em></h2>
          <p>The same steps you watched at the top of the page, in order.</p>
        </div>
        <ol className="cp-steps">
          {process.map((step, index) => (
            <li key={step.title} className="cp-reveal">
              <span className="cp-step-index">0{index + 1}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

function About() {
  return (
    <section id="about" className="cp-section cp-about" aria-labelledby="cp-about-title">
      <div className="cp-about-inner">
        <div className="cp-about-media cp-reveal">
          <img src="/demos/painting/service-carpentry.webp" alt="New primed fascia and corner trim beside freshly painted blue-green siding" loading="lazy" decoding="async" width={1200} height={800} />
        </div>
        <div className="cp-about-copy cp-reveal">
          <p className="cp-eyebrow">About</p>
          <h2 id="cp-about-title">{business.experienceYears} years with a brush. <em>Complete</em> on every job.</h2>
          <p>
            Complete Painting is a local painting company in {business.home}, registered as an LLC in {business.registered} and built on {business.experienceYears} years of painting experience.
          </p>
          <p>
            The mission is simple: reliable, high-quality painting for every client, done with integrity and professionalism, and not finished until you’re satisfied.
          </p>
          <dl className="cp-hours">
            {business.hours.map((row) => (
              <div key={row.days}>
                <dt>{row.days}</dt>
                <dd>{row.time}</dd>
              </div>
            ))}
          </dl>
          <div className="cp-about-actions">
            <a className="cp-button cp-button-ink" href="#estimate">Request an estimate</a>
            <a className="cp-button cp-button-line" href={business.smsHref}>Text us</a>
          </div>
        </div>
      </div>
    </section>
  )
}

function Faq() {
  return (
    <section id="faq" className="cp-section cp-faq" aria-labelledby="cp-faq-title">
      <div className="cp-faq-inner">
        <div className="cp-section-head cp-reveal">
          <p className="cp-eyebrow">Questions</p>
          <h2 id="cp-faq-title">Good to know.</h2>
          <p>Serving {business.area}.</p>
        </div>
        <div className="cp-faq-list">
          {faqs.map(({ q, a }) => (
            <details key={q} className="cp-reveal">
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
    <section className="cp-closing" aria-labelledby="cp-closing-title">
      <picture>
        <source media="(max-width: 760px)" srcSet="/demos/painting/hero-finished-mobile.webp" />
        <img src="/demos/painting/hero-finished.webp" alt="" loading="lazy" decoding="async" />
      </picture>
      <div className="cp-closing-inner cp-reveal">
        <h2 id="cp-closing-title">Ready to see your house <em>complete?</em></h2>
        <p>Tell us what needs painting, or call and talk it through.</p>
        <div className="cp-hero-actions">
          <a className="cp-button cp-button-ochre" href="#estimate">Request an estimate</a>
          <a className="cp-button cp-button-glass" href={business.phoneHref}>Call {business.phone}</a>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="cp-footer">
      <div className="cp-footer-inner">
        <div className="cp-footer-brand">
          <Wordmark />
          <p>Exterior and interior painting, cabinet refinishing and rotten wood repair around {business.home}.</p>
        </div>
        <address className="cp-footer-contact">
          <a href={business.phoneHref}>{business.phone}</a>
          <a href={`mailto:${business.email}`}>{business.email}</a>
          <a href={business.facebook} target="_blank" rel="noreferrer">Facebook ↗</a>
        </address>
        <nav className="cp-footer-nav" aria-label="Footer">
          <a href="#services">Services</a>
          <a href="#studio">Color studio</a>
          <a href="#process">Process</a>
          <a href="#about">About</a>
          <a href="#estimate">Estimate</a>
        </nav>
      </div>
      <p className="cp-footer-fine">
        © {new Date().getFullYear()} {business.name}. A website concept prepared for {business.name} by <a href="https://wallaceshift.com" target="_blank" rel="noreferrer">Wallace Shift</a>. House and room photographs are generated illustrations, not photos of a client’s property. Color previews are made by OpenAI from photos visitors choose to send.
      </p>
    </footer>
  )
}

/** Phones only (CSS), and only once the hero, which has its own actions, has scrolled by. */
function StickyBar() {
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const after = document.querySelector('.cp-proof')
    if (!after) return
    const observer = new IntersectionObserver(([entry]) => setShown(entry.isIntersecting || entry.boundingClientRect.top < 0))
    observer.observe(after)
    return () => observer.disconnect()
  }, [])
  return (
    <div className={`cp-sticky${shown ? ' is-shown' : ''}`} role="region" aria-label="Quick contact" inert={!shown}>
      <a className="cp-button cp-button-ochre" href="#estimate">Request an estimate</a>
      <a className="cp-sticky-icon" href={business.phoneHref} aria-label={`Call ${business.phone}`}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.6 3.5 9 3l1.6 4.2-1.9 1.4a11.5 11.5 0 0 0 6.7 6.7l1.4-1.9L21 15l-.5 2.4a2.4 2.4 0 0 1-2.6 1.9C10.3 18.6 5.4 13.7 4.7 6.1a2.4 2.4 0 0 1 1.9-2.6Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg>
      </a>
      <a className="cp-sticky-icon" href={business.smsHref} aria-label={`Text ${business.phone}`}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v11H9l-5 4V5Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg>
      </a>
    </div>
  )
}

export default function CompleteApp() {
  const root = useRef<HTMLDivElement>(null)
  const [colors, setColors] = useState('')

  useGSAP(() => {
    const media = gsap.matchMedia()
    media.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.utils.toArray<HTMLElement>('.cp-reveal').forEach((element) => {
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

  const applyColors = useCallback((text: string) => {
    setColors(text)
    document.getElementById('estimate')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  }, [])

  return (
    <div ref={root} id="top" className="cp-app">
      <Header />
      <main id="main">
        <Hero />
        <Proof />
        <Services />
        <section id="studio" className="cp-section cp-studio-section" aria-labelledby="cp-studio-title">
          <div className="cp-section-head cp-reveal">
            <p className="cp-eyebrow">Color studio</p>
            <h2 id="cp-studio-title">See your house in a new color <em>before the first coat.</em></h2>
            <p>Upload a photo of your house, pick siding, trim and door colors, and get a realistic preview in about a minute. Or try the sample house first.</p>
          </div>
          <div className="cp-reveal">
            <ColorStudio onUseColors={applyColors} />
          </div>
        </section>
        <Process />
        <About />
        <section id="estimate" className="cp-section cp-estimate" aria-labelledby="cp-estimate-title">
          <div className="cp-estimate-inner">
            <div className="cp-section-head cp-reveal">
              <p className="cp-eyebrow">Estimate</p>
              <h2 id="cp-estimate-title">Tell us about <em>the job.</em></h2>
              <p>A few details and we’ll be in touch to set up a time to look at it with you.</p>
              <ul className="cp-estimate-contact">
                <li><span>Call or text</span><a href={business.phoneHref}>{business.phone}</a></li>
                <li><span>Email</span><a href={`mailto:${business.email}`}>{business.email}</a></li>
              </ul>
            </div>
            <div className="cp-reveal">
              <EstimateForm colors={colors} onClearColors={() => setColors('')} />
            </div>
          </div>
        </section>
        <Faq />
        <Closing />
      </main>
      <Footer />
      <StickyBar />
    </div>
  )
}
