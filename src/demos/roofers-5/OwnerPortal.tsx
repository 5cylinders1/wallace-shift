import { useRef, useState, type KeyboardEvent, type MouseEvent } from 'react'
import './owner-portal.css'

type PortalTab = 'overview' | 'journal' | 'documents'

const tabs: { id: PortalTab; label: string; count?: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'journal', label: 'Site journal', count: '3' },
  { id: 'documents', label: 'Documents', count: '4' },
]

const documents = [
  {
    number: '01', title: 'Residence specification', type: 'Materials & detailing', date: 'Day 03',
    detail: 'Preview specification for Cedar Cove: blue-gray natural slate with copper at valleys and chimney junctions. A real specification would name the product, course dimensions, fastening, roof assembly and structural requirements before installation.',
  },
  {
    number: '02', title: 'Access & protection plan', type: 'Site arrangements', date: 'Day 10',
    detail: 'The fictional access plan reserves the east drive for deliveries, protects the garden terraces and keeps the main entrance available to the household. Actual arrangements require a site review and the homeowner’s agreement.',
  },
  {
    number: '03', title: 'Installation sequence', type: 'Working schedule', date: 'Day 12',
    detail: 'The example sequence covers substrate inspection, underlayment, copper junctions, slate courses and final checks. Weather and any concealed conditions can change the schedule; a connected project room would record those changes.',
  },
  {
    number: '04', title: 'Completion collection', type: 'Handover outline', date: 'At handover',
    detail: 'A proposed collection of final photographs, inspection records, signed workmanship terms, applicable product warranties and a maintenance schedule. Only the issued documents would establish coverage and homeowner responsibilities.',
  },
]

function Arrow() {
  return <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M4 10h12m-5-5 5 5-5 5" stroke="currentColor" strokeWidth="1.4" /></svg>
}

function Check() {
  return <svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m3 8 3.1 3.2L13 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
}

export default function OwnerPortal() {
  const [tab, setTab] = useState<PortalTab>('overview')
  const [approved, setApproved] = useState(false)
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const photoDialog = useRef<HTMLDialogElement>(null)
  const photoTrigger = useRef<HTMLButtonElement | null>(null)

  const switchTab = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next: number
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length
    else if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = tabs.length - 1
    else return
    event.preventDefault()
    setTab(tabs[next].id)
    tabRefs.current[next]?.focus()
  }

  const openPhoto = (event: MouseEvent<HTMLButtonElement>) => {
    photoTrigger.current = event.currentTarget
    photoDialog.current?.showModal()
  }

  const readJournal = () => {
    setTab('journal')
    tabRefs.current[1]?.focus()
  }

  return <section className="va-owner" id="owner-portal" aria-labelledby="va-owner-heading">
    <div className="va-owner-intro">
      <div>
        <p className="va-owner-eyebrow">THE PRIVATE CLIENT EXPERIENCE</p>
        <h2 id="va-owner-heading">Your project.<br />Always in view.</h2>
      </div>
      <div className="va-owner-intro-copy">
        <p>A dedicated project lead. Photographs from site. Decisions with a clear record. A project room gives you a closer view of the work, wherever the day takes you.</p>
        <span>EXPLORE A FICTIONAL HOMEOWNER PORTAL <Arrow /></span>
      </div>
    </div>

    <div className="va-portal">
      <header className="va-portal-header">
        <div className="va-portal-residence">
          <span className="va-portal-residence-mark" aria-hidden="true"><svg viewBox="0 0 36 36" fill="none"><path d="M5 23 18 10l13 13M10 19v10h16V19M18 10v19" stroke="currentColor" strokeWidth="1" /></svg></span>
          <div><p className="va-portal-caption">PRIVATE RESIDENCE / PROJECT ROOM</p><h3>Cedar Cove<span>047</span></h3><p className="va-portal-address">Blue-gray slate · Copper junctions</p></div>
        </div>
        <div className="va-portal-progress">
          <div><span>Roof assembly</span><strong>46<small>%</small></strong></div>
          <progress value="46" max="100" aria-label="Fictional project completion, 46 percent">46%</progress>
          <p>Sample schedule · Week 03 of 06</p>
        </div>
        <div className="va-portal-contact">
          <span className="va-portal-avatar" aria-hidden="true">JL</span>
          <div><strong>Jonah Lane</strong><span>Sample project lead</span></div>
        </div>
      </header>

      <div className="va-portal-navigation">
        <div className="va-portal-tabs" role="tablist" aria-label="Project room">
          {tabs.map((item, index) => <button
            key={item.id} type="button" id={`va-portal-tab-${item.id}`} role="tab"
            ref={element => { tabRefs.current[index] = element }}
            aria-selected={tab === item.id} aria-controls={`va-portal-panel-${item.id}`}
            tabIndex={tab === item.id ? 0 : -1}
            onKeyDown={event => switchTab(event, index)} onClick={() => setTab(item.id)}
          >{item.label}{item.count && <span>{item.count}</span>}</button>)}
        </div>
        <span className="va-portal-demo"><i /> DEMO PROJECT</span>
      </div>

      <div className="va-portal-main">
        <div className="va-portal-panel" hidden={tab !== 'overview'} id="va-portal-panel-overview" role="tabpanel" aria-labelledby="va-portal-tab-overview" tabIndex={0}>
          <div className="va-portal-overview">
            <div className="va-portal-site-card">
              <button type="button" className="va-portal-photo" onClick={openPhoto} aria-label="Enlarge the fictional Cedar Cove progress photograph">
                <img src="/demos/roofers-5/project-progress.jpg" alt="Illustrative close view of gloved hands checking copper valley flashing on dark roof underlayment" loading="lazy" />
                <span className="va-portal-photo-tag">SITE RECORD / DAY 12</span>
                <span className="va-portal-photo-enlarge" aria-hidden="true">↗</span>
              </button>
              <div className="va-portal-site-copy"><div><span className="va-portal-caption">LATEST SITE NOTE</span><h4>The north elevation<br />is ready.</h4></div><p>Underlayment is in place on the main roof. The next sequence brings the copper junctions and first slate courses into position.</p><button type="button" className="va-portal-text-button" onClick={readJournal}>Open site journal <Arrow /></button></div>
            </div>

            <div className={`va-portal-approval ${approved ? 'is-approved' : ''}`}>
              <div className="va-portal-card-top"><span className="va-portal-caption">DESIGN DECISION / 01</span><span className="va-portal-status">{approved ? 'REVIEWED' : 'AWAITING REVIEW'}</span></div>
              <img className="va-portal-finish-image" src="/demos/roofers-5/material-slate.jpg" alt="Illustrative blue-gray slate roof concept on the fictional Cedar Cove residence" loading="lazy" />
              <div className="va-portal-finish"><span className="va-portal-caption">THE SELECTED PALETTE</span><h4>Blue-gray natural slate</h4><p>Deep mineral tones paired with copper at the roof’s architectural junctions.</p></div>
              <button type="button" className="va-portal-approve-button" onClick={() => setApproved(value => !value)}>{approved ? <><Check /> Reset demo approval</> : <>Approve demo selection <Arrow /></>}</button>
              <p className="va-portal-approval-note" role="status">{approved ? 'Selection approved for this preview. It resets when you leave.' : 'Try the selection review. This is a simulated approval.'}</p>
            </div>
          </div>

          <ol className="va-portal-timeline" aria-label="Fictional project sequence">
            <li className="is-complete"><span><Check /></span><div>Specification<small>Day 03 · Confirmed</small></div></li>
            <li className="is-complete"><span><Check /></span><div>Site preparation<small>Day 10 · Complete</small></div></li>
            <li className="is-current" aria-current="step"><span /><div>Roof assembly<small>Day 12 · In progress</small></div></li>
            <li><span /><div>Final inspection<small>Scheduled at completion</small></div></li>
          </ol>
        </div>

        <div className="va-portal-panel" hidden={tab !== 'journal'} id="va-portal-panel-journal" role="tabpanel" aria-labelledby="va-portal-tab-journal" tabIndex={0}>
          <div className="va-portal-panel-title"><div><span className="va-portal-caption">SITE JOURNAL</span><h4>From the team on your roof.</h4></div><span>3 FICTIONAL ENTRIES</span></div>
          <article className="va-portal-journal-feature"><button type="button" className="va-portal-journal-image" aria-label="Enlarge the fictional Cedar Cove progress photograph" onClick={openPhoto}><img src="/demos/roofers-5/project-progress.jpg" alt="Illustrative inspection of a copper roof valley with slate samples beside the work" loading="lazy" /><span aria-hidden="true">↗</span></button><div><p className="va-portal-journal-date">DAY 12 <span>3:45 PM / SAMPLE RECORD</span></p><h4>Ready for the first slate courses.</h4><p>The main elevation’s underlayment is in position. The illustrative programme moves next to the copper junctions, followed by slate setting out.</p><span className="va-portal-journal-author">JL <span>Jonah Lane · Project lead</span></span></div></article>
          <article className="va-portal-journal-entry"><span className="va-portal-entry-day">10</span><div><p className="va-portal-journal-date">DAY 10 <span>SAMPLE RECORD</span></p><h4>The household’s access comes first.</h4><p>The east drive is designated for deliveries. Garden terraces are protected and the main entrance is kept clear in this fictional site plan.</p></div><span className="va-portal-entry-mark"><Check /></span></article>
          <article className="va-portal-journal-entry"><span className="va-portal-entry-day">03</span><div><p className="va-portal-journal-date">DAY 03 <span>SAMPLE RECORD</span></p><h4>Material, course and junction.</h4><p>The blue-gray slate palette and copper details have been collected in the residence specification for review.</p></div><span className="va-portal-entry-mark"><Check /></span></article>
        </div>

        <div className="va-portal-panel" hidden={tab !== 'documents'} id="va-portal-panel-documents" role="tabpanel" aria-labelledby="va-portal-tab-documents" tabIndex={0}>
          <div className="va-portal-panel-title"><div><span className="va-portal-caption">RESIDENCE FILE</span><h4>Every decision has a place.</h4></div><span>4 DEMO DOCUMENTS</span></div>
          <p className="va-portal-vault-copy">Explore the records a homeowner could keep alongside the work. Select a document to see its illustrative contents.</p>
          <div className="va-portal-document-list">{documents.map(document => <details key={document.number} className="va-portal-document"><summary><span className="va-portal-document-number">{document.number}</span><span className="va-portal-document-title"><strong>{document.title}</strong><small>{document.type} · {document.date}</small></span><span className="va-portal-document-action">Open <span aria-hidden="true">+</span></span></summary><div className="va-portal-document-content"><span className="va-portal-caption">DOCUMENT CONCEPT</span><p>{document.detail}</p><small>Fictional preview. No contract, specification or warranty is issued here.</small></div></details>)}</div>
        </div>
      </div>
      <footer className="va-portal-disclosure"><span>INTERACTIVE CONCEPT</span><p>Cedar Cove is fictional. Images, dates and progress are illustrative; approvals stay in this preview. The portal has no live project connection or saved record.</p></footer>
    </div>

    <div className="va-owner-service-note"><p>Considered service.<br />From arrival to handover.</p><span>A single point of contact, a plan for your property and a record you can return to. The detail extends beyond the roof.</span></div>

    <dialog className="va-portal-photo-dialog" ref={photoDialog} aria-labelledby="va-portal-photo-title" onClose={() => photoTrigger.current?.focus()} onClick={event => { if (event.target === event.currentTarget) photoDialog.current?.close() }}>
      <div className="va-portal-photo-dialog-header"><div><h3 id="va-portal-photo-title">Cedar Cove / Day 12</h3><p>Illustrative site image · Fictional project</p></div><button type="button" onClick={() => photoDialog.current?.close()} aria-label="Close photograph">Close <span aria-hidden="true">×</span></button></div>
      <img src="/demos/roofers-5/project-progress.jpg" alt="Illustrative close view of gloved hands inspecting copper valley flashing on a stone and timber residence, with slate samples nearby" />
    </dialog>
  </section>
}
