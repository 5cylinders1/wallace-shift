import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import type { DashboardDays, DashboardFormat, DashboardResponse, DashboardSnapshot, DashboardSource, DashboardStatus } from './model'
import './business-dashboard.css'

type View = 'overview' | 'web' | 'email' | 'social' | 'connections' | 'brief'
const navigation: { id: View; label: string; icon: string }[] = [
  { id: 'overview', label: 'Overview', icon: 'overview' },
  { id: 'web', label: 'Website & SEO', icon: 'web' },
  { id: 'email', label: 'Email & clients', icon: 'email' },
  { id: 'social', label: 'Social & advertising', icon: 'social' },
  { id: 'brief', label: 'Agent briefing', icon: 'brief' },
  { id: 'connections', label: 'Connections', icon: 'connections' },
]
const statusLabels: Record<DashboardStatus, string> = { connected: 'Connected', 'needs-setup': 'Setup needed', 'needs-sign-in': 'Sign in needed', planned: 'Not built yet', error: 'Needs attention' }
const titles: Record<View, string> = { overview: 'Business overview', web: 'Website & SEO', email: 'Email & clients', social: 'Social & advertising', connections: 'Your connections', brief: 'Agent briefing' }
const descriptions: Record<View, string> = {
  overview: 'A shared view of your business, grounded in the data you have connected.',
  web: 'See how people find your site, what they visit, and which searches bring them in.',
  email: 'Keep communication and client activity close to the rest of your business.',
  social: 'Bring organic activity and paid campaign results into the same workspace.',
  connections: 'See what is available, what needs access, and what still needs to be built.',
  brief: 'A factual handoff for you and your agents, with the evidence attached.',
}

function Icon({ name }: { name: string }) {
  const paths: Record<string, ReactNode> = {
    overview: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    web: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18Z" /></>,
    email: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 6 9 7 9-7" /></>,
    social: <><path d="M4 20V9m8 11V4m8 16v-7M2 20h20" /></>,
    brief: <><path d="M8 3H5a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1h-3" /><rect x="8" y="2" width="8" height="4" rx="1" /><path d="M8 11h8m-8 5h6" /></>,
    connections: <><path d="m8 15-2 2a4 4 0 0 1-5-5l4-4a4 4 0 0 1 5 0m4 1 2-2a4 4 0 0 1 5 5l-4 4a4 4 0 0 1-5 0m-4-1 8-8" transform="translate(1 1)" /></>,
    refresh: <><path d="M20 7v5h-5M4 17v-5h5" /><path d="M6 6a8 8 0 0 1 13 3M5 15a8 8 0 0 0 13 3" /></>,
    download: <><path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5" /></>,
    arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
  }
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] ?? paths.overview}</svg>
}

function valueLabel(value: number, format: DashboardFormat = 'number') {
  if (!Number.isFinite(value)) return 'Unavailable'
  if (format === 'currency') return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value)
  if (format === 'percent') return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value)}%`
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: format === 'decimal' ? 2 : 0 }).format(value)
}
function timestamp(value: string | null) {
  if (!value) return 'Not checked'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Unavailable' : date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago', timeZoneName: 'short' })
}
function dateLabel(value: string) {
  const date = new Date(`${value.slice(0, 10)}T12:00:00Z`)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}
function sourceLink(value?: string) {
  if (!value) return undefined
  if (value.startsWith('/') && !value.startsWith('//')) return value
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : undefined } catch { return undefined }
}
function Status({ status }: { status: DashboardStatus }) { return <span className={`bd-status bd-status-${status}`}><span aria-hidden="true" />{statusLabels[status]}</span> }

function SourceFootnote({ source }: { source: DashboardSource }) {
  return <div className="bd-provenance"><p>{source.freshness}</p><span>Checked {timestamp(source.checkedAt)}{source.dataThrough && <> · Latest reported data {dateLabel(source.dataThrough)}</>}{source.timeZone && <> · {source.timeZone}</>}</span></div>
}
function SourceSetup({ source }: { source: DashboardSource }) {
  const href = sourceLink(source.setup.href), docs = sourceLink(source.setup.docsUrl)
  return <div className="bd-setup"><p>{source.statusDetail}</p>{source.setup.steps.length > 0 && <ol>{source.setup.steps.map((step, index) => <li key={index}>{step}</li>)}</ol>}
    {(href || docs) && <div className="bd-links">{href && <a href={href}>{source.id === 'mail' ? 'Open Wallace Shift Mail' : source.id === 'portal' ? 'Open client workspace' : 'Open provider'}</a>}{docs && <a href={docs} target="_blank" rel="noopener noreferrer">Provider documentation <span className="bd-sr-only">(opens a new tab)</span></a>}</div>}
  </div>
}
function Metrics({ source, compact = false }: { source: DashboardSource; compact?: boolean }) {
  return <dl className={`bd-metrics${compact ? ' bd-metrics-compact' : ''}`}>{source.metrics.map(metric => <div key={metric.id}><dt>{metric.label}</dt><dd>{valueLabel(metric.value, metric.format)}<span>{metric.note}</span></dd></div>)}</dl>
}
function SourceTable({ source }: { source: DashboardSource }) {
  if (!source.table) return null
  const table = source.table
  return <div className="bd-table-section"><h3>{table.title}</h3>{table.rows.length ? <div className="bd-table-scroll" role="region" aria-label={`${source.name}: ${table.title}`} tabIndex={0}><table><thead><tr>{table.columns.map(column => <th key={column.key} scope="col" className={column.format ? 'bd-number' : ''}>{column.label}</th>)}</tr></thead><tbody>{table.rows.map((row, index) => <tr key={index}>{table.columns.map(column => <td key={column.key} className={column.format ? 'bd-number' : ''}>{typeof row[column.key] === 'number' ? valueLabel(row[column.key] as number, column.format) : row[column.key]}</td>)}</tr>)}</tbody></table></div> : <p className="bd-empty-inline">No rows were returned for this reporting period.</p>}</div>
}
function SourceSeries({ source }: { source: DashboardSource }) {
  if (!source.series?.points.length) return null
  const series = source.series
  const points = series.points.filter(point => Number.isFinite(point.value) && point.value >= 0 && !Number.isNaN(Date.parse(point.date))).toSorted((a, b) => a.date.localeCompare(b.date))
  if (!points.length) return null
  const first = Date.parse(points[0].date), last = Date.parse(points.at(-1)!.date)
  const span = Math.max(86_400_000, last - first), max = Math.max(1, ...points.map(point => point.value))
  const width = Math.max(2, Math.min(16, 550 / (span / 86_400_000 + 1)))
  return <div className="bd-series"><div className="bd-series-heading"><h3>{series.label} by day</h3><span>Returned daily data</span></div>
    <svg className="bd-chart" viewBox="0 0 660 190" role="img" aria-label={`${series.label} across ${points.length} reported days. Exact values are in the daily data table below.`}>
      {[0, .5, 1].map(ratio => <g key={ratio}><line x1="50" y1={145 - ratio * 115} x2="640" y2={145 - ratio * 115} stroke="currentColor" strokeOpacity=".18" /><text x="39" y={149 - ratio * 115} textAnchor="end">{valueLabel(max * ratio, max < 4 ? 'decimal' : 'number')}</text></g>)}
      {points.map((point, index) => { const x = points.length === 1 ? 345 : 60 + (Date.parse(point.date) - first) / span * 570; const height = point.value / max * 115; return <rect key={`${point.date}-${index}`} x={x - width / 2} y={145 - height} width={width} height={height} rx="1" fill="#3478aa"><title>{dateLabel(point.date)}: {valueLabel(point.value)}</title></rect> })}
      <text x="50" y="172">{dateLabel(points[0].date)}</text><text x="640" y="172" textAnchor="end">{dateLabel(points.at(-1)!.date)}</text>
    </svg>
    <details className="bd-daily-data"><summary>View daily data</summary><p>Only dates returned by the provider are included. Missing dates are not treated as zero.</p><div className="bd-table-scroll" role="region" aria-label={`${source.name} daily data`} tabIndex={0}><table><thead><tr><th scope="col">Date</th><th scope="col" className="bd-number">{series.label}</th></tr></thead><tbody>{points.map((point, index) => <tr key={`${point.date}-${index}`}><td>{dateLabel(point.date)}</td><td className="bd-number">{valueLabel(point.value)}</td></tr>)}</tbody></table></div></details>
  </div>
}
function SourceReport({ source, onConnections }: { source: DashboardSource; onConnections: () => void }) {
  return <section className="bd-report" aria-labelledby={`bd-source-${source.id}`}><div className="bd-section-heading"><div><h2 id={`bd-source-${source.id}`}>{source.name}</h2><p>{source.description}</p></div><Status status={source.status} /></div>
    {source.status === 'connected' ? <><p className="bd-source-detail">{source.statusDetail}</p>{source.metrics.length ? <Metrics source={source} /> : <p className="bd-empty-inline">The source responded without report metrics.</p>}<SourceSeries source={source} /><SourceTable source={source} /></> : <div className="bd-report-empty"><p>{source.statusDetail}</p><button className="bd-text-button" onClick={onConnections}>View connection details <Icon name="arrow" /></button></div>}
    <SourceFootnote source={source} />
  </section>
}

export function BusinessDashboard({ onOpenAgreements }: { onOpenAgreements: () => void }) {
  const [view, setView] = useState<View>('overview')
  const [days, setDays] = useState<DashboardDays>(30)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [revision, setRevision] = useState(0)
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null)
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState('')
  const [accessExpired, setAccessExpired] = useState(false)
  const heading = useRef<HTMLHeadingElement>(null)
  const refresh = useCallback(() => { setBusy(true); setError(''); setAccessExpired(false); setRevision(value => value + 1) }, [])
  useEffect(() => {
    const controller = new AbortController()
    void (async () => {
      const response = await fetch(`/api/business-dashboard?days=${days}`, { credentials: 'same-origin', cache: 'no-store', signal: controller.signal })
      if (response.status === 401 || response.status === 403) {
        setSnapshot(null); setAccessExpired(true)
        throw new Error('Your owner session has ended. Sign in again to view business data.')
      }
      if (response.status === 429) throw new Error('The dashboard has been refreshed too often. Wait one minute, then try again.')
      const result = await response.json() as DashboardResponse
      if (!response.ok || !result.ok || !result.snapshot || result.snapshot.schemaVersion !== 1 || !Array.isArray(result.snapshot.sources)) throw new Error('The business dashboard could not refresh. Try again in a moment.')
      if (!controller.signal.aborted) setSnapshot(result.snapshot)
    })().catch(reason => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'The business dashboard could not refresh. Try again in a moment.') }).finally(() => { if (!controller.signal.aborted) setBusy(false) })
    return () => controller.abort()
  }, [days, revision])
  useEffect(() => {
    if (!autoRefresh || accessExpired) return
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') refresh() }, 60_000)
    return () => window.clearInterval(timer)
  }, [autoRefresh, accessExpired, refresh])
  function navigate(next: View) { setView(next); requestAnimationFrame(() => heading.current?.focus({ preventScroll: true })) }
  function download() {
    if (!snapshot) return
    const url = URL.createObjectURL(new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' }))
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `wallace-shift-business-${snapshot.range.endDate}.json`; anchor.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  const sources = snapshot?.sources ?? []
  const connected = sources.filter(source => source.status === 'connected')
  const portal = sources.find(source => source.id === 'portal')
  const filtered = sources.filter(source => view === 'web' ? ['website', 'seo'].includes(source.category) : view === 'email' ? ['email', 'operations'].includes(source.category) : ['social', 'advertising'].includes(source.category))

  return <section className="business-dashboard" aria-label="Wallace Shift business dashboard">
    <aside className="bd-sidebar"><div className="bd-workspace-name"><strong>Wallace Shift</strong><span>Business workspace</span></div><nav aria-label="Business dashboard">{navigation.map(item => <button key={item.id} type="button" aria-current={view === item.id ? 'page' : undefined} onClick={() => navigate(item.id)}><Icon name={item.icon} /><span>{item.label}</span>{item.id === 'connections' && sources.some(source => source.status === 'error') && <span className="bd-nav-attention" aria-label="Connection needs attention" />}</button>)}</nav>
      <div className="bd-workspace-links"><button type="button" onClick={onOpenAgreements}>Agreements & billing <Icon name="arrow" /></button><a href="/mail">Wallace Shift Mail <Icon name="arrow" /></a></div>
      <div className="bd-sidebar-note"><strong>One source of context.</strong><p>Metrics keep their source, reporting period, and availability so decisions stay grounded.</p></div>
    </aside>
    <div className="bd-content"><header className="bd-heading"><div><h1 ref={heading} tabIndex={-1}>{titles[view]}</h1><p>{descriptions[view]}</p></div><button className="bd-button bd-refresh" onClick={refresh} disabled={busy || accessExpired}><Icon name="refresh" />{busy ? 'Refreshing…' : 'Refresh data'}</button></header>
      <div className="bd-toolbar"><label className="bd-period">Reporting period <select value={days} onChange={event => { setDays(Number(event.target.value) as DashboardDays); setSnapshot(null); setBusy(true); setError(''); setAccessExpired(false) }}><option value={7}>Last 7 complete days</option><option value={30}>Last 30 complete days</option><option value={90}>Last 90 complete days</option></select></label><label className="bd-auto"><input type="checkbox" checked={autoRefresh} onChange={event => setAutoRefresh(event.target.checked)} disabled={accessExpired} />Refresh every minute</label>{snapshot && <span className="bd-updated">Snapshot: {timestamp(snapshot.generatedAt)}</span>}</div>
      {snapshot && <p className="bd-range">{dateLabel(snapshot.range.startDate)} – {dateLabel(snapshot.range.endDate)} · {snapshot.range.timeZone}. Current balances and recent activity use the windows noted below.{snapshot.environment !== 'production' && <strong> {snapshot.environment === 'development' ? 'Local development' : 'Preview'} environment.</strong>}</p>}
      {error && <div className="bd-error" role="alert"><p>{error}{snapshot && <> Showing the previous snapshot from {timestamp(snapshot.generatedAt)}.</>}</p>{accessExpired ? <a href="/client-portal?view=business">Sign in to the owner account</a> : <button className="bd-text-button" onClick={refresh} disabled={busy}>Try again</button>}</div>}
      {!snapshot && busy && <div className="bd-loading" role="status"><span className="bd-loading-line" /><h2>Checking your business data</h2><p>Loading available reports and checking each connection.</p></div>}
      {snapshot && <>
        {view === 'overview' && <>
          <div className="bd-coverage"><div><strong>{connected.length} of {sources.length} sources reporting</strong><p>{connected.length < sources.length ? 'Your view will grow as more accounts are connected. Unavailable data is never counted as zero.' : 'All configured sources returned data. Each provider has its own reporting delay.'}</p></div><button className="bd-button" onClick={() => navigate('connections')}>Manage connections <Icon name="arrow" /></button></div>
          {portal && <section className="bd-report bd-business-summary"><div className="bd-section-heading"><div><h2>Business activity</h2><p>{portal.name} · {portal.status === 'connected' ? 'Recorded in your Wallace Shift client workspace' : portal.statusDetail}</p></div><button className="bd-text-button" onClick={onOpenAgreements}>View agreements <Icon name="arrow" /></button></div>{portal.metrics.length > 0 && <Metrics source={portal} compact />}<SourceFootnote source={portal} /></section>}
          <div className="bd-overview-columns"><section className="bd-report"><div className="bd-section-heading"><div><h2>What needs your attention</h2><p>Observations from this snapshot.</p></div></div><InsightList snapshot={snapshot} limit={3} /><button className="bd-text-button" onClick={() => navigate('brief')}>Open the full briefing <Icon name="arrow" /></button></section>
            <section className="bd-report"><div className="bd-section-heading"><div><h2>Across your channels</h2><p>Availability before interpretation.</p></div></div><ul className="bd-channel-list">{sources.filter(source => ['ga4', 'search-console', 'mail', 'google-ads', 'meta-ads', 'linkedin-ads', 'instagram', 'facebook'].includes(source.id)).map(source => <li key={source.id}><span>{source.name}</span><Status status={source.status} /></li>)}</ul><button className="bd-text-button" onClick={() => navigate('connections')}>View all sources <Icon name="arrow" /></button></section></div>
        </>}
        {(['web', 'email', 'social'] as View[]).includes(view) && <div className="bd-reports">{filtered.map(source => <SourceReport key={source.id} source={source} onConnections={() => navigate('connections')} />)}</div>}
        {view === 'connections' && <div className="bd-connections"><div className="bd-connection-guide"><p><strong>Connected</strong> means a source returned data. <strong>Setup needed</strong> means its adapter is available but access is missing.{sources.some(source => source.status === 'planned') && <> <strong>Not built yet</strong> means the connector still needs implementation.</>}</p><p>Refreshing checks the available sources. It does not remove provider reporting delays or grant account access.</p></div>{sources.map(source => <details key={source.id} className="bd-connection"><summary><div><strong>{source.name}</strong><span>{source.description}</span></div><Status status={source.status} /><span className="bd-disclosure" aria-hidden="true" /></summary><SourceSetup source={source} /><SourceFootnote source={source} /></details>)}</div>}
        {view === 'brief' && <>
          <section className="bd-brief-intro"><div><h2>Evidence before action</h2><p>This briefing uses rules to summarize the returned data. It is not AI generated, and no agent is running or taking actions.</p></div><button className="bd-button bd-button-primary" onClick={download}><Icon name="download" />Download data snapshot</button></section>
          <section className="bd-report"><div className="bd-section-heading"><div><h2>Business briefing</h2><p>Generated from this snapshot. Source details travel with the export.</p></div></div><InsightList snapshot={snapshot} /></section>
          <section className="bd-agent-policy"><div><h2>Agent access</h2><p>{snapshot.agentPolicy.note}</p></div><div><h3>Available context</h3><ul>{snapshot.agentPolicy.allowed.map(item => <li key={item}>{item}</li>)}</ul></div><div><h3>Actions need approval</h3><ul>{snapshot.agentPolicy.requiresApproval.map(item => <li key={item}>{item}</li>)}</ul></div></section>
          <p className="bd-export-note">The JSON export contains this dashboard’s reports and source status. Review it before sharing it with an external agent. Connecting an agent and enabling execution are separate setup steps.</p>
        </>}
        <footer className="bd-footer"><span>Data with context. Decisions with evidence.</span><span>Provider delays apply · Refresh is {autoRefresh ? 'every minute while this tab is visible' : 'manual'}</span></footer>
      </>}
    </div>
  </section>
}

function InsightList({ snapshot, limit }: { snapshot: DashboardSnapshot; limit?: number }) {
  const insights = limit ? snapshot.brief.slice(0, limit) : snapshot.brief
  if (!insights.length) return <p className="bd-empty-inline">No observations are available from the returned data yet. Review Connections to add reporting sources.</p>
  return <ul className="bd-insights">{insights.map(insight => <li key={insight.id}><div className="bd-insight-heading"><h3>{insight.title}</h3>{insight.severity === 'attention' && <span>Review</span>}</div><p>{insight.detail}</p><small>Source: {insight.sourceIds.map(id => snapshot.sources.find(source => source.id === id)?.name ?? id).join(', ') || 'Connection status'}</small></li>)}</ul>
}
