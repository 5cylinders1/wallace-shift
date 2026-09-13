import type { Ref } from 'react'
import { brandStatement } from '../../content/siteConfig'

type BrandStatementContentProps = {
  headlineRef?: Ref<HTMLDivElement>
  bodyRef?: Ref<HTMLParagraphElement>
  headingId?: string
}

export function BrandStatementContent({ headlineRef, bodyRef, headingId }: BrandStatementContentProps) {
  const headline = (
    <h2 className="shift-wipe__headline" id={headingId}>
      <span className="shift-wipe__line">
        From <span className="shift-wipe__word">overlooked</span> to
      </span>
      <span className="shift-wipe__line">unforgettable.</span>
    </h2>
  )

  return (
    <>
      {headlineRef ? (
        <div className="shift-wipe__headline-wrap" ref={headlineRef}>
          {headline}
        </div>
      ) : headline}
      <p className="shift-wipe__body" ref={bodyRef}>
        {brandStatement.body}
      </p>
    </>
  )
}
