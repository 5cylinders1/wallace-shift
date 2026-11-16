import type { DashboardFormat, DashboardMetric } from './model'

export function formatValue(value: number, format: DashboardFormat = 'number', currency?: string) {
  if (!Number.isFinite(value)) return 'Unavailable'
  if (format === 'currency') {
    try { return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency ?? 'USD', maximumFractionDigits: 2 }).format(value) } catch { return `${value.toFixed(2)} ${currency ?? ''}` }
  }
  if (format === 'percent') return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value)}%`
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: format === 'decimal' ? 2 : 0 }).format(value)
}
export function metricValue(metric?: DashboardMetric) { return metric ? formatValue(metric.value, metric.format, metric.currency) : 'Unavailable' }
export function dateLabel(value: string, year = false) {
  const date = new Date(`${value.slice(0, 10)}T12:00:00Z`)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', ...(year ? { year: 'numeric' } : {}), timeZone: 'UTC' })
}
export function checkedLabel(value: string | null) {
  if (!value) return 'Not checked'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Unavailable' : date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago', timeZoneName: 'short' })
}
