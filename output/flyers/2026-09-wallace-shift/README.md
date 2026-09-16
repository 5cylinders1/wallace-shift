# Wallace Shift refreshed flyers

## Final deliverables

- `wallace-shift-website-value-v5.png`: website value, restored sourced statistics, all seven benefits, examples based on Foundation's $1,000 starting price, and Bella's contact details.
- `wallace-shift-services-v2.png`: website tiers, web apps, and automation, with Bella's phone label corrected.

Both are 1024 × 1536 pixel portrait PNGs (2:3). They are raster artwork for digital sharing; they are not press-ready files with bleed or a specified print color profile. The generator returned this native size despite the preferred larger dimensions in the prompts. No artificial upscaling was applied.

Earlier numbered PNGs are superseded drafts. Website-value v2 improved CTA contrast; v3 corrected the phone label; v4 restored the important sales information requested by the user; v5 aligns the investment examples with Foundation's actual $1,000 starting price. Services v2 corrects the phone label and remains unchanged.

PDF exports are in `output/pdf/`: `wallace-shift-website-value-flyer.pdf`, `wallace-shift-services-flyer.pdf`, and the two-page `wallace-shift-flyers-combined.pdf`. They preserve the 2:3 artwork without cropping on 6 x 9 inch pages, with lossless image embedding and clickable contact details. The website-value flyer also links each statistic's source label to the primary research. Run `export_pdfs.py` with ReportLab and pypdf to recreate them, or add `--website-only` to retain the existing services PDF. The PDFs retain the native artwork resolution; they do not add print detail or bleed.

## Branding and content decisions

Matched the current angular Wallace Shift logo, graphite/pearl/azure palette, serif display typography, clean sans serif supporting text, glass sculpture, water reflections, and cool metallic surfaces. Source branding: `docs/brand-palette.md`, `src/index.css`, `public/brand/`, and current site media.

The live homepage and pricing page were inspected in the browser on September 15, 2026 (America/Chicago):

- https://www.wallaceshift.com/
- https://www.wallaceshift.com/pricing

Repository content was independently checked in `src/content/siteConfig.ts` and `src/content/pricing.ts`.

Corrections:

- Foundation from $1,000, Motion from $5,000, and Dimension from $10,000 are all website tiers.
- Web apps: definition sprint $2,500; focused app builds from $18,000.
- Automation: audit $1,000; workflow builds from $2,500.
- Restored all five statistics after verifying the original research. Added source dates, used 46.1% of credibility comments for Stanford, and identified Google's metric as mobile visits. Full citations and evidence limitations are in `research-sources.md`.
- Restored the investment explanation and aligned it with the $1,000 Foundation starting price. The examples show 4 customers at $250 profit, 2 at $500, or 1 at $1,000, with the assumptions stated.
- Restored all seven benefits and the referral, comparison, and business-opportunity explanations.
- Removed the Riverstone example, old gold logo, mountain imagery, old slogans, and the free website-review offer.
- Used the current sales address, `bella@wallaceshift.com`, instead of the original `matt@wallaceshift.com`. The current site lists Matt's address as `matthew@wallaceshift.com`; the flyers route sales enquiries to Bella.
- The user confirmed that `630-803-4218` belongs to Bella. Both final flyers label it `Bella Wallace`, replacing the original Matt label.
- Used the site's free fit call CTA and actual contact page rather than inventing a scheduling URL.

## Validation and generation

Created with the built-in imagegen tool. Earlier generation and targeted correction prompts are in `prompts.md`; the content restoration prompt is in `restoration-prompt.md`, and the final price-example correction is in `foundation-pricing-prompt.md`.

Both images were visually reviewed for text accuracy, prices, contacts, clipping, spacing, logo identity, and readable hierarchy. An independent review found no spelling errors or collisions. The first flyer CTA was subsequently corrected from white lettering to dark ink and the final result was visually inspected.

The v4 restoration passed a second independent visual/content review: all five statistics and the 28% substat, all seven benefits, three investment equations, the pricing distinction, source years, and Bella's contact details are present. Both pages of the final combined PDF were rendered with Poppler and visually checked after export. Research labels in the website PDF link to their primary sources.

For v5, the Foundation starting price was rechecked in the current pricing content and the equations were verified as 4 x $250 = $1,000, 2 x $500 = $1,000, and 1 x $1,000 = $1,000. The final PDFs were regenerated and both combined pages were rendered and visually checked. The price change is confined to the investment explanation.

These changes add flyer artifacts only. No website source or live deployment was changed. No application tests were needed for these standalone image deliverables.

Suggested commit message: `design: align flyer investment examples with Foundation pricing`
