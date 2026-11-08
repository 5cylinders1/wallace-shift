import { credits } from './content'

/** Proof, set as end credits: role on the left of the line, names on the right. */
export default function Credits() {
  return (
    <section id="credits" className="otv-credits otv-dark" aria-labelledby="otv-credits-title">
      <div className="otv-wrap">
        <div className="otv-credits-head" data-rise>
          <p className="otv-kicker">The credits</p>
          <h2 id="otv-credits-title" className="otv-h2">ten years, rolling.</h2>
        </div>
        <div className="otv-credits-stat" data-rise>
          <strong>500<span>+</span></strong>
          <p>original digital series, pilots, short films and video art concepts in the OTV library.</p>
        </div>
        <dl className="otv-credits-roll" data-roll>
          {credits.map((c) => (
            <div key={c.role} className="otv-credit">
              <dt>{c.role}</dt>
              <dd>
                {c.names.map((name) => <span key={name}>{name}</span>)}
                {c.note && <small>{c.note}</small>}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
