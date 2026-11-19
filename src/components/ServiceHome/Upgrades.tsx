import { aiSubscriptionMoney, aiSubscriptionOffer, aiSubscriptionPlans } from '../../content/aiSubscriptionOffer'
import { engagementGroups } from '../../content/pricing'
import type { AddOnSurface } from './CallRequestDialog'
import './upgrades.css'

const managedAutomation = engagementGroups.find(group => group.id === 'automation')?.items.find(item => item.title === 'Managed automation')
const followUpSetup = engagementGroups.find(group => group.id === 'automation')?.items.find(item => item.title === 'Follow-up setup')

function Arrow() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M4 12h16m-6-6 6 6-6 6" /></svg>
}
function Plus() {
  return <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><path d="M3 9h12" /><path className="monthly-services__plus" d="M9 3v12" /></svg>
}

// Each add-on's "Discuss" opens the homepage's slide-in form, titled for that add-on.
export default function Upgrades({ onDiscuss }: { onDiscuss: (surface: AddOnSurface) => void }) {
  return (
    <section className="r-section r-light monthly-services" id="upgrades" aria-labelledby="monthly-services-heading">
      <div className="r-wrap">
        <header className="monthly-services__intro">
          <h2 id="monthly-services-heading">Setup & ongoing support.<br /><em>Choose the help you need.</em></h2>
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
            <button type="button" className="monthly-services__link" onClick={() => onDiscuss('home_addon_agents')} aria-haspopup="dialog">Discuss the agents<Arrow /></button>
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
            <button type="button" className="monthly-services__link" onClick={() => onDiscuss('home_addon_follow_up')} aria-haspopup="dialog">Discuss follow up<Arrow /></button>
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
            <p className="monthly-services__need">Your key reports and AI answers, together in one private dashboard.</p>
            <div className="monthly-services__price">
              <strong>$2,500</strong>
              <span>one time starter build</span>
              <span className="monthly-services__care-price">Optional care: $500 / month after launch</span>
            </div>
            <div className="monthly-services__value">
              <h4>Included in your build</h4>
              <p>One business dashboard, up to two standard account connections, and AI assistance to understand your reports. Built around the numbers that matter to you.</p>
            </div>
            <p className="monthly-services__boundary">Monthly care is optional. Hosting, software subscriptions and AI usage are separate.</p>
            <button type="button" className="monthly-services__link" onClick={() => onDiscuss('home_addon_workspace')} aria-haspopup="dialog">Discuss your workspace<Arrow /></button>
            <details className="monthly-services__details">
              <summary>Scope, costs & support<Plus /></summary>
              <div className="monthly-services__detail-body">
                <p><strong>Your $2,500 build.</strong> We set up one private dashboard for one business and owner account, connect up to two supported reporting accounts, configure your agreed metrics and add AI questions and summaries grounded in those reports. Setup includes testing, one review round and a walkthrough at handoff.</p>
                <p>Standard connections use existing integrations, such as Google Analytics and Google Search Console. We confirm your account access, included metrics and running costs before work starts. Additional connections, new integrations, inbox tools, CRM features and data migration are quoted separately.</p>
                <p><strong>Optional $500 monthly care.</strong> After launch, we check the existing connections, review performance with you and make small report adjustments, within two hours of support each month. The allowance does not roll over. Larger changes are quoted separately. This service is in addition to the one time build; you can choose the build and handoff without monthly care.</p>
                <figure className="monthly-services__example">
                  <figcaption>Example question · illustrative</figcaption>
                  <blockquote>“Where is our website traffic coming from?”</blockquote>
                  <p>Ask your AI assistant to summarize the connected reports, explain changes and point you to the data behind its answer.</p>
                </figure>
                <p>Hosting, software subscriptions, paid connectors and AI usage are billed separately from the build and care fees. We agree these costs before you commit. AI answers use the data and permissions available in your connected accounts.</p>
              </div>
            </details>
          </article>
        </div>

      </div>
    </section>
  )
}
