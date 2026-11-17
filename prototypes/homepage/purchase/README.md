# Examples first: clearer choices

Isolated local preview, reviewed 17 November 2026.

[Open the preview](http://127.0.0.1:5184/prototypes/homepage/purchase/index.html) · [Previous version](../refined/index.html)

## Recommendation

Lead with the job the customer needs done. The website package establishes or improves the business website and includes technical care. The lead page package creates one focused response path and hands over one agreed workflow. These can complement each other; they are not payment plans for the same product.

Use separate service sections with a common reading order: purpose, fit, price and cadence, included work, responsibility after delivery and next step. Choosing a package moves its complete section first and keeps the selector available while reading. The other package remains complete below. A distinct dark comparison section shows five key differences immediately, with remaining details available through an explicit button. Comparison and question routes stay open.

This is a reasoned design recommendation, not a proven conversion winner. No actual conversion, refund or delivery cost dataset was available in the reviewed material.

## Evidence and commercial proposals

- [Evidence table, complete internal comparison, capabilities and cost worksheet](../../../docs/homepage-purchase-evidence.md)
- [180 Sites primary sources, proposed guarantee and upgrade economics](../../../docs/homepage-guarantee-upgrade-research.md)

The two dedicated offer pages are already deployed. The live homepage remains separate from this preview. Only the new preview directory and two research documents were added. Existing preview files, production routes, offer definitions, billing and animation assets were preserved. This entry is not included in the production Vite build inputs, and its HTML is marked noindex. That is isolation from deployment, not authentication.

The material limitation is unresolved terms, not just layout: included page count and update allowance, minimum commitment, cancellation, ownership and tool running costs must be agreed before a purchase. We show those unknowns near the price. A final all inclusive total cannot be honestly calculated without them.

## What changed

1. The hero retains the same logo, typography, ink background, blue controls and existing website videos. The two opening prices remain visible, with the project explicitly labelled once for setup.
2. Package choice follows the hero. Two complete service cards replace the long competing columns. Each groups purpose and price first, then included work and responsibility beside a quiet cost area. Mobile uses one reading column. Repeated labels and explanations are consolidated without removing material conditions.
3. The package introduction retains its layered composition, heading, explanation and comparison link. Its original choice labels now activate buttons that prioritize the corresponding package. The same buttons become a compact persistent selector within the package area, retain focus and expose their pressed state. Both packages remain visible, with document order matching visual order. Direct package links still work. No mandatory choice or qualification is required to read either offer.
4. A separate dark comparison section replaces the nearly invisible disclosure and repeated rules. The two tinted columns show prices, billing cadence and five key differences by default. A labelled button expands all 13 points, including hosting, SEO, ownership, SMS and exclusions. The semantic table keeps both values together beneath each criterion on mobile, without horizontal scrolling. A separate blue assistance band gives “Need both?” its own heading and question route before the light inquiry demonstration begins.
5. Northvane appears once as a website example. The inquiry demonstration now shows a completed form on a phone held in an illustrated hand, follows the request through an automatic next step, then shows the conversation reaching the team. The same project details stay with it. Every state is labelled illustrative and sends nothing.
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
| Needs both | Avoid an automatic combined charge and offer a scope conversation | Passed. The starting panel and assistance band route to questions; the no automatic bundle price disclosure remains. |
| Needs information | Reach an email or inquiry route without selecting a package or answering a mandatory quiz | Passed. The starting panel's question link and direct question links remain open. No live messages submitted. |
| Workflow | Capture, routing, follow up, reply and reset work; the website image is not repeated | Passed. Three stages and reply/reset verified, with one Northvane poster in the page. |
| Keyboard | Journey tabs support arrows, Home and End; comparison expands and collapses from its button | Passed. Earlier journey checks passed. Revised comparison opens with Enter and closes with Space; aria-expanded matches the visible state. |
| Responsive | No page level horizontal overflow at 320, 390, 768, 1280 and 1440 pixels | Passed for the revised comparison. Both offer values fit without horizontal scrolling, including all 13 points at 320 pixels. |
| Media | Existing demo can play and has a caption track | Passed. Kitchen video reached readyState 4 and advanced in playback; caption source present. |
| Disclosures | Guarantee reads as proposed; scope and cost exclusions open; included first workflow stays included | Passed. Opened and inspected guarantee and upgrade details. |
| Navigation | Mobile menu opens and closes after a destination is chosen | Passed at 390 pixels. |
| Code | Isolated entry type checks, lints and bundles | Passed. Targeted TypeScript, ESLint and isolated Vite build; Impeccable detector returned no findings. |

The ordinary application TypeScript config and production build do not include prototype entries. They were not used as misleading evidence that this preview compiled. The isolated build writes to `/private/tmp/wallace-homepage-purchase-build` and does not publish or replace `dist`.

Screenshots: [revised desktop package introduction](review/desktop-package-intro.jpg), [revised mobile package introduction](review/mobile-package-intro.jpg), [revised desktop comparison](review/desktop-comparison.jpg), [revised mobile comparison](review/mobile-comparison.jpg), [desktop packages](review/desktop-packages.jpg), [mobile opening](review/mobile-opening.jpg), [mobile package](review/mobile-package.jpg).

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

## Package introduction revision

Added 16 November 2026 after the comparison revision. The heading and explanation now form one group beside a visible starting point panel. The old collapsed question and selection state are removed. Both service links navigate straight to the existing package details; comparison and question routes stay available. This changes presentation and navigation only, with existing scope, prices, disclosures and live routes preserved.

Verified all four destinations, Enter activation, visible keyboard focus, and layouts at 320, 390, 768, 1024 and 1440 pixels. No page overflow was found; navigation targets are at least 44 pixels tall. TypeScript, ESLint and the design detector passed. Screenshots show the revised desktop and mobile introduction. No deployment or sales outcome is implied.

Proposed commit message: `Refine package introduction with visible service navigation`

## Introduction depth refinement

The introduction now sits on a darker cool neutral background. A decorative white band spans the viewport and takes its height from the left copy with 24 pixels of vertical padding. The navigation panel extends above and below the band, with a soft downward shadow. Grid sizing stays intrinsic; no fixed content heights or viewport width breakout are used. Below 960 pixels, the white copy strip and navigation panel form a vertical stack.

At 1440 pixels, the white band measured 299 pixels tall and the panel 399 pixels, with approximately 50 pixels of extension on each side. Checked 320, 390, 768, 960, 1024, 1440 and 1920 pixel widths with no horizontal overflow. Text contrast measured at least 5.47:1 and all introduction link targets are at least 44 pixels tall. All four destinations, keyboard activation and visible focus were checked. The decorative band has no pointer events.

A temporary local CSS fixture doubled the introduction's computed text sizes at 320, 768, 1024 and 1440 pixels. The narrowest view exposed a long heading word; an overflow wrapping rule fixed it. The fixture was removed after verification. This is a text enlargement simulation, not a physical device or native browser zoom test. A clean page load produced no new console errors.

Compared the package articles, comparison implementation and introduction copy against a snapshot from before this refinement. All were preserved. TypeScript, ESLint, whitespace checks and the design detector passed. Production files and deployment were not changed.

Screenshots: [desktop composition](review/desktop-package-depth.jpg), [mobile composition](review/mobile-package-depth.jpg), [200 percent text check](review/package-depth-text-200.jpg).

Proposed commit message: `Add layered depth to the homepage package introduction`

## Package hierarchy and selection refinement

Added 17 November 2026. This supersedes the earlier package row layout and native starting links described in the historical introduction review above. The introduction copy and decorative band remain intact. Changes are confined to the package content, its presentation and its selection controls.

Both packages now use the same structure: a recognizable purpose icon, name and fit, price and cadence, included work, responsibility after delivery, cost conditions and action. The first workflow remains included in the lead package. SMS registration and possible launch delays remain visible in its cost area. Both guarantee links still say proposed. No pricing, terms or capabilities were invented.

Spacing and surface contrast replace the repeated package rules. The selected package has a white surface and restrained shadow; the other is quieter but retains normal text contrast, full content and working actions. The selector does not use tabs or hide panels. Activating either button updates the actual article order and URL fragment, keeps focus on that button and positions the heading and price below the persistent controls. The full introduction panel returns when the visitor scrolls back up.

### Verification for this revision

- Checked both selection directions at 320, 390, 768, 1024, 1280 and 1440 pixel widths. Both cards remain present; document order matches the displayed order. No page overflow or targets below 44 pixels were found in the package area.
- Tested Enter, Space and Tab. Focus remains on the activated control, selection is exposed through aria-pressed, and the next action belongs to the first package. Focus outlines remain visible.
- Verified initial direct package links, repeat navigation to the same fragment and browser back navigation. Both dedicated offer destinations loaded locally. All package example, comparison, guarantee and question fragments resolve to existing targets.
- Resized with the selector docked and returned to the introduction. The full panel and its placeholder heights match after returning; the composition has no horizontal overflow.
- Simulated 200 percent text by doubling computed text sizes in a temporary local fixture at 320, 768 and 1440 pixels. A narrow price overflow was found and fixed. The final checks had no clipping or horizontal overflow. At enlarged text sizes, reading the whole package requires scrolling. The fixture was removed.
- Measured text contrast conservatively at a minimum of 4.64:1 within the package section. No repeated top or bottom rules remain on package cards.
- Targeted TypeScript and ESLint passed. An isolated Vite build passed with output in `/private/tmp/package-selection-build`. A fresh browser reload produced no new warnings or errors; earlier development reload warnings were not reproduced on the clean load.

Screenshots: [desktop package selection](review/desktop-package-selection.jpg), [mobile package selection](review/mobile-package-selection.jpg).

These are local visual and functional checks. They do not establish improved comprehension or sales. Physical devices, screen reader sessions, real form delivery and production behavior were not tested. No deployment was performed.

Proposed commit message: `Refine package hierarchy and keep offer selection visible`

## Visual inquiry story

Added 17 November 2026. Replaced the text heavy inquiry panels with one connected visual scene: a hand holding the completed phone form, an inquiry card and a fictional roofing team member with an example inbox. All artwork is local SVG illustration. It is not a product screenshot, real customer record or testimonial.

The steps now read capture, give the inquiry a next step, then put it in the right hands. The request icon travels along the visible route after an action. The example confirmation and customer reply keep the original roof repair details. The team already receives the request during the confirmation stage; the final step shows the human conversation, rather than implying that delivery must wait for the customer to reply. The website package bypasses automatic follow up, as stated next to the scene.

The action is above the artwork so visitors can watch what happens. Step selection, sequential advance and replay are available without an automatic slideshow. On smaller screens, the active illustration is shown at a readable size with the same three step controls. The final inbox includes the sample customer reply. Motion runs only on advancement, has no loop and is disabled by the reduced motion media rule.

Checked all three stages at 320, 390, 768, 1024 and 1440 pixel widths. No horizontal page overflow or controls below 44 pixels were found. Right arrow, End, Tab, Enter and replay were checked, with focus retained on the active control. A temporary fixture doubled explanatory and control text at 320, 768 and 1440 pixels; the scaled phone illustration retained its own proportions. Text wrapped without clipping. This was a CSS text simulation, not native browser zoom or a physical device test. The fixture was removed.

Rendered text contrast measured at least 5.30:1. A clean preview reload produced no new console warnings or errors. Targeted TypeScript, ESLint and the isolated Vite build passed. Existing package selection, comparison, offer destinations, guarantee, upgrades and other sections were preserved. No production files or deployment changed, and no request or message was sent.

Screenshots: [desktop inquiry story](review/desktop-inquiry-story.jpg), [mobile inquiry story](review/mobile-inquiry-story.jpg).

These checks establish local presentation and behavior. Customer comprehension, usage and conversion remain unmeasured.

Proposed commit message: `Turn the inquiry demo into a visual customer journey`

## Scroll driven inquiry refinement

Updated 17 November 2026. This supersedes the button controlled visual inquiry story above.

The phone is now standalone. Stage and replay buttons have been removed. Scrolling carries the blue envelope to the middle station, reveals a fictional lead card, then carries an outgoing envelope from behind the expanded card into the recipient's hands. The card keeps its layout footprint throughout. The recipient gains color and a delivery indicator at arrival. The former inbox card is replaced with four scoped notification options: in app notification, SMS, email and phone call. These are options to agree during setup, not four automatically included integrations.

Desktop holds the scene only when its full content fits the viewport. Smaller screens use a vertical document flow. Scroll progress is reversible, the envelope uses measured source and destination positions, and the section refreshes when preceding package or comparison content changes height. Reduced motion presents the full information without pinning or travel. A keyboard accessible skip link bypasses the demonstration.

Validation for this revision:

- Rendered the ordinary preview at 1440 × 900, 1440 × 1000, 768 × 1024 and 390 × 844. Checked forward and reverse progress, the collapsed lead, expanded lead, visible delivery, color change and no horizontal overflow.
- Verified the envelope's final center matches the recipient's held envelope. The lead stays expanded during delivery. The phone hand, stage buttons, replay button and inbox card are absent.
- Verified the 44 pixel skip link with Enter and confirmed arrival at the following section.
- Used a disposable local fixture to simulate reduced motion and 200 percent text at 320 × 800. All three explanations remained available, no pin was created, and contact labels stacked without overlap. This was a simulation, not an operating system preference or physical device test. Removed the fixture afterward.
- Targeted TypeScript, ESLint and the isolated Vite preview build passed. Development hot reload emitted the existing duplicate createRoot warning while other preview edits were being made; no change was made to the shared entry in this refinement.

Current screenshots: [desktop delivery](./review/desktop-inquiry-scroll-delivered.jpg), [mobile lead](./review/mobile-inquiry-scroll-lead.jpg), [mobile delivery](./review/mobile-inquiry-scroll-delivered.jpg).

Proposed commit message: `Refine scroll driven inquiry reveal and team delivery`

## Divider removal and restored content

Updated 17 November 2026. Removed the rejected workload questionnaire. Restored the existing package chooser immediately after the hero and the process/client portal section after the monthly services, with their original copy and navigation. Package illustrations from the separate artwork change are preserved.

The remaining presentation change removes horizontal separator borders throughout this preview. Existing spacing and surfaces group the content; comparison rows use spacing, FAQ items use a quiet background, and portal tabs use a filled selected state. Keyboard focus outlines remain intact.

Verified with Playwright at 320, 390, 768 and 1440 pixels: package selection and focus retention, comparison expansion, portal arrow/Home navigation, selected states, mobile navigation, no horizontal overflow and no computed horizontal separator borders. Axe reported zero WCAG A/AA violations in the tested states. Desktop and mobile screenshots were visually inspected. Targeted TypeScript, ESLint, whitespace checks and an isolated Vite build passed. No deployment was performed.

Customer validation remains pending. The only firsthand prospect evidence supplied is the owner's account of a business already at capacity whose customers value speaking directly with the owner. This does not establish a general visitor need for a questionnaire. No observed browsing sessions or inquiry behavior were available.

### Pending customer test

Use the original page and this revision with prospective customers unfamiliar with Wallace Shift. Alternate version order and use equivalent scenarios to reduce learning effects: a business needing a whole website, an existing website needing a page for one campaign, and a business whose current website and inquiry process already work.

Without coaching, ask each participant to choose an option or explain why neither fits, state the price and cadence, identify additional costs and unresolved terms, explain who handles replies and ongoing care, and reach the appropriate next step. Record complete/partial/failed tasks, specific misunderstandings, requests for help and completion time for each version. A completed task requires all of those answers to match the disclosed scope; reaching a contact link alone does not count. Report observations rather than claiming a conversion improvement from a small qualitative test.

Commit message: `Remove homepage divider rules and preserve existing content and section order`

## Useful process examples and section separation

Updated 17 November 2026. The process stays after monthly services, with the same heading and three stages. Its former agreement/invoice mockup is replaced by an illustrative website project: choosing a stage shows what to settle in the scope, what to check in a working review, or who handles inquiries and website care after launch. The scope starts with decisions about content, inquiry delivery and terms; price is supporting information. This is an explanatory example, not a new client portal capability.

The blue section surface and generous top/bottom spacing separate it from the light monthly services above and the ink custom systems section below. Desktop keeps the original two column premise; mobile puts compact step controls directly above the example. Selected steps use a filled surface, with no divider rules. Arrow keys, Home, End and Tab navigate the example.

The scope and price come from `src/content/contractorOffers.ts`; working reviews and handoff are supported by `src/content/about.ts` and `src/content/servicesPage.ts`. No turnaround, ownership or unlimited care promise is added. The example review lists actions to perform, not completed customer tests.

Verified all three stages at 320, 390, 768 and 1440 pixels with Playwright and axe: zero WCAG A/AA violations in the tested section states, no horizontal overflow or separator borders, distinct backgrounds on both sides, and working keyboard navigation through the steps, panel and example link. Visually inspected desktop/mobile renders and a 200 percent text simulation at 320 pixels; the step controls wrap when enlarged text needs room. This was a CSS text simulation, not a physical device test. Targeted TypeScript, ESLint and the isolated preview build passed. No deployment or customer testing was performed.

Customer validation is pending. In the existing comparison protocol, also ask an unfamiliar visitor to identify what must be agreed, describe one prelaunch check, and explain who replies after launch. Record whether the visitor finds each answer without coaching and compare with the former portal illustration.

Commit message: `Make homepage process examples useful and separate the section visually`
