import { useState } from 'react'
import { toggleSample, useBrief } from '../brief'
import { allMaterials as all, MAX_SAMPLES, materialGroups, sampleName, type Material } from '../content'
import { href, onLink } from '../routes'

/** The sample library: pick up to six real samples to see at the consultation. */
export default function MaterialLibrary() {
  const [group, setGroup] = useState<Material['group']>('wood')
  const [notice, setNotice] = useState('')
  const brief = useBrief()
  const items = all.filter(item => item.group === group)
  const intro = materialGroups.find(item => item.id === group)?.intro

  const toggle = (item: Material) => {
    const ok = toggleSample(item.id, MAX_SAMPLES)
    const has = brief.samples.includes(item.id)
    setNotice(!ok ? `Your sample box holds ${MAX_SAMPLES}. Remove one to add ${item.name}.` : has ? `${item.name} removed from your sample box.` : `${item.name} added to your sample box.`)
  }

  return <div className="tb-library">
    <div className="tb-library-bar">
      <div className="tb-tabs" role="tablist" aria-label="Material type">
        {materialGroups.map(item => <button key={item.id} type="button" role="tab" id={`tb-tab-${item.id}`} aria-selected={group === item.id}
          aria-controls="tb-library-panel" className={group === item.id ? 'is-active' : ''} onClick={() => setGroup(item.id)}>{item.label}</button>)}
      </div>
      <p className="tb-library-intro">{intro}</p>
    </div>
    <ul id="tb-library-panel" role="tabpanel" aria-labelledby={`tb-tab-${group}`} className={`tb-swatches is-${group}`}>
      {items.map(item => {
        const chosen = brief.samples.includes(item.id)
        return <li key={item.id} className={`tb-swatch ${chosen ? 'is-chosen' : ''}`}>
          <div className="tb-swatch-face">
            {item.image ? <img src={item.image} alt="" loading="lazy" decoding="async" width="480" height="640" /> : <span className="tb-swatch-paint" style={{ background: item.hex }} />}
          </div>
          <div className="tb-swatch-text">
            <h3>{item.name}</h3>
            <p>{item.note}</p>
            <button type="button" className="tb-swatch-toggle" aria-pressed={chosen} onClick={() => toggle(item)}>
              {chosen ? 'In your sample box' : 'Add to sample box'}<span className="tb-visually-hidden">: {item.name}</span>
            </button>
          </div>
        </li>
      })}
    </ul>
    <div className="tb-samplebox">
      <p className="tb-samplebox-count"><strong>{brief.samples.length}</strong> of {MAX_SAMPLES} samples chosen</p>
      <ul className="tb-samplebox-list" aria-label="Your sample box">
        {brief.samples.map(id => <li key={id}>{sampleName(id)}</li>)}
      </ul>
      <a className="tb-link-arrow" href={href.page('consultation')} onClick={onLink}>Bring them to my consultation <span aria-hidden="true">→</span></a>
      <p className="tb-visually-hidden" aria-live="polite">{notice}</p>
    </div>
  </div>
}
