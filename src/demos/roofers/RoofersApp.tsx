import type { ReactNode } from 'react'
import type { PageId } from './routes'
import { SiteHeader } from './components/SiteHeader'

/**
 * What every Northvane page shares: the skip link and the header. The page
 * itself (pages/) brings its main content, footer and phone action bar, so
 * each document loads only its own sections (main.tsx, info.tsx).
 */
export function RoofersApp({ page, children }: { page: PageId; children: ReactNode }) {
  return (
    <>
      <a className="rf-skip-link" href={page === 'home' ? '#estimator' : '#main'}>
        {page === 'home' ? 'Skip to the roof estimator' : 'Skip to content'}
      </a>
      <span id="top" />
      <SiteHeader page={page} />
      {children}
    </>
  )
}
