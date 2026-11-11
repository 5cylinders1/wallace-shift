import { useEffect, useMemo, useRef, useState } from 'react'
import { chapters, practice, symptoms, type Symptom } from './content'
import { chapterShot, symptomForBone, symptomShot } from './shots'
import { useNarrow, useStage, useStageSection } from './stage-context'
import { Arrow, HoldTimer, OpenStatus, Star } from './ui'

export function Hero() {
  const ref = useRef<HTMLElement>(null)
  const narrow = useNarrow()
  const shot = useMemo(() => chapterShot('hero', narrow), [narrow])
  useStageSection(ref, shot)
  return (
    <section ref={ref} id="top" className="dp-hero" aria-labelledby="hero-title">
      <div className="dp-wrap dp-hero-inner">
        <p className="dp-eyebrow" data-rise>Chiropractor · South Overland Park</p>
        <h1 id="hero-title" className="dp-h1" data-rise>Move like yourself again.</h1>
        <p className="dp-lede" data-rise>
          {practice.doctor} finds where your pain is really coming from, shows you on your own X-rays,
          and builds a plan to fix it, not just quiet it for a day.
        </p>
        <div className="dp-actions" data-rise>
          <a className="dp-btn dp-btn--primary" href="#book">Book a visit <Arrow /></a>
          <a className="dp-btn dp-btn--ghost" href="#symptoms">Where does it hurt?</a>
        </div>
        <div className="dp-hero-meta" data-rise>
          <a className="dp-rating" href="#reviews"><Star /> <strong>{practice.rating}</strong> from {practice.reviewCount} Google reviews</a>
          <OpenStatus />
        </div>
      </div>
      <a className="dp-scroll-cue" href="#spine" data-rise><span>Explore the spine</span><i aria-hidden="true" /></a>
    </section>
  )
}

function Chapter({ index, id, eyebrow, title, body, facts }: (typeof chapters)[number] & { index: number }) {
  const ref = useRef<HTMLElement>(null)
  const narrow = useNarrow()
  const shot = useMemo(() => chapterShot(id, narrow), [id, narrow])
  useStageSection(ref, shot)
  return (
    <section ref={ref} className="dp-chapter" id={index === 0 ? 'spine' : undefined} data-chapter={id} aria-labelledby={`ch-${id}`}>
      <div className="dp-wrap">
        <div className="dp-chapter-card" data-rise>
          <p className="dp-eyebrow">{String(index + 1).padStart(2, '0')} · {eyebrow}</p>
          <h2 id={`ch-${id}`} className="dp-h2">{title}</h2>
          <p className="dp-chapter-body">{body}</p>
          <ul className="dp-chapter-facts" aria-label="Common here">
            {facts.map((f) => <li key={f}>{f}</li>)}
          </ul>
        </div>
      </div>
    </section>
  )
}

export function Journey() {
  return (
    <div className="dp-journey">
      {chapters.map((c, i) => <Chapter key={c.id} index={i} {...c} />)}
    </div>
  )
}

interface ExplorerProps {
  onBook: (reason: string) => void
}

export function Explorer({ onBook }: ExplorerProps) {
  const ref = useRef<HTMLElement>(null)
  const detail = useRef<HTMLDivElement>(null)
  const narrow = useNarrow()
  const { onSelect, status } = useStage()
  const [selected, setSelected] = useState<Symptom>(symptoms[5])
  const [tab, setTab] = useState<'causes' | 'moves' | 'flags' | 'help'>('moves')
  const shot = useMemo(() => symptomShot(selected, narrow), [selected, narrow])
  useStageSection(ref, shot)

  const choose = (s: Symptom, focusDetail = false) => {
    setSelected(s)
    if (focusDetail) window.requestAnimationFrame(() => detail.current?.focus({ preventScroll: true }))
  }

  // Clicking a vertebra on the model opens the matching symptom.
  useEffect(() => {
    onSelect((hit) => {
      const match = symptomForBone(hit.name, symptoms)
      if (!match) return
      setSelected(match)
      document.getElementById('symptoms')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })
    })
    return () => onSelect(null)
  }, [onSelect])

  const tabs = [
    { id: 'moves', label: 'Try this' },
    { id: 'causes', label: 'Common causes' },
    { id: 'flags', label: 'Get checked now if' },
    { id: 'help', label: 'How we help' },
  ] as const

  return (
    <section ref={ref} id="symptoms" className="dp-explorer" aria-labelledby="explorer-title">
      <div className="dp-wrap dp-explorer-grid">
        <div className="dp-explorer-panel">
          <p className="dp-eyebrow">Symptom guide</p>
          <h2 id="explorer-title" className="dp-h2">Where does it hurt?</h2>
          <p className="dp-explorer-intro">
            Pick what you’re feeling{status === 'ready' ? ', or click a vertebra on the spine,' : ''} to see what’s often behind it and a few
            safe moves to try today.
          </p>

          {narrow && <div className="dp-explorer-window" aria-hidden="true" />}

          <div className="dp-symptoms" role="group" aria-label="Symptoms">
            {symptoms.map((s) => (
              <button
                key={s.id}
                type="button"
                aria-pressed={selected.id === s.id}
                className="dp-symptom"
                onClick={() => choose(s, true)}
              >
                <span className="dp-symptom-region">{s.region}</span>
                <span className="dp-symptom-label">{s.label}</span>
              </button>
            ))}
          </div>

          <div ref={detail} className="dp-detail" tabIndex={-1} role="region" aria-labelledby="detail-title">
            <div className="dp-detail-head">
              <p className="dp-detail-levels">{selected.bones.join(' · ')}{selected.nerves?.length ? ' + nerve roots' : ''}</p>
              <h3 id="detail-title" className="dp-h3">{selected.label}</h3>
              <p className="dp-detail-summary">{selected.summary}</p>
            </div>

            <div className="dp-tabs" role="tablist" aria-label={`${selected.label} guide`}>
              {tabs.map((t) => (
                <button key={t.id} type="button" role="tab" id={`tab-${t.id}`} aria-selected={tab === t.id} aria-controls={`panel-${t.id}`} tabIndex={tab === t.id ? 0 : -1}
                  onClick={() => setTab(t.id)}
                  onKeyDown={(e) => {
                    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
                    e.preventDefault()
                    const i = tabs.findIndex((x) => x.id === tab)
                    const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length].id
                    setTab(next)
                    document.getElementById(`tab-${next}`)?.focus()
                  }}>
                  {t.label}
                </button>
              ))}
            </div>

            <div id="panel-moves" role="tabpanel" aria-labelledby="tab-moves" hidden={tab !== 'moves'} className="dp-panel">
              <ol className="dp-moves">
                {selected.moves.map((m) => (
                  <li key={m.name}>
                    <div>
                      <h4>{m.name}</h4>
                      <p>{m.how}</p>
                      <p className="dp-dose">{m.dose}</p>
                    </div>
                    {m.hold && <HoldTimer key={`${selected.id}-${m.name}`} seconds={m.hold} label={m.name} />}
                  </li>
                ))}
              </ol>
              <p className="dp-caution">Move slowly and stay in a comfortable range. Stop if anything causes sharp pain, or numbness or tingling that spreads.</p>
            </div>

            <div id="panel-causes" role="tabpanel" aria-labelledby="tab-causes" hidden={tab !== 'causes'} className="dp-panel">
              <ul className="dp-bullets">{selected.causes.map((c) => <li key={c}>{c}</li>)}</ul>
            </div>

            <div id="panel-flags" role="tabpanel" aria-labelledby="tab-flags" hidden={tab !== 'flags'} className="dp-panel dp-panel--flags">
              <p className="dp-flags-lead">Skip the stretches and get medical care right away if you have:</p>
              <ul className="dp-bullets">{selected.redFlags.map((c) => <li key={c}>{c}</li>)}</ul>
              <p className="dp-flags-911">For anything that feels like an emergency, call 911.</p>
            </div>

            <div id="panel-help" role="tabpanel" aria-labelledby="tab-help" hidden={tab !== 'help'} className="dp-panel">
              <ul className="dp-bullets">{selected.help.map((c) => <li key={c}>{c}</li>)}</ul>
            </div>

            <figure className="dp-detail-quote">
              <blockquote>“{selected.quote.text}”</blockquote>
              <figcaption>{selected.quote.name}, Google review</figcaption>
            </figure>

            <div className="dp-detail-actions">
              <button type="button" className="dp-btn dp-btn--primary" onClick={() => onBook(selected.label)}>Book a visit for this <Arrow /></button>
              <a className="dp-btn dp-btn--ghost" href={practice.phoneHref}>Call {practice.phone}</a>
            </div>
            <p className="dp-disclaimer">General information, not a diagnosis. Patient experiences vary.</p>
          </div>
        </div>
      </div>
    </section>
  )
}
