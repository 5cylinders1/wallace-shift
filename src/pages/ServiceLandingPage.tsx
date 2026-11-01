import { PageHero } from '../components/PageHero/PageHero'
import { PageLink } from '../components/PageLink/PageLink'
import { serviceLandingPages, type ServiceLandingContent } from '../content/serviceLandingPages'
import { business } from '../content/siteConfig'
import { useRouteMeta } from '../hooks/useDocumentMeta'
import './InteriorPage.css'
import './ServiceLandingPage.css'

export function ServiceLandingPage({ service }: { service: ServiceLandingContent }) {
  useRouteMeta(service.path)

  return (
    <div className="service-landing">
      <PageHero eyebrow={service.name} headlineLines={service.headlineLines}
        headlineAccent={service.headlineAccent} supporting={service.supporting} />

      <section className="interior service-landing__overview" aria-labelledby="service-overview-heading">
        <div className="container">
          <nav className="service-landing__breadcrumbs" aria-label="Breadcrumb">
            <PageLink href="/">Home</PageLink><span aria-hidden="true">/</span>
            <PageLink href="/services">Services</PageLink><span aria-hidden="true">/</span>
            <span aria-current="page">{service.name}</span>
          </nav>
          <div className="service-landing__split">
            <div>
              <h2 className="interior__heading" id="service-overview-heading">{service.introduction.heading}</h2>
              <p className="service-landing__area">Serving {business.serviceArea} and working remotely with small businesses.</p>
            </div>
            <div className="prose">
              {service.introduction.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
              <PageLink className="service-landing__link" href="/contact">{service.cta}<span aria-hidden="true">↗</span></PageLink>
            </div>
          </div>
        </div>
      </section>

      <section className="interior interior--tight service-landing__section" aria-labelledby="service-examples-heading">
        <div className="container">
          <h2 className="interior__heading" id="service-examples-heading">{service.examplesHeading}</h2>
          <div className="service-landing__cards">
            {service.examples.map(example => <article key={example.title}>
              <h3>{example.title}</h3><p>{example.body}</p>
            </article>)}
          </div>
        </div>
      </section>

      <section className="interior service-landing__section" aria-labelledby="service-deliverables-heading">
        <div className="container service-landing__split">
          <h2 className="interior__heading" id="service-deliverables-heading">What the project includes</h2>
          <ul className="service-list">{service.deliverables.map(item => <li key={item}>{item}</li>)}</ul>
        </div>
      </section>

      <section className="interior interior--tight service-landing__section" aria-labelledby="service-process-heading">
        <div className="container">
          <h2 className="interior__heading" id="service-process-heading">From first conversation to working system</h2>
          <ol className="service-landing__cards service-landing__steps">
            {service.process.map((step, index) => <li key={step.title}>
              <span className="service-landing__number" aria-hidden="true">0{index + 1}</span>
              <h3>{step.title}</h3><p>{step.body}</p>
            </li>)}
          </ol>
          <PageLink className="service-landing__link" href="/approach">How we scope, build, and support your project<span aria-hidden="true">↗</span></PageLink>
        </div>
      </section>

      <section className="interior service-landing__section" aria-labelledby="service-scope-heading">
        <div className="container service-landing__split">
          <h2 className="interior__heading" id="service-scope-heading">Scope, costs, and a useful first step</h2>
          <div className="prose"><p>{service.scope}</p>
            <PageLink className="service-landing__link" href={service.pricingHref}>View pricing and scope details<span aria-hidden="true">↗</span></PageLink>
          </div>
        </div>
      </section>

      <section className="interior interior--tight service-landing__section" aria-labelledby="service-questions-heading">
        <div className="container service-landing__split">
          <h2 className="interior__heading" id="service-questions-heading">Questions before you start</h2>
          <div className="service-landing__questions">{service.questions.map(item => <details key={item.question}>
            <summary><h3>{item.question}</h3></summary><p>{item.answer}</p>
          </details>)}</div>
        </div>
      </section>

      <section className="interior service-landing__section" aria-labelledby="service-guides-heading">
        <div className="container service-landing__split">
          <h2 className="interior__heading" id="service-guides-heading">Guides to help you decide</h2>
          <ul className="service-landing__links">{service.guides.map(guide => <li key={guide.href}>
            <a className="service-landing__link" href={guide.href}>{guide.title}<span aria-hidden="true">↗</span></a>
          </li>)}</ul>
        </div>
      </section>

      <section className="interior interior--ink">
        <div className="container closing">
          <h2 className="closing__headline">Start with the work that needs to change.</h2>
          <p className="closing__supporting">Tell us about your team, the tools you use, and the task you want to improve. We will discuss a practical first step.</p>
          <div className="closing__actions"><PageLink className="button-primary" href="/contact">{service.cta}<span aria-hidden="true">↗</span></PageLink></div>
          <nav className="service-landing__related" aria-label="Other services">
            {serviceLandingPages.filter(item => item.path !== service.path).map(item => <PageLink href={item.path} key={item.path}>{item.name}</PageLink>)}
          </nav>
        </div>
      </section>
    </div>
  )
}
