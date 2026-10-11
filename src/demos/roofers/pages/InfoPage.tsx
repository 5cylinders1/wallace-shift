import { useRef, type ReactNode } from 'react'
import type { PageId } from '../routes'
import { useReveal } from '../useReveal'
import { HeadingBase } from '../components/Heading'
import { Insurance } from '../components/Insurance'
import { Prices } from '../components/Cost'
import { Warranty } from '../components/Warranty'
import { DuringTheJob } from '../components/DuringTheJob'
import { Faq } from '../components/Faq'
import { NextStep } from '../components/NextStep'
import { SiteFooter } from '../components/SiteFooter'
import { MobileActionBar } from '../components/MobileActionBar'

export type InfoPageId = Exclude<PageId, 'home'>

/** Each deeper page: the section that names it, leading (its title the page's h1), then any related ones. */
const CONTENT: Record<InfoPageId, { lead: ReactNode; more?: ReactNode }> = {
  insurance: { lead: <Insurance /> },
  prices: { lead: <Prices /> },
  warranty: { lead: <Warranty />, more: <DuringTheJob /> },
  faq: { lead: <Faq /> },
}

export function InfoPage({ page }: { page: InfoPageId }) {
  const mainRef = useRef<HTMLElement>(null)
  useReveal(mainRef)
  const { lead, more } = CONTENT[page]

  return (
    <>
      <main id="main" ref={mainRef} className="rf-page">
        <HeadingBase level={1}>{lead}</HeadingBase>
        {more}
        <NextStep page={page} />
      </main>
      <SiteFooter />
      <MobileActionBar />
    </>
  )
}
