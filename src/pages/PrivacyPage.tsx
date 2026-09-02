import { PageHero } from '../components/PageHero/PageHero'
import { PageLink } from '../components/PageLink/PageLink'
import {
  privacyLastUpdated,
  privacyMeta,
  privacySections,
} from '../content/privacy'
import { business } from '../content/siteConfig'
import { useRouteMeta } from '../hooks/useDocumentMeta'
import './InteriorPage.css'

export function PrivacyPage() {
  useRouteMeta('/privacy')

  return (
    <>
      <PageHero
        eyebrow={privacyMeta.eyebrow}
        headlineLines={[privacyMeta.heading]}
        supporting={privacyMeta.supporting}
        note={`Last updated ${privacyLastUpdated}.`}
      />

      <section className="interior">
        <div className="container">
          <div className="qa">
            {privacySections.map((section) => (
              <div className="qa__item" key={section.heading}>
                <h2 className="qa__q">{section.heading}</h2>
                <div>
                  {section.paragraphs.map((paragraph) => (
                    <p className="qa__a" key={paragraph}>
                      {paragraph}
                    </p>
                  ))}
                  {section.bullets && (
                    <ul className="qa__list">
                      {section.bullets.map((bullet) => (
                        <li key={bullet}>{bullet}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ))}

            <div className="qa__item">
              <h2 className="qa__q">Getting in touch about this</h2>
              <div>
                <p className="qa__a">
                  {business.email ? (
                    <>
                      Email{' '}
                      <a href={`mailto:${business.email}`}>{business.email}</a>{' '}
                      and we will handle it.
                    </>
                  ) : (
                    <>
                      Use the{' '}
                      <PageLink href="/contact">contact form</PageLink> and we
                      will handle it.
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
