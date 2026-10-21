import { useRef, useState } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { anatomy } from '../content'
import { prefersReducedMotion } from '../motion'
import Photo from './Photo'

/** Numbered details on one real kitchen photograph, each explained beside it. */
export default function Anatomy() {
  const [active, setActive] = useState(anatomy[0].id)
  const current = anatomy.find(item => item.id === active) ?? anatomy[0]
  const index = anatomy.indexOf(current)
  const detail = useRef<HTMLDivElement>(null)
  const shown = useRef(active)

  // Each new detail rises into the panel; the first one is left to the page's own reveal.
  useGSAP(() => {
    if (shown.current === active || prefersReducedMotion()) { shown.current = active; return }
    shown.current = active
    gsap.from(detail.current?.children ?? [], { y: 16, autoAlpha: 0, duration: 0.55, ease: 'drawer', stagger: 0.05 })
  }, { scope: detail, dependencies: [active] })

  return <div className="tb-anatomy">
    <div className="tb-anatomy-photo" data-survey>
      <Photo slug="kitchen-anatomy" sizes="(min-width: 1180px) 62vw, 100vw" />
      <div className="tb-hotspots">
        {anatomy.map((item, n) => <button key={item.id} type="button" className={`tb-hotspot ${item.id === active ? 'is-active' : ''}`}
          style={{ left: `${item.x}%`, top: `${item.y}%` }} aria-pressed={item.id === active} aria-controls="tb-anatomy-detail"
          onClick={() => setActive(item.id)}>
          <span aria-hidden="true">{n + 1}</span>
          <span className="tb-visually-hidden">{item.title}</span>
        </button>)}
      </div>
    </div>
    <div className="tb-anatomy-side">
      <div id="tb-anatomy-detail" ref={detail} className="tb-anatomy-detail" aria-live="polite">
        <p className="tb-label">Detail {index + 1} of {anatomy.length}</p>
        <h3>{current.title}</h3>
        <p>{current.body}</p>
      </div>
      <ol className="tb-anatomy-list">
        {anatomy.map((item, n) => <li key={item.id}>
          <button type="button" className={item.id === active ? 'is-active' : ''} aria-pressed={item.id === active} onClick={() => setActive(item.id)}>
            <span className="tb-anatomy-n" aria-hidden="true">{String(n + 1).padStart(2, '0')}</span>{item.title}
          </button>
        </li>)}
      </ol>
    </div>
  </div>
}
