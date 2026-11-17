# Homepage purchase evidence and package boundaries

Inspected November 16, 2026. This report supports the isolated homepage revision. It does not change the public offer terms, authorize a guarantee, or establish increased conversion.

## Recommendation

Lead with the customer's job: establish a business website, or give an existing service or campaign a focused page and response workflow. Explain ongoing responsibility and payment frequency immediately after that choice. Present the services in separate sections, with an optional factual comparison for people who want it.

The two offers are different services, not monthly and outright payment plans for the same product. A visitor may need both. A support preference alone cannot determine whether the customer needs a complete website or a campaign page. Neither offer fits a prospect who only needs advertising management or a full custom CRM. Keep a question route and the existing custom systems route open.

## Evidence table

| Observation and raw source | Interpretation | Untested or unavailable evidence |
| --- | --- | --- |
| Both live offer URLs returned HTTP 200 and rendered offer content during direct HTTP inspection. Their prices and scope agree with `src/content/contractorOffers.ts`. | These dedicated offers are deployed; the local homepage revision is a separate artifact. | Browser interactions, actual inquiry delivery and production provider behavior were not exercised by this audit. |
| The [live homepage](https://wallaceshift.com/) identifies AI integration and custom CRM development as its opening offer. | It is not the Examples first preview. Avoid reporting preview edits as changes to the live homepage. | No visual or behavioral parity claim is made between live and local pages. |
| `contractorOffers.ts:9–28` includes the website build, hosting, technical maintenance, basic SEO and a contact path for $250/month, but leaves page count, service limits, ownership, minimum term and cancellation for written agreement. | The payment schedule is clear while important purchasing obligations remain incomplete. Layout alone cannot resolve those unknowns. | Actual agreed contract, measured service allowance and minimum customer commitment for this campaign offer. |
| `contractorOffers.ts:42–67` supplies one lead page and one workflow for $1,500; hosting, software, message usage and ongoing management are separate. | “One time” describes the setup fee. It does not mean zero future cost or responsibility. | Specific tool, recurring charges, sender eligibility, reply handling, workflow support and correction window for a given buyer. |
| `prototypes/homepage/refined/main.tsx` shows the Northvane website hero and repeats it as the first workflow demonstration. | The second initial view repeats the deliverable instead of explaining what happens after an inquiry. Show capture and response next. | Whether this repetition actually lowers inquiries or sales. |
| `src/components/ContractorOfferDemo.tsx:35–74` implements a local sample workflow with no customer messages. `api/contact.ts:178–225` emails an inquiry to the configured inbox and returns provider acknowledgement. | A usable illustration and real inquiry transport exist. Neither is a provisioned customer automation product or a complete CRM. | A working customer workflow in the agreed third party tool, provider delivery, stop conditions and failure handling. |
| `api/_lib/business-dashboard-handler.ts:112–130` requires an owner session and rejects ordinary customer access. Its snapshot aggregates configured reports. | The reporting dashboard should not be bundled as a ready customer CRM or reporting upgrade. Existing code reuse does not complete client isolation or onboarding. | Customer access, per customer authorization, data separation, provider entitlement, renewal and measured support cost. |
| Current portal source and `docs/dashboard-operations-audit.md` identify client records as agreement contacts, while email reports reflect recent outgoing attempts. | Existing agreement and invoice administration is useful but is not prospect pipeline management or inbox synchronization. | A persistent customer sales pipeline and inbound email product. |
| `docs/analytics.md` and current analytics implementation define consented offer views, demo activity, form starts and one `generate_lead` per acknowledged inquiry. | The code offers a starting measurement path. API acknowledgement is not qualification, delivery or a sale. | Live event collection, current GA4 custom dimensions, traffic volume and joined sales outcomes were not available to this audit. |
| No actual inquiry export, lost opportunity dataset, support time log, margin ledger or refund cohort was found among repository report/data files. The customer CSVs found are explicitly roofing demo fixtures. | Do not use fixture values or earlier reports as business outcome evidence. | Actual objections, conversion rates, retained paid months, refunds, cost per sale and delivery margins. These remain unknown. |

Live page content was verified by retrieving the two public URLs directly. The browsing tool could read the homepage but returned retrieval errors for the offer URLs; those errors did not indicate a website outage. HTTP inspection then confirmed the deployed offer content:

- [Website package](https://wallaceshift.com/offers/contractor-websites)
- [Lead page and automatic follow up](https://wallaceshift.com/offers/lead-page-follow-up)

No live forms were submitted. No customer account, provider setting, inbox, advertising campaign or production data was changed. This audit did not read secrets or copy customer identities into its output.

## Internal comparison matrix

“Confirm in writing” identifies unresolved scope. It is not a substitute for agreeing those terms before a purchase.

| Decision factor | Website, hosting and care | Lead page and automatic follow up |
| --- | --- | --- |
| Best starting need | A new or improved home for the business online | One service or campaign needs a focused response path |
| Relationship to an existing website | May replace or establish it | Can work alongside it |
| Deliverable | Agreed business website; page and content scope still to be set | One focused page and one agreed follow up workflow |
| Build charge | Included in $250/month | $1,500 setup fee once |
| Regular payment to Wallace Shift | $250/month for agreed scope | Ongoing management not included; any optional service needs its own scope |
| Other costs | Domain registration and any agreed paid services | Hosting, software, email or SMS usage where needed; domain cost if needed |
| Inquiry capture | Working form and contact details | Form and agreed project details routed to an inbox or compatible tool |
| Automatic follow up | Separate | One workflow included; channel, messages, timing, reply handling and stop conditions agreed |
| Hosting | Included for the agreed website | Confirm existing hosting or separately scoped cost |
| Technical maintenance | Included within an unresolved allowance | Ongoing management excluded; correction and support scope must be agreed |
| SEO | Page titles, descriptions, headings and readable service information | No ongoing SEO campaign included; any page SEO work must be described in the project scope |
| Content and revisions | Responsibilities and allowance unresolved | Responsibilities and allowance unresolved |
| Ownership and exit | Website ownership, export, transfer and cancellation unresolved | Deliverable ownership, access transfer and workflow handoff require written terms |
| Minimum commitment | Not yet specified | Project payment, cancellation and acceptance terms not yet specified |
| Account responsibility | Domain and any external services agreed before launch | Compatible customer tools, authorized access, usage charges and post handoff operation agreed |
| Included administration | Existing access to the customer's Wallace Shift agreement and invoices, subject to ordinary account setup | Same |
| Not included | Paid ads, ongoing SEO campaigns, ecommerce, custom CRM, advanced interactive tools and automatic follow up | Ad spend, campaign management, custom CRM, complex integrations and ongoing management |

For someone needing both, scope the site and campaign together and remove overlapping work from the quote. Do not automatically stack the two prices or advertise a discount without defining the combined deliverable. For neither, offer an open conversation or the existing custom systems route.

## Upgrades supported by current delivery capabilities

These are three bounded scopes, not new core packages. No flat price is established because measured delivery and support costs are missing.

| Upgrade | Customer benefit and eligibility | Deliverable and cost basis | Boundary |
| --- | --- | --- | --- |
| Additional service or location pages | A website customer has a distinct service or genuine service area that needs its own useful explanation | Agreed additional pages, content responsibilities, page SEO, contact path and review round. Quote research, copy, design, implementation, review and launch time plus direct costs. Usually a project fee. | Only pages beyond the signed base scope. No invented office locations, duplicated location pages or ranking promise. The production site's multiple service and content routes demonstrate this type of work, not its sales impact. |
| Another follow up workflow | A website customer wants follow up, or a lead package customer has a genuinely additional sequence beyond the first included workflow | One named workflow in a compatible tool with defined triggers, messages, routing, reply handling, stop conditions, failure review, testing and handoff. Quote setup work plus disclosed software and usage charges. | The lead package already includes its first workflow. Current central pricing advertises setup work in existing tools, but this audit found no live customer workflow proof. Compatibility and delivery testing are prerequisites. New integrations, AI and indefinite monitoring are not implied. |
| A defined content update allowance | A customer needs regular service, project or business information changes beyond the base maintenance agreement | A monthly allowance with named content types, request limits, turnaround, review process and handling of unused capacity. Price expected monthly labor, administration and support plus direct costs and a margin allowance. | Define the base package's included updates first. Technical maintenance already included at $250 must not be charged again. This is not an unlimited update promise, content marketing campaign or ongoing SEO service. |

Reusable website components and established content publishing support these service scopes. Each customer still creates real research, configuration, testing, communication and support work. A new workflow should be sold only after access and the chosen tool's capabilities have been checked. Do not advertise customer CRM access, a self service account connection product, an inbound mailbox or general social publishing as an upgrade from the current owner dashboard.

## Cost and margin worksheet

Capture actual minutes and direct charges for these fields on the first deliveries:

1. Scoping and sales handoff.
2. Content collection, copy work and asset preparation.
3. Design and initial implementation.
4. Account access, sender configuration and compatibility checks.
5. Revisions, mobile and accessibility checks, inquiry delivery and workflow testing.
6. Launch, documentation and customer handoff.
7. Monthly hosting, storage, software and usage paid by Wallace Shift.
8. Support requests, content allowance, maintenance and provider changes.
9. Refunds, corrective work, payment processing and cancellation handling.
10. Acquisition spend attributable to the customer, kept separate from delivery margin.

The user's reported 30 to 60 minute build time is an initial implementation estimate. It is not measured total delivery cost.

For a project, estimate direct delivery cost as loaded labor plus direct expenses plus expected correction/support cost. A quote can use `expected cost / (1 − target delivery margin)` after the target is chosen. Do not confuse markup on cost with margin on revenue. Show customer paid third party charges separately and avoid counting them as Wallace Shift revenue when they are paid directly to a provider.

For the subscription, measure actual paid months rather than assuming lifetime value. Customer delivery contribution before acquisition is retained service revenue less initial delivery, monthly direct costs, support, fees and refunds. Recovering initial setup depends on retained paid months, which is currently unknown. A 30 day refund can leave the entire initial build cost unrecovered; include that exposure in the guarantee decision.

For an upgrade, count only incremental work, not functions already paid for in the base service. Optional setup fees do not fund indefinite token renewal, software changes or support. Put ongoing responsibilities in writing.

## Measurement limits and what would change the recommendation

Current repository instrumentation cannot establish actual traffic, inquiry qualification or sales. A signed in authorized reporting session or an aggregated export is needed for those outcomes. Individual inquiries and reasons for lost business should be reviewed privately; they must not be placed in public preview fixtures or analytics parameters.

Use qualified inquiries per relevant visitor as the initial business measure, with a consistent definition of a genuine prospect whose need fits an offered scope. Keep information seekers welcome and record their eventual outcomes. Follow sales, acquisition cost, refunds, retained paid months, support time and delivery contribution. Separate channel and device mix; disclose that consented analytics is only an observable subset of traffic.

Without baseline traffic and conversion counts, no meaningful experiment duration or sample size can be promised. Start with the local scenario walkthrough, settle the commercial terms, then collect actual inquiries and fulfillment costs after a deliberately authorized release. Use a controlled experiment only when traffic supports a prespecified economically meaningful difference. A change in a small before and after cohort is suggestive, not causal proof.

Revisit the problem first structure if real prospects understand and choose more accurately using support responsibility first. Reconsider presenting the services as alternatives if delivery and sales evidence shows they solve the same job. Expand upgrades only after repeated demand and measured margins support them. Add customer reporting or CRM only after isolated customer access, onboarding, provider behavior and ongoing cost have been verified.

Proposed commit message: `Clarify homepage purchase paths, package boundaries and optional upgrades`
