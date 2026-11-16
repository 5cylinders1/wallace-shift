# Refined Examples first homepage

One isolated local homepage preview. Existing production routes, the animated homepage and the earlier three concepts are unchanged. No commit, deployment or real customer connection was made.

## Open

[Interactive preview](http://127.0.0.1:5184/prototypes/homepage/refined/index.html)

The existing Vite server on port 5184 was reused. If it is stopped, run from the repository root:

```sh
npm run dev -- --host 127.0.0.1 --port 5184
```

This nested HTML entry is not registered in the production build. It has `noindex,nofollow` and no analytics script. It imports the existing brand styles and earlier mockup base styles, and reuses the existing local demo images, narrated videos, captions and showcase poster.

## Deliverables

* [Recommendation, evidence summary and measurement plan](./PLAN.md)
* [Implementation capability audit and mocked onboarding rehearsal](./CAPABILITIES.md)
* [Reporting connection requirements and setup boundaries](./CONNECTIONS.md)
* [Published competitor scope and terms](./COMPETITORS.md)
* [Desktop opening](./review/desktop-opening.png), [desktop page](./review/desktop-full.png)
* [Mobile opening](./review/mobile-opening.png), [mobile page](./review/mobile-full.png)

## Verification on November 15, 2026

| Check | Result and limit |
| --- | --- |
| Targeted TypeScript check | Passed for the isolated entry with Vite client types. |
| Layout detector | No findings for the two new UI source files. This is not a conversion judgment. |
| Desktop | Reviewed at 1280 × 900, including opening, journey, pricing, process, questions and optional showcase. |
| Mobile and tablet | Reviewed at 390 × 844, 375 × 812 and 768 × 1024. No horizontal document overflow at those sizes. Both opening prices and question route visible before the demo on narrow mobile. |
| Media | Example selection changes the preview. The roofing video loaded, reported ready state 4, had a 62.625 second duration, one caption track and no video error. It loads only when chosen. |
| Interaction | Journey steps, customer reply and reset, portal tabs, scope disclosures, FAQ and mobile navigation exercised. The question route requires no package selection. |
| Keyboard | Progress buttons retain focus on the selected journey tab. Home and arrow navigation select the expected tabs. Panels are keyboard focusable and reply status uses a polite live region. |
| Offer relationship | Both package CTAs opened the existing local offer pages. Both retain the option to ask questions. No inquiry was submitted. |
| Capability fixtures | 30 dashboard tests, 56 portal tests and 6 offer contact tests passed. All provider, mail and payment calls were mocked. See the capability report for scope. |
| Independent review | Corrected hidden additional costs and journey focus loss. Follow up review found no remaining material issue in that scope. |

These are browser emulations and local fixtures, not physical device, production or live provider verification. Full account onboarding cannot be rehearsed because there is no customer connection flow. The existing mocked portal rehearsal validates access isolation, invitations and billing conditions; it does not validate real mail receipt or customer reporting readiness.

The preview demonstrates a proposed follow up service in compatible tools. It does not implement or activate that workflow. The current agreement and invoice portal is distinct from software managing the buyer's own customers.

Acceptance remains conditional on resolving actual page limits, ownership, commitment, cancellation and third party operating costs before purchase. No sales lift, acquisition efficiency or delivery margin is established by this walkthrough.

Proposed commit message: `Refine examples first homepage around verified offers and capabilities`
