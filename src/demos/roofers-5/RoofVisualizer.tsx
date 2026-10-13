import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { formatMoney, planningRange, roofComplexities, roofMaterials, type ComplexityId, type MaterialId } from './materials'
import { drawMapped, parallelMap, pointInPolygon, roofSlopeLength, squareToQuad, suggestAnchors, suggestedMode, validOutline, validPerspective, type Point, type Quad } from './projective'
import { planeTexture } from './tiles'
import './roof-visualizer.css'

export type RoofSelection = {
  materialId: MaterialId
  materialName: string
  finish: string
  area: number
  complexity: ComplexityId
  low: number
  high: number
}

type RoofPlane = { id: number; outline: Point[]; anchors: Quad; mode: 'perspective' | 'parallel'; eaveFeet: number; runFeet: number; pitch: number }
const SAMPLE = '/demos/roofers-4/sample-home.jpg'
const SAMPLE_OUTLINES: Point[][] = [
  [{ x: 0.3, y: 0.306 }, { x: 0.432, y: 0.133 }, { x: 0.555, y: 0.133 }, { x: 0.634, y: 0.306 }],
  [{ x: 0.304, y: 0.501 }, { x: 0.326, y: 0.467 }, { x: 0.616, y: 0.461 }, { x: 0.687, y: 0.501 }],
  [{ x: 0.76, y: 0.525 }, { x: 0.76, y: 0.503 }, { x: 0.892, y: 0.503 }, { x: 0.896, y: 0.525 }],
  [{ x: 0.211, y: 0.279 }, { x: 0.432, y: 0.133 }, { x: 0.3, y: 0.306 }, { x: 0.302, y: 0.323 }, { x: 0.236, y: 0.323 }],
  [{ x: 0.634, y: 0.306 }, { x: 0.555, y: 0.133 }, { x: 0.642, y: 0.205 }, { x: 0.759, y: 0.308 }, { x: 0.762, y: 0.324 }, { x: 0.634, y: 0.323 }],
  [{ x: 0.642, y: 0.205 }, { x: 0.692, y: 0.205 }, { x: 0.808, y: 0.298 }, { x: 0.779, y: 0.324 }, { x: 0.762, y: 0.324 }, { x: 0.759, y: 0.308 }],
  [{ x: 0.22, y: 0.297 }, { x: 0.3, y: 0.306 }, { x: 0.302, y: 0.323 }, { x: 0.236, y: 0.323 }],
]
const SAMPLE_ANCHORS: (Quad | undefined)[] = [undefined, undefined, undefined,
  [{ x: 0.211, y: 0.279 }, { x: 0.3, y: 0.306 }, { x: 0.432, y: 0.133 }, { x: 0.432, y: 0.133 }],
  [{ x: 0.634, y: 0.306 }, { x: 0.759, y: 0.308 }, { x: 0.555, y: 0.133 }, { x: 0.555, y: 0.133 }],
  [{ x: 0.759, y: 0.308 }, { x: 0.808, y: 0.298 }, { x: 0.692, y: 0.205 }, { x: 0.642, y: 0.205 }],
]
const samplePlanes = (): RoofPlane[] => SAMPLE_OUTLINES.map((outline, i) => ({ id: i + 1, outline, anchors: SAMPLE_ANCHORS[i] ?? suggestAnchors(outline), mode: 'parallel', eaveFeet: [32, 30, 12, 16, 16, 14, 12][i], runFeet: [18, 8, 3, 18, 18, 12, 3][i], pitch: i === 6 ? 4 : 8 }))
const clamp = (value: number, low = 0, high = 1) => Math.min(high, Math.max(low, value))
const anchorNames = ['Eave left', 'Eave right', 'Ridge right', 'Ridge left']

function planePath(ctx: CanvasRenderingContext2D, points: Point[], width: number, height: number) {
  ctx.beginPath()
  points.forEach((p, i) => i ? ctx.lineTo(p.x * width, p.y * height) : ctx.moveTo(p.x * width, p.y * height))
  ctx.closePath()
}

/** An original-photo composite. Roof boundaries and camera mapping stay visitor-controlled. */
export default function RoofVisualizer({ onSelection }: { onSelection?: (selection: RoofSelection) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sourceImage = useRef<HTMLImageElement | null>(null)
  const lightField = useRef<Uint8ClampedArray | null>(null)
  const compositeCache = useRef<{ key: string; canvas: HTMLCanvasElement } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const objectUrl = useRef<string | null>(null)
  const loadVersion = useRef(0)
  const drag = useRef<{ index: number; planeId: number } | null>(null)
  const nextId = useRef(8)
  const [loaded, setLoaded] = useState(false)
  const [sourceName, setSourceName] = useState('The sample residence')
  const [isSample, setIsSample] = useState(true)
  const [planes, setPlanes] = useState<RoofPlane[]>([])
  const [history, setHistory] = useState<RoofPlane[][]>([])
  const [activeId, setActiveId] = useState(1)
  const [draft, setDraft] = useState<Point[]>([])
  const [drawing, setDrawing] = useState(false)
  const [cursor, setCursor] = useState<Point>({ x: 0.5, y: 0.35 })
  const [materialId, setMaterialId] = useState<MaterialId>('slate')
  const [finishIndex, setFinishIndex] = useState(0)
  const [scale, setScale] = useState(1)
  const [view, setView] = useState<'preview' | 'original' | 'split'>('preview')
  const [split, setSplit] = useState(50)
  const [guides, setGuides] = useState(false)
  const [areaText, setAreaText] = useState('3200')
  const [complexity, setComplexity] = useState<ComplexityId>('articulated')
  const [status, setStatus] = useState('The sample is mapped for you. Explore the collection, or bring your own home into view.')
  const material = roofMaterials.find(item => item.id === materialId) ?? roofMaterials[0]
  const finish = material.colors[Math.min(finishIndex, material.colors.length - 1)]
  const area = clamp(Number(areaText) || 0, 0, 40000)
  const [low, high] = planningRange(materialId, area, complexity)
  const selectedPlane = planes.find(plane => plane.id === activeId)

  useEffect(() => { onSelection?.({ materialId, materialName: material.name, finish: finish.name, area, complexity, low, high }) }, [onSelection, materialId, material.name, finish.name, area, complexity, low, high])

  const loadPhoto = useCallback((url: string, sample: boolean, name: string) => {
    const version = ++loadVersion.current
    const image = new Image()
    image.onload = () => {
      if (version !== loadVersion.current) return
      const canvas = canvasRef.current
      if (!canvas) return
      const ratio = Math.min(1, 1500 / Math.max(image.naturalWidth, image.naturalHeight))
      canvas.width = Math.round(image.naturalWidth * ratio); canvas.height = Math.round(image.naturalHeight * ratio)
      sourceImage.current = image
      const lighting = document.createElement('canvas')
      lighting.width = canvas.width; lighting.height = canvas.height
      const ctx = lighting.getContext('2d', { willReadFrequently: true })!
      ctx.filter = `blur(${Math.max(3, canvas.width / 160)}px)`
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
      lightField.current = ctx.getImageData(0, 0, canvas.width, canvas.height).data
      setPlanes(sample ? samplePlanes() : []); setHistory([]); setDraft([]); setDrawing(false); setGuides(false); setActiveId(sample ? 1 : 0)
      setView('preview'); setLoaded(true); setIsSample(sample); setSourceName(name)
      setStatus(sample ? 'The sample is mapped for you. Explore the collection, or bring your own home into view.' : 'Your photo is ready. Choose “Trace a roof plane” and mark each visible roof surface, one at a time.')
    }
    image.onerror = () => { if (version === loadVersion.current) setStatus('This photo could not be read. Please choose a JPG, PNG or WebP image. Export HEIC photos to JPG first.') }
    image.src = url
  }, [])

  useEffect(() => {
    loadPhoto(SAMPLE, true, 'The sample residence')
    const cancelPendingLoad = () => { loadVersion.current += 1 }
    return () => { cancelPendingLoad(); if (objectUrl.current) URL.revokeObjectURL(objectUrl.current) }
  }, [loadPhoto])

  const render = useCallback((includeGuides = guides, forcePreview = false) => {
    const canvas = canvasRef.current, image = sourceImage.current
    if (!canvas || !image) return
    const ctx = canvas.getContext('2d')!
    const width = canvas.width, height = canvas.height
    ctx.clearRect(0, 0, width, height); ctx.drawImage(image, 0, 0, width, height)
    if (view !== 'original' || forcePreview) {
      const cacheKey = JSON.stringify([image.src, width, height, planes, materialId, finish.hex, scale])
      if (compositeCache.current?.key !== cacheKey) {
        const composite = document.createElement('canvas'); composite.width = width; composite.height = height
        const compositeCtx = composite.getContext('2d')!
        compositeCtx.drawImage(image, 0, 0, width, height)
        const lighting = lightField.current
        let lightTotal = 0, lightCount = 0
        // A shared light reference retains illumination differences between roof faces.
        if (lighting) for (let y = 0; y < height; y += 12) for (let x = 0; x < width; x += 12) {
          if (!planes.some(plane => pointInPolygon({ x: x / width, y: y / height }, plane.outline))) continue
          const i = (y * width + x) * 4
          lightTotal += lighting[i] * 0.2126 + lighting[i + 1] * 0.7152 + lighting[i + 2] * 0.0722; lightCount++
        }
        const lightMean = lightCount ? Math.max(15, lightTotal / lightCount) : 100
        planes.forEach(plane => {
          const anchors = plane.anchors.map(p => ({ x: p.x * width, y: p.y * height })) as Quad
          if (plane.mode === 'perspective' && !validPerspective(plane.anchors)) return
          const layer = document.createElement('canvas'); layer.width = width; layer.height = height
          const lc = layer.getContext('2d', { willReadFrequently: true })!
          const slopeFeet = roofSlopeLength(plane.runFeet, plane.pitch)
          const texture = planeTexture(materialId, finish.hex, plane.eaveFeet, slopeFeet, scale)
          lc.save(); planePath(lc, plane.outline, width, height); lc.clip()
          drawMapped(lc, texture, plane.mode === 'parallel' ? parallelMap(anchors) : squareToQuad(anchors), plane.mode === 'parallel' ? 1 : 22)
          lc.restore()
          // Recover broad illumination, without stamping the old roof's color or courses onto the new surface.
          if (lighting) {
            const pixels = lc.getImageData(0, 0, width, height)
            for (let i = 0; i < pixels.data.length; i += 4) if (pixels.data[i + 3]) {
              const luminance = lighting[i] * 0.2126 + lighting[i + 1] * 0.7152 + lighting[i + 2] * 0.0722
              const shade = clamp(0.25 + luminance / lightMean * 0.75, 0.4, 1.4)
              pixels.data[i] = Math.min(255, pixels.data[i] * shade); pixels.data[i + 1] = Math.min(255, pixels.data[i + 1] * shade); pixels.data[i + 2] = Math.min(255, pixels.data[i + 2] * shade)
            }
            lc.putImageData(pixels, 0, 0)
          }
          compositeCtx.drawImage(layer, 0, 0)
        })
        compositeCache.current = { key: cacheKey, canvas: composite }
      }
      ctx.drawImage(compositeCache.current.canvas, 0, 0)
      if (view === 'split' && !forcePreview) {
        ctx.save(); ctx.beginPath(); ctx.rect(0, 0, width * split / 100, height); ctx.clip(); ctx.drawImage(image, 0, 0, width, height); ctx.restore()
      }
    }
    if (!includeGuides) return
    const radius = Math.max(5, width / 210)
    ctx.lineWidth = Math.max(1.5, width / 650)
    planes.forEach(plane => {
      planePath(ctx, plane.outline, width, height); ctx.strokeStyle = plane.id === activeId ? '#f7f6f2' : 'rgba(255,255,255,.45)'; ctx.stroke()
      if (plane.id === activeId && !drawing) plane.anchors.forEach((point, i) => {
        ctx.beginPath(); ctx.arc(point.x * width, point.y * height, radius * 1.5, 0, Math.PI * 2)
        ctx.fillStyle = '#182824'; ctx.fill(); ctx.strokeStyle = '#f7f6f2'; ctx.stroke()
        ctx.fillStyle = '#fff'; ctx.font = `500 ${Math.round(radius * 1.8)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(i + 1), point.x * width, point.y * height)
      })
    })
    if (draft.length) {
      ctx.beginPath(); draft.forEach((p, i) => i ? ctx.lineTo(p.x * width, p.y * height) : ctx.moveTo(p.x * width, p.y * height))
      ctx.lineTo(cursor.x * width, cursor.y * height); ctx.strokeStyle = '#ddedbb'; ctx.setLineDash([radius * 1.5, radius]); ctx.stroke(); ctx.setLineDash([])
      draft.forEach(point => { ctx.beginPath(); ctx.arc(point.x * width, point.y * height, radius, 0, Math.PI * 2); ctx.fillStyle = '#ddedbb'; ctx.fill() })
    }
    if (drawing) {
      ctx.strokeStyle = '#ddedbb'; ctx.beginPath(); ctx.moveTo(cursor.x * width - radius * 2, cursor.y * height); ctx.lineTo(cursor.x * width + radius * 2, cursor.y * height); ctx.moveTo(cursor.x * width, cursor.y * height - radius * 2); ctx.lineTo(cursor.x * width, cursor.y * height + radius * 2); ctx.stroke()
    }
  }, [planes, guides, view, materialId, finish.hex, scale, split, activeId, drawing, draft, cursor])

  useEffect(() => { const frame = requestAnimationFrame(() => render()); return () => cancelAnimationFrame(frame) }, [render, loaded])

  const replacePlanes = (next: RoofPlane[]) => { setHistory(current => [...current.slice(-19), planes]); setPlanes(next) }
  const changePlane = (changes: Partial<RoofPlane>) => setPlanes(current => current.map(plane => plane.id === activeId ? { ...plane, ...changes } : plane))
  const finishPlane = () => {
    if (!validOutline(draft)) { setStatus('Mark at least three distinct corners around the roof in order. Avoid crossing the outline.'); return }
    const anchors = suggestAnchors(draft), id = nextId.current++
    replacePlanes([...planes, { id, outline: draft, anchors, mode: suggestedMode(anchors), eaveFeet: 40, runFeet: 16, pitch: 8 }])
    setActiveId(id); setDraft([]); setDrawing(false); setGuides(true)
    setStatus('Plane added. Check its eave and ridge anchors in Geometry. Trace additional surfaces separately to keep each roof pitch aligned.')
  }
  const addPoint = (point: Point) => {
    if (draft.length >= 12) { setStatus('Use up to twelve corners for a single plane. Finish this outline, then trace the next surface.'); return }
    setDraft(current => [...current, point])
  }
  const position = (event: PointerEvent<HTMLCanvasElement>): Point => {
    const rect = event.currentTarget.getBoundingClientRect()
    return { x: clamp((event.clientX - rect.left) / rect.width), y: clamp((event.clientY - rect.top) / rect.height) }
  }
  const pointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!loaded) return
    const point = position(event); setCursor(point)
    if (drawing) {
      const rect = event.currentTarget.getBoundingClientRect(), first = draft[0]
      if (draft.length >= 3 && Math.hypot((first.x - point.x) * rect.width, (first.y - point.y) * rect.height) < 14) finishPlane()
      else addPoint(point)
      return
    }
    if (guides && selectedPlane) {
      const rect = event.currentTarget.getBoundingClientRect()
      const index = selectedPlane.anchors.findIndex(p => Math.hypot((p.x - point.x) * rect.width, (p.y - point.y) * rect.height) < 18)
      if (index >= 0) { setHistory(current => [...current.slice(-19), planes]); drag.current = { index, planeId: activeId }; event.currentTarget.setPointerCapture(event.pointerId); return }
    }
    const match = [...planes].reverse().find(plane => pointInPolygon(point, plane.outline))
    if (match) { setActiveId(match.id); setGuides(true) }
  }
  const pointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    const point = position(event)
    if (drawing) setCursor(point)
    if (drag.current) {
      const { index, planeId } = drag.current
      setPlanes(current => current.map(plane => plane.id === planeId ? { ...plane, anchors: plane.anchors.map((p, i) => i === index ? point : p) as Quad } : plane))
    }
  }
  const undo = () => {
    if (drawing && draft.length) { setDraft(current => current.slice(0, -1)); return }
    const previous = history[history.length - 1]
    if (previous) { setPlanes(previous); setActiveId(previous[previous.length - 1]?.id ?? 0); setHistory(current => current.slice(0, -1)); setStatus('Previous roof mapping restored.') }
  }
  const keyboard = (event: KeyboardEvent<HTMLCanvasElement>) => {
    if (!drawing) return
    setGuides(true)
    const step = event.shiftKey ? 0.02 : 0.003
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
      event.preventDefault(); setCursor(p => ({ x: clamp(p.x + (event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0)), y: clamp(p.y + (event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0)) }))
    } else if (event.key === 'Enter') { event.preventDefault(); addPoint(cursor) }
    else if (event.key === 'Backspace') { event.preventDefault(); setDraft(current => current.slice(0, -1)) }
    else if (event.key === 'Escape') { setDraft([]); setDrawing(false) }
  }
  const chooseFile = (file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith('image/')) { setStatus('Please choose an image file. JPG, PNG and WebP work well.'); return }
    if (file.size > 35 * 1024 * 1024) { setStatus('Choose a photo under 35 MB so the preview remains responsive.'); return }
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current)
    objectUrl.current = URL.createObjectURL(file); loadPhoto(objectUrl.current, false, file.name)
  }
  const download = () => {
    const canvas = canvasRef.current
    if (!canvas || !planes.length) return
    render(false, true)
    canvas.toBlob(blob => {
      if (!blob) { setStatus('The preview could not be saved. Please try again.'); return }
      const url = URL.createObjectURL(blob), link = document.createElement('a')
      link.href = url; link.download = `velar-${materialId}-${finish.name.toLowerCase().replace(/\s+/g, '-')}.jpg`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 10000)
      setStatus('Your material study was saved. It is a concept preview, ready to discuss with your roof specialist.')
    }, 'image/jpeg', 0.94)
    render()
  }

  return <div className="va-visualizer">
    <div className="va-viz-main">
      <div className="va-viz-topline"><span><i aria-hidden="true" /> Your architecture. A new perspective.</span><span className="va-viz-private">Local photo preview</span></div>
      <div className={`va-viz-frame ${drawing ? 'is-tracing' : ''} ${guides ? 'has-guides' : ''}`}>
        <canvas ref={canvasRef} width={1500} height={1000} tabIndex={drawing ? 0 : -1} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={() => { drag.current = null }} onPointerCancel={() => { drag.current = null }} onKeyDown={keyboard} aria-label={drawing ? 'Trace the roof with arrow keys to position the cursor, Enter to add a corner, Backspace to undo, Escape to cancel. Use Finish plane below to complete.' : `Material preview of ${sourceName}. ${material.name}, ${finish.name}.`} role="img" />
        {!loaded && <div className="va-viz-loading">Preparing your material study…</div>}
        <span className="va-viz-photo-label">{isSample ? 'Sample residence' : 'Your residence'} <span aria-hidden="true">/</span> {view === 'original' ? 'Original' : material.name}</span>
        {view === 'split' && <div className="va-viz-split-line" style={{ left: `${split}%` }} aria-hidden="true"><span>↔</span></div>}
        {isSample && <span className="va-viz-sample-label">Mapped sample</span>}
      </div>
      <div className="va-viz-viewbar">
        <div className="va-viz-view-switch" aria-label="Photo comparison">{(['preview', 'original', 'split'] as const).map(mode => <button key={mode} type="button" aria-pressed={view === mode} onClick={() => setView(mode)}>{mode === 'preview' ? 'Material study' : mode === 'original' ? 'Original photo' : 'Compare'}</button>)}</div>
        <button type="button" className="va-viz-save" onClick={download} disabled={!planes.length}>Save study <span aria-hidden="true">↗</span></button>
      </div>
      {view === 'split' && <label className="va-viz-compare-control">Original <input type="range" min="0" max="100" value={split} onChange={event => setSplit(Number(event.target.value))} aria-label="Original photo comparison position" /> New material</label>}
      <div className="va-viz-photo-actions">
        <button type="button" className="va-viz-upload" onClick={() => fileRef.current?.click()}><span aria-hidden="true">↑</span> Upload your home</button>
        <button type="button" onClick={() => loadPhoto(SAMPLE, true, 'The sample residence')}>Use sample</button>
        <p>Your photo stays on this device. Your home’s architecture stays intact.</p>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" hidden onChange={event => { chooseFile(event.target.files?.[0]); event.target.value = '' }} />
      </div>
      <details className="va-viz-geometry">
        <summary><span>Roof geometry</span><span>{planes.length} {planes.length === 1 ? 'plane' : 'planes'} mapped <b aria-hidden="true">+</b></span></summary>
        <div className="va-viz-geometry-body">
          <p>Trace each visible roof surface separately. The outline protects the rest of your photo; eave and ridge anchors orient the material. Pitch sets its physical scale. Camera perspective comes from the anchors.</p>
          <div className="va-viz-trace-tools">
            <button type="button" onClick={() => { setDrawing(true); setDraft([]); setGuides(true); setView('preview'); setStatus('Mark the outline in order. Start along the eave, continue around the roof surface, then finish the plane.'); canvasRef.current?.focus() }} disabled={!loaded || drawing}>Trace a roof plane</button>
            <button type="button" onClick={finishPlane} disabled={draft.length < 3}>Finish plane</button>
            <button type="button" onClick={undo} disabled={!draft.length && !history.length}>Undo</button>
            <button type="button" onClick={() => { setDraft([]); setDrawing(false) }} disabled={!drawing}>Cancel tracing</button>
            <button type="button" onClick={() => setGuides(current => !current)} disabled={!planes.length || drawing}>{guides ? 'Hide anchors' : 'Show anchors'}</button>
          </div>
          {drawing && <div className="va-viz-keyboard-trace">
            <p>Click corners in the photo, or use arrow keys and Enter on the photo. For precise keyboard entry, position a corner below.</p>
            <label>Corner X % <input type="number" min="0" max="100" step="0.1" value={Number((cursor.x * 100).toFixed(1))} onChange={event => setCursor(current => ({ ...current, x: clamp(Number(event.target.value) / 100) }))} /></label>
            <label>Corner Y % <input type="number" min="0" max="100" step="0.1" value={Number((cursor.y * 100).toFixed(1))} onChange={event => setCursor(current => ({ ...current, y: clamp(Number(event.target.value) / 100) }))} /></label>
            <button type="button" onClick={() => addPoint(cursor)}>Add corner ({draft.length}/12)</button>
          </div>}
          {!!planes.length && <div className="va-viz-plane-selector"><label>Selected roof surface <select value={activeId} onChange={event => { setActiveId(Number(event.target.value)); setGuides(true) }}>{planes.map((plane, i) => <option key={plane.id} value={plane.id}>Plane {i + 1}</option>)}</select></label><button type="button" onClick={() => { replacePlanes(planes.filter(plane => plane.id !== activeId)); setActiveId(planes.find(plane => plane.id !== activeId)?.id ?? 0) }} disabled={drawing}>Remove plane</button><button type="button" onClick={() => { replacePlanes([]); setActiveId(0); setDraft([]); setDrawing(false) }}>Clear all</button></div>}
          {selectedPlane && !drawing && <div className="va-viz-mapping">
            <div className="va-viz-mapping-fields">
              <label>Camera / roof mapping<select value={selectedPlane.mode} onChange={event => { const mode = event.target.value as RoofPlane['mode']; if (mode === 'perspective' && !validPerspective(selectedPlane.anchors)) { setStatus('Perspective mapping needs four distinct, uncrossed anchors. Adjust them first, or use parallel mapping for a triangular hip.'); return } changePlane({ mode }); setGuides(true) }}><option value="parallel">Hip / parallel courses</option><option value="perspective">Rectangular / perspective</option></select></label>
              <label>Eave span · ft<input type="number" min="5" max="200" step="1" value={selectedPlane.eaveFeet} onChange={event => changePlane({ eaveFeet: clamp(Number(event.target.value) || 5, 5, 200) })} /></label>
              <label>Horizontal run · ft<input type="number" min="2" max="80" step="1" value={selectedPlane.runFeet} onChange={event => changePlane({ runFeet: clamp(Number(event.target.value) || 2, 2, 80) })} /></label>
              <label>Pitch · rise / 12<input type="number" min="2" max="20" step="0.5" value={selectedPlane.pitch} onChange={event => changePlane({ pitch: clamp(Number(event.target.value) || 2, 2, 20) })} /></label>
            </div>
            <div className="va-viz-anchor-fields"><p>Move numbered anchors on the photo, or enter their positions as a percentage of photo width and height.</p>{selectedPlane.anchors.map((point, index) => <div key={index}><span>{index + 1}. {anchorNames[index]}</span>{(['x', 'y'] as const).map(axis => <label key={axis}><span>{axis.toUpperCase()} %</span><input type="number" min="0" max="100" step="0.1" aria-label={`${anchorNames[index]} ${axis.toUpperCase()} percentage`} value={Number((point[axis] * 100).toFixed(1))} onChange={event => { const anchors = selectedPlane.anchors.map((p, i) => i === index ? { ...p, [axis]: clamp(Number(event.target.value) / 100) } : p) as Quad; changePlane({ anchors }); setGuides(true) }} /></label>)}</div>)}</div>
            {selectedPlane.mode === 'perspective' && !validPerspective(selectedPlane.anchors) && <p className="va-viz-error" role="status">These perspective anchors overlap or cross. Adjust the four corners to restore this plane’s preview.</p>}
          </div>}
        </div>
      </details>
      <p className="va-viz-status" aria-live="polite">{status}</p>
    </div>
    <aside className="va-viz-panel" aria-label="Material and investment controls">
      <div className="va-viz-panel-head"><span>01 / THE MATERIAL</span><h3>Find your finish.</h3></div>
      <div className="va-viz-materials" role="group" aria-label="Roof material">{roofMaterials.map(item => <button type="button" key={item.id} aria-pressed={materialId === item.id} onClick={() => { setMaterialId(item.id); setFinishIndex(0) }}><img src={item.image} alt="" loading="lazy" /><span>{item.short}</span>{materialId === item.id && <i aria-hidden="true">✓</i>}</button>)}</div>
      <div className="va-viz-finish"><div><strong>{material.name}</strong><span>{finish.name}</span></div><p>{material.character}</p><div className="va-viz-swatches" role="group" aria-label="Material finish">{material.colors.map((color, i) => <button type="button" key={color.name} style={{ backgroundColor: color.hex }} aria-label={color.name} aria-pressed={i === finishIndex} title={color.name} onClick={() => setFinishIndex(i)}>{i === finishIndex && <span aria-hidden="true">✓</span>}</button>)}</div></div>
      <label className="va-viz-scale"><span>Material scale <b>{scale.toFixed(2)}×</b></span><input type="range" min="0.65" max="1.55" step="0.05" value={scale} onChange={event => setScale(Number(event.target.value))} /><small>Fine-tune course size against the home.</small></label>
      <div className="va-viz-estimate">
        <span className="va-viz-step">02 / THE INVESTMENT</span>
        <label className="va-viz-area">Roof surface area<div><input type="number" min="0" max="40000" step="100" value={areaText} onChange={event => setAreaText(event.target.value)} onBlur={() => { if (areaText) setAreaText(String(area)) }} aria-describedby="va-roof-area-note" /><span>sq ft</span></div></label>
        <p id="va-roof-area-note">Use total sloped roof area from a roof report. This is not floor area or a measurement taken from your photo.</p>
        <label className="va-viz-complexity">Roof complexity<select value={complexity} onChange={event => setComplexity(event.target.value as ComplexityId)}>{roofComplexities.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select><small>{roofComplexities.find(item => item.id === complexity)?.description}</small></label>
        <div className="va-viz-range"><span>Illustrative installed allowance</span><strong>{area ? `${formatMoney(low)}–${formatMoney(high)}` : 'Enter roof area'}</strong><span>For {area.toLocaleString('en-US')} sq ft · {material.short.toLowerCase()}</span></div>
        <details className="va-viz-allowance"><summary>What informs this range <span aria-hidden="true">+</span></summary><p>Demo base allowance: {formatMoney(material.rate[0])}–{formatMoney(material.rate[1])} per roof sq ft, multiplied by {roofComplexities.find(item => item.id === complexity)?.factor} for the selected complexity, rounded to $500. This illustrates installed material and labor planning; it is not verified local pricing or a quote. A site survey resolves removal, decking, structural reinforcement, flashing, access, taxes and permit costs.</p></details>
      </div>
      <p className="va-viz-note">A material study, grounded in your photo. Roof details, reflectivity and final color are confirmed with physical samples and a site survey.</p>
    </aside>
  </div>
}
