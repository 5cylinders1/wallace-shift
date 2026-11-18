# Tailoring reference study

Inspected November 17, 2026. This documents the actual reference before further implementation. It is separate from the proposed Sue’s storyboard in this folder.

## Verified source

- [User’s Instagram reel](https://www.instagram.com/reel/Da8LPoqoLY5/) by `octaboot.lb`. The publicly accessible post was viewed in a fresh, isolated Chrome context without a signed-in profile. A dismissible signup prompt was closed through its ordinary Close control.
- **Actual demonstrated website:** [tailor-by-octaboot.vercel.app](https://tailor-by-octaboot.vercel.app/). The address is legible when enlarging the reel’s browser bar. A successful direct fetch independently confirmed the same branding, chapter sequence, and wording as the reel.
- [Creator’s official site](https://octaboot.com/) links to the same Instagram account. This confirms the creator relationship, not a separate real tailoring client.
- [Public animation script](https://tailor-by-octaboot.vercel.app/assets/js/app.js) confirms how the website performs its animation.

The earlier inability to identify the demonstrated domain is resolved. No claim is made that the reference depicts a real operating tailor or that its business claims apply to Sue’s.

## Evidence files

| File | What it shows |
| --- | --- |
| `reference-reel-contact-sheet.jpg` | Twelve sampled moments, every two seconds from 0 through 22 seconds |
| `reference-assembly-detail.jpg` | One-second samples of 0–6 seconds and 17–22 seconds, showing forward assembly and reverse disassembly |
| `reference-reel-00s.jpg` | Opening title and faint figure |
| `reference-reel-04s.jpg` | Exploded jacket parts arranged around the center |
| `reference-reel-10s.jpg` | Fabric, sleeve buttons, shirt cuff, and cufflink close-up |
| `reference-reel-16s.jpg` | Reverse journey through the suited-man/colour-lineup section |
| `reference-reel-22s.jpg` | Return to the opening title |

The full reel is temporarily stored at `/tmp/sues-octaboot-reference.mp4`: 22.567 seconds, 720 × 1280 pixels, approximately 3.28 MB, video-only. Forty-five half-second sample frames are under `/tmp/sues-reel-extracted/`. Those temporary files may disappear on a runtime reset. Only selected reference images are retained in this review folder; the source video and media are not website production assets.

## Observed choreography

Times below refer to the handheld reel recording, not fixed animation durations. The demonstrator controls the website by scrolling and reverses direction in the second half.

| Reel time | Observed action |
| --- | --- |
| 0–0.5 s | A faint luminous figure stands above a dark, subtly reflective ground. The centered heading reads “The Anatomy of a Suit.” |
| About 1–2 s | The heading clears. An empty white shirt takes shape; sleeves and cuffs appear separated before coming together. A warm overhead light and floor glow give the garment depth. |
| About 2.5–3.5 s | Dark waistcoat panels and a tie arrive over the shirt. The tie sweeps across the upper body; the waistcoat front closes. Editorial copy moves to the opposite side. |
| About 4–5.5 s | The jacket appears in a distinct exploded state: sleeves beside the body, shoulder/collar pieces above it, and lower pieces below. The pieces close toward the central garment. “Built on Full Canvas” is visibly present in this chapter. |
| About 6–7 s | The completed suit transitions into a man wearing it and adjusting his cuff. The heading reads “The Complete Silhouette.” |
| About 7.5–9 s | The view expands into several suited figures in different colours, with a central dark suit and atmospheric warm lights. |
| About 9.5–11 s | The imagery moves into an extreme fabric-and-cuff detail: textured jacket cloth, sleeve buttons, a white shirt cuff, and a dark cufflink. |
| About 11–12 s | The pinned visual sequence ends and the page reaches a quieter final fitting call to action. |
| About 13–22 s | Reverse scrolling revisits the cuff detail, lineup, worn suit, jacket, waistcoat/tie, shirt, and opening. The garment sequence visibly reverses with the scroll. |

The outer camera movement, skew, keyboard, and perspective changes belong to a phone filming a laptop. They are **not** evidence that the website itself tilts or moves its camera that way. The independently animated content is the garment imagery inside the laptop display.

## Confirmed implementation mechanism

The public script uses **535 WebP images drawn into a 2D canvas**, driven by a GSAP ScrollTrigger timeline. Scroll position advances a frame index; the canvas fills the viewport using a cover crop. The scene is pinned, with a 0.6-second scrub smoothing setting. The script’s editorial cues are approximately 11.5% for the shirt, 23.5% for the waistcoat, 38.5% for the jacket, 56% for the completed suit, 66% for the worn suit, 79% for the lineup, and 92.5% for the cuff detail.

This verifies a pre-rendered image-sequence approach for the visual subject. It does not establish how the original imagery was produced. No evidence here confirms live WebGL garments, a live 3D garment simulation, or independently animated CSS garment cutouts.

## Consequences for the Sue’s version

- Preserve the reference’s main interaction: a coherent garment changes continuously as the visitor scrolls, and reverses consistently when scrolling upward.
- Show genuine construction stages with visible separated pieces and continuous motion between them. Crossfading unrelated still images would not reproduce the observed effect.
- Keep garment identity, camera framing, lighting, and materials consistent across the visual sequence. Treat the shirt, waistcoat, jacket, and worn garment as deliberate milestones.
- Use original visual assets for Sue’s. The downloaded source is reference evidence, not authorized production media.
- Keep business copy grounded in Sue’s verified alterations services. The reference’s bespoke manufacturing claims, fabrics, history, prices, and location must not transfer.

Suggested commit message: `docs: document verified tailoring scroll reference`

## Composition, typography, and transitions

Observed in the extracted frames: the garment is the dominant central subject on a nearly black ground, lit by a warm overhead glow. It floats above a subtle reflective floor. Large, narrow, high-contrast serif headings sit beside it, alternating between left and right; smaller uppercase utility text and compact body paragraphs support the headings. The opening heading is centered over the faint figure. A stable top navigation and a thin gold line near the lower edge frame the sequence. The dominant motion stays within the central subject instead of translating a row of cards across the screen.

The sequence shifts from garment-scale construction to a wearer, a wider group view, and then macro fabric detail. These are changes within the rendered imagery, distinct from the phone’s movement around the laptop. Side text enters and clears as the garment reaches each chapter. The final call to action follows the released pinned sequence.

Sue’s implemented translation keeps the central floating subject, alternating editorial copy, appointment access, progress line, and reversible construction. The completed original landscape and portrait films show cloth bending and unfolding under amber light on a warm dark-plum ground. Cream Caslon headings and DM Sans supporting text accompany the garment; the rest of the boutique page retains warm ivory, blush, and burgundy. The camera remains locked, with no artificial desktop zoom added to the rendered sequence. Both films use their first 7.5 seconds, trimmed before reversal, to end the assembly on a complete gown. The wider lineup and macro chapters remain outside this revision’s single-hero scope. These are implementation and source-media observations; [the final verification](../cinematic/README.md) records local browser results separately. The opening portrait composition slightly clips the outer fabric while the completed gown fits. Physical-phone performance and visual parity with the reference are not established, and technical checks do not imply user acceptance.
