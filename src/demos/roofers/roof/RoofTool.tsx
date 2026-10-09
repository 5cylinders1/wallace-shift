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
  shapeFromComplexity,
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
import { buildingAt, insidePoint } from './geo'
import { PITCH_DEFAULT, bandFor, clampPitch, pitchFactor } from './pitch'
import { lookupRoof, measureRoof, type LookupTarget } from './roofClient'
import { RoofStage, type StageMode } from './RoofStage'
import type { Credit, LatLng, MeasuredRoof, RoofAddress, RoofErrorCode, RoofLookup } from './types'
import sampleLookupJson from './sampleLookup.json'
import './RoofTool.css'

const SAMPLE = sampleLookupJson as unknown as RoofLookup
const LONG_PLAN = financing.plans[2]

interface RoofToolProps {
  onEstimate: (estimate: LeadContext['ballpark']) => void
  onAddress: (address: RoofAddress | null) => void
}

type Phase = StageMode

type Measure =
  | { status: 'idle' }
  | { status: 'measuring' }
  | { status: 'done'; roof: MeasuredRoof; credits: Credit[] }
  | { status: 'failed'; error: RoofErrorCode }

/** Failures the homeowner can fix by moving the pin; anything else falls back to the outline estimate. */
const fixable = (error: RoofErrorCode) => error === 'roof_not_found' || error === 'invalid'
/** Failures worth simply trying again. */
const retryable = (error: RoofErrorCode) => error === 'busy' || error === 'upstream'

/**
 * The roof estimator: find the house, set the pitch, see the price.
 *
 * With a measuring service connected, the homeowner puts a pin on their
 * roof (a tap on the map, or a pick from the list) and we buy one
 * measurement of it: footprint, pitch and complexity, measured from aerial
 * imagery and lidar. Without one, or if it can't measure this roof, area
 * comes from the building's outline in public footprint data (or from home
 * size, with no address) and the homeowner sets the pitch on the drawing.
 * `quoteRoof` turns either into a price that updates as the ridge is dragged.
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
  const [failedImage, setFailedImage] = useState<string | null>(null)
  const [target, setTarget] = useState<LatLng | null>(null)
  const [measure, setMeasure] = useState<Measure>({ status: 'idle' })
  const requestRef = useRef<AbortController | null>(null)
  const measureRef = useRef<AbortController | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const helpId = useId()
  const pitchHelpId = useId()
  const sizeId = useId()

  useEffect(
    () => () => {
      requestRef.current?.abort()
      measureRef.current?.abort()
    },
    [],
  )

  // Timed, not reported by the server: the copy names what the lookup does, in order.
  useEffect(() => {
    if (phase !== 'locating') return
    const timer = window.setInterval(() => setLocatingStep((step) => Math.min(step + 1, roofTool.locating.length - 1)), 900)
    return () => window.clearInterval(timer)
  }, [phase])

  const showLookup = (result: RoofLookup) => {
    measureRef.current?.abort()
    setLookup(result)
    // The server only names a home when the address point is on a building;
    // otherwise the homeowner picks theirs.
    setSelected(new Set(result.home ? [result.home] : []))
    const home = result.measure && result.home ? result.buildings.find((building) => building.id === result.home) : undefined
    setTarget(home ? insidePoint(home.ring, result.frame) : null)
    setMeasure({ status: 'idle' })
    setShape(null)
    setError(null)
    setPhase('found')
    onAddress(result.source === 'sample' ? null : result.address)
  }

  const busy = phase === 'locating'

  const find = async (target: LookupTarget) => {
    if (busy) return
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
    if (busy) return
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
  /* Measuring                                                          */
  /* ---------------------------------------------------------------- */

  const canMeasure = phase === 'found' && Boolean(lookup?.measure)
  const measuring = measure.status === 'measuring'
  const measured = measure.status === 'done' ? measure.roof : null
  // The outline estimate: no measuring service, or one that couldn't measure this roof.
  const outlineMode = !canMeasure || (measure.status === 'failed' && !fixable(measure.error))

  /** A new pin means a new roof: forget any earlier measurement of a different spot. */
  const placePin = (point: LatLng, buildingId: string | null) => {
    if (measuring) return
    setTarget(point)
    setSelected(new Set(buildingId ? [buildingId] : []))
    setMeasure({ status: 'idle' })
  }

  const pickOnMap = (point: LatLng) => {
    if (!lookup) return
    placePin(point, buildingAt(point, lookup.buildings, lookup.frame)?.id ?? null)
  }

  const pickBuilding = (id: string) => {
    const building = lookup?.buildings.find((candidate) => candidate.id === id)
    if (!lookup || !building) return
    const point = insidePoint(building.ring, lookup.frame)
    if (point) placePin(point, id)
  }

  const runMeasure = async () => {
    if (!target || measuring) return
    measureRef.current?.abort()
    const controller = new AbortController()
    measureRef.current = controller
    setMeasure({ status: 'measuring' })
    try {
      const result = await measureRoof(target, controller.signal)
      if (controller.signal.aborted) return
      if (!result.ok) {
        setMeasure({ status: 'failed', error: result.error })
        return
      }
      setMeasure({ status: 'done', roof: result.roof, credits: result.credits })
      // Start from what was measured; the homeowner can still adjust it.
      setPitch(Math.round(clampPitch(result.roof.pitchRise)))
      setShape(null)
    } catch {
      // Superseded by a new lookup.
    }
  }

  /* ---------------------------------------------------------------- */
  /* Numbers                                                            */
  /* ---------------------------------------------------------------- */

  const chosen = useMemo(() => (lookup ? lookup.buildings.filter((b) => selected.has(b.id)) : []), [lookup, selected])
  const outlineFootprint = chosen.reduce((sum, b) => sum + b.areaSqFt, 0)
  const footprint =
    phase === 'found'
      ? measured
        ? measured.footprintSqFt
        : outlineMode
          ? outlineFootprint
          : 0
      : phase === 'manual'
        ? Math.round(footprintFromHome(homeSqft, stories))
        : 0
  const corners = chosen.length ? Math.max(...chosen.map((b) => b.corners)) : 8
  const suggestedShape = phase === 'manual' ? 'average' : measured ? shapeFromComplexity(measured.complexity) : shapeFromCorners(corners)
  const activeShape = shape ?? suggestedShape
  const ready = footprint > 0
  const quote = useMemo(
    () => (ready ? quoteRoof({ footprintSqFt: footprint, pitch, material, layers, shape: activeShape }) : null),
    [ready, footprint, pitch, material, layers, activeShape],
  )
  const monthly = quote ? monthlyPayment((quote.low + quote.high) / 2, LONG_PLAN) : 0
  const buildingCount = phase === 'found' && !measured ? chosen.length : 1

  const estimate = useMemo<LeadContext['ballpark']>(() => {
    if (!quote) return null
    const source: LeadRoof['source'] =
      phase === 'manual' ? 'home-size' : lookup?.source === 'sample' ? 'sample' : measured ? 'measured' : 'outline'
    const materialLabel = OPTIONS.material.find((option) => option.value === material)?.label.toLowerCase() ?? material
    const basis =
      source === 'home-size'
        ? `${homeSqft.toLocaleString('en-US')} sq ft home`
        : `${footprint.toLocaleString('en-US')} sq ft ${source === 'measured' ? 'measured footprint' : 'outline'}`
    return {
      low: quote.low,
      high: quote.high,
      summary: `${basis}, ${pitch}/12 pitch, ${quote.squares} squares, ${materialLabel}, ${layers === '2' ? 'two layers' : 'one layer'}`,
      roof: {
        source,
        address: source === 'outline' || source === 'measured' ? (lookup?.address.formatted ?? null) : null,
        footprintSqFt: footprint,
        roofSqFt: quote.roofSqFt,
        squares: quote.squares,
        pitch,
        buildings: buildingCount,
        confidence: measured?.confidence.label ?? null,
      },
    }
  }, [quote, phase, lookup, measured, material, homeSqft, footprint, pitch, layers, buildingCount])

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

  // Errors are spoken by their own role=alert line, so they're not repeated here.
  const announce = measuring
    ? `${roofTool.measure.measuring} ${roofTool.measure.measuringNote}`
    : measured
      ? `Measured ${measured.roofSqFt.toLocaleString('en-US')} square feet of roof at ${Math.round(measured.pitchRise)} in 12${measured.confidence.label ? `, ${measured.confidence.label.toLowerCase()} confidence` : ''}.`
      : phase === 'found' && lookup
        ? `Found ${lookup.buildings.length} building${lookup.buildings.length === 1 ? '' : 's'} at ${lookup.address.formatted}. ${chosen.length} selected, ${footprint.toLocaleString('en-US')} square feet.`
        : busy
          ? roofTool.lookingUp
          : ''

  const confirmCopy = !lookup || lookup.home ? roofTool.confirm : lookup.precision === 'street' ? roofTool.pickStreet : roofTool.pickHouse
  const showsImage = Boolean(lookup?.imagery && lookup.imagery.src !== failedImage)
  const measurePitch = measured ? Math.round(clampPitch(measured.pitchRise)) : null
  const lockedCopy = phase === 'found' ? (outlineMode ? roofTool.pickLocked : roofTool.measure.locked) : null

  return (
    <div ref={rootRef} className="rf-roof" data-reveal>
      <div className="rf-roof__head">
        <p className="rf-roof__eyebrow">{roofTool.eyebrow}</p>
        <h3 className="rf-roof__title">{roofTool.title}</h3>
        <p className="rf-roof__lede">{roofTool.lede}</p>
      </div>

      <div className="rf-roof__body">
        <div className="rf-roof__visual">
          <RoofStage
            mode={phase}
            lookup={lookup}
            selected={selected}
            onToggle={toggle}
            blueprint={SAMPLE}
            status={status}
            loadingStatus={roofTool.loadingPhoto}
            onImageryFail={setFailedImage}
            onPick={canMeasure && !outlineMode && !measuring ? pickOnMap : undefined}
            target={canMeasure && !outlineMode ? target : null}
            busyStatus={measuring ? roofTool.measure.measuring : null}
          />

          {phase === 'found' && lookup && (
            <>
              <Credits
                className="rf-roof__credits"
                credits={[...(showsImage && lookup.imagery ? lookup.imagery.credits : []), ...lookup.credits, ...(lookup.measure ? [lookup.measure.credit] : [])]}
              />
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
                    busy={busy}
                    describedBy={helpId}
                  />
                  {/* aria-disabled, not disabled, so focus stays put while the lookup runs. */}
                  <button type="submit" className="rf-button rf-button--primary" aria-disabled={busy || undefined}>
                    {busy ? roofTool.finding : roofTool.find}
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
                {phase === 'found' && lookup && !outlineMode && lookup.measure && (
                  <>
                    <fieldset className="rf-roof__buildings">
                      <legend>{roofTool.measure.legend}</legend>
                      <p className="rf-roof__confirm">{target ? roofTool.measure.ready : roofTool.measure.tapPrompt}</p>
                      <div className="rf-roof__building-list">
                        {lookup.buildings.map((building, index) => (
                          <label key={building.id} className={`rf-roof__building${selected.has(building.id) ? ' is-checked' : ''}`}>
                            <input
                              type="radio"
                              name="roof-home"
                              checked={selected.size === 1 && selected.has(building.id)}
                              disabled={measuring}
                              onChange={() => pickBuilding(building.id)}
                            />
                            <span className="rf-roof__building-number" aria-hidden="true">
                              {index + 1}
                            </span>
                            <span>
                              <strong>{building.id === lookup.home ? 'Main building' : `Building ${index + 1}`}</strong>
                              <small>
                                {building.distanceM > 2 ? `${Math.round(building.distanceM * 3.28084)} ft from the address` : 'At the address'}
                              </small>
                            </span>
                          </label>
                        ))}
                      </div>
                    </fieldset>

                    <div className="rf-roof__measure" aria-busy={measuring || undefined}>
                      {measured ? (
                        <div className="rf-roof__measured">
                          <p className="rf-roof__measured-title">{roofTool.measure.measuredTitle}</p>
                          <p className="rf-roof__measured-value">
                            {measured.roofSqFt.toLocaleString('en-US')} sq ft <span>·</span> {measurePitch}/12 pitch
                            {measured.confidence.label && (
                              <>
                                {' '}
                                <span>·</span> {measured.confidence.label} confidence
                              </>
                            )}
                          </p>
                          {measured.confidence.label === 'Low' && <p className="rf-roof__help">{roofTool.measure.lowConfidence}</p>}
                          <p className="rf-roof__help">{roofTool.measure.extraBuildings}</p>
                        </div>
                      ) : (
                        <>
                          {/* aria-disabled, not disabled, so focus stays on the button while it measures. */}
                          <button
                            type="button"
                            className="rf-button rf-button--primary rf-roof__measure-button"
                            aria-disabled={!target || measuring || undefined}
                            onClick={() => void runMeasure()}
                          >
                            {measuring ? roofTool.measure.measuring : roofTool.measure.button}
                          </button>
                          {measuring && (
                            <>
                              <p className="rf-roof__help">{roofTool.measure.measuringNote}</p>
                              <span className="rf-roof__progress" aria-hidden="true" />
                            </>
                          )}
                        </>
                      )}
                      {measure.status === 'failed' && (
                        <p className="rf-roof__error" role="alert">
                          {roofTool.errors[measure.error]}
                        </p>
                      )}
                      <Credits className="rf-roof__measure-credit" credits={[lookup.measure.credit]} />
                    </div>
                  </>
                )}
                {phase === 'found' && lookup && outlineMode && (
                  <>
                    {measure.status === 'failed' && (
                      <div className="rf-roof__fallback">
                        <p className="rf-roof__error" role="alert">
                          {roofTool.errors[measure.error]}
                        </p>
                        {retryable(measure.error) && (
                          <button type="button" className="rf-roof__link" onClick={() => void runMeasure()}>
                            {roofTool.measure.retry}
                          </button>
                        )}
                      </div>
                    )}
                    <fieldset className="rf-roof__buildings">
                      <legend>{roofTool.buildingsLegend}</legend>
                      <p className="rf-roof__confirm">{confirmCopy}</p>
                      <div className="rf-roof__building-list">
                        {lookup.buildings.map((building, index) => (
                          <label key={building.id} className={`rf-roof__building${selected.has(building.id) ? ' is-checked' : ''}`}>
                            <input type="checkbox" checked={selected.has(building.id)} onChange={() => toggle(building.id)} />
                            <span className="rf-roof__building-number" aria-hidden="true">
                              {index + 1}
                            </span>
                            <span>
                              <strong>{building.id === lookup.home ? 'Main building' : `Building ${index + 1}`}</strong>
                              <small>
                                {building.areaSqFt.toLocaleString('en-US')} sq ft
                                {building.distanceM > 2 ? ` · ${Math.round(building.distanceM * 3.28084)} ft from the pin` : ''}
                                {building.capturedYear ? ` · outline from ${building.capturedYear} imagery` : ''}
                              </small>
                            </span>
                          </label>
                        ))}
                      </div>
                    </fieldset>
                  </>
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
                  {measured ? roofTool.measure.pitchMeasured : roofTool.pitchHelp}
                </p>
                <PitchPicker value={pitch} onChange={setPitch} describedBy={pitchHelpId} />
              </>
            ) : (
              <p className="rf-roof__locked">{lockedCopy ?? roofTool.pitchLocked}</p>
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
                    <dt>{phase === 'manual' ? 'Ground covered' : measured ? 'Measured footprint' : 'Outline'}</dt>
                    <dd>{footprint.toLocaleString('en-US')} sq ft</dd>
                  </div>
                  <div>
                    <dt>
                      {pitch}/12 pitch{pitch === measurePitch ? ' · measured' : ''}
                    </dt>
                    <dd>×{pitchFactor(pitch).toFixed(2)}</dd>
                  </div>
                  <div>
                    <dt>Roof surface</dt>
                    {/* The measured figure as measured; anything we compute is rounded to what it's worth. */}
                    <dd>{(measured && pitch === measurePitch ? measured.roofSqFt : quote.roofSqFt).toLocaleString('en-US')} sq ft</dd>
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
                    {shape === null && phase === 'found' && (
                      <p className="rf-roof__help rf-roof__help--tight">{measured ? roofTool.measure.shapeMeasured : roofTool.shapeSuggested}</p>
                    )}
                  </div>
                </div>

                {canMeasure && outlineMode && <p className="rf-roof__rough">{roofTool.measure.roughNote}</p>}
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
                <p className="rf-roof__fine">{measured ? roofTool.measure.disclaimer : roofTool.disclaimer}</p>
              </div>
            ) : (
              <p className="rf-roof__locked">{lockedCopy ?? roofTool.estimateLocked}</p>
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
