---
status: published
publishedAt: "2026-10-26T13:02:49Z"
updatedAt: "2026-11-25T20:57:11-06:00"
slug: "crm-migration-checklist-service-business"
title: "CRM Migration Checklist: Keep Customer History and Open Work Intact"
description: "Rehearse your CRM move with linked records, open jobs, and a plan for what happens if the import goes wrong."
question: "How do I plan a CRM migration without losing customer context or open work?"
answer: "Agree on what moves, match old fields to new ones, and test with a small sample before you switch. Check whether open jobs, notes, attachments, owners, and follow-ups can still be found after the move."
category: "Business systems"
author:
  type: "Person"
  name: "Matthew Wallace"
  url: "/about"
---

On the first morning in a new CRM, can your coordinator find the right location for today's visit, see what the customer agreed to, and tell who's calling them next? That's the test I'd use before approving the move. A successful import can still leave the team opening old spreadsheets to do the work.

## 1. Decide what has to move

List the customers, contacts, locations, requests, jobs, notes, tasks, and attachments that support daily work. For each group, choose **move, archive, exclude, or investigate** and name a decision owner. If old correspondence can stay in an accessible archive, make sure staff know how to find it. Use the [CRM requirements template](/blog/crm-requirements-template-service-business) to list the tasks and relationships the new setup has to support.

Take a dated source snapshot before changing anything. Check what it contains: a contacts export may leave out activities, attachments, and configuration. Map source fields to destination fields and write down what to do with blanks, dates, time zones, unknown statuses, and former staff. A job marked “closed” may mean completed in one system and lost in another. Check the meaning before copying the label.

## 2. Match records before you merge anything

Keep a stable source ID and a way to find the corresponding destination record. Matching by name alone can join two unrelated customers. A shared email might be fine for billing without identifying a unique person, location, or inquiry. Send uncertain matches to someone who can review them rather than treating them as duplicates automatically.

[HubSpot's import guidance](https://knowledge.hubspot.com/import-and-export/set-up-your-import-file) is a good example of why to check the product rules: identifiers for updating a record can differ from the ones used to attach it to another record.

## 3. Rehearse with work the team recognizes

In this fictional exercise, Alder Studio is customer C-014, Morgan Hale is its billing contact, and it has two locations. The main studio has a scheduled job with an open site-visit task. The workshop has a separate request awaiting a customer decision, with an open task to review a revised quote.

After a test import, ask Avery, the office coordinator, to open the customer, find both locations, and locate the revised-quote task on the workshop request. Ask Jordan, the field lead, to find the site-visit task and the instructions for the main studio. Both results should agree with the old system. The row count can match even if the two tasks have been attached to the wrong jobs.

Now add five exception cases: a possible duplicate with conflicting details, an inactive owner, a task with a missing parent job, an unrecognized status, and a repeat import. Write the expected response for each, then record the actual result. A rejected row can be the right outcome if it leaves a clear record for someone to resolve. [Pipedrive's import guide](https://support.pipedrive.com/en/article/importing-data-into-pipedrive-with-spreadsheets) shows examples of review checkpoints such as a preview and skipped-record details. Check which ones your destination offers.

## 4. Plan the switch and the way back

Pick an entry cutoff or keep a controlled log of changes made after the snapshot. Decide which system owns new work during the changeover. If both copies stay writable, assign someone to compare the new entries and edits in both systems before staff depend on the new CRM.

Name who can pause the switch and what would trigger it: missing open jobs, incorrect links, unassigned work, or inaccessible history the team needs. Verify what undo covers for inserts, updates, and merges separately. A restore also has to account for legitimate work entered after the switch. If an integration stops mid-transfer, [check which actions completed](/blog/automation-failure-recovery-checklist) before retrying them.

## 5. Sign off on tasks as well as totals

Count what you expected to move, then account for what was created, updated, rejected, or deliberately left out. Investigate each difference; don't change records just to make the totals match. Then have staff find open jobs, reassign work without losing history, look up decisions, and check notifications and permissions. Keep every unresolved issue visible with an owner and a plan.

Tab 08 in the [business systems worksheets](/resources/blog/wallace-shift-business-systems-worksheets.xlsx) gives you a place to record this evidence. If you need help scoping the rehearsal or deciding what can stay behind, [talk through the migration with Wallace Shift](/contact).
