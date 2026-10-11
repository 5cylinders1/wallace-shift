/**
 * The roof-data adapter the endpoints talk to.
 *
 * `open-data` (the default) composes three swappable parts: an address
 * geocoder, open building-outline datasets, and an optional aerial photo.
 * Without a measuring service it returns outlines, and the page asks the
 * homeowner for the pitch. With one (measurement.ts), outlines are only
 * hints for where the crosshair starts: a lookup with none still returns
 * the photo, so houses missing from the open data can be measured too.
 *
 *   ROOF_PROVIDER  Default "open-data".
 */

import type { AddressSuggestion, Credit, FootprintBuilding, LatLng, LocationPrecision, RoofLookup } from '../../../src/demos/roofers/roof/types.js'
import { footprintSourcesFromEnv, type FootprintSource } from './footprints.js'
import { geocoderFromEnv, parseBias, type Geocoder } from './geocoder.js'
import { RoofError, deadlineIn } from './http.js'
import { frameFor, googleImageryFromEnv, imageryFromEnv, type ImageryProvider } from './imagery.js'
import { measureBuildings } from './measure.js'
import { measurementFromEnv, type MeasurementProvider } from './measurement.js'

export type LookupTarget = { kind: 'suggestion'; id: string } | { kind: 'address'; address: string }

export interface LookupResult {
  lookup: RoofLookup
  /** An earlier source failed, so this answer may not be the best one: cache it briefly. */
  partial: boolean
}

export interface RoofDataProvider {
  suggest(text: string): Promise<{ suggestions: AddressSuggestion[]; credits: Credit[] }>
  lookup(target: LookupTarget): Promise<LookupResult>
}

/** How far from the address point to look, metres. A street-level point can sit mid-road. */
const RADIUS_M = { near: 45, street: 70 }
/** The whole lookup, all outbound calls together; well inside roof-lookup's maxDuration. */
const LOOKUP_BUDGET_MS = 15_000
/** A building-level point this close to an outline is on it (outlines and points are both a little off). */
const AT_POINT_M = 2
/** A building-level point within this of the nearest outline: that outline is taken to be the house. */
const HOME_WITHIN_M = 15
/**
 * With no outline to frame, the photo spans this much ground around the
 * address point, wider the less sure the point is, so the house is in it.
 */
const OPEN_VIEW_M: Record<LocationPrecision, number> = { rooftop: 50, parcel: 60, street: 90, unknown: 90 }

export function openDataProvider(
  geocoder: Geocoder,
  sources: FootprintSource[],
  imagery: ImageryProvider | null,
  bias: LatLng | null,
  measurement: MeasurementProvider | null = null,
): RoofDataProvider {
  return {
    suggest: (text) => geocoder.suggest(text, bias),

    async lookup(target) {
      const deadline = deadlineIn(LOOKUP_BUDGET_MS)
      const place = target.kind === 'suggestion' ? await geocoder.resolve(target.id) : await geocoder.search(target.address, bias, deadline)
      if (!place) throw new RoofError(target.kind === 'suggestion' ? 'invalid' : 'address_not_found')

      // Only a building-level point is trusted to say which outline is the house.
      const onBuilding = place.precision === 'rooftop' || place.precision === 'parcel'
      const radius = onBuilding ? RADIUS_M.near : RADIUS_M.street
      let failure: RoofError | null = null
      let best: { source: FootprintSource; buildings: FootprintBuilding[] } | null = null

      for (const source of sources) {
        let raw
        try {
          raw = await source.near(place.location, radius, deadline)
        } catch (error) {
          // One dataset being down shouldn't end the lookup while another can answer.
          failure = error instanceof RoofError ? error : new RoofError('upstream', String(error))
          if (failure.code === 'busy' && Date.now() >= deadline) break
          continue
        }
        const buildings = measureBuildings(raw, place.location, radius)
        if (!buildings.length) continue
        const atPoint = buildings[0].distanceM <= AT_POINT_M
        if (!best || atPoint) best = { source, buildings }
        // A building-level point with only neighbours around it: a later dataset may have the house.
        if (!onBuilding || atPoint) break
      }
      if (!best) {
        // A measuring service needs a point on the roof, not an open outline,
        // so a house missing from the public data (a new one, say) is still
        // shown: the homeowner puts the crosshair on it. Outlines are only
        // hints in that flow, so a dataset being down doesn't end it either.
        if (measurement) {
          const frame = frameFor(place.location, null, imagery, OPEN_VIEW_M[place.precision])
          return {
            partial: failure !== null,
            lookup: {
              ok: true,
              source: measurement.id,
              address: place.address,
              location: place.location,
              precision: place.precision,
              buildings: [],
              home: null,
              frame,
              imagery: imagery ? imagery.image(frame) : null,
              credits: place.credits,
              measure: { provider: measurement.id, credit: measurement.credit, mode: measurement.mode },
            },
          }
        }
        throw failure ?? new RoofError('no_footprint')
      }

      const { source, buildings } = best
      const home = onBuilding && buildings[0].distanceM <= HOME_WITHIN_M ? buildings[0] : null
      // Not sure which is theirs: show every candidate, so the one they tap is on screen.
      const fit = home ? { points: home.ring, share: 'home' as const } : { points: buildings.flatMap((b) => b.ring), share: 'all' as const }
      const frame = frameFor(place.location, fit, imagery)
      return {
        partial: failure !== null,
        lookup: {
          ok: true,
          source: source.id,
          address: place.address,
          location: place.location,
          precision: place.precision,
          buildings,
          home: home?.id ?? null,
          frame,
          imagery: imagery ? imagery.image(frame) : null,
          credits: [...place.credits, source.credit],
          measure: measurement ? { provider: measurement.id, credit: measurement.credit, mode: measurement.mode } : null,
        },
      }
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
  const measurement = measurementFromEnv()
  // Google's data never sits on another company's map (Maps ToS 3.2.3(e)): its photo or none.
  const imagery = measurement?.id === 'google-solar' ? googleImageryFromEnv() : imageryFromEnv()
  return openDataProvider(geocoder, sources, imagery, parseBias(process.env.ROOF_SEARCH_BIAS), measurement)
}
