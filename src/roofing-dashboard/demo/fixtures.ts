import type { ConnectionCapability, DashboardSnapshot, PropertyRecord, Relationship, WeatherEvent } from '../types'
import { matchProperties } from '../domain'
import midwestCsv from './sample-customers.csv?raw'
import coastalCsv from './sample-customers-coastal.csv?raw'

export const SAMPLE_SOURCE = 'Illustrative demo data · not a NOAA observation'
export const sampleCustomerCsvByScenario: Record<string, string> = { midwest: midwestCsv, coastal: coastalCsv }

const connections: ConnectionCapability[] = [
  { id: 'weather', title: 'Weather events', state: 'sample', description: 'Synthetic reports, estimated footprints and warnings. No live weather feed is connected.' },
  { id: 'customers', title: 'Customer records', state: 'sample', description: 'Fictional customer records, with a bundled sample CSV to try importing.' },
  { id: 'website', title: 'Website inquiries', state: 'sample', description: 'Sample inquiry details illustrate a future connection to your roofing website.' },
  { id: 'enrichment', title: 'Contact discovery', state: 'optional', description: 'Returns fictional example contacts only. Contact permission remains unknown.' },
]

const midwestEvents: WeatherEvent[] = [
  {
    id: 'midwest-hail-footprint', title: 'Western metro hail footprint', type: 'hail', evidence: 'estimated',
    occurredAt: '2026-10-10T01:20:00Z', source: SAMPLE_SOURCE, magnitude: '1.25–1.75 in · illustrative',
    description: 'An invented modeled hail footprint for exploring nearby properties. Presence in this area does not establish damage.',
    point: [-94.70, 39.01],
    footprint: [[-94.87, 38.91], [-94.73, 38.85], [-94.55, 39.03], [-94.64, 39.13], [-94.85, 39.05], [-94.87, 38.91]],
  },
  {
    id: 'midwest-hail-report', title: 'Example Ridge hail report', type: 'hail', evidence: 'report',
    occurredAt: '2026-10-10T00:42:00Z', source: SAMPLE_SOURCE, magnitude: '1.5 in · illustrative',
    description: 'A synthetic point report. The selected radius is a search area around the report, not a measured hail swath.', point: [-94.70, 39.035],
  },
  {
    id: 'midwest-wind-footprint', title: 'Northern metro wind footprint', type: 'wind', evidence: 'estimated',
    occurredAt: '2026-10-09T23:55:00Z', source: SAMPLE_SOURCE, magnitude: '60–70 mph · illustrative',
    description: 'A synthetic wind footprint for demonstrating customer matching. Roof condition requires an inspection.', point: [-94.63, 39.13],
    footprint: [[-94.89, 39.065], [-94.53, 39.04], [-94.43, 39.18], [-94.79, 39.22], [-94.89, 39.065]],
  },
  {
    id: 'midwest-tornado-report', title: 'Southeastern tornado report', type: 'tornado', evidence: 'report',
    occurredAt: '2026-10-08T22:15:00Z', source: SAMPLE_SOURCE, magnitude: 'Unrated · illustrative',
    description: 'A fictional tornado report point, not an observed track or confirmation of property damage.', point: [-94.53, 38.925],
  },
  {
    id: 'midwest-wind-report', title: 'Example Meadow wind report', type: 'wind', evidence: 'report',
    occurredAt: '2026-10-10T16:40:00Z', source: SAMPLE_SOURCE, magnitude: '62 mph · illustrative',
    description: 'A fictional report used to demonstrate the Today filter and nearby properties.', point: [-94.775, 38.975],
  },
  {
    id: 'midwest-warning', title: 'Eastern metro tornado warning', type: 'tornado', evidence: 'warning',
    occurredAt: '2026-10-10T18:00:00Z', source: SAMPLE_SOURCE, magnitude: null,
    description: 'An illustrative warning area. Warnings are alerts and are excluded from property impact matching.', point: [-94.48, 39.095],
    footprint: [[-94.57, 39.01], [-94.40, 39.03], [-94.40, 39.21], [-94.57, 39.18], [-94.57, 39.01]],
  },
  {
    id: 'midwest-earlier-hail', title: 'Earlier southern hail report', type: 'hail', evidence: 'report',
    occurredAt: '2026-09-22T21:00:00Z', source: SAMPLE_SOURCE, magnitude: '1 in · illustrative',
    description: 'A fictional older report included in the 30-day view only.', point: [-94.71, 38.835],
  },
]

const coastalEvents: WeatherEvent[] = [
  {
    id: 'coastal-hurricane-footprint', title: 'Bay-area hurricane wind footprint', type: 'hurricane', evidence: 'estimated',
    occurredAt: '2026-10-09T11:00:00Z', source: SAMPLE_SOURCE, magnitude: '75–90 mph · illustrative',
    description: 'A wholly fictional hurricane scenario, not a named storm or forecast. Estimated exposure does not confirm damage.', point: [-82.48, 27.95],
    footprint: [[-82.72, 27.79], [-82.48, 27.72], [-82.24, 27.95], [-82.36, 28.12], [-82.60, 28.10], [-82.72, 27.79]],
  },
  {
    id: 'coastal-wind-report', title: 'Example Harbor wind report', type: 'wind', evidence: 'report',
    occurredAt: '2026-10-09T12:10:00Z', source: SAMPLE_SOURCE, magnitude: '78 mph · illustrative',
    description: 'A synthetic wind report point. Search radius indicates proximity, not confirmed wind exposure.', point: [-82.505, 27.95],
  },
  {
    id: 'coastal-tornado-report', title: 'Inland tornado report', type: 'tornado', evidence: 'report',
    occurredAt: '2026-10-09T16:25:00Z', source: SAMPLE_SOURCE, magnitude: 'Unrated · illustrative',
    description: 'An invented tornado point associated with this fictional coastal scenario.', point: [-82.35, 28.05],
  },
  {
    id: 'coastal-warning', title: 'Coastal hurricane warning area', type: 'hurricane', evidence: 'warning',
    occurredAt: '2026-10-10T17:00:00Z', source: SAMPLE_SOURCE, magnitude: null,
    description: 'A synthetic warning area, shown separately from the estimated wind footprint and excluded from property matching.', point: [-82.61, 27.92],
    footprint: [[-82.75, 27.73], [-82.52, 27.73], [-82.51, 28.15], [-82.72, 28.15], [-82.75, 27.73]],
  },
  {
    id: 'coastal-wind-today', title: 'Example Bay wind report', type: 'wind', evidence: 'report',
    occurredAt: '2026-10-10T15:00:00Z', source: SAMPLE_SOURCE, magnitude: '58 mph · illustrative',
    description: 'An invented point report included in the Today view.', point: [-82.39, 27.97],
  },
]

const names = ['Jamie Example', 'Morgan Sample', 'Riley Fiction', 'Avery Demo', 'Casey Example', 'Drew Sample', 'Quinn Fiction', 'Skyler Demo']
const relationships: Relationship[] = ['customer', 'customer', 'lead', 'prospect', 'prospect', 'prospect']

function makeProperties(coastal: boolean): PropertyRecord[] {
  const count = coastal ? 20 : 36
  const columns = coastal ? 5 : 6
  const prefix = coastal ? 'coastal' : 'northvane'
  return Array.from({ length: count }, (_, index) => {
    const number = index + 1
    const relationship = relationships[index % relationships.length]
    const hasContact = relationship !== 'prospect' || number === 4
    const longitude = (coastal ? -82.67 : -94.84) + (index % columns) * (coastal ? 0.092 : 0.078) + (Math.floor(index / columns) % 2) * 0.010
    const latitude = (coastal ? 27.78 : 38.84) + Math.floor(index / columns) * (coastal ? 0.095 : 0.062) + (index % 3) * 0.008
    const property: PropertyRecord = {
      id: `${prefix}-property-${String(number).padStart(2, '0')}`,
      address: `${100 + number} Example ${coastal ? ['Harbor', 'Bay', 'Shore', 'Cove'][Math.floor(index / columns)] : ['Meadow', 'Ridge', 'Oak', 'Cedar', 'Hill', 'Creek'][Math.floor(index / columns)]} Lane`,
      city: coastal ? 'Tampa Bay demo district' : 'Kansas City demo district', postalCode: coastal ? '33601' : '64101',
      point: [Number(longitude.toFixed(4)), Number(latitude.toFixed(4))], relationship,
      contact: hasContact ? {
        name: names[index % names.length], email: `${prefix}.${number}@example.com`,
        phone: `+1 ${coastal ? '813' : '816'}-555-01${String(number).padStart(2, '0')}`,
        source: relationship === 'lead' ? 'Fictional website inquiry' : 'Fictional customer record',
        permission: relationship === 'lead' ? 'project-inquiry' : 'unknown',
      } : null,
      source: relationship === 'prospect' ? 'Synthetic property fixture · not a parcel or ownership record' : relationship === 'lead' ? 'Synthetic website inquiry' : 'Synthetic customer fixture',
      roofAge: relationship === 'prospect' ? null : ['8 years', '12 years', 'Unknown', '5 years'][index % 4],
      doNotContact: number === 6,
      activity: [{ id: `${prefix}-${number}-initial`, at: '2026-10-09T20:00:00Z', text: relationship === 'lead' ? 'Fictional website inquiry received.' : 'Illustrative record added to this demo.' }],
    }
    if (relationship === 'lead') property.lead = {
      concern: index % 2 ? 'Aging roof / inspection' : 'Possible storm damage', preferredMethod: 'Email',
      consentStatement: 'Sample permission: contact me about this roofing project using the details I provided.', submittedAt: '2026-10-09T20:00:00Z',
    }
    // One address outside each service area demonstrates matching boundaries.
    if (number === count) property.point = coastal ? [-82.10, 27.97] : [-94.34, 39.03]
    return property
  })
}

export function createScenarioFixture(scenarioId: string): DashboardSnapshot {
  if (scenarioId !== 'midwest' && scenarioId !== 'coastal') throw new Error('This demo does not include the requested scenario.')
  const coastal = scenarioId === 'coastal'
  const prefix = coastal ? 'coastal' : 'northvane'
  const events = structuredClone(coastal ? coastalEvents : midwestEvents)
  const properties = makeProperties(coastal)
  const id = (number: number) => `${prefix}-property-${String(number).padStart(2, '0')}`
  const eventIds = (number: number) => matchProperties([properties[number - 1]], events, 3)[0]?.matches.map(match => match.event.id) ?? []
  return {
    events, properties,
    followUps: [
      { id: `${prefix}-follow-1`, propertyId: id(1), eventIds: eventIds(1), status: 'to-contact', note: 'Sample task: review the property history before contacting.' },
      { id: `${prefix}-follow-2`, propertyId: id(2), eventIds: eventIds(2), status: 'contacted', note: 'Fictional conversation logged. Awaiting a preferred inspection time.' },
      { id: `${prefix}-follow-3`, propertyId: id(3), eventIds: eventIds(3), status: 'scheduled', note: 'Sample appointment for a free roof inspection.' },
      { id: `${prefix}-follow-4`, propertyId: id(4), eventIds: eventIds(4), status: 'completed', note: 'Fictional inspection completed; no damage conclusion is supplied.' },
      { id: `${prefix}-follow-6`, propertyId: id(6), eventIds: eventIds(6), status: 'do-not-contact', note: 'Sample homeowner preference: do not contact.' },
      { id: `${prefix}-follow-9`, propertyId: id(9), eventIds: eventIds(9), status: 'not-interested', note: 'Sample homeowner declined an inspection.' },
    ],
    inspections: [
      { id: `${prefix}-inspection-3`, propertyId: id(3), date: '2026-10-12', time: '09:30', assignee: 'Alex Demo', status: 'scheduled' },
      { id: `${prefix}-inspection-4`, propertyId: id(4), date: '2026-10-10', time: '10:00', assignee: 'Sam Example', status: 'completed' },
      { id: `${prefix}-inspection-6`, propertyId: id(6), date: '2026-10-11', time: '14:00', assignee: 'Alex Demo', status: 'cancelled' },
    ],
    connections: structuredClone(connections), sampleImported: false,
  }
}
