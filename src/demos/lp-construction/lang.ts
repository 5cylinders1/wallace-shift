import { createContext, useContext } from 'react'
import { href as path } from './content'
import { strings } from './i18n'
import type { Language } from './request/types'

/** The page's language: set once per document from its URL (/es/… is Spanish). */
export const LangContext = createContext<Language>('en')

export function useLang() {
  const lang = useContext(LangContext)
  return { lang, t: strings[lang], href: (to = '/') => path(to, lang) }
}
