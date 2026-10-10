import { PREVIEW_LOGO_APPEARANCE, type LogoAppearance } from './waterHeroConfig'

/** Missing or unsupported looks select the current comparison preview. */
export function readLogoAppearance(search: string): LogoAppearance {
  const requested = new URLSearchParams(search).get('look')
  return requested === 'led' || requested === 'electric' || requested === 'glass' || requested === 'chrome' || requested === 'frosted' || requested === 'pearl' || requested === 'copper' || requested === 'mercury' || requested === 'cutlight' || requested === 'studio'
    ? requested : PREVIEW_LOGO_APPEARANCE
}

/** Keep pinned poses, quality settings and anchors when switching materials. */
export function logoAppearanceUrl(href: string, appearance: LogoAppearance): string {
  const url = new URL(href)
  url.searchParams.set('look', appearance)
  return `${url.pathname}${url.search}${url.hash}`
}
