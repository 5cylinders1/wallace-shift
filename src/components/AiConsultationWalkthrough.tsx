import { useEffect, useRef, useState } from 'react'
import { aiConsultation } from '../content/aiConsultation'
import { aiPackages, type AiPackageId } from '../content/aiOffer'
import { aiSubscriptionOffer, type AiSubscriptionInterval } from '../content/aiSubscriptionOffer'
import { AiSubscriptionPlanChoices } from './AiSubscriptionPlanChoices'
import type { AiOpportunityFormValues } from '../lib/aiOpportunityAdapter'
import './AiConsultationWalkthrough.css'

export function AiConsultationWalkthrough({ onChoosePackage, completedVideoSrc, onVideoComplete, interval, onIntervalChange }: {
  values: AiOpportunityFormValues
  onChoosePackage: (packageId: AiPackageId, interval: AiSubscriptionInterval) => void
  interval: AiSubscriptionInterval
  onIntervalChange: (interval: AiSubscriptionInterval) => void
  completedVideoSrc: string | null
  onVideoComplete: (src: string) => void
}) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  const offersRef = useRef<HTMLHeadingElement>(null)
  const playerRef = useRef<HTMLVideoElement>(null)
  const [failedSource, setFailedSource] = useState<string | null>(null)
  const video = aiConsultation.walkthrough
  const completed = Boolean(video.src && completedVideoSrc === video.src)
  const offer = aiPackages.assistant

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
      {!completed && <p className="qf-walkthrough-note">After the video, explore a free month of an AI chatbot and phone agent for your business.</p>}
    </div> : <div className="qf-walkthrough-placeholder">
      <h2>Video coming soon</h2>
      <p>Bring one task your team repeats every week. During the consultation, we’ll estimate what it costs and explore where AI could save you time.</p>
    </div>}

    {completed && <section className="qf-walkthrough-offers" aria-labelledby="qf-walkthrough-offers-title">
      <header>
        <h2 id="qf-walkthrough-offers-title" ref={offersRef} tabIndex={-1}>One free month. Two ways to help customers.</h2>
        <p>Answer questions on your website and handle incoming calls with one AI chatbot and phone agent bundle.</p>
      </header>
      <div className="qf-walkthrough-package-list">
        <article className="qf-walkthrough-package qf-walkthrough-package--subscription">
          <div>
            <h3>{offer.name}</h3>
            <p>{offer.description}</p>
            <ul>{offer.scope.map(scope => <li key={scope}>{scope}</li>)}</ul>
            <details><summary>What is included and how the free month works</summary>
              <p>{aiSubscriptionOffer.trialNotice}</p>
              <p>The trial includes {aiSubscriptionOffer.trialPhoneMinutes} phone minutes and {aiSubscriptionOffer.trialChatReplies} AI chat replies. There are no trial usage charges. At either limit, that service pauses for the rest of the trial.</p>
              <p>Paid service includes {aiSubscriptionOffer.monthlyPhoneMinutes} phone minutes and {aiSubscriptionOffer.monthlyChatReplies.toLocaleString('en-US')} AI chat replies per service month. Allowances reset on monthly service anniversaries at 14:00 UTC and do not roll over.</p>
              <p>{aiSubscriptionOffer.phoneUsageNotice}</p>
              <p>{aiSubscriptionOffer.extraPhoneNotice} At the included limit, the affected service pauses until the allowance resets or, for paid phone service, you buy extra minutes.</p>
              <p>{offer.boundary}</p><p>{offer.delivery}</p>
            </details>
          </div>
          <div className="qf-walkthrough-purchase qf-subscription-purchase">
            <p className="qf-subscription-trial"><strong>$0 for your first month</strong><span>{aiSubscriptionOffer.trialPhoneMinutes} phone minutes and {aiSubscriptionOffer.trialChatReplies} AI replies included. Each AI call is limited to {aiSubscriptionOffer.maxPhoneCallMinutes} minutes. No charge when you request setup.</span></p>
            <AiSubscriptionPlanChoices value={interval} onChange={onIntervalChange} name="offer-interval" />
            <button className="ao-button" type="button" onClick={() => onChoosePackage(offer.id, interval)}>Request free month</button>
            <p className="qf-subscription-activation-note">We prepare both services first. A payment card and your authorization are required before the free month starts. You will review your exact trial end and first charge time in UTC before activating.</p>
          </div>
        </article>
      </div>
      <p className="qf-walkthrough-note">{aiSubscriptionOffer.renewalNotice} {aiSubscriptionOffer.intervalChangeNotice} Applicable service taxes are included.</p>
      <p className="qf-walkthrough-note">{aiSubscriptionOffer.resultsNotice}</p>
      <p className="qf-walkthrough-cancellation"><strong>About your consultation:</strong> Requesting setup does not cancel your meeting. Use your booking confirmation if you no longer need the appointment.</p>
    </section>}

  </section>
}
