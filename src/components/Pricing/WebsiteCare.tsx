import { websiteCare } from '../../content/pricing'
import { Reveal } from '../Reveal/Reveal'
import { PageLink } from '../PageLink/PageLink'
import './WebsiteCare.css'

/**
 * Deliberately a band rather than a fourth package card: care is an
 * optional add-on to a project, not a competing choice alongside the three
 * website levels.
 */
export function WebsiteCare() {
  return (
    <section className="website-care" aria-labelledby="website-care-title">
      <div className="container">
        <Reveal y={14} className="website-care__inner">
          <div className="website-care__lead">
            <p className="eyebrow website-care__eyebrow">
              {websiteCare.eyebrow}
            </p>
            <h2 className="website-care__title" id="website-care-title">
              {websiteCare.title}
            </h2>
          </div>

          <div className="website-care__body">
            <p className="website-care__description">
              {websiteCare.description}
            </p>
            <ul className="website-care__notes">
              {websiteCare.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </div>

          <div className="website-care__action">
            <p className="website-care__price">
              {websiteCare.startsAt ? (
                <span className="website-care__price-label">Starts at</span>
              ) : null}
              <span className="website-care__price-value">
                <span className="website-care__price-currency">$</span>
                {websiteCare.price}
                <span className="website-care__price-unit">
                  {websiteCare.priceUnit}
                </span>
              </span>
            </p>

            <PageLink href="/contact" className="website-care__cta">
              {websiteCare.ctaLabel}
              <span className="website-care__cta-arrow" aria-hidden="true">
                &#8599;
              </span>
            </PageLink>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
