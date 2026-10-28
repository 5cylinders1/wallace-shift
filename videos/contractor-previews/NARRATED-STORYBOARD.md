# Velar narrated pilot

Format: 1920×1080. Narration and measured timing are produced from narrated-pilot.mjs. Actual source footage is captured with Playwright from the local gated demo. DESIGN: NARRATED-DESIGN.md. Opening and ending identify Wallace Shift; Velar is clearly a fictional concept.

The two-column script below mirrors the current executable pilot. Capture directions include preparation performed off camera; only the listed on-camera actions are claimed as visible behavior.

| Exact spoken narration | Screen action, result and disclosure |
| --- | --- |
| What if a roofing website helped homeowners explore the decision before the first conversation? This is Velar, a concept built by Wallace Shift. | **opening — A roofing website with a complete journey.** Focus `.va-hero`; wide framing. On camera: hold the real interface. |
| An architectural opening and material collection lead into a roof design studio. | **overview — Architecture. Materials. Design..** Focus `#materials`; wide framing. On camera: scrollTo `.va-material-grid`. |
| Upload a photograph, then choose a material and finish. The photo is prepared locally, with consent required before sending it for generation. | **photo — Start with a photograph.** Focus `.va-visualizer`; wide framing. On camera: upload `input[type="file"]` → `public/demos/roofers-5/residence-original.jpg`; click `.va-viz-materials button:nth-child(2)`. Visible label: Photo preparation shown · No generation request sent. |
| We are using prepared sample studies here. Compare the original with slate, then explore the same home in metal. | **comparison — See the choice on the same home.** Focus `.va-viz-viewer`; left framing. Off camera: click `.va-viz-photo-actions button:nth-child(2)`. On camera: click `.va-viz-view-switch button:nth-child(3)`; range `input[aria-label="Original and preview comparison position"]` → `24`; range `input[aria-label="Original and preview comparison position"]` → `78`; click `.va-viz-materials button:nth-child(2)`. Visible label: Prepared sample studies · AI design concepts. |
| Enter measured roof area and complexity to explore an illustrative planning range. The photograph itself does not measure the roof. | **planning — Connect the design to a planning range.** Focus `.va-viz-planning`; right framing. Off camera: click `.va-viz-planning summary`. On camera: fill `.va-viz-area input` → `2800`; select `.va-viz-complexity select` → `simple`. Visible label: Illustrative allowance · Not a quote or roof measurement. |
| Those choices carry into a project brief, keeping the conversation connected. This demo prepares the brief locally; nothing is sent. | **brief — Carry the choices into the conversation.** Focus `#consultation`; right framing. Off camera: fill `input[name="name"]` → `Alex Morgan`; fill `input[name="email"]` → `alex@example.test`; fill `input[name="location"]` → `Cedar Cove`; fill `textarea[name="notes"]` → `Explore a standing-seam roof with a charcoal finish.`. On camera: click `#consultation button[type="submit"]`. Visible label: Sample details · Local, unsent project brief. |
| A separate sample project room shows how approvals, site updates and documents could be presented after the sale. | **portal — A view of the client experience.** Focus `.va-portal`; wide framing. On camera: click `.va-portal-approve-button`; click `#va-portal-tab-journal`; click `#va-portal-tab-documents`. Visible label: Fictional project records · Demonstration only. |
| From first impression to a more informed conversation. A tailored roofing experience, by Wallace Shift. | **ending — Built around the whole experience..** Focus `.va-hero`; wide framing. On camera: hold the real interface. |

## Asset audit
- Existing Velar architectural hero MP4: source hero/ending; no generated substitute.
- residence-original.jpg and prepared slate/metal JPEGs: source photo/compare workflow.
- Four material images: actual material collection.
- project-progress.jpg and sample document data: actual fictional portal.
- Source components: VelarRoofAtelier.tsx, RoofVisualizer.tsx, OwnerPortal.tsx, materials.ts.
- Previous silent film: retained only as evaluation baseline, never as product source.

## Validation gap
No representative contractor buyers are currently participating. The five-person unaided comprehension protocol and current evidence states are in [narrated-validation.md](../../docs/demos/narrated-validation.md). Technical/editorial review cannot substitute for that test.
