import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react'
import type { DashboardConfig, DashboardDataSource, DashboardSnapshot, EventFilter, PropertyRecord, Scenario, WorkspaceActions } from './types'
import { filterEvents, matchProperties, summarize, formatEventTime } from './domain'
import { Icon } from './components/Icon'
import { EmptyState, EVIDENCE_LABELS, RelationshipBadge, SectionHeading, shortDate, StatusBadge, WeatherBadge } from './components/ui'
import { StormMap } from './components/StormMap'
import { PropertyPanel } from './components/PropertyPanel'
import { Connections } from './components/Connections'

const NAV = [
  { id: 'overview', label: 'Overview', icon: 'overview' },
  { id: 'storm-map', label: 'Storm map', icon: 'map' },
  { id: 'customers', label: 'Customers & prospects', icon: 'people' },
  { id: 'follow-ups', label: 'Follow-ups', icon: 'list' },
  { id: 'connections', label: 'Connections', icon: 'plug' },
] as const
const TITLES: Record<string, [string, string]> = {
  overview: ['Your service area, in focus.', 'Turn recent weather into thoughtful customer follow-up.'],
  'storm-map': ['Find your next conversation.', 'Explore weather, find nearby properties, and plan an inspection.'],
  customers: ['Know the homes you serve.', 'Your customers, website inquiries, and prospective properties in one place.'],
  'follow-ups': ['From first contact to inspection.', 'A clear next step for every property on your list.'],
  connections: ['Built around your business.', 'Choose the services your company needs, using accounts you own.'],
}
const subscribeHash = (onChange: () => void) => { window.addEventListener('hashchange', onChange); return () => window.removeEventListener('hashchange', onChange) }
const readView = () => NAV.some(item => item.id === window.location.hash.slice(1)) ? window.location.hash.slice(1) : 'overview'

export function DashboardApp({ config, dataSource }: { config: DashboardConfig; dataSource: DashboardDataSource }) {
  const [scenarioId, setScenarioId] = useState(config.defaultScenarioId)
  const scenario = config.scenarios.find(item => item.id === scenarioId) ?? config.scenarios[0]
  if (!scenario) return <p>No service area is configured.</p>
  return <DashboardWorkspace key={`${config.company}:${scenario.id}`} config={config} dataSource={dataSource} scenario={scenario} onScenario={setScenarioId} />
}

function DashboardWorkspace({ config, dataSource, scenario, onScenario }: { config: DashboardConfig; dataSource: DashboardDataSource; scenario: Scenario; onScenario: (id: string) => void }) {
  const view = useSyncExternalStore(subscribeHash, readView, () => 'overview')
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null)
  const [loadError, setLoadError] = useState('')
  const [reload, setReload] = useState(0)
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<EventFilter>({ type: 'all', days: 7 })
  const [radius, setRadius] = useState(3)
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null)
  const [customersVisible, setCustomersVisible] = useState(true)
  const [prospectsVisible, setProspectsVisible] = useState(true)
  const [checkedIds, setCheckedIds] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [relationship, setRelationship] = useState('all')
  const [followFilter, setFollowFilter] = useState('all')

  useEffect(() => {
    let active = true
    dataSource.load(scenario.id).then(data => { if (active) { setSnapshot(data); setLoadError('') } }).catch(reason => { if (active) setLoadError(reason instanceof Error ? reason.message : 'The sample records could not be loaded.') })
    return () => { active = false }
  }, [dataSource, scenario.id, reload])

  const run = async (operation: () => Promise<DashboardSnapshot>, message: string) => {
    if (busyRef.current) return false
    busyRef.current = true
    setBusy(true); setError(''); setNotice('')
    try { setSnapshot(await operation()); setLoadError(''); setNotice(message); return true }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'That change could not be saved. Try again.'); return false }
    finally { busyRef.current = false; setBusy(false) }
  }
  const actions: WorkspaceActions = {
    add: (ids, events) => run(() => dataSource.addToWorklist(scenario.id, ids, events, radius), 'Follow-up list updated. Duplicate properties are kept together.'),
    update: (id, status, note) => run(() => dataSource.updateFollowUp(scenario.id, id, status, note), 'Follow-up saved in this demo.'),
    schedule: (id, inspection) => run(() => dataSource.scheduleInspection(scenario.id, id, inspection), 'Sample inspection scheduled. No invitation was sent.'),
    enrich: id => run(() => dataSource.enrichProperty(scenario.id, id), 'Fictional contact details added for this demonstration.'),
    importSample: () => run(() => dataSource.importSampleCsv(scenario.id), 'Sample CSV imported. The records are available in Customers & prospects.'),
    copy: async text => {
      setError(''); setNotice('')
      try { await navigator.clipboard.writeText(text); setNotice('Invitation copied. Nothing was sent.'); return true }
      catch { setError('Clipboard unavailable. Select and copy the invitation text manually.'); return false }
    },
  }
  const reset = () => run(async () => {
    await dataSource.reset()
    const data = await dataSource.load(scenario.id)
    setSelectedPropertyId(null); setSelectedEventId(null); setCheckedIds([]); setFilter({ type: 'all', days: 7 }); setRadius(3); setSearch(''); setRelationship('all'); setFollowFilter('all'); setCustomersVisible(true); setProspectsVisible(true)
    return data
  }, 'Demo reset. All sample records are back to their starting point.')

  const events = snapshot ? filterEvents(snapshot.events, filter, scenario) : []
  const activeEventId = events.some(event => event.id === selectedEventId) ? selectedEventId : null
  const activeEvents = activeEventId ? events.filter(event => event.id === activeEventId) : events
  const allMatches = snapshot ? matchProperties(snapshot.properties, events, radius, scenario.serviceArea) : []
  const matches = snapshot ? matchProperties(snapshot.properties, activeEvents, radius, scenario.serviceArea).filter(match => match.property.relationship === 'prospect' ? prospectsVisible : customersVisible) : []
  const overviewEvents = snapshot ? filterEvents(snapshot.events, { type: 'all', days: 7 }, scenario) : []
  const overviewMatches = snapshot ? matchProperties(snapshot.properties, overviewEvents, 3, scenario.serviceArea) : []
  const summary = snapshot ? summarize({ ...snapshot, events: view === 'overview' ? overviewEvents : events }, view === 'overview' ? overviewMatches : allMatches) : null
  const property = snapshot?.properties.find(item => item.id === selectedPropertyId)
  const selectedMatch = property && snapshot ? matchProperties([property], view === 'storm-map' ? activeEvents : filterEvents(snapshot.events, { type: 'all', days: 30 }, scenario), radius, scenario.serviceArea)[0] : undefined
  const followIds = new Set(snapshot?.followUps.map(item => item.propertyId))
  const selectableIds = matches.filter(match => !match.property.doNotContact && !followIds.has(match.property.id)).map(match => match.property.id)
  const checked = checkedIds.filter(id => selectableIds.includes(id))
  const selectEvent = useCallback((id: string) => { setSelectedEventId(id); window.location.hash = 'storm-map' }, [])
  const selectProperty = useCallback((id: string) => setSelectedPropertyId(id), [])
  const mapProps = { config, scenario, events, matches, selectedEventId: activeEventId, selectedPropertyId, onSelectEvent: selectEvent, onSelectProperty: selectProperty, showCustomers: customersVisible, showProspects: prospectsVisible, radiusMiles: radius }
  const customerRows = snapshot?.properties.filter(item => (relationship === 'all' || item.relationship === relationship) && `${item.address} ${item.city} ${item.contact?.name ?? ''}`.toLowerCase().includes(search.toLowerCase())) ?? []
  const title = TITLES[view] ?? TITLES.overview

  const propertyButton = (item: PropertyRecord) => <button className="rd-address-button" onClick={() => selectProperty(item.id)}><strong>{item.address}</strong><span>{item.city} · {item.postalCode}</span></button>
  return <div className="rd-app" style={{ '--rd-accent': config.accent } as CSSProperties}>
    <a className="rd-skip" href="#rd-main" onClick={event => { event.preventDefault(); const main = document.getElementById('rd-main'); main?.focus(); main?.scrollIntoView() }}>Skip to dashboard</a>
    <aside className="rd-sidebar">
      <a className="rd-brand" href="#overview"><span className="rd-brand-symbol"><Icon name="home" size={25} /></span><span>{config.company}<small>CLIENT WORKSPACE</small></span></a>
      <div className="rd-sidebar-label">YOUR BUSINESS</div>
      <nav aria-label="Dashboard">{NAV.map(item => <a key={item.id} href={`#${item.id}`} aria-current={view === item.id ? 'page' : undefined}><Icon name={item.icon} size={19} /><span>{item.label}</span>{item.id === 'follow-ups' && summary && summary.pending > 0 && <b>{summary.pending}</b>}</a>)}</nav>
      <div className="rd-sidebar-bottom"><div className="rd-sidebar-guide"><span className="rd-demo-dot" />EXPLORE THE DEMO<h3>A storm. A conversation.<br />A new opportunity.</h3><p>Explore sample weather and take a property through to inspection.</p><a href="#storm-map">Explore storm map <Icon name="arrow" size={16} /></a></div><div className="rd-account"><span>{config.initials}</span><div>{config.company}<small>Sample company workspace</small></div></div></div>
    </aside>
    <div className="rd-content">
      <header className="rd-topbar"><div className="rd-breadcrumb">Workspace <Icon name="chevron" size={12} /><strong>{NAV.find(item => item.id === view)?.label}</strong></div><div className="rd-topbar-controls"><span className="rd-territory-label"><Icon name="pin" size={15} />Service area</span><select aria-label="Sample service area" value={scenario.id} onChange={event => onScenario(event.target.value)} disabled={busy}>{config.scenarios.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select><span className="rd-avatar" aria-label="Sample account">{config.initials}</span></div></header>
      <div className="rd-demo-banner"><span><b>INTERACTIVE DEMO</b><span>Sample weather & properties. Nothing is sent.</span></span><button onClick={reset} disabled={busy}><Icon name="reset" size={13} />Reset demo</button></div>
      <main id="rd-main" className="rd-main" tabIndex={-1}>
        <div className="rd-page-heading"><div><p className="rd-eyebrow">{scenario.region} <span>/</span> {view === 'overview' ? 'BUSINESS OVERVIEW' : NAV.find(item => item.id === view)?.label.toUpperCase()}<span className="rd-mobile-date"> · {shortDate(scenario.referenceDate, scenario.timezone)}, {new Date(scenario.referenceDate).getUTCFullYear()} demo</span></p><h1>{title[0]}</h1><p>{title[1]}</p></div><div className="rd-date"><Icon name="calendar" size={16} /><span>{shortDate(scenario.referenceDate, scenario.timezone)}, {new Date(scenario.referenceDate).getUTCFullYear()}<small>Fixed demo date</small></span></div></div>
        <div className="rd-notice-area" aria-live="polite">{notice && <div className="rd-notice"><Icon name="check" size={17} />{notice}<button onClick={() => setNotice('')} aria-label="Dismiss notification"><Icon name="close" size={15} /></button></div>}</div>
        {error && <div className="rd-error" role="alert">{error}<button className="rd-text-button" onClick={() => setError('')}>Dismiss</button></div>}
        {loadError ? <div className="rd-panel"><EmptyState title="Sample data is unavailable">{loadError}</EmptyState><button className="rd-btn rd-btn-primary" onClick={() => { setLoadError(''); setReload(value => value + 1) }}>Try again</button></div> : !snapshot || !summary ? <div className="rd-loading" role="status"><span className="rd-spinner" />Loading your sample workspace…</div> : <>
          {view === 'overview' && <>
            <div className="rd-stats">{[
              { label: 'Recent weather events', value: summary.events, detail: 'In the last 7 demo days', icon: 'wind', trend: 'Weather activity' },
              { label: 'Customers near weather', value: summary.customers, detail: 'Existing relationships to check on', icon: 'people', trend: 'Customer care' },
              { label: 'Pending follow-ups', value: summary.pending, detail: 'Ready for the next conversation', icon: 'list', trend: 'Your worklist' },
              { label: 'Inspections scheduled', value: summary.scheduled, detail: 'Sample appointments on the calendar', icon: 'calendar', trend: 'Next steps' },
            ].map(stat => <div className="rd-stat" key={stat.label}><div><p>{stat.label}</p><Icon name={stat.icon} size={19} /></div><strong>{stat.value.toString().padStart(2, '0')}</strong><small>{stat.detail}</small><span>{stat.trend}<Icon name="arrow" size={13} /></span></div>)}</div>
            <div className="rd-overview-grid"><section className="rd-panel rd-map-panel"><SectionHeading eyebrow="WEATHER & OPPORTUNITY" title="A view of your territory"><a className="rd-text-link" href="#storm-map">Open storm map <Icon name="arrow" size={15} /></a></SectionHeading><StormMap {...mapProps} onSelectEvent={id => { setFilter({ type: 'all', days: 7 }); selectEvent(id) }} events={overviewEvents} matches={overviewMatches} selectedEventId={null} showCustomers showProspects radiusMiles={3} /><div className="rd-map-caption"><span><i className="rd-key-dot" />Existing customers & leads</span><span><i className="rd-key-dot rd-key-prospect" />Prospect properties</span><small>Illustrative weather · Not confirmed roof damage</small></div></section>
              <section className="rd-panel rd-activity-panel"><SectionHeading eyebrow="IN YOUR AREA" title="Recent weather" /><div className="rd-weather-feed">{filterEvents(snapshot.events, { type: 'all', days: 7 }, scenario).slice(0, 4).map(event => <button className="rd-weather-row" key={event.id} onClick={() => { setFilter({ type: 'all', days: 7 }); selectEvent(event.id) }}><WeatherBadge event={event} /><span><strong>{event.title}</strong><small>{formatEventTime(event.occurredAt, scenario.timezone)}</small><span className="rd-weather-meta">{event.magnitude ?? 'Magnitude unavailable'} · {EVIDENCE_LABELS[event.evidence]}</span></span><Icon name="chevron" size={15} /></button>)}</div><div className="rd-tip"><Icon name="shield" size={19} /><p><strong>Start with the people who know you.</strong>Check in with existing customers before building a new prospect list.</p></div></section></div>
            <section className="rd-panel rd-next-panel"><SectionHeading eyebrow="KEEP THINGS MOVING" title="Your next follow-ups"><a className="rd-text-link" href="#follow-ups">View worklist <Icon name="arrow" size={15} /></a></SectionHeading><div className="rd-next-grid">{snapshot.followUps.filter(item => ['to-contact', 'contacted', 'scheduled'].includes(item.status)).slice(0, 3).map(item => { const p = snapshot.properties.find(p => p.id === item.propertyId); return p ? <button className="rd-next-item" key={item.id} onClick={() => selectProperty(p.id)}><span className="rd-property-symbol"><Icon name="home" size={20} /></span><span><strong>{p.contact?.name ?? p.address}</strong><small>{p.address}</small><StatusBadge value={item.status} /></span><Icon name="arrow" size={16} /></button> : null })}</div></section>
          </>}
          {view === 'storm-map' && <>
            <section className="rd-filter-bar" aria-label="Map filters"><label>Weather type<select value={filter.type} onChange={event => setFilter(value => ({ ...value, type: event.target.value as EventFilter['type'] }))}><option value="all">All weather</option><option value="hail">Hail</option><option value="wind">Severe wind</option><option value="tornado">Tornado</option><option value="hurricane">Hurricane</option></select></label><label>Time period<select value={filter.days} onChange={event => setFilter(value => ({ ...value, days: Number(event.target.value) as EventFilter['days'] }))}><option value={1}>Last demo day</option><option value={7}>Last 7 demo days</option><option value={30}>Last 30 demo days</option></select></label><label>Report search radius<select value={radius} onChange={event => setRadius(Number(event.target.value))}>{[1, 3, 5].map(value => <option key={value} value={value}>{value} mile{value > 1 ? 's' : ''}</option>)}</select></label><div className="rd-layer-toggles"><label><input type="checkbox" checked={customersVisible} onChange={event => setCustomersVisible(event.target.checked)} /><i className="rd-key-dot" />Customers & leads</label><label><input type="checkbox" checked={prospectsVisible} onChange={event => setProspectsVisible(event.target.checked)} /><i className="rd-key-dot rd-key-prospect" />Prospects</label></div></section>
            <div className="rd-event-strip" aria-label="Weather events"><button className={!activeEventId ? 'is-active' : ''} onClick={() => setSelectedEventId(null)}><Icon name="map" size={18} /><span>All events<small>{events.length} sample events</small></span></button>{events.map(event => <button key={event.id} className={activeEventId === event.id ? 'is-active' : ''} onClick={() => setSelectedEventId(event.id)} aria-pressed={activeEventId === event.id}><WeatherBadge event={event} /><span>{event.title}<small>{EVIDENCE_LABELS[event.evidence]} · {shortDate(event.occurredAt, scenario.timezone)}</small></span></button>)}</div>
            {activeEventId && <div className="rd-event-detail"><strong>{activeEvents[0].title}</strong><span>{activeEvents[0].description}</span><small>{activeEvents[0].source} · {formatEventTime(activeEvents[0].occurredAt, scenario.timezone)} · {activeEvents[0].magnitude ?? 'Magnitude unavailable'}</small></div>}
            <div className="rd-storm-grid"><section className="rd-panel rd-map-panel"><StormMap {...mapProps} /><div className="rd-map-caption"><small>Report radius is a search aid. Warnings do not establish occurred weather. No layer confirms roof damage.</small></div></section><section className="rd-panel rd-results-panel"><div className="rd-results-heading"><p className="rd-eyebrow">MATCHED TO WEATHER</p><h2>{matches.length} nearby properties</h2><p>Within your selected service area</p></div><div className="rd-selection-bar"><label><input type="checkbox" aria-label="Select all eligible properties" checked={selectableIds.length > 0 && checked.length === selectableIds.length} disabled={!selectableIds.length || busy} onChange={event => setCheckedIds(event.target.checked ? selectableIds : [])} />Select eligible</label><span>{checked.length} selected</span></div><div className="rd-property-results">{matches.length ? matches.map(match => <div className="rd-property-result" key={match.property.id}><input type="checkbox" aria-label={`Select ${match.property.address}`} checked={checked.includes(match.property.id)} disabled={!selectableIds.includes(match.property.id) || busy} onChange={event => setCheckedIds(ids => event.target.checked ? [...ids, match.property.id] : ids.filter(id => id !== match.property.id))} /><button onClick={() => selectProperty(match.property.id)}><RelationshipBadge value={match.property.relationship} /><strong>{match.property.address}</strong><span>{match.property.contact?.name ?? 'Contact details unavailable'}</span><small>{match.matches[0].reason}</small>{followIds.has(match.property.id) && <em>Already in follow-ups</em>}{match.property.doNotContact && <em>Do not contact</em>}</button><Icon name="chevron" size={14} /></div>) : <EmptyState title="No matching properties">Try another event, time period, radius, or property layer. Warning areas alone do not create matches.</EmptyState>}</div><div className="rd-results-footer"><button className="rd-btn rd-btn-primary" disabled={!checked.length || busy} onClick={async () => { if (await actions.add(checked, activeEvents.map(event => event.id))) setCheckedIds([]) }}><Icon name="plus" size={17} />Add {checked.length || ''} to follow-ups</button><small>Review each property before reaching out.</small></div></section></div>
          </>}
          {view === 'customers' && <section className="rd-panel"><SectionHeading title="Customers & prospects"><button className="rd-btn rd-btn-secondary" disabled={busy || snapshot.sampleImported || !config.features.sampleImport} onClick={() => actions.importSample()}><Icon name="upload" size={16} />{snapshot.sampleImported ? 'Sample imported' : 'Import sample CSV'}</button></SectionHeading><div className="rd-table-toolbar"><label className="rd-search"><Icon name="search" size={17} /><input aria-label="Search customers and properties" placeholder="Search name, address, or city…" value={search} onChange={event => setSearch(event.target.value)} /></label><select aria-label="Customer relationship" value={relationship} onChange={event => setRelationship(event.target.value)}><option value="all">All relationships</option><option value="customer">Existing customers</option><option value="lead">Website leads</option><option value="prospect">Prospect properties</option></select><span>{customerRows.length} records</span></div><div className="rd-table-scroll"><table className="rd-table"><thead><tr><th>Property</th><th>Relationship</th><th>Contact</th><th>Source</th><th>Follow-up</th><th><span className="rd-sr-only">View</span></th></tr></thead><tbody>{customerRows.map(item => <tr key={item.id}><td>{propertyButton(item)}</td><td><RelationshipBadge value={item.relationship} /></td><td><strong>{item.contact?.name ?? 'Not available'}</strong><small>{item.contact?.email ?? item.contact?.phone ?? 'Optional contact lookup'}</small></td><td><span className="rd-source">{item.source}</span></td><td>{item.doNotContact ? <StatusBadge value="do-not-contact" /> : snapshot.followUps.find(f => f.propertyId === item.id) ? <StatusBadge value={snapshot.followUps.find(f => f.propertyId === item.id)!.status} /> : <span className="rd-muted">Not on list</span>}</td><td><button className="rd-icon-button" aria-label={`View ${item.address}`} onClick={() => selectProperty(item.id)}><Icon name="arrow" size={16} /></button></td></tr>)}</tbody></table>{!customerRows.length && <EmptyState title="No records found">Try a different name, address, or relationship filter.</EmptyState>}</div><div className="rd-table-footnote"><Icon name="shield" size={14} />Fictional records for demonstration. Import uses a bundled sample CSV; no real customer file is uploaded.</div></section>}
          {view === 'follow-ups' && <>
            <section className="rd-panel"><SectionHeading title="Your inspection worklist"><a className="rd-btn rd-btn-secondary" href="#storm-map"><Icon name="plus" size={16} />Find properties</a></SectionHeading><div className="rd-table-toolbar"><label>Status<select aria-label="Filter follow-up status" value={followFilter} onChange={event => setFollowFilter(event.target.value)}><option value="all">All statuses</option><option value="to-contact">To contact</option><option value="contacted">Contacted</option><option value="scheduled">Inspection scheduled</option><option value="completed">Completed</option><option value="not-interested">Not interested</option><option value="do-not-contact">Do not contact</option></select></label><span>Open a record to update its next step.</span></div><div className="rd-table-scroll"><table className="rd-table"><thead><tr><th>Property</th><th>Contact</th><th>Status</th><th>Notes</th><th><span className="rd-sr-only">Manage</span></th></tr></thead><tbody>{snapshot.followUps.filter(item => followFilter === 'all' || item.status === followFilter).map(item => { const p = snapshot.properties.find(p => p.id === item.propertyId); return p ? <tr key={item.id}><td>{propertyButton(p)}</td><td>{p.contact?.name ?? 'Contact details unavailable'}</td><td><StatusBadge value={item.status} /></td><td><span className="rd-note-cell">{item.note || 'No notes yet'}</span></td><td><button className="rd-text-button" onClick={() => selectProperty(p.id)}>Manage <Icon name="arrow" size={14} /></button></td></tr> : null })}</tbody></table>{!snapshot.followUps.some(item => followFilter === 'all' || item.status === followFilter) && <EmptyState title="No follow-ups here yet">Select properties on the storm map to start a worklist.</EmptyState>}</div></section>
            <section className="rd-panel rd-appointments"><SectionHeading eyebrow="ON THE CALENDAR" title="Upcoming sample inspections"><span className="rd-muted">{scenario.timezone.replaceAll('_', ' ')}</span></SectionHeading><div className="rd-appointment-grid">{snapshot.inspections.filter(item => item.status === 'scheduled').map(item => { const p = snapshot.properties.find(p => p.id === item.propertyId); return p ? <button key={item.id} className="rd-appointment" onClick={() => selectProperty(p.id)}><span className="rd-calendar-tile"><small>{new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' }).format(new Date(`${item.date}T12:00:00Z`))}</small>{item.date.slice(-2)}</span><span><strong>{p.address}</strong><small>{item.time} · {item.assignee}</small><span>Free roof inspection</span></span><Icon name="chevron" size={16} /></button> : null })}</div>{!snapshot.inspections.some(item => item.status === 'scheduled') && <EmptyState title="Room for your next inspection">Open a follow-up to schedule a sample appointment.</EmptyState>}</section>
          </>}
          {view === 'connections' && <Connections snapshot={snapshot} config={config} actions={actions} busy={busy} onSelectProperty={selectProperty} />}
        </>}
        <footer className="rd-footer"><span><Icon name="shield" size={13} />Sample workspace · Resets on reload</span><span>Weather indicates exposure. An inspection establishes roof condition.</span></footer>
      </main>
    </div>
    {property && snapshot && <PropertyPanel key={property.id} property={property} snapshot={snapshot} config={config} scenario={scenario} match={selectedMatch} actions={actions} busy={busy} onClose={() => setSelectedPropertyId(null)} />}
  </div>
}
