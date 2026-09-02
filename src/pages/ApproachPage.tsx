import { PageHero } from '../components/PageHero/PageHero'
import { Approach } from '../components/Approach/Approach'
import { StandardsSection } from '../components/Standards/StandardsSection'
import { Reveal } from '../components/Reveal/Reveal'
import { PageLink } from '../components/PageLink/PageLink'
import { approachPageHero } from '../content/siteConfig'
import { useRouteMeta } from '../hooks/useDocumentMeta'
import './InteriorPage.css'

/**
 * The pit-stop sequence and the standards section both moved here off the
 * homepage. They are the site's heaviest motion work, and giving them a
 * page of their own does two things: it shortens a homepage that ran to
 * nearly ten viewports, and it removes the pinned section that the old
 * cross-page anchor links used to overshoot.
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

      <Approach />
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
