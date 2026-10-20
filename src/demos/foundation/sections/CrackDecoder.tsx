import { useId, useMemo, useState } from 'react'
import { addToBrief } from '../brief'
import { PRICE_NOTE, range, repairs } from '../pricing'
import { href, navigate, onLink } from '../routes'
import { areas, resolveTier, symptoms, tiers, type Area, type Symptom } from '../symptoms'
import CrackFigure from './CrackFigure'

export function TierBadge({ tier }: { tier: keyof typeof tiers }) {
  return <span className={`dt-tier dt-tier-${tier}`}><span aria-hidden="true" className="dt-tier-dots">{[0, 1, 2].map(i => <i key={i} className={i <= tiers[tier].rank ? 'is-on' : ''} />)}</span>{tiers[tier].label}</span>
}

/** The answer card for one symptom, with follow-ups that can raise the urgency. */
export function SymptomResult({ symptom, headingLevel = 3, hideMeaning = false }: { symptom: Symptom; headingLevel?: 2 | 3; hideMeaning?: boolean }) {
  const [answers, setAnswers] = useState<(boolean | null)[]>(() => symptom.escalate.map(() => null))
  const tier = resolveTier(symptom, answers.map(Boolean))
  const raised = tier !== symptom.tier
  const Heading = headingLevel === 2 ? 'h2' : 'h3'
  const id = useId()

  const request = () => {
    addToBrief({ symptoms: [symptom.slug], source: 'Crack decoder', note: `${symptom.short}: ${tiers[tier].label.toLowerCase()}` })
    navigate(href.home('#request'))
  }

  return <div className="dt-result">
    <div className="dt-result-head">
      <TierBadge tier={tier} />
      <p className="dt-result-line" aria-live="polite">{raised ? `Raised from “${tiers[symptom.tier].label}” by your answers. ` : ''}{tiers[tier].line}</p>
    </div>
    {!hideMeaning && <>
      <Heading className="dt-result-title">What it usually means</Heading>
      <p>{symptom.meaning}</p>
    </>}
    {symptom.escalate.length > 0 && <fieldset className="dt-followups">
      <legend>A few quick checks</legend>
      {symptom.escalate.map((item, index) => <div className="dt-followup" key={item.question}>
        <span id={`${id}-q${index}`}>{item.question}</span>
        <div className="dt-yesno" role="group" aria-labelledby={`${id}-q${index}`}>
          {[false, true].map(value => <button key={String(value)} type="button" aria-pressed={answers[index] === value} onClick={() => setAnswers(previous => previous.map((answer, i) => (i === index ? value : answer)))}>{value ? 'Yes' : 'No'}</button>)}
        </div>
      </div>)}
    </fieldset>}
    <div className="dt-result-columns">
      <div>
        <Heading className="dt-result-title">What to do now</Heading>
        <ol className="dt-steps-list">{symptom.now.map(item => <li key={item}>{item}</li>)}</ol>
      </div>
      <div>
        <Heading className="dt-result-title">If it needs fixing</Heading>
        <ul className="dt-repair-list">{symptom.repairs.map(id => <li key={id}><span>{repairs[id].name}</span><span className="dt-mono">{range(repairs[id])}</span></li>)}</ul>
        <p className="dt-fine">{PRICE_NOTE}</p>
      </div>
    </div>
    {symptom.also.length > 0 && <p className="dt-also"><strong>Also possible:</strong> {symptom.also.join('. ')}.</p>}
    <div className="dt-result-actions">
      <button type="button" className="dt-button dt-button-ink" onClick={request}>Ask for an inspection with this attached</button>
      {symptom.measurable && <a className="dt-button dt-button-line" href={`${href.log()}?crack=${symptom.slug}`} onClick={onLink}>Log this crack</a>}
    </div>
    <p className="dt-guide-note">A guide, not a diagnosis. Datum is a fictional company in a design concept.</p>
  </div>
}

/** Pick where you're looking, then what you see. */
export default function CrackDecoder({ initial }: { initial?: string }) {
  const start = initial ? symptoms.find(item => item.slug === initial) : undefined
  const [area, setArea] = useState<Area>(start?.area ?? 'walls')
  const [selected, setSelected] = useState<string | null>(start?.slug ?? null)
  const options = useMemo(() => symptoms.filter(item => item.area === area), [area])
  const symptom = symptoms.find(item => item.slug === selected) ?? null

  return <div className="dt-decoder">
    <div className="dt-decoder-pick">
      <p className="dt-label" id="decoder-where">1 · Where are you seeing it?</p>
      <div className="dt-areas" role="group" aria-labelledby="decoder-where">
        {(Object.keys(areas) as Area[]).map(key => <button key={key} type="button" aria-pressed={area === key} onClick={() => { setArea(key); setSelected(null) }}>{areas[key]}</button>)}
      </div>
      <p className="dt-label" id="decoder-what">2 · What does it look like?</p>
      <div className="dt-symptoms" role="group" aria-labelledby="decoder-what">
        {options.map(item => <button key={item.slug} type="button" className="dt-symptom" aria-pressed={selected === item.slug} onClick={() => setSelected(item.slug)}>
          <CrackFigure figure={item.figure} />
          <span>{item.short}</span>
        </button>)}
      </div>
    </div>
    <div className="dt-decoder-answer" aria-live="polite">
      {symptom ? <>
        <p className="dt-label">3 · {symptom.title}</p>
        <SymptomResult key={symptom.slug} symptom={symptom} />
        <a className="dt-text-link" href={href.crack(symptom.slug)} onClick={onLink}>Read the full guide to {symptom.short.toLowerCase()} →</a>
      </> : <div className="dt-decoder-empty">
        <CrackFigure figure={options[0]?.figure ?? 'vertical'} className="dt-figure dt-figure-ghost" />
        <p>Choose what you’re seeing and the answer appears here: the usual cause, how soon to act and what the fix usually involves.</p>
      </div>}
    </div>
  </div>
}
