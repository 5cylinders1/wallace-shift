import type { ConnectionCapability, DashboardConfig, DashboardSnapshot, WorkspaceActions } from '../types'
import { Icon } from './Icon'
import { SectionHeading } from './ui'

interface ConnectionsProps {
  snapshot: DashboardSnapshot
  config: DashboardConfig
  actions: WorkspaceActions
  busy: boolean
  onSelectProperty: (id: string) => void
}

const connectionIcons: Record<ConnectionCapability['id'], string> = {
  weather: 'hail',
  customers: 'people',
  website: 'mail',
  enrichment: 'spark',
}

export function Connections({ snapshot, config, actions, busy, onSelectProperty }: ConnectionsProps) {
  const suppressedIds = new Set(snapshot.followUps
    .filter(item => item.status === 'do-not-contact' || item.status === 'not-interested')
    .map(item => item.propertyId))
  const prospect = snapshot.properties.find(property =>
    property.relationship === 'prospect' && !property.contact && !property.doNotContact && !suppressedIds.has(property.id))
  const websiteLead = snapshot.properties.find(property => property.relationship === 'lead' && property.lead)

  return (
    <section className="rd-connections-view" aria-label="Dashboard connections">
      <SectionHeading eyebrow="SETUP & SERVICES" title="Your sources, in one place.">
        <p>Explore sample connections for {config.company}.</p>
      </SectionHeading>

      <div className="rd-connections-grid">
        {snapshot.connections.map(connection => (
          <article className="rd-connection-card" key={connection.id}>
            <div className="rd-connection-icon"><Icon name={connectionIcons[connection.id]} size={26} /></div>
            <div className="rd-connection-copy">
              <span className={`rd-tag rd-tag-${connection.state}`}>{connection.state === 'sample' ? 'Sample data' : 'Optional subscription'}</span>
              <h3>{connection.title}</h3>
              <p>{connection.description}</p>

              {connection.id === 'weather' && <p>Public weather reports can identify nearby activity. A licensed weather provider can add estimated hail and wind footprints. Neither confirms damage to a roof.</p>}
              {connection.id === 'customers' && <p>Bring existing customers into the same view as recent weather. Try the fictional customer CSV included with this demo.</p>}
              {connection.id === 'website' && <p>A future website connection can bring in the homeowner’s name, property address, concern, preferred contact method and inquiry permission.</p>}
              {connection.id === 'enrichment' && <p>A client-owned subscription can add owner names and, where available, phone or email matches. Contact details do not establish permission to send a message.</p>}
            </div>

            <div className="rd-connection-footer">
              {connection.id === 'weather' && <a className="rd-btn rd-btn-secondary" href="https://www.spc.noaa.gov/climo/reports/" target="_blank" rel="noreferrer">Explore NOAA reports <Icon name="arrow" size={16} /></a>}

              {connection.id === 'customers' && (config.features.sampleImport
                ? <button className="rd-btn rd-btn-secondary" disabled={busy || snapshot.sampleImported} onClick={() => { void actions.importSample() }}><Icon name={snapshot.sampleImported ? 'check' : 'upload'} size={16} />{snapshot.sampleImported ? 'Sample customers imported' : 'Import sample customer CSV'}</button>
                : <span className="rd-tag">Sample import not enabled</span>)}

              {connection.id === 'website' && (config.features.websiteLeads
                ? <button className="rd-btn rd-btn-secondary" disabled={busy || !websiteLead} onClick={() => { if (websiteLead) onSelectProperty(websiteLead.id) }}>View sample inquiry <Icon name="arrow" size={16} /></button>
                : <span className="rd-tag">Website inquiries not enabled</span>)}

              {connection.id === 'enrichment' && <>
                {config.features.enrichment
                  ? <button className="rd-btn rd-btn-secondary" disabled={busy || !prospect} onClick={() => { if (prospect) onSelectProperty(prospect.id) }}>{prospect ? 'Explore a sample contact lookup' : 'No new sample prospects to explore'}<Icon name="arrow" size={16} /></button>
                  : <span className="rd-tag">Contact discovery not enabled</span>}
                <a href="https://batchdata.io/contact-enrichment" target="_blank" rel="noreferrer">Example provider: BatchData <Icon name="arrow" size={14} /></a>
              </>}
            </div>
          </article>
        ))}
      </div>

      <aside className="rd-info-panel">
        <div><Icon name="shield" size={24} /><h3>Your accounts. Your dashboard.</h3></div>
        <p>Each roofing company gets its own dashboard and owns its service accounts. This demo uses sample weather, properties and contacts. Production connections are configured separately.</p>
        <ol className="rd-setup-steps">
          <li><strong>1. Set your service area.</strong><p>Choose the places your team works and apply your company branding.</p></li>
          <li><strong>2. Bring your customer records.</strong><p>Connect your customer list and website inquiries using your accounts.</p></li>
          <li><strong>3. Choose your data services.</strong><p>Enable the weather coverage and optional homeowner details your team needs.</p></li>
        </ol>
      </aside>
    </section>
  )
}
