# CRM draft quality review

Reviewed October 25, 2026, America/Chicago; web checks occurred October 26 UTC. Four standalone Markdown essays are complete. They have no blog frontmatter, publication dates, image promises, or download links. No application or published-content files were changed for these drafts.

## Files and checks

| Draft | Whitespace word count | Review result |
| --- | --- | --- |
| `crm-requirements-template-service-business.md` | 1,719 | Direct answer, record/role/workflow requirements, fictional completed brief, copyable worksheet, four FAQs |
| `custom-crm-vs-off-the-shelf.md` | 1,793 | Four implementation routes, six tasks, fictional option comparison and completed decision, evidence ledger, four FAQs |
| `spreadsheet-vs-crm-service-business.md` | 1,767 | Keep/improve/migrate decision, five tasks, fictional tracker and findings, switching worksheet, four FAQs |
| `crm-implementation-cost-service-business.md` | 1,751 | Scope-based budgeting, two fictional alternatives, independently checked calculations, cost worksheet, four FAQs |

All current-blog link destinations were checked against existing post files. No link points to a planned unpublished article. The four articles use `/services#web-apps`, `/pricing#web-apps`, or `/contact` as appropriate; no free audit, fixed CRM price, guaranteed result, or completed client implementation is claimed.

Shared fictional records are consistent: Cedar Lane Maintenance; Alder Studio C-014; L-01 Main studio and L-02 Workshop; billing contact Morgan Hale; coordinator Avery; field lead Jordan. Where used, J-101 is scheduled at L-01 and J-102 awaits a customer decision at L-02. The requirements article also describes a later reassignment after scope agreement. No real addresses, phone numbers, or other customer information appear.

## Primary sources actually read

Each source is cited beside its limited product-specific claim. No quotations were used; most article content is original analysis, examples, and planning guidance. Approximate derived wording per source across all four articles stays below 100 words.

- [Salesforce: Object Relationships Overview](https://help.salesforce.com/s/articleView?id=overview_of_custom_object_relationships.htm&language=en_US&type=5). Requirements article, approximately 40–55 words: relationship choices affect deletion, sharing, and required fields. No Salesforce implementation was tested or recommended.
- [Microsoft: Collaborate on Excel workbooks with co-authoring](https://support.microsoft.com/en-gb/excel/get-started/collaborate-on-excel-workbooks-at-the-same-time-with-co-authoring). Spreadsheet article, approximately 50–70 words: supported co-authoring arrangements provide simultaneous editing and version history, with version/storage requirements. No universal claim about spreadsheet security.
- [HubSpot: Export your records](https://knowledge.hubspot.com/import-and-export/export-records). Comparison article, approximately 55–75 words: record exports and activity-export paths differ. No claim that the proposed fictional fit exercise was performed in HubSpot.
- [HubSpot: Sales Hub pricing](https://www.hubspot.com/pricing/sales). Cost article, approximately 45–65 words: seat prices, certain required onboarding charges, and credit-based usage are distinct components. No actual HubSpot dollar figures are reproduced, and these are not the inputs to the fictional budget.

## Independently checked illustrative calculations

All values below are hypothetical USD. The four-user licensing assumption, supplier categories, reserves, and staff-time values are teaching inputs rather than quotes or recommended budgets.

| Calculation | Scope A | Scope B |
| --- | --- | --- |
| One-time inputs | 900 + 2,100 + 600 + 750 + 450 + 300 | 1,500 + 4,200 + 1,800 + 2,400 + 600 + 900 |
| One-time total | 5,100 | 11,400 |
| Monthly inputs | (4 × 35) + 30 + 100 | (4 × 35) + 60 + 200 |
| Monthly total | 270 | 400 |
| Twelve-month recurrence | 3,240 | 4,800 |
| First-year cash, before reserve | 8,340 | 16,200 |
| Illustrative 10% reserve on one-time work | 510 | 1,140 |
| First-year cash planning envelope | 8,850 | 17,340 |
| Separate internal-time estimate | 32 × 40 = 1,280 | 64 × 40 = 2,560 |
| Three-year baseline, excluding reserve/internal time | 5,100 + (270 × 36) = 14,820 | 11,400 + (400 × 36) = 25,800 |

Python integer and Decimal calculations independently confirmed the arithmetic. Recurring charges apply for all months shown; one-time work is not repeated. Taxes, renewal increases, new work, extra usage, reserves, and internal staff time are excluded from the three-year baseline. The article distinguishes staff capacity from additional cash spending and does not present a savings or ROI claim.

## Publication handoff

No unresolved factual or arithmetic defect was identified in this review. These are reader-ready draft essays, not deployed blog posts. At later conversion, assign actual metadata and publication dates, retain the fictional-example labels, and check that any added companion-resource link resolves. Product statements and offer links should receive the usual currency check if publication is delayed. None of these articles needs an unperformed product test to support its current wording; all comparative outcomes are expressly fictional.

Suggested commit message: `docs: draft CRM requirements selection readiness and cost guides`
