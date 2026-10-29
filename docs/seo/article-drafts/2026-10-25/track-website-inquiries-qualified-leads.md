# How to Track Website Inquiries Through to Qualified Leads

Track website inquiries by defining separate stages: a visitor's contact action, a received request, a distinct inquiry, a qualification decision, and a business outcome. Give each stage a reliable evidence source, test the path, and reconcile the counts. A button click or form event should not stand in for all five stages.

The result should help you answer practical questions. Are requests reaching the team? Which ones fit the service? Who owns the next action? Which sources can you identify, and which remain unknown?

You can begin with a structured inquiry log. A more elaborate dashboard is useful only when its definitions and inputs are trustworthy. If the wider issue is why the site produces few useful requests, our [inquiry-diagnosis guide](https://wallaceshift.com/blog/why-your-website-is-not-generating-inquiries) provides the broader investigation.

## Define an inquiry before choosing an event name

Write a short definition the receiving team can apply consistently. For example: “A request for a service decision or response, received through an agreed business channel.” Then define which requests belong in the report you are making.

A new-business report may exclude customer support, job applications, obvious spam, and controlled tests. A returning customer's new project might still be a genuine sales inquiry. Decide this deliberately rather than equating every known contact with a duplicate.

Record the reporting period, time zone, and inclusion rules. If the rules change, note the effective date. A sudden improvement caused by reclassifying unsuitable requests is different from an improvement in the website or sales process.

Keep “received” separate from “qualified.” A business can receive a valid inquiry that concerns a service or location it does not support.

## Map each stage to evidence

| Stage | Evidence and limitation |
| --- | --- |
| Contact action | A form interaction, phone-link click, or booking interaction; this describes an action rather than its whole outcome |
| Received request | A saved submission, booking record, or other receiving record appropriate to the channel |
| Distinct inquiry | A request identity after repeated deliveries and known test records are handled |
| Qualification | A recorded decision against agreed service criteria, including pending decisions |
| Next action and outcome | Assigned follow-up, scheduled conversation, quote, or another defined business result |

Not every system exposes every stage. Mark unavailable evidence instead of inventing a complete funnel. For phone calls, distinguish tapping a number from a call record, an answered call, and a useful conversation. For bookings, distinguish opening a calendar from an accepted appointment.

Choose a person to maintain the definitions. Otherwise “lead” may mean a click to the marketing report, a contact to the CRM, and a priced opportunity to the owner.

## Use analytics events for the action they represent

Google Analytics enhanced measurement distinguishes `form_start` from `form_submit`. These events describe interactions with a form; their presence is not an independent receipt from your CRM or mailbox. Check the actual form and configuration. [Google's enhanced-measurement documentation](https://support.google.com/analytics/answer/9216061?hl=en).

GA4 also defines recommended events such as `generate_lead` and `qualify_lead`. Recommended events require implementation; their names do not make them appear automatically or establish that your business rules were met. [Google's recommended-event documentation](https://support.google.com/analytics/answer/9267735?hl=en).

Before changing tracking, write down the intended trigger and how you will verify it. For a received inquiry, that might involve confirming that the receiving system accepted the request. The appropriate implementation depends on the website and destination system.

If you cannot connect those systems yet, keep separate reports with their limitations stated. An honest partial view is more useful than a single number that silently mixes different actions.

## Keep inquiry identity separate from contact identity

One person can make several requests over time. One request can also generate several delivery attempts, notifications, or analytics events.

Where the systems support it, use a stable submission or inquiry identifier in the internal handoff. Record how repeated deliveries are recognized, and preserve a new request even if its contact already exists. If two records are only suspected duplicates, flag them for review rather than quietly deleting one.

Keep the reconciliation log within the appropriate business systems. Google prohibits sending personally identifiable information such as email addresses and personal mobile numbers to Analytics; information can also leak through page URLs and titles. Check event parameters and URLs against [Google's PII guidance](https://support.google.com/analytics/answer/6366371?hl=en).

You do not need to copy raw customer messages into analytics to establish that a received inquiry exists. Decide which system holds the sensitive detail and what the reporting system genuinely needs.

## Define qualification using information the team can verify

Choose criteria that relate to the service decision: work requested, service area, customer type, timing, or another relevant requirement. Do not label a request unsuitable merely because a required fact is missing.

Use at least three outcomes: qualified, unsuitable with a reason, and pending clarification. Record the owner and date of the decision. “Pending” is useful information about work still to do, not a defect to hide from the report.

If budget or timing is uncertain, document the unanswered question and next action. Avoid changing the qualification rule to match whichever figures look best that week.

This is where the inquiry log begins to connect with operations. The [automation starting-point guide](https://wallaceshift.com/blog/save-time-with-automation-stop-losing-hours-to-busy-work) explains how to define repeated handoffs before selecting a tool to handle them.

## Test the path before trusting the report

Create clearly labeled synthetic requests with the receiving team's knowledge. Follow each from the public page to its receiving record and next action.

Use these cases as an initial test set:

- A normal valid request that should create one distinct inquiry.
- An invalid form that should not count as an accepted request.
- A repeat delivery of the same request that should not create another distinct inquiry.
- A new request from an existing contact that should remain separate.
- A failed receiving step that should remain visible as a failure or unknown outcome.
- A qualification decision that changes from pending only after the missing information arrives.

Record what actually happens. Reloading a confirmation page, browser navigation, or connector retries are hypotheses to investigate when counts differ; they are not explanations until evidence supports them.

Exclude controlled tests from business results through a documented method. Keep their evidence separately so the next person can repeat the check after a change.

## A fictional week: 50 events do not mean 50 leads

Consider Cedar Lane Maintenance, a fictional service business. Avery reviews one invented week's website-form reporting. These numbers are teaching examples, not measured results or a benchmark.

| Count | What it represents in this example |
| --- | --- |
| 50 browser events | Recorded contact-form events in the reporting period |
| 44 saved submission-delivery records | Received delivery records, including repeats; not 44 unique requests |
| 4 repeated delivery records | Extra deliveries associated with already counted inquiry identifiers |
| 40 distinct inquiries | 44 saved records minus the 4 repeated deliveries |
| 25 qualified | Inquiries meeting the fictional business's agreed criteria |
| 10 unsuitable | Reviewed inquiries with a recorded reason |
| 5 pending | Inquiries requiring clarification before a decision |

The receiving records reconcile: **44 − 4 = 40**. The qualification states also reconcile: **25 + 10 + 5 = 40**.

However, the six-event difference between 50 browser events and 44 saved records remains unexplained. It is not proof of six lost inquiries. Avery needs evidence about the event definitions, repeated events, rejected requests, reporting boundaries, and the receiving path before assigning a cause.

The qualified share of distinct received inquiries is **25 ÷ 40 = 62.5%** at that point. It is not the website's visitor-to-inquiry conversion rate: this example contains no suitable visitor denominator. Five decisions also remain pending, so the qualified share can change as the team completes its work.

Morgan Hale, the fictional billing contact for Alder Studio, might submit a new request for its second location. That request should not disappear merely because Morgan and Alder Studio already have records. Contact identity and inquiry identity answer different questions.

## Copy this inquiry measurement sheet

| Definition or check | Your record |
| --- | --- |
| Reporting period and time zone | |
| Included inquiry types and exclusions | |
| Channel and intended browser action | |
| Event name and exact trigger | |
| Receiving system and evidence | |
| Distinct inquiry identifier or matching rule | |
| Repeat-delivery and test treatment | |
| Qualification criteria and pending state | |
| Source when known; unknowns retained | |
| Owner and next action | |
| Controlled-test outcome | |
| Unreconciled differences and investigation | |

For each period, preserve both the counts and the definitions used to produce them. Add a note when a form, event, connector, or qualification rule changes. That context matters when comparing one period with another.

## Frequently asked questions

### Can I count every form submission as a qualified lead?

No. A recorded submission may be a test, a repeat delivery, or a request outside the service. Qualification requires agreed criteria and a recorded decision. Keep requests awaiting clarification visible.

### Is a phone click the same as a call?

No. It records an attempt to open the calling action. A call record, an answer, and a useful conversation are different evidence. Report only the stages your actual systems can establish.

### Why do analytics and the CRM disagree?

They may measure different events, use different reporting boundaries, or handle repeats differently. A technical failure is another possibility. Compare definitions and trace controlled examples before deciding which explanation applies.

### Can we do this without a new CRM?

Yes. Begin with a controlled inquiry log and the receiving records you already have. A CRM or integration becomes useful when it solves a demonstrated coordination or reporting requirement; it does not replace clear definitions.

## Make the next report answer a business question

Measure whether a request arrived, whether it fits, and what happened next. For help defining the connection between your website, receiving team, and reporting, [discuss the handoff requirement with Wallace Shift](https://wallaceshift.com/contact).
