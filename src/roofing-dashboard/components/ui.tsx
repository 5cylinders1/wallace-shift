import type { ReactNode } from 'react'
import type { FollowUpStatus, Relationship, WeatherEvent } from '../types'
import { relationshipLabel, statusLabel } from '../domain'
import { Icon } from './Icon'

export function WeatherBadge({ event }: { event: WeatherEvent }) {
  return <span className={`rd-weather-symbol rd-weather-${event.type}`}><Icon name={event.type} size={22} /></span>
}
export function RelationshipBadge({ value }: { value: Relationship }) {
  return <span className={`rd-tag rd-tag-${value}`}>{relationshipLabel(value)}</span>
}
export function StatusBadge({ value }: { value: FollowUpStatus }) {
  return <span className={`rd-tag rd-status-${value}`}>{statusLabel(value)}</span>
}
export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return <div className="rd-empty"><span><Icon name="search" size={28} /></span><h3>{title}</h3><p>{children}</p></div>
}
export function SectionHeading({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return <div className="rd-section-heading"><div>{eyebrow && <p className="rd-eyebrow">{eyebrow}</p>}<h2>{title}</h2></div>{children}</div>
}
export const EVIDENCE_LABELS = { report: 'Report point', estimated: 'Estimated footprint', warning: 'Warning area' }
export function shortDate(value: string, timezone: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: timezone }).format(new Date(value))
}
export function localDate(value: string, timezone: string) {
  const parts = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: timezone }).formatToParts(new Date(value))
  const get = (type: string) => parts.find(part => part.type === type)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}`
}
