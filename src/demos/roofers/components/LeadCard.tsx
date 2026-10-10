import { brand } from '../brand'
import {
  BEST_TIMES,
  INSURANCE,
  ISSUES,
  OWNERSHIP,
  PAYMENT,
  PROPERTIES,
  ROOF_AGES,
  STORM_DATES,
  TIMELINES,
  asksStormDate,
  formatPhone,
  labelFor,
} from '../lead'
import type { LeadSubmission } from '../leadAdapter'
import { roofTool } from '../content'
import { money } from '../pricing'
import './LeadCard.css'

/** The measuring service's own credit, unaltered, for figures repeated here ("Google Maps" for Google's). */
const measuredCredit = (id: string | null | undefined) =>
  (id && roofTool.measure.credits[id as keyof typeof roofTool.measure.credits]) || 'a measuring service'

const PRIORITY_LABEL = { hot: 'Hot lead', warm: 'Warm lead', nurture: 'Nurture' } as const

/** The lead as the contractor's inbox or CRM would show it. */
export function LeadCard({ lead }: { lead: LeadSubmission }) {
  const { answers, context, score } = lead
  const firstName = answers.name.trim().split(/\s+/)[0]
  const rows: Array<[string, string]> = [
    ['Problem', labelFor(ISSUES, answers.issue)],
    ['Property', labelFor(PROPERTIES, answers.property)],
    ['Roof age', labelFor(ROOF_AGES, answers.roofAge)],
    ['Insurance', labelFor(INSURANCE, answers.insurance)],
    ...(asksStormDate(answers) ? ([['Damage date', labelFor(STORM_DATES, answers.stormDate)]] as Array<[string, string]>) : []),
    ['Paying with', labelFor(PAYMENT, answers.payment)],
    ['Timeline', labelFor(TIMELINES, answers.timeline)],
    ['Owner', labelFor(OWNERSHIP, answers.owner)],
    ['Best time', labelFor(BEST_TIMES, answers.bestTime)],
  ]

  return (
    <article className={`rf-lead rf-lead--${score.priority}`} aria-label="Lead preview">
      <header className="rf-lead__head">
        <p className="rf-lead__source">New website lead · {brand.company}</p>
        <p className="rf-lead__priority">
          {PRIORITY_LABEL[score.priority]}
          <span>score {score.score}</span>
        </p>
      </header>

      <div className="rf-lead__who">
        <h4>{answers.name.trim()}</h4>
        <p>
          {formatPhone(answers.phone)} · {answers.email.trim()}
        </p>
        <p>
          {answers.street.trim()}, {answers.zip.trim()}
          {answers.texts ? ' · OK to text' : ''}
        </p>
      </div>

      <dl className="rf-lead__facts">
        {rows.map(([name, value]) => (
          <div key={name}>
            <dt>{name}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>

      <div className="rf-lead__seen">
        <h5>Already seen on the site</h5>
        <ul>
          {context.ballpark?.roof && context.ballpark.roof.source !== 'home-size' && (
            <li>
              {context.ballpark.roof.source === 'sample' ? 'Tried the sample house: ' : `Roof at ${context.ballpark.roof.address ?? 'their address'}: `}
              {context.ballpark.roof.footprintSqFt.toLocaleString('en-US')} sq ft {context.ballpark.roof.source === 'measured' ? `footprint measured (${measuredCredit(context.ballpark.roof.measuredBy)})` : 'outline'} at{' '}
              {context.ballpark.roof.pitch}/12
              {context.ballpark.roof.measuredPitch != null ? ` (measured ${context.ballpark.roof.measuredPitch}/12)` : ''} ≈{' '}
              {context.ballpark.roof.roofSqFt.toLocaleString('en-US')} sq ft ({context.ballpark.roof.squares} squares)
              {context.ballpark.roof.buildings > 1 ? `, ${context.ballpark.roof.buildings} buildings` : ''}
              {context.ballpark.roof.confidence ? `, ${context.ballpark.roof.confidence.toLowerCase()} confidence` : ''}
            </li>
          )}
          {context.ballpark?.roof?.solar && (
            <li>
              Priced solar shingles: {context.ballpark.roof.solar.kw} kW
              {context.ballpark.roof.solar.yearlyKwh ? `, about ${context.ballpark.roof.solar.yearlyKwh.toLocaleString('en-US')} kWh a year` : ''}. Ready
              for a solar proposal.
            </li>
          )}
          <li>{context.ballpark ? `Estimate ${money(context.ballpark.low)}–${money(context.ballpark.high)} (${context.ballpark.summary})` : 'Did not use the roof estimator'}</li>
          <li>{context.payment ? `Payment ${money(context.payment.monthly)}/mo on ${money(context.payment.amount)} (${context.payment.plan})` : 'Did not open the payment calculator'}</li>
          <li>Insurance, process, warranty and FAQ answers</li>
        </ul>
      </div>

      {answers.notes.trim() && (
        <blockquote className="rf-lead__notes">“{answers.notes.trim()}”</blockquote>
      )}

      {score.reasons.length > 0 && (
        <ul className="rf-lead__reasons" aria-label="Why this priority">
          {score.reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      )}

      <p className="rf-lead__next">
        <strong>Suggested next step:</strong> {score.nextStep}
      </p>

      <div className="rf-lead__auto">
        <h5>What a live build can also do, automatically</h5>
        <ul>
          <li>
            Text {firstName}: “Thanks {firstName} — this is {brand.company}. We got your request and will call you{' '}
            {answers.bestTime === 'any' ? 'shortly' : `this ${answers.bestTime}`}.”
          </li>
          <li>Create the contact in your CRM, tagged by problem, insurance status and priority.</li>
          <li>Send an inspection booking link and the night-before prep list.</li>
        </ul>
      </div>
    </article>
  )
}
