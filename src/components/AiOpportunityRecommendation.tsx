import { useState } from 'react'
import {
  aiOffer, aiPackages, recommendAiOpportunity, workflowOptions, roleOptions, revenueOptions, weeklyHoursOptions,
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
  const [contactMethod, setContactMethod] = useState<'email' | 'call'>(values.contactMethod)
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
      <h1>Let’s put AI to work.</h1>
      <p>Choose a focused package or plan a free consultation. We can use your answers to plan a practical first project.</p>
      <nav className="qf-path-shortcuts" aria-label="Choose your next step"><a href="#qf-package-path">Choose a package</a><a href="#qf-consultation-path">Free consultation</a></nav>
    </header>

    <div className="qf-conversion-paths">
      <section className="qf-package-path" id="qf-package-path" tabIndex={-1} aria-labelledby="qf-package-title">
        <h2 id="qf-package-title">Start with a package</h2>
        <p>A defined scope and a clear starting price for one part of your business.</p>
        <fieldset className="qf-package-options">
          <legend className="visually-hidden">Choose your package</legend>
          {Object.values(aiPackages).map(item => <label className={`qf-package-option${packageId === item.id ? ' is-selected' : ''}`} key={item.id}>
            <input type="radio" name="resultPackage" value={item.id} checked={packageId === item.id} onChange={() => setPackageId(item.id)} />
            <span><strong>{item.name}</strong><small>{item.id === 'inquiry' ? 'Turn inquiries into replies ready for review.' : 'Turn staff notes into useful system updates.'}</small>{recommendation.packageId === item.id && <em>Suggested by your answers</em>}</span>
            <b>${item.price.toLocaleString('en-US')}</b>
          </label>)}
        </fieldset>
        <details className="qf-package-details" key={packageId}>
          <summary>What is included in {offer.name}?</summary>
          <ul>{offer.scope.map(item => <li key={item}>{item}</li>)}<li>Testing, a team walkthrough, and documentation</li></ul>
          <p>{offer.boundary} Software subscriptions, AI usage, and ongoing support are separate.</p>
        </details>
        <button className={`ao-button${consultationRecommended ? ' ao-button--secondary' : ''}`} type="button" onClick={() => onRequestContact({ nextStep: 'package', packageId, contactMethod: 'email' })}>Continue with this package</button>
        <p className="qf-path-note">Request your selected package. We confirm compatibility and the agreement before payment. Online checkout is not open yet.</p>
      </section>

      <section className="qf-consultation-path" id="qf-consultation-path" tabIndex={-1} aria-labelledby="qf-consultation-title">
        <h2 id="qf-consultation-title">Plan a free consultation</h2>
        <p>Need a custom solution or help choosing? Spend {aiConsultation.durationMinutes} minutes with us to map out your next step.</p>
        <ul className="qf-consultation-agenda"><li>Review what is holding your business back</li><li>Compare the potential time savings and costs</li><li>Agree on a practical scope and next step</li></ul>
        <fieldset className="qf-meeting-options">
          <legend>How would you like to talk?</legend>
          <label className={contactMethod === 'email' ? 'is-selected' : ''}><input type="radio" name="resultMeeting" checked={contactMethod === 'email'} onChange={() => setContactMethod('email')} /><span><strong>Google Meet</strong><small>Use your email for the invitation</small></span></label>
          <label className={contactMethod === 'call' ? 'is-selected' : ''}><input type="radio" name="resultMeeting" checked={contactMethod === 'call'} onChange={() => setContactMethod('call')} /><span><strong>Phone call</strong><small>No email needed</small></span></label>
        </fieldset>
        <button className={`ao-button${!consultationRecommended ? ' ao-button--secondary' : ''}`} type="button" onClick={() => onRequestContact({ nextStep: 'consultation', packageId: '', contactMethod })}>{contactMethod === 'email' ? 'Choose a consultation time' : 'Plan my free phone call'}</button>
        <p className="qf-path-note">{contactMethod === 'email' ? 'Book on our Google calendar without leaving this page. Google sends your confirmation and meeting link.' : 'Share your phone number next. We will call to arrange a time. No email required.'}</p>
      </section>
    </div>

    <section className="qf-result-bonus" aria-labelledby="qf-bonus-title">
      <div><h2 id="qf-bonus-title">Your project. A free business website, too.</h2><p>A qualifying project of ${aiOffer.minimumProjectFee.toLocaleString('en-US')} or more includes a one page business website.</p></div>
      <details><summary>See what is included</summary><p>Your supplied branding and content, a responsive page, one inquiry form, and one revision round. Eligibility and scope are confirmed in the agreement. The minimum excludes the bonus website, taxes, and third party costs. Domain, hosting, and ongoing care are agreed separately.</p></details>
    </section>

    <section className="qf-result-context" aria-label="Your answers and next step">
      {consultationRecommended && <p><strong>We recommend starting with a conversation.</strong> {(values.role === 'joint' || values.role === 'researching') ? 'Bring the person who approves the investment so we can plan the project together.' : values.budget === 'unavailable' ? 'The packages start at $2,500. We can discuss what is practical for your budget before you commit.' : 'We can use your answers to confirm the fit, scope, and value before you choose a package.'}</p>}
      <details><summary>Review your answers</summary><dl className="qf-summary">{facts.map(([name, value]) => <div key={name}><dt>{name}</dt><dd>{value}</dd></div>)}</dl>
        <button className="qf-text-link" type="button" onClick={copySummary}>Copy my answers</button>
        <p role="status">{copyState === 'copied' ? 'Your answers were copied.' : copyState === 'failed' ? 'Copying is unavailable. You can select and copy your answers above.' : ''}</p>
      </details>
    </section>
  </div>
}
