import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type FormEvent } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { financing, roofTool } from '../content'
import type { LeadContext, LeadRoof } from '../lead'
import {
  OPTIONS,
  footprintFromHome,
  money,
  monthlyPayment,
  quoteRoof,
  shapeFromCorners,
  type Layers,
  type Material,
  type Shape,
  type Stories,
} from '../pricing'
import { Segmented } from '../components/Segmented'
import { AddressCombobox } from './AddressCombobox'
import { Credits } from './Credits'
import { PitchPicker } from './PitchPicker'
import { PITCH_DEFAULT, bandFor, pitchFactor } from './pitch'
import { lookupRoof, type LookupTarget } from './roofClient'
import { RoofStage, type StageMode } from './RoofStage'
import type { RoofAddress, RoofErrorCode, RoofLookup } from './types'
import sampleLookupJson from './sampleLookup.json'
import './RoofTool.css'

const SAMPLE = sampleLookupJson as unknown as RoofLookup
const LONG_PLAN = financing.plans[2]

interface RoofToolProps {
  onEstimate: (estimate: LeadContext['ballpark']) => void
  onAddress: (address: RoofAddress | null) => void
}

type Phase = StageMode

/** Within this of the address point, the nearest outline is taken to be the house. */
const PRESELECT_M = 15

const likelyHome = (result: RoofLookup) => {
  const nearest = result.buildings[0]
  return nearest && nearest.distanceM <= PRESELECT_M && result.precision !== 'street' ? nearest : null
}

/**
 * The roof estimator: find the house, set the pitch, see the price.
 *
 * Area comes from the building's outline in public footprint data (or from
 * home size, with no address); the homeowner supplies the pitch on the
 * drawing; `quoteRoof` turns the two into a price. Every number on screen
 * updates as the ridge is dragged.
 */
export function RoofTool({ onEstimate, onAddress }: RoofToolProps) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [address, setAddress] = useState('')
  const [lookup, setLookup] = useState<RoofLookup | null>(null)
  const [error, setError] = useState<RoofErrorCode | null>(null)
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set())
  const [pitch, setPitch] = useState(PITCH_DEFAULT)
  const [material, setMaterial] = useState<Material>('architectural')
  const [layers, setLayers] = useState<Layers>('1')
  const [shape, setShape] = useState<Shape | null>(null)
  const [homeSqft, setHomeSqft] = useState(2000)
  const [stories, setStories] = useState<Stories>('1.5')
  const [locatingStep, setLocatingStep] = useState(0)
  const requestRef = useRef<AbortController | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const helpId = useId()
  const pitchHelpId = useId()
  const sizeId = useId()

  useEffect(() => () => requestRef.current?.abort(), [])

  // The loading copy walks through the real stages while the request runs.
  useEffect(() => {
    if (phase !== 'locating') return
    const timer = window.setInterval(() => setLocatingStep((step) => Math.min(step + 1, roofTool.locating.length - 1)), 900)
    return () => window.clearInterval(timer)
  }, [phase])

  const showLookup = (result: RoofLookup) => {
    setLookup(result)
    // A street-level point can sit nearer a neighbour; then the homeowner picks.
    const home = likelyHome(result)
    setSelected(new Set(home ? [home.id] : []))
    setShape(null)
    setError(null)
    setPhase('found')
    onAddress(result.source === 'sample' ? null : result.address)
  }

  const find = async (target: LookupTarget) => {
    requestRef.current?.abort()
    const controller = new AbortController()
    requestRef.current = controller
    setLocatingStep(0)
    setPhase('locating')
    setError(null)
    try {
      const result = await lookupRoof(target, controller.signal)
      if (controller.signal.aborted) return
      if (!result.ok) {
        setError(result.error)
        setPhase('error')
        return
      }
      if (!result.buildings.length) {
        setError('no_footprint')
        setPhase('error')
        return
      }
      showLookup(result)
    } catch {
      // Superseded by a newer search.
    }
  }

  const onSubmit = (event?: FormEvent) => {
    event?.preventDefault()
    const text = address.trim()
    if (text.length < 6) {
      setError('invalid')
      setPhase('error')
      return
    }
    void find({ kind: 'address', address: text })
  }

  const useSample = () => {
    requestRef.current?.abort()
    showLookup(SAMPLE)
  }

  const useManual = () => {
    requestRef.current?.abort()
    setLookup(null)
    setError(null)
    setPhase('manual')
    onAddress(null)
  }

  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  /* ---------------------------------------------------------------- */
  /* Numbers                                                            */
  /* ---------------------------------------------------------------- */

  const chosen = useMemo(() => (lookup ? lookup.buildings.filter((b) => selected.has(b.id)) : []), [lookup, selected])
  const footprint =
    phase === 'found' ? chosen.reduce((sum, b) => sum + b.areaSqFt, 0) : phase === 'manual' ? Math.round(footprintFromHome(homeSqft, stories)) : 0
  const corners = chosen.length ? Math.max(...chosen.map((b) => b.corners)) : 8
  const suggestedShape = phase === 'manual' ? 'average' : shapeFromCorners(corners)
  const activeShape = shape ?? suggestedShape
  const ready = footprint > 0
  const quote = useMemo(
    () => (ready ? quoteRoof({ footprintSqFt: footprint, pitch, material, layers, shape: activeShape }) : null),
    [ready, footprint, pitch, material, layers, activeShape],
  )
  const monthly = quote ? monthlyPayment((quote.low + quote.high) / 2, LONG_PLAN) : 0
  const buildingCount = phase === 'found' ? chosen.length : 1

  const estimate = useMemo<LeadContext['ballpark']>(() => {
    if (!quote) return null
    const source: LeadRoof['source'] = phase === 'manual' ? 'home-size' : lookup?.source === 'sample' ? 'sample' : 'outline'
    const materialLabel = OPTIONS.material.find((option) => option.value === material)?.label.toLowerCase() ?? material
    const basis = source === 'home-size' ? `${homeSqft.toLocaleString('en-US')} sq ft home` : `${footprint.toLocaleString('en-US')} sq ft outline`
    return {
      low: quote.low,
      high: quote.high,
      summary: `${basis}, ${pitch}/12 pitch, ${quote.squares} squares, ${materialLabel}, ${layers === '2' ? 'two layers' : 'one layer'}`,
      roof: {
        source,
        address: source === 'outline' ? (lookup?.address.formatted ?? null) : null,
        footprintSqFt: footprint,
        roofSqFt: quote.roofSqFt,
        squares: quote.squares,
        pitch,
        buildings: buildingCount,
      },
    }
  }, [quote, phase, lookup, material, homeSqft, footprint, pitch, layers, buildingCount])

  useEffect(() => onEstimate(estimate), [estimate, onEstimate])

  /* ---------------------------------------------------------------- */
  /* Motion: reveal steps two and three when they unlock                */
  /* ---------------------------------------------------------------- */

  useGSAP(
    () => {
      if (!ready) return
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.from('[data-unlock]', { autoAlpha: 0, y: 18, duration: 0.6, ease: 'power2.out', stagger: 0.12, clearProps: 'all' })
      })
      return () => mm.revert()
    },
    { scope: rootRef, dependencies: [ready] },
  )

  const status =
    phase === 'locating'
      ? `${roofTool.locating[locatingStep]}…`
      : phase === 'error'
        ? 'No outline yet'
        : phase === 'manual'
          ? 'Estimating by home size'
          : roofTool.idle

  const announce =
    phase === 'found' && lookup
      ? `Found ${lookup.buildings.length} building${lookup.buildings.length === 1 ? '' : 's'} at ${lookup.address.formatted}. ${chosen.length} selected, ${footprint.toLocaleString('en-US')} square feet.`
      : phase === 'error' && error
        ? roofTool.errors[error]
        : ''

  return (
    <div ref={rootRef} className="rf-roof" data-reveal>
      <div className="rf-roof__head">
        <p className="rf-roof__eyebrow">{roofTool.eyebrow}</p>
        <h3 className="rf-roof__title">{roofTool.title}</h3>
        <p className="rf-roof__lede">{roofTool.lede}</p>
      </div>

      <div className="rf-roof__body">
        <div className="rf-roof__visual">
          <RoofStage mode={phase} lookup={lookup} selected={selected} onToggle={toggle} blueprint={SAMPLE} status={status} />

          {phase === 'found' && lookup && (
            <>
              <fieldset className="rf-roof__buildings">
                <legend>{roofTool.buildingsLegend}</legend>
                <p className="rf-roof__confirm">{likelyHome(lookup) ? roofTool.confirm : roofTool.pickHouse}</p>
                <div className="rf-roof__building-list">
                  {lookup.buildings.map((building, index) => (
                    <label key={building.id} className={`rf-roof__building${selected.has(building.id) ? ' is-checked' : ''}`}>
                      <input type="checkbox" checked={selected.has(building.id)} onChange={() => toggle(building.id)} />
                      <span>
                        <strong>{index === 0 && likelyHome(lookup) ? 'Main building' : `Building ${index + 1}`}</strong>
                        <small>
                          {building.areaSqFt.toLocaleString('en-US')} sq ft
                          {building.distanceM > 2 ? ` · ${Math.round(building.distanceM * 3.28084)} ft from the pin` : ''}
                        </small>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <Credits className="rf-roof__credits" credits={[...(lookup.imagery?.credits ?? []), ...lookup.credits]} />
              {lookup.source === 'sample' && <p className="rf-roof__sample-note">{roofTool.sampleNote}</p>}
            </>
          )}
        </div>

        <div className="rf-roof__steps">
          {/* 1 — the house */}
          <section className="rf-roof__step" aria-labelledby="rf-roof-step-1">
            <h4 id="rf-roof-step-1" className="rf-roof__step-title">
              <span>01</span> {roofTool.steps[0]}
            </h4>

            {phase === 'manual' ? (
              <div className="rf-roof__manual">
                <div className="rf-roof__size">
                  <div className="rf-roof__size-row">
                    <label htmlFor={sizeId}>{roofTool.sizeLabel}</label>
                    <output htmlFor={sizeId}>{homeSqft.toLocaleString('en-US')} sq ft</output>
                  </div>
                  <input
                    id={sizeId}
                    type="range"
                    min={1000}
                    max={5000}
                    step={100}
                    value={homeSqft}
                    aria-valuetext={`${homeSqft.toLocaleString('en-US')} square feet`}
                    onChange={(event) => setHomeSqft(Number(event.target.value))}
                    style={{ '--rf-fill': `${((homeSqft - 1000) / 4000) * 100}%` } as CSSProperties}
                  />
                  <p className="rf-roof__help">{roofTool.sizeHelp}</p>
                </div>
                <Segmented tone="dark" legend={roofTool.storiesLabel} name="roof-stories" options={OPTIONS.stories} value={stories} onChange={setStories} columns={3} />
                <button type="button" className="rf-roof__link" onClick={() => setPhase('idle')}>
                  {roofTool.backToAddress}
                </button>
              </div>
            ) : (
              <>
                <form className="rf-roof__find" onSubmit={onSubmit}>
                  <AddressCombobox
                    value={address}
                    onChange={setAddress}
                    onPick={(suggestion) => void find({ kind: 'suggestion', id: suggestion.id })}
                    onSubmit={() => onSubmit()}
                    disabled={phase === 'locating'}
                    describedBy={helpId}
                  />
                  <button type="submit" className="rf-button rf-button--primary" disabled={phase === 'locating'}>
                    {phase === 'locating' ? roofTool.finding : roofTool.find}
                  </button>
                </form>
                <p id={helpId} className="rf-roof__help">
                  {roofTool.addressHelp}
                </p>
                {phase === 'error' && error && (
                  <p className="rf-roof__error" role="alert">
                    {roofTool.errors[error]}
                  </p>
                )}
                {phase === 'found' && lookup && lookup.source !== 'sample' && (
                  <p className="rf-roof__found">
                    <strong>{lookup.address.formatted}</strong>
                  </p>
                )}
                <div className="rf-roof__alts">
                  <button type="button" className="rf-roof__link" onClick={useSample}>
                    {roofTool.sample}
                  </button>
                  <button type="button" className="rf-roof__link" onClick={useManual}>
                    {roofTool.manual}
                  </button>
                </div>
              </>
            )}
          </section>

          {/* 2 — the pitch */}
          <section className={`rf-roof__step${ready ? '' : ' is-locked'}`} aria-labelledby="rf-roof-step-2" data-unlock>
            <h4 id="rf-roof-step-2" className="rf-roof__step-title">
              <span>02</span> {roofTool.steps[1]}
            </h4>
            {ready ? (
              <>
                <p id={pitchHelpId} className="rf-roof__help">
                  {roofTool.pitchHelp}
                </p>
                <PitchPicker value={pitch} onChange={setPitch} describedBy={pitchHelpId} />
              </>
            ) : (
              <p className="rf-roof__locked">{phase === 'found' ? roofTool.pickLocked : roofTool.pitchLocked}</p>
            )}
          </section>

          {/* 3 — the price */}
          <section className={`rf-roof__step${ready ? '' : ' is-locked'}`} aria-labelledby="rf-roof-step-3" data-unlock>
            <h4 id="rf-roof-step-3" className="rf-roof__step-title">
              <span>03</span> {roofTool.steps[2]}
            </h4>
            {quote ? (
              <div className="rf-roof__estimate">
                <dl className="rf-roof__math">
                  <div>
                    <dt>{phase === 'manual' ? 'Ground covered' : 'Outline'}</dt>
                    <dd>{footprint.toLocaleString('en-US')} sq ft</dd>
                  </div>
                  <div>
                    <dt>{pitch}/12 pitch</dt>
                    <dd>×{pitchFactor(pitch).toFixed(2)}</dd>
                  </div>
                  <div>
                    <dt>Roof surface</dt>
                    <dd>{quote.roofSqFt.toLocaleString('en-US')} sq ft</dd>
                  </div>
                  <div>
                    <dt>Squares</dt>
                    <dd>{quote.squares}</dd>
                  </div>
                </dl>

                <div className="rf-roof__material">
                  <Segmented tone="dark" legend={roofTool.materialLabel} name="roof-material" options={OPTIONS.material} value={material} onChange={setMaterial} />
                </div>
                <div className="rf-roof__pair">
                  <Segmented tone="dark" legend={roofTool.layersLabel} name="roof-layers" options={OPTIONS.layers} value={layers} onChange={setLayers} columns={2} />
                  <div>
                    <Segmented tone="dark" legend={roofTool.shapeLabel} name="roof-shape" options={OPTIONS.shape} value={activeShape} onChange={setShape} columns={3} />
                    {shape === null && phase === 'found' && <p className="rf-roof__help rf-roof__help--tight">{roofTool.shapeSuggested}</p>}
                  </div>
                </div>

                <div className="rf-roof__price" aria-live="polite">
                  <p className="rf-roof__price-label">{roofTool.resultLabel}</p>
                  <p className="rf-roof__range">
                    {money(quote.low)}
                    <span aria-hidden="true">–</span>
                    <span className="rf-visually-hidden"> to </span>
                    {money(quote.high)}
                  </p>
                  <p className="rf-roof__detail">
                    {quote.squares} squares · {Math.round(quote.wastePct * 100)}% waste allowance
                    {quote.laborFactor > 1 ? ` · ${bandFor(pitch).label.toLowerCase()} labor +${Math.round((quote.laborFactor - 1) * 100)}%` : ''}
                  </p>
                </div>
                <ul className="rf-roof__ways">
                  <li>{roofTool.insuranceLine}</li>
                  <li>
                    Financing: about <strong>{money(monthly)}/mo</strong> at an example {LONG_PLAN.apr}% APR over {LONG_PLAN.months / 12} years.{' '}
                    <a href="#financing">See plans</a>
                  </li>
                </ul>
                <a className="rf-button rf-button--primary rf-button--block" href="#estimate">
                  {roofTool.cta}
                </a>
                <p className="rf-roof__fine">{roofTool.disclaimer}</p>
              </div>
            ) : (
              <p className="rf-roof__locked">{phase === 'found' ? roofTool.pickLocked : roofTool.estimateLocked}</p>
            )}
          </section>
        </div>
      </div>

      <p className="rf-visually-hidden" aria-live="polite">
        {announce}
      </p>
    </div>
  )
}
