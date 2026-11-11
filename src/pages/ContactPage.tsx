import { useEffect } from 'react'
import { PageHero } from '../components/PageHero/PageHero'
import { ContactForm } from '../components/ContactForm/ContactForm'
import { Reveal } from '../components/Reveal/Reveal'
import { PageLink } from '../components/PageLink/PageLink'
import { business } from '../content/siteConfig'
import { trackSiteEvent } from '../lib/analytics'
import { readDemoHandoff } from '../lib/demoHandoff'
import { readShiftHandoff } from '../lib/quizHandoff'
import { useLocation } from '../lib/router'
import { useRouteMeta } from '../hooks/useDocumentMeta'
import './InteriorPage.css'
import './ContactPage.css'

export function ContactPage() {
  useRouteMeta('/contact')

  // Present when the visitor arrived from the Shift Finder's result.
  // Derived from tracked router state, so following a second ?shift= link
  // updates the page instead of showing the first recommendation.
  const { search } = useLocation()
  // Present when the visitor followed "Discuss my website" from a demo. Like
  // ?shift=, it is applied after hydration; everyone else sees the page as
  // it always was.
  const demo = readDemoHandoff(search)
  // A website enquiry keeps that context even if an old quiz parameter
  // remains in the URL. Other contact visitors retain the quiz handoff.
  const handoff = demo?.project === 'website' ? null : readShiftHandoff(search)

  // Arriving here is the measurable half of the demo's agency link: the demo
  // pages themselves load no analytics. The bootstrap applies consent and
  // its own allowlist before anything is sent.
  useEffect(() => {
    if (demo) trackSiteEvent({ name: 'demo_handoff_viewed', value: demo.id })
  }, [demo])

  return (
    <>
      {/* Keyed so a demo's copy replays the masked entrance instead of
          swapping text inside lines that have already animated. */}
      <PageHero
        key={demo?.id ?? 'default'}
        eyebrow={demo?.eyebrow ?? 'Start a project'}
        headlineLines={demo?.headlineLines ?? ['Discuss your', 'AI or CRM']}
        headlineAccent={demo?.headlineAccent ?? 'project.'}
        supporting={demo?.supporting ?? 'Talk with Wallace Shift about AI integration, a custom CRM, workflow automation, or a connected website. Tell us where work gets stuck and we will discuss a practical first step.'}
      />

      <section className="interior contact-page">
        <div className="container contact-page__grid">
          <div className="contact-page__form-column">
            {demo && (
              <div className="contact-page__handoff">
                <p className="contact-page__handoff-label">From the demo</p>
                <p className="contact-page__handoff-title">{demo.name}</p>
                <p className="contact-page__handoff-body">
                  Your message will say which demo you looked at, so the
                  conversation can start from it.{' '}
                  <a className="contact-page__handoff-link" href={demo.href}>
                    Back to the demo
                  </a>
                </p>
              </div>
            )}

            {handoff && (
              <div className="contact-page__handoff">
                <p className="contact-page__handoff-label">
                  From the Shift Finder
                </p>
                <p className="contact-page__handoff-title">{handoff.title}</p>
                <p className="contact-page__handoff-body">
                  {handoff.description}
                </p>
              </div>
            )}

            {/* Keyed on the recommendation and the demo so a different one
                re-runs the message field's initial state instead of
                stranding the previous prefill. */}
            <ContactForm
              key={`${handoff?.key ?? 'none'}-${demo?.id ?? 'none'}`}
              idPrefix="contact-page"
              submitLabel={demo?.submitLabel ?? 'Send project details'}
              handoff={handoff}
              source={demo?.id}
              project={demo?.project}
              messageLabel={demo?.messageLabel}
              messagePlaceholder={demo?.messagePlaceholder}
            />
          </div>

          <aside className="contact-page__aside">
            <Reveal>
              <div className="contact-page__block">
                <h2 className="service-block__label">What happens next</h2>
                <ol className="contact-page__steps">
                  <li>
                    We read it properly and reply {business.responseTime}.
                  </li>
                  <li>
                    {demo
                      ? 'A conversation about your business, your customers, and what the website needs to do.'
                      : 'A conversation about your workflow, current tools, and what needs to change.'}
                  </li>
                  <li>
                    An agreed first step, with scope and cost in writing.
                    Focused builds include scoping; larger systems or unclear requirements
                    may start with paid definition or audit work.
                  </li>
                </ol>
              </div>
            </Reveal>

            {/* Renders only once a real mailbox exists. Until then the form
                is the only channel offered, rather than an address that
                would bounce. */}
            {business.email && (
              <Reveal delay={0.08}>
                <div className="contact-page__block">
                  <h2 className="service-block__label">Prefer email?</h2>
                  <p className="contact-page__hint">Matthew Wallace · Designs and builds every project</p>
                  <a
                    className="contact-page__email"
                    href={`mailto:${business.email}`}
                  >
                    {business.email}
                  </a>
                </div>
              </Reveal>
            )}

            {business.serviceArea && (
              <Reveal delay={0.12}>
                <div className="contact-page__block">
                  <h2 className="service-block__label">Where we work</h2>
                  <p className="contact-page__area">
                    {business.serviceArea}, and remotely anywhere.
                  </p>
                </div>
              </Reveal>
            )}

            <Reveal delay={0.16}>
              <div className="contact-page__block">
                <h2 className="service-block__label">Before you write</h2>
                <p className="contact-page__hint">
                  {demo?.beforeYouWrite ?? 'A useful starting point is one real example: where an enquiry arrives, who follows up, which tools hold the details, and where the process gets stuck. You do not need a technical brief.'}
                </p>
                <PageLink href="/pricing" className="contact-page__link">
                  See what things cost
                  <span aria-hidden="true">&#8599;</span>
                </PageLink>
              </div>
            </Reveal>
          </aside>
        </div>
      </section>
    </>
  )
}
