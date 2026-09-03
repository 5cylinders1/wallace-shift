import { PageHero } from '../components/PageHero/PageHero'
import { Reveal } from '../components/Reveal/Reveal'
import { PageLink } from '../components/PageLink/PageLink'
import { aboutFacts, aboutMeta, aboutPeople, aboutStory } from '../content/about'
import { business } from '../content/siteConfig'
import { useRouteMeta } from '../hooks/useDocumentMeta'
import './InteriorPage.css'

export function AboutPage() {
  useRouteMeta('/about')

  return (
    <>
      <PageHero
        eyebrow={aboutMeta.eyebrow}
        headlineLines={aboutMeta.headlineLines}
        headlineAccent={aboutMeta.headlineAccent}
        supporting={aboutMeta.supporting}
      />

      <section className="interior">
        <div className="container">
          <div className="people">
            {aboutPeople.map((person) => (
              <Reveal className="person" key={person.role}>
                <span className="person__role">{person.role}</span>
                {/* A person with no name yet renders their role as the
                    heading rather than a placeholder, so the page stays
                    truthful until the name is supplied. */}
                {person.name && (
                  <h2 className="person__name">{person.name}</h2>
                )}
                <p className="person__bio">{person.bio}</p>
                {/* Direct line to the right person, rather than routing
                    everything through one shared inbox. Rendered only once
                    that mailbox is live. */}
                {person.email && (
                  <a className="person__email" href={`mailto:${person.email}`}>
                    {person.email}
                  </a>
                )}
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="interior interior--tight">
        <div className="container">
          <div className="interior__head">
            <h2 className="interior__heading">{aboutStory.heading}</h2>
          </div>
          <Reveal className="prose">
            {aboutStory.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </Reveal>
        </div>
      </section>

      <section className="interior interior--tight">
        <div className="container">
          <div className="interior__head">
            <h2 className="interior__heading">{aboutFacts.heading}</h2>
          </div>

          <div className="qa">
            {aboutFacts.items.map((fact) => (
              <Reveal className="qa__item" key={fact.question}>
                <h3 className="qa__q">{fact.question}</h3>
                <p className="qa__a">{fact.answer}</p>
              </Reveal>
            ))}

            {/* Region only, and only once a real value exists. No street
                address is published anywhere on this site. */}
            {business.serviceArea && (
              <Reveal className="qa__item">
                <h3 className="qa__q">Where are you based?</h3>
                <p className="qa__a">
                  We work from {business.serviceArea}. The work itself is
                  remote, so where your business is has no bearing on what we
                  can build — a site, an app, or an automation ships the same
                  either way.
                </p>
              </Reveal>
            )}
          </div>
        </div>
      </section>

      <section className="interior interior--ink">
        <div className="container closing">
          <Reveal>
            <h2 className="closing__headline">
              Now tell us about your business.
            </h2>
          </Reveal>
          <Reveal delay={0.08}>
            <p className="closing__supporting">
              You know what is not working better than we do. Start there.
            </p>
          </Reveal>
          <Reveal delay={0.14} className="closing__actions">
            <PageLink href="/contact" className="button-primary">
              Start a project
              <span aria-hidden="true">&#8599;</span>
            </PageLink>
            <PageLink href="/services" className="button-secondary">
              See what we do
            </PageLink>
          </Reveal>
        </div>
      </section>
    </>
  )
}
