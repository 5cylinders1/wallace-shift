import { useEffect, useRef, useState } from 'react'
import './systems.css'

function SystemIcon({ kind }: { kind: 'records' | 'assistance' | 'handoffs' }) {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {kind === 'records' && <><rect x="3" y="4" width="18" height="16" rx="3" /><circle cx="8.5" cy="10" r="2" /><path d="M5.5 16c0-4 6-4 6 0m3-7h3m-3 4h3" /></>}
    {kind === 'assistance' && <><path d="M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" /><path d="M9 8h6m-6 4h6m-6 4h3" /></>}
    {kind === 'handoffs' && <><circle cx="6" cy="7" r="3" /><circle cx="18" cy="17" r="3" /><path d="M6 10v5a2 2 0 0 0 2 2h4m3-10h3m-3-3 3 3-3 3" /></>}
  </svg>
}

const desktopConnections = ['M190 170H310', 'M310 170h60q18 0 18-18V93q0-18 18-18h64', 'M310 170h60q18 0 18 18v59q0 18 18 18h64']
const mobileConnections = ['M175 80V206', 'M175 206v62q0 18-18 18h-52q-18 0-18 18v63', 'M175 206v62q0 18 18 18h52q18 0 18 18v63']

function Connections({ mobile = false }: { mobile?: boolean }) {
  const paths = mobile ? mobileConnections : desktopConnections
  return <svg className={`systems-connections${mobile ? ' systems-connections--mobile' : ''}`} viewBox={mobile ? '0 0 350 454' : '0 0 620 340'} preserveAspectRatio="none" fill="none" aria-hidden="true">
    {paths.map((d, index) => <g key={d}>
      <path className="systems-connection" d={d} strokeWidth="1.5" />
      <path className={`systems-signal systems-signal--${index}`} d={d} pathLength="1" strokeWidth="2.5" strokeLinecap="round" />
    </g>)}
  </svg>
}

export default function Systems() {
  const section = useRef<HTMLElement>(null)
  const [entered, setEntered] = useState(false)

  useEffect(() => {
    const element = section.current
    if (!element || !('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        setEntered(true)
        observer.disconnect()
      }
    }, { threshold: 0.25 })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return <section className={`systems-bridge${entered ? ' is-connected' : ''}`} id="systems" aria-labelledby="systems-heading" ref={section}>
    <div className="r-wrap systems-layout">
      <div className="systems-copy">
        <h2 id="systems-heading">When the work needs<br /><em>more than a website.</em></h2>
        <p>Customer records, handoffs and tools that do not connect can need a different solution.</p>
        <a className="m-button systems-link" href="/services">Explore custom systems<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M6 18 18 6M6 6h12v12" /></svg></a>
      </div>
      <figure className="systems-figure">
        <div className="systems-map" role="img" aria-label="Illustrative setup: customer records connect with AI assistance and team handoffs through a shared workflow.">
          <div className="systems-map-layout" aria-hidden="true">
            <Connections />
            <Connections mobile />
            <div className="systems-records">
              <div className="systems-record-sheet">
                <SystemIcon kind="records" />
                <strong>Customer <br />records</strong>
                <span>Contacts, notes &amp; history</span>
              </div>
            </div>
            <div className="systems-hub">
              <div className="systems-hub-mark"><img src="/brand/wallace-shift-logo-black.svg" width="44" height="30" alt="" /></div>
              <span>Your workflow</span>
            </div>
            <div className="systems-output systems-assistance">
              <SystemIcon kind="assistance" />
              <strong>AI assistance</strong>
              <span>Summaries &amp; drafts</span>
            </div>
            <div className="systems-output systems-handoffs">
              <SystemIcon kind="handoffs" />
              <strong>Team handoffs</strong>
              <span>Who does what next</span>
            </div>
          </div>
        </div>
      </figure>
    </div>
  </section>
}
