import { useEffect, useRef, useState } from 'react'
import { aiConsultation } from '../content/aiConsultation'
import { aiOffer, aiPackages, recommendAiOpportunity, type AiPackageId } from '../content/aiOffer'
import type { AiOpportunityFormValues } from '../lib/aiOpportunityAdapter'
import './AiConsultationWalkthrough.css'

export function AiConsultationWalkthrough({ values, onChoosePackage, completedVideoSrc, onVideoComplete }: {
  values: AiOpportunityFormValues
  onChoosePackage: (packageId: AiPackageId) => void
  completedVideoSrc: string | null
  onVideoComplete: (src: string) => void
}) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  const offersRef = useRef<HTMLHeadingElement>(null)
  const playerRef = useRef<HTMLVideoElement>(null)
  const [failedSource, setFailedSource] = useState<string | null>(null)
  const video = aiConsultation.walkthrough
  const completed = Boolean(video.src && completedVideoSrc === video.src)
  const suggested = recommendAiOpportunity(values).packageId

  useEffect(() => {
    const target = completed ? offersRef.current : headingRef.current
    target?.focus({ preventScroll: true })
    target?.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
  }, [completed])

  return <section className="qf-walkthrough" aria-labelledby="qf-walkthrough-title">
    <header className="qf-result-intro">
      <h1 id="qf-walkthrough-title" ref={headingRef} tabIndex={-1}><span className="qf-booked-label">Appointment confirmed</span>Your consultation walkthrough</h1>
      {video.src && <p>{video.description}</p>}
    </header>

    {video.src ? <div className="qf-walkthrough-player">
      <video
        ref={playerRef}
        key={video.src}
        controls
        playsInline
        poster={video.posterSrc}
        preload="metadata"
        aria-label={video.title}
        onError={() => setFailedSource(video.src)}
        onLoadedData={() => setFailedSource(null)}
        onEnded={event => {
          const player = event.currentTarget
          if (!video.src || !player.ended || !Number.isFinite(player.duration) || player.duration <= 0) return
          onVideoComplete(video.src)
        }}
      >
        <source src={video.src} onError={() => setFailedSource(video.src)} />
        {video.captionsSrc && <track kind="captions" src={video.captionsSrc} srcLang="en" label="English" default />}
        Your browser does not support this video.
      </video>
      {failedSource === video.src && <div className="ao-form__notice" role="alert">
        <p>The video could not load. Your consultation is still booked.</p>
        <button className="ao-button ao-button--secondary" type="button" onClick={() => { setFailedSource(null); playerRef.current?.load() }}>Retry video</button>
      </div>}
      {!completed && <p className="qf-walkthrough-note">After the video, you can explore packages to purchase online with a free business website included.</p>}
    </div> : <div className="qf-walkthrough-placeholder">
      <h2>Video coming soon</h2>
      <p>Bring one task your team repeats every week. During the consultation, we’ll estimate what it costs and explore where AI could save you time.</p>
    </div>}

    {completed && <section className="qf-walkthrough-offers" aria-labelledby="qf-walkthrough-offers-title">
      <header>
        <h2 id="qf-walkthrough-offers-title" ref={offersRef} tabIndex={-1}>Ready to start without a meeting?</h2>
        <p>Choose a package, review and sign the agreement, and pay online. Each package includes a free business website.</p>
      </header>
      <div className="qf-walkthrough-package-list">
        {Object.values(aiPackages).map(item => <article className="qf-walkthrough-package" key={item.id}>
          <div>
            <h3>{item.name}</h3>
            {suggested === item.id && <p className="qf-walkthrough-suggested">Suggested by your quiz answers</p>}
            <p>{item.description}</p>
            <ul>{item.scope.map(scope => <li key={scope}>{scope}</li>)}</ul>
            <details><summary>Scope, delivery, and separate costs</summary><p>{item.boundary}</p><p>{item.delivery}</p></details>
          </div>
          <div className="qf-walkthrough-purchase">
            <p><strong>${item.price.toLocaleString('en-US')}</strong><span>One time</span></p>
            <button className="ao-button" type="button" onClick={() => onChoosePackage(item.id)}>Buy {item.name}</button>
          </div>
        </article>)}
      </div>
      <p className="qf-walkthrough-note">The free website is included with a paid project of ${aiOffer.minimumProjectFee.toLocaleString('en-US')} or more. Website scope: {aiOffer.websiteScope.toLowerCase()}.</p>
      <p className="qf-walkthrough-cancellation"><strong>Prefer to skip the meeting?</strong> After purchasing, use your booking confirmation to cancel if you no longer need the appointment. Your meeting stays scheduled until you cancel it.</p>
    </section>}

  </section>
}
