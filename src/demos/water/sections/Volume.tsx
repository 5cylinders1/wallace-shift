import { useEffect, useRef, type RefObject } from 'react'
import { volume } from '../content'
import { gallonsPerYear } from '../engine/volume'
import type { WaterEngine } from '../engine/WaterEngine'

interface VolumeProps {
  sectionRef: RefObject<HTMLElement | null>
  active: boolean
  people: number
  onPeople: (value: number) => void
  engine: WaterEngine | null
  uses: readonly { id: string; label: string; share: number }[]
}

const format = new Intl.NumberFormat('en-US')

/** The controls and the end-use legend for the year-of-water block. */
export default function Volume({ sectionRef, active, people, onPeople, engine, uses }: VolumeProps) {
  const tags = useRef<(HTMLLIElement | null)[]>([])
  const gallons = gallonsPerYear(people)

  // The legend also labels the block itself, on wide screens, by following it.
  useEffect(() => {
    if (!engine) return
    return engine.onFrame((frame) => {
      // Bands run bottom to top. The thin ones are shorter than a label, so push each clear of the last.
      let ceiling = Infinity
      tags.current.forEach((element, index) => {
        if (!element) return
        const point = frame.anchors[`band${index}`]
        if (!point) return
        const y = Math.min(point.y, ceiling)
        ceiling = y - 25
        element.style.setProperty('--x', `${point.x.toFixed(1)}px`)
        element.style.setProperty('--y', `${y.toFixed(1)}px`)
      })
    })
  }, [engine])

  return <section ref={sectionRef} className="rf-chapter rf-volume" aria-labelledby="rf-volume-title">
    <article data-step className="rf-step is-current">
      <div className="rf-copy">
        <div className="rf-tool-intro">
          <p className="rf-kicker">{volume.kicker}</p>
          <h2 id="rf-volume-title">{volume.title}</h2>
          <p>{volume.body}</p>
        </div>

        <div className="rf-tool-controls">
        <p className="rf-big" aria-live="polite"><strong>{format.format(gallons)}</strong> gallons a year</p>

        <div className="rf-sliders">
          <label className="rf-slider">
            <span><span>{volume.peopleLabel}</span><span className="rf-slider-value">{people}</span></span>
            <input type="range" aria-label={volume.peopleLabel} min={1} max={8} step={1} value={people} onChange={(event) => onPeople(Number(event.target.value))} />
          </label>
        </div>

        <a className="rf-link" href="#cost">See what it costs for {people} {people === 1 ? 'person' : 'people'}</a>
        <p className="rf-footnote">{volume.note}</p>
        </div>
      </div>
    </article>
    <ol className={`rf-bands ${active ? 'is-active' : ''}`} aria-label="Where a household’s indoor water goes">
      {uses.map((use, index) => <li key={use.id} ref={(element) => { tags.current[index] = element }} className={use.id === 'faucets' ? 'is-lit' : ''}>
        <span>{use.label}</span><strong>{use.share}%</strong>
      </li>)}
    </ol>
  </section>
}
