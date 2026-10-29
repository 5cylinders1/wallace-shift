import { useEffect, useId, useRef, useState, type ChangeEvent } from 'react'
import {
  BODY_COLORS, DOOR_COLORS, TRIM_COLORS, describeSelection,
  type PaintColor, type PaintSelection, type RenderQuality, type RenderResponse, type RenderStatus,
} from './palette'
import { SAMPLE_LOOKS, SAMPLE_PHOTO, selectionKey } from './looks'

type Photo = { id: string; src: string; sample: boolean }
type Result = { src: string; selection: PaintSelection; prepared: boolean }
type Availability = { state: 'checking' | 'live' | 'off'; message: string }

const SAMPLE: Photo = { id: 'sample', src: SAMPLE_PHOTO, sample: true }
const MAX_UPLOAD = 25_000_000

function readImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('That photo could not be read. Please choose a JPG, PNG or WebP photo.'))
    image.src = url
  })
}

/** Resized and compressed in the browser; nothing leaves the device until a preview is requested. */
async function preparePhoto(url: string): Promise<string> {
  const image = await readImage(url)
  const { naturalWidth: width, naturalHeight: height } = image
  if (Math.min(width, height) < 256) throw new Error('Please choose a clearer photo, at least 256 pixels on each side.')
  if (width / height < 1 / 3 || width / height > 3) throw new Error('Please use a regular landscape or portrait photo rather than a panorama.')
  const canvas = document.createElement('canvas')
  const ratio = Math.min(1, 1536 / Math.max(width, height))
  canvas.width = Math.round(width * ratio)
  canvas.height = Math.round(height * ratio)
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Photo preparation isn’t available in this browser. Please try another browser.')
  context.fillStyle = '#fff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  for (const quality of [0.88, 0.76, 0.64, 0.5]) {
    const data = canvas.toDataURL('image/jpeg', quality)
    if (Math.ceil((data.length - data.indexOf(',') - 1) * 3 / 4) <= 1_500_000) return data
  }
  throw new Error('This photo is still too large after resizing. Please choose a smaller one.')
}

/** The sample photo, as a data URL, only when a live preview of it is requested. */
async function sampleData(): Promise<string> {
  const blob = await (await fetch(SAMPLE_PHOTO)).blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('The sample photo could not be loaded.'))
    reader.readAsDataURL(blob)
  })
}

function Swatches({ label, colors, value, onChange, children }: { label: string; colors: PaintColor[]; value: string; onChange: (id: string) => void; children?: React.ReactNode }) {
  const name = useId()
  return (
    <fieldset className="cp-swatches">
      <legend>{label} <span>{colors.find((color) => color.id === value)?.name ?? 'Custom color'}</span></legend>
      <div className="cp-swatch-row">
        {colors.map((color) => (
          <label key={color.id} className={`cp-swatch${color.hex ? '' : ' is-word'}`} title={color.name}>
            <input type="radio" name={name} value={color.id} checked={value === color.id} onChange={() => onChange(color.id)} />
            {color.hex ? <span className="cp-swatch-chip" style={{ background: color.hex }} /> : <span className="cp-swatch-word">{color.name}</span>}
            {color.hex && <span className="cp-visually-hidden">{color.name}</span>}
          </label>
        ))}
        {children}
      </div>
    </fieldset>
  )
}

export default function ColorStudio({ onUseColors }: { onUseColors: (colors: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const requestRef = useRef<AbortController | null>(null)
  const photoVersion = useRef(0)
  const [photo, setPhoto] = useState<Photo>(SAMPLE)
  const [selection, setSelection] = useState<PaintSelection>(SAMPLE_LOOKS[1].selection)
  const [results, setResults] = useState<Map<string, Result>>(() => new Map())
  const [shown, setShown] = useState<Result | null>({ src: SAMPLE_LOOKS[1].src, selection: SAMPLE_LOOKS[1].selection, prepared: true })
  const [quality, setQuality] = useState<RenderQuality>('medium')
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [preparing, setPreparing] = useState(false)
  const [split, setSplit] = useState(50)
  const [error, setError] = useState('')
  const [availability, setAvailability] = useState<Availability>({ state: 'checking', message: '' })

  const key = selectionKey(selection)
  const prepared = photo.sample ? SAMPLE_LOOKS.find((look) => selectionKey(look.selection) === key) : undefined
  const saved = results.get(`${photo.id}:${key}`)
  const current = shown && selectionKey(shown.selection) === key
  const needsLive = !prepared && !saved

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/paint-render', { signal: controller.signal })
      .then((response) => response.json() as Promise<RenderStatus>)
      .then((body) => setAvailability(body.enabled ? { state: 'live', message: '' } : { state: 'off', message: body.message }))
      .catch(() => { if (!controller.signal.aborted) setAvailability({ state: 'off', message: 'The preview service couldn’t be reached. The sample looks still work.' }) })
    return () => { controller.abort(); requestRef.current?.abort() }
  }, [])

  // Prepared looks and earlier previews show as soon as their colors are picked.
  const choose = (next: PaintSelection) => {
    setSelection(next)
    setError('')
    const nextKey = selectionKey(next)
    const look = photo.sample ? SAMPLE_LOOKS.find((item) => selectionKey(item.selection) === nextKey) : undefined
    const earlier = results.get(`${photo.id}:${nextKey}`)
    if (look) setShown({ src: look.src, selection: look.selection, prepared: true })
    else if (earlier) setShown(earlier)
  }

  async function choosePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || busy) return
    if (/\.(heic|heif)$/i.test(file.name) || /hei[cf]/i.test(file.type)) return setError('iPhone HEIC photos need converting first: share or export the photo as a JPG, then choose it here.')
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return setError('Please choose a JPG, PNG or WebP photo.')
    if (file.size > MAX_UPLOAD) return setError('Please choose a photo smaller than 25 MB.')
    const version = ++photoVersion.current
    setPreparing(true)
    setError('')
    const url = URL.createObjectURL(file)
    try {
      const data = await preparePhoto(url)
      if (version !== photoVersion.current) return
      setPhoto({ id: `home-${version}`, src: data, sample: false })
      setShown(null)
      setConsent(false)
      setSplit(50)
    } catch (reason) {
      if (version === photoVersion.current) setError(reason instanceof Error ? reason.message : 'This photo could not be prepared.')
    } finally {
      URL.revokeObjectURL(url)
      setPreparing(false)
    }
  }

  async function generate() {
    if (busy || (!photo.sample && !consent)) return
    const controller = new AbortController()
    requestRef.current = controller
    const requested = { ...selection }
    const photoId = photo.id
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/paint-render', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...requested, photo: photo.sample ? await sampleData() : photo.src, quality, consent: true }),
        signal: controller.signal,
      })
      const body = await response.json() as RenderResponse
      if (!body.ok) throw new Error(body.message)
      const result: Result = { src: body.image, selection: requested, prepared: false }
      setResults((map) => new Map(map).set(`${photoId}:${selectionKey(requested)}`, result))
      if (photoVersion.current === Number(photoId.replace('home-', '')) || photoId === 'sample') {
        setShown(result)
        setSplit(50)
      }
    } catch (reason) {
      if (!controller.signal.aborted) setError(reason instanceof Error && reason.message ? reason.message : 'The preview could not be made. Please try again in a minute.')
    } finally {
      setBusy(false)
      requestRef.current = null
    }
  }

  const backToSample = () => {
    photoVersion.current += 1
    setPhoto(SAMPLE)
    setConsent(false)
    setSplit(50)
    const look = SAMPLE_LOOKS.find((item) => selectionKey(item.selection) === key) ?? SAMPLE_LOOKS[1]
    setSelection(look.selection)
    setShown({ src: look.src, selection: look.selection, prepared: true })
  }

  const showing = current ? shown : null
  const live = availability.state === 'live'
  const canGenerate = needsLive && live && !busy && (photo.sample || consent)
  const download = showing && !showing.prepared ? showing.src : null

  return (
    <div className="cp-studio">
      <div className="cp-studio-stage">
        <div className={`cp-compare${showing ? ' has-after' : ''}${busy ? ' is-busy' : ''}`} style={{ ['--split' as string]: `${split}%` }}>
          <img src={photo.src} alt={photo.sample ? 'The sample house before painting: faded yellow siding and peeling trim' : 'Your house as photographed'} className="cp-compare-before" />
          {showing && (
            <img src={showing.src} alt={`Preview: ${describeSelection(showing.selection)}`} className="cp-compare-after" />
          )}
          {showing && (
            <>
              <span className="cp-compare-tag is-before" aria-hidden="true">Before</span>
              <span className="cp-compare-tag is-after" aria-hidden="true">After</span>
              <span className="cp-compare-handle" aria-hidden="true"><span /></span>
              <input
                className="cp-compare-range"
                type="range"
                min={0}
                max={100}
                value={split}
                onChange={(event) => setSplit(Number(event.target.value))}
                aria-label="Compare before and after"
                aria-valuetext={`${split}% after`}
              />
            </>
          )}
          {busy && (
            <div className="cp-studio-busy" role="status">
              <span className="cp-roller" aria-hidden="true" />
              <p>Painting your preview…<small>Usually under a minute.</small></p>
            </div>
          )}
        </div>
        <div className="cp-studio-photo-actions">
          <button type="button" className="cp-button cp-button-ink" onClick={() => fileRef.current?.click()} disabled={busy || preparing}>
            {preparing ? 'Preparing photo…' : photo.sample ? 'Upload a photo of your house' : 'Choose a different photo'}
          </button>
          {!photo.sample && <button type="button" className="cp-link" onClick={backToSample} disabled={busy}>Back to the sample house</button>}
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={choosePhoto} />
          <p className="cp-studio-tip">Best results: the front of the house in daylight, straight on, from the street.</p>
        </div>
      </div>

      <div className="cp-studio-panel">
        {photo.sample && (
          <fieldset className="cp-looks">
            <legend>Sample looks</legend>
            <div className="cp-look-row">
              {SAMPLE_LOOKS.map((look) => {
                const active = selectionKey(look.selection) === key
                return (
                  <button key={look.name} type="button" className="cp-look" aria-pressed={active} onClick={() => choose(look.selection)}>
                    <span className="cp-look-chips" aria-hidden="true">
                      {[BODY_COLORS, TRIM_COLORS, DOOR_COLORS].map((list, index) => {
                        const id = [look.selection.body, look.selection.trim, look.selection.door][index]
                        const hex = list.find((color) => color.id === id)?.hex || BODY_COLORS.find((color) => color.id === look.selection.body)?.hex
                        return <span key={index} style={{ background: hex }} />
                      })}
                    </span>
                    {look.name}
                  </button>
                )
              })}
            </div>
          </fieldset>
        )}

        <Swatches label="Siding" colors={BODY_COLORS} value={selection.body} onChange={(body) => choose({ ...selection, body, customHex: undefined })}>
          <label className={`cp-swatch cp-swatch-custom${selection.body === 'custom' ? ' is-on' : ''}`} title="Any color">
            <input
              type="color"
              value={selection.customHex ?? '#7a8c6e'}
              onChange={(event) => choose({ ...selection, body: 'custom', customHex: event.target.value.toLowerCase() })}
              aria-label="Pick any siding color"
            />
            <span className="cp-swatch-chip" style={{ background: selection.customHex ?? undefined }} />
          </label>
        </Swatches>
        <Swatches label="Trim" colors={TRIM_COLORS} value={selection.trim} onChange={(trim) => choose({ ...selection, trim })} />
        <Swatches label="Front door" colors={DOOR_COLORS} value={selection.door} onChange={(door) => choose({ ...selection, door })} />

        <div className="cp-studio-go">
          {needsLive && live && (
            <>
              <div className="cp-quality" role="radiogroup" aria-label="Preview quality">
                {(['low', 'medium'] as const).map((value) => (
                  <label key={value} className={quality === value ? 'is-on' : ''}>
                    <input type="radio" name="cp-quality" value={value} checked={quality === value} onChange={() => setQuality(value)} />
                    {value === 'low' ? 'Quick sketch' : 'Detailed'}
                  </label>
                ))}
              </div>
              {!photo.sample && (
                <label className="cp-consent">
                  <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
                  <span>Send this photo to OpenAI to create the preview. It isn’t stored by this website.</span>
                </label>
              )}
              <button type="button" className="cp-button cp-button-ochre cp-studio-generate" onClick={generate} disabled={!canGenerate}>
                {busy ? 'Painting…' : 'Paint my preview'}
              </button>
            </>
          )}
          {needsLive && !live && availability.state !== 'checking' && (
            <p className="cp-studio-note">
              {availability.message} {photo.sample ? 'Pick one of the sample looks above to compare.' : ''}
            </p>
          )}
          {!needsLive && (
            <p className="cp-studio-note">
              {prepared ? 'A prepared preview of the sample house.' : 'Your preview is ready.'} Drag the line to compare before and after.
            </p>
          )}
          {error && <p className="cp-studio-error" role="alert">{error}</p>}
        </div>

        <div className="cp-studio-after">
          <button type="button" className="cp-button cp-button-line" onClick={() => onUseColors(describeSelection(selection))}>
            Use these colors in my estimate
          </button>
          {download && <a className="cp-link" href={download} download="complete-painting-preview.jpg">Download preview</a>}
        </div>
        <p className="cp-studio-fine">Previews are AI-generated to help compare ideas. Screens and daylight change how paint looks, so check real paint samples on the house before you choose.</p>
      </div>
    </div>
  )
}
