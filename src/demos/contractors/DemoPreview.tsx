import { useEffect, useRef, useState } from 'react'
import { accessHref, previewDuration, type FilmDemo } from './catalog'

/** Mounted only after a watch action, so gallery browsing requests no videos. */
export default function DemoPreview({ demo, onClose }: { demo: FilmDemo; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [failed, setFailed] = useState(false)
  const [playBlocked, setPlayBlocked] = useState(false)

  useEffect(() => {
    const dialog = dialogRef.current
    const video = videoRef.current
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    if (!dialog) return
    let active = true
    dialog.showModal()
    closeRef.current?.focus()
    document.body.style.overflow = 'hidden'
    // React StrictMode replays effects in development. Cleanup pauses media,
    // so each setup must request playback rather than relying on autoPlay.
    void video?.play().catch(() => { if (active) setPlayBlocked(true) })
    return () => {
      active = false
      video?.pause()
      dialog.close()
      document.body.style.overflow = previousOverflow
      previousFocus?.focus({ preventScroll: true })
    }
  }, [])

  return <dialog ref={dialogRef} className="ct-preview" aria-labelledby="preview-title" aria-describedby="preview-disclosure"
    onCancel={event => { event.preventDefault(); onClose() }}
    onKeyDown={event => {
      if (event.key !== 'Tab') return
      const focusable = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], video[controls], [tabindex]:not([tabindex="-1"])')).filter(element => element.getClientRects().length > 0)
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if ((event.shiftKey && document.activeElement === first) || (!event.shiftKey && document.activeElement === last)) {
        event.preventDefault()
        const destination = event.shiftKey ? last : first
        destination?.focus()
      }
    }}
    onClick={event => { if (event.target === event.currentTarget) onClose() }}>
    <div className="ct-preview-inner">
      <div className="ct-preview-head">
        <div><p className="ct-eyebrow">{demo.trade} / {previewDuration(demo.durationSeconds)} preview</p><h2 id="preview-title">{demo.name}</h2></div>
        <button ref={closeRef} type="button" className="ct-preview-close" onClick={onClose} aria-label="Close demo preview">Close <span aria-hidden="true">×</span></button>
      </div>
      <video ref={videoRef} className="ct-preview-video" src={demo.video} poster={demo.thumbnail} controls autoPlay playsInline preload="metadata"
        aria-label={`${demo.name} video preview`}
        onError={() => setFailed(true)}
        onPlay={event => {
          setPlayBlocked(false)
          const active = event.currentTarget
          document.querySelectorAll<HTMLMediaElement>('video, audio').forEach(media => { if (media !== active) media.pause() })
        }}>
        <track kind="captions" src={demo.captions} srcLang="en" label="English" />
        Your browser cannot play this video. <a href={demo.video}>Open the preview file</a>.
      </video>
      {playBlocked && !failed && <div className="ct-preview-start"><p>Your preview is ready.</p><button type="button" className="ct-button" onClick={() => { void videoRef.current?.play().catch(() => setPlayBlocked(true)) }}>Play preview <span aria-hidden="true">▶</span></button></div>}
      {failed && <p className="ct-preview-error" role="alert">The preview could not load. <a href={demo.video}>Try opening the video directly</a>.</p>}
      <div className="ct-preview-foot"><div><p>{demo.summary}</p><p id="preview-disclosure" className="ct-preview-disclosure">{demo.disclosure} Narrated walkthrough with English captions. Sound and captions are available in the player controls.</p><p className="ct-preview-disclosure">Music: <a href="https://www.scottbuckley.com.au/library/a-kind-of-hope/" target="_blank" rel="noreferrer">“A Kind Of Hope” by Scott Buckley</a>, <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a>. Edited excerpt, mixed under narration.</p></div><a className="ct-button" href={accessHref(demo)}>Request interactive access <span aria-hidden="true">↗</span></a></div>
    </div>
  </dialog>
}
