import { Reveal } from '../Reveal/Reveal'
import { PageLink } from '../PageLink/PageLink'
import type { PricingPackageData } from './pricingPackageData'

export function PricingPackage({
  data,
  delay = 0,
  revealY = 14,
}: {
  data: PricingPackageData
  delay?: number
  revealY?: number
}) {
  return (
    <Reveal
      y={revealY}
      delay={delay}
      className={`tier${data.badge ? ' tier--recommended' : ''}`}
    >
      <span className="tier__bar" aria-hidden="true" />

      {/* Rendered whether or not it carries a label, so the rows below stay
          level across the table. */}
      <p className="tier__badge">{data.badge}</p>

      <div className="tier__head">
        <span className="tier__index">{data.index}</span>
        <h3 className="tier__name">{data.name}</h3>
        {data.category ? <p className="tier__category">{data.category}</p> : null}
        {data.tagline ? <p className="tier__tagline">{data.tagline}</p> : null}
      </div>

      <div className="tier__proof">{data.proof ? <p>{data.proof}</p> : null}</div>

      <p className="tier__price">
        {data.startsAt ? <span className="tier__price-label">Starts at</span> : null}
        <span className="tier__price-value">
          <span className="tier__price-currency">$</span>
          {data.price}
          {data.priceUnit ? (
            <span className="tier__price-unit">{data.priceUnit}</span>
          ) : null}
        </span>
      </p>

      <ul className="tier__delivery">
        {data.delivery.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>

      <PageLink href="/contact" className="tier__cta">
        {data.ctaLabel}
        <span className="tier__cta-arrow" aria-hidden="true">
          &#8599;
        </span>
      </PageLink>

      <p className="tier__description">{data.description}</p>

      <div className="tier__best-for">
        {data.bestFor ? (
          <>
            <span className="tier__best-for-label">Best for</span>
            <p>{data.bestFor}</p>
          </>
        ) : null}
      </div>

      <ul className="tier__scope">
        {(data.scope ?? []).map((line) => (
          <li
            key={line}
            className={
              line.startsWith('Everything in')
                ? 'tier__scope-item tier__scope-item--inherited'
                : 'tier__scope-item'
            }
          >
            {line}
          </li>
        ))}
      </ul>

      <div className="tier__scope-note">
        {data.scopeNote ? <p>{data.scopeNote}</p> : null}
      </div>
    </Reveal>
  )
}
