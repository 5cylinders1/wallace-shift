import { useRef, useState } from 'react'
import gsap from 'gsap'
import { Flip } from 'gsap/Flip'
import { useGSAP } from '@gsap/react'
import { toggleSample, useBrief } from '../brief'
import { allMaterials as all, MAX_SAMPLES, materialGroups, sampleName, type Material } from '../content'
import { DUR, prefersReducedMotion } from '../motion'
import { href, onLink } from '../routes'

/** The sample library: pick up to six real samples to see at the consultation. */
export default function MaterialLibrary() {
  const [group, setGroup] = useState<Material['group']>('wood')
  const [notice, setNotice] = useState('')
  const brief = useBrief()
  const items = all.filter(item => item.group === group)
  const intro = materialGroups.find(item => item.id === group)?.intro
  const root = useRef<HTMLDivElement>(null)
  const firstGroup = useRef(true)

  // A new tab's swatches settle in one after another; the first set is left to the page's reveal.
  useGSAP(() => {
    if (firstGroup.current) { firstGroup.current = false; return }
    if (prefersReducedMotion()) return
    gsap.from(gsap.utils.toArray<HTMLElement>('.tb-swatch', root.current), { autoAlpha: 0, y: 28, duration: DUR.rise * 0.8, ease: 'drawer', stagger: 0.05 })
  }, { scope: root, dependencies: [group] })

  /** A copy of the swatch flies into the sample box count, which then settles. */
  const fly = (face: HTMLElement | null) => {
    const count = root.current?.querySelector<HTMLElement>('.tb-samplebox-count strong')
    if (!face || !count || prefersReducedMotion()) return
    const rect = face.getBoundingClientRect()
    const copy = face.cloneNode(true) as HTMLElement
    Object.assign(copy.style, { position: 'fixed', left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px`, margin: '0', zIndex: '60', pointerEvents: 'none', overflow: 'hidden' })
    copy.querySelectorAll('img').forEach(img => Object.assign(img.style, { width: '100%', height: '100%', objectFit: 'cover', display: 'block' }))
    copy.setAttribute('aria-hidden', 'true')
    document.body.appendChild(copy)
    gsap.to(copy, { autoAlpha: 0, duration: 0.22, delay: 0.6, ease: 'none' })
    Flip.fit(copy, count, { duration: 0.78, ease: 'hinge', scale: true, onComplete: () => {
      copy.remove()
      gsap.fromTo(count, { scale: 1.7 }, { scale: 1, duration: 0.7, ease: 'hinge' })
    } })
  }

  const toggle = (item: Material, button: HTMLButtonElement) => {
    const ok = toggleSample(item.id, MAX_SAMPLES)
    const has = brief.samples.includes(item.id)
    if (ok && !has) fly(button.closest('.tb-swatch')?.querySelector<HTMLElement>('.tb-swatch-face') ?? null)
    setNotice(!ok ? `Your sample box holds ${MAX_SAMPLES}. Remove one to add ${item.name}.` : has ? `${item.name} removed from your sample box.` : `${item.name} added to your sample box.`)
  }

  return <div className="tb-library" ref={root}>
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
            <button type="button" className="tb-swatch-toggle" aria-pressed={chosen} onClick={event => toggle(item, event.currentTarget)}>
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
