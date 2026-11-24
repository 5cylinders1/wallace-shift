import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import App from './App'
import { BASE, absolute, pages, pagePath } from './content'
import { serializeJsonLd, structuredData } from './schema'
import type { Language } from './request/types'

const languages: Language[] = ['en', 'es']
export const lpPaths = languages.flatMap(lang => pages.map(page => pagePath(page.slug, lang)))

export function renderLp(path: string) {
  const clean = path.replace(/\/index\.html$/, '').replace(/\/+$/, '')
  const relative = clean === BASE ? '' : clean.startsWith(`${BASE}/`) ? clean.slice(BASE.length + 1) : null
  if (relative === null) return null
  const lang: Language = relative === 'es' || relative.startsWith('es/') ? 'es' : 'en'
  const slug = lang === 'es' ? relative.slice(2).replace(/^\//, '') : relative
  const page = pages.find(item => item.slug === slug)
  if (!page) return null
  return {
    slug, lang,
    html: renderToString(<StrictMode><App slug={slug} lang={lang} /></StrictMode>),
    title: page.copy[lang].title,
    description: page.copy[lang].description,
    canonical: absolute(slug, lang),
    alternates: languages.map(language => ({ lang: language, url: absolute(slug, language) })),
    jsonLd: serializeJsonLd(structuredData(slug, lang)),
    robots: 'noindex, nofollow',
  }
}

export function lpSitemap(lastModified: string) {
  const urls = languages.flatMap(lang => pages.map(page => `  <url><loc>${absolute(page.slug, lang)}</loc><lastmod>${lastModified}</lastmod></url>`)).join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
}
