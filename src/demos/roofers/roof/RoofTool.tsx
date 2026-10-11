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
  solarSizes,
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
  | { status: 'done'; roof: MeasuredRoof; credits: Credit[]; provider: string; measuredAt: string }
  | { status: 'failed'; error: RoofErrorCode }

/** Failures the homeowner can fix by moving the crosshair; anything else falls back to the outline estimate. */
const fixable = (error: RoofErrorCode) => error === 'roof_not_found' || error === 'invalid'
/**
 * Failures worth simply trying again. Not `timed_out`: that request reached
 * the service and may have been billed, so the page doesn't buy it again.
 */
const retryable = (error: RoofErrorCode) => error === 'busy' || error === 'upstream'

const MEASURE_ERRORS: Partial<Record<RoofErrorCode, string>> = roofTool.measure.errors
const PHOTO_ERRORS: Partial<Record<RoofErrorCode, string>> = roofTool.measure.photoErrors
/** With no outline to fall back on (the photo-first flow), the message leads to the home-size estimate. */
const measureError = (code: RoofErrorCode, photoFirst = false) => (photoFirst ? PHOTO_ERRORS[code] : undefined) ?? MEASURE_ERRORS[code] ?? roofTool.errors[code]

/** Five decimals, as the server measures it: one point, one purchase. */
const roundPoint = (point: LatLng): LatLng => ({ lat: Number(point.lat.toFixed(5)), lng: Number(point.lng.toFixed(5)) })
/** How long a building picked from the list waits before it is measured. */
const LIST_SETTLE_MS = 500
const samePoint = (a: LatLng, b: LatLng) => a.lat.toFixed(5) === b.lat.toFixed(5) && a.lng.toFixed(5) === b.lng.toFixed(5)

/** A measurement bought on this visit, the point it was bought for, and from whom. */
interface Paid {
  at: LatLng
  provider: string
  roof: MeasuredRoof
  credits: Credit[]
  /** When it was measured (ISO): Google's terms limit how long its numbers may be kept. */
  measuredAt: string
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
  const [solarKw, setSolarKw] = useState<number | null>(null)
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
  /** A building picked from the list, waiting to be measured once the choice settles (see pickBuilding). */
  const listPickRef = useRef<number | null>(null)
  const helpId = useId()
  const pitchHelpId = useId()
  const sizeId = useId()

  useEffect(
    () => () => {
      requestRef.current?.abort()
      measureRef.current?.abort()
      if (listPickRef.current !== null) window.clearTimeout(listPickRef.current)
    },
    [],
  )

  // Timed, not reported by the server: the copy names what the lookup does, in order.
  useEffect(() => {
    if (phase !== 'locating') return
    const timer = window.setInterval(() => setLocatingStep((step) => Math.min(step + 1, roofTool.locating.length - 1)), 900)
    return () => window.clearInterval(timer)
  }, [phase])

  /**
   * A measurement already bought on this visit for this building, or at this
   * point, or (from a service that reports the roof's extent) for the roof
   * this point is on: the smallest such roof, should two boxes overlap.
   */
  const findPaid = (point: LatLng, buildingId: string | null, view: RoofLookup) => {
    const mine = paidRef.current.filter((paid) => paid.provider === view.measure?.provider)
    const same = mine.find(
      (paid) => samePoint(paid.at, point) || (buildingId !== null && buildingAt(paid.at, view.buildings, view.frame)?.id === buildingId),
    )
    if (same) return same
    const area = ({ sw, ne }: { sw: LatLng; ne: LatLng }) => (ne.lat - sw.lat) * (ne.lng - sw.lng)
    let best: Paid | undefined
    for (const paid of mine) {
      const box = paid.roof.bounds
      // A roof found away from the point it was asked for says nothing about that point.
      if (!box || paid.roof.atPoint === false) continue
      const inside = point.lat >= box.sw.lat && point.lat <= box.ne.lat && point.lng >= box.sw.lng && point.lng <= box.ne.lng
      if (inside && (!best?.roof.bounds || area(box) < area(best.roof.bounds))) best = paid
    }
    return best
  }

  const showMeasured = (paid: Paid, view: RoofLookup) => {
    // The list follows what was measured, whatever was ticked while it ran.
    const id = buildingAt(paid.at, view.buildings, view.frame)?.id
    setTarget(paid.at)
    setSelected(new Set(id ? [id] : []))
    setMeasure({ status: 'done', roof: paid.roof, credits: paid.credits, provider: paid.provider, measuredAt: paid.measuredAt })
    // Start from what was measured; the homeowner can still adjust it.
    setPitch(clampPitch(Math.round(paid.roof.pitchRise)))
    setShape(null)
  }

  const clearListPick = () => {
    if (listPickRef.current === null) return
    window.clearTimeout(listPickRef.current)
    listPickRef.current = null
  }

  /** Leaving the measured flow: stop a measurement in flight and forget the one shown. */
  const stopMeasuring = () => {
    measureRef.current?.abort()
    clearListPick()
    setMeasure({ status: 'idle' })
  }

  /** Measures `at` now; callers decide when that's wanted (a button press, or a cheap automatic measurement). */
  const startMeasure = async (at: LatLng, view: RoofLookup) => {
    const provider = view.measure?.provider
    if (!provider) return
    measureRef.current?.abort()
    const controller = new AbortController()
    measureRef.current = controller
    setTarget(at)
    setMeasure({ status: 'measuring' })
    try {
      const result = await measureRoof(at, provider, controller.signal)
      if (controller.signal.aborted) return
      // Data from a service other than the one this view was built for (its
      // photo, credits and drawing rules) is never shown on it.
      if (!result.ok || result.provider !== provider) {
        setMeasure({ status: 'failed', error: result.ok ? 'not_configured' : result.error })
        return
      }
      const paid = { at, provider, roof: result.roof, credits: result.credits, measuredAt: new Date().toISOString() }
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
    // The crosshair starts on the likely home, or on a point the geocoder put
    // on a building even when no open outline is there (a new house, say). A
    // cheap service measures it straight away; otherwise the homeowner checks
    // it on the photo first.
    const auto = result.measure?.mode === 'auto'
    const onBuilding = result.precision === 'rooftop' || result.precision === 'parcel'
    const start = homePoint ? roundPoint(homePoint) : result.measure && onBuilding ? roundPoint(result.location) : null
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
      // With a measuring service, a house needs no open outline: the homeowner
      // puts the crosshair on its roof in the photo. Without a photo, there's
      // nothing to put it on.
      const measurable = Boolean(result.measure && result.imagery)
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
  // Google's figures are on screen: each place they show carries its attribution.
  const googleMeasured = measured !== null && measure.status === 'done' && measure.provider === 'google-solar'
  const googleCredit = googleMeasured && measure.status === 'done' ? measure.credits.map((credit) => credit.text).join(' · ') : null
  const showsImage = Boolean(lookup?.imagery && lookup.imagery.src !== failedImage)
  // With a measuring service and a photo, the photo is the whole choice: no
  // open outlines (often a few metres off, and missing for new houses) and
  // no building list; the crosshair goes where the homeowner taps. (Google's
  // flow keeps its list: its photo carries only Google's own data.)
  const photoFirst = canMeasure && showsImage && !googleOnly
  const measureFailed = measure.status === 'failed' && !fixable(measure.error)
  // The outline estimate: no measuring service, or one that couldn't measure
  // this roof. In the photo-first flow there's no outline to fall back on, so
  // a failure leads to the home-size estimate instead.
  const outlineMode = !canMeasure || (measureFailed && !photoFirst)
  const photoFallback = photoFirst && measureFailed
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
    // Nor does it buy the roof a second time while the first answer is on its way.
    if (auto && measuring && target && samePoint(at, target)) return
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

  // The settled list pick runs the placePin of the render it lands in, not the one it was clicked in.
  const placePinRef = useRef(placePin)
  useEffect(() => {
    placePinRef.current = placePin
  })

  const pickBuilding = (id: string) => {
    const building = lookup?.buildings.find((candidate) => candidate.id === id)
    if (!lookup || !building) return
    const point = insidePoint(building.ring, lookup.frame)
    if (!point) return
    clearListPick()
    if (!auto) return placePin(point, id)
    // Arrow keys move through the list one building at a time, and each step
    // would buy a measurement. The ticked building is measured once the
    // homeowner stops on it.
    setSelected(new Set([id]))
    listPickRef.current = window.setTimeout(() => {
      listPickRef.current = null
      placePinRef.current(point, id)
    }, LIST_SETTLE_MS)
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
  // Below 2/12 is low-slope roofing, not shingles, however close it rounds;
  // it's shown to a decimal and never labelled as the measured shingle pitch.
  const lowSlope = measured !== null && measured.pitchRise < PITCH_MIN
  const measuredRise = measured ? (lowSlope ? Math.round(measured.pitchRise * 10) / 10 : Math.round(measured.pitchRise)) : null
  const measurePitch = measuredRise !== null && !lowSlope && measuredRise <= PITCH_MAX ? measuredRise : null
  const pricedRise = measuredRise !== null ? clampPitch(Math.round(measuredRise)) : null
  const pitchNote =
    measuredRise === null || measurePitch !== null
      ? null
      : measuredRise < PITCH_MIN
        ? roofTool.measure.pitchLow(measuredRise, PITCH_MIN)
        : roofTool.measure.pitchSteep(measuredRise, PITCH_MAX)
  const ownPitch = measured !== null && pitch !== pricedRise
  // Measured surface as measured; a pitch the homeowner changes scales it in proportion.
  const measuredSurface = measured && pricedRise !== null ? (measured.roofSqFt * pitchFactor(pitch)) / pitchFactor(pricedRise) : null

  // Solar shingles are offered where the measurement says solar fits, on a roof
  // they can go on (2/12 and up), sized from the service's own panel layouts.
  // (solarSizes counts only panels on faces of 2/12 and steeper.)
  const sizes = useMemo(() => (measured ? solarSizes(measured.solar) : []), [measured])
  const materialOptions = sizes.length ? OPTIONS.material : OPTIONS.material.filter((option) => option.value !== 'solar')
  const activeMaterial: Material = material === 'solar' && !sizes.length ? 'architectural' : material
  const solarSize = activeMaterial === 'solar' ? (sizes.find((size) => size.kw === solarKw) ?? sizes.find((size) => size.kw === 7) ?? sizes[sizes.length - 1]) : null

  const ready = footprint > 0
  const quote = useMemo(
    () =>
      ready
        ? quoteRoof({ footprintSqFt: footprint, roofSqFt: measuredSurface, pitch, material: activeMaterial, solarKw: solarSize?.kw ?? null, layers, shape: activeShape })
        : null,
    [ready, footprint, measuredSurface, pitch, activeMaterial, solarSize, layers, activeShape],
  )
  const monthly = quote ? monthlyPayment((quote.low + quote.high) / 2, LONG_PLAN) : 0
  const buildingCount = phase === 'found' && !measured ? chosen.length : 1


  const estimate = useMemo<LeadContext['ballpark']>(() => {
    if (!quote) return null
    const source: LeadRoof['source'] =
      phase === 'manual' ? 'home-size' : lookup?.source === 'sample' ? 'sample' : measured ? 'measured' : 'outline'
    const materialLabel =
      activeMaterial === 'solar' && solarSize
        ? `solar shingles (${solarSize.kw} kW)`
        : (OPTIONS.material.find((option) => option.value === activeMaterial)?.label.toLowerCase() ?? activeMaterial)
    const basis =
      source === 'home-size'
        ? `${homeSqft.toLocaleString('en-US')} sq ft home`
        : `${footprint.toLocaleString('en-US')} sq ft ${source === 'measured' ? 'measured footprint' : 'outline'}`
    return {
      low: quote.low,
      high: quote.high,
      // Google's figures live only in the structured roof fields, which a CRM
      // can expire after 30 days; the free-text summary doesn't repeat them.
      summary: googleMeasured
        ? `${roofTool.measure.summaryGoogle}, ${materialLabel}, ${layers === '2' ? 'two layers' : 'one layer'}`
        : `${basis}, ${pitch}/12 pitch, ${quote.squares} squares, ${materialLabel}, ${layers === '2' ? 'two layers' : 'one layer'}`,
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
        measuredBy: measure.status === 'done' && measured ? measure.provider : null,
        measuredAt: measure.status === 'done' && measured ? measure.measuredAt : null,
        // Asked for by the homeowner: what a solar proposal for this address starts from.
        solar: solarSize ? { kw: solarSize.kw, yearlyKwh: solarSize.yearlyKwh } : null,
      },
    }
  }, [quote, phase, lookup, measured, measure, googleMeasured, activeMaterial, solarSize, homeSqft, footprint, pitch, layers, buildingCount, measuredRise])

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

  const found =
    phase === 'found' && lookup
      ? photoFirst
        ? `Found ${lookup.address.formatted}.`
        : `Found ${lookup.buildings.length} building${lookup.buildings.length === 1 ? '' : 's'} at ${lookup.address.formatted}.`
      : ''
  // Errors are spoken by their own role=alert line, so they're not repeated here.
  const announce = measuring
    ? `${roofTool.measure.measuring} ${auto ? roofTool.measure.measuringNoteAuto : roofTool.measure.measuringNote}`
    : measured
      ? `Measured ${measured.roofSqFt.toLocaleString('en-US')} square feet of roof at ${measuredRise} in 12${measured.confidence.label ? `, ${measured.confidence.label.toLowerCase()} confidence` : ''}.${googleCredit ? ` Source: ${googleCredit}.` : ''}`
      : found && outlineMode
        ? `${found} ${chosen.length} selected, ${footprint.toLocaleString('en-US')} square feet.`
        : found
          ? `${found}${pinRejected || photoFallback ? '' : auto ? (target ? '' : ' Pick your house or tap its roof, and we’ll measure it.') : target ? ' Crosshair placed: press Measure my roof.' : photoFirst ? ' Tap your roof on the photo, then measure it.' : ' Pick your house or tap its roof, then measure it.'}`
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
  const lockedCopy = phase === 'found' ? (outlineMode ? roofTool.pickLocked : photoFallback ? roofTool.measure.lockedFallback : roofTool.measure.locked) : null
  const measureCopy = canMeasure && !outlineMode

  return (
    <div ref={rootRef} className="rf-roof" data-reveal>
      <div className="rf-roof__head">
        <p className="rf-roof__eyebrow">{roofTool.eyebrow}</p>
        <h2 id="rf-roof-title" className="rf-roof__title">
          {roofTool.title}
        </h2>
        <p className="rf-roof__lede">{measureCopy ? roofTool.ledeMeasured : phase === 'found' ? roofTool.lede : roofTool.ledeIdle}</p>
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
            onPick={measureCopy && !photoFallback && (auto || (!measuring && !measured)) ? pickOnMap : undefined}
            outlines={!photoFirst}
            keyboardPick={photoFirst && !auto}
            pickHelp={roofTool.measure.keyboardHelp}
            target={measureCopy ? target : null}
            busyStatus={measuring ? roofTool.measure.measuring : null}
            solar={measured?.solar ?? null}
            measuredBounds={measured?.bounds ?? null}
          />

          {/* Stacked layouts: the step-one button is a screen or more below the photo. */}
          {measureCopy && !auto && target && !measured && !photoFallback && (
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
              {!googleOnly && (
                <Credits className="rf-roof__credits" credits={[...(showsImage && lookup.imagery ? lookup.imagery.credits : []), ...lookup.credits]} />
              )}
              {/* Maps ToS 3.2.2(a): users are told the tool includes Google Maps content, and under which terms. */}
              {googleOnly && (
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
              {/* Under Google's photo, the other sources are named for what they gave: the address and the building list, not the map. */}
              {googleOnly && <Credits className="rf-roof__credits" label={roofTool.otherCredits} credits={lookup.credits} />}
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
            <h3 id="rf-roof-step-1" className="rf-roof__step-title">
              <span>01</span> {roofTool.steps[0]}
            </h3>

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
                      <legend>{photoFirst ? roofTool.measure.legendPhoto : roofTool.measure.legend}</legend>
                      <p className="rf-roof__confirm">
                        {photoFirst
                          ? measured
                            ? roofTool.measure.donePhoto
                            : target
                              ? roofTool.measure.readyPhoto
                              : roofTool.measure.tapPromptPhoto
                          : auto
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
                      {!photoFirst && (
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
                      )}
                      {/* Once measured, the house was found; only the other flows still need the way out. */}
                      {!(photoFirst && measured) && (
                        <p className="rf-roof__help">
                          {photoFirst ? roofTool.measure.notInPhoto : showsImage ? roofTool.measure.notListed : roofTool.measure.notListedPlan}{' '}
                          <button type="button" className="rf-roof__inline-link" onClick={useManual}>
                            {roofTool.measure.notListedAction}
                          </button>
                          .
                        </p>
                      )}
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
                          {measured.solar !== undefined && <SolarPotential solar={measured.solar} shingles={sizes.length > 0} />}
                          {/* Google's attribution sits with its data, inside the same box. */}
                          {googleCredit && <p className="rf-roof__attribution">{googleCredit}</p>}
                          {!auto && (
                            <button type="button" className="rf-roof__link" onClick={measureAnother}>
                              {roofTool.measure.another}
                            </button>
                          )}
                        </div>
                      ) : photoFallback ? (
                        <div ref={fallbackRef} className="rf-roof__fallback" tabIndex={-1}>
                          <p className="rf-roof__error" role="alert">
                            {measureError(measure.error, true)}
                          </p>
                          <button type="button" className="rf-button rf-button--primary" onClick={useManual}>
                            {roofTool.measure.photoFallbackAction}
                          </button>
                          {retryable(measure.error) && (
                            <button type="button" className="rf-roof__link" onClick={() => void runMeasure()}>
                              {roofTool.measure.retry}
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
                      {measure.status === 'failed' && !photoFallback && (
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
            <h3 id="rf-roof-step-2" className="rf-roof__step-title">
              <span>02</span> {roofTool.steps[1]}
            </h3>
            {ready ? (
              <>
                <p id={pitchHelpId} className="rf-roof__help">
                  {measured ? (pitchNote ?? roofTool.measure.pitchMeasured) : roofTool.pitchHelp}
                </p>
                <PitchPicker value={pitch} onChange={setPitch} describedBy={pitchHelpId} />
                {googleCredit && <p className="rf-roof__attribution">{googleCredit}</p>}
              </>
            ) : (
              <p className="rf-roof__locked">{lockedCopy ?? roofTool.pitchLocked}</p>
            )}
          </section>

          {/* 3 — the price */}
          <section className={`rf-roof__step${ready ? '' : ' is-locked'}`} aria-labelledby="rf-roof-step-3" data-unlock>
            <h3 id="rf-roof-step-3" className="rf-roof__step-title">
              <span>03</span> {roofTool.steps[2]}
            </h3>
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
                    {/* A measured roof's faces have their own pitches: the factor is what was measured, not the main pitch's. */}
                    <dd>×{(measuredSurface && footprint ? measuredSurface / footprint : pitchFactor(pitch)).toFixed(2)}</dd>
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

                <div className={`rf-roof__material${materialOptions.length === 4 ? ' rf-roof__material--four' : ''}`}>
                  <Segmented tone="dark" legend={roofTool.materialLabel} name="roof-material" options={materialOptions} value={activeMaterial} onChange={setMaterial} />
                </div>
                {solarSize && (
                  <div className="rf-roof__solar-size">
                    <Segmented
                      tone="dark"
                      legend={roofTool.solar.sizeLabel}
                      name="roof-solar-size"
                      options={sizes.map((size) => ({
                        value: String(size.kw),
                        label: `${size.kw} kW`,
                        hint: size.yearlyKwh ? roofTool.solar.sizeHint(size.yearlyKwh.toLocaleString('en-US')) : undefined,
                      }))}
                      value={String(solarSize.kw)}
                      onChange={(value) => setSolarKw(Number(value))}
                      columns={sizes.length}
                    />
                    <p className="rf-roof__help">{roofTool.solar.sizeHelp(solarSize.activeSqFt.toLocaleString('en-US'))}</p>
                  </div>
                )}
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
                  <p className="rf-roof__price-label">{quote.solar ? roofTool.solar.resultLabel : roofTool.resultLabel}</p>
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
                  {quote.solar && (
                    <p className="rf-roof__detail">
                      {roofTool.solar.priceIncludes(quote.solar.kw, money(quote.solar.low), money(quote.solar.high))}
                    </p>
                  )}
                </div>
                {quote.solar && <p className="rf-roof__rough">{roofTool.solar.taxNote}</p>}
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
                {googleCredit && <p className="rf-roof__attribution">{googleCredit}</p>}
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
