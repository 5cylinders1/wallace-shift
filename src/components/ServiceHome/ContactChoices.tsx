import { aiConsultation } from '../../content/aiConsultation'
import { business } from '../../content/siteConfig'
import './contact-choices.css'

type Props = {
  onRequestCall: () => void
  onBookMeeting: () => void
  selected?: 'phone' | 'meeting'
  context?: 'hero' | 'dialog'
  compact?: boolean
  /** Called with the option someone picked, for analytics. */
  onChoose?: (method: 'phone' | 'meeting' | 'direct') => void
}

function ChoiceIcon({ kind }: { kind: 'callback' | 'meeting' | 'phone' }) {
  return <svg className="contact-choice__icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {kind === 'meeting'
      ? <><rect x="3" y="6" width="12" height="12" rx="2" /><path d="m15 10 6-3v10l-6-3" /></>
      : <><path d="m5 3 4 1 1 4-2 2a14 14 0 0 0 6 6l2-2 4 1 1 4a2 2 0 0 1-2 2A18 18 0 0 1 3 5a2 2 0 0 1 2-2Z" />{kind === 'callback' && <path d="M15 3v6h6m-6 0 6-6" />}</>}
  </svg>
}

function ChoiceArrow({ selected = false }: { selected?: boolean }) {
  return <svg className="contact-choice__arrow" width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={selected ? 'm4 10 4 4 8-8' : 'M4 10h12m-5-5 5 5-5 5'} />
  </svg>
}

/** All three ways to talk stay visible; only the two on-page tasks select a mode. */
export default function ContactChoices({ onRequestCall, onBookMeeting, selected, context = 'hero', compact = false, onChoose }: Props) {
  return <div className={`contact-choices contact-choices--${context}${compact ? ' contact-choices--compact' : ''}`} role="group" aria-label="How would you like to talk?">
    <button type="button" className="contact-choice contact-choice--callback" aria-pressed={selected === undefined ? undefined : selected === 'phone'} aria-haspopup={context === 'hero' ? 'dialog' : undefined} onClick={() => { onChoose?.('phone'); onRequestCall() }}>
      <ChoiceIcon kind="callback" />
      <span className="contact-choice__copy"><span className="contact-choice__title">Request a call</span><span className="contact-choice__description">Leave your number. Matthew will call.</span></span>
      <ChoiceArrow selected={selected === 'phone'} />
    </button>
    <button type="button" className="contact-choice contact-choice--meeting" aria-pressed={selected === undefined ? undefined : selected === 'meeting'} aria-haspopup={context === 'hero' ? 'dialog' : undefined} onClick={() => { onChoose?.('meeting'); onBookMeeting() }}>
      <ChoiceIcon kind="meeting" />
      <span className="contact-choice__copy"><span className="contact-choice__title">Book a Google Meet</span><span className="contact-choice__description">Choose a time for a {aiConsultation.durationMinutes} minute video call.</span></span>
      <ChoiceArrow selected={selected === 'meeting'} />
    </button>
    <a className="contact-choice contact-choice--direct" href={`tel:${business.phone.number}`} onClick={() => onChoose?.('direct')} aria-label={`Call directly: ${business.phone.display}`}>
      <ChoiceIcon kind="phone" />
      <span className="contact-choice__copy"><span className="contact-choice__title">Call directly</span><span className="contact-choice__description contact-choice__number">{business.phone.display}</span></span>
      <ChoiceArrow />
    </a>
  </div>
}
