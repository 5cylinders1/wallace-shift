import { useId, useMemo, useState, type CSSProperties } from 'react'
import type { Brief } from './Booking'

type Material = 'asphalt' | 'metal' | 'tile' | 'wood'
type Last = 'never' | 'recent' | 'few' | 'long'

const materials: { id: Material; label: string; life: number }[] = [
  { id: 'asphalt', label: 'Asphalt shingle', life: 27 },
  { id: 'metal', label: 'Metal', life: 50 },
  { id: 'tile', label: 'Tile or slate', life: 70 },
  { id: 'wood', label: 'Wood shake', life: 30 },
]

const inspections: { id: Last; label: string; adjust: number }[] = [
  { id: 'recent', label: 'Within 2 years', adjust: 4 },
  { id: 'few', label: '3 to 5 years', adjust: 0 },
  { id: 'long', label: 'Over 5 years', adjust: -5 },
  { id: 'never', label: 'Never / not sure', adjust: -7 },
]

const signs = [
  { id: 'granules', label: 'Granules in the gutters', weight: 8 },
  { id: 'curling', label: 'Curled or cracked shingles', weight: 12 },
  { id: 'missing', label: 'Missing shingles', weight: 14 },
  { id: 'moss', label: 'Moss or dark streaks', weight: 5 },
  { id: 'stains', label: 'Ceiling or attic stains', weight: 20 },
  { id: 'daylight', label: 'Daylight through the attic boards', weight: 24 },
  { id: 'sag', label: 'A sagging roofline', weight: 30 },
]

/** A rough outlook from age, finish and warning signs. A guide, not a diagnosis. */
function outlook(age: number, material: Material, last: Last, checked: Set<string>) {
  const life = materials.find(item => item.id === material)!.life
  let score = 100 * Math.max(0, 1 - age / (life * 1.08))
  score += inspections.find(item => item.id === last)!.adjust
  for (const sign of signs) if (checked.has(sign.id)) score -= sign.weight
  score = Math.round(Math.max(3, Math.min(98, score)))
  const serious = checked.has('sag') || checked.has('daylight') || checked.has('stains')
  if (serious || score < 30) return { score, band: 'replace' as const, title: 'Time to plan for a new roof', text: 'The signs point beyond tune-up territory. An inspection tells you how urgent it is and what can wait, with photos, so you can plan instead of react.', service: 'replace' as const }
  if (score < 62) return { score, band: 'repair' as const, title: 'Repairs now, replacement on the horizon', text: 'Targeted repairs and a tune-up can buy meaningful time. We’ll show you which fixes matter and roughly how many seasons you have left.', service: 'tuneup' as const }
  return { score, band: 'tune' as const, title: 'Healthy. Keep it that way.', text: 'A tune-up every couple of years and after big storms keeps small problems small and protects the warranty you already paid for.', service: 'tuneup' as const }
}

export default function HealthCheck({ onBrief }: { onBrief: (brief: Brief) => void }) {
  const [age, setAge] = useState(14)
  const [material, setMaterial] = useState<Material>('asphalt')
  const [last, setLast] = useState<Last>('long')
  const [checked, setChecked] = useState<Set<string>>(() => new Set(['granules']))
  const ageId = useId()
  const result = useMemo(() => outlook(age, material, last, checked), [age, material, last, checked])
  const angle = -120 + (result.score / 100) * 240

  const toggle = (id: string) => setChecked(previous => {
    const next = new Set(previous)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  })

  const send = () => {
    const seen = signs.filter(sign => checked.has(sign.id)).map(sign => sign.label.toLowerCase()).join(', ') || 'no warning signs'
    onBrief({ service: result.service, source: 'Roof health check', notes: `Health check: ${age}-year-old ${materials.find(item => item.id === material)!.label.toLowerCase()} roof, last inspected ${inspections.find(item => item.id === last)!.label.toLowerCase()}; noticed ${seen}. Outlook ${result.score}/100.` })
  }

  return <section id="health" className="st-health st-opaque" aria-labelledby="st-health-title">
    <div className="st-wrap">
      <div className="st-section-head">
        <p className="st-kicker"><span>04</span>Roof health check</p>
        <h2 id="st-health-title">How much life is left <em>up there?</em></h2>
        <p className="st-lede">Answer four questions for an honest outlook and the visit that fits it. A guide, not a diagnosis.</p>
      </div>
      <div className="st-health-grid">
        <form className="st-health-form" onSubmit={event => event.preventDefault()}>
          <div className="st-field">
            <label htmlFor={ageId}>How old is the roof? <output htmlFor={ageId}>{age} {age === 1 ? 'year' : 'years'}</output></label>
            <input id={ageId} type="range" min={0} max={40} value={age} onChange={event => setAge(Number(event.target.value))} style={{ '--fill': `${(age / 40) * 100}%` } as CSSProperties} />
            <div className="st-range-scale" aria-hidden="true"><span>New</span><span>20</span><span>40 yrs</span></div>
          </div>
          <fieldset className="st-field">
            <legend>What is it made of?</legend>
            <div className="st-segmented">
              {materials.map(item => <label key={item.id}><input type="radio" name="st-health-material" checked={material === item.id} onChange={() => setMaterial(item.id)} /><span>{item.label}</span></label>)}
            </div>
          </fieldset>
          <fieldset className="st-field">
            <legend>Last professional inspection</legend>
            <div className="st-segmented">
              {inspections.map(item => <label key={item.id}><input type="radio" name="st-health-last" checked={last === item.id} onChange={() => setLast(item.id)} /><span>{item.label}</span></label>)}
            </div>
          </fieldset>
          <fieldset className="st-field">
            <legend>Anything you’ve noticed?</legend>
            <div className="st-checks">
              {signs.map(sign => <label key={sign.id} className="st-check"><input type="checkbox" checked={checked.has(sign.id)} onChange={() => toggle(sign.id)} /><span>{sign.label}</span></label>)}
            </div>
          </fieldset>
        </form>
        <div className={`st-gauge-card is-${result.band}`} aria-live="polite">
          <div className="st-gauge" role="img" aria-label={`Outlook ${result.score} out of 100`}>
            <svg viewBox="0 0 200 150" aria-hidden="true">
              <path className="st-gauge-track" d="M30.7 140A80 80 0 1 1 169.3 140" />
              <path className="st-gauge-fill" d="M30.7 140A80 80 0 1 1 169.3 140" pathLength={100} style={{ strokeDasharray: `${result.score} 100` }} />
              <g style={{ transform: `rotate(${angle}deg)`, transformOrigin: '100px 100px' }} className="st-gauge-needle"><line x1="100" y1="100" x2="100" y2="36" /><circle cx="100" cy="100" r="5" /></g>
            </svg>
            <p><strong>{result.score}</strong><span>/ 100 outlook</span></p>
          </div>
          <h3>{result.title}</h3>
          <p>{result.text}</p>
          <button type="button" className="st-button st-button-dark st-button-wide" onClick={send}>{result.band === 'replace' ? 'Book an inspection' : 'Book a tune-up'} <span aria-hidden="true">→</span></button>
          <p className="st-fine">Typical service lives vary with climate, ventilation and installation. Only an inspection can tell you what your roof needs.</p>
        </div>
      </div>
    </div>
  </section>
}
