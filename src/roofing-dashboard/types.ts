export type Coordinate = [number, number] // GeoJSON: longitude, latitude
export type Polygon = Coordinate[]
export type WeatherType = 'hail' | 'wind' | 'tornado' | 'hurricane'
export type EvidenceType = 'report' | 'estimated' | 'warning'
export type Relationship = 'customer' | 'lead' | 'prospect'
export type FollowUpStatus = 'to-contact' | 'contacted' | 'scheduled' | 'completed' | 'not-interested' | 'do-not-contact'

export interface WeatherEvent {
  id: string
  title: string
  type: WeatherType
  evidence: EvidenceType
  occurredAt: string
  source: string
  magnitude: string | null
  description: string
  point: Coordinate
  footprint?: Polygon
}

export interface Contact {
  name: string
  email: string | null
  phone: string | null
  source: string
  permission: 'project-inquiry' | 'unknown'
}

export interface PropertyRecord {
  id: string
  address: string
  city: string
  postalCode: string
  point: Coordinate
  relationship: Relationship
  contact: Contact | null
  source: string
  roofAge: string | null
  doNotContact: boolean
  activity: { id: string; at: string; text: string }[]
  lead?: { concern: string; preferredMethod: string; consentStatement: string; submittedAt: string }
}

export interface FollowUp {
  id: string
  propertyId: string
  eventIds: string[]
  status: FollowUpStatus
  note: string
}

export interface Inspection {
  id: string
  propertyId: string
  date: string // Local calendar date in the scenario's timezone
  time: string // Local 24-hour time in the scenario's timezone
  assignee: string
  status: 'scheduled' | 'completed' | 'cancelled'
}

export interface Scenario {
  id: string
  label: string
  region: string
  timezone: string
  referenceDate: string // Fixed demo clock, ISO timestamp
  center: Coordinate
  zoom: number
  serviceArea: Polygon
}

export interface DashboardConfig {
  company: string
  initials: string
  accent: string
  contactEmail: string
  scenarios: Scenario[]
  defaultScenarioId: string
  map: { tileUrl: string; attribution: string; attributionUrl?: string; maxZoom: number }
  features: { enrichment: boolean; sampleImport: boolean; websiteLeads: boolean }
}

export interface ConnectionCapability {
  id: 'weather' | 'customers' | 'website' | 'enrichment'
  title: string
  state: 'sample' | 'optional'
  description: string
}

export interface DashboardSnapshot {
  events: WeatherEvent[]
  properties: PropertyRecord[]
  followUps: FollowUp[]
  inspections: Inspection[]
  connections: ConnectionCapability[]
  sampleImported: boolean
}

export interface DashboardDataSource {
  load(scenarioId: string): Promise<DashboardSnapshot>
  addToWorklist(scenarioId: string, propertyIds: string[], eventIds: string[], radiusMiles?: number): Promise<DashboardSnapshot>
  updateFollowUp(scenarioId: string, propertyId: string, status: FollowUpStatus, note: string): Promise<DashboardSnapshot>
  scheduleInspection(scenarioId: string, propertyId: string, inspection: Pick<Inspection, 'date' | 'time' | 'assignee'>): Promise<DashboardSnapshot>
  enrichProperty(scenarioId: string, propertyId: string): Promise<DashboardSnapshot>
  importSampleCsv(scenarioId: string): Promise<DashboardSnapshot>
  reset(): Promise<void>
}

export interface PropertyMatch {
  property: PropertyRecord
  matches: { event: WeatherEvent; distanceMiles: number; reason: string }[]
}

export interface EventFilter {
  type: WeatherType | 'all'
  days: 1 | 7 | 30
}

export interface WorkspaceActions {
  add(propertyIds: string[], eventIds: string[]): Promise<boolean>
  update(propertyId: string, status: FollowUpStatus, note: string): Promise<boolean>
  schedule(propertyId: string, inspection: Pick<Inspection, 'date' | 'time' | 'assignee'>): Promise<boolean>
  enrich(propertyId: string): Promise<boolean>
  importSample(): Promise<boolean>
  copy(text: string): Promise<boolean>
}
