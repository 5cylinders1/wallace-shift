import { PageHero } from '../components/PageHero/PageHero'
import { ContactForm } from '../components/ContactForm/ContactForm'
import { Reveal } from '../components/Reveal/Reveal'
import { PageLink } from '../components/PageLink/PageLink'
import { business } from '../content/siteConfig'
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
  const handoff = readShiftHandoff(search)

  return (
    <>
      <PageHero
        eyebrow="Start a project"
        headlineLines={['Tell us what', 'is not']}
        headlineAccent="working."
        supporting="You do not need to know which service you need, or have a budget in mind. Describe the problem and we will tell you what we would do about it."
      />

      <section className="interior contact-page">
        <div className="container contact-page__grid">
          <div className="contact-page__form-column">
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

            {/* Keyed on the recommendation so a different one re-runs the
                message field's initial state instead of stranding the
                previous prefill. */}
            <ContactForm
              key={handoff?.key ?? 'none'}
              idPrefix="contact-page"
              submitLabel="Send message"
              handoff={handoff}
            />
          </div>

          <aside className="contact-page__aside">
            <Reveal>
              <div className="contact-page__block">
                <p className="service-block__label">What happens next</p>
                <ol className="contact-page__steps">
                  <li>
                    We read it properly and reply {business.responseTime}.
                  </li>
                  <li>
                    A short call — what is not working, and what you are
                    working with. No deck, no pitch.
                  </li>
                  <li>
                    A written scope and a fixed starting price before anything
                    is built.
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
                  <p className="service-block__label">Prefer email?</p>
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
                  <p className="service-block__label">Where we work</p>
                  <p className="contact-page__area">
                    {business.serviceArea}, and remotely anywhere.
                  </p>
                </div>
              </Reveal>
            )}

            <Reveal delay={0.16}>
              <div className="contact-page__block">
                <p className="service-block__label">Before you write</p>
                <p className="contact-page__hint">
                  It helps to know what you already have — a current website,
                  the tools you run on, and what prompted you to look now.
                  None of it is required.
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
