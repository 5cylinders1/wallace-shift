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
 *                         token is present, otherwise NAIP. Google's photo
 *                         is used with Google Solar measuring and only then
 *                         (see googleImageryFromEnv), so its rules about
 *                         what may be drawn on it never touch the other modes.
 *   MAPBOX_ACCESS_TOKEN   A public (pk.) token with the styles:tiles scope,
 *                         URL-restricted to the site's origins. It is meant
 *                         to be seen by browsers; the restriction is what
 *                         protects it.
 *   GOOGLE_MAPS_STATIC_KEY     A browser key restricted to the Maps Static
 *                              API and to the site's origins. It is in every
 *                              image URL, so it must never be the Solar key.
 *   GOOGLE_MAPS_STATIC_SECRET  The project's URL-signing secret. Server-side
 *                              only: each URL is signed here, so Google can
 *                              refuse unsigned requests made with the key.
 *                              Required except on a developer's machine.
 *
 * Google's terms bar using its services "with or near a non-Google map"
 * (Maps Platform ToS 3.2.3(e)), so wherever Google Solar data is shown the
 * photo is Google's too, and never Mapbox's. On a Google photo the page
 * hides the open-data outlines and draws only Google's own answer (the
 * measured roof's box and panel layout) and the homeowner's pin; the image
 * itself is never traced.
 */

import { createHmac } from 'node:crypto'
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
  /** The least ground to show, e.g. wider when there's no outline to frame. */
  minViewM = MIN_VIEW_M,
): MapFrame {
  const plane = localMeters(point)
  const xy = [[0, 0] as [number, number], ...(fit?.points ?? []).map(plane.to)]
  const xs = xy.map(([x]) => x)
  const ys = xy.map(([, y]) => y)
  const extent = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys))
  const share = fit?.share === 'all' ? ALL_SHARE : HOUSE_SHARE
  const view = Math.min(MAX_VIEW_M, Math.max(minViewM, extent / share))
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

/**
 * Google's URL signature: HMAC-SHA1 of the path and query, keyed with the
 * project's base64url signing secret, appended as `signature`.
 */
export function signGoogleUrl(pathAndQuery: string, secret: string): string {
  const key = Buffer.from(secret.replace(/-/g, '+').replace(/_/g, '/'), 'base64')
  const signature = createHmac('sha1', key).update(pathAndQuery).digest('base64').replace(/\+/g, '-').replace(/\//g, '_')
  return `${pathAndQuery}&signature=${signature}`
}

/**
 * Google Maps Static API, satellite. Whole zooms only, and 640 × 640 at 2×
 * is the largest standard image; the frame model is the same 256-pixel
 * Web Mercator grid, so outlines and panels land where Google draws the
 * roof. Its logo and data credit are printed along the bottom and must stay
 * visible, like Mapbox's (RoofStage keeps its marks out of that strip).
 */
function google(key: string, secret: string | null): ImageryProvider {
  return {
    id: 'google',
    maxZoom: 20,
    fractionalZoom: false,
    image(frame) {
      const params = new URLSearchParams({
        center: `${frame.center.lat.toFixed(6)},${frame.center.lng.toFixed(6)}`,
        zoom: String(Math.round(frame.zoom)),
        size: `${frame.width}x${frame.height}`,
        scale: '2',
        maptype: 'satellite',
        format: 'jpg',
        key,
      })
      const path = `/maps/api/staticmap?${params}`
      return {
        src: `https://maps.googleapis.com${secret ? signGoogleUrl(path, secret) : path}`,
        provider: 'google',
        // Google prints its own logo and imagery credit into the photo.
        credits: [],
      }
    },
  }
}

/**
 * Google's satellite photo, or null without its browser key. Unsigned URLs
 * would let anyone reuse the public key for any map, so a deployment without
 * the signing secret shows no photo (and says why) rather than unsigned ones.
 */
export function googleImageryFromEnv(): ImageryProvider | null {
  const key = process.env.GOOGLE_MAPS_STATIC_KEY?.trim()
  if (!key) return null
  const secret = process.env.GOOGLE_MAPS_STATIC_SECRET?.trim() || null
  const deployed = process.env.VERCEL_ENV === 'production' || process.env.VERCEL_ENV === 'preview'
  if (!secret && (deployed || process.env.ROOF_MEASURE_UNMETERED !== '1')) {
    console.error('[roof-lookup] no Google photo: GOOGLE_MAPS_STATIC_KEY is set without GOOGLE_MAPS_STATIC_SECRET, so its URLs would be unsigned.')
    return null
  }
  return google(key, secret)
}

export function imageryFromEnv(): ImageryProvider | null {
  const token = process.env.MAPBOX_ACCESS_TOKEN?.trim()
  const choice = process.env.ROOF_IMAGERY?.trim() || (token ? 'mapbox' : 'naip')
  if (choice === 'mapbox') return token ? mapbox(token) : null
  if (choice === 'naip') return naip
  return null
}
