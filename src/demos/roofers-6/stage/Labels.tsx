import { useEffect, useRef, type CSSProperties } from 'react'
import type { FrameInfo, RoofEngine } from '../engine/RoofEngine'
import type { LayerKey } from '../engine/model'
import type { Pin } from '../content'

export interface LabelSet {
  kind: 'pins' | 'layers' | 'none'
  pins: Pin[]
  layers: { key: LayerKey; name: string }[]
  focus: number
  highlight: number
}

/**
 * Labels pinned to points on the live model. Positions are written straight
 * to the DOM from the engine's frame callback; React only renders the set.
 * The same information is always present as text in the page.
 */
export default function Labels({ engine, set }: { engine: RoofEngine | null; set: LabelSet }) {
  const pinRefs = useRef<(HTMLDivElement | null)[]>([])
  const layerRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    if (!engine || set.kind === 'none') return
    const place = (element: HTMLDivElement | null, point: { x: number; y: number; visible: boolean } | undefined, frame: FrameInfo) => {
      if (!element) return
      if (!point || !point.visible) { element.dataset.hidden = 'true'; return }
      delete element.dataset.hidden
      element.style.transform = `translate3d(${point.x.toFixed(1)}px, ${point.y.toFixed(1)}px, 0)`
      element.classList.toggle('is-flipped', point.x > frame.width * 0.74)
    }
    return engine.onFrame(frame => {
      if (set.kind === 'pins') set.pins.forEach((pin, index) => place(pinRefs.current[index], frame.anchors[pin.anchor], frame))
      else set.layers.forEach((layer, index) => place(layerRefs.current[index], frame.layers[layer.key], frame))
    })
  }, [engine, set])

  if (set.kind === 'none') return null
  return <div className="st-labels" aria-hidden="true">
    {set.kind === 'pins' && set.pins.map((pin, index) => <div
      key={pin.anchor + pin.label}
      ref={element => { pinRefs.current[index] = element }}
      className={`st-pin ${set.highlight === index ? 'is-active' : ''}`}
      data-hidden="true"
      style={{ '--delay': `${index * 70}ms` } as CSSProperties}
    >
      <span className="st-pin-dot">{index + 1}</span>
      <span className="st-pin-tag">{pin.label}</span>
    </div>)}
    {set.kind === 'layers' && set.layers.map((layer, index) => <div
      key={layer.key}
      ref={element => { layerRefs.current[index] = element }}
      className={`st-pin st-layer-pin ${set.focus === index ? 'is-active' : ''} ${set.focus >= 0 && set.focus !== index ? 'is-muted' : ''}`}
      data-hidden="true"
    >
      <span className="st-pin-dot">{String(index + 1).padStart(2, '0')}</span>
      <span className="st-pin-tag">{layer.name}</span>
    </div>)}
  </div>
}
