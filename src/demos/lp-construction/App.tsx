import { findPage, findService } from './content'
import { LangContext } from './lang'
import { AreaPage, HomePage, RequestPage, ServicePage, ServicesPage, WorkPage } from './Pages'
import type { Language } from './request/types'
import './site.css'

function Page({ slug }: { slug: string }) {
  const page = findPage(slug)
  const service = page?.service ? findService(page.service) : undefined
  if (service) return <ServicePage service={service} />
  switch (page?.kind) {
    case 'services': return <ServicesPage />
    case 'area': return <AreaPage />
    case 'work': return <WorkPage />
    case 'request': return <RequestPage />
    default: return <HomePage />
  }
}

/** One component tree for every page; `slug` is the path below BASE (or BASE/es). */
export default function App({ slug, lang }: { slug: string; lang: Language }) {
  return <LangContext.Provider value={lang}><Page slug={slug} /></LangContext.Provider>
}
