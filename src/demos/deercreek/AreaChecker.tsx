import { useId, useState, type FormEvent } from 'react'
import { AREA, locate, lookupArea, type Located, type Lookup } from './area'
import { business, href } from './content'
import { useHydrated } from './hooks'
import { ArrowIcon, PhoneIcon, PinIcon } from './Icons'

type Result = Lookup | { kind: 'geo-error'; message: string } | { kind: 'locating' }

const SCALE = 3.5 // px per mile
const CX = 260
const CY = 192
const COS = Math.cos((business.lat * Math.PI) / 180)
const project = (lat: number, lon: number) => {
  const x = CX + (lon - business.lon) * 69.17 * COS * SCALE
  const y = CY - (lat - business.lat) * 69.05 * SCALE
  return { x, y }
}

/** Landmarks on the schematic map: [name, lat, lon, label side]. */
const TOWNS: Array<[string, number, number, 'l' | 'r' | 'u']> = [
  ['Overland Park', 38.889, -94.691, 'r'], ['Lenexa', 38.965, -94.804, 'l'],
  ['Kansas City, KS', 39.123, -94.742, 'l'], ['Kansas City, MO', 39.125, -94.55, 'u'], ['Lee’s Summit', 38.922, -94.385, 'r'],
  ['Independence', 39.086, -94.352, 'r'], ['Lawrence', 38.96, -95.266, 'l'], ['Gardner', 38.809, -94.923, 'l'],
  ['Spring Hill', 38.757, -94.821, 'l'], ['Paola', 38.579, -94.86, 'l'], ['Louisburg', 38.621, -94.677, 'r'],
  ['Belton', 38.819, -94.53, 'r'], ['Liberty', 39.241, -94.419, 'r'], ['Leavenworth', 39.323, -94.925, 'l'], ['Ottawa', 38.6, -95.263, 'l'],
]

export function AreaMap({ point }: { point?: Located }) {
  const titleId = useId()
  const glowId = `glow${titleId.replace(/[^a-zA-Z0-9]/g, '')}`
  const pin = point ? project(point.lat, point.lon) : null
  const clamped = pin && Math.hypot(pin.x - CX, pin.y - CY) > 180
    ? { x: CX + ((pin.x - CX) / Math.hypot(pin.x - CX, pin.y - CY)) * 180, y: CY + ((pin.y - CY) / Math.hypot(pin.x - CX, pin.y - CY)) * 180 }
    : pin
  const stateTop = project(39.115, -94.6077)
  const stateBottom = project(38.33, -94.6077)
  return (
    <svg className="dc-area-map" viewBox="0 0 520 384" role="img" aria-labelledby={titleId}>
      <title id={titleId}>{`Schematic map of the Kansas City metro centered on Deer Creek’s Olathe shop, with rings ${AREA.coreMiles} and ${AREA.edgeMiles} miles out.${point ? ` A pin marks ${point.label}, about ${Math.round(point.miles)} miles away.` : ''}`}</title>
      <defs>
        <radialGradient id={glowId}>
          <stop offset="0" stopColor="currentColor" stopOpacity="0.16" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx={CX} cy={CY} r={AREA.edgeMiles * SCALE} className="dc-ring dc-ring-edge" />
      <circle cx={CX} cy={CY} r={AREA.coreMiles * SCALE} className="dc-ring dc-ring-core" />
      <circle cx={CX} cy={CY} r={AREA.coreMiles * SCALE} fill={`url(#${glowId})`} className="dc-ring-fill" />
      <line x1={stateTop.x} y1={stateTop.y} x2={stateBottom.x} y2={stateBottom.y} className="dc-stateline" />
      <text x={stateBottom.x - 8} y={stateBottom.y - 4} className="dc-map-state" textAnchor="end">KS</text>
      <text x={stateBottom.x + 8} y={stateBottom.y - 4} className="dc-map-state">MO</text>
      <text x={CX} y={CY - AREA.coreMiles * SCALE + 14} className="dc-map-ring-label" textAnchor="middle">{AREA.coreMiles} mi</text>
      <text x={CX} y={CY - AREA.edgeMiles * SCALE + 14} className="dc-map-ring-label" textAnchor="middle">{AREA.edgeMiles} mi</text>
      {TOWNS.map(([name, lat, lon, side]) => {
        const { x, y } = project(lat, lon)
        return (
          <g key={name} className="dc-town">
            <circle cx={x} cy={y} r="2.6" />
            <text x={side === 'r' ? x + 6 : side === 'l' ? x - 6 : x} y={side === 'u' ? y - 7 : y + 4} textAnchor={side === 'r' ? 'start' : side === 'l' ? 'end' : 'middle'}>{name}</text>
          </g>
        )
      })}
      <g className="dc-shop">
        <circle cx={CX} cy={CY} r="9" className="dc-shop-pulse" />
        <circle cx={CX} cy={CY} r="6" />
        <text x={CX + 10} y={CY + 18}>Olathe shop</text>
      </g>
      {clamped && point && (
        <g key={`${point.lat},${point.lon}`} className="dc-pin" data-band={point.band} transform={`translate(${clamped.x} ${clamped.y})`}>
          <path d="M0 0c-6-8-10-12.5-10-18a10 10 0 0 1 20 0c0 5.5-4 10-10 18Z" />
          <circle cx="0" cy="-18" r="3.6" className="dc-pin-dot" />
        </g>
      )}
    </svg>
  )
}

function Outcome({ result, onChoose }: { result: Result; onChoose: (place: Located) => void }) {
  switch (result.kind) {
    case 'empty':
      return <p className="dc-area-hint">Try your ZIP code, or a town like Lenexa, Paola or Lee’s Summit.</p>
    case 'locating':
      return <p className="dc-area-hint">Finding your location…</p>
    case 'geo-error':
      return <p className="dc-area-hint">{result.message}</p>
    case 'unknown-zip':
      return <div className="dc-area-outcome" data-band="outside"><p className="dc-area-verdict">We couldn’t place ZIP {result.zip} near Kansas City.</p><p>If it’s in the metro, call <a href={business.phoneHref}>{business.phone}</a> and we’ll check.</p></div>
    case 'not-found':
      return <div className="dc-area-outcome" data-band="outside"><p className="dc-area-verdict">We couldn’t find “{result.query}”.</p><p>Try a 5-digit ZIP code, or a town name like Overland Park or Belton.</p></div>
    case 'choose':
      return (
        <div className="dc-area-outcome">
          <p className="dc-area-verdict">Which one do you mean?</p>
          <ul className="dc-area-choices">{result.options.map(option => <li key={option.label}><button type="button" className="dc-chip" onClick={() => onChoose(option)}>{option.label}</button></li>)}</ul>
        </div>
      )
    case 'found': {
      const miles = Math.max(1, Math.round(result.miles))
      if (result.band === 'core') return (
        <div className="dc-area-outcome" data-band="core">
          <p className="dc-area-verdict">Yes. {result.label} is in our service area.</p>
          <p>About {miles} {miles === 1 ? 'mile' : 'miles'} from our Olathe shop.</p>
          <a className="dc-button" href={`${href('schedule')}${/^ZIP \d{5}$/.test(result.label) ? `?zip=${result.label.slice(4)}` : ''}`}>Book a visit <ArrowIcon /></a>
        </div>
      )
      if (result.band === 'edge') return (
        <div className="dc-area-outcome" data-band="edge">
          <p className="dc-area-verdict">{result.label} is at the edge of our area.</p>
          <p>About {miles} miles from Olathe. Call and we’ll tell you straight whether we can get there.</p>
          <a className="dc-button dc-button-quiet" href={business.phoneHref}><PhoneIcon /> {business.phone}</a>
        </div>
      )
      return (
        <div className="dc-area-outcome" data-band="outside">
          <p className="dc-area-verdict">{result.label} is outside the area we usually serve.</p>
          <p>It’s about {miles} miles from our Olathe shop. You’re welcome to call and ask.</p>
        </div>
      )
    }
  }
}

export default function AreaChecker({ headingLevel = 3 }: { headingLevel?: 2 | 3 }) {
  const id = useId()
  const [query, setQuery] = useState('')
  const [result, setResult] = useState<Result>({ kind: 'empty' })
  const canLocate = useHydrated() && 'geolocation' in navigator
  const Heading = headingLevel === 2 ? 'h2' : 'h3'

  function submit(event: FormEvent) {
    event.preventDefault()
    setResult(lookupArea(query))
  }

  function useLocation() {
    setResult({ kind: 'locating' })
    navigator.geolocation.getCurrentPosition(
      position => setResult(locate('Your location', position.coords.latitude, position.coords.longitude)),
      () => setResult({ kind: 'geo-error', message: 'We couldn’t get your location. Type your ZIP code instead.' }),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 600_000 },
    )
  }

  const point = result.kind === 'found' ? result : undefined
  return (
    <div className="dc-area">
      <div className="dc-area-panel">
        <Heading className="dc-area-title" id={`${id}-title`}><PinIcon size={24} /> Check your address</Heading>
        <form className="dc-area-form" onSubmit={submit} aria-labelledby={`${id}-title`}>
          <label htmlFor={`${id}-q`}>ZIP code or town</label>
          <div className="dc-area-row">
            <input id={`${id}-q`} type="text" inputMode="text" autoComplete="postal-code" value={query} onChange={event => setQuery(event.target.value)} placeholder="e.g. 66062 or Lenexa" />
            <button type="submit" className="dc-button">Check</button>
          </div>
          {canLocate && <button type="button" className="dc-link-button" onClick={useLocation}>Use my location instead</button>}
          <p className="dc-area-privacy">Your location is checked on this page and never leaves your device.</p>
        </form>
        <div className="dc-area-result" role="status" aria-live="polite">
          <Outcome result={result} onChoose={place => setResult(place)} />
        </div>
      </div>
      <figure className="dc-area-figure">
        <AreaMap point={point} />
        <figcaption>Distances are straight-line miles from our shop in south Olathe.</figcaption>
      </figure>
    </div>
  )
}
