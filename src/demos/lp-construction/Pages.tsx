import { useState } from 'react'
import AreaCheck from './AreaCheck'
import { areaPlaces, business, edgePlaces, gallery, pagePath, services, type GalleryPhoto, type Place, type Service, type ServiceId } from './content'
import Hero from './Hero'
import { useLang } from './lang'
import { useHydrated } from './hooks'
import { Breadcrumbs, SiteFrame, TalkButtons } from './Layout'
import RequestForm from './RequestForm'
import { emptyStart, readStart } from './request/start'
import RoomIdeas from './RoomIdeas'
import { AREA_LIMIT_MINUTES } from './serviceAreaZips'

const photoSrc = (photo: GalleryPhoto, size: 'small' | 'full') => `/demos/lp-construction/work/${photo.id}-${size === 'small' ? 640 : 'full'}.webp`
const photosFor = (service: Service) => service.photos.map(id => gallery.find(photo => photo.id === id)).filter((photo): photo is GalleryPhoto => Boolean(photo))

function WorkPhoto({ photo, sizes = '(min-width: 900px) 33vw, 100vw', eager = false }: { photo: GalleryPhoto; sizes?: string; eager?: boolean }) {
  const { lang } = useLang()
  return (
    <img
      src={photoSrc(photo, 'small')} srcSet={`${photoSrc(photo, 'small')} ${Math.min(640, photo.width)}w, ${photoSrc(photo, 'full')} ${photo.width}w`} sizes={sizes}
      alt={photo.alt[lang]} width={photo.width} height={photo.height}
      loading={eager ? 'eager' : 'lazy'} decoding="async"
    />
  )
}

function ServiceList({ headingLevel = 3 }: { headingLevel?: 2 | 3 }) {
  const { lang, href } = useLang()
  const Heading = `h${headingLevel}` as 'h2' | 'h3'
  return (
    <ol className="lp-service-list">
      {services.map((service, index) => {
        const photo = photosFor(service)[0]
        return (
          <li key={service.id}>
            <a href={href(`/services/${service.id}`)}>
              <span className="lp-service-index" aria-hidden="true">0{index + 1}</span>
              <span className="lp-service-text">
                <Heading>{service.copy[lang].name}</Heading>
                <span>{service.copy[lang].short}</span>
              </span>
              {photo && <span className="lp-service-photo"><WorkPhoto photo={photo} sizes="160px" /></span>}
              <span className="lp-service-arrow" aria-hidden="true">→</span>
            </a>
          </li>
        )
      })}
    </ol>
  )
}

function Steps() {
  const { t } = useLang()
  return (
    <ol className="lp-steps">
      {t.steps.map(step => <li key={step.title}><h3>{step.title}</h3><p>{step.text}</p></li>)}
    </ol>
  )
}

function ClosingCta() {
  const { t, href } = useLang()
  return (
    <section className="lp-closing" aria-labelledby="lp-closing-title">
      <div className="lp-shell">
        <h2 id="lp-closing-title">{t.closing.title}</h2>
        <p>{t.closing.text}</p>
        <div className="lp-closing-actions">
          <a className="lp-button lp-button-accent" href={href('/request')}>{t.closing.request}</a>
          <TalkButtons tone="dark" />
        </div>
        <p className="lp-closing-es" lang={t.other.lang}>{t.closing.otherPrompt} <a href={pagePath('', t.other.lang)}>{t.closing.otherLink}</a>.</p>
      </div>
    </section>
  )
}

export function HomePage() {
  const { t, href } = useLang()
  const recent = gallery.slice(0, 6)
  return (
    <SiteFrame slug="">
      <Hero />
      <section className="lp-facts" aria-label={t.facts.label}>
        <ul className="lp-shell">
          {t.facts.items.map(([title, text]) => <li key={title}><strong>{title}</strong><span>{text}</span></li>)}
        </ul>
      </section>

      <section className="lp-section" aria-labelledby="lp-services-title">
        <div className="lp-shell">
          <div className="lp-section-head">
            <p className="lp-eyebrow">{t.home.servicesEyebrow}</p>
            <h2 id="lp-services-title">{t.home.servicesTitle}</h2>
          </div>
          <ServiceList />
        </div>
      </section>

      <section className="lp-section lp-section-tint" id="ideas" aria-labelledby="lp-ideas-title">
        <div className="lp-shell">
          <div className="lp-section-head">
            <p className="lp-eyebrow">{t.home.ideasEyebrow}</p>
            <h2 id="lp-ideas-title">{t.home.ideasTitle}</h2>
            <p>{t.home.ideasLede}</p>
          </div>
          <RoomIdeas />
        </div>
      </section>

      {recent.length > 0 && (
        <section className="lp-section" aria-labelledby="lp-work-title">
          <div className="lp-shell">
            <div className="lp-section-head lp-section-head-row">
              <div>
                <p className="lp-eyebrow">{t.home.workEyebrow}</p>
                <h2 id="lp-work-title">{t.home.workTitle}</h2>
              </div>
              <a className="lp-text-link" href={href('/our-work')}>{t.home.workAll}</a>
            </div>
            <ul className="lp-work-strip">
              {recent.map(photo => <li key={photo.id}><WorkPhoto photo={photo} sizes="(min-width: 900px) 33vw, 50vw" /></li>)}
            </ul>
          </div>
        </section>
      )}

      <section className="lp-section" aria-labelledby="lp-steps-title">
        <div className="lp-shell">
          <div className="lp-section-head">
            <p className="lp-eyebrow">{t.home.stepsEyebrow}</p>
            <h2 id="lp-steps-title">{t.home.stepsTitle}</h2>
          </div>
          <Steps />
        </div>
      </section>
      <ClosingCta />
    </SiteFrame>
  )
}

export function ServicesPage() {
  const { t } = useLang()
  return (
    <SiteFrame slug="services">
      <div className="lp-page-head">
        <div className="lp-shell">
          <Breadcrumbs trail={[[t.crumbs.home, '/'], [t.crumbs.services]]} />
          <h1>{t.servicesPage.title}</h1>
          <p className="lp-page-lede">{t.servicesPage.lede}</p>
        </div>
      </div>
      <section className="lp-section lp-section-tight" aria-label={t.servicesPage.label}>
        <div className="lp-shell"><ServiceList headingLevel={2} /></div>
      </section>
      <ClosingCta />
    </SiteFrame>
  )
}

export function ServicePage({ service }: { service: Service }) {
  const { t, lang, href } = useLang()
  const photos = photosFor(service)
  const related = services.filter(item => item.id !== service.id)
  return (
    <SiteFrame slug={`services/${service.id}`}>
      <div className="lp-page-head">
        <div className="lp-shell lp-page-head-grid">
          <div>
            <Breadcrumbs trail={[[t.crumbs.home, '/'], [t.crumbs.services, '/services'], [service.copy[lang].name]]} />
            <p className="lp-eyebrow">{service.copy[lang].name}</p>
            <h1>{service.copy[lang].headline}</h1>
            <p className="lp-page-lede">{service.copy[lang].intro}</p>
            <div className="lp-actions">
              <a className="lp-button lp-button-accent" href={href(`/request?job=${service.id}`)}>{t.closing.request}</a>
              <TalkButtons />
            </div>
          </div>
          {photos[0] && <figure className="lp-lead-photo"><WorkPhoto photo={photos[0]} sizes="(min-width: 900px) 45vw, 100vw" eager /></figure>}
        </div>
      </div>

      <section className="lp-section lp-section-tight" aria-labelledby="lp-includes-title">
        <div className="lp-shell lp-two-col">
          <div>
            <h2 id="lp-includes-title">{t.servicePage.includes}</h2>
            <ul className="lp-ticks">{service.copy[lang].includes.map(item => <li key={item}>{item}</li>)}</ul>
          </div>
          <div>
            <h2>{t.servicePage.price}</h2>
            <p>{service.copy[lang].price}</p>
            <p>{t.servicePage.minimum}</p>
          </div>
        </div>
      </section>

      {photos.length > 1 && (
        <section className="lp-section lp-section-tight" aria-labelledby="lp-more-title">
          <div className="lp-shell">
            <h2 id="lp-more-title">{t.servicePage.more(service.copy[lang].name)}</h2>
            <ul className="lp-work-strip">{photos.slice(1, 7).map(photo => <li key={photo.id}><WorkPhoto photo={photo} sizes="(min-width: 900px) 33vw, 50vw" /></li>)}</ul>
          </div>
        </section>
      )}

      <section className="lp-section lp-section-tint lp-section-tight" aria-labelledby="lp-area-title">
        <div className="lp-shell lp-two-col">
          <div>
            <h2 id="lp-area-title">{t.servicePage.areaTitle}</h2>
            <p>{t.servicePage.areaText(AREA_LIMIT_MINUTES)}</p>
          </div>
          <AreaCheck />
        </div>
      </section>

      <section className="lp-section lp-section-tight" aria-labelledby="lp-related-title">
        <div className="lp-shell">
          <h2 id="lp-related-title">{t.servicePage.other}</h2>
          <ul className="lp-related">{related.map(item => <li key={item.id}><a href={href(`/services/${item.id}`)}>{item.copy[lang].name} <span aria-hidden="true">→</span></a></li>)}</ul>
        </div>
      </section>
      <ClosingCta />
    </SiteFrame>
  )
}

function PlaceList({ places }: { places: Place[] }) {
  const { t } = useLang()
  return (
    <div className="lp-places">
      {(['MO', 'KS'] as const).map(state => (
        <div key={state}>
          <h3>{t.areaPage.states[state]}</h3>
          <ul>{places.filter(place => place.state === state).map(place => <li key={place.name}>{place.name}</li>)}</ul>
        </div>
      ))}
    </div>
  )
}

export function AreaPage() {
  const { t } = useLang()
  return (
    <SiteFrame slug="service-area">
      <div className="lp-page-head">
        <div className="lp-shell lp-page-head-grid">
          <div>
            <Breadcrumbs trail={[[t.crumbs.home, '/'], [t.nav.area]]} />
            <h1>{t.areaPage.title}</h1>
            <p className="lp-page-lede">{t.areaPage.lede(AREA_LIMIT_MINUTES)}</p>
          </div>
          <AreaCheck heading={t.areaPage.check} />
        </div>
      </div>
      <section className="lp-section lp-section-tight" aria-labelledby="lp-places-title">
        <div className="lp-shell">
          <h2 id="lp-places-title">{t.areaPage.cities}</h2>
          <PlaceList places={areaPlaces} />
          {edgePlaces.length > 0 && (
            <>
              <h2>{t.areaPage.edge}</h2>
              <p>{t.areaPage.edgeText}</p>
              <PlaceList places={edgePlaces} />
            </>
          )}
          <p className="lp-note">{t.areaPage.note}</p>
        </div>
      </section>
      <ClosingCta />
    </SiteFrame>
  )
}

export function WorkPage() {
  const { t, lang } = useLang()
  const [filter, setFilter] = useState<ServiceId | 'all'>('all')
  const used = services.filter(service => gallery.some(photo => photo.service === service.id))
  const shown = filter === 'all' ? gallery : gallery.filter(photo => photo.service === filter)
  return (
    <SiteFrame slug="our-work">
      <div className="lp-page-head">
        <div className="lp-shell">
          <Breadcrumbs trail={[[t.crumbs.home, '/'], [t.workPage.title]]} />
          <h1>{t.workPage.title}</h1>
          <p className="lp-page-lede">{t.workPage.lede}</p>
        </div>
      </div>
      <section className="lp-section lp-section-tight" aria-label={t.workPage.label}>
        <div className="lp-shell">
          {used.length > 1 && (
            <div className="lp-chips lp-filter" role="group" aria-label={t.workPage.filter}>
              <button type="button" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>{t.workPage.all}</button>
              {used.map(service => <button key={service.id} type="button" aria-pressed={filter === service.id} onClick={() => setFilter(service.id)}>{service.copy[lang].name}</button>)}
            </div>
          )}
          <ul className="lp-gallery">
            {shown.map(photo => <li key={photo.id}><figure><WorkPhoto photo={photo} /><figcaption>{photo.alt[lang]}</figcaption></figure></li>)}
          </ul>
          {gallery.length === 0 && <p>{t.workPage.empty} <a href={business.instagram} rel="noreferrer" target="_blank">{t.workPage.instagram}</a>.</p>}
        </div>
      </section>
      <ClosingCta />
    </SiteFrame>
  )
}

export function RequestPage() {
  const { t } = useLang()
  const hydrated = useHydrated()
  // The form remounts once after hydration with what the URL and the idea tool passed in.
  const start = hydrated ? readStart() : emptyStart
  return (
    <SiteFrame slug="request">
      <div className="lp-page-head lp-page-head-compact">
        <div className="lp-shell">
          <Breadcrumbs trail={[[t.crumbs.home, '/'], [t.requestPage.label]]} />
        </div>
      </div>
      <section className="lp-section lp-section-tight" aria-label={t.requestPage.label}>
        <div className="lp-shell lp-request-layout">
          <RequestForm key={hydrated ? 'browser' : 'server'} start={start} />
          <aside className="lp-request-aside" aria-labelledby="lp-aside-title">
            <h2 id="lp-aside-title">{t.requestPage.asideTitle}</h2>
            <p>{t.requestPage.asideText}</p>
            <TalkButtons />
            <h2>{t.requestPage.next}</h2>
            <Steps />
          </aside>
        </div>
      </section>
    </SiteFrame>
  )
}
