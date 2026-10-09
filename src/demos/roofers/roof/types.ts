/**
 * The contract between the roof-lookup serverless functions and the roof
 * tool. Type-only, so the functions can import it without bundling any of
 * the front end.
 *
 * The lookup returns building OUTLINES (footprints), not measured roof
 * planes: open footprint data says how much ground the roof covers, and
 * the homeowner supplies the pitch. A licensed measurement source can be
 * added behind the same shape later (see `measuredRoof`).
 */

export interface LatLng {
  lat: number
  lng: number
}

/** A data credit; linked where the licence asks for a link. */
export interface Credit {
  text: string
  href?: string
}

export interface AddressSuggestion {
  /** Opaque, provider-specific; sent back to /api/roof-lookup as is. */
  id: string
  /** Street line, e.g. "4120 Wornall Rd". */
  primary: string
  /** City, state, ZIP. */
  secondary: string
}

export type SuggestResponse =
  | { ok: true; suggestions: AddressSuggestion[]; credits: Credit[] }
  | { ok: false; error: RoofErrorCode }

export interface RoofAddress {
  formatted: string
  street: string | null
  city: string | null
  state: string | null
  zip: string | null
}

export interface FootprintBuilding {
  id: string
  /** Outline in lat/lng; closed implicitly. */
  ring: LatLng[]
  /** Ground area covered by the outline, sq ft. */
  areaSqFt: number
  /** Metres from the address point to the outline; 0 when inside it. */
  distanceM: number
  /** Corners after light simplification: a hint at roof complexity. */
  corners: number
}

/** A Web-Mercator view: enough to place any lat/lng on screen. */
export interface MapFrame {
  /** Logical size in CSS pixels. */
  width: number
  height: number
  center: LatLng
  /** 256-pixel-tile zoom; fractional zooms are allowed. */
  zoom: number
}

/** The aerial photo for a frame. Context only: nothing is measured from it. */
export interface Imagery {
  /** Rendered at the frame's size; usually served at 2× for sharpness. */
  src: string
  provider: string
  /** Shown beneath the image; never drawn over the provider's own marks. */
  credits: Credit[]
}

export type LocationPrecision = 'rooftop' | 'parcel' | 'street' | 'unknown'

export interface RoofLookup {
  ok: true
  /** Which footprint dataset answered, or 'sample' for the bundled demo. */
  source: string
  address: RoofAddress
  location: LatLng
  precision: LocationPrecision
  /** Nearest first; buildings[0] is the likely home. */
  buildings: FootprintBuilding[]
  frame: MapFrame
  /** Null when no imagery provider is configured: outlines draw on a plan grid. */
  imagery: Imagery | null
  /** Address and outline data credits, in display order. */
  credits: Credit[]
  /** Reserved for a licensed source that measures the roof itself. */
  measuredRoof?: { areaSqFt: number; pitchRise: number; planes: number } | null
}

export type RoofErrorCode =
  | 'not_configured'
  | 'invalid'
  | 'address_not_found'
  | 'no_footprint'
  | 'rate_limited'
  | 'busy'
  | 'upstream'

export type LookupResponse = RoofLookup | { ok: false; error: RoofErrorCode }
