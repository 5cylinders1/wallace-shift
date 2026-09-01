import { useEffect } from 'react'

/**
 * Keeps the document title and meta description in step with the routed
 * page. index.html ships the homepage values, so every route sets its own
 * explicitly rather than relying on what the previous page left behind.
 */
export function useDocumentMeta(title: string, description: string) {
  useEffect(() => {
    document.title = title

    const meta = document.querySelector<HTMLMetaElement>(
      'meta[name="description"]',
    )
    if (meta) meta.content = description
  }, [title, description])
}
