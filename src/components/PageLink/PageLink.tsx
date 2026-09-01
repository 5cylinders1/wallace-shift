import type { AnchorHTMLAttributes, MouseEvent } from 'react'
import { navigate } from '../../lib/router'

type PageLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string
}

/**
 * Anchor that keeps root-relative navigation client-side. Bare hash links
 * (`#contact`) and external URLs are left entirely to the browser, so the
 * native same-page smooth scroll and normal link behaviour are untouched.
 */
export function PageLink({ href, onClick, children, ...rest }: PageLinkProps) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event)

    if (!href.startsWith('/')) return
    // Modified clicks (new tab, new window, download) belong to the browser.
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return
    }

    event.preventDefault()
    navigate(href)
  }

  return (
    <a href={href} onClick={handleClick} {...rest}>
      {children}
    </a>
  )
}
