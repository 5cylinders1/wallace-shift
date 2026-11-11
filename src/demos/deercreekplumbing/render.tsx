import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import App from './App'
import { BASE, ORIGIN, pages } from './data'
import { structuredData } from './schema'
export const deerCreekPlumbingPaths=pages.map(page=>BASE+(page.slug?'/'+page.slug:''))
export function renderDeerCreekPlumbing(path:string){
 const clean=path.replace(/\/index\.html$/,'').replace(/\/+$/,'')
 const slug=clean===BASE?'':clean.startsWith(BASE+'/')?clean.slice(BASE.length+1):null
 const page=pages.find(item=>item.slug===slug)
 if(!page)return null
 return {slug:page.slug,html:renderToString(<StrictMode><App slug={page.slug}/></StrictMode>),title:page.title,description:page.description,canonical:ORIGIN+BASE+(page.slug?'/'+page.slug:''),jsonLd:structuredData(page.slug),robots:'noindex, nofollow'}
}
