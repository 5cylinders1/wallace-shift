---
status: published
publishedAt: "2026-10-26T13:02:49Z"
slug: "contact-form-not-sending-email"
title: "Contact Form Says “Sent,” but No Email Arrives: What to Check"
description: "Trace missing contact-form emails from submission storage to the mailbox, gather useful evidence, and plan a retest after the problem is fixed."
question: "Why does my contact form say sent when no email arrives?"
answer: "When a contact form appears to succeed but no email arrives, follow one labeled test request from the website to the receiving team. Check whether the submission was recorded, whether a notification was attempted, what the sending service reported, and where the receiving mailbox put the message. Repair the first verified failure, then repeat the complete test."
category: "Business websites"
author:
  type: "Organization"
  name: "Wallace Shift"
  url: "/about"
---

A success message tells you what the website displayed. Depending on its implementation, it might appear before the business has a saved request or a delivered notification. Starting with the visible message and assuming everything else worked can send you looking in the wrong place.

This guide helps you collect enough evidence to locate the problem. If you are still unsure whether the issue is missing visitors, unsuitable requests, or follow-up, start with our broader [website inquiry diagnosis](/blog/why-your-website-is-not-generating-inquiries).

## First, establish a way to receive requests while investigating

Check the form's existing submission list, if it has one. A request may be available there even when its notification failed. Assign someone to review that list while the email problem is being investigated, and make clear which requests have already received a response.

If there is no retained submission record, check whether another existing system received the information. Do not assume a record can be recovered simply because the visitor saw a confirmation.

Make sure the page offers an alternative contact route the team actually monitors. A phone number or email address is useful only if someone is responsible for it. Avoid adding a new channel that nobody will check.

Use controlled test details during diagnosis. Repeatedly sending a real customer's message can create duplicate work or expose their information in unnecessary places.

## Create one test you can recognize everywhere

Tell the receiving person you are testing. Submit a normal, valid request containing a unique label such as `FORM-TEST-01`. Record the page address and the time, including the time zone. Use a return address you control.

Follow the same route a visitor would: open the service page, reach the form, complete it, and submit once. Record the confirmation or error. If a booking or separate form provider opens, note that destination too.

Keep the first test simple. Attachments, unusual formatting, and several recipients introduce extra variables. Once the normal path is understood, test those additional features if the business relies on them.

If a second test is needed, give it a new label. Without distinct labels, an old delayed message can be mistaken for evidence that the latest change worked.

## Separate the six checkpoints

| Checkpoint | Evidence to look for |
| --- | --- |
| Browser confirmation | The exact message or error shown after the test |
| Saved request | A matching submission or business record, if this system stores one |
| Notification attempt | A recorded attempt to send the relevant notification |
| Sending-service result | A status or error tied to that attempt |
| Receiving mailbox | The matching message, including spam, quarantine, or other applicable folders |
| Business ownership | The person responsible for acting on this request |

The evidence available depends on the platform. Some forms expose submission records and delivery logs; others need an administrator to inspect the application or sending service. Missing access to a log means the step is unverified, not that it succeeded or failed.

A provider's status also needs its own definition. An accepted send is not automatically proof that the message reached the intended inbox or that anyone acted on it.

## Branch 1: there is no saved request

First confirm whether this form is designed to store submissions. An email-only form may have no submission list to search. In that case, investigate its processing and send logs rather than treating the empty list as a failure.

If storage is expected, check the exact page and form. A site may contain an old embedded form, a duplicated page with different settings, or a test form that sends somewhere else. The fact that another form works does not establish that this one does.

Give the administrator the test label, time, URL, and visible result. Ask whether the request reached the form-processing step and whether validation or an application error prevented acceptance. That is a narrower, more answerable question than “Why is email broken?”

Do not install a mail plugin to address a request that never reached the notification step. First determine what happened to the submitted information.

## Branch 2: the request exists, but no notification was attempted

Inspect the notification settings for that specific form. Check whether notifications are enabled, the recipient is current, and any routing conditions match the request you submitted.

For example, a form might route commercial inquiries to a shared mailbox and residential inquiries to a different address. A newly added service option could have no matching notification rule. That is a configuration hypothesis to test, not a conclusion to assume.

Also distinguish customer acknowledgment from team notification. The visitor receiving an automatic reply does not prove that the team notification was attempted. They may be separate actions with different recipients and conditions.

If the notification depends on an automation, inspect that step's result. A saved form record and a failed connector can coexist.

For a form connected to a CRM, the [form-to-CRM handoff guide](/blog/connect-website-form-to-crm) explains how to distinguish saving a contact, creating an inquiry, and assigning the next task.

## Branch 3: the send was rejected or failed

Capture the actual error and identify which service produced it. The website host, mail provider, connector, and receiving mailbox can have different logs and responsibilities.

For Gmail destinations, Google's guidance directs administrators to verify the form provider's authentication method, relevant SPF or DKIM configuration, and SMTP credentials where used. The required configuration depends on the sender. [Google Workspace's contact-form troubleshooting guidance](https://knowledge.workspace.google.com/admin/support/troubleshooting/troubleshoot-gmail-not-getting-contact-form-messages).

Give those findings to the person who manages the relevant service. Do not paste a generic DNS record from an unrelated example over the business's existing configuration. A domain may have several legitimate sending services that need to be considered together.

If access changed recently, identify the connection that changed and repair it using that provider's current instructions. Keep passwords and access tokens out of screenshots, support summaries, and your incident worksheet.

## Branch 4: the sender reports success, but the message is missing

Check the destination address character by character. Then inspect the mailbox's applicable spam, quarantine, filtering, forwarding, and shared-mailbox arrangements. Ask the mailbox administrator to trace the specific message where the service supports that investigation.

Record the provider's message identifier and exact status instead of paraphrasing everything as “sent.” This helps the next person investigate the same event.

Compare a controlled message to another approved destination only when that comparison is relevant and does not reroute real inquiries. If one mailbox receives the test and another does not, you have narrowed the investigation; you have not proved that every future message will be delivered.

Changing subject lines or repeatedly resending can obscure the original problem. Preserve the evidence before trying a proposed fix.

## A fictional example: the request arrived, but the notification went elsewhere

Consider Cedar Lane Maintenance, a fictional service business. Avery coordinates inquiries. Morgan Hale, the billing contact for fictional client Alder Studio, uses a test request labeled `FORM-TEST-01` to ask about its workshop, location `L-02`.

In this invented scenario, Avery can find the test in the website's saved submissions. The notification log shows an attempt addressed to a former team mailbox. The sending service accepted the message, but the current shared inbox was never its destination.

The finding is specific: the form's recipient configuration is outdated. It is not evidence that the form failed to capture the request or that all mail from the domain is blocked.

Avery has the recipient setting corrected, sends `FORM-TEST-02`, and checks the saved request, notification destination, mailbox receipt, and assigned next action. The earlier saved request is reviewed separately so it does not disappear during the repair.

These are fictional steps and outcomes, not a Wallace Shift customer incident or a tested product demonstration. They show how each checkpoint changes the diagnosis.

## Copy this form-delivery incident record

Use the **04 Form email delivery** sheet in the [business systems worksheets (XLSX)](/resources/blog/wallace-shift-business-systems-worksheets.xlsx) for a working copy. The workbook contains fictional examples and space for your own inputs.

| Investigation item | Your record |
| --- | --- |
| Form URL and form name | |
| Test label and timestamp/time zone | |
| Browser result | |
| Saved request identifier, or storage not supported | |
| Notification recipient and applicable rule | |
| Sending service, status, and message identifier | |
| Mailbox result | |
| Last verified successful checkpoint | |
| Specific failure or unresolved question | |
| Responsible person and proposed change | |
| New test label and full retest result | |
| Earlier requests needing follow-up | |

Attach redacted evidence when it helps. “The form is broken” is difficult to investigate. “Test FORM-TEST-01 was saved at this time, but no notification attempt appears” gives the administrator a starting point.

Before replaying an interrupted workflow, use the [automation recovery checklist](/blog/automation-failure-recovery-checklist) to check for records or messages that already completed.

## Frequently asked questions

### Does a success message mean my inquiry was saved?

Not necessarily. Its meaning depends on how the form was built. Confirm a matching receiving record or inspect the processing result. If the system does not retain submissions, document that limitation instead of assuming a hidden backup exists.

### Should I install an SMTP plugin immediately?

Only after identifying a sending problem and checking that the proposed tool suits the platform. A mail connection cannot correct a wrong recipient, missing routing rule, or request that never reached processing.

### Why does the customer get a reply while our team gets nothing?

The customer acknowledgment and team notification may be separate actions. Trace the team notification independently, including its recipient, conditions, and sending result.

### How do we know the repair worked?

Repeat the complete customer path with a new test label. Verify the expected saved record, notification, mailbox receipt, and responsible person. Test important routing branches separately, and check earlier saved requests for missed follow-up.

## Turn the evidence into a focused repair

Reliable contact handling includes the form, its receiving systems, and the team routine described in our [service-business website guide](/blog/what-your-service-website-must-have-to-get-more-inquiries). If you need help investigating a reproducible failure, [tell Wallace Shift what you observed](/contact).
