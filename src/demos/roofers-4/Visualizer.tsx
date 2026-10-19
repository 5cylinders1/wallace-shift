import { useEffect, useRef, useState } from 'react'
import { complexities, materials, money, type ComplexityId, type Material, type MaterialId } from './content'
import { getPreparedPreview, HALCYON_SAMPLE_ID, HALCYON_SAMPLE_PREVIEWS, previewKey, type PreviewQuality, type RoofPreview } from './prepared-previews'

export type VisualizerSelection = {
  material: Material
  color: { name: string; hex: string }
  area: number
  complexity: ComplexityId
  low: number
  high: number
}

type Quality = PreviewQuality
type Photo = { id: string; image: string; data: string | null; sample: boolean }
type Preview = RoofPreview
type Availability = { state: 'checking' | 'ready' | 'unavailable'; message: string }
const SAMPLE: Photo = { id: HALCYON_SAMPLE_ID, image: '/demos/roofers-4/sample-home.jpg', data: null, sample: true }
const finishId = (name: string) => name.toLowerCase().replace(/\s+/g, '-')

function estimate(material: Material, area: number, complexity: ComplexityId): [number, number] {
  const factor = complexities.find(c => c.id === complexity)?.factor ?? 1
  const round = (value: number) => Math.round(value / 500) * 500
  return [round(area * material.rate[0] * factor), round(area * material.rate[1] * factor)]
}

function readImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('That image could not be read. Please choose a JPG, PNG or WebP photo.'))
    image.src = url
  })
}

/** Prepare the photo locally; only Generate preview sends it to the server. */
async function preparePhoto(url: string): Promise<string> {
  const image = await readImage(url)
  const { naturalWidth: width, naturalHeight: height } = image
  if (Math.min(width, height) < 128) throw new Error('Please choose a clear photo at least 128 pixels on each side.')
  if (width / height < 1 / 3 || width / height > 3) throw new Error('Please use a regular landscape or portrait photo rather than a panorama.')
  const canvas = document.createElement('canvas')
  const ratio = Math.min(1, 1536 / Math.max(width, height))
  canvas.width = Math.round(width * ratio)
  canvas.height = Math.round(height * ratio)
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Photo preparation is unavailable in this browser. Please try another browser.')
  context.fillStyle = '#fff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  for (const quality of [0.88, 0.75, 0.62, 0.48]) {
    const data = canvas.toDataURL('image/jpeg', quality)
    if (Math.ceil((data.length - data.indexOf(',') - 1) * 3 / 4) <= 1_500_000) return data
  }
  throw new Error('This photo is still too large after preparation. Please choose a smaller photo.')
}

/** Each render starts from the original photo, never from an earlier AI edit. */
export default function Visualizer({ onSelection }: { onSelection?: (selection: VisualizerSelection) => void }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const requestRef = useRef<AbortController | null>(null)
  const requestLocked = useRef(false)
  const preparingLocked = useRef(false)
  const mounted = useRef(true)
  const photoVersion = useRef(0)
  const [photo, setPhoto] = useState<Photo>(SAMPLE)
  const [preview, setPreview] = useState<Preview | null>(() => getPreparedPreview(SAMPLE.id, 'standing-seam', 0, 'medium'))
  const [previews, setPreviews] = useState<Map<string, Preview>>(() => new Map())
  const [materialId, setMaterialId] = useState<MaterialId>('standing-seam')
  const [colorIndex, setColorIndex] = useState(0)
  const [quality, setQuality] = useState<Quality>('medium')
  const [view, setView] = useState<'original' | 'preview' | 'compare'>('preview')
  const [split, setSplit] = useState(50)
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [preparing, setPreparing] = useState(false)
  const [availability, setAvailability] = useState<Availability>({ state: 'checking', message: 'Checking preview availability…' })
  const [availabilityVersion, setAvailabilityVersion] = useState(0)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('A prepared metal preview is ready. Explore the first finish of every material instantly, or upload your own home.')
  const [areaText, setAreaText] = useState('3200')
  const [complexity, setComplexity] = useState<ComplexityId>('moderate')
  const current = useRef({ sourceId: SAMPLE.id, key: previewKey(SAMPLE.id, 'standing-seam', 0, 'medium') })

  const material = materials.find(m => m.id === materialId) ?? materials[0]
  const color = material.colors[colorIndex] ?? material.colors[0]
  const area = Math.max(0, Math.min(40000, Number(areaText.replace(/[^0-9.]/g, '')) || 0))
  const [low, high] = estimate(material, area, complexity)
  const key = previewKey(photo.id, materialId, colorIndex, quality)
  const availablePreview = getPreparedPreview(photo.id, materialId, colorIndex, quality) ?? previews.get(key)
  const alreadyPrepared = Boolean(availablePreview)
  const shown = preview?.sourceId === photo.id ? preview : null
  const shownMaterial = materials.find(m => m.id === shown?.materialId)
  const shownColor = shownMaterial?.colors[shown?.colorIndex ?? 0]
  const matchesSelection = shown && previewKey(shown.sourceId, shown.materialId, shown.colorIndex, shown.quality) === key

  useEffect(() => {
    onSelection?.({ material, color, area, complexity, low, high })
  }, [material, color, area, complexity, low, high, onSelection])

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false; requestRef.current?.abort() }
  }, [])

  useEffect(() => {
    // Warm the bundled studies so material changes do not wait for another image request.
    for (const source of Object.values(HALCYON_SAMPLE_PREVIEWS)) {
      const image = new Image()
      image.decoding = 'async'
      image.src = source
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    let active = true
    const timer = window.setTimeout(() => controller.abort(), 15_000)
    async function checkAvailability() {
      try {
        const response = await fetch('/api/roof-render', { signal: controller.signal })
        const body = await response.json() as { ok?: boolean; enabled?: boolean; configured?: boolean; message?: string }
        if (!active || controller.signal.aborted) return
        setAvailability(response.ok && body.ok && body.enabled && body.configured
          ? { state: 'ready', message: '' }
          : { state: 'unavailable', message: body.message ?? 'Photo previews are unavailable at the moment. Please try again shortly.' })
      } catch {
        if (active) setAvailability({ state: 'unavailable', message: 'The preview service could not be reached. Your photo stays on this device until you generate a preview.' })
      } finally { window.clearTimeout(timer) }
    }
    void checkAvailability()
    return () => { active = false; window.clearTimeout(timer); controller.abort() }
  }, [availabilityVersion])

  function chooseDesign(nextMaterial: MaterialId, nextColor: number, nextQuality = quality) {
    const nextKey = previewKey(photo.id, nextMaterial, nextColor, nextQuality)
    current.current = { sourceId: photo.id, key: nextKey }
    setMaterialId(nextMaterial)
    setColorIndex(nextColor)
    setQuality(nextQuality)
    setError('')
    const saved = getPreparedPreview(photo.id, nextMaterial, nextColor, nextQuality) ?? previews.get(nextKey)
    if (saved) {
      setPreview(saved)
      setView('preview')
      setStatus(saved.prepared ? 'This prepared sample preview is ready. No new generation was needed.' : 'Your saved preview is ready. No new generation was needed.')
    } else setStatus(busy ? 'Finishing the requested preview. Your new choice can be generated once it completes.' : 'Your new choice is ready. Select Generate preview to see it on the home.')
  }

  async function choosePhoto(file: File | undefined) {
    if (!file || requestLocked.current || preparingLocked.current) return
    if (/\.(heic|heif)$/i.test(file.name) || /hei[cf]/i.test(file.type)) { setError('Please export your HEIC photo as a JPG, then choose it here.'); return }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setError('Please choose a JPG, PNG or WebP photo.'); return }
    if (file.size > 25_000_000) { setError('Please choose a photo smaller than 25 MB.'); return }
    const version = ++photoVersion.current
    preparingLocked.current = true
    setPreparing(true)
    setError('')
    const url = URL.createObjectURL(file)
    try {
      const data = await preparePhoto(url)
      if (!mounted.current || version !== photoVersion.current) return
      const nextPhoto: Photo = { id: `home-${version}`, image: data, data, sample: false }
      current.current = { sourceId: nextPhoto.id, key: previewKey(nextPhoto.id, materialId, colorIndex, quality) }
      setPhoto(nextPhoto)
      setPreviews(new Map())
      setPreview(null)
      setView('original')
      setConsent(false)
      setStatus('Your photo is ready on this device. Choose a finish, allow photo processing, then generate a preview.')
    } catch (reason) {
      if (mounted.current && version === photoVersion.current) setError(reason instanceof Error ? reason.message : 'This photo could not be prepared.')
    } finally {
      URL.revokeObjectURL(url)
      preparingLocked.current = false
      if (mounted.current && version === photoVersion.current) setPreparing(false)
    }
  }

  function useSample() {
    if (requestLocked.current || preparingLocked.current) return
    photoVersion.current++
    current.current = { sourceId: SAMPLE.id, key: previewKey(SAMPLE.id, materialId, 0, quality) }
    setPhoto(SAMPLE)
    setColorIndex(0)
    setPreviews(new Map())
    setPreview(getPreparedPreview(SAMPLE.id, materialId, 0, quality))
    setView('preview')
    setConsent(false)
    setError('')
    setStatus('The prepared sample preview is ready. The first finish of every material is available without a new generation.')
  }

  async function generate() {
    if (preparingLocked.current) return
    const saved = getPreparedPreview(photo.id, materialId, colorIndex, quality) ?? previews.get(key)
    if (saved) {
      setPreview(saved)
      setView('preview')
      setError('')
      setStatus(saved.prepared ? 'This prepared sample preview is ready. No new generation was needed.' : 'Your saved preview is ready. No new generation was needed.')
      return
    }
    if (requestLocked.current) return
    if (availability.state !== 'ready') { setError(availability.message); return }
    if (!consent) { setError('Please allow this photo to be sent to OpenAI before generating a preview.'); return }
    const snapshot = { photo, materialId, colorIndex, quality, key, finish: finishId(color.name) }
    const controller = new AbortController()
    requestRef.current = controller
    requestLocked.current = true
    setBusy(true)
    setError('')
    setStatus('Creating your roof preview. This can take a minute or two.')
    const timer = window.setTimeout(() => controller.abort(), 180_000)
    try {
      const data = snapshot.photo.data ?? await preparePhoto(snapshot.photo.image)
      if (controller.signal.aborted) throw new Error('The preview request timed out. Please wait a few minutes before trying again.')
      const response = await fetch('/api/roof-render', {
        method: 'POST', signal: controller.signal, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studio: 'halcyon', photo: data, materialId: snapshot.materialId, finishId: snapshot.finish, quality: snapshot.quality, consent: true }),
      })
      const body = await response.json() as { ok?: boolean; image?: string; message?: string }
      if (!response.ok || !body.ok || !body.image) throw new Error(body.message ?? 'This preview could not be generated. Please try again shortly.')
      if (!/^data:image\/jpeg;base64,/.test(body.image)) throw new Error('The image service returned an unreadable preview. Please try again later.')
      await readImage(body.image)
      if (controller.signal.aborted || !mounted.current || current.current.sourceId !== snapshot.photo.id) return
      const result: Preview = { sourceId: snapshot.photo.id, image: body.image, materialId: snapshot.materialId, colorIndex: snapshot.colorIndex, quality: snapshot.quality, prepared: false }
      setPreviews(previous => {
        const next = new Map(previous)
        next.set(snapshot.key, result)
        // Only generated comparisons occupy this bounded cache; bundled studies cannot be evicted.
        if (next.size > 6) next.delete(next.keys().next().value!)
        return next
      })
      if (current.current.key === snapshot.key) {
        setPreview(result)
        setView('compare')
        setStatus('Your preview is ready. Compare it with the original and review the rooflines before deciding.')
      } else setStatus('Your earlier choice is ready and saved. Select that material, finish and detail level to view it.')
    } catch (reason) {
      if (!mounted.current) return
      setError(controller.signal.aborted ? 'The preview request timed out. Please wait a few minutes before trying again.' : reason instanceof Error ? reason.message : 'This preview could not be generated.')
      setStatus('Your original photo and any completed preview are still available.')
    } finally {
      window.clearTimeout(timer)
      requestLocked.current = false
      if (requestRef.current === controller) requestRef.current = null
      if (mounted.current) setBusy(false)
    }
  }

  function download() {
    if (!shown || !shownColor) return
    const link = document.createElement('a')
    link.href = shown.image
    link.download = `halcyon-roof-${shown.materialId}-${finishId(shownColor.name)}-${shown.quality}-concept.jpg`
    document.body.append(link)
    link.click()
    link.remove()
  }

  return <div className="hr-viz">
    <div className="hr-viz-stage">
      <div className="hr-viz-image-wrap" aria-label="Roof design image" aria-busy={busy || preparing}>
        <img className="hr-viz-original" src={photo.image} aria-hidden={view === 'preview' && Boolean(shown)} alt={photo.sample ? 'Halcyon sample home with its original roof' : 'Your uploaded home with its original roof'} />
        {shown && view !== 'original' && <img className="hr-viz-render" src={shown.image} alt={`${shownMaterial?.name}, ${shownColor?.name}, AI roof concept`} style={{ clipPath: view === 'compare' ? `inset(0 0 0 ${split}%)` : undefined }} />}
        <span className="hr-viz-image-label">{view === 'original' || !shown ? 'Original photograph' : `${shownMaterial?.short} · ${shownColor?.name}`}</span>
        {shown && view !== 'original' && <span className="hr-viz-ai-label">AI concept</span>}
        {shown && view === 'compare' && <div className="hr-viz-split-line" style={{ left: `${split}%` }}><span aria-hidden="true">↔</span></div>}
        {((busy && !alreadyPrepared) || preparing) && <div className="hr-viz-loading" role="status"><span className="hr-viz-spinner" aria-hidden="true" />{preparing ? 'Preparing your photo…' : 'Creating your roof preview…'}</div>}
      </div>
      <div className="hr-viz-toolbar">
        <div className="hr-viz-viewbar">
          <div className="hr-viz-tools" role="group" aria-label="Photo view">
            <button type="button" className="hr-tool" aria-pressed={view === 'original'} onClick={() => setView('original')}>Original</button>
            <button type="button" className="hr-tool" aria-pressed={view === 'preview'} disabled={!shown} onClick={() => setView('preview')}>Preview</button>
            <button type="button" className="hr-tool" aria-pressed={view === 'compare'} disabled={!shown} onClick={() => setView('compare')}>Compare</button>
          </div>
          <button type="button" className="hr-tool hr-tool-accent" onClick={download} disabled={!shown}>Download <span aria-hidden="true">↓</span></button>
        </div>
        {shown && view === 'compare' && <label className="hr-viz-compare-control"><span>Original</span><input type="range" min="0" max="100" value={split} onChange={event => setSplit(Number(event.target.value))} aria-label="Original and preview comparison position" /><span>AI preview</span></label>}
        <div className="hr-viz-tools">
          <button type="button" className="hr-tool" disabled={busy || preparing} onClick={() => fileRef.current?.click()}>Upload your home <span aria-hidden="true">↑</span></button>
          <button type="button" className="hr-tool" disabled={busy || preparing || photo.sample} onClick={useSample}>Use sample</button>
        </div>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden aria-label="Upload a photograph of your home" onChange={event => { void choosePhoto(event.target.files?.[0]); event.target.value = '' }} />
        {shown && !matchesSelection && <p className="hr-viz-pending">{shown.prepared ? 'Prepared sample preview' : 'Saved preview'}: {shownMaterial?.name}, {shownColor?.name}{!shown.prepared && `, ${shown.quality === 'medium' ? 'refined' : 'quick'} detail`}. Generate your current selection to see the change.</p>}
        <p className="hr-viz-status" aria-live="polite">{status}</p>
        <p className="hr-viz-disclaimer">AI previews are planning concepts and may alter architectural details. Compare against your original photo; finishes, roof measurements and installation details require an on-site review.</p>
      </div>
    </div>

    <aside className="hr-viz-panel" aria-label="Roof design controls">
      <div className="hr-viz-group">
        <p className="hr-viz-label">Material</p>
        <div className="hr-viz-materials" role="group" aria-label="Roof material">
          {materials.map(m => <button type="button" key={m.id} aria-pressed={m.id === materialId} className={`hr-viz-material ${m.id === materialId ? 'is-on' : ''}`} onClick={() => chooseDesign(m.id, 0)} disabled={preparing}>
            <img src={m.image} alt="" loading="lazy" width="96" height="72" />
            <span><b>{m.name}</b><i>{money(m.rate[0])} to {money(m.rate[1])} per sq ft</i></span>
          </button>)}
        </div>
      </div>
      <div className="hr-viz-group">
        <p className="hr-viz-label">Finish <span>{color.name}</span></p>
        <div className="hr-viz-colors" role="group" aria-label="Finish color">
          {material.colors.map((c, i) => <button type="button" key={c.name} aria-pressed={i === colorIndex} aria-label={c.name} title={c.name} className={i === colorIndex ? 'is-on' : ''} style={{ background: c.hex }} onClick={() => chooseDesign(materialId, i)} disabled={preparing} />)}
        </div>
      </div>
      <div className="hr-viz-group hr-viz-row">
        <label><span className="hr-viz-label">Preview detail</span><select value={quality} disabled={preparing} onChange={event => chooseDesign(materialId, colorIndex, event.target.value as Quality)} aria-label="Preview detail"><option value="low">Quick · first impression</option><option value="medium">Refined · more detail</option></select></label>
      </div>
      <div className="hr-viz-generation">
        {!alreadyPrepared && <label className="hr-viz-consent"><input type="checkbox" checked={consent} disabled={busy || preparing} onChange={event => setConsent(event.target.checked)} /><span>I have permission to use this photo and agree to send it to OpenAI to create a roof preview.</span></label>}
        <button type="button" className="hr-cta-primary hr-cta-wide" onClick={() => void generate()} disabled={preparing || (!alreadyPrepared && (busy || !consent || availability.state !== 'ready'))}>{availablePreview?.prepared ? 'View prepared preview' : alreadyPrepared ? 'View saved preview' : busy ? 'Creating preview…' : 'Generate preview'}<span aria-hidden="true">↗</span></button>
        {!alreadyPrepared && availability.state !== 'ready' && <p className="hr-viz-status" role="status">{availability.message} {availability.state === 'unavailable' && <button type="button" className="hr-viz-retry" onClick={() => { setAvailability({ state: 'checking', message: 'Checking preview availability…' }); setAvailabilityVersion(version => version + 1) }}>Check again</button>}</p>}
        {error && <p className="hr-viz-error" role="alert">{error}</p>}
        <p className="hr-viz-disclaimer">Your photo is sent only when you generate a preview. Each new design starts from your original photograph.</p>
      </div>
      <div className="hr-viz-group hr-viz-row">
        <label><span className="hr-viz-label">Roof area <span>sq ft, from your plans or our survey</span></span><input type="text" inputMode="numeric" value={areaText} onChange={event => setAreaText(event.target.value)} aria-label="Roof area in square feet" /></label>
        <label><span className="hr-viz-label">Complexity</span><select value={complexity} onChange={event => setComplexity(event.target.value as ComplexityId)}>{complexities.map(c => <option key={c.id} value={c.id}>{c.name}: {c.note}</option>)}</select></label>
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
