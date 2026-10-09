/**
 * The roof-data adapter the endpoints talk to.
 *
 * `open-data` (the default) composes three swappable parts: an address
 * geocoder, open building-outline datasets, and an optional aerial photo.
 * It returns outlines, not measured roofs; the page asks the homeowner for
 * the pitch. A paid measurement service can replace it by implementing
 * the same two methods and filling `measuredRoof` in the lookup, with no
 * change to the endpoints or the page.
 *
 *   ROOF_PROVIDER  Default "open-data".
 */

import type { AddressSuggestion, Credit, LatLng, RoofLookup } from '../../../src/demos/roofers/roof/types.js'
import { footprintSourcesFromEnv, type FootprintSource } from './footprints.js'
import { geocoderFromEnv, parseBias, type Geocoder } from './geocoder.js'
import { RoofError } from './http.js'
import { frameFor, imageryFromEnv, type ImageryProvider } from './imagery.js'
import { measureBuildings } from './measure.js'

export type LookupTarget = { kind: 'suggestion'; id: string } | { kind: 'address'; address: string }

export interface RoofDataProvider {
  suggest(text: string): Promise<{ suggestions: AddressSuggestion[]; credits: Credit[] }>
  lookup(target: LookupTarget): Promise<RoofLookup>
}

/** How far from the address point to look, metres. A street-level point can sit mid-road. */
const RADIUS_M = { near: 45, street: 70 }

export function openDataProvider(geocoder: Geocoder, sources: FootprintSource[], imagery: ImageryProvider | null, bias: LatLng | null): RoofDataProvider {
  return {
    suggest: (text) => geocoder.suggest(text, bias),

    async lookup(target) {
      const place = target.kind === 'suggestion' ? await geocoder.resolve(target.id) : await geocoder.search(target.address, bias)
      if (!place) throw new RoofError(target.kind === 'suggestion' ? 'invalid' : 'address_not_found')

      const radius = place.precision === 'rooftop' || place.precision === 'parcel' ? RADIUS_M.near : RADIUS_M.street
      let failure: RoofError | null = null
      for (const source of sources) {
        let raw
        try {
          raw = await source.near(place.location, radius)
        } catch (error) {
          // One dataset being down shouldn't end the lookup while another can answer.
          failure = error instanceof RoofError ? error : new RoofError('upstream', String(error))
          continue
        }
        const buildings = measureBuildings(raw, place.location, radius)
        if (!buildings.length) continue

        const frame = frameFor(place.location, buildings[0].ring, imagery)
        return {
          ok: true,
          source: source.id,
          address: place.address,
          location: place.location,
          precision: place.precision,
          buildings,
          frame,
          imagery: imagery ? imagery.image(frame) : null,
          credits: [...place.credits, source.credit],
          measuredRoof: null,
        }
      }
      throw failure ?? new RoofError('no_footprint')
    },
  }
}

/** Null until the provider's keys are set; the endpoints then answer `not_configured`. */
export function roofProviderFromEnv(): RoofDataProvider | null {
  const id = process.env.ROOF_PROVIDER?.trim() || 'open-data'
  if (id !== 'open-data') return null
  const geocoder = geocoderFromEnv()
  const sources = footprintSourcesFromEnv()
  if (!geocoder || !sources.length) return null
  return openDataProvider(geocoder, sources, imageryFromEnv(), parseBias(process.env.ROOF_SEARCH_BIAS))
}
