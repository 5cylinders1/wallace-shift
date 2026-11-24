import { useCallback, useRef, useState } from 'react'
import { business } from '../content'
import AddressSearch, { type AddressTarget } from './AddressSearch'
import { ERROR_TEXT, lookup } from './api'
import { MAX_LAWN_SQFT, MIN_LAWN_SQFT, SQFT_PER_ACRE } from './area'
import { PROJECT_LABELS } from './labels'
import LawnMap, { type Tool } from './LawnMap'
import type { HomeChoice } from './measure'
import RequestForm from './RequestForm'
import type { LawnErrorCode, LawnLookup, Project } from './types'

const TOOLS: { id: Tool; label: string; hint: string }[] = [
  { id: 'look', label: 'Pick house', hint: 'Tap your house if we chose the wrong one, outlined or not.' },
  { id: 'add', label: 'Add lawn', hint: 'Paint over grass we missed.' },
  { id: 'erase', label: 'Remove', hint: 'Paint over beds, patios or areas that aren’t lawn.' },
]

type State =
  | { step: 'search'; error: LawnErrorCode | null }
  | { step: 'loading'; label: string }
  | { step: 'plan'; data: LawnLookup; target: { id: string } | { address: string }; label: string }

const formatSqFt = (sqft: number) => Math.round(sqft / 10) * 10

/**
 * The yard planner: find the address, see the property from above with its
 * lawn measured, pick the projects in mind, then request a consultation.
 * Nothing is priced on the page.
 */
export default function Estimator() {
  const panel = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<State>({ step: 'search', error: null })
  const [home, setHome] = useState<HomeChoice | null>(null)
  const [tool, setTool] = useState<Tool>('look')
  const [resetKey, setResetKey] = useState(0)
  const [area, setArea] = useState<{ sqft: number | null; edited: boolean; failed: boolean }>({ sqft: null, edited: false, failed: false })
  const [projects, setProjects] = useState<Project[]>([])
  const [requesting, setRequesting] = useState(false)

  const search = async (target: AddressTarget) => {
    setState({ step: 'loading', label: target.label })
    const result = await lookup('id' in target ? { id: target.id } : { address: target.address })
    if (!result.ok) return setState({ step: 'search', error: result.error })
    // The map chooses the house once it has read the aerial.
    setHome(null)
    setTool('look')
    setArea({ sqft: null, edited: false, failed: false })
    setRequesting(false)
    setState({ step: 'plan', data: result, target: 'id' in target ? { id: target.id } : { address: target.address }, label: result.address.formatted })
    requestAnimationFrame(() => panel.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  const onArea = useCallback((sqft: number | null, edited: boolean) => {
    setArea({ sqft, edited, failed: sqft === null })
  }, [])

  if (state.step !== 'plan') {
    return (
      <div className="ll-estimator is-search">
        <AddressSearch busy={state.step === 'loading'} onSubmit={search} />
        {state.step === 'search' && state.error && (
          <p className="ll-estimator-error" role="alert">
            {ERROR_TEXT[state.error]} {state.error !== 'rate_limited' && <>Or call <a href={business.phoneHref}>{business.phone}</a>.</>}
          </p>
        )}
        <ol className="ll-estimator-steps" aria-label="How it works">
          <li><span>1</span>Find your address</li>
          <li><span>2</span>See your yard from above</li>
          <li><span>3</span>Tell us what you’re planning</li>
        </ol>
      </div>
    )
  }

  const { data, target, label } = state
  const sqft = area.sqft
  const measured = sqft !== null && sqft >= MIN_LAWN_SQFT && sqft <= MAX_LAWN_SQFT ? formatSqFt(sqft) : null
  const activeTool = TOOLS.find((item) => item.id === tool)!
  const toggle = (project: Project, on: boolean) =>
    setProjects((current) => (on ? [...current, project] : current.filter((item) => item !== project)))

  return (
    <div ref={panel} className="ll-estimator is-estimate">
      <LawnMap key={data.imagery.infrared} data={data} home={home} tool={tool} resetKey={resetKey} onHome={setHome} onArea={onArea} />

      <div className="ll-estimate-panel">
        <div className="ll-estimate-address">
          <p className="ll-eyebrow">Your yard</p>
          <p className="ll-estimate-street">{label}</p>
          <button type="button" className="ll-link" onClick={() => setState({ step: 'search', error: null })}>Change address</button>
        </div>

        {requesting ? (
          <RequestForm target={target} addressLabel={label} lawnSqFt={measured} projects={projects} onBack={() => setRequesting(false)} />
        ) : (
          <>
            <div className="ll-estimate-size">
              <p className="ll-estimate-figure" aria-live="polite">
                {area.failed ? 'We couldn’t read the aerial here' : sqft === null ? 'Measuring…' : (
                  <>
                    <strong>{formatSqFt(sqft).toLocaleString('en-US')}</strong> sq ft of lawn
                    <span>≈ {(sqft / SQFT_PER_ACRE).toFixed(sqft < SQFT_PER_ACRE ? 2 : 1)} acre{area.edited ? ' · adjusted by you' : ' · measured from above'}</span>
                  </>
                )}
              </p>
              <p className="ll-estimate-note">{area.failed ? 'That’s fine: we’ll see the yard in person at the consultation.' : 'A head start for planning sprinklers, planting and layout. We confirm everything on site.'}</p>
            </div>

            {!area.failed && (
              <div className="ll-tools">
                <div className="ll-segmented" role="radiogroup" aria-label="Map tool">
                  {TOOLS.map((item) => (
                    <button key={item.id} type="button" role="radio" aria-checked={tool === item.id} onClick={() => setTool(item.id)}>{item.label}</button>
                  ))}
                </div>
                <p className="ll-tools-hint">{activeTool.hint}{tool === 'look' && home && 'spot' in home && ' Yours isn’t in the building outlines yet, so a dashed square marks it.'} {area.edited && <button type="button" className="ll-link" onClick={() => { setResetKey((key) => key + 1); setTool('look') }}>Reset</button>}</p>
              </div>
            )}

            <fieldset className="ll-chips ll-projects">
              <legend>What are you planning? <span>Pick any</span></legend>
              {(Object.keys(PROJECT_LABELS) as Project[]).map((project) => (
                <label key={project} className="ll-chip">
                  <input type="checkbox" name="projects" value={project} checked={projects.includes(project)} onChange={(event) => toggle(project, event.target.checked)} />
                  <span>{PROJECT_LABELS[project]}</span>
                </label>
              ))}
            </fieldset>

            <button type="button" className="ll-button ll-button-green ll-estimate-cta" onClick={() => setRequesting(true)}>
              Request a free consultation
            </button>
            <p className="ll-estimate-fine">The consultation is free, and every quote is custom to your project.</p>
          </>
        )}
      </div>
    </div>
  )
}
