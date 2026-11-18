# Sue’s Tailor Shop illustrative imagery

**Current status:** the five-cutout assembly below was rejected by the user as insufficiently cinematic and is retained as obsolete provenance. All four replacement image/video jobs have completed. Original landscape and native portrait films now supply the scroll-controlled canvas sequences; source inspection shows continuous cloth motion and finished-gown endpoints. Local browser results and their limits are recorded in [the final verification](../../../docs/review/sues-tailor/cinematic/README.md).

## Tailoring hero

- Asset: `/demos/best-tailor/media/tailoring-hero.webp`
- Created: November 17, 2026.
- Source: OpenAI built-in `image_gen` tool, generated for the tailoring visual concept and retained for the Sue’s Tailor Shop revision. The original generation prompt below remains unchanged.
- Active route: `/demo/sues-tailor`; the `best-tailor` asset path is retained internally.
- Original: `/Users/matthewwallace/.codex/generated_images/01a1eb18-f0b9-71c1-be87-f4db8b8dd029/exec-3734ebd0-ea46-49ff-b115-0580077d4622.png`
- Delivery: 1536 × 1024 WebP, quality 85.
- Suggested alt text: “Hands guiding cream fabric through a sewing machine.”
- Disclosure: Illustrative AI-generated imagery. It does not depict Sue’s Tailor Shop’s actual premises, owner, or work.
- Visual inspection: Hands, stitch path, fabric, and sewing machine appear credible; no faces, labels, or logos. Focal subject sits on the right, leaving a broad surface on the left for the hero treatment.

### Exact generation prompt

```text
Use case: photorealistic-natural.
Asset type: full-width hero photograph for a warm neighborhood tailoring boutique website, 3:2 landscape composition.
Primary request: an intimate, candid editorial close-up of anonymous adult hands guiding warm cream and taupe fabric through a well-maintained vintage sewing machine in a modest neighborhood alterations workshop.
Composition: machine presser foot, fabric and working hands in the right half; gently shadowed fabric and wooden worktable extend across the left half with room for website text. Crop above wrists; no faces or identifiable person. Photograph from close beside the work surface, a credible working arrangement and physically plausible hands and sewing machine.
Lighting and mood: soft late-afternoon window light, warm and welcoming, quiet care and craft. Natural color and contrast, subtle film character, shallow depth of field but needle, stitch line and fingers believable and sharp. Cream linen, warm walnut, brushed metal, a small burgundy spool of thread softly in the background.
Constraints: genuine photographic appearance, tactile weave, no stylized illustration or CGI, no brand name, logo, lettering, signage, watermark, or text; no suggestion that this is a photograph of the actual business or owner.
```

## Bridal fitting story

- Created November 17, 2026 through the signed-in Higgsfield website. The connected Higgsfield MCP tools returned unknown-tool errors, so the browser workflow was used.
- Model: GPT Image 2; High quality; 2K; 16:9; batch size 1; paid credits mode.
- Quoted generation cost: **6.5 credits**, one generation completed. No subscription, unlimited add-on, or credit pack purchased. Displayed credit top-up rate on `https://higgsfield.ai/pricing` was $6 per 100 credits (approximately $0.39 equivalent for this generation). This is a credit-value estimate, not a new card charge.
- Original downloaded result: `/Users/matthewwallace/Downloads/image.webp` (1920 × 1086).
- Retained original: `/demos/best-tailor/media/bridal-triptych.webp`.
- Delivery panels: `first-fitting.webp`, `small-details.webp`, `final-fitting.webp`, each 640 × 1086, lossily re-encoded at WebP quality 88 after extracting equal thirds. No additional generation was needed.
- Visual inspection: same ivory square-neck gown on a headless mannequin; first panel pools at the hem with waist pins, second has a pinned hem, third is smooth and finished. Warm neutral plaster setting, no people or branding.
- On-page disclosure: “Illustrative fitting story.” These images are conceptual and do not depict Sue’s actual work or establish custom wedding dress design services.
- These three images provided the source artwork for the rejected bridal assembly layers described below. That extraction required no additional media generation; the separate cinematic replacement generations are recorded below.
- Inspiration: user-supplied Instagram reel `https://www.instagram.com/reel/Da8LPoqoLY5/`, inspected in the browser. Its floating tailored-jacket construction story and finished silhouette informed the staged garment approach. No content from the reel was copied into this site.

### Exact Higgsfield prompt

```text
Create a refined editorial photography triptych for a warm neighborhood bridal alterations boutique website. One single wide image divided into THREE perfectly equal-width vertical photographic panels, no borders or text. All three show the SAME ivory silk wedding dress on the SAME headless linen dressmaker mannequin, straight-on full-length front view, identical camera, identical scale, complete skirt and hem visible with generous margin, on the same seamless warm pale blush plaster background. Modern timeless A-line gown with a delicate square neckline, thin shoulder straps, fitted bodice and fluid unadorned satin skirt. Panel LEFT: a first fitting, dress slightly too long with a little fabric pooling on the ground and small visible dressmaker pins gathering excess fabric at the waist. Panel CENTER: careful refinement, gown pinned neatly at the waist and adjusted hem temporarily held with discreet pins, tailored silhouette taking shape. Panel RIGHT: finished gown, smooth precise bodice, graceful clean floor-length hem, no pins, beautifully finished. Natural soft window light from left, tactile silk texture, gentle shadow, elegant authentic craftsmanship, quiet romantic feminine aesthetic, warm ivory and muted rose tones. Photo-realistic premium bridal editorial still life, no people, no hands, no lettering, no logos, no watermark, no flowers, no extra props. Each panel is an independent identical-framed portrait, exactly one-third of total image width. Keep the entire gown centered inside each third with no subject crossing panel boundaries.
```

## Rejected transparent bridal assembly layers — obsolete

The user explicitly rejected this five-cutout result. File integrity, aligned coordinates, or a working scroll transform do not establish the requested cinematic quality. The files and extraction details below are historical evidence and must not be presented as an accepted visual solution.

- Source: the existing Higgsfield `final-fitting.webp`, decoded at its original 640 × 1086 dimensions. This reuses the **same 6.5-credit generation** above. Additional generation cost: **0 credits**. No API call, paid image operation, subscription, or credit purchase was made for extraction.
- Historical files: `/demos/best-tailor/media/assembly/{straps,bodice,skirt-left,skirt-center,skirt-right,assembled}.webp`.
- Each file uses the identical full 640 × 1086 coordinate space. Their silk texture, shading, and folds come directly from source pixels. The mannequin and room are removed using a manually traced, supersampled silhouette mask.
- Bodice, skirt, and strap masks overlap at internal joins to prevent transparent hairlines. The waist and skirt divisions are visual assembly masks, not a claim about the gown’s physical sewing pattern.
- Encoding: lossless WebP with exact RGBA validation after decoding. Only fully transparent RGB is cleared to reduce file size; visible pixels and alpha are preserved.
- Layer order: left skirt, right skirt, center skirt, bodice, straps. `assembled.webp` is the actual composite of those layers in that order, providing a matching static fallback.
- Total: **167,396 bytes** for all five layers and the assembled fallback. The script validates that no fully opaque source pixels become alpha gaps in the final assembly.
- Reproduction: `python3 scripts/sues-tailor/extract_assembly.py` using Pillow and `cwebp`; all geometry and output validation are included in the script.
- Manifest: `public/demos/best-tailor/media/assembly/manifest.json` records the source hash, dimensions, layer bounds, byte sizes, file hashes, provenance, and validation.
- Historical review artifacts: `docs/review/sues-tailor/assembly/assembly-contact-sheet.jpg` and `assembly-storyboard-proposal.jpg`. The five checkpoints at 0%, 25%, 50%, 75%, and 100% belong to the rejected cutout proposal, not the completed cinematic media.
- Quality limit: the source is 640 pixels wide. Do not imply that extracting layers adds image detail or that the generated gown represents Sue’s actual work.

## Completed cinematic replacement

| Asset job | Job ID | Credits | Status |
| --- | --- | --- | --- |
| Landscape image | `bed32843-333b-436c-9029-f676b29fae1b` | 2.75 | Completed |
| Landscape MiniMax H3 video | `ae0bf8fc-6c18-4b53-b89f-22dd245819ff` | 20 | Completed |
| Portrait image | `ff5323e2-6497-4a0b-ae18-b3178b8a219e` | 2.75 | Completed |
| Portrait MiniMax H3 video | `ba059b17-2628-4253-9902-a36a62840f66` | 20 | Completed |

- The two 10-second films show an ivory gown opening into flowing cloth around a luminous form. The site trims the **first 7.5 seconds before reversal**, then extracts **180 frames at 24 fps**, so scrolling forward assembles the gown and the last frame is the completed source garment.
- Landscape delivery: `public/demos/best-tailor/media/cinematic/`, **1280 × 720**, 180 frames, **7,664,048 frame bytes**.
- Native portrait delivery: `public/demos/best-tailor/media/cinematic/mobile/`, **720 × 1280**, 180 frames, **7,994,014 frame bytes**. Used at viewport widths of 600 px and below; generated separately rather than cropped from landscape. Byte totals exclude posters, manifests, and application code.
- Both folders contain a poster and a manifest with source job, duration used, dimensions, frame count, and frame filenames. Source contact sheets are in `docs/review/sues-tailor/cinematic/` and its `mobile/` subfolder.
- Visual direction: amber illumination, warm dark-plum background, dimensional ivory cloth, and a stable camera. No artificial desktop zoom is added. Cloth bending and unfolding are present in the generated imagery; this does not establish a physical cloth simulation.
- Verified credit balance: **1,193.5 before → 1,148 after**, confirming **45.5 credits** debited for the replacement. Including the original 6.5-credit triptych, **52 credits** were used, approximately **$3.12** at the previously observed $6-per-100-credit rate; **$1.88** remains within the original $5 cap. No credit purchase or new card charge occurred. No further generation is planned.
- Exact landscape and portrait prompts, submission settings, job IDs, and costs are retained in [cinematic-generation.json](../../../docs/review/sues-tailor/assembly/cinematic-generation.json). The portrait parameters were recovered directly from the submitted tool arguments.
- The source-media endpoints have been visually inspected. See [the final verification](../../../docs/review/sues-tailor/cinematic/README.md) for local browser and performance results. The opening portrait composition slightly clips outer fabric; the completed gown fits. Physical-phone performance and visual parity with the reference are not established, and technical checks do not imply user acceptance.
- No reference-site image frames or reel footage are production assets for Sue’s. This generated media is illustrative and does not depict the shop’s actual work or establish custom gown construction services.
