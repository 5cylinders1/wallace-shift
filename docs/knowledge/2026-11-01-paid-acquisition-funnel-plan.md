# AI integration offer and client acquisition plan

Prepared and revised November 1, 2026. Current approved direction and local draft reference; no campaign or product changes launched.

## Current flow after the user's clarification

**Paid image ad → qualification quiz immediately → relevant recommendation and conditional website offer → standard package purchase or custom consultation.**

This replaces the initial offer-page-first, call-required flow. The user approved qualification based on purchasing authority, an established business with an operational bottleneck, impact, AI experience and adoption barriers, investment readiness, and timing. Revenue is useful context; it does not establish purchasing power or the value of a project by itself.

The local `2026-11-01-draft-3` implementation now covers seven quiz steps, a recommendation calculated in the browser before contact details, and an optional follow-up request. The steps are **bottleneck → authority → business → impact → AI experience → tools → readiness**. Results can suggest a package, consultation, or preparation/alternative service. Submitted requests store the server-computed recommendation and reasons with the answers. Unsubmitted quiz answers remain in the current tab and are not sent to analytics or an AI service.

The intended purchase branch remains to be implemented: confirm tested compatibility and delivery availability, review exact scope and costs, sign, authorize payment, and create the paid project only after confirmed payment. The custom branch needs Google Meet booking linked to the opportunity and quiz context. Package pricing and compatibility remain provisional, every current recommendation has `checkoutReady: false`, and the current draft creates neither a purchase nor an appointment. See the [operational handoff](../ai-opportunity-funnel.md) for actual implemented behavior and enablement requirements.

The optional post-booking preparation video should explain relevant examples and conservative time/cost math. It can offer an eligible package and appointment cancellation or rescheduling without requiring video completion. Test that later, after a reliable purchase and booking path exists.

## Direction agreed in this conversation

- The offer should be available across business types, rather than restricted to roofing or contractors.
- The working incentive is a free business website with a project of $2,500 or more. The threshold is provisional and needs to support profitable delivery.
- The main message is saving time and money through AI integration.
- The monthly advertising budget range is $1,000 to $3,000.
- The immediate priority is generating paid work and collecting cash promptly.

This replaces the roofing-specific recurring-plan assumption in the initial draft. It proposes a new offer; it does not change existing public prices, roofing agreements, or other packages.

## 1. Lead with the business improvement

Recommended headline:

> Spend less time on repetitive work.

Supporting copy:

> We integrate AI into the tools your business already uses. Start with one task your team repeats, such as drafting replies, summarizing notes, or finding information, and build around the way you work.

Offer line, subject to the scope and cost check below:

> Get a free one-page business website with a qualifying project of $2,500 or more.

Primary action:

> Find my first AI opportunity

Expectation beneath the action:

> Tell us what takes up your team's time. We'll review the fit and discuss a practical first project. No purchase commitment to apply.

The operational improvement is the reason to buy; the website makes the package more attractive. Reveal the bonus with a suitable recommendation after qualification, with its scope and purchase condition next to it. Buyers with a good existing website can still buy the project; there is no need to replace their site or invent a cash-equivalent bonus.

This applies the videos' advice on clear communication, credible evidence, and a useful first step. The free workflow conversation helps a prospect understand their opportunity. The conditional website is part of the paid offer. See the [video source notes](2026-11-01-customer-acquisition-playbook.md#source-notes). These are our adaptations, not an exact funnel prescribed by Hormozi.

## 2. Keep eligibility universal and the work specific

Any business can apply within Wallace Shift's service capabilities. Ask about the task and tools before recommending a solution. Ads should each describe a recognizable problem even though the offer is available across industries.

| Problem to discuss | Possible scoped project | What must be checked |
| --- | --- | --- |
| Staff repeatedly read inquiries and prepare replies | AI-assisted inquiry classification and reply drafts in the current workflow | Representative inputs, review, routing, tool access, and usage costs |
| Notes must be turned into customer or job updates | Summaries and draft updates connected to the team's records | Accuracy criteria, permissions, human approval, and failure handling |
| Staff search the same internal documents for answers | A bounded internal knowledge assistant | Document quality, access rules, source references, and unresolved questions |
| Information is copied across systems | A connected workflow, using AI only where interpretation is useful | Existing features, APIs, data quality, exceptions, and ownership |

These are project candidates, not a list of features included at $2,500. A project marketed as AI integration must contain an actual useful AI component. If ordinary configuration solves the problem better, recommend that and describe it accurately.

Current [pricing content](../../src/content/pricing.ts) distinguishes small follow-up setups at roughly $500 to $1,000, connected workflows from $2,500, and focused custom systems from $5,000; AI is separately scoped. The proposed website threshold is not a promise that every AI integration or CRM costs $2,500.

Retain the smaller paid services for buyers who need a modest fix. Do not expand a $500 job merely to make it qualify for the promotion. A sale without the bonus can still be a good outcome.

## 3. Define the bonus before advertising it

Recommended pilot eligibility: one agreed implementation project with at least $2,500 in Wallace Shift service fees, excluding the bonus website, taxes, and pass-through vendor costs. Do not count speculative future retainers toward the minimum.

This implementation-only boundary is a recommendation still to confirm, narrower than the user's suggested “any project”; it is not an agreed exclusion. It would include qualifying AI, automation, CRM, and internal-tool work across industries. Before publishing “any project,” resolve how standalone website purchases and discovery-only engagements receive a meaningful bonus. My recommended launch treatment is to quote those separately and include the website when discovery leads to a qualifying implementation.

Use the existing [Foundation scope](../../src/content/pricing.ts) as the website boundary:

- One business page adapted from Wallace Shift's layout system.
- Service information and a clear inquiry path.
- Client-supplied branding, copy, and images, with light refinement.
- Responsive presentation, foundational metadata, and the normal accessibility/performance review.
- One inquiry form, with any connection to the paid system explicitly scoped.
- One consolidated revision round, launch, and the defined launch warranty.

Extra pages, ecommerce, booking systems, advanced copywriting, custom animation, migration, and extra integrations are separately scoped. State domain, hosting, software, ownership, support, and renewal responsibilities. Ongoing care is optional unless separately purchased.

Show a representative one-page example as the bonus. Elaborate animated demos may demonstrate broader capabilities, but must be labeled as paid upgrades if their scope exceeds the offer. Do not promise a 24-hour launch; content, access, review, and delivery capacity determine timing.

The existing Foundation starting price is $1,000, but that alone is not proof of a historical selling price or a justified inflated bundle valuation. We do not need a crossed-out value to make this offer clear.

Keep $2,500 as the working minimum while costing one representative project and one bonus site. If that combination cannot support acquisition and delivery costs, raise the advertised threshold before launch or reduce the published bonus scope. Do not advertise a viable $2,500 option that we cannot actually provide.

Google requires clear payment and cost disclosures; FTC guidance also calls for clear conditions on purchase-dependent free offers. Keep the purchase condition adjacent to the bonus in ads and on the page. Sources: [Google pricing policy](https://support.google.com/adspolicy/answer/15938375?hl=en), [FTC advertising guidance](https://www.ftc.gov/business-guidance/resources/advertising-faqs-guide-small-business).

## 4. Enter directly into qualification

The local route is `/offers/ai-business-integration`. It is a review draft, excluded from navigation and the sitemap and marked `noindex, nofollow`. Paid traffic should enter at the first quiz question, with the time-saving message as context. The earlier long offer page before qualification is superseded.

Use Back controls and retained answers, then show an immediate recommendation without requiring email or an account. Supporting examples, scope, website bonus terms, and cost explanations belong with the relevant result. Do not claim an integration is live or compatible merely because its sample looks plausible.

Present one relevant package candidate where possible, with consultation for an uncertain or custom project. Proposed candidates remain AI Inquiry Assistant at $2,500 and AI Notes and Updates at $3,500, subject to delivery costing and tested software boundaries. Explain recurring software costs and the website purchase condition before any commitment. Do not manufacture a qualifying $2,500 project where a smaller setup solves the need.

The current local draft offers personal follow-up after the recommendation. Automated signing, payment, scheduling, and project creation must be implemented and verified before the result offers those actions.

## 5. Qualify authority, business context, impact, and readiness

Use seven short steps with conditional questions. Measure actual completion time before promising a duration.

| Step | Ask | Decision it informs |
| --- | --- | --- |
| Bottleneck | What is holding growth back: inquiry handling, administration, handoffs, owner dependence, capacity, demand, or another issue? | Distinguish operational work from a customer-demand problem |
| Authority | Can this person approve a purchase? If the decision is shared or they are researching, can the approver join? | Identify a real path to authorization without requiring an owner title |
| Business | What does the business do, and what was its approximate revenue over the past 12 months? | Establish context and prioritize, with an option to discuss revenue privately |
| Impact | Combined weekly team hours, up to two consequences, and an optional example | Understand whether the constraint merits implementation; uncertainty needs review |
| AI experience | Has the business explored, considered, tried, or already adopted AI? What has made progress difficult? | Address the relevant barrier rather than assign a simplistic AI familiarity score |
| Tools | Which software or processes are involved? | Identify what needs compatibility and access checks |
| Readiness | Could the business invest at least $2,500, does it first need a business case or approval, and when would it act? | Separate affordability, willingness, approval, and timing |

Revenue of $250,000 or more is an initial priority hypothesis, not a validated cutoff. A lower-revenue operating business or a visitor who prefers to discuss revenue can still have a suitable project. High revenue cannot compensate for missing authority, an unavailable budget, a different problem, or no present intention to act. A business not yet generating revenue receives a preparation or smaller-setup recommendation.

AI barriers include an unclear starting point, limited time, lack of technical help, unclear value, accuracy, privacy, team adoption, and disconnected tools. Show a relevant explanation or proof requirement for each selected barrier. New users receive an introductory explanation without being forced to explain a failed implementation they never attempted.

Apply explicit routing rules:

- **Potential package:** authorized buyer, suitable inquiry or administration task, clear recurring impact, known tools, investment readiness, and suitable timing. This remains a recommendation until exact compatibility, access, costs, and capacity are verified.
- **Consultation:** credible need with value, shared approval, task, impact, or compatibility still to resolve. A researcher can reach this route when the approver can participate.
- **Preparation or alternative:** no path to an approver, no current implementation budget, no revenue yet, a demand problem, or exploration for later. Provide useful next steps without implying the website bonus applies.

After the local result, the visitor may submit name, business name, email, optional website, and preferred contact method. Phone is required only for a requested call. Answers and the server-computed recommendation are stored only when the visitor explicitly sends that request; no ongoing marketing subscription is created. Analytics may measure fixed step and broad result-type events with consent, but never the quiz answers, revenue, authority, business details, contact information, or recommendation rationale.

Never label the recommendation an approved project, reserve delivery capacity, or imply completed AI analysis. The purpose is to identify the next useful action and the evidence still required.

## 6. Make the time and money claim measurable

Lead with time because it is often observable in a small pilot. Discuss money after identifying which costs could actually change.

During discovery record:

- Number of eligible tasks in a normal week.
- Current handling time, based on examples where possible.
- Remaining review and exception time after the proposed change.
- Software, AI usage, and maintenance costs.
- Who benefits from the released capacity and what they would do with it.

`Potential hours released per month = eligible tasks per month × (current minutes − expected remaining minutes) / 60`

For example, 200 tasks reduced from 8 minutes to 3 would release about 16.7 hours per month. At an assumed $30/hour, that is about $500 of staff capacity before software costs. It is not automatically $500 less cash spending. Actual savings require a real reduction in overtime, contractor charges, subscriptions, or another expense. All of these example inputs are hypothetical.

Validate estimates using representative tasks and include correction/rework time. Use measured project results, with permission, to improve future ads. Avoid arbitrary “save 20 hours” or “cut costs 50%” claims before evidence exists.

## 7. Pursue near-term paid work while building the funnel

Paid advertising is one acquisition path; it should not delay useful sales conversations already available to the business.

| Period | Sales work | Funnel work |
| --- | --- | --- |
| Days 1 to 2 | Review existing inquiries, former prospects, and relevant introductions. Prepare personal invitations around a real task they already have. | Finalize the project/website scope, delivery cost, and terms; prepare one representative demonstration. |
| Days 3 to 5 | Hold short fit calls and send clear scopes promptly for straightforward work. Keep smaller paid fixes available. | Build the page, application, lead records, and booking or callback path. |
| Days 6 to 7 | Follow up on decisions; collect agreed initial payments; schedule only deliverable work. | Verify the full path and prepare the first paid campaign. |
| Weeks 2 to 4 | Deliver, document measured results, request feedback, and seek suitable introductions. | Run the controlled pilot and fix the stage losing suitable buyers. |

These are a proposed sequence, not a sales or launch-time guarantee. Technical and content dependencies can change the schedule. Outreach drafts can be prepared during implementation; this planning request does not send any messages.

For simple scoped implementations, propose 50% after agreement to schedule work and 50% after approval of both the paid implementation and bonus website, before final launch/handover. Confirm that the first payment funds the initial work. At $2,500, 50% collects $1,250. Deposits are cash collected, not earned profit or proof the project is completed. Larger or uncertain projects need suitable milestones.

Set a deadline for supplied website content. If the two deliverables need independent acceptance or client delays could block payment for completed implementation, define separate fixed payment milestones in the original scope. Do not call an unfinished website complete or silently change the payment trigger.

Existing public policy establishes 50% deposits for websites; it does not establish a universal payment split for all systems. The current portal's one-time starter agreement uses a single invoice. Confirm a working milestone-invoice process and matching agreement before promising automated deposit and balance collection. Use an appropriate existing invoicing process while that integration is developed.

## 8. Spend the $1,000 to $3,000 budget in stages

Plan an initial **$1,000 media release**. Keep any remaining monthly budget in reserve, up to the user's chosen ceiling within the $1,000 to $3,000 range. Do not spend the top of the range solely because it is available.

Start with one platform that supports the approved image-ad concept and one audience hypothesis. The user's clarification specifies an image with the message “We save you time integrating AI into your business,” leading directly into the quiz. This supersedes the earlier Search-first channel assumption. Confirm the actual account options, audience, service geography, and costs before selecting or configuring a platform; do not invent reach, search-volume, or cost forecasts.

Use two message angles that can serve any business:

- **Time:** “Spend less time on repetitive work.” Show one task and the review step.
- **Cost:** “Find the manual work worth automating.” Explain how we assess implementation cost against a real operational problem.

Use the same offer and application so the comparison is understandable. These are creative directions, not platform-ready character-counted ads. Keep the qualifying purchase condition wherever the free website is promoted.

Keep a later search-intent or alternate-platform experiment separate from the initial image-ad test. Avoid dividing the initial $1,000 across multiple platforms, industries, and unrelated services.

Review relevance and tracking after the first roughly $200 to $300. Review lead fit and conversations again around $500. These are operational checkpoints, not statistical proof. Stop to repair broken tracking, irrelevant traffic, or a misunderstood offer. Allow active opportunities time to reach a decision before judging sales performance.

Release additional budget in controlled increments only when suitable opportunities are progressing and the cost forecast remains plausible. For sustained scaling, require actual paid clients, measured delivery costs, and available capacity. Configure spending controls and monitor actual spend; a daily average does not guarantee equal daily billing. Advertising credits are not assumed available.

## 9. Protect the margin behind the offer

`Maximum all-in acquisition cost = project fee − paid-project delivery cost − bonus-website cost − direct expenses − required contribution reserve`

Include sales time and free individual assessment in acquisition cost. Include revisions, testing, handover, and expected rework in delivery. Do not use a selling rate as though it were the internal cost rate.

Illustration only: a $2,500 project taking 30 combined delivery hours at an assumed $50/hour, plus $150 direct costs and a $500 contribution reserve, leaves $350 for all acquisition work, including advertising and sales time. Those are invented inputs; actual cost evidence must replace them. The example shows why a large free website could erase the margin on a small implementation.

Before publishing the threshold, time a representative bonus-site build and estimate the paid task. If the economics fail, change the offer before increasing ad spend. Make any higher minimum explicit in the ad and page. Existing signed scopes retain their agreed terms.

Track cash separately: initial payments, outstanding invoices, delivery commitments, ad spend, and available delivery hours. A busy pipeline is not cash collected, and collected cash is not automatically margin.

## 10. Close the operational gaps

Proposed pipeline: **Local quiz result → Submitted opportunity → Package candidate / Custom consultation / Preparation.** The intended package branch proceeds through confirmed scope, agreement, payment, and delivery; the consultation branch adds booking, attendance, and a written scope before agreement. The current draft implements the local result and submitted opportunity only. Track declined, lost, nurture, cancellation, and no-show reasons separately.

Bella can own first response and scheduling; Matthew can own technical fit and scope. Confirm coverage. A proposed internal target is personal response within one business day, plus an immediate acknowledgment after durable application receipt.

For submitted inquiries, prepare a concise acknowledgment, a personal response referencing the task, one useful follow-up after three business days, and a final check after seven. Stop when someone responds, books, declines, or opts out. Do not put abandoned forms into a sequence. Booking reminders replace inquiry follow-up; longer educational marketing requires an appropriate subscription choice.

| Existing piece | Reuse | Required work |
| --- | --- | --- |
| Public demo videos and service content | Relevant examples and explanation | Match examples to the quiz result; verify package scope and the bonus website before launch |
| Draft opportunity endpoint | Durable storage, IDs, qualification snapshots, duplicate handling, and retryable internal notifications | Isolated end-to-end verification, production configuration, owner review routine, and eventual project handoff |
| Draft qualification quiz | Seven steps, conditional fields, local results, and optional contact with server-side validation | Browser verification of routing, branch edits, privacy behavior, and realistic completion time |
| Contact links | Manual callback fallback | Real scheduling; `bookingUrl` is currently null; track confirmed booking and cancellation |
| Public analytics | Consent, sanitization, private-route exclusions, and fixed quiz/result events | Experiment assignment, consent-aware campaign attribution, and confirmed downstream outcome reporting |
| Client portal | Agreement and payment components | Confirmed milestone billing and an acquisition-record handoff |

Relevant sources: [contact adapter](../../src/lib/contactAdapter.ts), [contact API](../../api/contact.ts), [site configuration](../../src/content/siteConfig.ts), [analytics script](../../public/site-analytics.js), [portal documentation](../client-portal/README.md), and [starter agreements](../client-portal/starter-agreements.md). The current contact endpoint emails a submission; it does not create a CRM lead. Its `company` field is a honeypot, so a real business-name field must have a different name.

Persist validated applications before showing success. Notification failure must not lose the lead. Track confirmed appointments rather than calendar clicks, and confirmed payment rather than a reported payment. Keep contact data out of general analytics.

Google supports qualified and converted lead outcomes. Add these through a supported integration when reliable lead matching and consent handling exist. Record application, qualification, booking, attendance, agreement, and payment separately; avoid optimizing solely for cheap form fills or counting every stage as a separate acquired customer. [Google qualified lead guidance](https://support.google.com/google-ads/answer/11459091?hl=en).

Preserve current consent, DNT/GPC, and private-route behavior. Analytics acceptance is not permission for advertising data sharing. The application must work without optional tracking consent.

Before ads run, verify all routing paths, records, duplicate submissions, email failure, booking/callback behavior, mobile use, consent refusal, and agreement/payment handoff. The first release is one reliable offer-to-paid-project path. Add more ads and task variants after it produces evidence.
