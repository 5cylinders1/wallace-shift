import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type FormEvent, type KeyboardEvent } from 'react'
import { MEDIA, links, rating, salon, services } from './content'
import { goToBooking, type Draft, type Step } from './draft'
import InquiryForm from './InquiryForm'
import OpenStatus from './OpenStatus'
import { bookableDays, windowsFor } from './schedule'
import { Arrow, Field, Star } from './ui'

function useMedia(query: string) {
  return useSyncExternalStore(
    (onChange) => {
      const media = window.matchMedia(query)
      media.addEventListener('change', onChange)
      return () => media.removeEventListener('change', onChange)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

/** Mix, paint, reveal: one looping reel, cropped separately for tall screens. */
function HeroVideo() {
  const video = useRef<HTMLVideoElement>(null)
  const portrait = useMedia('(max-aspect-ratio: 4/5)')
  const reduce = useMedia('(prefers-reduced-motion: reduce)')
  // null follows the visitor's motion setting; a click overrides it either way.
  const [override, setOverride] = useState<boolean | null>(null)
  const playing = override ?? !reduce

  const src = portrait ? `${MEDIA}/media/hero-720.mp4` : `${MEDIA}/media/hero-1920.mp4`
  const poster = portrait ? `${MEDIA}/media/hero-poster-720.webp` : `${MEDIA}/media/hero-poster-1920.webp`

  useEffect(() => {
    const el = video.current
    if (!el) return
    if (playing) el.play().catch(() => setOverride(false))
    else el.pause()
  }, [playing, src])

  return (
    <>
      <div className="sl-hero-media" aria-hidden="true">
        <video
          ref={video}
          key={src}
          src={src}
          poster={poster}
          muted
          loop
          playsInline
          autoPlay={playing}
          preload={playing ? 'auto' : 'none'}
          disablePictureInPicture
        />
        <div className="sl-hero-shade" />
      </div>
      <button
        type="button"
        className="sl-video-toggle"
        aria-pressed={!playing}
        onClick={() => setOverride(!playing)}
      >
        <span className="sl-video-icon" data-state={playing ? 'pause' : 'play'} aria-hidden="true" />
        <span className="sl-visually-hidden">{playing ? 'Pause background video' : 'Play background video'}</span>
      </button>
    </>
  )
}

type Tab = 'book' | 'ask'

interface CardProps {
  setDraft: (update: (draft: Draft) => Draft) => void
  setStep: (step: Step) => void
}

/** Start a booking or ask a question without leaving the first screen. */
function HeroCard({ setDraft, setStep }: CardProps) {
  const [tab, setTab] = useState<Tab>('book')
  const days = useMemo(() => bookableDays(14), [])
  const [service, setService] = useState('')
  const [day, setDay] = useState('')
  const [window_, setWindow] = useState('any')
  const [error, setError] = useState('')
  const tabs = useRef<Record<Tab, HTMLButtonElement | null>>({ book: null, ask: null })
  const serviceRef = useRef<HTMLSelectElement>(null)

  const selectedDay = days.find((d) => d.iso === day)
  const windows = selectedDay ? windowsFor(selectedDay.weekday) : []

  const onTabKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
    event.preventDefault()
    const next: Tab = tab === 'book' ? 'ask' : 'book'
    setTab(next)
    tabs.current[next]?.focus()
  }

  const onContinue = (event: FormEvent) => {
    event.preventDefault()
    if (!service) {
      setError('Choose a service to continue.')
      serviceRef.current?.focus()
      return
    }
    setError('')
    setDraft(() => ({ services: [service], day, window: day ? window_ : '' }))
    // Skip ahead to whatever is still missing.
    setStep(day ? 3 : 2)
    goToBooking()
  }

  return (
    <div className="sl-card" data-hero-rise>
      <div className="sl-tabs" role="tablist" aria-label="Book or ask">
        {(['book', 'ask'] as const).map((id) => (
          <button
            key={id}
            ref={(el) => { tabs.current[id] = el }}
            type="button"
            role="tab"
            id={`hero-tab-${id}`}
            aria-selected={tab === id}
            aria-controls={`hero-panel-${id}`}
            tabIndex={tab === id ? 0 : -1}
            onClick={() => setTab(id)}
            onKeyDown={onTabKey}
          >
            {id === 'book' ? 'Book a visit' : 'Ask a question'}
          </button>
        ))}
      </div>

      <div id="hero-panel-book" role="tabpanel" aria-labelledby="hero-tab-book" hidden={tab !== 'book'} className="sl-card-panel">
        <form className="sl-form sl-form--compact" onSubmit={onContinue} noValidate>
          <Field label="Service" error={error}>
            {(p) => (
              <select {...p} ref={serviceRef} value={service} onChange={(e) => { setService(e.target.value); setError('') }}>
                <option value="">Choose a service</option>
                {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            )}
          </Field>
          <div className="sl-field-row">
            <Field label="Day" optional>
              {(p) => (
                <select {...p} value={day} onChange={(e) => { setDay(e.target.value); setWindow('any') }}>
                  <option value="">Choose later</option>
                  {days.map((d) => <option key={d.iso} value={d.iso}>{d.label}</option>)}
                </select>
              )}
            </Field>
            <Field label="Time of day" optional>
              {(p) => (
                <select {...p} value={window_} disabled={!selectedDay} onChange={(e) => setWindow(e.target.value)}>
                  {!selectedDay && <option value="any">Pick a day first</option>}
                  {windows.map((w) => <option key={w.id} value={w.id}>{w.label}</option>)}
                </select>
              )}
            </Field>
          </div>
          <button type="submit" className="sl-btn sl-btn--dark sl-btn--block">Continue booking <Arrow /></button>
          <p className="sl-card-note">Lara confirms every request. Or call <a href={salon.phoneHref}>{salon.phone}</a>.</p>
        </form>
      </div>

      <div id="hero-panel-ask" role="tabpanel" aria-labelledby="hero-tab-ask" hidden={tab !== 'ask'} className="sl-card-panel">
        <InquiryForm compact />
      </div>
    </div>
  )
}

export default function Hero(props: CardProps) {
  return (
    <section id="top" className="sl-hero" aria-labelledby="hero-title">
      <HeroVideo />
      <div className="sl-wrap sl-hero-inner">
        <div className="sl-hero-copy">
          <p className="sl-eyebrow sl-eyebrow--light" data-hero-rise>Haircolor &amp; cuts · {salon.area}</p>
          <h1 id="hero-title" className="sl-h1" data-hero-rise>
            Haircolor, <em>made for&nbsp;you.</em>
          </h1>
          <p className="sl-hero-lede" data-hero-rise>
            {salon.stylist} specializes in haircolor and customized looks for women of all ages, from soft
            highlights and vivid color to careful color correction.
          </p>
          <div className="sl-hero-actions" data-hero-rise>
            <a className="sl-btn sl-btn--light" href="#book">Book a visit <Arrow /></a>
            <a className="sl-btn sl-btn--ghost-light" href="#ask">Ask a question</a>
          </div>
          <div className="sl-hero-meta" data-hero-rise>
            <a className="sl-rating" href={links.googleReviews} target="_blank" rel="noopener noreferrer">
              <Star />
              <span><strong>{rating.score}</strong> out of 5 · {rating.count} Google reviews</span>
            </a>
            <OpenStatus className="sl-open--light" />
          </div>
        </div>
        <HeroCard {...props} />
      </div>
    </section>
  )
}
