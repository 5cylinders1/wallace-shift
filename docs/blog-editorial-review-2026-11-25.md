# Blog editorial review — November 25, 2026

All 29 published posts are edited locally for review. Nothing was pushed, merged, or deployed.

## Source and scope

The current branch was `claude/legal-name-footer` at `8177293`, with a clean working tree. Its blog files predated the live rewrite. All 29 downloaded production article bodies matched the Markdown renderer output from local commit `f8bd8e9` exactly. Those newer sources were preserved before this pass; no unrelated branch changes were imported. The earlier root rewrite document was absent from this checkout and was not recreated.

The production index and local inventory contain the same 29 slugs: 7 automation, 8 CRM/business systems, and 14 website guides. No additional published posts were found. The sampled inventory is complete against the live index. All 29 live article descriptions and index excerpts also matched `f8bd8e9`; no current listing/article discrepancy was found.

Source of truth: `content/blog/posts/*.md`. `blog/content.ts` parses the frontmatter and regenerates HTML, heading IDs, and reading time. `blog/render.ts` produces the article, index, related cards, and shared components. `blog/publish.ts` generates canonical metadata, structured data, RSS, and sitemap entries.

## Shared changes

- Kept one short-answer panel; removed its repeated question heading and the separate visible article deck. Descriptions still supply listing/related excerpts, search/social metadata, and RSS.
- Removed the automatic article service panel and conversation promotion. Contextual article invitations and normal navigation/contact links remain. The blog index retains its conversation section.
- All authors now identify Matthew Wallace as a Person, consistent with the requested voice. The CraftJack passage still credits the team; it is not recast as a Wallace Shift case study.
- Preserved publication times, slugs, canonical targets, categories, and image metadata. Set modification fields to November 25, 2026, at 20:57:11 Central, the recorded edit time. Byline and structured data use the same source.
- Preserved all existing download assets and checked all 13 workbook sheet names. No worksheet figures or case identifiers were renamed.

## Per-post status

All rows are complete. “None” means no unresolved factual question was identified in this pass; platform behavior still needs testing in the specific customer account as the articles explain.

| Article | Main change | Material preserved | Unresolved factual questions |
| --- | --- | --- | --- |
| [AI or Rules-Based Automation? Test Your Inquiry Workflow First](../content/blog/posts/ai-vs-rules-based-automation-inquiries.md) | Complete: Brought the sticking door forward; explained who checks AI suggestions. | E01–E12, expected outcomes, tab 12, assessment versus booking | None |
| [What Should an Automation Audit Include? Scope, Deliverables, and Cost](../content/blog/posts/automation-audit-scope-deliverables-cost.md) | Complete: Led with what the owner receives; simplified the report review. | 72-minute estimate, scope/cost table, tab 07, no invented fees | None |
| [What to Do When an Automation Fails: A Recovery Checklist](../content/blog/posts/automation-failure-recovery-checklist.md) | Complete: Explained partial completion first; made recovery steps easier to scan. | Numbered sequence, timeout example IDs, pending retry, tab 10 | None |
| [How to Connect a Website Form to a CRM Without Losing the Handoff](../content/blog/posts/connect-website-form-to-crm.md) | Complete: Opened with a returning customer; replaced the closing inventory with a next step. | Field map, six paths, original request IDs, tab 02 | None |
| [How to Automate Client Onboarding Without Losing the Human Handoff](../content/blog/posts/automate-client-onboarding.md) | Complete: Shortened headings and separated reminders from duplicate prevention. | Client-says-yes opening, access invitations, stop rules, workflow brief | None |
| [Small Business Automation Tools: How to Choose What Fits](../content/blog/posts/small-business-automation-tools.md) | Complete: Added practical starting recommendations and explicit billing distinctions. | Native options, Zapier/Make/n8n/custom, failure trial, self-hosting duties | None |
| [Save Time With Automation: Which Tasks Should You Start With?](../content/blog/posts/save-time-with-automation-stop-losing-hours-to-busy-work.md) | Complete: Put the benefit before the caveat and recommended a modest first task. | Five candidates, PDF, 105 minutes/4.6 weeks, capacity versus cash | None |
| [A Contractor CRM Checklist for Johnson County’s 2027 Building Code Update](../content/blog/posts/johnson-county-2027-code-update-contractor-crm.md) | Complete: Kept the strong existing voice; clarified the jurisdiction lookup. | Verified adoption/effective dates, local limits, human code decisions | None |
| [Client Portal vs. CRM: Which Tasks Belong Where?](../content/blog/posts/client-portal-vs-crm-service-business.md) | Complete: Defined portal/CRM once and recommended checking existing customer features. | Customer/staff task table, allowed/denied actions, tab 11 | None |
| [CRM Implementation Cost: Build a Budget Around Your Actual Scope](../content/blog/posts/crm-implementation-cost-service-business.md) | Complete: Made scope choices explicit and kept the budget comparison central. | All cash totals/reserves, separate staff time, same-login example | None |
| [CRM Migration Checklist: Keep Customer History and Open Work Intact](../content/blog/posts/crm-migration-checklist-service-business.md) | Complete: Translated reconciliation into checks staff can perform. | First-morning opening, migration sequence, relationships and recovery | None |
| [CRM Requirements for a Service Business: A Practical Template](../content/blog/posts/crm-requirements-template-service-business.md) | Complete: Sharpened the second-location recommendation; retained the concise brief. | CRM-01–04 table, permissions, exception, buying/budget links | None |
| [Custom CRM vs. Off-the-Shelf: Test Your Workflow Before You Build](../content/blog/posts/custom-crm-vs-off-the-shelf.md) | Complete: Made the order of the buying decision explicit. | Technician phone task, four routes, export/history distinction, tab 03 | None |
| [Spreadsheet vs. CRM: When Should a Service Business Switch?](../content/blog/posts/spreadsheet-vs-crm-service-business.md) | Complete: Kept the absence test; left migration detail to its own guide. | Five practical tests, process/structure/tool distinctions, tab 05 | None |
| [Web App vs. Website: What Does Your Business Actually Need?](../content/blog/posts/web-app-vs-website.md) | Complete: Used one repair-business scenario and recommended existing software first. | Public/customer tasks, ongoing records, permissions, operating duties | None |
| [Contact Form Says “Sent,” but No Email Arrives: What to Check](../content/blog/posts/contact-form-not-sending-email.md) | Complete: Started with missed inquiries and a working contact route. | Storage/send/mailbox separation, labeled tests, DNS caution, tab 04 | None |
| [How to Track Website Inquiries Through to Qualified Leads](../content/blog/posts/track-website-inquiries-qualified-leads.md) | Complete: Restored the worked counts as a table and clarified pending decisions. | CraftJack team attribution, six-event unknown, unknown sources, 62.5% | None |
| [What Is the Best Website Platform for a Service Business?](../content/blog/posts/best-website-platform-for-service-businesses.md) | Complete: Added starting options by need ahead of the practical trial. | First-person opening, platform limits, same-task trial, portability | None |
| [Custom Website vs. Template: Choose Around Your Requirements](../content/blog/posts/custom-website-vs-template.md) | Complete: Made standard pages plus one custom feature the starting point. | Design/editing/function distinction, trial/checklist, separate cost guide | None |
| [How to Choose a Web Design Agency: A Practical Evaluation Guide](../content/blog/posts/how-to-choose-a-web-design-agency.md) | Complete: Turned proposal language into questions for a call. | Different client workloads, proposal table, evidence and reference checks | None |
| [Is a Custom Website Worth the Cost? A Practical Comparison](../content/blog/posts/is-a-custom-website-worth-the-cost.md) | Complete: Made the worked spending difference the central question. | Hypothetical 24-month table, $2,400 capacity, cash/time distinction | None |
| [Should You Rebrand or Redesign Your Website? Start With What Changed](../content/blog/posts/rebrand-or-redesign-website.md) | Complete: Led with business examples and a clear recommendation. | Rebrand/clarification/refresh/redesign/repair, separate domain decision | None |
| [Squarespace vs. a Custom Website: Should Your Business Move?](../content/blog/posts/squarespace-vs-custom-website.md) | Complete: Gave a clear stay recommendation and spelled out export limits. | Improve/extend/replace, integrations/support, migration and portability | None |
| [Web Design Agency vs. Freelancer: Which Fits Your Project?](../content/blog/posts/web-design-agency-vs-freelancer.md) | Complete: Removed repetitive balancing and led with client coordination needs. | Continuity, support, access/ownership/portability, responsibility sheet | None |
| [Webflow vs. WordPress for a Small Business: Which Fits Your Team?](../content/blog/posts/webflow-vs-wordpress-for-small-business.md) | Complete: Explained practical fit and linked to specialist inquiry checks. | Staff-editing trial, block-theme condition, backup/export distinctions | None |
| [Website Credibility and Trust: What Makes a Business Look Reliable?](../content/blog/posts/website-credibility-and-trust.md) | Complete: Started with customer questions and replaced abstract categories with fixes. | Genuine evidence/testimonials, author details, realistic contact promises | None |
| [Why Your Website Is Not Generating Inquiries: Find the Actual Bottleneck](../content/blog/posts/why-your-website-is-not-generating-inquiries.md) | Complete: Made the diagnostic order explicit with a first action. | Measurement limits, traffic context, qualification, follow-up | None |
| [Website Redesign Strategy: What to Prioritize First](../content/blog/posts/website-redesign-strategy-what-to-prioritize-first.md) | Complete: Led with fixing and preserving; simplified diagnostic language. | Planning PDF, content owners, redirects/indexing, production checks | None |
| [What Should a Service Business Website Include to Get More Inquiries?](../content/blog/posts/what-your-service-website-must-have-to-get-more-inquiries.md) | Complete: Kept the broad starting guide accessible and shortened measurement detail. | Service/proof/contact/mobile/follow-up, PDF, specialist links | None |

## Fact checks and evidence

Primary sources were checked on November 25, 2026. These checks support the published wording, not claims of testing the vendors in a customer account.

- [Johnson County](https://www.jocogov.org/department/building-codes/code-regulation-building-and-construction): adopted November 12, 2026; effective January 1, 2027; applicability limited to covered unincorporated areas. The newer adopted wording remains.
- [Squarespace custom code](https://support.squarespace.com/hc/en-us/articles/205815928-Add-custom-code-to-your-site) and [export](https://support.squarespace.com/hc/en-us/articles/206566687-Export-your-site-content): server-side code limitation and incomplete content/style export retained.
- [Wix hosting](https://support.wix.com/en/article/exporting-or-embedding-your-wix-site-elsewhere): working sites depend on Wix hosting; domain ownership is distinct.
- [Webflow export](https://help.webflow.com/hc/en-us/articles/33961386739347-How-do-I-export-my-Webflow-site-code): paid Workspace requirement, no working CMS or form processing in code exports. Site plans alone do not grant code export.
- [WordPress Site Editor](https://wordpress.org/documentation/article/site-editor/) and [backups](https://developer.wordpress.org/advanced-administration/security/backup/): block-theme requirement; full restoration needs files and database.
- [Zapier task usage](https://help.zapier.com/hc/en-us/articles/8496181445261-Zap-limits) and [replay](https://help.zapier.com/hc/en-us/articles/19220226086797-What-is-replay): successful-action billing and failed-step versus whole-run distinction.
- [Make credits](https://help.make.com/credits) and [incomplete executions](https://help.make.com/incomplete-executions): credits and variable AI usage; incomplete execution storage must be enabled.
- [n8n deployment](https://docs.n8n.io/choose-how-to-use-n8n/) and [pricing](https://n8n.io/pricing/): Cloud versus self-hosting responsibilities and execution-based paid pricing.
- [HubSpot pricing](https://www.hubspot.com/pricing/sales), [form automation](https://knowledge.hubspot.com/forms/form-automations), [imports](https://knowledge.hubspot.com/import-and-export/set-up-your-import-file), and [exports](https://knowledge.hubspot.com/import-and-export/export-records): plan-dependent charges/actions, repeated enrollment, identifiers, and separate activity export paths.
- [Jobber client hub](https://www.getjobber.com/features/client-hub/): customer-facing features exist within the broader product; no claim that its permissions meet every example.
- [Pipedrive import](https://support.pipedrive.com/en/article/importing-data-into-pipedrive-with-spreadsheets) initially failed direct retrieval; official search results and [skip-file documentation](https://support.pipedrive.com/en/article/importing-errors-and-skip-files) resolved the review-checkpoint claim. No blocker remains.
- [Salesforce relationships](https://help.salesforce.com/s/articleView?id=overview_of_custom_object_relationships.htm&language=en_US&type=5): official documentation/search confirms relationship-dependent behavior. No guarantee about a proposed customer configuration.
- [Calendly workflows](https://calendly.com/learn/calendly-workflows), [GA4 form events](https://support.google.com/analytics/answer/9216061?hl=en), [Workspace form mail](https://knowledge.workspace.google.com/admin/support/troubleshooting/troubleshoot-gmail-not-getting-contact-form-messages), and [Google site moves](https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes) checked for retained claims.
- Actual Wallace Shift scope references checked against `src/content/pricing.ts`. No illustrative price was converted into a company quote or a market average.

## Numerical and content review

- Automation: 150 − 30 − 15 = 105 minutes weekly; 480 ÷ 105 ≈ 4.6 weeks of time-only break-even.
- CRM: $5,100/$11,400 setup; $270/$400 monthly; first-year $8,340/$16,200; three-year $14,820/$25,800. Reserves produce $8,850/$17,340 envelopes. Staff time remains separate.
- Website: $9,540/$14,670 cash; $11,040/$16,920 planning totals; differences $5,130/$5,880. Two hours monthly for 24 months at $50 gives $2,400 of illustrative capacity value.
- Tracking: 44 − 4 = 40; 25 + 10 + 5 = 40; 25 ÷ 40 = 62.5%. Six browser events remain unexplained. No visitor-to-inquiry conversion is inferred.
- E01–E12 and their expected outcomes remain in the rendered table. Cedar Lane/Alder Studio references and workbook tabs remain consistent.
- Openings, headings, and endings reviewed across the collection. Strong newer passages received light edits; recovery, buying, budgeting, and starting-guide structures remain distinct.

## Validation and preview

- `npm run test:blog`: passed (15 content/rendering tests and 4 draft-preview tests). Rendering assertions cover a single answer panel, no repeated question or deck, no generic article promotions, and synchronized abstract metadata.
- `npm run build`: passed, including deployment checks, TypeScript, both Vite builds, blog, SEO, demo, and marketing-entry verification.
- `git diff --check`: passed.
- All 29 routes returned HTTP 200 in local Chrome; checked one H1, author, modification schema, and working table-of-contents targets on every article. Checked all 29 entries in index, feed, and sitemap.
- Checked all 39 unique root-relative article links and fragments against built files. PDF and XLSX responses have the correct file signatures; all four referenced resource files exist.
- Desktop (1440px) and mobile (390px) previews checked for the long Johnson County title, the twelve-case AI table, and the automation worksheet article. No page-wide horizontal overflow. Tables retain their existing horizontal scroll behavior.
- Browser review blocked external requests to avoid analytics and chat activity; third-party widgets and web-font loading were not validated in that run. No real form submission or inquiry was sent.

Local preview: http://127.0.0.1:4176/blog

Screenshots and per-route review output: `/tmp/ws-blog-editorial-review/`. These are local review artifacts, not deployment assets.

Commit message: `Edit all blog posts in Matthew Wallace’s voice and simplify article introductions`
