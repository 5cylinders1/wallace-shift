import { contactCta } from '../../content/siteConfig'
import { contactMedia } from '../../content/mediaAssets'
import { renderLines } from '../../lib/textLines'
import { AmbientLoop } from '../AmbientLoop/AmbientLoop'
import { ContactForm } from '../ContactForm/ContactForm'
import { Reveal } from '../Reveal/Reveal'
import './ContactCta.css'

/**
 * The homepage's closing section. The form itself lives in `ContactForm`,
 * shared with `/contact`, so there is one implementation of the enquiry
 * flow rather than two that can drift apart.
 */
export function ContactCta() {
  return (
    <section id="contact" className="contact-cta">
      <AmbientLoop media={contactMedia} className="contact-cta__media" />
      <div className="contact-cta__scrim" aria-hidden="true" />
      <div className="container contact-cta__inner">
        <div className="contact-cta__intro">
          <Reveal>
            <h2 className="contact-cta__headline">
              {renderLines(contactCta.headlineLines)}
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="contact-cta__supporting">{contactCta.supporting}</p>
          </Reveal>
        </div>

        <Reveal delay={0.16} className="contact-cta__form-wrap">
          <ContactForm
            idPrefix="home-contact"
            submitLabel={contactCta.primaryCtaLabel}
          />
        </Reveal>
      </div>
    </section>
  )
}
