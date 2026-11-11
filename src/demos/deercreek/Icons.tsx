import type { ReactNode } from 'react'
import type { ServiceSlug } from './content'

/** Decorative line icons. Every use sits next to visible text, so they are
 * hidden from assistive technology. */
function Svg({ children, size = 28, className }: { children: ReactNode; size?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {children}
    </svg>
  )
}

const serviceIcons: Record<ServiceSlug, ReactNode> = {
  'water-heaters': <><rect x="9" y="4" width="14" height="22" rx="4" /><path d="M13 26v2M19 26v2M12 4V2M20 4V2" /><path className="dc-icon-flame" d="M16 21c-2 0-3-1.3-3-2.8 0-1.8 1.6-2.6 2.2-4.2.9 1 3.8 2.3 3.8 4.4 0 1.5-1.1 2.6-3 2.6Z" /></>,
  'drain-cleaning': <><circle cx="16" cy="16" r="11" /><circle cx="16" cy="16" r="4" /><path d="M16 5v7M16 20v7M5 16h7M20 16h7" /></>,
  'sewer-line-repair': <><path d="M3 11h9a4 4 0 0 1 4 4v3a4 4 0 0 0 4 4h9" /><path d="M3 17h9M20 16h9" /><path d="M8 8v6M24 19v6" /></>,
  'sump-pumps': <><path d="M6 12v14h20V12" /><rect x="12" y="15" width="8" height="8" rx="2" /><path d="M16 15V6h8" /><path className="dc-icon-drop" d="M26 8.5c0 1.1-.9 2-2 2" /><path d="M6 19c2.5-1.5 4-1.5 6 0M20 19c2-1.5 3.5-1.5 6 0" /></>,
  'leak-repair': <><path d="M4 9h10a3 3 0 0 1 3 3v1" /><path d="M4 5v8M17 13h3" /><path className="dc-icon-drop" d="M18.5 19.5c0 2.2 1.6 4 3.5 4s3.5-1.8 3.5-4c0-2.6-3.5-6.5-3.5-6.5s-3.5 3.9-3.5 6.5Z" /></>,
  'toilet-repair': <><path d="M8 4h9v9H8z" /><path d="M6 13h18c0 5-3.6 8.2-8 8.8V27h-6v-5.6C7.6 20.4 6 17 6 13Z" /></>,
  'gas-lines': <><path d="M3 22h10M19 22h10" /><rect x="13" y="18" width="6" height="8" rx="1" /><path className="dc-icon-flame" d="M16 14c-2.6 0-4-1.7-4-3.7 0-2.4 2.1-3.4 2.9-5.6 1.1 1.3 5.1 3.1 5.1 5.8 0 2-1.5 3.5-4 3.5Z" /></>,
  'radiant-heat-boilers': <><path d="M4 26h24" /><path d="M7 26c0-3 3-3 3-6s-3-3-3-6 3-3 3-6" /><path d="M16 26c0-3 3-3 3-6s-3-3-3-6 3-3 3-6" /><path d="M25 26c0-3-3-3-3-6" /></>,
  'remodels-new-construction': <><path d="M4 27V13l12-9 12 9v14" /><path d="M10 27v-8h6v8" /><path d="M20 17h4v4h-4z" /></>,
  'commercial-plumbing': <><path d="M5 27V6h13v21M18 12h9v15" /><path d="M9 10h2M13 10h2M9 15h2M13 15h2M9 20h2M13 20h2M22 16h2M22 21h2" /><path d="M3 27h26" /></>,
}

export function ServiceIcon({ slug, size }: { slug: ServiceSlug; size?: number }) {
  return <Svg size={size} className="dc-service-icon">{serviceIcons[slug]}</Svg>
}

export const PhoneIcon = ({ size = 20 }: { size?: number }) => (
  <Svg size={size}><path d="M9 4h4l2 6-3 2a15 15 0 0 0 8 8l2-3 6 2v4a3 3 0 0 1-3 3C14 26 6 18 6 7a3 3 0 0 1 3-3Z" /></Svg>
)
export const CalendarIcon = ({ size = 20 }: { size?: number }) => (
  <Svg size={size}><rect x="4" y="6" width="24" height="22" rx="3" /><path d="M4 12h24M10 3v6M22 3v6" /><path d="M10 18h3M16 18h3M10 23h3" /></Svg>
)
export const ChatIcon = ({ size = 20 }: { size?: number }) => (
  <Svg size={size}><path d="M5 7a3 3 0 0 1 3-3h16a3 3 0 0 1 3 3v11a3 3 0 0 1-3 3H13l-6 5v-5H8a3 3 0 0 1-3-3Z" /></Svg>
)
export const ArrowIcon = ({ size = 20 }: { size?: number }) => (
  <Svg size={size} className="dc-arrow"><path d="M6 16h20M19 9l7 7-7 7" /></Svg>
)
export const CheckIcon = ({ size = 20 }: { size?: number }) => (
  <Svg size={size}><path d="m6 16.5 6.5 6.5L26 9" /></Svg>
)
export const PinIcon = ({ size = 20 }: { size?: number }) => (
  <Svg size={size}><path d="M16 29s9-8.4 9-16a9 9 0 0 0-18 0c0 7.6 9 16 9 16Z" /><circle cx="16" cy="13" r="3.2" /></Svg>
)
export const ClockIcon = ({ size = 20 }: { size?: number }) => (
  <Svg size={size}><circle cx="16" cy="16" r="12" /><path d="M16 9v7l5 3" /></Svg>
)
export const ShieldIcon = ({ size = 20 }: { size?: number }) => (
  <Svg size={size}><path d="M16 3 5 7v8c0 7 4.8 11.6 11 14 6.2-2.4 11-7 11-14V7Z" /><path d="m11 16 3.5 3.5L21 13" /></Svg>
)
export const AlertIcon = ({ size = 20 }: { size?: number }) => (
  <Svg size={size}><path d="M16 4 2.5 27h27Z" /><path d="M16 13v6M16 23v.5" /></Svg>
)
export const SlidersIcon = ({ size = 20 }: { size?: number }) => (
  <Svg size={size}><path d="M5 9h12M23 9h4M5 23h4M15 23h12" /><circle cx="20" cy="9" r="3" /><circle cx="12" cy="23" r="3" /></Svg>
)
export const MenuIcon = ({ open }: { open: boolean }) => (
  <Svg size={24}>{open ? <path d="M8 8l16 16M24 8 8 24" /> : <path d="M5 9h22M5 16h22M5 23h22" />}</Svg>
)

export function Stars({ count = 5, label }: { count?: number; label?: string }) {
  return (
    <span className="dc-stars" role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      {Array.from({ length: 5 }, (_, index) => (
        <svg key={index} viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" focusable="false" className={index < count ? 'is-on' : 'is-off'}>
          <path d="M10 1.8 12.5 7l5.7.6-4.3 3.9 1.2 5.6L10 14.3l-5.1 2.8 1.2-5.6L1.8 7.6 7.5 7Z" />
        </svg>
      ))}
    </span>
  )
}
