---
status: published
publishedAt: "2026-10-26T13:02:49Z"
updatedAt: "2026-11-25T20:57:11-06:00"
slug: "track-website-inquiries-qualified-leads"
title: "How to Track Website Inquiries Through to Qualified Leads"
description: "Follow a request from the website to the receiving system, then see which inquiries are worth pursuing."
question: "How do I track website inquiries through to qualified leads?"
answer: "Give each inquiry a record, keep whatever source information you can reliably capture, and agree on what counts as qualified. Track it through follow-up and outcome instead of calling every form submission a lead."
category: "Business websites"
author:
  type: "Person"
  name: "Matthew Wallace"
  url: "/about"
---

A website report shows 50 form events. The team can find 40 distinct requests. I'd check what each number counts before spending more on ads or rewriting the form.

At CraftJack, our team built quote-intake microsites for contractors. We needed to collect enough information for the contractor to understand the request and contact the homeowner. Use that same question when you decide what to track: what does the person receiving this request need in order to act on it?

## Give each number a job

| Stage | What you can count |
| --- | --- |
| Contact action | A form start or submit event, phone-link click, or booking interaction. |
| Received request | A saved submission, call record, or confirmed booking in the receiving system. |
| Distinct inquiry | One request after repeat deliveries and known tests are handled. |
| Qualification | An actual decision that the request fits your criteria, doesn't fit, or needs more information. |
| Next action and outcome | An assigned callback, appointment, quote, or whatever step your team actually tracks. |

Decide what belongs in the report. For a new-business report, that might mean excluding known tests, obvious spam, job applications, and support requests. A returning customer's new project can still count. Record the reporting dates, time zone, and rules so a definition change doesn't look like a jump in business.

## Check the form event against a saved record

[GA4 enhanced measurement](https://support.google.com/analytics/answer/9216061?hl=en) distinguishes `form_start` and `form_submit`. Neither event independently confirms that a CRM or inbox received anything. Likewise, the [recommended events](https://support.google.com/analytics/answer/9267735?hl=en) `generate_lead` and `qualify_lead` need to be implemented and tied to the actions you intend to measure. Write down the trigger and test it. A tap on a phone number and an answered call need separate evidence, too.

Use an internal inquiry ID where possible. A retry with the same ID shouldn't become another inquiry, but a new request from an existing contact should. Keep raw messages, email addresses, and personal phone numbers in the appropriate business system. Review event parameters, page titles, and URLs so they don't send personal information to Analytics; see [Google's guidance](https://support.google.com/analytics/answer/6366371?hl=en).

## Decide what qualifies and who checks

Use criteria a coordinator can verify, such as the service requested, service area, and timing. Record **qualified**, **unsuitable with a reason**, or **pending clarification**. If the service location is missing, leave it pending and assign someone to find out. Record the reviewer, date, and next action. Keep an acquisition source marked unknown when the evidence doesn't establish it.

Run labeled test requests through the [form-to-CRM handoff](/blog/connect-website-form-to-crm): one valid request, an invalid attempt, a duplicate delivery, a new request from a known contact, and a receiving-system failure. Test a pending decision that changes after the customer supplies the missing detail. Verify the destination and assignment, not just the confirmation screen. Keep tests out of business totals and save enough evidence to repeat the check later.

## Work the numbers before drawing a conclusion

In a fictional week, Cedar Lane Maintenance records:

| Count | Meaning |
| --- | --- |
| 50 | Browser form events |
| 44 | Saved delivery records, including repeats |
| 4 | Extra deliveries of already counted requests |
| 40 | Distinct inquiries: 44 − 4 |
| 25 | Qualified inquiries |
| 10 | Unsuitable inquiries with a recorded reason |
| 5 | Pending clarification |

The decisions account for all 40 inquiries: **25 + 10 + 5 = 40**. The qualified share is **25 ÷ 40 = 62.5%** so far, and can change when the pending requests are reviewed. There's no visitor denominator here, so it's not a website conversion rate.

The six-event gap between browser events and saved deliveries is still unexplained. Test whether the two reports use the same boundaries and whether there are repeat events, rejected requests, or handoff failures before calling the gap six lost leads.

Use **09 Inquiry measurement** in the [business systems worksheets](/resources/blog/wallace-shift-business-systems-worksheets.xlsx) to log definitions, counts, source uncertainty, and the next check. If too few requests are coming in to begin with, start with the [website inquiry diagnosis guide](/blog/why-your-website-is-not-generating-inquiries). If requests are coming in but getting lost on the way to the team, [bring that handoff to Wallace Shift](/contact).
