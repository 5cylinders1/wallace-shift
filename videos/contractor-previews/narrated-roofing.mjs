// Source-backed capture recipes. Current browser validation is pending until
// narrated-capture.mjs successfully operates each journey. See the research doc.
const click = selector => ({kind:'click',selector})
const fill = (selector,value) => ({kind:'fill',selector,value})
const select = (selector,value) => ({kind:'select',selector,value})
const press = (selector,key) => ({kind:'press',selector,key})
const radio = (name,value) => click(`label:has(input[name="${name}"][value="${value}"])`)
const sample = click('button:has-text("Try it on a sample house")')
const metal = radio('roof-material','metal')
const nextNorthvane = click('#estimate button[type="submit"]')
const nextAlder = click('.er-form-actions .er-form-button-primary')
const alderChoice = value => click(`.er-form-choice:has(input[value="${value}"])`)

export const narratedRoofing = [
 {
  id:'northvane',name:'Northvane Roofing',path:'/northvane',accent:'#b4582a',
  takeaway:'Education, a sample roof estimate and payment exploration carry forward into an unsent structured lead preview.',
  disclosure:'Fictional contractor · Sample roof · Illustrative prices and financing',
  scenes:[
   {id:'opening',title:'A website that prepares the conversation',focus:'.rf-timelapse__stage',frame:'wide',spoken:'This is Northvane, a roofing website concept by Wallace Shift. It helps homeowners understand the work and prepare for a useful first conversation.',actions:[]},
   {id:'process',title:'Explain the work before discussing the price',focus:'.rf-timelapse__stage',frame:'wide',spoken:'The opening illustration walks through the roof replacement, showing how the work comes together.',actions:[{kind:'scrollTo',selector:'#process'}],label:'Illustrated process · Not customer project footage'},
   {id:'sample',title:'Start with the roof',focus:'#estimator',frame:'wide',spoken:'The roof planner then turns choices into a budget. We are using its built-in sample house.',actions:[sample],expect:'.rf-roof__estimate',label:'Built-in sample house'},
   {id:'estimate',title:'See the cost of a different choice',focus:'.rf-roof__estimate',frame:'right',spoken:'Adjust the pitch and choose metal. The roof area and planning range respond. These prices are illustrative.',actions:[{...click('button[aria-label="Steeper"]'),at:.8},{...click('button[aria-label="Steeper"]'),at:1.2},{...metal,at:1.7},{kind:'scrollTo',selector:'.rf-roof__range',at:2.25}],label:'Illustrative planning range · Not a quote'},
   {id:'payment',title:'Explore the payment alongside the project',focus:'.rf-calc',frame:'wide',spoken:'Explore a payment scenario, with the monthly amount and total of payments visible together.',actions:[radio('finance-plan','60')],label:'Hypothetical financing · No loan offered'},
   {id:'questions',title:'Give the next conversation useful context',focus:'.rf-estimate__panel',frame:'right',spoken:'The project questions gather the roof concern, payment approach, and timing, before asking for contact details.',actions:[radio('issue','aging'),radio('property','house'),radio('roofAge','over20'),nextNorthvane],expect:'input[name="insurance"]',label:'Fictional sample answers'},
   {id:'brief',title:'Keep the choices connected',focus:'.rf-estimate__panel',frame:'right',spoken:'Those answers become a structured lead preview, alongside the estimate and payment already explored. Nothing is sent from this demonstration.',setup:[radio('insurance','self'),radio('payment','finance'),nextNorthvane,radio('timeline','90'),radio('owner','yes'),nextNorthvane,fill('#estimate input[autocomplete="name"]','Alex Morgan'),fill('#estimate input[autocomplete="tel"]','202-555-0148'),fill('#estimate input[autocomplete="email"]','alex@example.test'),fill('#estimate input[autocomplete="street-address"]','123 Example Lane'),fill('#estimate input[autocomplete="postal-code"]','60614')],actions:[nextNorthvane,{kind:'scrollTo',selector:'.rf-lead__seen'}],expect:'.rf-lead__seen',label:'Local, unsent lead preview · Fictional contact details'},
   {id:'ending',title:'A more informed starting point.',focus:'.rf-lead__seen',frame:'right',spoken:'The distinctive feature is the connection: the homeowner’s choices travel with the conversation.',actions:[],ending:true,label:'Local, unsent lead preview · Fictional contact details'},
  ],
 },
 {
  id:'alder-stone',name:'Alder & Stone',path:'/alder-stone',accent:'#b99a5c',
  takeaway:'A calm editorial identity connects an illustrated installation story, a planning estimate and an organized project brief.',
  disclosure:'Fictional contractor · AI concept film · Illustrative sample pricing',
  scenes:[
   {id:'opening',title:'A considered roofing experience',focus:'.er-film-sticky',frame:'wide',spoken:'Alder and Stone is Wallace Shift’s editorial roofing concept: a calm, guided path from understanding the work to planning a project.',actions:[]},
   {id:'process',title:'Make the process visible',focus:'.er-film-sticky',frame:'wide',spoken:'The opening concept film explores preparation, protection, installation, and the final walkthrough. This is an illustration, not a completed customer job.',actions:[click('button[aria-label="Show chapter 3: Protect"]'),click('button[aria-label="Show chapter 4: Install"]')],label:'AI concept film · Illustrative sequence'},
   {id:'sample',title:'A clearer starting point',focus:'#roof-planner',frame:'wide',spoken:'Next, the roof planner lets a visitor explore a sample property, without entering contact details.',actions:[sample],expect:'.rf-roof__estimate',label:'Built-in sample house'},
   {id:'estimate',title:'Compare the choices and their planning range',focus:'.rf-roof__estimate',frame:'right',spoken:'Adjust the pitch and compare roofing materials. The planning range changes with those choices.',actions:[click('button[aria-label="Steeper"]'),metal,{kind:'scrollTo',selector:'.rf-roof__price'}],label:'Illustrative prices · Not a contractor quote'},
   {id:'handoff',title:'The estimate follows the visitor',focus:'.er-form-roof-estimate',frame:'left',spoken:'When they continue into a project brief, the estimate follows them to the next page.',setup:[click('a:has-text("Use this estimate in my project brief")')],actions:[],expect:'.er-form-roof-estimate',label:'Sample estimate retained in this browser tab'},
   {id:'questions',title:'Build the brief one step at a time',focus:'.er-project-form-panel',frame:'right',spoken:'The form gathers the property, roof concern, payment approach, and preferred timing in manageable steps.',actions:[alderChoice('residential'),alderChoice('owner'),fill('input[name="postal-code"]','60614'),nextAlder],expect:'input[value="replacement"]',label:'Fictional sample answers'},
   {id:'brief',title:'A project brief ready to review',focus:'.er-project-form-panel',frame:'wide',spoken:'The result is an organized, unsent request preview. The sample estimate stays clearly identified, and nothing is booked.',setup:[alderChoice('replacement'),alderChoice('planning'),nextAlder,alderChoice('self-funded'),select('.er-project-form select','one-to-three-months'),nextAlder,fill('input[name="name"]','Alex Morgan'),fill('input[name="email"]','alex@example.test'),fill('input[name="tel"]','202-555-0148'),alderChoice('email'),click('.er-form-consent label')],actions:[click('.er-project-form button[type="submit"]'),{kind:'scrollTo',selector:'.er-form-preview h2',at:1.3},{kind:'scrollTo',selector:'.er-form-summary-section:has-text("Sample estimate")',at:3.5}],expect:'.er-form-preview',label:'Local, unsent project brief · Fictional contact details'},
   {id:'ending',title:'Design and planning, working together.',focus:'.er-form-preview h2',frame:'wide',spoken:'A considered visual identity, connected to a practical planning journey. Built by Wallace Shift.',actions:[],ending:true,label:'Local, unsent project brief · Illustrative sample estimate'},
  ],
 },
 {
  id:'contour',name:'Contour Roofing',path:'/contour',accent:'#ed632f',
  takeaway:'A compact analytical experience connects visual explanation, planning numbers, a payment comparison and an unsent project brief.',
  disclosure:'Fictional contractor · Illustrative 3D model · Sample prices',
  scenes:[
   {id:'opening',title:'A clearer view of the decision',focus:'.ct-hero',frame:'wide',spoken:'Contour is a roofing website concept by Wallace Shift, built around clear decisions and a visual introduction to the roof.',actions:[]},
   {id:'model',title:'Explore the roof from another angle',focus:'.ct-scan',frame:'right',spoken:'Its interactive three-dimensional study offers a top view. This is an illustrative model, not a measurement of the visitor’s property.',actions:[click('button[aria-label="Switch to top view"]')],label:'Illustrative model · Property measured separately'},
   {id:'sample',title:'Move into the separate estimator',focus:'#estimator',frame:'wide',spoken:'The separate estimator lets a homeowner explore a sample roof and begin comparing the options.',actions:[sample],expect:'.rf-roof__estimate',label:'Built-in sample property'},
   {id:'estimate',title:'Connect a material choice to the budget',focus:'.rf-roof__estimate',frame:'right',spoken:'Choose metal and the planning range updates. These are sample prices, not a contractor quote.',actions:[metal,{kind:'scrollTo',selector:'.rf-roof__price'}],label:'Illustrative planning range'},
   // Keep the whole calculator above captions; the right zoom hides total repayment.
   {id:'payment',title:'Compare monthly payment and total repayment',focus:'.ct-calculator',frame:'wide',spoken:'Use the estimate’s midpoint in the payment explorer. Change the term and compare both the monthly payment and total repayment.',actions:[{...click('button:has-text("Use the midpoint of my estimate")'),at:.8},{...fill('.ct-calc-fields label:has-text("Term (months)") input','60'),at:3}],expect:'.ct-loan-totals',label:'Hypothetical fixed-rate loan · No fees included'},
   {id:'questions',title:'Bring the project into focus',focus:'.ct-brief-panel',frame:'right',spoken:'The visitor then brings their roof concern, timing, and estimate together in a project brief.',setup:[fill('#project-brief input[name="name"]','Alex Morgan'),fill('#project-brief input[name="email"]','alex@example.test')],actions:[select('#project-brief select[name="issue"]','Planning a replacement'),select('#project-brief select[name="timing"]','In the next few months')],label:'Fictional sample details'},
   {id:'brief',title:'An organized starting point',focus:'.ct-brief-panel',frame:'right',spoken:'This creates an unsent preview with the selected options and sample pricing clearly identified.',actions:[click('#project-brief button[type="submit"]')],expect:'.ct-preview',label:'Unsent project preview · No inspection booked'},
   {id:'ending',title:'From explanation to a useful conversation.',focus:'.ct-preview',frame:'right',spoken:'A visual explanation becomes a practical comparison and an organized starting point for the contractor conversation.',actions:[],ending:true},
  ],
 },
 {
  id:'halcyon',name:'Halcyon Roofworks',path:'/halcyon',accent:'#5e9484',
  takeaway:'Architectural material presentation connects to a photo-based design comparison and a consultation brief carrying the chosen design.',
  disclosure:'Fictional contractor · Prepared sample studies · Illustrative prices',
  scenes:[
   {id:'opening',title:'Architecture leads the experience',focus:'.hr-film',frame:'wide',spoken:'Halcyon is Wallace Shift’s architectural roofing concept. A cinematic estate view introduces a premium, material-led experience.',actions:[],label:'Concept imagery · Fictional roofing brand'},
   {id:'materials',title:'Give each material room to speak',focus:'.hr-gallery-stage',frame:'wide',spoken:'A detailed gallery brings the materials, their character, and their planning information together.',actions:[click('button[aria-label="Next material"]')],label:'Material studies · Illustrative planning rates'},
   {id:'photo',title:'Start with a photograph',focus:'.hr-viz-stage',frame:'left',spoken:'The visualizer accepts a photograph, then offers material and finish choices. A new generation requires permission to send the image.',actions:[{kind:'upload',selector:'input[aria-label="Upload a photograph of your home"]',file:'public/demos/roofers-4/sample-home.jpg'}],label:'Local photo preparation · No generation request sent'},
   {id:'comparison',title:'Compare the design on the same home',focus:'.hr-viz-image-wrap',frame:'left',spoken:'Here we use prepared sample studies. Switch from metal to slate, then compare the result with the original home.',setup:[click('.hr-tool:has-text("Use sample")')],actions:[click('.hr-viz-materials button:has-text("Natural slate")'),click('.hr-tool:has-text("Compare")'),press('.hr-viz-compare-handle','PageDown'),press('.hr-viz-compare-handle','PageDown'),press('.hr-viz-compare-handle','PageUp')],label:'Prepared sample studies · No new image generated'},
   {id:'planning',title:'Explore a planning range',focus:'.hr-viz-estimate',frame:'right',spoken:'Enter a roof area to explore an illustrative planning range. The photograph itself does not measure the roof.',actions:[fill('input[aria-label="Roof area in square feet"]','3000')],label:'User-entered area · Illustrative prices, not a quote'},
   {id:'handoff',title:'Keep the design attached to the brief',focus:'.hr-form',frame:'right',spoken:'Those material and budget choices carry into a consultation brief, alongside the project and timeline.',setup:[fill('.hr-form input[name="name"]','Alex Morgan'),fill('.hr-form input[name="email"]','alex@example.test')],actions:[select('.hr-form select[name="timeline"]','season')],expect:'.hr-form-check',label:'Fictional contact details'},
   {id:'brief',title:'Review the whole request',focus:'.hr-form',frame:'wide',spoken:'Review the resulting preview. Nothing is sent, stored, or booked in this demonstration.',actions:[click('.hr-form button[type="submit"]'),{kind:'scrollTo',selector:'#consultation-preview'}],expect:'#consultation-preview',label:'Local, unsent consultation preview'},
   {id:'ending',title:'Inspiration with a useful next step.',focus:'#consultation-preview',frame:'wide',spoken:'A premium website connecting visual inspiration with a more specific project conversation, by Wallace Shift.',actions:[],ending:true},
  ],
 },
 {
  id:'stratum',name:'Stratum Roofing Co.',path:'/stratum',accent:'#d0864d',
  takeaway:'One live sample model explains the roof system, supports design exploration, updates its geometry and planning range, and carries the design into an inspection brief.',
  disclosure:'Fictional contractor · Authored sample model · Illustrative rates',
  scenes:[
   {id:'opening',title:'One roof. A complete explanation.',focus:'.st-hero',frame:'wide',spoken:'Stratum is a roofing website concept by Wallace Shift, built around one live, interactive model.',actions:[],expect:'.st-site.is-live'},
   {id:'anatomy',title:'Show the layers beneath the finish',focus:'#anatomy [data-step="3"]',frame:'wide',spoken:'As the visitor moves through the page, the same house helps explain the roof as a system, including the layers underneath.',actions:[{kind:'scrollTo',selector:'#anatomy [data-step="6"]'}],label:'Authored sample geometry · Not a property survey'},
   {id:'shape',title:'Explore the roof form and pitch',focus:'.st-studio-panel',frame:'wide',spoken:'In the roof studio, change the roof form and adjust the pitch. The model and its calculated measurements respond.',actions:[click('label:has(input[name="st-style"]):has-text("Hip")'),{kind:'range',selector:'#st-studio-panel-shape input[type="range"]',value:8}],label:'Calculated from the sample model'},
   {id:'finish',title:'See the material and its planning range',focus:'.st-studio-panel',frame:'left',spoken:'Choose a different finish and see its illustrative planning range alongside the roof area.',setup:[click('#st-studio-tab-finish')],actions:[click('.st-finish:has-text("Metal")'),{kind:'scrollTo',selector:'.st-readout'}],label:'Sample home · Illustrative rates, not a quote'},
   {id:'view',title:'Inspect the design from above',focus:'.st-studio-panel',frame:'wide',spoken:'Switch to an aerial view to inspect the design, then carry that choice into an inspection request.',setup:[click('#st-studio-tab-light')],actions:[click('label:has(input[name="st-view"]):has-text("Aerial")')],label:'Actual model camera control'},
   {id:'handoff',title:'Keep the design connected to the request',focus:'.st-book-card',frame:'right',spoken:'The selected material, geometry, and range arrive together in the brief, keeping those choices connected.',setup:[click('button:has-text("Add this design to my request")')],actions:[],expect:'.st-design-chip',label:'Sample design attached to the brief'},
   {id:'brief',title:'Review the resulting inspection brief',focus:'.st-book-card',frame:'right',spoken:'This is a sample home, and the request remains an unsent demo preview. No inspection is booked.',setup:[fill('#book input[name="name"]','Alex Morgan'),fill('#book input[name="email"]','alex@example.test'),select('#book select[name="timing"]','In the next few months')],actions:[click('#book button[type="submit"]')],expect:'.st-preview',label:'Local, unsent request · Fictional contact details'},
   {id:'ending',title:'An explanation that leads somewhere.',focus:'.st-preview',frame:'right',spoken:'An interactive explanation becomes a practical starting point for discussing a roof project. Built by Wallace Shift.',actions:[],ending:true},
  ],
 },
]
