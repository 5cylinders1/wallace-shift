# Client Portal vs. CRM: Which Tasks Belong Where?

A CRM helps your team coordinate customer information and work. A client portal gives customers access to selected information and actions. You may need one, both, or the portal already included in your existing software. Start with the task that is failing, then decide where it belongs.

If staff cannot find the current job owner, a customer login will not resolve that internal problem. If the team has reliable records but customers repeatedly need to request documents or check appointments, customer access may be the missing piece.

The useful question is not which category is better. It is what the customer should be able to do, what staff must do behind that action, and which existing system can support the whole journey.

## Separate customer access from internal coordination

Write down a recent task that was difficult for the customer or the team. Describe the actor, information, action, and expected result.

“Improve communication” is too broad to evaluate. “Let the billing contact retrieve the current invoice for an authorized location without asking Avery to resend it” gives you something concrete to test.

| Task | Responsibility to investigate |
| --- | --- |
| Find every open request with no owner | Internal CRM or work-management process |
| Request a change to a quote | Customer action plus an internal review workflow |
| See an agreed appointment | Customer access to the appropriate schedule information |
| Reassign a job when a coordinator is absent | Internal ownership and permissions |
| Retrieve a customer-visible document | Controlled customer access and a reliable document source |
| Decide what happens after a cancellation | Shared workflow rules, including staff action |

Several tasks cross the boundary. A portal button can begin a process without completing it. The design needs to show what happens next and who is responsible.

## Check the portal you may already have

Review the current product before commissioning another application. Ask the provider to demonstrate your actual customer task, including an exception, using the plan and permissions you would use.

For example, Jobber describes a client hub supporting work requests, quote actions, appointment information, and payments. That demonstrates that customer access can be part of a broader service-business product. It does not establish that every permission or workflow you need is included. [Jobber's client-hub overview](https://www.getjobber.com/features/client-hub/).

Keep a record of what is available now, what needs configuration, what depends on a different plan, and what the demonstration did not establish. “Has a portal” is a category label, not an acceptance result.

If the existing tool completes the task adequately, use that evidence. Custom development should address a specific unresolved requirement, not follow automatically from wanting a more distinctive login page.

## Map the information before designing screens

Identify the records the customer needs and how they relate. A service business may distinguish the customer organization, individual contacts, service locations, jobs, quotes, appointments, and invoices.

Those distinctions matter when access differs. A billing contact may need invoices for two locations without having authority to approve every quote. A site contact may need appointment details for one location without seeing the organization's whole account.

Choose where each record is maintained. If a customer changes information in the portal, decide which system receives the update and how the team knows it happened. If staff change it internally, decide what the customer sees and when.

Avoid creating a second independently maintained copy unless there is a clear operating reason and a reconciliation plan. A polished interface displaying outdated work can create a new coordination burden.

Our [website versus web-app guide](https://wallaceshift.com/blog/web-app-vs-website) helps define when the requirement extends beyond public information into records, access, and operational behavior.

## Define permissions as actions on particular records

“Customer access” is too imprecise for a useful brief. Describe who can view, request, change, approve, or download which information, under what conditions.

OWASP recommends least privilege and permission checks on every request. It also warns against relying on browser-side controls as the decisive access check. Hiding a button is not enough to establish that a protected action is unavailable. [OWASP's authorization guidance](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html).

For planning, turn each permission into an expected result. Include both something the user should be able to do and something they should not. Ask the implementation team to demonstrate those results in the actual system.

A permission worksheet is a requirements tool, not evidence that an untested application is secure. Keep technical verification as part of the implementation scope.

## A fictional example: Alder Studio has two service locations

Cedar Lane Maintenance is a fictional service business. Avery coordinates work, and Jordan is the field lead. Their fictional client Alder Studio, `C-014`, has a main studio, `L-01`, and a workshop, `L-02`. Morgan Hale, `P-021`, is the billing contact.

Job `J-101` is scheduled at the main studio. Job `J-102` at the workshop is awaiting a customer decision. Cedar Lane wants Morgan to retrieve invoices and see agreed appointment information for both locations.

For this exercise, Morgan's billing role does **not** automatically include quote approval. Cedar Lane must identify the authorized decision maker before enabling that action. This is an example business rule, not a universal rule for billing contacts.

| Actor and task | Expected result in this fictional plan |
| --- | --- |
| Morgan views Alder Studio invoices | The permitted invoices are available, with their location identifiable |
| Morgan opens the main-studio appointment | The agreed customer-facing details for `J-101` are visible |
| Morgan attempts to approve the workshop quote | Approval is unavailable until the business grants that authority |
| Morgan requests a change | Avery receives an owned review task; the request does not silently rewrite the agreed work |
| Jordan opens the assigned main-studio job | The information needed for the field task is available under the agreed staff permissions |
| An unrelated customer opens Alder Studio's job link | Access is denied, including when the link is opened directly |

These are expected outcomes for a planning exercise. They have not been demonstrated in a particular portal, and they are not a Wallace Shift customer case study.

The exercise is useful because it turns “we need a portal” into visible requirements. A built-in portal might satisfy them, need a simpler operating arrangement, or reveal a specific gap worth discussing.

## Test changes in the work, not only the first login

A first-login demonstration usually shows clean data in an ordinary state. Also test what happens when the work changes.

For a revised quote, show which version the customer can act on and what happens to an older link. For a canceled appointment, show the customer-facing status and the staff task. For a reassigned job, confirm the new owner receives the next action.

Test a contact leaving the customer organization. Decide who removes access, what happens to previously issued links, and how shared billing responsibility is transferred. Do not assume every product handles these situations the same way.

Ask how the team handles an action that reaches the portal but fails before updating the internal system. The customer needs an accurate result, while staff need a visible item to investigate. Repeatedly clicking should not be the operating procedure for uncertain work.

## Compare three practical routes

**Configure the existing product.** This is worth testing first when the product already holds the relevant records and its customer features meet the requirement. Confirm permissions, plan dependencies, document handling, and the staff workflow rather than assuming they fit.

**Connect a separate portal.** This can help when the existing CRM remains useful but its customer interface cannot complete a necessary task. Define record ownership, connection access, synchronization, failure handling, and responsibility for ongoing support.

**Build a focused portal or system.** Consider this when a specific workflow or access requirement remains unresolved after the other routes are assessed. Include implementation, testing, hosting, support, and future changes in the scope. Building the screens is only part of the responsibility.

The best route for the current task may still leave a manual step. Make that step explicit and decide whether its effort is acceptable. Removing a small manual action is not automatically worth adding a new application and connection.

## Copy this portal decision worksheet

| Question | Your answer and evidence |
| --- | --- |
| Customer task and current difficulty | |
| Internal work required after the action | |
| Existing product and exact plan evaluated | |
| Authoritative record and system | |
| Customer, contact, location, and job relationships | |
| Allowed view/change/approval actions | |
| Explicitly denied actions | |
| Changed quote, cancellation, and reassignment behavior | |
| Access removal and ownership | |
| Failed connection or uncertain outcome procedure | |
| Demonstration result and unresolved gap | |
| Operating cost, support owner, and chosen route | |

Use the worksheet with your provider, developer, and the staff who handle the work. Include a customer task in the evaluation, while avoiding real customer data when synthetic records will do.

If the task is collecting information after a customer agrees to proceed, our [client-onboarding automation guide](https://wallaceshift.com/blog/automate-client-onboarding) helps define the process behind the portal.

## Frequently asked questions

### Does a CRM replace a client portal?

It may include one. Compare the actual customer actions and access rules rather than treating the names as mutually exclusive categories. An internal CRM can also be useful without providing customer access.

### Should every client have a login?

Only when ongoing access helps complete a real task. A customer who needs one document may be adequately served by a simpler supported process. Consider the effort of access, support, and keeping information current.

### Can we give customers access to our internal dashboard?

Do not assume staff access rules are suitable for customers. Define a limited customer view and test the underlying permissions. Customers should receive only the information and actions the business has deliberately authorized for them.

### When does a custom portal make sense?

When a specific, important requirement remains unresolved by configuration or an appropriate existing product, and the business accepts the operating responsibility. Establish that gap through a demonstration before treating a custom build as the answer.

## Define the customer task before choosing the software

A useful portal connects a permitted customer action with reliable internal work. If you need help deciding where those responsibilities belong, [explore Wallace Shift's system-definition services](https://wallaceshift.com/services#web-apps).
