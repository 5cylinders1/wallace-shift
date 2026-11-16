# Software evidence and package readiness

Reviewed 15 November 2026. This is an audit of the current local working tree, including preexisting unpublished changes. No production credentials, customer records, provider accounts or live advertising settings were accessed. Local implementation and mocked tests establish capability boundaries; they do not establish that the deployed service or an individual provider connection works.

## Recommendation

Include **a private portal for the customer's Wallace Shift agreement and invoices** as an administrative convenience in both offers. Do not describe this as a CRM for the customer's business.

Do not add “CRM included,” a customer reporting dashboard, advertising management or self service account connection promises to either package today. The existing business dashboard is an owner only reporting workspace. Its reusable code is valuable, but client provisioning, account isolation, access, ongoing credential support and delivery costs are not yet a verified product.

The $1,500 offer can remain a service to configure **one agreed follow up workflow**, with compatibility, channels, timing, stop conditions and recurring costs agreed before purchase. The homepage demonstration must identify that workflow as illustrative. The inspected repository does not contain a generic, ready to activate customer follow up engine.

## Capability evidence

| Capability | Observed implementation | Limitation | Proposed inclusion |
| --- | --- | --- | --- |
| Private agreements and invoices | [Engagement model](/Users/matthewwallace/Repos/WallaceShiftLogoSite/src/client-portal/model.ts:27) stores terms, signature, invoices, payment state and audit. [Access filtering](/Users/matthewwallace/Repos/WallaceShiftLogoSite/api/_lib/portal-ledger.ts:40) limits client records by identity and invitation scope. | This manages the customer's relationship with Wallace Shift. It does not provision a workspace for that customer's own clients. | Include access with each issued Wallace Shift engagement. Describe the concrete documents, not a broad CRM. |
| Website inquiry | [Contact handler](/Users/matthewwallace/Repos/WallaceShiftLogoSite/api/contact.ts:151) accepts contact and optional offer context; [delivery](/Users/matthewwallace/Repos/WallaceShiftLogoSite/api/contact.ts:180) emails one configured inbox with the visitor as reply address. | No lead record is saved by this route. No customer acknowledgment, scheduled sequence or reply detection occurs here. Each client still needs its own destination, sender configuration and delivery check. | Working inquiry capture and routing belongs in the website scope. Do not portray the inquiry as automatically entered into a bundled CRM. |
| Open questions before buying | [Offer contact tests](/Users/matthewwallace/Repos/WallaceShiftLogoSite/scripts/test-offer-contact.mjs:58) exercise questions, future plans and shared decisions. Optional context does not block valid inquiries. | Email receipt does not establish that a salesperson responded or a sale resulted. | Preserve an open question route, optional qualification and clear delivery errors. |
| Business reporting | [Owner guard and snapshot](/Users/matthewwallace/Repos/WallaceShiftLogoSite/api/_lib/business-dashboard-handler.ts:94) aggregate portal, mail and provider reports. The briefing is deterministic; autonomous actions are disabled. | Customer and purchase sessions receive 403. Mail is recent app sending history, not a lead inbox. Metrics do not provide a customer pipeline or campaign management. | Show only as a separately scoped systems example with an accurate label. Do not include customer access in the two offers. |
| Account connections | [Connection documentation](/Users/matthewwallace/Repos/WallaceShiftLogoSite/docs/business-dashboard.md:23) specifies server environment variables; [provider scope](/Users/matthewwallace/Repos/WallaceShiftLogoSite/docs/business-dashboard.md:49) is one configured account per provider. | There is no browser OAuth onboarding, customer account discovery or general token renewal service. Publishing is separately owner operated and fixed to the Wallace Shift LinkedIn Page. | Documentation can explain prerequisites. It cannot turn the current operator configuration into customer self service. |
| Tenant separation | [Owner identity](/Users/matthewwallace/Repos/WallaceShiftLogoSite/api/_lib/portal-auth.ts:21) uses one configured owner. [Ledger storage](/Users/matthewwallace/Repos/WallaceShiftLogoSite/api/_lib/portal-store.ts:5) separates production from other environments; the engagement ledger is shared within that environment. | Environment separation is not a tenant reporting architecture. Client billing filtering must not be bypassed to grant dashboard access. | Reusing the dashboard for another business would require a separately isolated deployment and configuration, or new tenancy work. Neither has been rehearsed here. |
| Stored AI applications | [Opportunity handler](/Users/matthewwallace/Repos/WallaceShiftLogoSite/api/_lib/ai-opportunity-handler.ts:21) provides owner review and stores applications only when the offer flag is enabled. [Record model](/Users/matthewwallace/Repos/WallaceShiftLogoSite/api/_lib/ai-opportunity-store.ts:10) includes routing and notification state. | Separate from the two contractor offers' contact route. It is an application review queue, not evidence of a customer CRM, sales stages or follow up sequence. Enablement and live data were not checked. | No inclusion or new marketing claim. |
| Roofing CRM and inquiry demos | [Fixture adapter](/Users/matthewwallace/Repos/WallaceShiftLogoSite/src/roofing-dashboard/adapters/fixtureDataSource.ts:69) holds sample state in memory. [Roofer inquiry adapter](/Users/matthewwallace/Repos/WallaceShiftLogoSite/src/demos/roofers/leadAdapter.ts:6) explicitly has no live destination. | Demonstrated customer records and worklists are not a provisioned production CRM. Sample inquiry submission sends nothing. | Retain useful demonstrations, clearly labeled as fictional examples and separately scoped capabilities. |

## Package boundary

**$250/month website:** agreed website, hosting, maintenance, basic SEO and inquiry destination, plus the administrative portal for its Wallace Shift agreement and invoices. The current [offer source](/Users/matthewwallace/Repos/WallaceShiftLogoSite/src/content/contractorOffers.ts:21) defines basic SEO as titles, descriptions, headings and indexable service information. Page scope, update limits, term, ownership, cancellation and domain or other paid service costs still require explicit agreement. Neither broader SEO work nor CRM or reporting access should be implied.

**$1,500 once lead page and follow up:** one lead page and one configured workflow in an agreed compatible tool, testing and handoff, plus the same administrative portal. [Existing terms](/Users/matthewwallace/Repos/WallaceShiftLogoSite/src/content/contractorOffers.ts:54) separate hosting, software subscriptions, email or SMS usage, advertising and ongoing management. The reusable contact form alone does not fulfill the complete follow up promise. Fulfillment must include a verified acknowledgment, timing, handoff and stop condition in the chosen customer's tool before delivery is accepted.

**Custom systems:** current reporting software and illustrative CRM demonstrations can support a scope conversation. They do not justify a standard included software bundle yet.

## Setup and operating costs

Reusable assets include UI components, report adapters, access and billing patterns, and documentation. Repeated work includes establishing the client's owner access, isolated storage and hosting, choosing account properties, obtaining authorized credentials, configuring a sender and destination, validating data, confirming empty versus failed reports, documenting revocation, and training the owner.

Likely ongoing work includes expiring tokens, lost provider access, changing API versions and metrics, storage backups, email failures, reporting questions, and explaining attribution differences. The code does not establish a per customer cost or support workload. Existing website hosting allowances cannot be assumed to cover a separate reporting application, mail account, Redis store or third party follow up platform.

Do not publish a fixed optional setup fee yet. Quote a named account list and scope using estimated setup and verification time, direct fees and a defined support allowance. Separate this initial service from recurring platform costs, later connection repair and campaign management. Before standardizing a fee, time one isolated client rehearsal and record the hours, infrastructure cost and support interventions.

## Clean rehearsal and verification

The existing automated API fixtures were inspected and run with temporary storage and mocked provider, mail and payment requests. No real emails, charges or account connections occurred. Browser scripts were not run in this audit.

| Check | Result | What it establishes |
| --- | --- | --- |
| `npm run test:dashboard` | Passed: 13 core and 17 channel tests | Customer and purchase tokens cannot become dashboard owners; missing configuration stays unavailable; provider failures and metrics are handled under fixtures. |
| `npm run test:portal` | Passed: 56 tests | Client isolation, scoped invoice invitation, signature requirements, billing state and production versus sandbox namespaces work under mocked services. |
| `node scripts/test-offer-contact.mjs` | Passed: 6 tests | Both offer inquiries accept information seekers, preserve correct offer context and handle missing or failed delivery honestly. |

The portal rehearsal issued an agreement into a fake mail transport, opened its scoped invitation, read only the invited engagement, required signature before payment setup, and denied access to another engagement. An unrelated client could not list or sign the first client's record. See [isolation fixture](/Users/matthewwallace/Repos/WallaceShiftLogoSite/scripts/test-client-portal.mjs:230) and [invitation fixture](/Users/matthewwallace/Repos/WallaceShiftLogoSite/scripts/test-client-portal.mjs:616).

The corresponding dashboard customer session correctly fails with 403. This is successful protection of the existing owner workspace and evidence that customer dashboard onboarding is not currently provided.

Unverified: production deployment parity, actual email receipt, customer account onboarding usability, live provider permissions and approval, token renewal behavior over time, one isolated customer's operating cost, and the $1,500 workflow running in a real compatible tool. No claim of increased conversion or sales follows from these checks.

## Evidence that would change the recommendation

Include reporting only after a fresh customer can receive an isolated workspace, connect the specifically supported accounts through an agreed process, see only their data, recover from token expiry and leave with an agreed data export and ownership policy. Verify those steps and record setup and support costs. Include CRM only after persistent customer records, inquiry capture, a usable work or sales process, communications and follow up behavior exist for that customer and have their own acceptance checks. More attractive screens alone would not change the recommendation.

Proposed commit message: `Refine examples first homepage and document package readiness`
