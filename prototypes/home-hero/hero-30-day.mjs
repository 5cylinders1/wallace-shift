// Read-only GA4 check for the homepage hero, 30 days (or a chosen range) after launch.
// Prints aggregates only, using the business dashboard's read-only Google connection.
//
//   node --env-file=.env.local prototypes/home-hero/hero-30-day.mjs 2026-11-20 [2026-12-20]
//
// Shows, by device: homepage sessions, how often the form was opened, which contact option was picked,
// which package row was tapped, and hero requests and Meet bookings sent. GA4 only counts visitors who
// accepted analytics, so treat small numbers as a direction. Add callbacks, Meet bookings and direct
// calls from your own records for the full picture: GA4 cannot see phone calls.
const [start, end = 'today'] = process.argv.slice(2)
if (!/^\d{4}-\d{2}-\d{2}$/.test(start ?? '')) { console.log('Pass the launch date as YYYY-MM-DD.'); process.exit(1) }
const env = process.env
if (!env.DASHBOARD_GOOGLE_REFRESH_TOKEN || !env.DASHBOARD_GA4_PROPERTY_ID) { console.log('Dashboard Google credentials are not set. Run with --env-file=.env.local.'); process.exit(1) }
const token = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'refresh_token', client_id: env.DASHBOARD_GOOGLE_CLIENT_ID, client_secret: env.DASHBOARD_GOOGLE_CLIENT_SECRET, refresh_token: env.DASHBOARD_GOOGLE_REFRESH_TOKEN }) }).then(r => r.json())
if (!token.access_token) { console.log('Google token request failed.'); process.exit(1) }
const property = env.DASHBOARD_GA4_PROPERTY_ID.trim()
async function report(body) {
  const response = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${property}:runReport`, { method: 'POST', headers: { authorization: `Bearer ${token.access_token}`, 'content-type': 'application/json' }, body: JSON.stringify({ dateRanges: [{ startDate: start, endDate: end }], ...body }) })
  const data = await response.json()
  if (!response.ok) return null
  return (data.rows ?? []).map(row => [...(row.dimensionValues ?? []).map(v => v.value), ...(row.metricValues ?? []).map(v => Number(v.value))])
}
const exact = (fieldName, value) => ({ filter: { fieldName, stringFilter: { matchType: 'EXACT', value } } })
const and = (...expressions) => ({ andGroup: { expressions } })
const table = (title, rows, header) => { console.log(`\n${title}`); if (!rows) { console.log('  not available: this breakdown needs a GA4 custom dimension (see below)'); return } if (!rows.length) { console.log('  none recorded'); return } console.log(`  ${header}`); for (const row of rows) console.log(`  ${row.join('  ')}`) }

const sessions = await report({ dimensions: [{ name: 'deviceCategory' }], metrics: [{ name: 'sessions' }], dimensionFilter: exact('landingPage', '/') })
const opens = await report({ dimensions: [{ name: 'deviceCategory' }], metrics: [{ name: 'eventCount' }], dimensionFilter: and(exact('eventName', 'contact_open'), exact('customEvent:form_surface', 'home_hero')) })
console.log(`Homepage hero, ${start} to ${end}`)
table('Sessions starting on the homepage', sessions, 'device  sessions')
table('Contact form opened from the hero', opens, 'device  opens')
for (const [device, count] of sessions ?? []) {
  const opened = opens?.find(row => row[0] === device)?.[1] ?? 0
  console.log(`  ${device}: ${count ? Math.round(opened / count * 100) : 0}% of homepage sessions opened the form`)
}
table('Contact option picked', await report({ dimensions: [{ name: 'customEvent:contact_method' }], metrics: [{ name: 'eventCount' }], dimensionFilter: and(exact('eventName', 'contact_choice'), exact('customEvent:form_surface', 'home_hero')) }), 'option  count')
table('Contact option events, total (works without the custom dimension)', await report({ metrics: [{ name: 'eventCount' }], dimensionFilter: and(exact('eventName', 'contact_choice'), exact('customEvent:form_surface', 'home_hero')) }), 'count')
table('Package row tapped', await report({ dimensions: [{ name: 'customEvent:package_id' }], metrics: [{ name: 'eventCount' }], dimensionFilter: exact('eventName', 'package_link') }), 'package  count')
table('Package row taps, total', await report({ metrics: [{ name: 'eventCount' }], dimensionFilter: exact('eventName', 'package_link') }), 'count')
table('Requests sent from the hero form', await report({ dimensions: [{ name: 'customEvent:lead_type' }, { name: 'deviceCategory' }], metrics: [{ name: 'eventCount' }], dimensionFilter: and(exact('eventName', 'generate_lead'), exact('customEvent:form_surface', 'home_hero')) }), 'type (enquiry = callback, meeting = Meet booked)  device  count')
console.log('\nTo see which option and which package, register two event-scoped custom dimensions in GA4 (Admin > Custom definitions): contact_method and package_id. They count from the day they are added.')
console.log('Direct calls are not in GA4. Compare callbacks, Meet bookings and calls from your own records for the same dates.')
