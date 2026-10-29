# Docomomo website proposal

Prepared October 28, 2026 for Matthew Wallace and Wallace Shift LLC. User authorized the proposal and supplied the business mailing address and telephone number during this turn. No application, email or supplier engagement has been sent or made.

## Deliverables

- `proposal.md`: client proposal source.
- `build_proposal.py`: editable Word document builder using the established Wallace Shift proposal design.
- `estimate.md`: private pricing, effort, expenses and capacity notes. Do not submit.
- Final PDF: `output/pdf/wallace-shift-docomomo-proposal-draft.pdf`.
- Editable document: `output/docx/wallace-shift-docomomo-proposal-draft.docx`.

## Proposal terms

- Fixed fee $23,800, apportioned $2,400 / $3,600 / $11,000 / $6,800 across the four RFP tasks.
- First year hosting, base software licenses, routine platform care and independent accessibility review included.
- Optional subsequent annual renewal $1,800 by agreement.
- Payments $7,140 / $7,140 / $7,140 / $2,380 on proposed 15 day terms.
- January 4 kickoff and July 30, 2027 launch, subject to funding, agreement and access.
- Approximately 150 pages accounted for, ten layouts, ten developer manual migration examples, up to 20 hours of volunteer assistance, three training sessions, up to 50 document pages across ten priority documents, 90 day uncapped defect warranty.
- Neon national authorization and eligible chapter membership rules must be confirmed before contract. Existing Google Maps registry is preserved, not rebuilt.
- Independent accessibility reviewer is not appointed. Confirm a suitable reviewer and price before contract. No expense is needed merely to submit this draft.
- Confirm production capacity before signing; no other outstanding bid is treated as an award.

## Submission

The official four page RFP, version 20261023 v1.1, permits PDF submission by email to ben@docomomo-us-mn.org, attention Ben Clasen. Deadline December 1, 2026 at 11:59 p.m. Central Standard Time. Vendor selection is expected December 18. Grant determination is expected December 10. Work is conditional on funding.

Required title page information, letter of interest, firm profile, related work, three client references, key people, task fees and payment method are included. Matthew is named for all design and development; the planned independent reviewer is transparently unappointed. No mandatory signature appears in the RFP; no handwritten signature has been applied to this new draft.

Official RFP: https://www.docomomo-us-mn.org/uploads/5/1/7/7/51772709/docomomo-us-mn_rfp_forwebdevelopment_postedoctober2026_v1-1.pdf

Announcement: https://www.docomomo-us-mn.org/news/docomomo-usmn-announces-formal-request-for-proposals-for-website-overhaul

## Verification

The final seven page rendering is in `/private/tmp/docomomo-proposal-qa-v3`. Every page was visually inspected. Price and milestone sums equal $23,800. Visible copy was checked for hyphens and dashes; none found. Contact details match the user's supplied details. Word structural accessibility audit reported zero findings; that is not a certification of either the document or a future website.

Output files are ignored by Git and deployment through the existing `/output/` rules. The specific proposal source folder is excluded from Vercel deployment. Unrelated existing repository changes were preserved. No commit was created.

## Rebuild

Use the bundled Python at `/Users/matthewwallace/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3` to run `build_proposal.py` from the repository root. Use the document skill's `render_docx.py` with `--emit_pdf`, an isolated temporary output directory, and the bundled LibreOffice runtime. Inspect all rendered pages before copying the PDF to the final output path. The logo comes from the retained local asset `output/assets/wallace-shift-logo-black.png`.

Suggested commit message: `docs: draft Docomomo website proposal and pricing`
