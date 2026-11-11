import { useEffect, useRef, useState } from 'react'
import { MEDIA, work, workFilters, type WorkTag } from './content'

const thumb = (slug: string) => `${MEDIA}/work/${slug}-640.webp`
const large = (slug: string) => `${MEDIA}/work/${slug}-1400.webp`

/** Lara's own photos from the salon's Google profile, filterable, with a keyboard-friendly viewer. */
export default function Work() {
  const [filter, setFilter] = useState<'all' | WorkTag>('all')
  const [open, setOpen] = useState<number | null>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const opener = useRef<HTMLButtonElement | null>(null)

  const shown = filter === 'all' ? work : work.filter((p) => p.tag === filter)
  const current = open === null ? null : shown[open]

  useEffect(() => {
    const el = dialog.current
    if (!el) return
    if (open !== null && !el.open) {
      el.showModal()
      el.querySelector<HTMLButtonElement>('.sl-lightbox-close')?.focus()
    }
    if (open === null && el.open) el.close()
  }, [open])

  const step = (delta: number) => setOpen((i) => (i === null ? i : (i + delta + shown.length) % shown.length))

  return (
    <section id="work" className="sl-section sl-work" aria-labelledby="work-title">
      <div className="sl-wrap">
        <div className="sl-section-head" data-rise>
          <p className="sl-eyebrow">From Lara’s chair</p>
          <h2 id="work-title" className="sl-h2">Color you can <em>see.</em></h2>
          <p className="sl-lede">Cuts, color and corrections by Lara, from SoLara’s own photos. Tap any photo to see it larger.</p>
        </div>

        <div className="sl-filters" role="group" aria-label="Filter photos" data-rise>
          {workFilters.map((f) => (
            <button key={f.id} type="button" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
              {f.label}
              <span className="sl-filter-count">{f.id === 'all' ? work.length : work.filter((p) => p.tag === f.id).length}</span>
            </button>
          ))}
        </div>

        <ul className="sl-gallery" aria-live="polite">
          {shown.map((photo, i) => (
            <li key={photo.slug} className="sl-gallery-item" data-shape={photo.h > photo.w ? 'tall' : 'square'}>
              <button
                type="button"
                className="sl-gallery-btn"
                onClick={(e) => { opener.current = e.currentTarget; setOpen(i) }}
                aria-label={`${photo.title}: view larger`}
              >
                <img
                  src={thumb(photo.slug)}
                  alt={photo.alt}
                  width={photo.w}
                  height={photo.h}
                  loading="lazy"
                  decoding="async"
                />
                {!photo.captioned && <span className="sl-gallery-caption" aria-hidden="true">{photo.title}</span>}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <dialog
        ref={dialog}
        className="sl-lightbox"
        aria-label={current ? current.title : 'Photo viewer'}
        onClose={() => { setOpen(null); opener.current?.focus() }}
        onClick={(e) => { if (e.target === e.currentTarget) setOpen(null) }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') step(1)
          if (e.key === 'ArrowLeft') step(-1)
        }}
      >
        {current && (
          <figure className="sl-lightbox-figure">
            <img
              src={large(current.slug)}
              alt={current.alt}
              width={current.full}
              height={Math.round(current.full * (current.h / current.w))}
            />
            <figcaption>
              <span className="sl-lightbox-title">{current.title}</span>
              <span className="sl-lightbox-count">{(open ?? 0) + 1} / {shown.length}</span>
            </figcaption>
          </figure>
        )}
        <div className="sl-lightbox-controls">
          <button type="button" onClick={() => step(-1)} aria-label="Previous photo">‹</button>
          <button type="button" onClick={() => step(1)} aria-label="Next photo">›</button>
          <button type="button" className="sl-lightbox-close" onClick={() => setOpen(null)} aria-label="Close viewer">×</button>
        </div>
      </dialog>
    </section>
  )
}
