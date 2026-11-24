/**
 * Everything the LP Construction concept says about the business. Sources and
 * gaps: docs/demos/lp-construction.md; open questions with their status:
 * lp-source/owner-intake.md. A `null` means unanswered, and its UI stays off.
 */
import type { Language } from './request/types'
import { EDGE_ZIPS, INSIDE_ZIPS } from './serviceAreaZips'

export const BASE = '/demo/lp-construction'
/** The concept lives on wallaceshift.com; on his own domain, change ORIGIN and BASE. */
export const ORIGIN = 'https://wallaceshift.com'

export const business = {
  name: 'LP Construction',
  /** Instagram bio. */
  tagline: 'Finish Trim Specialists',
  phoneDisplay: '(913) 717-2787',
  phoneE164: '+19137172787',
  /** He wants texts (intake #16); whether this number takes them is unconfirmed. */
  textsEnabled: true,
  city: 'Kansas City, MO',
  instagram: 'https://www.instagram.com/lp_construction913/',
  /** His own bio wording. No license number or insurer yet (intake #15). */
  licensedClaim: 'Licensed & insured',
  /** Smallest job worth the trip (intake #5). */
  minimumJob: 500,
  /** Intake #10, and Angi. */
  freeEstimates: true,
  noTripCharge: true,
  /** Angi "Se habla español"; he answers Spanish requests himself (intake #17). */
  spanish: true,
  /** He does all finishing himself (intake #9). */
  paintsOwnWork: true,
  /** Angi. */
  paymentAccepted: 'Credit card',
  legalName: null as string | null, // intake #14
  yearsInBusiness: null as number | null, // intake #14
  email: null as string | null, // intake #16
}

export const phoneHref = `tel:${business.phoneE164}`
export const smsHref = (body = '') => `sms:${business.phoneE164}${body ? `?body=${encodeURIComponent(body)}` : ''}`

export type ServiceId = 'staircases' | 'wall-paneling' | 'crown-ceilings' | 'trim-doors' | 'built-ins'

export interface ServiceCopy {
  name: string
  short: string
  title: string
  description: string
  headline: string
  intro: string
  includes: string[]
  /** What the owner says moves the price (intake #8), phrased for this service. */
  price: string
}

export interface Service {
  id: ServiceId
  copy: Record<Language, ServiceCopy>
  /** Gallery photo ids, first is the page's lead photo. */
  photos: string[]
}

const priceNote = {
  en: 'The cost of materials and the condition of the area matter most. We look at both at a free estimate visit, and there’s no trip charge.',
  es: 'Lo que más cambia el precio es el costo de los materiales y el estado del área. Revisamos ambos en una visita de presupuesto gratis, y no cobramos la visita.',
}

/** The Spanish is Claude's and awaits the owner's review. */
export const services: Service[] = [
  {
    id: 'staircases',
    photos: ['stair-iron-balusters', 'stair-boxed-paneled', 'stair-curved', 'stair-open-paneled'],
    copy: {
      en: {
        name: 'Staircases & railings',
        short: 'Carpet out, wood treads in. Iron balusters, new rails and newels, and complete stairs for new builds.',
        title: 'Staircase Remodeling & Railings in Kansas City | LP Construction',
        description: 'Carpet-to-hardwood stair remodels, iron balusters, handrails, box newels and new-construction staircases across the Kansas City area. Free estimates.',
        headline: 'A staircase people notice when they walk in.',
        intro: 'The stair is the first thing guests see in most entries. We replace worn carpet with wood treads and painted risers, swap dated spindles for iron balusters, and build new rails, newels and complete staircases for new homes.',
        includes: ['Hardwood treads and painted risers in place of carpet', 'Iron or wood balusters', 'Handrails, box newels and caps', 'Skirt boards and stair trim', 'Complete staircases in new construction'],
        price: priceNote.en,
      },
      es: {
        name: 'Escaleras y barandales',
        short: 'Fuera la alfombra, escalones de madera. Balaustres de hierro, pasamanos y postes nuevos, y escaleras completas para casas nuevas.',
        title: 'Remodelación de escaleras y barandales en Kansas City | LP Construction',
        description: 'Cambio de alfombra a escalones de madera, balaustres de hierro, pasamanos, postes y escaleras para construcción nueva en el área de Kansas City. Presupuestos gratis.',
        headline: 'Una escalera que se nota al entrar.',
        intro: 'En la mayoría de las entradas, la escalera es lo primero que ven las visitas. Cambiamos la alfombra gastada por escalones de madera y contrahuellas pintadas, reemplazamos los balaustres viejos por balaustres de hierro, y construimos pasamanos, postes y escaleras completas para casas nuevas.',
        includes: ['Escalones de madera y contrahuellas pintadas en lugar de alfombra', 'Balaustres de hierro o de madera', 'Pasamanos, postes de arranque y remates', 'Zócalos de escalera y molduras', 'Escaleras completas en construcción nueva'],
        price: priceNote.es,
      },
    },
  },
  {
    id: 'wall-paneling',
    photos: ['panels-diagonal', 'stair-wall-panels', 'stair-open-paneled'],
    copy: {
      en: {
        name: 'Accent walls & paneling',
        short: 'Picture-frame molding, board and batten, wainscoting, slats and geometric panels that give a flat wall depth.',
        title: 'Accent Walls & Wall Paneling in Kansas City | LP Construction',
        description: 'Picture-frame molding, board and batten, wainscoting, slat walls and custom geometric panels, installed and painted across the Kansas City area.',
        headline: 'Give a flat wall something to say.',
        intro: 'A plain wall becomes the focal point of the room. We lay out the panels to fit your wall, outlets and windows, install them, then fill, caulk and paint so the finished wall looks built in, not stuck on.',
        includes: ['Picture-frame molding', 'Board and batten and grid walls', 'Wainscoting with chair rail', 'Vertical slat and fluted walls', 'Custom geometric panel designs'],
        price: priceNote.en,
      },
      es: {
        name: 'Paredes decorativas y paneles',
        short: 'Molduras tipo marco, listones, lambrín, listones verticales y paneles geométricos que le dan profundidad a una pared lisa.',
        title: 'Paredes decorativas y paneles en Kansas City | LP Construction',
        description: 'Molduras tipo marco, listones, lambrín, paredes de listones y paneles geométricos a la medida, instalados y pintados en el área de Kansas City.',
        headline: 'Haga que una pared lisa diga algo.',
        intro: 'Una pared lisa se convierte en el centro del cuarto. Diseñamos los paneles a la medida de su pared, sus contactos y ventanas, los instalamos, y luego resanamos, sellamos y pintamos para que la pared se vea integrada, no pegada.',
        includes: ['Molduras tipo marco', 'Listones (board and batten) y cuadrículas', 'Lambrín con moldura de silla', 'Paredes de listones verticales y acanalados', 'Diseños de paneles geométricos a la medida'],
        price: priceNote.es,
      },
    },
  },
  {
    id: 'crown-ceilings',
    photos: ['ceiling-beams-cross', 'ceiling-tray-grid', 'ceiling-beams-cove-light'],
    copy: {
      en: {
        name: 'Crown molding & ceilings',
        short: 'Crown molding, tray ceiling trim, coffered grids, beams and plank ceilings.',
        title: 'Crown Molding & Coffered Ceilings in Kansas City | LP Construction',
        description: 'Crown molding, tray ceiling trim, coffered ceilings, beams and plank ceilings installed and finished across the Kansas City area.',
        headline: 'Finish the room where the walls meet the ceiling.',
        intro: 'Crown molding finishes a room at the top. For more drama, we trim out tray ceilings, build coffered grids and beams, and run plank ceilings, then finish them to match the room.',
        includes: ['Crown molding', 'Tray ceiling trim', 'Coffered and grid ceilings', 'Ceiling beams', 'Plank and patterned ceilings'],
        price: 'The cost of materials, the condition of the area and, for ceiling work, the ceiling height matter most. We look at all three at a free estimate visit, and there’s no trip charge.',
      },
      es: {
        name: 'Molduras de corona y techos',
        short: 'Molduras de corona, molduras para techos de bandeja, cuadrículas artesonadas, vigas y techos de tablas.',
        title: 'Molduras de corona y techos artesonados en Kansas City | LP Construction',
        description: 'Molduras de corona, techos de bandeja, techos artesonados, vigas y techos de tablas, instalados y terminados en el área de Kansas City.',
        headline: 'Termine el cuarto donde la pared se junta con el techo.',
        intro: 'La moldura de corona le da el toque final a un cuarto. Para algo más llamativo, ponemos molduras en techos de bandeja, construimos cuadrículas artesonadas y vigas, e instalamos techos de tablas, y los terminamos para que combinen con el cuarto.',
        includes: ['Molduras de corona', 'Molduras para techos de bandeja', 'Techos artesonados y en cuadrícula', 'Vigas decorativas', 'Techos de tablas y con diseños'],
        price: 'Lo que más cambia el precio es el costo de los materiales, el estado del área y, en trabajos de techo, la altura del techo. Revisamos todo en una visita de presupuesto gratis, y no cobramos la visita.',
      },
    },
  },
  {
    id: 'trim-doors',
    photos: ['opening-arched'],
    copy: {
      en: {
        name: 'Baseboards, doors & windows',
        short: 'Baseboards, door and window casing, interior doors, cased openings and exterior trim.',
        title: 'Baseboards, Door & Window Trim in Kansas City | LP Construction',
        description: 'Baseboard replacement, door and window casing, interior doors, arched and cased openings and exterior trim across the Kansas City area.',
        headline: 'The trim you see in every room, done right.',
        intro: 'Taller baseboards and wider casing make an ordinary room look finished. We replace baseboards and casing, hang interior doors, trim out cased and arched openings, and repair or replace exterior trim.',
        includes: ['Baseboard replacement', 'Door and window casing', 'Interior doors', 'Cased and arched openings', 'Exterior trim repair and replacement'],
        price: priceNote.en,
      },
      es: {
        name: 'Zócalos, puertas y ventanas',
        short: 'Zócalos, marcos de puertas y ventanas, puertas interiores, vanos con marco y molduras exteriores.',
        title: 'Zócalos y marcos de puertas y ventanas en Kansas City | LP Construction',
        description: 'Cambio de zócalos, marcos de puertas y ventanas, puertas interiores, vanos arqueados y con marco, y molduras exteriores en el área de Kansas City.',
        headline: 'Las molduras que se ven en cada cuarto, bien hechas.',
        intro: 'Zócalos más altos y marcos más anchos hacen que un cuarto común se vea terminado. Cambiamos zócalos y marcos, instalamos puertas interiores, ponemos marcos en vanos rectos y arqueados, y reparamos o reemplazamos molduras exteriores.',
        includes: ['Cambio de zócalos', 'Marcos de puertas y ventanas', 'Puertas interiores', 'Vanos con marco y arqueados', 'Reparación y cambio de molduras exteriores'],
        price: priceNote.es,
      },
    },
  },
  {
    id: 'built-ins',
    photos: ['mantel-stone-built-ins', 'mantel-marble', 'bookcase-built-in', 'mudroom-lockers', 'fireplace-arched-niches'],
    copy: {
      en: {
        name: 'Built-ins & mantels',
        short: 'Bookcases, mudroom lockers, bunk beds, fireplace mantels and surrounds, built to fit.',
        title: 'Custom Built-ins & Fireplace Mantels in Kansas City | LP Construction',
        description: 'Custom bookcases, mudroom lockers, built-in bunk beds, fireplace mantels and surrounds, built to fit across the Kansas City area.',
        headline: 'Storage and focal points, built to fit.',
        intro: 'Built-ins use space that furniture can’t. We build bookcases, mudroom lockers, bunk beds and window seats to fit your room, and fireplace mantels and surrounds that anchor it.',
        includes: ['Bookcases and shelving', 'Mudroom lockers and benches', 'Built-in bunk beds', 'Fireplace mantels and surrounds', 'Arched niches and cabinetry'],
        price: priceNote.en,
      },
      es: {
        name: 'Muebles empotrados y chimeneas',
        short: 'Libreros, casilleros de entrada, literas, repisas y marcos de chimenea, hechos a la medida.',
        title: 'Muebles empotrados y repisas de chimenea en Kansas City | LP Construction',
        description: 'Libreros a la medida, casilleros de entrada, literas empotradas, repisas y marcos de chimenea, hechos a la medida en el área de Kansas City.',
        headline: 'Espacio y puntos focales, hechos a la medida.',
        intro: 'Los muebles empotrados aprovechan espacio que los muebles sueltos no pueden. Construimos libreros, casilleros de entrada, literas y bancas de ventana a la medida de su cuarto, y repisas y marcos de chimenea que lo hacen lucir.',
        includes: ['Libreros y repisas', 'Casilleros y bancas de entrada', 'Literas empotradas', 'Repisas y marcos de chimenea', 'Nichos arqueados y gabinetes'],
        price: priceNote.es,
      },
    },
  },
]

export const findService = (id: string) => services.find(service => service.id === id)

/**
 * Cities on the service-area page, each placed by a representative ZIP in the
 * generated drive-time list. Edge cities say "call or text to confirm".
 */
const cityZips: [city: string, zip: string][] = [
  ['Kansas City, MO', '64105'], ['Kansas City, KS', '66101'], ['North Kansas City', '64116'], ['Riverside', '64150'],
  ['Mission', '66202'], ['Roeland Park', '66205'], ['Merriam', '66203'], ['Gladstone', '64118'], ['Raytown', '64133'],
  ['Shawnee', '66216'], ['Prairie Village', '66208'], ['Lenexa', '66215'], ['Edwardsville', '66111'],
  ['Overland Park', '66212'], ['Leawood', '66206'], ['Independence', '64050'], ['Grandview', '64030'],
  ['Parkville', '64152'], ['Liberty', '64068'], ['Blue Springs', '64014'], ['Kearney', '64060'],
  ["Lee’s Summit", '64063'], ['Grain Valley', '64029'], ['Smithville', '64089'], ['Basehor', '66007'],
  ['Bonner Springs', '66012'], ['Platte City', '64079'], ['Raymore', '64083'], ['Belton', '64012'],
  ['Lansing', '66043'], ['Oak Grove', '64075'], ['De Soto', '66018'], ['Tonganoxie', '66086'], ['Olathe', '66061'],
  ['Excelsior Springs', '64024'], ['Peculiar', '64078'], ['Spring Hill', '66083'], ['Gardner', '66030'],
  ['Leavenworth', '66048'], ['Greenwood', '64034'], ['Lone Jack', '64070'], ['Harrisonville', '64701'],
]
export interface Place { name: string; state: 'MO' | 'KS' }
const places = (zips: readonly string[]): Place[] => cityZips
  .filter(([, zip]) => zips.includes(zip))
  .map(([city, zip]): Place => ({ name: city.replace(/, (?:MO|KS)$/, ''), state: zip.startsWith('64') ? 'MO' : 'KS' }))
  .sort((a, b) => a.name.localeCompare(b.name) || a.state.localeCompare(b.state))
export const areaPlaces = places(INSIDE_ZIPS)
export const edgePlaces = places(EDGE_ZIPS)

export interface GalleryPhoto {
  /** Also the file name below /demos/lp-construction/work/: <id>-640.webp and <id>-full.webp. */
  id: string
  /** Size of the -full file. */
  width: number
  height: number
  alt: Record<Language, string>
  service: ServiceId
  /** The Instagram post it came from. */
  post: string
}

/**
 * Copies of his Instagram photos (intake #12: all his own work; Matthew is
 * getting his OK to use them). Made by scripts/lp-construction/gallery.sh.
 * The first six show on the home page.
 */
export const gallery: GalleryPhoto[] = [
  { id: 'stair-iron-balusters', width: 952, height: 1270, service: 'staircases', post: 'DYc7y6imm16', alt: { en: 'Two-story foyer staircase with stained newel posts and black iron balusters below a balcony landing, in a new home', es: 'Escalera de un recibidor de dos pisos con postes de madera teñida y balaustres de hierro negro bajo un balcón, en una casa nueva' } },
  { id: 'panels-diagonal', width: 980, height: 1224, service: 'wall-paneling', post: 'DKNMGmxua87', alt: { en: 'Bedroom accent wall with a white diagonal panel molding design', es: 'Pared decorativa de una recámara con un diseño de molduras diagonales en blanco' } },
  { id: 'ceiling-beams-cross', width: 918, height: 1224, service: 'crown-ceilings', post: 'DKbF9uCOsbu', alt: { en: 'Tray ceiling with crossed stained wood beams over a dining room', es: 'Techo de bandeja con vigas de madera teñida cruzadas sobre un comedor' } },
  { id: 'opening-arched', width: 918, height: 1224, service: 'trim-doors', post: 'DK0tWbSus2v', alt: { en: 'Arched opening trimmed in white oak, leading to a back hall', es: 'Vano arqueado con marco de roble blanco que da a un pasillo' } },
  { id: 'mantel-marble', width: 980, height: 1226, service: 'built-ins', post: 'DKQtCehOHUf', alt: { en: 'Stained wood fireplace mantel with fluted pilasters around a marble surround', es: 'Repisa de chimenea de madera teñida con pilastras acanaladas alrededor de un marco de mármol' } },
  { id: 'stair-boxed-paneled', width: 574, height: 1018, service: 'staircases', post: 'DSeXVZaDrTz', alt: { en: 'Staircase with new wood treads between paneled walls, before stain and paint', es: 'Escalera con escalones de madera nuevos entre paredes con paneles, antes de teñir y pintar' } },
  { id: 'mantel-stone-built-ins', width: 952, height: 1270, service: 'built-ins', post: 'DYuwaNljkgy', alt: { en: 'Stained wood mantel on a stone fireplace, with built-in cabinets and floating shelves on each side', es: 'Repisa de madera teñida en una chimenea de piedra, con gabinetes empotrados y repisas flotantes a cada lado' } },
  { id: 'stair-curved', width: 980, height: 1224, service: 'staircases', post: 'DKKcx5sutT0', alt: { en: 'Curved staircase with white balusters and a continuous handrail, seen from the floor above during construction', es: 'Escalera curva con balaustres blancos y un pasamanos continuo, vista desde el piso de arriba durante la construcción' } },
  { id: 'ceiling-tray-grid', width: 918, height: 1224, service: 'crown-ceilings', post: 'DK43jfxOEg_', alt: { en: 'Tray ceiling with a grid of panel moldings, installed and ready for paint', es: 'Techo de bandeja con una cuadrícula de molduras, instalada y lista para pintar' } },
  { id: 'stair-open-paneled', width: 1270, height: 952, service: 'staircases', post: 'DK20fEluIM_', alt: { en: 'Open staircase with new treads, a wood handrail and panel moldings along the stair wall, before paint', es: 'Escalera abierta con escalones nuevos, pasamanos de madera y molduras en la pared de la escalera, antes de pintar' } },
  { id: 'bookcase-built-in', width: 574, height: 760, service: 'built-ins', post: 'DYnO8gui75v', alt: { en: 'Painted built-in bookcase and cabinet unit in a walk-in closet', es: 'Librero y gabinete empotrados y pintados en un clóset vestidor' } },
  { id: 'stair-wall-panels', width: 574, height: 1018, service: 'wall-paneling', post: 'DWfWdGxjiHz', alt: { en: 'Stair wall with large picture-frame panels, new treads and a square newel post, before paint', es: 'Pared de escalera con paneles grandes tipo marco, escalones nuevos y un poste cuadrado, antes de pintar' } },
  { id: 'ceiling-beams-cove-light', width: 574, height: 1018, service: 'crown-ceilings', post: 'DY1ERmfuQVw', alt: { en: 'Tray ceiling with stained wood beams and warm cove lighting', es: 'Techo de bandeja con vigas de madera teñida e iluminación indirecta cálida' } },
  { id: 'mudroom-lockers', width: 952, height: 1270, service: 'built-ins', post: 'DQ4q5kzDmgo', alt: { en: 'Mudroom locker unit with cubbies, a bench and a plank back, built and ready for finish', es: 'Mueble de casilleros de entrada con cubículos, banca y respaldo de tablas, construido y listo para el acabado' } },
  { id: 'fireplace-arched-niches', width: 574, height: 428, service: 'built-ins', post: 'DWfX4EZjrsX', alt: { en: 'Fireplace wall with a new mantel surround, arched niches and built-in cabinets, before paint', es: 'Pared de chimenea con un marco nuevo, nichos arqueados y gabinetes empotrados, antes de pintar' } },
]

export type PageKind = 'home' | 'services' | 'service' | 'area' | 'work' | 'request'
export interface PageCopy { title: string; description: string; heading: string }
export interface PageMeta { slug: string; kind: PageKind; service?: ServiceId; copy: Record<Language, PageCopy> }

export const pages: PageMeta[] = [
  {
    slug: '', kind: 'home',
    copy: {
      en: { heading: 'Home', title: 'Trim Carpenter in Kansas City | LP Construction', description: 'Staircases, accent walls, crown molding, baseboards and built-ins across Kansas City, installed and painted by LP Construction. Free estimates.' },
      es: { heading: 'Inicio', title: 'Carpintero de acabados en Kansas City | LP Construction', description: 'Escaleras, paredes decorativas, molduras de corona, zócalos y muebles empotrados en Kansas City, instalados y pintados por LP Construction. Presupuestos gratis.' },
    },
  },
  {
    slug: 'services', kind: 'services',
    copy: {
      en: { heading: 'Services', title: 'Finish Carpentry Services in Kansas City | LP Construction', description: 'Staircases, accent walls, crown molding, baseboards, doors, windows and built-ins from LP Construction, finish trim specialists in Kansas City.' },
      es: { heading: 'Servicios', title: 'Servicios de carpintería de acabados en Kansas City | LP Construction', description: 'Escaleras, paredes decorativas, molduras de corona, zócalos, puertas, ventanas y muebles empotrados de LP Construction, especialistas en acabados en Kansas City.' },
    },
  },
  ...services.map((service): PageMeta => ({
    slug: `services/${service.id}`, kind: 'service', service: service.id,
    copy: {
      en: { heading: service.copy.en.name, title: service.copy.en.title, description: service.copy.en.description },
      es: { heading: service.copy.es.name, title: service.copy.es.title, description: service.copy.es.description },
    },
  })),
  {
    slug: 'service-area', kind: 'area',
    copy: {
      en: { heading: 'Service area', title: 'Service Area: Kansas City Metro, Missouri & Kansas | LP Construction', description: 'LP Construction works within about 45 minutes of downtown Kansas City, MO, on both sides of the state line. Check your ZIP and request a free estimate.' },
      es: { heading: 'Área de servicio', title: 'Área de servicio: Kansas City, Missouri y Kansas | LP Construction', description: 'LP Construction trabaja a unos 45 minutos del centro de Kansas City, MO, en los dos lados de la línea estatal. Revise su código postal y pida un presupuesto gratis.' },
    },
  },
  {
    slug: 'our-work', kind: 'work',
    copy: {
      en: { heading: 'Our work', title: 'Our Work: Stairs, Paneling, Ceilings & Built-ins | LP Construction', description: 'Photos of staircases, wall paneling, coffered ceilings, mantels and built-ins by LP Construction in the Kansas City area.' },
      es: { heading: 'Nuestro trabajo', title: 'Nuestro trabajo: escaleras, paneles, techos y muebles empotrados | LP Construction', description: 'Fotos de escaleras, paneles, techos artesonados, chimeneas y muebles empotrados hechos por LP Construction en el área de Kansas City.' },
    },
  },
  {
    slug: 'request', kind: 'request',
    copy: {
      en: { heading: 'Request an estimate', title: 'Request a Free Estimate | LP Construction, Kansas City', description: 'Tell LP Construction about your stairs, walls or trim and send a photo. Free estimates, no trip charge. Se habla español.' },
      es: { heading: 'Pedir un presupuesto', title: 'Pida un presupuesto gratis | LP Construction, Kansas City', description: 'Cuéntele a LP Construction sobre sus escaleras, paredes o molduras y mande una foto. Presupuestos gratis, sin cargo por la visita.' },
    },
  },
]

export const findPage = (slug: string) => pages.find(page => page.slug === slug)

export const LANGUAGE_PREFIX: Record<Language, string> = { en: '', es: '/es' }
const root = (lang: Language) => BASE + LANGUAGE_PREFIX[lang]

/** A demo-relative path (`/services`, `/request?zip=…`, `/#ideas`) as a site path in `lang`. */
export function href(path = '/', lang: Language = 'en'): string {
  if (path === '/' || path === '') return root(lang)
  if (path.startsWith('/#') || path.startsWith('/?')) return root(lang) + path.slice(1)
  return root(lang) + path
}
/** The page's own path, `slug` below BASE (and below /es for Spanish). */
export const pagePath = (slug: string, lang: Language) => root(lang) + (slug ? `/${slug}` : '')
export const absolute = (slug = '', lang: Language = 'en') => ORIGIN + pagePath(slug, lang)

/** Hero timelapse stages, in scroll order. Frames: scripts/lp-construction/generate.py. */
export const stages = ['before', 'torn', 'built', 'primed', 'finished'] as const
export type StageId = typeof stages[number]
