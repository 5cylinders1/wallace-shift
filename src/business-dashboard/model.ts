export type DashboardDays = 7 | 30 | 90
export type DashboardCategory = 'operations' | 'website' | 'seo' | 'email' | 'social' | 'advertising'
export type DashboardStatus = 'connected' | 'needs-setup' | 'needs-sign-in' | 'planned' | 'error'
export type DashboardFormat = 'number' | 'currency' | 'percent' | 'decimal'
export type DashboardMetric = {
  id: string
  label: string
  /** Currency values are major units in currency (USD for legacy portal metrics); percent values are 0–100. */
  value: number
  format: DashboardFormat
  currency?: string
  note: string
}
export type DashboardSeries = {
  id?: string
  label: string
  format?: DashboardFormat
  currency?: string
  /** Only observed dates, except complete ledger days with no recorded payments. */
  points: { date: string; value: number }[]
}
export type DashboardSource = {
  id: string
  name: string
  category: DashboardCategory
  description: string
  status: DashboardStatus
  statusDetail: string
  freshness: string
  /** Retrieval time is distinct from the reporting period and provider processing delay. */
  checkedAt: string | null
  dataThrough: string | null
  timeZone?: string
  /** Verified reporting asset identifier; never an access token or credential. */
  account?: { id: string; label: string }
  metrics: DashboardMetric[]
  table?: { title: string; columns: { key: string; label: string; format?: DashboardFormat }[]; rows: Record<string, string | number>[] }
  series?: DashboardSeries
  seriesList?: DashboardSeries[]
  setup: { steps: string[]; docsUrl?: string; href?: string }
}
export type DashboardInsight = {
  id: string
  title: string
  detail: string
  sourceIds: string[]
  severity: 'info' | 'attention'
}
export type DashboardSnapshot = {
  schemaVersion: 1
  generatedAt: string
  range: { days: DashboardDays; startDate: string; endDate: string; timeZone: string }
  environment: 'production' | 'preview' | 'development'
  sources: DashboardSource[]
  /** Deterministic observations of the returned data, not generated AI advice. */
  brief: DashboardInsight[]
  agentPolicy: {
    mode: 'read-only'
    executionEnabled: false
    summaryMethod: 'rules'
    allowed: string[]
    requiresApproval: string[]
    note: string
  }
}
export type DashboardResponse = { ok: true; snapshot: DashboardSnapshot } | { ok: false; error: string }
