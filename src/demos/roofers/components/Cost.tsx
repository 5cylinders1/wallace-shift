import { cost } from '../content'
import { pageHref } from '../routes'
import { Heading } from './Heading'
import './Cost.css'

/** Typical prices, what a quote includes, and what moves the number: the Prices page. */
export function Prices() {
  return (
    <section id="prices" className="rf-section rf-cost" aria-labelledby="rf-cost-title">
      <div className="rf-container">
        <div className="rf-section__head rf-section__head--split" data-reveal>
          <div>
            <p className="rf-eyebrow">{cost.eyebrow}</p>
            <Heading id="rf-cost-title" className="rf-display">
              {cost.title}
            </Heading>
          </div>
          <p className="rf-lede">{cost.lede}</p>
        </div>

        <div className="rf-cost__tool" data-reveal>
          <p>{cost.toolPrompt}</p>
          <a className="rf-button rf-button--primary" href={pageHref('home', 'estimator')}>
            {cost.toolAction}
          </a>
        </div>

        <div className="rf-cost__layout">
          <div className="rf-cost__prices" data-reveal>
            <Heading rank={1} className="rf-subhead">Typical prices</Heading>
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
            <Heading rank={1} className="rf-subhead">{cost.included.title}</Heading>
            <ul>
              {cost.included.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="rf-cost__more" data-reveal>
          <div className="rf-cost__extras">
            <Heading rank={1} className="rf-subhead">{cost.extras.title}</Heading>
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
            <Heading rank={1} className="rf-subhead">{cost.factors.title}</Heading>
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
