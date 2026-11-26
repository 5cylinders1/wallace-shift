---
status: published
publishedAt: "2026-10-25T19:14:48Z"
updatedAt: "2026-11-25T20:57:11-06:00"
slug: web-app-vs-website
title: "Web App vs. Website: What Does Your Business Actually Need?"
description: "Separate explaining your business from running its daily work, then decide whether existing software, an integration, or a custom app fits."
question: "What is the difference between a website and a web app, and when does a business need one?"
answer: "A website can explain a service and collect an inquiry. A web app is useful when people need to sign in, work with their own records, or pick up a task later. Start with the task your current site can’t handle."
category: "Business systems"
author:
  type: "Person"
  name: "Matthew Wallace"
  url: "/about"
---

Suppose you run an appliance-repair business. A customer needs to see which appliances you service and request a visit. Your office needs to assign the accepted job, and the technician needs to record what happened. Those are connected tasks, but they don't all need to live in the same website.

I'd keep the public pages focused on helping the customer request the right service. Then I'd check whether your existing job software can handle the work afterward. A need for shared records doesn't automatically justify a custom app.

## Start with the public-facing problem

If people can't tell what you do or where you work, an internal dashboard won't help them.

For the appliance-repair example, the immediate website requirements are straightforward: list the appliances serviced, explain coverage, show relevant evidence, and collect enough information to assess a request. A reliable form and an assigned inbox may be enough.

Don't add customer accounts just to make the project sound more advanced. Every account brings another experience to support.

Use the [service website inquiry guide](/blog/what-your-service-website-must-have-to-get-more-inquiries) for the public pages. Give operational problems their own brief.

## Look for work that continues after submission

Application requirements appear when several people need to use and change the same information over time.

For example:

1. A coordinator accepts a request and assigns a technician.
2. The technician records the visit and requests a part.
3. A manager approves additional work.
4. The customer sees an appropriate status update.
5. The office can find jobs waiting for a decision.

That process needs more than a nice service page. It needs shared records, defined permissions, and rules about what happens next.

Write the awkward cases down now. Can a customer cancel after assignment? Who can reopen a completed job? What happens if the same request arrives twice? Those decisions determine the system more than the dashboard layout does.

## Needing an app doesn't mean building one

Test the same process against these routes:

- Use a suitable existing product.
- Configure software you already pay for.
- Connect tools that each handle part of the work.
- Build a focused component for a demonstrated gap.
- Build a broader application when the combined requirements justify it.

Back at the repair business, suppose staff copy requests into a spreadsheet, ask a supervisor to assign work, and search messages for completion notes.

The desired result is specific: the coordinator can see each accepted job, its owner, its status, and its next action.

Run one normal job through the current CRM. Then test a rescheduled visit and a cancellation. If configuration handles the process, a separate application may be unnecessary. If it doesn't, keep the test results as evidence for the missing functionality.

If the problem is mainly information moving between tools, the [automation tool comparison](/blog/small-business-automation-tools) is a better next step than a full application specification.

## Include permissions and recovery in the scope

A customer should not see another customer's job. A technician may need to record a visit without approving its price. Signing in and having permission are different things. [OWASP's authorization guidance](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html) recommends validating permissions on every request.

Ask the implementer to demonstrate both allowed and blocked actions with test accounts. Hiding a button isn't proof that the underlying action is protected.

Then assign the operating work:

- Add and remove access as responsibilities change.
- Correct mistakes and investigate failed actions.
- Maintain connections and business rules.
- Back up data and test recovery.
- Support staff when the system is unavailable.

These duties can be shared with a vendor or development partner. They can't be left implied by the word “hosted.”

## Bring one workflow to the proposal

Write a short brief containing:

- The person doing the work and the event that starts it.
- The observable result they need.
- Records and history that must persist.
- Who can see or change each part.
- Existing systems and required handoffs.
- Duplicates, cancellations, and other exceptions.
- What already works and should stay.
- A realistic trial that would prove the solution.

If most of the brief concerns explaining services and receiving inquiries, start with the website. If it describes shared work over time, evaluate application options. A public website and a separate portal can coexist when navigation, data, and support are planned together.

[Wallace Shift's business system work](/services#web-apps) starts with that workflow. [Bring one task your team struggles to complete](/contact), rather than a feature list built around the word “app.”
