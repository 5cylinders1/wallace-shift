import { useState } from 'react'
import { programs, type Program } from './content'
import { SignalStrip } from './Header'

const external = (href: string) => href.startsWith('http')

function Preview({ program }: { program: Program }) {
  return (
    <div className="otv-guide-monitor" aria-hidden="true">
      <div key={program.ch} className="otv-guide-screen">
        {program.preview.kind === 'photo'
          ? <img src={program.preview.src} alt="" loading="lazy" decoding="async" />
          : (
            <div className="otv-guide-card">
              <SignalStrip className="otv-strip--tall" />
              <strong>{program.preview.big}</strong>
            </div>
          )}
        <span className="otv-guide-bug">CH {program.ch}</span>
      </div>
      <p className="otv-guide-caption">
        <span>{program.name}</span>
        <span className={program.live ? 'is-live' : ''}>{program.status}</span>
      </p>
    </div>
  )
}

/**
 * Nine programs, listed like a printed TV guide. It replaces the 23-item
 * hashtag menu: one line each for what it is, who it is for, and whether it
 * is running right now.
 */
export default function Guide() {
  const [active, setActive] = useState(0)

  return (
    <section id="programs" className="otv-guide otv-light" aria-labelledby="otv-guide-title">
      <div className="otv-wrap">
        <div className="otv-guide-head" data-rise>
          <p className="otv-kicker">Programs</p>
          <h2 id="otv-guide-title" className="otv-h2">the program guide.</h2>
          <p className="otv-guide-intro">Everything OTV runs for viewers, artists and the people who back them, with what is on right now.</p>
        </div>

        <div className="otv-guide-grid">
          <ol className="otv-listings">
            {programs.map((program, i) => (
              <li key={program.ch} data-rise>
                <a
                  href={program.href}
                  className={`otv-listing${i === active ? ' is-active' : ''}`}
                  onMouseEnter={() => setActive(i)}
                  onFocus={() => setActive(i)}
                >
                  <span className="otv-listing-ch" aria-hidden="true">CH<b>{program.ch}</b></span>
                  <span className="otv-listing-main">
                    <span className="otv-listing-name">{program.name}</span>
                    <span className="otv-listing-tag">{program.tag}</span>
                  </span>
                  <span className="otv-listing-body">
                    {program.body}
                    <span className="otv-listing-for">For {program.audience.toLowerCase()}</span>
                  </span>
                  <span className={`otv-status${program.live ? ' is-live' : ''}`}><i aria-hidden="true" />{program.status}</span>
                  <span className="otv-listing-cta">{program.cta} <span aria-hidden="true">{external(program.href) ? '↗' : '→'}</span></span>
                </a>
              </li>
            ))}
          </ol>
          <div className="otv-guide-aside">
            <Preview program={programs[active]} />
          </div>
        </div>
      </div>
    </section>
  )
}
