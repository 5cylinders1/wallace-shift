import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BusinessDashboard } from '../../src/business-dashboard/BusinessDashboard'
import '../../src/client-portal/client-portal.css'
import { createFixtureSnapshot, createPublishingFixture, fixtureEngagements, type FixtureScenario } from './fixtures'

const initial = new URLSearchParams(window.location.search).get('scenario')
const scenarios: FixtureScenario[] = ['connected', 'partial', 'empty', 'error', 'expired']
let currentScenario: FixtureScenario = scenarios.includes(initial as FixtureScenario) ? initial as FixtureScenario : 'connected'
let failRefresh = false
const originalFetch = window.fetch
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } })
const originalSessionStorage = Object.getOwnPropertyDescriptor(window, 'sessionStorage')
const previewSession = new Map<string, string>()
// The real publisher remembers drafts in sessionStorage. Keep its normal code
// path while ensuring this preview cannot read or clear an owner's saved draft.
Object.defineProperty(window, 'sessionStorage', { configurable: true, value: {
  get length() { return previewSession.size },
  clear: () => previewSession.clear(),
  getItem: (key: string) => previewSession.get(String(key)) ?? null,
  key: (index: number) => Array.from(previewSession.keys())[index] ?? null,
  removeItem: (key: string) => { previewSession.delete(String(key)) },
  setItem: (key: string, value: string) => { previewSession.set(String(key), String(value)) },
} satisfies Storage })

// This interceptor exists only in this unbuilt prototype document. It never forwards
// requests to a server, provider or real customer record, even for unknown endpoints.
window.fetch = async (input, init) => {
  const request = input instanceof Request ? input : null
  const url = new URL(request?.url ?? String(input), window.location.href)
  const method = (init?.method ?? request?.method ?? 'GET').toUpperCase()
  const signal = init?.signal ?? request?.signal
  if (signal?.aborted) throw new DOMException('The fixture request was aborted.', 'AbortError')
  if (url.origin !== window.location.origin || method !== 'GET') return json({ ok: false, error: 'forbidden', detail: 'All writes and external requests are blocked in the local fixture preview.' }, 403)
  if (url.pathname === '/api/business-dashboard') {
    if (currentScenario === 'expired') return json({ ok: false, error: 'access_required' }, 401)
    if (currentScenario === 'error' || failRefresh) return json({ ok: false, error: 'dashboard_unavailable' }, 503)
    const requestedDays = Number(url.searchParams.get('days'))
    const days = requestedDays === 7 || requestedDays === 90 ? requestedDays : 30
    return json({ ok: true, snapshot: createFixtureSnapshot(days, currentScenario) })
  }
  if (url.pathname === '/api/business-publishing') {
    if (currentScenario === 'expired') return json({ ok: false, error: 'access_required' }, 401)
    if (url.searchParams.has('draftId')) return json({ ok: false, error: 'draft_not_found' }, 404)
    return json({ ok: true, snapshot: createPublishingFixture(currentScenario) })
  }
  if (url.pathname === '/api/client-portal') return json({ ok: true, authenticated: true, admin: true, email: 'sample-owner@example.test', engagements: currentScenario === 'empty' ? [] : fixtureEngagements })
  return json({ ok: false, error: 'fixture_endpoint_not_available' }, 404)
}
if (import.meta.hot) import.meta.hot.dispose(() => {
  window.fetch = originalFetch
  if (originalSessionStorage) Object.defineProperty(window, 'sessionStorage', originalSessionStorage)
})

export function Preview() {
  const [scenario, setScenario] = useState(currentScenario)
  const [shouldFail, setShouldFail] = useState(false)
  const [notice, setNotice] = useState('')
  const changeScenario = (next: FixtureScenario) => {
    currentScenario = next
    failRefresh = false
    setShouldFail(false)
    setNotice('')
    setScenario(next)
    const url = new URL(window.location.href)
    url.searchParams.set('scenario', next)
    window.history.replaceState(null, '', url)
  }
  const previewProps = {
    onOpenAgreements: () => setNotice('Agreements open in the authenticated owner portal. This isolated preview only displays synthetic records.'),
    onOpenClient: (id: string) => setNotice(`Sample client selected: ${fixtureEngagements.find(item => item.id === id)?.client ?? id}. Real client details remain in the authenticated owner portal.`),
    engagements: scenario === 'empty' ? [] : fixtureEngagements,
  }
  return <div className="client-portal" onClickCapture={event => {
    const link = (event.target as Element).closest?.('a')
    if (!link || link.hasAttribute('download') || link.href.startsWith('blob:') || link.getAttribute('href')?.startsWith('#')) return
    event.preventDefault()
    setNotice('Navigation to live workspaces and provider sites is disabled in this isolated preview. All displayed records are synthetic.')
  }}>
    <style>{`
      :root { --font-sans: 'Manrope', 'Avenir Next', system-ui, sans-serif; }
      @font-face { font-family: 'Manrope'; src: url('/videos/contractor-previews/fonts/manrope-400.ttf') format('truetype'); font-weight: 400; font-style: normal; font-display: swap; }
      @font-face { font-family: 'Manrope'; src: url('/videos/contractor-previews/fonts/manrope-700.ttf') format('truetype'); font-weight: 600 800; font-style: normal; font-display: swap; }
      body { margin: 0; background: #edf1f2; }
      .fixture-bar { display: flex; flex-wrap: wrap; align-items: center; gap: 12px 24px; padding: 14px clamp(18px, 3vw, 44px); background: #080d12; color: #edf1f2; font-size: 12px; }
      .fixture-bar strong { font-size: 13px; }
      .fixture-bar p { margin-top: 2px; color: #bacbd8; font-size: 11px; }
      .fixture-controls { display: flex; align-items: center; flex-wrap: wrap; gap: 12px 20px; margin-left: auto; }
      .fixture-controls label { display: flex; align-items: center; gap: 8px; }
      .fixture-controls select { min-height: 38px; border: 1px solid #718593; border-radius: 5px; padding: 6px 28px 6px 10px; background: #172834; color: #edf1f2; }
      .fixture-controls input { accent-color: #4fa8ff; }
      .fixture-bar :focus-visible { outline-color: #83c3ff; }
      .fixture-notice { display: flex; justify-content: space-between; align-items: center; gap: 20px; background: #dceaf5; color: #163e60; padding: 12px 4%; border-bottom: 1px solid #b6cedf; font-size: 12px; }
      .fixture-notice button { background: transparent; border: 0; min-height: 36px; color: #163e60; text-decoration: underline; }
      @media (max-width: 640px) { .fixture-controls { margin-left: 0; width: 100%; } .fixture-bar { gap: 9px; } }
    `}</style>
    <header className="fixture-bar">
      <div><strong>Local dashboard preview</strong><p>Synthetic data only. No accounts connected. All writes blocked.</p></div>
      <div className="fixture-controls">
        <label>Scenario <select value={scenario} onChange={event => changeScenario(event.target.value as FixtureScenario)}>{scenarios.map(value => <option key={value} value={value}>{({ connected: 'Connected sample', partial: 'Partial data', empty: 'Zero activity', error: 'Initial load error', expired: 'Expired session' })[value]}</option>)}</select></label>
        <label><input type="checkbox" checked={shouldFail} onChange={event => { failRefresh = event.target.checked; setShouldFail(event.target.checked) }} />Fail refresh requests</label>
      </div>
    </header>
    {notice && <div className="fixture-notice" role="status"><p>{notice}</p><button type="button" onClick={() => setNotice('')}>Dismiss</button></div>}
    <BusinessDashboard key={scenario} {...previewProps} />
  </div>
}

createRoot(document.getElementById('root')!).render(<Preview />)
