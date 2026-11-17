import { business } from '../content/siteConfig'

export function PhoneLink({ className = '' }: { className?: string }) {
  return (
    <a
      className={`ws-phone-link ${className}`.trim()}
      href={`tel:${business.phone.number}`}
      aria-label={`Call Wallace Shift at ${business.phone.display}`}
    >
      <span className="ws-phone-link__label">Call</span>
      <span className="ws-phone-link__number">{business.phone.display}</span>
    </a>
  )
}
