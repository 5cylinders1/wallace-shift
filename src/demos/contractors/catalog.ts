/** Individual demos in the contractor collection. Preview media is public;
 * interactive routes continue through the existing demo-access agreement. */
export type TradeCategoryId = 'roofing' | 'cabinetry' | 'pools' | 'foundation' | 'business'

export interface TradeDemo {
  id: string
  category: TradeCategoryId
  trade: string
  name: string
  featured?: boolean
  summary: string
  features: string[]
  thumbnail: string
  thumbnailAlt: string
  video: string
  captions: string
  durationSeconds: number
  productionPath: string
  localPath: string
  accessKey: string
  disclosure: string
}

export const categories: { id: TradeCategoryId; name: string; description: string }[] = [
  { id: 'roofing', name: 'Roofing', description: 'Six approaches to explaining a roof project, from a first estimate to a material study.' },
  { id: 'cabinetry', name: 'Kitchens & cabinetry', description: 'Two ways to bring a room, its materials and the planning conversation into focus.' },
  { id: 'pools', name: 'Pools & outdoor living', description: 'From an empty backyard to a pool plan worth discussing.' },
  { id: 'foundation', name: 'Foundation repair', description: 'Make an unseen problem easier to understand before the inspection.' },
  { id: 'business', name: 'Business systems', description: 'The team’s side of the work: sample customer records, follow-ups and inspections.' },
]

const preview = (id: string) => ({
  thumbnail: `/media/demo-previews/${id}.jpg`,
  video: `/media/demo-previews/${id}.mp4`,
  captions: `/media/demo-previews/${id}.vtt`,
  durationSeconds: 36,
})
const roofingDisclosure = 'Fictional demo brand. Estimator figures are illustrative planning ranges, not a quote.'

export const trades: TradeDemo[] = [
  {
    id: 'northvane', category: 'roofing', trade: 'Roofing', name: 'Northvane Roofing',
    summary: 'An architectural roof story leads into an estimator that turns roof size, material and project details into an illustrative planning range.',
    features: ['Interactive roof transformation', 'Roof estimator'],
    ...preview('northvane'), thumbnailAlt: 'Northvane Roofing: an architectural house and interactive roof estimator',
    productionPath: '/northvane', localPath: '/demos/roofers/', accessKey: 'roofers', disclosure: roofingDisclosure,
  },
  {
    id: 'alder-stone', category: 'roofing', trade: 'Roofing', name: 'Alder & Stone',
    summary: 'A cinematic roof transformation sets the scene, with project planning, process and insurance guidance to support the next conversation.',
    features: ['Film-led roof transformation', 'Project planning and homeowner guides'],
    ...preview('alder-stone'), thumbnailAlt: 'Alder & Stone: a stone estate and cinematic roof transformation',
    productionPath: '/alder-stone', localPath: '/demos/roofers-2/', accessKey: 'roofers-2', disclosure: roofingDisclosure,
  },
  {
    id: 'contour', category: 'roofing', trade: 'Roofing', name: 'Contour Roofing',
    summary: 'An animated 3D survey introduces the roof, then an interactive estimator makes the project assumptions and planning range visible.',
    features: ['Animated 3D roof survey', 'Interactive project estimate'],
    ...preview('contour'), thumbnailAlt: 'Contour Roofing: an animated roof survey and project estimate',
    productionPath: '/contour', localPath: '/demos/roofers-3/', accessKey: 'roofers-3', disclosure: roofingDisclosure,
  },
  {
    id: 'halcyon', category: 'roofing', trade: 'Roofing', name: 'Halcyon Roofworks',
    summary: 'A cinematic estate tour leads to a roof photo study, material choices and planning prices, with a concept client ledger alongside the homeowner experience.',
    features: ['Concept drone film', 'Photo visualizer and prepared material studies'],
    ...preview('halcyon'), thumbnailAlt: 'Halcyon Roofworks: an estate roof and material preview studio',
    productionPath: '/halcyon', localPath: '/demos/roofers-4/', accessKey: 'roofers-4',
    disclosure: 'Fictional demo brand. Prepared visualizer studies and illustrative prices; the client ledger is a concept preview.',
  },
  {
    id: 'velar', category: 'roofing', trade: 'Roofing', name: 'Velar Roof Atelier',
    summary: 'Compare prepared roof finishes against the same residence, explore planning prices, and see an interactive sample homeowner portal.',
    features: ['Photo design studio with before-and-after comparison', 'Sample homeowner portal'],
    ...preview('velar'), thumbnailAlt: 'Velar Roof Atelier: a luxury residence in the roof photo design studio',
    productionPath: '/velar', localPath: '/demos/roofers-5/', accessKey: 'roofers-5',
    disclosure: 'Fictional demo brand. Prepared roof studies and illustrative planning prices. Portal records are samples.',
  },
  {
    id: 'stratum', category: 'roofing', trade: 'Roofing', name: 'Stratum Roofing Co.',
    summary: 'One live 3D house connects a storm, roof anatomy and a new roof build. Its roof studio lets homeowners explore materials, dimensions and planning prices.',
    features: ['Real-time 3D roof and layer-by-layer anatomy', 'Roof studio with dimensions and planning prices'],
    ...preview('stratum'), thumbnailAlt: 'Stratum Roofing: a live 3D farmhouse with its roof layers exposed',
    productionPath: '/stratum', localPath: '/demos/roofers-6/', accessKey: 'roofers-6', disclosure: roofingDisclosure,
  },
  {
    id: 'tambour', category: 'cabinetry', trade: 'Kitchens & cabinetry', name: 'Tambour',
    summary: 'A kitchen develops from blueprint to finished room as you scroll. Material samples and planning prices carry the idea into a consultation request.',
    features: ['Blueprint-to-finished-kitchen story', 'Material library and consultation planner'],
    ...preview('tambour'), thumbnailAlt: 'Tambour: a white kitchen with a navy island and brass pendants',
    productionPath: '/tambour', localPath: '/demos/cabinetry/', accessKey: 'cabinetry',
    disclosure: 'Fictional demo brand. Material selections and prices demonstrate a planning conversation.',
  },
  {
    id: 'mitre', category: 'cabinetry', trade: 'Kitchens & cabinetry', name: 'Mitre & Rift',
    summary: 'A rendered 3D film builds a rift oak kitchen in an empty room, then shifts the light to evening for a showroom-style walkthrough.',
    features: ['Scroll-controlled 3D kitchen film', 'Day-to-dusk lighting'],
    ...preview('mitre'), thumbnailAlt: 'Mitre & Rift: a rift oak kitchen with a stone waterfall island at dusk',
    productionPath: '/mitre', localPath: '/demos/cabinetry-2/', accessKey: 'cabinetry-2',
    disclosure: 'Fictional demo brand. The kitchen build is a rendered concept film.',
  },
  {
    id: 'stillwater', category: 'pools', trade: 'Pools & outdoor living', name: 'Stillwater Pool Co.', featured: true,
    summary: 'A backyard pool takes shape from excavation to water. Explore pool styles and gather project ideas in a consultation planner.',
    features: ['Scroll-controlled pool construction', 'Pool style selector and consultation planner'],
    ...preview('stillwater'), thumbnailAlt: 'Stillwater Pool Co.: a completed backyard pool and landscaped terrace',
    productionPath: '/stillwater', localPath: '/demos/pools/', accessKey: 'pools',
    disclosure: 'Fictional demo brand. Pool construction and project details are illustrative.',
  },
  {
    id: 'datum', category: 'foundation', trade: 'Foundation repair', name: 'Datum',
    summary: 'A 3D cutaway reveals the house, basement and soil through a Kansas City year. Explore symptoms and the repair approaches associated with them.',
    features: ['Interactive house-and-soil cutaway', 'Crack decoder and sample inspection report'],
    ...preview('datum'), thumbnailAlt: 'Datum: a 3D section through a ranch house, basement and soil',
    productionPath: '/datum', localPath: '/demos/foundation/', accessKey: 'foundation',
    disclosure: 'Fictional demo brand. Soil behavior, symptoms and inspection records are illustrative.',
  },
  {
    id: 'roofing-crm', category: 'business', trade: 'Business systems', name: 'Roofing CRM workspace',
    summary: 'Move through sample weather, customer records and a follow-up worklist, then see how a property can progress toward a sample inspection.',
    features: ['Sample storm map and customer records', 'Follow-up worklist and inspection workflow'],
    ...preview('roofing-crm'), thumbnailAlt: 'Roofing CRM workspace: sample weather, properties and inspection follow-ups',
    productionPath: '/roofing-dashboard', localPath: '/roofing-dashboard/', accessKey: 'roofers-dashboard',
    disclosure: 'Fictional weather, properties and customer records. Nothing is sent. Live integrations require implementation.',
  },
]

export const nextTrades = ['HVAC', 'Solar', 'Remodelers', 'Builders', 'General contractors', 'Flooring', 'Painting']

export function demoHref(demo: TradeDemo, hostname: string): string {
  return hostname === 'contractors.wallaceshift.com' ? demo.productionPath : demo.localPath
}

export function accessHref(demo: TradeDemo): string {
  return `/request-demo/?demo=${encodeURIComponent(demo.accessKey)}`
}

export function previewDuration(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}
