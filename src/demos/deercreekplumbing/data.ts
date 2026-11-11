/** Independent second concept. Business facts checked against Deer Creek's
 * website and Google Business Profile on November 10, 2026. */
export const BASE = '/demo/deercreekplumbing'
export const ORIGIN = 'https://wallaceshift.com'
export const href = (slug = '') => `${BASE}${slug ? `/${slug}` : ''}`
export const absolute = (slug = '') => `${ORIGIN}${href(slug)}`
export const business = {
  name: 'Deer Creek Plumbing',
  phone: '(913) 440-9102',
  phoneHref: 'tel:+19134409102',
  email: 'deercreekplumbinginc@gmail.com',
  address: '19968 W 162nd St, Olathe, KS 66062',
  hours: 'Monday to Friday, 8:00 a.m. to 4:30 p.m.',
  googleUrl: 'https://maps.google.com/maps?cid=6948310473349042081',
  facebookUrl: 'https://www.facebook.com/DeerCreekPlumbing',
} as const

export interface Service {
  slug: string
  name: string
  summary: string
  intro: string
  points: string[]
  faq: { q: string; a: string }[]
  image: string
  alt: string
}
const photo = (name: string) => `/demos/deercreek/photos/${name}-800.webp`
export const services: Service[] = [
  {
    slug: 'water-heaters', name: 'Water heaters',
    summary: 'Repair and replacement when the hot water stops, the tank leaks or it is time for an upgrade.',
    intro: 'Cold showers and a leaking tank need a clear next step. Deer Creek provides water heater service in Olathe and the Kansas City metro, including repairs, replacements and installation. Ask about same-day service and the right option for your household.',
    points: ['Water heater troubleshooting and repairs', 'Replacement and installation', 'Help understanding manufacturer warranty coverage', 'A one year parts and labor warranty on service'],
    faq: [
      { q: 'Do you offer same-day water heater service?', a: 'Deer Creek advertises same-day water heater service. Call the office to confirm availability for your location and situation.' },
      { q: 'Should I repair or replace my water heater?', a: 'The answer depends on the cause of the problem, the condition of the unit and the available repair options. A plumber can inspect it and explain the options before work begins.' },
      { q: 'Can I request a visit online?', a: 'You can try the request flow in this concept. It does not send a request or reserve an appointment. For a real visit, call or email Deer Creek.' },
    ],
    image: photo('pipe-vise'), alt: 'A Deer Creek plumber working on copper pipe with a pipe vise',
  },
  {
    slug: 'drain-cleaning', name: 'Drain cleaning',
    summary: 'Help with a slow sink, a backed-up drain or a clog that keeps returning.',
    intro: 'A drain that keeps slowing down deserves more than another temporary fix. Deer Creek offers drain cleaning for homes and businesses around Olathe and the Kansas City metro. Tell the team which fixtures are affected and how long it has been happening.',
    points: ['Drain cleaning for residential plumbing', 'Commercial drain service', 'Assessment of recurring clogs', 'Related sewer line service when needed'],
    faq: [
      { q: 'Can you help with recurring drain clogs?', a: 'Yes. Drain cleaning is one of Deer Creek’s listed services. Describe the recurring issue so the team can assess the cause and discuss the next step.' },
      { q: 'What should I tell the plumber?', a: 'Mention which drains are affected, whether several fixtures back up together, when the problem started and any previous work on the drain.' },
      { q: 'Do you clean drains at businesses?', a: 'Deer Creek lists both residential and commercial plumbing services. Confirm the building type and job details when you contact the office.' },
    ],
    image: photo('measure'), alt: 'A Deer Creek plumber measuring a plumbing line inside a framed wall',
  },
  {
    slug: 'sewer-repair', name: 'Sewer line repair',
    summary: 'Inspection, repair and replacement for problems beyond the drain.',
    intro: 'When several drains back up or a sewer problem returns, the line itself may need attention. Deer Creek offers sewer line repair and replacement in the Kansas City area. The team can explain what needs to be repaired and which approach fits the property.',
    points: ['Sewer line inspections', 'Sewer line repair and replacement', 'Discussion of suitable repair methods', 'Residential and commercial plumbing support'],
    faq: [
      { q: 'Do you replace sewer lines?', a: 'Yes. Sewer line repair and replacement are listed on Deer Creek’s current website. The team will need to assess the property before recommending work.' },
      { q: 'Can you use a trenchless repair method?', a: 'Ask the office about the methods available for your specific line. Ground conditions, pipe condition and access affect which approach is suitable.' },
      { q: 'Is emergency service available?', a: 'Call Deer Creek directly to ask about current availability. Published office hours are Monday to Friday, 8:00 a.m. to 4:30 p.m.; this demo form is not monitored.' },
    ],
    image: photo('framing'), alt: 'A Deer Creek plumber installing plumbing inside a building under construction',
  },
  {
    slug: 'sump-pumps', name: 'Sump pumps',
    summary: 'Repairs, replacement and backup options for basement water protection.',
    intro: 'A sump pump should be ready before the next heavy rain. Deer Creek provides sump pump service for homeowners in Olathe and the surrounding metro. Ask about an existing pump that is struggling or a replacement for an older system.',
    points: ['Sump pump inspection and repair', 'Sump pump installation and replacement', 'Discussion of backup options', 'Practical advice for your existing setup'],
    faq: [
      { q: 'Do you install new sump pumps?', a: 'Yes. Deer Creek lists sump pump installation and service. Contact the office with details about your current setup and the problem you are trying to solve.' },
      { q: 'Can I ask about a backup pump?', a: 'Yes. Ask the team which backup options suit your system and household. Product choices and pricing need to be confirmed for the job.' },
      { q: 'What information helps when I call?', a: 'Describe whether the pump runs, whether water is collecting, and whether there is an existing backup system. The team can use those details to plan the visit.' },
    ],
    image: photo('measure'), alt: 'A Deer Creek plumber carefully checking pipe measurements',
  },
  {
    slug: 'leak-repair', name: 'Leaks and fixtures',
    summary: 'Repairs for leaking pipes, dripping faucets and everyday plumbing problems.',
    intro: 'A small drip can disrupt the whole day. Deer Creek handles residential plumbing repairs, including leaks, faucets and fixtures. Tell the team where you notice water, which fixture is involved and whether the problem is ongoing.',
    points: ['Pipe leak repairs', 'Faucet and fixture service', 'Toilet repair and replacement', 'Help with residential plumbing maintenance'],
    faq: [
      { q: 'Do you repair faucets and toilets?', a: 'Yes. Deer Creek’s residential services include faucets, fixtures and toilets. Share the fixture type and symptoms when requesting service.' },
      { q: 'Can you help with a hidden leak?', a: 'Contact the office to describe what you have noticed, such as unexplained water or a recurring damp area. The plumber can assess what investigation is needed.' },
      { q: 'Will I know the plan before work begins?', a: 'Ask the plumber to explain the proposed repair and estimate before approving the work. Customers frequently mention clear explanations and pricing in public reviews.' },
    ],
    image: photo('pipe-vise'), alt: 'A Deer Creek plumber preparing copper pipe for plumbing work',
  },
  {
    slug: 'commercial', name: 'Commercial plumbing',
    summary: 'Plumbing support for business properties, repairs, remodels and new projects.',
    intro: 'Plumbing problems affect staff, tenants and customers. Deer Creek provides commercial plumbing across the Kansas City metro, alongside remodel and new construction work. Share your building type, access needs and project schedule with the office.',
    points: ['Commercial plumbing repairs', 'Water heater and drain service', 'Plumbing for remodels and new construction', 'Coordination around property access and project needs'],
    faq: [
      { q: 'Do you work on commercial properties?', a: 'Yes. Commercial plumbing is a dedicated service on Deer Creek’s current website. Confirm the scope and schedule with the office.' },
      { q: 'Can you help with a remodel or new construction?', a: 'Deer Creek lists remodel and new construction plumbing. Contact the team with the project location and scope to discuss next steps.' },
      { q: 'Can I request a particular time?', a: 'You can share a preferred day and time window. The office must confirm availability before any appointment is scheduled.' },
    ],
    image: photo('framing'), alt: 'Deer Creek plumbing work in a framed building',
  },
]

export type PageKind = 'home' | 'services' | 'service' | 'area' | 'reviews' | 'about' | 'schedule' | 'accessibility'
export interface Page { slug: string; title: string; description: string; heading: string; kind: PageKind }
export const pages: Page[] = [
  {slug:'',title:'Plumber in Olathe, KS | Deer Creek Plumbing Concept',description:'Explore Deer Creek Plumbing services for Olathe and the Kansas City metro. A Wallace Shift website concept with accessible service information and a demo request flow.',heading:'Plumbing. With care.',kind:'home'},
  {slug:'services',title:'Plumbing Services in Olathe | Deer Creek Plumbing',description:'Explore water heater, drain, sewer, sump pump, leak and commercial plumbing services for homes and businesses in the Kansas City metro.',heading:'Plumbing services.',kind:'services'},
  ...services.map(service=>({slug:`services/${service.slug}`,title:`${service.name} in Olathe, KS | Deer Creek Plumbing`,description:service.summary,heading:service.name,kind:'service' as const})),
  {slug:'service-area',title:'Olathe and Kansas City Service Area | Deer Creek Plumbing',description:'Check a town or ZIP against Deer Creek Plumbing’s published service information. Contact the office to confirm coverage and availability for your address.',heading:'Around the neighborhood.',kind:'area'},
  {slug:'reviews',title:'Customer Reviews | Deer Creek Plumbing, Olathe',description:'Read summaries of public Deer Creek Plumbing reviews and recommendations, with links to the full Google and Facebook feedback.',heading:'Good words. Real neighbors.',kind:'reviews'},
  {slug:'about',title:'About Deer Creek Plumbing | Family Owned in Olathe',description:'Get to know Deer Creek Plumbing, a family and locally owned plumbing business serving the Kansas City metro since 2017.',heading:'Local people. Good work.',kind:'about'},
  {slug:'schedule',title:'Try a Service Request | Deer Creek Plumbing Concept',description:'Try the accessible demo service request form with preferred contact method, scheduling preferences and optional visit notes. Nothing is sent or booked.',heading:'Let’s plan your visit.',kind:'schedule'},
  {slug:'accessibility',title:'Accessibility | Deer Creek Plumbing Website Concept',description:'Learn about this concept’s WCAG 2.2 AA accessibility target, keyboard controls, reading options, reduced motion and known testing limitations.',heading:'Built for more people.',kind:'accessibility'},
]
export const findPage = (slug: string) => pages.find(page=>page.slug===slug)
