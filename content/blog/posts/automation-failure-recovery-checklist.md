---
status: published
publishedAt: "2026-10-26T13:02:49Z"
updatedAt: "2026-11-25T20:57:11-06:00"
slug: "automation-failure-recovery-checklist"
title: "What to Do When an Automation Fails: A Recovery Checklist"
description: "Check what already completed, finish the missing work safely, and account for every affected request before restarting."
question: "How do I recover a failed automation without repeating completed actions?"
answer: "Check which actions completed before retrying. Pause repeated attempts if they're making the problem worse, while keeping new requests somewhere the team can find them. Finish the missing work and verify it in the receiving system."
category: "Workflow automation"
author:
  type: "Person"
  name: "Matthew Wallace"
  url: "/about"
---

An inquiry can be saved successfully even when the automation reports a timeout. If the next step was supposed to give someone a follow-up task, you may have a saved request with nobody assigned to answer it.

That's the first thing I'd investigate. Find the request in the receiving system before clicking retry. The repair may be as small as creating the missing task, provided you also stop a pending retry from doing it again.

## 1. Contain the problem without losing new work

Record the workflow, when the problem began, and an affected request identifier. Identify who's waiting on the result.

If retries are creating duplicates, have the maintainer pause the affected processing. First establish where incoming requests will be retained. Pausing a connection without a receiving queue can create another gap.

Name one recovery coordinator. Other people can investigate, but everyone should record changes and manual responses so two people don't complete the same request independently.

## 2. Inspect the destination

Follow one request through the workflow history and the receiving application:

| Step | Check |
| --- | --- |
| Receipt | Original saved submission or source record. |
| Customer match | The correct customer identifier. |
| Inquiry | A record containing the right request and location. |
| Assignment | A named owner and understandable next task. |
| Message | Message history and available delivery information. |
| Status change | Current state and the history behind it. |

Mark each outcome confirmed complete, confirmed failed, or uncertain. A log showing an attempted write doesn't establish whether the CRM saved it.

Pay particular attention to timeouts. The destination may have changed even though confirmation never reached the sender. [Zapier's duplicate-data guidance](https://help.zapier.com/hc/en-us/articles/8496218141453-Zap-is-creating-duplicate-data) identifies replay after timeout as one possible cause of duplicates.

Check record contents as well as existence. Another inquiry for the same customer may concern a different property. The [form-to-CRM guide](/blog/connect-website-form-to-crm) explains those distinctions.

## 3. Fix the condition that stopped the work

A missing location needs clarification, not an invented address. Revoked connection access needs the authorized account owner. An unavailable service needs a status check and a review of retry behavior.

Also check whether the request has changed. Yesterday's failed reminder may be unnecessary after this morning's reply. Recover the work that's still appropriate now.

## 4. Know exactly what the retry repeats

Check the current documentation for the recovery action in your setup. [Zapier distinguishes errored-step replay from whole-run replay](https://help.zapier.com/hc/en-us/articles/19220226086797-What-is-replay); a whole-run replay starts again at the beginning. [Make documents incomplete executions](https://help.make.com/incomplete-executions), including storage configuration and supported recovery routes. Confirm what your account actually retained.

The maintainer should be able to explain how recovery avoids repeating completed actions. That may involve a submission identifier, an existing destination record, a supported resume point, or one recorded manual action. If the earlier result is uncertain, investigate before writing again.

## A timeout example

Here's a fictional scenario, not a client incident or test result.

Cedar Lane Maintenance receives Morgan's request F-102 for an assessment at Alder Studio's workshop, L-02. The workflow finds customer C-014 and creates inquiry I-102. The CRM saves it, but the confirmation times out before Avery's follow-up task is created.

The recovery check finds:

- F-102 is retained with the original message and correct location.
- C-014 and I-102 already exist and should stay intact.
- Avery's task is missing.
- No automated or manual reply has been sent.
- A retry is still pending.

Avery and the maintainer coordinate the pending retry, then create the missing task through a supported recovery route. If they complete it manually, they record the task identifier and prevent the pending automation from duplicating it.

Avery still needs to confirm scope and timing before assigning a field visit. Recovery is finished when the inquiry has its correct next action, Avery can find it, and another retry won't recreate the work.

## 5. Check every request received during the interruption

One repaired example doesn't clear the backlog. List all requests received during the interruption, including work handled manually. For each, record the last confirmed result, remaining action, recovery owner, and destination evidence.

Separate repeated deliveries from distinct requests. Resume using the maintainer's procedure, then follow a fresh request all the way through. Keep unresolved exceptions assigned.

A successful run can still leave business work unfinished. For example, [Make's error-handling documentation](https://help.make.com/Overview-of-error-handling) describes a Skip handler that can remove an affected item from a route. Check the outcome rather than relying on a green status.

## Keep a short incident record

Use the **10 Workflow recovery** sheet in the [business systems workbook](/resources/blog/wallace-shift-business-systems-worksheets.xlsx). Record configuration, affected times and identifiers, completed or uncertain actions, manual work, cause, recovery decision, owner, and completion evidence.

End with a specific improvement: retain event identifiers, clarify alerts, or compare received requests with assigned tasks. Repeated failures may justify an [automation audit](/blog/automation-audit-scope-deliverables-cost).

If your team can't tell what completed or how to resume, [bring the failed workflow and one affected request to Wallace Shift](/contact). Leave customer details out of the initial message.
