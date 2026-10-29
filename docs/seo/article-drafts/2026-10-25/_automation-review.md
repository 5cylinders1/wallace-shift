# Automation article review

Drafting and review completed October 25, 2026, America/Chicago (source checks continued October 26 UTC).

## Files and verification

| Article | Words | Review result |
| --- | ---: | --- |
| `connect-website-form-to-crm.md` | 1,621 | Direct answer; field map; six acceptance cases; fictional handoff; reconciliation worksheet; four FAQs |
| `automation-audit-scope-deliverables-cost.md` | 1,719 | Scope and cost explanation; fictional finding; calculation labels; acceptance worksheet; four FAQs |
| `automation-failure-recovery-checklist.md` | 1,640 | Completed versus uncertain actions; fictional timeout; recovery and incident worksheets; four FAQs |
| `ai-vs-rules-based-automation-inquiries.md` | 1,793 | Rules baseline; twelve synthetic cases E01–E12; worked E02 decision; blank observed-result worksheet; four FAQs |

Counts include titles, tables, and visible link labels, and exclude Markdown URL targets. Checked one H1 per article, no frontmatter, no raw HTML, consistent table columns, required word range, and internal links limited to existing destinations. No links to the other unpublished drafts or nonexistent downloads appear.

Reviewed the commissioning plan, automation research memo, existing article coverage, and current service/pricing source. The drafts were written as prose for readers, not as commissioning outlines. No application code, existing blog files, public assets, external accounts, or production settings were changed. No paid model or integration test was run. No commit was created.

## Shared fictional records

Cedar Lane Maintenance is the service business. Alder Studio is customer C-014; L-01 is Main studio and L-02 is Workshop. Morgan Hale is Alder Studio's billing contact; Avery is the coordinator; Jordan is the field lead. The drafts do not assign different meanings to the parent workbook's P-021, U-01, U-02, J-101, or J-102 identifiers; those identifiers are not needed in these four articles.

F-102 is the shared form event and I-102 is its resulting inquiry in the form and recovery examples. The AI examples E02 and E03 also use F-102. E11 concerns I-102 after a cancellation request. AI cases are independent unless the row explicitly references another event. Expected outcomes are policy/design examples, not observations from a model run.

The recovery example intentionally contains a successful CRM write whose confirmation timed out, followed by a task step that never ran. Its remedy preserves the successful record. The form article distinguishes repeated event delivery from a genuine new request by an existing customer.

The audit's 24 requests × 3 minutes = 72 minutes weekly is an explicitly fictional staff estimate. It is neither a measured saving nor a cash benefit. The sample allows configuration of an existing tool to win and does not assume the capability belongs to a named product.

## Primary sources opened and inspected in this drafting pass

Citation-paragraph counts below are conservative: they charge the whole paragraph, including the writer's surrounding advice, to its linked source. No verbatim passages were copied. These totals are for these four drafts; the parent editor can combine them with the other eight if a source is shared.

| Primary source | Specific factual use | Citation-paragraph words |
| --- | --- | ---: |
| [HubSpot: automate form submission actions](https://knowledge.hubspot.com/forms/form-automations) | Repeat enrollment and subscription-dependent actions | 37 |
| [Zapier: duplicate data](https://help.zapier.com/hc/en-us/articles/8496218141453-Zap-is-creating-duplicate-data) | Timeout/replay can lead to duplicates | 34 |
| [Zapier: replay](https://help.zapier.com/hc/en-us/articles/19220226086797-What-is-replay) | Errored-step versus whole-run replay | 34 |
| [Make: incomplete executions](https://help.make.com/incomplete-executions) | Default retention setting and supported recovery routes | 39 |
| [Make: error handling](https://help.make.com/Overview-of-error-handling) | Skip can produce a success status without completing that item's intended work | 44 |
| [Anthropic: building effective agents](https://www.anthropic.com/research/building-effective-agents) | Architectural distinction and simplest suitable approach | 45 |

Anthropic's page flags that its tooling discussion has changed since original publication. The article uses only the architectural distinction; it makes no current product comparison or model-performance claim.

Service assertions were checked against `src/content/servicesPage.ts` and the automation section of `src/content/pricing.ts`. The audit is paid. Builds, managed automation, and separately scoped AI work retain their boundaries. No prices, timing promises, credits, or market averages were inserted in the drafts.

## Internal links and remaining practical follow-up

The four articles link only to the existing tools, automation-starting, inquiry-diagnosis, and onboarding articles, plus services, pricing, and contact. These destinations match the published repository inventory and the main research plan's live links. A fresh web-reader request returned the service/pricing titles but no extractable body, and could not retrieve the four blog pages. That is a tool-access limitation, not evidence that the URLs are broken. Verify HTTP responses and anchors during the later production conversion alongside the normal renderer review.

The expected outcomes and fictional scenarios are complete as writing. A working connector demonstration or a real AI evaluation would be additional evidence, not something already performed. If such evidence is added later, record the actual account/plan or model/configuration, exact inputs, observations, and date. Keep observed-result fields blank until then. No model-access request is needed to use the current task-design exercise.

When the parent creates the companion workbook, copy the current E01–E12 rows and F-102/I-102 references exactly. Confirm formulas and record relationships there independently. The articles intentionally do not advertise that workbook until a real resource and publication route exist.

Later blog conversion can add actual author metadata, publication timestamps, and resource links. Recheck changing vendor behavior if publication occurs materially later. No further approval gate is introduced by these notes.

Suggested commit message: `docs(seo): draft CRM intake, audit, recovery, and AI workflow guides`
