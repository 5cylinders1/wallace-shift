import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { cadenceLabel, money, type Engagement } from '../client-portal/model'
import { LinkedInPublisher } from './LinkedInPublisher'
import type { DashboardSource } from './model'
import type { PublishingResponse, PublishingSnapshot } from './publishing-model'
import './operations-views.css'

const engagementStates: Record<Engagement['state'], string> = { draft: 'Draft', issued: 'Issued', complete: 'Complete', canceled: 'Canceled' }

function checkedLabel(value: string | null | undefined): string {
  if (!value) return 'Not checked'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Not checked' : date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })
}

export function EmailView({ source }: { source?: DashboardSource }) {
  const connected = source?.status === 'connected'
  const activity = connected ? source.metrics.filter(metric => ['sent', 'needsReview'].includes(metric.id) && Number.isFinite(metric.value) && metric.value >= 0) : []
  const largest = Math.max(1, ...activity.map(metric => metric.value))
  return <div className="bdo-view">
    <section className="bdo-section" aria-labelledby="bdo-email-title">
      <div className="bdo-section-heading">
        <div><h2 id="bdo-email-title">Outgoing mail</h2><p>Write a message, use a saved signature and review recent sending activity.</p></div>
        <a className="bd-button bd-button-primary" href="/mail" target="_blank" rel="noopener noreferrer">Open mail composer</a>
      </div>
      <p className="bdo-workspace-note">Opens the separate mail workspace in a new tab. It uses its own Wallace Shift email sign in.</p>
      {connected && activity.length > 0 ? <>
        <dl className="bdo-mail-activity" aria-label="Outgoing mail activity in the selected reporting period">
          {activity.map(metric => <div key={metric.id}>
            <dt>{metric.label}</dt><dd>{metric.value.toLocaleString('en-US')}<span>{metric.note}</span></dd>
            <div className={`bdo-bar-track${metric.id === 'needsReview' ? ' bdo-bar-attention' : ''}`} aria-hidden="true"><span style={{ width: `${metric.value / largest * 100}%` }} /></div>
          </div>)}
        </dl>
        <p className="bdo-source-note">{source.statusDetail}</p>
      </> : <div className="bdo-empty" role="status"><h3>{source?.status === 'error' ? 'Sending activity is unavailable' : 'Connect your mail session'}</h3><p>{source?.statusDetail ?? 'Open the mail workspace and sign in to see your recent outgoing activity. Then refresh this dashboard.'}</p></div>}
      <div className="bdo-provenance"><p>{source?.freshness ?? 'Only recent outgoing send records are available here. Delivery, opens and replies are not tracked.'}</p><p>Checked {checkedLabel(source?.checkedAt)}</p></div>
    </section>
    <section className="bdo-section" aria-labelledby="bdo-mail-workspace-title">
      <h2 id="bdo-mail-workspace-title">What the mail workspace includes</h2>
      <dl className="bdo-capabilities">
        <div><dt>Compose and send</dt><dd>Rich text, To, Cc, Bcc and file attachments from your approved sending identity.</dd></div>
        <div><dt>Drafts and signatures</dt><dd>Local drafts and saved signatures for the addresses you can send from.</dd></div>
        <div><dt>Recent sending history</dt><dd>Review up to 50 retained sends for your signed in account. Accepted for sending does not confirm delivery.</dd></div>
        <div><dt>Receiving and replies</dt><dd>Replies go to your existing mailbox. Inbox messages, conversation threads and mailbox synchronization are not available here.</dd></div>
      </dl>
    </section>
  </div>
}

type ClientGroup = { key: string; email: string; names: string[]; engagements: Engagement[] }

export function ClientsView({ engagements, onOpenAgreements, onOpenClient }: {
  engagements?: Engagement[]
  onOpenAgreements: () => void
  onOpenClient?: (id: string) => void
}) {
  const [query, setQuery] = useState('')
  const [includeArchived, setIncludeArchived] = useState(false)
  const groups = useMemo(() => {
    const contacts = new Map<string, ClientGroup>()
    for (const engagement of engagements ?? []) {
      if (!includeArchived && engagement.archivedAt) continue
      const key = engagement.email.trim().toLowerCase() || engagement.id
      const group = contacts.get(key) ?? { key, email: engagement.email, names: [], engagements: [] }
      if (!group.names.includes(engagement.client)) group.names.push(engagement.client)
      group.engagements.push(engagement)
      contacts.set(key, group)
    }
    const search = query.trim().toLowerCase()
    return [...contacts.values()].filter(group => !search || [group.email, ...group.names, ...group.engagements.map(engagement => engagement.title)].some(value => value.toLowerCase().includes(search))).sort((a, b) => a.names[0].localeCompare(b.names[0]))
  }, [engagements, includeArchived, query])
  const open = (id: string) => onOpenClient ? onOpenClient(id) : onOpenAgreements()

  return <div className="bdo-view">
    <section className="bdo-section" aria-labelledby="bdo-clients-title">
      <div className="bdo-section-heading"><div><h2 id="bdo-clients-title">Client records</h2><p>Contacts from your agreements, grouped by billing email. Draft agreements are labeled separately.</p></div><button className="bd-button" type="button" onClick={onOpenAgreements}>Open agreements</button></div>
      <div className="bdo-client-tools"><label className="bdo-search" htmlFor="bdo-client-search"><span>Find a client or project</span><input id="bdo-client-search" type="search" placeholder="Name, email or project" value={query} onChange={event => setQuery(event.target.value)} /></label><label className="bdo-checkbox"><input type="checkbox" checked={includeArchived} onChange={event => setIncludeArchived(event.target.checked)} />Include archived agreements</label></div>
      {engagements === undefined ? <div className="bdo-empty"><h3>Client records are not available in this view</h3><p>Open agreements to see your authorized client and billing records.</p></div> : groups.length === 0 ? <div className="bdo-empty" role="status"><h3>{query.trim() ? 'No matching clients' : 'No client records to show'}</h3><p>{query.trim() ? 'Try a different name, email or project, or include archived agreements.' : 'Client contacts appear here when you create an agreement. Drafts remain clearly marked until issued.'}</p>{query.trim() && <button className="bd-text-button" type="button" onClick={() => setQuery('')}>Clear search</button>}</div> : <>
        <p className="bdo-list-count" role="status">{groups.length} {groups.length === 1 ? 'billing contact' : 'billing contacts'} · Current agreement records, independent of the reporting period</p>
        <ul className="bdo-clients">{groups.map(group => <li key={group.key}>
          <div className="bdo-client-identity"><strong>{group.names.join(' / ') || 'Unnamed client'}</strong><span>{group.email || 'No billing email'}</span><small>{group.engagements.length} {group.engagements.length === 1 ? 'agreement' : 'agreements'}</small></div>
          <div className="bdo-client-agreements">{group.engagements.map(engagement => <div className="bdo-agreement" key={engagement.id}>
            <div><button type="button" className="bdo-record-link" onClick={() => open(engagement.id)}>{engagement.title || 'Untitled agreement'}</button><span>{money(engagement.amount)} · {cadenceLabel[engagement.cadence]}{engagement.initialPayment ? ` · ${money(engagement.initialPayment.amount)} initial payment` : ''}</span></div>
            <span className={`bdo-record-state bdo-record-${engagement.state}`}>{engagement.archivedAt ? `Archived · ${engagementStates[engagement.state]}` : engagementStates[engagement.state]}</span>
          </div>)}</div>
        </li>)}</ul>
      </>}
      <p className="bdo-source-note">Open an agreement to review its scope, signature, invoices and activity. This list does not include website inquiries that have no agreement.</p>
    </section>
  </div>
}

function publishingLoadError(status: number): string {
  if (status === 401 || status === 403) return 'Owner access is required. Reload the portal and sign in again to check this Page.'
  if (status === 429) return 'Connection checks are temporarily limited. Wait a minute, then try again.'
  return 'The Page connection could not be checked. Try again, or open the workspace for connection details.'
}

export function PostingView({ active, onBusyChange }: { active: boolean; onBusyChange: (busy: boolean) => void }) {
  const [snapshot, setSnapshot] = useState<PublishingSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [checkedAt, setCheckedAt] = useState<string | null>(null)
  const [reload, setReload] = useState(0)
  const [selected, setSelected] = useState(false)
  const [opened, setOpened] = useState(false)
  const [addAccount, setAddAccount] = useState(false)
  const [busy, setBusy] = useState(false)
  const detailHeading = useRef<HTMLHeadingElement>(null)
  const accountHeading = useRef<HTMLHeadingElement>(null)
  const busyChange = useCallback((value: boolean) => { setBusy(value); onBusyChange(value) }, [onBusyChange])
  const refreshConnection = () => { setLoading(true); setError(''); setReload(value => value + 1) }

  useEffect(() => {
    const controller = new AbortController()
    void (async () => {
      try {
        const response = await fetch('/api/business-publishing', { credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.any([controller.signal, AbortSignal.timeout(20_000)]) })
        const result = await response.json() as PublishingResponse
        if (!response.ok || !result.ok || !result.snapshot) throw new Error(publishingLoadError(response.status))
        if (controller.signal.aborted) return
        setSnapshot(result.snapshot)
        setCheckedAt(new Date().toISOString())
      } catch (reason) {
        if (!controller.signal.aborted) setError(reason instanceof Error && reason.message.startsWith('Owner access') ? reason.message : reason instanceof Error && reason.message.startsWith('Connection checks') ? reason.message : publishingLoadError(0))
      } finally { if (!controller.signal.aborted) setLoading(false) }
    })()
    return () => controller.abort()
  }, [reload])

  useEffect(() => { if (active && selected) detailHeading.current?.focus() }, [active, selected])

  const connection = snapshot?.connection.status
  const connectionLabel = loading ? 'Checking connection' : error ? 'Check unavailable' : connection === 'ready' ? 'Page access confirmed' : connection === 'needs-sign-in' ? 'Renew access' : connection === 'needs-setup' ? 'Setup needed' : connection === 'error' ? 'Connection needs attention' : 'Not checked'

  return <div className="bdo-view" hidden={!active}>
    <section className="bdo-section" hidden={selected} aria-labelledby="bdo-posting-accounts-title">
      <div className="bdo-section-heading"><div><h2 id="bdo-posting-accounts-title" ref={accountHeading} tabIndex={-1}>Publishing accounts</h2><p>Create and review posts for the supported company Page.</p></div><button type="button" className="bd-button" aria-expanded={addAccount} aria-controls="bdo-add-account" onClick={() => setAddAccount(value => !value)}>Add account</button></div>
      {addAccount && <div className="bdo-setup-explanation" id="bdo-add-account"><h3>Additional publishing accounts need separate setup</h3><p>This workspace currently supports only the Wallace Shift LinkedIn company Page. Adding another Page, Facebook or Instagram is not available yet.</p><p>Those accounts need their own authorized connection and publishing support. Connecting an account for reporting does not enable posting.</p><p>You can continue posting to the supported LinkedIn Page below. Other accounts can be managed in their own platforms.</p></div>}
      <div className="bdo-publishing-account">
        <div className="bdo-account-identity"><img src="/brand/wallace-shift-logo-black.svg" alt="" width="44" height="44" /><div><h3>{snapshot?.page.name ?? 'Wallace Shift'}</h3><p>LinkedIn company Page</p><span className={`bdo-connection-state${!loading && !error && connection === 'ready' ? ' bdo-connection-confirmed' : ''}`} role="status">{connectionLabel}</span></div></div>
        <div className="bdo-account-action"><button type="button" className="bd-button bd-button-primary" onClick={() => { setOpened(true); setSelected(true) }}>Open posting workspace</button><span>Text, one image or one video</span></div>
      </div>
      <div className="bdo-account-detail"><p role={error ? 'alert' : undefined}>{error || snapshot?.connection.detail || 'The workspace checks the configured LinkedIn Page connection before publishing.'}</p><div><span>Checked {checkedLabel(checkedAt)}</span><button type="button" className="bd-text-button" disabled={loading} onClick={refreshConnection}>{loading ? 'Checking…' : 'Check connection'}</button></div></div>
      <p className="bdo-source-note">Publishing is separate from social analytics and paid advertising. Your Page role can be checked here; LinkedIn checks posting permission when you publish.</p>
    </section>
    <div hidden={!selected}>
      <div className="bdo-posting-navigation"><button type="button" className="bd-text-button" disabled={busy} onClick={() => { setSelected(false); refreshConnection(); requestAnimationFrame(() => accountHeading.current?.focus()) }}>Back to publishing accounts</button><h2 ref={detailHeading} tabIndex={-1}>LinkedIn posting workspace</h2><p>{busy ? 'Keep this workspace open while the current action finishes.' : 'Drafts stay here while you visit another dashboard page. Review each post before publishing.'}</p></div>
      {opened && <LinkedInPublisher active={active && selected} onBusyChange={busyChange} />}
    </div>
  </div>
}
