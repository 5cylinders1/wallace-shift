import { useEffect, useId, useMemo, useState, type FormEvent } from 'react'
import { addToBrief } from '../brief'
import { href, navigate, onLink } from '../routes'
import { TierBadge } from '../sections/CrackDecoder'
import { symptomBySlug, symptoms } from '../symptoms'

/**
 * A crack log kept in this browser only. Readings are widths from a
 * crack-card style scale, dated, with an optional downscaled photo.
 */

interface Reading { id: string; date: string; widthMm: number; note: string; photo?: string }
interface Crack { id: string; name: string; symptom?: string; readings: Reading[] }

const KEY = 'datum-crack-log-v1'
const WIDTHS = [
  { label: 'Hairline', mm: 0.3 }, { label: '1/32 in.', mm: 0.8 }, { label: '1/16 in.', mm: 1.6 }, { label: '1/8 in.', mm: 3.2 },
  { label: '3/16 in.', mm: 4.8 }, { label: '1/4 in.', mm: 6.4 }, { label: 'Wider', mm: 8 },
]
const widthLabel = (mm: number) => WIDTHS.reduce((best, item) => (Math.abs(item.mm - mm) < Math.abs(best.mm - mm) ? item : best)).label
const FRACTIONS: [number, string][] = [[0.4, '1/64'], [0.8, '1/32'], [1.6, '1/16'], [2.4, '3/32'], [3.2, '1/8'], [4.8, '3/16'], [6.4, '1/4']]
const fraction = (mm: number) => FRACTIONS.reduce((best, item) => (Math.abs(item[0] - mm) < Math.abs(best[0] - mm) ? item : best))[1]
const uid = () => Math.random().toString(36).slice(2, 10)
const today = () => new Date().toISOString().slice(0, 10)
const days = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000)
const pretty = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

function load(): Crack[] {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) ?? '[]') as Crack[]
    return Array.isArray(value) ? value : []
  } catch { return [] }
}

function example(): Crack {
  const base = new Date()
  const ago = (weeks: number) => new Date(base.getTime() - weeks * 7 * 86_400_000).toISOString().slice(0, 10)
  return {
    id: uid(), name: 'Rear wall, by the water heater (example)', symptom: 'stair-step-crack',
    readings: [
      { id: uid(), date: ago(24), widthMm: 0.8, note: 'First noticed. Pencil marks at both ends.' },
      { id: uid(), date: ago(20), widthMm: 0.8, note: '' },
      { id: uid(), date: ago(16), widthMm: 0.8, note: 'After heavy rain. No water.' },
      { id: uid(), date: ago(11), widthMm: 1.6, note: 'Past the lower pencil mark.' },
      { id: uid(), date: ago(7), widthMm: 1.6, note: '' },
      { id: uid(), date: ago(2), widthMm: 2.4, note: 'Door upstairs now sticks.' },
    ],
  }
}

function trend(readings: Reading[]): { tier: 'watch' | 'look'; label: string; line: string } {
  const sorted = [...readings].sort((a, b) => a.date.localeCompare(b.date))
  if (sorted.length < 2) return { tier: 'watch', label: 'Too early to tell', line: 'Add another reading in a few weeks to see whether it is changing.' }
  const first = sorted[0], last = sorted[sorted.length - 1]
  const growth = last.widthMm - first.widthMm
  const span = days(first.date, last.date)
  if (growth >= 0.5) return { tier: 'look', label: 'Growing', line: `Wider by about ${fraction(growth)} in. (${growth.toFixed(1)} mm) since ${pretty(first.date)}. Growth is the main warning sign: book an inspection.` }
  if (span < 28) return { tier: 'watch', label: 'Too early to tell', line: 'Readings so far span less than four weeks. Keep checking monthly.' }
  return { tier: 'watch', label: 'Stable so far', line: `No measurable change over ${Math.round(span / 7)} weeks. Keep checking, especially after long wet or dry spells.` }
}

function Chart({ readings }: { readings: Reading[] }) {
  const sorted = [...readings].sort((a, b) => a.date.localeCompare(b.date))
  if (!sorted.length) return null
  const span = Math.max(14, days(sorted[0].date, sorted[sorted.length - 1].date))
  const top = Math.max(3.2, ...sorted.map(item => item.widthMm)) * 1.15
  const x = (date: string) => 64 + (days(sorted[0].date, date) / span) * 544
  const y = (mm: number) => 180 - (mm / top) * 150
  const ticks = WIDTHS.filter(item => item.mm <= top && item.mm >= 0.8)
  return <svg className="dt-log-chart" viewBox="0 0 640 214" role="img" aria-label={`Crack width over ${Math.round(span / 7)} weeks, from ${widthLabel(sorted[0].widthMm)} to ${widthLabel(sorted[sorted.length - 1].widthMm)}`}>
    <g fontFamily="var(--dt-mono)" fontSize="10.5" fill="var(--dt-ink-2)">
      {ticks.map(tick => <g key={tick.label}><line x1="64" x2="612" y1={y(tick.mm)} y2={y(tick.mm)} stroke="var(--dt-rule)" /><text x="56" y={y(tick.mm) + 3.5} textAnchor="end">{tick.label}</text></g>)}
      <text x="64" y="204">{pretty(sorted[0].date)}</text>
      <text x="606" y="204" textAnchor="end">{pretty(sorted[sorted.length - 1].date)}</text>
    </g>
    <polyline fill="none" stroke="var(--dt-stress)" strokeWidth="2.5" points={sorted.map(item => `${x(item.date)},${y(item.widthMm)}`).join(' ')} />
    {sorted.map(item => <circle key={item.id} cx={x(item.date)} cy={y(item.widthMm)} r="5" fill="var(--dt-paper)" stroke="var(--dt-stress)" strokeWidth="2.2" />)}
  </svg>
}

async function shrink(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, 480 / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return canvas.toDataURL('image/jpeg', 0.72)
}

export default function CrackLogPage() {
  const id = useId()
  const initialSymptom = useMemo(() => new URLSearchParams(window.location.search).get('crack') ?? '', [])
  const [cracks, setCracks] = useState<Crack[]>(load)
  const [selected, setSelected] = useState<string | null>(() => load()[0]?.id ?? null)
  const [newName, setNewName] = useState(() => symptomBySlug(initialSymptom)?.short ?? '')
  const [newSymptom, setNewSymptom] = useState(initialSymptom)
  const [date, setDate] = useState(today)
  const [width, setWidth] = useState<number | null>(null)
  const [note, setNote] = useState('')
  const [photo, setPhoto] = useState<string | undefined>()
  const [message, setMessage] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => { document.title = 'Crack log: measure a foundation crack over time | Datum Foundation & Waterproofing' }, [])

  const save = (next: Crack[]) => {
    setCracks(next)
    try { localStorage.setItem(KEY, JSON.stringify(next)); setMessage('') }
    catch { setMessage('This browser is out of space for the log. Remove a photo or two and try again.') }
  }
  const crack = cracks.find(item => item.id === selected) ?? null
  const status = crack ? trend(crack.readings) : null

  const addCrack = (event: FormEvent) => {
    event.preventDefault()
    if (!newName.trim()) { setMessage('Give the crack a name, such as “East wall, by the window”.'); return }
    const next: Crack = { id: uid(), name: newName.trim(), symptom: newSymptom || undefined, readings: [] }
    save([...cracks, next])
    setSelected(next.id)
    setNewName('')
  }
  const addReading = (event: FormEvent) => {
    event.preventDefault()
    if (!crack) return
    if (width === null) { setMessage('Choose the width at the widest point.'); return }
    const reading: Reading = { id: uid(), date, widthMm: width, note: note.trim(), photo }
    save(cracks.map(item => (item.id === crack.id ? { ...item, readings: [...item.readings, reading] } : item)))
    setWidth(null); setNote(''); setPhoto(undefined)
  }
  const removeReading = (reading: Reading) => crack && save(cracks.map(item => (item.id === crack.id ? { ...item, readings: item.readings.filter(r => r.id !== reading.id) } : item)))
  const removeCrack = () => {
    if (!crack) return
    const next = cracks.filter(item => item.id !== crack.id)
    save(next)
    setSelected(next[0]?.id ?? null)
    setConfirmDelete(false)
  }
  const loadExample = () => { const sample = example(); save([...cracks, sample]); setSelected(sample.id) }
  const attach = () => {
    if (!crack || !status) return
    const last = [...crack.readings].sort((a, b) => a.date.localeCompare(b.date)).at(-1)
    addToBrief({ symptoms: crack.symptom ? [crack.symptom] : [], source: 'Crack log', note: `${crack.name}: ${crack.readings.length} readings, ${status.label.toLowerCase()}${last ? `, ${widthLabel(last.widthMm)} on ${pretty(last.date)}` : ''}` })
    navigate(href.home('#request'))
  }

  return <main id="main" className="dt-page dt-log">
    <div className="dt-wrap">
      <nav className="dt-crumbs" aria-label="Breadcrumb"><a href={href.home()} onClick={onLink}>Home</a><span aria-hidden="true">/</span><span aria-current="page">Crack log</span></nav>
      <header className="dt-page-head">
        <p className="dt-eyebrow">Crack log</p>
        <h1>Measure it. Then you’ll know.</h1>
        <p className="dt-lede">Log the width of a crack every few weeks. If it grows, you’ll see it here, and you can attach the whole history to an inspection request.</p>
        <p className="dt-privacy">Saved only in this browser. Nothing is uploaded.</p>
      </header>

      <div className="dt-log-grid">
        <aside className="dt-log-side" aria-label="Your cracks">
          <h2 className="dt-label">Your cracks</h2>
          {cracks.length > 0 && <ul className="dt-log-list">{cracks.map(item => {
            const t = trend(item.readings)
            return <li key={item.id}><button type="button" aria-pressed={item.id === selected} onClick={() => { setSelected(item.id); setConfirmDelete(false) }}>
              <span>{item.name}</span><span className="dt-mono">{item.readings.length} reading{item.readings.length === 1 ? '' : 's'} · {t.label}</span>
            </button></li>
          })}</ul>}
          <form className="dt-log-new" onSubmit={addCrack}>
            <label htmlFor={`${id}-name`}>Add a crack</label>
            <input id={`${id}-name`} value={newName} onChange={event => setNewName(event.target.value)} placeholder="East wall, by the window" />
            <label htmlFor={`${id}-kind`}>What it looks like <span>(optional)</span></label>
            <select id={`${id}-kind`} value={newSymptom} onChange={event => setNewSymptom(event.target.value)}>
              <option value="">Not sure</option>
              {symptoms.filter(item => item.measurable).map(item => <option key={item.slug} value={item.slug}>{item.short}</option>)}
            </select>
            <button type="submit" className="dt-button dt-button-ink dt-button-small">Add crack</button>
          </form>
          {cracks.length === 0 && <button type="button" className="dt-text-button" onClick={loadExample}>Or load an example log →</button>}
          <div className="dt-how">
            <h2 className="dt-label">How to measure</h2>
            <ol>
              <li>Mark both ends of the crack with a pencil and the date.</li>
              <li>Measure the widest point with a crack card or ruler.</li>
              <li>Photograph the same spot each time, with a coin or ruler for scale.</li>
              <li>Check monthly, and after long wet or dry spells.</li>
            </ol>
          </div>
        </aside>

        <section className="dt-log-main" aria-live="polite">
          {message && <p className="dt-error" role="alert">{message}</p>}
          {!crack ? <div className="dt-log-empty">
            <p>Add a crack to start, or load the example to see how a growing crack looks over six months.</p>
            <button type="button" className="dt-button dt-button-line" onClick={loadExample}>Load an example log</button>
          </div> : <>
            <div className="dt-log-head">
              <div>
                <h2>{crack.name}</h2>
                {crack.symptom && <a className="dt-text-link" href={href.crack(crack.symptom)} onClick={onLink}>{symptomBySlug(crack.symptom)?.short} guide →</a>}
              </div>
              {status && <div className="dt-log-status"><TierBadge tier={status.tier} /><strong>{status.label}</strong></div>}
            </div>
            {status && <p className="dt-log-line">{status.line}</p>}
            {crack.readings.length > 0 && <Chart readings={crack.readings} />}

            <form className="dt-reading" onSubmit={addReading}>
              <h3>Add a reading</h3>
              <div className="dt-reading-row">
                <div><label htmlFor={`${id}-date`}>Date</label><input id={`${id}-date`} type="date" value={date} max={today()} onChange={event => setDate(event.target.value)} /></div>
                <div className="dt-reading-photo"><label htmlFor={`${id}-photo`}>Photo <span>(optional)</span></label><input id={`${id}-photo`} type="file" accept="image/*" onChange={async event => { const file = event.target.files?.[0]; if (file) setPhoto(await shrink(file)); event.target.value = '' }} />{photo && <img src={photo} alt="Selected" />}</div>
              </div>
              <p className="dt-label" id={`${id}-width`}>Width at the widest point</p>
              <div className="dt-widths" role="group" aria-labelledby={`${id}-width`}>
                {WIDTHS.map(item => <button key={item.label} type="button" aria-pressed={width === item.mm} onClick={() => setWidth(item.mm)}>{item.label}</button>)}
              </div>
              <label htmlFor={`${id}-note`}>Note <span>(optional)</span></label>
              <input id={`${id}-note`} value={note} onChange={event => setNote(event.target.value)} placeholder="After heavy rain, past the pencil mark…" />
              <button type="submit" className="dt-button dt-button-ink dt-button-small">Save reading</button>
            </form>

            {crack.readings.length > 0 && <table className="dt-readings">
              <caption className="dt-visually-hidden">Readings for {crack.name}</caption>
              <thead><tr><th scope="col">Date</th><th scope="col">Width</th><th scope="col">Note</th><th scope="col"><span className="dt-visually-hidden">Photo and actions</span></th></tr></thead>
              <tbody>{[...crack.readings].sort((a, b) => b.date.localeCompare(a.date)).map(reading => <tr key={reading.id}>
                <td>{pretty(reading.date)}</td>
                <td className="dt-mono">{widthLabel(reading.widthMm)}</td>
                <td>{reading.note || '—'}</td>
                <td className="dt-reading-actions">{reading.photo && <img src={reading.photo} alt={`Crack on ${pretty(reading.date)}`} />}<button type="button" className="dt-text-button" onClick={() => removeReading(reading)} aria-label={`Remove reading from ${pretty(reading.date)}`}>Remove</button></td>
              </tr>)}</tbody>
            </table>}

            <div className="dt-log-actions">
              <button type="button" className="dt-button dt-button-ink" onClick={attach}>Attach to an inspection request</button>
              <button type="button" className="dt-button dt-button-line" onClick={() => window.print()}>Print or save as PDF</button>
              {confirmDelete
                ? <span className="dt-confirm">Delete this crack and its readings? <button type="button" className="dt-text-button is-danger" onClick={removeCrack}>Delete</button> <button type="button" className="dt-text-button" onClick={() => setConfirmDelete(false)}>Keep</button></span>
                : <button type="button" className="dt-text-button" onClick={() => setConfirmDelete(true)}>Delete crack</button>}
            </div>
          </>}
        </section>
      </div>
    </div>
  </main>
}
