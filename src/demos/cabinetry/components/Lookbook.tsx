import { useLayoutEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import type { LookbookItem } from '../content'
import { prefersReducedMotion } from '../motion'
import { pexelsUrl, photo, photoSrc } from '../photos'
import Photo from './Photo'

const NAME = 'tb-lookbook-photo'

/** Runs a DOM change as a View Transition where the browser supports one and motion is allowed. */
function transition(change: () => void): Promise<void> {
  if (!document.startViewTransition || prefersReducedMotion()) { change(); return Promise.resolve() }
  return document.startViewTransition(change).finished.catch(() => undefined)
}

/**
 * Editorial grid of photographs. Each photo uncovers as it scrolls in; opening
 * one morphs it from its place in the grid into the viewer (a View
 * Transition), and closing morphs it back.
 */
export default function Lookbook({ items, label }: { items: LookbookItem[]; label: string }) {
  const [index, setIndex] = useState<number | null>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const list = useRef<HTMLUListElement>(null)
  const viewerPhoto = useRef<HTMLImageElement>(null)
  const opener = useRef<HTMLButtonElement | null>(null)

  // Layout effect, so the dialog is open inside the transition's update.
  useLayoutEffect(() => {
    const node = dialog.current
    if (!node) return
    if (index !== null && !node.open) node.showModal()
    if (index === null && node.open) node.close()
  }, [index])

  const thumb = (n: number) => list.current?.querySelectorAll<HTMLImageElement>('.tb-lookbook-item img')[n]

  const open = (n: number, button: HTMLButtonElement) => {
    opener.current = button
    const from = thumb(n)
    if (from) from.style.viewTransitionName = NAME
    void transition(() => {
      if (from) from.style.viewTransitionName = ''
      flushSync(() => setIndex(n))
      if (viewerPhoto.current) viewerPhoto.current.style.viewTransitionName = NAME
    }).then(() => { if (viewerPhoto.current) viewerPhoto.current.style.viewTransitionName = '' })
  }

  const close = () => {
    if (index === null) return
    const to = thumb(index)
    if (viewerPhoto.current) viewerPhoto.current.style.viewTransitionName = NAME
    void transition(() => {
      if (viewerPhoto.current) viewerPhoto.current.style.viewTransitionName = ''
      if (to) to.style.viewTransitionName = NAME
      flushSync(() => setIndex(null))
    }).then(() => { if (to) to.style.viewTransitionName = '' })
    opener.current?.focus()
  }

  const step = (delta: number) => setIndex(value => value === null ? value : (value + delta + items.length) % items.length)
  const onKey = (event: React.KeyboardEvent<HTMLDialogElement>) => {
    if (event.key === 'ArrowRight') { event.preventDefault(); step(1) }
    if (event.key === 'ArrowLeft') { event.preventDefault(); step(-1) }
    if (event.key === 'Escape') { event.preventDefault(); close() }
  }

  const item = index === null ? null : items[index]
  const meta = item ? photo(item.slug) : null

  return <>
    <ul ref={list} className="tb-lookbook" aria-label={label}>
      {items.map((entry, n) => <li key={entry.slug} className={entry.wide ? 'is-wide' : ''}>
        <button type="button" className="tb-lookbook-item" onClick={event => open(n, event.currentTarget)}
          aria-label={`View larger: ${entry.caption}`} data-uncover>
          <Photo slug={entry.slug} sizes={entry.wide ? '(min-width: 900px) 66vw, 100vw' : '(min-width: 900px) 33vw, 100vw'} />
        </button>
        <p className="tb-lookbook-caption" data-reveal>{entry.caption}</p>
      </li>)}
    </ul>
    <dialog ref={dialog} className="tb-viewer" onCancel={event => { event.preventDefault(); close() }} onKeyDown={onKey} aria-label="Photograph viewer">
      {item && meta && <figure>
        <img ref={viewerPhoto} src={photoSrc(item.slug, 2000)} alt={meta.alt} width={meta.w} height={meta.h} />
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
