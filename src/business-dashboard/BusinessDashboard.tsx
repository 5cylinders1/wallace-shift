import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import type { DashboardDays, DashboardResponse, DashboardSnapshot, DashboardSource, DashboardStatus } from './model'
import type { Engagement } from '../client-portal/model'
import { EmailView, ClientsView, PostingView } from './OperationsViews'
import { Metrics, MetricDefinitions, TrendChart, ReportTable } from './ReportVisuals'
import { metricValue, checkedLabel, dateLabel } from './report-format'
import './business-dashboard.css'

type View = 'overview' | 'web' | 'seo' | 'email' | 'clients' | 'ads' | 'social' | 'publishing' | 'connections' | 'brief'
const navigation: { id: View; label: string; icon: string }[] = [
  { id: 'overview', label: 'Dashboard', icon: 'overview' },
  { id: 'web', label: 'Website Analytics', icon: 'web' },
  { id: 'seo', label: 'SEO Analytics', icon: 'search' },
  { id: 'email', label: 'Email', icon: 'email' },
  { id: 'clients', label: 'Clients', icon: 'clients' },
  { id: 'ads', label: 'Paid Ads', icon: 'social' },
  { id: 'social', label: 'Social Media', icon: 'web' },
  { id: 'publishing', label: 'Social Media Posting', icon: 'publishing' },
  { id: 'brief', label: 'Business briefing', icon: 'brief' },
  { id: 'connections', label: 'Connections', icon: 'connections' },
]
const titles = Object.fromEntries(navigation.map(item => [item.id, item.label])) as Record<View, string>
const descriptions: Record<View, string> = {
  overview: 'Follow recorded payments, website activity and marketing performance. Open a report to see the evidence behind a number.',
  web: 'Understand visits, popular pages and key events on your website.',
  seo: 'See how your website appears in Google Search and which queries bring people to it.',
  email: 'Compose email and review outgoing activity from your signed in mail workspace.',
  clients: 'Find clients and open their Wallace Shift agreements, invoices and payment records.',
  ads: 'Review spend and results for each advertising account. Reporting does not change your campaigns.',
  social: 'Review content performance by account. Each platform measures activity differently.',
  publishing: 'See publishing connections and prepare a post for a supported account.',
  connections: 'Check reporting access, account requirements and provider status.',
  brief: 'A rules based summary of this snapshot, with source evidence and checks you can make next.',
}
const statusLabels: Record<DashboardStatus, string> = { connected: 'Connected', 'needs-setup': 'Setup needed', 'needs-sign-in': 'Sign in needed', planned: 'Not built yet', error: 'Needs attention' }
const reportingView = (source: DashboardSource): View => source.category === 'website' ? 'web' : source.category === 'seo' ? 'seo' : source.category === 'advertising' ? 'ads' : source.category === 'social' ? 'social' : source.category === 'email' ? 'email' : 'clients'
function initialView(): View { const value = new URLSearchParams(location.search).get('report'); return navigation.some(item => item.id === value) ? value as View : 'overview' }

function Icon({ name }: { name: string }) {
  const paths: Record<string, ReactNode> = {
    search: <><circle cx="10" cy="10" r="6" /><path d="m15 15 6 6" /></>,
    clients: <><circle cx="9" cy="7" r="3" /><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 4a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 5v2" /></>,
    overview: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    web: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18Z" /></>,
    email: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 6 9 7 9-7" /></>,
    social: <><path d="M4 20V9m8 11V4m8 16v-7M2 20h20" /></>,
    publishing: <><path d="M12 20H4V4h10M15 3l6 6-9 9H6v-6L15 3Zm-3 3 6 6" /></>,
    brief: <><path d="M8 3H5a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1h-3" /><rect x="8" y="2" width="8" height="4" rx="1" /><path d="M8 11h8m-8 5h6" /></>,
    connections: <><path d="m8 15-2 2a4 4 0 0 1-5-5l4-4a4 4 0 0 1 5 0m4 1 2-2a4 4 0 0 1 5 5l-4 4a4 4 0 0 1-5 0m-4-1 8-8" transform="translate(1 1)" /></>,
    refresh: <><path d="M20 7v5h-5M4 17v-5h5" /><path d="M6 6a8 8 0 0 1 13 3M5 15a8 8 0 0 0 13 3" /></>,
    download: <><path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5" /></>,
    arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
  }
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] ?? paths.overview}</svg>
}

function sourceLink(value?: string) {
  if (!value) return undefined
  if (value.startsWith('/') && !value.startsWith('//')) return value
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : undefined } catch { return undefined }
}
function Status({ status }: { status: DashboardStatus }) { return <span className={`bd-status bd-status-${status}`}><span aria-hidden="true" />{statusLabels[status]}</span> }
function SourceFootnote({ source }: { source: DashboardSource }) {
  return <div className="bd-provenance"><p>{source.freshness}</p><span>{source.checkedAt ? `Checked ${checkedLabel(source.checkedAt)}` : 'Not checked'}{source.dataThrough && <> · Latest reported data {dateLabel(source.dataThrough, true)}</>}{source.timeZone && <> · {source.timeZone}</>}</span></div>
}
function SourceSetup({ source }: { source: DashboardSource }) {
  const href = sourceLink(source.setup.href), docs = sourceLink(source.setup.docsUrl)
  return <div className="bd-setup"><p>{source.statusDetail}</p>{source.setup.steps.length > 0 && <ol>{source.setup.steps.map((step, index) => <li key={index}>{step}</li>)}</ol>}
    {(href || docs) && <div className="bd-links">{href && <a href={href}>{source.id === 'mail' ? 'Open Wallace Shift Mail' : source.id === 'portal' ? 'Open client workspace' : 'Open provider'}</a>}{docs && <a href={docs} target="_blank" rel="noopener noreferrer">Provider documentation <span className="bd-sr-only">(opens a new tab)</span></a>}</div>}
  </div>
}
function SourceReport({ source, onConnections }: { source: DashboardSource; onConnections: () => void }) {
  const realtime = source.metrics.find(metric => metric.id === 'realtimeUsers')
  return <section className="bd-report" aria-labelledby={`bd-source-${source.id}`}><div className="bd-section-heading"><div><h2 id={`bd-source-${source.id}`}>{source.name}</h2>{source.account && <p>{source.account.label} · {source.account.id}</p>}</div><Status status={source.status} /></div>
    {source.status === 'connected' ? <>
      {source.metrics.length ? <Metrics source={source} exclude={['realtimeUsers']} /> : <p className="bd-empty-inline">The source responded without summary metrics.</p>}
      <TrendChart source={source} />
      {realtime && <aside className="bd-realtime"><div><strong>{metricValue(realtime)}</strong><span>Active users in the last 30 minutes</span></div><p>{realtime.note} This window is separate from the selected reporting period.</p></aside>}
      <ReportTable source={source} />
      {source.id === 'ga4' && <p className="bd-report-note">Source and medium breakdowns are not returned by this connection. Key events count events; session key event rate measures sessions with at least one key event.</p>}
      {source.id === 'search-console' && <p className="bd-report-note">Average position describes your topmost result across impressions, not a live keyword rank. Query rows may not add up to the chart totals because of reporting coverage and aggregation.</p>}
      <MetricDefinitions source={source} /><p className="bd-source-detail">{source.statusDetail}</p>
    </> : <div className="bd-report-empty"><p>{source.statusDetail}</p><button className="bd-text-button" onClick={onConnections}>View connection details <Icon name="arrow" /></button></div>}
    <SourceFootnote source={source} />
  </section>
}
function AccountOverview({ sources, kind, onOpen, compact = false }: { sources: DashboardSource[]; kind: 'ads' | 'social'; onOpen: (id: string) => void; compact?: boolean }) {
  return <section className={`bd-account-overview ${compact ? 'bd-account-compact' : ''}`}><div className="bd-section-heading"><div><h2>{kind === 'ads' ? 'Advertising accounts' : 'Social accounts'}</h2><p>{kind === 'ads' ? 'Spend stays in each account’s reported currency.' : 'Account totals remain separate across platforms.'}</p></div></div>
    {!sources.length && <p className="bd-empty-inline">No accounts were returned. Review Connections for supported sources.</p>}
    <div className="bd-account-list">{sources.map(source => {
      const primary = source.metrics.find(metric => metric.id === (kind === 'ads' ? 'spend' : 'views')) ?? source.metrics[0]
      const secondary = source.metrics.filter(metric => metric !== primary).slice(0, compact ? 1 : 3)
      return <article key={source.id}><div className="bd-account-title"><div><button className="bd-account-link" onClick={() => onOpen(source.id)}>{source.name}<Icon name="arrow" /></button><p>{source.account ? `${source.account.label} · ${source.account.id}` : source.status === 'connected' ? 'Configured account' : 'Account access required'}</p></div><Status status={source.status} /></div>
        {source.status === 'connected' ? <dl className="bd-account-metrics">{primary && <div><dt>{primary.label}</dt><dd>{metricValue(primary)}</dd></div>}{secondary.map(metric => <div key={metric.id}><dt>{metric.label}</dt><dd>{metricValue(metric)}</dd></div>)}</dl> : <p className="bd-account-message">{source.statusDetail}</p>}
        {!compact && <SourceFootnote source={source} />}
      </article>
    })}</div><p className="bd-report-note">{kind === 'ads' ? 'Attribution windows and conversion definitions differ. Account conversions are not added together.' : 'Content insights may include paid or boosted content. They are separate from advertising spend.'}</p>
  </section>
}
function InsightList({ snapshot, limit, onOpen }: { snapshot: DashboardSnapshot; limit?: number; onOpen: (source: DashboardSource) => void }) {
  const insights = limit ? snapshot.brief.slice(0, limit) : snapshot.brief
  if (!insights.length) return <p className="bd-empty-inline">No observations are available from the returned data yet.</p>
  return <ul className="bd-insights">{insights.map(insight => <li key={insight.id}><div className="bd-insight-heading"><h3>{insight.title}</h3>{insight.severity === 'attention' && <span>Review</span>}</div><p>{insight.detail}</p><div className="bd-insight-sources"><span>Evidence:</span>{insight.sourceIds.map(id => { const source = snapshot.sources.find(item => item.id === id); return source ? <button key={id} onClick={() => onOpen(source)}>{source.name}</button> : null })}</div></li>)}</ul>
}
function Overview({ snapshot, navigate, onOpenAgreements }: { snapshot: DashboardSnapshot; navigate: (view: View, account?: string) => void; onOpenAgreements: () => void }) {
  const source = (id: string) => snapshot.sources.find(item => item.id === id)
  const portal = source('portal'), ga4 = source('ga4'), seo = source('search-console')
  const cards = [
    { source: portal, metric: 'collected', label: 'Recorded payments', scope: 'Paid in this period', view: 'clients' as View },
    { source: ga4, metric: 'activeUsers', label: 'Website visitors', scope: 'Active users · GA4', view: 'web' as View },
    { source: ga4, metric: 'sessionKeyEventRate', label: 'Session key event rate', scope: 'Sessions with a key event', view: 'web' as View },
    { source: seo, metric: 'position', label: 'Average search position', scope: 'Google Search · Lower is higher', view: 'seo' as View },
  ]
  return <>
    <div className="bd-kpis">{cards.map(card => { const metric = card.source?.status === 'connected' ? card.source.metrics.find(item => item.id === card.metric) : undefined; return <button key={card.label} onClick={() => navigate(card.view)}><span>{card.label}<Icon name="arrow" /></span><strong>{metricValue(metric)}</strong><small>{metric ? card.scope : card.source ? card.source.status === 'connected' ? 'Not returned by this report' : statusLabels[card.source.status] : 'Source unavailable'}</small></button> })}</div>
    <div className="bd-overview-grid"><div className="bd-overview-column"><section className="bd-panel"><div className="bd-section-heading"><h2>Website activity</h2><button className="bd-text-button" onClick={() => navigate('web')}>Open report<Icon name="arrow" /></button></div>{ga4?.status === 'connected' ? <TrendChart source={ga4} compact /> : <p className="bd-empty-inline">{ga4?.statusDetail ?? 'No website report was returned.'}</p>}</section>
      <section className="bd-panel"><div className="bd-section-heading"><h2>Search visibility</h2><button className="bd-text-button" onClick={() => navigate('seo')}>Open report<Icon name="arrow" /></button></div>{seo?.status === 'connected' ? <TrendChart source={seo} compact /> : <p className="bd-empty-inline">{seo?.statusDetail ?? 'No search report was returned.'}</p>}</section>
      </div><div className="bd-overview-column"><div className="bd-panel"><AccountOverview sources={snapshot.sources.filter(item => item.category === 'advertising')} kind="ads" onOpen={id => navigate('ads', id)} compact /></div><section className="bd-panel"><div className="bd-section-heading"><h2>Payments & receivables</h2><button className="bd-text-button" onClick={onOpenAgreements}>Open billing<Icon name="arrow" /></button></div>{portal?.status === 'connected' ? <><dl className="bd-balance"><div><dt>Outstanding invoices</dt><dd>{metricValue(portal.metrics.find(item => item.id === 'outstanding'))}</dd></div><div><dt>Past due invoices</dt><dd>{metricValue(portal.metrics.find(item => item.id === 'overdueInvoices'))}</dd></div></dl><p className="bd-report-note">Current balances across all dates. Recorded payments include fees and recorded refunds; they are not profit or a reconciled bank balance.</p>{(portal.series || portal.seriesList?.length) ? <TrendChart source={portal} compact /> : null}</> : <p className="bd-empty-inline">{portal?.statusDetail ?? 'No payment report was returned.'}</p>}</section>
    </div></div>
    <section className="bd-report"><div className="bd-section-heading"><div><h2>Checks to make next</h2><p>Observations from the available data, with links to their sources.</p></div><button className="bd-text-button" onClick={() => navigate('brief')}>Full briefing<Icon name="arrow" /></button></div><InsightList snapshot={snapshot} limit={3} onOpen={item => navigate(reportingView(item), ['advertising', 'social'].includes(item.category) ? item.id : undefined)} /></section>
    <div className="bd-coverage"><span>{snapshot.sources.filter(item => item.status === 'connected').length} of {snapshot.sources.length} sources reporting. Missing data is not zero.</span><button className="bd-text-button" onClick={() => navigate('connections')}>Manage connections<Icon name="arrow" /></button></div>
  </>
}

export function BusinessDashboard({ onOpenAgreements, onPublishingBusyChange, engagements, onOpenClient }: { onOpenAgreements: () => void; onPublishingBusyChange?: (busy: boolean) => void; engagements?: Engagement[]; onOpenClient?: (id: string) => void }) {
  const [view, setView] = useState<View>(initialView)
  const [account, setAccount] = useState(new URLSearchParams(location.search).get('account') ?? '')
  const [days, setDays] = useState<DashboardDays>(30)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [revision, setRevision] = useState(0)
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null)
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState('')
  const [accessExpired, setAccessExpired] = useState(false)
  const [publishingVisited, setPublishingVisited] = useState(initialView() === 'publishing')
  const [publishingBusy, setPublishingBusy] = useState(false)
  const heading = useRef<HTMLHeadingElement>(null)
  const publishingBusyChanged = useCallback((next: boolean) => { setPublishingBusy(next); onPublishingBusyChange?.(next) }, [onPublishingBusyChange])
  useEffect(() => () => onPublishingBusyChange?.(false), [onPublishingBusyChange])
  const refresh = useCallback(() => { setBusy(true); setError(''); setRevision(value => value + 1) }, [])
  useEffect(() => {
    const controller = new AbortController()
    void (async () => {
      const response = await fetch(`/api/business-dashboard?days=${days}`, { credentials: 'same-origin', cache: 'no-store', signal: controller.signal })
      if (response.status === 401 || response.status === 403) { if (!controller.signal.aborted) { setSnapshot(null); setAccessExpired(true) }; throw new Error('Your owner session has ended. Sign in again to view business data.') }
      if (response.status === 429) throw new Error('The dashboard has been refreshed too often. Wait one minute, then try again.')
      const result = await response.json() as DashboardResponse
      if (!response.ok || !result.ok || !result.snapshot || result.snapshot.schemaVersion !== 1 || !Array.isArray(result.snapshot.sources)) throw new Error('The business dashboard could not refresh. Try again in a moment.')
      if (!controller.signal.aborted) { setSnapshot(result.snapshot); setAccessExpired(false) }
    })().catch(reason => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'The business dashboard could not refresh. Try again in a moment.') }).finally(() => { if (!controller.signal.aborted) setBusy(false) })
    return () => controller.abort()
  }, [days, revision])
  const reporting = view !== 'publishing' && view !== 'clients'
  useEffect(() => {
    if (!autoRefresh || accessExpired || !reporting) return
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') refresh() }, 60_000)
    return () => window.clearInterval(timer)
  }, [autoRefresh, accessExpired, refresh, reporting])
  function navigate(next: View, nextAccount = '') {
    if (publishingBusy) return
    if (next === 'publishing') setPublishingVisited(true)
    setView(next); setAccount(nextAccount)
    const url = new URL(location.href); url.searchParams.set('report', next)
    if (nextAccount) url.searchParams.set('account', nextAccount); else url.searchParams.delete('account')
    history.replaceState(null, '', url.pathname + url.search + url.hash)
    requestAnimationFrame(() => heading.current?.focus())
  }
  function download() {
    if (!snapshot) return
    const url = URL.createObjectURL(new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' }))
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `wallace-shift-business-${snapshot.range.endDate}.json`; anchor.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  const sources = snapshot?.sources ?? []
  const channelSources = sources.filter(source => source.category === (view === 'ads' ? 'advertising' : 'social'))
  const detailSource = ['ads', 'social'].includes(view) ? channelSources.find(source => source.id === account) : undefined
  const single = sources.find(source => source.id === (view === 'web' ? 'ga4' : 'search-console'))
  const reportTimeZone = detailSource?.timeZone ?? (view === 'web' || view === 'seo' ? single?.timeZone : undefined)
  return <section className="business-dashboard" aria-label="Wallace Shift business dashboard">
    <aside className="bd-sidebar"><div className="bd-workspace-name"><strong>Wallace Shift</strong><span>Business workspace</span></div><label className="bd-mobile-nav"><span>Page</span><select value={view} disabled={publishingBusy} onChange={event => navigate(event.target.value as View)}>{navigation.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label><nav aria-label="Business dashboard">{navigation.map(item => <button key={item.id} type="button" disabled={publishingBusy} aria-current={view === item.id ? 'page' : undefined} onClick={() => navigate(item.id)}><Icon name={item.icon} /><span>{item.label}</span>{item.id === 'connections' && sources.some(source => source.status === 'error') && <span className="bd-nav-attention" aria-label="Connection needs attention" />}</button>)}</nav><div className="bd-workspace-links"><button type="button" onClick={onOpenAgreements} disabled={publishingBusy}>Agreements & billing<Icon name="arrow" /></button></div></aside>
    <div className="bd-content"><header className="bd-heading"><div>{detailSource && <button className="bd-text-button bd-back" onClick={() => navigate(view)}>Back to {titles[view]}</button>}<h1 ref={heading} tabIndex={-1}>{detailSource?.name ?? titles[view]}</h1><p>{detailSource?.description ?? descriptions[view]}</p></div>
      {reporting && <div className="bd-toolbar"><label className="bd-period"><span className="bd-sr-only">Reporting period</span><select value={days} disabled={accessExpired} onChange={event => { setDays(Number(event.target.value) as DashboardDays); setSnapshot(null); setBusy(true); setError('') }}><option value={7}>Last 7 complete days</option><option value={30}>Last 30 complete days</option><option value={90}>Last 90 complete days</option></select></label><button className="bd-button bd-refresh" title="Refresh reports" aria-label="Refresh reports" onClick={refresh} disabled={busy || accessExpired}><Icon name="refresh" /></button><details className="bd-refresh-options"><summary>Refresh options{autoRefresh && <span className="bd-auto-on">On</span>}</summary><div><label><input type="checkbox" checked={autoRefresh} onChange={event => setAutoRefresh(event.target.checked)} disabled={accessExpired} />Refresh every minute</label><p>Runs while a reporting page is visible. Provider data can arrive later.</p></div></details></div>}
    </header>
      {reporting && <div className="bd-report-context"><span>{snapshot ? `${dateLabel(snapshot.range.startDate, true)} to ${dateLabel(snapshot.range.endDate, true)} · ${reportTimeZone ?? 'Source timezones apply'}` : 'Checking reporting dates'}</span><span role="status">{busy ? 'Refreshing reports…' : snapshot ? `Checked ${checkedLabel(snapshot.generatedAt)}` : 'No snapshot available'}</span></div>}
      {error && view !== 'publishing' && (view !== 'clients' || accessExpired) && <div className="bd-error" role="alert"><p>{error}{snapshot && <> Showing the previous snapshot from {checkedLabel(snapshot.generatedAt)}.</>}</p>{accessExpired ? <a href="/client-portal?view=business">Sign in to the owner account</a> : <button className="bd-text-button" onClick={refresh} disabled={busy}>Try again</button>}</div>}
      {!snapshot && busy && reporting && <div className="bd-loading" role="status"><span className="bd-loading-line" /><h2>Checking your business data</h2><p>Loading available reports and checking each connection.</p></div>}
      {view === 'clients' && !accessExpired && <ClientsView engagements={engagements} onOpenAgreements={onOpenAgreements} onOpenClient={onOpenClient} />}
      {publishingVisited && <div hidden={view !== 'publishing'}><PostingView active={view === 'publishing'} onBusyChange={publishingBusyChanged} /></div>}
      {view !== 'publishing' && snapshot && <>
        {view === 'overview' && <Overview snapshot={snapshot} navigate={navigate} onOpenAgreements={onOpenAgreements} />}
        {(view === 'web' || view === 'seo') && (single ? <SourceReport key={single.id} source={single} onConnections={() => navigate('connections')} /> : <p className="bd-empty-inline">This source was not returned. Review Connections and refresh.</p>)}
        {view === 'email' && <EmailView source={sources.find(source => source.id === 'mail')} />}
        {(view === 'ads' || view === 'social') && (detailSource ? <SourceReport key={detailSource.id} source={detailSource} onConnections={() => navigate('connections')} /> : <AccountOverview sources={channelSources} kind={view} onOpen={id => navigate(view, id)} />)}
        {view === 'connections' && <div className="bd-connections"><div className="bd-connection-guide"><p>Connected means the source returned data. Setup needed means reporting access is missing. Reporting credentials do not grant publishing access.</p><p>Connections are currently configured by the operator. Each source represents one configured account. Refreshing cannot grant access or remove provider delays.</p></div>{sources.map(source => <details key={source.id} className="bd-connection"><summary><div><strong>{source.name}</strong><span>{source.description}</span></div><Status status={source.status} /><span className="bd-disclosure" aria-hidden="true" /></summary><SourceSetup source={source} /><SourceFootnote source={source} /></details>)}</div>}
        {view === 'brief' && <><div className="bd-brief-intro"><p>Previously called Agent briefing. This summary applies rules to the returned reports. No AI model is generating advice, and no agent is taking action.</p><button className="bd-button" onClick={download}><Icon name="download" />Download source snapshot</button></div><section className="bd-report"><div className="bd-section-heading"><h2>Observations & suggested checks</h2></div><InsightList snapshot={snapshot} onOpen={source => navigate(reportingView(source), ['advertising', 'social'].includes(source.category) ? source.id : undefined)} /></section><details className="bd-definitions"><summary>Using this snapshot with an agent</summary><p>{snapshot.agentPolicy.note}</p><p>The export contains these reports and source status. Review it before sharing externally. Sending messages, publishing, spending and modifying records are separate actions.</p></details></>}
        <footer className="bd-footer"><span>{snapshot.environment === 'production' ? 'Owner workspace' : `${snapshot.environment === 'development' ? 'Local development' : 'Preview'} environment`} · Source reporting delays apply</span><span>{autoRefresh && reporting ? 'Automatic refresh while visible' : 'Refresh on request'}</span></footer>
      </>}
    </div>
  </section>
}
