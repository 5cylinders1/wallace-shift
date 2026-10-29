# Narrated roofing walkthrough research

Prepared 2026-10-28 from the source components and their referenced original assets. This document covers Northvane, Alder & Stone, Contour, Halcyon, and Stratum; the Velar pilot is owned separately. The spoken text and two-column tables were synchronized with the current executable scripts on October 28 at 18:45 UTC. Imported audio and remaining validation states are tracked separately in [narrated-validation.md](narrated-validation.md).

## Evidence status and production boundary

- The original source audit preceded browser capture. All five concepts now have eight operated local capture beats each, with saved DOM evidence and start/end images. Current recapture/framing requirements and final-film review states are in [narrated-validation.md](narrated-validation.md). Source inspection is not production-route verification.
- Original stills visually inspected: Alder & Stone's `house-poster.webp` (stone estate at sunset), Halcyon's `sample-slate-vermont-gray.jpg` (the matching white sample home under a slate roof), and Stratum's `hero-poster.jpg` (the authored farmhouse model). Their identities are different and must not be interchanged. Northvane and Contour's principal visuals are authored SVG/Three.js scenes; their recorded journeys are linked in the validation record.
- No real contractor interviews, call transcripts, or customer questions were supplied or located in this narrowly scoped source review. The FAQ and educational copy in these demos are authored product content, not evidence of actual buyer research.
- Use the original working interfaces. The existing 36-second films and their captions were not used as the authority for the product stories.
- Each script gives an overview, follows a coherent visitor journey, and ends with the meaning of the experience to a contractor. Intended usefulness is stated as a design purpose; no conversion or revenue result is claimed.
- Record fictional contact details such as Alex Morgan, alex@example.com, and 202-555-0148. Keep the app's unsent/sample labels visible. Never substitute an image result from one property for the result of an uploaded different property.
- The user kept the Grady voice after viewing the first Velar pilot and requested faster pacing. Current imports use that production direction. Reuse the machinery while preserving each story; buyer validation remains unresolved.

## Northvane

**Buyer takeaway:** Wallace Shift built a roofing website that connects education, a planning estimate, payment exploration, and a structured lead preview, so the next conversation can start with the homeowner's context.

**Journey:** illustrated replacement sequence → sample roof → pitch/material choice → updated planning range → payment scenario → four-step qualification → unsent lead preview retaining the choices.

**Primary evidence:**

- `src/demos/roofers/pages/HomePage.tsx:14–36` describes and wires the complete flow, carrying ballpark, payment, and roof address into the form.
- `src/demos/roofers/timelapse/TimelapseHero.tsx:111–207` implements the scroll-driven architectural sequence and its seven chapters. Its original artwork is built from `timelapse/HouseScene.tsx`, `SceneHouse.tsx`, `SceneActors.tsx`, and the local director/timeline, rather than a customer installation recording.
- `src/demos/roofers/roof/RoofTool.tsx:103–114` distinguishes service measurements, public outlines, and entered-home-size estimates; `:982–1006` implements sample selection and pitch; `:1014–1107` renders the math, material controls, range, and disclosures.
- `src/demos/roofers/components/Financing.tsx:22–36,61–148` derives an initial amount from the estimate, updates actual local calculations, and passes a touched scenario onward.
- `src/demos/roofers/components/EstimateForm.tsx:29,236–325` implements four question steps. `src/demos/roofers/lead.ts:9–69,149–159` defines choices and validation. `src/demos/roofers/components/LeadCard.tsx:27–100` exposes the compiled lead, score, and prior estimator/payment context.
- `src/demos/roofers/leadAdapter.ts:3–27` explicitly has `LEAD_ENDPOINT = null`: submissions return an unsent demo result.
- Raw estimator sample: `src/demos/roofers/roof/sampleLookup.json`; preserve its sample status and attribution rather than presenting it as a new address measurement.

**Current narration (exact executable script):**

> This is Northvane, a roofing website concept by Wallace Shift. It helps homeowners understand the work and prepare for a useful first conversation. The opening illustration walks through the roof replacement, showing how the work comes together. The roof planner then turns choices into a budget. We are using its built-in sample house. Adjust the pitch and choose metal. The roof area and planning range respond. These prices are illustrative. Explore a payment scenario, with the monthly amount and total of payments visible together. The project questions gather the roof concern, payment approach, and timing, before asking for contact details. Those answers become a structured lead preview, alongside the estimate and payment already explored. Nothing is sent from this demonstration. The distinctive feature is the connection: the homeowner’s choices travel with the conversation.

| Exact spoken narration | Screen action, result and disclosure |
| --- | --- |
| This is Northvane, a roofing website concept by Wallace Shift. It helps homeowners understand the work and prepare for a useful first conversation. | **opening — A website that prepares the conversation.** Focus `.rf-timelapse__stage`; wide framing. On camera: hold the real interface. |
| The opening illustration walks through the roof replacement, showing how the work comes together. | **process — Explain the work before discussing the price.** Focus `.rf-timelapse__stage`; wide framing. On camera: scrollTo `#process`. Visible label: Illustrated process · Not customer project footage. |
| The roof planner then turns choices into a budget. We are using its built-in sample house. | **sample — Start with the roof.** Focus `#estimator`; wide framing. On camera: click `button:has-text("Try it on a sample house")`. Result check: `.rf-roof__estimate`. Visible label: Built-in sample house. |
| Adjust the pitch and choose metal. The roof area and planning range respond. These prices are illustrative. | **estimate — See the cost of a different choice.** Focus `.rf-roof__estimate`; right framing. On camera: click `button[aria-label="Steeper"]`; click `button[aria-label="Steeper"]`; click `label:has(input[name="roof-material"][value="metal"])`; scrollTo `.rf-roof__price`. Visible label: Illustrative planning range · Not a quote. |
| Explore a payment scenario, with the monthly amount and total of payments visible together. | **payment — Explore the payment alongside the project.** Focus `.rf-calc`; wide framing. On camera: click `label:has(input[name="finance-plan"][value="60"])`. Visible label: Hypothetical financing · No loan offered. |
| The project questions gather the roof concern, payment approach, and timing, before asking for contact details. | **questions — Give the next conversation useful context.** Focus `.rf-estimate__panel`; right framing. On camera: click `label:has(input[name="issue"][value="aging"])`; click `label:has(input[name="property"][value="house"])`; click `label:has(input[name="roofAge"][value="over20"])`; click `#estimate button[type="submit"]`. Result check: `input[name="insurance"]`. Visible label: Fictional sample answers. |
| Those answers become a structured lead preview, alongside the estimate and payment already explored. Nothing is sent from this demonstration. | **brief — Keep the choices connected.** Focus `.rf-estimate__panel`; right framing. Off camera: click `label:has(input[name="insurance"][value="self"])`; click `label:has(input[name="payment"][value="finance"])`; click `#estimate button[type="submit"]`; click `label:has(input[name="timeline"][value="90"])`; click `label:has(input[name="owner"][value="yes"])`; click `#estimate button[type="submit"]`; fill `#estimate input[autocomplete="name"]` → `Alex Morgan`; fill `#estimate input[autocomplete="tel"]` → `202-555-0148`; fill `#estimate input[autocomplete="email"]` → `alex@example.test`; fill `#estimate input[autocomplete="street-address"]` → `123 Example Lane`; fill `#estimate input[autocomplete="postal-code"]` → `60614`. On camera: click `#estimate button[type="submit"]`; scrollTo `.rf-lead__seen`. Result check: `.rf-lead__seen`. Visible label: Local, unsent lead preview · Fictional contact details. |
| The distinctive feature is the connection: the homeowner’s choices travel with the conversation. | **ending — A more informed starting point..** Focus `.rf-lead__seen`; right framing. On camera: hold the real interface. Visible label: Northvane · Built by Wallace Shift. |

**Limits:** The capture demonstrates the sample/local calculator and unsent lead packaging. It does not prove address coverage, a fresh paid measurement, available financing, delivery to a CRM, or predictive lead-score quality. Do not narrate the visible score as a verified sales prediction.

## Alder & Stone

**Buyer takeaway:** Wallace Shift built an editorial roofing experience that explains the work and lets a homeowner carry a planning estimate into an organized project brief.

**Journey:** cinematic installation chapters → roof planner sample → material/pitch and range → “Use this estimate in my project brief” → property/roof/plans/contact steps → unsent request preview.

**Primary evidence:**

- `src/demos/roofers-2/FilmHero.tsx:5–15,140–195` defines five chapters and controls over the original `public/demos/roofers-2/roof-transformation.mp4` (mobile variant available); `house-poster.webp` is the original poster. The film is expressly an AI concept, not real project documentation or a promised 48-hour schedule.
- `src/demos/roofers-2/EstateRoofing.tsx:24–33` provides the planner, education links, residential/commercial guidance, and next-step framing; `:40–49` renders dedicated guide and estimate pages.
- `src/demos/roofers-2/RoofEstimator.tsx:10–15,22–58` supplies its original `sample-roof.svg`, sample disclosures, session-save handoff, and explicit local-only behavior.
- `src/demos/roofers-2/ProjectForm.tsx:172–183,305–346` labels sample estimates and builds the unsent preview; `:357–412` defines the four question stages and create-preview action.
- `src/demos/roofers-2/estimateContext.ts` owns the estimate handoff between the planner and project-brief document. Browser validation must confirm that storage is available and the sample estimate persists when navigating.

**Current narration (exact executable script):**

> Alder and Stone is Wallace Shift’s editorial roofing concept: a calm, guided path from understanding the work to planning a project. The opening concept film explores preparation, protection, installation, and the final walkthrough. This is an illustration, not a completed customer job. Next, the roof planner lets a visitor explore a sample property, without entering contact details. Adjust the pitch and compare roofing materials. The planning range changes with those choices. When they continue into a project brief, the estimate follows them to the next page. The form gathers the property, roof concern, payment approach, and preferred timing in manageable steps. The result is an organized, unsent request preview. The sample estimate stays clearly identified, and nothing is booked. A considered visual identity, connected to a practical planning journey. Built by Wallace Shift.

| Exact spoken narration | Screen action, result and disclosure |
| --- | --- |
| Alder and Stone is Wallace Shift’s editorial roofing concept: a calm, guided path from understanding the work to planning a project. | **opening — A considered roofing experience.** Focus `.er-film-sticky`; wide framing. On camera: hold the real interface. |
| The opening concept film explores preparation, protection, installation, and the final walkthrough. This is an illustration, not a completed customer job. | **process — Make the process visible.** Focus `.er-film-sticky`; wide framing. On camera: click `button[aria-label="Show chapter 3: Protect"]`; click `button[aria-label="Show chapter 4: Install"]`. Visible label: AI concept film · Illustrative sequence. |
| Next, the roof planner lets a visitor explore a sample property, without entering contact details. | **sample — A clearer starting point.** Focus `#roof-planner`; wide framing. On camera: click `button:has-text("Try it on a sample house")`. Result check: `.rf-roof__estimate`. Visible label: Built-in sample house. |
| Adjust the pitch and compare roofing materials. The planning range changes with those choices. | **estimate — Compare the choices and their planning range.** Focus `.rf-roof__estimate`; right framing. On camera: click `button[aria-label="Steeper"]`; click `label:has(input[name="roof-material"][value="metal"])`; scrollTo `.rf-roof__price`. Visible label: Illustrative prices · Not a contractor quote. |
| When they continue into a project brief, the estimate follows them to the next page. | **handoff — The estimate follows the visitor.** Focus `.er-form-roof-estimate`; left framing. Off camera: click `a:has-text("Use this estimate in my project brief")`. On camera: hold the real interface. Result check: `.er-form-roof-estimate`. Visible label: Sample estimate retained in this browser tab. |
| The form gathers the property, roof concern, payment approach, and preferred timing in manageable steps. | **questions — Build the brief one step at a time.** Focus `.er-project-form-panel`; right framing. On camera: click `.er-form-choice:has(input[value="residential"])`; click `.er-form-choice:has(input[value="owner"])`; fill `input[name="postal-code"]` → `60614`; click `.er-form-actions .er-form-button-primary`. Result check: `input[value="replacement"]`. Visible label: Fictional sample answers. |
| The result is an organized, unsent request preview. The sample estimate stays clearly identified, and nothing is booked. | **brief — A project brief ready to review.** Focus `.er-project-form-panel`; right framing. Off camera: click `.er-form-choice:has(input[value="replacement"])`; click `.er-form-choice:has(input[value="planning"])`; click `.er-form-actions .er-form-button-primary`; click `.er-form-choice:has(input[value="self-funded"])`; select `.er-project-form select` → `one-to-three-months`; click `.er-form-actions .er-form-button-primary`; fill `input[name="name"]` → `Alex Morgan`; fill `input[name="email"]` → `alex@example.test`; fill `input[name="tel"]` → `202-555-0148`; click `.er-form-choice:has(input[value="email"])`; click `.er-form-consent label`. On camera: click `.er-project-form button[type="submit"]`. Result check: `.er-form-preview`. Visible label: Local, unsent project brief · Fictional contact details. |
| A considered visual identity, connected to a practical planning journey. Built by Wallace Shift. | **ending — Design and planning, working together..** Focus `.er-form-preview`; right framing. On camera: hold the real interface. |

**Limits:** Do not imply a real crew, real installation duration, manufacturer relationship, financing availability, submitted appointment, or customer project. The original visual film is AI-generated and must remain identified as such. The captured handoff evidence is linked in the validation report; a readable final crop is still required.

## Contour

**Buyer takeaway:** Wallace Shift built a compact, analytical roofing experience that connects visual explanation, planning numbers, payment exploration, and a clear project summary.

**Journey:** illustrative 3D roof study → separate sample estimator → material-dependent range → payment explorer → local project brief containing estimate and priorities.

**Primary evidence:**

- `src/demos/roofers-3/RoofScan.tsx:78–134,167–227` builds the original Three.js house and animated scan; `:355–384` exposes top/3D view controls and explicitly labels it an illustrative model with fixed sample callouts.
- `src/demos/roofers-3/ContourRoofing.tsx:9` removes sample imagery so the estimator is not the same model as the hero; `:62–69` explains that the 3D scan is separate from the estimate and selects source-specific disclaimers.
- `ContourRoofing.tsx:23–37` calculates a hypothetical loan, including total repayment and interest; the “Use the midpoint of my estimate” action transfers the range into that calculator.
- `ContourRoofing.tsx:40–54` gathers an unsent brief in local React state, retaining the selected estimate and source; no HTTP submission is involved.
- `ContourRoofing.tsx:70–75` includes process, insurance, warranty education and the fictional-contractor disclosure. Those text sections are product overview context, not evidence of real services or coverage.

**Current narration (exact executable script):**

> Contour is a roofing website concept by Wallace Shift, built around clear decisions and a visual introduction to the roof. Its interactive three-dimensional study offers a top view. This is an illustrative model, not a measurement of the visitor’s property. The separate estimator lets a homeowner explore a sample roof and begin comparing the options. Choose metal and the planning range updates. These are sample prices, not a contractor quote. Use the estimate’s midpoint in the payment explorer. Change the term and compare both the monthly payment and total repayment. The visitor then brings their roof concern, timing, and estimate together in a project brief. This creates an unsent preview with the selected options and sample pricing clearly identified. A visual explanation becomes a practical comparison and an organized starting point for the contractor conversation.

| Exact spoken narration | Screen action, result and disclosure |
| --- | --- |
| Contour is a roofing website concept by Wallace Shift, built around clear decisions and a visual introduction to the roof. | **opening — A clearer view of the decision.** Focus `.ct-hero`; wide framing. On camera: hold the real interface. |
| Its interactive three-dimensional study offers a top view. This is an illustrative model, not a measurement of the visitor’s property. | **model — Explore the roof from another angle.** Focus `.ct-scan`; right framing. On camera: click `button[aria-label="Switch to top view"]`. Visible label: Illustrative model · Property measured separately. |
| The separate estimator lets a homeowner explore a sample roof and begin comparing the options. | **sample — Move into the separate estimator.** Focus `#estimator`; wide framing. On camera: click `button:has-text("Try it on a sample house")`. Result check: `.rf-roof__estimate`. Visible label: Built-in sample property. |
| Choose metal and the planning range updates. These are sample prices, not a contractor quote. | **estimate — Connect a material choice to the budget.** Focus `.rf-roof__estimate`; right framing. On camera: click `label:has(input[name="roof-material"][value="metal"])`; scrollTo `.rf-roof__price`. Visible label: Illustrative planning range. |
| Use the estimate’s midpoint in the payment explorer. Change the term and compare both the monthly payment and total repayment. | **payment — Compare monthly payment and total repayment.** Focus `.ct-calculator`; wide framing. On camera: click `button:has-text("Use the midpoint of my estimate")` at 0.8s; fill `.ct-calc-fields label:has-text("Term (months)") input` → `60` at 3s. Result check: `.ct-loan-totals`. Visible label: Hypothetical fixed-rate loan · No fees included. |
| The visitor then brings their roof concern, timing, and estimate together in a project brief. | **questions — Bring the project into focus.** Focus `.ct-brief-panel`; right framing. Off camera: fill `#project-brief input[name="name"]` → `Alex Morgan`; fill `#project-brief input[name="email"]` → `alex@example.test`. On camera: select `#project-brief select[name="issue"]` → `Planning a replacement`; select `#project-brief select[name="timing"]` → `In the next few months`. Visible label: Fictional sample details. |
| This creates an unsent preview with the selected options and sample pricing clearly identified. | **brief — An organized starting point.** Focus `.ct-brief-panel`; right framing. On camera: click `#project-brief button[type="submit"]`. Result check: `.ct-preview`. Visible label: Unsent project preview · No inspection booked. |
| A visual explanation becomes a practical comparison and an organized starting point for the contractor conversation. | **ending — From explanation to a useful conversation..** Focus `.ct-preview`; right framing. On camera: hold the real interface. |

**Limits:** The hero scan is animation of authored geometry, not a survey or live scan of user input. The estimator uses the shared RoofTool but its own sample display. The calculator is a hypothetical fixed-rate example with no fees, not a lender offer. No booking or submission occurs.

## Halcyon

**Buyer takeaway:** Wallace Shift built a premium roofing experience that connects an architectural material presentation, a photo-based design comparison, and a consultation brief carrying the selected design.

**Journey:** estate flight → material gallery → sample original and prepared roof studies → planning area/range → consultation including the selected material, finish, area, and range.

**Primary evidence:**

- `src/demos/roofers-4/DroneFilm.tsx:20,129–158` uses original `public/demos/roofers-4/estate-poster.jpg` and `estate-flight.mp4` (mobile variant available). It is concept imagery, not a record of contractor work.
- `src/demos/roofers-4/MaterialGallery.tsx:88–131` presents five original material studies with carousel navigation and illustrative planning rates; raw material paths and descriptions are in `content.ts`.
- `src/demos/roofers-4/Visualizer.tsx:19,60–95,167–216` starts with a genuine shipped prepared sample; `:231–261` implements a consented `/api/roof-render` request for new photos/designs; `:321–366` provides original/preview/compare/upload/download controls.
- `Visualizer.tsx:370–404` exposes material/finish, area/complexity, range, and consultation link. Area is supplied by the visitor, not automatically measured from the photo.
- `src/demos/roofers-4/prepared-previews.ts:15–32` maps each material's first finish to a prepared study of only the Halcyon sample home. Changing to another finish can require a new generation.
- `src/demos/roofers-4/HalcyonRoofworks.tsx:57–65,186–227` carries material, finish, area, and range into the local consultation preview. `:116–150` is a static Ledger mock (`role="img"`), not an operational customer portal.

**Current narration (exact executable script):**

> Halcyon is Wallace Shift’s architectural roofing concept. A cinematic estate view introduces a premium, material-led experience. A detailed gallery brings the materials, their character, and their planning information together. The visualizer accepts a photograph, then offers material and finish choices. A new generation requires permission to send the image. Here we use prepared sample studies. Switch from metal to slate, then compare the result with the original home. Enter a roof area to explore an illustrative planning range. The photograph itself does not measure the roof. Those material and budget choices carry into a consultation brief, alongside the project and timeline. Review the resulting preview. Nothing is sent, stored, or booked in this demonstration. A premium website connecting visual inspiration with a more specific project conversation, by Wallace Shift.

| Exact spoken narration | Screen action, result and disclosure |
| --- | --- |
| Halcyon is Wallace Shift’s architectural roofing concept. A cinematic estate view introduces a premium, material-led experience. | **opening — Architecture leads the experience.** Focus `.hr-film`; wide framing. On camera: hold the real interface. Visible label: Concept imagery · Fictional roofing brand. |
| A detailed gallery brings the materials, their character, and their planning information together. | **materials — Give each material room to speak.** Focus `.hr-gallery-stage`; wide framing. On camera: click `button[aria-label="Next material"]`. Visible label: Material studies · Illustrative planning rates. |
| The visualizer accepts a photograph, then offers material and finish choices. A new generation requires permission to send the image. | **photo — Start with a photograph.** Focus `.hr-viz-stage`; left framing. On camera: upload `input[aria-label="Upload a photograph of your home"]` → `public/demos/roofers-4/sample-home.jpg`. Visible label: Local photo preparation · No generation request sent. |
| Here we use prepared sample studies. Switch from metal to slate, then compare the result with the original home. | **comparison — Compare the design on the same home.** Focus `.hr-viz-image-wrap`; left framing. Off camera: click `.hr-tool:has-text("Use sample")`. On camera: click `.hr-viz-materials button:has-text("Natural slate")`; click `.hr-tool:has-text("Compare")`; press `.hr-viz-compare-handle` → `PageDown`; press `.hr-viz-compare-handle` → `PageDown`; press `.hr-viz-compare-handle` → `PageUp`. Visible label: Prepared sample studies · No new image generated. |
| Enter a roof area to explore an illustrative planning range. The photograph itself does not measure the roof. | **planning — Explore a planning range.** Focus `.hr-viz-estimate`; right framing. On camera: fill `input[aria-label="Roof area in square feet"]` → `3000`. Visible label: User-entered area · Illustrative prices, not a quote. |
| Those material and budget choices carry into a consultation brief, alongside the project and timeline. | **handoff — Keep the design attached to the brief.** Focus `.hr-form`; right framing. Off camera: fill `.hr-form input[name="name"]` → `Alex Morgan`; fill `.hr-form input[name="email"]` → `alex@example.test`. On camera: select `.hr-form select[name="timeline"]` → `season`. Result check: `.hr-form-check`. Visible label: Fictional contact details. |
| Review the resulting preview. Nothing is sent, stored, or booked in this demonstration. | **brief — Review the whole request.** Focus `.hr-form`; wide framing. On camera: click `.hr-form button[type="submit"]`; scrollTo `#consultation-preview`. Result check: `#consultation-preview`. Visible label: Local, unsent consultation preview. |
| A premium website connecting visual inspiration with a more specific project conversation, by Wallace Shift. | **ending — Inspiration with a useful next step..** Focus `#consultation-preview`; wide framing. On camera: hold the real interface. |

**Limits:** New AI generation is implemented but must not be claimed freshly tested by this film if only sample results are captured. Upload sends nothing until generation is requested with consent. AI previews can alter architectural details; roof area is user-entered. The Ledger is nonfunctional concept UI. No actual survey, consultation booking, integration, warranty, or client project is proven here.

## Stratum

**Buyer takeaway:** Wallace Shift built a roofing website around one responsive 3D model that explains the roof system, supports design exploration, recalculates a sample planning range, and carries the chosen design into an inspection brief.

**Journey:** responsive roof model → roof anatomy → studio geometry/material → updated model measurements/range → design attached to request → unsent inspection preview.

**Primary evidence:**

- `src/demos/roofers-6/StratumRoofing.tsx:74–126` keeps one model synchronized across hero, anatomy, services, and studio. `:132–155` derives model metrics and turns the current design into a booking summary.
- `src/demos/roofers-6/sections/Hero.tsx:24–63` contains service modes and model HUD. The original geometry/material rendering is in `engine/RoofEngine.ts`, `engine/roof.ts`, `engine/model.ts`, and `engine/textures.ts`; `stage/Stage.tsx:4–5` references original fallback posters, not proof of a rendered model.
- `src/demos/roofers-6/sections/Anatomy.tsx` and `content.ts` define the layer-by-layer roof explanation.
- `src/demos/roofers-6/sections/Studio.tsx:72–120` implements form/pitch/finish/color controls; `:123–145` adds upgrades and light/camera; `:149–163` displays computed metrics, planning range, and sample disclaimer.
- `src/demos/roofers-6/sections/Booking.tsx:44–55,75–118` retains the design and creates an unsent preview in local state.
- `src/demos/roofers-6/engine/measure.ts` and `pricing.ts` calculate geometry and illustrative rates on the authored sample home. They do not consume a real property's aerial measurements.

**Current narration (exact executable script):**

> Stratum is a roofing website concept by Wallace Shift, built around one live, interactive model. As the visitor moves through the page, the same house helps explain the roof as a system, including the layers underneath. In the roof studio, change the roof form and adjust the pitch. The model and its calculated measurements respond. Choose a different finish and see its illustrative planning range alongside the roof area. Switch to an aerial view to inspect the design, then carry that choice into an inspection request. The selected material, geometry, and range arrive together in the brief, keeping those choices connected. This is a sample home, and the request remains an unsent demo preview. No inspection is booked. An interactive explanation becomes a practical starting point for discussing a roof project. Built by Wallace Shift.

| Exact spoken narration | Screen action, result and disclosure |
| --- | --- |
| Stratum is a roofing website concept by Wallace Shift, built around one live, interactive model. | **opening — One roof. A complete explanation..** Focus `.st-hero`; wide framing. On camera: hold the real interface. Result check: `.st-site.is-live`. |
| As the visitor moves through the page, the same house helps explain the roof as a system, including the layers underneath. | **anatomy — Show the layers beneath the finish.** Focus `#anatomy [data-step="3"]`; wide framing. On camera: scrollTo `#anatomy [data-step="6"]`. Visible label: Authored sample geometry · Not a property survey. |
| In the roof studio, change the roof form and adjust the pitch. The model and its calculated measurements respond. | **shape — Explore the roof form and pitch.** Focus `.st-studio-panel`; wide framing. On camera: click `label:has(input[name="st-style"]):has-text("Hip")`; range `#st-studio-panel-shape input[type="range"]` → `8`. Visible label: Calculated from the sample model. |
| Choose a different finish and see its illustrative planning range alongside the roof area. | **finish — See the material and its planning range.** Focus `.st-studio-panel`; left framing. Off camera: click `#st-studio-tab-finish`. On camera: click `.st-finish:has-text("Metal")`; scrollTo `.st-readout`. Visible label: Sample home · Illustrative rates, not a quote. |
| Switch to an aerial view to inspect the design, then carry that choice into an inspection request. | **view — Inspect the design from above.** Focus `.st-studio-panel`; wide framing. Off camera: click `#st-studio-tab-light`. On camera: click `label:has(input[name="st-view"]):has-text("Aerial")`. Visible label: Actual model camera control. |
| The selected material, geometry, and range arrive together in the brief, keeping those choices connected. | **handoff — Keep the design connected to the request.** Focus `.st-book-card`; right framing. Off camera: click `button:has-text("Add this design to my request")`. On camera: hold the real interface. Result check: `.st-design-chip`. Visible label: Sample design attached to the brief. |
| This is a sample home, and the request remains an unsent demo preview. No inspection is booked. | **brief — Review the resulting inspection brief.** Focus `.st-book-card`; right framing. Off camera: fill `#book input[name="name"]` → `Alex Morgan`; fill `#book input[name="email"]` → `alex@example.test`; select `#book select[name="timing"]` → `In the next few months`. On camera: click `#book button[type="submit"]`. Result check: `.st-preview`. Visible label: Local, unsent request · Fictional contact details. |
| An interactive explanation becomes a practical starting point for discussing a roof project. Built by Wallace Shift. | **ending — An explanation that leads somewhere..** Focus `.st-preview`; right framing. On camera: hold the real interface. |

**Limits:** Live 3D means browser-rendered authored geometry, not a digital twin of an uploaded home. Computed roof area comes from that geometry. Pricing is illustrative, the sample garage pitch is separately constrained, and no inspection is booked. Storm/health-check routing may be shown in another cut but is not needed to explain this focused journey.

## Acceptance evidence to collect during capture

For each film, record the starting URL, selected choices, before/after output text, route changes, and final local-only result. Save a screenshot at each meaningful state. Every spoken capability needs a matching successful screen operation; implementation alone is not enough for the final claim. Keep network submission blocked during capture, apart from the local interactions necessary for the app itself.

The closing comprehension questions are: What did Wallace Shift build? What can a visitor do from start to finish? What makes this concept different? Which outputs are samples or unsent? No participant result is claimed in this document.

Suggested commit message for this research: `Document source-backed stories for narrated roofing walkthroughs`.
