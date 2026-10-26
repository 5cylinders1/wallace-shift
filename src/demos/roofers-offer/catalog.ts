export type RoofingDesignStatus = 'available' | 'claimed' | 'coming-soon'

export type RoofingDesign = {
  id: string
  number: string
  name: string
  status: RoofingDesignStatus
  description?: string
  character?: string
  features?: string[]
  thumbnail?: string
  thumbnailAlt?: string
  localPath?: string
  productionPath?: string
}

/** Update a design to `claimed` only after its place has been confirmed.
 * This catalog is the source for cards, availability counts and the form.
 * An enquiry never changes availability or reserves a place automatically. */
export const roofingDesigns: RoofingDesign[] = [
  {
    id: 'northvane',
    number: '01',
    name: 'Northvane Roofing',
    status: 'available',
    character: 'Architectural. Confident. Direct.',
    description: 'An interactive roof transformation that turns a complicated project into a clear next step.',
    features: ['Scroll-driven roof story', 'Interactive roof estimator'],
    thumbnail: '/demos/roofers-offer/northvane.webp',
    thumbnailAlt: 'Northvane Roofing website with an interactive architectural roof scene',
    localPath: '/demos/roofers/',
    productionPath: '/northvane',
  },
  {
    id: 'alder-stone',
    number: '02',
    name: 'Alder & Stone',
    status: 'available',
    character: 'Cinematic. Considered. Reassuring.',
    description: 'A film-led experience that helps homeowners understand the work before they request an inspection.',
    features: ['Cinematic roof transformation', 'Process, insurance & financing guides'],
    thumbnail: '/demos/roofers-offer/alder-stone.webp',
    thumbnailAlt: 'Alder and Stone website showing a stone estate home and its new roof',
    localPath: '/demos/roofers-2/',
    productionPath: '/alder-stone',
  },
  {
    id: 'contour',
    number: '03',
    name: 'Contour Roofing',
    status: 'available',
    character: 'Precise. Modern. Transparent.',
    description: 'An estimator-first experience that brings the roof into focus with a 3D survey and a clear project range.',
    features: ['Animated 3D roof survey', 'Interactive project estimate'],
    thumbnail: '/demos/roofers-3/preview.jpg',
    thumbnailAlt: 'Contour Roofing website with a 3D roof scan and interactive project estimator',
    localPath: '/demos/roofers-3/',
    productionPath: '/contour',
  },
  {
    id: 'halcyon',
    number: '04',
    name: 'Halcyon Roofworks',
    status: 'available',
    character: 'Cinematic. Luxurious. Transparent.',
    description: 'A drone-film concept with an AI roof visualizer for a homeowner’s photo, illustrative planning prices and a preview of a proposed client ledger.',
    features: ['Scroll-driven concept drone film', 'AI roof preview with planning prices', 'Client ledger concept preview'],
    thumbnail: '/demos/roofers-4/preview.jpg',
    thumbnailAlt: 'Halcyon Roofworks website with a drone view of a luxury estate and its standing-seam metal roof',
    localPath: '/demos/roofers-4/',
    productionPath: '/halcyon',
  },
  {
    id: 'velar', number: '05', name: 'Velar Roof Atelier', status: 'available',
    character: 'Sculptural. Coastal. Bespoke.',
    description: 'A luxury roofing concept with an AI photo design studio, planning prices and an interactive sample owner portal. It shows how customer choices and project information could fit together.',
    features: ['Cinematic concept estates', 'AI roof design studio & planning prices', 'Sample homeowner portal'],
    thumbnail: '/demos/roofers-5/hero-poster.jpg',
    thumbnailAlt: 'Velar Roof Atelier cinematic luxury roofing concept',
    localPath: '/demos/roofers-5/', productionPath: '/velar',
  },
  {
    id: 'stratum', number: '06', name: 'Stratum Roofing Co.', status: 'available',
    character: 'Interactive. Engineered. Unforgettable.',
    description: 'One live 3D home carries the whole site: watch a storm hit the roof, take it apart layer by layer, see a new roof built and design your own with real measurements.',
    features: ['Real-time 3D roof, storm to ridge cap', 'Layer-by-layer roof anatomy', 'Roof studio with live measurements & planning prices'],
    thumbnail: '/demos/roofers-6/preview.jpg',
    thumbnailAlt: 'Stratum Roofing Co. website with a live 3D farmhouse model at dusk',
    localPath: '/demos/roofers-6/', productionPath: '/stratum',
  },
]

export const roofingOffer = 'Free Motion website with purchase of a roofing CRM plan'
export const roofingMonthlyMinimum = 750
export const roofingCommitmentMonths = 12
export const roofingContactEmail = 'bella@wallaceshift.com'

export function roofingDemoHref(design: RoofingDesign, hostname: string): string {
  return (hostname === 'roofers.wallaceshift.com'
    ? design.productionPath
    : design.localPath) ?? '#collection'
}
