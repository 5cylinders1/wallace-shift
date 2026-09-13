import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { siteTiers } from '../../content/pricing'
import { renderLines } from '../../lib/textLines'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { Reveal } from '../Reveal/Reveal'
import { PricingPackage } from './PricingPackage'
import { packageFromTier } from './pricingPackageData'
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
            <PricingPackage
              key={tier.id}
              data={packageFromTier(tier)}
              delay={index * 0.06}
              revealY={REVEAL_Y}
            />
          ))}
        </div>

        <WebsiteStandard />
      </div>

      <WebsiteCare />
    </section>
  )
}
