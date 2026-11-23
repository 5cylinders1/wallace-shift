/**
 * Everything the American Mechanical KC concept says, ported from the Base44
 * build in american-mechanical-pro.zip (2026-11-23). Page copy, business facts
 * and review figures are that build's; see docs/demos/american-mechanical.md.
 */
import { allPosts } from './blog/posts'

export const BASE = '/demo/american-mechanical'
export const ORIGIN = 'https://wallaceshift.com'

export const business = {
  name: 'American Mechanical KC',
  phoneDisplay: '(913) 725-8376',
  phoneHref: 'tel:+19137258376',
  email: 'info@amechkc.com',
  address: '1025 Winchester Ave, Kansas City, MO 64126',
  hours: 'Office hours: Mon–Fri, 9 AM–5 PM',
  google: 'https://www.google.com/maps/place/American+Mechanical+KC/data=!4m2!3m1!1s0x87c0f141a1530f4b:0x963330f9b1245dae',
  rating: '4.6',
  reviewCount: 37,
}

export const serviceChoices = ['Heating & Cooling', 'Water Heaters', 'Whole-House Water Filtration', 'Appliance Sales & Service', 'Interior Remodels', 'Exterior Remodels', 'Not Sure Yet'] as const
export type ServiceChoice = typeof serviceChoices[number]
export const isServiceChoice = (value: unknown): value is ServiceChoice => serviceChoices.includes(value as ServiceChoice)

/** Paths are relative to BASE. */
export const servicePages: [path: string, label: string][] = [
  ['/heating-and-cooling', 'Heating & Cooling'],
  ['/water-heater-installation', 'Water Heaters'],
  ['/services/appliance-sales-service', 'Appliance Sales & Service'],
  ['/services/interior-remodels', 'Interior Remodels'],
  ['/services/exterior-remodels', 'Exterior Remodels'],
]

export const areaPages: [path: string, label: string][] = [
  ['/locations/kansas-city-mo', 'Kansas City, MO'],
  ['/locations/merriam-ks', 'Merriam, KS'],
]

/** A demo-relative link (`/blog`, `/#quote`, `/?service=…#quote`) as an absolute path. */
export function href(path = '/'): string {
  if (path === '/' || path === '') return BASE
  if (path.startsWith('/#') || path.startsWith('/?')) return BASE + path.slice(1)
  return BASE + path
}

export function quoteHref(service?: string): string {
  return service ? href(`/?service=${encodeURIComponent(service)}#quote`) : href('/#quote')
}

export interface InlineLink { before: string; label: string; href: string; after: string }

export interface DetailContent {
  slug: string
  title: string
  description: string
  name: string
  headline: string
  intro: string
  blocks: [heading: string, copy: string][]
  service?: ServiceChoice
  area?: boolean
  brands?: boolean
  extra?: InlineLink
}

export const detailPages: DetailContent[] = [
  {
    slug: 'heating-and-cooling',
    title: 'Kansas City Heating & Cooling | American Mechanical KC',
    description: 'Get help with furnace and air conditioner installation, replacement, seasonal maintenance and urgent HVAC repairs in Greater Kansas City.',
    name: 'Heating & Cooling', headline: 'Heating and cooling in Kansas City', service: 'Heating & Cooling', brands: true,
    intro: 'From a furnace that can’t keep up to an air conditioner that won’t start, American Mechanical KC helps homeowners and businesses decide whether to repair, maintain, or replace their system.',
    blocks: [
      ['New systems and replacements', 'Tell us about temperature differences between rooms, your current equipment, and your budget. We’ll review the property and explain which system options fit before you decide.'],
      ['Repairs and urgent HVAC calls', 'If your system has stopped working, call to check availability. Tell us whether the system runs at all, when the problem began, and whether you’ve noticed unusual sounds or poor airflow.'],
      ['Seasonal tune-ups', 'Schedule AC maintenance before cooling season or a furnace check before the first cold spell. If a room is consistently too hot or too cold, mention it when you book so the concern can be checked.'],
    ],
  },
  {
    slug: 'water-heater-installation',
    title: 'Kansas City Water Heater Installation | American Mechanical KC',
    description: 'Request water heater installation, replacement or a repair assessment in Greater Kansas City. Get help choosing the right size for your property.',
    name: 'Water Heaters', headline: 'Water heater installation and replacement', service: 'Water Heaters',
    extra: { before: 'Planning a replacement? Browse our ', label: 'water heater guides', href: href('/blog'), after: ' for help comparing types, sizing and installation costs.' },
    intro: 'Running out of hot water or replacing an older unit? We help Kansas City homeowners and businesses choose a water heater that suits their daily use and the space it needs to fit.',
    blocks: [
      ['Choose the right size', 'Think about how many fixtures need hot water at once and whether demand has changed. Share the current unit’s size and whether it uses gas or electricity, if you know.'],
      ['Repair or replace?', 'No hot water doesn’t always mean the heater needs replacing. Tell us what changed, whether the water gets warm at all, and whether you can see water near the unit. If it’s leaking now, call instead of waiting for a quote.'],
      ['Plan the installation', 'We’ll review access, hookups, and any installation changes before recommending a replacement. Ask what’s included, whether the old unit will be removed, and how long your hot water may be off.'],
    ],
  },
  {
    slug: 'services/appliance-sales-service',
    title: 'Appliance Sales & Service in Kansas City | American Mechanical KC',
    description: 'Ask American Mechanical KC about appliance sales or service. Share your appliance type, model number and what you need to confirm availability.',
    name: 'Appliance Sales & Service', headline: 'Appliance sales and service', service: 'Appliance Sales & Service',
    intro: 'Need to replace an appliance or find out if the one you have can be repaired? Ask American Mechanical KC which appliance types and services are currently available in your ZIP code.',
    blocks: [
      ['For a service inquiry', 'Include the brand, model number, approximate age, and any error code. Describe what the appliance still does and exactly when the problem occurs.'],
      ['For a replacement inquiry', 'Measure the opening and the tightest doorway on the way in. Note whether the appliance needs a gas, water, or electrical hookup so you can discuss what will fit.'],
      ['Confirm what’s included', 'Before you buy or book, ask whether delivery, installation, and removal of the old unit are available for your model and address.'],
    ],
  },
  {
    slug: 'services/interior-remodels',
    title: 'Interior Remodels in Kansas City | American Mechanical KC',
    description: 'Discuss a kitchen, bath or other interior remodel in Greater Kansas City. Share what you want to change, your timeline and your project priorities.',
    name: 'Interior Remodels', headline: 'Interior remodeling inquiries', service: 'Interior Remodels',
    intro: 'Whether you’re updating a kitchen, reworking a bathroom, or changing how several rooms fit together, tell us what isn’t working today and ask if the project fits our current scope.',
    blocks: [
      ['Start with the layout', 'Tell us what needs to stay, what can move, and how you use the room. Moving a sink, appliance, or wall is a different project from keeping the layout and updating finishes.'],
      ['Plan around daily use', 'If it’s your only bathroom or you need the kitchen usable by a certain date, say so early. That can affect which work should happen first and how the job is scheduled.'],
      ['List your priorities', 'Share your rough budget and distinguish must-haves from nice-to-haves. Mention any ventilation, heating, or hot water changes you want considered alongside the remodel.'],
    ],
  },
  {
    slug: 'services/exterior-remodels',
    title: 'Exterior Remodels in Kansas City | American Mechanical KC',
    description: 'Ask about exterior remodeling in Greater Kansas City. Share the part of the property you want to update and any access or weather-related concerns.',
    name: 'Exterior Remodels', headline: 'Exterior remodeling inquiries', service: 'Exterior Remodels',
    intro: 'Thinking about an exterior update? Tell us which part of the property you want to improve, whether the goal is to address wear or change the look, and ask about current project availability.',
    blocks: [
      ['Describe the existing exterior', 'Identify the side of the building and the material you want to keep or replace. Note visible wear or water staining so the project discussion can address more than appearance.'],
      ['Flag access and timing', 'Mention tight gates, steep grades, or other access limits. If a particular event or season drives your deadline, share it so outdoor work can be planned around the weather.'],
      ['Confirm scope before committing', 'Ask which parts of the project are in scope, who handles any applicable approvals, and what needs to be decided before pricing can be finalized.'],
    ],
  },
  {
    slug: 'locations/kansas-city-mo',
    title: 'HVAC & Water Heaters in Kansas City, MO | American Mechanical KC',
    description: 'Find HVAC and water heater service for Kansas City, Missouri homes and businesses. Check availability by ZIP or call the local team for urgent service.',
    name: 'Kansas City, MO', headline: 'HVAC and water heater service in Kansas City, MO', area: true,
    extra: { before: 'Planning a replacement within city limits? See ', label: 'Kansas City’s plumbing and mechanical permit guidance', href: 'https://www.kcmo.gov/city-hall/departments/city-planning-development/electrical-plumbing-and-mechanical-permits', after: ' and ask who will handle any required permits before work starts.' },
    intro: 'American Mechanical KC is based on Winchester Avenue in Kansas City, Missouri. We serve homes and businesses throughout the metro. Include your ZIP code so we can confirm service for your address.',
    blocks: [
      ['For Kansas City homes', 'If you’re replacing equipment in a basement or utility closet, tell us about stairs, narrow doors, and where the existing unit sits. Access can affect equipment selection and installation.'],
      ['For Kansas City businesses', 'Let us know if a heating, cooling, or hot water outage is affecting your business hours. Include whether the unit serves one suite or multiple spaces, and who can provide access.'],
      ['Call when it can’t wait', 'For a system outage or an active water heater leak, call (913) 725-8376 to check the next available service time instead of waiting for an online response.'],
    ],
  },
  {
    slug: 'locations/merriam-ks',
    title: 'HVAC & Water Heater Service in Merriam, KS | American Mechanical KC',
    description: 'Get help with water heater replacement, furnace and AC service in Merriam, Kansas. Find out what to share when requesting a quote.',
    name: 'Merriam, KS', headline: 'Water heaters and HVAC in Merriam, KS', area: true,
    extra: { before: 'Moving equipment or changing plumbing or mechanical systems as part of a remodel? Check ', label: 'Merriam’s building permit guidance', href: 'https://www.merriam.org/Government/Departments/Community-Development/Building-Permits', after: ' before finalizing the scope.' },
    intro: 'Our Kansas City team travels to Merriam for water heater installation and heating and cooling work. Request a visit at your property and include your ZIP so we can confirm coverage and scheduling.',
    blocks: [
      ['Replacing a water heater in Merriam', 'Start with the number of people or fixtures that rely on hot water. If you’re finishing a basement or moving the heater, mention the proposed location before choosing a unit.'],
      ['Planning heating and cooling work', 'If you’re upgrading a furnace or AC, note whether the current system leaves any rooms uncomfortable. If you’re booking maintenance instead, share when the system was last serviced.'],
      ['Preparing for your appointment', 'Keep the equipment label handy if you can read it safely. For rentals or shared buildings, tell us who can approve the work and arrange entry to the mechanical room.'],
    ],
  },
]

export type PageKind = 'home' | 'detail' | 'blog' | 'article'
export interface PageMeta { slug: string; kind: PageKind; title: string; description: string }

/** Every document the concept renders, keyed by its path below BASE. */
export const pages: PageMeta[] = [
  { slug: '', kind: 'home', title: 'American Mechanical KC | HVAC & Water Heater Installation', description: 'Kansas City HVAC and water heater installation for homes and businesses. Request a quote or call American Mechanical KC for urgent service.' },
  ...detailPages.map(({ slug, title, description }): PageMeta => ({ slug, kind: 'detail', title, description })),
  { slug: 'blog', kind: 'blog', title: 'Water Heater Blog | American Mechanical KC', description: 'Read practical water heater guides from American Mechanical KC. Compare types and sizes, troubleshoot problems, and plan repairs or replacement.' },
  ...allPosts.map(({ slug, title, description }): PageMeta => ({ slug: `blog/${slug}`, kind: 'article', title, description })),
]

/** The old Base44 URL that redirected (301) to the Merriam page. */
export const legacyRedirects: [from: string, to: string][] = [
  ['/water-heater-installation-merriam-ks', '/locations/merriam-ks'],
]
