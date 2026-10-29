---
status: published
publishedAt: "2026-10-26T13:02:49Z"
slug: "crm-requirements-template-service-business"
title: "CRM Requirements for a Service Business: A Practical Template"
description: "Define customer records, roles, workflows, integrations, and acceptance tests with a practical CRM requirements template for service businesses."
question: "What should a service business include in its CRM requirements?"
answer: "A useful CRM requirements document explains the work people must complete, the information they need, and how you will check that the system supports both. Start with customer tasks, record relationships, responsibilities, and exceptions. Then translate those needs into a short set of observable tests before comparing products or asking for a development estimate."
category: "Business systems"
author:
  type: "Organization"
  name: "Wallace Shift"
  url: "/about"
---

“We need customer management, reminders, and reporting” leaves too much open. A provider could satisfy that description while still making it difficult to find the right service location or work out who should contact a customer next. Specific requirements help you evaluate that gap before committing to an implementation.

The template below is designed for a service-business owner working with an office coordinator and the people delivering the work. Use only the parts your business needs.

## Start with the decisions people make

Choose three tasks that matter to your current operation. For example: accept a new inquiry, hand an approved job to the field team, and identify work waiting for a customer response.

For each task, describe the starting information, the responsible person, the decision, and the expected result. Ask the person who performs the task to walk through an ordinary case and one awkward case. A checklist written entirely by someone who never handles the work may miss a necessary exception.

A useful task description might read:

“The coordinator receives a request from an existing customer for a different location. They create a separate request, connect it to the correct customer and location, assign a next action, and preserve the customer's previous job history.”

That statement gives a product demonstration something concrete to prove. It also identifies questions that a feature label such as “contact management” does not answer.

If you are still deciding whether you need an application at all, the broader [website-versus-web-app decision](/blog/web-app-vs-website) can help establish the scope first.

Once those tasks are clear, the [custom versus off-the-shelf CRM guide](/blog/custom-crm-vs-off-the-shelf) shows how to compare implementation routes against the same requirements.

## Describe the things you need to keep separate

A customer, a person, a location, and a job may be connected without being interchangeable. One customer might have several sites. The person requesting service may differ from the person paying invoices. A returning customer can have a new inquiry without becoming a new customer.

Write these relationships in ordinary language before choosing software terminology. You do not need to design a database. You need to explain which information belongs together and what must remain distinct.

Product details matter here. Salesforce's documentation explains that relationship types can affect deletion, sharing, and required fields. A diagram showing connected records therefore does not, by itself, establish how a particular implementation behaves. [Salesforce's object relationships overview](https://help.salesforce.com/s/articleView?id=overview_of_custom_object_relationships.htm&language=en_US&type=5)

For a business with one contact and one active job per customer, a simpler model may be enough. Add separate record types when they solve a real problem, such as keeping instructions for two locations from overwriting each other.

## Give each task an owner and each role clear actions

“Everyone can access the CRM” is not a complete access requirement. Describe what each role should see and change.

An office coordinator might create requests, correct contact details, and reassign work. A field lead might view assigned jobs and update completion notes. The person responsible for billing might control billing details. Decide whether these are different people, different permissions, or both in your business.

Include negative requirements: actions someone should be unable to perform. A field worker's screen may need job instructions without displaying unrelated financial information. A customer-facing account may need access to one customer's records without exposing another's.

Also identify the person responsible when the normal owner is unavailable. A task assigned to an inactive employee is still unresolved work, even if the assignment field is technically populated.

If customers will access the system themselves, use the [client portal versus CRM guide](/blog/client-portal-vs-crm-service-business) to distinguish their permitted actions from the internal team’s responsibilities.

## Define states, handoffs, and exceptions

Choose a small set of statuses that explain what happens next. “New,” “waiting for information,” “ready to schedule,” and “complete” can be useful if the team agrees on what each means. Adding numerous stages without clear decisions creates more choices to maintain.

For every important transition, ask:

- What information must be present before this change?
- Who may make it, and who takes responsibility afterward?
- Does anything need to happen elsewhere?
- What happens if that other action fails?

For example, moving a request to “ready to schedule” might require a service location and an approved scope. If creating the calendar entry fails, the request should remain visible for follow-up. Whether the CRM itself or a connected tool handles that behavior is a later implementation decision.

For workflows after a customer agrees to proceed, the [client-onboarding guide](/blog/automate-client-onboarding) provides a more detailed way to map preparation, handoffs, and exceptions.

## Work through a fictional example

Cedar Lane Maintenance, Alder Studio, and every person and identifier in this example are invented. This is a planning exercise, not a customer case study or a tested product implementation.

Cedar Lane serves Alder Studio, customer C-014, at L-01 Main studio and L-02 Workshop. Morgan Hale is Alder Studio's billing contact. Avery coordinates office work, and Jordan leads field work.

Alder requests maintenance at L-02 while a job at L-01 is already scheduled. The team wants to reuse the customer information without copying that job's status or location instructions into the new request. The Workshop request remains awaiting the customer's decision until the scope is agreed.

The first requirement is therefore: Avery can create a new request for C-014 and choose L-02 without changing the scheduled work at L-01. The expected result is one customer, two distinguishable locations, and separate work records.

The second requirement concerns responsibility. Avery initially owns the request while gathering details. After the scope is confirmed, Avery assigns field responsibility to Jordan. The system must keep the earlier notes and identify the current responsible person. Reassignment should not make the request look newly received or erase its history.

The third requirement concerns billing information. Morgan remains the billing contact for Alder Studio. Jordan needs the instructions for L-02; the business decides that changing the billing contact is an office responsibility. The demonstration must show both Jordan's permitted job update and the restriction on that billing change.

Finally, Avery needs a view of open requests with no next action. The fictional new request should appear there when its next-action field is empty, and leave that view once a dated action and responsible person are recorded.

These four requirements describe a small, reviewable workflow. They do not yet require a customer portal, automated billing, or a custom CRM.

## Copy this requirements template

Use the **01 CRM requirements** sheet in the [business systems worksheets (XLSX)](/resources/blog/wallace-shift-business-systems-worksheets.xlsx) for a working copy. The workbook contains fictional examples and space for your own inputs.

Create one row or short record for each requirement. Keep the identifier stable so a provider's response, demonstration, and estimate can refer to the same item.

| Field | What to record |
| --- | --- |
| Requirement ID | A simple label, such as CRM-01 |
| Task and reason | What a person needs to do and why it matters |
| Starting situation | Records, status, and information already present |
| Responsible role | Who performs the task and who handles an exception |
| Information and relationships | What must be created, connected, preserved, or changed |
| Allowed and restricted actions | What this role may and may not do |
| Expected result | Observable evidence that the task is complete |
| Priority | Needed at launch, useful later, or unresolved |
| Dependencies | Another tool, decision, permission, or data source |
| Verification | Demonstration date, result, limitation, and follow-up owner |

A completed entry for the example would read: **CRM-01: New work for an existing customer.** Starting situation: C-014 exists, with L-01 and L-02 and scheduled work at L-01. Avery creates a request for L-02. Pass condition: the request links to C-014 and L-02, receives its own status and next action, and leaves the scheduled job unchanged. Priority: needed at launch.

Use that level of detail for essential work. A requirement for a preferred button color rarely deserves the same attention as retaining the correct service location.

## Include connections and ongoing responsibility

List each outside system the CRM must exchange information with. Record the information, direction, trigger, acceptable delay, failure owner, and which system is authoritative when values disagree.

“Connect to accounting” is too broad. “Send approved customer billing details to the accounting system, report a rejected transfer to Avery, and avoid creating the same customer twice” is a scope someone can investigate.

Ask how information will enter at launch and how you could retrieve it later. Separately identify who administers users, reviews failed connections, maintains changes, and answers staff questions. These responsibilities belong in the brief even if different providers perform them.

Carry these responsibilities into your [CRM implementation budget](/blog/crm-implementation-cost-service-business), separating initial work, recurring services, and internal staff time.

## Frequently asked questions

### How many CRM requirements should we write?

Write enough to cover the essential workflow and its consequential exceptions. Begin with a few complete tasks and expand where they reveal a distinct need. A shorter document with clear outcomes is easier to evaluate than a long collection of feature names without priorities.

### Do we need to choose a CRM before writing the brief?

No. Describe the business need first. A provider can then explain how its product represents that need, including configuration and limitations. Adjust terminology during evaluation without quietly dropping a requirement that still matters.

### Should every requirement be automated?

No. Some decisions need a person, and some infrequent tasks can remain manual. Record who performs them and what makes the result visible. Automation is an implementation choice to justify, not an automatic requirement for every handoff.

### Can a small business use this without creating a large project?

Yes. Keep a short version covering one workflow, the necessary records, a few roles, and clear acceptance tests. Mark future ideas separately. The brief should help limit the project to useful work rather than turn every possibility into launch scope.

## Bring a testable brief to the next conversation

Before requesting a proposal, have the people doing the work review the example tasks and expected results. Resolve contradictory expectations and label the remaining unknowns. That gives both you and a provider a clearer basis for discussing what the system must deliver.

Wallace Shift's [business-system services](/services#web-apps) begin with understanding the workflow and the existing tools. You can [bring your requirements brief to a conversation](/contact) about the appropriate scope and next step.
