import { pricingCta } from '../../content/pricing'
import { renderLines } from '../../lib/textLines'
import { Reveal } from '../Reveal/Reveal'
import { PageLink } from '../PageLink/PageLink'
import './PricingCta.css'

export function PricingCta() {
  return (
    <section className="pricing-cta">
      <div className="container pricing-cta__inner">
        <Reveal>
          <h2 className="pricing-cta__headline">
            {renderLines(pricingCta.headlineLines)}
          </h2>
        </Reveal>
        <Reveal delay={0.08}>
          <p className="pricing-cta__supporting">{pricingCta.supporting}</p>
        </Reveal>
        <Reveal delay={0.16}>
          <PageLink href={pricingCta.ctaHref} className="pricing-cta__button">
            <span>{pricingCta.ctaLabel}</span>
          </PageLink>
        </Reveal>
      </div>
    </section>
  )
}
