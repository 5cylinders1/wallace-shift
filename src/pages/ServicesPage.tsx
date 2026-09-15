import { Fragment, useEffect, useRef, type FocusEvent } from 'react'
import { PageHero } from '../components/PageHero/PageHero'
import { Reveal } from '../components/Reveal/Reveal'
import { PageLink } from '../components/PageLink/PageLink'
import {
  serviceDetails,
  servicesPageCta,
  servicesPageMeta,
} from '../content/servicesPage'
import { useRouteMeta } from '../hooks/useDocumentMeta'
import { useMediaQuery } from '../hooks/useMediaQuery'
import './InteriorPage.css'
import './ServicesPage.css'

export function ServicesPage() {
  useRouteMeta('/services')
  const panelsRef = useRef<HTMLElement>(null)
  const mobileMotion = useMediaQuery('(max-width: 767px) and (prefers-reduced-motion: no-preference)')

  useEffect(() => {
    if (!mobileMotion || !panelsRef.current) return
    const panels = Array.from(panelsRef.current.querySelectorAll<HTMLElement>('.service-detail'))
    // A tall panel finishes scrolling before it holds at the screen bottom.
    // Re-measure after font loading, text zoom, or an orientation change.
    const measure = () => {
      for (const panel of panels) {
        panel.style.setProperty('--service-panel-height', `${panel.offsetHeight}px`)
      }
    }
    measure()
    const observer = new ResizeObserver(measure)
    panels.forEach(panel => observer.observe(panel))
    return () => {
      observer.disconnect()
      panels.forEach(panel => panel.style.removeProperty('--service-panel-height'))
    }
  }, [mobileMotion])

  const revealFocusedPanel = (event: FocusEvent<HTMLElement>) => {
    if (!mobileMotion || !event.target.matches(':focus-visible')) return
    const focused = event.target.getBoundingClientRect()
    const header = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--site-header-height'))
    const visible = document.elementFromPoint(focused.left + focused.width / 2, focused.top + focused.height / 2)
    if (focused.top >= header && focused.bottom <= window.innerHeight && visible && event.target.contains(visible)) return
    // The article may be held beneath a later panel. Its stationary marker
    // restores its original position without fighting normal keyboard scroll.
    event.currentTarget.previousElementSibling?.scrollIntoView({ behavior: 'instant', block: 'start' })
  }

  return (
    <>
      <PageHero
        eyebrow={servicesPageMeta.eyebrow}
        headlineLines={servicesPageMeta.headlineLines}
        headlineAccent={servicesPageMeta.headlineAccent}
        supporting={servicesPageMeta.supporting}
      />

      <section className="interior services-panels" ref={panelsRef}>
        <div className="container services-panels__inner">
          {serviceDetails.map((service) => (
            <Fragment key={service.id}>
              <div className="service-detail-anchor" id={service.id} />
              <article
                className={`service-detail service-detail--${service.id}`}
                onFocusCapture={revealFocusedPanel}
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
            </Fragment>
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
