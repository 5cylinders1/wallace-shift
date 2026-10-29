# FAS revised proposal preparation

Revised October 27, 2026 in response to FAS's email announcing removal of the microsite template and navigation element and an extended deadline. This folder contains the revised source, internal estimate, and document builder. The October 26 source folder remains unchanged as the original snapshot.

## Submission details

- Buyer: Federation of American Scientists.
- Current source: https://fas.applytojob.com/apply/94ORpnHfSs/Web-Development-Maintenance-Provider
- Revised deadline: Friday, November 6, 2026, 5 p.m. Eastern / 4 p.m. Central.
- Submission contact previously identified in the RFP: jwilson@fas.org. Verify the current submission instructions before resubmitting.
- Submit one PDF, at most 10 pages excluding team bios and appendices.
- Matthew has already applied, as confirmed by the acknowledgement email he supplied. This adjusted proposal has not been submitted or emailed through this chat.
- Verified revised artifacts: `output/docx/wallace-shift-fas-proposal-revised-2026-10-27.docx` and `output/pdf/wallace-shift-fas-proposal-revised-2026-10-27.pdf`.

## What changed

The former item C program template, Future of Science pilot, local navigation, and sister-site navigation changes have been removed. Former item D is now item C. Associated scope descriptions, acceptance examples, training content, effort, monthly allocations, pricing, and payment amounts are revised consistently. The cross-property search option is removed to match the current optional-item list.

The proposed base fee is $9,900, reduced by $4,600 from $14,500. The task estimate falls from 174 hours to 119 hours: 113 delivery hours and six anticipated warranty hours. At the existing $100 estimating rate, this represents $11,900, less a $2,000 fixed-fee concession. The concession maintains approximately the original gross return per planned hour; the new effort estimate is not back-solved from FAS's remaining budget.

The fixed-fee payment milestones are $1,980 on plan approval, $4,950 on staging approval of all base features, and $2,970 on final acceptance. The May 31, 2027 delivery date, the buyer's approval gates, and uncapped 60-day correction of defects in delivered work remain in place.

The four retained optional prices are $1,000 for bulk tag editing, $1,750 for publication analytics and a staff dashboard, $2,500 for native charts and data tables, and $1,750 for publication sidenotes. They are not automatically included. Optional maintenance remains $750 per month for six hours, with approved extra work at $125/hour.

## Scope boundary requiring FAS agreement

The revised RFP still says work applies across FAS.org, heatagenda.us, cri.fas.org, and essentialdata.us unless otherwise stated. It does not expressly waive the four-property application of media and social-content work when removing the microsite and navigation element.

This proposal continues to offer the new A and B media/social editing capabilities on FAS.org only. Item C site administration applies to FAS.org. The three sister sites receive discovery review only under the base; no navigation patches, migration, redesign, or new editing system is included. FAS must accept this narrower implementation scope in writing. The proposal must not imply full compliance with identical editing capabilities across all four properties.

Optional maintenance coverage still includes the four named properties under the previously described access, responsibility, and service limits. Four-property maintenance does not expand the base development scope. Legacy subdomains remain excluded.

## Preserved factual information

Matthew remains the named project lead, designer, developer, tester, and trainer, with no subcontractors proposed. He has confirmed availability of up to 50 hours per month from December through May. The revised expected monthly allocation is December 8, January 15, February 24, March 24, April 22, and May 20 hours; the six-hour planning allowance for warranty support follows acceptance. Available capacity is not an included hourly service package.

The four custom WordPress examples and supplied reference contacts remain: Italian American Human Relations Foundation, Oakes Performance Solutions, Cathy Wang Design, and Legacy Compounds, including Rob Davino as an additional Legacy contact. No project dates, certifications, audit results, measured business outcomes, or extra staffing claims have been invented.

The existing Legacy Compounds disclosure remains. Matthew identified it as his current engagement and described its research-use-only peptide business. The proposal lets FAS assess the relationship and does not assert a legal conclusion about compliance or conflicts.

The existing logo and authorized signature image are retained. The cover identifies this as an October 27 revision while preserving the original signing date, 10/26/26, and title, Owner. Retaining the image is not a claim of a new cryptographic signature. The original image-cleanup record is in `../fas-2026-10-26/README.md`.

## Rebuild and verification

Use the Codex bundled Python runtime to run this folder's `build_proposal.py` from the repository root. Render the resulting DOCX with the bundled document skill renderer and inspect every page. Use the PDF emitted from that same DOCX render so the two deliverables agree. Check the page limit, all price and hour totals, the relabeled A through C references, and removal of obsolete program, pilot, navigation, and search-option promises.

The internal `estimate.md` is not a submission attachment. It records task assumptions, low/base/high scenarios, shared-work allocation, fee reconciliation, and sensitivity examples. These are planning estimates rather than actual costs or a verified forecast.

The updated cover and scope need Matthew's ordinary final review before he submits them. References have not been contacted through this chat. No message to FAS, application update, insurance purchase, or subcontractor appointment is authorized or performed by this document revision.

Suggested commit message: `docs: revise FAS proposal for reduced scope and extended deadline`

## Completed validation

The revised DOCX rendered to nine pages. All nine page images were visually reviewed; no clipping, overflow, broken tables, or footer collisions were found. Phase, item, monthly, and payment schedules reconcile. The document accessibility structure audit reported zero high, medium, or low findings; this is not a PDF/UA certification. The deliverable PDF is an unchanged copy of the verified DOCX render. October 26 sources and artifacts were retained unchanged. The October 27 revision has not been submitted.
