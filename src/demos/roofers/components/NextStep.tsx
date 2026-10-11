import { nextStep } from '../content'
import { pageHref, type PageId } from '../routes'
import { PageLinks } from './PageLinks'
import './NextStep.css'

/** The close of each deeper page: price the roof or book the inspection, or read on. */
export function NextStep({ page }: { page: PageId }) {
  return (
    <section className="rf-next" aria-labelledby="rf-next-title">
      <div className="rf-container">
        <div className="rf-next__lead" data-reveal>
          <p className="rf-eyebrow">{nextStep.eyebrow}</p>
          <h2 id="rf-next-title" className="rf-display">
            {nextStep.title}
          </h2>
          <p className="rf-lede">{nextStep.body}</p>
          <div className="rf-actions">
            <a className="rf-button rf-button--primary" href={pageHref('home', 'estimate')}>
              {nextStep.primary}
            </a>
            <a className="rf-button rf-button--ghost" href={pageHref('home', 'estimator')}>
              {nextStep.secondary}
            </a>
          </div>
        </div>
        <nav className="rf-next__more" aria-label={nextStep.more} data-reveal>
          <p className="rf-next__more-title">{nextStep.more}</p>
          <PageLinks except={page} tone="dark" />
        </nav>
      </div>
    </section>
  )
}
