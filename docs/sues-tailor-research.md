# Sue’s Tailor Shop research

Checked November 17, 2026 (America/Chicago). This is a source record for the existing tailor demo’s change to Sue’s Tailor Shop. The main task directly inspected the matching Google business profile in the browser. Public listing research does not establish owner approval of the demo.

## Business identity and contact

| Field | Supported value | Evidence |
| --- | --- | --- |
| Business | Sue’s Tailor Shop | Google profile; corroborated by public directories |
| Current Google address | 14873 Metcalf Ave, Overland Park, KS 66223 | Direct Google inspection; Waze and Yellow Pages corroborate |
| Phone | (913) 944-1983 | Direct Google inspection; Waze, Yellow Pages, BestProsInTown corroborate |
| Telephone link | `tel:+19139441983` | Normalized public business number |
| Google feature supplied by the user | `0x87c0c1a4d57811f5:0x80c7dd79af364b9e` | User’s selected business, not nearby Best Tailor |
| Matching place ID in Waze | `ChIJ9RF41aTBwIcRnks2r3ndx4A` | Waze destination URL |

Primary source: [Google business profile](https://www.google.com/maps/place/Sue's+Tailor+Shop/@38.8588277,-94.66854,17z/data=!4m6!3m5!1s0x87c0c1a4d57811f5:0x80c7dd79af364b9e!8m2!3d38.8588277!4d-94.6659651!16s%2Fg%2F11g1tyh26l). Supporting sources: [Waze business listing](https://www.waze.com/live-map/directions/us/ks/overland-park/sues-tailor-shop?to=place.ChIJ9RF41aTBwIcRnks2r3ndx4A), [Yellow Pages local directory](https://www.yellowpages.com/overland-park-ks/tailors), [BestProsInTown contact page](https://www.bestprosintown.com/ks/overland-park/sues-tailor-shop-/pricelist/).

## Listed hours

| Days | Listed schedule |
| --- | --- |
| Monday–Thursday | 10 AM–6 PM |
| Friday | 10 AM–4 PM |
| Saturday–Sunday | Closed |

The main task verified this schedule directly on Google. [BestProsInTown](https://www.bestprosintown.com/ks/overland-park/sues-tailor-shop-/) lists the same complete schedule; [Waze](https://www.waze.com/live-map/directions/us/ks/overland-park/sues-tailor-shop?to=place.ChIJ9RF41aTBwIcRnks2r3ndx4A) corroborates the weekdays. Holiday hours were not established.

## Services and review evidence

- Tailoring and clothing alterations are supported by the directory categories.
- The Google About panel lists appointments as required, onsite services, an accessible entrance, and onsite parking. An August 16, 2026 owner post emphasizes appointments and giving customers personal attention; this is paraphrased, not quoted.
- Google displayed **4.9 from 263 reviews** on November 17, 2026. The observed distribution was 257 five-star, one four-star, zero three-star, one two-star, and four one-star reviews. This is a dated snapshot, not a live rating feed.
- The main task observed **20 recent Google reviews**, including a negative rating with no written text. Its collected review metadata and topics are recorded in `docs/review/sues-tailor/reviews.csv`; the six selected website summaries are in `src/demos/best-tailor/data.ts`, and are not quotations. This collection does not represent all 263 reviews.
- Reviews visible on [BestProsInTown](https://www.bestprosintown.com/ks/overland-park/sues-tailor-shop-/), dated July 2026, discuss pants, winter coats, bridesmaid dress alterations, and customer service. The accessible page does not expose reviewer names for those entries; do not invent them.
- [Nextdoor](https://nextdoor.com/pages/sues-tailor-shop-overland-park-ks/) attributes a February 28, 2023 recommendation to **A. B.**, who reports a good bridesmaid dress alteration experience. A short exact excerpt is **“she did a great job!”** (six quoted words).
- Nextdoor itself displays Neighborhood Favorite awards for 2024 and 2025. Attribute any use specifically to Nextdoor; this is not an independently assessed ranking.
- No evidence in this research established shoe or luggage repair for Sue’s. Those services and all previously supplied Best Tailor reviews must not transfer to Sue’s.

## Conflicts and unverified details

- [Nextdoor](https://nextdoor.com/pages/sues-tailor-shop-overland-park-ks/) and [SewingTip](https://sewingtip.com/sewing-shops/kansas/overland-park/) show an alternate address, **15632 Barkley St**. SewingTip lists the same telephone number. Current direct Google inspection resolves the demo’s address to **14873 Metcalf Ave**; the reason and chronology behind the other directory entries remain unknown.
- BestProsInTown’s search representation conflicts internally: its title says 155 reviews, while its snippet says 136 and 5.0. The demo uses the independently observed Google snapshot instead.
- Nextdoor links `suestailorshop.business.site`; it was inaccessible during this check. Google exposed an “Add website” control, without a website listed. No current owned website or official social profile was verified.
- An owner background claim appears in BestProsInTown’s descriptive copy, but no reliable first-party biography was found. Omit nationality, career history, credentials, years in business, and ownership biography.
- Prices, rush service, guarantees, and current turnaround times were not established. The page labeled “Pricelist” did not expose prices. Appointment requirements are supported by the directly inspected Google profile.

## Collection limits

This was a targeted public-web collection plus direct Google UI inspection of 20 recent reviews, not an exhaustive scrape of every internet review or all 263 Google reviews. BestProsInTown’s full comments page could not be fetched and returned HTTP 403 on a direct request; no access controls were bypassed. Preserve exact reviewer attribution, use brief excerpts or clearly labeled summaries, and link the originating source. Do not treat search snippets as fresh owner verification.

Suggested commit message: `docs: record Sue's Tailor Shop source research`
