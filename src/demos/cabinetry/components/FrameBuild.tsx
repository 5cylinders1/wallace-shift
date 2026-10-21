import { useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { buildSrc, type Build } from '../builds'
import { MOTION_OK } from '../motion'

/**
 * Three stages of a scroll-built room inside an ordinary image frame: as the
 * frame crosses the screen, each later stage wipes in over the one before. No
 * pinning; the scroll position of the frame itself drives it. Reduced motion
 * shows the last stage only (the CSS default).
 */
export default function FrameBuild({ build, stages, label }: { build: Build; stages: [string, string, string]; label: string }) {
  const root = useRef<HTMLDivElement>(null)
  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add(MOTION_OK, () => {
      const layers = gsap.utils.toArray<HTMLElement>('.tb-build-wipe', root.current)
      const state = layers.map(() => ({ v: 0 }))
      layers.forEach(layer => layer.style.setProperty('--w', '0'))
      const timeline = gsap.timeline({ scrollTrigger: { trigger: root.current, start: 'top 82%', end: 'bottom 38%', scrub: 0.6 } })
      layers.forEach((layer, n) => timeline.to(state[n], { v: 1, duration: 1, ease: 'tambour', onUpdate: () => layer.style.setProperty('--w', state[n].v.toFixed(4)) }, n * 1.25))
      return () => layers.forEach(layer => layer.style.removeProperty('--w'))
    })
  }, { scope: root })

  return <div ref={root} className="tb-frame-build" role="img" aria-label={label}>
    {stages.map((stage, n) => <img key={stage} className={`tb-build-layer ${n ? 'tb-build-wipe' : ''}`} src={buildSrc(build, stage)} alt=""
      width="1536" height="1024" loading="lazy" decoding="async" draggable={false} />)}
    <span className="tb-frame-build-note" aria-hidden="true">Generated build sequence</span>
  </div>
}
