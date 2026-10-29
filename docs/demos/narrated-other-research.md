# Narrated walkthrough research: Datum, Tambour, Mitre, Stillwater, CRM

Research date: 2026-10-28. This brief was written from the running-product source and original-media references, not from the existing films or gallery copy. The spoken text and two-column tables were synchronized with the current executable scripts on October 28 at 18:45 UTC, including the Mitre leading article and repaired Stillwater opening. The original source-research pass did not generate films; later audio, capture and delivery states are tracked in [narrated-validation.md](narrated-validation.md).

The viewer is a contractor considering Wallace Shift. The narrated speaker represents Wallace Shift, not the fictional contractor brand. A film should answer: what was built, what a visitor can do, what happens next, and what makes this concept different. Named capability and benefit statements below describe demonstrated interface behavior or its intended utility, not measured conversion, revenue, or efficiency gains.

## Shared editorial and capture direction

- Establish the actual site or workspace first. Follow one coherent journey with a visible end state; do not substitute a collection of clicks for the journey.
- Choose timings after narration exists. The six to eight rows per concept are editorial beats, not equal-duration segments.
- Capture the real interfaces at readable desktop size, then reframe the important choice and its result for gallery/phone playback. Do not leave a full-page capture reduced beside a permanent text rail.
- Keep original source media and its disclosures visible where relevant. Show each completed state long enough to read. Captions transcribe narration; short editorial labels identify the current action without repeating paragraphs.
- All form examples use `Alex Sample`, `alex@example.com`, and fictional details. Do not use personal client data. Confirm the final submit handler stays local before showing its submit action.
- Existing FAQ copy offers useful questions to address, but is product-authored copy rather than evidence of interviews with actual buyers. No buyer transcripts were supplied or found in the source inspection. Representative-contractor comprehension testing remains outstanding.

## Datum Foundation

**Buyer takeaway:** Wallace Shift built an educational foundation website that turns a hard-to-explain service into a visible model, lets a homeowner describe a symptom, and carries that context into a structured inspection-request preview.

**Distinctive journey:** seasonal house cutaway → crack decoder → follow-up answer changes guidance → selected symptom transferred to request → complete local request preview. The storm simulator and sample inspection report support the broader overview but should not interrupt this main thread.

**Current narration (exact executable script):**

> The foundation work begins with something homeowners cannot see. Wallace Shift built Datum to make that first conversation clearer. An interactive cutaway shows the house and soil across the seasons. A sample inspection report helps visitors understand what the service could deliver before they inquire. The crack decoder starts with the visitor’s concern. Choose where the crack appears and what it looks like. Answer a follow-up question and the displayed guidance changes. It is a guide, never a diagnosis. That concern carries into the inspection request, so the visitor does not have to explain it again. The form offers space for photos, property details, contact information, and a convenient visit window. The finished preview keeps the concern attached. This fictional demonstration sends nothing. It connects useful education with a more informed inquiry.

| Exact spoken narration | Screen action, result and disclosure |
| --- | --- |
| The foundation work begins with something homeowners cannot see. Wallace Shift built Datum to make that first conversation clearer. | **opening — Explain what homeowners cannot see.** Focus `.dt-hero`; wide framing. On camera: hold the real interface. |
| An interactive cutaway shows the house and soil across the seasons. | **seasons — Make the hidden story visible.** Focus `.dt-hero`; wide framing. On camera: click `.dt-hud-seasons button:text-is("Spring")`; click `.dt-hud-seasons button:text-is("Summer")`. Visible label: Illustrative model · Movement exaggerated for clarity. |
| A sample inspection report helps visitors understand what the service could deliver before they inquire. | **report — Show what the inspection can deliver.** Focus `#report`; wide framing. On camera: hold the real interface. Visible label: Sample inspection report · Fictional measurements. |
| The crack decoder starts with the visitor’s concern. Choose where the crack appears and what it looks like. | **symptom — Start with the homeowner’s concern.** Focus `.dt-decoder`; wide framing. On camera: click `.dt-areas button:text-is("Basement walls")`; click `.dt-symptom:has-text("Thin vertical crack")`. Result check: `.dt-result`. |
| Answer a follow-up question and the displayed guidance changes. It is a guide, never a diagnosis. | **guidance — Follow-up answers change the guidance.** Focus `.dt-decoder-answer`; right framing. On camera: click `.dt-followup:has-text("Has it grown longer or wider") button:text-is("Yes")`. Result check: `.dt-result-head:has-text("Raised from")`. Visible label: Sample answers · Guidance, not a diagnosis. |
| That concern carries into the inspection request, so the visitor does not have to explain it again. | **handoff — Carry the concern into the request.** Focus `#request`; right framing. Off camera: click `.dt-result-actions button:has-text("Ask for an inspection")`. On camera: click `#request button[type="submit"]`. Visible label: Selected symptom carried into a local request. |
| The form offers space for photos, property details, contact information, and a convenient visit window. | **details — Add the context an inspection needs.** Focus `#request`; right framing. Off camera: click `#request button[type="submit"]`. On camera: fill `#request input[id$="-zip"]` → `64111`; click `#request button[type="submit"]`; fill `#request input[id$="-name"]` → `Alex Sample`; fill `#request input[id$="-email"]` → `alex@example.com`. Visible label: Fictional details · Photos remain in the browser. |
| The finished preview keeps the concern attached. This fictional demonstration sends nothing. It connects useful education with a more informed inquiry. | **result — A clear starting point.** Focus `#request`; right framing. On camera: click `#request button[type="submit"]`. Result check: `.dt-request-done`. Visible label: Local request preview · Nothing sent. |

**Primary-source inspection notes (capability references; current capture is the table above):**

- In `.dt-hud-seasons`, click `button` named `Spring`, then `Summer`. Show `.dt-hud-read` changing alongside the model. `Story.tsx:33–66` renders controls/readout; the exaggeration disclosure is at line 65.
- Brief contextual cuts to `#repairs` and `#report`; show the actual repair cards and “Open the sample report” link. `Story.tsx:94–114`; `Panels.tsx:20–39`. Do not claim those report measurements came from a real inspection.
- `#decoder`; click `.dt-areas button` named `Basement walls`, then `.dt-symptom` named `Thin vertical crack`. Reframe `.dt-decoder-answer` showing initial “Watch it” guidance. `CrackDecoder.tsx:64–95`; `symptoms.ts:48–65`.
- Within `.dt-followup` containing “Has it grown longer or wider”, click its `Yes` button. Show `.dt-result-head` now “Have it looked at” and explanatory “Raised from” text. `CrackDecoder.tsx:13–40`; `symptoms.ts:57–60`.
- Click `Ask for an inspection with this attached`; verify `#request .dt-chips button[aria-pressed="true"]` includes `Thin vertical crack` and the note is carried. Advance local form with `Continue`, optionally show local image input, fill `ZIP code` `64111`, choose owner, then `Name` `Alex Sample` / `Email` `alex@example.com`. `CrackDecoder.tsx:20–23`; `Request.tsx:39–50,107–155`. Use edits to compress form filling without implying automation.
- Click `Preview request`; hold `.dt-request-done` and `.dt-summary`, including “nothing was sent”. Finish with Wallace Shift and the existing interactive-access next step. Local-only final handler is `Request.tsx:68–75`; result/disclosure `91–100`.

**Limits:** The seasonal and storm models are illustrative, not engineering simulation proof. Decoder tiers are authored guidance, not an engineering standard (`symptoms.ts:3–7`). Prices are illustrative; do not narrate them as quotes. The request only toggles local state; photos remain browser-local. No scheduler, email, or CRM delivery was demonstrated.

**Original-media character:** a live rendered cross-section, restrained earth tones, technical labels and warm editorial copy. Keep the model's motion purposeful. If WebGL does not render in capture, resolve that rather than silently claiming the interactive cutaway was shown.

## Tambour Studio

**Buyer takeaway:** Wallace Shift built a complete cabinetry and remodeling consultation journey: room inspiration, tactile material selection, an illustrative investment planner, and a brief that retains those choices.

**Distinctive journey:** explore rooms → choose wood/stone samples → change construction/scope planning range → save it → complete consultation preview with samples and range carried through.

**Current narration (exact executable script):**

> Tambour guides a visitor from a room they admire to a project they can describe. This cabinetry experience was built by Wallace Shift. Kitchens, baths, and built-ins lead into construction stories and a tactile material library. Choose a wood, add a stone, and those choices collect in a sample box. The investment planner explores size, construction, and scope. Change the choices and the illustrative planning range responds. Save the range, and it travels with the samples into the consultation brief. Four steps gather the room, timing, style notes, and contact details for a more specific first conversation. The preview brings it together. Tambour is fictional, prices are examples, and nothing is sent. Inspiration and inquiry stay connected.

| Exact spoken narration | Screen action, result and disclosure |
| --- | --- |
| Tambour guides a visitor from a room they admire to a project they can describe. This cabinetry experience was built by Wallace Shift. | **opening — From inspiration to a clear brief.** Focus `.tb-build-stage`; wide framing. On camera: click `.tb-build-ticks li:nth-child(2) button`. Visible label: Illustrative build sequence · Generated imagery. |
| Kitchens, baths, and built-ins lead into construction stories and a tactile material library. | **rooms — A complete cabinetry website.** Focus `.tb-rooms`; wide framing. On camera: scrollTo `.tb-room:nth-child(2)`. |
| Choose a wood, add a stone, and those choices collect in a sample box. | **samples — Make the material choices tangible.** Focus `.tb-library`; wide framing. On camera: click `.tb-swatch-toggle`; click `#tb-tab-stone`; click `.tb-swatch-toggle`; scrollTo `.tb-samplebox`. |
| The investment planner explores size, construction, and scope. Change the choices and the illustrative planning range responds. | **planning — Explore the project’s scope.** Focus `.tb-planner`; wide framing. Off camera: click `a[href="/tambour/investment"]`. On camera: click `label:has(input[name="tb-tier"][value="inset"])`; click `label:has(input[name="tb-scope"][value="remodel"])`. Visible label: Illustrative range · Not a quote. |
| Save the range, and it travels with the samples into the consultation brief. | **carried — Keep the choices together.** Focus `.tb-consult`; right framing. Off camera: click `.tb-planner-actions button`; click `.tb-planner-actions a`. On camera: hold the real interface. Visible label: Selected samples and range retained in this session. |
| Four steps gather the room, timing, style notes, and contact details for a more specific first conversation. | **details — Prepare the first conversation.** Focus `.tb-consult`; wide framing. Off camera: click `.tb-chips label:has-text("Kitchen")`; click `label:has(input[name="tb-consult-scope"]):has-text("The whole remodel")`; click `.tb-consult-form button[type="submit"]`; click `.tb-chips label:has-text("In 6 to 12 months")`; click `.tb-consult-form button[type="submit"]`. On camera: fill `#tb-notes` → `More drawers and a larger family island.`; click `.tb-consult-form button[type="submit"]`. Visible label: Sample project · Four-step consultation preview. |
| The preview brings it together. Tambour is fictional, prices are examples, and nothing is sent. Inspiration and inquiry stay connected. | **result — See the complete request preview.** Focus `.tb-consult, .tb-consult-done`; wide framing. Off camera: fill `#tb-name` → `Alex Sample`; fill `#tb-email` → `alex@example.com`; fill `#tb-zip` → `64111`. On camera: click `.tb-consult-form button[type="submit"]`; scrollTo `.tb-consult-done` at 1.3s. Result check: `.tb-consult-done`. Visible label: Local preview · Nothing sent. |

**Primary-source inspection notes (capability references; current capture is the table above):**

- Establish `/tambour`, `.tb-site.is-home` and the visible hero/build image. Wide overview, then a readable room reveal. `TambourApp.tsx:27–36` mounts the actual room routes; `pages/Home.tsx:31–59` builds room cards with real original media.
- Show `.tb-rooms` plus the actual bath/library build inside `.tb-room-image`. Avoid implying the concept imagery documents completed customer jobs. `Home.tsx:37–52`.
- Scroll to `.tb-library`; click the first `.tb-swatch-toggle` in the wood tab; click `#tb-tab-stone`, then a stone toggle. Hold `.tb-samplebox` so both exact selected material names and count are legible. The tab IDs are generated from source at `MaterialLibrary.tsx:53–70`; list and consultation link at `76–82`. Wood and stone group IDs are verified in `content.ts:54–72`.
- Navigate by actual in-app link to `/tambour/investment`. Capture `.tb-planner-form` and `.tb-planner-result`; select an available radio from `input[name="tb-tier"]` and `input[name="tb-scope"]`, then hold `.tb-planner-range` and parts. `InvestmentPage.tsx:44–49,62–91`. Keep illustrative-range disclosure readable.
- Click `Save to my consultation`; follow `Book a consultation`. Frame `.tb-brief` with both sample names and planning range; same-browser navigation retains state. `InvestmentPage.tsx:85–91`; `ConsultationPage.tsx:95–109`.
- On `.tb-consult-form`, choose `Kitchen`, scope `The whole remodel`; Continue; choose `In 6 to 12 months`; Continue; enter notes in `#tb-notes`; Continue; fill `#tb-name`, `#tb-email`, `#tb-zip`. Show step labels plus a short real form interaction, not every keystroke. `ConsultationPage.tsx:159–207`.
- Click `Preview my request`; hold `.tb-consult-done` and `.tb-review`, panning from selected samples to timing/budget. Keep `.tb-demo-notice` in frame. Finish with Wallace Shift attribution. `ConsultationPage.tsx:111–135`.

**Limits:** Material images and construction scenes are demonstrations, not proof of this fictional studio's projects. Planning figures are explicitly illustrative and would need a real contractor's pricing (`InvestmentPage.tsx:91,105–109`). Consultation final handler only sets local `sent` state (`ConsultationPage.tsx:67–73`); no inbox/CRM integration is live. Do not repeat the page's hypothetical delivery language as present capability. Photos are browser-local (`176–189`).

**Original-media character:** warm cabinetry photography/concept imagery, material textures, visible craft, quiet page transitions. Let those assets occupy the frame; use concise annotations for retained choices.

## Mitre & Rift

**Buyer takeaway:** Wallace Shift built a premium editorial cabinetry website whose distinguishing interaction is a continuous scroll-controlled kitchen assembly, followed by clear craft, process, material, and contact sections.

**Distinctive journey:** empty room → cabinetry → stone → lighting → completed room → supporting service/process/material information → contact destination. This is a storytelling website, not a customization tool.

**Current narration (exact executable script):**

> The Mitre and Rift opens with a room that builds as you scroll. Wallace Shift created this editorial website for a fictional cabinetmaker. A continuous rendered sequence moves from the empty interior through cabinetry, stone, and lighting. The visitor controls the pace. Short chapters explain each stage, then the finished room brings the materials and proportions together. The rest of the site makes that first impression useful, introducing kitchens, pantries, built-ins, stone, and light. A clear process explains the journey from measuring and drawing through workshop construction and fitting. Material details show the palette behind the kitchen, with a contact section providing the next step. The imagery is rendered and contacts are placeholders. The distinction is making the whole room, and the thinking behind it, easy to understand.

| Exact spoken narration | Screen action, result and disclosure |
| --- | --- |
| The Mitre and Rift opens with a room that builds as you scroll. Wallace Shift created this editorial website for a fictional cabinetmaker. | **opening — A room built as you scroll.** Focus `.mr-stage`; wide framing. On camera: hold the real interface. |
| A continuous rendered sequence moves from the empty interior through cabinetry, stone, and lighting. The visitor controls the pace. | **assembly — Cabinetry. Stone. Light..** Focus `.mr-stage`; wide framing. On camera: scrollProgress `.mr-hero` → `0.22` at 0.8s; scrollProgress `.mr-hero` → `0.4` at 2.8s; scrollProgress `.mr-hero` → `0.58` at 4.8s; scrollProgress `.mr-hero` → `0.72` at 6.8s; scrollProgress `.mr-hero` → `0.86` at 8.8s. Visible label: Scroll-controlled rendering · Not a photographed project. Preserve preceding scroll position. |
| Short chapters explain each stage, then the finished room brings the materials and proportions together. | **finished — Let the whole room come together.** Focus `.mr-stage`; wide framing. On camera: hold the real interface. Visible label: Rendered concept kitchen. Preserve preceding scroll position. |
| The rest of the site makes that first impression useful, introducing kitchens, pantries, built-ins, stone, and light. | **services — Make the first impression useful.** Focus `#make`; wide framing. On camera: scrollTo `.mr-offer-grid`. |
| A clear process explains the journey from measuring and drawing through workshop construction and fitting. | **process — Explain the path to a finished room.** Focus `#process`; wide framing. On camera: scrollTo `.mr-steps`. |
| Material details show the palette behind the kitchen, with a contact section providing the next step. | **materials — A considered material palette.** Focus `#materials`; wide framing. On camera: scrollTo `.mr-swatches`. |
| The imagery is rendered and contacts are placeholders. The distinction is making the whole room, and the thinking behind it, easy to understand. | **ending — A complete room. A clear next step..** Focus `#contact`; wide framing. On camera: hold the real interface. Visible label: Website concept by Wallace Shift. |

**Primary-source inspection notes (capability references; current capture is the table above):**

- Open `/mitre`; establish `.mr-hero` with initial room, title and scroll cue. Capture a real slow scroll, not a player laid over the site. `SceneHero.tsx:25–31,121–146`.
- Continue scroll within hero; show `.mr-chapter[data-chapter="joinery"]` and the room visibly assembling. 128 frames use actual originals under `/demos/cabinetry-2/seq/desktop/f_000.webp` through `f_127.webp`. `content.ts:25–29,51–56`; `sequence.ts:11–13`.
- Continue the same scroll through `[data-chapter="stone"]`, `[data-chapter="light"]`, then `[data-chapter="room"]`. Preserve order and hold final frame; framing may move to a detail then return wide. `content.ts:57–71`; `SceneHero.tsx:73–88`.
- Follow real `#make`/`#process` navigation. Show `.mr-offer-grid` and `.mr-steps`; these are editorial descriptions of the fictional brand's service process. `components/Page.tsx:81–118`; `content.ts:83–108`.
- Follow `#materials`; show `.mr-swatches` with oak, quartzite and hardware names. These are static swatches, not selectable finishes. `Page.tsx:121–138`; `content.ts:111–117`.
- Click actual `Plan a kitchen` anchor, land on `#contact`, show placeholder note without clicking phone/mail actions. End with Wallace Shift attribution and concept disclaimer. `Page.tsx:141–151,167–168`; `content.ts:119–125`.

**Limits:** Rendering, not a photographed completed project. There is no user-specific design generation, estimate, online scheduling, sample box, or completed request form in this concept. Contact links are placeholders. The “Evening” chapter exists in actual source, but only narrate lighting that is visibly present in the final footage. Do not infer it from the chapter label alone.

**Original-media character:** full-width cinematic rendered room, rift oak and stone, precise editorial type, continuous assembly. This film can spend more time on its one signature experience than the form-driven concepts; reusing the mechanics should not force identical pacing.

## Stillwater Pool Co.

**Buyer takeaway:** Wallace Shift built a pool website that combines a visual backyard transformation with an approachable way to turn style preferences into a downloadable project brief.

**Distinctive journey:** scroll-controlled pool transformation → switch inspiration → carry style into planner → add features/timeframe/notes → create and download local project brief.

**Current narration (exact executable script):**

> Stillwater is a pool website concept by Wallace Shift. It connects backyard inspiration with a concrete starting point. The opening transformation follows the build through the finished setting, controlled by the visitor’s scroll. Compare a social gathering place, a quiet courtyard, and a more natural escape. Each choice changes the inspiration. That style carries into a project planner. Add features, choose an ideal timeframe, and describe the space in your own words. The site brings those decisions into a readable brief, ready to download for the first conversation. Stillwater is fictional and the images are concepts. The brief stays local; nothing is sent. The visitor leaves with something specific to discuss.

| Exact spoken narration | Screen action, result and disclosure |
| --- | --- |
| Stillwater is a pool website concept by Wallace Shift. It connects backyard inspiration with a concrete starting point. | **opening — Start with a different backyard.** Focus `.sw-hero-sticky`; wide framing. On camera: hold the real interface. |
| The opening transformation follows the build through the finished setting, controlled by the visitor’s scroll. | **transformation — From first idea to first swim.** Focus `.sw-hero-sticky`; wide framing. On camera: click `.sw-stages button:nth-child(2)`; click `.sw-stages button:nth-child(4)`; click `.sw-stages button:nth-child(6)`. Visible label: AI concept transformation · Illustrative construction. |
| Compare a social gathering place, a quiet courtyard, and a more natural escape. Each choice changes the inspiration. | **inspiration — Find the feeling that fits.** Focus `.sw-inspiration-grid`; wide framing. On camera: click `.sw-inspiration-choices button:has-text("The quiet courtyard")`; click `.sw-inspiration-choices button:has-text("The natural escape")`. Visible label: Concept imagery. |
| That style carries into a project planner. Add features, choose an ideal timeframe, and describe the space in your own words. | **planner — Turn preferences into a plan to discuss.** Focus `#plan`; right framing. On camera: click `.sw-feature-options label:has(input[value="Spa"])`; click `.sw-feature-options label:has(input[value="Lighting"])`; select `#sw-project-timeframe` → `Within the next year`; fill `#sw-project-notes` → `A relaxed family pool with evening lighting.`. |
| The site brings those decisions into a readable brief, ready to download for the first conversation. | **brief — A readable project brief.** Focus `.sw-planner-panel`; right framing. On camera: click `.sw-planner-form button[type="submit"]`. Result check: `.sw-brief`. Visible label: Local idea brief · Not a quote or booking. |
| Stillwater is fictional and the images are concepts. The brief stays local; nothing is sent. The visitor leaves with something specific to discuss. | **ending — An inviting first impression, with a next step.** Focus `.sw-brief`; right framing. On camera: hold the real interface. Visible label: Website experience by Wallace Shift. |

**Primary-source inspection notes (capability references; current capture is the table above):**

- Open `/stillwater`; show `#top.sw-hero` and actual brand/title. Begin wide. `PoolHero.tsx:137–168`.
- Real scroll or click stage controls `.sw-stages button` in order to show the blueprint/build/water/finished stages. Include `.sw-fill-video[data-state="ready"]` when the fill plays; hold final filled pool. `PoolHero.tsx:172–187`; `PoolFillVideo.tsx:40–61,64–95`. Keep “AI concept transformation” context available.
- Scroll `#inspiration`; click `.sw-inspiration-choices button` by names `The quiet courtyard`, then `The natural escape`. Show both changed image and short description. `PoolDetails.tsx:5–35,149–184`.
- Click `Make it your own`; show `#plan`, `#sw-project-style` and `.sw-planner-preview` retaining `The natural escape`. `PoolDetails.tsx:219–254`.
- Check `input[name="features"][value="Spa"]` and `[value="Lighting"]`; select `Within the next year` in `#sw-project-timeframe`; fill `#sw-project-notes` with `A relaxed family pool with evening lighting.`. `PoolDetails.tsx:256–280`.
- Click `Create my project brief`; hold `.sw-brief dl` and chosen values. The actual handler creates a local `ProjectBrief` in `PoolDetails.tsx:122–125`; result is `232–247`.
- Show `Download your brief` and, if useful, perform the local download and verify file contents, without sending it anywhere. Hold the local-only notice. `PoolDetails.tsx:132–145,244–246`. Wallace Shift closing attribution should not imply a booking.

**Limits:** AI concept imagery, not a real constructed pool or property-specific rendering. Planner does not provide site suitability, dimensions, price, permit advice, or schedule commitment. Download is a plain text idea brief, not a submitted lead. FAQ questions at `PoolDetails.tsx:68–85` are existing authored buyer questions, not interview evidence.

**Original-media character:** spacious pool imagery, soft landscape motion, warm/lime accents, an expressive transformation. The completed local brief should feel like a natural payoff rather than an abrupt administrative cut.

## Roofing CRM workspace

**Buyer takeaway:** Wallace Shift built a sample roofing operations workspace that connects weather context, property records, follow-up decisions, and sample inspection scheduling in one visible workflow.

**Distinctive journey:** recent weather → matched property → inspect context → add to worklist → note contact outcome → schedule sample inspection → verify worklist/calendar update. The actor is now the contractor's team, not a homeowner.

**Current narration (exact executable script):**

> A roofing website starts a conversation. This CRM demonstration by Wallace Shift shows how the next steps could be organized. Open the storm map to explore sample weather and nearby properties. It is a search aid, not proof of roof damage. Review a property’s contact details, record source, and weather context. Then add it to the follow-up list. Record the contact outcome and an internal note, keeping the next step with the property. Choose an inspection time and assign a team member. The sample appointment updates the property’s status. The worklist and upcoming appointments show the change. Customer records and sample website inquiries are organized in the same workspace. All records are fictional. No live weather or contact lookup runs, and no messages or calendar invitations are sent. The handoff to inspection is visible.

| Exact spoken narration | Screen action, result and disclosure |
| --- | --- |
| A roofing website starts a conversation. This CRM demonstration by Wallace Shift shows how the next steps could be organized. | **opening — Organize what happens after the first conversation.** Focus `.rd-main`; wide framing. On camera: hold the real interface. |
| Open the storm map to explore sample weather and nearby properties. It is a search aid, not proof of roof damage. | **weather — Weather context meets property records.** Focus `.rd-main`; wide framing. Off camera: click `nav[aria-label="Dashboard"] a[href="#storm-map"]`. On camera: hold the real interface. Visible label: Sample weather · Proximity does not establish damage. |
| Review a property’s contact details, record source, and weather context. Then add it to the follow-up list. | **property — Review the property before acting.** Focus `.rd-property-sheet`; right framing. Off camera: click `.rd-property-result:has(input:not(:disabled)) button`. On camera: click `.rd-property-section button:text-is("Add to follow-ups")`. Result check: `.rd-property-section:has-text("Follow-up outcome")`. Visible label: Fictional property · Sample contact details. |
| Record the contact outcome and an internal note, keeping the next step with the property. | **outcome — Record a clear next step.** Focus `.rd-property-sheet`; right framing. Off camera: scrollTo `.rd-property-section:has(h3:text-is("Follow-up outcome"))`. On camera: select `.rd-property-form select` → `contacted`; fill `.rd-property-form textarea` → `Sample homeowner requested an inspection.`; click `button:text-is("Save outcome")`. Visible label: Local sample outcome · No outreach sent. |
| Choose an inspection time and assign a team member. The sample appointment updates the property’s status. | **inspection — Arrange the sample inspection.** Focus `.rd-property-sheet`; right framing. Off camera: scrollTo `.rd-property-section:has(h3:text-is("Arrange a free inspection"))`. On camera: fill `.rd-property-form input[type="date"]` → `2026-10-12`; fill `.rd-property-form input[type="time"]` → `10:30`; fill `.rd-property-form input[placeholder="Enter a team member's name"]` → `Jordan Sample`; click `button:has-text("Schedule sample inspection")`. Result check: `.rd-property-appointment`. Visible label: Sample appointment · No calendar invitation sent. |
| The worklist and upcoming appointments show the change. Customer records and sample website inquiries are organized in the same workspace. | **worklist — See the updated worklist and appointments.** Focus `.rd-main`; wide framing. Off camera: click `button[aria-label="Close property details"]`; click `nav[aria-label="Dashboard"] a[href="#follow-ups"]`. On camera: scrollTo `.rd-appointments`. |
| All records are fictional. No live weather or contact lookup runs, and no messages or calendar invitations are sent. The handoff to inspection is visible. | **ending — An organized handoff, made visible.** Focus `.rd-main`; wide framing. Off camera: click `nav[aria-label="Dashboard"] a[href="#customers"]`. On camera: hold the real interface. Visible label: Sample workspace · Changes reset on reload. |

**Primary-source inspection notes (capability references; current capture is the table above):**

- Open `/roofing-dashboard` and show `.rd-page-heading`, `.rd-stats` and overview map. Keep `.rd-demo-banner` visible. Alias is confirmed by `vercel.json:37–38`; local path is `/roofing-dashboard/`. `DashboardApp.tsx:107–132`.
- Click a `.rd-weather-row` for a reported hail event, or follow `a[href="#storm-map"]`. Show `.rd-event-detail`, map and `.rd-property-results`. An event selection really changes matching properties. `DashboardApp.tsx:87–102,130–138`. Choose a record eligible for new follow-up.
- Close framing on `.rd-map-caption` and event evidence label; pair with a visible property marker/result. Preserve source/evidence distinctions, particularly report versus warning. `DashboardApp.tsx:137–138`; `PropertyPanel.tsx:161–168`.
- Click `.rd-property-result button` for the selected property; show `.rd-property-facts` and weather. Click `Add to follow-ups`; hold confirmation and new follow-up section. `PropertyPanel.tsx:134–174,195–198`. Do not select a do-not-contact record.
- In `.rd-property-dialog`, select `Contact outcome` → `contacted`; fill `Internal note` → `Sample homeowner requested an inspection.`; click `Save outcome`. Hold success feedback. `PropertyPanel.tsx:21–52`.
- Fill `Inspection date` with `2026-10-12` (fixed demo reference is 2026-10-10), `Time` `10:30`, `Inspector` `Jordan Sample`; click `Schedule sample inspection`. Show `.rd-property-appointment` plus confirmation. `PropertyPanel.tsx:55–94,200–204`; `demo/config.ts:3–6`.
- Close via `Close property details`; click `a[href="#follow-ups"]`; show the changed row and `.rd-appointments` with the same property/date/inspector. Optionally intercut one short customers view to support that final overview sentence, without introducing a second journey. `DashboardApp.tsx:140–147`. Finish with the intended workflow benefit and limitations.

**Limits:** The demo uses an in-memory fixture adapter and resets on reload (`fixtureDataSource.ts:69–85,211`; `DashboardApp.tsx:147`). Scheduling mutates local fixture data and creates no invitation (`fixtureDataSource.ts:160–177`). Enrichment generates fictional contacts (`180–195`); CSV import uses bundled fictional data (`198–208`). Copying an invitation does not send it (`PropertyPanel.tsx:183–192`). Weather is sample data and proximity is not proof of damage. Do not imply the website concepts currently send leads into this workspace.

**Original-media character:** real operations dashboard, map, useful tables, focused property sheet. Use readable crops of the selected property and changed status instead of spending long on a large map with tiny labels. Retain attribution if map tiles appear.

## Verification status

- Source review: completed for all five concepts, including the state-change and completion handlers cited above.
- Original media inspection: opened Mitre's actual first and final desktop frames (`public/demos/cabinetry-2/seq/desktop/f_000.webp`, `f_127.webp`) and Stillwater's `public/demos/pools/organic.webp`. The first Mitre frame is an unbuilt interior with hood, wall outlets and flooring; the final frame visibly adds cabinetry, stone, island and lit pendants. Stillwater's natural option depicts a curved pool, spa, stone terrace and planting. These are shipped concept assets, not new generated film substitutions.
- Actual browser operation: all five journeys now have local capture evidence (Datum 8 beats, Tambour 7, Mitre 7, Stillwater 6, CRM 7), each with an empty page-error array. Capture uses fictional/sample state and blocks API POST requests. See the validation report for current recapture needs.
- Executable shot manifest: `videos/contractor-previews/narrated-other.mjs` remains authoritative. The exact spoken prose and two-column tables above mirror it. Mitre preserves the forward hero progression; Stillwater uses the separately recorded replacement opening rather than accepting the original misrecognized name.
- Narration: all five have retained source takes, imported sentence timing, and independent paced-audio content review. Those checks do not establish subjective pronunciation, natural delivery, final playback quality, or buyer comprehension.
- Representative buyer test: not conducted. No participant responses or business-performance evidence are claimed.

Proposed commit message: `Rebuild contractor previews as narrated product walkthroughs`

## Raw capture keyframe review — 2026-10-28

Reviewed 20 actual PNG keyframes from `output/narrated-previews/` with image viewing, against the current executable scenarios and relevant source handlers. This is a review of captured visible states, not a claim of watching the complete encoded films, listening to narration, or conducting buyer testing. No browser was operated during this review.

| Concept | Captured evidence reviewed | Result |
| --- | --- | --- |
| Datum | `guidance-end.png`, `handoff-start.png`, `handoff-end.png`, `details-end.png`, `result-end.png` | The selected thin vertical basement-wall crack changes from “Watch it” to “Have it looked at” after the growth question is answered Yes. The request starts with “Added from the crack decoder” and the concern already selected. Its completed preview retains the symptom, ZIP 64111 and Alex Sample contact details, and explicitly says nothing was sent. Photos are **None**, consistent with the capture making no photo upload; narration correctly says the form *offers space* for photos. This matches `sections/CrackDecoder.tsx` and `sections/Request.tsx` state/preview behavior. |
| Mitre & Rift | `opening-end.png`, `assembly-end.png`, `finished-end.png`, `process-end.png`, `materials-end.png` | The opening is the empty rendered interior. The later frames contain cabinetry, stone, the island and lit pendant lights; “The finished room” chapter and rendering disclosure are visible. The process shot shows measure → draw → workshop → fit/finish, and the material shot shows the actual five-material palette. These support the current script and `components/Page.tsx`; still frames alone do not verify smoothness or continuity between the assembly stages. |
| Stillwater | `inspiration-end.png`, `planner-end.png`, `brief-end.png`, `ending-end.png` | “The natural escape” is selected and remains selected in the planner. Spa and Lighting, “Within the next year,” and the entered evening-lighting note all appear in the completed project brief. “Download your brief” and “Nothing was sent” are visible. This matches `PoolDetails.tsx`'s local `setBrief` and downloadable text payload. The capture proves that a download is offered, not that a downloaded file was checked in this review. |
| Roofing CRM | `weather-end.png`, `property-end.png`, `outcome-end.png`, `inspection-end.png`, `worklist-end.png`, `ending-end.png` | The workflow stays on 107 Example Ridge Lane / Quinn Fiction. The property is added to follow-ups, the contact outcome and note are saved, then a sample inspection is scheduled for 2026-10-12 at 10:30 with Jordan Sample. Both the updated worklist row and matching upcoming inspection card are visibly present. The final customer view includes customer and website-lead rows, synthetic-source labels, and “No invitation was sent.” This agrees with `PropertyPanel.tsx` and the fixture adapter's in-memory scheduling/status update. |

No concrete input/result mismatch was found in these reviewed states. One edit synchronization check remains: the CRM worklist narration mentions customer records and website inquiries, while the customer table appears in the following `ending` capture. Time that clause with the customer-table shot when assembling the final film. This is an editorial synchronization note, not a request to broaden the demo or add an integration claim.

The final compositions still need their own checks for readable crops, caption placement, scene duration, and preservation of each successful result before closing graphics appear. Existing fictional-record, illustrative-model, local-only and no-message disclosures remain necessary.

Review commit message: `Document verified contractor walkthrough capture outcomes`
