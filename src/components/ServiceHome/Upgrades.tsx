import { aiSubscriptionMoney, aiSubscriptionOffer, aiSubscriptionPlans } from '../../content/aiSubscriptionOffer'
import { engagementGroups } from '../../content/pricing'
import { shiftHandoffHref } from '../../lib/quizHandoff'
import './upgrades.css'

const managedAutomation = engagementGroups.find(group => group.id === 'automation')?.items.find(item => item.title === 'Managed automation')
const followUpSetup = engagementGroups.find(group => group.id === 'automation')?.items.find(item => item.title === 'Follow-up setup')

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
            <h3 id="monthly-follow-up-heading">Managed follow up</h3>
            <p className="monthly-services__need">For an existing follow up workflow you want us to look after.</p>
            <div className="monthly-services__price">
              <strong>{managedAutomation ? `From $${managedAutomation.price}` : 'Quoted'}</strong>
              <span>/ month for optional ongoing management</span>
            </div>
            <div className="monthly-services__value">
              <h4>Each month</h4>
              <p>We monitor your workflow, fix failures and make minor adjustments as your business changes.</p>
            </div>
            <p className="monthly-services__boundary">First setup: included in the $1,500 lead package, or {followUpSetup ? `from $${followUpSetup.price} once` : 'quoted separately'}. Software and usage extra.</p>
            <a className="monthly-services__link" href={shiftHandoffHref('automation-integration')}>Discuss follow up<Arrow /></a>
            <details className="monthly-services__details">
              <summary>Setup costs & example<Plus /></summary>
              <div className="monthly-services__detail-body">
                <p><strong>Setup without monthly management.</strong> Budget $500 to $1,000 once for a simple sequence in one existing tool, depending on scope. The $1,500 lead package already includes its first workflow setup.</p>
                <p>After setup, you can manage it yourself. Software, message usage and any required hosting still have their own costs. The monthly management fee above applies only if you choose our ongoing monitoring and upkeep.</p>
                <p>Setup includes agreed messages, timing, stop conditions, testing and a walkthrough for your team.</p>
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

          <article className="monthly-services__tile monthly-services__tile--workspace" aria-labelledby="monthly-workspace-heading">
            <h3 id="monthly-workspace-heading">Business workspace + AI</h3>
            <p className="monthly-services__need">Email, marketing and website performance, together in one place.</p>
            <div className="monthly-services__price">
              <span>Monthly price and timing to be confirmed</span>
            </div>
            <div className="monthly-services__value">
              <h4>Planned monthly access</h4>
              <p>Email, ad and social reporting, Google Analytics and search performance. Planned AI assistance to ask questions across your connected data.</p>
            </div>
            <p className="monthly-services__boundary">We agree which accounts, data access and ongoing support your plan includes.</p>
            <a className="monthly-services__link" href="/contact">Discuss your workspace<Arrow /></a>
            <details className="monthly-services__details">
              <summary>What we’re building<Plus /></summary>
              <div className="monthly-services__detail-body">
                <p>We’re bringing email tools, paid advertising, social reporting, Google Analytics and Google Search Console into a shared workspace. The next step is an AI assistant that can answer questions using the information you connect.</p>
                <figure className="monthly-services__example">
                  <figcaption>Planned AI experience · illustrative</figcaption>
                  <blockquote>“How are our ads and website performing this month?”</blockquote>
                  <p>The intended assistant compares the available reports, highlights changes and points you to the data behind its answer.</p>
                </figure>
                <p>Tell us which accounts you want to bring together. Supported connections, customer access and AI assistance will be confirmed before your service starts. Answers depend on the data available and the permissions you allow.</p>
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
