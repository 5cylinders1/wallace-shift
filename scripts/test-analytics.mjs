import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import vm from 'node:vm'

const source = await readFile(new URL('../public/site-analytics.js', import.meta.url), 'utf8')
const consentKey = 'ws:analytics-consent:v1'
const testId = 'G-TEST12345'
const plain = value => JSON.parse(JSON.stringify(value))

function browser({ href = 'https://wallaceshift.com/', navigator = {}, windowDnt, referrer = '', savedConsent = null, storageBlocked = false, configured = true, cookies = '' } = {}) {
  const listeners = new Map()
  const documentListeners = new Map()
  const elements = []
  const scripts = []
  const writes = []
  const cookieWrites = []
  let storedConsent = savedConsent
  function element(tag) {
    const handlers = new Map()
    const node = {
      tagName: tag, children: [], dataset: {}, hidden: false,
      appendChild(child) { this.children.push(child); return child },
      setAttribute(name, value) { this[name] = value },
      addEventListener(name, callback) { handlers.set(name, callback) },
      click() { handlers.get('click')?.({ target: this }) },
      focus() { this.focused = true },
    }
    elements.push(node)
    return node
  }
  const window = {
    location: new URL(href), doNotTrack: windowDnt, innerHeight: 800, scrollY: 0,
    localStorage: {
      getItem(key) { assert.equal(key, consentKey); if (storageBlocked) throw Error('Blocked'); return storedConsent },
      setItem(key, value) { if (storageBlocked) throw Error('Blocked'); storedConsent = value; writes.push([key, value]) },
    },
    addEventListener: (name, callback) => listeners.set(name, callback),
  }
  const document = {
    referrer,
    createElement: element,
    head: { appendChild: node => { assert.equal(node.tagName, 'script'); scripts.push(node) } },
    body: { scrollHeight: 3000, appendChild: node => elements.push(node) },
    documentElement: { scrollHeight: 3000 },
    addEventListener: (name, callback) => documentListeners.set(name, callback),
    get cookie() { return cookies },
    set cookie(value) { cookieWrites.push(value) },
  }
  const context = vm.createContext({ window, document, navigator, URL, Set })
  const executable = source.replace(/const measurementId = '[^']*'/, `const measurementId = '${configured ? testId : ''}'`)
  vm.runInContext(executable, context)
  const commands = () => plain((window.dataLayer ?? []).map(args => [...args]))
  return {
    window, navigator, document, scripts, writes, cookieWrites,
    commands,
    setStoredConsent: value => { storedConsent = value },
    rerun: () => vm.runInContext(executable, context),
    events: name => commands().filter(args => args[0] === 'event' && (!name || args[1] === name)),
    choose: choice => elements.find(node => node.dataset.choice === choice)?.click(),
    preferences: () => elements.find(node => node.className === 'ws-analytics-preferences'),
    banner: () => elements.find(node => node.className === 'ws-analytics-consent'),
    consentAction: choice => elements.find(node => node.dataset.choice === choice),
    dispatch: detail => listeners.get('ws:analytics')?.({ detail }),
    fire: (name, event = {}) => listeners.get(name)?.(event),
    navigate(href, event = 'ws:routechange') { window.location = new URL(href, window.location.href); listeners.get(event)?.() },
    click: href => documentListeners.get('click')?.({ target: { closest: () => ({ href }) } }),
  }
}

test('an unconfigured identifier loads neither analytics nor a consent interface', () => {
  const app = browser({ configured: false })
  assert.equal(app.scripts.length, 0)
  assert.equal(app.banner(), undefined)
  assert.equal(app.window.dataLayer, undefined)
})

test('loads only on production hosts and explicitly public routes after consent', () => {
  for (const host of ['wallaceshift.com', 'www.wallaceshift.com', 'contractors.wallaceshift.com', 'roofers.wallaceshift.com']) {
    for (const path of ['/', '/services', '/pricing/', '/about', '/approach', '/contact', '/privacy', '/request-demo/', '/demos/contractors/', '/demos/roofers-offer', '/blog', '/blog/a-useful-crm-guide', '/offers/ai-business-integration', '/what-now']) {
      const app = browser({ href: `https://${host}${path}`, savedConsent: 'granted' })
      assert.equal(app.scripts.length, 1, `${host}${path}`)
      assert.equal(app.scripts[0].src, `https://www.googletagmanager.com/gtag/js?id=${testId}`)
      assert.equal(app.scripts[0].referrerPolicy, 'origin')
    }
  }
  for (const href of ['http://wallaceshift.com/', 'https://wallaceshift.com:8443/', 'https://localhost/', 'https://127.0.0.1/', 'https://wallace-shift-preview.vercel.app/', 'https://wallaceshift.com.example.org/', 'https://user:secret@wallaceshift.com/']) {
    const app = browser({ href, savedConsent: 'granted' })
    assert.equal(app.scripts.length, 0, href)
    assert.equal(app.banner(), undefined)
  }
})

test('never loads for private, admin, agreement, demo, experimental, or unknown paths', () => {
  for (const path of ['/client-portal?engagement=private#access=secret', '/client-portal/', '/demo-admin/', '/demo-agreement/', '/demos/roofers', '/roofing-dashboard', '/northvane', '/experiments/water-hero', '/anything', '/blog/someone@example.com', '/blog/%70rivate', '/blog/private/record', '/api/contact']) {
    const app = browser({ href: `https://wallaceshift.com${path}`, savedConsent: 'granted' })
    assert.equal(app.scripts.length, 0, path)
    assert.equal(app.banner(), undefined)
  }
})

test('basic consent sends nothing before opt-in and persists a rejected choice', () => {
  const app = browser()
  assert.equal(app.banner().hidden, false)
  assert.equal(app.preferences().hidden, true)
  assert.equal(app.consentAction('granted').focused, undefined, 'initial prompt does not steal focus')
  assert.equal(app.banner()['aria-labelledby'], 'ws-analytics-consent-title')
  app.dispatch({ name: 'enquiry_submitted', value: 'home_hero' })
  app.click('mailto:person@example.com')
  assert.equal(app.scripts.length, 0)
  assert.deepEqual(app.commands(), [])
  app.choose('denied')
  assert.equal(app.banner().hidden, true)
  assert.equal(app.preferences().hidden, false)
  assert.equal(app.preferences().focused, true)
  assert.deepEqual(app.writes, [[consentKey, 'denied']])
  assert.equal(app.scripts.length, 0)
  assert.deepEqual(app.commands(), [])
  const denied = browser({ savedConsent: 'denied' })
  assert.equal(denied.banner().hidden, true)
  assert.equal(denied.scripts.length, 0)
  app.preferences().click()
  assert.equal(app.banner().hidden, false)
  assert.equal(app.preferences().hidden, true)
  assert.equal(app.consentAction('granted').focused, true)
})

test('preferences never overlap the consent panel across reopening, routes, and storage updates', () => {
  const app = browser({ savedConsent: 'denied' })
  assert.equal(app.preferences().hidden, false)
  app.preferences().click()
  app.navigate('/pricing')
  assert.equal(app.banner().hidden, false)
  assert.equal(app.preferences().hidden, true)
  app.fire('storage', { key: consentKey, newValue: 'granted' })
  assert.equal(app.banner().hidden, true)
  assert.equal(app.preferences().hidden, false)
  app.fire('storage', { key: null, newValue: null })
  assert.equal(app.banner().hidden, false)
  assert.equal(app.preferences().hidden, true)
  app.navigate('/client-portal')
  assert.equal(app.banner().hidden, true)
  assert.equal(app.preferences().hidden, true)
  app.navigate('/contact')
  assert.equal(app.banner().hidden, false)
  assert.equal(app.preferences().hidden, true)
  app.choose('denied')
  assert.equal(app.banner().hidden, true)
  assert.equal(app.preferences().hidden, false)
})

test('affirmative consent initializes once with advertising and automatic views disabled', () => {
  const app = browser()
  app.choose('granted')
  app.rerun()
  assert.equal(app.scripts.length, 1)
  assert.deepEqual(app.writes, [[consentKey, 'granted']])
  const commands = app.commands()
  assert.deepEqual(commands[0], ['consent', 'default', { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' }])
  assert.deepEqual(commands[1], ['consent', 'update', { analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' }])
  const config = commands.find(item => item[0] === 'config')[2]
  assert.equal(config.send_page_view, false)
  assert.equal(config.allow_google_signals, false)
  assert.equal(config.allow_ad_personalization_signals, false)
  assert.equal(app.events('page_view').length, 1)
  assert.equal(app.window[`ga-disable-${testId}`], false)
})

test('privacy preferences override saved consent and no Google code loads', () => {
  for (const preference of [{ navigator: { doNotTrack: '1' } }, { navigator: { doNotTrack: 'yes' } }, { navigator: { msDoNotTrack: '1' } }, { navigator: { globalPrivacyControl: true } }, { windowDnt: '1' }]) {
    const app = browser({ savedConsent: 'granted', ...preference })
    assert.equal(app.scripts.length, 0)
    assert.deepEqual(app.commands(), [])
    assert.equal(app.preferences().hidden, true)
    assert.equal(app.window[`ga-disable-${testId}`], true)
  }
})

test('blocked local storage still allows a per-document choice without breaking the page', () => {
  const app = browser({ storageBlocked: true })
  assert.equal(app.scripts.length, 0)
  assert.doesNotThrow(() => app.choose('granted'))
  assert.equal(app.scripts.length, 1)
  assert.doesNotThrow(() => app.choose('denied'))
  assert.equal(app.window[`ga-disable-${testId}`], true)
})

test('all GA URLs are filtered and referrers contain origins only', () => {
  const href = 'https://wallaceshift.com/contact/?email=person%40example.com&token=private&shift=custom-web-app&utm_source=LinkedIn&utm_medium=social&utm_campaign=fall-2026&utm_content=profile_link&utm_term=crm#access=secret'
  const app = browser({ href, referrer: 'https://example.com/private/person@example.com?token=secret#private', savedConsent: 'granted' })
  const data = app.events('page_view')[0][2]
  assert.equal(data.page_location, 'https://wallaceshift.com/contact?utm_source=linkedin&utm_medium=social&utm_campaign=fall-2026&utm_content=profile_link&utm_term=crm')
  assert.equal(data.page_referrer, 'https://example.com')
  assert.equal(data.page_title, '/contact')
  assert.doesNotMatch(JSON.stringify(app.commands()), /person%40|person@|token=|secret|custom-web-app/)
  for (const value of ['person@example.com', 'https://example.com', '1234567890', 'person.name', 'secret-access-token', 'a'.repeat(61), 'abc123def456abc123', 'individual_12345678', 'hello%40example.com']) {
    app.navigate(`https://wallaceshift.com/pricing?utm_source=${encodeURIComponent(value)}`)
    assert.equal(app.events('page_view').at(-1)[2].page_location, 'https://wallaceshift.com/pricing', value)
  }
  app.navigate('https://wallaceshift.com/about?utm_source=google&utm_source=facebook')
  assert.equal(app.events('page_view').at(-1)[2].page_location, 'https://wallaceshift.com/about')
})

test('manual SPA views deduplicate hash and arbitrary-query changes, track navigation and back', () => {
  const app = browser({ savedConsent: 'granted' })
  app.navigate('/#services')
  app.navigate('/?email=private#other')
  assert.equal(app.events('page_view').length, 1)
  app.navigate('/pricing/')
  app.navigate('/pricing#contact')
  app.navigate('/pricing?utm_source=linkedin')
  app.navigate('/', 'popstate')
  assert.deepEqual(app.events('page_view').map(item => item[2].page_location), ['https://wallaceshift.com/', 'https://wallaceshift.com/pricing', 'https://wallaceshift.com/pricing?utm_source=linkedin', 'https://wallaceshift.com/'])
  assert.equal(app.scripts.length, 1)
})

test('private SPA transitions disable Google and all event handlers until a public route returns', () => {
  const app = browser({ savedConsent: 'granted' })
  app.navigate('/client-portal?engagement=private#access=secret')
  assert.equal(app.window[`ga-disable-${testId}`], true)
  assert.equal(app.preferences().hidden, true)
  app.dispatch({ name: 'enquiry_submitted', value: 'contact_form' })
  app.click('mailto:someone@example.com')
  assert.equal(app.events().length, 1)
  app.navigate('/contact')
  assert.equal(app.window[`ga-disable-${testId}`], false)
  assert.equal(app.events('page_view').length, 2)
  app.navigator.globalPrivacyControl = true
  app.dispatch({ name: 'quiz_started' })
  assert.equal(app.window[`ga-disable-${testId}`], true)
  assert.equal(app.events().length, 2)
})

test('withdrawal disables pending collection, clears only GA cookies, and stops events', () => {
  const app = browser({ savedConsent: 'granted', cookies: '_ga=visitor; _ga_TEST12345=session; essential_session=keep' })
  app.preferences().click()
  app.choose('denied')
  assert.equal(app.window[`ga-disable-${testId}`], true)
  assert.equal(app.commands().at(-1)[2].analytics_storage, 'denied')
  assert.equal(app.cookieWrites.length, 8)
  assert.ok(app.cookieWrites.every(value => value.includes('Max-Age=0') && !value.includes('essential_session')))
  app.dispatch({ name: 'enquiry_submitted', value: 'home_hero' })
  app.navigate('/pricing')
  assert.equal(app.events().length, 1)
  app.choose('granted')
  assert.equal(app.scripts.length, 1)
  assert.equal(app.events('page_view').length, 2)
})

test('consent changes in another tab take effect immediately', () => {
  const app = browser({ savedConsent: 'granted' })
  app.fire('storage', { key: consentKey, newValue: 'denied' })
  assert.equal(app.window[`ga-disable-${testId}`], true)
  app.dispatch({ name: 'quiz_started' })
  assert.equal(app.events().length, 1)
  app.fire('storage', { key: consentKey, newValue: 'granted' })
  assert.equal(app.window[`ga-disable-${testId}`], false)
  assert.equal(app.events('page_view').length, 2)
})

test('restoring a cached page and clearing storage cannot restore withdrawn consent', () => {
  const app = browser({ savedConsent: 'granted' })
  app.setStoredConsent('denied')
  app.fire('pageshow', { persisted: true })
  assert.equal(app.window[`ga-disable-${testId}`], true)
  app.dispatch({ name: 'quiz_started' })
  assert.equal(app.events().length, 1)
  app.choose('granted')
  app.fire('storage', { key: null, newValue: null })
  assert.equal(app.window[`ga-disable-${testId}`], true)
  assert.equal(app.banner().hidden, false)
})

test('conversion bridge accepts only known values and emits each success as one generate_lead', () => {
  const app = browser({ savedConsent: 'granted' })
  app.dispatch({ name: 'enquiry_submitted', value: 'contact_form', email: 'private@example.com' })
  app.dispatch({ name: 'enquiry_failed', value: 'roofing_offer' })
  app.dispatch({ name: 'demo_request_submitted', value: 'roofers-2' })
  app.dispatch({ name: 'demo_request_failed' })
  app.dispatch({ name: 'demo_preview_played', value: 'northvane' })
  app.dispatch({ name: 'quiz_started' })
  app.dispatch({ name: 'quiz_completed' })
  assert.equal(app.events('generate_lead').length, 2)
  assert.equal(app.events('enquiry_submitted').length, 0)
  assert.equal(app.events('demo_request_submitted').length, 0)
  assert.equal(app.events('generate_lead')[0][2].form_surface, 'contact_form')
  assert.equal(app.events('generate_lead')[1][2].demo_id, 'roofers-2')
  assert.equal(app.events('generate_lead')[1][2].lead_type, 'demo_request')
  for (const detail of [null, 'private@example.com', { name: 'unknown_event' }, { name: 'enquiry_submitted', value: 'private@example.com' }, { name: 'enquiry_submitted' }, { name: 'demo_request_failed', value: 'arbitrary-id' }, { name: 'demo_preview_played', value: 'arbitrary-id' }, { name: 'quiz_completed', value: 'private@example.com' }]) app.dispatch(detail)
  assert.equal(app.events().length, 8)
  assert.doesNotMatch(JSON.stringify(app.events()), /private@example|arbitrary-id/)
})

test('demo handoff context is labelled only with a known demo id', () => {
  const app = browser({ href: 'https://wallaceshift.com/contact?demo=deercreek', savedConsent: 'granted' })
  app.dispatch({ name: 'demo_handoff_viewed', value: 'deercreek' })
  app.dispatch({ name: 'enquiry_submitted', value: 'contact_form', demo: 'deercreek' })
  app.dispatch({ name: 'enquiry_failed', value: 'contact_form', demo: 'deercreek' })
  app.dispatch({ name: 'enquiry_submitted', value: 'contact_form', demo: 'private@example.com' })
  for (const detail of [{ name: 'demo_handoff_viewed', value: 'arbitrary-id' }, { name: 'demo_handoff_viewed' }, { name: 'demo_handoff_viewed', value: 'private@example.com' }]) app.dispatch(detail)
  assert.equal(app.events('demo_handoff_viewed').length, 1)
  assert.equal(app.events('demo_handoff_viewed')[0][2].demo_id, 'deercreek')
  assert.equal(app.events('demo_handoff_viewed')[0][2].page_location, 'https://wallaceshift.com/contact', 'the query string never reaches GA')
  const leads = app.events('generate_lead')
  assert.equal(leads.length, 2)
  assert.equal(leads[0][2].demo_id, 'deercreek')
  assert.equal(leads[0][2].form_surface, 'contact_form')
  assert.equal('demo_id' in leads[1][2], false, 'an unknown demo value is dropped, not forwarded')
  assert.equal(app.events('enquiry_failed')[0][2].demo_id, 'deercreek')
  assert.doesNotMatch(JSON.stringify(app.events()), /private@example|arbitrary-id/)
})

test('AI offer funnel emits fixed labels only on its own route, without answers or click IDs', () => {
  const app = browser({
    href: 'https://wallaceshift.com/offers/ai-business-integration?gclid=private-click-id&email=private%40example.com&utm_campaign=ai_workflow#private',
    savedConsent: 'granted',
  })
  app.dispatch({ name: 'offer_application_start', email: 'private@example.com' })
  const steps = ['bottleneck', 'authority', 'business', 'impact', 'experience', 'tools', 'context', 'readiness', 'contact']
  for (const value of steps) {
    app.dispatch({ name: 'offer_application_step', value, task: 'Private client task', budget: '$10,000' })
  }
  app.dispatch({ name: 'offer_application_submit', leadId: 'private-lead-id', email: 'private@example.com' })
  assert.equal(app.events('offer_application_start').length, 1)
  assert.deepEqual(app.events('offer_application_step').map(item => item[2].form_step), steps)
  assert.equal(app.events('offer_application_submit').length, 1)
  assert.equal(app.events('generate_lead').length, 0, 'the dedicated submission event is not duplicated as a second conversion')
  for (const value of ['package', 'consultation', 'resource']) {
    app.dispatch({ name: 'offer_recommendation_view', value, revenue: 'private-revenue', role: 'private-role', aiBarriers: ['private-barrier'] })
  }
  assert.deepEqual(app.events('offer_recommendation_view').map(item => item[2].recommendation_type), ['package', 'consultation', 'resource'])
  assert.equal(app.events('offer_application_submit').length, 1, 'viewing a local recommendation is not a saved request')
  for (const event of app.events().filter(item => item[1].startsWith('offer_application_'))) {
    assert.equal(event[2].offer_id, 'ai_business_integration')
    assert.equal(event[2].page_location, 'https://wallaceshift.com/offers/ai-business-integration?utm_campaign=ai_workflow')
  }
  for (const detail of [
    { name: 'offer_application_start', value: 'private@example.com' },
    { name: 'offer_application_step', value: 'private@example.com' },
    { name: 'offer_application_step', value: 1 },
    { name: 'offer_application_submit', value: 'private-lead-id' },
    { name: 'offer_recommendation_view', value: 'private-revenue' },
  ]) app.dispatch(detail)
  assert.equal(app.events().length, 15)
  assert.doesNotMatch(JSON.stringify(app.events()), /private|10,000|client task|gclid/)
  app.navigate('/contact')
  app.dispatch({ name: 'offer_application_submit' })
  app.dispatch({ name: 'offer_application_step', value: 'bottleneck' })
  app.dispatch({ name: 'offer_recommendation_view', value: 'package' })
  assert.equal(app.events('offer_application_submit').length, 1, 'other public routes cannot emit offer conversions')
  assert.equal(app.events('offer_recommendation_view').length, 3)
})

test('AI offer events honor consent, privacy signals, and private-route transitions', () => {
  const href = 'https://wallaceshift.com/offers/ai-business-integration'
  for (const settings of [{}, { savedConsent: 'denied' }, { savedConsent: 'granted', navigator: { doNotTrack: '1' } }, { savedConsent: 'granted', navigator: { globalPrivacyControl: true } }]) {
    const app = browser({ href, ...settings })
    app.dispatch({ name: 'offer_application_start' })
    app.dispatch({ name: 'offer_application_step', value: 'authority' })
    app.dispatch({ name: 'offer_recommendation_view', value: 'package' })
    app.dispatch({ name: 'offer_application_submit' })
    assert.equal(app.events().length, 0)
    assert.equal(app.scripts.length, 0)
  }
  const app = browser({ href, savedConsent: 'granted' })
  app.navigate('/client-portal?engagement=private')
  app.dispatch({ name: 'offer_application_submit' })
  assert.equal(app.window[`ga-disable-${testId}`], true)
  assert.equal(app.events('offer_application_submit').length, 0)
})

test('click events exclude addresses, link text, query strings, and unknown downloads', () => {
  const app = browser({ savedConsent: 'granted' })
  app.click('mailto:person@example.com?subject=Private%20message')
  app.click('tel:+15551234567')
  app.click('/resources/blog/wallace-shift-business-systems-worksheets.xlsx?email=private#secret')
  app.click('/resources/client-private-agreement.pdf')
  app.click('https://other.example/resources/automation-opportunity-worksheet.pdf')
  app.click('/client-portal?engagement=private')
  assert.deepEqual(app.events().map(item => item[1]), ['page_view', 'email_clicked', 'phone_clicked', 'resource_download_clicked'])
  assert.equal(app.events('resource_download_clicked')[0][2].resource, '/resources/blog/wallace-shift-business-systems-worksheets.xlsx')
  assert.doesNotMatch(JSON.stringify(app.events()), /person@example|15551234567|secret|Private/)
})

test('90 percent scroll is measured once per public page, never before consent', () => {
  const app = browser()
  app.window.scrollY = 2200
  app.fire('scroll')
  assert.deepEqual(app.events(), [])
  app.choose('granted')
  app.window.scrollY = 1600
  app.fire('scroll')
  assert.equal(app.events('scroll').length, 0)
  app.window.scrollY = 2000
  app.fire('scroll')
  app.fire('scroll')
  assert.equal(app.events('scroll').length, 1)
  assert.equal(app.events('scroll')[0][2].percent_scrolled, 90)
  app.navigate('/pricing')
  app.fire('scroll')
  assert.equal(app.events('scroll').length, 2)
})

test('a blocked queue never throws into forms or links', () => {
  const app = browser({ savedConsent: 'granted' })
  app.window.dataLayer = { push() { throw new Error('Tracker unavailable') } }
  assert.doesNotThrow(() => app.dispatch({ name: 'enquiry_submitted', value: 'home_hero' }))
  assert.doesNotThrow(() => app.click('mailto:person@example.com'))
})

test('all public document entrypoints include exactly one shared bootstrap', async () => {
  for (const relative of ['index.html', 'demos/contractors/index.html', 'demos/roofers-offer/index.html', 'request-demo/index.html', 'blog/publish.ts']) {
    const html = await readFile(new URL(`../${relative}`, import.meta.url), 'utf8')
    assert.equal((html.match(/src="\/site-analytics\.js"/g) ?? []).length, 1, relative)
  }
  assert.doesNotMatch(source, /_vercel|window\.va\b/)
})
