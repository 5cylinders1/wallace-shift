import { useEffect, useRef, type CSSProperties } from 'react'
import type { FoundationEngine, FrameInfo, ScreenPoint } from '../engine/FoundationEngine'
import type { Pin } from '../content'

/**
 * Callouts pinned to the live model, in the manner of a survey drawing.
 * Positions are written straight to the DOM from the engine's frame
 * callback; React only renders the set. The same information is always in
 * the page text, so these are hidden from assistive technology.
 */
export default function Labels({ engine, pins }: { engine: FoundationEngine | null; pins: Pin[] }) {
  const refs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    if (!engine || !pins.length) return
    const place = (element: HTMLDivElement | null, point: ScreenPoint | undefined, frame: FrameInfo) => {
      if (!element) return
      if (!point || !point.visible) { element.dataset.hidden = 'true'; return }
      delete element.dataset.hidden
      element.style.transform = `translate3d(${point.x.toFixed(1)}px, ${point.y.toFixed(1)}px, 0)`
      element.classList.toggle('is-flipped', point.x > frame.width * 0.78)
    }
    return engine.onFrame(frame => pins.forEach((pin, index) => place(refs.current[index], frame.anchors[pin.anchor], frame)))
  }, [engine, pins])

  if (!pins.length) return null
  return <div className="dt-labels" aria-hidden="true">
    {pins.map((pin, index) => <div
      key={`${pin.anchor}-${pin.label}`}
      ref={element => { refs.current[index] = element }}
      className={`dt-pin dt-pin-${pin.tone ?? 'ink'} ${pin.anchor === 'waterTable' ? 'is-table' : ''}`}
      data-hidden="true"
      style={{ '--delay': `${index * 80}ms` } as CSSProperties}
    >
      <span className="dt-pin-mark" />
      <span className="dt-pin-tag">{pin.label}</span>
    </div>)}
  </div>
}
