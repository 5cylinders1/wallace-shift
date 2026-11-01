import { useEffect } from 'react'
import { SITE_ORIGIN, findRoute } from '../content/routeMeta'
import { serializeJsonLd, structuredDataForRoute } from '../content/structuredData'

function setMeta(selector: string, create: () => HTMLElement, value: string) {
  let el = document.head.querySelector<HTMLElement>(selector)
  if (!el) {
    el = create()
    document.head.appendChild(el)
  }
  if (el instanceof HTMLMetaElement) el.content = value
  else if (el instanceof HTMLLinkElement) el.href = value
}

/**
 * Keeps the document head in step with the routed page during client-side
 * navigation.
 *
 * The build-time prerender in `vite.config.ts` bakes these same values
 * into each route's HTML file, which is what crawlers and link-preview
 * scrapers read. This hook covers the case they do not see: a visitor
 * moving between pages without a full page load.
 */
export function useDocumentMeta(
  title: string,
  description: string,
  path?: string,
) {
  useEffect(() => {
    document.title = title

    setMeta(
      'meta[name="description"]',
      () => {
        const el = document.createElement('meta')
        el.name = 'description'
        return el
      },
      description,
    )

    setMeta(
      'meta[property="og:title"]',
      () => {
        const el = document.createElement('meta')
        el.setAttribute('property', 'og:title')
        return el
      },
      title,
    )

    setMeta(
      'meta[property="og:description"]',
      () => {
        const el = document.createElement('meta')
        el.setAttribute('property', 'og:description')
        return el
      },
      description,
    )

    // Match the build-time social tags when a visitor follows an internal
    // link; otherwise Twitter metadata keeps the previous route's copy.
    for (const [name, value] of [['twitter:title', title], ['twitter:description', description]]) {
      setMeta(`meta[name="${name}"]`, () => {
        const el = document.createElement('meta')
        el.name = name
        return el
      }, value)
    }

    if (path) {
      const canonical = `${SITE_ORIGIN}${path === '/' ? '/' : path}`
      const route = findRoute(path)

      setMeta('meta[name="robots"]', () => {
        const el = document.createElement('meta')
        el.name = 'robots'
        return el
      }, route?.noindex ? (route.robots ?? 'noindex') : 'index, follow, max-image-preview:large')

      // Replace the build-time graph when the visitor navigates within the
      // SPA. One stable script avoids stale service/breadcrumb entities.
      const graph = structuredDataForRoute(path)
      const previous = document.getElementById('page-structured-data')
      if (graph) {
        const script = previous ?? document.createElement('script')
        script.id = 'page-structured-data'
        script.setAttribute('type', 'application/ld+json')
        script.textContent = serializeJsonLd(graph)
        if (!previous) document.head.appendChild(script)
      } else previous?.remove()

      setMeta(
        'link[rel="canonical"]',
        () => {
          const el = document.createElement('link')
          el.rel = 'canonical'
          return el
        },
        canonical,
      )

      setMeta(
        'meta[property="og:url"]',
        () => {
          const el = document.createElement('meta')
          el.setAttribute('property', 'og:url')
          return el
        },
        canonical,
      )
    }
  }, [title, description, path])
}

/**
 * The common case: a page that simply wants the title and description
 * already declared for its route in `routeMeta`.
 */
export function useRouteMeta(path: string) {
  const route = findRoute(path)
  useDocumentMeta(
    route?.title ?? 'Wallace Shift',
    route?.description ?? '',
    path,
  )
}
