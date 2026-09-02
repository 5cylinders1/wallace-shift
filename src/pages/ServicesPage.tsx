import { PageHero } from '../components/PageHero/PageHero'
import { Reveal } from '../components/Reveal/Reveal'
import { PageLink } from '../components/PageLink/PageLink'
import {
  serviceDetails,
  servicesPageCta,
  servicesPageMeta,
} from '../content/servicesPage'
import { useRouteMeta } from '../hooks/useDocumentMeta'
import './InteriorPage.css'

export function ServicesPage() {
  useRouteMeta('/services')

  return (
    <>
      <PageHero
        eyebrow={servicesPageMeta.eyebrow}
        headlineLines={servicesPageMeta.headlineLines}
        headlineAccent={servicesPageMeta.headlineAccent}
        supporting={servicesPageMeta.supporting}
      />

      <section className="interior">
        <div className="container">
          {serviceDetails.map((service) => (
            <article
              className="service-detail"
              id={service.id}
              key={service.id}
            >
              <div className="service-detail__intro">
                <span className="service-detail__index">
                  {service.index} — {service.label}
                </span>
                <h2 className="service-detail__title">{service.title}</h2>
                <p className="service-detail__summary">{service.summary}</p>
                <PageLink
                  href={service.pricingAnchor}
                  className="service-detail__pricing"
                >
                  {service.pricingLabel}
                  <span aria-hidden="true">&#8599;</span>
                </PageLink>
              </div>

              <div className="service-detail__body">
                <Reveal>
                  <p className="service-detail__problem">{service.problem}</p>
                </Reveal>

                <Reveal delay={0.08}>
                  <div>
                    <p className="service-block__label">What you end up with</p>
                    <ul className="service-list">
                      {service.outcomes.map((outcome) => (
                        <li key={outcome}>{outcome}</li>
                      ))}
                    </ul>
                  </div>
                </Reveal>

                <Reveal delay={0.12} className="service-detail__columns">
                  <div>
                    <p className="service-block__label">Right for you if</p>
                    <ul className="service-list">
                      {service.rightFor.map((signal) => (
                        <li key={signal}>{signal}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="service-block__label">Worth knowing</p>
                    <p className="service-detail__note">{service.notFor}</p>
                  </div>
                </Reveal>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="interior interior--ink">
        <div className="container closing">
          <Reveal>
            <h2 className="closing__headline">{servicesPageCta.headline}</h2>
          </Reveal>
          <Reveal delay={0.08}>
            <p className="closing__supporting">{servicesPageCta.supporting}</p>
          </Reveal>
          <Reveal delay={0.14} className="closing__actions">
            <PageLink
              href={servicesPageCta.primaryHref}
              className="button-primary"
            >
              {servicesPageCta.primaryLabel}
              <span aria-hidden="true">&#8599;</span>
            </PageLink>
            <PageLink
              href={servicesPageCta.secondaryHref}
              className="button-secondary"
            >
              {servicesPageCta.secondaryLabel}
            </PageLink>
          </Reveal>
        </div>
      </section>
    </>
  )
}
