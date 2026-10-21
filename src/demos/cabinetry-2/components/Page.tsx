import { useEffect, useRef, useState, type ReactNode } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { brand, contact, materials, nav, offers, process, statement } from '../content'

gsap.registerPlugin(useGSAP, ScrollTrigger)

const ASSET = (name: string) => `/demos/cabinetry-2/${name}.webp`

/** Header: transparent over the hero film, solid once the film has scrolled away. */
export function Header() {
  const ref = useRef<HTMLElement>(null)
  const toggle = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpen(false)
      toggle.current?.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])
  useGSAP(() => {
    ScrollTrigger.create({
      trigger: '.mr-hero',
      start: 'bottom top+=80',
      onEnter: () => ref.current?.classList.add('is-solid'),
      onLeaveBack: () => ref.current?.classList.remove('is-solid'),
    })
  })
  return (
    <header className="mr-header" ref={ref}>
      <a className="mr-wordmark" href="#top" aria-label={`${brand.name} ${brand.trade}, home`}>
        <span className="mr-wordmark-name">{brand.name}</span>
        <span className="mr-wordmark-trade">{brand.trade}</span>
      </a>
      <button ref={toggle} className="mr-menu-toggle" type="button" aria-expanded={open} aria-controls="mr-nav" onClick={() => setOpen(v => !v)}>
        {open ? 'Close' : 'Menu'}
      </button>
      <nav id="mr-nav" className={`mr-nav${open ? ' is-open' : ''}`} aria-label="Primary">
        {nav.map(item => <a key={item.id} href={`#${item.id}`} onClick={() => setOpen(false)}>{item.label}</a>)}
        <a className="mr-nav-cta" href="#contact" onClick={() => setOpen(false)}>Plan a kitchen</a>
      </nav>
    </header>
  )
}

/** A section whose [data-reveal] children rise into place once, on arrival. */
function Reveal({ children, className, id }: { children: ReactNode; className?: string; id?: string }) {
  const ref = useRef<HTMLElement>(null)
  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.from(gsap.utils.toArray<HTMLElement>('[data-reveal]', ref.current), {
        y: 22, autoAlpha: 0, duration: 0.9, ease: 'power3.out', stagger: 0.08,
        scrollTrigger: { trigger: ref.current, start: 'top 78%' },
      })
    })
  }, { scope: ref })
  return <section ref={ref} className={className} id={id}>{children}</section>
}

export function Statement() {
  const [first, second] = statement.lines
  const [before, after] = second.split(statement.emphasis)
  return (
    <Reveal className="mr-statement" id="studio">
      <p className="mr-eyebrow" data-reveal>{statement.eyebrow}</p>
      <h2 className="mr-statement-title" data-reveal>
        <span>{first}</span>
        <span>{before}<em>{statement.emphasis}</em>{after}</span>
      </h2>
      <p className="mr-statement-body" data-reveal>{statement.body}</p>
    </Reveal>
  )
}

export function Offers() {
  return (
    <Reveal className="mr-offers" id="make">
      <header className="mr-section-head" data-reveal>
        <p className="mr-eyebrow">What we make</p>
        <h2 className="mr-section-title">Rooms, made as one piece</h2>
      </header>
      <div className="mr-offer-grid">
        {offers.map(offer => (
          <article key={offer.title} className="mr-offer" data-reveal>
            <img src={ASSET(offer.image)} alt={offer.alt} loading="lazy" decoding="async" width="1200" height="1500" />
            <h3>{offer.title}</h3>
            <p>{offer.body}</p>
          </article>
        ))}
      </div>
    </Reveal>
  )
}

export function Process() {
  return (
    <Reveal className="mr-process" id="process">
      <header className="mr-section-head" data-reveal>
        <p className="mr-eyebrow">Process</p>
        <h2 className="mr-section-title">From a measured room to a finished one</h2>
      </header>
      <ol className="mr-steps">
        {process.map(step => (
          <li key={step.n} className="mr-step" data-reveal>
            <span className="mr-step-n">{step.n}</span>
            <h3>{step.title}</h3>
            <p>{step.body}</p>
          </li>
        ))}
      </ol>
    </Reveal>
  )
}

export function Materials() {
  return (
    <Reveal className="mr-materials" id="materials">
      <header className="mr-section-head" data-reveal>
        <p className="mr-eyebrow">Materials</p>
        <h2 className="mr-section-title">The palette in this kitchen</h2>
      </header>
      <ul className="mr-swatches">
        {materials.map(m => (
          <li key={m.name} className="mr-swatch" data-reveal>
            <img src={ASSET(m.swatch)} alt="" loading="lazy" decoding="async" width="600" height="600" />
            <h3>{m.name}</h3>
            <p>{m.note}</p>
          </li>
        ))}
      </ul>
    </Reveal>
  )
}

export function Contact() {
  return (
    <Reveal className="mr-contact" id="contact">
      <h2 className="mr-contact-title" data-reveal>{contact.title}</h2>
      <p className="mr-contact-body" data-reveal>{contact.body}</p>
      <div className="mr-contact-links" data-reveal>
        <a href={`tel:${contact.phone.replace(/[^0-9+]/g, '')}`}>{contact.phone}</a>
        <a href={`mailto:${contact.email}`}>{contact.email}</a>
      </div>
      <p className="mr-contact-note" data-reveal>{contact.note}</p>
    </Reveal>
  )
}

export function Footer() {
  return (
    <footer className="mr-footer">
      <div className="mr-footer-brand">
        <span className="mr-wordmark-name">{brand.name}</span>
        <span className="mr-wordmark-trade">{brand.trade}</span>
        <p>{brand.line}</p>
      </div>
      <nav aria-label="Footer">
        {nav.map(item => <a key={item.id} href={`#${item.id}`}>{item.label}</a>)}
        <a href="#contact">Plan a kitchen</a>
      </nav>
      <p className="mr-footer-note">
        A website concept by <a href="https://wallaceshift.com">Wallace Shift</a>. Mitre &amp; Rift is fictional; the kitchen is a rendering.
      </p>
    </footer>
  )
}
