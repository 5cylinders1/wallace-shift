import type { CSSProperties } from 'react'
import { cost, money, quote } from '../content'

const HOME_MIN = 800
const HOME_MAX = 5000
const PEOPLE_MIN = 1
const PEOPLE_MAX = 8

const fill = (value: number, min: number, max: number) => ({ '--fill': `${((value - min) / (max - min)) * 100}%` }) as CSSProperties

interface CostProps {
  home: number
  people: number
  onHome: (value: number) => void
  onPeople: (value: number) => void
}

/** Two answers, one price. The people slider is the same one as the year-of-water chapter's. */
export default function Cost({ home, people, onHome, onPeople }: CostProps) {
  const { size, care, tenYears, why } = quote(home, people)
  const homeText = `${home.toLocaleString('en-US')} sq ft`
  const tank = { '--w': size.tankWidth, '--h': size.tankHeight } as CSSProperties
  return <section id="cost" className="rf-section rf-cost" aria-labelledby="rf-cost-title">
    <div className="rf-section-head">
      <p className="rf-kicker">{cost.kicker}</p>
      <h2 id="rf-cost-title">{cost.title}</h2>
      <p>{cost.body}</p>
    </div>
    <div className="rf-cost-grid">
      <div className="rf-cost-controls">
        <div className="rf-sliders">
          <label className="rf-slider">
            <span><span>{cost.homeLabel}</span><span className="rf-slider-value">{homeText}</span></span>
            <input type="range" aria-label={cost.homeLabel} min={HOME_MIN} max={HOME_MAX} step={100} value={home} aria-valuetext={homeText} style={fill(home, HOME_MIN, HOME_MAX)} onChange={(event) => onHome(Number(event.target.value))} />
          </label>
          <label className="rf-slider">
            <span><span>{cost.peopleLabel}</span><span className="rf-slider-value">{people}</span></span>
            <input type="range" aria-label={cost.peopleLabel} min={PEOPLE_MIN} max={PEOPLE_MAX} step={1} value={people} style={fill(people, PEOPLE_MIN, PEOPLE_MAX)} onChange={(event) => onPeople(Number(event.target.value))} />
          </label>
        </div>
        <p className="rf-cost-why">{why}</p>
      </div>
      <div className="rf-cost-side">
        <div className="rf-quote">
          <div className="rf-quote-top">
            <div aria-live="polite" aria-atomic="true">
              <p className="rf-quote-name">{size.name}</p>
              <strong key={size.id} className="rf-quote-price">{money(size.price)}</strong>
              <p className="rf-quote-unit">installed</p>
            </div>
            <div className="rf-tanks" aria-hidden="true">
              <div className="rf-tanks-row">
                <span className="rf-tank rf-tank-cartridge" />
                <span className="rf-tank" style={tank} />
                <span className="rf-tank" style={tank} />
              </div>
              <p className="rf-tanks-caption">{size.tankWidth} × {size.tankHeight} in</p>
            </div>
          </div>
          <dl className="rf-metrics">
            <div><dt>Keeps up with</dt><dd>{size.flow} gallons a minute</dd></div>
            <div><dt>Filter care, parts and swaps</dt><dd>{money(care)} a year</dd></div>
            <div><dt>Ten years, all in</dt><dd>{money(tenYears)}</dd></div>
          </dl>
          <a className="rf-cta" href="#schedule">Schedule this installation</a>
        </div>
        <p className="rf-cost-note">{cost.changes} {cost.sample}</p>
      </div>
      <div className="rf-cost-included">
        <h3>{cost.includedTitle}</h3>
        <ul>{cost.included.map((item) => <li key={item}>{item}</li>)}</ul>
      </div>
    </div>
  </section>
}
