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
  { id: 'design-04', number: '04', name: 'Design in progress', status: 'coming-soon' },
  { id: 'design-05', number: '05', name: 'Design in progress', status: 'coming-soon' },
]

export const roofingOffer = 'Free website valued at $5000 with 1 year commitment to managed automation'
export const roofingContactEmail = 'bella@wallaceshift.com'

export function roofingDemoHref(design: RoofingDesign, hostname: string): string {
  return (hostname === 'roofers.wallaceshift.com'
    ? design.productionPath
    : design.localPath) ?? '#collection'
}
