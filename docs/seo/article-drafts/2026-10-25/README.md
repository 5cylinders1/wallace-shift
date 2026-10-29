# Wallace Shift: 12 article source drafts

These are the 12 original editorial drafts from the [research plan](../../2026-10-25-next-articles.md). They contain complete prose, worked examples, copyable resources, FAQs, and links to supporting sources. Together they contain approximately 21,000 words, including tables and references.

The source drafts remain here for reference. On October 26, 2026, they were converted into post files in [the blog content directory](../../../../content/blog/posts), with Wallace Shift as the organizational author and publication metadata for October 26. The post files are included in the next site build; conversion does not mean they have been deployed to production.

## Read the articles

The order below follows the research plan's recommended writing and publishing priority. Each article stands on its own.

| Order | Article | Focus |
| --- | --- | --- |
| 1 | [CRM Requirements for a Service Business: A Practical Template](crm-requirements-template-service-business.md) | Define records, responsibilities, workflows, and acceptance tests. |
| 2 | [How to Connect a Website Form to a CRM Without Losing the Handoff](connect-website-form-to-crm.md) | Map fields, assign work, and handle duplicate deliveries and failures. |
| 3 | [Custom CRM vs. Off-the-Shelf: Test Your Workflow Before You Build](custom-crm-vs-off-the-shelf.md) | Compare buying, configuring, extending, and building on the same tasks. |
| 4 | [Contact Form Says “Sent,” but No Email Arrives: What to Check](contact-form-not-sending-email.md) | Trace a submission through storage, sending, and mailbox delivery. |
| 5 | [Spreadsheet vs. CRM: When Should a Service Business Switch?](spreadsheet-vs-crm-service-business.md) | Evaluate the current process through five practical customer tasks. |
| 6 | [CRM Implementation Cost: Build a Budget Around Your Actual Scope](crm-implementation-cost-service-business.md) | Separate setup, recurring charges, reserve, and internal effort. |
| 7 | [What Should an Automation Audit Include? Scope, Deliverables, and Cost](automation-audit-scope-deliverables-cost.md) | Evaluate evidence, deliverables, exclusions, and cost drivers. |
| 8 | [CRM Migration Checklist: Keep Customer History and Open Work Intact](crm-migration-checklist-service-business.md) | Rehearse and reconcile records, relationships, ownership, and open tasks. |
| 9 | [How to Track Website Inquiries Through to Qualified Leads](track-website-inquiries-qualified-leads.md) | Reconcile browser events, received requests, distinct inquiries, and outcomes. |
| 10 | [What to Do When an Automation Fails: A Recovery Checklist](automation-failure-recovery-checklist.md) | Recover missing work without repeating completed actions. |
| 11 | [Client Portal vs. CRM: Which Tasks Belong Where?](client-portal-vs-crm-service-business.md) | Separate customer access from internal ownership and recordkeeping. |
| 12 | [AI or Rules-Based Automation? Test Your Inquiry Workflow First](ai-vs-rules-based-automation-inquiries.md) | Compare rules and bounded AI tasks with 12 synthetic inquiry cases. |

## Companion resources

- [Article worksheets workbook](outputs/01a170df-bb4d-7da1-bebf-b8f3dfc3394e/Wallace-Shift-Article-Worksheets.xlsx): a start sheet and one worksheet per article, including an editable CRM budget calculator. Blank response cells let readers apply the prompts to their own business.
- [Original proposed article metadata](article-metadata.json): the planning snapshot used for conversion. The frontmatter in each blog post is now authoritative for publication metadata.
- Editorial source and consistency notes: [CRM articles](_crm-review.md), [automation articles](_automation-review.md), and [website, migration, measurement, and portal articles](_website-systems-review.md).

The shared Cedar Lane Maintenance example is fictional. Budgets are illustrative calculations, not vendor quotes or Wallace Shift pricing. The AI worksheet contains expected outcomes for a future evaluation; no model run or customer result is claimed.

## Blog conversion

The post versions use the existing blog format, retain the researched body and sources, and provide the direct answer through the article template. They include contextual links among the new posts and to existing articles. Four existing guides also link into the new set.

Each new post names its matching sheet and links to the shared workbook, served from `/resources/blog/wallace-shift-business-systems-worksheets.xlsx`. The public workbook is an exact copy of the reviewed source workbook above.

The original drafts and proposed metadata here are retained as editorial records. Future published-content edits belong in `content/blog/posts`, rather than in these source drafts.

Conversion checks passed: all 18 blog tests and the full site build, including the 28-post blog verification. The emitted new pages have valid local links and section anchors; the workbook's source, public copy, build output, and local HTTP download are byte-identical. Production attachment headers are configured for the workbook's exact URL and take effect on deployment.

Browser visual review remains unverified: both browser connections failed to reach the local preview. The build and file checks above passed; no deployment was performed in this conversion pass.

Suggested commit message: `feat(blog): add twelve CRM and automation guides with worksheets`
