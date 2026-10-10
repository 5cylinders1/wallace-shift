import { cost } from '../content'
import type { LeadContext } from '../lead'
import { RoofTool } from '../roof/RoofTool'
import type { RoofAddress } from '../roof/types'
import './Cost.css'

interface CostProps {
  onBallpark: (ballpark: LeadContext['ballpark']) => void
  onAddress: (address: RoofAddress | null) => void
}

export function Cost({ onBallpark, onAddress }: CostProps) {
  return (
    <section id="cost" className="rf-section rf-cost" aria-labelledby="rf-cost-title">
      <div className="rf-container">
        <div className="rf-section__head rf-section__head--split" data-reveal>
          <div>
            <p className="rf-eyebrow">{cost.eyebrow}</p>
            <h2 id="rf-cost-title" className="rf-display">
              {cost.title}
            </h2>
          </div>
          <p className="rf-lede">{cost.lede}</p>
        </div>

        <RoofTool onEstimate={onBallpark} onAddress={onAddress} />

        <div className="rf-cost__layout">
          <div className="rf-cost__prices" data-reveal>
            <h3 className="rf-subhead">Typical prices</h3>
            <dl className="rf-prices">
              {cost.rows.map((row) => (
                <div key={row.name} className="rf-prices__row">
                  <dt>{row.name}</dt>
                  <dd className="rf-prices__range">{row.range}</dd>
                  <dd className="rf-prices__body">{row.body}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="rf-cost__included" data-reveal>
            <h3 className="rf-subhead">{cost.included.title}</h3>
            <ul>
              {cost.included.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="rf-cost__more" data-reveal>
          <div className="rf-cost__extras">
            <h3 className="rf-subhead">{cost.extras.title}</h3>
            <dl>
              {cost.extras.items.map(([name, price]) => (
                <div key={name}>
                  <dt>{name}</dt>
                  <dd>{price}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="rf-cost__factors">
            <h3 className="rf-subhead">{cost.factors.title}</h3>
            <dl>
              {cost.factors.items.map(([name, body]) => (
                <div key={name}>
                  <dt>{name}</dt>
                  <dd>{body}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        <p className="rf-demo-note rf-cost__note">{cost.demoNote}</p>
      </div>
    </section>
  )
}
