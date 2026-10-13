import { useRef, useState, type KeyboardEvent } from 'react'
import './owner-portal.css'

type PortalTab = 'overview' | 'updates' | 'documents'

const tabs: { id: PortalTab; label: string; count?: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'updates', label: 'Updates', count: '3' },
  { id: 'documents', label: 'Documents', count: '4' },
]

const documents = [
  {
    number: '01', title: 'Material & finish schedule', type: 'Specification', date: 'Day 02',
    detail: 'Sample specification: charcoal natural slate, copper valley and chimney detailing, and a coordinated ridge finish. The final product, detailing, quantities, and installation requirements would be agreed in the signed project specification.',
  },
  {
    number: '02', title: 'Your project programme', type: 'Programme', date: 'Day 03',
    detail: 'Illustrative programme: design and specification → site preparation → weatherproofing → roof installation → detail inspection → homeowner handover. Actual dates depend on weather, site findings, material delivery, and the agreed scope.',
  },
  {
    number: '03', title: 'Site protection & photo record', type: 'Project record', date: 'Day 08',
    detail: 'A sample record of the access plan, landscape protection, material staging, and daily roof photographs. In a connected homeowner portal, each dated entry would identify the project and person responsible for the update.',
  },
  {
    number: '04', title: 'Warranty & care guide', type: 'Handover draft', date: 'At completion',
    detail: 'A sample handover outline: the signed workmanship warranty, applicable manufacturer warranties, final inspection record, and material-specific care guidance. Coverage, exclusions, maintenance obligations, and duration would be set out in the actual documents.',
  },
]

function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return <span aria-hidden="true">{diagonal ? '↗' : '→'}</span>
}

function Check() {
  return <svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m3 8 3.1 3.2L13 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
}

export default function OwnerPortal() {
  const [tab, setTab] = useState<PortalTab>('overview')
  const [approved, setApproved] = useState(false)
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const photoDialog = useRef<HTMLDialogElement>(null)

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

  return <section className="va-owner" id="owner-portal" aria-labelledby="va-owner-heading">
    <div className="va-owner-intro">
      <div>
        <p className="va-owner-eyebrow"><span /> THE OWNER EXPERIENCE</p>
        <h2 id="va-owner-heading">The only surprise.<br /><em>How effortless it feels.</em></h2>
      </div>
      <div className="va-owner-intro-copy">
        <p>One dedicated point of contact. A clear view of every detail. Your private project portal brings the entire experience into focus, wherever you are.</p>
        <span>DAILY PHOTOGRAPHS <i /> THOUGHTFUL UPDATES <i /> ONE SECURE RECORD</span>
      </div>
    </div>

    <div className="va-portal">
      <aside className="va-portal-sidebar" aria-label="Sample project summary">
        <div className="va-portal-brand">VELAR<span>ROOF ATELIER</span></div>
        <div className="va-portal-property">
          <span className="va-portal-caption">YOUR RESIDENCE</span>
          <h3>Lakewood</h3>
          <p>Natural slate & copper<br />Project V–028 · Sample project</p>
        </div>
        <div className="va-portal-progress">
          <div><span>Project progress</span><strong>62<small>%</small></strong></div>
          <progress value="62" max="100" aria-label="Sample project completion, 62 percent">62%</progress>
          <p>Weatherproofing in progress</p>
        </div>
        <ol className="va-portal-timeline" aria-label="Sample project stages">
          <li className="is-complete"><span><Check /></span><div>Design & specification<small>Every detail agreed</small></div></li>
          <li className="is-complete"><span><Check /></span><div>Site preparation<small>Your property protected</small></div></li>
          <li className="is-current" aria-current="step"><span /><div>Weatherproofing<small>In progress · Day 08</small></div></li>
          <li><span /><div>Slate & copper installation<small>Next chapter</small></div></li>
          <li><span /><div>Inspection & handover<small>A considered finish</small></div></li>
        </ol>
        <div className="va-portal-contact">
          <span className="va-portal-avatar" aria-hidden="true">EM</span>
          <div><strong>Elena Moore</strong><span>Your sample project concierge</span></div>
        </div>
      </aside>

      <div className="va-portal-main">
        <header className="va-portal-header">
          <div><p className="va-portal-caption">YOUR PRIVATE PROJECT SPACE</p><h3>Everything, accounted for.</h3></div>
          <span className="va-portal-demo">INTERACTIVE PREVIEW</span>
        </header>

        <div className="va-portal-tabs" role="tablist" aria-label="Project portal">
          {tabs.map((item, index) => <button
            key={item.id} type="button" id={`va-portal-tab-${item.id}`} role="tab"
            ref={element => { tabRefs.current[index] = element }}
            aria-selected={tab === item.id} aria-controls={`va-portal-panel-${item.id}`}
            tabIndex={tab === item.id ? 0 : -1}
            onKeyDown={event => switchTab(event, index)} onClick={() => setTab(item.id)}
          >{item.label}{item.count && <span>{item.count}</span>}</button>)}
        </div>

        <div className="va-portal-panel" key={tab} id={`va-portal-panel-${tab}`} role="tabpanel" aria-labelledby={`va-portal-tab-${tab}`} tabIndex={0}>
          {tab === 'overview' && <div className="va-portal-overview">
            <div className="va-portal-site-card">
              <button type="button" className="va-portal-photo" onClick={() => photoDialog.current?.showModal()} aria-label="Enlarge sample roof progress photograph">
                <img src="/demos/roofers-4/material-build.jpg" alt="Illustrative aerial view of a timber-framed home with roof underlayment being installed" loading="lazy" />
                <span className="va-portal-photo-tag">DAY 08 · SITE PHOTOGRAPH</span>
                <span className="va-portal-photo-enlarge" aria-hidden="true">↗</span>
              </button>
              <div className="va-portal-site-copy"><span className="va-portal-caption">THE LATEST FROM SITE</span><h4>A strong foundation<br />for everything above.</h4><p>Underlayment is progressing across the main roof planes. Next, the team will prepare the valleys and chimney details.</p><button type="button" className="va-portal-text-button" onClick={() => setTab('updates')}>Read the project journal <Arrow /></button></div>
            </div>

            <div className="va-portal-overview-side">
              <div className={`va-portal-approval ${approved ? 'is-approved' : ''}`}>
                <div className="va-portal-card-top"><span className="va-portal-caption">A DETAIL FOR YOUR REVIEW</span><span className="va-portal-status">{approved ? 'APPROVED IN PREVIEW' : 'FINISH SELECTION'}</span></div>
                <div className="va-portal-finish"><img src="/demos/roofers-4/material-slate.jpg" alt="Illustrative charcoal slate roof finish" loading="lazy" /><div><h4>Charcoal slate.<br />Copper detailing.</h4><p>Quiet texture. Warm accents.<br />A considered pairing.</p></div></div>
                <button type="button" className="va-portal-approve-button" onClick={() => setApproved(value => !value)}>{approved ? <><Check /> Reset sample approval</> : <>Approve sample finish <Arrow /></>}</button>
                <p className="va-portal-approval-note" role="status">{approved ? 'Sample approval recorded in this preview only.' : 'Try the approval flow. Nothing is sent or saved.'}</p>
              </div>
              <div className="va-portal-next"><span className="va-portal-caption">LOOKING AHEAD</span><h4>The details take shape.</h4><p>Copper preparation and slate layout are next in the illustrative programme.</p><span>DAY 09–11 <span aria-hidden="true">↗</span></span></div>
            </div>
          </div>}

          {tab === 'updates' && <div className="va-portal-journal">
            <div className="va-portal-panel-title"><div><span className="va-portal-caption">THE PROJECT JOURNAL</span><h4>A clear view, day by day.</h4></div><span>3 SAMPLE ENTRIES</span></div>
            <article className="va-portal-journal-feature"><button type="button" className="va-portal-journal-image" aria-label="Enlarge sample roof progress photograph" onClick={() => photoDialog.current?.showModal()}><img src="/demos/roofers-4/material-build.jpg" alt="Illustrative roof underlayment progress on a home under construction" loading="lazy" /><span aria-hidden="true">↗</span></button><div><p className="va-portal-journal-date">DAY 08 <span>4:30 PM · SAMPLE UPDATE</span></p><h4>Weatherproofing the main roof.</h4><p>The underlayment stage is progressing. Tomorrow’s sample programme focuses on valley preparation and chimney flashing details.</p><span className="va-portal-journal-author">EM <span>Elena · Project concierge</span></span></div></article>
            <article className="va-portal-journal-entry"><span className="va-portal-entry-day">07</span><div><p className="va-portal-journal-date">DAY 07 <span>SAMPLE UPDATE</span></p><h4>Your property, carefully protected.</h4><p>Access, staging, and landscape protection have been reviewed before the next phase.</p></div><span className="va-portal-entry-mark"><Check /></span></article>
            <article className="va-portal-journal-entry"><span className="va-portal-entry-day">02</span><div><p className="va-portal-journal-date">DAY 02 <span>SAMPLE UPDATE</span></p><h4>A shared vision for the roofline.</h4><p>The sample slate specification and copper detailing are ready for your review.</p></div><span className="va-portal-entry-mark"><Check /></span></article>
          </div>}

          {tab === 'documents' && <div className="va-portal-documents">
            <div className="va-portal-panel-title"><div><span className="va-portal-caption">THE RESIDENCE RECORD</span><h4>Considered today. Kept for tomorrow.</h4></div><span>4 SAMPLE DOCUMENTS</span></div>
            <p className="va-portal-vault-copy">The specification, programme, and handover record together in one place. Open any document to explore its sample contents.</p>
            <div className="va-portal-document-list">{documents.map(document => <details key={document.number} className="va-portal-document"><summary><span className="va-portal-document-number">{document.number}</span><span className="va-portal-document-title"><strong>{document.title}</strong><small>{document.type} · {document.date}</small></span><span className="va-portal-document-action">View <span aria-hidden="true">+</span></span></summary><div className="va-portal-document-content"><span className="va-portal-caption">ILLUSTRATIVE DOCUMENT PREVIEW</span><p>{document.detail}</p><small>Fictional demonstration. This is not a contract, specification, or warranty.</small></div></details>)}</div>
          </div>}
        </div>
        <footer className="va-portal-disclosure"><span className="va-portal-disclosure-dot" /><p>Fictional project preview. Sample photographs and updates; approvals are simulated. No live connection, messages, or saved project data.</p></footer>
      </div>
    </div>

    <div className="va-owner-service-note"><p>Less managing.<br /><em>More looking forward.</em></p><span>From the first conversation to the final detail, an experience designed around your peace of mind.</span></div>

    <dialog className="va-portal-photo-dialog" ref={photoDialog} aria-labelledby="va-portal-photo-title" onClick={event => { if (event.target === event.currentTarget) photoDialog.current?.close() }}>
      <div className="va-portal-photo-dialog-header"><div><h3 id="va-portal-photo-title">Day 08 · Site photograph</h3><p>Illustrative image · Fictional project preview</p></div><button type="button" onClick={() => photoDialog.current?.close()} aria-label="Close photograph">Close <span aria-hidden="true">×</span></button></div>
      <img src="/demos/roofers-4/material-build.jpg" alt="Illustrative aerial photograph showing roof underlayment across a timber-framed residence surrounded by woodland" />
    </dialog>
  </section>
}
