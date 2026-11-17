import { useRef, useState, type KeyboardEvent } from 'react'
import { PhoneHands, PhoneGrip, TeamPortrait } from './JourneyArtwork'
import './inquiry-journey.css'

const steps = [
  { short: 'Capture', title: 'Capture the request.', text: 'A customer describes the job on their phone. Their details become one inquiry your team can act on.', scope: 'Inquiry capture in both packages', action: 'Send the sample request' },
  { short: 'Next step', title: 'Give the inquiry a next step.', text: 'A confirmation lets the customer know their request arrived. An agreed follow up can keep the conversation moving.', scope: 'One automatic workflow in the $1,500 package', action: 'Show a customer reply' },
  { short: 'Your team', title: 'Put it in the right hands.', text: 'The request and any replies reach the agreed inbox, ready for your team to continue the conversation.', scope: 'An agreed inquiry destination in both packages', action: 'Replay the example' },
]

function JourneyIcon({ kind }: { kind: 'arrow' | 'check' | 'envelope' | 'reply' }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {kind === 'arrow' && <path d="M4 12h16m-6-6 6 6-6 6" />}
    {kind === 'check' && <path d="m5 12 4 4L19 6" />}
    {kind === 'envelope' && <><rect x="3" y="5" width="18" height="14" rx="3" /><path d="m4 7 8 6 8-6" /></>}
    {kind === 'reply' && <path d="m9 5-6 6 6 6M3 11h9c5 0 8 3 8 8" />}
  </svg>
}

function CustomerPhone({ sent }: { sent: boolean }) {
  return <div className="ij-customer">
    <div className="ij-phone-art">
      <PhoneHands />
      <div className="ij-phone">
        <div className="ij-phone-camera" aria-hidden="true" />
        <div className="ij-phone-screen">
          <div className="ij-phone-brand"><svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="m2 10 8-7 8 7M5 9v8h10V9M8 17v-5h4v5" /></svg>Northvane Roofing</div>
          <span className="ij-phone-eyebrow">ROOF REPAIR REQUEST</span>
          <strong className="ij-phone-title">A little detail.<br />A clearer next step.</strong>
          <dl className="ij-phone-fields"><div><dt>What needs attention?</dt><dd>Water around a skylight</dd></div><div><dt>Location</dt><dd>Kansas City</dd></div><div><dt>Preferred contact</dt><dd>Email</dd></div></dl>
          <div className="ij-phone-send"><JourneyIcon kind="check" />{sent ? 'Sample request captured' : 'Sample form completed'}</div>
        </div>
      </div>
      <PhoneGrip />
    </div>
    <p className="ij-station-label">The customer<span>A completed form on their phone</span></p>
  </div>
}

function InquiryRecord({ stage }: { stage: number }) {
  return <div className="ij-record-station">
    <div className="ij-record">
      <span className="ij-record-icon"><JourneyIcon kind="envelope" /></span>
      <div className="ij-record-status">{stage === 0 ? 'THE INQUIRY' : stage === 1 ? 'REQUEST RECEIVED' : 'CONVERSATION READY'}</div>
      <strong>Water around<br />a skylight</strong>
      <p>Kansas City <span aria-hidden="true">·</span> Email</p>
      <span className="ij-record-tag"><JourneyIcon kind={stage === 0 ? 'arrow' : 'check'} />{stage === 0 ? 'Ready for its next step' : stage === 1 ? 'Confirmation prepared' : 'Request and reply together'}</span>
    </div>
    <div className="ij-email-example" key={stage}>
      <span>{stage === 0 ? 'WITH AUTOMATIC FOLLOW UP' : stage === 1 ? 'EXAMPLE CONFIRMATION EMAIL' : 'EXAMPLE CUSTOMER REPLY'}</span>
      <p>{stage === 0 ? 'A clear acknowledgement, then a follow up at the agreed time.' : stage === 1 ? '“Thanks for getting in touch. We have your roof repair request.”' : '“Yes, I would like to arrange a visit.”'}</p>
      {stage === 1 && <small>If there is no reply, a follow up can run at the agreed time.</small>}
    </div>
  </div>
}

function TeamDestination({ stage }: { stage: number }) {
  const arrived = stage > 0
  return <div className="ij-team">
    <div className="ij-team-portrait"><TeamPortrait /><span className="ij-team-badge"><JourneyIcon kind={arrived ? 'check' : 'envelope'} /></span></div>
    <p className="ij-station-label">Your roofing team<span>The agreed person or inbox</span></p>
    <div className={`ij-inbox ${arrived ? 'has-arrived' : ''}`}>
      <div className="ij-inbox-header"><JourneyIcon kind="envelope" /><span>Example team inbox</span></div>
      <strong>{stage === 2 ? 'Roof repair inquiry + reply' : arrived ? 'Roof repair inquiry received' : 'Ready for the request'}</strong>
      <p>{arrived ? 'Water around a skylight' : 'Project details and contact preference, together.'}</p>
      {arrived && <p>Kansas City · Email</p>}
      {stage === 2 && <blockquote className="ij-received-reply">“Yes, I would like to arrange a visit.”</blockquote>}
      {arrived && <span className="ij-human-note"><JourneyIcon kind="check" />{stage === 2 ? 'Your team continues the conversation' : 'Already available to your team'}</span>}
    </div>
  </div>
}

export default function InquiryJourney() {
  const [stage, setStage] = useState(0)
  const [motion, setMotion] = useState(false)
  const [run, setRun] = useState(0)
  const advanceRef = useRef<HTMLButtonElement>(null)
  const current = steps[stage]
  const choose = (next: number) => { setMotion(next > stage); setStage(next); setRun(value => value + 1) }
  const onStepKey = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next: number | undefined
    if (event.key === 'ArrowRight') next = (index + 1) % steps.length
    if (event.key === 'ArrowLeft') next = (index + steps.length - 1) % steps.length
    if (event.key === 'Home') next = 0
    if (event.key === 'End') next = steps.length - 1
    if (next !== undefined) { event.preventDefault(); choose(next); document.getElementById(`inquiry-step-${next}`)?.focus({ preventScroll: true }) }
  }
  return <section className="r-section r-light ij-section" id="work" aria-labelledby="inquiry-heading">
    <div className="r-wrap">
      <div className="r-section-head"><h2 id="inquiry-heading">The website is the start.<br /><em>Here is what comes next.</em></h2><p>From a customer’s phone to a conversation with your team. Follow one roof repair request.</p></div>
      <div className="ij-demo">
        <div className="ij-steps" role="tablist" aria-label="Explore the inquiry journey">{steps.map((step, index) => <button key={step.short} id={`inquiry-step-${index}`} type="button" role="tab" aria-selected={stage === index} aria-controls="inquiry-story" aria-label={`${index + 1}. ${step.title}`} tabIndex={stage === index ? 0 : -1} onClick={() => choose(index)} onKeyDown={event => onStepKey(event, index)}><span className="ij-step-number">{index + 1}</span><span className="ij-step-full">{step.title}</span><span className="ij-step-short" aria-hidden="true">{step.short}</span></button>)}</div>
        <div id="inquiry-story" className={`ij-story ij-stage-${stage} ${motion ? 'ij-motion' : ''}`} role="tabpanel" aria-labelledby={`inquiry-step-${stage}`}>
          <div className="ij-caption">
            <div><span className="ij-scope">{current.scope}</span><h3>{current.title}</h3></div>
            <button ref={advanceRef} className="m-button ij-advance" type="button" onClick={() => { choose((stage + 1) % 3); advanceRef.current?.focus({ preventScroll: true }) }}>{current.action}<JourneyIcon kind={stage === 2 ? 'reply' : 'arrow'} /></button>
          </div>
          <div className="ij-scene">
            <div className="ij-scene-note">ILLUSTRATIVE EMAIL WORKFLOW<span>Nothing is collected or sent</span></div>
            <svg className="ij-route" viewBox="0 0 1000 400" preserveAspectRatio="none" fill="none" aria-hidden="true"><path className="ij-route-base" d="M180 225H300Q330 225 330 195V165Q330 135 360 135H640Q670 135 670 165V195Q670 225 700 225H820" /><path className="ij-route-progress" d="M180 225H300Q330 225 330 195V165Q330 135 360 135H640Q670 135 670 165V195Q670 225 700 225H820" pathLength="100" /><g key={run} className="ij-traveler"><rect x="-22" y="-17" width="44" height="34" rx="9" fill="#175c99" /><path d="m-12-5 12 9 12-9M-12-6v14h24V-6Z" stroke="white" strokeWidth="1.5" /></g></svg>
            <CustomerPhone sent={stage > 0} />
            <InquiryRecord stage={stage} />
            <TeamDestination stage={stage} />
          </div>
          <div className="ij-explanation"><p>{current.text}</p>{stage === 2 && <p className="ij-stop-note">A reply stops this sample sequence. The team already has the original inquiry.</p>}</div>
        </div>
        <p className="ij-package-note"><strong>Website package?</strong> The inquiry goes straight to your agreed inbox for your team to reply. The $1,500 setup adds one agreed automatic workflow. Channels, timing and stop conditions are scoped before setup.</p>
        <span className="p-visually-hidden" role="status">Step {stage + 1} of 3. {current.title}</span>
      </div>
    </div>
  </section>
}
