import type { DashboardConfig, Scenario } from '../types'

export const midwestScenario: Scenario = {
  id: 'midwest', label: 'Midwest storms', region: 'Kansas City metro', timezone: 'America/Chicago',
  referenceDate: '2026-10-10T20:00:00Z', center: [-94.65, 39.015], zoom: 10,
  serviceArea: [[-94.92, 38.77], [-94.40, 38.77], [-94.40, 39.24], [-94.92, 39.24], [-94.92, 38.77]],
}

export const coastalScenario: Scenario = {
  id: 'coastal', label: 'Coastal storm', region: 'Tampa Bay area', timezone: 'America/New_York',
  referenceDate: '2026-10-10T20:00:00Z', center: [-82.48, 27.96], zoom: 10,
  serviceArea: [[-82.76, 27.70], [-82.16, 27.70], [-82.16, 28.18], [-82.76, 28.18], [-82.76, 27.70]],
}

const map: DashboardConfig['map'] = {
  tileUrl: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: '© OpenStreetMap contributors', attributionUrl: 'https://www.openstreetmap.org/copyright', maxZoom: 19,
}

export const northvaneConfig: DashboardConfig = {
  company: 'Northvane Roofing', initials: 'NR', accent: '#bd6036', contactEmail: 'office@northvane.example.com',
  scenarios: [midwestScenario, coastalScenario], defaultScenarioId: 'midwest', map,
  features: { enrichment: true, sampleImport: true, websiteLeads: true },
}

export const coastalConfig: DashboardConfig = {
  company: 'Harborline Roofing', initials: 'HR', accent: '#147d82', contactEmail: 'office@harborline.example.com',
  scenarios: [coastalScenario, midwestScenario], defaultScenarioId: 'coastal', map,
  features: { enrichment: true, sampleImport: true, websiteLeads: true },
}
