import type { Mode, TracerId } from './engine/state'
import { gallonsPerYear } from './engine/volume'

/**
 * Riffle Water Co. is fictional. 555-01xx numbers and .example addresses are
 * reserved for fiction. Product specifics (stage sizes, prices, service intervals) are
 * illustrative. Every outside fact on the page carries a source below; nothing
 * about a real customer, review or result is invented.
 */
export const business = {
  name: 'Riffle Water Co.',
  short: 'Riffle',
  area: 'Kansas City',
  phone: '(816) 555-0164',
  phoneHref: 'tel:+18165550164',
  email: 'hello@riffle.example',
}

export const nav = [
  { href: '#coverage', label: 'Why whole-house' },
  { href: '#system', label: 'Inside the system' },
  { href: '#rooms', label: 'At home' },
  { href: '#answers', label: 'Straight answers' },
  { href: '#cost', label: 'What it costs' },
]

export const hero = {
  eyebrow: 'Whole-house water filtration · Kansas City',
  title: 'Every tap in your house starts at one pipe.',
  lede: 'Riffle treats your water right where it comes in, so the shower, the washer, the water heater and the kitchen tap all run on the same clean supply.',
  primary: 'Schedule your installation',
  secondary: 'Follow the water',
  hint: 'Drag to look around. Scroll to follow the water.',
}

export const modes: { id: Mode; label: string; short: string }[] = [
  { id: 'none', label: 'No filter', short: 'No filter' },
  { id: 'tap', label: 'Under-sink filter', short: 'Under-sink' },
  { id: 'whole', label: 'Riffle whole-house', short: 'Whole-house' },
]

export const coverageSteps: { kicker: string; title: string; body: string; mode: Mode }[] = [
  {
    kicker: 'As it arrives',
    title: 'This is the water your whole house runs on.',
    body: 'Cities add chlorine so water stays safe on the trip to you. It keeps going after it arrives, along with whatever minerals and grit came with it, to every fixture you own.',
    mode: 'none',
  },
  {
    kicker: 'The usual fix',
    title: 'An under-sink filter fixes one tap.',
    body: 'That is a fine answer for the water you drink. But your shower, washer, dishwasher and water heater stay on exactly the same supply as before.',
    mode: 'tap',
  },
  {
    kicker: 'The other way',
    title: 'Treat it once, where it comes in.',
    body: 'A point-of-entry system filters water as it enters the home, so everything from every tap has been through it. The hose bib tees off first on purpose: your lawn doesn’t need filtered water, and shouldn’t use up your filter.',
    mode: 'whole',
  },
]

export const fixtureNames: Record<string, string> = {
  kitchenSink: 'Kitchen tap', dishwasher: 'Dishwasher', fridge: 'Fridge and ice', vanity: 'Bathroom sink',
  toilet: 'Toilet', shower: 'Shower', washer: 'Washer', heater: 'Water heater',
}

export const systemSteps: { kicker: string; title: string; body: string; spec?: string; tracer: TracerId | 'all' }[] = [
  {
    kicker: 'In the basement',
    title: 'Three stages. Nothing you can’t see.',
    body: 'Here is the system at full size, next to the water heater, where the main comes in. Keep scrolling and we’ll take the shells off.',
    tracer: 'all',
  },
  {
    kicker: 'Stage 1 · Sediment',
    title: 'Catches what you could see.',
    body: 'Pleated fabric holds back sand, rust flakes and silt before they reach anything downstream. It’s the one stage you can watch working: the white folds slowly brown as it loads.',
    spec: '5-micron pleated cartridge. Sample interval: swap about every 6 months.',
    tracer: 'sediment',
  },
  {
    kicker: 'Stage 2 · Catalytic carbon',
    title: 'Takes out what you can taste.',
    body: 'Water climbs slowly through a deep bed of carbon, which grabs chlorine, chloramine and the smells that come with them. Contact time does the work, which is why the tank is this big.',
    spec: 'Catalytic carbon, sized to your flow. Sample interval: about 5 years.',
    tracer: 'chlorine',
  },
  {
    kicker: 'Stage 3 · Scale control',
    title: 'Stops what you’d only notice later.',
    body: 'Ceramic beads turn dissolved calcium and magnesium into tiny, stable crystals that flow past surfaces instead of sticking to them. No salt and no drain line. The minerals stay in your water, so it isn’t softened. It just stops scaling.',
    spec: 'Template-assisted crystallization media. Sample interval: 3 to 5 years.',
    tracer: 'hardness',
  },
  {
    kicker: 'Your turn',
    title: 'Pick what you’re worried about and follow it.',
    body: 'Including the ones this system won’t stop. We’d rather show you here than have you find out later.',
    tracer: 'all',
  },
]

export type Verdict = 'stopped' | 'changed' | 'through'

export const tracers: { id: TracerId | 'all'; label: string; verdict: Verdict | null; headline: string; detail: string; color: string }[] = [
  { id: 'all', label: 'Everything', verdict: null, headline: 'All of it at once', detail: 'Each color is one contaminant. Watch where each stops, and which make it out the other side.', color: '#e9eff0' },
  { id: 'sediment', label: 'Sand & rust', verdict: 'stopped', headline: 'Stopped at stage 1', detail: 'Held on the pleats. This is the coarsest thing in your water, and the stage that protects the other two.', color: '#d5a06a' },
  { id: 'chlorine', label: 'Chlorine', verdict: 'stopped', headline: 'Reduced at stage 2', detail: 'Carbon’s best-known job. Look for NSF/ANSI 42, the standard that covers chlorine, taste and odor claims.', color: '#d9f05c' },
  { id: 'chloramine', label: 'Chloramine', verdict: 'stopped', headline: 'Reduced at stage 2', detail: 'EPA says more than one in five Americans drink water treated with chloramines. Plain carbon struggles with it; catalytic carbon and a slower flow are what handle it.', color: '#8fe89a' },
  { id: 'vocs', label: 'Solvents (VOCs)', verdict: 'stopped', headline: 'Reduced at stage 2, if certified', detail: 'VOC claims fall under the health standard, NSF/ANSI 53. Carbon can do this, but only a listed system has shown it can.', color: '#f08bc1' },
  { id: 'pfas', label: 'PFOA & PFOS', verdict: 'stopped', headline: 'Reduced at stage 2, if certified', detail: 'A separate certification again, and few whole-house systems carry it. If this is your concern, ask for the listing by name. We’ll show it to you or tell you we can’t.', color: '#ff7a59' },
  { id: 'hardness', label: 'Hardness', verdict: 'changed', headline: 'Changed at stage 3, not removed', detail: 'The minerals keep flowing, as crystals that don’t stick. Your water tests just as hard afterward. What changes is where those minerals end up.', color: '#f4f1e6' },
  { id: 'lead', label: 'Lead', verdict: 'through', headline: 'This one gets through', detail: 'Lead usually comes from service lines and plumbing, and some of that sits after the system. If lead is a concern, you need a filter certified to NSF/ANSI 53 or reverse osmosis at the tap you drink from. We’ll fit one.', color: '#a9b4c6' },
  { id: 'bacteria', label: 'Germs', verdict: 'through', headline: 'This one gets through', detail: 'Carbon doesn’t disinfect. CDC lists ultrafiltration, nanofiltration or reverse osmosis for removing germs. On a private well, test first and add the right stage if you need it.', color: '#c79bff' },
]

export const roomSteps: { kicker: string; title: string; body: string; note?: string; toggleOff: string; toggleOn: string }[] = [
  {
    kicker: 'In the kitchen',
    title: 'Water stops tasting like a pool.',
    body: 'Chlorine has done its job by the time it reaches you. Carbon takes it out, and the taste with it, before the tap, the fridge line and the ice.',
    toggleOff: 'As it arrives',
    toggleOn: 'Through Riffle',
  },
  {
    kicker: 'In the shower',
    title: 'Less of it in the air you breathe.',
    body: 'A faucet filter can’t help here. Hot water carries volatile by-products of chlorine into steam, and researchers measured uptake from breathing and skin as well as drinking. Treating water before the shower head reduces what can get there.',
    note: 'Hard water also closes shower heads: in Battelle’s tests, low-flow heads lost 75% of their flow in under 18 months.',
    toggleOff: 'As it arrives',
    toggleOn: 'Through Riffle',
  },
  {
    kicker: 'With the machines',
    title: 'Nothing gets to quietly clog.',
    body: 'Washers, dishwashers and water heaters take in water through small screens and valves, and heat it, which is exactly where scale forms. On hard water in Battelle’s lab, faucet strainers were almost completely plugged after 19 equivalent days.',
    toggleOff: 'As it arrives',
    toggleOn: 'Through Riffle',
  },
]

export const study = {
  kicker: 'Time-lapse',
  title: 'Fifteen years inside a hot-water line.',
  body: 'Two lengths of copper, cut open. One runs on your water as it arrives, one after scale control. Drag the years forward and watch how much room the water has left.',
  footnote: 'The crust is an illustration, drawn at many times life size with straight-line growth. Real scale depends on temperature, chemistry and flow. The heater figures are from lab tests of gas storage heaters on unsoftened water.',
  yearsLabel: 'Years in service',
  hardnessLabel: 'Water hardness',
  hotLabel: 'Hot water a day',
  lostLabel: 'Gas tank heater efficiency lost',
  costLabel: 'More to heat the same water',
  controlLabel: 'Scale formed with TAC media',
  controlValue: 'Over 88% less',
}

export function hardnessName(gpg: number): string {
  if (gpg < 1) return 'Soft'
  if (gpg < 3.5) return 'Slightly hard'
  if (gpg < 7) return 'Moderately hard'
  if (gpg < 10.5) return 'Hard'
  return 'Very hard'
}

/** Battelle: 4% per 5 gpg at 50 gal/day, 8% per 5 gpg at 100 gal/day, for gas storage heaters over the study's 15-year life. */
export function efficiencyLost(gpg: number, hotGallons: 50 | 100, years: number): number {
  const per5 = hotGallons === 50 ? 4 : 8
  return (gpg / 5) * per5 * (years / 15)
}

export const volume = {
  kicker: 'At true scale',
  title: 'A year of your water, next to your house.',
  body: 'Same scale as the model. This is what passes through the main in a year, indoors alone. It’s why a filter on one faucet doesn’t change much.',
  peopleLabel: 'People at home',
  note: 'From the 2016 Residential End Uses of Water study: 138 gallons a day for an average 2.65-person household. Highlighted band: all faucets together, 19%.',
}

export const cost = {
  kicker: 'What it costs',
  title: 'Two questions, one price.',
  body: 'The size of your home sets how much water the system has to keep up with at once. The people in it set how much goes through it in a year.',
  homeLabel: 'Size of your home',
  peopleLabel: 'People at home',
  includedTitle: 'What the price covers',
  included: [
    'All three stages, sized to your answers',
    'A licensed plumber, the fittings and a bypass valve',
    'A water test and flow check before we start',
  ],
  changes: 'A private well, no room at the main or a shutoff that needs replacing can change the price. You’d hear that before we touch a pipe. Homes over 5,000 sq ft, or with more than 8 people, are sized on site.',
  sample: 'These are sample prices for a demo company.',
}

/**
 * Sample price sheet. Each size is the smallest that keeps up with the home and
 * whose carbon lasts its five years at the household's use, which is why a change
 * of one person or a few hundred square feet can leave the price where it is.
 * Tank sizes are common pressure-vessel sizes, in inches, for the drawing.
 */
export const systemSizes = [
  { id: 'small', name: 'Riffle 1.5', flow: 10, tankWidth: 10, tankHeight: 54, maxHome: 1800, maxPeople: 3, price: 2950, care: 180 },
  { id: 'medium', name: 'Riffle 2.5', flow: 15, tankWidth: 13, tankHeight: 54, maxHome: 3200, maxPeople: 5, price: 3850, care: 240 },
  { id: 'large', name: 'Riffle 4.0', flow: 20, tankWidth: 16, tankHeight: 65, maxHome: 5000, maxPeople: 8, price: 5200, care: 340 },
]

const CARE_PER_PERSON = 25

export const money = (value: number) => `$${value.toLocaleString('en-US')}`

export function quote(home: number, people: number) {
  const byHome = systemSizes.findIndex((size) => home <= size.maxHome)
  const byPeople = systemSizes.findIndex((size) => people <= size.maxPeople)
  const size = systemSizes[Math.max(byHome, byPeople)]
  const care = size.care + people * CARE_PER_PERSON
  const gallons = (Math.round(gallonsPerYear(people) / 1000) * 1000).toLocaleString('en-US')
  let why = `Your home and household both point to this size: up to ${size.flow} gallons a minute at once, and about ${gallons} gallons a year.`
  if (byPeople > byHome) why = `Your household sets this size. ${people === 1 ? 'One person sends' : `${people} people send`} about ${gallons} gallons a year through it, so the carbon has to be big enough to last its five years.`
  if (byHome > byPeople) why = `Your home sets this size. More rooms means more running at once, so it has to keep up at ${size.flow} gallons a minute.`
  return { size, care, tenYears: size.price + care * 10, why }
}

/** Plain comparison for the moment of deciding. It says where the small filter is the better tool. */
export const comparison: { need: string; tap: string; whole: string; tapYes?: boolean; wholeYes?: boolean }[] = [
  { need: 'Water you drink and cook with', tap: 'Treated', whole: 'Treated', tapYes: true, wholeYes: true },
  { need: 'Shower and bath', tap: 'Not treated', whole: 'Treated', wholeYes: true },
  { need: 'Laundry and dishes', tap: 'Not treated', whole: 'Treated', wholeYes: true },
  { need: 'Water heater and pipes', tap: 'No scale control', whole: 'Scale control', wholeYes: true },
  { need: 'Lead at the tap', tap: 'Yes, if certified to NSF/ANSI 53 or reverse osmosis', whole: 'No. Pair it with an under-sink filter', tapYes: true },
  { need: 'Where it goes', tap: 'Under one sink', whole: 'At the main, fitted by a plumber' },
]

export const answers: { q: string; a: string }[] = [
  {
    q: 'Is my water unsafe without this?',
    a: 'Probably not. Public water is regulated, and your utility publishes a report on it every year. This system is mostly about taste, comfort and protecting what your water runs through. We test before we install. If that shows a health issue we’ll tell you plainly, and the fix might not be this system.',
  },
  {
    q: 'Isn’t chlorine there for a reason?',
    a: 'Yes, and removing it is a real trade-off. CDC notes that taking out chlorine or other disinfectants may let more germs grow in your plumbing. So we install the system where the water enters, keep filters on schedule, and tell you to flush taps after you’ve been away for a while.',
  },
  {
    q: 'Will my water feel soft?',
    a: 'No. Scale control keeps minerals from sticking, but it doesn’t remove them, so you won’t get the slippery feel or the lower soap use of softened water. If that’s what you want, a salt-based softener is the right tool and we’ll quote one instead.',
  },
  {
    q: 'What about lead?',
    a: 'Don’t rely on a whole-house filter for it. Lead usually comes from service lines and plumbing, and some of that can sit downstream of the system. For the water you drink, use a filter certified to NSF/ANSI 53 or reverse osmosis at that tap, and check its listing yourself.',
  },
  {
    q: 'I’m on a well. Does this still work?',
    a: 'The same stages help, but a well has no utility testing it, so we test for more first. Germs, iron and nitrates change what you need and what it costs, and a system with no disinfection stage won’t deal with germs.',
  },
  {
    q: 'What does it take to look after?',
    a: 'Filters have to be maintained to keep working and to keep germs from growing in them. We keep track of the schedule and do the swaps. If your immune system is weakened, CDC advises not changing filters yourself, and you won’t need to.',
  },
]

export const process = [
  { title: 'You pick a day', body: 'Tell us when suits you and we’ll call to confirm the date and your price.' },
  { title: 'We test at your tap first', body: 'Hardness, chlorine, iron and pH, plus flow at the main. If that changes what you need or what it costs, you hear it before any work starts, and you can still say no.' },
  { title: 'One visit at the main', body: 'A licensed plumber fits the system where the line enters, with a bypass valve, so the water is only off for part of the day.' },
  { title: 'We watch the filters', body: 'You get a reminder before anything’s due, and we do the swap. No guessing how old a cartridge is.' },
]

export const sources: { label: string; href: string }[] = [
  { label: 'CDC: About Choosing Home Water Filters', href: 'https://www.cdc.gov/drinking-water/prevention/about-choosing-home-water-filters.html' },
  { label: 'EPA: Chloramines in Drinking Water', href: 'https://www.epa.gov/dwreginfo/chloramines-drinking-water' },
  { label: 'EPA: Find your Consumer Confidence Report', href: 'https://www.epa.gov/ccr' },
  { label: 'NSF: Standards for Water Treatment Systems', href: 'https://www.nsf.org/consumer-resources/articles/standards-water-treatment-systems' },
  { label: 'Battelle / Water Quality Research Foundation softened-water study, summarized', href: 'https://prnewswire.com/news-releases/independent-study-calls-softeners-one-of-the-very-best-household-energy-savers-90756264.html' },
  { label: 'WateReuse 08-06: Alternatives to Domestic Ion Exchange Water Softeners (Arizona State University)', href: 'https://watereuse.org/watereuse-research/08-06-evaluation-of-alternatives-to-domestic-ion-exchange-water-softeners/' },
  { label: 'Weisel & Jo (1996), Environmental Health Perspectives', href: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC1469238' },
  { label: 'DeOreo et al. (2016), Residential End Uses of Water, Version 2, Water Research Foundation, summarized', href: 'https://en.wikipedia.org/wiki/Residential_water_use_in_the_U.S._and_Canada' },
  { label: 'Hardness classes in grains per gallon (Prince William Water)', href: 'https://princewilliamwater.org/node/1064' },
]

export const disclosure = 'Riffle Water Co. is a fictional brand. This is a concept site by Wallace Shift showing what an interactive site could do for a water treatment company. The house and the system are 3D illustrations; sizes, prices, service intervals and process are samples. The sourced facts are real.'
