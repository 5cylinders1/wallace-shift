import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react'
import { loadImage } from './api'
import { brush, lawnSqFt, measureLawn, type LawnMask } from './measure'
import type { LawnLookup } from './types'

export type Tool = 'look' | 'add' | 'erase'

interface Props {
  data: LawnLookup
  home: string | null
  tool: Tool
  /** Bumped by "Reset" to restore the automatic answer. */
  resetKey: number
  onHome: (id: string) => void
  /** null: the aerial couldn't be read, so the lawn must be sized by hand. */
  onArea: (sqft: number | null, edited: boolean) => void
}

/** Brush radius on the ground. */
const BRUSH_M = 2.4
const STRIPE_PX = 14

type Status = 'loading' | 'ready' | 'failed'

function pointerToMask(event: PointerEvent<HTMLCanvasElement>, size: number): [number, number] {
  const box = event.currentTarget.getBoundingClientRect()
  return [((event.clientX - box.left) / box.width) * size, ((event.clientY - box.top) / box.height) * size]
}

/** Lawn as alternating mowing stripes, its edge as a fine bright line, outlines on top. */
function paint(canvas: HTMLCanvasElement, mask: LawnMask, home: string | null) {
  const { size, lawn } = mask
  const ctx = canvas.getContext('2d')!
  const image = ctx.createImageData(size, size)
  const out = image.data
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const i = y * size + x
      if (!lawn[i]) continue
      const edge = x === 0 || y === 0 || x === size - 1 || y === size - 1 || !lawn[i - 1] || !lawn[i + 1] || !lawn[i - size] || !lawn[i + size]
      const light = Math.floor((x + y * 0.42) / STRIPE_PX) % 2 === 0
      const o = i * 4
      if (edge) {
        out[o] = 246; out[o + 1] = 250; out[o + 2] = 222; out[o + 3] = 235
      } else if (light) {
        out[o] = 214; out[o + 1] = 236; out[o + 2] = 120; out[o + 3] = 112
      } else {
        out[o] = 150; out[o + 1] = 196; out[o + 2] = 74; out[o + 3] = 96
      }
    }
  }
  ctx.putImageData(image, 0, 0)
  for (const { id, ring } of mask.rings) {
    ctx.beginPath()
    ring.forEach(([x, y], index) => (index ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
    ctx.closePath()
    const isHome = id === home
    ctx.setLineDash(isHome ? [] : [3, 3])
    ctx.lineWidth = isHome ? 1.6 : 1
    ctx.strokeStyle = isHome ? 'rgba(255, 214, 120, 0.95)' : 'rgba(255, 255, 255, 0.55)'
    ctx.stroke()
    if (isHome) {
      ctx.fillStyle = 'rgba(255, 214, 120, 0.16)'
      ctx.fill()
    }
  }
}

export default function LawnMap({ data, home, tool, resetKey, onHome, onArea }: Props) {
  const overlay = useRef<HTMLCanvasElement>(null)
  const mask = useRef<LawnMask | null>(null)
  const infrared = useRef<ImageData | null>(null)
  const frame = useRef(0)
  const stroke = useRef<{ last: [number, number]; moved: boolean; start: [number, number] } | null>(null)
  const [status, setStatus] = useState<Status>('loading')
  const [photoFailed, setPhotoFailed] = useState(false)
  const [cursor, setCursor] = useState<[number, number] | null>(null)
  const size = data.frame.size
  const onAreaLatest = useRef(onArea)
  useEffect(() => {
    onAreaLatest.current = onArea
  })

  const redraw = useCallback(() => {
    cancelAnimationFrame(frame.current)
    frame.current = requestAnimationFrame(() => {
      if (overlay.current && mask.current) paint(overlay.current, mask.current, home)
    })
  }, [home])

  // Fetch and read the infrared aerial; the parent remounts this per address.
  useEffect(() => {
    let cancelled = false
    loadImage(data.imagery.infrared)
      .then((image) => {
        if (cancelled) return
        const canvas = document.createElement('canvas')
        canvas.width = canvas.height = size
        const ctx = canvas.getContext('2d', { willReadFrequently: true })!
        ctx.drawImage(image, 0, 0, size, size)
        infrared.current = ctx.getImageData(0, 0, size, size)
        setStatus('ready')
      })
      .catch(() => {
        if (cancelled) return
        setStatus('failed')
        onAreaLatest.current(null, false)
      })
    return () => {
      cancelled = true
    }
  }, [data.imagery.infrared, size])

  // Measure whenever the house changes or Reset is pressed.
  useEffect(() => {
    if (status !== 'ready' || !infrared.current) return
    const measured = measureLawn(infrared.current, data.frame, data.buildings, home)
    mask.current = measured
    onAreaLatest.current(lawnSqFt(measured), false)
    redraw()
  }, [status, home, resetKey, data, redraw])

  useEffect(() => () => cancelAnimationFrame(frame.current), [])

  const brushAt = (point: [number, number]) => {
    const current = mask.current
    if (!current || tool === 'look') return
    const radius = BRUSH_M / current.metersPerPx
    const from = stroke.current?.last ?? point
    const steps = Math.max(1, Math.ceil(Math.hypot(point[0] - from[0], point[1] - from[1]) / (radius / 2)))
    for (let s = 1; s <= steps; s += 1) {
      brush(current, from[0] + ((point[0] - from[0]) * s) / steps, from[1] + ((point[1] - from[1]) * s) / steps, radius, tool === 'add' ? 1 : 0)
    }
    redraw()
  }

  const onPointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    if (status !== 'ready') return
    const point = pointerToMask(event, size)
    stroke.current = { last: point, moved: false, start: point }
    if (tool !== 'look') {
      event.currentTarget.setPointerCapture(event.pointerId)
      brushAt(point)
    }
  }

  const onPointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    const point = pointerToMask(event, size)
    if (event.pointerType === 'mouse') setCursor(point)
    if (!stroke.current) return
    if (Math.hypot(point[0] - stroke.current.start[0], point[1] - stroke.current.start[1]) > 4) stroke.current.moved = true
    if (tool !== 'look') {
      brushAt(point)
      stroke.current.last = point
    }
  }

  const onPointerUp = (event: PointerEvent<HTMLCanvasElement>) => {
    const current = stroke.current
    stroke.current = null
    if (!current || !mask.current) return
    if (tool !== 'look') return onArea(lawnSqFt(mask.current), true)
    if (current.moved) return
    // A tap on another outline: that one is the house.
    const [x, y] = pointerToMask(event, size)
    const hit = mask.current.rings.find(({ ring }) => {
      let inside = false
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
        const [xi, yi] = ring[i]
        const [xj, yj] = ring[j]
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
      }
      return inside
    })
    if (hit && hit.id !== home) onHome(hit.id)
  }

  const brushPx = BRUSH_M / (data.frame.viewM / size)
  return (
    <figure className={`tw-map is-${status} tool-${tool}`}>
      <div className="tw-map-frame">
        {photoFailed ? (
          <div className="tw-map-fallback" aria-hidden="true" />
        ) : (
          <img src={data.imagery.photo} alt={`Aerial photo of ${data.address.formatted}`} width={size} height={size} onError={() => setPhotoFailed(true)} />
        )}
        <canvas
          ref={overlay}
          width={size}
          height={size}
          className="tw-map-overlay"
          aria-hidden="true"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => (stroke.current = null)}
          onPointerLeave={() => setCursor(null)}
        />
        {cursor && tool !== 'look' && status === 'ready' && (
          <span
            className={`tw-map-brush is-${tool}`}
            aria-hidden="true"
            style={{ left: `${(cursor[0] / size) * 100}%`, top: `${(cursor[1] / size) * 100}%`, width: `${((brushPx * 2) / size) * 100}%` }}
          />
        )}
        {status === 'loading' && (
          <div className="tw-map-scan" role="status">
            <span>Finding your lawn…</span>
          </div>
        )}
      </div>
      <figcaption className="tw-map-credits">
        {[...data.imagery.credits, ...data.credits].map((credit) =>
          credit.href ? <a key={credit.text} href={credit.href} target="_blank" rel="noreferrer">{credit.text}</a> : <span key={credit.text}>{credit.text}</span>,
        )}
      </figcaption>
    </figure>
  )
}
