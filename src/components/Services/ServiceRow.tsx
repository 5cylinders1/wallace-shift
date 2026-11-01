import { forwardRef, useId } from 'react'
import type { ServiceItem } from '../../content/siteConfig'
import { serviceMedia, type AmbientMediaAsset } from '../../content/mediaAssets'
import { OutcomeField } from './OutcomeField'

interface ServiceRowProps {
  item: ServiceItem
  isActive: boolean
  reducedMotion: boolean
  isMobile: boolean
  media?: AmbientMediaAsset
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
      media,
      onPointerEnter,
      onPointerLeave,
      onFocus,
      onBlur,
      onClick,
    },
    ref,
  ) {
    const titleId = useId()
    const descriptionId = useId()

    return (
      <article className={`service-row${isActive ? ' service-row--active' : ''}`}>
        <button
          type="button"
          ref={ref}
          className="service-row__control"
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          aria-pressed={isActive}
          onPointerEnter={onPointerEnter}
          onPointerLeave={onPointerLeave}
          onFocus={onFocus}
          onBlur={onBlur}
          onClick={onClick}
        />
        <span className="service-row__index">{item.index}</span>
        <div className="service-row__body">
          <span className="service-row__label">{item.label}</span>
          <h3 className="service-row__title" id={titleId}>{item.title}</h3>
          <p className="service-row__description" id={descriptionId}>{item.description}</p>
        </div>

        <OutcomeField
          word={item.outcomeWord}
          isActive={isActive}
          reducedMotion={reducedMotion}
          isMobile={isMobile}
          media={media ?? serviceMedia[item.outcomeWord]}
        />
      </article>
    )
  },
)
