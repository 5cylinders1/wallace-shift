import type { Ref } from 'react'
import { brandStatement } from '../../content/siteConfig'

type BrandStatementContentProps = {
  headlineRef?: Ref<HTMLDivElement>
  bodyRef?: Ref<HTMLParagraphElement>
  headingId?: string
  decorative?: boolean
}

export function BrandStatementContent({ headlineRef, bodyRef, headingId, decorative = false }: BrandStatementContentProps) {
  const Heading = decorative ? 'div' : 'h2'
  const headline = (
    <Heading className="shift-wipe__headline" id={headingId}>
      <span className="shift-wipe__line">
        From <span className="shift-wipe__word">scattered</span> to
      </span>{' '}
      <span className="shift-wipe__line">connected.</span>
    </Heading>
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
