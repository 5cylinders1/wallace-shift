import { doors } from './content'

const external = (href: string) => href.startsWith('http')

/** Three audiences, three doors. The heading is OTV's own line from its current home page. */
export default function Doors() {
  return (
    <section id="ways" className="otv-doors otv-light" aria-labelledby="otv-doors-title">
      <div className="otv-wrap">
        <div className="otv-section-head" data-rise>
          <p className="otv-kicker">Three ways in</p>
          <h2 id="otv-doors-title" className="otv-h2">tap into a new wave.</h2>
        </div>
        <ol className="otv-door-list">
          {doors.map((door) => (
            <li key={door.id} className="otv-door" data-door={door.id} data-rise>
              <span className="otv-door-bar" aria-hidden="true" />
              <p className="otv-door-label"><span>{door.index}</span>{door.label}</p>
              <h3 className="otv-door-title">{door.title}</h3>
              <p className="otv-door-body">{door.body}</p>
              <ul className="otv-door-actions">
                {door.actions.map((action) => (
                  <li key={action.label}>
                    <a href={action.href} className="otv-link">
                      {action.label} <span aria-hidden="true">{external(action.href) ? '↗' : '→'}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
