import { Reveal } from '../Reveal/Reveal'
import { workSamples, workStrip } from '../../content/approachPage'
import './WorkStrip.css'

/**
 * Real built work, in place of the credentials list that used to sit here.
 *
 * The three lines it replaced — "building production web products since
 * 2009", "strategy, design, development and optimisation", "direct senior
 * involvement through launch" — are claims. Screenshots of live sites are
 * evidence. A visitor can check the second kind.
 *
 * Renders nothing when there is nothing cleared to show. That is not a
 * failure state: an empty strip is better than a padded one, and the
 * section reads perfectly well without it.
 */
export function WorkStrip() {
  if (workSamples.length === 0) return null

  return (
    <div className="work-strip">
      <p className="work-strip__label">
        {workSamples.length === 1 ? workStrip.labelOne : workStrip.labelMany}
      </p>
      <ul className="work-strip__items">
        {workSamples.map((sample, index) => (
          <Reveal
            className="work-item"
            delay={0.04 * index}
            key={sample.href}
          >
            <a
              className="work-item__link"
              href={sample.href}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="work-item__frame">
                <img
                  className="work-item__img"
                  src={sample.image}
                  alt={sample.alt}
                  loading="lazy"
                  decoding="async"
                />
              </span>
              <span className="work-item__name">
                {sample.name}
                <span className="work-item__arrow" aria-hidden="true">
                  &#8599;
                </span>
              </span>
              <span className="work-item__kind">{sample.kind}</span>
            </a>
          </Reveal>
        ))}
      </ul>
      <p className="work-strip__note">{workStrip.note}</p>
    </div>
  )
}
