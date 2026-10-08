import { useEffect, useId, useMemo, useState, type CSSProperties } from 'react'
import { cost, estimator, financing } from '../content'
import type { LeadContext } from '../lead'
import {
  DEFAULT_INPUTS,
  OPTIONS,
  estimateRoof,
  money,
  monthlyPayment,
  type EstimateInputs,
} from '../pricing'
import { Segmented } from './Segmented'
import './Cost.css'

interface CostProps {
  onBallpark: (ballpark: LeadContext['ballpark']) => void
}

const LONG_PLAN = financing.plans[2]

function summarize(inputs: EstimateInputs) {
  const material = OPTIONS.material.find((option) => option.value === inputs.material)?.label ?? ''
  const stories = OPTIONS.stories.find((option) => option.value === inputs.stories)?.label ?? ''
  const pitch = OPTIONS.pitch.find((option) => option.value === inputs.pitch)?.label ?? ''
  return `${inputs.sqft.toLocaleString('en-US')} sq ft, ${stories}-story, ${pitch.toLowerCase()} pitch, ${material.toLowerCase()}, ${inputs.layers === '2' ? 'two layers' : 'one layer'}`
}

export function Cost({ onBallpark }: CostProps) {
  const [inputs, setInputs] = useState<EstimateInputs>(DEFAULT_INPUTS)
  const [touched, setTouched] = useState(false)
  const result = useMemo(() => estimateRoof(inputs), [inputs])
  const sizeId = useId()
  const sizeHelpId = useId()

  const set = <K extends keyof EstimateInputs>(key: K, value: EstimateInputs[K]) => {
    setTouched(true)
    setInputs((current) => ({ ...current, [key]: value }))
  }

  // Only a ballpark the visitor actually shaped counts as "has seen pricing".
  useEffect(() => {
    if (touched) onBallpark({ low: result.low, high: result.high, summary: summarize(inputs) })
  }, [touched, result, inputs, onBallpark])

  const monthly = monthlyPayment((result.low + result.high) / 2, LONG_PLAN)

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

        <div className="rf-cost__layout">
          <form className="rf-estimator" aria-labelledby="rf-estimator-title" onSubmit={(event) => event.preventDefault()} data-reveal>
            <div className="rf-estimator__head">
              <h3 id="rf-estimator-title">{estimator.title}</h3>
              <p>{estimator.lede}</p>
            </div>

            <div className="rf-estimator__size">
              <div className="rf-estimator__size-row">
                <label htmlFor={sizeId}>{estimator.sizeLabel}</label>
                <output htmlFor={sizeId}>{inputs.sqft.toLocaleString('en-US')} sq ft</output>
              </div>
              <input
                id={sizeId}
                type="range"
                min={1000}
                max={5000}
                step={100}
                value={inputs.sqft}
                aria-describedby={sizeHelpId}
                aria-valuetext={`${inputs.sqft.toLocaleString('en-US')} square feet`}
                onChange={(event) => set('sqft', Number(event.target.value))}
                style={{ '--rf-fill': `${((inputs.sqft - 1000) / 4000) * 100}%` } as CSSProperties}
              />
              <p id={sizeHelpId} className="rf-estimator__help">
                {estimator.sizeHelp}
              </p>
            </div>

            <Segmented tone="dark" legend={estimator.storiesLabel} name="est-stories" options={OPTIONS.stories} value={inputs.stories} onChange={(v) => set('stories', v)} columns={3} />
            <Segmented tone="dark" legend={estimator.pitchLabel} name="est-pitch" options={OPTIONS.pitch} value={inputs.pitch} onChange={(v) => set('pitch', v)} columns={3} />
            <Segmented tone="dark" legend={estimator.materialLabel} name="est-material" options={OPTIONS.material} value={inputs.material} onChange={(v) => set('material', v)} columns={3} />
            <div className="rf-estimator__pair">
              <Segmented tone="dark" legend={estimator.layersLabel} name="est-layers" options={OPTIONS.layers} value={inputs.layers} onChange={(v) => set('layers', v)} columns={2} />
              <Segmented tone="dark" legend={estimator.complexityLabel} name="est-shape" options={OPTIONS.shape} value={inputs.shape} onChange={(v) => set('shape', v)} columns={3} />
            </div>

            <div className="rf-estimator__result" aria-live="polite">
              <p className="rf-estimator__result-label">{estimator.resultLabel}</p>
              <p className="rf-estimator__range">
                {money(result.low)}
                <span aria-hidden="true">–</span>
                <span className="rf-visually-hidden"> to </span>
                {money(result.high)}
              </p>
              <p className="rf-estimator__detail">
                About {result.squares} squares ({result.roofArea.toLocaleString('en-US')} sq ft of roof surface).
              </p>
              <ul className="rf-estimator__ways">
                <li>{estimator.insuranceLine}</li>
                <li>
                  Financing: about <strong>{money(monthly)}/mo</strong> at an example {LONG_PLAN.apr}% APR over {LONG_PLAN.months / 12} years.{' '}
                  <a href="#financing">See plans</a>
                </li>
              </ul>
              <a className="rf-button rf-button--primary rf-button--block" href="#estimate">
                {estimator.cta}
              </a>
            </div>
          </form>

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

            <div className="rf-cost__included">
              <h3 className="rf-subhead">{cost.included.title}</h3>
              <ul>
                {cost.included.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
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
