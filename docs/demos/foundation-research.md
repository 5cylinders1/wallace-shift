# Datum foundation demo: evidence behind the copy

Checked on October 19, 2026. Datum Foundation & Waterproofing is a fictional
contractor. Everything below is the source for a claim the demo makes. Any copy
that is not traceable to this file is either a plain-language description of
the demo's own illustration or a labelled planning assumption.

## Crack types

Source: InterNACHI, [Visual Inspection of Concrete](https://www.nachi.org/visual-inspection-concrete.htm)
and [Inspecting Visible Masonry](https://www.nachi.org/inspecting-visible-masonry.htm)
(Gromicko et al., undated; site copyright 2006–2026).

- Shrinkage cracks are common in poured concrete foundations, are typically
  shallow, and are generally not a structural concern. They still warrant
  monitoring.
- Concrete on both sides of a crack sitting in the same plane suggests the
  movement has stopped. A crack wider at the top can indicate settling toward a
  corner or heaving.
- Horizontal or sweeping cracks are potentially serious because the wall may be
  bent or broken. Causes listed: improper backfilling, vibration, and frost or
  swelling of water-saturated soil against the wall.
- Saturated soil pushing on the outside face of a wall can produce a horizontal,
  wider-than-hairline crack with signs of water intrusion
  ([InterNACHI gallery](https://www.nachi.org/gallery/settlement-and-cracks/lateral-movement-foundation-cracks)).
- Cracks from uneven settlement tend to run diagonally through mortar joints,
  most often at corners and beside openings. Other signs: out-of-square
  openings, sloped floors, sticking doors and windows. Moisture and thermal
  movement are often mistaken for settlement.
- Efflorescence is the white salt deposit left when water passes through
  masonry and evaporates. It indicates excess moisture.
- A crack that grows is the key warning sign. Inspectors refer structural
  questions to a structural engineer rather than prescribing repairs.

The demo turns these into three tiers: **Watch it**, **Have it looked at**, and
**Call soon**. The tiers are the fictional contractor's own triage language, not
an engineering standard, and every decoder result says it is a guide, not a
diagnosis. Crack-width figures (for example "wider than 1/4 in.") are not used
as thresholds because the sources disagree.

## Grading and roof water

Source: IRC R401.3 as summarised by InterNACHI,
[Foundation Fundamentals: Inspecting Load Paths and Water Paths](https://www.nachi.org/foundation-load-water.htm).

- Grade should fall at least 6 inches within the first 10 feet from the
  foundation. Where that is impossible, drains or swales carry water away.
- Impervious surfaces within 10 feet slope at least 2 percent away.
- Gutters and downspouts should discharge away from the foundation. No
  universal distance is given, so the demo names no extension length.

## Water pressure and drainage

- Clay soils tend to retain moisture and increase hydrostatic pressure, and
  dampproofing is not designed for significant hydrostatic pressure. Subsurface
  drainage includes foundation drains, gravel beds and sump systems, with
  perimeter drainage leading to daylight or a sump
  ([InterNACHI, Inspecting Foundation Dampproofing and Waterproofing (IRC R406)](https://www.nachi.org/foundation-dampproofing-waterproofing.htm)).
- Back-up power and a failure alarm for sump pumps are recommended in an
  InterNACHI-hosted builder guide (seen via search summary only). The demo
  presents battery backup as an option, not a code requirement.
- "Cove joint" (where the wall meets the floor slab) is used as a description of
  the illustration. The demo makes no claim about how often water enters there.

## Clay and the seasons

- Shrink-swell is the change in soil volume from wetting and drying; it can
  damage building foundations (USDA soil survey glossary definition, reproduced
  in county soil surveys). The USGS
  [Swelling Clays Map of the Conterminous United States](https://pubs.usgs.gov/publication/i1940)
  (Olive et al., 1989) maps swelling potential nationally at 1:7,500,000, which
  is too coarse for any lot-level claim.
- The demo therefore never says a particular Kansas City neighbourhood sits on
  expansive clay. Copy is conditional: "where the soil is clay…".
- Seasonal story (wet spring, dry late summer, freezing winter) is general
  climate description, shown with movement **exaggerated and labelled** in the
  3D model. No measured movement, water-table height or soil data is implied.

## Frost depth

Kansas City, Missouri's published residential footing requirements put the
bottom of footings at least 36 inches below grade (citing IRC R403.1.4). The
city's PDF returned HTTP 403 to automated fetches on October 19, 2026; the
requirement was read from the search index copy of
[kcmo.gov document 5896](https://kcmo.gov/home/showpublisheddocument/5896/637469112027100000).
Confirm against the current amended code before reusing it for a real client.
The model's frost band is labelled "36 in. (KCMO footing depth)", not a
measured frost line.

## Prices

Published 2026 guides disagree widely (push piers from roughly $300 to over
$3,000 per pier, depending on the guide and what is included). Datum's figures
in `src/demos/foundation/pricing.ts` are **illustrative planning ranges for a
fictional contractor**, chosen to sit inside that published spread. They are
labelled that way wherever they appear. A real contractor replaces them.

## Things the demo deliberately does not claim

- No reviews, ratings, years in business, licences, certifications,
  insurance outcomes or warranty terms beyond the plainly fictional sample.
- No statistics about how many homes have foundation problems.
- No guarantee that any repair will stop all movement or water.
- No statement that a crack is safe. The decoder sorts by urgency and always
  recommends an inspection when a result is uncertain.
