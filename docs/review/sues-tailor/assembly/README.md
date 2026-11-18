# Sue’s Tailor Shop: garment assembly review

**Status: the five-cutout proposal is REJECTED and obsolete.** The user explicitly rejected that result because it did not deliver the cinematic quality of the reference. Its screenshots, recordings, layer assets, and technical checks are historical evidence, not an accepted design or a visual quality pass.

The replacement now uses completed original cinematic garment films for landscape and portrait layouts, converted to image sequences and drawn into a canvas as the visitor scrolls. The source imagery shows continuous cloth bending and unfolding rather than independently transformed cutouts. Both image jobs and both 10-second MiniMax H3 video jobs completed. Local browser checks and their limits are recorded in [the final verification](../cinematic/README.md). Technical checks do not claim visual parity with the reference or user acceptance. The service, review, process, fitting request, and visit sections retain their existing scope.

## Reference and evidence boundaries

Reference: https://www.instagram.com/reel/Da8LPoqoLY5/

Creator: @octaboot.lb. The official creator site https://octaboot.com/ links to that Instagram account. The actual reference website was identified from the reel’s browser address bar and verified by its title and matching chapter copy: https://tailor-by-octaboot.vercel.app/ . See [the reference study](reference-study.md) for observed frames and separately verified implementation details.

The reference study distinguishes observations from the recorded reel, facts from the public reference site, and the original gown translation now implemented. The source reel’s outer camera movement is a handheld recording of a laptop; it is not automatically evidence of a camera move within the website.

## Completed cinematic media

| Delivery | Dimensions | Frames | Frame bytes | Source video job |
| --- | --- | --- | --- | --- |
| Landscape | 1280 × 720 | 180 | 7,664,048 | `ae0bf8fc-6c18-4b53-b89f-22dd245819ff` |
| Native portrait | 720 × 1280 | 180 | 7,994,014 | `ba059b17-2628-4253-9902-a36a62840f66` |

Each delivery uses the **first 7.5 seconds** of its generated film, trimmed before reversal, sampled at 24 fps. Reversing the unsewing shot produces an assembly that ends on the completed source gown at frame 180. The portrait sequence is independently generated and selected at viewport widths of 600 px and below; it is not a narrow crop of the landscape film. The manifests record frame dimensions, source job, duration used, and bytes. Byte totals above cover frame files only, not posters, manifests, or application code.

The hero uses dark plum, amber-lit ivory cloth, cream Caslon headings, and a locked camera without an added desktop zoom. The rest of the boutique page remains warm ivory, blush, and burgundy. See the [landscape contact sheet](../cinematic/cinematic-motion-contact-sheet.jpg) and [portrait contact sheet](../cinematic/mobile/cinematic-motion-contact-sheet.jpg) for sampled source progression. See [the final verification](../cinematic/README.md) for local browser behavior and measured results.

- [Landscape manifest](../../../../public/demos/best-tailor/media/cinematic/manifest.json)
- [Portrait manifest](../../../../public/demos/best-tailor/media/cinematic/mobile/manifest.json)
- [Generation record, job IDs, and retained prompts](cinematic-generation.json)

## Rejected five-cutout storyboard — obsolete

![Rejected five-cutout proposal, retained as historical evidence](assembly-storyboard-proposal.jpg)

| Scroll | Proposed garment action | Customer purpose |
| --- | --- | --- |
| 0% | Five pieces visibly separated, same camera and coordinate system | Establish the garment as the central subject |
| 25% | Left, center, and right skirt panels meet | Make the response to scrolling unmistakable |
| 50% | Bodice settles onto the joined skirt | Maintain continuity of the same garment |
| 75% | Straps meet the neckline; all pieces align | Focus attention on fit and finishing details |
| 100% | The aligned silhouette receives a subtle final camera push | End on a calm, legible finished dress |

This storyboard and its captured browser checkpoints document the rejected attempt. They are not final choreography and must not be used as acceptance evidence for the replacement. The masks were illustrative presentation pieces, not a sewing tutorial or a claim that Sue designs or makes gowns from scratch. Wedding dress work remains a case-by-case inquiry.

## Historical cutout provenance

The rejected five transparent layers reuse the final panel of the existing Higgsfield GPT Image 2 generation. All layers use the same 640 × 1086 canvas. They remain available for provenance only and are not an approved production visual. Pixel alignment and file integrity do not establish cinematic quality.

- Cutout extraction itself used **0 additional generation credits**. That historical statement does not describe the completed replacement generations below.
- Five historical layers total 94,234 bytes; assembled fallback 73,162 bytes. The extraction script’s RGBA checks cover file integrity only.
- [Asset manifest](../../../../public/demos/best-tailor/media/assembly/manifest.json)
- [Reproduction script](../../../../scripts/sues-tailor/extract_assembly.py)
- [Full original prompt and provenance](../../../../src/demos/best-tailor/assets.md)

## Completed generation ledger

| Item | Credits | State |
| --- | --- | --- |
| Original bridal triptych | 6.5 | Completed generation; previously recorded credit use |
| Landscape image, job `bed32843-333b-436c-9029-f676b29fae1b` | 2.75 | Completed |
| Landscape MiniMax H3 video, job `ae0bf8fc-6c18-4b53-b89f-22dd245819ff` | 20 | Completed |
| Portrait image, job `ff5323e2-6497-4a0b-ae18-b3178b8a219e` | 2.75 | Completed |
| Portrait MiniMax H3 video, job `ba059b17-2628-4253-9902-a36a62840f66` | 20 | Completed |

**Verified total: 52 credits**, including the original 6.5-credit triptych. The balance before the four replacement jobs was 1,193.5 credits and the verified balance afterward was 1,148, a debit of **45.5 credits**. At the previously observed $6 per 100 credits, the full 52 credits represent approximately **$3.12 of credit value**, leaving **$1.88** of the original $5 cap. No credit pack was purchased and no new card charge was made. The dollar figure is a credit-value estimate, not a billing receipt. No further generation is planned.

## Final verification

The current local Chromium report passes at 320, 390, 768, 1440, and 1920 pixels, including five reduced-motion runs. All five resilience cases pass. See [the final verification](../cinematic/README.md) for the build and HTTP results, recordings, measured performance, and test boundaries.

- Native forward scrolling scrubs a continuous, original cinematic garment sequence; backward scrolling reverses the same sequence.
- Stopping scroll stops the garment. No autonomous playback or button-controlled swaps.
- Garment identity, material, light, and framing remain coherent across the sequence. Visible construction stages and transitions must be reviewed, not inferred from a generation prompt.
- The result must be visually assessed against the reference. A collection of independently moving cutouts or crossfaded stills does not satisfy the requested cinematic experience.
- Request a fitting stays in the viewport through the experience and reaches the existing form directly.
- The form remains a local demo: nothing is transmitted or booked.
- Mobile has no horizontal overflow or obscured garment controls.
- Reduced motion presents a finished gown with no extended pinned scroll sequence.
- Current browser recordings, checkpoint screenshots, and measured frame/performance results are saved separately in `../cinematic/`. Functional tests alone do not establish visual quality or user acceptance.

## Historical evidence and current limits

Existing `width-*` screenshots, `scroll-forward-reverse-390.webm`, `trace-390.json.gz`, `performance-raw-*`, and `browser-results.json` describe the rejected cutout implementation. The saved browser run contains an overall failure at a 768-pixel fitting-link checkpoint; earlier width checks must not be presented as a complete suite pass. The reference contact sheets and [reference study](reference-study.md) remain valid evidence of the original inspiration.

The rejected composite was limited by a 640-pixel-wide source and had no true 3D rotation or simulated cloth. The completed replacement has separate verified landscape and portrait frame sets and finished-gown endpoints. It remains illustrative generated imagery, not evidence of a physical cloth simulation or Sue’s actual work. Current browser results, recordings, and measured limits are documented separately in [the final verification](../cinematic/README.md). The outer fabric is slightly clipped during the opening portrait composition; the completed gown fits. Local browser emulation does not establish physical-phone performance, visual parity with the reference, or user acceptance.

Suggested commit message: `docs: record completed cinematic gown media and costs`
