import type { RefObject } from 'react'
import { layers } from '../content'

interface AnatomyProps {
  sectionRef: RefObject<HTMLElement | null>
  step: number
  finish: string
}

/**
 * The roof taken apart as you scroll. Each layer has its own block; the
 * block crossing the middle of the screen decides which layer the model
 * lifts and lights. Every word is in the page, not only on the model.
 */
export default function Anatomy({ sectionRef, step, finish }: AnatomyProps) {
  const name = (index: number) => (layers[index].key === 'finish' ? finish : layers[index].name)
  return <section ref={sectionRef} id="anatomy" className="st-anatomy st-stage-section" aria-labelledby="st-anatomy-title">
    <div className="st-step st-step-intro" data-step="0">
      <div className="st-wrap">
        <div className="st-card st-card-intro">
          <p className="st-kicker"><span>01</span>The roof, in section</p>
          <h2 id="st-anatomy-title">Nine layers between your family and the weather.</h2>
          <p>Most people only ever see the top one. Keep scrolling and the sample home’s roof comes apart in the order it is built, from the framing up.</p>
        </div>
      </div>
    </div>
    <ol className="st-layer-steps">
      {layers.map((layer, index) => <li key={layer.key} className={`st-step ${step === index + 1 ? 'is-current' : ''}`} data-step={index + 1}>
        <div className="st-wrap">
          <article className="st-card st-layer-card">
            <p className="st-layer-count"><span>{String(index + 1).padStart(2, '0')}</span> / 09 · {layer.short}</p>
            <h3>{name(index)}</h3>
            <p>{layer.text}</p>
            <p className="st-layer-check"><span aria-hidden="true">✓</span>{layer.check}</p>
          </article>
        </div>
      </li>)}
    </ol>
    <div className="st-step st-step-outro" data-step="10">
      <div className="st-wrap">
        <div className="st-card">
          <p className="st-layer-count">Assembled</p>
          <h3>One system, not nine products.</h3>
          <p>Each layer covers for the weakness of the one beneath it. That is why we photograph every layer before it is covered, and why a missing one can void a manufacturer’s warranty.</p>
        </div>
      </div>
    </div>
    <div className="st-progress" aria-hidden="true" style={{ opacity: step >= 1 && step <= 9 ? 1 : 0 }}>
      {layers.map((layer, index) => <span key={layer.key} className={step === index + 1 ? 'is-current' : step > index + 1 ? 'is-past' : ''} />)}
    </div>
  </section>
}
