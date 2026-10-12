import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { complexities, materials, money, type ComplexityId, type Material, type MaterialId } from './content'
import { makeTile, tileUnits } from './tiles'
import { drawMapped, elevationMap, looksLikeHipFace, planeQuad, squareToQuad } from './projective'

type PlaneMode = 'auto' | 'elevation' | 'perspective'

/** A flat texture of one roof plane: `across` tiles along the eave, `aspect` = slope / eave. */
function planeTexture(tile: HTMLCanvasElement, across: number, aspect: number): HTMLCanvasElement {
  const texture = document.createElement('canvas')
  texture.width = 1024
  texture.height = Math.max(128, Math.min(2048, Math.round(1024 * aspect)))
  const ctx = texture.getContext('2d')!
  const k = texture.width / Math.max(1, across) / tile.width
  const pattern = ctx.createPattern(tile, 'repeat')
  if (pattern) {
    // Anchor the first course on the eave at the bottom of the texture.
    pattern.setTransform(new DOMMatrix().translate(0, texture.height).scale(k, k))
    ctx.fillStyle = pattern
    ctx.fillRect(0, 0, texture.width, texture.height)
  }
  return texture
}

/**
 * Roof visualizer. Everything runs in the visitor's browser: the photo is
 * drawn to a canvas, the visitor traces the roof planes, and a procedural
 * material tile is composited inside those shapes while the original
 * shading is multiplied back over it. No upload leaves the device.
 */

export type VisualizerSelection = {
  material: Material
  color: { name: string; hex: string }
  area: number
  complexity: ComplexityId
  low: number
  high: number
}

type Point = { x: number; y: number }

const SAMPLE_PHOTO = '/demos/roofers-4/sample-home.jpg'
const SAMPLE_ROOF: Point[][] = [
  [{ x: 0.215, y: 0.312 }, { x: 0.44, y: 0.128 }, { x: 0.567, y: 0.128 }, { x: 0.81, y: 0.312 }],
  [{ x: 0.3, y: 0.52 }, { x: 0.326, y: 0.474 }, { x: 0.674, y: 0.474 }, { x: 0.694, y: 0.52 }],
  [{ x: 0.757, y: 0.537 }, { x: 0.77, y: 0.5 }, { x: 0.885, y: 0.5 }, { x: 0.9, y: 0.537 }],
]
const MAX_EDGE = 1600

function estimate(material: Material, area: number, complexity: ComplexityId): [number, number] {
  const factor = complexities.find(c => c.id === complexity)?.factor ?? 1
  const round = (v: number) => Math.round(v / 500) * 500
  return [round(area * material.rate[0] * factor), round(area * material.rate[1] * factor)]
}

export default function Visualizer({ onSelection }: { onSelection?: (selection: VisualizerSelection) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const objectUrl = useRef<string | null>(null)
  const [source, setSource] = useState<'none' | 'sample' | 'photo'>('none')
  const [shapes, setShapes] = useState<Point[][]>([])
  const [draft, setDraft] = useState<Point[]>([])
  const [materialId, setMaterialId] = useState<MaterialId>('standing-seam')
  const [colorIndex, setColorIndex] = useState(0)
  const [scale, setScale] = useState(1)
  const [planeMode, setPlaneMode] = useState<PlaneMode>('auto')
  const [areaText, setAreaText] = useState('3200')
  const [complexity, setComplexity] = useState<ComplexityId>('moderate')
  const [showGuides, setShowGuides] = useState(true)
  const [status, setStatus] = useState('Load a photo or try the sample home, then click the corners of each roof plane.')

  const material = materials.find(m => m.id === materialId) ?? materials[0]
  const color = material.colors[Math.min(colorIndex, material.colors.length - 1)]
  const area = Math.max(0, Math.min(40000, Number(areaText.replace(/[^0-9.]/g, '')) || 0))
  const [low, high] = estimate(material, area, complexity)

  useEffect(() => {
    onSelection?.({ material, color, area, complexity, low, high })
  }, [material, color, area, complexity, low, high, onSelection])

  const render = useCallback((guides = showGuides) => {
    const canvas = canvasRef.current
    const image = imageRef.current
    if (!canvas || !image) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const w = canvas.width, h = canvas.height
    ctx.clearRect(0, 0, w, h)
    ctx.drawImage(image, 0, 0, w, h)

    if (shapes.length) {
      const tile = makeTile(material.id, color.hex)
      const quads = shapes.map(shape => planeQuad(shape.map(p => ({ x: p.x * w, y: p.y * h }))))
      // Assume the longest traced eave is about 50 ft so materials land at real-world size.
      const longestEave = Math.max(1, ...quads.map(q => Math.hypot(q[1].x - q[0].x, q[1].y - q[0].y)))
      const { unitPx, unitFeet } = tileUnits[material.id]
      const tilePx = tile.width * (unitFeet * (longestEave / 50) * scale) / unitPx
      shapes.forEach((shape, index) => {
        const quad = quads[index]
        const eave = Math.max(1, Math.hypot(quad[1].x - quad[0].x, quad[1].y - quad[0].y))
        const slope = Math.max(1, (Math.hypot(quad[2].x - quad[1].x, quad[2].y - quad[1].y) + Math.hypot(quad[3].x - quad[0].x, quad[3].y - quad[0].y)) / 2)
        const texture = planeTexture(tile, eave / tilePx, slope / eave)
        const hip = planeMode === 'elevation' || (planeMode === 'auto' && looksLikeHipFace(quad))
        ctx.save()
        ctx.beginPath()
        shape.forEach((p, i) => (i ? ctx.lineTo(p.x * w, p.y * h) : ctx.moveTo(p.x * w, p.y * h)))
        ctx.closePath()
        ctx.clip()
        if (hip) drawMapped(ctx, texture, elevationMap(quad), 1)
        else drawMapped(ctx, texture, squareToQuad(quad))
        ctx.restore()
      })
      // Original light and shadow returns through the new material.
      ctx.save()
      ctx.beginPath()
      for (const shape of shapes) {
        shape.forEach((p, i) => (i ? ctx.lineTo(p.x * w, p.y * h) : ctx.moveTo(p.x * w, p.y * h)))
        ctx.closePath()
      }
      ctx.clip()
      // Blur the photo first so broad light and shade carry over, not the old shingle texture.
      ctx.filter = `blur(${Math.max(2, Math.round(w / 400))}px)`
      ctx.globalCompositeOperation = 'multiply'
      ctx.globalAlpha = 0.85
      ctx.drawImage(image, 0, 0, w, h)
      ctx.globalCompositeOperation = 'soft-light'
      ctx.globalAlpha = 0.6
      ctx.drawImage(image, 0, 0, w, h)
      // Sky highlights survive on dark finishes.
      ctx.globalCompositeOperation = 'screen'
      ctx.globalAlpha = 0.16
      ctx.drawImage(image, 0, 0, w, h)
      ctx.restore()
    }

    if (guides) {
      const r = Math.max(4, w / 220)
      ctx.lineWidth = Math.max(1.5, w / 700)
      for (const shape of shapes) {
        ctx.beginPath()
        shape.forEach((p, i) => (i ? ctx.lineTo(p.x * w, p.y * h) : ctx.moveTo(p.x * w, p.y * h)))
        ctx.closePath()
        ctx.strokeStyle = 'rgba(255,255,255,.75)'
        ctx.stroke()
      }
      if (draft.length) {
        ctx.beginPath()
        draft.forEach((p, i) => (i ? ctx.lineTo(p.x * w, p.y * h) : ctx.moveTo(p.x * w, p.y * h)))
        ctx.strokeStyle = '#8fd3bd'
        ctx.setLineDash([r * 2, r * 1.5])
        ctx.stroke()
        ctx.setLineDash([])
        draft.forEach((p, i) => {
          ctx.beginPath()
          ctx.arc(p.x * w, p.y * h, i === 0 ? r * 1.6 : r, 0, Math.PI * 2)
          ctx.fillStyle = i === 0 ? '#0f161c' : '#8fd3bd'
          ctx.fill()
          ctx.strokeStyle = '#8fd3bd'
          ctx.stroke()
        })
      }
    }
  }, [shapes, draft, material.id, color.hex, scale, planeMode, showGuides])

  useEffect(() => { render() }, [render])

  const loadImage = (src: string, nextSource: 'sample' | 'photo', preset: Point[][]) => {
    const image = new Image()
    image.onload = () => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ratio = Math.min(1, MAX_EDGE / Math.max(image.naturalWidth, image.naturalHeight))
      canvas.width = Math.round(image.naturalWidth * ratio)
      canvas.height = Math.round(image.naturalHeight * ratio)
      imageRef.current = image
      setSource(nextSource)
      setShapes(preset)
      setDraft([])
      setStatus(preset.length ? 'The sample roof is already traced. Change the material, color and scale, or clear the shapes and trace your own.' : 'Click the corners of one roof plane. Click the first point again, or use Close shape, to finish it. Repeat for each plane.')
    }
    image.onerror = () => setStatus('That image could not be read. Try a JPG, PNG or HEIC exported as JPG.')
    image.src = src
  }

  const onFile = (file: File | undefined) => {
    if (!file) return
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current)
    objectUrl.current = URL.createObjectURL(file)
    loadImage(objectUrl.current, 'photo', [])
  }

  useEffect(() => () => { if (objectUrl.current) URL.revokeObjectURL(objectUrl.current) }, [])

  const closeDraft = () => {
    if (draft.length < 3) { setStatus('A roof plane needs at least three corners.'); return }
    setShapes(current => [...current, draft])
    setDraft([])
    setStatus('Plane added. Trace another plane, or adjust the material on the right.')
  }

  const onPointer = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas || !imageRef.current) return
    const rect = canvas.getBoundingClientRect()
    const point = { x: (event.clientX - rect.left) / rect.width, y: (event.clientY - rect.top) / rect.height }
    if (draft.length >= 3) {
      const first = draft[0]
      const dx = (first.x - point.x) * rect.width, dy = (first.y - point.y) * rect.height
      if (Math.hypot(dx, dy) < 14) { closeDraft(); return }
    }
    setDraft(current => [...current, point])
    if (draft.length === 0) setStatus('Keep clicking around the plane. Click the first point again to close it.')
  }

  const download = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    render(false)
    const link = document.createElement('a')
    link.download = `halcyon-roof-${material.id}-${color.name.toLowerCase().replace(/\s+/g, '-')}.jpg`
    link.href = canvas.toDataURL('image/jpeg', 0.92)
    link.click()
    render(true)
  }

  return <div className="hr-viz">
    <div className="hr-viz-stage">
      <div className={`hr-viz-canvas-wrap ${source === 'none' ? 'is-empty' : ''}`}>
        <canvas ref={canvasRef} width={1600} height={1067} onPointerDown={onPointer} onDoubleClick={event => { event.preventDefault(); closeDraft() }} aria-label="Your home with the selected roof material applied" role="img" />
        {source === 'none' && <div className="hr-viz-empty">
          <p className="hr-kicker"><span /> Your home, your roof, your choice</p>
          <h3>Start with a photo of your home.</h3>
          <p>A straight-on photo from the street works best. Your photo stays in your browser; nothing is uploaded or stored.</p>
          <div className="hr-viz-empty-actions">
            <button type="button" className="hr-cta-primary" onClick={() => fileRef.current?.click()}>Choose a photo <span aria-hidden="true">↑</span></button>
            <button type="button" className="hr-cta-ghost hr-cta-ghost-dark" onClick={() => loadImage(SAMPLE_PHOTO, 'sample', SAMPLE_ROOF)}>Try the sample home</button>
          </div>
        </div>}
      </div>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={event => onFile(event.target.files?.[0])} />
      <div className="hr-viz-toolbar">
        <p className="hr-viz-status" aria-live="polite">{status}</p>
        <div className="hr-viz-tools">
          <button type="button" className="hr-tool" onClick={() => fileRef.current?.click()}>Photo</button>
          <button type="button" className="hr-tool" onClick={() => loadImage(SAMPLE_PHOTO, 'sample', SAMPLE_ROOF)}>Sample</button>
          <button type="button" className="hr-tool" onClick={closeDraft} disabled={draft.length < 3}>Close shape</button>
          <button type="button" className="hr-tool" onClick={() => setDraft(current => current.slice(0, -1))} disabled={!draft.length}>Undo point</button>
          <button type="button" className="hr-tool" onClick={() => { setShapes([]); setDraft([]); setStatus('Shapes cleared. Trace the roof planes again.') }} disabled={!shapes.length && !draft.length}>Clear</button>
          <button type="button" className="hr-tool" onClick={() => setShowGuides(g => !g)} disabled={source === 'none'}>{showGuides ? 'Hide outlines' : 'Show outlines'}</button>
          <button type="button" className="hr-tool hr-tool-accent" onClick={download} disabled={!shapes.length}>Download</button>
        </div>
      </div>
    </div>

    <aside className="hr-viz-panel">
      <div className="hr-viz-group">
        <p className="hr-viz-label">Material</p>
        <div className="hr-viz-materials" role="radiogroup" aria-label="Roof material">
          {materials.map(m => <button type="button" key={m.id} role="radio" aria-checked={m.id === materialId} className={`hr-viz-material ${m.id === materialId ? 'is-on' : ''}`} onClick={() => { setMaterialId(m.id); setColorIndex(0) }}>
            <img src={m.image} alt="" loading="lazy" width="96" height="72" />
            <span><b>{m.name}</b><i>{money(m.rate[0])} to {money(m.rate[1])} per sq ft</i></span>
          </button>)}
        </div>
      </div>

      <div className="hr-viz-group">
        <p className="hr-viz-label">Finish <span>{color.name}</span></p>
        <div className="hr-viz-colors" role="radiogroup" aria-label="Finish color">
          {material.colors.map((c, i) => <button type="button" key={c.name} role="radio" aria-checked={i === colorIndex} aria-label={c.name} className={i === colorIndex ? 'is-on' : ''} style={{ background: c.hex }} onClick={() => setColorIndex(i)} />)}
        </div>
      </div>

      <div className="hr-viz-group hr-viz-row">
        <label>
          <span className="hr-viz-label">Material size <span>fine to coarse</span></span>
          <input type="range" min="0.5" max="2" step="0.05" value={scale} onChange={event => setScale(Number(event.target.value))} />
        </label>
        <label>
          <span className="hr-viz-label">Roof planes</span>
          <select value={planeMode} onChange={event => setPlaneMode(event.target.value as PlaneMode)}>
            <option value="auto">Auto: hip faces straight on, gables in perspective</option>
            <option value="elevation">Street view: courses parallel to the eave</option>
            <option value="perspective">Drone or angled view: full perspective</option>
          </select>
        </label>
      </div>

      <div className="hr-viz-group hr-viz-row">
        <label>
          <span className="hr-viz-label">Roof area <span>sq ft, from your plans or our survey</span></span>
          <input type="text" inputMode="numeric" value={areaText} onChange={event => setAreaText(event.target.value)} aria-label="Roof area in square feet" />
        </label>
        <label>
          <span className="hr-viz-label">Complexity</span>
          <select value={complexity} onChange={event => setComplexity(event.target.value as ComplexityId)}>
            {complexities.map(c => <option key={c.id} value={c.id}>{c.name}: {c.note}</option>)}
          </select>
        </label>
      </div>

      <div className="hr-viz-estimate">
        <p className="hr-viz-label">Planning range</p>
        <p className="hr-viz-figure">{area ? `${money(low)} to ${money(high)}` : 'Enter a roof area'}</p>
        <p className="hr-viz-fine">{material.name}, {color.name}, {area ? area.toLocaleString('en-US') : '0'} sq ft, {complexities.find(c => c.id === complexity)?.name.toLowerCase()} roof. Installed, including tear-off, underlayment, flashing and ventilation. Illustrative demo pricing, not a quote; structural review, decking repair and copper accents are priced after the survey.</p>
        <a className="hr-cta-primary hr-cta-wide" href="#consultation">Bring this to a consultation <span aria-hidden="true">↗</span></a>
      </div>
    </aside>
  </div>
}
