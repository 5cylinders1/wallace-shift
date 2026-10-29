# CAMWS website redevelopment proposal

Wallace Shift LLC

Prepared for the Classical Association of the Middle West and South

October 26, 2026

Dear Professor Pagan and members of the review committee,

I propose rebuilding camws.org around two everyday needs: members should be able to manage their membership and conference activity online, and staff should be able to publish and maintain the site without depending on a developer for routine changes.

I would lead the project personally, from the content audit and design through development, testing and training. My work includes custom WordPress websites for a nonprofit, ecommerce businesses and a design practice, along with custom plugins for catalog administration and fulfillment automation. The enclosed examples describe what I built and identify clients who can speak to that work.

The proposed implementation fee is **$39,000 USD**, including the defined migration work, accessibility testing, training, launch and **90 days of stabilization**. Hosting and software are **$2,400 annually**. Maintenance is **$600 monthly**, beginning after stabilization. Implementation plus the first three years of operation totals **$66,000**, before payment-processing charges and any separately approved additional work or capacity.

I recommend WordPress with membership and conference components that operate within the same installation. The first project milestone includes a working demonstration of membership renewal, conference registration and anonymous abstract review. That review will establish how the software fits CAMWS's actual procedures before the larger build proceeds.

Assuming a December 2026 kickoff, I propose a preview for the Cleveland meeting and an April or May 2027 launch. The current site would continue to handle registration and abstracts for the March 2027 meeting.

This proposal acknowledges the September 29 RFP and Addendum 1. The content inventory is not yet available, so the price uses the explicit migration allowances on page 4. Those proposed boundaries require CAMWS's agreement; they are not limits stated in the RFP.

Thank you for considering Wallace Shift.

Matthew Wallace

Owner and proposed project lead

[matthew@wallaceshift.com](mailto:matthew@wallaceshift.com) · [wallaceshift.com](https://wallaceshift.com)

Date: 10/26/26

<!-- pagebreak -->

# A website staff can maintain

## Public site and design

The redesign covers the main camws.org website. I will begin with stakeholder interviews, a content and navigation audit, and a review of available analytics. A short member questionnaire can be included if CAMWS wants one. Together we will identify the tasks members struggle with and approve a sitemap before design and development.

The design will use clear typography, consistent navigation and responsive layouts. I propose eight reusable layouts: the homepage; a section landing page; a standard information page; publication and news listings; an award or grant page; a conference page; a document library; and member or submission workspace screens. The final mapping will follow discovery. Two consolidated design review rounds and a practical style guide are included.

News, events, publications, awards, committees and documents will have structured fields instead of separate custom page designs. Staff will be able to create, schedule, revise and archive content, with permissions for contributors, editors and administrators. Revision history and rollback will be available for supported editorial content; database backups will protect transactional records.

## Proposed platform

I recommend **WordPress**, **Paid Memberships Pro** for membership administration, and **SimplyConf** for conference submissions, reviews and registration. The proposed hosting plan is PMPro Max, which includes managed WordPress hosting and the membership software. The conference subscription is separate and included in the technology fee.

I will validate the proposed configuration during discovery with a staging demonstration of shared accounts, membership checks, payment confirmation, reviewer permissions and data exports. I will also check accessibility of the actual rendered screens. CAMWS will approve the component selection and workflow demonstration before implementation proceeds. Any equivalent replacement must meet the agreed scope and annual technology price unless CAMWS approves a change.

## Search communications and reporting

The site will include search across public pages, posts and document titles and descriptions, with structured categories and clear results. Publication records will link to their existing publication sites. Search inside scanned PDFs and indexing external journal databases are outside the proposed base scope.

The build includes a news section, events calendar, document library, privacy-conscious analytics configuration, semantic headings, descriptive URLs, XML sitemaps and appropriate structured metadata. Social links and staff-selected embeds will be used where they remain accessible and perform well. These measures support discovery without promising search rankings or placement in AI-generated answers.

I will configure approximately 40 officer and committee forwarding addresses to CAMWS-approved destinations and test delivery. These are forwarding aliases, not new mailboxes. Existing domain and DNS ownership remains with CAMWS. The Southern Section conference and separate publication websites are outside this project, as clarified in Addendum 1.

<!-- pagebreak -->

# Membership and conference workflows

## Member self service

Members will be able to apply, sign in, update a profile, renew, pay dues and access a member directory. Directory visibility will be permission-controlled, with private contact fields excluded by default and publication choices agreed with CAMWS. Staff will be able to manage membership status, review renewal activity and export membership and payment reports.

Discovery will map the current dues categories, membership year, joint memberships and related subscription choices. The implementation includes configuration of the current membership categories, renewal reminders and a staff workflow for recording check payments. It also includes importing up to 2,500 membership records from CAMWS-supplied spreadsheets, with duplicate and field-mapping checks, a trial import and a final reconciliation. CAMWS will resolve ambiguous balances, dates and duplicate identities.

Payment details will be handled by a PCI-compliant third-party gateway. Stripe is the proposed common gateway for membership and conference payments; retaining PayPal for membership is an option to confirm during discovery. CAMWS will own the merchant accounts and receive funds directly. Card numbers will not be stored in WordPress. Existing PayPal recurring authorizations will not be assumed transferable; where necessary, members will receive instructions to renew through the new system without duplicate billing.

## Annual conference administration

The project includes one reusable annual-meeting configuration covering registration, payment, abstract submission, anonymous review, reviewer assignment, scoring and decision notifications. Submission types will accommodate individual papers, posters and grouped proposals such as panels, workshops and round tables. Staff will set deadlines, registration categories, questions and review criteria for future annual meetings using the documented configuration.

Authors will submit through their accounts. Authorized program staff will assign reviewers; reviewers will see only assigned submissions and the approved anonymous review information. Scoring and decisions will be retained with the submission. Staff will be able to export submission, review and registration records. Final scholarly decisions and program scheduling remain with CAMWS.

## Demonstration and acceptance

The discovery demonstration will follow a test member through renewal, a membership eligibility check, abstract submission and paid registration. A reviewer will then score an assigned anonymous submission, and an administrator will export the results. Tests will include lapsed membership, duplicate payment notifications, rejected payments and unauthorized access to another person's records.

Anonymity checks will cover reviewer screens, downloaded files, filenames, metadata, messages and exports. Submission instructions will require anonymous source material; an authorized administrator will have a pre-review check and return-for-correction process. Names embedded in the scholarly text cannot be reliably removed by software alone.

The new workflow will be demonstrated with sample data before real records are imported. Registration and submissions for Cleveland 2027 stay on the current system. The new system will be prepared for the following annual conference cycle.

<!-- pagebreak -->

# Content migration and scope allowances

## Audit before moving content

I will inventory the approximately 700 Drupal pages, older archives, files and URLs. CAMWS will approve what to retain, revise or retire. The original export will be preserved, and content will not be deleted solely to meet a price allowance.

Migration will use a repeatable import from Drupal exports or database access, followed by link and layout correction. We will review a trial import before the final content freeze. Retained and consolidated URLs will receive redirects; retired items will receive an agreed archival or removal treatment.

## Proposed fixed fee boundaries

These are proposed pricing limits, not limits prescribed by Addendum 1. CAMWS must accept them before contracting; the discovery audit confirms the inventory before implementation approval.

| Included item | Allowance |
| --- | --- |
| Retained HTML content | Up to 1,000 records across the main site and older archives, imported into approved reusable layouts |
| Associated media and files | Up to 20 GB of supplied assets, preserving the approved folder and document relationships |
| Manual content restructuring | Up to 40 priority pages requiring work beyond the shared import and layout rules |
| Legacy document accessibility | Up to 20 documents totaling no more than 100 pages, remediated or converted to accessible HTML |
| Membership import | Up to 2,500 records from supplied, exportable spreadsheets |
| Editorial design reviews | Two consolidated rounds for the sitemap and principal layouts |

All retained HTML records receive automated link and accessibility checks, with manual review of representative layouts and each priority page. Corrections caused by the import or delivered templates are included. Rewriting all existing copy, translating content, reconstructing missing source material and manually redesigning every archive page are not included.

## Accessible publication decisions

The delivered public site is intended to meet WCAG 2.2 AA. A blanket exemption for legacy content is not assumed. Files needing remediation will be identified during the audit. The included document allowance prioritizes current applications, policies and frequently used resources. An inaccessible file will not be published as though it has passed acceptance.

If retained content requires work beyond these allowances, I will provide a written estimate and options before doing that work. CAMWS may approve additional remediation, supply an accessible version, or explicitly agree to defer or retire the item. Deferral is a proposed scope change requiring CAMWS approval. If the required full launch scope cannot fit the fee, CAMWS may stop after the accepted discovery milestone instead of committing to later work.

<!-- pagebreak -->

# Accessibility security and performance

## Accessibility in design and editing

The acceptance target for the delivered public website is **WCAG 2.2 AA**. I will test navigation, forms, error messages, directory access, payments and conference screens using automated checks, keyboard operation and manual screen-reader review. Tests will include focus order, labels, headings, contrast, zoom and reflow. Shared accounts and third-party components will be tested as complete workflows.

I will maintain an issue log, correct defects in delivered work and provide an accessibility test summary at handoff. A plugin's presence will not be treated as proof of conformance. Component choices that prevent accessible completion of required tasks must be corrected or replaced before acceptance. Legacy content follows the review and publication process on page 4.

Editors will receive reusable layouts, image alternative-text fields, clear heading choices and instructions for accessible links, tables and documents. Training will cover checks staff can perform without a developer. CAMWS will supply accurate descriptions, captions and transcripts for its media, and remain responsible for the accuracy of newly published content.

## Security and recovery

Administrative accounts will use multi-factor authentication. Member, author, reviewer, editor and administrator permissions will be separated and tested. Sensitive member information will not appear in public directories, analytics or search indexes. Permission changes and administrative actions will be logged using the configured security tools.

The operational setup uses the host's security controls, supplemented by compatible tools where needed, for HTTPS, firewall and malware protection, daily backups and a separate backup copy. Backups will retain at least 30 days, and a restore test will be completed before launch. Credentials will be exchanged securely and access removed when no longer needed. Routine updates will be tested in staging; urgent security fixes will be assessed promptly with CAMWS advised of any service impact.

## Performance and release checks

The target is public-page load time below three seconds under normal conditions. Discovery will identify representative pages, devices, test locations, network conditions and a repeatable measurement. Caching, optimized images, a CDN and limited scripts will support that target. Authenticated and payment screens will be tested for responsiveness without caching private content.

Testing will cover current Chrome, Safari, Firefox and Edge, representative iOS and Android devices, membership imports, payment webhooks, review permissions, exports and redirect behavior. Staging will use test transactions and controlled sample data. Launch requires CAMWS sign-off, a recent backup and a documented rollback process. I will check the live site immediately after cutover and monitor it through stabilization.

<!-- pagebreak -->

# Delivery schedule and approvals

The proposed schedule is **18 to 22 weeks from kickoff and receipt of required access**, followed by 90 days of stabilization. A December 2026 start supports a March conference preview and an April or May 2027 launch. These are proposed dates; the RFP does not prescribe a kickoff date.

| Stage | Timing | Review and deliverable |
| --- | --- | --- |
| Discovery and technical validation | Weeks 1 to 3 | Interviews, content inventory, initial import sample, workflow demonstration and agreed scope |
| Sitemap and visual design | Weeks 4 to 6 | Approved navigation, responsive layouts, style guide and content plan |
| Site and member workflows | Weeks 7 to 13 | CMS, membership, conference review, payment and reporting workflows on staging |
| Migration and integrated testing | Weeks 14 to 17 | Retained content, redirects, accessibility review, security checks and staff testing |
| Training and launch | Weeks 18 to 22 | Final corrections, training, content freeze, production release and handoff |
| Stabilization | 90 days after launch | Monitoring, defect correction and help using the delivered workflows |

## Cleveland preview

I will prepare a staging preview or recorded walkthrough for the March 17–20 meeting, subject to the agreed kickoff and timely approvals. It will show the design and representative member and conference tasks using sample data. The production cutover will take place after the meeting and after final acceptance checks. If kickoff or access is delayed, I will identify the effect on the preview and launch dates before changing the plan.

## Working together

I will be the primary point of contact and make **20 to 25 hours per week** available for this project from December through April. I will remain responsible through launch and stabilization, including a May launch if needed. The schedule includes time for review and feedback. We will meet every two weeks, with short additional working sessions when a decision or demonstration needs them. A shared tracker will record deliverables, decisions, issues and approvals.

CAMWS will designate one decision-maker to consolidate feedback, ordinarily within five business days. Required inputs include Drupal exports and administrative access, DNS access, membership records, current dues and conference rules, brand materials, payment-account access and approval of the content disposition list. Delays in these inputs shift dependent dates; they do not silently expand the scope.

The discovery and design milestones require written approval. Requests that change the approved scope receive an estimate and schedule impact before work begins. Testing and correction of defects in the agreed deliverables remain included in the fixed fee.

<!-- pagebreak -->

# Training ownership and ongoing care

## Handoff and stabilization

The project includes two remote training sessions of up to 90 minutes each: one for publishing and site administration, and one for membership and conference operations. Staff will practice common tasks using the actual configuration. Written guides and short video tutorials will cover those tasks, permissions, reporting, backup recovery and annual conference setup.

Handoff includes the custom source code, design assets, configuration documentation, plugin register, credentials and export instructions. CAMWS retains ownership of its content, membership records, media and project-specific custom work. Third-party and open-source software retains its existing license terms; those licenses will be identified, with accounts held by CAMWS wherever the provider permits.

I will demonstrate exports of content, media, members, registration records, submissions and review results in documented formats such as CSV, XML and a standard database export. A future migration may require mapping those files to another system, but CAMWS will have the data, configuration and source needed to arrange it.

The implementation fee includes **90 days of stabilization from production launch**. This covers monitoring, correction of defects in the delivered scope and assistance with the agreed workflows. The effort allowance used to estimate this period is not a cap on covered defect correction. New features and changes to approved requirements require a separate agreement.

## Maintenance service

After stabilization, the proposed **$600 monthly** service includes core and plugin updates, staging checks, backup verification, security-alert review and a quarterly restore test. It also includes up to two hours per month for minor content or layout changes. Routine maintenance tasks do not consume those two hours; unused change hours expire monthly. Larger changes are estimated separately at **$110 per hour** and require written authorization.

Coverage is Monday through Friday, 9 a.m. to 5 p.m. Central, excluding U.S. federal holidays. Site-down or payment-blocking reports receive an initial response within four business hours; routine requests within two business days. These are acknowledgment and triage commitments, not guaranteed resolution times. After-hours reports are reviewed when coverage resumes; a staffed 24-hour helpdesk is not included. Defined coverage around a future conference can be separately agreed.

## Five year outlook

The aim is to keep the site on supported WordPress and plugin versions with a small, documented set of components. During annual reviews I will check vendor support, license costs, exports, compatibility and forthcoming changes. Routine supported updates are included in maintenance. A replacement platform or major new feature set would be separately scoped. CAMWS can end maintenance with 30 days' notice and receive its current backup and access information; third-party prepaid licenses follow their own cancellation terms.

<!-- pagebreak -->

# Implementation fee and payments

The proposed fixed implementation fee is **$39,000 USD**. It covers the deliverables and accepted allowances in this proposal. The price is tied to completed milestones and does not increase simply because the agreed work takes more hours than anticipated.

| Project phase | Fixed fee |
| --- | --- |
| Discovery content audit and technical validation | $3,900 |
| Sitemap and visual design | $4,400 |
| CMS and public site development | $6,000 |
| Membership and conference workflows | $8,900 |
| Content migration and redirects | $6,400 |
| Accessibility security and integrated testing | $4,200 |
| Training and launch | $2,800 |
| Ninety day stabilization | $2,400 |
| Total | $39,000 |

## Proposed payment schedule

Each phase above is invoiced after its agreed deliverables are accepted in writing. Proposed terms are payment within 15 days. There is no advance deposit. Acceptance requires review of the agreed demonstration or deliverable and resolution of blocking defects. The final $2,400 is invoiced after the 90-day stabilization period.

## Decisions before implementation

The discovery fee covers the inventory, migration sample, workflow demonstration and implementation plan. CAMWS may decline to authorize later stages if the validated approach or content scope does not fit its needs. Only completed and accepted milestones would then be payable; CAMWS receives the completed discovery materials.

If the audit identifies more retained records, manual reconstruction or document remediation than included on page 4, I will present the impact before implementation approval. Any additional work requires a written change order; it is not automatically added to an invoice. Existing content is not silently retired, and required workflows are not dropped to hold the fee.

The offer assumes remote delivery, CAMWS-supplied content and the single main site. New publication websites, Southern Section conference implementation, a bespoke peer-review platform, professional copywriting and translation are outside the proposed base. The fixed fee includes configuring and adapting the proposed supported components for the agreed workflows.

<!-- pagebreak -->

# Annual costs and three year total

Recurring services begin at production launch. The first three billing months of maintenance are included in the implementation fee. Stabilization lasts at least 90 days; maintenance billing begins in month 4 or after day 90, whichever is later, with no extra charge for that overlap. Technology costs begin at launch; temporary development hosting and test licenses before launch are included in the implementation fee.

| Cost item | First 12 months | Months 13 to 24 | Months 25 to 36 |
| --- | --- | --- | --- |
| Website implementation including stabilization | $39,000 | $0 | $0 |
| Managed hosting backups and monitoring | $1,200 | $1,200 | $1,200 |
| Membership conference and security software | $900 | $900 | $900 |
| Transactional email and alias services | $300 | $300 | $300 |
| Maintenance service at $600 monthly | $5,400 | $7,200 | $7,200 |
| Total | $46,800 | $9,600 | $9,600 |

**Total implementation plus 36 months of operation: $66,000 USD.** This is a comparison period, not a required three-year maintenance commitment. The annual technology fee is **$2,400** and the full-year maintenance fee is **$7,200**. The hosting and software rows allocate one combined technology fee; they are Wallace Shift's service prices, not representations of vendor invoices. The proposed service prices are held for this 36-month comparison period at the included capacity.

## Technology capacity and responsibility

The proposed package includes one production site and staging, hosting sized for approximately 1,100 members, an 80 GB total server allocation shared by the operating system, database, files and staging, one annual conference workflow, 40 forwarding aliases and up to 10,000 transactional emails per month. The included membership and conference licenses are not priced per member. Renewals, confirmations and review notices use the transactional service; bulk newsletter campaigns are excluded.

Wallace Shift will manage the services and absorb ordinary vendor price changes within the quoted technology fee. Any sustained need beyond included storage or message capacity, or an additional paid service, requires a written quote and CAMWS approval before recurring costs increase. Payment-processing fees and existing domain renewal charges remain payable directly by CAMWS.

## Variable payment charges

The $66,000 total excludes payment-processing charges, which CAMWS pays directly under its merchant agreement. Annual cost depends on transaction volume, card mix and the selected renewal method. For reference, a U.S. domestic card rate of 2.9% plus $0.30 produces a $3.20 processing charge on a $100 payment. Actual merchant terms may differ.

The base workflow can use member-initiated annual renewal with reminders. Automatic recurring billing, international cards and currency conversion may add processor charges. CAMWS will approve the gateway, renewal method and merchant terms during discovery. Existing domain renewals and any applicable taxes are also outside the quoted total.

<!-- pagebreak -->

# Project lead and selected work

## Matthew Wallace

**Owner of Wallace Shift LLC · Proposed project lead, designer and developer**

[matthew@wallaceshift.com](mailto:matthew@wallaceshift.com) · [wallaceshift.com](https://wallaceshift.com)

This project-based résumé summarizes work I personally completed. My experience includes custom WordPress templates, WooCommerce product pages, custom plugins, catalog administration, fulfillment automation and ongoing website maintenance. I will lead discovery, design, development, client reviews, testing and training. No subcontractors are proposed; any staffing change would be disclosed and agreed before assignment.

The following projects demonstrate nonprofit publishing, custom design and operational website development. For CAMWS, I will validate the proposed conference-review workflow through the discovery demonstration described on page 3.

## Italian American Human Relations Foundation

[iahrf.org](https://iahrf.org)

I custom designed and built the foundation's WordPress website, including an area for posting correspondence. The work required a publishing structure for organizational information and new material. It is relevant to CAMWS's need for a nonprofit website that staff can keep current with consistent templates.

## Legacy Compounds

[legacycompounds.com](https://legacycompounds.com)

I custom designed and built this ecommerce website, including a custom WooCommerce product-detail page and custom plugins to control the catalog and automate fulfillment. It is my current client engagement. This work is relevant to connecting website administration with operational processes and testing changes that affect transactions.

## Oakes Performance Solutions

[oakesperformancesolutions.com](https://oakesperformancesolutions.com)

I custom designed and built this WordPress ecommerce site to match the client's requested style. The work included custom product-detail templates and ongoing maintenance. It demonstrates my experience implementing reusable design and supporting a live site after launch.

## Cathy Wang Design

[cathywangdesign.com](https://cathywangdesign.com)

I custom designed and built a WordPress template with a contact form and portfolio of Cathy's work. This example shows how I organize visual material and inquiry paths within a clear, reusable site design.

<!-- pagebreak -->

# Client references

The following contacts can discuss the work described in this proposal. The first three organizations are the primary references; Cathy Wang Design is included as an additional reference.

## Italian American Human Relations Foundation

**Louis Rago · Project reference**

[ragobros@msn.com](mailto:ragobros@msn.com) · (773) 418-9573

Custom WordPress design and development, including an area for posting correspondence.

## Legacy Compounds

**Al Wehbi · Owner**

[alan@legacycompounds.com](mailto:alan@legacycompounds.com) · (630) 947-9018

Custom ecommerce website, custom WooCommerce product-detail page, and plugins for catalog control and fulfillment automation.

**Additional contact: Rob Davino · Owner**

(310) 975-9958

## Oakes Performance Solutions

**James Oakes · Owner**

[jaoakes528@gmail.com](mailto:jaoakes528@gmail.com) · (703) 565-7106

Custom WordPress ecommerce design, custom product-detail templates and ongoing maintenance.

## Cathy Wang Design

**Cathy Wang · Owner**

[Cathywangdesignfj@gmail.com](mailto:Cathywangdesignfj@gmail.com) · (630) 222-5789

Custom WordPress template, portfolio and contact form.

## Proposal correspondence

Matthew Wallace · Owner · Wallace Shift LLC

[matthew@wallaceshift.com](mailto:matthew@wallaceshift.com)

Prepared in response to the CAMWS Website Redesign and Development RFP and Addendum 1. Proposed scope boundaries, payment terms and service commitments are subject to the final written services agreement.
