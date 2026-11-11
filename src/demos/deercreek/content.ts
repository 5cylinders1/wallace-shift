/**
 * Every fact on the Deer Creek Plumbing concept lives here. Sources were read
 * on 2026-11-10 and are listed in docs/demos/deercreek.md:
 *   site  = deercreekplumbing.com (Hibu site, 16 pages)
 *   gbp   = Google Business Profile (Maps place 0x606d5b8fd1188fa1)
 *   fb    = facebook.com/DeerCreekPlumbing
 * Reviews are quoted from Google and Facebook. Anything a reader could mistake
 * for a promise that is not in those sources is marked `confirm` in the docs.
 */

export const SITE = {
  origin: 'https://wallaceshift.com',
  /** Move the site to Deer Creek's own domain by changing origin + base. */
  base: '/demo/deercreek',
  robots: 'noindex, nofollow',
} as const

/** Wallace Shift's layer over the concept: the bar above the header and the
 * footer credit. The inquiry link carries `?demo=deercreek` so the contact
 * page opens on website copy and the enquiry says where it came from
 * (src/lib/demoHandoff.ts). Remove both when the site moves to Deer Creek's
 * own domain. */
export const agency = {
  name: 'Wallace Shift',
  inquiry: '/contact?demo=deercreek',
  logo: '/brand/wallace-shift-logo-black.svg',
  /** Only what the demo actually does. Nothing here is sent anywhere. */
  capabilities: [
    { title: 'Problem finder', text: 'Visitors pick what’s happening and get safety steps before anyone arrives.' },
    { title: 'Carried-over booking details', text: 'That choice fills in the service, the urgency and the problem on the request form.' },
    { title: 'Accommodation preferences', text: 'A household can note a mobility aid, extra time to reach the door, sensitivity to noise, or text instead of calls.' },
  ],
} as const

export const href = (slug = '') => `${SITE.base}${slug ? `/${slug}` : ''}`
export const absolute = (slug = '') => `${SITE.origin}${href(slug)}`

export const business = {
  name: 'Deer Creek Plumbing',
  legalName: 'Deer Creek Plumbing Inc',
  phone: '(913) 440-9102',
  phoneHref: 'tel:+19134409102',
  smsHref: 'sms:+19134409102',
  phoneE164: '+1-913-440-9102',
  email: 'deercreekplumbinginc@gmail.com',
  founded: '2017',
  street: '19968 W 162nd St',
  city: 'Olathe',
  region: 'KS',
  postal: '66062',
  lat: 38.83444,
  lon: -94.82055,
  hours: { days: 'Monday to Friday', short: 'Mon–Fri', open: '08:00', close: '16:30', label: '8:00 a.m. – 4:30 p.m.' },
  facebook: 'https://www.facebook.com/DeerCreekPlumbing',
  googleMaps: 'https://maps.google.com/maps?cid=6948310473349042081',
  currentSite: 'https://www.deercreekplumbing.com/',
  brands: ['Delta', 'Moen', 'A. O. Smith', 'American Standard'],
  payments: ['Cash', 'Check', 'Visa', 'Mastercard', 'American Express', 'Discover'],
} as const

/** Promises Deer Creek makes on its own site, word for word in meaning. */
export const promises = [
  { title: '1-year parts & labor warranty', text: 'Every service is backed by a one-year parts and labor warranty, and manufacturer warranties are honored.' },
  { title: 'Same-day water heater service', text: 'No hot water is not something you should wait days on.' },
  { title: 'Same-day estimates', text: 'Service is typically available within 24 hours.' },
  { title: 'Booties on, every visit', text: 'Every tech wears shoe covers to protect your floors.' },
  { title: 'Licensed & insured', text: 'Certified plumbers who keep up with continuing education.' },
  { title: 'Insurance claims', text: 'We work with insurance companies to keep a claim simple.' },
] as const

export const reviewStats = {
  asOf: 'November 10, 2026',
  rating: '5.0',
  count: 286,
  distribution: [
    { stars: 5, count: 282 },
    { stars: 4, count: 2 },
    { stars: 3, count: 0 },
    { stars: 2, count: 0 },
    { stars: 1, count: 2 },
  ],
  /** Google's own topic summary on the profile. */
  topics: [
    { label: 'Fair pricing', count: 23 },
    { label: 'Punctuality', count: 15 },
    { label: 'Problem resolution', count: 12 },
    { label: 'Courteous staff', count: 12 },
    { label: 'Thorough job', count: 5 },
    { label: 'Leak repair', count: 5 },
  ],
  facebookRecommendations: 2,
} as const

export type ServiceSlug =
  | 'water-heaters' | 'drain-cleaning' | 'sewer-line-repair' | 'sump-pumps' | 'leak-repair'
  | 'toilet-repair' | 'gas-lines' | 'radiant-heat-boilers' | 'remodels-new-construction' | 'commercial-plumbing'

export type ReviewTag = ServiceSlug | 'emergency' | 'pricing' | 'care' | 'team'

export interface Review {
  name: string
  year: string
  stars: 4 | 5
  source: 'Google' | 'Facebook'
  text: string
  tags: ReviewTag[]
}

/** Quoted verbatim from Google and Facebook (trimmed only where marked with …).
 * Names are shortened to a first name and last initial. */
export const reviews: Review[] = [
  { name: 'Spencer D.', year: '2026', stars: 5, source: 'Google', tags: ['water-heaters', 'commercial-plumbing', 'pricing'], text: 'Deer Creek did an exceptional job on working with me to solve a hot water heater issue I had at a rental property. They were kind, courteous and knowledgeable to our resident who was dealing with the issue and kept in constant contact with me. They also went the extra mile to go to Home Depot and work with the store on a warranty exchange from the manufacturer!' },
  { name: 'Ashleigh A.', year: '2026', stars: 5, source: 'Google', tags: ['team', 'care'], text: 'Beau, Laura, and Mark were so great to work with! Everyone was so kind and professional. The repairs were handled timely and carefully with proper explanation.' },
  { name: 'Ryan M.', year: '2026', stars: 5, source: 'Google', tags: ['care', 'team'], text: 'I reached out late in the afternoon for a quote, and not only did they respond quickly, but they had my request completed by noon the very next day. Their team was fast, efficient, and left everything clean when they finished.' },
  { name: 'Cyndi', year: '2026', stars: 5, source: 'Google', tags: ['care', 'team'], text: 'Ryan came out this time and he also did an incredible job! I was so stressed and he was so calm, professional and knowledgeable! Laura was wonderful setting up the appointment as well! Finding Deer Creek is better than finding gold!' },
  { name: 'Micah K.', year: '2026', stars: 5, source: 'Google', tags: ['pricing', 'care'], text: 'The plumber arrived on time, clearly explained the issue, and fixed it quickly and professionally. Pricing was fair and transparent, with no surprises. They were respectful of my home and cleaned up after the job was done.' },
  { name: 'Noemi H.', year: '2026', stars: 5, source: 'Facebook', tags: ['leak-repair', 'pricing'], text: 'Beau and his crew were great to work with. From start to finish he was very open and honest about what was going with our water pipe break and what solution he thought was best. He answered all our questions and got the job done quickly.' },
  { name: 'Elizabeth M.', year: '2025', stars: 5, source: 'Google', tags: ['water-heaters', 'emergency', 'pricing'], text: 'Deer Creek helped us when our water heater broke and was spraying water. They went above and beyond to get to us quickly and resolve the situation. … What Beau quoted us on the phone is exactly what we paid.' },
  { name: 'Jeff N.', year: '2026', stars: 5, source: 'Google', tags: ['pricing'], text: 'No upselling, no surprises—just straightforward, high-quality service. If you’re looking for a reliable plumbing company that actually does what they say they’ll do, I highly recommend them.' },
  { name: 'Dawn W.', year: '2026', stars: 5, source: 'Google', tags: ['care', 'team'], text: 'Mark was very kind, personable and knowledgeable. He took the time to explain what he was doing as well as advising me how to prevent future problems.' },
  { name: 'Sydney S.', year: '2026', stars: 5, source: 'Google', tags: ['water-heaters'], text: 'The guys were knowledgeable and courteous. Very polite. Did a great job installing our water heater and water softener. They even tidied up the plumbing lines from previous other plumbers.' },
  { name: 'Leigha K.', year: '2024', stars: 5, source: 'Google', tags: ['water-heaters', 'emergency'], text: 'They answered my call after hours and came the very next morning to replace my water heater tank. They were prompt, fast, experienced and friendly.' },
  { name: 'Connor D.', year: '2023', stars: 5, source: 'Google', tags: ['water-heaters', 'emergency'], text: 'My hot water tank went out and flooded part of my basement and Deer Creek plumbing was at my house in under an hour to assess the problem. They gave me all options … In under 12 hours I have a new hot water tank installed and a plan for the rest.' },
  { name: 'Erik S.', year: '2023', stars: 5, source: 'Google', tags: ['water-heaters', 'pricing'], text: 'Ryan installed a pressure reducing valve at our main shut off. … In December, they replaced a hot water heater … The warehouse was out of 40 gallon tanks so they installed a 50 gallon tank with no upcharge.' },
  { name: 'Kirk A.', year: '2025', stars: 5, source: 'Google', tags: ['water-heaters'], text: 'Very quick response to website inquiry. Work was done efficiently the next day (expansion tank install).' },
  { name: 'Curtis H.', year: '2025', stars: 5, source: 'Google', tags: ['toilet-repair', 'emergency'], text: 'I had a toilet spring a leak overnight … Mark was my tech and showed up at my door about an hour later I believe and wow, that guy got it done quick, clean, and correct without leaving a trace. He had the new toilet on his truck when he got here.' },
  { name: 'Steven H.', year: '2025', stars: 5, source: 'Google', tags: ['toilet-repair', 'drain-cleaning', 'emergency'], text: 'We were selling our house, and on the morning OF the closing, I discovered one of the toilets was clogged and couldn’t be cleared with plungers. … Deer Creek managed to rearrange their schedule to fit me in and save the day!' },
  { name: 'Larry P.', year: '2023', stars: 5, source: 'Google', tags: ['toilet-repair', 'leak-repair'], text: 'I called about a stool leak. Ryan and Colby came out within the hour. … So I ended up with a stool leak plus two refrigerator leaks. They did a thorough and professional job. On my own I never would have found what they found.' },
  { name: 'Asia G.', year: '2025', stars: 5, source: 'Google', tags: ['drain-cleaning'], text: 'Deer Creek Plumbing was responsive and timely in making a service appointment to repair my french drains. The technician, Mark, had good communication throughout the process. … All within the estimated timeframe and estimated cost.' },
  { name: 'Brad S.', year: '2023', stars: 5, source: 'Google', tags: ['drain-cleaning', 'care'], text: 'Ryan was able to clear a nasty clog same day as well as give some great advice on a couple of other plumbing related questions. Always friendly, respectful of our home, and thorough when cleaning up after the job is done.' },
  { name: 'Thomas E.', year: '2024', stars: 5, source: 'Google', tags: ['drain-cleaning'], text: 'Fixed our drain problem in 30 minutes. Mark was very knowledgeable, had all the right equipment and offered tips to keep the drain open in the future.' },
  { name: 'Michael M.', year: '2025', stars: 5, source: 'Google', tags: ['sewer-line-repair', 'pricing'], text: 'Had a broken wastewater line and they fixed it right away and for a great price. Would definitely recommend!' },
  { name: 'Andres C.', year: '2026', stars: 5, source: 'Google', tags: ['sewer-line-repair', 'water-heaters'], text: 'Few home service providers are as prompt, professional, and committed to finding a quick and proper resolution to problems. From complex grinder pump and water heater repairs and exchanges to simple spigot fixes, they take care of their customers.' },
  { name: 'Mike T.', year: '2026', stars: 5, source: 'Google', tags: ['sump-pumps'], text: 'Great communication during the quote and on time for appointment on install of new sump pump. Deer Creek Plumbing will be my new go to plumber going forward.' },
  { name: 'Kimberly D.', year: '2026', stars: 5, source: 'Google', tags: ['sump-pumps'], text: 'A trusted resource - they have helped upgrade my sump pump system so that it works even when the power is out.' },
  { name: 'Billie Jean C.', year: '2025', stars: 5, source: 'Google', tags: ['sump-pumps', 'care'], text: 'The man who came to change out my Sump Pump was very polite and courteous. He came in with booties protecting my floors. He worked quietly and efficient. When finished he explained the operation of equipment installed.' },
  { name: 'Bryan T.', year: '2024', stars: 5, source: 'Google', tags: ['leak-repair', 'pricing', 'care'], text: 'Fast and friendly service, quickly determined the trouble area, cut a very small hole to find and fix the issue and charged a fair price. Cleaned up the mess after and even took my half full trash bag with him in case there was any mold.' },
  { name: 'Judy S.', year: '2025', stars: 5, source: 'Google', tags: ['leak-repair', 'pricing'], text: 'Ryan was able to replace the bathtub/shower faucet cartridge. The faucet was leaking for several weeks. His expertise on knowing what to do saved me hundreds of dollars if the whole faucet had to be replaced.' },
  { name: 'Kathy K.', year: '2025', stars: 5, source: 'Google', tags: ['leak-repair'], text: 'I had two faucets that both suddenly decided to cause problems. One was leaking, one was dripping. Deer Creek came out the same day and identified both issues.' },
  { name: 'Brian M.', year: '2023', stars: 5, source: 'Google', tags: ['leak-repair', 'emergency'], text: 'Used these guys a few years ago for a frozen water line. They worked through an extremely cold morning to find and fix the problem.' },
  { name: 'Jenny C.', year: '2023', stars: 5, source: 'Google', tags: ['gas-lines', 'emergency'], text: 'We had a gas leak and Ryan was here immediately after we contacted him. Got the job done quickly and we are confident the problem is fixed.' },
  { name: 'Patricia S.', year: '2026', stars: 5, source: 'Google', tags: ['radiant-heat-boilers', 'pricing'], text: 'I had a boiler replaced in my home that was eighty years old and they did a great job with the new boiler, very reasonable price thank you again.' },
  { name: 'Maria M.', year: '2025', stars: 5, source: 'Google', tags: ['radiant-heat-boilers'], text: 'Guys did a check up before winter on my new boiler they installed in February. Boiler came on two days ago. Works great.' },
  { name: 'Dave A.', year: '2025', stars: 5, source: 'Google', tags: ['remodels-new-construction', 'pricing'], text: 'Ryan was very helpful in getting our stove, dishwasher, and sinks unhooked and rehooked when we put in new countertops. The quoted price was exactly what we were charged.' },
  { name: 'Gary S.', year: '2025', stars: 5, source: 'Google', tags: ['remodels-new-construction', 'team'], text: 'Your team was on top of this project. Ryan coordinated everything and Deer Creek did what they said they were going to do. … Three separate crews and each one was extremely professional and cared about doing a great job.' },
  { name: 'Tim W.', year: '2024', stars: 5, source: 'Google', tags: ['remodels-new-construction', 'care'], text: 'Ryan has ALWAYS been incredibly professional, knowledgeable, courteous, meticulous, and responsive. He single-handedly has discovered several “ticking time-bombs” in our newly built house that the builder/subs never bothered to address.' },
  { name: 'Mary L.', year: '2025', stars: 4, source: 'Google', tags: ['remodels-new-construction'], text: 'They installed new plumbing for a bathroom and kitchen in a finished pole barn. They quickly addressed any problem with the install.' },
  { name: 'Casey M.', year: '2025', stars: 5, source: 'Google', tags: ['commercial-plumbing'], text: 'We use deer creek for every thing related to our business plumbing needs. Highly recommend- flexible, reliable, highly skilled, and fair.' },
  { name: 'B.J. M.', year: '2026', stars: 5, source: 'Google', tags: ['commercial-plumbing', 'pricing'], text: 'Amazing service. Very fast and reliable company. I use them for all our plumbing needs across all our properties. Very reasonably priced.' },
  { name: 'K Dub', year: '2024', stars: 5, source: 'Google', tags: ['emergency', 'pricing'], text: 'Deercreek provided very timely work on my recent emergency repairs. They came on a Sunday (when it was bitter cold outside) and got me taken care of. … Trustworthy and fair pricing!' },
  { name: 'Ben E.', year: '2024', stars: 5, source: 'Google', tags: ['pricing', 'team'], text: 'Excellent quality of work and reasonable pricing. Beau and Ryan are great! They didn’t try to talk me into unnecessary and costly extra projects like the other plumbers did.' },
  { name: 'Amanda H.', year: '2025', stars: 5, source: 'Google', tags: ['pricing'], text: 'So happy to have found a trustworthy, honest and hardworking plumbing company that isn’t upselling or talking you into things. We have used them for 3 or 4 jobs recently and are very satisfied with their level of service and scheduling!' },
  { name: 'Jennifer K.', year: '2023', stars: 5, source: 'Google', tags: ['team', 'care'], text: 'I have used Deer Creek for the past 3+ years. Ryan and the whole team are responsive, show up on time, quickly solve the issue and are reasonably priced. … I literally trust him with my house keys.' },
  { name: 'Matthew S.', year: '2024', stars: 5, source: 'Google', tags: ['pricing', 'leak-repair'], text: 'The people I talked to with this company were all fantastic and as a young adult they were willing to work with me on pricing which I really needed after buying a house and having a water main break!' },
  { name: 'Avis S.', year: '2025', stars: 5, source: 'Google', tags: ['team', 'pricing'], text: 'I’ve used Deer Creek Plumbing for six years at my home and wouldn’t think of calling another company. … Ryan and Beau do a great job of figuring out complex problems. They also charge fairly for their work and sincerely want to help homeowners.' },
  { name: 'Jerry F.', year: '2024', stars: 5, source: 'Facebook', tags: ['team'], text: 'Highly recommend in the KC area. Very honest reliable and hard workers. Have known since they started and they have never looked back. They do it all.' },
  { name: 'David H.', year: '2023', stars: 5, source: 'Google', tags: ['care', 'team'], text: 'Ran into an employee (maybe owner) in Menards. He heard me talking through my plumbing quandary with my wife … and explained one critical step on adding an expansion tank that I might have missed. That kind of service to someone that is diy’ing is probably a good indicator of the service they provide to customers as well.' },
]

export const reviewsFor = (tag: ReviewTag, limit = 3) => reviews.filter(review => review.tags.includes(tag)).slice(0, limit)

/** The people customers name in reviews. Roles come from those reviews and
 * still need Beau's confirmation (docs/demos/deercreek.md). */
export const team: ReadonlyArray<{ name: string; role: string; note?: string }> = [
  { name: 'Beau', role: 'Owner', note: 'Founded Deer Creek in 2017.' },
  { name: 'Laura', role: 'Office & scheduling', note: 'Sets up your visit.' },
  { name: 'Ryan', role: 'Plumber' },
  { name: 'Mark', role: 'Plumber' },
  { name: 'Matt', role: 'Plumber' },
]

export interface Faq { q: string; a: string }

export interface Service {
  slug: ServiceSlug
  name: string
  short: string
  title: string
  description: string
  eyebrow: string
  h1: string
  lede: string
  image: { src: string; alt: string; w: number; h: number }
  includesTitle: string
  includes: string[]
  signsTitle: string
  signs: string[]
  faqs: Faq[]
}

const photo = (name: string, alt: string, w = 1600, h = 1069) => ({ src: `/demos/deercreek/photos/${name}`, alt, w, h })

export const services: Service[] = [
  {
    slug: 'water-heaters',
    name: 'Water heaters',
    short: 'Same-day repair and replacement for tank and tankless water heaters.',
    title: 'Water Heater Repair & Replacement in Olathe, KS | Deer Creek Plumbing',
    description: 'Same-day water heater repair and replacement in Olathe and the Kansas City metro. Tank and tankless, installed by licensed plumbers with a 1-year parts and labor warranty.',
    eyebrow: 'Water heaters · Tank & tankless',
    h1: 'Water heater repair and replacement in Olathe',
    lede: 'No hot water or a tank that’s leaking? Deer Creek offers same-day water heater service across the Kansas City metro, for traditional tanks and tankless units alike.',
    image: photo('rough-in-1600.webp', 'A Deer Creek plumber kneels beside new water lines next to a water heater'),
    includesTitle: 'What we handle',
    includes: ['Water heater replacement, same day when you need it', 'Repair and diagnosis for gas and electric tanks', 'Tankless water heater installation and service', 'Energy-efficient models sized to your household', 'Expansion tanks and pressure reducing valves', 'Routine maintenance to extend the life of the tank'],
    signsTitle: 'Signs it’s time to call',
    signs: ['Water pooling under the tank or dripping from a fitting', 'Hot water that runs out fast or never gets hot', 'Rusty or discolored hot water', 'Popping or rumbling sounds while it heats', 'A pilot light that won’t stay lit'],
    faqs: [
      { q: 'Can you replace my water heater the same day?', a: 'Often, yes. Same-day water heater service is one of Deer Creek’s core promises. Call (913) 440-9102 early in the day and we’ll tell you when we can be there.' },
      { q: 'My water heater is leaking from the bottom. What should I do right now?', a: 'Turn off the cold-water supply valve on top of the tank. For a gas heater, turn the control knob to “Off” or “Pilot”; for an electric heater, switch off its breaker. Then call us. A leak from the bottom of the tank usually means the tank itself has failed.' },
      { q: 'Should I switch to a tankless water heater?', a: 'It depends on how much hot water your household uses at once, your gas line and your budget. We install both and will walk you through the trade-offs before you decide.' },
      { q: 'Is the new water heater covered?', a: 'Yes. Every job carries Deer Creek’s 1-year parts and labor warranty, and we honor the manufacturer’s warranty on the unit.' },
    ],
  },
  {
    slug: 'drain-cleaning',
    name: 'Drain cleaning',
    short: 'Kitchen, bath, floor and main drains cleared, with camera inspection when needed.',
    title: 'Drain Cleaning in Olathe & Kansas City | Deer Creek Plumbing',
    description: 'Clogged or slow drain? Deer Creek clears kitchen, bathroom, shower, floor and main sewer drains across the Kansas City metro, with hydro-jetting and camera inspection.',
    eyebrow: 'Drain cleaning · Hydro-jetting · Camera inspection',
    h1: 'Drain cleaning in Olathe and the Kansas City metro',
    lede: 'Slow sink, backed-up shower or a floor drain that won’t keep up? We find what’s causing the clog, clear it, and tell you how to keep it from coming back.',
    image: photo('measure-1600.webp', 'A Deer Creek plumber measures a drain line inside a framed wall'),
    includesTitle: 'Drains we clear',
    includes: ['Kitchen sinks: grease, food and soap buildup', 'Bathroom sinks, showers and tubs: hair and soap scum', 'Basement, laundry and garage floor drains', 'Main sewer line blockages', 'Hydro-jetting for grease, roots and stubborn buildup', 'Video camera inspection to find recurring problems'],
    signsTitle: 'Signs of a bigger clog',
    signs: ['More than one fixture is slow at the same time', 'Gurgling from a drain when another fixture runs', 'Water backing up in a tub when the toilet flushes', 'A sewer smell that won’t go away', 'The same drain clogging again a few weeks later'],
    faqs: [
      { q: 'When is a clog more than a single drain?', a: 'If several fixtures are slow at once, or water comes up in a tub or floor drain when you flush, the blockage is likely in the main line. Stop running water and call us rather than plunging.' },
      { q: 'What is hydro-jetting?', a: 'Hydro-jetting uses high-pressure water to scour grease, roots and debris from the inside of a pipe. It clears buildup a cable can only poke through, without chemicals.' },
      { q: 'Why would you run a camera down my drain?', a: 'For a stubborn or recurring clog, a camera shows exactly what is in the pipe, whether that’s roots, a sag or a broken section, so the fix matches the problem.' },
    ],
  },
  {
    slug: 'sewer-line-repair',
    name: 'Sewer line repair',
    short: 'Camera inspection, trenchless repair and full sewer line replacement.',
    title: 'Sewer Line Repair & Replacement in Kansas City | Deer Creek Plumbing',
    description: 'Sewer line inspection, cleaning, trenchless repair and replacement in Olathe and the Kansas City metro. Licensed plumbers, upfront pricing and a 1-year parts and labor warranty.',
    eyebrow: 'Sewer lines · Trenchless repair · Replacement',
    h1: 'Sewer line repair and replacement in the Kansas City metro',
    lede: 'A failing sewer line can mean backups, damage and a big bill. We start with a camera inspection so you see the problem, then recommend the least disruptive fix.',
    image: photo('pipe-vise-1600.webp', 'A Deer Creek plumber cuts a length of pipe on a chain vise beside the work van'),
    includesTitle: 'Sewer services',
    includes: ['Video sewer line inspection', 'Sewer line cleaning: grease, debris and tree roots', 'Trenchless repair with minimal digging', 'Full sewer line replacement, up to code', 'Grinder pumps and battery backups', 'Urgent repair for sudden backups'],
    signsTitle: 'Signs your sewer line needs attention',
    signs: ['Sewage backing up into a basement floor drain or tub', 'Several drains slow or gurgling at once', 'Sewer odor inside or in the yard', 'Unusually green or soggy patches over the line', 'Recurring clogs that cleaning doesn’t fix'],
    faqs: [
      { q: 'What is trenchless sewer repair?', a: 'Trenchless methods repair or replace a sewer line through small access points instead of digging a trench the length of the yard. It is usually faster and spares your landscaping.' },
      { q: 'Do I need to replace the whole sewer line?', a: 'Not always. A camera inspection shows whether the problem is a single section, roots at a joint or a line that has failed along its length. We’ll show you the footage and explain the options.' },
      { q: 'Sewage is coming up in my basement. What should I do?', a: 'Stop using water in the house: no flushing, laundry or dishwasher. Keep people and pets away from the water and call us at (913) 440-9102.' },
    ],
  },
  {
    slug: 'sump-pumps',
    name: 'Sump pumps',
    short: 'Installation, repair and battery backups that keep running in a storm.',
    title: 'Sump Pump Repair, Replacement & Battery Backup | Olathe, KS',
    description: 'Sump pump installation, repair, replacement and battery backup systems in Olathe and the Kansas City metro. Keep your basement dry when the power goes out.',
    eyebrow: 'Sump pumps · Battery backups',
    h1: 'Sump pump repair, replacement and battery backups',
    lede: 'Kansas City storms are when a sump pump earns its keep, and when the power is most likely to go out. We install, repair and back up sump pumps so the basement stays dry.',
    image: photo('framing-1600.webp', 'A Deer Creek plumber kneels in a framed basement fitting a drain line'),
    includesTitle: 'Sump pump services',
    includes: ['New sump pump installation: pedestal or submersible', 'Repair for pumps that run constantly or won’t start', 'Battery backup sump pumps for power outages', 'Inspection and tune-ups: pump, float and discharge line', 'Replacement of old or undersized pumps', 'Residential and commercial systems'],
    signsTitle: 'Signs your sump pump needs help',
    signs: ['The pump runs constantly, or cycles on and off quickly', 'It hums but doesn’t move water', 'Loud grinding or rattling', 'Water in the pit but the pump never kicks on', 'The pump is more than several years old and has no backup'],
    faqs: [
      { q: 'Do I need a battery backup sump pump?', a: 'If your basement relies on a sump pump, a battery backup keeps it running when storms knock out the power, which is exactly when you need it most.' },
      { q: 'How can I tell if my sump pump works?', a: 'Slowly pour a bucket of water into the pit. The float should rise, the pump should start, and the water should drain away. If it doesn’t, call us before the next storm.' },
    ],
  },
  {
    slug: 'leak-repair',
    name: 'Leaks, faucets & fixtures',
    short: 'Pipe leaks, faucets, disposals, showers and frozen lines, fixed cleanly.',
    title: 'Leak Repair, Faucets & Fixtures in Olathe, KS | Deer Creek Plumbing',
    description: 'Leak detection and repair, faucet and shower repair, garbage disposals, outdoor spigots and frozen pipes in Olathe and the Kansas City metro. Upfront quotes, careful clean-up.',
    eyebrow: 'Leaks · Faucets · Fixtures · Frozen pipes',
    h1: 'Leak repair, faucets and fixtures',
    lede: 'From a dripping faucet to a pipe that burst overnight, we find the leak with as little damage as possible, fix it properly and clean up after ourselves.',
    image: photo('overhead-1600.webp', 'A Deer Creek plumber tightens an overhead pipe fitting with two wrenches'),
    includesTitle: 'Repairs and installs',
    includes: ['Pipe leaks and water line breaks', 'Faucet repair, cartridges and replacement', 'Shower and tub valves', 'Garbage disposal installation and repair', 'Dishwasher and refrigerator water lines', 'Outdoor spigots and frozen pipes', 'Main shut-off and pressure reducing valves', 'Moen Flo smart water shut-off installation'],
    signsTitle: 'Leaks worth calling about',
    signs: ['A water bill that jumps without a reason', 'Stains or soft spots on a ceiling or wall', 'A faucet that drips after it’s turned off', 'The sound of running water when nothing is on', 'Musty smells under a sink'],
    faqs: [
      { q: 'A pipe burst. What do I do first?', a: 'Shut off the main water valve. It is usually where the water line enters the house: a basement wall, a utility room or a crawlspace. Keep clear of water near outlets, then call (913) 440-9102.' },
      { q: 'How do I keep pipes from freezing?', a: 'Beau’s own winter list: know where your main shut-off is, disconnect garden hoses, open cabinet doors on outside walls, let both hot and cold drip, keep the garage door closed if a bathroom sits above it, and shut the main off if you’re leaving town. A frozen pipe may not leak until it thaws.' },
      { q: 'Can you fix a faucet instead of replacing it?', a: 'Often. A new cartridge can stop a drip for a fraction of the cost of a new faucet. We’ll tell you which makes sense.' },
    ],
  },
  {
    slug: 'toilet-repair',
    name: 'Toilets',
    short: 'Running, leaking or clogged toilets repaired, or replaced with efficient models.',
    title: 'Toilet Repair & Replacement in Olathe, KS | Deer Creek Plumbing',
    description: 'Toilet repair and replacement in Olathe and the Kansas City metro: running, leaking and clogged toilets, high-efficiency and comfort-height models, bidet seats and more.',
    eyebrow: 'Toilets · Repair & replacement',
    h1: 'Toilet repair and replacement',
    lede: 'A toilet that runs, rocks, leaks or keeps clogging is worth a call. We’ll tell you honestly whether a repair will do or a new toilet is the better value.',
    image: photo('truck-1600.webp', 'A Deer Creek plumber leans out of the company truck, the antler logo and phone number on the door', 1600, 2397),
    includesTitle: 'Toilet services',
    includes: ['Running, leaking and constantly clogging toilets', 'Removal and installation of new toilets', 'Water-saving high-efficiency models', 'Comfort upgrades: soft-close and bidet seats', 'Help choosing a model for your space and budget', 'Supply lines and shut-off valves'],
    signsTitle: 'When replacing beats repairing',
    signs: ['It clogs often with normal use', 'The base rocks or leaks onto the floor', 'Cracks in the bowl or tank', 'Repairs keep stacking up on an older toilet'],
    faqs: [
      { q: 'How do I stop a running or overflowing toilet?', a: 'Turn the oval valve on the wall behind the toilet clockwise until it stops. Then call us for the repair.' },
      { q: 'Can you help me pick a new toilet?', a: 'Yes. We’ll recommend models by bowl shape, height, flushing power and water use, and bring it with us when possible.' },
    ],
  },
  {
    slug: 'gas-lines',
    name: 'Gas lines',
    short: 'Gas line inspections, leak detection, repairs and new lines.',
    title: 'Gas Line Inspection & Repair in Olathe, KS | Deer Creek Plumbing',
    description: 'Gas line inspections, leak detection, pressure testing, repair and installation in Olathe and the Kansas City metro. If you smell gas, leave the house first and call from outside.',
    eyebrow: 'Gas lines · Inspection · Repair · Installation',
    h1: 'Gas line inspection, repair and installation',
    lede: 'Gas leaks are often silent and can be deadly. Our inspections check every connection, test the pressure and make sure your lines meet current code.',
    image: photo('overhead-2-1600.webp', 'A Deer Creek plumber works overhead on a pipe connection'),
    includesTitle: 'What an inspection covers',
    includes: ['Leak detection with gas detectors', 'Pressure testing', 'Corrosion checks on older pipe', 'Connections, valves and fittings', 'Carbon monoxide checks on gas appliances', 'Code compliance checks', 'New gas lines and repairs'],
    signsTitle: 'Reasons to book an inspection',
    signs: ['You’re buying or selling an older home', 'You’re adding a range, dryer, grill or generator', 'Appliances burn with a yellow or flickering flame', 'You notice a faint gas smell near an appliance (if strong, leave first)'],
    faqs: [
      { q: 'What should I do if I smell gas?', a: 'Leave the building right away. Don’t switch lights on or off, use a phone or start a car inside or near the house. Once you’re outside and away from the house, call 911 or your gas utility’s emergency line. Call us for repairs once the utility says it’s safe.' },
      { q: 'Do I need a permit for a new gas line?', a: 'New gas work usually requires a permit and inspection from your city. We’ll handle what your city requires.' },
    ],
  },
  {
    slug: 'radiant-heat-boilers',
    name: 'Radiant heat & boilers',
    short: 'Hydronic radiant floor heating and boiler installation, service and repair.',
    title: 'Radiant Floor Heating & Boiler Service | Kansas City Metro',
    description: 'Hydronic radiant floor heating and boiler installation, repair and maintenance in Olathe, Louisburg, Paola and the Kansas City metro, from licensed plumbers.',
    eyebrow: 'Radiant heat · Boilers · Hydronic systems',
    h1: 'Radiant floor heating and boiler service',
    lede: 'Radiant heat warms a room from the floor up: quiet, even and efficient. We install, service and repair hydronic radiant systems and the boilers that drive them.',
    image: { src: '/demos/deercreek/photos/copper-620.webp', alt: 'Rows of new copper supply lines running through a building under construction', w: 621, h: 1104 },
    includesTitle: 'Radiant and boiler services',
    includes: ['Hydronic radiant floor heating installation', 'Retrofits in existing homes', 'Boiler replacement and installation', 'Pre-season boiler check-ups', 'Zoning so you heat only the rooms in use', 'Repair for uneven heat or unusual noises'],
    signsTitle: 'Signs your system needs service',
    signs: ['Some rooms or zones stay cold', 'Banging, gurgling or whistling from pipes or the boiler', 'Pressure that keeps dropping', 'A boiler that short-cycles or won’t fire'],
    faqs: [
      { q: 'What is hydronic radiant heating?', a: 'A boiler heats water that circulates through tubing under the floor, warming the room from the ground up. It runs at lower temperatures than forced air and can be paired with an efficient boiler.' },
      { q: 'Which floors work with radiant heat?', a: 'Tile, stone and laminate work best in our experience. Some hardwoods and carpets work too if they are rated for radiant heat.' },
      { q: 'Can radiant heat go into an existing home?', a: 'Yes. Retrofits take more planning than new construction, and we tailor the system to your floors and rooms.' },
    ],
  },
  {
    slug: 'remodels-new-construction',
    name: 'Remodels & new construction',
    short: 'Rough-in to finish plumbing for new homes, remodels and basement finishes.',
    title: 'Remodel & New Construction Plumbing | Olathe & KC Metro',
    description: 'Plumbing for new construction, kitchen and bath remodels and basement finishes in Olathe and the Kansas City metro, from rough-in to final fixtures.',
    eyebrow: 'New construction · Remodels · Basement finishes',
    h1: 'Plumbing for remodels and new construction',
    lede: 'Building, remodeling or finishing a basement? We plan and install the plumbing from rough-in to final fixtures, and coordinate with your builder or contractor.',
    image: photo('site-layout-1600.webp', 'A Deer Creek plumber measures drain stub-outs on a new building pad'),
    includesTitle: 'Project work',
    includes: ['New construction rough-in and finish', 'Kitchen and bathroom remodels', 'Basement finishes', 'Fixture, sink and shower installation', 'Moving or adding lines for new layouts', 'Disconnect and reconnect for countertop swaps'],
    signsTitle: 'Good times to bring us in',
    signs: ['Before walls are closed up, to check what’s inside', 'When a layout moves sinks, tubs or appliances', 'When finishing a basement with a bathroom', 'When replacing countertops or appliances'],
    faqs: [
      { q: 'Do you work with builders and general contractors?', a: 'Yes. We do new construction and remodel plumbing and coordinate schedules with the rest of the trades.' },
      { q: 'Can you check a newly built home?', a: 'Yes. One customer told us Ryan found several “ticking time-bombs” the original builder had missed.' },
    ],
  },
  {
    slug: 'commercial-plumbing',
    name: 'Commercial plumbing',
    short: 'Tenant finishes, grease traps, repairs and maintenance for businesses and rentals.',
    title: 'Commercial Plumbing in the Kansas City Metro | Deer Creek Plumbing',
    description: 'Commercial plumbing for Kansas City metro businesses and property owners: new construction, tenant finishes, grease traps, drain and sewer service, water heaters and repairs.',
    eyebrow: 'Commercial · Property managers · Tenant finishes',
    h1: 'Commercial plumbing for Kansas City metro businesses',
    lede: 'Businesses and property owners count on Deer Creek for build-outs, maintenance and the repair that can’t wait until Monday. One call, upfront pricing, work done right.',
    image: photo('commercial-framing-1600.webp', 'Steel stud walls with copper and PVC rough-in plumbing in a commercial space', 1600, 1200),
    includesTitle: 'Commercial services',
    includes: ['New construction and tenant finishes', 'Remodels', 'Drain and sewer line cleaning, repair and replacement', 'Grease trap installation and maintenance', 'Faucets, fixtures, toilets and urinals', 'Water heaters, sump pumps, grinder pumps and battery backups'],
    signsTitle: 'Who we work with',
    signs: ['Business owners and facility managers', 'Landlords and property managers with rental units', 'General contractors on tenant finishes', 'Restaurants that need grease trap service'],
    faqs: [
      { q: 'Do you work with property managers and landlords?', a: 'Yes. Customers manage rentals with us, and we keep the owner and the tenant both in the loop.' },
      { q: 'Do you install and maintain grease traps?', a: 'Yes, both installation and routine maintenance.' },
    ],
  },
]

export const serviceBySlug = (slug: string) => services.find(service => service.slug === slug)

/** The full lists from deercreekplumbing.com. */
export const residentialList = ['New construction', 'Remodels', 'Basement finishes', 'Sewer repair', 'Kitchen faucets and drains', 'Bathroom faucets and drains', 'Clogged drain cleaning', 'Sewer line cleaning', 'Sewer line repair', 'Dishwasher installation', 'Faucet installation and repair', 'Garbage disposal installation and repair', 'Shower installation and repair', 'Sink installation and repair', 'Sump pump installation and repair', 'Toilet installation and repair', 'Water heater installation', 'Gas line installation and repair', 'Battery backups', 'Grinder pumps']
export const commercialList = ['New construction', 'Tenant finishes', 'Remodels', 'Drain cleaning', 'Sewer line cleaning', 'Sewer line repair and replacement', 'Faucet and fixture installation and repair', 'Grease trap installation and maintenance', 'Sump pump installation and maintenance', 'Toilet and urinal installation and repair', 'Water heater installation', 'Battery backups', 'Grinder pumps']

export const generalFaqs: Faq[] = [
  { q: 'What are your hours?', a: 'The office is open Monday to Friday, 8:00 a.m. to 4:30 p.m., and closed Saturday and Sunday. For a plumbing emergency outside those hours, call (913) 440-9102.' },
  { q: 'Where do you work?', a: 'Our shop is in Olathe, and we serve homes and businesses across the Kansas City metro, on both sides of the state line. Use the service area checker to look up your ZIP code or town.' },
  { q: 'How quickly can you come out?', a: 'Service is typically available within 24 hours, estimates are same-day, and water heater service is same-day.' },
  { q: 'Will I know the price before you start?', a: 'Yes. You get the price before any work begins. Customers regularly tell us the quote matched the final bill.' },
  { q: 'Is your work guaranteed?', a: 'Every service is backed by a 1-year parts and labor warranty, and we honor manufacturer warranties.' },
  { q: 'Do you work with insurance companies?', a: 'Yes. If water damage is involved, we work with your insurance company to make the claim as simple as possible.' },
  { q: 'Are your plumbers licensed and insured?', a: 'Yes. Our plumbers are certified, licensed and insured, and keep up with continuing education.' },
  { q: 'Which brands do you install?', a: 'We regularly install Delta, Moen, A. O. Smith and American Standard, and we can work with the fixture you’ve chosen.' },
  { q: 'How can I pay?', a: 'Cash, check, Visa, Mastercard, American Express and Discover.' },
  { q: 'Can I ask for accommodations during a visit?', a: 'Yes. When you request a visit, tell us what makes it easier for your household, such as text instead of calls, extra time to reach the door or a quieter visit. You can also call and tell the office.' },
]

/** The quick triage on the home page. Steps are standard safety guidance. */
export interface Problem {
  id: string
  label: string
  urgency: 'now' | 'soon' | 'plan' | 'safety'
  heading: string
  steps: string[]
  service: ServiceSlug | null
}

export const problems: Problem[] = [
  { id: 'gas', label: 'I smell gas', urgency: 'safety', service: 'gas-lines', heading: 'Leave the house first. Call from outside.', steps: ['Get everyone out, pets included. Leave the door open behind you.', 'Don’t flip switches, use a phone or start a car inside or near the house.', 'Once you’re outside and away from the house, call 911 or your gas utility’s emergency line.', 'Call us for the repair once the utility says it’s safe.'] },
  { id: 'leak', label: 'Water is leaking or spraying', urgency: 'now', service: 'leak-repair', heading: 'Shut off the water, then call us.', steps: ['Turn off the main water valve. It is usually where the water line enters the house: a basement wall, a utility room or a crawlspace.', 'Keep clear of water near outlets or appliances.', 'Move what you can out of the water’s path and take a few photos for insurance.'] },
  { id: 'hot-water', label: 'No hot water', urgency: 'soon', service: 'water-heaters', heading: 'Same-day water heater service.', steps: ['If the tank is leaking, turn off the cold-water valve on top of the tank.', 'Gas heater: turn the control to “Off” or “Pilot”. Electric: switch off its breaker.', 'Note the brand and size on the label if you can. It helps us bring the right parts.'] },
  { id: 'drain', label: 'Drain clogged or backing up', urgency: 'soon', service: 'drain-cleaning', heading: 'Stop the water and let us clear it.', steps: ['Stop running water in that fixture, and pause the washer and dishwasher.', 'If several drains are slow, or water comes up in a tub or floor drain, don’t keep flushing. That points to the main line.', 'Skip chemical drain openers. They can damage pipes and make the repair more hazardous.'] },
  { id: 'sewer', label: 'Sewage backing up', urgency: 'now', service: 'sewer-line-repair', heading: 'Stop using water in the house.', steps: ['No flushing, showers, laundry or dishwasher until it’s cleared.', 'Keep people and pets away from the water.', 'Call us. We can inspect the line by camera to find the cause.'] },
  { id: 'sump', label: 'Sump pump stopped or basement flooding', urgency: 'now', service: 'sump-pumps', heading: 'Check the power, then call.', steps: ['Make sure the pump is plugged in and its breaker or GFCI outlet hasn’t tripped, but only if you can reach it without standing in water.', 'Keep clear of standing water near outlets.', 'Ask us about a battery backup so the next storm doesn’t catch you.'] },
  { id: 'toilet', label: 'Toilet running, leaking or clogged', urgency: 'soon', service: 'toilet-repair', heading: 'Turn the valve behind the toilet.', steps: ['Turn the oval valve on the wall behind the toilet clockwise until the water stops.', 'Don’t flush again until it’s fixed.'] },
  { id: 'freeze', label: 'Frozen pipe', urgency: 'soon', service: 'leak-repair', heading: 'Thaw gently, and know where your shut-off is.', steps: ['Find your main shut-off first. A frozen pipe may not leak until it thaws.', 'Open the cabinet doors and warm the pipe gently with a hair dryer. Never use an open flame.', 'Leave the faucet open so water can flow as it thaws. Call us if nothing comes through, or if you see a split.'] },
  { id: 'project', label: 'Planning a project or upgrade', urgency: 'plan', service: null, heading: 'Let’s plan it together.', steps: ['Tell us what you’re planning: a new water heater, a remodel, a basement finish or new fixtures.', 'We give same-day estimates and the price up front.'] },
]

export const visitPreferences = [
  'Please text instead of calling',
  'Please call instead of texting',
  'Deaf or hard of hearing: please use text or email',
  'Someone at home uses a wheelchair or mobility aid',
  'Someone at home may need extra time to reach the door',
  'Someone at home is sensitive to noise or new people',
  'Pets at home',
] as const

export type PageKind = 'home' | 'services' | 'service' | 'area' | 'reviews' | 'about' | 'schedule' | 'faq' | 'accessibility'

export interface Page {
  slug: string
  kind: PageKind
  nav: string
  title: string
  description: string
}

export const pages: Page[] = [
  { slug: '', kind: 'home', nav: 'Home', title: 'Plumber in Olathe, KS | Deer Creek Plumbing, Kansas City Metro', description: 'Family-owned Olathe plumber serving the Kansas City metro since 2017. Same-day water heater service, upfront quotes and a 1-year parts and labor warranty. Rated 5.0 on Google.' },
  { slug: 'services', kind: 'services', nav: 'Services', title: 'Plumbing Services in Olathe & Kansas City | Deer Creek Plumbing', description: 'Residential and commercial plumbing in Olathe and the Kansas City metro: water heaters, drains, sewer lines, sump pumps, leaks, toilets, gas lines, radiant heat and remodels.' },
  ...services.map(service => ({ slug: `services/${service.slug}`, kind: 'service' as const, nav: service.name, title: service.title, description: service.description })),
  { slug: 'service-area', kind: 'area', nav: 'Service area', title: 'Plumbing Service Area: Olathe & Kansas City Metro | Deer Creek Plumbing', description: 'Check whether Deer Creek Plumbing serves your ZIP code or town. Based in Olathe, serving Johnson County, Overland Park, Lenexa, Shawnee, Kansas City and the wider metro.' },
  { slug: 'reviews', kind: 'reviews', nav: 'Reviews', title: 'Deer Creek Plumbing Reviews | 5.0 Stars from 286 Google Reviews', description: 'What Kansas City metro homeowners and businesses say about Deer Creek Plumbing: fair pricing, on-time plumbers, honest advice and careful clean-up.' },
  { slug: 'about', kind: 'about', nav: 'About', title: 'About Deer Creek Plumbing | Family-Owned Olathe Plumber Since 2017', description: 'Deer Creek Plumbing is a family and locally owned Olathe plumbing company serving the Kansas City metro since 2017. Meet the team customers mention by name.' },
  { slug: 'schedule', kind: 'schedule', nav: 'Request a visit', title: 'Request a Plumber Visit in Olathe & Kansas City | Deer Creek Plumbing', description: 'Request a plumbing visit online in about two minutes. Pick a service, a preferred day and a time window, and tell us what makes the visit easier for your household.' },
  { slug: 'faq', kind: 'faq', nav: 'FAQ', title: 'Plumbing Questions & Answers | Deer Creek Plumbing, Olathe KS', description: 'Answers to common plumbing questions: hours, emergencies, service area, pricing, warranty, water heaters, drains, sewer lines, frozen pipes and radiant heat.' },
  { slug: 'accessibility', kind: 'accessibility', nav: 'Accessibility', title: 'Accessibility Statement | Deer Creek Plumbing', description: 'How the Deer Creek Plumbing website is built to work for everyone, how to adjust the display, and how to ask for help or report a barrier.' },
]

export const pageBySlug = (slug: string) => pages.find(page => page.slug === slug)
