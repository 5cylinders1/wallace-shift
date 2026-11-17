# Examples first: clearer choices

Isolated local preview, reviewed 16 November 2026.

[Open the preview](http://127.0.0.1:5184/prototypes/homepage/purchase/index.html) · [Previous version](../refined/index.html)

## Recommendation

Lead with the job the customer needs done. The website package establishes or improves the business website and includes technical care. The lead page package creates one focused response path and hands over one agreed workflow. These can complement each other; they are not payment plans for the same product.

Use separate service sections. Each has its intended use, deliverables, after launch responsibility, price, additional cost categories and next step. A distinct dark comparison section shows five key differences immediately, with the remaining details available through an explicit button. An optional question helps someone find a starting point, including both or unsure, without hiding either offer. Billing and support explain the commitment after the visitor understands the work.

This is a reasoned design recommendation, not a proven conversion winner. No actual conversion, refund or delivery cost dataset was available in the reviewed material.

## Evidence and commercial proposals

- [Evidence table, complete internal comparison, capabilities and cost worksheet](../../../docs/homepage-purchase-evidence.md)
- [180 Sites primary sources, proposed guarantee and upgrade economics](../../../docs/homepage-guarantee-upgrade-research.md)

The two dedicated offer pages are already deployed. The live homepage remains separate from this preview. Only the new preview directory and two research documents were added. Existing preview files, production routes, offer definitions, billing and animation assets were preserved. This entry is not included in the production Vite build inputs, and its HTML is marked noindex. That is isolation from deployment, not authentication.

The material limitation is unresolved terms, not just layout: included page count and update allowance, minimum commitment, cancellation, ownership and tool running costs must be agreed before a purchase. We show those unknowns near the price. A final all inclusive total cannot be honestly calculated without them.

## What changed

1. The hero retains the same logo, typography, ink background, blue controls and existing website videos. The two opening prices remain visible, with the project explicitly labelled once for setup.
2. Package choice follows the hero. Two vertical service rows replace the long competing columns. Desktop uses purpose, included work and cost across each row; mobile groups those into one readable sequence.
3. The optional need question offers website, focused offer, both and unsure. No choice is required and no answer is transmitted or stored. The question is about the job, not which billing schedule sounds cheaper.
4. A separate dark comparison section replaces the nearly invisible disclosure and repeated rules. The two tinted columns show prices, billing cadence and five key differences by default. A labelled button expands all 13 points, including hosting, SEO, ownership, SMS and exclusions. The semantic table keeps both values together beneath each criterion on mobile, without horizontal scrolling. A separate blue assistance band gives “Need both?” its own heading and question route before the light inquiry demonstration begins.
5. Northvane appears once as a website example. The next demonstration starts with sample inquiry details, moves to the inbox, and shows the optional automatic response and human handoff. Every state is labelled illustrative and sends nothing.
6. A clearly marked draft 30 day satisfaction proposal names the eligible fees. Its proposed start is complete delivery plus written notice. The website billing schedule would need to match the review period. A timely refund request pauses future covered billing; a refund ends the service. It is not an active policy or a performance guarantee.
7. Three bounded additions are available to discuss: extra pages, another compatible workflow and a defined monthly content allowance. Their existing inclusions remain intact. No unmeasured fixed upgrade price is invented.
8. The agreement and invoice portal illustration, custom systems route, open question route and optional original animation showcase remain available. We removed the unsupported one business day response promise from this new preview.

## Acceptance criteria and local review

These are scenario checks by the implementer, not recruited prospect tests.

| Check | Acceptance criterion | Local result |
| --- | --- | --- |
| First arrival | Offer names, both prices and cadence are accessible with no entrance sequence or qualification | Passed. Both opening prices end within the first 420 CSS pixels on a fresh 390 pixel viewport. |
| New website | Find a website example, included care, additional cost categories and the dedicated offer | Passed. Website route leads to the existing $250 offer and an open inquiry form. |
| Existing website, one campaign | Find the workflow example, $1,500 setup, possible recurring charges and handoff responsibility | Passed. Lead route leads to the existing offer, sample workflow and open inquiry. |
| Needs both | Avoid an automatic combined charge and offer a scope conversation | Passed. Optional guide identifies overlap and routes to questions. |
| Needs information | Reach an email or inquiry route without selecting a package or answering a mandatory quiz | Passed. Unsure state and direct question links remain open. No live messages submitted. |
| Workflow | Capture, routing, follow up, reply and reset work; the website image is not repeated | Passed. Three stages and reply/reset verified, with one Northvane poster in the page. |
| Keyboard | Journey tabs support arrows, Home and End; comparison expands and collapses from its button | Passed. Earlier journey checks passed. Revised comparison opens with Enter and closes with Space; aria-expanded matches the visible state. |
| Responsive | No page level horizontal overflow at 320, 390, 768, 1280 and 1440 pixels | Passed for the revised comparison. Both offer values fit without horizontal scrolling, including all 13 points at 320 pixels. |
| Media | Existing demo can play and has a caption track | Passed. Kitchen video reached readyState 4 and advanced in playback; caption source present. |
| Disclosures | Guarantee reads as proposed; scope and cost exclusions open; included first workflow stays included | Passed. Opened and inspected guarantee and upgrade details. |
| Navigation | Mobile menu opens and closes after a destination is chosen | Passed at 390 pixels. |
| Code | Isolated entry type checks, lints and bundles | Passed. Targeted TypeScript, ESLint and isolated Vite build; Impeccable detector returned no findings. |

The ordinary application TypeScript config and production build do not include prototype entries. They were not used as misleading evidence that this preview compiled. The isolated build writes to `/private/tmp/wallace-homepage-purchase-build` and does not publish or replace `dist`.

Screenshots: [revised desktop comparison](review/desktop-comparison.jpg), [revised mobile comparison](review/mobile-comparison.jpg), [desktop packages](review/desktop-packages.jpg), [mobile opening](review/mobile-opening.jpg), [mobile package](review/mobile-package.jpg).

Not verified: physical devices, assistive technology sessions, actual customer understanding, production form delivery, payment changes, adopted refund terms, customer automation installation or sales improvement. The original showcase link and assets are preserved; its animation internals were not changed or retested.

## Measurement plan

### Before any release

Settle page count, content responsibilities, update and support allowances, term, ownership, exit, recurring charges and final guarantee terms. Time a complete delivery including scoping, content collection, setup, review, testing and handoff. The estimate of 30 to 60 minutes to build a site does not establish total cost.

Review an authorized aggregate of recent visitor, inquiry and sales records when available. Existing code defines consented offer events and `generate_lead`, but this task did not verify live collection. An acknowledged form is an inquiry, not a qualified opportunity or a sale.

### First observation period

After a separately authorized release, record source, device, offer of interest, inquiry date, need fit, price misunderstanding, eventual outcome and reason for declining. Do not send message contents, emails or customer names to analytics. Welcome information seekers and allow their later outcome to change qualification status.

Define a qualified inquiry as a genuine prospect with a need matching deliverable scope and a viable service conversation; readiness to buy today is not required. Use a fixed, documented rubric and exclude spam, internal tests and duplicate inquiries.

Initial measure: unique qualified inquiries divided by relevant human visitors. Report numerator, denominator, consent coverage, source mix and observation dates. If the visitor denominator cannot be reconciled, report inquiry counts and quality without pretending to know the rate. The prototype sends no analytics; this document proposes the future measurement rather than claiming instrumentation was added.

Follow each cohort through sales, acquisition cost, actual paid months, refunds and support time. Measure delivery margin as retained revenue less delivery labor, direct software, payment costs and support; report acquisition cost separately and also calculate contribution after acquisition. Use actual retention, not a presumed 24 month lifetime.

### Experiment decision

Traffic volume and baseline qualified inquiry rate are unknown, so no sample size or duration is justified yet. Once available, specify the smallest economically useful difference, baseline rate, power, significance threshold and maximum duration before allocating an experiment. Randomize comparable relevant visitors and protect lead quality, refund rate and margin as guardrails.

If that volume is insufficient, use staged release observation: first validate the inquiry path and source tagging, then review actual misunderstandings and fulfillment costs, then assess sales cohorts. Keep source and campaign mix visible. A small before and after difference is suggestive, not proof that the layout caused more sales. No recruited testers are required for this plan.

### Evidence that changes the recommendation

- Real prospects repeatedly choose or explain the offers more accurately when asked about support first: reconsider the optional guide.
- Actual buying behavior shows the two offers solve the same job: reconsider treating them as separate service paths.
- People miss critical inclusions despite the separate rows: revise hierarchy or make the comparison more prominent.
- Additional page or content demand is low, or support time exceeds the allowance: remove or reprice the relevant addition.
- Refund and transition costs make contribution unacceptable, or billing cannot match the review window: revise the draft guarantee before offering it.
- A different layout produces more qualified business with acceptable refunds and margin in an adequately powered experiment: adopt it.

Proposed commit message: `Clarify homepage purchase paths, package scope and optional upgrades`

## SMS registration disclosure

Added 16 November 2026 to the visible lead package cost area, the comparison, extra workflow scope and FAQ. The copy scopes A2P 10DLC to automated texts to US recipients from local 10 digit numbers, separates toll free verification, and avoids a promised launch date. Registration and carrier fees are confirmed before setup. If SMS is part of the agreed delivery, required approval and workflow testing precede the proposed guarantee window. Email is not silently substituted for an agreed SMS workflow.

[Twilio's registration quickstart](https://www.twilio.com/docs/messaging/compliance/a2p-10dlc/quickstart) currently estimates up to five business days for standard campaign reviews and calls out requests for additional information. [Its campaign vetting FAQ](https://help.twilio.com/hc/en-us/articles/11587910480155-A2P-10DLC-Campaign-Vetting-FAQ) distinguishes toll free verification. These are provider estimates, not an end to end promise. The preview therefore uses several business days or longer. No registration was submitted and no messaging service was enabled.

Proposed commit message for this follow up: `Disclose SMS registration requirements and approval timing`

## Comparison visibility revision

Added 16 November 2026 after review of the package transition. The comparison now has a visible heading, price columns and five default rows. All 13 existing scope points remain available. “Need both?” is an assistance band, not a third package. The inquiry demo begins on a contrasting light surface. No prices, inclusions, guarantee terms or production routes changed.

Verified desktop and mobile rendering, keyboard expansion, the full comparison, and the open question destination. Targeted TypeScript, ESLint and the design detector passed. These checks establish local presentation and functionality, not improved sales or prospect comprehension.

Proposed commit message: `Make homepage package comparison prominent and separate section transitions`
