/**
 * The aerial photo behind the outlines.
 *
 * It is a backdrop only. Nothing is traced or measured from it: the
 * outlines come from open footprint data (footprints.ts) and the pitch
 * from the homeowner. Every provider here returns a plain Web-Mercator
 * image for a centre and zoom we choose, so the browser can place the
 * outlines on it (see src/demos/roofers/roof/geo.ts).
 *
 * The image URL goes to the browser and is loaded straight from the
 * provider, so it is never stored, proxied or re-served by us, and the
 * homeowner never draws on it: both Mapbox's and Google's terms forbid
 * deriving outlines from their imagery.
 *
 *   ROOF_IMAGERY          "mapbox", "naip" or "none". Unset: Mapbox when a
 *                         token is present, otherwise NAIP.
 *   MAPBOX_ACCESS_TOKEN   A public (pk.) token with the styles:tiles scope,
 *                         URL-restricted to the site's origins. It is meant
 *                         to be seen by browsers; the restriction is what
 *                         protects it.
 *
 * Google Static Maps is deliberately absent: its terms bar using Google
 * imagery "with or near a non-Google map", and open footprints drawn on
 * top would put us on the wrong side of that line.
 */

import type { Imagery, LatLng, MapFrame } from '../../../src/demos/roofers/roof/types.js'
import { localMeters } from './polygon.js'

/** Logical frame size; providers are asked for 2× pixels. */
export const FRAME_SIZE = 640

/** Ground width the frame shows, metres: the house fills about 40% of it. */
const MIN_VIEW_M = 32
const MAX_VIEW_M = 110
const HOUSE_SHARE = 0.42
/** With several candidates, they fill most of the view, clear of the edges. */
const ALL_SHARE = 0.8

const EQUATOR_M_PER_PX = 156_543.033_92

export interface ImageryProvider {
  id: string
  /** Highest 256-tile zoom with useful imagery over US homes. */
  maxZoom: number
  /** Whether the API takes fractional zooms. */
  fractionalZoom: boolean
  image(frame: MapFrame): Imagery
}

/**
 * Centre on what the homeowner needs to see plus the address point: the
 * likely home, filling a comfortable share of the view, or (when we can't
 * tell which building is theirs) every candidate, filling most of it.
 *
 * Centre and zoom are rounded to what the providers accept (Mapbox keeps
 * two decimals of zoom), so the photo and the outlines drawn from these
 * same numbers line up exactly.
 */
export function frameFor(
  point: LatLng,
  fit: { points: LatLng[]; share: 'home' | 'all' } | null,
  provider: Pick<ImageryProvider, 'maxZoom' | 'fractionalZoom'> | null,
): MapFrame {
  const plane = localMeters(point)
  const xy = [[0, 0] as [number, number], ...(fit?.points ?? []).map(plane.to)]
  const xs = xy.map(([x]) => x)
  const ys = xy.map(([, y]) => y)
  const extent = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys))
  const share = fit?.share === 'all' ? ALL_SHARE : HOUSE_SHARE
  const view = Math.min(MAX_VIEW_M, Math.max(MIN_VIEW_M, extent / share))
  const center = plane.from([(Math.max(...xs) + Math.min(...xs)) / 2, (Math.max(...ys) + Math.min(...ys)) / 2])

  const groundPerPx = view / FRAME_SIZE
  let zoom = Math.log2((EQUATOR_M_PER_PX * Math.cos((center.lat * Math.PI) / 180)) / groundPerPx)
  if (provider) {
    zoom = Math.min(zoom, provider.maxZoom)
    if (!provider.fractionalZoom) zoom = Math.floor(zoom)
  }
  return {
    width: FRAME_SIZE,
    height: FRAME_SIZE,
    center: { lat: Math.round(center.lat * 1e6) / 1e6, lng: Math.round(center.lng * 1e6) / 1e6 },
    // Down, never up, so the view never ends up tighter than what it must show.
    zoom: Math.floor(zoom * 100) / 100,
  }
}

/**
 * Mapbox Static Images, satellite style. Its logo and credits are printed
 * into the image's bottom corners and must stay visible; the page keeps
 * its own marks out of that strip (see RoofStage). Mapbox counts zoom in
 * 512-pixel tiles, one level below the 256-pixel zoom the frame uses.
 */
function mapbox(token: string): ImageryProvider {
  return {
    id: 'mapbox',
    maxZoom: 21,
    fractionalZoom: true,
    image(frame) {
      const { lng, lat } = frame.center
      const position = `${lng.toFixed(6)},${lat.toFixed(6)},${(frame.zoom - 1).toFixed(2)},0,0`
      const params = new URLSearchParams({ access_token: token, attribution: 'true', logo: 'true' })
      return {
        src: `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/${position}/${frame.width}x${frame.height}@2x?${params}`,
        provider: 'mapbox',
        // The imagery vendor's own credit is printed in the photo itself.
        credits: [
          { text: '© Mapbox', href: 'https://www.mapbox.com/about/maps/' },
          { text: '© OpenStreetMap', href: 'https://www.openstreetmap.org/about/' },
          { text: 'Improve this map', href: 'https://apps.mapbox.com/feedback/' },
        ],
      }
    },
  }
}

const EARTH_RADIUS = 6_378_137

/**
 * USDA NAIP orthophotos from the USGS National Map: public domain and
 * keyless. Coarser than commercial imagery (60 cm, 30 cm in newer
 * states), so the view stops zooming before it turns to mush.
 */
const naip: ImageryProvider = {
  id: 'naip',
  maxZoom: 19.4,
  fractionalZoom: true,
  image(frame) {
    const x = (EARTH_RADIUS * frame.center.lng * Math.PI) / 180
    const y = EARTH_RADIUS * Math.log(Math.tan(Math.PI / 4 + (frame.center.lat * Math.PI) / 360))
    const metersPerPx = EQUATOR_M_PER_PX / 2 ** frame.zoom
    const halfW = (frame.width / 2) * metersPerPx
    const halfH = (frame.height / 2) * metersPerPx
    const params = new URLSearchParams({
      bbox: [x - halfW, y - halfH, x + halfW, y + halfH].map((v) => v.toFixed(2)).join(','),
      bboxSR: '3857',
      imageSR: '3857',
      size: `${frame.width * 2},${frame.height * 2}`,
      format: 'jpg',
      f: 'image',
    })
    return {
      src: `https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer/exportImage?${params}`,
      provider: 'naip',
      // USDA asks to be credited by name; USGS serves the copy we use.
      credits: [
        { text: 'Imagery: NAIP, USDA FPAC Business Center, Geospatial Enterprise Operations' },
        { text: 'via USGS The National Map', href: 'https://www.usgs.gov/programs/national-geospatial-program/national-map' },
      ],
    }
  },
}

export function imageryFromEnv(): ImageryProvider | null {
  const token = process.env.MAPBOX_ACCESS_TOKEN?.trim()
  const choice = process.env.ROOF_IMAGERY?.trim() || (token ? 'mapbox' : 'naip')
  if (choice === 'mapbox') return token ? mapbox(token) : null
  if (choice === 'naip') return naip
  return null
}
