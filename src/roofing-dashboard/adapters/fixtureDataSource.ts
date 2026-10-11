import type { Contact, DashboardConfig, DashboardDataSource, DashboardSnapshot, FollowUp, FollowUpStatus, PropertyRecord, Scenario } from '../types'
import { localDateTime, matchProperties, statusLabel } from '../domain'
import { createScenarioFixture, sampleCustomerCsvByScenario } from '../demo/fixtures'

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let value = ''
  let quoted = false
  for (let index = 0; index < text.length; index++) {
    const character = text[index]
    if (character === '"') {
      if (quoted && text[index + 1] === '"') { value += '"'; index++ }
      else quoted = !quoted
    } else if (character === ',' && !quoted) {
      row.push(value); value = ''
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && text[index + 1] === '\n') index++
      row.push(value)
      if (row.some(field => field.trim())) rows.push(row)
      row = []; value = ''
    } else value += character
  }
  if (quoted) throw new Error('The sample CSV contains an unfinished quoted field.')
  row.push(value)
  if (row.some(field => field.trim())) rows.push(row)
  return rows
}

/** Demo CSV parser; accepting an arbitrary user upload is outside this adapter. */
export function parseSampleCustomerCsv(text: string, scenario: Scenario): PropertyRecord[] {
  const [header, ...rows] = parseCsvRows(text)
  const fields = ['id', 'name', 'email', 'phone', 'address', 'city', 'postalCode', 'longitude', 'latitude', 'roofAge']
  if (!header || fields.some(field => !header.includes(field))) throw new Error('The sample CSV is missing a required column.')
  const ids = new Set<string>()
  return rows.map((row, index) => {
    const field = (name: string) => row[header.indexOf(name)]?.trim() ?? ''
    const longitudeText = field('longitude')
    const latitudeText = field('latitude')
    const longitude = Number(longitudeText)
    const latitude = Number(latitudeText)
    if (row.length !== header.length || !field('id') || !field('address') || !field('city') || !longitudeText || !latitudeText || !Number.isFinite(longitude) || !Number.isFinite(latitude) || Math.abs(longitude) > 180 || Math.abs(latitude) > 90) {
      throw new Error(`Sample CSV row ${index + 2} needs a valid ID, address and map coordinates.`)
    }
    if (ids.has(field('id'))) throw new Error(`Sample CSV row ${index + 2} repeats a property ID.`)
    ids.add(field('id'))
    const name = field('name')
    const contact: Contact | null = name ? {
      name, email: field('email') || null, phone: field('phone') || null,
      source: 'Bundled fictional customer CSV', permission: 'unknown',
    } : null
    return {
      id: field('id'), address: field('address'), city: field('city'), postalCode: field('postalCode'),
      point: [longitude, latitude], relationship: 'customer', contact, source: 'Bundled fictional customer CSV',
      roofAge: field('roofAge') || null, doNotContact: false,
      activity: [{ id: `${field('id')}-import`, at: scenario.referenceDate, text: 'Imported from the bundled sample CSV. Contact permission is unknown.' }],
    }
  })
}

function appointmentIsValid(date: string, time: string, scenario: Scenario): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return false
  const parsed = new Date(`${date}T00:00:00Z`)
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) return false
  const now = localDateTime(scenario.referenceDate, scenario.timezone)
  return date > now.date || (date === now.date && time >= now.time)
}

export function createFixtureDataSource(config: DashboardConfig): DashboardDataSource {
  const states = new Map<string, DashboardSnapshot>()
  let sequence = 0
  const nextId = (prefix: string) => `${prefix}-${++sequence}`

  function scenarioFor(scenarioId: string): Scenario {
    const scenario = config.scenarios.find(candidate => candidate.id === scenarioId)
    if (!scenario) throw new Error('This client does not include the requested scenario.')
    return scenario
  }

  function stateFor(scenarioId: string): DashboardSnapshot {
    scenarioFor(scenarioId)
    let state = states.get(scenarioId)
    if (!state) { state = createScenarioFixture(scenarioId); states.set(scenarioId, state) }
    return state
  }

  function propertyFor(state: DashboardSnapshot, propertyId: string): PropertyRecord {
    const property = state.properties.find(candidate => candidate.id === propertyId)
    if (!property) throw new Error('That property is not available in this scenario.')
    return property
  }

  function assertContactable(state: DashboardSnapshot, property: PropertyRecord): void {
    const followUp = state.followUps.find(item => item.propertyId === property.id)
    if (property.doNotContact || followUp?.status === 'do-not-contact') throw new Error('This property is marked Do not contact. Outreach and scheduling are unavailable.')
    if (followUp?.status === 'not-interested') throw new Error('This homeowner is marked Not interested. Review that status before planning another inspection.')
  }

  function log(property: PropertyRecord, scenarioId: string, text: string): void {
    property.activity.unshift({ id: nextId(`${property.id}-activity`), at: scenarioFor(scenarioId).referenceDate, text })
  }

  function followUpFor(state: DashboardSnapshot, propertyId: string): FollowUp {
    const existing = state.followUps.find(item => item.propertyId === propertyId)
    if (existing) return existing
    const followUp: FollowUp = { id: nextId(`${propertyId}-follow`), propertyId, eventIds: [], status: 'to-contact', note: '' }
    state.followUps.push(followUp)
    return followUp
  }

  const copy = (state: DashboardSnapshot) => structuredClone(state)

  return {
    async load(scenarioId) { return copy(stateFor(scenarioId)) },

    async addToWorklist(scenarioId, propertyIds, eventIds, radiusMiles = 3) {
      const state = stateFor(scenarioId)
      const properties = [...new Set(propertyIds)].map(id => propertyFor(state, id))
      // Validate the complete request before changing any record.
      properties.forEach(property => assertContactable(state, property))
      const events = [...new Set(eventIds)].map(id => {
        const event = state.events.find(candidate => candidate.id === id)
        if (!event) throw new Error('That weather event is not available in this scenario.')
        return event
      }).filter(event => event.evidence !== 'warning')
      for (const property of properties) {
        const existing = state.followUps.find(item => item.propertyId === property.id)
        const followUp = followUpFor(state, property.id)
        const matchedEvents = matchProperties([property], events, radiusMiles, scenarioFor(scenarioId).serviceArea)[0]?.matches ?? []
        const combined = [...new Set([...followUp.eventIds, ...matchedEvents.map(match => match.event.id)])]
        if (!existing || combined.length !== followUp.eventIds.length) log(property, scenarioId, 'Added to the demo follow-up worklist. No message was sent.')
        followUp.eventIds = combined
      }
      return copy(state)
    },

    async updateFollowUp(scenarioId, propertyId, status: FollowUpStatus, note) {
      const state = stateFor(scenarioId)
      const property = propertyFor(state, propertyId)
      const existing = state.followUps.find(item => item.propertyId === propertyId)
      if ((property.doNotContact || existing?.status === 'do-not-contact') && status !== 'do-not-contact') {
        throw new Error('Do not contact is retained for this demo. Reset the sample data to restore its original state.')
      }
      if (status === 'scheduled' && !state.inspections.some(item => item.propertyId === propertyId && item.status === 'scheduled')) {
        throw new Error('Choose an inspection date and time before marking this follow-up scheduled.')
      }
      const followUp = followUpFor(state, propertyId)
      const changed = followUp.status !== status || followUp.note !== note.trim()
      followUp.status = status
      followUp.note = note.trim()
      if (status === 'do-not-contact') property.doNotContact = true
      for (const inspection of state.inspections.filter(item => item.propertyId === propertyId && item.status === 'scheduled')) {
        if (status === 'completed') inspection.status = 'completed'
        else if (status !== 'scheduled') inspection.status = 'cancelled'
      }
      if (changed) log(property, scenarioId, `Follow-up updated to ${statusLabel(status)}${followUp.note ? `: ${followUp.note}` : '.'}`)
      return copy(state)
    },

    async scheduleInspection(scenarioId, propertyId, input) {
      const state = stateFor(scenarioId)
      const property = propertyFor(state, propertyId)
      assertContactable(state, property)
      const scenario = scenarioFor(scenarioId)
      if (!appointmentIsValid(input.date, input.time, scenario)) throw new Error('Choose a valid inspection date and time at or after the fixed demo clock in this region.')
      const assignee = input.assignee.trim()
      if (!assignee) throw new Error('Choose or enter an inspector for this appointment.')
      // One appointment record per property: edits reschedule it in place.
      let inspection = state.inspections.find(item => item.propertyId === propertyId)
      const rescheduled = inspection?.status === 'scheduled'
      if (!inspection) {
        inspection = { id: nextId(`${propertyId}-inspection`), propertyId, date: input.date, time: input.time, assignee, status: 'scheduled' }
        state.inspections.push(inspection)
      } else Object.assign(inspection, { date: input.date, time: input.time, assignee, status: 'scheduled' })
      followUpFor(state, propertyId).status = 'scheduled'
      log(property, scenarioId, `${rescheduled ? 'Rescheduled' : 'Scheduled'} a fictional inspection for ${input.date} at ${input.time} (${scenario.timezone}) with ${assignee}. No invitation was sent.`)
      return copy(state)
    },

    async enrichProperty(scenarioId, propertyId) {
      if (!config.features.enrichment) throw new Error('Contact discovery is not enabled for this client.')
      const state = stateFor(scenarioId)
      const property = propertyFor(state, propertyId)
      assertContactable(state, property)
      if (property.relationship !== 'prospect') throw new Error('Sample contact discovery is available for prospective properties only.')
      if (property.contact) return copy(state)
      const numericId = Number(propertyId.split('-').at(-1))
      if (numericId % 5 === 0) throw new Error('No fictional contact match is available for this sample property. The address remains available for manual research.')
      property.contact = {
        name: `${['Avery', 'Casey', 'Riley'][numericId % 3]} Fiction`, email: `${propertyId}@example.com`,
        phone: `+1 ${scenarioId === 'coastal' ? '813' : '816'}-555-01${String(numericId).padStart(2, '0')}`,
        source: 'Fictional enrichment result · no live lookup', permission: 'unknown',
      }
      log(property, scenarioId, 'A fictional contact match was added. Contact permission remains unknown; no message was sent.')
      return copy(state)
    },

    async importSampleCsv(scenarioId) {
      if (!config.features.sampleImport) throw new Error('Sample CSV import is not enabled for this client.')
      const state = stateFor(scenarioId)
      if (state.sampleImported) return copy(state)
      const csv = sampleCustomerCsvByScenario[scenarioId]
      if (!csv) throw new Error('No bundled sample CSV is available for this scenario.')
      const properties = parseSampleCustomerCsv(csv, scenarioFor(scenarioId))
      const existing = new Set(state.properties.map(property => property.id))
      state.properties.push(...properties.filter(property => !existing.has(property.id)))
      state.sampleImported = true
      return copy(state)
    },

    async reset() { states.clear(); sequence = 0 },
  }
}
