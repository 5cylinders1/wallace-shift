import { useEffect, useId, useRef, useState } from 'react'
import BeforeAfter from './BeforeAfter'
import { useHydrated } from './hooks'
import { IDEA_FINISHES, IDEA_STYLES, type IdeaFinishId, type IdeaStyleId } from './ideas/styles'
import { useLang } from './lang'
import { preparePhoto, saveIdea, type PreparedPhoto } from './photo'

const SAMPLE = { width: 1536, height: 1024 }
const sample = (name: string) => `/demos/lp-construction/ideas/${name}-1536.webp`
const RENDER_ENDPOINT = '/api/trim-render'

type Live = { checked: boolean; enabled: boolean; message: string }
type Render = { image: string; width: number; height: number }
type Status = { kind: 'idle' } | { kind: 'working' } | { kind: 'error'; message: string }

/**
 * "See a plain wall with new trim": the sample room's prepared looks, or a
 * concept made from the visitor's own photo when live concepts are on.
 * Prices are never generated here; they come from a free estimate.
 */
export default function RoomIdeas() {
  const id = useId()
  const { lang, t: all, href } = useLang()
  const t = all.ideas
  const hydrated = useHydrated()
  const fileInput = useRef<HTMLInputElement>(null)
  const [photo, setPhoto] = useState<PreparedPhoto | null>(null)
  const [photoError, setPhotoError] = useState(false)
  const [style, setStyle] = useState<IdeaStyleId>('frames')
  const [finish, setFinish] = useState<IdeaFinishId>('match')
  const [crown, setCrown] = useState(true)
  const [consent, setConsent] = useState(false)
  const [live, setLive] = useState<Live>({ checked: false, enabled: false, message: '' })
  const [render, setRender] = useState<Render | null>(null)
  const [status, setStatus] = useState<Status>({ kind: 'idle' })

  useEffect(() => {
    if (!photo || live.checked) return
    let stale = false
    fetch(RENDER_ENDPOINT, { headers: { accept: 'application/json' } })
      .then(response => response.json() as Promise<{ enabled?: boolean; message?: string }>)
      .then(body => { if (!stale) setLive({ checked: true, enabled: body.enabled === true, message: body.message ?? '' }) })
      .catch(() => { if (!stale) setLive({ checked: true, enabled: false, message: '' }) })
    return () => { stale = true }
  }, [photo, live.checked])

  const choose = async (file: File | undefined) => {
    if (!file) return
    setPhotoError(false)
    setRender(null)
    setStatus({ kind: 'idle' })
    try {
      const prepared = await preparePhoto(file)
      if (Math.min(prepared.width, prepared.height) < 256) throw new Error('small')
      setPhoto(prepared)
    } catch {
      setPhotoError(true)
    }
  }

  const create = async () => {
    if (!photo || !consent) return
    setStatus({ kind: 'working' })
    setRender(null)
    try {
      const response = await fetch(RENDER_ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ photo: photo.dataUrl, style, finish, crown, consent }),
      })
      const body = await response.json() as { ok?: boolean; image?: string; width?: number; height?: number; message?: string }
      // The server explains failures in English; Spanish visitors get the general message.
      if (!response.ok || !body.ok || !body.image) throw new Error(lang === 'en' && body.message ? body.message : t.failed)
      setRender({ image: body.image, width: body.width ?? photo.width, height: body.height ?? photo.height })
      setStatus({ kind: 'idle' })
    } catch (error) {
      setStatus({ kind: 'error', message: error instanceof Error && error.message ? error.message : t.failed })
    }
  }

  const handOff = () => {
    saveIdea({ style, finish, crown, photo: photo?.dataUrl ?? null, render: render?.image ?? null })
    window.location.href = href('/request')
  }

  const current = IDEA_STYLES.find(item => item.id === style)!
  const label = t.styles[style]
  const usingSample = !photo
  const sampleLook = usingSample && current.sample ? sample(`room-${current.sample}`) : null
  const sampled = IDEA_STYLES.filter(item => item.sample).map(item => t.styles[item.id].toLowerCase()).join(lang === 'es' ? ' y ' : ' and ')
  const liveOff = lang === 'en' && live.message ? live.message : t.liveOff

  return (
    <div className="lp-ideas">
      <div className="lp-ideas-controls">
        <fieldset className="lp-choice-group">
          <legend>{t.step1}</legend>
          <div className="lp-source-buttons">
            <button type="button" className="lp-button lp-button-quiet" aria-pressed={usingSample} onClick={() => { setPhoto(null); setRender(null); setStatus({ kind: 'idle' }) }}>{t.sample}</button>
            <button type="button" className="lp-button lp-button-quiet" aria-pressed={!usingSample} onClick={() => fileInput.current?.click()} disabled={!hydrated}>{photo ? t.anotherPhoto : t.myPhoto}</button>
          </div>
          <label className="lp-visually-hidden" htmlFor={`${id}-file`}>{t.photoLabel}</label>
          <input ref={fileInput} id={`${id}-file`} className="lp-visually-hidden" type="file" accept="image/*" tabIndex={-1} onChange={event => { void choose(event.target.files?.[0]); event.target.value = '' }} />
          <p className="lp-hint">{t.hint}</p>
          {photoError && <p className="lp-error" role="alert">{t.photoError}</p>}
        </fieldset>

        <fieldset className="lp-choice-group">
          <legend>{t.step2}</legend>
          <div className="lp-chips">
            {IDEA_STYLES.map(item => (
              <label key={item.id} className="lp-chip">
                <input type="radio" name={`${id}-style`} value={item.id} checked={style === item.id} onChange={() => { setStyle(item.id); setRender(null) }} />
                <span>{t.styles[item.id]}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {!usingSample && (
          <fieldset className="lp-choice-group">
            <legend>{t.step3}</legend>
            <div className="lp-chips">
              {IDEA_FINISHES.map(item => (
                <label key={item.id} className="lp-chip">
                  <input type="radio" name={`${id}-finish`} value={item.id} checked={finish === item.id} onChange={() => { setFinish(item.id); setRender(null) }} />
                  <span>{t.finishes[item.id]}</span>
                </label>
              ))}
            </div>
            <label className="lp-check">
              <input type="checkbox" checked={crown} onChange={event => { setCrown(event.target.checked); setRender(null) }} />
              <span>{t.crown}</span>
            </label>
          </fieldset>
        )}

        <div className="lp-ideas-cost">
          <h3>{t.costTitle}</h3>
          <p>{t.costText}</p>
        </div>
      </div>

      <div className="lp-ideas-view">
        {usingSample ? (
          sampleLook ? (
            <BeforeAfter
              before={sample('room')} after={sampleLook} width={SAMPLE.width} height={SAMPLE.height}
              beforeAlt={t.sampleAlt} afterAlt={t.sampleAfterAlt(label)}
            />
          ) : (
            <div className="lp-ideas-empty">
              <img src={sample('room')} alt={t.sampleAlt} width={SAMPLE.width} height={SAMPLE.height} loading="lazy" decoding="async" />
              <p>{t.sampleShows(sampled, label)}</p>
            </div>
          )
        ) : render ? (
          <BeforeAfter before={photo.dataUrl} after={render.image} width={render.width} height={render.height} beforeAlt={t.yourPhotoAlt} afterAlt={t.conceptAlt(label)} />
        ) : (
          <div className="lp-ideas-photo">
            <img src={photo.dataUrl} alt={t.yourPhotoAlt} width={photo.width} height={photo.height} />
          </div>
        )}
        <p className="lp-ideas-caption">{usingSample ? t.captionSample : render ? t.captionConcept : t.captionPhoto}</p>

        {!usingSample && !render && (
          <div className="lp-ideas-live">
            {!live.checked ? <p className="lp-hint">{t.checking}</p>
              : live.enabled ? (
                <>
                  <label className="lp-check">
                    <input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} />
                    <span>{t.consent}</span>
                  </label>
                  <button type="button" className="lp-button" disabled={!consent || status.kind === 'working'} onClick={() => void create()}>
                    {status.kind === 'working' ? t.making : t.make}
                  </button>
                </>
              ) : <p className="lp-hint">{liveOff} {t.liveOffSuffix}</p>}
            {status.kind === 'error' && <p className="lp-error" role="alert">{status.message}</p>}
          </div>
        )}

        <div className="lp-ideas-next">
          <button type="button" className="lp-button lp-button-accent" onClick={handOff} disabled={!hydrated}>
            {render ? t.requestLook : photo ? t.sendPhoto : t.request}
          </button>
        </div>
      </div>
    </div>
  )
}
