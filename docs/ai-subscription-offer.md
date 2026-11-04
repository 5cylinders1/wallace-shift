# AI chatbot and phone agent subscription

Commercial specification and verification record, prepared November 3, 2026. The defaults below are implemented locally. Stripe sandbox results are recorded at the end. Production provider configuration, real call enforcement, deployment, and conversion uplift remain unverified.

## Scope and decision record

One offer replaces the two packages on the final offer page: an AI website chatbot plus an AI phone agent. Necessary agreement, checkout, billing, account-management, usage, and service-access paths must express the same terms. Existing agreements retain their stored text, amounts, signatures, payment authorizations, and history. Unrelated clients must not be migrated.

The existing portal manages recurring Stripe PaymentIntents through its own billing scheduler. It is not a Stripe Billing subscription implementation. Its existing cadences are one time, monthly, quarterly, and yearly. The new offer requires six-month billing, trial state, paid-through access, and deferred interval changes. A new offer-specific lifecycle is preferable to changing the meaning of existing engagement cancellation.

| Decision | Status | Required or recommended behavior |
| --- | --- | --- |
| One chatbot and phone-agent bundle | Settled | Both services belong to the same trial and paid base plan. |
| Monthly base price | Settled | $750 charged every calendar month. |
| Six-month base price | Settled | $4,050 charged every six calendar months; $675 monthly equivalent. |
| Twelve-month base price | Settled | $7,200 charged every twelve calendar months; $600 monthly equivalent. |
| Trial length | Recommended default | At least one calendar month, ending at the first 14:00 UTC billing boundary at or after the matching calendar-month instant; not a fixed 30 days. |
| Trial start | Recommended default | Both services are operational and the client explicitly activates the trial after reviewing exact dates. Initial setup registration starts no clock. |
| Payment method | Recommended default | A saved Stripe payment method and explicit future-charge authorization are required before trial activation. Saving a method alone does not authorize collection. |
| Trial limits | Recommended default | 100 connected AI phone minutes and 500 chatbot AI replies for the entire trial; no paid excess usage. |
| Paid limits | Recommended default | 500 connected AI phone minutes and 2,000 chatbot AI replies per service month, independent of prepaid billing interval; no rollover. |
| Phone excess price | Recommended default | $0.40 per additional AI minute, through explicit prepaid purchases only. |
| Excess collection | Settled | Explicit prepaid extra-minute purchases only; no automatic top-ups or usage debt. No silent monthly collection on a prepaid plan. |
| Cancellation | Settled | No trial charges when canceled before trial end. Paid cancellation disables renewal and retains service until paid-through expiry. |
| Interval changes | Settled | Take effect at the existing next renewal; no immediate base charge or proration. Pending choices can be changed or withdrawn. |
| Pending change after cancellation | Recommended default | Cancellation clears the pending interval change. An interval change must never reactivate canceled renewal. |
| Failed payment | Recommended default | Failed or action-required payments pause access. The dated implementation allows up to one hour of processing grace around 14:00 UTC; verified settlement is required for the paid period. Preserve the original renewal anchor and prevent duplicate invoices. |
| Timezone and charging window | Recommended default, must match implementation | UTC calendar dates with a 14:00 UTC service boundary matching the billing job. The free trial rounds up to this boundary. Display exact timestamps and any processing grace; bank settlement time is not guaranteed. |
| Tax and surcharge treatment | Settled quoted-price rule | Published base amounts include applicable service taxes and have no card surcharge. Existing clients retain their fee policy. This is the quoted-price policy, not a verification of tax accounting. |
| Existing free website benefit | Settled | Remove the website benefit from this subscription offer and its directly conflicting funnel copy. Existing signed agreements keep their website scope. |
| Conversion guarantee | Not an active promise | No supporting paid-conversion evidence was found. Publish the limited alternative below while a measurable guarantee and remedy remain unapproved. |
| Provider and fulfillment | Selected; integration verification pending | Deliver through Reply365. Owning source uses Twilio ConversationRelay and OpenAI. An offer-specific bridge is implemented in Reply365; production configuration and real provider verification remain required. |

## Customer-facing price and date contract

| Selection | Monthly equivalent | First base charge after trial | Each later base charge |
| --- | ---: | ---: | --- |
| Monthly | $750 | $750 | $750 every calendar month |
| Six months | $675 | $4,050 | $4,050 every six calendar months |
| Twelve months | $600 | $7,200 | $7,200 every twelve calendar months |

The longer plans are prepaid service periods, not monthly installments with a minimum contract. The actual charge must be at least as prominent as the monthly equivalent. Display the selected interval, trial start and end, first amount and date, next renewal rule, usage limits, and cancellation cutoff before the client authorizes the trial and future payment schedule.

Setup registration and final trial enrollment are separate steps. If operational readiness is not yet known, registration can only disclose the activation rule, not an invented first-charge date. When both services are ready, show exact dates and amounts before final activation authorization. An owner marking work ready must not silently start the client's trial or authorize payment. If the activation date changes before acceptance, recompute the dates and require the client to accept the new schedule.

Trial activation stores the actual instant. Add a calendar month at that same UTC time, then round the trial end up to the next 14:00 UTC billing boundary so the free period is never shorter than one calendar month. For example, activation November 15, 2026 at 12:00 UTC ends December 15 at 14:00 UTC; activation at 18:00 UTC ends December 16 at 14:00 UTC. Show that result before authorization. Paid service boundaries then remain 14:00 UTC.

One calendar month is added by preserving the desired day where possible and clamping to the last day of a shorter month. The first paid service date becomes the paid billing anchor. A clamped trial date does not secretly retain the original signup day as the paid anchor. Later paid renewals preserve their own original anchor, restoring the desired day in months where it exists. Use calendar arithmetic, not 30-, 180-, or 365-day durations.

Treat service periods as start-inclusive and end-exclusive. The expiration boundary is also the next renewal boundary. Customer copy must make clear whether a displayed date is the last full service date or the boundary when service stops. Do not use an inclusive `endDate` rule from older agreements as the meaning of the new subscription's paid-through boundary.

### Dated examples

All examples below use UTC calendar dates and a 14:00 UTC billing boundary. Trial-start examples assume activation no later than 14:00 UTC; later activation rounds up as described above. Base amounts include applicable service taxes; optional prepaid minute purchases are separate. They are expected behavior, not records of real subscriptions.

| Scenario | Expected result |
| --- | --- |
| Trial activates November 15, 2026 | Free trial ends December 15, 2026. The selected first base charge is due December 15. |
| Monthly after that trial | Charge $750 December 15, 2026; renew January 15, 2027, then February 15. |
| Six months after that trial | Charge $4,050 December 15, 2026; renew June 15, 2027, then December 15, 2027. |
| Twelve months after that trial | Charge $7,200 December 15, 2026; renew December 15, 2027. |
| Trial activates January 31, 2027 | Trial ends February 28, 2027. First paid anchor is February 28; monthly renewals are March 28, April 28, and so on. |
| An already-established paid monthly anchor is January 31, 2027 | Renewal clamps to February 28, then restores March 31, then April 30. This differs deliberately from a trial whose first paid anchor is February 28. |
| Six-month paid anchor is August 31, 2026 | Next renewal is February 28, 2027, then August 31, 2027. |
| Twelve-month paid anchor is February 29, 2028 | Annual renewals clamp to February 28 in 2029–2031 and restore February 29 in 2032. |
| Annual period December 15, 2026 to December 15, 2027; cancel June 15, 2027 | Service remains available until the December 15, 2027 expiry boundary; no new $7,200 renewal. |
| Same annual period; change to monthly on June 15, 2027 | No immediate charge or credit. At December 15, 2027, charge $750 and start monthly periods if renewal remains enabled and the payment settles. |
| Monthly payment due January 31, 2027 fails, then settles February 2 | Do not shift the next renewal to March 2. The paid period remains anchored January 31 to February 28; disclose that restoration follows settlement and missed days are not silently added. Do not collect for an already-expired period without a separate resolution. |

The date rule defines when a charge is due. It does not guarantee that a bank settles a payment at that moment. Record the planned due date, actual attempt timestamp, payment status, and actual settlement timestamp separately. A late cron run must not invent several new charges, overwrite cancellation, or extend service merely because a collection request was sent.

## Billing and service state table

The names below describe the required lifecycle. They do not assert that matching implementation fields already exist.

| State | Access | Automatic base charge | Allowed customer actions | Exit condition |
| --- | --- | --- | --- | --- |
| Setup registered | No service claim yet | None | Withdraw request, review proposed interval | Provider setup and readiness verification |
| Ready for activation | Both services can be demonstrated; no trial clock yet | None | Review exact dates, sign, save payment method, authorize and activate | Valid acceptance tied to exact offer and schedule |
| Trial active | Both services within free trial caps | None before accepted trial end | Cancel, change selected first paid interval with clear updated authorization | Trial cancellation or trial end |
| Trial canceled | Retain remaining free allowance until the accepted trial end; cancellation prevents conversion to paid service | None, including trial usage | View cancellation confirmation | Terminal unless a new explicitly accepted enrollment is created |
| First payment pending or failed | At most one hour of processing grace; failed or action-required payments pause access, and unconfirmed collection cannot establish a paid period | One idempotent authorized invoice/attempt; no uncontrolled repeat charges | Resolve payment, cancel future enrollment | Verified settlement or cancellation |
| Paid active | Access through the current paid-through boundary | Next agreed amount only at renewal | Cancel renewal, queue/revise/withdraw interval change, update payment method | Renewal, scheduled cancellation expiry, or service issue |
| Paid with pending interval change | Same current access and allowance | Current period untouched; new amount at next renewal | Revise/withdraw change or cancel renewal | Renewal applies the latest valid accepted choice |
| Paid, renewal canceled | Same paid access until expiry | No further base renewal | View paid-through date and cancellation confirmation | Paid-through boundary; clear any queued interval change |
| Renewal payment pending or failed | At most one hour of processing grace at the unpaid boundary; no grace after a confirmed failure | Preserve original due date and invoice identity | Resolve payment, cancel future renewal | Verified settlement while period remains current, or closure |
| Expired | Provider access disabled or routed to the disclosed non-AI fallback | No new base charges | View records | New explicit enrollment required to restart |

Provider activation, entitlement, and expiry must be verified against actual provider behavior. A frontend badge or database flag is not proof that the chatbot or phone agent is disabled. Avoid shutting down shared provider resources used by another client.

Cancel and renewal operations must be serialized against payment attempts. A cancellation accepted before the disclosed boundary must prevent renewal even if a delayed webhook or scheduler run arrives later. Distinguish an already-settled payment, an in-flight payment, a failed attempt, and an unsubmitted invoice. Do not silently turn a client-requested cancellation into a restart while reconciling an old event.

## Usage policy and prepaid extra minutes

Recommended trial allowance is 100 AI phone minutes and 500 AI chatbot replies for the entire free calendar month. Reaching either limit must not create a payable invoice or automatic top-up. Explain the fallback in advance: pause additional AI usage and retain the client's normal contact route. One visitor must not be able to exhaust a shared account without rate limits and per-client enforcement.

Recommended paid allowance is 500 AI minutes and 2,000 AI replies each service month even when the base fee is prepaid for six or twelve months. Use the paid service anchor for resets, with the same month-end rule as the billing dates. Do not pool a year's allowance unless the agreement explicitly says so. Unused allowances expire at each reset.

Count connected AI phone time, including silence and hold while AI remains on the call. The proposed Reply365 guard counts each started connected AI second, then consumes minute credit proportionally; it does not round each call up to a full minute. Individual AI sessions are limited to 15 minutes and may end earlier when their allowance or service period expires. Disclose this duration limit alongside the allowance. Failed unconnected calls do not count. Recommend excluding post-transfer human conversation from AI minute consumption; ordinary carrier transfer costs are a modeled reserve, and expensive/international destinations require an explicit supported scope. A customer's own carrier may have separate charges that must be disclosed.

Display usage, reset date, remaining allowance, and any accepted credit or accumulated amount. Recommended notifications are at 80% and 100%. Do not claim alerts, a cap, or a fallback are operational until provider events and enforcement are connected and verified. Capture provider event IDs, final durations, and costs; deduplicate and reconcile corrections rather than blindly summing webhook deliveries.

The $0.40/minute excess rate is a recommended retail rate. The user selected explicit prepaid extra-minute purchases, without automatic top-ups or usage debt. The comparison records why accrued usage was rejected:

| Option | Customer payment behavior | Cancellation consequence |
| --- | --- | --- |
| Explicit prepaid credit, selected | The customer deliberately buys 100-minute packs for $40 when needed during paid service. No automatic top-ups. Additional AI seconds consume purchased credit at $0.40/minute; usage stops at zero credit. These purchases are separate from base-plan renewals. | No unpaid usage balance is created. Purchased credit carries forward while service is active; unused purchased credit is refunded when service ends. Trial credit is not purchasable. |
| Accrue to the selected renewal date, rejected | Included usage would reset monthly, but excess would be charged on the monthly, six-month, or annual renewal date. | A final usage-only bill would remain due when canceled service expires, conflicting with the no-debt policy. Do not implement this path. |

Do not silently choose monthly usage charges for annual or six-month customers. Do not enable chargeable excess before purchase authorization and its Reply365 enforcement have been implemented. No postpaid excess is permitted. Trial usage cannot create a payable balance.

## Cost evidence and assumptions

The selected delivery provider is Reply365. A read-only review of its owning repository found Twilio ConversationRelay for speech, Twilio US telephony, and OpenAI chat completions (default `gpt-4o-mini`, with other selectable models). No actual customer provider invoices, call exports, token usage exports, or labor records were supplied or queried. No production credentials were printed. These rates are current public list rates; the quantities and operational allocations below remain assumptions.

Relevant owning source:

- `apps/app/src/lib/chat-reply.ts`: OpenAI text requests, model selection, 450-token maximum reply. Website chat is Q&A and expressly excludes booking, payments, outbound messages, and transfers; do not advertise those chat actions.
- `apps/app/src/lib/conversation-relay/server.js` and `runtime-config.js`: phone relay, model, tenant context, call transcript persistence and transfer handling.
- `apps/app/src/app/api/webhooks/twilio/status/route.ts` and `src/lib/billing-ledger.ts`: call duration/price ingestion and a Twilio voice cost ledger. This is not complete cost accounting: relay charges, model tokens, hosting, and support are not all captured there.
- `apps/app/src/lib/chat-store.ts`: existing per-day website quotas, not the new offer's monthly allowance; `phone-agents.js` permits the default profile independently of the new subscription. These were insufficient offer entitlement controls.

Twilio lists ConversationRelay at $0.07/minute, US local inbound voice at $0.0085/minute, local outbound at $0.014/minute, and a local number at $1.15/month. The inbound baseline is therefore $0.0785/minute before model, transfers, recording, or optional add-ons. Toll-free, international, premium voice, and other configurations need separate costing. Source: https://www.twilio.com/en-us/voice/pricing/us

OpenAI lists `gpt-4o-mini` at $0.15 per million input tokens and $0.60 per million output tokens. For an illustrative 2,000 replies with 8,000 input and 200 output tokens per reply, model use is $2.64. An illustrative 500 phone minutes at three model turns/minute, 8,000 input and 120 output tokens/turn costs $1.91. These are arithmetic examples, not observed context sizes or usage. The model page currently labels this model deprecated, so confirm availability and the selected replacement's price before launch; do not silently alter unrelated tenants' models. Source: https://developers.openai.com/api/docs/models/gpt-4o-mini

The conservative model reserves below are intentionally higher than those token examples, allowing for classification calls, conversation history, configuration changes, and uncertainty. They are not a guarantee that arbitrary premium models fit the budget.

| Full included paid usage, one month | Modeled cost | Evidence status |
| --- | ---: | --- |
| 500 AI phone minutes × ($0.07 relay + $0.0085 local inbound) | $39.25 | Public-rate arithmetic for this configuration |
| Phone model allocation | $5.00 | Planning reserve; example token calculation above is $1.91 |
| 2,000 chatbot replies, model allocation | $25.00 | Planning reserve; example token calculation above is $2.64 |
| One US local phone number | $1.15 | Public rate |
| Hosting and monitoring | $20.00 | Planning assumption, not an invoice |
| Support, two hours × $50 | $100.00 | Planning labor assumption |
| Human transfer and usage contingency | $25.00 | Planning reserve, not measured cost |
| Payment processing allocation | $22.00 | Planning allowance, not a quoted processor rate or client surcharge |
| Total | $237.40 | Before acquisition, onboarding, tax effects, and exceptional support |

| Gross base price per service month | Modeled contribution before tax allocation | Percentage of quoted price |
| ---: | ---: | ---: |
| $750 monthly plan | $512.60 | 68.3% |
| $675 six-month equivalent | $437.60 | 64.8% |
| $600 annual equivalent | $362.60 | 60.4% |

These are planning contribution figures, not audited gross margin or net profit; tax-inclusive prices require net revenue allocation once applicable taxes are known. If actual phone delivery costs $0.20/minute and support takes four hours/month, modeled cost rises to $398.15 and the annual option retains $201.85 (33.6%) before those excluded costs. This stress case is a sensitivity assumption, not a provider quotation.

At $0.40 per extra minute, the $0.0785 telephony/relay baseline plus the $0.01/minute phone-model reserve leaves $0.3115/minute before support, transfers, processing and taxes. The recommended 500-minute included limit leaves room for service and support at the discounted $600 price. Reconcile actual Relay invoices, voice leg durations, model tokens, and support time before claiming a realized margin or expanding the included allowance.

Using the same reserves, the 100-minute/500-reply trial budgets $7.85 for relay/voice, $1.00 for phone model use and $6.25 for chat model use, or $15.10 variable cost, plus number, hosting, setup and support. Trial caps must remain enforced because the trial is free to the customer, not to Wallace Shift.

### Reply365 enforcement integration

The bridge maps only explicitly configured Reply365 tenant IDs to Wallace Shift engagement IDs. The server-only mapping is `WALLACE_SHIFT_SERVICE_TENANTS`; both the Next.js chat/voice process and the standalone relay process require the same map, upstream origin, and shared gateway secret. Unmapped tenants keep their existing billing rules. Do not migrate existing subscriptions or change signed terms to make this mapping work.

Before an AI answer, chat atomically consumes one reply and refunds it if the model fails or the answer cannot be delivered. Before an AI phone session, the relay atomically reserves up to 900 seconds, capped by quota and service expiry. A timer ends the session at its granted absolute deadline, and finalization returns unused seconds. Duplicate call IDs cannot open another session against the same reservation. The full reservation remains consumed if a worker dies before reconciliation; this is conservative against overspend, but operations must reconcile the actual call and correct the balance.

Twilio documents a WebSocket `end` message for ending a ConversationRelay session. `<Connect>`/`<ConversationRelay>` does not expose `<Dial>`'s `timeLimit` attribute. The bridge uses an actual relay timer and returns to an action route that hangs up for a service-limit reason; it does not invent an unsupported TwiML option. Sources: https://www.twilio.com/docs/voice/twiml/connect/conversationrelay and https://www.twilio.com/docs/voice/conversationrelay/websocket-messages

Paid-through expiry uses the exact granted deadline. Other mid-call revocations, are polled every 15 seconds; a gateway outage also closes the mapped session at that check. Network scheduling can add latency. Real provider tests must confirm the caller is disconnected and that downstream handoffs do not bypass the intended policy. Model requests already in flight can incur provider costs even when an expired reply is withheld; they do not create customer usage debt.

To avoid a bootstrap deadlock, test the unpublished customer configuration before adding the offer mapping: include both customer and private operator HTTPS widget origins from the start, test on the operator page without public embedding, and test the actual unadvertised number before customer forwarding is enabled. A bounded operator-approved setup window on the new tenant permits the phone check; do not modify existing client plans. Map both processes immediately afterward, clear setup approval, and publish readiness while the configuration and widget revision still match the evidence. Keep customer-facing embed and routing unpublished until dated activation.

Readiness must be supported by a current enabled widget/agent, provisioned phone number, a saved successful chat answer on the current revision, and a completed AI call with a reply after its greeting. The staged readiness command checks those tenant-scoped records, requires successful evidence within 24 hours and after the latest agent change, and publishes readiness only when explicitly run with `--publish`. Neither that command nor configuration alone proves production access until verified against live provider behavior. Readiness does not start the trial; the customer's subsequent dated activation does.

## Conversion evidence and a future guarantee

Current repository analytics count public visits and inquiry events. They do not link a client's website visitor to an eventual paid customer, and portal/private routes are excluded. No paid-conversion experiment or reliable uplift estimate was found. A conversation, lead, appointment, or invoice creation is not a paid-customer outcome.

Publishable alternative while evidence is absent: **“Help website visitors get answers and take the next step toward becoming customers. Try the AI chatbot and phone agent free for one month.”** Explain that results depend on eligible traffic, purchase intent, urgency, the business's offer, and its ability to fulfill inquiries. Do not append an unsupported “guaranteed to increase conversions” claim.

A proportionate measurement plan can use an agreed export and a small analysis script; a separate analytics platform is outside scope:

1. Define an eligible unique website visitor, deduplication rule, bot/staff exclusions, and attributable first paid purchase. Count only genuine settled customer transactions; define refunds and cancellations before measurement.
2. Choose a purchase attribution window suited to the sales cycle before the test. Thirty days is an example, not a universal promise. Outcomes can mature after the visitor-acquisition window ends.
3. Randomize eligible visitors consistently between the existing experience and the chatbot/phone treatment where feasible. Compare all assigned eligible visitors, not only people who engaged with an AI agent. If randomization is infeasible, label a pre/post comparison as weaker observational evidence.
4. Record source, campaign/search intent where available, landing-page purpose, and stated urgency. Use these as prespecified segments or adjustment variables. Do not define “warm” solely by industry, infer missing search queries, or invent post-hoc exclusions when results disappoint.
5. Set the baseline, minimum worthwhile lift, statistical test, sample size, evaluation window, exclusions, and stopping rule before launch. Report conversion rates, absolute and relative changes, confidence intervals, and missing-attribution rates.
6. Example only: detecting a rise from 3% to 4% with a two-sided 5% significance level and 80% power requires approximately 5,301 eligible visitors per group under a standard independent-proportions normal approximation. Recalculate for the actual baseline, design, clustering, and intended effect. A one-month trial may be much too short.
7. Distinguish demonstrated lift, evidence against the target effect, and insufficient evidence. Failure to find statistical significance is not proof of no effect. Do not call an underpowered test a success or a failed guarantee by default.

**Proposed future remedy, not approved or advertised:** if an agreed, eligible evaluation with adequate prespecified evidence fails the expressly defined improvement criterion, refund the first paid base service period, capped at $7,200. Define the claim deadline, evidence review, refund process, treatment of separately purchased usage, and access after refund in advance. A monthly customer would have up to $750 at risk, a six-month customer $4,050, and an annual customer $7,200. This creates significant refund exposure while provider, labor, and payment costs remain incurred. A suitable reserve and explicit owner approval are prerequisites. This proposal does not itself substantiate the performance claim.

Advertising claims need evidence before publication; fine print cannot be relied on to reverse the headline's impression. Primary references: https://www.ftc.gov/legal-library/browse/ftc-policy-statement-regarding-advertising-substantiation and https://www.ftc.gov/business-guidance/resources/advertising-faqs-guide-small-business

## Verification and release evidence

Before accepting live customers, reconcile the implementation against this specification and record actual results. Mocked unit/browser checks alone do not prove provider access, billing compatibility, alert delivery, bank settlement, or measured conversion lift.

| Case | Required independent evidence |
| --- | --- |
| Initial setup registration | No invoice, payment, or started trial solely from registration. |
| Activation | Both services pass real readiness checks; accepted exact terms, dates, limits, and payment authorization are stored. |
| Trial cancellation and cap | No payable base or usage invoice; provider access/cap behavior verified. |
| First charge and each interval | Stripe sandbox amount/status reconciles with the displayed agreement and dates. |
| Month-end, leap day, and delayed scheduler | Controlled-clock tests match the dated examples; original anchor survives clamp and late settlement. |
| Paid cancellation | No new base renewal; real service remains until expiry and then stops or uses the disclosed fallback. |
| Pending interval changes | No immediate charge/proration; latest accepted change applies only at the paid-through boundary; cancellation clears it. |
| Failed or processing payment | No duplicate invoice or unauthorized retry; no paid entitlement based on an unconfirmed request. |
| Duplicate, delayed, or reordered webhooks | Replays cannot double-charge, double-count usage, revive cancellation, or extend an expired period incorrectly. |
| Usage ledger | Final provider durations and charges reconcile with accepted customer units, credits/limits, and invoice totals. |
| Mobile and desktop | Playwright journey covers terms, authorization, cancellation, interval changes, and recovery; humans can identify first/next amounts, dates, and cancellation consequences without explanation. |
| Existing clients | Stored agreements, dates, signatures, payment histories, and prior semantics remain unchanged. |

Use a controlled clock for the existing scheduler plus Stripe sandbox transactions. If the new offer instead uses Stripe Billing, use its supported Test Clocks and sandbox subscription records; do not claim those clocks exercise a separate custom scheduler. Stripe references: https://docs.stripe.com/billing/testing and https://docs.stripe.com/billing/subscriptions/billing-cycle

Before publishing, resolve directly conflicting funnel text, including the $2,500 investment qualification and old free-website language, without redesigning unrelated questions. The selected policy removes the website benefit, delivers through Reply365, uses prepaid excess minutes without automatic top-ups, and includes applicable service taxes in the base price with no surcharge. Record verified Reply365 access enforcement and actual sandbox results. Until then, label missing capabilities and remaining limitations explicitly.


## Completed local verification

The subscription is additive to the existing PaymentIntent scheduler. No unrelated clients were migrated, no existing signed agreements were rewritten, and neither repository was deployed during this work.

- Wallace Shift production build passed, including server TypeScript and deployment-entry checks. Targeted lint passed.
- Controlled-clock billing/usage/refund suite: 34 tests passed. Existing portal suite: 56 passed. Checkout suite: 19 passed. Offer backend/client suites: 28 and 25 passed.
- Public offer browser checks passed at 1280px and 390px. Account journey checks passed at 1440px and 390px with mocked customer APIs and server-computed dates; these are not live-provider tests.
- Reply365 integration was applied to the actual repository. Seven targeted suites passed with 187 tests, including existing chat/relay behavior. The staged integration typecheck had the same three existing test-type errors as the unchanged baseline; no new type errors were introduced. Other concurrent Reply365 work was preserved.

### Actual Stripe sandbox evidence

The script refuses live credentials, verifies sandbox mode, replaces the application ledger with memory, and blocks non-Stripe external traffic. Receipt email is removed from test payments. Calendar dates below use the controlled application clock; they are not Stripe Test Clocks or actual settlement dates.

| Plan | First successful test payment | Renewal test payment | Amount each |
| --- | --- | --- | ---: |
| Monthly | `pi_3UXvGcJhqHsgjzkZ0JS8xMim` | `pi_3UXvGdJhqHsgjzkZ1H6tnUUv` | $750 |
| Six months | `pi_3UXvGeJhqHsgjzkZ1yGCkY5G` | `pi_3UXvGfJhqHsgjzkZ0XBT1Di7` | $4,050 |
| Twelve months | `pi_3UXvGgJhqHsgjzkZ0NS2vL7B` | `pi_3UXvGgJhqHsgjzkZ0Fl7hBNL` | $7,200 |

The first paid service date was February 29, 2032. The next monthly boundary was March 29, six-month boundary August 29, and annual boundary February 28, 2033. Each plan's second period was reconciled against its original anchor. Replaying the same Stripe requests returned the same payments. Trial cancellation created no payment request, and paid cancellation generated no further renewal.

Separate refund check: test payment `pi_3UXvUVJhqHsgjzkZ1Fza7c4i` succeeded for $40. With 3,000 seconds (50 minutes) unused at final expiry, refund `re_3UXvUVJhqHsgjzkZ1pPqwPGb` succeeded for $20. Processor retries and Stripe idempotency replay created no additional refund, and the PaymentIntent's refunded amount reconciled to $20.

Run local checks with `npm run test:ai-subscription`, `npm run test:ai-checkout`, and `npm run test:ai-subscription-browser`. Explicit sandbox checks use `npm run test:ai-subscription-stripe`; append `-- --refund-only` to run only a new credit-purchase/refund fixture. The sandbox script creates test objects, never live charges.

### Remaining operational limits

- Configure matching gateway secrets, origin, and tenant mapping in both Reply365 processes and Wallace Shift, then perform the documented private readiness checks. Actual connected calls, handoff time, production expiry, and real provider usage reconciliation still require observation.
- There are no actual provider invoices, customer call exports, support-time records, or visitor-to-paid-customer evidence behind the planning margins or conversion claim. The stronger guarantee remains unpublished. Human comprehension testing of the terms has not been performed.
- Usage notices are visible in the account at 80% and 100%; they are not email/SMS alerts. Cap enforcement remains independent of checking the account.
- A wholly elapsed unpaid period requires owner-assisted restart. The system does not silently collect backdated periods or move the original anchor.
- Refunds reserve the unused balance atomically and round its cumulative value to the nearest cent. The protected billing job and authenticated account refresh each process a bounded refund request; pending checks rotate so one cannot starve others. Late call finalization can create a later remainder refund. Unknown refund creation beyond the safe retry window, failed refunds, disputes, and manual refund discrepancies require reconciliation before another payout.
- A crashed phone worker can leave reserved minutes awaiting reconciliation from real call evidence. Those minutes must be corrected before the final unused balance is fully refunded. Bank refund-posting times are not controlled by the application.

Suggested Wallace Shift commit: `feat: add AI service subscriptions with calendar billing and prepaid usage refunds`

Suggested Reply365 commit: `feat: enforce Wallace Shift subscription access in chat and voice`
