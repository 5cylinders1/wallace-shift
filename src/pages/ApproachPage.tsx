import { Fragment, useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SiteAudit } from '../components/SiteAudit/SiteAudit'
import { AuditReport } from '../components/AuditReport/AuditReport'
import { AuditPill } from '../components/AuditPill/AuditPill'
import { StageWorkbench } from '../components/StageWorkbench/StageWorkbench'
import { ApproachDetails } from '../components/ApproachDetails/ApproachDetails'
import { approachAssurances, approachStages } from '../content/approachPage'
import { useRouteMeta } from '../hooks/useDocumentMeta'
import { useSiteAudit } from '../hooks/useSiteAudit'
import { useReducedMotion } from '../hooks/useReducedMotion'
import './InteriorPage.css'
import './ApproachPage.css'

const checkpoints = [
  { id: 'approach-start', label: 'Find the gaps' },
  { id: 'approach-build', label: 'Build around the work' },
  { id: 'approach-launch', label: 'Support the next step' },
]

function CheckpointNav({ current }: { current: number }) {
  return (
    <nav className="checkpoint-nav" aria-label={`Process navigation, step ${current + 1}`}>
      {checkpoints.map((checkpoint, index) => (
        <a href={`#${checkpoint.id}`} key={checkpoint.id} aria-current={index === current ? 'step' : undefined}>
          <span className="checkpoint-nav__number">0{index + 1}</span>
          <span>{checkpoint.label}</span>
          <span className="checkpoint-nav__line" aria-hidden="true" />
        </a>
      ))}
    </nav>
  )
}

function PromiseDrawing({ index }: { index: number }) {
  return (
    <svg className="promise-drawing" viewBox="0 0 240 100" fill="none" aria-hidden="true">
      {index === 0 ? (
        <>
          <path className="promise-drawing__guide" d="M0 50H240M120 0V100" />
          <circle className="promise-drawing__orbit" cx="120" cy="50" r="39" />
          <path className="promise-drawing__stroke" pathLength="1" d="M18 73L72 26L120 50L168 26L222 73" />
          <circle className="promise-drawing__node" cx="120" cy="50" r="10" />
          <circle className="promise-drawing__node" cx="18" cy="73" r="4" />
          <circle className="promise-drawing__node" cx="222" cy="73" r="4" />
        </>
      ) : index === 1 ? (
        <>
          <path className="promise-drawing__guide" d="M0 84H240M40 0V100M120 0V100M200 0V100" />
          <path className="promise-drawing__stroke" pathLength="1" d="M16 82V61H85V41H154V20H222" />
          <path className="promise-drawing__orbit" d="M16 93V72H85V52H154V31H222" />
          <circle className="promise-drawing__node" cx="85" cy="61" r="5" />
          <circle className="promise-drawing__node" cx="154" cy="41" r="5" />
          <circle className="promise-drawing__node" cx="222" cy="20" r="5" />
        </>
      ) : (
        <>
          <path className="promise-drawing__guide" d="M0 50H240M120 0V100" />
          <path className="promise-drawing__orbit" d="M24 18H89V82H24ZM151 18H216V82H151Z" />
          <path className="promise-drawing__stroke" pathLength="1" d="M44 50L57 63L80 35M89 50H151M171 50L184 63L207 35" />
          <circle className="promise-drawing__node" cx="120" cy="50" r="6" />
        </>
      )}
    </svg>
  )
}

export function ApproachPage() {
  useRouteMeta('/approach')
  const audit = useSiteAudit()
  const root = useRef<HTMLDivElement>(null)
  const reducedMotion = useReducedMotion()

  useGSAP(() => {
    if (reducedMotion) return
    gsap.from('.approach-intro__copy > *, .first-check', {
      y: 22, opacity: 0, duration: 0.8, stagger: 0.08, ease: 'power3.out',
    })
    gsap.utils.toArray<HTMLElement>('.approach-promise').forEach((promise, index) => {
      const timeline = gsap.timeline({
        scrollTrigger: { trigger: promise, start: 'top 92%', end: 'center 48%', scrub: 0.45 },
      })
      timeline.fromTo(promise, { '--promise-fill': 0 }, { '--promise-fill': 1, duration: 1 }, 0)
        .fromTo(promise.querySelector('.promise-drawing__stroke'),
          { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.85 }, index * 0.12)
        .fromTo(promise.querySelectorAll('.promise-drawing__node'),
          { scale: 0.25, transformOrigin: 'center', opacity: 0.3 },
          { scale: 1, opacity: 1, stagger: 0.1, duration: 0.5 }, 0.2)
        .fromTo(promise.querySelector('.promise-drawing__orbit'),
          { x: -12 }, { x: 0, duration: 1 }, 0)
    })
    const chapters = gsap.utils.toArray<HTMLElement>('.approach-chapter')
    const intro = root.current?.querySelector('.approach-intro')
    let stackMotion: gsap.Context | undefined
    let frame = 0
    const syncLayout = () => {
      const element = root.current
      if (!element) return
      const headerHeight = parseFloat(getComputedStyle(element).getPropertyValue('--site-header-height'))
      const fits = window.innerWidth >= 960 && chapters.every(chapter => chapter.offsetHeight <= window.innerHeight - headerHeight - 24)
      const changed = (element.dataset.stacked === 'true') !== fits
      element.dataset.stacked = String(fits)
      if (changed) {
        stackMotion?.revert()
        stackMotion = fits ? gsap.context(() => {
          chapters.forEach((chapter, index) => {
            const previous = index === 0
              ? root.current?.querySelector('.approach-promises__inner')
              : chapters[index - 1].querySelector('.approach-chapter__inner')
            gsap.fromTo(chapter.querySelector('.chapter-art'), { y: 65, rotate: 4 }, {
              y: 0, rotate: 0, ease: 'none',
              scrollTrigger: { trigger: chapter.previousElementSibling, start: 'top bottom', end: 'top 22%', scrub: 0.6 },
            })
            if (previous) gsap.to(previous, {
              y: -40, scale: 0.97, opacity: 0.45, transformOrigin: 'center top', ease: 'none',
              scrollTrigger: { trigger: chapter.previousElementSibling, start: 'top 65%', end: 'top 12%', scrub: 0.5 },
            })
          })
        }, root) : undefined
      }
      ScrollTrigger.refresh(true)
    }
    const scheduleLayout = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(syncLayout)
    }
    // Both audit status and the live layout demonstration can change height.
    // Measure actual content, so short screens and larger text never clip.
    const observer = new ResizeObserver(scheduleLayout)
    if (intro) observer.observe(intro)
    chapters.forEach(chapter => observer.observe(chapter))
    window.addEventListener('resize', scheduleLayout)
    scheduleLayout()
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', scheduleLayout)
      cancelAnimationFrame(frame)
      stackMotion?.revert()
      if (root.current) delete root.current.dataset.stacked
    }
  }, { scope: root, dependencies: [reducedMotion], revertOnUpdate: true })

  return (
    <div className="approach-experience" ref={root}>
      <section className="approach-intro" id="approach-start" aria-labelledby="approach-heading">
        <div className="container">
          <div className="approach-intro__grid">
            <div className="approach-intro__copy">
              <p className="eyebrow">The approach / 3 clear steps</p>
              <h1 id="approach-heading">Map the work.<br />Build the <span className="accent-serif">system.</span></h1>
              <p className="approach-intro__lead">We start with the gaps: where enquiries arrive, who follows up, and where work stalls. Together we map the tools, handoffs, and information involved before deciding what to adapt, connect, or build.</p>
              <a className="approach-intro__scroll" href="/contact">Discuss your workflow <span aria-hidden="true">↗</span></a>
            </div>
            <div className="first-check">
              <div className="first-check__eyebrow"><span>Optional / Website check</span><span className="first-check__free">Free · No signup</span></div>
              <h2>Check your <span className="accent-serif">front door.</span></h2>
              <p>If your website is part of the problem, see how it loads on a simulated phone. This checks the public page; understanding your CRM and internal workflow starts with a conversation.</p>
              <SiteAudit compact state={audit} continueTo="approach-stages" reportId="audit-report" />
            </div>
          </div>
          <CheckpointNav current={0} />
        </div>
      </section>
      <div className="approach-sequence" id="approach-stages">
        <section className="approach-promises" aria-label="What you can count on">
          <div className="container approach-promises__inner">
            <div className="approach-promises__heading"><p className="eyebrow">A few things stay constant</p><span>Clarity, at every step.</span></div>
            <ul className="approach-promises__grid">
              {approachAssurances.map((item, index) => (
                <li className="approach-promise" key={item.title}>
                  <div className="approach-promise__visual"><span>0{index + 1}</span><PromiseDrawing index={index} /></div>
                  <h2>{item.title}</h2>
                  <p>{item.body}</p>
                </li>
              ))}
            </ul>
            <div className="approach-promises__next"><span>From a first look to a working build</span><span aria-hidden="true">↓</span></div>
          </div>
        </section>
        {approachStages.map((stage, index) => (
          <Fragment key={stage.index}>
            <div className="checkpoint-marker" id={checkpoints[index + 1].id} />
            <section
              className={`approach-chapter approach-chapter--${index + 2}`}
              aria-labelledby={`chapter-title-${stage.index}`}
              onFocusCapture={(event) => {
                // Shift-Tab can reach a link in a covered sticky panel.
                // Restore that panel before letting focus become invisible.
                if (root.current?.dataset.stacked !== 'true' || !event.target.matches(':focus-visible')) return
                const marker = document.getElementById(checkpoints[index + 1].id)
                if (marker && marker.getBoundingClientRect().top < 0) {
                  marker.scrollIntoView({ behavior: 'instant', block: 'start' })
                }
              }}
            >
              <div className="container">
                <CheckpointNav current={index + 1} />
                <div className="approach-chapter__inner">
                  <div className="approach-chapter__copy">
                    <p className="approach-chapter__kicker">{index === 0 ? 'From insight to a working system' : 'From working build to what’s next'}</p>
                    <h2 id={`chapter-title-${stage.index}`}>{index === 0 ? <>Build around <span className="accent-serif">the work.</span></> : <>Support the <span className="accent-serif">next step.</span></>}</h2>
                    <p className="approach-chapter__summary">{stage.summary}</p>
                    <dl className="approach-chapter__fields">
                      {stage.fields.map((field) => (
                        <div key={field.label}><dt>{field.label}</dt><dd>{field.body}</dd></div>
                      ))}
                    </dl>
                  </div>
                  <div className="chapter-art">
                    <div className="chapter-art__heading"><span className="chapter-art__number" aria-hidden="true">{stage.index}</span><span>{index === 0 ? 'Review as it takes shape.' : 'Launch with a clear handover.'}</span></div>
                    <StageWorkbench compact variant={index === 0 ? 'structure' : 'launch'} />
                    <div className="chapter-art__footer"><span>{index === 0 ? 'Workflow → Scope → Build' : 'Test → Handover → Support'}</span><span aria-hidden="true">↗</span></div>
                  </div>
                </div>
                <div className="approach-chapter__next">
                  <span>{index === 0 ? 'Next / Put it into the world' : audit.status === 'idle' ? 'The process is clear. Choose your starting point.' : 'Next / Your first findings'}</span>
                  <a href={index === 0 ? '#approach-launch' : '#approach-findings'} aria-label={index === 0 ? 'Continue to launch' : 'Continue to findings and next steps'}>↓</a>
                </div>
              </div>
            </section>
          </Fragment>
        ))}
      </div>
      <div id="approach-findings">
        <AuditReport state={audit} id="audit-report" />
        <ApproachDetails />
      </div>
      <AuditPill key={audit.lastRun} state={audit} targetId="audit-report" />
    </div>
  )
}
