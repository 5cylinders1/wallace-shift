# Roofing demo 02 — Alder & Stone

Local entry: http://127.0.0.1:5174/demos/roofers-2/

This is a separate, fictional contractor concept. Demo 01 and the existing roofers.wallaceshift.com host rewrite are unchanged. No production deployment or demo-two domain has been configured.

## Pages

- `/demos/roofers-2/`: scroll-controlled roof film, three guide links, residential/commercial introduction, project CTA.
- `process/`: inspection, scope, disruption, staying home, duration factors and warranty layers.
- `insurance/`: covered damage versus wear, ACV/RCV, deductibles, claim stages and commercial considerations.
- `cost/`: pricing factors, clearly illustrative $20,000 itemized budget and editable hypothetical payment calculator.
- `estimate/`: four-step property/authority, issue/urgency, payment/claim/timing, contact/consent brief.

Each route has a real HTML document, its own title, and noindex/nofollow. All five use the same independent React bundle. The Vite dev/preview middleware redirects only these exact slashless routes to their directory indexes. The main studio sitemap and production domain rules are unchanged.

## Lead behavior

The form produces an explicitly **unsent demo preview**. Nothing is emailed, booked or posted. Answers and contact details remain in React memory and clear on reload. Only the IDs of guides opened are kept in sessionStorage; they indicate opened pages, not confirmed reading or comprehension. A typed `RoofProjectPreview` in ProjectForm.tsx is the integration boundary for a future contractor endpoint. A production implementation still needs server validation, service-area configuration, consent/privacy handling, CRM/email delivery and delivery-failure behavior.

The commercial path records property type and authority, and offers notes for access or business constraints. The form does not make automated eligibility or credit decisions.

## Assets and controls

- `public/demos/roofers-2/house-poster.webp`: 1920×1080, wider original reference-derived image. Produced with the built-in image generation tool, then resized/compressed with cwebp. The entire house, more lawn and trees are visible in the source composition.
- `roof-transformation.mp4`: 1920×1080 H.264, about 10 seconds, silent.
- `roof-transformation-mobile.mp4`: 1280×720 H.264, smaller mobile source.
- Both encode a six-frame keyframe interval and fast-start metadata for bidirectional seeking.
- Base film: Runway, Seedance 2.5, task `955d826a-8242-40e8-9375-88efe2c32749`. One 10-second 1080p image-to-video generation cost 680 credits (891 before, 211 after). It replaces task `011aedc9-f048-421d-a013-9efa482d9458` to correct overnight truck parking. Earlier task `ed3c85c0-58f6-451e-8a23-c09f9e68882f` had roof-shape artifacts. No video-reference input or additional generation was used for this revision.
- Source images, all three generated films, prior desktop/mobile encodes, generation settings/prompt, contact sheets and browser QA screenshots are in ignored `output/roofers-2/`. Source URLs include the task ID prefix and local repair revision as a cache version.
- The 48-hour narrative is a concept, not an actual documented project or a promised schedule. It is visibly labeled AI concept film. Tiny equipment/material details remain generative illustrations, not installation instructions.

Scroll seeks the film forward/backward. Chapter buttons provide direct keyboard/touch control. Play/Pause runs it normally. Still view collapses the pinned journey and pauses motion while retaining selectable chapters; OS reduced-motion preference starts there. No video is preloaded in initial reduced-motion mode until explicitly requested. The house poster and written chapter explanations remain available if media fails.

## Content and production configuration

Guides link to checked primary sources from NAIC, Texas/Missouri insurance regulators, GAF, FTC and CFPB. Policy, state, roof system and written contract determine actual terms. The sample budget is invented solely as a labeled illustration, not a market-rate assertion or a quote for the large pictured house. Financing inputs are hypothetical, not an advertised lender program.

Before adapting this claimed site for a real contractor, replace the fictional brand, sample budget with approved contractor pricing, warranty terms with actual written coverage, and connect the lead endpoint. No testimonials, licenses, insurance approvals or manufacturer certifications were invented. The five-versus-ten-site promotion and annual managed-automation terms are not implemented here; this deliverable is the second demo site.

## Verification on 2026-10-09

- Production build, TypeScript, scoped ESLint and git diff whitespace checks passed. The existing main-studio large-chunk warning remains unrelated to this demo.
- All five built HTML documents have the correct demo title/noindex metadata. The slashless local guide URL redirects to the correct directory index.
- Rendered at 1280×800, 1920×1080 and 390×844; no horizontal overflow. Mobile selected the 720p film source. Reviewed the complete house composition and final film contact sheet.
- Browser verified forward/reverse scroll seeking, nighttime chapter/caption, direct chapters, play/pause, and Still view. The poster/chapter fallback was observed while the video asset was absent during implementation. Initial OS reduced-motion behavior also passed the component event harness; no OS preference was changed.
- Mobile commercial/insurance form completed through the unsent preview, including empty-step validation, conditional claim-stage questions and preserved back navigation. Fixed premature final-step validation caused by a reused button changing to submit during the click.
- Calculator default amortization, zero-interest ($12,000 / 24 = $500), invalid term, itemized total and boundary cases passed; real lender and backend delivery behavior are not connected or verified.
- Screenshots: ignored `output/roofers-2/qa/desktop-hero.jpg`, `desktop-night.jpg`, `desktop-financing.jpg`, `mobile-hero.jpg`, and `mobile-lead-preview.jpg`.

## Truck schedule revision verification

- Exactly one additional image-to-video request was submitted: 680 credits, remaining balance 211. The full request is saved in `output/roofers-2/truck-schedule-generation.json`.
- Reviewed 20 half-second film samples plus dense 24-fps samples around departure and return. The truck drives off around 3.3–3.7 seconds, the driveway remains empty through the sampled nighttime interval, and the truck visibly returns after sunrise around 6.75–7.1 seconds. The final frame also has an empty driveway.
- **Resolved unfinished-roof defect:** the base generation left two left-hand roof planes bare in its closing frame. The selected web files now use the local tracked repair described below. The raw generation and earlier clips remain backed up in the ignored output directory. No further generation was submitted.
- Re-encoded both web versions with H.264 and six-frame keyframes; versioned both source URLs to avoid stale browser media. Chapter thresholds and representative frames follow the new shot.
- Production build/TypeScript, scoped FilmHero lint and whitespace checks passed. Local browser checks confirmed the updated desktop source, forward/reverse chapter seeking, empty-night frame, mobile 720p source and playback; no horizontal overflow at 390×844.
- Review captures: `output/roofers-2/qa/truck-empty-night.jpg`, `truck-empty-night-mobile.jpg`; closing-frame limitation: `output/roofers-2/film-truck-final-frame.jpg`.

## Completed-roof repair

The two unfinished left-hand roof planes are repaired in post-production using finished shingle material from the earlier film. The current film remains the source for the rest of the scene; no additional generated video or paid generation was used.

- Reproducible script: `scripts/repair-roofers-2-film.py`. It reads `output/roofers-2/roof-truck-schedule-source.mp4` and `roof-refined-source.mp4`; it does not call external APIs or modify public files.
- Two separate plane masks preserve the projecting gable, flashing and fascia. Optical flow tracks each plane backward from the final frame, robust homographies align it, and smoothed vertices avoid frame jitter. Shingle coverage progresses upward from 7.65 to 8.85 seconds, before final departure.
- Master: ignored `output/roofers-2/roof-completed-master.mkv` (FFV1). Web encodes: H.264, 1920×1080 and 1280×720, 24fps, silent, six-frame keyframes, fast-start metadata.
- Frame-level scope check: **zero changed pixels outside the two roof masks before encoding**. All earlier footage, including evening departure, empty overnight driveway and next-morning return, is copied from the existing source. Minimum tracking inliers: 189 on the front plane, 162 on the tall plane.
- Full-resolution review at 8.25, 8.50, 8.85, 9.50 and 10.00 seconds confirmed progressive coverage and fully finished roof planes before departure and throughout the ending. Checked browser playback at 1× and reverse seeking in the local review page.
- Repair report and frame samples: `output/roofers-2/roof-repair-report.json`, `roof-repair-*.jpg`. Closing frame: `roof-repair-10.00s.jpg`. Original failed ending remains saved as `film-truck-final-frame.jpg`.
- Local tools: Python 3, OpenCV and NumPy, plus ffmpeg. Dependencies for this repair live only in ignored `output/roofers-2/repair-python/`; run with `PYTHONPATH=output/roofers-2/repair-python python3 scripts/repair-roofers-2-film.py`.
- Additional Runway credits spent: **0**.
- Verified the installed 1080p and mobile 720p sources with cache version `955d826a-completed-roof-v1`; both Finish chapters show the repaired roof. Rechecked the empty night chapter. Production build/TypeScript, scoped FilmHero lint, script syntax, source-to-public file equality and repair-report assertions passed. Screenshots: `output/roofers-2/qa/completed-roof-desktop.jpg` and `completed-roof-mobile.jpg`.

## Underlayment continuity repair

The generated film also reverted to bare decking before the first departure and showed shingles appearing on bare wood on day two. A second local composite keeps a matte dark membrane on exposed slopes after application and beneath advancing shingles. This is an editorial correction to the concept film, not footage of an actual installation.

- Reproducible script: `scripts/repair-roofers-2-underlayment.py`; run after the completed-roof script with `PYTHONPATH=output/roofers-2/repair-python python3 scripts/repair-roofers-2-underlayment.py`. `--preview` writes sample images only.
- Input: `roof-completed-master.mkv`. Output: `roof-underlayment-master.mkv`, plus review frames and report in `output/roofers-2/underlayment-qa/`. Earlier footage, masters and web encodes are preserved.
- Eight moving slope masks with dormer cutouts restrict the composite. A color key preserves workers, the ladder and shingles; the unoccupied overnight interval uses the geometric masks as the illumination becomes blue. The matte layer retains changing light and shadow. Coverage progresses during day one and is complete before departure.
- All 241 frames were checked before encoding: zero changed pixels outside the composite masks, zero changed pixels in the truck/driveway region, and zero changed pixels in the completed ending from 9.1 seconds onward. This is a scope check, not a claim that every construction detail is documentary-accurate.
- Independent full-frame reviews at 3.00, 5.50, 7.65 and 8.25 seconds confirmed coverage around dormers and the garage peak, persistent overnight protection and preserved workers/ladder. Original narrow flashing highlights remain. Additional sunset/sunrise samples at 3.50 and 6.50 seconds confirmed the material stays charcoal as the lighting changes.
- Web encodes use the same H.264 dimensions, frame rate and seeking settings as the completed-roof repair. The installed files use cache version `955d826a-underlayment-v2` (14,077,746 bytes desktop; 6,870,750 bytes mobile).
- Verified browser playback through the completed ending and forward/reverse seeking in the local review player. On the demo, verified the 1080p Protect/Install chapters and 720p mobile Install/Finish chapters; no horizontal mobile overflow. Screenshots: `output/roofers-2/qa/underlayment-desktop.png`, `underlayment-night.png`, and `underlayment-mobile.png`. Production build/TypeScript, scoped FilmHero ESLint, script syntax, repair report and source-to-public byte equality passed.
- Additional Runway requests and credits: **0**. No generation service or network request is used by this repair.

## Wider-house image prompt

Edit the supplied stone Tudor house photograph to an exact 16:9 cinematic architectural establishing photograph. Pull the camera farther back, preserve the architecture, roof angles, chimneys, windows and landscape. Show the whole centered house at 60–65% of the width, with generous yard and mature trees on both sides, curved driveway and a wooded background. Elevated front three-quarter perspective; natural warm morning light; realistic stone and roof detail; slightly aged charcoal shingles before replacement. No text, logos, people or vehicles.

## Selected video prompt

Create one continuous 10-second photorealistic roofing time-lapse from this house photograph, depicting two workdays separated by one night. The MOST IMPORTANT action is a white roofing work truck visibly leaving before nightfall, the driveway staying completely empty all night, and the SAME truck visibly returning AFTER sunrise. Show its wheels rolling along the existing paved driveway as it enters and exits through the bottom edge of the frame. Use exactly ONE work truck for the entire story, no other vehicles, trailers, or cranes. Departures and arrivals must be visible driving movements, never dissolves, teleportation or vehicles fading away.

TIMELINE IN SECONDS:
0.0-1.0: DAY ONE MORNING. Begin on the reference image with empty driveway. The white work truck drives UP the driveway from the bottom edge and parks beside the house.
1.0-3.0: DAY ONE WORK. Tiny distant roofers in safety gear remove ONLY the old shingle covering in adjacent patches, briefly revealing FLAT tan plywood decking on the existing roof slopes. Dark waterproof underlayment then covers ALL exposed decking before the crew finishes for the day. The truck is parked during this work.
3.0-4.0: DAY ONE DEPARTURE, STILL IN DAYLIGHT. Roofers pack up and leave. The white truck visibly rolls DOWN the paved driveway toward the camera and fully exits through the bottom of the picture. Finish this departure BEFORE sunset begins. By 4.0 seconds the driveway and entire property are completely clear of work vehicles, loose equipment and workers.
4.0-6.8: EMPTY PROPERTY OVERNIGHT. Only after the truck has exited, late daylight turns orange at sunset, then blue twilight, then full night. Warm window lights, porch lights and subtle landscape lights turn on. Hold a clearly visible, unobstructed EMPTY driveway for the full nighttime passage. Zero parked vehicles anywhere. Zero vehicles entering during darkness. The house is still and quiet, its roof fully protected with dark underlayment. No roof work or workers at night.
6.8-7.2: DAY TWO SUNRISE. Dawn becomes clear morning daylight, house lights switch off. The driveway is STILL EMPTY as the sun rises.
7.2-8.0: DAY TWO RETURN, NOW IN DAYLIGHT. The SAME white truck re-enters from the bottom edge and visibly drives UP the driveway, parking beside the house again. Roofers return only now.
8.0-9.0: DAY TWO WORK. New charcoal architectural shingles progressively cover the existing roof planes in straight rows; ridge caps complete the roof. The truck stays parked during this work.
9.0-10.0: FINISHED PROJECT. The crew packs up. The same truck drives DOWN the driveway and exits through the bottom edge again. End on the fully finished charcoal roof and clean empty driveway in daylight.

ARCHITECTURE AND CAMERA: Preserve exactly the photographed house's roof geometry, roof height, pitch, gables, dormers, walls, windows, chimneys and landscaping throughout. This is only shingle-and-underlayment replacement, never a structural rebuild. Flat decking follows the original roof slopes: no exposed rafters, raised roof structures or large objects on top. Slow smooth 8-degree camera orbit to the right, always aimed at the center of the house; whole house, driveway, trees and yard stay visible. No zoom, cuts or transitions. Real architectural photography, subtle clouds and time-lapse shadows, naturally accelerated motion, no CGI appearance, no text, no logos. Empty driveway throughout sunset, twilight, night and dawn is mandatory.
