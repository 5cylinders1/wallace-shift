---
status: published
publishedAt: "2026-10-26T13:02:49Z"
slug: "crm-requirements-template-service-business"
title: "CRM Requirements for a Service Business: A Practical Template"
description: "Turn everyday customer work into a short CRM brief that your team can test and providers can price."
question: "What should a service business include in its CRM requirements?"
answer: "Write down who needs the CRM, what work they do in it, and how you’d tell whether each step works. Use actual examples of a new lead, a handoff, and an exception to turn a feature list into requirements you can test."
category: "Business systems"
author:
  type: "Organization"
  name: "Wallace Shift"
  url: "/about"
---

“Track customers and send reminders” could describe almost any CRM. Try this instead: “When a customer asks for work at a second location, the coordinator can open a new request without changing the job already scheduled at the first location.” You can give that task to a provider and watch it happen. You can also find out what it takes to make it work before you buy.

## Walk through a real job first

Ask the people who do the work to show you a recent inquiry, from arrival to its next meaningful step. Where do they look for information? What do they copy? Which decisions get made in email or over the phone but never make it back into the record? Note who handles the work when the usual person is out.

Decide what needs its own record. A customer can have several locations. Each location can have its own instructions and open jobs. A billing contact can belong to the customer without being the person who lets the technician into the property. Keep these distinctions where they affect the work. You don't need a separate record for information nobody has to retrieve or update on its own.

## Write requirements you can demonstrate

In this fictional example, Cedar Lane Maintenance serves Alder Studio at its main studio and workshop. Avery coordinates work, Jordan handles field work, and Morgan is the billing contact. The main studio already has a scheduled visit when the workshop asks for a quote.

| Requirement | What a demonstration should show |
| --- | --- |
| CRM-01: Add work at a second location | Avery adds the workshop request under the same customer. The main studio visit and site instructions stay unchanged. |
| CRM-02: Reassign without losing context | Once the scope is confirmed, Avery assigns Jordan the field work. Earlier notes stay visible and the next action has an owner. |
| CRM-03: Limit billing changes | Jordan updates assigned job details and sees the workshop instructions, but only the office can change the billing contact. |
| CRM-04: Surface work that's stalled | The open workshop request appears in a view for records with no next action. It leaves that view when Avery sets a dated action and names its owner. |

Ask the provider to use the right roles during the demo. An administrator being able to edit everything tells you little about what a field worker can do. Also check what happens when records are removed or reassigned; the way a product links records can affect sharing and deletion. [Salesforce’s relationship overview](https://help.salesforce.com/s/articleView?id=overview_of_custom_object_relationships.htm&language=en_US&type=5) gives examples of how those rules can differ.

## Put the handoff and the exception in the brief

Name the person who can move a request from “awaiting decision” to “approved,” what has to be recorded first, and who picks up the next step. If approval is supposed to create a job in another tool, decide which system owns which records. Then write the failure case: if the job doesn't get created, where does Avery see the unfinished handoff, and how does she resolve it without creating two jobs?

For customer access, spell out what customers can see or change separately from internal permissions. The [client portal versus CRM guide](/blog/client-portal-vs-crm-service-business) helps draw that line. If you're mapping everything after the sale, use the [client onboarding guide](/blog/automate-client-onboarding) for a separate walkthrough.

## Copy this format for each requirement

Start with tab 01 in the [business systems worksheets](/resources/blog/wallace-shift-business-systems-worksheets.xlsx), or use one short entry per requirement:

- **ID and priority:** Needed at launch, useful later, or unresolved.
- **Task and starting point:** Who's doing what, and what records already exist?
- **Data and permissions:** What changes, what stays intact, and who may act?
- **Exception:** What could fail, how does it show up, and who handles it?
- **Acceptance test:** What will you see if it works, and who signs off?

A handful of requirements can be enough to price a first release. Carry staff training, integration monitoring, and routine administration into the [implementation budget](/blog/crm-implementation-cost-service-business). Once the brief is ready, [test it against both configurable and custom options](/blog/custom-crm-vs-off-the-shelf). If you want another set of eyes on it, [bring the brief to Wallace Shift](/contact).
