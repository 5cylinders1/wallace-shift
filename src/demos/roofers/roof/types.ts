/**
 * The contract between the roof-lookup serverless functions and the roof
 * tool. Type-only, so the functions can import it without bundling any of
 * the front end.
 *
 * The lookup returns building OUTLINES (footprints), not measured roof
 * planes: open footprint data says how much ground the roof covers, and
 * the homeowner supplies the pitch. When a measuring service is connected
 * (`RoofLookup.measure`), /api/roof-measure returns a `MeasuredRoof` for
 * the point the homeowner confirms.
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
  /** Year of the imagery the outline was traced from, when the dataset says. */
  capturedYear?: number | null
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
  /** Nearest first. */
  buildings: FootprintBuilding[]
  /**
   * The building we're confident is the house (the address point is on a
   * building and in or right beside this outline), or null when the
   * homeowner should pick it themselves.
   */
  home: string | null
  frame: MapFrame
  /** Null when no imagery provider is configured: outlines draw on a plan grid. */
  imagery: Imagery | null
  /** Address and outline data credits, in display order. */
  credits: Credit[]
  /**
   * Set when a measuring service is connected. 'auto': the page measures as
   * soon as it has a point on a roof. 'confirm': each measurement is costly,
   * so the homeowner confirms the roof first.
   */
  measure: { provider: string; credit: Credit; mode: 'auto' | 'confirm' } | null
}

/** One panel of a solar layout, as the measuring service placed it. */
export interface SolarPanelSpot {
  center: LatLng
  /** Long side running up the roof slope; landscape otherwise. */
  portrait: boolean
  /** Compass direction the roof face under it points: 0 north, 90 east, 180 south. */
  azimuth: number
  /** Tilt of that face, degrees: the panel's run up the slope looks shorter from above. */
  pitch: number
}

/** What a roof could carry in solar, as the measuring service models it. */
export interface SolarPotential {
  /** Most panels that fit. */
  maxPanels: number
  /** The service's model panel. */
  panelWatts: number
  panelHeightM: number
  panelWidthM: number
  /** maxPanels × panelWatts, kW. */
  maxKw: number
  /** DC kWh a year for the largest layout; null when no layout was modelled. */
  yearlyKwh: number | null
  /** Sunniest point on the roof, kWh per kW per year. */
  sunshineHours: number | null
  /** The best panels first, capped for drawing. */
  panels: SolarPanelSpot[]
  /** Layouts of increasing size: the first N panels of `panels` (before the cap). */
  configs: Array<{ panels: number; yearlyKwh: number }>
  /** Panels on faces of 2/12 and steeper, where solar shingles can go. */
  slopedPanels: number
  /** Running DC kWh a year of the first N of those panels, best first. */
  slopedConfigs: Array<{ panels: number; yearlyKwh: number }>
}

/** A roof measured by a licensed service from aerial imagery (and height data where it has it), for one building. */
export interface MeasuredRoof {
  /** Roof surface with the pitch applied, no waste. */
  roofSqFt: number
  /** Ground area under the roof. */
  footprintSqFt: number
  /** Predominant pitch, rise per 12. */
  pitchRise: number
  /** 0 low, 1 moderate, 2 high, 3 extreme; null when not given. */
  complexity: number | null
  confidence: { score: number | null; label: 'High' | 'Medium' | 'Low' | null }
  /** The point that was measured (the building's centre when the service says). */
  point: LatLng
  /** Roof faces measured, when the service counts them. */
  faces?: number | null
  /** When the imagery behind the measurement was captured. */
  capturedYear?: number | null
  capturedMonth?: number | null
  /** The measured building's extent, for framing and drawing. */
  bounds?: { sw: LatLng; ne: LatLng } | null
  /** Whether the point asked about is on the building measured; false when the service took the nearest one. */
  atPoint?: boolean | null
  /** Set by services that model solar; null when the roof can't carry a useful array. */
  solar?: SolarPotential | null
}

export type MeasureResponse = { ok: true; provider: string; roof: MeasuredRoof; credits: Credit[] } | { ok: false; error: RoofErrorCode }

export type RoofErrorCode =
  | 'not_configured'
  | 'invalid'
  | 'address_not_found'
  | 'no_footprint'
  | 'rate_limited'
  | 'busy'
  | 'upstream'
  /** Measuring: no roof at the pin (it has to sit on the building). */
  | 'roof_not_found'
  /** Measuring: the roof is too large or irregular to measure automatically. */
  | 'unmeasurable'
  /** Measuring: today's or this month's measurement budget is spent, or measuring is paused. */
  | 'limit_reached'
  /**
   * Measuring: the service didn't answer in time. The request reached it and
   * may have been billed, so the page doesn't offer to buy it again.
   */
  | 'timed_out'

export type LookupResponse = RoofLookup | { ok: false; error: RoofErrorCode }
