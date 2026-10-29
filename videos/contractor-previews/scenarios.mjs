/**
 * Real-browser capture direction. Each scene is twelve seconds; every film is
 * thirty-six seconds. These selectors target the shipping demo UI, not a
 * reconstructed interface. All mutations below stay in local demo state.
 *
 * Capture runner: scroll `focus` into view before executing scene actions.
 * A `goto` action changes pages through the real router; focus may then be
 * re-applied after navigation. Record a pause between actions for readability.
 */
export const scenarios = [
  // src/demos/roofers/pages/HomePage.tsx; roof/RoofTool.tsx; roof/PitchPicker.tsx.
  {
    id: 'northvane', name: 'Northvane Roofing', path: '/northvane',
    tagline: 'A roof story that becomes a planning range.',
    disclosure: 'Sample property · illustrative planning range · fictional demo brand',
    scenes: [
      { title: 'See the work unfold', caption: 'Scroll the illustrated roof replacement and see the property-protection step unfold.', focus: '.rf-timelapse', actions: [{ kind: 'scroll', y: 1100 }] },
      { title: 'Start with a sample roof', caption: 'A sample property unlocks roof size, pitch and material controls.', focus: '.rf-roof__body', actions: [{ kind: 'click', selector: '.rf-roof__alts button:first-child' }] },
      { title: 'Explore what changes the budget', caption: 'Change the pitch and material to see the illustrative planning range respond.', focus: '[data-step="pitch"]', actions: [{ kind: 'click', selector: 'button[aria-label="Steeper"]' }, { kind: 'click', selector: '[data-field="roof-material"] label:nth-child(2)' }] },
    ],
  },
  // src/demos/roofers-2/FilmHero.tsx and RoofEstimator.tsx share the real RoofTool.
  {
    id: 'alder-stone', name: 'Alder & Stone', path: '/alder-stone',
    tagline: 'A cinematic introduction. A practical starting point.',
    disclosure: 'AI concept film · sample property · illustrative planning range',
    scenes: [
      { title: 'Understand the transformation', caption: 'Use the real chapter controls to explore the roof replacement sequence.', focus: '.er-film-sticky', actions: [{ kind: 'click', selector: '.er-stage-track button:nth-child(2)' }, { kind: 'click', selector: '.er-stage-track button:nth-child(4)' }] },
      { title: 'Move from the film to a plan', caption: 'Try a sample home in the roof planner without entering contact details.', focus: '#roof-planner', actions: [{ kind: 'click', selector: '.rf-roof__alts button:first-child' }] },
      { title: 'Compare the investment', caption: 'Material choices update a sample planning range before the project brief.', focus: '[data-step="estimate"]', actions: [{ kind: 'click', selector: '[data-field="roof-material"] label:nth-child(2)' }] },
    ],
  },
  // src/demos/roofers-3/ContourRoofing.tsx and RoofScan.tsx; no address lookup.
  {
    id: 'contour', name: 'Contour Roofing', path: '/contour',
    tagline: 'A clearer view of the roof and the numbers.',
    disclosure: 'Illustrative 3D model · sample roof · planning figures, not a quote',
    scenes: [
      { title: 'See the roof in perspective', caption: 'The illustrative 3D survey switches between perspective and top view.', focus: '.ct-hero', actions: [{ kind: 'click', selector: 'button[aria-label="Switch to top view"]' }] },
      { title: 'Build a sample estimate', caption: 'Select the sample property, then change the roof pitch to explore the range.', focus: '#estimator .rf-roof__body', actions: [{ kind: 'click', selector: '.rf-roof__alts button:first-child' }, { kind: 'click', selector: 'button[aria-label="Steeper"]' }] },
      { title: 'Explore a payment scenario', caption: 'Adjust a hypothetical loan amount and review repayment alongside the monthly figure.', focus: '#financing .ct-calculator', actions: [{ kind: 'fill', selector: '.ct-calc-fields label:first-child input', value: '24000' }] },
    ],
  },
  // src/demos/roofers-4/{DroneFilm,Visualizer,prepared-previews}.tsx/.ts.
  // Material two is slate; only prepared sample images are selected.
  {
    id: 'halcyon', name: 'Halcyon Roofworks', path: '/halcyon',
    tagline: 'An architectural roof, explored from every angle.',
    disclosure: 'AI concept film · prepared sample study · no live generation shown',
    scenes: [
      { title: 'Begin with the architecture', caption: 'A concept drone film introduces the estate and its roof.', focus: '.hr-film-pin', actions: [{ kind: 'click', selector: '.hr-film-button:first-child' }] },
      { title: 'Choose a prepared roof study', caption: 'Choose slate on the sample residence and see the prepared material preview.', focus: '.hr-viz', actions: [{ kind: 'click', selector: '.hr-viz-materials button:nth-child(2)' }] },
      { title: 'Compare the change', caption: 'Switch between the original photo and the prepared roof concept.', focus: '.hr-viz-image-wrap', actions: [{ kind: 'click', selector: '.hr-viz-tools[aria-label="Photo view"] button:nth-child(1)' }, { kind: 'click', selector: '.hr-viz-tools[aria-label="Photo view"] button:nth-child(3)' }] },
    ],
  },
  // src/demos/roofers-6/sections/{Hero,Studio}.tsx; catalog.ts.
  {
    id: 'stratum', name: 'Stratum Roofing Co.', path: '/stratum',
    tagline: 'One live 3D home, from storm to specification.',
    disclosure: 'Sample 3D home · illustrative measurements and planning prices',
    scenes: [
      { title: 'Watch the roof respond', caption: 'Select storm mode and see weather play across the live 3D home.', focus: '.st-hero', actions: [{ kind: 'click', selector: '.st-mode-buttons button:first-child' }] },
      { title: 'Change the roof design', caption: 'The roof studio changes the sample model and recalculates its measurements.', focus: '.st-studio-panel', actions: [{ kind: 'click', selector: '#st-studio-panel-shape label:has(input[name="st-style"]):nth-of-type(2)' }] },
      { title: 'Specify the finish', caption: 'Choose a standing-seam finish and review the updated planning range.', focus: '.st-studio-panel', actions: [{ kind: 'click', selector: '#st-studio-tab-finish' }, { kind: 'click', selector: '.st-finishes label:nth-child(2)' }] },
    ],
  },
  // src/demos/foundation/sections/Story.tsx and sections/CrackDecoder.tsx.
  {
    id: 'datum', name: 'Datum', path: '/datum',
    tagline: 'Make the hidden ground beneath a house visible.',
    disclosure: 'Illustrative 3D model · movement exaggerated · guide, not a diagnosis',
    scenes: [
      { title: 'Look below the surface', caption: 'Switch seasons to see the sample house and the ground beneath it respond.', focus: '.dt-hero', actions: [{ kind: 'click', selector: '.dt-hud-seasons button:nth-child(2)' }, { kind: 'click', selector: '.dt-hud-seasons button:nth-child(4)' }] },
      { title: 'Explore what a crack can mean', caption: 'Choose a visible symptom to reveal guidance and useful follow-up questions.', focus: '#decoder', actions: [{ kind: 'click', selector: '.dt-symptom:first-child' }] },
      { title: 'Try a water-management fix', caption: 'Storm mode shows how a selected fix changes the sample basement readout.', focus: '#storm', actions: [{ kind: 'click', selector: '.dt-fixes li:first-child button' }, { kind: 'click', selector: '.dt-fixes li:nth-child(3) button' }] },
    ],
  },
  // src/demos/cabinetry/components/{BuildFilm,MaterialLibrary}.tsx.
  {
    id: 'tambour', name: 'Tambour', path: '/tambour',
    tagline: 'From an empty room to a considered material palette.',
    disclosure: 'Illustrative build sequence · generated imagery · fictional demo brand',
    scenes: [
      { title: 'Watch the room take shape', caption: 'Scroll from the room blueprint through the kitchen build sequence.', focus: '.tb-build-stage', actions: [{ kind: 'scroll', y: 1500 }] },
      { title: 'Choose what you want to touch', caption: 'Add a wood finish to a sample box before the design conversation.', focus: '.tb-library', actions: [{ kind: 'click', selector: '.tb-swatch:first-child .tb-swatch-toggle' }] },
      { title: 'Build a material shortlist', caption: 'Explore stone finishes and add them to the same sample box.', focus: '.tb-library', actions: [{ kind: 'click', selector: '#tb-tab-stone' }, { kind: 'click', selector: '.tb-swatch:first-child .tb-swatch-toggle' }] },
    ],
  },
  // src/demos/cabinetry-2/components/SceneHero.tsx; content.ts PIN_VH=4.66.
  // Normal scroll drives the shipped 128-frame kitchen sequence.
  {
    id: 'mitre', name: 'Mitre & Rift', path: '/mitre',
    tagline: 'A kitchen assembled in a continuous architectural view.',
    disclosure: 'Rendered 3D concept sequence · fictional demo brand',
    scenes: [
      { title: 'Start with the empty room', caption: 'The kitchen starts as a room and fills as the visitor scrolls.', focus: '.mr-stage', actions: [{ kind: 'scroll', y: 900 }] },
      { title: 'Bring the details together', caption: 'Cabinetry, stone and lighting arrive in the same continuous camera view.', focus: '.mr-stage', actions: [{ kind: 'scroll', y: 2000 }] },
      { title: 'See the finished palette', caption: 'Explore the finished kitchen’s material palette.', focus: '.mr-stage', actions: [{ kind: 'scroll', y: 2800 }, { kind: 'click', selector: '.mr-nav a[href="#materials"]' }] },
    ],
  },
  // src/demos/pools/PoolHero.tsx and PoolDetails.tsx. Planner remains unsent.
  {
    id: 'stillwater', name: 'Stillwater Pool Co.', path: '/stillwater',
    tagline: 'A backyard transformation that becomes a project brief.',
    disclosure: 'Concept imagery · local project brief · nothing sent or booked',
    scenes: [
      { title: 'Watch the backyard transform', caption: 'Move through the pool construction stages from plan to finished water.', focus: '.sw-hero', actions: [{ kind: 'click', selector: '.sw-stages button:nth-child(4)' }, { kind: 'click', selector: '.sw-stages button:nth-child(6)' }] },
      { title: 'Find the feeling that fits', caption: 'Switch the pool inspiration to a quieter architectural courtyard.', focus: '.sw-inspiration-grid', actions: [{ kind: 'click', selector: '.sw-inspiration-choices button:nth-child(2)' }] },
      { title: 'Turn choices into a brief', caption: 'Choose a timeframe and create an unsent project brief with the selected style.', focus: '#plan', expect: '.sw-brief', actions: [{ kind: 'select', selector: '#sw-project-timeframe', value: 'Within the next year' }, { kind: 'click', selector: '.sw-planner-submit' }] },
    ],
  },
  // src/roofing-dashboard/DashboardApp.tsx and demo/fixtures.ts.
  // Navigation and read-only record inspection do not send outreach.
  {
    id: 'roofing-crm', name: 'Roofing CRM', path: '/roofing-dashboard',
    tagline: 'See the next action behind the customer inquiry.',
    disclosure: 'Fictional CRM records and sample weather · no live integrations',
    scenes: [
      { title: 'See the sample workspace', caption: 'Sample weather, customer properties and follow-ups share one overview.', focus: '.rd-main', actions: [] },
      { title: 'Find the right customer record', caption: 'Open the customer table and filter existing customers from the sample data.', focus: '.rd-main', actions: [{ kind: 'click', selector: 'nav[aria-label="Dashboard"] a[href="#customers"]' }, { kind: 'select', selector: 'select[aria-label="Customer relationship"]', value: 'customer' }] },
      { title: 'See the next inspection step', caption: 'Review contact status and next steps in the sample inspection worklist.', focus: '.rd-main', actions: [{ kind: 'click', selector: 'nav[aria-label="Dashboard"] a[href="#follow-ups"]' }] },
    ],
  },
]
