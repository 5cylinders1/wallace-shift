import { PageHero } from '../components/PageHero/PageHero'
import { PageLink } from '../components/PageLink/PageLink'
import { navRoutes } from '../content/routeMeta'
import { useRouteMeta } from '../hooks/useDocumentMeta'
import './InteriorPage.css'

/**
 * Replaces the old behaviour, where every unmatched URL silently rendered
 * the homepage and returned HTTP 200. The build emits this page as
 * `404.html`, which the host serves with a real 404 status.
 */
export function NotFoundPage() {
  useRouteMeta('/404')

  return (
    <>
      <PageHero
        eyebrow="404"
        headlineLines={['That page', 'does not']}
        headlineAccent="exist."
        supporting="The link may be out of date, or the address may have a typo in it. Everything on the site is one click away below."
      />

      <section className="interior">
        <div className="container">
          <div className="interior__head">
            <h2 className="interior__heading">Try one of these.</h2>
          </div>

          <ul className="service-list" style={{ maxWidth: '52ch' }}>
            <li>
              <PageLink href="/">Home</PageLink>
            </li>
            {navRoutes.map((route) => (
              <li key={route.path}>
                <PageLink href={route.path}>{route.navLabel}</PageLink>
              </li>
            ))}
            <li>
              <PageLink href="/contact">Start a project</PageLink>
            </li>
          </ul>
        </div>
      </section>
    </>
  )
}
