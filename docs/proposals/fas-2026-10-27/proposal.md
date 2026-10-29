# FAS website development proposal

Wallace Shift LLC

Prepared for the Federation of American Scientists

Revised October 27, 2026

Dear FAS selection team,

Thank you for the opportunity to revise my proposal. This version reflects the removal of the microsite template and navigation work. I would remain your project lead, designer, and developer throughout the engagement.

The work I would prioritize is the work your staff repeats: publishing research, adding visual material, keeping program pages current, and making small site changes without opening a developer ticket. I would extend the existing theme and editing tools, with new components that feel like part of FAS's current website.

My proposed fixed fee is **$9,900**, with final delivery by **May 31, 2027**. It covers the defined A–C deliverables in this proposal, documentation, staff training, and a 60-day defect warranty. Optional maintenance is available for **$750 per month** after the project.

The revised fee is $4,600 lower than my original proposal. I propose implementing the media components, social-content module, and administrative improvements on FAS.org. The RFP still names three sister sites; extending the new components to those properties is outside this fee and requires a separately approved scope. I request FAS's written agreement to that boundary.

I have included four live examples of my custom WordPress work, including a nonprofit website. You would work directly with me on design decisions and implementation. At each review, I would show what staff can actually edit and publish, with enough detail for your team to decide whether the work is ready.

Thank you for considering Wallace Shift.

Matthew Wallace

Proposed project lead · Wallace Shift LLC

[matthew@wallaceshift.com](mailto:matthew@wallaceshift.com) · [wallaceshift.com](https://wallaceshift.com)

Authorized representative signature

<!-- signature: output/assets/matthew-wallace-signature-transparent.png -->

Title: Owner · Date: 10/26/26

<!-- pagebreak -->

# Reusable publishing tools

## A Photo video and data components

I propose four reusable components within FAS.org's existing WordPress theme: an image carousel, an image grid, a video embed, and a featured data visualization. Each will use the site's existing typography, spacing, and visual conventions. I will review the theme and current editor first, then choose a custom block or template approach that fits how FAS already publishes.

The components will expose the fields staff need, such as images, captions, alternative text, headings, source links, and embed URLs. Layout choices will be limited enough to keep pages consistent while allowing staff to reuse the components in different contexts. Carousels will have keyboard controls and will not advance automatically by default.

The data component will support a responsive embed from FAS's existing Datawrapper or Tableau workflow, with space for a title, source, and accessible text or table alternative. Creating new datasets, custom chart engines, and recreating existing charts are outside this base item.

**Acceptance:** A FAS editor can add, edit, reorder, and remove each component on supported FAS.org pages and posts without editing code. We will demonstrate the components with FAS content at desktop and mobile widths and provide written instructions for each.

## B Social content on key page types

I recommend staff-selected posts from FAS's Instagram, LinkedIn, and X accounts, using supported embeds where available. Staff will select or replace a post through WordPress fields. This is a documented manual publishing process, submitted for FAS approval, rather than a subscription to an automated social feed.

One reusable social-content module will be available on the homepage, staff and fellow biography templates, and publication templates. A shared default can display FAS content across those templates; editors can choose different posts where needed. This avoids maintaining a separate account connection for every staff member or fellow.

Embeds will load only when needed. Each platform will have a readable fallback with an approved image or text excerpt and a source link if embedding is unavailable or fails the agreed accessibility or performance checks. The final presentation and staff workflow will be approved during planning.

**Acceptance:** Content from all three named platforms appears on the agreed page types, and a FAS editor can change it using the documented workflow. The base price assumes no new paid social-feed service or API subscription. Automated feeds, individual staff-account feeds, and bulk population of historical pages are not included.

<!-- pagebreak -->

# Site administration and delivery schedule

## C Everyday site administration

On FAS.org, I will make footer links editable through WordPress, including social platforms and other external destinations. I will provide a WordPress-managed redirect workflow using an existing suitable tool or a supported free alternative, and display assigned publication tags through the publication template.

**Acceptance:** An authorized FAS editor can change a footer link, create and test a redirect, and see assigned tags on a publication without a code change. Documentation will cover permissions and the checks staff should make before publishing these changes.

## Boundaries of the base fee

FAS.org receives items A–C. Discovery includes a review of heatagenda.us, cri.fas.org, and essentialdata.us to establish dependencies. No implementation on those three properties is included in the base fee. This is a proposed exception to the RFP's four-property applicability and requires FAS's written agreement. Legacy sites, including nuke.fas.org and sgp.fas.org, are excluded.

The microsite template and navigation work has been removed. Existing content remains in place. The fee includes representative content examples for testing and training, not archive migration, a full rewrite, bulk tagging, or accessibility remediation of historical pages and documents. The January plan will record the agreed boundaries and acceptance examples.

## Delivery schedule

| Phase | Dates | Work and approval |
| --- | --- | --- |
| Discovery | December 2026 to January 15, 2027 | Review the theme, plugins, sister-site code, and publishing workflow. Meet with staff, confirm access, and identify useful improvements. |
| Plan | January 15–29 | Present component layouts, implementation choices, acceptance examples, and costs. FAS approves the plan in writing by January 29. |
| Build and release | February 1 to May 14 | Build in staging. Review media and administrative improvements first, then social content. Release approved batches. |
| Handoff | May 17–31 | Complete final checks, train staff, transfer source and documentation, and obtain final acceptance. |

The RFP lists a December 1 engagement start and a kickoff in the week of December 7. This proposal assumes kickoff that week, after contract execution and access handoff, while retaining the January 15 discovery deadline. Any earlier start will be agreed with FAS.

<!-- pagebreak -->

# Project team testing and handoff

## Named lead and capacity

**Matthew Wallace — project lead, design, WordPress development, testing, and training.** I will conduct discovery, prepare layouts, implement the work, and handle reviews directly. No subcontractors are proposed. Any later staffing change would be disclosed and agreed with FAS before assignment.

I can make up to **50 hours per month** available from December through May. The estimate is **113 delivery hours plus six anticipated warranty hours**. The fixed fee covers the approved deliverables; the warranty has no hourly cap.

| Month | December | January | February | March | April | May |
| --- | --- | --- | --- | --- | --- | --- |
| Lead hours | 8 | 15 | 24 | 24 | 22 | 20 |

I will meet with FAS's project manager every two weeks and keep a shared tracker of decisions, issues, and approvals. FAS will provide consolidated feedback, staging and administrative access, source and deployment instructions, brand assets, and example content within five business days of requests. Delays extend affected milestones. Extra work requires a written estimate and FAS approval before it begins.

## Accessibility browser and performance checks

Testing will cover a publication, a biography, a standard page, and the homepage. I will confirm templates, dependencies, roles, and release procedures with FAS and Gravitate. New templates and components will meet **WCAG 2.1 AA**, using manual keyboard and screen-reader checks alongside automated tests. Checks include focus, headings, labels, contrast, alternative text, and zoom. FAS supplies accurate captions, transcripts, and data summaries; I provide the fields and instructions.

Third-party embeds must pass the agreed checks or use an approved accessible alternative. Testing covers current Chrome, Safari, Firefox, and Edge, including mobile layouts, media, social content, footer editing, redirects, and tags.

Before development, we will record repeatable page-load measurements for representative pages and conditions. Acceptance requires no measurable performance deterioration under equivalent conditions, using repeated measurements to distinguish regressions from normal variation.

## Releases training and warranty

Every release requires FAS approval on staging. I will confirm backups and a rollback path with the hosting provider, then check the deployed changes.

Handoff includes source code, change history, configuration notes, dependency details, and instructions for every new component. Credentials go securely to FAS-controlled accounts. One remote training session of up to 90 minutes is included, with a recording if FAS permits. Staff will practice publishing media, updating social content, and using the administrative tools.

Defects in delivered work are corrected free for **60 days after final acceptance**, following final launch. Covered corrections have no hourly cap, do not require maintenance, and do not consume retainer hours. New requirements are estimated separately.

<!-- pagebreak -->

# Selected work by Matthew Wallace

## Italian American Human Relations Foundation

[iahrf.org](https://iahrf.org)

I custom designed and built the foundation's WordPress website, including an area for posting correspondence. The site brings together its mission, events, cultural programs, newsletters, and ways to join or donate. Current updates sit alongside longer-lived information about the organization.

This nonprofit project is relevant to FAS's publishing needs: presenting organizational information and giving new correspondence a place within the site. I would apply that experience to reusable layouts within FAS's existing design.

## Oakes Performance Solutions

[oakesperformancesolutions.com](https://oakesperformancesolutions.com)

I custom designed and built this WordPress ecommerce site to match the client's requested style. The work included custom product-detail templates. I have also provided ongoing maintenance. The live site organizes tuning and hardware offerings by engine family, with product pages, images, and supporting video content.

For FAS, this work demonstrates my experience carrying a client's visual direction into reusable templates and maintaining the resulting site. The proposed publication and media components would follow the same approach.

## Cathy Wang Design

[cathywangdesign.com](https://cathywangdesign.com)

I custom designed and built this WordPress template, including a contact form and portfolio of Cathy's work. The site presents her jewelry, explains the custom design process, and directs prospective customers to a consultation request.

The project is relevant to FAS's photo and video components: images and supporting text need a clear, consistent presentation that staff can reuse as new material is published.

## Legacy Compounds

[legacycompounds.com](https://legacycompounds.com)

I custom designed and built this ecommerce site, including a custom WooCommerce product-detail page and custom plugins to control the catalog and automate fulfillment. This is my current client engagement. The work demonstrates WordPress development beyond presentation templates, including administration tools and connections to operational workflows.

These examples describe work I personally completed. The Legacy engagement is disclosed on the references page because its research-use-only peptide business is adjacent to areas of FAS's science policy work.

<!-- pagebreak -->

# Base project pricing

The revised fixed fee for the defined base scope is **$9,900 USD**, a reduction of **$4,600** from the original offer. The estimate is **113 delivery hours plus six warranty hours**, or **119 hours** in total.

At the **$100/hour estimating rate**, that effort represents **$11,900**. I offer a **$2,000 fixed-fee reduction**. The estimate removes the program layouts, pilot, navigation work, and related reviews and testing while retaining the six-month coordination schedule and support for the remaining deliverables.

## Effort and fee allocation

Both tables describe the same work and fee. Shared discovery, coordination, testing, and handoff time is included in the A–C allocations. Offered fees spread the reduction proportionally, rounded to whole dollars.

| Phase | Est. hours | At $100/hour | Offered fee |
| --- | --- | --- | --- |
| Discovery and coordination | 13 | $1,300 | $1,082 |
| Plan and reviews | 10 | $1,000 | $832 |
| Build testing and releases | 80 | $8,000 | $6,655 |
| Handoff and training | 10 | $1,000 | $832 |
| Warranty allowance | 6 | $600 | $499 |
| Total | 119 | $11,900 | $9,900 |

| Deliverable | Est. hours | At $100/hour | Offered fee |
| --- | --- | --- | --- |
| A Media components | 61 | $6,100 | $5,075 |
| B Social content | 34 | $3,400 | $2,829 |
| C Site administration | 24 | $2,400 | $1,996 |
| Total | 119 | $11,900 | $9,900 |

Actual hours do not increase the fixed fee for the approved scope. The six-hour allowance does not limit the 60-day warranty; covered defects are corrected without an additional charge.

## Payment milestones

Invoices follow FAS's milestones: **$1,980** on plan approval, **$4,950** on staging approval of all base deliverables, and **$2,970** on final acceptance. Optional items are invoiced on acceptance. Due dates follow the services agreement.

## Costs and change control

Hosting and existing licenses remain FAS's responsibility. The base approach requires no new paid service. Any proposed service cost or added work requires FAS's written approval. FAS must accept the FAS.org implementation boundary before contracting; the January plan confirms the binding scope. A rollout to the three sister sites requires revised scope and pricing.

<!-- pagebreak -->

# Optional enhancements

These fixed implementation fees are additional to the $9,900 base. The revised base leaves $4,600 within the stated $14,500 budget for options FAS elects. Options are not automatically included; the selected combination must be approved in writing. Any total above the budget requires separate funding approval. Each option includes testing and documentation and follows the base accessibility, browser, staging, performance, and 60-day warranty requirements.

## Bulk tag editing

**$1,000 fixed fee.** A WordPress administration workflow to add or remove existing tags across selected records in one publication content type, using existing bulk tools where suitable. Includes permissions, a representative batch test, and instructions. It does not include designing a new taxonomy or reviewing and retagging the historical archive. Acceptance requires a FAS editor to complete an approved batch operation on staging.

## Publication analytics and staff dashboard

**$1,750 fixed fee.** Add up to four agreed metadata fields, including publication date and content type, to the existing GA4 implementation. Configure corresponding reporting fields and one Looker Studio dashboard with up to six views or charts, with a staff walkthrough. Requires access to FAS's analytics accounts and the existing consent setup. Personal data collection, historical backfill, and a consent-platform replacement are excluded. Acceptance includes validated events and a working dashboard with the agreed fields.

## Native charts and data tables

**$2,500 fixed fee.** One reusable component that accepts a prepared CSV dataset and displays a bar or line chart with an accessible data table. Includes labels, source information, editor instructions, and two FAS examples. Each dataset is limited to 200 rows and six series. This creates charts within WordPress and is separate from the external embeds in item A. Data preparation, live API connections, and conversion of existing charts are excluded. Acceptance includes an editor replacing a dataset and publishing the updated chart and table.

## Publication sidenotes

**$1,750 fixed fee.** One reusable publication note component that presents short notes in a margin on wide screens and in an accessible in-flow or expandable format on small screens. Includes keyboard behavior, note anchors, editor instructions, and two example publications. The selected treatment will be approved before development. Converting the historical publication archive is excluded.

<!-- pagebreak -->

# Maintenance and ongoing support

## Optional service after May 2027

**$750 per month**, including **six hours** of maintenance and minor support. Additional time is **$125 per hour**, with FAS approval before it is incurred. Unused hours expire at month end. FAS may elect the service after the enhancement project; the base fee does not depend on a maintenance commitment.

The proposed coverage includes FAS.org and the three named sister sites, following an agreed access and responsibility handoff. WordPress-specific tasks apply to FAS.org; the other properties receive uptime checks, incident triage, and minor fixes compatible with their existing systems. A fuller application or dependency maintenance program for a sister site would be scoped separately after discovery.

## Included work

The six hours cover a scheduled monthly WordPress core and plugin maintenance cycle, staging checks before updates, review of available security and uptime alerts, and verification that the hosting provider's backup jobs are completing. I will coordinate with Gravitate on hosting issues and restores, make small content or display fixes, and provide a short monthly record of work and time used. Coordination, reporting, and incident triage count toward the six hours.

The first maintenance plan will list the systems monitored, which provider owns each backup, and the authorized contacts for an incident. Automated alerts may run continuously; human support is provided during business hours. No hosting service, new monitoring subscription, or recurring vendor license is included in the retainer.

If routine work is likely to exhaust the included time, I will flag that before the limit is reached and ask FAS to prioritize or approve additional hours. Substantial development, site migrations, new integrations, emergency recovery projects, and legacy subdomains require separate approval.

## Response commitments

| Request | Initial response |
| --- | --- |
| Site unavailable or suspected active compromise | Within one business day |
| Routine issue or small change | Within two business days |

Business hours are Monday through Friday, 9 a.m. to 5 p.m. Central Time, excluding U.S. federal holidays. These are acknowledgment and triage commitments; resolution depends on the issue, provider access, and any approved additional work. This proposal does not include staffed overnight or weekend response.

Covered warranty defects remain free and do not consume maintenance hours. New monthly service would begin only on FAS's written election under agreed service terms.

## Ownership and continuity

FAS will own the code, designs, and other work product created for this engagement and receive the source and credentials at handoff. Existing third-party software remains governed by its own licenses. Project notes and release instructions will be kept current so FAS can continue the work with another developer if needed. The engagement will be documented in FAS's standard services agreement.

<!-- pagebreak -->

# Client references and disclosures

## Italian American Human Relations Foundation

Louis Rago · Project reference

[ragobros@msn.com](mailto:ragobros@msn.com) · (773) 418-9573

Custom WordPress design and development, including an area for posting correspondence.

## Oakes Performance Solutions

James Oakes · Owner

[jaoakes528@gmail.com](mailto:jaoakes528@gmail.com) · (703) 565-7106

Custom ecommerce design, product-detail templates, and maintenance.

## Cathy Wang Design

Cathy Wang · Owner

[Cathywangdesignfj@gmail.com](mailto:Cathywangdesignfj@gmail.com) · (630) 222-5789

Custom WordPress template, contact form, and portfolio of work.

## Legacy Compounds

Al Wehbi · Owner

[alan@legacycompounds.com](mailto:alan@legacycompounds.com) · (630) 947-9018

Additional contact: Rob Davino · Owner · (310) 975-9958

Custom ecommerce site, WooCommerce product-detail page, and plugins for catalog management and fulfillment automation.

## Disclosure statement

My current client work is for Legacy Compounds, which sells peptides marketed for research use only. My work includes website design and development, custom WooCommerce functionality, catalog management tools, and fulfillment automation. I am disclosing this relationship because FAS works in biotechnology and related science policy areas. FAS may assess whether the relationship requires any restrictions on this engagement. I will protect each client's confidential information and disclose any material change relevant to this relationship.
