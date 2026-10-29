import { useCallback, useId, useRef, useState } from 'react'
import { business } from '../content'
import AddressSearch, { type AddressTarget } from './AddressSearch'
import { ERROR_TEXT, lookup } from './api'
import LawnMap, { type Tool } from './LawnMap'
import { MAX_LAWN_SQFT, MIN_LAWN_SQFT, SQFT_PER_ACRE, visitPrice } from './pricing'
import RequestForm from './RequestForm'
import type { Frequency, LawnErrorCode, LawnLookup } from './types'

const FREQUENCY_LABELS: Record<Frequency, { label: string; note: string }> = {
  weekly: { label: 'Weekly', note: 'Best for peak season' },
  biweekly: { label: 'Every 2 weeks', note: 'Taller grass, a little more per visit' },
  once: { label: 'One-time', note: 'A single mow, no schedule' },
}
const TOOLS: { id: Tool; label: string; hint: string }[] = [
  { id: 'look', label: 'Pick house', hint: 'Tap your house if we chose the wrong one.' },
  { id: 'add', label: 'Add lawn', hint: 'Paint over grass we missed.' },
  { id: 'erase', label: 'Remove', hint: 'Paint over beds, gardens or areas to skip.' },
]

type State =
  | { step: 'search'; error: LawnErrorCode | null }
  | { step: 'loading'; label: string }
  | { step: 'estimate'; data: LawnLookup; target: { id: string } | { address: string }; label: string }

const formatSqFt = (sqft: number) => Math.round(sqft / 10) * 10

export default function Estimator() {
  const id = useId()
  const panel = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<State>({ step: 'search', error: null })
  const [home, setHome] = useState<string | null>(null)
  const [tool, setTool] = useState<Tool>('look')
  const [resetKey, setResetKey] = useState(0)
  const [area, setArea] = useState<{ sqft: number | null; edited: boolean }>({ sqft: null, edited: false })
  const [manual, setManual] = useState(false)
  const [frequency, setFrequency] = useState<Frequency>('weekly')
  const [requesting, setRequesting] = useState(false)

  const search = async (target: AddressTarget) => {
    setState({ step: 'loading', label: target.label })
    const result = await lookup('id' in target ? { id: target.id } : { address: target.address })
    if (!result.ok) return setState({ step: 'search', error: result.error })
    setHome(result.home ?? result.buildings[0]?.id ?? null)
    setTool('look')
    setArea({ sqft: null, edited: false })
    setManual(false)
    setRequesting(false)
    setState({ step: 'estimate', data: result, target: 'id' in target ? { id: target.id } : { address: target.address }, label: result.address.formatted })
    requestAnimationFrame(() => panel.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  const onArea = useCallback((sqft: number | null, edited: boolean) => {
    setArea({ sqft, edited })
    if (sqft === null) setManual(true)
  }, [])

  if (state.step !== 'estimate') {
    return (
      <div className="tw-estimator is-search">
        <AddressSearch busy={state.step === 'loading'} onSubmit={search} />
        {state.step === 'search' && state.error && (
          <p className="tw-estimator-error" role="alert">
            {ERROR_TEXT[state.error]} {state.error !== 'rate_limited' && <>Or call or text <a href={business.phoneHref}>{business.phone}</a>.</>}
          </p>
        )}
        <ol className="tw-estimator-steps" aria-label="How it works">
          <li><span>1</span>Find your address</li>
          <li><span>2</span>We measure the grass from above</li>
          <li><span>3</span>See your price and request service</li>
        </ol>
      </div>
    )
  }

  const { data, target, label } = state
  const range = data.range
  const outside = range !== null && !range.inRange
  const sqft = area.sqft
  const usable = sqft !== null && sqft >= MIN_LAWN_SQFT && sqft <= MAX_LAWN_SQFT
  const price = usable ? visitPrice(sqft, frequency, data.pricing) : null
  const activeTool = TOOLS.find((item) => item.id === tool)!

  return (
    <div ref={panel} className="tw-estimator is-estimate">
      <LawnMap key={data.imagery.infrared} data={data} home={home} tool={tool} resetKey={resetKey} onHome={setHome} onArea={onArea} />

      <div className="tw-estimate-panel">
        <div className="tw-estimate-address">
          <p className="tw-eyebrow">Your lawn</p>
          <p className="tw-estimate-street">{label}</p>
          <button type="button" className="tw-link" onClick={() => setState({ step: 'search', error: null })}>Change address</button>
        </div>

        {outside && range && (
          <div className="tw-estimate-outside" role="status">
            <p><strong>Just outside the service area.</strong> This address is about {range.miles} miles from {business.home.split(',')[0]}; Ben mows within {range.radiusMiles} miles.</p>
            <div className="tw-request-actions">
              <a className="tw-button tw-button-ink" href={business.smsHref}>Text Ben to ask</a>
              <a className="tw-button tw-button-line" href={business.phoneHref}>Call {business.phone}</a>
            </div>
          </div>
        )}

        {requesting && price && !outside ? (
          <RequestForm target={target} addressLabel={label} lawnSqFt={formatSqFt(sqft!)} frequency={frequency} price={price} onBack={() => setRequesting(false)} />
        ) : (
          <>
            <div className="tw-estimate-size">
              <p className="tw-estimate-figure" aria-live="polite">
                {sqft === null ? (manual ? 'Enter your lawn size' : 'Measuring…') : (
                  <>
                    <strong>{formatSqFt(sqft).toLocaleString('en-US')}</strong> sq ft of lawn
                    <span>≈ {(sqft / SQFT_PER_ACRE).toFixed(sqft < SQFT_PER_ACRE ? 2 : 1)} acre{area.edited ? ' · adjusted by you' : ' · measured from above'}</span>
                  </>
                )}
              </p>
              {manual ? (
                <div className="tw-field tw-manual">
                  <label htmlFor={`${id}-sqft`}>Lawn size in square feet</label>
                  <input
                    id={`${id}-sqft`}
                    type="number"
                    inputMode="numeric"
                    min={MIN_LAWN_SQFT}
                    max={MAX_LAWN_SQFT}
                    step={100}
                    value={sqft ?? ''}
                    onChange={(event) => setArea({ sqft: event.target.value ? Number(event.target.value) : null, edited: true })}
                  />
                </div>
              ) : (
                <button type="button" className="tw-link" onClick={() => setManual(true)}>Type a size instead</button>
              )}
            </div>

            {!manual && (
              <div className="tw-tools">
                <div className="tw-segmented" role="radiogroup" aria-label="Map tool">
                  {TOOLS.map((item) => (
                    <button key={item.id} type="button" role="radio" aria-checked={tool === item.id} onClick={() => setTool(item.id)}>{item.label}</button>
                  ))}
                </div>
                <p className="tw-tools-hint">{activeTool.hint} {area.edited && <button type="button" className="tw-link" onClick={() => { setResetKey((key) => key + 1); setTool('look') }}>Reset</button>}</p>
              </div>
            )}

            <fieldset className="tw-frequency">
              <legend>How often?</legend>
              {(Object.keys(FREQUENCY_LABELS) as Frequency[]).map((option) => (
                <label key={option} className={`tw-frequency-option${frequency === option ? ' is-active' : ''}`}>
                  <input type="radio" name={`${id}-frequency`} value={option} checked={frequency === option} onChange={() => setFrequency(option)} />
                  <span>{FREQUENCY_LABELS[option].label}</span>
                  <small>{FREQUENCY_LABELS[option].note}</small>
                </label>
              ))}
            </fieldset>

            <div className="tw-price" aria-live="polite">
              {price ? (
                <>
                  <p className="tw-price-figure"><span>$</span>{price.low}<span className="tw-price-dash">–</span><span>$</span>{price.high}<small>per mow</small></p>
                  <p className="tw-price-note">Mowing, trimming and blow-off included.{data.pricing.sample && <em> Sample rates for this concept.</em>}</p>
                </>
              ) : (
                <p className="tw-price-note">{sqft !== null && !usable ? 'That size needs a look in person. Call or text Ben for a quote.' : 'Your price appears once the lawn is measured.'}</p>
              )}
            </div>

            {!outside && (
              <button type="button" className="tw-button tw-button-lime tw-estimate-cta" disabled={!price} onClick={() => setRequesting(true)}>
                Request service
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
