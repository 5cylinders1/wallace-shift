import { useId, useRef, useState, type KeyboardEvent } from 'react'
import { approachCta, approachProof, servicePaths, workSamples } from '../../content/approachPage'
import { business, standards } from '../../content/siteConfig'
import { PageLink } from '../PageLink/PageLink'
import { Reveal } from '../Reveal/Reveal'
import './ApproachDetails.css'

/** The practical details after the journey, kept in two compact chapters. */
export function ApproachDetails() {
  const [activePath, setActivePath] = useState(0)
  const [failedSamples, setFailedSamples] = useState<string[]>([])
  const tabsRef = useRef<(HTMLButtonElement | null)[]>([])
  const tabId = useId()
  const bookingHref = business.bookingUrl ?? '/contact'

  function handleTabKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex: number

    switch (event.key) {
      case 'ArrowRight':
        nextIndex = (index + 1) % servicePaths.items.length
        break
      case 'ArrowLeft':
        nextIndex = (index - 1 + servicePaths.items.length) % servicePaths.items.length
        break
      case 'Home':
        nextIndex = 0
        break
      case 'End':
        nextIndex = servicePaths.items.length - 1
        break
      default:
        return
    }

    event.preventDefault()
    setActivePath(nextIndex)
    tabsRef.current[nextIndex]?.focus()
  }

  return (
    <div className="approach-details">
      <section className="approach-details__paths" aria-labelledby={`${tabId}-paths-heading`}>
        <div className="container">
          <Reveal className="approach-details__paths-intro">
            <div>
              <p className="approach-details__eyebrow">{servicePaths.eyebrow}</p>
              <h2 id={`${tabId}-paths-heading`} className="approach-details__heading">
                A clear start.<br />A <span className="accent-serif">known cost.</span>
              </h2>
            </div>
            <p className="approach-details__intro-copy">{servicePaths.supporting}</p>
          </Reveal>

          <div className="approach-details__tabs" role="tablist" aria-label="First paid step by service">
            {servicePaths.items.map((path, index) => (
              <button
                key={path.service}
                type="button"
                role="tab"
                id={`${tabId}-tab-${index}`}
                aria-controls={`${tabId}-panel-${index}`}
                aria-selected={activePath === index}
                tabIndex={activePath === index ? 0 : -1}
                ref={(element) => { tabsRef.current[index] = element }}
                onClick={() => setActivePath(index)}
                onKeyDown={(event) => handleTabKey(event, index)}
                className="approach-details__tab"
              >
                <span className="approach-details__tab-number" aria-hidden="true">0{index + 1}</span>
                <span>{path.service}</span>
                <span className="approach-details__tab-arrow" aria-hidden="true">↗</span>
              </button>
            ))}
          </div>

          {servicePaths.items.map((path, index) => (
            <div
              key={path.service}
              id={`${tabId}-panel-${index}`}
              role="tabpanel"
              aria-labelledby={`${tabId}-tab-${index}`}
              hidden={activePath !== index}
              tabIndex={0}
              className="approach-details__path-panel"
            >
              <div className="approach-details__path-price">
                <p className="approach-details__eyebrow">Your first paid step</p>
                <h3>{path.step}</h3>
              </div>
              <div className="approach-details__path-copy">
                <p>{path.note}</p>
                <PageLink href={path.href} className="approach-details__text-link">
                  Full pricing and terms <span aria-hidden="true">↗</span>
                </PageLink>
              </div>
            </div>
          ))}
          <div className="approach-details__path-line" aria-hidden="true">
            <span>Conversation</span><i /><span>Agreement</span><i /><span>The work begins</span>
          </div>
        </div>
      </section>

      <section className="approach-details__studio" aria-labelledby={`${tabId}-studio-heading`}>
        <div className="container">
          <div className="approach-details__studio-grid">
            <Reveal className="approach-details__studio-intro">
              <p className="approach-details__eyebrow">{approachProof.eyebrow}</p>
              <h2 id={`${tabId}-studio-heading`} className="approach-details__heading">
                Two people.<br /><span className="accent-serif">The whole studio.</span>
              </h2>
              <p className="approach-details__studio-note">{approachProof.paragraphs[1]}</p>
              <PageLink href={approachProof.proofHref} className="approach-details__text-link">
                {approachProof.proofNote}<span aria-hidden="true">↗</span>
              </PageLink>
            </Reveal>

            <div className="approach-details__people">
              {approachProof.people.map((person, index) => (
                <Reveal key={person.name} delay={index * 0.08} className="approach-details__person">
                  <span className="approach-details__person-initial" aria-hidden="true">{person.name.charAt(0)}</span>
                  <div>
                    <p className="approach-details__eyebrow">{person.role}</p>
                    <h3>{person.name}</h3>
                    <p className="approach-details__person-bio">{person.body}</p>
                    {person.email && (
                      <a href={`mailto:${person.email}`} className="approach-details__text-link">
                        {person.email}<span aria-hidden="true">↗</span>
                      </a>
                    )}
                  </div>
                </Reveal>
              ))}
              {workSamples.filter(sample => !failedSamples.includes(sample.href)).map((sample) => (
                <a
                  key={sample.href}
                  href={sample.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="approach-details__work"
                >
                  <img
                    src={sample.image}
                    alt={sample.alt}
                    loading="lazy"
                    decoding="async"
                    onError={() => setFailedSamples(current => [...current, sample.href])}
                  />
                  <span className="approach-details__work-copy">
                    <span className="approach-details__eyebrow">A recent build</span>
                    <strong>{sample.name}</strong>
                    <span>{sample.kind}</span>
                  </span>
                  <span className="approach-details__work-arrow" aria-hidden="true">↗</span>
                </a>
              ))}
            </div>
          </div>

          <div className="approach-details__standards" aria-labelledby={`${tabId}-standards-heading`}>
            <div className="approach-details__standards-title">
              <p className="approach-details__eyebrow">{standards.eyebrow}</p>
              <h3 id={`${tabId}-standards-heading`}>{standards.headline}</h3>
            </div>
            <ol>
              {standards.principles.map((principle) => (
                <li key={principle.number}>
                  <span className="approach-details__standard-number">{principle.number}</span>
                  <div>
                    <h4>{principle.title}</h4>
                    <p>{principle.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <Reveal className="approach-details__closing">
            <div>
              <p className="approach-details__eyebrow">Your next move</p>
              <h2>What could<br /><span className="accent-serif">shift for you?</span></h2>
            </div>
            <div className="approach-details__closing-copy">
              <p>{approachCta.supporting}</p>
              <PageLink href={bookingHref} className="approach-details__booking">
                {approachCta.primaryLabel}<span aria-hidden="true">↗</span>
              </PageLink>
              <PageLink href={approachCta.secondaryHref} className="approach-details__text-link">
                {approachCta.secondaryLabel}<span aria-hidden="true">↗</span>
              </PageLink>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  )
}
