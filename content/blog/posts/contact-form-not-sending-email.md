---
status: published
publishedAt: "2026-10-26T13:02:49Z"
updatedAt: "2026-11-25T20:57:11-06:00"
slug: "contact-form-not-sending-email"
title: "Contact Form Says “Sent,” but No Email Arrives: What to Check"
description: "Follow one labeled test from the form to the mailbox, fix the first verified failure, and retest the complete path."
question: "Why does my contact form say sent when no email arrives?"
answer: "The success screen only tells you what the form showed the visitor. Run a labeled test and trace it through storage, the email provider, and the inbox to see where it stopped."
category: "Business websites"
author:
  type: "Person"
  name: "Matthew Wallace"
  url: "/about"
---

Before troubleshooting the missing email, look for inquiries that may already be waiting in the form's saved submissions or another receiving system. Have someone check which customers still need a reply, and keep a monitored phone number or email address visible while you investigate.

Then I'd send one labeled test and follow it through the system. A success screen doesn't tell you whether the request was stored, a notification was attempted, or the mailbox received it. Finding the first failed step is more useful than installing another mail plugin.

## Keep receiving inquiries while you investigate

If the form doesn't store submissions, check the processing and sending logs before assuming there is a backup. Record anything you can't establish. Use controlled test details rather than copying a customer's message repeatedly, and keep a list of any saved requests the team answers manually.

## Send one recognizable test

Tell the receiving person you're testing. Follow the normal visitor path and submit a valid request labeled **FORM-TEST-01**, using a return address you control. Record the form URL, time and time zone, and exact confirmation or error.

Start without attachments or unusual formatting. Test those separately after the ordinary path works. Give every later test a new label so a delayed message can't be mistaken for proof that the latest change fixed it.

## Check each stage separately

| Stage | Evidence |
| --- | --- |
| Browser | Exact displayed confirmation or error. |
| Saved request | Matching submission or business record, where storage is supported. |
| Notification attempt | Log of the team notification being attempted. |
| Sending service | Exact status, error, and message identifier. |
| Mailbox | Matching message, including spam or quarantine. |
| Ownership | Person responsible for responding. |

Missing access to a log leaves that stage unverified. It doesn't prove success or failure. Likewise, a service accepting a send doesn't prove inbox placement or staff action.

## If no saved request exists

First confirm whether the form is supposed to store submissions. An email-only form may have no submission list. In that case, inspect processing and send logs instead.

Where storage is expected, check the specific page and form. An old embed, duplicate page, or test form may have different settings. Another working form doesn't establish anything about this one.

Give the administrator the label, timestamp, URL, and browser result. Ask whether the request reached processing and whether validation or an application error stopped it. Solve that problem before changing mail delivery.

## If the request exists but no notification was attempted

Check notifications for that form: enabled status, recipient, and routing conditions. A new service option may not match an existing notification rule. Treat that as a possibility to test, not an assumed diagnosis.

Trace the team notification separately from the customer's acknowledgment. One can succeed while the other fails. If an automation sends the notification, inspect its result as well.

## If sending failed

Save the exact error and identify which service produced it. The website host, connector, sending provider, and destination mailbox may each have separate logs.

[Google Workspace's contact-form guidance](https://knowledge.workspace.google.com/admin/support/troubleshooting/troubleshoot-gmail-not-getting-contact-form-messages) directs administrators to check the provider's authentication method, relevant SPF or DKIM configuration, and SMTP credentials where used. The appropriate fix depends on the actual sender.

Have the responsible administrator review the configuration. Don't overwrite DNS with a generic example: the domain may have several legitimate sending services. Keep passwords and tokens out of screenshots and support notes.

## If the sender reports success but the inbox is empty

Check the destination address character by character. Inspect spam, quarantine, filtering, forwarding, and shared-mailbox settings. Where supported, ask the mailbox administrator to trace the message identifier.

A controlled test to another approved destination can narrow the problem without rerouting real inquiries. Preserve the original evidence before making changes. One successful comparison doesn't guarantee future delivery.

## A wrong-recipient example

In this fictional scenario, Cedar Lane Maintenance's coordinator Avery finds FORM-TEST-01 in saved submissions. The notification log shows it was addressed to a former team mailbox. The sending service accepted it, but the current shared inbox was never the destination.

The finding is an outdated recipient setting. It doesn't establish a capture failure or a domain-wide mail problem.

After correction, Avery sends FORM-TEST-02 and checks storage, notification destination, mailbox receipt, and the next assigned action. Earlier saved requests are reviewed separately. A successful new test doesn't clear the older unanswered requests.

## Record the evidence and retest

Use the **04 Form email delivery** sheet in the [business systems workbook](/resources/blog/wallace-shift-business-systems-worksheets.xlsx). Keep the URL, labels, timestamps, browser result, record identifier, recipient/rule, sending status, mailbox result, last confirmed stage, owner, proposed fix, and retest outcome.

Repeat the complete visitor path with a new label, then test important routing branches. Check earlier requests for missed follow-up. Before replaying interrupted actions, use the [recovery checklist](/blog/automation-failure-recovery-checklist) to avoid duplicates.

If you need help with a reproducible failure, [send Wallace Shift the observed checkpoints](/contact). A specific result gives the investigation somewhere useful to start.
