/**
 * The contractors collection: one or more working demos per trade. This
 * file is the source of truth for the lander's cards. A trade moves from
 * `nextTrades` into `trades` only when its demo exists.
 */

export interface TradeDemo {
  id: string
  trade: string
  name: string
  /** Shown as a small badge on the newest demos. */
  isNew?: boolean
  /** The demo shown in the lander's hero; the first new demo when none is set. */
  featured?: boolean
  summary: string
  features: string[]
  thumbnail: string
  thumbnailAlt: string
  /** Path on the contractors host, and the local development entry. */
  productionPath: string
  localPath: string
  /** Gate key for /request-demo, when the demo is private. */
  accessKey?: string
  /** A whole collection on its own host, rather than one demo here. */
  collectionUrl?: string
  count?: string
}

export const trades: TradeDemo[] = [
  {
    id: 'foundation',
    trade: 'Foundation repair & waterproofing',
    name: 'Datum',
    isNew: true,
    summary: 'A live 3D section through a house and the ground under it. Homeowners watch clay swell, shrink and freeze through a Kansas City year, then see each repair on the house it fixes.',
    features: ['Live 3D section of the house and soil', 'Crack decoder with a page per symptom', 'Crack log, storm mode and a sample inspection report'],
    thumbnail: '/demos/foundation/preview.jpg',
    thumbnailAlt: 'Datum demo: a 3D cutaway of a ranch house, its basement and the soil layers beneath it',
    productionPath: '/datum',
    localPath: '/demos/foundation/',
    accessKey: 'foundation',
  },
  {
    id: 'roofing',
    trade: 'Roofing',
    name: 'The roofing collection',
    count: 'Six concepts',
    summary: 'Six roofing websites, from drone-film estates to a live 3D roof studio, each with its own estimator or visualizer, plus a roofing CRM preview.',
    features: ['Roof estimators and visualizers', 'Storm and insurance guides', 'Roofing CRM dashboard preview'],
    thumbnail: '/demos/roofers-6/preview.jpg',
    thumbnailAlt: 'Stratum roofing demo: a live 3D house with its roof built up layer by layer',
    productionPath: 'https://roofers.wallaceshift.com/',
    localPath: '/demos/roofers-offer/',
    collectionUrl: 'https://roofers.wallaceshift.com/',
  },
  {
    id: 'cabinetry',
    trade: 'Custom cabinetry, kitchens & baths',
    name: 'Tambour',
    isNew: true,
    featured: false,
    summary: 'Scroll and a kitchen is built in front of you: a blueprint over bare studs becomes a wireframe of the finished room, then rough-in, drywall, cabinetry and the kitchen itself. Real wood and stone samples and planning prices carry into a consultation request.',
    features: ['Scroll-built kitchen, blueprint to finished room', 'Material library with a sample box', 'Planning prices and a stepped consultation request'],
    thumbnail: '/demos/cabinetry/preview.jpg',
    thumbnailAlt: 'Tambour demo: a finished white kitchen with a navy island, a plaster hood and brass lantern pendants',
    productionPath: '/tambour',
    localPath: '/demos/cabinetry/',
    accessKey: 'cabinetry',
  },
  {
    id: 'pools',
    trade: 'Custom pools & outdoor living',
    name: 'Stillwater Pool Co.',
    isNew: true,
    featured: true,
    summary: 'A backyard pool takes shape as you scroll, from the first plan through excavation, shell, finishes and water. Explore pool styles, then bring your ideas into a consultation planner.',
    features: ['Scroll controlled backyard pool build', 'Pool style selector', 'Consultation planner'],
    thumbnail: '/demos/pools/preview.jpg',
    thumbnailAlt: 'Stillwater Pool Co. demo: a finished backyard swimming pool with a sun terrace and landscaped garden',
    productionPath: '/stillwater',
    localPath: '/demos/pools/',
    accessKey: 'pools',
  },
]

/** Trades with demos planned next. Edit freely; nothing else reads this. */
export const nextTrades = ['HVAC', 'Solar', 'Remodelers', 'Builders', 'General contractors', 'Flooring', 'Painting']

export function demoHref(demo: TradeDemo, hostname: string): string {
  if (demo.collectionUrl) return hostname.endsWith('wallaceshift.com') ? demo.collectionUrl : demo.localPath
  return hostname === 'contractors.wallaceshift.com' ? demo.productionPath : demo.localPath
}

export function accessHref(demo: TradeDemo): string {
  return demo.accessKey ? `/request-demo/?demo=${encodeURIComponent(demo.accessKey)}` : '/request-demo/'
}
