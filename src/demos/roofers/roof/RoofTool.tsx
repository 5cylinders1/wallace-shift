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
import { SolarPotential } from './SolarPotential'
import { buildingAt, compassFrom, insidePoint, ringMiddle } from './geo'
import { PITCH_DEFAULT, PITCH_MAX, PITCH_MIN, bandFor, clampPitch, pitchFactor } from './pitch'
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

/** Failures the homeowner can fix by moving the crosshair; anything else falls back to the outline estimate. */
const fixable = (error: RoofErrorCode) => error === 'roof_not_found' || error === 'invalid'
/**
 * Failures worth simply trying again. Not `timed_out`: that request reached
 * the service and may have been billed, so the page doesn't buy it again.
 */
const retryable = (error: RoofErrorCode) => error === 'busy' || error === 'upstream'

const MEASURE_ERRORS: Partial<Record<RoofErrorCode, string>> = roofTool.measure.errors
const measureError = (code: RoofErrorCode) => MEASURE_ERRORS[code] ?? roofTool.errors[code]

/** Five decimals, as the server measures it: one point, one purchase. */
const roundPoint = (point: LatLng): LatLng => ({ lat: Number(point.lat.toFixed(5)), lng: Number(point.lng.toFixed(5)) })
const samePoint = (a: LatLng, b: LatLng) => a.lat.toFixed(5) === b.lat.toFixed(5) && a.lng.toFixed(5) === b.lng.toFixed(5)

/** A measurement bought on this visit, and the point it was bought for. */
interface Paid {
  at: LatLng
  roof: MeasuredRoof
  credits: Credit[]
}

/**
 * The roof estimator: find the house, set the pitch, see the price.
 *
 * With a measuring service connected, the homeowner puts the crosshair on
 * their roof (a tap on the photo, or a pick from the list) and we buy one
 * measurement of it: footprint, pitch and complexity, measured from aerial
 * imagery. A roof measured once on a visit is never bought again: going
 * back to it shows the same result. Without a service, or if it can't
 * measure this roof, area
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
  const paidRef = useRef<Paid[]>([])
  const rootRef = useRef<HTMLDivElement>(null)
  const measureButtonRef = useRef<HTMLButtonElement>(null)
  const measuredBoxRef = useRef<HTMLDivElement>(null)
  const fallbackRef = useRef<HTMLDivElement>(null)
  /** Set when a measure control is pressed: that control is about to give way to its result. */
  const followFocusRef = useRef(false)
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

  /** A measurement already bought on this visit for this building, or at this point. */
  const findPaid = (point: LatLng, buildingId: string | null, view: RoofLookup) =>
    paidRef.current.find(
      (paid) => samePoint(paid.at, point) || (buildingId !== null && buildingAt(paid.at, view.buildings, view.frame)?.id === buildingId),
    )

  const showMeasured = (paid: Paid, view: RoofLookup) => {
    // The list follows what was measured, whatever was ticked while it ran.
    const id = buildingAt(paid.at, view.buildings, view.frame)?.id
    setTarget(paid.at)
    setSelected(new Set(id ? [id] : []))
    setMeasure({ status: 'done', roof: paid.roof, credits: paid.credits })
    // Start from what was measured; the homeowner can still adjust it.
    setPitch(clampPitch(Math.round(paid.roof.pitchRise)))
    setShape(null)
  }

  /** Leaving the measured flow: stop a measurement in flight and forget the one shown. */
  const stopMeasuring = () => {
    measureRef.current?.abort()
    setMeasure({ status: 'idle' })
  }

  /** Measures `at` now; callers decide when that's wanted (a button press, or a cheap automatic measurement). */
  const startMeasure = async (at: LatLng, view: RoofLookup) => {
    measureRef.current?.abort()
    const controller = new AbortController()
    measureRef.current = controller
    setTarget(at)
    setMeasure({ status: 'measuring' })
    try {
      const result = await measureRoof(at, controller.signal)
      if (controller.signal.aborted) return
      if (!result.ok) {
        setMeasure({ status: 'failed', error: result.error })
        return
      }
      const paid = { at, roof: result.roof, credits: result.credits }
      paidRef.current = [...paidRef.current, paid]
      showMeasured(paid, view)
    } catch {
      // Superseded by a new lookup or a new point.
    }
  }

  const showLookup = (result: RoofLookup) => {
    stopMeasuring()
    setLookup(result)
    // The server only names a home when the address point is on a building;
    // otherwise the homeowner picks theirs.
    setSelected(new Set(result.home ? [result.home] : []))
    const home = result.measure && result.home ? result.buildings.find((building) => building.id === result.home) : undefined
    const homePoint = home ? insidePoint(home.ring, result.frame) : null
    // A cheap service measures straight away: the likely home, or a point the
    // geocoder put on a building even when no open outline is there.
    const auto = result.measure?.mode === 'auto'
    const onBuilding = result.precision === 'rooftop' || result.precision === 'parcel'
    const start = homePoint ? roundPoint(homePoint) : auto && onBuilding ? roundPoint(result.location) : null
    setTarget(start)
    setShape(null)
    setError(null)
    setPhase('found')
    onAddress(result.source === 'sample' ? null : result.address)
    const paid = start ? findPaid(start, home?.id ?? null, result) : undefined
    if (paid) showMeasured(paid, result)
    else if (auto && start) void startMeasure(start, result)
  }

  const busy = phase === 'locating'

  const find = async (target: LookupTarget) => {
    if (busy) return
    stopMeasuring()
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
      // Measured as soon as it's found, a house needs no open outline, as long as the point is on it.
      const measurable = result.measure?.mode === 'auto' && (result.precision === 'rooftop' || result.precision === 'parcel')
      if (!result.buildings.length && !measurable) {
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
    stopMeasuring()
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

  // Measuring belongs to a found address; nothing of it reaches the other flows.
  const canMeasure = phase === 'found' && Boolean(lookup?.measure)
  // Cheap and quick: measure on every new point, with no button to press.
  const auto = canMeasure && lookup?.measure?.mode === 'auto'
  const providerName = lookup?.measure ? (roofTool.measure.providers[lookup.measure.provider as keyof typeof roofTool.measure.providers] ?? null) : null
  // Google's data is only ever drawn on Google's photo; without it, the list is the way in.
  const googleOnly = lookup?.measure?.provider === 'google-solar' || lookup?.imagery?.provider === 'google'
  const measuring = phase === 'found' && measure.status === 'measuring'
  const measured = phase === 'found' && measure.status === 'done' ? measure.roof : null
  // The outline estimate: no measuring service, or one that couldn't measure this roof.
  const outlineMode = !canMeasure || (measure.status === 'failed' && !fixable(measure.error))
  // The service said no roof is under this crosshair; it stays no until the crosshair moves.
  const pinRejected = measure.status === 'failed' && fixable(measure.error)
  const measureBlocked = !target || measuring || pinRejected

  /**
   * A new crosshair means a new roof: forget the earlier result shown, unless
   * this roof was already measured on this visit.
   */
  const placePin = (point: LatLng, buildingId: string | null) => {
    // A costly measurement in flight isn't abandoned; a cheap one is simply replaced.
    if (!lookup || (measuring && !auto)) return
    const at = roundPoint(point)
    // Picking the same spot again (say, the same building from the list) doesn't un-reject it.
    if (pinRejected && target && samePoint(at, target)) return
    const paid = findPaid(at, buildingId, lookup)
    if (paid) {
      measureRef.current?.abort()
      return showMeasured(paid, lookup)
    }
    setSelected(new Set(buildingId ? [buildingId] : []))
    if (auto) return void startMeasure(at, lookup)
    setTarget(at)
    setMeasure({ status: 'idle' })
  }

  const pickBuilding = (id: string) => {
    const building = lookup?.buildings.find((candidate) => candidate.id === id)
    if (!lookup || !building) return
    const point = insidePoint(building.ring, lookup.frame)
    if (point) placePin(point, id)
  }

  const pickOnMap = (point: LatLng, onPhoto: boolean) => {
    if (!lookup) return
    const building = buildingAt(point, lookup.buildings, lookup.frame)
    // On the plan there's no roof to see, only outlines: a tap off them would measure a guess.
    // Google's measurements aren't drawn off its photo at all, so there's nothing to tap.
    if (!onPhoto) {
      if (googleOnly) return
      if (building) pickBuilding(building.id)
      return
    }
    placePin(point, building?.id ?? null)
  }

  /** The measured result stays until the homeowner asks for another; the map is locked meanwhile. */
  const measureAnother = () => {
    followFocusRef.current = true
    setMeasure({ status: 'idle' })
    setTarget(null)
    setSelected(new Set())
  }

  /** The Measure buttons and the retry link. */
  const runMeasure = () => {
    if (!target || !lookup || measuring || pinRejected) return
    followFocusRef.current = true
    void startMeasure(target, lookup)
  }

  // When the control the homeowner pressed goes away (the button turns into
  // the result, or the measure step into the fallback), focus follows to what
  // replaced it instead of dropping to the top of the page. Someone who moved
  // on during the wait keeps their place, and taps on the map never move it.
  useEffect(() => {
    if (measure.status === 'measuring' || !followFocusRef.current) return
    followFocusRef.current = false
    const active = document.activeElement
    if (active && active !== document.body) return
    if (measure.status === 'done') measuredBoxRef.current?.focus()
    else if (measure.status === 'failed') (fallbackRef.current ?? measureButtonRef.current)?.focus()
    else measureButtonRef.current?.focus()
  }, [measure.status])

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
  // The vendor's pitch as measured. The picker covers 2/12 to 16/12; outside
  // that, the price uses the nearest end and says so, rather than calling the
  // clamped value measured.
  const measuredRise = measured ? Math.round(measured.pitchRise) : null
  const measurePitch = measuredRise !== null && measuredRise >= PITCH_MIN && measuredRise <= PITCH_MAX ? measuredRise : null
  const pricedRise = measuredRise !== null ? clampPitch(measuredRise) : null
  const pitchNote =
    measuredRise === null || measurePitch !== null
      ? null
      : measuredRise < PITCH_MIN
        ? roofTool.measure.pitchLow(measuredRise, PITCH_MIN)
        : roofTool.measure.pitchSteep(measuredRise, PITCH_MAX)
  const ownPitch = measured !== null && pitch !== pricedRise
  // Measured surface as measured; a pitch the homeowner changes scales it in proportion.
  const measuredSurface = measured && pricedRise !== null ? (measured.roofSqFt * pitchFactor(pitch)) / pitchFactor(pricedRise) : null
  const ready = footprint > 0
  const quote = useMemo(
    () => (ready ? quoteRoof({ footprintSqFt: footprint, roofSqFt: measuredSurface, pitch, material, layers, shape: activeShape }) : null),
    [ready, footprint, measuredSurface, pitch, material, layers, activeShape],
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
        measuredPitch: measuredRise !== null && measuredRise !== pitch ? measuredRise : null,
        measuredBy: measured ? providerName : null,
      },
    }
  }, [quote, phase, lookup, measured, material, homeSqft, footprint, pitch, layers, buildingCount, measuredRise, providerName])

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

  const found = phase === 'found' && lookup ? `Found ${lookup.buildings.length} building${lookup.buildings.length === 1 ? '' : 's'} at ${lookup.address.formatted}.` : ''
  // Errors are spoken by their own role=alert line, so they're not repeated here.
  const announce = measuring
    ? `${roofTool.measure.measuring} ${auto ? roofTool.measure.measuringNoteAuto : roofTool.measure.measuringNote}`
    : measured
      ? `Measured ${measured.roofSqFt.toLocaleString('en-US')} square feet of roof at ${measuredRise} in 12${measured.confidence.label ? `, ${measured.confidence.label.toLowerCase()} confidence` : ''}.`
      : found && outlineMode
        ? `${found} ${chosen.length} selected, ${footprint.toLocaleString('en-US')} square feet.`
        : found
          ? `${found}${pinRejected ? '' : auto ? (target ? '' : ' Pick your house or tap its roof, and we’ll measure it.') : target ? ' Crosshair placed: press Measure my roof.' : ' Pick your house or tap its roof, then measure it.'}`
          : busy
            ? roofTool.lookingUp
            : ''

  // With Google's photo, open outlines aren't drawn on it, so the list is the only way to choose.
  const confirmCopy = lookup?.measure?.provider === 'google-solar' || lookup?.imagery?.provider === 'google'
    ? roofTool.confirmList
    : !lookup || lookup.home
      ? roofTool.confirm
      : lookup.precision === 'street'
        ? roofTool.pickStreet
        : roofTool.pickHouse
  const showsImage = Boolean(lookup?.imagery && lookup.imagery.src !== failedImage)
  const lockedCopy = phase === 'found' ? (outlineMode ? roofTool.pickLocked : roofTool.measure.locked) : null
  const measureCopy = canMeasure && !outlineMode

  return (
    <div ref={rootRef} className="rf-roof" data-reveal>
      <div className="rf-roof__head">
        <p className="rf-roof__eyebrow">{roofTool.eyebrow}</p>
        <h3 className="rf-roof__title">{roofTool.title}</h3>
        <p className="rf-roof__lede">{measureCopy ? roofTool.ledeMeasured : roofTool.lede}</p>
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
            onPick={measureCopy && (auto || (!measuring && !measured)) ? pickOnMap : undefined}
            target={measureCopy ? target : null}
            busyStatus={measuring ? roofTool.measure.measuring : null}
            solar={measured?.solar ?? null}
            measuredBounds={measured?.bounds ?? null}
          />

          {/* Stacked layouts: the step-one button is a screen or more below the photo. */}
          {measureCopy && !auto && target && !measured && (
            <div className="rf-roof__measure-near">
              <button type="button" className="rf-button rf-button--primary" aria-disabled={measureBlocked || undefined} onClick={() => void runMeasure()}>
                {measuring ? roofTool.measure.measuring : roofTool.measure.buttonNear}
              </button>
              {/* Spoken once, by the alert in step one; repeated here for eyes only. */}
              {pinRejected && measure.status === 'failed' && (
                <p className="rf-roof__error" aria-hidden="true">
                  {measureError(measure.error)}
                </p>
              )}
            </div>
          )}

          {phase === 'found' && lookup && (
            <>
              <Credits className="rf-roof__credits" credits={[...(showsImage && lookup.imagery ? lookup.imagery.credits : []), ...lookup.credits]} />
              {/* Maps ToS 3.2.2(a): users are told the tool includes Google Maps content, and under which terms. */}
              {(lookup.measure?.provider === 'google-solar' || lookup.imagery?.provider === 'google') && (
                <p className="rf-roof__notice">
                  {roofTool.googleNotice}{' '}
                  <a href={roofTool.googleTerms.href} target="_blank" rel="noopener noreferrer">
                    {roofTool.googleTerms.text}
                  </a>{' '}
                  and the{' '}
                  <a href={roofTool.googlePrivacy.href} target="_blank" rel="noopener noreferrer">
                    {roofTool.googlePrivacy.text}
                  </a>
                  .
                </p>
              )}
              {lookup.source === 'sample' && <p className="rf-roof__sample-note">{roofTool.sampleNote}</p>}
            </>
          )}
          {/* Measured as it's tapped: a miss is explained beside the photo, not a screen below it. */}
          {auto && pinRejected && measure.status === 'failed' && (
            <p className="rf-roof__error rf-roof__measure-near" aria-hidden="true">
              {measureError(measure.error)}
            </p>
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
                      <p className="rf-roof__confirm">
                        {auto
                          ? measured
                            ? showsImage
                              ? roofTool.measure.doneAuto
                              : googleOnly
                                ? roofTool.measure.doneAutoList
                                : roofTool.measure.doneAutoPlan
                            : showsImage
                              ? roofTool.measure.tapPromptAuto
                              : googleOnly
                                ? roofTool.measure.tapPromptList
                                : roofTool.measure.tapPromptPlan
                          : measured
                            ? roofTool.measure.done
                            : target
                              ? roofTool.measure.ready
                              : showsImage
                                ? roofTool.measure.tapPrompt
                                : roofTool.measure.tapPromptPlan}
                      </p>
                      <div className="rf-roof__building-list">
                        {lookup.buildings.map((building, index) => (
                          <label key={building.id} className={`rf-roof__building${selected.has(building.id) ? ' is-checked' : ''}`}>
                            <input
                              type="radio"
                              name="roof-home"
                              checked={selected.size === 1 && selected.has(building.id)}
                              disabled={measuring && !auto}
                              onChange={() => pickBuilding(building.id)}
                            />
                            <span className="rf-roof__building-number" aria-hidden="true">
                              {index + 1}
                            </span>
                            <span>
                              <strong>{building.id === lookup.home ? 'Main building' : `Building ${index + 1}`}</strong>
                              <small>
                                {building.distanceM > 2
                                  ? `${Math.round(building.distanceM * 3.28084)} ft ${compassFrom(lookup.location, ringMiddle(building.ring))} of the address`
                                  : 'At the address'}
                              </small>
                            </span>
                          </label>
                        ))}
                      </div>
                      <p className="rf-roof__help">
                        {showsImage ? roofTool.measure.notListed : roofTool.measure.notListedPlan}{' '}
                        <button type="button" className="rf-roof__inline-link" onClick={useManual}>
                          {roofTool.measure.notListedAction}
                        </button>
                        .
                      </p>
                    </fieldset>

                    <div className="rf-roof__measure" aria-busy={measuring || undefined}>
                      {measured ? (
                        <div ref={measuredBoxRef} className="rf-roof__measured" tabIndex={-1}>
                          <p className="rf-roof__measured-title">{roofTool.measure.measuredTitle}</p>
                          <p className="rf-roof__measured-value">
                            {measured.roofSqFt.toLocaleString('en-US')} sq ft <span>·</span> {measuredRise}/12 pitch
                            {measured.confidence.label && (
                              <>
                                {' '}
                                <span>·</span> {measured.confidence.label} confidence
                              </>
                            )}
                          </p>
                          {measured.atPoint === false && <p className="rf-roof__help rf-roof__help--warn">{roofTool.measure.nearest}</p>}
                          {measured.confidence.label === 'Low' && <p className="rf-roof__help">{roofTool.measure.lowConfidence}</p>}
                          {measured.capturedYear && <p className="rf-roof__help">{roofTool.measure.captured(measured.capturedYear, measured.capturedMonth ?? null)}</p>}
                          <p className="rf-roof__help">{roofTool.measure.extraBuildings}</p>
                          {measured.solar !== undefined && <SolarPotential solar={measured.solar} />}
                          {/* Google's attribution sits with its data, inside the same box. */}
                          {measure.status === 'done' && lookup.measure.provider === 'google-solar' && (
                            <p className="rf-roof__attribution">{measure.credits.map((credit) => credit.text).join(' · ')}</p>
                          )}
                          {!auto && (
                            <button type="button" className="rf-roof__link" onClick={measureAnother}>
                              {roofTool.measure.another}
                            </button>
                          )}
                        </div>
                      ) : auto ? (
                        measuring && (
                          <>
                            <p className="rf-roof__help">
                              {roofTool.measure.measuring} {roofTool.measure.measuringNoteAuto}
                            </p>
                            <span className="rf-roof__progress" aria-hidden="true" />
                          </>
                        )
                      ) : (
                        <>
                          {/* aria-disabled, not disabled, so focus stays on the button while it measures. */}
                          <button
                            ref={measureButtonRef}
                            type="button"
                            className="rf-button rf-button--primary rf-roof__measure-button"
                            aria-disabled={measureBlocked || undefined}
                            onClick={() => void runMeasure()}
                          >
                            {measuring ? roofTool.measure.measuring : roofTool.measure.button}
                          </button>
                          {measuring ? (
                            <>
                              <p className="rf-roof__help">{roofTool.measure.measuringNote}</p>
                              <span className="rf-roof__progress" aria-hidden="true" />
                            </>
                          ) : (
                            providerName && <p className="rf-roof__help">{roofTool.measure.sends(providerName)}</p>
                          )}
                        </>
                      )}
                      {measure.status === 'failed' && (
                        <p className="rf-roof__error" role="alert">
                          {measureError(measure.error)}
                        </p>
                      )}
                      {auto && providerName && !measuring && <p className="rf-roof__help">{roofTool.measure.sendsAuto(providerName)}</p>}
                      {lookup.measure.provider !== 'google-solar' && (
                        <Credits className="rf-roof__measure-credit" label={roofTool.measure.credit} credits={[lookup.measure.credit]} />
                      )}
                    </div>
                  </>
                )}
                {phase === 'found' && lookup && outlineMode && (
                  <>
                    {measure.status === 'failed' && (
                      <div ref={fallbackRef} className="rf-roof__fallback" tabIndex={-1}>
                        <p className="rf-roof__error" role="alert">
                          {measureError(measure.error)}
                        </p>
                        {retryable(measure.error) && (
                          <button type="button" className="rf-roof__link" onClick={() => void runMeasure()}>
                            {roofTool.measure.retry}
                          </button>
                        )}
                        {lookup.measure && lookup.measure.provider !== 'google-solar' && (
                          <Credits className="rf-roof__measure-credit" label={roofTool.measure.credit} credits={[lookup.measure.credit]} />
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
                                {building.distanceM > 2 ? ` · ${Math.round(building.distanceM * 3.28084)} ft ${compassFrom(lookup.location, ringMiddle(building.ring))} of the pin` : ''}
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
                  {measured ? (pitchNote ?? roofTool.measure.pitchMeasured) : roofTool.pitchHelp}
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
                <p className="rf-roof__fine">
                  {measured ? (ownPitch ? roofTool.measure.disclaimerOwnPitch : roofTool.measure.disclaimer) : roofTool.disclaimer}
                </p>
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
