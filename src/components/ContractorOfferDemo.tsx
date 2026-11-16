import { useRef, useState } from 'react'
import { trackSiteEvent } from '../lib/analytics'

const websiteDemos = [
  { id: 'northvane', name: 'Roofing', title: 'Northvane Roofing', detail: 'See how a service, its materials and the next step can come together.', duration: '1:03' },
  { id: 'tambour', name: 'Kitchens', title: 'Tambour', detail: 'See a kitchen project take shape before the consultation request.', duration: '0:56' },
  { id: 'stillwater', name: 'Pools', title: 'Stillwater Pool Co.', detail: 'See a visual project story lead into a planning conversation.', duration: '0:51' },
] as const

export function WebsiteOfferDemo() {
  const [selected, setSelected] = useState(0)
  const [failed, setFailed] = useState(false)
  const tracked = useRef(new Set<string>())
  const demo = websiteDemos[selected]
  return <div className="co-website-demo">
    <div className="co-demo-choices" role="group" aria-label="Choose a website preview">
      {websiteDemos.map((item, index) => <button key={item.id} type="button" aria-pressed={selected === index} onClick={() => { setSelected(index); setFailed(false) }}>{item.name}</button>)}
    </div>
    <video key={demo.id} controls playsInline preload="none" poster={`/media/demo-previews/${demo.id}.jpg`} aria-label={`${demo.title} website preview`} onError={() => setFailed(true)} onPlaying={() => {
      if (tracked.current.has(demo.id)) return
      tracked.current.add(demo.id)
      trackSiteEvent({ name: 'contractor_offer_demo', value: 'website' })
    }}>
      <source src={`/media/demo-previews/${demo.id}.mp4`} type="video/mp4" />
      <track kind="captions" src={`/media/demo-previews/${demo.id}.vtt`} srcLang="en" label="English" />
      <a href={`/media/demo-previews/${demo.id}.mp4`}>Open the preview video</a>
    </video>
    <div className="co-demo-caption"><div><h3>{demo.title}</h3><p>{demo.detail}</p></div><span>{demo.duration} · With captions</span></div>
    {failed && <p role="alert" className="co-demo-error">The video could not load. <a href={`/media/demo-previews/${demo.id}.mp4`}>Open the preview directly</a> or try another preview.</p>}
    <p className="co-small">Fictional demo brands and illustrative project details. These previews show design ideas, including advanced features that are quoted separately.</p>
    <p className="co-media-credit">Music: <a href="https://www.scottbuckley.com.au/library/a-kind-of-hope/" target="_blank" rel="noreferrer">A Kind Of Hope by Scott Buckley</a>, <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a>. Edited excerpt with narration.</p>
  </div>
}

const demoSteps = [
  { label: 'Request captured', heading: 'The project reaches your team.', body: 'Service: Roof repair. Area: Kansas City. The customer wants to discuss a leak. Their request goes to your agreed inbox or tool.', note: 'Your team has the project details in one place.' },
  { label: 'Confirmation', heading: 'The customer knows it arrived.', body: 'Thanks for getting in touch about your roof repair. We have your request and will be in touch to discuss the project.', note: 'Example automatic email after the request.' },
  { label: 'Follow up', heading: 'There is a clear next step.', body: 'Are you still looking for help with your roof? Reply with a good time to talk and we can discuss the next step.', note: 'Example later message when there has been no reply. Timing is agreed with you.' },
  { label: 'Reply received', heading: 'The conversation moves to you.', body: 'The customer replies. Further scheduled follow up stops, and your team takes over the conversation.', note: 'Reply handling depends on the connected tool and is tested before launch.' },
] as const

export function FollowUpOfferDemo() {
  const [step, setStep] = useState<number | null>(null)
  const tracked = useRef(false)
  const current = step === null ? null : demoSteps[step]
  function advance() {
    if (!tracked.current) {
      tracked.current = true
      trackSiteEvent({ name: 'contractor_offer_demo', value: 'lead-follow-up' })
    }
    setStep(previous => previous === null ? 0 : Math.min(previous + 1, demoSteps.length - 1))
  }
  return <div className="co-workflow-demo">
    <div className="co-example-page">
      <span className="co-example-label">Sample contractor lead page</span>
      <img src="/media/demo-previews/northvane.jpg" alt="Roofing website concept with a modern house" width="1600" height="900" loading="lazy" />
      <h3>Let’s talk about your roof.</h3>
      <p>Tell us what needs attention. We’ll help you understand the next step.</p>
      <dl><div><dt>Service</dt><dd>Roof repair</dd></div><div><dt>Area</dt><dd>Kansas City</dd></div></dl>
      <button type="button" className="co-button" onClick={advance} disabled={step !== null}>Try a sample inquiry <Arrow /></button>
      <small>Illustration only. No personal details or messages are sent.</small>
    </div>
    <div className="co-example-workflow">
      <ol className="co-workflow-stages" aria-label="Follow up sequence">{demoSteps.map((item, index) => <li key={item.label} className={step !== null && index <= step ? 'is-reached' : ''} aria-current={index === step ? 'step' : undefined}><span aria-hidden="true">{index + 1}</span>{item.label}</li>)}</ol>
      <div className="co-workflow-result" aria-live="polite" aria-atomic="true">
        <h3>{current?.heading ?? 'Follow the request from start to reply.'}</h3>
        <p>{current?.body ?? 'Try the sample inquiry to see what a simple follow up workflow can do after someone fills out your lead page.'}</p>
        {current && <p className="co-small">{current.note}</p>}
      </div>
      {step !== null && <div className="co-demo-actions">
        {step < demoSteps.length - 1 && <button type="button" className="co-button" onClick={advance}>{step === 0 ? 'See the confirmation' : step === 1 ? 'See the follow up' : 'Simulate a reply'} <Arrow /></button>}
        <button type="button" className="co-text-button" onClick={() => setStep(null)}>Reset demo</button>
      </div>}
      <p className="co-small co-workflow-disclosure">This is an interactive illustration, not a live integration. Messages, timing, consent and stop conditions are agreed for your business before launch.</p>
    </div>
  </div>
}

export function Arrow() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M4 12h15M13 5l7 7-7 7" /></svg>
}
