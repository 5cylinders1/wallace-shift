import type { EngagementGroup } from '../../content/pricing'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { PricingPackage } from './PricingPackage'
import { packageFromEngagement } from './pricingPackageData'
import { Reveal } from '../Reveal/Reveal'
import './EngagementRows.css'

const REVEAL_Y = 14

interface EngagementPanelProps {
  group: EngagementGroup
}

/**
 * One pricing area as a deck panel: heading, its stages as horizontal
 * rows, and the costs that sit outside all of them.
 *
 * The stages stay stacked rows rather than a comparison grid because they
 * are sequential parts of one engagement, not competing packages — there
 * is nothing to read column-against-column.
 */
/** Below this the area presents as three packages, like the website tiers;
 *  above it the established row layout is unchanged. */
const PACKAGE_QUERY = '(max-width: 1023px)'

export function EngagementPanel({ group }: EngagementPanelProps) {
  const asPackages = useMediaQuery(PACKAGE_QUERY)
  return (
    <section className="engagement-group" id={group.id}>
      <div className="container">
        <div className="engagement-group__intro">
          <Reveal y={REVEAL_Y}>
            <p className="eyebrow engagement-group__label">{group.label}</p>
          </Reveal>
          <Reveal y={REVEAL_Y} delay={0.06}>
            <h2 className="engagement-group__heading">{group.heading}</h2>
          </Reveal>
          <Reveal y={REVEAL_Y} delay={0.12}>
            <p className="engagement-group__supporting">{group.supporting}</p>
          </Reveal>
        </div>

        {asPackages ? (
          <div className="tier-table__grid engagement-group__packages">
            {group.items.map((item, index) => (
              <PricingPackage
                key={item.title}
                data={packageFromEngagement(group.id, item)}
                delay={index * 0.05}
                revealY={REVEAL_Y}
              />
            ))}
          </div>
        ) : (
        <div className="engagement-group__rows">
          {group.items.map((item, index) => (
            <Reveal
              key={item.title}
              y={REVEAL_Y}
              delay={index * 0.05}
              className="engagement-row"
            >
              <span className="engagement-row__index">{item.index}</span>

              <div className="engagement-row__body">
                <h3 className="engagement-row__title">{item.title}</h3>
                <p className="engagement-row__description">
                  {item.description}
                </p>
                {item.note ? (
                  <p className="engagement-row__note">{item.note}</p>
                ) : null}
              </div>

              <div className="engagement-row__price">
                <p className="engagement-row__amount">
                  {item.startsAt ? (
                    <span className="engagement-row__starts">Starts at </span>
                  ) : null}
                  <span className="engagement-row__figure">${item.price}</span>
                  {item.priceUnit ? (
                    <span className="engagement-row__unit">
                      {item.priceUnit}
                    </span>
                  ) : null}
                </p>
                <p className="engagement-row__window">{item.window}</p>
              </div>
            </Reveal>
          ))}
          </div>
        )}

        <Reveal y={REVEAL_Y} className="engagement-group__outro">
          <p className="engagement-group__note">{group.note}</p>
        </Reveal>
      </div>
    </section>
  )
}
