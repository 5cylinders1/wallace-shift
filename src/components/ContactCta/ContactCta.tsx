import { business, contactCta } from '../../content/siteConfig'
import { contactMedia } from '../../content/mediaAssets'
import { renderLines } from '../../lib/textLines'
import { AmbientLoop } from '../AmbientLoop/AmbientLoop'
import { ContactForm } from '../ContactForm/ContactForm'
import { PageLink } from '../PageLink/PageLink'
import { Reveal } from '../Reveal/Reveal'
import './ContactCta.css'

/**
 * The homepage's closing section. The form itself lives in `ContactForm`,
 * shared with `/contact`, so there is one implementation of the enquiry
 * flow rather than two that can drift apart.
 */
export function ContactCta({ sceneBackground = false }: { sceneBackground?: boolean }) {
  return (
    <section id="contact" className={`contact-cta${sceneBackground ? ' contact-cta--scene' : ''}`}>
      {!sceneBackground && <>
        <AmbientLoop media={contactMedia} className="contact-cta__media" />
        <div className="contact-cta__scrim" aria-hidden="true" />
      </>}
      <div className="container contact-cta__inner">
        <div className="contact-cta__intro">
          <Reveal xPercent={sceneBackground ? -125 : undefined}>
            <h2 className="contact-cta__headline">
              {renderLines(contactCta.headlineLines)}
            </h2>
          </Reveal>
          <Reveal delay={0.1} xPercent={sceneBackground ? -125 : undefined}>
            <p className="contact-cta__supporting">{contactCta.supporting}</p>
          </Reveal>
          <Reveal delay={0.2} xPercent={sceneBackground ? -125 : undefined}>
            <div className="contact-cta__alternatives">
              <p className="eyebrow">{contactCta.alternatives.eyebrow}</p>
              {business.salesEmail && (
                <p className="contact-cta__email">
                  {contactCta.alternatives.emailLead}{' '}
                  <a href={`mailto:${business.salesEmail}`}>{business.salesEmail}</a>
                </p>
              )}
              <PageLink href={contactCta.alternatives.pricingHref} className="contact-cta__pricing-link">
                {contactCta.alternatives.pricingLabel} <span aria-hidden="true">↗</span>
              </PageLink>
            </div>
          </Reveal>
        </div>

        {/* The two halves arrive from the sides they belong to: copy from the
            left of the grid, the enquiry from the right. The slot is the card's
            place in the grid and never moves, so it can be measured while the
            card itself is still travelling. */}
        <div className="contact-cta__form-slot">
          <Reveal delay={0.08} xPercent={sceneBackground ? 125 : undefined}
            className="contact-cta__form-wrap">
            <ContactForm
              idPrefix="home-contact"
              submitLabel={contactCta.primaryCtaLabel}
              detailed={sceneBackground}
            />
          </Reveal>
        </div>
      </div>
    </section>
  )
}
