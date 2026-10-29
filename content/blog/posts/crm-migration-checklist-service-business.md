---
status: published
publishedAt: "2026-10-26T13:02:49Z"
slug: "crm-migration-checklist-service-business"
title: "CRM Migration Checklist: Keep Customer History and Open Work Intact"
description: "Plan a CRM migration around identifiers, relationships, owners, open tasks, and recovery decisions, with a fictional rehearsal and reconciliation checklist."
question: "How do I plan a CRM migration without losing customer context or open work?"
answer: "A CRM migration needs to preserve the relationships and open work that make the records useful. Define what will move, map identifiers and ownership, rehearse representative cases, and reconcile the result before the team depends on the new system. A successful file upload is one step in that process, not the acceptance test."
category: "Business systems"
author:
  type: "Organization"
  name: "Wallace Shift"
  url: "/about"
---

For a service business, finding a customer name is not enough. The team may also need the correct location, billing contact, current job, previous decision, responsible coordinator, and next action. If those connections disappear, the records can look complete while the work becomes harder to manage.

Use this checklist to plan and review a transition. It is a vendor-neutral planning exercise; the fictional records below are not a file certified for import into every CRM.

## 1. Define what must still work after the move

Start with the tasks the team performs today. Write down what a coordinator must find, what a field lead needs before a visit, and what an owner needs to review outstanding work.

Then identify the information supporting those tasks. Depending on the business, that may include customers, people, service locations, inquiries, jobs, activities, attachments, and historical messages. Do not require a complicated structure when a simpler one accurately represents the work.

For each information type, decide whether to migrate it, keep it in an accessible archive, exclude it with a reason, or investigate it further. Record who makes that decision. “We will move everything” leaves important questions about obsolete records, attachments, and unsupported fields unanswered.

If you are still deciding whether a new system is needed, our [website versus web-app guide](/blog/web-app-vs-website) explains how to compare buying, configuring, connecting, and building before committing to a larger project.

Use the [CRM requirements template](/blog/crm-requirements-template-service-business) to make those essential tasks and relationships explicit before deciding how the records should move.

## 2. Preserve a source snapshot and record the mapping

Keep an appropriate export or backup of the source before making changes. Record its extraction time and what it includes. An export of contacts alone is not a backup of job history, attachments, or configuration.

Build a field map containing the source field, destination field, format, required status, transformation, and exception rule. Keep the original value available when a transformation could remove useful meaning.

Pay particular attention to dates, time zones, multi-select values, owners, status names, and empty fields. “Closed” may describe a completed job in one system and a lost sales opportunity in another. Copying the word without checking its meaning can produce misleading reports.

Identify which system is authoritative during the transition. If both remain writable, define how changes will be recorded and reconciled. Two live copies without a clear rule create an additional migration problem every day.

## 3. Map identities before merging records

Give each relevant source record a stable identifier in your mapping. Preserve a way to connect it to its destination record. Names alone are a weak basis for deciding whether two rows represent the same person, customer, or job.

HubSpot's import guidance distinguishes identifiers used to update records from identifiers used to associate records. Its requirements vary by object and import arrangement. Use the current documentation for the particular import rather than assuming every CRM interprets matching names or emails the same way. [HubSpot import-file guidance](https://knowledge.hubspot.com/import-and-export/set-up-your-import-file).

Review uncertain duplicate candidates before merging. The same customer can have two service locations. The same person can make two legitimate inquiries. Similar company names can describe unrelated businesses.

Write the decision and evidence beside the candidate. If you cannot establish identity, keep the uncertainty visible instead of silently selecting a convenient match.

## 4. Rehearse with a small connected example

Consider Cedar Lane Maintenance, a fictional service business. Its client Alder Studio has two locations. Morgan Hale is the billing contact, Avery coordinates work, and Jordan is the field lead.

This rehearsal contains **eight business records** and **two staff identity mappings**. The labels are invented; they illustrate relationships rather than a particular CRM's object names.

| Record | Relationship and expected meaning |
| --- | --- |
| `C-014` — Alder Studio | One client, with billing contact `P-021` |
| `L-01` — Main studio | Service location belonging to `C-014` |
| `L-02` — Workshop | A different service location belonging to `C-014` |
| `P-021` — Morgan Hale | Billing contact associated with `C-014` |
| `J-101` — Scheduled job | Belongs to `C-014` at `L-01`; coordinator `U-01`, field lead `U-02` |
| `J-102` — Awaiting customer decision | Belongs to `C-014` at `L-02`; coordinator `U-01`, field lead `U-02` |
| `A-301` — Open site-visit task | Belongs to `J-101`; owned by `U-02` |
| `A-302` — Open revised-quote review | Belongs to `J-102`; owned by `U-01` |

The staff mappings are `U-01` for Avery and `U-02` for Jordan. Whether the destination uses staff accounts, owner fields, or another structure must be checked for that product.

After a rehearsal import, Avery should be able to open Alder Studio, distinguish both locations, find Morgan's billing relationship, and identify each job's next action. Jordan should find the site-visit task for the main studio without receiving access merely because an unrelated record has a similar name.

Eight imported rows do not pass this exercise if `A-302` points to the wrong job or both jobs point to `L-01`.

## 5. Test exceptions, not just clean records

Add a small number of deliberate exception cases to a separate test set:

- A possible duplicate with conflicting contact information that requires review.
- A job assigned to someone whose destination account is inactive or absent.
- An activity with a missing parent-job identifier.
- A status value the destination does not recognize.
- A record already present in the destination when the import is repeated.

Write the expected response for each case. It may be rejection, a review queue, a documented reassignment, or an update to the existing record. Creating a second record automatically is not always the right answer.

Pipedrive's documentation includes field mapping, a preview, import-result details, skipped entries, and a product-specific revert process. Those are useful review checkpoints, but another system may expose different controls. [Pipedrive spreadsheet-import documentation](https://support.pipedrive.com/en/article/importing-data-into-pipedrive-with-spreadsheets).

Capture the actual test outcome. A written plan to reject a broken association is not evidence that the configured importer does so.

## 6. Plan the changeover and recovery before the final import

Decide when staff will stop entering new work into the old system, if a pause is practical. If work must continue, define a change log or other controlled method for capturing activity between the source snapshot and the final transition.

Name the person who decides whether to proceed, pause, or return to the previous operating arrangement. Define specific stop conditions: missing open jobs, incorrect customer relationships, unusable owner assignments, or inaccessible required history.

Recovery must account for work created after the switch. Restoring an earlier state without reconciling new activity can discard legitimate changes. Ask what an undo function covers, what it excludes, and how long it remains available for the exact operation.

Do not assume that importing, updating, deleting, and merging share the same recovery behavior. Zoho's current duplicate-management documentation describes automatic matching and conflict resolution; a merge should be evaluated as its own operation. [Zoho duplicate-management guidance](https://help.zoho.com/portal/en/kb/crm/manage-crm-data/duplication-management/articles/auto-merge-duplicates).

For connected automations interrupted during the changeover, the [automation recovery checklist](/blog/automation-failure-recovery-checklist) helps identify completed actions before retrying the missing work.

## 7. Reconcile records and complete real business tasks

Compare expected records with created, updated, rejected, and excluded records. Explain the differences rather than aiming for matching totals at any cost. Keep the rejected-record list until each item has an accepted disposition.

Then review relationships and tasks. In the fictional example, confirm two distinct locations, two jobs linked to the correct locations, two open activities linked to the correct jobs, and the correct staff mappings.

Have the people who perform the work attempt representative tasks in the destination. Finding an open job, reassigning it, locating its last decision, and identifying the next action reveal problems a row count cannot.

Check the integrations and notifications that depend on those records. Our [automation-tool guide](/blog/small-business-automation-tools) explains why the connection, permissions, and recovery behavior matter alongside the application itself.

## Copy this migration acceptance sheet

Use the **08 CRM migration** sheet in the [business systems worksheets (XLSX)](/resources/blog/wallace-shift-business-systems-worksheets.xlsx) for a working copy. The workbook contains fictional examples and space for your own inputs.

| Acceptance item | Evidence, owner, and result |
| --- | --- |
| Source snapshot and included/excluded information | |
| Field and identifier mapping | |
| Expected, created, updated, rejected, and excluded counts | |
| Customer/location/contact relationships checked | |
| Open jobs and next actions checked | |
| Current and inactive owner treatment | |
| Duplicate candidates and decisions | |
| Attachments or history retained elsewhere | |
| Staff task demonstrations | |
| Changes during transition reconciled | |
| Stop condition and recovery decision | |
| Remaining exceptions and responsible person | |

Acceptance can include a known limitation when the business understands it and has an agreed operating arrangement. It should not conceal missing records behind a general “import complete” status.

## Frequently asked questions

### Should every old record move into the new CRM?

Not automatically. Decide which information supports current work, required history, and reporting. Document exclusions and any archive the team will need. Make retention decisions with the business's actual obligations and policies in mind.

### Can I merge everything with the same email address?

Do not use that as a universal rule. Shared addresses, changed addresses, and multiple record types need deliberate treatment. Check the product's matching rules and review uncertain cases before combining information.

### Are matching record counts enough to approve the migration?

No. The fictional example could contain all eight business records while linking a task to the wrong job. Check relationships, ownership, status meaning, and the work people must perform.

### Can we keep using the old CRM during the move?

Sometimes, but new activity needs a controlled capture and reconciliation method. Decide which system owns each kind of change and how the final transition accounts for work completed after the initial export.

## Start with a migration scope the team can verify

A useful migration plan defines both the data and the work that must survive. If you need help assessing records, relationships, and the transition, [discuss a separately scoped system or migration project with Wallace Shift](/contact).
