import { useEffect, useId, useRef, useState } from 'react'
import type { DashboardConfig, DashboardSnapshot, FollowUp, FollowUpStatus, Inspection, PropertyMatch, PropertyRecord, Scenario, WorkspaceActions } from '../types'
import { formatEventTime, localDateTime, statusLabel } from '../domain'
import { EVIDENCE_LABELS, localDate, RelationshipBadge, StatusBadge } from './ui'
import { Icon } from './Icon'
import './property-panel.css'

interface PropertyPanelProps {
  property: PropertyRecord
  snapshot: DashboardSnapshot
  config: DashboardConfig
  scenario: Scenario
  match: PropertyMatch | undefined
  actions: WorkspaceActions
  busy: boolean
  onClose: () => void
}

const editableStatuses: FollowUpStatus[] = ['to-contact', 'contacted', 'completed', 'not-interested', 'do-not-contact']

function FollowUpEditor({ followUp, scheduled, suppressed, actions, busy }: {
  followUp: FollowUp
  scheduled: boolean
  suppressed: boolean
  actions: WorkspaceActions
  busy: boolean
}) {
  const prefix = useId()
  const [statusDraft, setStatusDraft] = useState({ saved: followUp.status, value: followUp.status })
  const [noteDraft, setNoteDraft] = useState({ saved: followUp.note, value: followUp.note })
  const status = statusDraft.saved === followUp.status ? statusDraft.value : followUp.status
  const note = noteDraft.saved === followUp.note ? noteDraft.value : followUp.note
  const [feedback, setFeedback] = useState('')

  return <form className="rd-property-form" onSubmit={async event => {
    event.preventDefault()
    setFeedback('')
    const saved = await actions.update(followUp.propertyId, suppressed ? 'do-not-contact' : status, note)
    setFeedback(saved ? 'Follow-up saved in this demo.' : 'The follow-up could not be saved. Try again.')
  }}>
    <label htmlFor={`${prefix}-status`}>Contact outcome</label>
    <select id={`${prefix}-status`} value={suppressed ? 'do-not-contact' : status} disabled={busy || suppressed} onChange={event => setStatusDraft({ saved: followUp.status, value: event.target.value as FollowUpStatus })}>
      {scheduled && <option value="scheduled">Inspection scheduled</option>}
      {editableStatuses.map(value => <option key={value} value={value}>{statusLabel(value)}</option>)}
    </select>
    {suppressed && <p className="rd-property-help">Do not contact stays in place until the demo is reset. You can still add an internal note.</p>}
    {!suppressed && scheduled && status !== 'scheduled' && <p className="rd-property-help">Saving this outcome will {status === 'completed' ? 'complete' : 'cancel'} the sample appointment.</p>}
    <label htmlFor={`${prefix}-note`}>Internal note</label>
    <textarea id={`${prefix}-note`} rows={3} value={note} disabled={busy} onChange={event => setNoteDraft({ saved: followUp.note, value: event.target.value })} placeholder="Add a note for your team…" />
    <button className="rd-btn rd-btn-secondary" type="submit" disabled={busy}>Save outcome</button>
    <p className="rd-property-feedback" role="status">{feedback}</p>
  </form>
}

function InspectionEditor({ propertyId, inspection, scenario, actions, busy, blocked }: {
  propertyId: string
  inspection: Inspection | undefined
  scenario: Scenario
  actions: WorkspaceActions
  busy: boolean
  blocked: boolean
}) {
  const prefix = useId()
  const earliestDate = localDate(scenario.referenceDate, scenario.timezone)
  const tomorrow = new Date(Date.parse(`${earliestDate}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10)
  const clock = localDateTime(scenario.referenceDate, scenario.timezone)
  const savedDate = inspection?.date ?? tomorrow
  const savedTime = inspection?.time ?? '09:00'
  const savedAssignee = inspection?.assignee ?? ''
  const [dateDraft, setDateDraft] = useState({ saved: savedDate, value: savedDate })
  const [timeDraft, setTimeDraft] = useState({ saved: savedTime, value: savedTime })
  const [assigneeDraft, setAssigneeDraft] = useState({ saved: savedAssignee, value: savedAssignee })
  const date = dateDraft.saved === savedDate ? dateDraft.value : savedDate
  const time = timeDraft.saved === savedTime ? timeDraft.value : savedTime
  const assignee = assigneeDraft.saved === savedAssignee ? assigneeDraft.value : savedAssignee
  const [feedback, setFeedback] = useState('')

  return <form className="rd-property-form" onSubmit={async event => {
    event.preventDefault()
    if (blocked) return
    setFeedback('')
    const saved = await actions.schedule(propertyId, { date, time, assignee })
    setFeedback(saved ? 'Sample inspection saved. No invitation was sent.' : 'Inspection not saved. Check the date, time, and inspector, then try again.')
  }}>
    <div className="rd-property-form-row">
      <div><label htmlFor={`${prefix}-date`}>Inspection date</label><input id={`${prefix}-date`} type="date" min={earliestDate} value={date} required disabled={busy || blocked} onChange={event => setDateDraft({ saved: savedDate, value: event.target.value })} /></div>
      <div><label htmlFor={`${prefix}-time`}>Time</label><input id={`${prefix}-time`} type="time" min={date === clock.date ? clock.time : undefined} value={time} required disabled={busy || blocked} onChange={event => setTimeDraft({ saved: savedTime, value: event.target.value })} /></div>
    </div>
    <label htmlFor={`${prefix}-assignee`}>Inspector</label>
    <input id={`${prefix}-assignee`} value={assignee} required maxLength={80} disabled={busy || blocked} placeholder="Enter a team member's name" onChange={event => setAssigneeDraft({ saved: savedAssignee, value: event.target.value })} />
    <p className="rd-property-help">{scenario.timezone} · Schedule from the fixed demo date, {earliestDate}. This creates a sample appointment only.</p>
    <button className="rd-btn rd-btn-primary" type="submit" disabled={busy || blocked}><Icon name="calendar" size={17} />{inspection?.status === 'scheduled' ? 'Update sample inspection' : 'Schedule sample inspection'}</button>
    <p className="rd-property-feedback" role="status">{feedback}</p>
  </form>
}

export function PropertyPanel({ property, snapshot, config, scenario, match, actions, busy, onClose }: PropertyPanelProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const prefix = useId()
  const [feedback, setFeedback] = useState('')
  const [copyFeedback, setCopyFeedback] = useState('')
  const [enrichmentFeedback, setEnrichmentFeedback] = useState('')
  const followUp = snapshot.followUps.find(item => item.propertyId === property.id)
  const inspection = snapshot.inspections.find(item => item.propertyId === property.id)
  const suppressed = property.doNotContact || followUp?.status === 'do-not-contact'
  const uninterested = followUp?.status === 'not-interested'
  const blocked = suppressed || uninterested
  const hasContactDetails = Boolean(property.contact?.email || property.contact?.phone)
  const firstName = property.contact?.name.split(' ')[0] || 'there'
  const invitation = `Hi ${firstName}, this is ${config.company}. ${match?.matches.length ? 'Following recent weather near your property, we are offering a free roof inspection.' : 'We are offering free roof inspections in your area.'} If you would like us to take a look at ${property.address}, please let us know a convenient time. Nearby weather does not tell us whether your roof was damaged; an inspection can help you understand its condition.\n\n${config.company}\n${config.contactEmail}`

  useEffect(() => {
    const dialog = dialogRef.current
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    if (!dialog) return
    const fallback = dialog.closest('.rd-app')?.querySelector<HTMLElement>('main')
    if (!dialog.open) dialog.showModal()
    titleRef.current?.focus()
    return () => {
      if (dialog.open) dialog.close()
      if (opener?.isConnected && !opener.matches(':disabled')) opener.focus()
      else if (fallback?.isConnected) fallback.focus()
    }
  }, [])

  return <dialog ref={dialogRef} className="rd-property-dialog" aria-labelledby={`${prefix}-title`} aria-describedby={`${prefix}-sample`} onCancel={event => { event.preventDefault(); onClose() }} onClick={event => { if (event.target === event.currentTarget) onClose() }}>
    <div className="rd-property-sheet">
      <header className="rd-property-header">
        <div><p className="rd-eyebrow">Property workspace</p><RelationshipBadge value={property.relationship} /></div>
        <button type="button" className="rd-property-close" aria-label="Close property details" onClick={onClose}><Icon name="close" size={21} /></button>
      </header>

      <div className="rd-property-content">
        <div className="rd-property-address">
          <span className="rd-property-house"><Icon name="home" size={26} /></span>
          <div><h2 id={`${prefix}-title`} ref={titleRef} tabIndex={-1}>{property.address}</h2><p>{property.city} {property.postalCode}</p></div>
        </div>
        <p id={`${prefix}-sample`} className="rd-property-sample">Fictional property and contact details · sample data only</p>
        {blocked && <div className="rd-property-suppression" role="status"><Icon name="shield" size={20} /><div><strong>{suppressed ? 'Do not contact' : 'Not interested'}</strong><p>{suppressed ? 'Outreach, contact discovery, and scheduling are disabled for this property.' : 'Outreach and scheduling are paused. Review the recorded outcome before following up.'}</p></div></div>}

        <section className="rd-property-section" aria-labelledby={`${prefix}-contact`}>
          <div className="rd-property-section-title"><h3 id={`${prefix}-contact`}>Contact & property</h3>{followUp && <StatusBadge value={followUp.status} />}</div>
          <dl className="rd-property-facts">
            <div><dt>Homeowner</dt><dd>{property.contact?.name ?? 'Not available'}</dd></div>
            <div><dt>Email</dt><dd>{property.contact?.email ?? 'Not available'}</dd></div>
            <div><dt>Phone</dt><dd>{property.contact?.phone ?? 'Not available'}</dd></div>
            <div><dt>Roof age</dt><dd>{property.roofAge ?? 'Not available'}</dd></div>
            <div><dt>Record source</dt><dd>{property.source}</dd></div>
            {property.contact && <div><dt>Contact source</dt><dd>{property.contact.source}</dd></div>}
            <div><dt>Contact permission</dt><dd>{property.contact?.permission === 'project-inquiry' ? property.lead && config.features.websiteLeads ? 'Project inquiry — see submitted preferences below' : 'Project inquiry — review the original submitted preferences' : 'Unknown — verify before any real outreach'}</dd></div>
          </dl>
          {config.features.enrichment && property.relationship === 'prospect' && !property.contact && <div className="rd-property-enrichment"><div><Icon name="spark" size={20} /><strong>Optional homeowner discovery</strong></div><p>Preview a fictional contact match. Live enrichment would use a separate subscription and does not establish contact permission.</p><button type="button" className="rd-btn rd-btn-secondary" disabled={busy || blocked} onClick={async () => {
            setEnrichmentFeedback('')
            const saved = await actions.enrich(property.id)
            setEnrichmentFeedback(saved ? 'Fictional contact details added. No live lookup was made.' : 'No sample contact was added. A fictional match may be unavailable for this property.')
          }}>Preview sample enrichment</button></div>}
          <p className="rd-property-feedback" role="status">{enrichmentFeedback}</p>
        </section>

        <section className="rd-property-section" aria-labelledby={`${prefix}-weather`}>
          <div className="rd-property-section-title"><h3 id={`${prefix}-weather`}>Weather near this property</h3><span className="rd-property-count">{match?.matches.length ?? 0}</span></div>
          {match?.matches.length ? <ul className="rd-property-weather">{match.matches.map(({ event, reason, distanceMiles }) => <li key={event.id}>
            <div><strong>{event.title}</strong><span>{EVIDENCE_LABELS[event.evidence]}</span></div>
            <p>{reason} · {distanceMiles.toFixed(1)} mi from reference point</p>
            <small>{formatEventTime(event.occurredAt, scenario.timezone)} · {event.source}</small>
          </li>)}</ul> : <p className="rd-property-help">No matching weather in the current map filters. You can still manage this property.</p>}
          <p className="rd-property-help">Illustrative weather only. Proximity and estimated footprints do not establish roof damage.</p>
          <button type="button" className="rd-btn rd-btn-primary rd-property-wide" disabled={busy || blocked || Boolean(followUp)} onClick={async () => {
            setFeedback('')
            const saved = await actions.add([property.id], match?.matches.map(item => item.event.id) ?? [])
            setFeedback(saved ? 'Property added to the follow-up list.' : 'The property could not be added. Try again.')
          }}><Icon name={followUp ? 'check' : 'plus'} size={18} />{followUp ? 'Already in follow-ups' : 'Add to follow-ups'}</button>
          <p className="rd-property-feedback" role="status">{feedback}</p>
        </section>

        {property.lead && config.features.websiteLeads && <section className="rd-property-section" aria-labelledby={`${prefix}-lead`}>
          <div className="rd-property-section-title"><h3 id={`${prefix}-lead`}>Website inquiry</h3><Icon name="mail" size={19} /></div>
          <dl className="rd-property-facts"><div><dt>Concern</dt><dd>{property.lead.concern}</dd></div><div><dt>Preferred contact</dt><dd>{property.lead.preferredMethod}</dd></div><div><dt>Submitted</dt><dd>{formatEventTime(property.lead.submittedAt, scenario.timezone)}</dd></div></dl>
          <p className="rd-property-consent"><strong>Submitted consent / preferences</strong>{property.lead.consentStatement}</p>
        </section>}

        <section className="rd-property-section" aria-labelledby={`${prefix}-invitation`}>
          <div className="rd-property-section-title"><h3 id={`${prefix}-invitation`}>Free-inspection invitation</h3><span className="rd-property-mini-tag">Preview only</span></div>
          <p className="rd-property-help">Review and copy a draft for manual follow-up. Nothing is sent from this dashboard.</p>
          <textarea className="rd-property-invitation" aria-label="Sample free-inspection invitation" rows={8} readOnly value={invitation} disabled={blocked || !hasContactDetails} />
          <button type="button" className="rd-btn rd-btn-secondary" disabled={busy || blocked || !hasContactDetails} onClick={async () => {
            const copied = await actions.copy(invitation)
            setCopyFeedback(copied ? 'Invitation copied. No message was sent.' : 'Copy unavailable. Select and copy the invitation text manually.')
          }}><Icon name="copy" size={16} />Copy invitation</button>
          <p className="rd-property-feedback" role="status">{copyFeedback}</p>
          {!hasContactDetails && <p className="rd-property-help">A phone number or email is needed before copying an invitation.</p>}
        </section>

        {followUp && <section className="rd-property-section" aria-labelledby={`${prefix}-followup`}>
          <div className="rd-property-section-title"><h3 id={`${prefix}-followup`}>Follow-up outcome</h3></div>
          <FollowUpEditor key={followUp.id} followUp={followUp} scheduled={inspection?.status === 'scheduled'} suppressed={suppressed} actions={actions} busy={busy} />
        </section>}

        <section className="rd-property-section" aria-labelledby={`${prefix}-inspection`}>
          <div className="rd-property-section-title"><h3 id={`${prefix}-inspection`}>Arrange a free inspection</h3><Icon name="calendar" size={19} /></div>
          {inspection && <p className="rd-property-appointment"><strong>{inspection.status === 'scheduled' ? 'Sample appointment' : inspection.status === 'completed' ? 'Completed sample appointment' : 'Cancelled sample appointment'}</strong>{inspection.date} at {inspection.time} · {inspection.assignee}</p>}
          <InspectionEditor key={property.id} propertyId={property.id} inspection={inspection} scenario={scenario} actions={actions} busy={busy} blocked={blocked} />
        </section>

        <section className="rd-property-section" aria-labelledby={`${prefix}-activity`}>
          <div className="rd-property-section-title"><h3 id={`${prefix}-activity`}>Activity</h3><Icon name="clock" size={18} /></div>
          {property.activity.length ? <ol className="rd-property-timeline">{property.activity.map(activity => <li key={activity.id}><p>{activity.text}</p><time dateTime={activity.at}>{formatEventTime(activity.at, scenario.timezone)}</time></li>)}</ol> : <p className="rd-property-help">No activity yet.</p>}
        </section>
      </div>
      <footer className="rd-property-footer"><span>Changes reset when you reload the demo.</span><button type="button" className="rd-btn rd-btn-secondary" onClick={onClose}>Done</button></footer>
    </div>
  </dialog>
}
