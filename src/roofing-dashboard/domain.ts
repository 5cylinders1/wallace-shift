import type { DashboardSnapshot, EventFilter, FollowUpStatus, Polygon, PropertyMatch, PropertyRecord, Relationship, Scenario, WeatherEvent, Coordinate } from './types'

const DAY_MS = 86_400_000
const EARTH_RADIUS_MILES = 3958.7613

/** Calendar values follow the contractor's region, never the viewer's computer. */
export function localDateTime(iso: string, timezone: string): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(iso))
  const part = (name: string) => parts.find(value => value.type === name)?.value ?? ''
  return { date: `${part('year')}-${part('month')}-${part('day')}`, time: `${part('hour')}:${part('minute')}` }
}

export function filterEvents(events: WeatherEvent[], filter: EventFilter, scenario: Scenario): WeatherEvent[] {
  const clock = Date.parse(scenario.referenceDate)
  const today = localDateTime(scenario.referenceDate, scenario.timezone).date
  const earliestDay = Date.parse(`${today}T00:00:00Z`) - (filter.days - 1) * DAY_MS
  return events.filter(event => {
    const occurred = Date.parse(event.occurredAt)
    if (!Number.isFinite(occurred) || occurred > clock || (filter.type !== 'all' && event.type !== filter.type)) return false
    const localDay = localDateTime(event.occurredAt, scenario.timezone).date
    return Date.parse(`${localDay}T00:00:00Z`) >= earliestDay
  }).sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt))
}

export function distanceMiles(a: Coordinate, b: Coordinate): number {
  const rad = (degrees: number) => degrees * Math.PI / 180
  const latitude = rad(b[1] - a[1])
  const longitude = rad(b[0] - a[0])
  const h = Math.sin(latitude / 2) ** 2 + Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(longitude / 2) ** 2
  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.sqrt(Math.min(1, Math.max(0, h))))
}

/** Boundary points count as inside. These demo polygons have no holes. */
export function pointInPolygon(point: Coordinate, polygon: Polygon): boolean {
  if (polygon.length < 3) return false
  const [x, y] = point
  let inside = false
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    const [ax, ay] = polygon[previous]
    const [bx, by] = polygon[index]
    const cross = (x - ax) * (by - ay) - (y - ay) * (bx - ax)
    if (Math.abs(cross) <= 1e-10 && x >= Math.min(ax, bx) - 1e-10 && x <= Math.max(ax, bx) + 1e-10 && y >= Math.min(ay, by) - 1e-10 && y <= Math.max(ay, by) + 1e-10) return true
    if ((ay > y) !== (by > y) && x < (bx - ax) * (y - ay) / (by - ay) + ax) inside = !inside
  }
  return inside
}

export function matchProperties(properties: PropertyRecord[], events: WeatherEvent[], radiusMiles: number, serviceArea?: Polygon): PropertyMatch[] {
  const radius = Number.isFinite(radiusMiles) ? Math.max(0, radiusMiles) : 0
  return properties.flatMap(property => {
    if (serviceArea && !pointInPolygon(property.point, serviceArea)) return []
    const matches = events.flatMap(event => {
      // A warning is a forecast/alert, not evidence that damage occurred.
      if (event.evidence === 'warning') return []
      const distance = distanceMiles(property.point, event.point)
      if (event.evidence === 'estimated') {
        if (!event.footprint || !pointInPolygon(property.point, event.footprint)) return []
        return [{ event, distanceMiles: distance, reason: `Inside estimated ${event.type} footprint` }]
      }
      if (distance > radius) return []
      return [{ event, distanceMiles: distance, reason: `${distance.toFixed(1)} mi from ${event.type} report` }]
    })
    return matches.length ? [{ property, matches }] : []
  })
}

export function summarize(snapshot: DashboardSnapshot, matches: PropertyMatch[]): { events: number; customers: number; prospects: number; pending: number; scheduled: number } {
  return {
    events: snapshot.events.length,
    customers: matches.filter(match => match.property.relationship === 'customer').length,
    prospects: matches.filter(match => match.property.relationship === 'prospect').length,
    pending: snapshot.followUps.filter(followUp => followUp.status === 'to-contact' || followUp.status === 'contacted').length,
    scheduled: snapshot.inspections.filter(inspection => inspection.status === 'scheduled').length,
  }
}

export function formatEventTime(iso: string, timezone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone, month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  }).format(new Date(iso))
}

export function statusLabel(status: FollowUpStatus): string {
  const labels: Record<FollowUpStatus, string> = {
    'to-contact': 'To contact', contacted: 'Contacted', scheduled: 'Inspection scheduled',
    completed: 'Completed', 'not-interested': 'Not interested', 'do-not-contact': 'Do not contact',
  }
  return labels[status]
}

export function relationshipLabel(relationship: Relationship): string {
  return { customer: 'Existing customer', lead: 'Website lead', prospect: 'Prospective property' }[relationship]
}
