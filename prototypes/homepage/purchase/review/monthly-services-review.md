# Monthly additional services review

Research date: 17 November 2026. Scope: the purchase preview's `Upgrades()` section only. Product source inspection and public competitor research do not establish live customer outcomes.

## Offer decisions and evidence

Keep exactly three services. No customer evidence establishes a distinct fourth need; extra features would dilute this section's decision.

| Service | Customer problem and illustrative workflow | Setup versus monthly value | Evidence and availability boundary |
| --- | --- | --- | --- |
| Chatbot and phone agent | An owner cannot answer every inquiry. A visitor or caller asks a business question, provides details and reaches an agreed next step. | Setup establishes business information and handling rules. Monthly service provides the agreed chat and phone usage; the support allowance must be confirmed. | [AI subscription source](../../../../src/content/aiSubscriptionOffer.ts) defines $750 monthly, 500 phone minutes and 2,000 chat replies. Trial activation requires both services to be ready and customer confirmation. Commercial configuration is not proof of a completed live customer call or every integration working. |
| Automatic follow up | An inquiry or estimate needs a next step without the owner remembering every message. An agreed sequence follows up, then stops or hands over when appropriate. | Setup defines triggers, timing, messages and stop conditions. Ongoing service covers monitoring, maintenance, failure recovery and minor adjustments to existing workflows. | [Managed automation source](../../../../src/content/pricing.ts) starts at $750/month, with software and usage costs separate. [The $1,500 lead-page package](../../../../src/content/contractorOffers.ts) already includes its first agreed workflow setup. This monthly service adds upkeep, not a second charge for that inclusion. New workflows and substantial changes need separate scope. |
| Wallace Shift CRM | Customer details and next actions are scattered. A customer record brings the inquiry, notes and next step together for the team. | Planned monthly software access and support must be scoped when ready. Migration, connections, release date and pricing are not confirmed. | [The existing dashboard](../../../../src/roofing-dashboard/DashboardApp.tsx) explicitly uses fictional records and unsent demo actions. Reply365 contains customer-record implementation, but the audit found no proof of a released Wallace Shift CRM. Present it as in development, distinct from the agreement and invoice portal. |

No actual customer-question dataset, inquiry export, provider invoice series, delivery-cost ledger or measured support-time sample was available to validate demand or profitability. The customer problems above are provisional scenarios, not findings from interviews. Do not publish fabricated testimonials, conversion gains, response guarantees or unsupported integration claims. Usage allowances and public service prices do not establish operating margin.

## Competitor comparison

Official pages inspected on 17 November 2026; descriptions are vendor claims, not independent performance testing.

| Competitor and primary sources | Relevant scope | Pricing structure and implication |
| --- | --- | --- |
| HighLevel: [platform pricing](https://www.gohighlevel.com/pricing), [AI billing documentation](https://help.gohighlevel.com/support/solutions/articles/155000006652-ai-product-pricing) | CRM/pipelines, workflow automation, unified conversations, Conversation AI and Voice AI. | Platform subscription plus applicable AI subscriptions or usage billing. Combining AI, follow up and CRM is already category functionality. |
| Podium: [AI Employee](https://www.podium.com/product/ai-employee), [pricing](https://www.podium.com/getpricing) | Inquiry handling, qualification, follow up, scheduling, reminders, shared conversation context and human escalation controls. | Business-specific quote; no universal rate displayed on the inspected pricing page. Connected channels and human handoff are not unique differentiators. |
| Housecall Pro: [pricing](https://www.housecallpro.com/pricing/), [Pipeline](https://www.housecallpro.com/features/pipeline/), [CSR AI documentation](https://help.housecallpro.com/en/articles/9740104-csr-ai-overview) | Field-service software, CSR AI call/chat handling, and Pipeline follow up and sales tracking. | Monthly/annual core tiers; the inspected page lists CSR AI and Pipeline separately without add-on rates. The CSR documentation mixes current and “coming soon” booking language, so exact booking availability remains uncertain. |

The defensible reason to choose Wallace Shift is a clear, bounded service built around an agreed customer inquiry path: business-specific setup, defined handoff and explicit ongoing help. Existing offer source supports scoping, compatibility review, testing and team handoff. Monthly support obligations still require an agreement. Do not claim competitors lack personal support or that Wallace Shift is uniquely capable, cheaper or proven to perform better.

## Five-owner comprehension test

Status: **Pending.** No representative participants were available in this task. No customer test was simulated or inferred from technical checks.

Recruit five independent business owners matching the intended audience. Show the section in context on each person's usual device; allow natural reading and interaction. Use neutral questions without explaining the offers first. Record verbatim answers and first attempted actions without personal customer data.

| Criterion | Neutral task or question | Pass rule |
| --- | --- | --- |
| Optional monthly service | “What would you be adding, and how would you expect to pay for it?” | At least 4 of 5 independently identify optional ongoing services, separate from the base package. |
| Appropriate service | Present three short situations: missed inquiries, an existing sequence that needs upkeep, and scattered customer information. Ask which service fits each and why. | At least 4 of 5 correctly match all three situations and can explain the recurring value. |
| Next action | “You want help with one of these. Show what you would do next.” | At least 4 of 5 reach the existing discussion/contact route without coaching. |
| CRM readiness | “Could you start using this CRM today? What would you need to find out?” | At least 4 of 5 recognize it is in development and that timing, scope and price require discussion. |

Each criterion must pass separately; do not average scores across criteria. Also ask whether the first included follow-up setup would be charged again. Record confusion as a copy issue. A passing five-person test supports comprehension, not a statistically proven conversion increase. Later qualified inquiries and fulfillment records can inform commercial effectiveness.

## Technical validation

Status: **Pending implementation-owner verification.** This is separate from the pending customer test.

| Check | Result |
| --- | --- |
| Actual isolated preview entry compiles and passes targeted lint/type checks | Pending |
| Desktop and mobile rendered review; no clipping or horizontal overflow | Pending |
| Keyboard focus, disclosure behavior and accessibility checks | Pending |
| Contact links and intended fragment navigation | Pending |
| Change review: only this section, its isolated files and review material; neighboring work preserved | Pending |

Suggested commit message: `feat: clarify monthly additional services in purchase preview`
