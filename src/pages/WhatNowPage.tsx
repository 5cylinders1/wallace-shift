import { useEffect, useRef } from 'react'
import { PageHero } from '../components/PageHero/PageHero'
import { PageLink } from '../components/PageLink/PageLink'
import { Reveal } from '../components/Reveal/Reveal'
import { WHAT_NOW_PATH } from '../content/routeMeta'
import { business } from '../content/siteConfig'
import { whatNow } from '../content/whatNow'
import { useRouteMeta } from '../hooks/useDocumentMeta'
import { useEnquiryReceipt } from '../lib/enquiryReceipt'
import './InteriorPage.css'
import './WhatNowPage.css'

/**
 * Where both enquiry forms land after a confirmed send, in place of an
 * inline thank-you line.
 *
 * The build-time HTML is the version without a confirmation, because it is
 * shared by every visitor. Only a tab that actually sent a message is told
 * so. A visitor who arrives any other way reads the same three steps, and
 * the closing band offers the form rather than reassurance about a message
 * that does not exist.
 */
export function WhatNowPage() {
  useRouteMeta(WHAT_NOW_PATH)
  const receipt = useEnquiryReceipt()
  const sent = receipt === 'sent'
  const heroRef = useRef<HTMLDivElement>(null)
  const { hero, steps, prepare, noReply } = whatNow
  const closing = receipt === 'none' ? whatNow.closingUnsent : whatNow.closingSent

  // The submit button that held focus is gone with the form. Moving focus
  // to the heading lets a screen reader announce where the visitor is now.
  useEffect(() => {
    if (!sent) return
    const heading = heroRef.current?.querySelector('h1')
    if (!heading) return
    heading.setAttribute('tabindex', '-1')
    heading.focus({ preventScroll: true })
  }, [sent])

  return (
    <>
      <div ref={heroRef} className="what-now__hero">
        <PageHero
          eyebrow={sent ? hero.sentEyebrow : hero.defaultEyebrow}
          headlineLines={hero.headlineLines}
          headlineAccent={hero.headlineAccent}
          supporting={sent ? hero.sentSupporting : hero.defaultSupporting}
        />
      </div>

      <section className="interior what-now" aria-labelledby="what-now-steps">
        <div className="container">
          <div className="interior__head">
            <p className="eyebrow interior__eyebrow">{steps.eyebrow}</p>
            <h2 className="interior__heading" id="what-now-steps">{steps.heading}</h2>
          </div>

          <ol className="what-now__steps">
            {steps.items.map((step, index) => (
              <li className="what-now__step" key={step.index}>
                <Reveal delay={index * 0.06} className="what-now__step-inner">
                  <span className="what-now__index" aria-hidden="true">{step.index}</span>
                  <h3 className="what-now__title">{step.title}</h3>
                  <div className="what-now__body">
                    <p>{step.body}</p>
                    {'link' in step && (
                      <PageLink href={step.link.href} className="what-now__link">
                        {step.link.label}
                        <span aria-hidden="true">&#8599;</span>
                      </PageLink>
                    )}
                  </div>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="interior interior--tight what-now what-now--prepare" aria-labelledby="what-now-prepare">
        <div className="container what-now__prepare">
          <Reveal className="what-now__prepare-intro">
            <p className="eyebrow interior__eyebrow">{prepare.eyebrow}</p>
            <h2 className="interior__heading" id="what-now-prepare">{prepare.heading}</h2>
            <p className="interior__supporting">{prepare.supporting}</p>
          </Reveal>

          <Reveal delay={0.08} className="what-now__prepare-detail">
            <ul className="service-list what-now__checklist">
              {prepare.checklist.map(item => <li key={item}>{item}</li>)}
            </ul>

            {/* Only offered while a real mailbox exists. */}
            {business.email && (
              <div className="what-now__fallback">
                <h3 className="service-block__label">{noReply.label}</h3>
                <p>{noReply.body}</p>
                <a className="person__email" href={`mailto:${business.email}`}>
                  {business.email}
                </a>
              </div>
            )}
          </Reveal>
        </div>
      </section>

      <section className="interior interior--ink">
        <div className="container closing">
          <h2 className="closing__headline">{closing.headline}</h2>
          <p className="closing__supporting">{closing.supporting}</p>
          <div className="closing__actions">
            <PageLink className="button-primary" href={closing.primary.href}>
              {closing.primary.label}
              <span aria-hidden="true">&#8599;</span>
            </PageLink>
            <PageLink className="button-secondary" href={closing.secondary.href}>
              {closing.secondary.label}
            </PageLink>
          </div>
        </div>
      </section>
    </>
  )
}
