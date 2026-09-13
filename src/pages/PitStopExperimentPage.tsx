import { useEffect } from 'react'
import { ApproachSummary } from '../components/ApproachSummary/ApproachSummary'
import { PageLink } from '../components/PageLink/PageLink'
import { PIT_STOP_EXPERIMENT_PATH } from '../content/routeMeta'
import { useRouteMeta } from '../hooks/useDocumentMeta'
import './PitStopExperimentPage.css'

/** The original homepage pit stop, preserved as a standalone portfolio piece. */
export function PitStopExperimentPage() {
  useRouteMeta(PIT_STOP_EXPERIMENT_PATH)

  useEffect(() => {
    const existing = document.head.querySelector<HTMLMetaElement>('meta[name="robots"]')
    const previous = existing?.content ?? null
    const meta = existing ?? document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow'
    if (!existing) document.head.appendChild(meta)

    return () => {
      // A direct visit already has this route's baked-in robots tag.
      // Remove that tag on departure as well, so it cannot follow the
      // visitor onto an indexable production route.
      if (previous === null || previous === 'noindex, nofollow') meta.remove()
      else meta.content = previous
    }
  }, [])

  return (
    <div className="pit-stop-experiment">
      <header className="pit-stop-experiment__header">
        <div>
          <p className="pit-stop-experiment__eyebrow">Wallace Shift · Motion study</p>
          <h1 className="pit-stop-experiment__title">The pit stop.</h1>
        </div>
        <PageLink href="/" className="pit-stop-experiment__return">
          Back to Wallace Shift <span aria-hidden="true">↗</span>
        </PageLink>
      </header>

      <ApproachSummary />

      <footer className="pit-stop-experiment__footer">
        <p>Strategy, precision, momentum.</p>
        <PageLink href="/" className="pit-stop-experiment__return">
          Return to the site <span aria-hidden="true">↗</span>
        </PageLink>
      </footer>
    </div>
  )
}
