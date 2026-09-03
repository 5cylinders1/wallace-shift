import { PageHero } from '../components/PageHero/PageHero'
import { StandardsSection } from '../components/Standards/StandardsSection'
import { Reveal } from '../components/Reveal/Reveal'
import { PageLink } from '../components/PageLink/PageLink'
import { approachStages, approachTerms } from '../content/approachPage'
import { approachPageHero } from '../content/siteConfig'
import { useRouteMeta } from '../hooks/useDocumentMeta'
import './InteriorPage.css'
import './ApproachPage.css'

/**
 * The process, in detail.
 *
 * The pit-stop sequence is the homepage's signature moment and is not
 * repeated here — running it on both pages diluted it and made this page
 * a second copy of the lander rather than somewhere to actually read what
 * happens. This page carries the substance instead: each stage expanded,
 * then the commercial terms, then the standards the work is held to.
 */
export function ApproachPage() {
  useRouteMeta('/approach')

  return (
    <>
      <PageHero
        eyebrow={approachPageHero.eyebrow}
        headlineLines={approachPageHero.headlineLines}
        headlineAccent={approachPageHero.headlineAccent}
        supporting={approachPageHero.supporting}
      />

      <section className="interior">
        <div className="container">
          <ol className="stages">
            {approachStages.map((stage) => (
              <Reveal className="stage" key={stage.index}>
                <div className="stage__head">
                  <span className="stage__index">{stage.index}</span>
                  <h2 className="stage__title">{stage.title}</h2>
                  <p className="stage__summary">{stage.summary}</p>
                </div>
                <ul className="stage__points">
                  {stage.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      <section className="interior interior--tight">
        <div className="container">
          <Reveal>
            <p className="eyebrow">{approachTerms.eyebrow}</p>
          </Reveal>
          <Reveal delay={0.06}>
            <h2 className="terms__heading">{approachTerms.heading}</h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="terms__supporting">{approachTerms.supporting}</p>
          </Reveal>

          <div className="terms">
            {approachTerms.items.map((item, index) => (
              <Reveal className="terms__item" delay={0.12 + index * 0.06} key={item.title}>
                <h3 className="terms__title">{item.title}</h3>
                <p className="terms__body">{item.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <StandardsSection />

      <section className="interior interior--ink">
        <div className="container closing">
          <Reveal>
            <h2 className="closing__headline">Ready to find the friction?</h2>
          </Reveal>
          <Reveal delay={0.08}>
            <p className="closing__supporting">
              The first stage is a conversation about what is slowing the
              business down. It costs nothing and it is not a sales call.
            </p>
          </Reveal>
          <Reveal delay={0.14} className="closing__actions">
            <PageLink href="/contact" className="button-primary">
              Start a project
              <span aria-hidden="true">&#8599;</span>
            </PageLink>
            <PageLink href="/pricing" className="button-secondary">
              See pricing
            </PageLink>
          </Reveal>
        </div>
      </section>
    </>
  )
}
