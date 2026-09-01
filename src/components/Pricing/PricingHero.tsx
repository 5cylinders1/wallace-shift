import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { pricingHero, siteTiers } from '../../content/pricing'
import './PricingHero.css'

export function PricingHero() {
  const sectionRef = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()

      // Deliberately quieter than the homepage hero: this page's job is to
      // be read, not performed at. Same masked line reveal, no pointer
      // work, no media.
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap
          .timeline({ defaults: { ease: 'power3.out' } })
          .from('.pricing-hero__eyebrow', { opacity: 0, y: 16, duration: 0.8 }, 0.05)
          .fromTo(
            '.pricing-hero__line-inner',
            { yPercent: 112 },
            { yPercent: 0, duration: 1, stagger: 0.12, ease: 'power4.out' },
            0.16,
          )
          .from('.pricing-hero__supporting', { opacity: 0, y: 18, duration: 0.85 }, 0.5)
          .from('.pricing-hero__note', { opacity: 0, y: 14, duration: 0.85 }, 0.62)
          .fromTo(
            '.pricing-hero__index-rule',
            { scaleX: 0 },
            { scaleX: 1, duration: 0.9, stagger: 0.1, ease: 'power3.out' },
            0.45,
          )
          .from(
            '.pricing-hero__index-row > *',
            { opacity: 0, y: 10, duration: 0.7, stagger: 0.05 },
            0.6,
          )
      })

      return () => mm.revert()
    },
    { scope: sectionRef },
  )

  return (
    <section className="pricing-hero" ref={sectionRef}>
      <div className="container pricing-hero__inner">
        <div className="pricing-hero__copy">
          <p className="eyebrow pricing-hero__eyebrow">{pricingHero.eyebrow}</p>

          <h1 className="pricing-hero__headline">
            {pricingHero.headlineLines.map((line) => (
              <span className="pricing-hero__line" key={line}>
                <span className="pricing-hero__line-inner">{line}</span>
              </span>
            ))}
            <span className="pricing-hero__line">
              <span className="pricing-hero__line-inner accent-serif">
                {pricingHero.headlineAccent}
              </span>
            </span>
          </h1>

          <p className="pricing-hero__supporting">{pricingHero.supporting}</p>
          <p className="pricing-hero__note">{pricingHero.note}</p>
        </div>

        {/* A desktop-only restatement of the table directly below, so the
            first viewport answers "how much?" outright. Hidden from
            assistive technology precisely because it is a restatement —
            the real table carries the same figures with full context. */}
        <div className="pricing-hero__index" aria-hidden="true">
          <p className="pricing-hero__index-label">Websites start at</p>
          <ul>
            {siteTiers.tiers.map((tier) => (
              <li className="pricing-hero__index-row" key={tier.id}>
                <span
                  className="pricing-hero__index-rule"
                  style={{ width: `${tier.barScale * 100}%` }}
                />
                <span className="pricing-hero__index-name">{tier.name}</span>
                <span className="pricing-hero__index-price">
                  ${tier.price}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
