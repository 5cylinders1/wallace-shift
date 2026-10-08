# Architectural Split - Walgreens business cards

Prepared October 5, 2026 for Matthew Wallace and Bella Wallace. The selected design is option 03 from the October 4 concept set.

## Upload these images

Use Walgreens Photo > Business Cards > Upload Your Design. Choose landscape 3.5 x 2 inch cards, standard square corners, and a product option with front-and-back customization.

| Order | Front | Back |
| --- | --- | --- |
| Bella Wallace | uploads/01-shared-front.png | uploads/02-bella-back.png |
| Matthew Wallace | uploads/01-shared-front.png | uploads/03-matthew-back.png |

Create a separate design/order item for each person. The front artwork is identical. Matching JPG files are supplied as alternatives; use either PNG or JPG, not both for the same side. There are no crop marks or labels in the upload files.

Check the final Walgreens preview before ordering: both sides upright, no white border, the whole logo visible, all contact information clear, and the correct person's back selected. The supplied images already include the required bleed. Do not add a border or extra crop marks. A screenshot or PDF contact sheet is not an upload image.

## Exact contact content

| Person | Role | Phone | Email |
| --- | --- | --- | --- |
| Bella Wallace | Sales and first contact | (630) 803-4218 | bella@wallaceshift.com |
| Matthew Wallace | Engineering and design | (630) 235-2299 | matthew@wallaceshift.com |

Both: wallaceshift.com. Service line: Websites · Web apps · Automation. Front tagline: Design. Technology. Momentum.

## Dimensions and production

- Finished trim: 3.5 x 2 inches.
- Upload canvas including bleed: 3.625 x 2.125 inches.
- Bleed: 1/16 inch outside the trim on every edge.
- Walgreens safe area: 3.375 x 1.875 inches. All live text is inside this area with additional clearance.
- Upload files: 2175 x 1275 pixels, RGB, embedded sRGB profile, 600 dpi export.
- Type: actual Instrument Serif Regular/Italic and Manrope 400/500, embedded in the PDFs. Smallest text is the 7 pt service line; phone/email/domain are 8.8 pt.
- Contact-side logo: exact vector paths from the website SVG, not a generated approximation.
- Front: regenerated silver/blue sculpture artwork using built-in image_gen, with clean vector text added separately. Native art is 1635 x 962 pixels, approximately 451 effective pixels per inch on the card. Rendering at 600 dpi sharpens the vector text; it does not add native detail to the photo.
- The silver and blue materials are printed imagery, not foil, raised ink, or special stock.

The production master PDF has three pages in this order: shared front, Bella back, Matthew back. MediaBox and BleedBox are 261 x 153 points; TrimBox is inset 4.5 points on every edge, yielding 252 x 144 points. It contains editable text and vector contact-side shapes plus embedded raster front art.

The separate letter-size proof shows the four trimmed faces at exactly 3.5 x 2 inches. Print that PDF at 100% / Actual size with Fit to page disabled. The one-inch scale line provides a ruler check. The proof is for review, not for Walgreens upload.

PDFs are stored in output/pdf/wallace-shift-business-cards/:
- architectural-split-production-master.pdf
- architectural-split-actual-size-proof.pdf

## Verified requirements

Official Walgreens product page, accessed October 5, 2026: https://photo.walgreens.com/store/business-cards

It accepts completed JPG/PNG artwork and describes front/back customization, 120 lb premium cardstock, and 2 x 3.5 inch cards. The design catalog notes double-sided availability for selected options. Exact store availability and checkout settings have not been tested.

Official template: https://photo.walgreens.com/resources/wg-assets/images/category-page/business-printing/PDF/35x2_BusinessCards.pdf

This currently linked guide specifies the dimensions above. Do not substitute a generic 3.75 x 2.25 inch bleed template. The 600 dpi and sRGB exports are production choices; no product-specific DPI or profile requirement was established from the accessible official pages.

## Validation and reproducibility

Run build_cards.py with ReportLab, pypdf, Pillow, and pdftoppm available. It builds both PDFs, exports the three PNG/JPG pairs, and verifies dimensions, text, phone-to-person mapping, safe margins, and clearance from the diagonal. validation.json records the results. The final rendered proof was visually inspected after the last layout adjustment. Walgreens' upload preview and a physical printed sample remain unverified.

The font files and their OFL licenses are in assets/. The production-front image prompt is saved in front-art-prompt.md. The original approved concept remains in ../2026-10-04/03-architectural-split.png.

Commit message: design: prepare Architectural Split business cards for Walgreens
