import { pricingNav } from '../../content/pricing'
import './PricingNav.css'

interface PricingNavProps {
  activeId: string
  onSelect: (id: string, index: number) => void
}

/**
 * The deck's only control surface. Presentational on purpose — the deck
 * owns which slide is current, so the bar and the track can never disagree.
 *
 * These stay real anchors rather than buttons: `#web-apps` still deep-links
 * and still works if the click handler never runs, because the browser
 * scrolls a target into view along both axes, including inside the
 * horizontal track.
 */
export function PricingNav({ activeId, onSelect }: PricingNavProps) {
  return (
    <nav className="pricing-nav" aria-label={pricingNav.label}>
      <div className="pricing-nav__inner">
        <ul className="pricing-nav__list">
          {pricingNav.items.map((item, index) => {
            const isActive = item.id === activeId
            return (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  className={`pricing-nav__link${isActive ? ' pricing-nav__link--active' : ''}`}
                  aria-current={isActive ? 'true' : undefined}
                  onClick={(event) => {
                    event.preventDefault()
                    onSelect(item.id, index)
                  }}
                >
                  <span className="pricing-nav__index" aria-hidden="true">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  {item.label}
                </a>
              </li>
            )
          })}
        </ul>
      </div>
    </nav>
  )
}
