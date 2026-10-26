# What to Do When an Automation Fails: A Recovery Checklist

When an automation fails, first establish which work is affected and which actions already completed. Then choose how to finish the missing work without repeating completed records, messages, or other changes. Confirm the result in the receiving system before treating the incident as resolved.

The most useful first question is not “Which button restarts it?” It is “What happened to this customer's request?” A failed run can contain completed actions, while a successful-looking run may still leave business work unfinished.

This guide is for the person accountable for that work. Your platform's documentation or maintainer should provide the exact recovery controls for your setup.

## Start with the affected work

Write down the workflow, the approximate time the problem began, and one affected request identifier. Find the people waiting on the result: a customer expecting a reply, a coordinator expecting a task, or a field lead expecting an assignment.

If repeated attempts are creating more records or messages, have the responsible maintainer pause the affected processing. Establish where new requests will be retained while it is paused. Stopping an integration without preserving incoming work can create a second problem.

Choose one person to coordinate recovery. Others can investigate, but they should record what they change so two people do not independently complete the same request. If a customer needs attention now, that owner can arrange a manual response and record it for the technical recovery.

For wider decisions about operating responsibilities, our [automation tools guide](https://wallaceshift.com/blog/small-business-automation-tools) explains what to establish before relying on a workflow.

## Find the last confirmed result

Compare the workflow history with the receiving application. A log may say it tried to create a record. The CRM can show whether that record exists and what it contains.

Follow the particular request through each step. Note whether the evidence confirms completion, confirms failure, or leaves the result uncertain. Keep uncertainty visible until it is resolved.

| Intended step | Evidence to inspect |
| --- | --- |
| Receive the request | Original saved submission or source record |
| Find or create the customer | Matching customer record and its identifier |
| Record the inquiry | Inquiry linked to the correct customer and location |
| Assign the next action | Task, named owner, and understandable instruction |
| Send a message | The relevant message record and delivery information available from the sending service |
| Update a status | Current status and the history explaining its change |

A timeout deserves particular care. The sending system may not have received confirmation even though the destination changed. Zapier specifically identifies replay after timeout as a possible cause of duplicate data. [Zapier duplicate-data guidance](https://help.zapier.com/hc/en-us/articles/8496218141453-Zap-is-creating-duplicate-data)

Finding an existing record is not enough by itself. Check its identity and contents. A record for the same customer could concern a different site or request.

## Decide what needs to change before retrying

Some failures clear without changing the request. Others will repeat until someone corrects the underlying issue.

| What you found | Useful next decision |
| --- | --- |
| A required field is missing | Obtain or correct the information, or route the request for clarification |
| Connection access was removed | Have the authorized account owner restore the appropriate connection |
| A receiving service was unavailable | Check its current state and the platform's retry behavior |
| A record may already have been created | Confirm the destination before attempting another write |
| A completed step was followed by a failed step | Preserve the completed result and finish the missing action |
| The request has changed since the failure | Reassess what should happen now, using its current business status |

A made-up value is rarely a useful fix for missing business information. If the site is unknown, record that it needs clarification instead of assigning the customer's previous location. Getting the software past an error is different from making the request usable.

Age matters as well. A reminder that failed yesterday may be inappropriate after the customer replied this morning. Recovery should respect the current situation, not merely reproduce an earlier plan.

## Understand what the recovery command will repeat

Read the current documentation for the specific action you intend to use. A retry of an errored step and a restart of the entire workflow can have different effects.

Zapier distinguishes replaying errored steps from replaying an entire run. Its whole-run option starts again from the beginning. Check which action you are using and what earlier steps would execute again. [Zapier replay documentation](https://help.zapier.com/hc/en-us/articles/19220226086797-What-is-replay)

Make documents that storing incomplete executions is disabled by default and that stored runs can be resolved or retried through supported routes. Do not assume a failed run has been retained in the form you need. [Make incomplete executions](https://help.make.com/incomplete-executions)

An operator should explain how the planned recovery avoids duplicate work. Depending on the setup, that might mean checking an event identifier, finding the existing destination record, resuming a supported step, or completing one action manually and recording it.

If the result of an earlier action remains uncertain, investigate that uncertainty first. Repeating the entire process is not a substitute for finding out what already happened.

## A fictional timeout after an inquiry was saved

Cedar Lane Maintenance is a fictional business. Avery coordinates requests; Jordan leads field visits. Alder Studio, customer C-014, has L-01 Main studio and L-02 Workshop. Morgan Hale is its billing contact.

In this scenario, Morgan's form event F-102 requests an assessment at L-02. The workflow finds C-014 and creates inquiry I-102. The CRM saves it, but the confirmation does not reach the automation before its timeout. The workflow stops before creating Avery's task.

The following facts are invented to illustrate a recovery decision. They are not logs from a real integration or a demonstration we ran.

| Check | Fictional evidence | Decision |
| --- | --- | --- |
| Original request | F-102 is retained with Morgan's message and L-02 | Preserve it as the reference |
| Customer match | C-014 is the existing Alder Studio record | Do not create another customer |
| Inquiry write | I-102 exists and contains F-102 and the correct location | Keep the successful write |
| Next task | No task was created; the workflow did not reach that step | Complete the missing assignment |
| Customer contact | No automated reply was sent in this workflow; Avery confirms no manual reply yet | Agree who will respond now |
| Scheduled processing | A retry is still pending | Maintainer resolves that pending attempt before manual completion |

Avery and the maintainer agree to keep I-102 and create the missing task through the supported recovery route. If manual completion is necessary, Avery records the task identifier and how the pending automated action was handled.

Jordan is not assigned merely because the request exists. Avery still needs to establish the work and timing before a field visit is arranged.

Recovery is complete only when I-102 has the correct next action, Avery can find it in the work queue, and the pending retry will not recreate completed work. A note links the recovery to F-102 so a later reviewer can understand the sequence.

This example contains one successful write and one missing action. Restarting everything would ignore that difference.

## Check the rest of the affected period

Fixing the first example establishes a method. It does not establish that every affected request has the same problem.

List the requests received during the relevant period and compare them with the work recorded at the destination. Some may be complete, some partially complete, and some waiting before the first step. Separate repeated deliveries of one event from genuinely different requests.

| Request/event | Last confirmed result | Work remaining | Recovery owner | Evidence of completion |
| --- | --- | --- | --- | --- |
| | | | | |
| | | | | |
| | | | | |

Include any work completed manually while the automation was paused. Otherwise, restarting the backlog may contact a customer twice or create an assignment that someone already finished.

Return the workflow to ordinary operation using the maintainer's agreed procedure, then inspect a fresh request through to its destination. Keep unresolved exceptions assigned rather than declaring the entire incident closed because new runs appear healthy.

## Record the incident so the next one is easier

You do not need an elaborate report for every interruption. Keep enough information to explain the effect, the recovery, and the next improvement.

| Incident field | Your entry |
| --- | --- |
| Workflow and version/configuration | |
| First affected time and detection time | |
| Affected request identifiers | |
| Completed actions and uncertain outcomes | |
| Customer or staff work completed manually | |
| Cause established, or question still open | |
| Recovery decision and person responsible | |
| Destination evidence checked | |
| Change to prevent or detect recurrence | |

Prefer a concrete improvement to “monitor more closely.” It could be a retained submission identifier, a clearer owner alert, a better clarification route, or a check comparing incoming requests with assigned tasks.

The check should describe the business result. Make's Skip handler, for example, can mark a run successful while removing the affected item from that route. That may be intentional, but the status alone does not prove the customer's work was completed. [Make error-handling documentation](https://help.make.com/Overview-of-error-handling)

## Frequently asked questions

### Should I retry a failed automation immediately?

Only after understanding what the retry repeats and whether earlier actions completed. A temporary failure may be suitable for a supported retry; an uncertain write or changed customer request needs investigation first.

### Can I complete the work manually?

Yes, when the responsible person understands the remaining task and records the result. Coordinate any pending automated attempts so they do not repeat your manual work afterward.

### Does a successful run mean the incident is over?

It shows the platform reached its defined success state. Check the actual records, assignments, and affected backlog. Some requests may still need attention even after new runs succeed.

### Who should own failure recovery?

Name both the technical contact who understands the workflow and the business owner who knows the required result. One person may fill both roles, but the responsibilities should be explicit.

## Give existing workflows an operating owner

Wallace Shift's [managed automation service](https://wallaceshift.com/pricing#automation) covers monitoring, maintenance, failure recovery, and minor adjustments within the agreed scope. New workflows and substantial changes are scoped separately. Bring the affected process and its operating responsibilities to a [conversation about support](https://wallaceshift.com/contact).
