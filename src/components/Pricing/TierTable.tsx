import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { siteTiers } from '../../content/pricing'
import { renderLines } from '../../lib/textLines'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { Reveal } from '../Reveal/Reveal'
import { PageLink } from '../PageLink/PageLink'
import { WebsiteStandard } from './WebsiteStandard'
import { WebsiteCare } from './WebsiteCare'
import './TierTable.css'

/** Entrance travel for this page, kept deliberately short. */
const REVEAL_Y = 14

export function TierTable() {
  const sectionRef = useRef<HTMLElement>(null)
  const reducedMotion = useReducedMotion()

  // The only motion here: the rule above each column draws left to right on
  // entry. Under reduced motion nothing is set, so the CSS resting state
  // (full-width rules) is what renders.
  useGSAP(
    () => {
      if (reducedMotion) return

      const bars = gsap.utils.toArray<HTMLElement>('.tier__bar')
      if (bars.length === 0) return

      gsap.set(bars, { scaleX: 0, transformOrigin: 'left center' })

      const tween = gsap.to(bars, {
        scaleX: 1,
        duration: 0.8,
        stagger: 0.1,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 78%',
          toggleActions: 'play none none none',
        },
      })

      return () => {
        tween.scrollTrigger?.kill()
        tween.kill()
      }
    },
    { scope: sectionRef, dependencies: [reducedMotion] },
  )

  return (
    <section id="websites" className="tier-table" ref={sectionRef}>
      <div className="container">
        <div className="tier-table__intro">
          <Reveal y={REVEAL_Y}>
            <p className="eyebrow tier-table__eyebrow">{siteTiers.eyebrow}</p>
          </Reveal>
          <Reveal y={REVEAL_Y} delay={0.06}>
            <h2 className="tier-table__heading">
              {renderLines(siteTiers.headingLines)}
            </h2>
          </Reveal>
          <Reveal y={REVEAL_Y} delay={0.12}>
            <p className="tier-table__supporting">{siteTiers.supporting}</p>
          </Reveal>
        </div>

        <div className="tier-table__grid">
          {siteTiers.tiers.map((tier, index) => (
            <Reveal
              key={tier.id}
              y={REVEAL_Y}
              delay={index * 0.06}
              className={`tier${tier.badge ? ' tier--recommended' : ''}`}
            >
              <span className="tier__bar" aria-hidden="true" />

              {/* Rendered in every column whether or not it carries a
                  label, so the rows below stay level across the table. */}
              <p className="tier__badge">{tier.badge}</p>

              <div className="tier__head">
                <span className="tier__index">{tier.index}</span>
                <h3 className="tier__name">{tier.name}</h3>
                <p className="tier__category">{tier.category}</p>
                <p className="tier__tagline">{tier.tagline}</p>
              </div>

              <div className="tier__proof">
                {tier.proof ? <p>{tier.proof}</p> : null}
              </div>

              <p className="tier__price">
                {tier.startsAt ? (
                  <span className="tier__price-label">Starts at</span>
                ) : null}
                <span className="tier__price-value">
                  <span className="tier__price-currency">$</span>
                  {tier.price}
                </span>
              </p>

              <ul className="tier__delivery">
                {tier.delivery.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>

              <PageLink href="/#contact" className="tier__cta">
                {tier.ctaLabel}
                <span className="tier__cta-arrow" aria-hidden="true">
                  &#8599;
                </span>
              </PageLink>

              <p className="tier__description">{tier.description}</p>

              <div className="tier__best-for">
                <span className="tier__best-for-label">Best for</span>
                <p>{tier.bestFor}</p>
              </div>

              <ul className="tier__scope">
                {tier.scope.map((line) => (
                  <li
                    key={line}
                    className={
                      line.startsWith('Everything in')
                        ? 'tier__scope-item tier__scope-item--inherited'
                        : 'tier__scope-item'
                    }
                  >
                    {line}
                  </li>
                ))}
              </ul>

              <div className="tier__scope-note">
                {tier.scopeNote ? <p>{tier.scopeNote}</p> : null}
              </div>
            </Reveal>
          ))}
        </div>

        <WebsiteStandard />
      </div>

      <WebsiteCare />
    </section>
  )
}
