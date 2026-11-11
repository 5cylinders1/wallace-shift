import { ORIGIN, absolute, business, findPage, services } from './data'

/** This graph describes the visible concept. Third-party reviews deliberately
 * remain prose and links, without Review or AggregateRating markup. */
export function structuredData(slug: string) {
  const page = findPage(slug)
  if (!page) throw new Error(`Unknown Deer Creek Plumbing concept page: ${slug}`)
  const url = absolute(slug)
  const businessId = `${absolute()}#business`
  const websiteId = `${absolute()}#website`
  const service = services.find(item => `services/${item.slug}` === slug)
  const graph: object[] = [
    {
      '@type': 'Plumber', '@id': businessId, name: business.name, url: absolute(),
      telephone: '+1-913-440-9102', email: business.email, foundingDate: '2017',
      address: {'@type':'PostalAddress',streetAddress:'19968 W 162nd St',addressLocality:'Olathe',addressRegion:'KS',postalCode:'66062',addressCountry:'US'},
      areaServed: [{'@type':'AdministrativeArea',name:'Kansas City metropolitan area'}, ...['Olathe','Louisburg','Paola'].map(name=>({'@type':'City',name:`${name}, KS`}))],
      openingHoursSpecification:[{'@type':'OpeningHoursSpecification',dayOfWeek:['Monday','Tuesday','Wednesday','Thursday','Friday'],opens:'08:00',closes:'16:30'}],
      image:`${ORIGIN}/demos/deercreek/photos/pipe-vise-1600.webp`,
      logo:`${ORIGIN}/demos/deercreek/logo-ink.png`,
      hasMap:business.googleUrl,sameAs:[business.googleUrl,business.facebookUrl],
    },
    {'@type':'WebSite','@id':websiteId,url:absolute(),name:'Deer Creek Plumbing website concept',inLanguage:'en-US',publisher:{'@id':businessId}},
    {
      '@type':page.kind==='about'?'AboutPage':page.kind==='schedule'?'ContactPage':page.kind==='services'?'CollectionPage':'WebPage',
      '@id':`${url}#webpage`,url,name:page.title,description:page.description,inLanguage:'en-US',
      isPartOf:{'@id':websiteId},about:{'@id':service?`${url}#service`:businessId},
      ...(slug?{breadcrumb:{'@id':`${url}#breadcrumb`}}:{}),
    },
  ]
  if (slug) {
    const crumbs = [{name:'Home',url:absolute()}]
    if (service) crumbs.push({name:'Services',url:absolute('services')})
    crumbs.push({name:service?.name??page.heading.replace(/\.$/,''),url})
    graph.push({'@type':'BreadcrumbList','@id':`${url}#breadcrumb`,itemListElement:crumbs.map((item,index)=>({'@type':'ListItem',position:index+1,name:item.name,item:item.url}))})
  }
  if (service) {
    graph.push({'@type':'Service','@id':`${url}#service`,name:service.name,serviceType:service.name,description:service.intro,url,provider:{'@id':businessId},areaServed:{'@type':'AdministrativeArea',name:'Kansas City metropolitan area'},image:`${ORIGIN}${service.image}`})
    graph.push({'@type':'FAQPage','@id':`${url}#faq`,mainEntity:service.faq.map(item=>({'@type':'Question',name:item.q,acceptedAnswer:{'@type':'Answer',text:item.a}}))})
  }
  if(page.kind==='services')graph.push({'@type':'ItemList','@id':`${url}#services`,itemListElement:services.map((item,index)=>({'@type':'ListItem',position:index+1,name:item.name,url:absolute(`services/${item.slug}`)}))})
  return {'@context':'https://schema.org','@graph':graph}
}
