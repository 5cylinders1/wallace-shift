# FAS task estimate

Prepared October 26, 2026 for the bounded scope in `proposal.md`. These are professional planning judgments before code access, not recorded time, audited costs, or a statistical forecast. Effort was estimated from tasks without making the hours equal the buyer's budget divided by a rate.

## Task assumptions

| Task | Low hours | Base hours | High hours | Basis |
| --- | ---: | ---: | ---: | --- |
| Discovery and technical review | 8 | 14 | 22 | Access and handoff, theme and plugins, staff workflow, three sister-site source and deployment paths. |
| Implementation plan and layouts | 8 | 12 | 18 | Component sketches, pilot structure, implementation choices, acceptance examples and schedule. |
| A Four media components | 20 | 28 | 42 | Reuse WordPress image/video capabilities; custom carousel behavior and accessible data/embed alternatives; implementation smoke checks. |
| B Social module | 8 | 14 | 24 | Shared fields, defaults and overrides; three template integrations; deferred loading and provider fallbacks; manual publishing, no feed API. |
| C Program layouts and pilot | 24 | 36 | 54 | Two layouts and local navigation 16h; five-page pilot 5h; two design revision rounds 4h; sister-site navigation patches 8h; editor replication check 3h. |
| D Footer redirects and tags | 6 | 10 | 16 | Existing redirect tooling; theme fields and publication template changes; permissions. |
| Meetings and coordination | 12 | 17 | 23 | Twelve half-hour meetings 6h; preparation and notes 6h; decision and tracker management 5h. |
| Integrated QA and retesting | 12 | 20 | 30 | Representative templates; accessibility, browsers, mobile, performance comparisons, fixes and retests. Separate from implementation smoke checks. |
| Documentation training and releases | 10 | 15 | 22 | Editor and technical instructions 7h; training preparation and session 3.5h; releases and handoff 4.5h. |
| Delivery subtotal | 108 | 166 | 251 | |
| Warranty allowance | 4 | 8 | 16 | Expected defect follow-up; not a limit on the 60-day warranty. |
| Total | 112 | 174 | 267 | |

The low case assumes favorable reuse and quick feedback. The high case combines complications across multiple workstreams. It is not a confidence interval and does not mean those outcomes are equally likely. Do not add a blanket contingency to the high case; it already incorporates implementation uncertainty. The buyer-facing fixed fee does not change with actual hours for the approved scope.

## Shared work allocation by deliverable

Shared work is allocated by anticipated use and complexity, rather than being added again to A–D. Each row reconciles to the task estimate. These are planning allocations, not separately tracked historical hours.

| Task | A | B | C | D | Total |
| --- | ---: | ---: | ---: | ---: | ---: |
| Discovery | 4 | 3 | 5 | 2 | 14 |
| Plan | 4 | 2 | 5 | 1 | 12 |
| Direct implementation | 28 | 14 | 36 | 10 | 88 |
| Coordination | 5 | 3 | 6 | 3 | 17 |
| Integrated QA | 7 | 4 | 6 | 3 | 20 |
| Documentation training and releases | 4 | 2 | 6 | 3 | 15 |
| Warranty allowance | 3 | 1 | 3 | 1 | 8 |
| Total | 55 | 29 | 67 | 23 | 174 |

## Phase reconciliation

| Phase | Calculation | Hours |
| --- | --- | ---: |
| Discovery | 14 technical review + 3 coordination | 17 |
| Plan | 12 planning + 2 coordination | 14 |
| Build testing and releases | 88 implementation + 20 QA + 10 coordination + 3 staged releases | 121 |
| Handoff and training | 12 remaining documentation/training/releases + 2 coordination | 14 |
| Warranty | 8 expected support hours after acceptance | 8 |
| Total | | 174 |

Delivery capacity is scheduled as December 10, January 21, February 32, March 36, April 34, and May 33 hours, totaling 166. December and January cover the 31 discovery/planning hours. February through May cover 121 build hours plus 14 handoff hours. Warranty support is allocated after final acceptance. Available capacity of 50 hours per month is not an included monthly hour package.

## Price and reduction

- Estimating reference: 174 hours at $100 = $17,400.
- Explicit fixed-fee reduction: $2,900, or 16.67%.
- Offered fixed fee: $14,500.
- Gross fee per planned hour: $14,500 / 174 = $83.33 before expenses.
- Illustrative return with $500 direct costs: $14,000 / 174 = $80.46/hour before overhead and taxes.
- At 210 actual hours, the same illustrative return falls to $66.67/hour. At the combined high case of 267 hours, it is $52.43/hour. These are sensitivity examples, not predicted outcomes.

Net fees are allocated proportionally across each schedule with whole-dollar rounding. Phase fees are $1,417, $1,167, $10,083, $1,167 and $666. Item fees are $4,583, $2,417, $5,583 and $1,917. Each schedule independently totals $14,500. The schedules describe the same fee and are not added together. Rounding differences are absorbed in the final allocation; they do not change hours.

Holding the price is a deliberate commercial concession, contingent on FAS accepting the reduced scope. The $100 estimating reference must not be described as the effective earnings rate or as 174 billable hours. Reassess implementation assumptions during discovery, and do not expand the four-site or microsite scope without an approved change.
