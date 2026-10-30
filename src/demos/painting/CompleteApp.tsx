import { useCallback, useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import Header, { Wordmark } from './Header'
import Hero from './Hero'
import Services from './Services'
import Process from './Process'
import ColorStudio from './visualizer/ColorStudio'
import EstimateForm from './estimate/EstimateForm'
import { business, faqs } from './content'
import { prefersMotion } from './motion'

gsap.registerPlugin(ScrollTrigger, useGSAP)

/** FAQPage data built from the same answers the page shows, so the two can't drift. */
const faqSchema = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map(({ q, a }) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
})

/**
 * The first section after the hero. While the hero is pinned it slides up
 * over the finished house like a sheet laid on top, and its title assembles
 * out of the depth behind it.
 */
function Statement() {
  const items = [
    { value: `${business.experienceYears} years`, label: 'of painting experience' },
    { value: 'Inside & out', label: 'homes and businesses' },
    { value: 'Rotten wood', label: 'removed and replaced' },
    { value: '7 days', label: 'weekdays 8–5, weekends 8–noon' },
  ]
  return (
    <section className="cp-sheet" aria-labelledby="cp-sheet-title">
      <div className="cp-sheet-inner">
        <p className="cp-eyebrow" data-near>{business.name}</p>
        <h2 id="cp-sheet-title" className="cp-sheet-title">
          <span data-line>Every good coat</span>{' '}
          <span data-line>starts with the work</span>{' '}
          <span data-line><em>you don’t see.</em></span>
        </h2>
        <p className="cp-sheet-lede" data-near>
          Washing, scraping, rot repair and primer are what let paint last. Complete Painting handles all of it, with {business.experienceYears} years of experience behind every job.
        </p>
        <ul className="cp-proof" aria-label="At a glance">
          {items.map((item) => (
            <li key={item.value} data-near>
              <strong>{item.value}</strong>
              <span>{item.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function About() {
  return (
    <section id="about" className="cp-section cp-about" aria-labelledby="cp-about-title">
      <div className="cp-about-inner">
        <div className="cp-about-media" data-pass>
          <img src="/demos/painting/service-carpentry.webp" alt="New primed fascia and corner trim beside freshly painted blue-green siding" loading="lazy" decoding="async" width={1200} height={800} />
        </div>
        <div className="cp-about-copy">
          <p className="cp-eyebrow" data-near>About</p>
          <h2 id="cp-about-title" data-near>{business.experienceYears} years with a brush. <em>Complete</em> on every job.</h2>
          <p data-near>
            Complete Painting is a local painting company in {business.home}, registered as an LLC in {business.registered} and built on {business.experienceYears} years of painting experience.
          </p>
          <p data-near>
            The mission is simple: reliable, high-quality painting for every client, done with integrity and professionalism, and not finished until you’re satisfied.
          </p>
          <dl className="cp-hours" data-near>
            {business.hours.map((row) => (
              <div key={row.days}>
                <dt>{row.days}</dt>
                <dd>{row.time}</dd>
              </div>
            ))}
          </dl>
          <div className="cp-about-actions" data-near>
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
        <div className="cp-section-head">
          <p className="cp-eyebrow" data-near>Questions</p>
          <h2 id="cp-faq-title" data-near>Good to know.</h2>
          <p data-near>Serving {business.area}.</p>
        </div>
        <div className="cp-faq-list">
          {faqs.map(({ q, a }) => (
            <details key={q} data-unfold>
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
      <picture className="cp-closing-media">
        <source media="(max-width: 760px)" srcSet="/demos/painting/hero-surround-mobile.webp" />
        <img src="/demos/painting/hero-surround.webp" alt="" loading="lazy" decoding="async" />
      </picture>
      <div className="cp-closing-inner">
        <h2 id="cp-closing-title" data-near>Ready to see your house <em>complete?</em></h2>
        <p data-near>Tell us what needs painting, or call and talk it through.</p>
        <div className="cp-hero-actions" data-near>
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

  // The rest of the walk-through: text arrives out of the depth, big panels
  // tip up off the floor, pictures turn as you pass them. The hero, services
  // and process scenes run their own pinned timelines.
  useGSAP(() => {
    const media = gsap.matchMedia()
    media.add(prefersMotion, () => {
      gsap.fromTo('.cp-sheet-title [data-line]',
        { autoAlpha: 0, z: -420, yPercent: 50, rotationX: -18, transformPerspective: 900, transformOrigin: '50% 100%' },
        { autoAlpha: 1, z: 0, yPercent: 0, rotationX: 0, stagger: 0.14, ease: 'power2.out', scrollTrigger: { trigger: '.cp-sheet', start: 'top 92%', end: 'top 18%', scrub: 0.6 } })

      gsap.utils.toArray<HTMLElement>('[data-near]').forEach((element) => {
        const group = element.parentElement ? Array.from(element.parentElement.children).filter((child) => child.hasAttribute('data-near')) : []
        gsap.from(element, {
          autoAlpha: 0,
          z: -240,
          y: 26,
          transformPerspective: 900,
          duration: 1,
          delay: Math.max(0, group.indexOf(element)) * 0.08,
          ease: 'power3.out',
          clearProps: 'transform',
          scrollTrigger: { trigger: element, start: 'top 90%', once: true },
        })
      })

      gsap.utils.toArray<HTMLElement>('[data-rise]').forEach((element) => {
        gsap.fromTo(element,
          { autoAlpha: 0.15, rotationX: 22, z: -220, y: 70, transformPerspective: 1600, transformOrigin: '50% 100%' },
          { autoAlpha: 1, rotationX: 0, z: 0, y: 0, ease: 'none', scrollTrigger: { trigger: element, start: 'top bottom', end: 'top 45%', scrub: 0.5 } })
      })

      gsap.utils.toArray<HTMLElement>('[data-pass]').forEach((element) => {
        gsap.fromTo(element,
          { rotationY: 16, z: -160, transformPerspective: 1200 },
          { rotationY: -8, z: 0, ease: 'none', scrollTrigger: { trigger: element, start: 'top bottom', end: 'bottom 30%', scrub: 0.5 } })
      })

      gsap.utils.toArray<HTMLElement>('[data-unfold]').forEach((element, index) => {
        gsap.from(element, {
          autoAlpha: 0,
          rotationX: -75,
          transformPerspective: 800,
          transformOrigin: '50% 0%',
          duration: 0.9,
          delay: (index % 6) * 0.06,
          ease: 'power3.out',
          clearProps: 'transform',
          scrollTrigger: { trigger: element, start: 'top 92%', once: true },
        })
      })

      // A last look at the house: the camera eases back from the front door.
      gsap.fromTo('.cp-closing-media img', { scale: 1.32, yPercent: 6 }, { scale: 1, yPercent: 0, ease: 'none', scrollTrigger: { trigger: '.cp-closing', start: 'top bottom', end: 'bottom bottom', scrub: 0.6 } })
    })
    // Web fonts change heading heights, and with them every pinned scene's position.
    document.fonts?.ready.then(() => ScrollTrigger.refresh())
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
        <Statement />
        <Services />
        <section id="studio" className="cp-section cp-studio-section" aria-labelledby="cp-studio-title">
          <div className="cp-section-head">
            <p className="cp-eyebrow" data-near>Color studio</p>
            <h2 id="cp-studio-title" data-near>See your house in a new color <em>before the first coat.</em></h2>
            <p data-near>Upload a photo of your house, pick siding, trim and door colors, and get a realistic preview in about a minute. Or try the sample house first.</p>
          </div>
          <div data-rise>
            <ColorStudio onUseColors={applyColors} />
          </div>
        </section>
        <Process />
        <About />
        <section id="estimate" className="cp-section cp-estimate" aria-labelledby="cp-estimate-title">
          <div className="cp-estimate-inner">
            <div className="cp-section-head">
              <p className="cp-eyebrow" data-near>Estimate</p>
              <h2 id="cp-estimate-title" data-near>Tell us about <em>the job.</em></h2>
              <p data-near>A few details and we’ll be in touch to set up a time to look at it with you.</p>
              <ul className="cp-estimate-contact" data-near>
                <li><span>Call or text</span><a href={business.phoneHref}>{business.phone}</a></li>
                <li><span>Email</span><a href={`mailto:${business.email}`}>{business.email}</a></li>
              </ul>
            </div>
            <div data-rise>
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
