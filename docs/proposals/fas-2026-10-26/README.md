# FAS proposal preparation

Prepared October 26, 2026. This folder contains the editable text source and document builder. Final artifacts are in `output/docx/` and `output/pdf/`.

## Submission details

- Buyer: Federation of American Scientists.
- Source: https://fas.applytojob.com/apply/94ORpnHfSs/Web-Development-Maintenance-Provider
- Due: Friday, October 30, 2026, 5 p.m. Eastern / 4 p.m. Central.
- Recipient in the RFP: jwilson@fas.org. No email or application has been sent.
- Submit one PDF, at most 10 pages excluding bios and appendices.
- The proposal is intentionally a reduced-scope offer requiring FAS acceptance, not a claim to cover all four sites with identical CMS capabilities.

## Confirmed details

Matthew supplied reference contacts for IAHRF, Oakes Performance Solutions, Cathy Wang Design, and Legacy Compounds, including a second Legacy contact. These are incorporated into the proposal. He confirmed that he can personally cover up to 50 hours per month without subcontractors. The rebuilt task estimate is 166 delivery hours plus an eight-hour warranty allowance, separate from available capacity.

The portfolio descriptions now use Matthew's specific account of the work: IAHRF correspondence publishing, Oakes custom ecommerce style and product templates with maintenance, Cathy custom design and portfolio/contact form, and Legacy custom WooCommerce plus catalog and fulfillment plugins. No completion years or measured business outcomes have been invented.

Legacy Compounds is the only current client engagement Matthew identified. The proposal discloses its research-use-only peptide business and Matthew's development work. FAS works in biotechnology and bioeconomy policy, making the disclosure prudent; broad subject overlap does not establish an actual conflict or automatic exclusion. The draft does not assert that Legacy is legally compliant or that no conflict exists.

- FAS background: https://fas.org/initiative/bioeconomy/
- Additional FAS work: https://fas.org/publication/biosecurity-modernization-and-innovation-act-of-2026/

## Complete before submission

1. Confirm the listed references are comfortable being contacted by FAS. They have not been contacted through this chat.
2. Review the factual Legacy disclosure. Add any ownership, compensation, advocacy, or contractual relationship that would materially change FAS's assessment; none has been assumed.
3. Review the proposed business-hour support terms. Personal capacity and no-subcontractor delivery are confirmed.
4. Review the revised case-study wording. Project dates are optional additions; the RFP does not require dates.
5. Review and approve the scope reductions, optional prices, and maintenance coverage. The entire $14,500 budget is committed to the reduced base; options require more funding or an agreed substitution.
6. Signature, title, and date are complete. Matthew supplied and authorized placement of his signature, requested background removal, and specified the title Owner and signing date 10/26/26. The reviewed transparent reproduction is embedded on the cover letter.
7. Confirm the RFP remains open and check for clarifications immediately before submission. Resolve whether FAS will accept WordPress program sections and the sister-site navigation-only scope.
8. Export the completed document to PDF, inspect every page, and confirm the page limit again after edits.

## Internal estimate

The prior 145-hour presentation was reverse-engineered to the budget and has been replaced. The task-based working estimate is 174 hours, including eight hours of anticipated warranty support. At the $100 estimating rate, it represents $17,400. The offer remains $14,500 through an explicit $2,900 fixed-fee reduction. The estimating rate is not an established standard billing rate or the realized return on this project.

See `estimate.md` for task assumptions, low/base/high scenarios, shared-work allocations, and reconciliation to the client-facing phase and item schedules. The base estimate implies $83.33 per hour before direct costs, overhead, and taxes. With an illustrative $500 in direct costs, that is $80.46/hour. Actual costs and effort are not verified. Higher effort reduces the return; there is no hourly cap on the approved deliverables or covered warranty fixes.

The RFP provides no payment before plan approval and puts half of payment after staging approval of all base deliverables. This draft accepts those milestones. Confirm cash-flow capacity before signing.

## Rebuild

Use the Codex bundled Python runtime to run `build_proposal.py` from the repository root. Render the resulting DOCX with the bundled document skill renderer and visually inspect all pages. Use the PDF from the same DOCX render so both deliverables agree.

The original signature photograph is retained at `output/assets/matthew-wallace-signature.jpg`. The cover uses `output/assets/matthew-wallace-signature-transparent.png`, kept with the local output artifacts outside the tracked proposal source. This is a visually faithful background-cleaned reproduction, not a pixel-identical extraction or a cryptographic digital signature.

The cover uses the official black monogram from `public/brand/wallace-shift-logo-black.svg`. Its document-resolution PNG is stored at `output/assets/wallace-shift-logo-black.png`. All five supplied reference contacts are included on page 10.

## Signature cleanup record

Method: built-in image editing tool, transparent-background mode. The second result was used after visual review of the handwriting and final document placement. The generated image was copied into the workspace; the original photograph was preserved.

Final prompt:

> Background removal only, NOT a redrawing. This is the user's actual signature for an authorized document. Keep the original photograph's entire canvas, orientation, aspect ratio, margins, and exact placement of EVERY ink pixel. Make the off-white/gray photographed paper fully transparent. Preserve the dark ink exactly as photographed, including every thin/faint stroke and natural pen texture. Do NOT crop, reframe, resize to fill, center, stretch, rotate, redraw, thicken, simplify, smooth or regenerate the signature. In the input the signature occupies approximately x=7% to 86% of canvas and y=18% to 80% of canvas. Keep those positions exactly. This task should be an alpha-mask extraction of the existing ink, with no geometric changes. No added text, no signature line, no background.

This records the requested editing constraints, not a guarantee of pixel identity from the image editing tool.

Suggested commit message: `docs: rebuild FAS estimate and disclose fixed-fee reduction`
