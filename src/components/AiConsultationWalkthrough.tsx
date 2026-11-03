import { useEffect, useRef, useState } from 'react'
import { aiConsultation } from '../content/aiConsultation'
import { aiOffer, aiPackages, recommendAiOpportunity, type AiPackageId } from '../content/aiOffer'
import type { AiOpportunityFormValues } from '../lib/aiOpportunityAdapter'
import './AiConsultationWalkthrough.css'

export function AiConsultationWalkthrough({ values, onChoosePackage, onBackToBooking, completedVideoSrc, onVideoComplete }: {
  values: AiOpportunityFormValues
  onChoosePackage: (packageId: AiPackageId) => void
  onBackToBooking: () => void
  completedVideoSrc?: string | null
  onVideoComplete?: (src: string) => void
}) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  const offersRef = useRef<HTMLHeadingElement>(null)
  const [completedSource, setCompletedSource] = useState<string | null>(null)
  const [failedSource, setFailedSource] = useState<string | null>(null)
  const video = aiConsultation.walkthrough
  const completed = Boolean(video.src && failedSource !== video.src && (completedSource === video.src || completedVideoSrc === video.src))
  const suggested = recommendAiOpportunity(values).packageId

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true })
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [])
  useEffect(() => {
    if (!completed) return
    offersRef.current?.focus({ preventScroll: true })
    offersRef.current?.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
  }, [completed])

  return <section className="qf-walkthrough" aria-labelledby="qf-walkthrough-title">
    <header className="qf-result-intro">
      <h1 id="qf-walkthrough-title" ref={headingRef} tabIndex={-1}>Before we meet.</h1>
      <p>See how AI can help with slow replies, repetitive administration, and work that depends on the owner.</p>
    </header>

    {video.src ? <div className="qf-walkthrough-player">
      <video
        key={video.src}
        controls
        playsInline
        preload="metadata"
        aria-label="How AI can help with small business bottlenecks"
        onError={() => setFailedSource(video.src)}
        onLoadedData={() => setFailedSource(null)}
        onEnded={event => {
          const player = event.currentTarget
          if (!video.src || !player.ended || !Number.isFinite(player.duration) || player.duration <= 0) return
          setCompletedSource(video.src)
          onVideoComplete?.(video.src)
        }}
      >
        <source src={video.src} onError={() => setFailedSource(video.src)} />
        {video.captionsSrc && <track kind="captions" src={video.captionsSrc} srcLang="en" label="English" default />}
        Your browser does not support this video.
      </video>
      {failedSource === video.src && <p className="ao-form__notice" role="alert">The video could not load. Refresh the page to try again. You can still discuss these ideas in your consultation.</p>}
      {!completed && <p className="qf-walkthrough-note">After the video, you can explore packages to purchase online with a free business website included.</p>}
    </div> : <div className="qf-walkthrough-placeholder">
      <h2>The walkthrough is coming soon.</h2>
      <p>We are preparing a short video about common business bottlenecks, practical AI workflows, and how to estimate the time and money a repeated task costs.</p>
      <p>For now, bring one example of repetitive work to your consultation. We can walk through it together.</p>
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
      <p className="qf-walkthrough-cancellation"><strong>Prefer to skip the meeting?</strong> After purchasing, cancel your appointment using the link in Google’s confirmation email if you no longer need it. Purchasing a package does not cancel an appointment for you.</p>
    </section>}

    <div className="qf-walkthrough-back">
      <button className="ao-button ao-button--secondary" type="button" onClick={onBackToBooking}>Back to booking</button>
    </div>
  </section>
}
