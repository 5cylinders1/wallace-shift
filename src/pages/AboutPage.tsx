import { AboutStudio } from '../components/AboutStudio/AboutStudio'
import { Reveal } from '../components/Reveal/Reveal'
import { PageLink } from '../components/PageLink/PageLink'
import { aboutFacts, aboutPeople, aboutStory } from '../content/about'
import { business } from '../content/siteConfig'
import { useRouteMeta } from '../hooks/useDocumentMeta'
import './AboutPage.css'

export function AboutPage() {
  useRouteMeta('/about')

  return (
    <div className="about-page">
      <AboutStudio />

      <section className="about-people" id="people" aria-labelledby="about-people-title">
        <div className="container">
          <Reveal className="about-section-head">
            <p className="about-kicker">01 / Your people</p>
            <h2 id="about-people-title">You know our names.<br /><span className="accent-serif">We know your project.</span></h2>
            <p>From the first conversation to the final detail, you work directly with the people responsible for the result.</p>
          </Reveal>
          <div className="about-people__grid">
            {aboutPeople.map((person) => (
              <article className="about-person" key={person.role}>
                <Reveal className="about-person__copy" delay={0.06}>
                  <p className="about-kicker">{person.role}</p>
                  <h3>{person.name ?? person.role}</h3>
                  <p className="about-person__bio">{person.bio}</p>
                  {person.email && (
                    <a className="about-text-link about-person__email" href={`mailto:${person.email}`}>
                      {person.email}<span aria-hidden="true">↗</span>
                    </a>
                  )}
                </Reveal>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="about-story" aria-labelledby="about-story-title">
        <div className="container">
          <div className="about-story__topline">
            <p className="about-kicker">02 / Small on purpose</p>
            <span>Close to the work. Close to you.</span>
          </div>
          <div className="about-story__grid">
            <Reveal className="about-story__statement">
              <h2 id="about-story-title">The size is<br /><span className="accent-serif">the point.</span></h2>
              <p>A direct line to the people<br />who care about the details.</p>
              <div className="about-story__mark" aria-hidden="true"><span /><span /></div>
            </Reveal>
            <div className="about-story__prose">
              <Reveal><h3>{aboutStory.heading}</h3></Reveal>
              {aboutStory.paragraphs.map((paragraph, index) => (
                <Reveal key={paragraph} delay={index * 0.04}><p>{paragraph}</p></Reveal>
              ))}
              <Reveal><PageLink href="/approach" className="about-text-link">See how a project runs <span aria-hidden="true">↗</span></PageLink></Reveal>
            </div>
          </div>
          <Reveal className="about-story__principles">
            <p><span>01</span>Direct conversations.</p>
            <p><span>02</span>Careful, documented work.</p>
            <p><span>03</span>Yours from the start.</p>
          </Reveal>
        </div>
      </section>

      <section className="about-details" aria-labelledby="about-details-title">
        <div className="container about-details__grid">
          <Reveal className="about-details__intro">
            <p className="about-kicker">03 / Good to know</p>
            <h2 id="about-details-title">The practical<br /><span className="accent-serif">answers.</span></h2>
            {business.serviceArea && (
              <div className="about-details__location">
                <span className="about-details__location-dot" aria-hidden="true" />
                <p>{business.serviceArea}<span>Working remotely, wherever you are.</span></p>
              </div>
            )}
          </Reveal>
          <div className="about-details__answers">
            {aboutFacts.items.map((fact, index) => (
              <Reveal key={fact.question}>
                <details className="about-answer" open={index === 0}>
                  <summary><span className="about-answer__number">0{index + 1}</span><h3>{fact.question}</h3><span className="about-answer__toggle" aria-hidden="true" /></summary>
                  <p>{fact.answer}</p>
                </details>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="about-close" aria-labelledby="about-close-title">
        <div className="container about-close__inner">
          <Reveal>
            <p className="about-kicker">Enough about us.</p>
            <h2 id="about-close-title">What are you<br /><span className="accent-serif">working toward?</span></h2>
          </Reveal>
          <Reveal className="about-close__aside" delay={0.1}>
            <p>You know what is not working better than we do. Start there.</p>
            <PageLink href="/contact" className="about-close__button">Start a conversation <span aria-hidden="true">↗</span></PageLink>
            <PageLink href="/services" className="about-text-link">Explore what we do <span aria-hidden="true">↗</span></PageLink>
          </Reveal>
        </div>
      </section>
    </div>
  )
}
