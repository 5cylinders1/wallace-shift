# VELAR roofing demo: evidence used in the investment section

Verified against publisher and government sources on October 12, 2026. The section shows published report snapshots and material planning guidance. It does not forecast a homeowner's appreciation, appraise a property, or claim that a premium roof material causes an increase in value.

## National resale examples

Source: Journal of Light Construction / Cost vs. Value. Exact published dollar values and the publisher's whole-percent rounding are preserved.

| Report | Replacement project | National project cost | Estimated resale value | Published cost recovery |
| --- | --- | ---: | ---: | ---: |
| [2024](https://www.jlconline.com/cost-vs-value/2024/) | Asphalt shingles | $30,680 | $17,461 | 57% |
| [2025](https://www.jlconline.com/cost-vs-value/2025/) | Asphalt shingles | $31,871 | $21,501 | 68% |
| [2024](https://www.jlconline.com/cost-vs-value/2024/) | Metal | $49,928 | $24,034 | 48% |
| [2025](https://www.jlconline.com/cost-vs-value/2025/) | Metal | $51,865 | $25,972 | 50% |

The interactive card changes between report years and materials. Bar length uses exact resale value divided by exact report project cost; displayed percentages use the publisher's rounded figure. The selected report cost is the 100% reference. No personal estimate is multiplied by these recovery percentages.

The 2025 [methodology](https://www.jlconline.com/cost-vs-value/2025/methodology/) uses modeled construction costs with local estimating data. Resale values are survey estimates from real estate professionals, rather than completed-sale observations. The publisher's report summaries cover 150 markets in 2024 and 119 in 2025, so report changes should not be presented as appreciation for the same house. The visible card identifies national snapshots; its context disclosure states that these do not track the same home over time or establish a luxury-material premium.

The publisher's [asphalt project description](https://www.jlconline.com/cost-vs-value/roofing-replacement-asphalt-shingles/) specifies removal to sheathing and 30 roofing squares on a rectangular hip roof with skylight and ridge flashing. The [metal project description](https://www.jlconline.com/cost-vs-value/roofing-replacement-metal/) specifies 3,000 square feet of standing-seam metal with underlayment and accessories. These examples are not quotations for VELAR or luxury estates.

The NAR [2022 Remodeling Impact Report](https://www.nar.realtor/sites/default/files/documents/2022-remodeling-impact-report-04-19-2022.pdf) reports $12,000 cost, $12,000 estimated recovery and 100% for new roofing. Its standard-quality survey scope differs from Cost vs. Value. The NAR [2025 report](https://www.nar.realtor/sites/default/files/2025-04/2025-remodeling-impact-report_04-09-2025.pdf) does not supply a directly comparable roof cost-recovery line. Those reports are therefore not mixed into the interactive year comparison.

## Material service life

Source: [InterNACHI's Standard Estimated Life Expectancy Chart for Homes](https://www.nachi.org/life-expectancy.htm), roofing table.

- Architectural asphalt: 30 years.
- Metal: 40–80 years.
- Slate: 60–150 years.

These are the source's general estimates, not measured service life for any supplied product, warranties, or an estimate of remaining roof life. The visible copy identifies climate, installation and maintenance as variables. Roof assemblies include underlayment, flashing and other components whose maintenance or replacement can differ from the outer material.

## Thermal performance

Source: U.S. Department of Energy [Guide to Cool Roofs](https://www.energy.gov/sites/prod/files/guide_to_cool_roofs.pdf), February 2011. Its physical explanation supports the narrow claim that reflective finishes can reduce solar heat absorption and cooling demand, with climate and building characteristics determining benefit and a possible winter heating tradeoff. The demo does not use the document's old prices, tax-credit claims or energy-cost examples.

Cross-check: the current [ENERGY STAR cool-roof guidance](https://www.energystar.gov/products/cool-roofs) describes solar reflectance and thermal emittance, and says savings are greatest in hot sunny climates and buildings with low roof insulation. No energy savings percentage or guaranteed room-temperature reduction is shown in the demo.

## Component integration

Import the default `Investment` component from `src/demos/roofers-5/Investment.tsx` and render it once. It loads its own `investment.css`, exposes the `investment` section anchor, and requires no props, provider calls or dependencies beyond React. Styles are scoped to `.velar-investment`. The font uses `--velar-serif` when supplied, then Cormorant Garamond/Georgia fallbacks.

Material and year controls use native buttons with `aria-pressed`; changing the data announces a concise result region. Context uses native details/summary. Links open the actual publisher sources. Transitions respect reduced-motion preferences.
