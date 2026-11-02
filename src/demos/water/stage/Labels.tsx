import { useEffect, useRef, type CSSProperties } from 'react'
import type { FrameInfo, ScreenPoint, WaterEngine } from '../engine/WaterEngine'
import type { Pin } from './director'

/**
 * Tags pinned to the live model. Positions and treated state are written straight
 * to the DOM from the engine's frame callback; React only renders the set. The same
 * information is always in the page text, so these are hidden from assistive technology.
 */
export default function Labels({ engine, pins }: { engine: WaterEngine | null; pins: Pin[] }) {
  const refs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    if (!engine || !pins.length) return
    const place = (element: HTMLDivElement | null, point: ScreenPoint | undefined, frame: FrameInfo, pin: Pin) => {
      if (!element) return
      if (!point || !point.visible) { element.dataset.hidden = 'true'; return }
      delete element.dataset.hidden
      element.style.transform = `translate3d(${point.x.toFixed(1)}px, ${point.y.toFixed(1)}px, 0)`
      element.classList.toggle('is-flipped', point.x > frame.width * 0.82)
      if (pin.fixture) element.dataset.state = frame.treated[pin.fixture] ? 'clean' : 'raw'
    }
    return engine.onFrame((frame) => pins.forEach((pin, index) => place(refs.current[index], frame.anchors[pin.anchor], frame, pin)))
  }, [engine, pins])

  if (!pins.length) return null
  return <div className="rf-labels" aria-hidden="true">
    {pins.map((pin, index) => <div
      key={`${pin.anchor}-${pin.label}`}
      ref={(element) => { refs.current[index] = element }}
      className="rf-pin"
      data-state={pin.tone ?? 'raw'}
      data-hidden="true"
      style={{ '--delay': `${index * 45}ms` } as CSSProperties}
    >
      <span className="rf-pin-mark" />
      <span className="rf-pin-tag">{pin.label}</span>
    </div>)}
  </div>
}
