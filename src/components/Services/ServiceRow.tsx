import { forwardRef } from 'react'
import type { ServiceItem } from '../../content/siteConfig'
import { serviceMedia } from '../../content/mediaAssets'
import { OutcomeField } from './OutcomeField'

interface ServiceRowProps {
  item: ServiceItem
  isActive: boolean
  reducedMotion: boolean
  isMobile: boolean
  onPointerEnter: () => void
  onPointerLeave: () => void
  onFocus: () => void
  onBlur: () => void
  onClick: () => void
}

export const ServiceRow = forwardRef<HTMLButtonElement, ServiceRowProps>(
  function ServiceRow(
    {
      item,
      isActive,
      reducedMotion,
      isMobile,
      onPointerEnter,
      onPointerLeave,
      onFocus,
      onBlur,
      onClick,
    },
    ref,
  ) {
    return (
      <button
        type="button"
        ref={ref}
        className={`service-row${isActive ? ' service-row--active' : ''}`}
        aria-pressed={isActive}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        onFocus={onFocus}
        onBlur={onBlur}
        onClick={onClick}
      >
        <span className="service-row__index">{item.index}</span>
        <span className="service-row__body">
          <span className="service-row__label">{item.label}</span>
          <span className="service-row__title">{item.title}</span>
          <span className="service-row__description">{item.description}</span>
        </span>

        <OutcomeField
          word={item.outcomeWord}
          isActive={isActive}
          reducedMotion={reducedMotion}
          isMobile={isMobile}
          media={serviceMedia[item.outcomeWord]}
        />
      </button>
    )
  },
)
