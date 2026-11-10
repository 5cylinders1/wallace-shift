import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import { SITE, absolute, pageBySlug, pages } from './content'
import DeerCreekApp from './DeerCreekApp'
import { structuredData } from './schema'

/** Public URL paths, e.g. "/demo/deercreek/services/water-heaters". */
export const deerCreekPaths = pages.map(page => (page.slug ? `${SITE.base}/${page.slug}` : SITE.base))

export function slugFor(path: string) {
  const trimmed = path.replace(/\/index\.html$/, '').replace(/\/+$/, '')
  if (trimmed === SITE.base) return ''
  return trimmed.startsWith(`${SITE.base}/`) ? trimmed.slice(SITE.base.length + 1) : null
}

/** Shared by the dev middleware and the build: the page's initial HTML plus
 * the metadata the plugin writes into <head>. Unknown paths return null. */
export function renderDeerCreek(path: string) {
  const slug = slugFor(path)
  const page = slug === null ? undefined : pageBySlug(slug)
  if (!page) return null
  return {
    slug: page.slug,
    html: renderToString(<StrictMode><DeerCreekApp slug={page.slug} /></StrictMode>),
    title: page.title,
    description: page.description,
    canonical: absolute(page.slug),
    jsonLd: structuredData(page.slug),
    robots: SITE.robots,
  }
}
