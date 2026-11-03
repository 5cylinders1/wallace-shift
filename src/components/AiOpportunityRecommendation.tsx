import { useLayoutEffect, useRef, useState } from 'react'
import {
  aiPackages, recommendAiOpportunity, workflowOptions, roleOptions, revenueOptions, weeklyHoursOptions,
  aiExperienceOptions, aiBarrierOptions, approverOptions, impactOptions, budgetOptions, timingOptions,
  type AiPackageId,
} from '../content/aiOffer'
import type { AiOpportunityFormValues } from '../lib/aiOpportunityAdapter'
import { aiConsultation } from '../content/aiConsultation'

export type AiNextStepSelection =
  | { nextStep: 'package'; packageId: AiPackageId; contactMethod: 'email' }
  | { nextStep: 'consultation'; packageId: ''; contactMethod: 'email' | 'call' }

function label(options: readonly { value: string; label: string }[], value: string) {
  return options.find(option => option.value === value)?.label ?? 'Not provided'
}

export function AiOpportunityRecommendation({ values, onRequestContact }: {
  values: AiOpportunityFormValues; onRequestContact: (selection: AiNextStepSelection) => void
}) {
  const recommendation = recommendAiOpportunity(values)
  const [packageId, setPackageId] = useState<AiPackageId>(values.packageId || recommendation.packageId || 'inquiry')
  const [path, setPath] = useState<'packages' | null>(values.packageId ? 'packages' : null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  useLayoutEffect(() => {
    headingRef.current?.focus({ preventScroll: true })
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [path])
  const offer = aiPackages[packageId]
  const consultationRecommended = recommendation.kind !== 'package'
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle')
  const facts = [
    ...(values.businessType.trim() ? [['Business', values.businessType]] : []),
    ['Business challenges', values.workflows.map(value => label(workflowOptions, value)).join('; ')],
    ['Purchase authority', label(roleOptions, values.role)],
    ...((values.role === 'joint' || values.role === 'researching') ? [['Approver participation', label(approverOptions, values.approverAvailability)]] : []),
    ['Annual revenue', label(revenueOptions, values.revenue)],
    ['Weekly team time', label(weeklyHoursOptions, values.weeklyHours)],
    ['Consequences', values.impacts.map(value => label(impactOptions, value)).join('; ')],
    ['AI experience', label(aiExperienceOptions, values.aiExperience)],
    ...(values.aiExperience !== 'new' ? [['AI barriers', values.aiBarriers.map(value => label(aiBarrierOptions, value)).join('; ')]] : []),
    ['Current tools', values.currentTools || 'To be confirmed'],
    ...(values.workflowDetails.trim() ? [['Additional context', values.workflowDetails]] : []),
    ['Investment', label(budgetOptions, values.budget)],
    ['Timing', label(timingOptions, values.timing)],
  ]
  const summary = ['Wallace Shift project preparation', '', ...facts.map(([name, value]) => `${name}: ${value}`), '', recommendation.title, recommendation.rationale, '', 'This is a preliminary recommendation, not a quote or confirmed booking.'].join('\n')
  async function copySummary() {
    try { await navigator.clipboard.writeText(summary); setCopyState('copied') }
    catch { setCopyState('failed') }
  }

  return <div className="qf-recommendation">
    <header className="qf-result-intro">
      {path && <button className="qf-text-link qf-path-back" type="button" onClick={() => setPath(null)}>Back to both options</button>}
      <h1 ref={headingRef} tabIndex={-1}>{path ? 'Choose your package.' : 'Two ways to get started.'}</h1>
      {path && <p>Choose a defined project, sign the agreement, and pay online. No consultation is required.</p>}
    </header>

    {!path ? <div className="qf-path-choices">
      <section aria-labelledby="qf-self-service-title">
        <h2 id="qf-self-service-title">Buy a package now</h2>
        <p>Pick a package, sign the agreement, and pay online.</p>
        <p className="qf-choice-detail">From $2,500.<br />Free business website included.</p>
        <button className="ao-button" type="button" onClick={() => setPath('packages')}>View packages and buy</button>
      </section>
      <div className="qf-path-or">OR</div>
      <section aria-labelledby="qf-appointment-title">
        <h2 id="qf-appointment-title">Book a consultation</h2>
        <p><strong>For a more complex project.</strong><br />Get a custom plan and price.</p>
        <p className="qf-choice-detail">Free {aiConsultation.durationMinutes} minute consultation.<br />Meet with us on Google Meet.</p>
        <button className="ao-button ao-button--secondary" type="button" onClick={() => onRequestContact({ nextStep: 'consultation', packageId: '', contactMethod: 'email' })}>Book a free consultation</button>
      </section>
    </div> : <section className="qf-package-path" aria-label="Self service packages">
      <fieldset className="qf-package-options">
        <legend className="visually-hidden">Choose your package</legend>
        {Object.values(aiPackages).map(item => <label className={`qf-package-option${packageId === item.id ? ' is-selected' : ''}`} key={item.id}>
          <input type="radio" name="resultPackage" value={item.id} checked={packageId === item.id} onChange={() => setPackageId(item.id)} />
          <span><strong>{item.name}</strong><small>{item.description}</small>{recommendation.packageId === item.id && <em>Suggested by your answers</em>}</span>
          <b>${item.price.toLocaleString('en-US')}<small>One time</small></b>
        </label>)}
      </fieldset>
      <div className="qf-package-scope" key={packageId}>
        <h2>Included in {offer.name}</h2>
        <ul>{offer.scope.map(item => <li key={item}>{item}</li>)}<li>Testing, a team walkthrough, and documentation</li><li>A free one page business website with one inquiry form and one revision round</li></ul>
        <p>{offer.boundary} Ongoing support and software subscriptions are separate.</p>
        <details><summary>Delivery and what we need from you</summary><p>{offer.delivery}</p></details>
      </div>
      <div className="qf-package-purchase">
        <div><span>One time project price</span><strong>${offer.price.toLocaleString('en-US')}</strong></div>
        <button className="ao-button" type="button" onClick={() => onRequestContact({ nextStep: 'package', packageId, contactMethod: 'email' })}>Continue to checkout</button>
      </div>
      <p className="qf-path-note">Next, enter your details and verify your email. Then review and sign your agreement before paying securely through Stripe.</p>
    </section>}

    <section className="qf-result-context" aria-label="Your answers and next step">
      <details><summary>Review your answers</summary>
        {!path && consultationRecommended && <p><strong>We recommend starting with a conversation.</strong> {(values.role === 'joint' || values.role === 'researching') ? 'Bring the person who approves the investment so we can plan the project together.' : values.budget === 'unavailable' ? 'The packages start at $2,500. We can discuss what is practical for your budget before you commit.' : 'We can use your answers to confirm the fit, scope, and value before you choose a package.'}</p>}
        <dl className="qf-summary">{facts.map(([name, value]) => <div key={name}><dt>{name}</dt><dd>{value}</dd></div>)}</dl>
        <button className="qf-text-link" type="button" onClick={copySummary}>Copy my answers</button>
        <p role="status">{copyState === 'copied' ? 'Your answers were copied.' : copyState === 'failed' ? 'Copying is unavailable. You can select and copy your answers above.' : ''}</p>
      </details>
    </section>
  </div>
}
