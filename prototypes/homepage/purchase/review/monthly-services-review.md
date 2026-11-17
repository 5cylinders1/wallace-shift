# Monthly additional services review

Research date: 17 November 2026. Scope: the purchase preview's `Upgrades()` section only. Product source inspection and public competitor research do not establish live customer outcomes.

## Offer decisions and evidence

Keep exactly three services. No customer evidence establishes a distinct fourth need; extra features would dilute this section's decision.

| Service | Customer problem and illustrative workflow | Setup versus monthly value | Evidence and availability boundary |
| --- | --- | --- | --- |
| Chatbot and phone agent | An owner cannot answer every inquiry. A visitor or caller asks a business question, provides details and reaches an agreed next step. | Setup establishes business information and handling rules. Monthly service provides the agreed chat and phone usage; the support allowance must be confirmed. | [AI subscription source](../../../../src/content/aiSubscriptionOffer.ts) defines $750 monthly, 500 phone minutes and 2,000 chat replies. Trial activation requires both services to be ready and customer confirmation. Commercial configuration is not proof of a completed live customer call or every integration working. |
| Managed follow up | An inquiry or estimate needs a next step without the owner remembering every message. An agreed sequence follows up, then stops or hands over when appropriate. | Setup defines triggers, timing, messages and stop conditions. A small standalone setup in an existing tool starts at $500 once (budget $500–$1,000); the first setup is included in the $1,500 lead package. Optional monthly management covers monitoring, maintenance, failure recovery and minor adjustments. Software, usage and any required hosting remain separate when self-managed. | [Managed automation source](../../../../src/content/pricing.ts) starts at $750/month, with software and usage costs separate. [The $1,500 lead-page package](../../../../src/content/contractorOffers.ts) already includes its first agreed workflow setup. This monthly service adds upkeep, not a second charge for that inclusion. New workflows and substantial changes need separate scope. |
| Business workspace + AI | Email, marketing accounts and website reports are scattered. Planned AI assistance compares connected sources in response to a business question. | Planned monthly workspace access; supported accounts, data access, AI assistance and ongoing support need an agreed scope. | [Dashboard handler](../../../../api/_lib/business-dashboard-handler.ts) currently requires owner access and generates a rules-based brief, with no AI model connected. [Google reporting](../../../../api/_lib/business-dashboard-google.ts) implements Analytics/Search Console; [channel reporting](../../../../api/_lib/business-dashboard-channels.ts) implements Google/Meta/LinkedIn Ads and Facebook/Instagram. The [mail workspace](../../../../src/mail/MailApp.tsx) handles composition and outgoing activity, not a synchronized inbox. Customer access and cross-source AI queries remain planned. |

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
| Appropriate service | Present three short situations: missed inquiries, an existing sequence that needs upkeep, and scattered email, advertising and website reports. Ask which service fits each and why. | At least 4 of 5 correctly match all three situations and can explain the recurring value. |
| Next action | “You want help with one of these. Show what you would do next.” | At least 4 of 5 reach the existing discussion/contact route without coaching. |
| Workspace scope | “What could the assistant answer, and what would need to be connected first?” | At least 4 of 5 recognize that answers depend on connected data, and access, scope and price still require confirmation. |

Each criterion must pass separately; do not average scores across criteria. Also ask whether the first included follow-up setup would be charged again. Record confusion as a copy issue. A passing five-person test supports comprehension, not a statistically proven conversion increase. Later qualified inquiries and fulfillment records can inform commercial effectiveness.

## Presentation

Three compact tiles sit side by side at widths of 760px and above. Purpose, monthly value, price or planned availability, material cost boundaries and the discussion link remain visible. Each tile opens its own setup and illustrative example details without stretching closed neighbors. Narrow screens stack the tiles. A shared discussion footer and bottom rule give the section a clear ending.

The collapsed section measures approximately 757px high at 1280px wide and 763px at 1366px wide. All three complete tiles fit together on tested 1280 × 800 and 1366 × 768 laptop viewports. No typography was shrunk to force three columns onto phones.

[Desktop](monthly-services-desktop.png) · [Laptop viewport](monthly-services-laptop.png) · [Mobile](monthly-services-mobile.png) · [Mobile expanded detail](monthly-services-mobile-details.png)

## Technical validation

Status: **Passed on the local preview, 17 November 2026.** This is separate from the pending customer test.

| Check | Result |
| --- | --- |
| Actual isolated preview entry compiles and passes targeted lint/type checks | Passed: TypeScript targets `prototypes/homepage/purchase/main.tsx`; ESLint targets `Upgrades.tsx`; standalone Vite build explicitly uses the preview HTML entry, with output in `/private/tmp/wallace-monthly-services-build`. |
| Desktop and mobile rendered review; no clipping or horizontal overflow | Passed at 320, 390, 640, 768, 1024, 1280, 1366, 1440, 1920 and 3292px. Desktop, laptop, tablet and mobile screenshots inspected. All three tile tops align in column layouts. |
| Keyboard focus, disclosure behavior and accessibility checks | Passed: each disclosure opens with Enter and closes with Space, with visible focus. All three expanded states and ten collapsed viewport widths have zero axe WCAG 2/2.1 A/AA violations. Closed neighboring tiles stay compact. Impeccable detector returned no findings. |
| Contact links and intended fragment navigation | Passed: agent and follow-up links open `/contact` with the appropriate existing `shift` key and populated message; the workspace link opens the general `/contact` route; shared link reaches `#questions`. No forms submitted or messages sent. No browser page errors. |
| Change review: only this section, its isolated files and review material; neighboring work preserved | Passed: isolated `Upgrades.tsx` and `upgrades.css`; `main.tsx` only adds the import and removes the old inline section. Byte comparison against the captured pre-edit file confirms the integration boundary. Concurrent Guarantee and other repository edits were preserved. |

Implementation evidence for agents also includes Reply365’s `apps/app/src/lib/chat-reply.ts`, `chat-store.ts`, inbound Twilio voice route, and tenant-scoped lead records. These support approved-knowledge answers, metering and configured call handling; they do not prove a completed live customer call or that the planned business workspace has launched for customers. The chat implementation does not independently book appointments or send email, and the examples make no such claims.

Remaining limits: no physical-device or screen-reader user session, production delivery test, live call, customer comprehension session, operating-cost measurement or conversion experiment. This is a local preview change; nothing was deployed. Business workspace pricing, support, supported integrations and customer release timing remain undefined. Agent pricing/allowances and the managed automation starting price are read from the existing source of commercial terms; no new price is set here.

Final positioning: the third service is a connected business workspace with planned AI assistance, matching the user’s email, advertising, social and Google reporting description. It is not presented as a customer-record CRM. The prominent development label remains omitted; planned monthly access and unconfirmed price/timing remain visible. The workspace CTA uses the existing general contact route to avoid a CRM-specific prefill.

Pricing clarification: the monthly tile is named “Managed follow up” to identify what the $750 starting fee buys. The visible boundary shows one-time setup from $500 or inclusion in the lead package. Expanded copy explains setup-only budgeting and continuing provider costs without monthly management. No commercial price was changed.

Suggested commit message: `fix: distinguish follow-up setup from optional monthly management`
