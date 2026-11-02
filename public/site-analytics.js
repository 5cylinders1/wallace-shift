/* Google Analytics 4 for the public site. Google loads only after consent.
 * Keep Enhanced Measurement OFF in the GA web stream: events below are
 * deliberately manual so private routes and arbitrary URLs never reach GA.
 */
(() => {
  'use strict'

  // Public identifier, not a secret. An empty value disables measurement/UI.
  const measurementId = 'G-05SCBNQLY0'
  const consentKey = 'ws:analytics-consent:v1'
  const hosts = new Set([
    'wallaceshift.com', 'www.wallaceshift.com',
    'contractors.wallaceshift.com', 'roofers.wallaceshift.com',
  ])
  const paths = new Set([
    '/', '/services', '/pricing', '/about', '/approach', '/contact', '/privacy',
    '/request-demo', '/demos/contractors', '/demos/roofers-offer', '/blog',
    '/offers/ai-business-integration',
  ])
  const offerPath = '/offers/ai-business-integration'
  const offerSteps = new Set(['bottleneck', 'authority', 'business', 'impact', 'experience', 'tools', 'readiness', 'contact'])
  const offerRecommendations = new Set(['package', 'consultation', 'resource'])
  const campaignKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']
  const surfaces = new Set(['home_hero', 'contact_form', 'roofing_offer'])
  const demos = new Set([
    'roofers', 'roofers-2', 'roofers-3', 'roofers-4', 'roofers-5', 'roofers-6',
    'foundation', 'cabinetry', 'cabinetry-2', 'pools', 'roofers-dashboard',
  ])
  const previews = new Set([
    'northvane', 'alder-stone', 'contour', 'halcyon', 'velar', 'stratum',
    'datum', 'tambour', 'mitre', 'stillwater', 'roofing-crm',
  ])
  const resources = new Set([
    '/resources/automation-opportunity-worksheet.pdf',
    '/resources/service-website-inquiry-checklist.pdf',
    '/resources/website-redesign-planning-worksheet.pdf',
    '/resources/blog/wallace-shift-business-systems-worksheets.xlsx',
  ])

  function optedOut() {
    return navigator.globalPrivacyControl === true ||
      [navigator.doNotTrack, window.doNotTrack, navigator.msDoNotTrack]
        .some(value => value === '1' || value === 'yes')
  }

  function campaignValue(value) {
    // Campaign labels are short words joined with _ or -. Never put names,
    // email addresses, URLs, phone numbers, or per-person IDs in campaign tags.
    if (typeof value !== 'string' || value.length > 60) return null
    const label = value.toLowerCase()
    if (!/^[a-z][a-z0-9]*(?:[-_][a-z0-9]+)*$/.test(label)) return null
    if (label.split(/[-_]/).some(word => word.length > 20)) return null
    if (/\d{5}|[a-f0-9]{12}|token|secret|password|session|bearer|access|email|engagement|invoice/.test(label)) return null
    return label
  }

  function publicUrl(value) {
    try {
      const url = new URL(value, window.location.href)
      if (url.protocol !== 'https:' || !hosts.has(url.hostname) || url.port || url.username || url.password) return null
      const path = url.pathname.replace(/\/+$/, '') || '/'
      if (!paths.has(path) && !/^\/blog\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(path)) return null
      if (path.length > 160) return null
      const clean = new URL(path, url.origin)
      for (const key of campaignKeys) {
        const values = url.searchParams.getAll(key)
        const label = values.length === 1 ? campaignValue(values[0]) : null
        if (label) clean.searchParams.set(key, label)
      }
      return clean
    } catch { return null }
  }

  function referrerOrigin() {
    try {
      const url = new URL(document.referrer)
      return /^https?:$/.test(url.protocol) ? url.origin : ''
    } catch { return '' }
  }

  if (window.__wsAnalyticsInitialized || !/^G-[A-Z0-9]+$/.test(measurementId) || !publicUrl(window.location.href)) return
  window.__wsAnalyticsInitialized = true
  const disableKey = `ga-disable-${measurementId}`
  window[disableKey] = true
  let consent = null
  try {
    const saved = window.localStorage.getItem(consentKey)
    if (saved === 'granted' || saved === 'denied') consent = saved
  } catch { /* Consent can still be chosen for this document. */ }
  let started = false
  let lastPage = null
  let scrollReported = false
  let banner
  let preferences
  let firstConsentAction
  const denied = { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' }

  function canTrack() {
    const allowed = consent === 'granted' && !optedOut() && publicUrl(window.location.href) !== null
    window[disableKey] = !allowed
    return allowed
  }

  function command() {
    try {
      window.dataLayer = window.dataLayer || []
      window.dataLayer.push(arguments)
    } catch { /* A blocked tracker must not affect forms or navigation. */ }
  }

  function parameters(url) {
    return {
      send_to: measurementId,
      page_location: url.href,
      page_referrer: referrerOrigin(),
      // A known public path cannot accidentally contain a client's title.
      page_title: url.pathname === '/' ? 'Wallace Shift' : url.pathname,
    }
  }

  function clearAnalyticsCookies() {
    try {
      const names = document.cookie.split(';').map(cookie => cookie.trim().split('=')[0])
      for (const name of names) {
        if (!/^_ga(?:_[A-Za-z0-9]+)?$/.test(name)) continue
        for (const domain of ['', window.location.hostname, '.wallaceshift.com', 'wallaceshift.com']) {
          document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax; Secure${domain ? `; Domain=${domain}` : ''}`
        }
      }
    } catch { /* Cookies may be inaccessible in hardened browsers. */ }
  }

  function start() {
    if (!canTrack() || started) return
    const url = publicUrl(window.location.href)
    started = true
    command('consent', 'default', denied)
    command('consent', 'update', { ...denied, analytics_storage: 'granted' })
    command('set', 'ads_data_redaction', true)
    command('set', parameters(url))
    command('js', new Date())
    command('config', measurementId, {
      send_page_view: false,
      allow_google_signals: false, allow_ad_personalization_signals: false,
      cookie_flags: 'SameSite=Lax;Secure',
    })
    const script = document.createElement('script')
    script.async = true
    script.referrerPolicy = 'origin'
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`
    document.head.appendChild(script)
  }

  function send(name, data = {}) {
    if (!canTrack()) return
    start()
    const url = publicUrl(window.location.href)
    command('event', name, { ...parameters(url), ...data })
  }

  function pageView() {
    if (!canTrack()) { lastPage = null; scrollReported = false; return }
    start()
    const url = publicUrl(window.location.href)
    if (lastPage === url.href) return
    lastPage = url.href
    scrollReported = false
    // Update defaults too: Google's engagement events must use the same safe
    // URL as our manual events, never the raw address bar or document title.
    command('set', parameters(url))
    send('page_view')
  }

  function showPreferences() {
    if (!publicUrl(window.location.href) || optedOut()) return
    banner.hidden = false
    preferences.hidden = true
    firstConsentAction.focus()
  }

  function choose(value) {
    consent = value
    try { window.localStorage.setItem(consentKey, value) } catch { /* In-memory choice remains effective. */ }
    banner.hidden = true
    if (value === 'denied') {
      window[disableKey] = true
      if (started) command('consent', 'update', denied)
      clearAnalyticsCookies()
      lastPage = null
    } else {
      if (started && canTrack()) command('consent', 'update', { ...denied, analytics_storage: 'granted' })
      pageView()
    }
    preferences.hidden = optedOut() || !publicUrl(window.location.href)
    if (!preferences.hidden) preferences.focus()
  }

  function createPreferences() {
    banner = document.createElement('section')
    banner.className = 'ws-analytics-consent'
    banner.setAttribute('aria-labelledby', 'ws-analytics-consent-title')
    banner.hidden = consent !== null || optedOut()
    const heading = document.createElement('h2')
    heading.id = 'ws-analytics-consent-title'
    heading.textContent = 'Allow analytics?'
    banner.appendChild(heading)
    const text = document.createElement('p')
    text.textContent = 'We use Google Analytics to understand visits and improve the site. Your choice does not affect forms or access.'
    banner.appendChild(text)
    const actions = document.createElement('div')
    actions.className = 'ws-analytics-actions'
    for (const [value, label] of [['granted', 'Accept analytics'], ['denied', 'Reject analytics']]) {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'ws-analytics-button'
      button.dataset.choice = value
      button.textContent = label
      button.addEventListener('click', () => choose(value))
      if (!firstConsentAction) firstConsentAction = button
      actions.appendChild(button)
    }
    const privacy = document.createElement('a')
    privacy.href = '/privacy'
    privacy.textContent = 'Privacy policy'
    actions.appendChild(privacy)
    banner.appendChild(actions)
    document.body.appendChild(banner)
    preferences = document.createElement('button')
    preferences.type = 'button'
    preferences.className = 'ws-analytics-preferences'
    preferences.textContent = 'Analytics preferences'
    preferences.hidden = optedOut() || !banner.hidden
    preferences.addEventListener('click', showPreferences)
    document.body.appendChild(preferences)
  }

  function routeChanged() {
    const eligible = publicUrl(window.location.href) !== null && !optedOut()
    if (!eligible) banner.hidden = true
    else if (consent === null) banner.hidden = false
    preferences.hidden = !eligible || !banner.hidden
    pageView()
  }

  createPreferences()
  if (optedOut()) clearAnalyticsCookies()
  pageView()
  window.addEventListener('ws:routechange', routeChanged)
  window.addEventListener('popstate', routeChanged)
  function syncConsent(value) {
    consent = value === 'granted' || value === 'denied' ? value : null
    banner.hidden = consent !== null
    if (consent !== 'granted') {
      window[disableKey] = true
      if (started) command('consent', 'update', denied)
      clearAnalyticsCookies()
    } else if (started && canTrack()) command('consent', 'update', { ...denied, analytics_storage: 'granted' })
    routeChanged()
  }
  window.addEventListener('storage', event => {
    if (event.key === consentKey || event.key === null) syncConsent(event.newValue)
  })
  window.addEventListener('pageshow', event => {
    if (!event.persisted) return
    // Back/forward cache can restore a document with an old in-memory choice.
    try { syncConsent(window.localStorage.getItem(consentKey)) } catch { routeChanged() }
  })

  window.addEventListener('ws:analytics', event => {
    const detail = event.detail
    if (!detail || typeof detail !== 'object') return
    const { name, value } = detail
    if (name === 'enquiry_submitted' && surfaces.has(value)) {
      send('generate_lead', { lead_type: 'enquiry', form_surface: value })
    } else if (name === 'demo_request_submitted' && (value === undefined || demos.has(value))) {
      send('generate_lead', { lead_type: 'demo_request', ...(value ? { demo_id: value } : {}) })
    } else if (name === 'enquiry_failed' && surfaces.has(value)) {
      send(name, { form_surface: value })
    } else if (name === 'demo_request_failed' && (value === undefined || demos.has(value))) {
      send(name, value ? { demo_id: value } : {})
    } else if (name === 'demo_preview_played' && previews.has(value)) {
      send(name, { demo_id: value })
    } else if ((name === 'quiz_started' || name === 'quiz_completed') && value === undefined) {
      send(name)
    } else if (publicUrl(window.location.href)?.pathname === offerPath) {
      // Only a fixed offer ID and screen names are collected. Ignore extra
      // detail properties, including answers, contact data, and lead IDs.
      if ((name === 'offer_application_start' || name === 'offer_application_submit') && value === undefined) {
        send(name, { offer_id: 'ai_business_integration' })
      } else if (name === 'offer_application_step' && offerSteps.has(value)) {
        send(name, { offer_id: 'ai_business_integration', form_step: value })
      } else if (name === 'offer_recommendation_view' && offerRecommendations.has(value)) {
        // A local result is not a saved application, appointment, or sale.
        send(name, { offer_id: 'ai_business_integration', recommendation_type: value })
      }
    }
  })

  document.addEventListener('click', event => {
    const link = event.target?.closest?.('a[href]')
    if (!link) return
    try {
      const target = new URL(link.href, window.location.href)
      if (target.protocol === 'mailto:') send('email_clicked')
      else if (target.protocol === 'tel:') send('phone_clicked')
      else if (target.origin === window.location.origin && resources.has(target.pathname)) {
        send('resource_download_clicked', { resource: target.pathname })
      }
    } catch { /* Ignore malformed links. */ }
  }, true)

  window.addEventListener('scroll', () => {
    if (scrollReported || !canTrack()) return
    const height = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight)
    if (height <= window.innerHeight || (window.scrollY + window.innerHeight) / height < 0.9) return
    scrollReported = true
    send('scroll', { percent_scrolled: 90 })
  }, { passive: true })
})()
