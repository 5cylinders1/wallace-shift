import { useEffect } from 'react'
import { SITE_ORIGIN, findRoute } from '../content/routeMeta'

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

    if (path) {
      const canonical = `${SITE_ORIGIN}${path === '/' ? '/' : path}`

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
