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
    for (const path of ['/', '/services', '/pricing/', '/about', '/approach', '/contact', '/privacy', '/request-demo/', '/demos/contractors/', '/demos/roofers-offer', '/blog', '/blog/a-useful-crm-guide', '/offers/ai-business-integration', '/offers/contractor-websites', '/offers/lead-page-follow-up', '/what-now']) {
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
  for (const path of ['/mail', '/mail/', '/mail?subject=private', '/client-portal?engagement=private#access=secret', '/client-portal/', '/demo-admin/', '/demo-agreement/', '/demos/roofers', '/roofing-dashboard', '/northvane', '/experiments/water-hero', '/anything', '/blog/someone@example.com', '/blog/%70rivate', '/blog/private/record', '/api/contact']) {
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

test('a direct unconfirmed booking URL initializes listeners without loading Google or sending events', () => {
  const app = browser({ href: 'https://wallaceshift.com/offers/ai-business-integration/confirmation', savedConsent: 'granted' })
  assert.equal(app.window.__wsAnalyticsInitialized, true)
  for (const value of [undefined, false, 'true', 1, {}]) {
    app.window.__wsAiBookingConfirmed = value
    app.fire('ws:routechange')
    app.dispatch({ name: 'quiz_completed' })
    app.click('mailto:private@example.com')
  }
  assert.equal(app.scripts.length, 0)
  assert.deepEqual(app.commands(), [])
  assert.equal(app.window[`ga-disable-${testId}`], true)
  app.navigate('/offers/ai-business-integration')
  assert.equal(app.scripts.length, 1, 'redirecting to the quiz still enables consented analytics')
  assert.deepEqual(app.events('page_view').map(event => event[2].page_location), ['https://wallaceshift.com/offers/ai-business-integration'])
})

test('a validated booking transition records its distinct confirmation page once', () => {
  const app = browser({ href: 'https://wallaceshift.com/offers/ai-business-integration', savedConsent: 'granted' })
  app.window.__wsAiBookingConfirmed = true
  app.navigate('/offers/ai-business-integration/confirmation')
  app.fire('ws:routechange')
  assert.equal(app.scripts.length, 1)
  assert.deepEqual(app.events('page_view').map(event => event[2].page_location), [
    'https://wallaceshift.com/offers/ai-business-integration',
    'https://wallaceshift.com/offers/ai-business-integration/confirmation',
  ])
  app.window.__wsAiBookingConfirmed = false
  app.fire('ws:routechange')
  assert.equal(app.window[`ga-disable-${testId}`], true)
  app.dispatch({ name: 'quiz_completed' })
  assert.equal(app.events().length, 2)
})

test('restoring a confirmed booking then dispatching routechange sends only a sanitized confirmation URL', () => {
  const app = browser({
    href: 'https://wallaceshift.com/offers/ai-business-integration/confirmation/?utm_source=Google&utm_campaign=ai_consultation&email=private%40example.com&gclid=private-click&booking=private-id#token=private-token',
    referrer: 'https://calendly.com/private-person/consultation?invitee=private@example.com',
    savedConsent: 'granted',
  })
  assert.equal(app.scripts.length, 0)
  app.window.__wsAiBookingConfirmed = true
  app.fire('ws:routechange')
  app.fire('ws:routechange')
  assert.equal(app.scripts.length, 1)
  assert.equal(app.events('page_view').length, 1)
  assert.deepEqual(app.events('page_view')[0][2], {
    send_to: testId,
    page_location: 'https://wallaceshift.com/offers/ai-business-integration/confirmation?utm_source=google&utm_campaign=ai_consultation',
    page_referrer: 'https://calendly.com',
    page_title: '/offers/ai-business-integration/confirmation',
  })
  assert.doesNotMatch(JSON.stringify(app.commands()), /private|gclid|invitee|booking|token/)
})

test('booking confirmation never overrides analytics consent or browser privacy preferences', () => {
  for (const options of [
    {},
    { savedConsent: 'denied' },
    { savedConsent: 'granted', navigator: { globalPrivacyControl: true } },
    { savedConsent: 'granted', navigator: { doNotTrack: '1' } },
  ]) {
    const app = browser({ href: 'https://wallaceshift.com/offers/ai-business-integration/confirmation', ...options })
    app.window.__wsAiBookingConfirmed = true
    app.fire('ws:routechange')
    assert.equal(app.scripts.length, 0)
    assert.deepEqual(app.commands(), [])
    assert.equal(app.window[`ga-disable-${testId}`], true)
  }
  const app = browser({ href: 'https://wallaceshift.com/offers/ai-business-integration/confirmation' })
  app.choose('granted')
  assert.equal(app.scripts.length, 0, 'consent alone does not confirm a booking')
  app.window.__wsAiBookingConfirmed = true
  app.fire('ws:routechange')
  assert.equal(app.events('page_view').length, 1)
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

test('homepage contact panel records where it opened, contact choices, package links and meetings with fixed labels only', () => {
  const app = browser({ savedConsent: 'granted' })
  for (const value of ['home_hero', 'home_packages', 'home_comparison', 'home_questions', 'home_addon_agents', 'home_addon_follow_up', 'home_addon_workspace']) app.dispatch({ name: 'contact_open', value, email: 'private@example.com' })
  for (const value of ['phone', 'meeting', 'direct']) app.dispatch({ name: 'contact_choice', value, surface: 'home_questions', phone: '913-555-0100' })
  for (const value of ['website', 'lead']) app.dispatch({ name: 'package_link', value })
  app.dispatch({ name: 'meeting_booked', value: 'home_hero' })
  app.dispatch({ name: 'enquiry_submitted', value: 'home_questions' })
  app.dispatch({ name: 'enquiry_submitted', value: 'home_packages' })
  for (const detail of [{ name: 'contact_open' }, { name: 'contact_open', value: 'private@example.com' }, { name: 'hero_contact_open' }, { name: 'contact_choice', value: 'email', surface: 'home_hero' }, { name: 'contact_choice', value: 'phone' }, { name: 'contact_choice', value: 'phone', surface: 'private' }, { name: 'package_link', value: 'private-plan' }, { name: 'meeting_booked', value: 'private' }]) app.dispatch(detail)
  assert.deepEqual(app.events('contact_open').map(event => event[2].form_surface), ['home_hero', 'home_packages', 'home_comparison', 'home_questions', 'home_addon_agents', 'home_addon_follow_up', 'home_addon_workspace'])
  assert.equal(app.events('hero_contact_open').length, 0)
  assert.deepEqual(app.events('contact_choice').map(event => [event[2].contact_method, event[2].form_surface]), [['phone', 'home_questions'], ['meeting', 'home_questions'], ['direct', 'home_questions']])
  assert.deepEqual(app.events('package_link').map(event => event[2].package_id), ['website', 'lead'])
  assert.deepEqual(app.events('generate_lead').map(event => [event[2].lead_type, event[2].form_surface]), [['meeting', 'home_hero'], ['enquiry', 'home_questions'], ['enquiry', 'home_packages']])
  assert.doesNotMatch(JSON.stringify(app.events()), /private|913-555/)

  const elsewhere = browser({ href: 'https://wallaceshift.com/pricing', savedConsent: 'granted' })
  elsewhere.dispatch({ name: 'contact_open', value: 'home_hero' })
  elsewhere.dispatch({ name: 'contact_choice', value: 'phone', surface: 'home_hero' })
  elsewhere.dispatch({ name: 'package_link', value: 'website' })
  assert.equal(elsewhere.events('contact_open').length + elsewhere.events('contact_choice').length + elsewhere.events('package_link').length, 0)

  const undecided = browser()
  undecided.dispatch({ name: 'contact_open', value: 'home_hero' })
  undecided.dispatch({ name: 'meeting_booked', value: 'home_hero' })
  assert.deepEqual(undecided.commands(), [])
})

test('homepage package checkout records only the fixed package id, and verification as one lead', () => {
  const app = browser({ savedConsent: 'granted' })
  app.dispatch({ name: 'package_checkout_open', value: 'website', email: 'private@example.com' })
  app.dispatch({ name: 'package_checkout_code_sent', value: 'lead' })
  app.dispatch({ name: 'package_checkout_verified', value: 'lead', name_entered: 'Private Person' })
  app.dispatch({ name: 'package_checkout_open', value: 'private-plan' })
  assert.deepEqual(app.events('begin_checkout').map(event => event[2].package_id), ['website'])
  assert.deepEqual(app.events('package_checkout_code_sent').map(event => event[2].package_id), ['lead'])
  assert.deepEqual(app.events('generate_lead').map(event => [event[2].lead_type, event[2].package_id]), [['purchase_started', 'lead']])
  assert.doesNotMatch(JSON.stringify(app.events()), /private|Private/)
  const elsewhere = browser({ href: 'https://wallaceshift.com/pricing', savedConsent: 'granted' })
  elsewhere.dispatch({ name: 'package_checkout_open', value: 'website' })
  assert.equal(elsewhere.events('begin_checkout').length, 0)
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

test('Site B website handoff records its own fixed demo id without query details', () => {
  const app = browser({ href: 'https://wallaceshift.com/contact?demo=deercreekplumbing&project=website', savedConsent: 'granted' })
  app.dispatch({ name: 'demo_handoff_viewed', value: 'deercreekplumbing' })
  app.dispatch({ name: 'enquiry_submitted', value: 'contact_form', demo: 'deercreekplumbing' })
  assert.equal(app.events('demo_handoff_viewed')[0][2].demo_id, 'deercreekplumbing')
  assert.equal(app.events('demo_handoff_viewed')[0][2].page_location, 'https://wallaceshift.com/contact')
  assert.equal(app.events('generate_lead')[0][2].demo_id, 'deercreekplumbing')
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

test('contractor offer views begin on first consent and share page view navigation deduplication', () => {
  const app = browser({ href: 'https://wallaceshift.com/offers/contractor-websites?email=private%40example.com#demo' })
  assert.equal(app.events().length, 0)
  app.dispatch({ name: 'contractor_offer_viewed', value: 'website' })
  assert.equal(app.events().length, 0, 'mounting before consent does not transmit data')
  app.choose('granted')
  assert.equal(app.events('page_view').length, 1)
  assert.equal(app.events('contractor_offer_viewed').length, 1, 'first consent records the already visible offer')
  assert.equal(app.events('contractor_offer_viewed')[0][2].offer_id, 'website')
  assert.equal(app.events('contractor_offer_viewed')[0][2].page_location, 'https://wallaceshift.com/offers/contractor-websites')
  app.fire('ws:routechange')
  app.navigate('/offers/contractor-websites#pricing')
  app.navigate('/offers/contractor-websites?message=private')
  app.dispatch({ name: 'contractor_offer_viewed', value: 'website' })
  app.choose('granted')
  assert.equal(app.events('contractor_offer_viewed').length, 1, 'hashes, private query data, repeated consent, and custom events cannot duplicate the view')
  app.navigate('/offers/lead-page-follow-up')
  app.fire('ws:routechange')
  assert.deepEqual(app.events('contractor_offer_viewed').map(event => event[2].offer_id), ['website', 'lead-follow-up'])
  app.navigate('/contact')
  app.dispatch({ name: 'contractor_offer_viewed', value: 'website' })
  assert.equal(app.events('contractor_offer_viewed').length, 2)
  app.navigate('/offers/contractor-websites', 'popstate')
  assert.deepEqual(app.events('contractor_offer_viewed').map(event => event[2].offer_id), ['website', 'lead-follow-up', 'website'])
  assert.equal(app.events('page_view').length, 4, 'one matching offer event per corresponding deduplicated public page view')
  assert.doesNotMatch(JSON.stringify(app.events()), /private/)
})

test('contractor offers measure demonstrations and inquiries with only fixed labels on the matching route', () => {
  const offers = [
    ['website', '/offers/contractor-websites'],
    ['lead-follow-up', '/offers/lead-page-follow-up'],
  ]
  const interactions = ['contractor_offer_demo', 'contractor_offer_form_started', 'contractor_offer_failed']
  for (const [value, path] of offers) {
    const app = browser({
      href: `https://wallaceshift.com${path}/?utm_source=google&utm_campaign=contractor_offer&email=private%40example.com&gclid=private-click#private`,
      savedConsent: 'granted',
    })
    assert.equal(app.events('contractor_offer_viewed').length, 1)
    assert.equal(app.events('contractor_offer_viewed')[0][2].offer_id, value)
    for (const name of interactions) {
      app.dispatch({ name, value, email: 'private@example.com', readiness: 'private-answer', message: 'Private client question' })
      assert.equal(app.events(name).length, 1)
      assert.equal(app.events(name)[0][2].offer_id, value)
      assert.equal('inquiry_intent' in app.events(name)[0][2], false)
    }
    assert.equal(app.events('generate_lead').length, 0, 'browsing, starting, and failed sends never count as leads')
    for (const readiness of ['ready', 'questions', 'planning']) {
      app.dispatch({ name: 'contractor_offer_submitted', value, readiness, nameOfPerson: 'Private Name', phone: '5555555555', decisionRole: 'private-role', timing: 'private-timing', businessName: 'Private Business' })
    }
    assert.deepEqual(app.events('generate_lead').map(event => event[2].inquiry_intent), ['ready', 'questions', 'planning'], 'information requests and later plans count as inquiries too')
    assert.equal(app.events('contractor_offer_submitted').length, 0, 'success maps to one conversion event only')
    for (const event of app.events('generate_lead')) {
      assert.equal(event[2].lead_type, 'contractor_offer')
      assert.equal(event[2].form_surface, 'contractor_offer')
      assert.equal(event[2].offer_id, value)
      assert.equal(event[2].page_location, `https://wallaceshift.com${path}?utm_source=google&utm_campaign=contractor_offer`)
    }
    for (const readiness of [undefined, null, 1, {}, 'private@example.com']) {
      app.dispatch({ name: 'contractor_offer_submitted', value, readiness })
      assert.equal('inquiry_intent' in app.events('generate_lead').at(-1)[2], false, 'unknown optional intent is dropped')
    }
    const count = app.events().length
    for (const name of [...interactions, 'contractor_offer_submitted']) {
      for (const unknown of [undefined, null, {}, 'private@example.com', offers.find(([offer]) => offer !== value)[0]]) {
        app.dispatch({ name, value: unknown, readiness: 'ready' })
      }
    }
    app.dispatch({ name: 'contractor_offer_unknown', value })
    assert.equal(app.events().length, count, 'unknown or mismatched offer events are rejected')
    assert.doesNotMatch(JSON.stringify(app.events()), /private|Private|5555555555|gclid/)
    app.navigate('/contact')
    app.dispatch({ name: 'contractor_offer_submitted', value, readiness: 'ready' })
    assert.equal(app.events('generate_lead').length, 8, 'other public routes cannot emit this offer lead')
  }
})

test('contractor offer events respect consent, privacy signals, withdrawal, and private route transitions', () => {
  const href = 'https://wallaceshift.com/offers/contractor-websites'
  const names = ['contractor_offer_viewed', 'contractor_offer_demo', 'contractor_offer_form_started', 'contractor_offer_submitted', 'contractor_offer_failed']
  for (const settings of [{}, { savedConsent: 'denied' }, { savedConsent: 'granted', navigator: { doNotTrack: '1' } }, { savedConsent: 'granted', navigator: { globalPrivacyControl: true } }]) {
    const app = browser({ href, ...settings })
    for (const name of names) app.dispatch({ name, value: 'website', readiness: 'questions' })
    assert.equal(app.events().length, 0)
    assert.equal(app.scripts.length, 0)
  }
  const app = browser({ href, savedConsent: 'granted' })
  app.choose('denied')
  for (const name of names) app.dispatch({ name, value: 'website', readiness: 'questions' })
  assert.equal(app.events('generate_lead').length, 0)
  app.choose('granted')
  app.navigate('/client-portal?engagement=private')
  for (const name of names) app.dispatch({ name, value: 'website', readiness: 'questions' })
  assert.equal(app.window[`ga-disable-${testId}`], true)
  assert.equal(app.events('generate_lead').length, 0)
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
