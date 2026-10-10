import { warranty } from '../content'
import './Warranty.css'

export function Warranty() {
  return (
    <section id="warranty" className="rf-section rf-warranty" aria-labelledby="rf-warranty-title">
      <div className="rf-container">
        <div className="rf-section__head rf-section__head--split" data-reveal>
          <div>
            <p className="rf-eyebrow">{warranty.eyebrow}</p>
            <h2 id="rf-warranty-title" className="rf-display">
              {warranty.title}
            </h2>
          </div>
          <p className="rf-lede">{warranty.lede}</p>
        </div>

        <ol className="rf-layers">
          {warranty.layers.map((layer, index) => (
            <li key={layer.name} className={`rf-layer rf-layer--${index + 1}`} data-reveal>
              <p className="rf-layer__tag">{layer.tag}</p>
              <h3 className="rf-layer__name">{layer.name}</h3>
              <p className="rf-layer__term">{layer.term}</p>
              <p className="rf-layer__body">{layer.body}</p>
            </li>
          ))}
        </ol>
        <p className="rf-warranty__repairs" data-reveal>
          {warranty.repairs}
        </p>

        <div className="rf-warranty__voids" data-reveal>
          <h3 className="rf-subhead">{warranty.voids.title}</h3>
          <ul>
            {warranty.voids.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <p className="rf-demo-note rf-warranty__note">{warranty.demoNote}</p>
      </div>
    </section>
  )
}
