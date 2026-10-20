import { useEffect, useRef, useState } from 'react'
import type { LookbookItem } from '../content'
import { pexelsUrl, photo, photoSrc } from '../photos'
import Photo from './Photo'

/** Editorial grid of photographs; each opens in a keyboard-friendly viewer. */
export default function Lookbook({ items, label }: { items: LookbookItem[]; label: string }) {
  const [index, setIndex] = useState<number | null>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const opener = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    const node = dialog.current
    if (!node) return
    if (index !== null && !node.open) node.showModal()
    if (index === null && node.open) node.close()
  }, [index])

  const close = () => { setIndex(null); opener.current?.focus() }
  const step = (delta: number) => setIndex(value => value === null ? value : (value + delta + items.length) % items.length)
  const onKey = (event: React.KeyboardEvent<HTMLDialogElement>) => {
    if (event.key === 'ArrowRight') { event.preventDefault(); step(1) }
    if (event.key === 'ArrowLeft') { event.preventDefault(); step(-1) }
  }

  const item = index === null ? null : items[index]
  const meta = item ? photo(item.slug) : null

  return <>
    <ul className="tb-lookbook" aria-label={label}>
      {items.map((entry, n) => <li key={entry.slug} className={entry.wide ? 'is-wide' : ''} data-reveal>
        <button type="button" className="tb-lookbook-item" onClick={event => { opener.current = event.currentTarget; setIndex(n) }}
          aria-label={`View larger: ${entry.caption}`}>
          <Photo slug={entry.slug} sizes={entry.wide ? '(min-width: 900px) 66vw, 100vw' : '(min-width: 900px) 33vw, 100vw'} />
        </button>
        <p className="tb-lookbook-caption">{entry.caption}</p>
      </li>)}
    </ul>
    <dialog ref={dialog} className="tb-viewer" onClose={() => { if (index !== null) close() }} onKeyDown={onKey} aria-label="Photograph viewer">
      {item && meta && <figure>
        <img src={photoSrc(item.slug, 2000)} alt={meta.alt} width={meta.w} height={meta.h} />
        <figcaption>
          <span>{item.caption}</span>
          <span className="tb-viewer-credit">Photo: {meta.photographer} / <a href={pexelsUrl(meta.pexelsId)} target="_blank" rel="noreferrer">Pexels</a></span>
        </figcaption>
      </figure>}
      <div className="tb-viewer-controls">
        <button type="button" onClick={() => step(-1)} aria-label="Previous photograph">←</button>
        <span aria-live="polite">{index === null ? '' : `${index + 1} / ${items.length}`}</span>
        <button type="button" onClick={() => step(1)} aria-label="Next photograph">→</button>
        <button type="button" className="tb-viewer-close" onClick={close}>Close</button>
      </div>
    </dialog>
  </>
}
