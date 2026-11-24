import type { ContactMethod, Project, Timing } from './types'

/** Lareau's services, as the homeowner picks them. */
export const PROJECT_LABELS: Record<Project, string> = {
  patio: 'Patio',
  walls: 'Retaining wall or steps',
  kitchen: 'Outdoor kitchen',
  fire: 'Fire pit or fireplace',
  planting: 'Trees, shrubs & perennials',
  lighting: 'Landscape lighting',
  drainage: 'Drainage',
  sprinklers: 'Sprinkler system',
}

export const CONTACT_LABELS: Record<ContactMethod, string> = { text: 'Text me', call: 'Call me', email: 'Email me' }

export const TIMING_LABELS: Record<Timing, string> = { season: 'This season', months: 'In the next few months', planning: 'Just planning ahead' }
