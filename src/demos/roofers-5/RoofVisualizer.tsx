import { useEffect, useRef, useState } from 'react'
import { formatMoney, planningRange, roofComplexities, roofMaterials, type ComplexityId, type MaterialId } from './materials'
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

type Quality = 'low' | 'medium'
type Photo = { id: string; image: string; data: string | null; name: string; sample: boolean }
type Preview = { sourceId: string; image: string; materialId: MaterialId; finishId: string; quality: Quality; sample: boolean }
type RenderResponse = { ok: boolean; image?: string; message?: string }
type RenderAvailability = { state: 'checking' | 'ready' | 'unavailable'; message: string }

const SAMPLE: Photo = { id: 'velar-residence', image: '/demos/roofers-5/residence-original.jpg', data: null, name: 'Velar study residence', sample: true }
const SAMPLE_PREVIEWS: Preview[] = [
  { sourceId: SAMPLE.id, image: '/demos/roofers-5/residence-slate.jpg', materialId: 'slate', finishId: 'blue-gray', quality: 'medium', sample: true },
  { sourceId: SAMPLE.id, image: '/demos/roofers-5/residence-metal.jpg', materialId: 'standing-seam', finishId: 'charcoal', quality: 'medium', sample: true },
  { sourceId: SAMPLE.id, image: '/demos/roofers-5/residence-cedar.jpg', materialId: 'cedar', finishId: 'silver', quality: 'medium', sample: true },
  { sourceId: SAMPLE.id, image: '/demos/roofers-5/residence-clay.jpg', materialId: 'clay', finishId: 'terracotta', quality: 'medium', sample: true },
]
const SAMPLE_PREVIEW = SAMPLE_PREVIEWS[0]
const previewKey = (sourceId: string, materialId: MaterialId, finishId: string, quality: Quality) => `${sourceId}:${materialId}:${finishId}:${quality}`
const sampleCache = () => new Map(SAMPLE_PREVIEWS.map(preview => [previewKey(preview.sourceId, preview.materialId, preview.finishId, preview.quality), preview]))
const JPEG_LIMIT = 1_500_000

function readImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('We could not open that photo. Please choose a JPG, PNG or WebP file. For an iPhone HEIC photo, export a JPG first.'))
    image.src = url
  })
}

/** Resize locally before any upload. The original aspect ratio is preserved. */
async function preparePhoto(url: string): Promise<string> {
  const image = await readImage(url)
  const aspect = image.naturalWidth / image.naturalHeight
  if (aspect < 1 / 3 || aspect > 3) throw new Error('Please use a standard photo rather than a panorama so the complete home can fit in the preview.')
  if (!image.naturalWidth || !image.naturalHeight) throw new Error('This photo has no readable dimensions. Please choose another photo.')
  const canvas = document.createElement('canvas')
  const ratio = Math.min(1, 1536 / Math.max(image.naturalWidth, image.naturalHeight))
  canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio))
  canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio))
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Photo preparation is unavailable in this browser. Please try another browser.')
  context.fillStyle = '#fff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  for (const quality of [0.88, 0.75, 0.62, 0.48]) {
    const jpeg = canvas.toDataURL('image/jpeg', quality)
    if (Math.ceil((jpeg.length - jpeg.indexOf(',') - 1) * 3 / 4) <= JPEG_LIMIT) return jpeg
  }
  throw new Error('This photo is still too large after preparation. Please choose a smaller JPG or PNG.')
}

/** Original photo and generated previews stay paired; changing a swatch never makes an API call. */
export default function RoofVisualizer({ onSelection }: { onSelection?: (selection: RoofSelection) => void }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const requestRef = useRef<AbortController | null>(null)
  const requestLocked = useRef(false)
  const photoVersion = useRef(0)
  const mounted = useRef(true)
  const cache = useRef(sampleCache())
  const [preparedKeys, setPreparedKeys] = useState(() => [...sampleCache().keys()])
  const [photo, setPhoto] = useState<Photo>(SAMPLE)
  const [preview, setPreview] = useState<Preview | null>(SAMPLE_PREVIEW)
  const [materialId, setMaterialId] = useState<MaterialId>('slate')
  const [finishId, setFinishId] = useState('blue-gray')
  const [quality, setQuality] = useState<Quality>('medium')
  const [view, setView] = useState<'preview' | 'original' | 'compare'>('preview')
  const [split, setSplit] = useState(50)
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [preparing, setPreparing] = useState(false)
  const [availability, setAvailability] = useState<RenderAvailability>({ state: 'checking', message: 'Checking preview availability…' })
  const [error, setError] = useState('')
  const [status, setStatus] = useState('A prepared slate study is ready to compare. Upload your home to create your own.')
  const [areaText, setAreaText] = useState('3200')
  const [complexity, setComplexity] = useState<ComplexityId>('articulated')
  const material = roofMaterials.find(item => item.id === materialId) ?? roofMaterials[0]
  const finish = material.colors.find(item => item.id === finishId) ?? material.colors[0]
  const area = Math.min(40000, Math.max(0, Number(areaText) || 0))
  const [low, high] = planningRange(materialId, area, complexity)
  const currentKey = previewKey(photo.id, materialId, finish.id, quality)
  const current = useRef<{ sourceId: string; key: string; materialId: MaterialId; finishId: string; quality: Quality }>({ sourceId: SAMPLE.id, key: previewKey(SAMPLE.id, 'slate', 'blue-gray', 'medium'), materialId: 'slate', finishId: 'blue-gray', quality: 'medium' })
  const matchingPreview = preview?.sourceId === photo.id ? preview : null
  const previewMaterial = roofMaterials.find(item => item.id === matchingPreview?.materialId)
  const previewFinish = previewMaterial?.colors.find(item => item.id === matchingPreview?.finishId)
  const previewMatchesSelection = matchingPreview && previewKey(matchingPreview.sourceId, matchingPreview.materialId, matchingPreview.finishId, matchingPreview.quality) === currentKey
  const alreadyPrepared = preparedKeys.includes(currentKey)

  useEffect(() => {
    onSelection?.({ materialId, materialName: material.name, finish: finish.name, area, complexity, low, high })
  }, [onSelection, materialId, material.name, finish.name, area, complexity, low, high])

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false; photoVersion.current += 1; requestRef.current?.abort() }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    async function checkAvailability() {
      try {
        const response = await fetch('/api/roof-render', { signal: controller.signal })
        const body = await response.json() as { ok?: boolean; enabled?: boolean; configured?: boolean; message?: string }
        if (controller.signal.aborted) return
        setAvailability(response.ok && body.ok && body.enabled && body.configured
          ? { state: 'ready', message: '' }
          : { state: 'unavailable', message: body.message ?? 'Personal previews are unavailable at the moment. Explore the prepared residence studies below.' })
      } catch {
        if (!controller.signal.aborted) setAvailability({ state: 'unavailable', message: 'Personal previews are unavailable at the moment. Your photo stays on this device; prepared sample studies remain available.' })
      }
    }
    void checkAvailability()
    return () => controller.abort()
  }, [])

  function chooseDesign(nextMaterial: MaterialId, nextFinish: string, nextQuality = quality) {
    current.current = { sourceId: photo.id, key: previewKey(photo.id, nextMaterial, nextFinish, nextQuality), materialId: nextMaterial, finishId: nextFinish, quality: nextQuality }
    setMaterialId(nextMaterial)
    setFinishId(nextFinish)
    setQuality(nextQuality)
    setError('')
    const saved = cache.current.get(previewKey(photo.id, nextMaterial, nextFinish, nextQuality))
    if (saved) { setPreview(saved); setView('preview'); setStatus('This prepared preview is ready. No new generation was needed.') }
    else setStatus(busy ? 'Finishing the requested preview. Your new choice can be generated after it completes.' : 'Your choice is ready. Select Generate preview to create it; changing a finish does not send a request.')
  }

  async function choosePhoto(file: File | undefined) {
    if (!file) return
    if (/\.(heic|heif)$/i.test(file.name) || /hei[cf]/i.test(file.type)) {
      setError('Please export your iPhone HEIC photo as a JPG, then upload it here.')
      return
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setError('Please choose a JPG, PNG or WebP photo.'); return }
    if (file.size > 25_000_000) { setError('Please choose a photo smaller than 25 MB.'); return }
    const version = ++photoVersion.current
    requestRef.current?.abort()
    setPreparing(true)
    setError('')
    const url = URL.createObjectURL(file)
    try {
      const data = await preparePhoto(url)
      if (!mounted.current || version !== photoVersion.current) return
      const nextPhoto: Photo = { id: `home-${version}`, image: data, data, name: 'Your residence', sample: false }
      cache.current.clear()
      setPreparedKeys([])
      const latest = current.current
      current.current = { ...latest, sourceId: nextPhoto.id, key: previewKey(nextPhoto.id, latest.materialId, latest.finishId, latest.quality) }
      setPhoto(nextPhoto)
      setPreview(null)
      setView('original')
      setConsent(false)
      setStatus('Your photo is ready on this device. Choose a roof finish, then consent and generate a preview.')
    } catch (reason) {
      if (mounted.current && version === photoVersion.current) setError(reason instanceof Error ? reason.message : 'We could not prepare that photo. Please choose another file.')
    } finally {
      URL.revokeObjectURL(url)
      if (mounted.current && version === photoVersion.current) setPreparing(false)
    }
  }

  function useSample() {
    photoVersion.current += 1
    requestRef.current?.abort()
    cache.current = sampleCache()
    setPreparedKeys([...sampleCache().keys()])
    current.current = { sourceId: SAMPLE.id, key: previewKey(SAMPLE.id, 'slate', 'blue-gray', 'medium'), materialId: 'slate', finishId: 'blue-gray', quality: 'medium' }
    setPhoto(SAMPLE)
    setPreview(SAMPLE_PREVIEW)
    setMaterialId('slate')
    setFinishId('blue-gray')
    setQuality('medium')
    setView('preview')
    setConsent(false)
    setPreparing(false)
    setError('')
    setStatus('A prepared slate study is ready to compare. No API request is needed for this sample.')
  }

  async function generate() {
    if (requestLocked.current || preparing) return
    const saved = cache.current.get(currentKey)
    if (saved) { setPreview(saved); setView('preview'); setStatus('Your saved preview is ready. No new request was sent.'); return }
    if (availability.state !== 'ready') { setError(availability.message); return }
    if (!consent) { setError('Please allow this photo to be sent to OpenAI before generating a preview.'); return }
    const snapshot = { photo, materialId, finishId: finish.id, quality, key: currentKey }
    const controller = new AbortController()
    requestRef.current = controller
    requestLocked.current = true
    setBusy(true)
    setError('')
    setStatus('Preparing your architectural preview. Image generation can take a minute or two.')
    try {
      const data = snapshot.photo.data ?? await preparePhoto(snapshot.photo.image)
      if (controller.signal.aborted) return
      const response = await fetch('/api/roof-render', {
        method: 'POST', signal: controller.signal, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photo: data, materialId: snapshot.materialId, finishId: snapshot.finishId, quality: snapshot.quality, consent: true }),
      })
      const body = await response.json() as RenderResponse
      if (!response.ok || !body.ok || !body.image) throw new Error(body.message ?? 'This preview could not be generated. Please try again shortly.')
      if (!/^data:image\/(png|jpeg|webp);base64,/.test(body.image)) throw new Error('The image service returned an unreadable preview. Please try again.')
      if (controller.signal.aborted || !mounted.current || current.current.sourceId !== snapshot.photo.id) return
      const result: Preview = { sourceId: snapshot.photo.id, image: body.image, materialId: snapshot.materialId, finishId: snapshot.finishId, quality: snapshot.quality, sample: false }
      cache.current.set(snapshot.key, result)
      setPreparedKeys(keys => [...keys.filter(key => key !== snapshot.key), snapshot.key])
      if (current.current.key === snapshot.key) {
        setPreview(result)
        setView('compare')
        setStatus('Your preview is ready. Compare it with the original and review the rooflines before making a decision.')
      } else setStatus('Your earlier choice is ready and saved in this session. Select that material and finish to view it.')
    } catch (reason) {
      if (controller.signal.aborted || !mounted.current) return
      setError(reason instanceof Error ? reason.message : 'The preview could not be generated. Please try again.')
      setStatus('Your original photo is still available. No preview was substituted.')
    } finally {
      requestLocked.current = false
      if (requestRef.current === controller) requestRef.current = null
      if (mounted.current) setBusy(false)
    }
  }

  async function savePreview() {
    if (!matchingPreview) return
    setError('')
    try {
      const image = await readImage(matchingPreview.image)
      const canvas = document.createElement('canvas')
      canvas.width = image.naturalWidth; canvas.height = image.naturalHeight
      const context = canvas.getContext('2d')
      if (!context) throw new Error('Download is unavailable in this browser.')
      context.drawImage(image, 0, 0)
      const link = document.createElement('a')
      link.href = canvas.toDataURL('image/jpeg', 0.94)
      link.download = `velar-${matchingPreview.materialId}-${matchingPreview.finishId}-concept.jpg`
      link.click()
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'This preview could not be saved. Please try again.') }
  }

  return <div className="va-visualizer">
    <div className="va-viz-main">
      <div className="va-viz-topline"><span><i /> {photo.name}</span><span>{photo.sample ? 'Prepared sample study' : 'Your original retained'}</span></div>
      <div className="va-viz-frame" aria-label="Roof design image">
        <img className="va-viz-original" src={photo.image} alt={photo.sample ? 'Exclusive Velar sample residence with its original roof' : 'Your uploaded home with its original roof'} />
        {matchingPreview && view !== 'original' ? <img className="va-viz-render" src={matchingPreview.image} alt={`${previewMaterial?.name ?? 'Roof'} in ${previewFinish?.name ?? 'selected finish'}, AI concept preview`} style={{ clipPath: view === 'compare' ? `inset(0 0 0 ${split}%)` : undefined }} /> : null}
        <span className="va-viz-photo-label">{view === 'original' || !matchingPreview ? 'Original photograph' : `${previewMaterial?.short} / ${previewFinish?.name}`}</span>
        {matchingPreview && view !== 'original' ? <span className="va-viz-ai-label">AI concept</span> : null}
        {matchingPreview && view === 'compare' ? <div className="va-viz-split-line" style={{ left: `${split}%` }}><span aria-hidden="true">↔</span></div> : null}
        {preparing ? <div className="va-viz-loading">Preparing your photo locally…</div> : null}
      </div>
      <div className="va-viz-viewbar">
        <div className="va-viz-view-switch" role="group" aria-label="Photo view">
          <button type="button" aria-pressed={view === 'original'} onClick={() => setView('original')}>Original</button>
          <button type="button" aria-pressed={view === 'preview'} disabled={!matchingPreview} onClick={() => setView('preview')}>Preview</button>
          <button type="button" aria-pressed={view === 'compare'} disabled={!matchingPreview} onClick={() => setView('compare')}>Compare</button>
        </div>
        <button type="button" className="va-viz-save" disabled={!matchingPreview} onClick={() => void savePreview()} aria-label="Download roof preview as JPEG">Save JPEG <span aria-hidden="true">↓</span></button>
      </div>
      {matchingPreview && view === 'compare' ? <label className="va-viz-compare-control"><span>Original</span><input type="range" min="0" max="100" value={split} onChange={event => setSplit(Number(event.target.value))} aria-label="Original and preview comparison position" /><span>Concept</span></label> : null}
      <div className="va-viz-photo-actions"><button type="button" className="va-viz-upload" disabled={preparing} onClick={() => fileRef.current?.click()}><span aria-hidden="true">+</span> Upload your home</button><button type="button" onClick={useSample} disabled={preparing || photo.sample}>Use sample</button><input className="va-viz-file" ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" aria-label="Upload a photograph of your home" onChange={event => { void choosePhoto(event.target.files?.[0]); event.target.value = '' }} /></div>
      {matchingPreview && !previewMatchesSelection ? <p className="va-viz-pending-choice">Showing {previewMaterial?.short.toLowerCase()} / {previewFinish?.name}. Generate your new selection to compare it.</p> : null}
    </div>

    <div className="va-viz-panel">
      <div className="va-viz-panel-head"><span>01 / YOUR DESIGN STUDY</span><h3>A new roof. Same home.</h3><p>Choose your material and finish. We create a photo-based concept without asking you to trace a roof.</p></div>
      <div className="va-viz-materials" role="group" aria-label="Roof material">{roofMaterials.map(item => <button type="button" key={item.id} aria-pressed={materialId === item.id} onClick={() => chooseDesign(item.id, item.colors[0].id)}><img src={item.image} alt="" loading="lazy" /><span>{item.short}</span></button>)}</div>
      <div className="va-viz-finish"><div><strong>{material.name}</strong><span>{finish.name}</span></div><p>{material.character}</p><div className="va-viz-swatches" role="group" aria-label={`${material.short} finish`}>{material.colors.map(color => <button key={color.id} type="button" aria-pressed={finish.id === color.id} onClick={() => chooseDesign(materialId, color.id)}><i style={{ backgroundColor: color.hex }} aria-hidden="true" /><span>{color.name}</span></button>)}</div></div>
      <details className="va-viz-render-options"><summary>Preview detail <span>{quality === 'medium' ? 'Refined' : 'Quick'} <b aria-hidden="true">+</b></span></summary><fieldset className="va-viz-quality"><legend>Preview quality</legend><label><input type="radio" name="velar-quality" value="low" checked={quality === 'low'} onChange={() => chooseDesign(materialId, finish.id, 'low')} /><span>Quick <small>First impression</small></span></label><label><input type="radio" name="velar-quality" value="medium" checked={quality === 'medium'} onChange={() => chooseDesign(materialId, finish.id, 'medium')} /><span>Refined <small>Finer detail</small></span></label></fieldset></details>
      {!alreadyPrepared ? <label className="va-viz-consent"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} disabled={busy} /><span>I agree to send this photo to OpenAI to generate a roof concept. My photo stays on this device until I select Generate.</span></label> : null}
      <button type="button" className="va-viz-generate" onClick={() => void generate()} disabled={busy || preparing || (!alreadyPrepared && (!consent || availability.state !== 'ready'))}>{busy ? <><span className="va-viz-spinner" aria-hidden="true" /> Generating preview…</> : alreadyPrepared ? 'View prepared preview' : 'Generate preview'}<span aria-hidden="true">↗</span></button>
      {!alreadyPrepared && availability.state !== 'ready' ? <p className="va-viz-availability" role="status">{availability.message}</p> : null}
      <p className="va-viz-status" role="status">{status}</p>
      {error ? <p className="va-viz-error" role="alert">{error}</p> : null}
      <details className="va-viz-planning"><summary><span>02 / PLANNING ALLOWANCE<strong>{formatMoney(low)}–{formatMoney(high)}</strong></span><b aria-hidden="true">+</b></summary><div>
        <label className="va-viz-area">Total sloped roof area<div><input type="number" min="0" max="40000" step="100" value={areaText} onChange={event => setAreaText(event.target.value)} /><span>sq ft</span></div></label>
        <label className="va-viz-complexity">Roof complexity<select value={complexity} onChange={event => setComplexity(event.target.value as ComplexityId)}>{roofComplexities.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <p>Use measured roof surface area from a roof report. The photo does not measure area. This illustrative allowance uses {formatMoney(material.rate[0])}–{formatMoney(material.rate[1])} per sq ft, adjusted for complexity; it is not a quotation. Structure, removal, access and regional pricing require a survey.</p>
      </div></details>
      <p className="va-viz-note">AI concepts can alter rooflines or details. Compare with your original; your design consultant will confirm fit, structure and material compatibility.</p>
    </div>
  </div>
}
