import { aiSubscriptionMoney, aiSubscriptionOffer, aiSubscriptionPlans } from '../../../src/content/aiSubscriptionOffer'
import { engagementGroups } from '../../../src/content/pricing'
import { shiftHandoffHref } from '../../../src/lib/quizHandoff'
import './upgrades.css'

const managedAutomation = engagementGroups.find(group => group.id === 'automation')?.items.find(item => item.title === 'Managed automation')

function Arrow() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M4 12h16m-6-6 6 6-6 6" /></svg>
}
function Plus() {
  return <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><path d="M3 9h12" /><path className="monthly-services__plus" d="M9 3v12" /></svg>
}

export default function Upgrades() {
  return (
    <section className="r-section r-light monthly-services" id="upgrades" aria-labelledby="monthly-services-heading">
      <div className="r-wrap">
        <header className="monthly-services__intro">
          <h2 id="monthly-services-heading">Monthly services.<br /><em>Choose the help you need.</em></h2>
          <p>Optional additions for the conversations and customer details that fill your day. Your original package stays complete.</p>
        </header>

        <div className="monthly-services__grid">
          <article className="monthly-services__tile monthly-services__tile--agents" aria-labelledby="monthly-agents-heading">
            <h3 id="monthly-agents-heading">Chatbot + phone agent</h3>
            <p className="monthly-services__need">Answer website questions and incoming calls while you’re busy.</p>
            <div className="monthly-services__price">
              <strong>{aiSubscriptionMoney(aiSubscriptionPlans.monthly.amount)}</strong>
              <span>/ month after your free month</span>
            </div>
            <div className="monthly-services__value">
              <h4>Each paid month</h4>
              <p>{aiSubscriptionOffer.monthlyChatReplies.toLocaleString('en-US')} chat replies + {aiSubscriptionOffer.monthlyPhoneMinutes} AI phone minutes, using your approved business information and call instructions.</p>
            </div>
            <p className="monthly-services__boundary">Tested before activation. Extra phone usage is purchased separately.</p>
            <a className="monthly-services__link" href={shiftHandoffHref('ai-integration')}>Discuss the agents<Arrow /></a>
            <details className="monthly-services__details">
              <summary>Setup, example & billing<Plus /></summary>
              <div className="monthly-services__detail-body">
                <p>We prepare the answers and call instructions, test both services and walk you through how they work. Both must be ready before you activate.</p>
                <figure className="monthly-services__example">
                  <figcaption>Example inquiry · illustrative</figcaption>
                  <blockquote>“Do you serve my area?”</blockquote>
                  <p>The chatbot answers from your approved service areas. On the phone, the agent follows your call instructions, with your team taking over where agreed.</p>
                </figure>
                <p><strong>Scope and billing.</strong> One business, one existing website and one phone agent. The free month includes {aiSubscriptionOffer.trialChatReplies} chat replies and {aiSubscriptionOffer.trialPhoneMinutes} phone minutes. A card and your approval are required to activate. Cancel during the trial to avoid charges; otherwise the monthly plan renews at {aiSubscriptionMoney(aiSubscriptionPlans.monthly.amount)}. Cancel renewal at any time. Services pause at their usage limits; extra paid phone minutes are available in {aiSubscriptionOffer.extraPhonePackMinutes} minute packs for {aiSubscriptionMoney(aiSubscriptionOffer.extraPhoneMinuteCents * aiSubscriptionOffer.extraPhonePackMinutes)}.</p>
              </div>
            </details>
          </article>

          <article className="monthly-services__tile" aria-labelledby="monthly-follow-up-heading">
            <h3 id="monthly-follow-up-heading">Automatic follow up</h3>
            <p className="monthly-services__need">Keep an agreed follow up sequence working as your business changes.</p>
            <div className="monthly-services__price">
              <strong>{managedAutomation ? `From $${managedAutomation.price}` : 'Quoted'}</strong>
              <span>/ month for ongoing management</span>
            </div>
            <div className="monthly-services__value">
              <h4>Each month</h4>
              <p>Monitoring, maintenance, failure recovery and minor adjustments. Your first workflow setup stays included in the $1,500 lead package.</p>
            </div>
            <p className="monthly-services__boundary">Software and message usage are additional. New workflows are quoted separately.</p>
            <a className="monthly-services__link" href={shiftHandoffHref('automation-integration')}>Discuss follow up<Arrow /></a>
            <details className="monthly-services__details">
              <summary>Setup & example<Plus /></summary>
              <div className="monthly-services__detail-body">
                <p>Before we start, we agree the messages, timing and when they stop, then test the workflow in compatible tools. Monthly management is optional.</p>
                <figure className="monthly-services__example">
                  <figcaption>Example sequence · illustrative</figcaption>
                  <ol className="monthly-services__sequence">
                    <li><strong>A new inquiry arrives</strong><span>An acknowledgment explains the next step.</span></li>
                    <li><strong>No reply yet?</strong><span>A reminder follows at the agreed time.</span></li>
                    <li><strong>The customer replies</strong><span>The sequence stops. Your team takes over.</span></li>
                  </ol>
                </figure>
                <p>Substantial changes need a separate scope. We confirm any messaging permissions and sender setup before launch.</p>
              </div>
            </details>
          </article>

          <article className="monthly-services__tile monthly-services__tile--crm" aria-labelledby="monthly-crm-heading">
            <h3 id="monthly-crm-heading">Wallace Shift CRM</h3>
            <p className="monthly-services__need">For teams piecing together customer details from messages and notes.</p>
            <div className="monthly-services__price">
              <strong className="monthly-services__status">In development</strong>
              <span>Monthly price and timing to be confirmed</span>
            </div>
            <div className="monthly-services__value">
              <h4>Planned monthly access</h4>
              <p>A customer workspace with contact details, conversation notes and next actions. Included support and connections are still being defined.</p>
            </div>
            <p className="monthly-services__boundary">For your own customers. Separate from your Wallace Shift agreement and invoice portal.</p>
            <a className="monthly-services__link" href={shiftHandoffHref('custom-web-app')}>Discuss your CRM needs<Arrow /></a>
            <details className="monthly-services__details">
              <summary>What we’re building<Plus /></summary>
              <div className="monthly-services__detail-body">
                <p>CRM means customer relationship manager: one place to see who needs help, what has been discussed and what your team should do next.</p>
                <figure className="monthly-services__example">
                  <figcaption>Planned experience · fictional record</figcaption>
                  <div className="monthly-services__record">
                    <strong>Alex Morgan</strong><p>Asked about a kitchen remodel</p>
                    <dl>
                      <div><dt>Last conversation</dt><dd>Needs an estimate</dd></div>
                      <div><dt>Next action</dt><dd>Arrange a site visit</dd></div>
                      <div><dt>Assigned to</dt><dd>Jamie</dd></div>
                    </dl>
                  </div>
                </figure>
                <p>Share how you manage customers today. Availability, migration, connections and ongoing support will be confirmed before the CRM is offered.</p>
              </div>
            </details>
          </article>
        </div>

        <footer className="monthly-services__footer">
          <p>Not sure which fits? We’ll agree the setup, handoff and ongoing support with you.</p>
          <a className="monthly-services__link" href="#questions">Talk through the options<Arrow /></a>
        </footer>
      </div>
    </section>
  )
}
