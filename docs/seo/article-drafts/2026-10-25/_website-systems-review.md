# Website and systems draft review

Prepared October 25, 2026, America/Chicago; primary-source checks completed October 26 UTC. These are complete reader-facing Markdown drafts for later publication work. No frontmatter, images, downloads, product-account changes, live demonstrations, or publication actions are included.

## Files and checks

| Draft | Words | Scope |
| --- | ---: | --- |
| `contact-form-not-sending-email.md` | 1,696 | Trace missing notification delivery; distinguish capture, sending, delivery, and ownership |
| `crm-migration-checklist-service-business.md` | 1,690 | Plan and reconcile migration of records, relationships, owners, and open work |
| `track-website-inquiries-qualified-leads.md` | 1,706 | Define and reconcile actions, received records, inquiry identity, and qualification |
| `client-portal-vs-crm-service-business.md` | 1,760 | Decide which customer and internal tasks belong in an existing product, connection, or focused build |

Each has one H1, four FAQs, an explicitly fictional worked example, an on-page copyable resource, citations beside product-specific claims, existing Wallace Shift links, and one closing commercial CTA. Word counts use whitespace-separated tokens, including tables and links. All linked existing article slugs have matching published source files locally. No proposed sibling URL is linked, and no unbuilt download is advertised.

## Primary sources checked

The approximate budgets below describe source-derived explanation in the four drafts, not each article's original procedure or invented example. They are deliberately short; there are no direct quotations. Source-note descriptions here are also brief so the combined derived text remains below about 100 words per source for this batch.

| Source actually opened | Claim used and approximate derived words in drafts |
| --- | --- |
| [Google Workspace contact-form troubleshooting](https://knowledge.workspace.google.com/admin/support/troubleshooting/troubleshoot-gmail-not-getting-contact-form-messages) | Provider-dependent sending authentication and related investigation; about 40 words |
| [HubSpot import-file requirements](https://knowledge.hubspot.com/import-and-export/set-up-your-import-file) | Identifiers, updating, and record associations; about 50 words |
| [Pipedrive spreadsheet imports](https://support.pipedrive.com/en/article/importing-data-into-pipedrive-with-spreadsheets) | Mapping, preview, results, skipped records, product-specific recovery; about 45 words |
| [Zoho duplicate management](https://help.zoho.com/portal/en/kb/crm/manage-crm-data/duplication-management/articles/auto-merge-duplicates) | Matching and conflict handling as a separate operation; about 30 words |
| [GA4 enhanced measurement](https://support.google.com/analytics/answer/9216061?hl=en) | `form_start`/`form_submit`; about 45 words |
| [GA4 recommended events](https://support.google.com/analytics/answer/9267735?hl=en) | Lead-event terminology and implementation requirement; about 45 words |
| [Google Analytics PII guidance](https://support.google.com/analytics/answer/6366371?hl=en) | Product prohibition and URL/title exposure; about 45 words |
| [Jobber client hub](https://www.getjobber.com/features/client-hub/) | Existing product example of customer access; about 50 words |
| [OWASP authorization guidance](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html) | Least privilege, checks per request, browser-control limitation; about 50 words |

Current-source correction: the retrieved Zoho page did not retain the earlier research memo's explicit “cannot be undone” statement. That claim was not repeated. The migration draft asks readers to verify recovery for the exact operation instead. Pipedrive's specific recovery window was reviewed but not generalized or quoted in the draft.

## Shared fictional records

Business: Cedar Lane Maintenance. Client: Alder Studio. These names and all outcomes are synthetic and do not represent customers, personal testing, or observed performance.

| Identifier | Relationship |
| --- | --- |
| `C-014` | Alder Studio, billing contact `P-021` |
| `L-01` | Main studio, belongs to `C-014` |
| `L-02` | Workshop, belongs to `C-014` |
| `P-021` | Morgan Hale, billing contact for `C-014` |
| `U-01` | Avery, coordinator |
| `U-02` | Jordan, field lead |
| `J-101` | `C-014` / `L-01`; Scheduled; coordinator `U-01`, field lead `U-02` |
| `J-102` | `C-014` / `L-02`; Awaiting customer decision; coordinator `U-01`, field lead `U-02` |
| `A-301` | Open site-visit task for `J-101`, owned by `U-02` |
| `A-302` | Open revised-quote review for `J-102`, owned by `U-01` |

The migration example therefore has **eight business records**: 1 client + 2 locations + 1 contact + 2 jobs + 2 activities. The 2 staff identities are separate mappings. Deliberate exceptions are described as an additional test set, not included in these eight records.

Portal rule: Morgan can retrieve permitted invoices and agreed appointment information for both Alder Studio locations. Billing status alone does not grant quote-approval authority. This is explicitly a chosen fictional rule. The portal worksheet describes expected behavior, not a verified application or security result.

## Measurement arithmetic and definitions

The invented reporting week contains 50 browser form events and 44 saved **submission-delivery records**. Those 44 are not 44 unique underlying submissions: four are repeated deliveries associated with already counted inquiry identifiers.

- 44 delivery records − 4 repeat deliveries = 40 distinct inquiries.
- 25 qualified + 10 unsuitable + 5 pending = 40 distinct inquiries.
- Qualified share at that point: 25 ÷ 40 = 62.5%.
- The difference between 50 browser events and 44 saved records is 6 events; its cause remains unknown. It is not described as six lost inquiries.
- No visitor denominator is supplied, so the example does not calculate website conversion rate.
- A known contact making a new request remains a possible new inquiry; contact identity is not inquiry identity.

## Publication handoff

The articles can be converted into blog pages without access to any paid product account. They present procedures and explicitly fictional examples, not claimed demonstrations. A future real implementation example must document its actual configuration, test evidence, and limits before replacing that wording.

Add publication metadata and any companion workbook links only when the files and routes exist. Keep the on-page tables available. If the companion workbook uses a different fictional stage or identifier, update it or the relevant passage deliberately rather than silently mixing examples.

No current product prices, claimed time savings, client results, conversion benchmarks, or generalized compliance promises appear. The CTA scope remains website repair discussion, separately scoped system/migration work, reporting/handoff discussion, or system definition. Existing built-in portals remain valid options.

Suggested commit message: `docs(blog): draft delivery, migration, measurement, and portal guides`
