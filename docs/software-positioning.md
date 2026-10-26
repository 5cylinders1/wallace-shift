# Software positioning: implementation and evidence

Wallace Shift now leads with custom CRMs, practical AI integrations and connected business workflows. Websites remain a supporting service and a possible customer entry point into those workflows. The intended buyer is an owner whose team loses track of follow-up, repeats administrative work or lacks a shared view of operations.

That buyer description comes from the business brief. No raw customer inquiries, interview transcripts or sales-call records were supplied or found in the task-relevant repository sources reviewed. These needs are positioning assumptions, not observed market findings. Existing marketing copy establishes what has been offered; it does not independently establish demand, delivery history or results.

## Editorial decisions

- Explain the work through customer records, responsibilities, next actions, handoffs and owner visibility before introducing technical terms.
- Distinguish predictable automation from AI tasks that need suitable inputs and review criteria.
- Describe discovery, agreed scope, implementation and ongoing support as a connected process. Distinguish maintenance and minor adjustments from new development.
- Order services and pricing as Systems, AI & automation, then Websites. Preserve route and section identifiers, form contracts, visual identity and existing commercial terms.
- Keep fictional contractor brands, sample data and unsent demo requests clearly identified. Remove unsupported popularity claims rather than turn demonstrations into client proof.
- Link the systems and AI service descriptions to the existing, labeled roofing examples. The quiz now offers systems, AI, automation and website starting points while retaining older shared recommendation links.
- Use a normal link for the quiz-to-contact handoff. Browser review found the previous single-page transition could retain the homepage's deep scroll offset; regular document navigation keeps the recommendation and opens the contact page at the top.

## Evidence and claim boundaries

| Workflow or offer | Repository evidence | Status | What the copy can support |
| --- | --- | --- | --- |
| Collect an inquiry and pass its context to the business | [Contact adapter](../src/lib/contactAdapter.ts), [contact endpoint](../api/contact.ts), [intake wording](../src/content/enquiry.ts) | Locally implemented code; external delivery not verified by this copy task | An implemented intake and server-side email pattern. It does not establish a connected client CRM or prove production email delivery. |
| Review properties, record follow-up and schedule a sample inspection | [Dashboard bootstrap](../src/roofing-dashboard/demo/main.tsx), [fixture adapter](../src/roofing-dashboard/adapters/fixtureDataSource.ts), [dashboard boundaries](demos/roofing-dashboard.md) | Interactive fixture demo | Demonstrates an operational interface and next-action workflow. Records are fictional and in memory; live customer data, messages, external booking and production authentication are separate work. |
| Create an illustrative roof-finish preview from a supplied photo | [Halcyon visualizer](../src/demos/roofers-4/Visualizer.tsx), [render endpoint](../api/roof-render.ts), [provider adapter](../api/_lib/roof-render/provider.ts), [demo documentation](demos/roofers-4.md) | Locally implemented AI integration within a fictional demo; paid provider operation not verified by this copy task | A specific example of AI doing a defined visual task after user action and consent. Generated imagery is illustrative, not a completed customer project or a guarantee about a finished roof. |
| Recover missed follow-up, connect job handoffs, prepare owner updates | [Roofing workflow catalogue](../src/demos/roofers-offer/automationMenu.ts), [offer scope](../src/demos/roofers-offer/RoofersOffer.tsx) | Proposed/scoped service examples | Concrete problems and possible workflows to discuss. The catalogue is not evidence that all integrations are installed, included at one price or running for clients. |
| Build a tailored system and support its evolution | [Services](../src/content/servicesPage.ts), [approach](../src/content/approachPage.ts), [pricing](../src/content/pricing.ts) | Stated service and commercial scope | Discovery, a focused build, maintenance and reserved development capacity. These sources establish the offer, not customer outcomes, savings or a delivery track record. |
| Hand a website request to a wider system | [Roofing lead adapter](../src/demos/roofers/leadAdapter.ts), [Halcyon documentation](demos/roofers-4.md) | Demo/integration boundary | Shows how a request can be structured. The roofing demo endpoint is unset; Halcyon's consultation preview is unsent and its Ledger portal is a static concept. Do not claim live CRM delivery or a built portal from these examples. |

## Commercial decisions retained for the owner

Existing prices, terms, credits and scope exclusions remain in place. The $18,000 starting price is for a focused build around one primary workflow, not a universal fixed quote for a custom CRM. Broader CRM and AI requirements need an agreed scope and price.

The roofing offer is a separate, limited offer: a free Motion website build with purchase of a roofing CRM plan. The paid plan covers CRM setup and managed automation, starting at $750 per month for 12 months within the agreed scope. Its $9,000 minimum commitment does not define the price of every custom system. The website is the free part of this offer; the CRM plan is purchased.

Managed automation covers monitoring, maintenance, failure recovery and minor adjustments; new workflows and substantial changes remain separate. Ongoing development reserves capacity for agreed feature work. Confirm the desired prominence of the existing website packages and fast initial-preview timelines as the business develops; no replacement pricing or delivery guarantees were invented.

The existing internal flag that package-detail copy awaits commercial approval is retained in `pricing.ts`. This editorial pass does not approve new commercial terms.

## Buyer comprehension test — not performed

No participants were contacted. Run a small qualitative review with five business owners or operational decision-makers who have not helped write the site. Include people dealing with the processes in the brief. This checks comprehension and confusion, not statistical market demand.

Give each person the same brief homepage exposure, then let them explore services, pricing and contact without coaching. Do not describe Wallace Shift's intended offer or suggest service names first. Ask:

1. In your own words, what does this business mainly do?
2. What situation would make someone look for this business? Does any part relate to how your business works?
3. What, if anything, would make you consider them? What would you still need to know?
4. Show where you would go next, and explain what you expect to happen there.
5. What would be included after launch, and what would need another agreement? What do the examples establish about past customer work?

Record verbatim answers, the page each person used, their first action and any misunderstanding before explaining anything. A provisional pass is at least four of five independently identifying tailored business systems as the main offer and finding a suitable next step. Any belief that the fictional demos prove client results, that every integration is included at the published floor, or that maintenance includes unlimited new development requires revision and another review. Do not report this criterion as met until the sessions occur.

## Later inquiry-fit signals

After a separately authorized release, manually review the existing inquiry fields and messages for a stated operational problem, current tools, multiple people or handoffs, need for visibility, interest in tailored systems, and ongoing improvement needs. Record counts and denominators, including unclear and website-only inquiries, rather than selecting favorable examples. These are fit signals, not automatic grounds to exclude a prospect.

Compare consistent review periods while noting traffic source, campaigns, seasonality and sample size. More suitable inquiries would be useful evidence to investigate; this copy change alone would not establish causality, conversion uplift or revenue gains. No analytics instrumentation or outreach was added for this task.

## QA

Completed locally on October 24, 2026:

- `npm run build` passed, including the demo build boundary check for 19 documents and 29 private JavaScript bundles. Existing large-chunk warnings remain.
- `npm run lint` passed with no errors and four warnings in unchanged files (`PitStopScene.tsx` and dashboard `ui.tsx`).
- 56 existing checks passed across enquiry fields, hero form state, homepage journey, pricing stack, About studio, homepage hero and brand handoff. The homepage render check now expects the revised copy.
- A one-off check covered all 64 quiz answer combinations, the five current/legacy recommendation links, and unknown-link fallback. Browser checks confirmed the new AI recommendation prefill and the final CRM link's contact-page prefill with `scrollY: 0`. No enquiry was submitted.
- Generated title, description, Open Graph and Twitter copy matched source metadata in all ten main route documents. Client-side Services navigation also updated its Twitter title. No canonical or indexing policy changed.
- Browser review covered the homepage, services, pricing, approach, About, contact, roofing offer, contractor collection and demo request. Desktop checks used 1440px; mobile review used 390px, with narrower 320px checks for pricing and roofing, 360px for access, and 360/768/1024px checks for Services. Observed pages had no horizontal document overflow. Pricing's three panels and incoming systems link worked; the CRM example link also worked by keyboard.
- Reordered service-panel stacking was corrected so the final website panel stays above the earlier panels on mobile. Static/reduced-motion headline and diagram copy were reviewed, and existing static/hero checks passed. Native Chrome control was not approved by the computer-use tool, so browser emulation of reduced motion could not be verified.
- React component review and `git diff --check` passed. No dependencies, server contracts, credentials, or production configuration changed. No commit, deployment, real email, paid AI request, or customer test was performed.

Local review screenshots are in the ignored `review-assets/software-positioning/` directory. They establish the observed rendering only, not buyer comprehension or live-service behavior.

Suggested commit message: `refactor: position Wallace Shift around custom CRMs, AI, and automation`
