import type { RefObject } from 'react'
import { efficiencyLost, hardnessName, study } from '../content'

interface StudyProps {
  sectionRef: RefObject<HTMLElement | null>
  years: number
  hardness: number
  hot: 50 | 100
  onYears: (value: number) => void
  onHardness: (value: number) => void
  onHot: (value: 50 | 100) => void
}

/** The controls for the scale study. The pipes themselves are in the engine. */
export default function Study({ sectionRef, years, hardness, hot, onYears, onHardness, onHot }: StudyProps) {
  const lost = efficiencyLost(hardness, hot, years)
  return <section ref={sectionRef} className="rf-chapter rf-study" aria-labelledby="rf-study-title">
    <article data-step className="rf-step is-current">
      <div className="rf-copy rf-study-copy">
        <div className="rf-tool-intro">
          <p className="rf-kicker">{study.kicker}</p>
          <h2 id="rf-study-title">{study.title}</h2>
          <p>{study.body}</p>
        </div>

        <div className="rf-tool-controls">
        <div className="rf-sliders">
          <label className="rf-slider">
            <span><span>{study.yearsLabel}</span><span className="rf-slider-value">{years} {years === 1 ? 'year' : 'years'}</span></span>
            <input type="range" aria-label={study.yearsLabel} min={0} max={15} step={1} value={years} onChange={(event) => onYears(Number(event.target.value))} />
          </label>
          <label className="rf-slider">
            <span><span>{study.hardnessLabel}</span><span className="rf-slider-value">{hardness} gpg · {hardnessName(hardness)}</span></span>
            <input type="range" aria-label={study.hardnessLabel} min={3} max={30} step={1} value={hardness} onChange={(event) => onHardness(Number(event.target.value))} />
          </label>
          <fieldset className="rf-hot">
            <legend>{study.hotLabel}</legend>
            {([50, 100] as const).map((value) => <label key={value} className={hot === value ? 'is-on' : ''}>
              <input type="radio" name="rf-hot" checked={hot === value} onChange={() => onHot(value)} />{value} gallons
            </label>)}
          </fieldset>
        </div>

        <dl className="rf-metrics" aria-live="polite">
          <div><dt>{study.lostLabel}</dt><dd>{lost.toFixed(0)}%</dd></div>
          <div><dt>{study.costLabel}</dt><dd>+{lost.toFixed(0)}%</dd></div>
          <div className="is-good"><dt>{study.controlLabel}</dt><dd>{study.controlValue}</dd></div>
        </dl>
        <p className="rf-footnote">{study.footnote}</p>
        </div>
      </div>
    </article>
  </section>
}
