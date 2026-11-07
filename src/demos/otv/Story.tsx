import { useRef, useState, type CSSProperties } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { milestones, tracks, type Milestone } from './content'
import { SignalStrip } from './Header'
import { useDesktop, useReducedMotion } from './hooks'

gsap.registerPlugin(ScrollTrigger, useGSAP)

/** The ruler runs 2015 to just past 2026, so "Now" sits inside the frame. */
const SPAN = 11.6
const LAST = milestones[milestones.length - 1].at
const YEARS = Array.from({ length: 12 }, (_, i) => 2015 + i)
const pct = (years: number) => `${(years / SPAN) * 100}%`

function Visual({ milestone, eager = false }: { milestone: Milestone; eager?: boolean }) {
  const v = milestone.visual
  if (v.kind === 'photo') return <img src={v.src} alt={v.alt} loading={eager ? 'eager' : 'lazy'} decoding="async" />
  return (
    <div className="otv-testcard">
      <SignalStrip className="otv-strip--card" />
      <div className="otv-testcard-slab">
        <strong>{v.big}</strong>
        <span>{v.small}</span>
      </div>
    </div>
  )
}

function Intro() {
  return (
    <div className="otv-wrap otv-story-intro" data-rise>
      <p className="otv-kicker">Our story</p>
      <h2 id="otv-story-title" className="otv-h2">ten years of open television.</h2>
      <p className="otv-story-mission">
        OTV exists to change how film, television and entertainment support intersectional artists and communities, and to help the next generation of storytellers thrive.
      </p>
    </div>
  )
}

/** Phones, tablets and reduced motion: the same story as a plain list. */
function StoryList() {
  return (
    <ol className="otv-wrap otv-story-list">
      {milestones.map((m) => (
        <li key={m.year} className="otv-story-item" data-rise>
          <div className="otv-story-item-visual"><Visual milestone={m} /></div>
          <p className="otv-story-year">{m.year}</p>
          <h3 className="otv-story-item-title">{m.title}</h3>
          <p className="otv-story-item-body">{m.body}</p>
        </li>
      ))}
    </ol>
  )
}

/**
 * Desktop: an editing timeline. The section pins, and scrolling drags the
 * playhead across ten years of program tracks; the monitor cuts to whatever
 * milestone the playhead is parked on.
 */
function StoryTimeline() {
  const [active, setActive] = useState(0)
  const pin = useRef<HTMLDivElement>(null)
  const nle = useRef<HTMLDivElement>(null)
  const tc = useRef<HTMLSpanElement>(null)
  const trigger = useRef<ScrollTrigger | null>(null)

  useGSAP(() => {
    const node = nle.current
    if (!pin.current || !node) return
    const update = (progress: number) => {
      const pos = progress * LAST
      node.style.setProperty('--pos', pos.toFixed(3))
      let index = 0
      milestones.forEach((m, i) => { if (m.at <= pos + 0.02) index = i })
      setActive(index)
      if (tc.current) tc.current.textContent = pos >= LAST - 0.02 ? 'NOW' : String(2015 + Math.floor(pos + 0.02))
    }
    trigger.current = ScrollTrigger.create({
      trigger: pin.current,
      start: 'top top',
      end: () => `+=${window.innerHeight * milestones.length * 0.55}`,
      pin: true,
      scrub: 0.5,
      snap: { snapTo: milestones.map((m) => m.at / LAST), duration: { min: 0.2, max: 0.6 }, delay: 0.1, ease: 'power1.inOut' },
      onUpdate: (self) => update(self.progress),
      invalidateOnRefresh: true,
    })
    update(0)
    return () => { trigger.current = null }
  }, { scope: pin })

  const jump = (m: Milestone) => {
    const st = trigger.current
    if (!st) return
    window.scrollTo({ top: st.start + (st.end - st.start) * (m.at / LAST) + 1, behavior: 'smooth' })
  }

  const current = milestones[active]

  return (
    <div ref={pin} className="otv-story-pin">
      <div className="otv-wrap otv-story-stage">
        <div className="otv-story-monitor">
          {milestones.map((m, i) => (
            <div key={m.year} className={`otv-story-frame${i === active ? ' is-on' : ''}`} aria-hidden="true">
              <Visual milestone={m} eager={i < 2} />
            </div>
          ))}
          <span className="otv-guide-bug">REC <i aria-hidden="true" /></span>
        </div>
        <div className="otv-story-text" aria-hidden="true">
          <p key={`y-${current.year}`} className="otv-story-big">{current.year}</p>
          <p key={`t-${current.year}`} className="otv-story-title">{current.title}</p>
          <p key={`b-${current.year}`} className="otv-story-body">{current.body}</p>
        </div>
        {/* The scrubbed view shows one milestone at a time; assistive tech gets all of them. */}
        <ol className="otv-sr">
          {milestones.map((m) => (
            <li key={m.year}>
              <h3>{m.year}: {m.title}</h3>
              <p>{m.body}</p>
            </li>
          ))}
        </ol>
      </div>

      <div ref={nle} className="otv-wrap otv-nle" style={{ '--pos': 0 } as CSSProperties}>
        <div className="otv-nle-head">
          <span>Sequence · Open Television</span>
          <span className="otv-nle-tc">TC <span ref={tc}>2015</span></span>
        </div>
        <div className="otv-nle-body">
          <div className="otv-nle-labels" aria-hidden="true">
            <span />
            {tracks.map((t) => <span key={t.label}>{t.label}</span>)}
          </div>
          <div className="otv-nle-lanes">
            <div className="otv-nle-ruler">
              {YEARS.map((y) => <span key={y} className="otv-nle-tick" style={{ left: pct(y - 2015) }}>{y}</span>)}
              {milestones.map((m) => (
                <button
                  key={m.year}
                  type="button"
                  className={`otv-nle-marker${m.year === current.year ? ' is-on' : ''}`}
                  style={{ left: pct(m.at) }}
                  onClick={() => jump(m)}
                  aria-label={`Jump to ${m.year}: ${m.title}`}
                />
              ))}
            </div>
            {tracks.map((t) => (
              <div key={t.label} className="otv-nle-lane" aria-hidden="true">
                <span
                  className="otv-nle-clip"
                  data-tone={t.tone}
                  style={{ left: pct(t.from), width: pct(t.to - t.from), '--from': t.from, '--to': t.to } as CSSProperties}
                >
                  <i />
                  <b>{t.label}</b>
                </span>
              </div>
            ))}
            <div className="otv-nle-playhead" aria-hidden="true" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Story() {
  const desktop = useDesktop()
  const reduced = useReducedMotion()
  return (
    <section id="story" className="otv-story otv-dark" aria-labelledby="otv-story-title">
      <Intro />
      {desktop && !reduced ? <StoryTimeline /> : <StoryList />}
    </section>
  )
}
