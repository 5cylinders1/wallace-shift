import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath, pathToFileURL } from 'node:url'
import ts from 'typescript'

// Execute the real TS domain/adapter and the bundled CSVs on Node 20, without
// adding a test runtime or requiring browser globals. Emit only to a temp folder.
const root = fileURLToPath(new URL('../src/roofing-dashboard/', import.meta.url))
const outputRoot = await mkdtemp(join(tmpdir(), 'roofing-dashboard-tests-'))
const compiled = new Map()
async function compile(relativePath) {
  if (compiled.has(relativePath)) return compiled.get(relativePath)
  const outputPath = join(outputRoot, `${relativePath.replace(/\?raw$/, '')}.mjs`)
  compiled.set(relativePath, outputPath)
  const raw = relativePath.endsWith('?raw')
  const sourcePath = resolve(root, relativePath.replace(/\?raw$/, ''))
  const source = await readFile(sourcePath, 'utf8')
  let output = raw ? `export default ${JSON.stringify(source)};` : ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext },
  }).outputText
  if (!raw) {
    for (const match of [...output.matchAll(/(from\s+)(['"])(\.[^'"]+)\2/g)]) {
      const specifier = match[3]
      const dependency = join(dirname(relativePath), specifier.endsWith('?raw') ? specifier : `${specifier}.ts`)
      const dependencyOutput = await compile(dependency)
      output = output.replace(match[0], `from ${JSON.stringify(pathToFileURL(dependencyOutput).href)}`)
    }
  }
  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(outputPath, output)
  return outputPath
}
const load = async relativePath => import(pathToFileURL(await compile(relativePath)).href)
const { filterEvents, distanceMiles, pointInPolygon, matchProperties, summarize, localDateTime, formatEventTime } = await load('domain.ts')
const { northvaneConfig, coastalConfig, midwestScenario, coastalScenario } = await load('demo/config.ts')
const { createFixtureDataSource, parseSampleCustomerCsv } = await load('adapters/fixtureDataSource.ts')
after(async () => { await rm(outputRoot, { recursive: true, force: true }) })

const property = (id, point) => ({ id, point, address: `${id} Example Lane`, city: 'Demo city', postalCode: '64101', relationship: 'prospect', contact: null, source: 'Test fixture', roofAge: null, doNotContact: false, activity: [] })
const event = (id, occurredAt, extra = {}) => ({ id, occurredAt, title: id, type: 'hail', evidence: 'report', source: 'Test fixture', magnitude: null, description: 'Synthetic event', point: [-94.7, 39], ...extra })
const square = [[-1, -1], [1, -1], [1, 1], [-1, 1], [-1, -1]]
const appointment = { date: '2026-10-11', time: '09:30', assignee: 'Alex Demo' }

test('event filters use local calendar days and exclude future events', () => {
  const events = [
    event('last-night-local', '2026-10-10T04:59:00Z'), // Oct 9 in Chicago
    event('today-boundary', '2026-10-10T05:00:00Z'),
    event('week-boundary', '2026-10-04T05:00:00Z'),
    event('before-week', '2026-10-04T04:59:00Z'),
    event('future', '2026-10-10T20:01:00Z'),
    event('invalid', 'not-a-date'),
  ]
  assert.deepEqual(filterEvents(events, { type: 'all', days: 1 }, midwestScenario).map(item => item.id), ['today-boundary'])
  assert.deepEqual(new Set(filterEvents(events, { type: 'hail', days: 7 }, midwestScenario).map(item => item.id)), new Set(['last-night-local', 'today-boundary', 'week-boundary']))
  assert.equal(filterEvents(events, { type: 'wind', days: 30 }, midwestScenario).length, 0)
  assert.equal(filterEvents(events, { type: 'all', days: 1 }, coastalScenario).length, 2)
})

test('calendar filtering does not assume every local day has 24 hours', () => {
  const scenario = { ...midwestScenario, referenceDate: '2026-11-01T22:00:00Z' }
  const events = [event('midnight', '2026-11-01T05:00:00Z'), event('before-midnight', '2026-11-01T04:59:00Z'), event('after-clock-change', '2026-11-01T08:00:00Z')]
  assert.deepEqual(new Set(filterEvents(events, { type: 'all', days: 1 }, scenario).map(item => item.id)), new Set(['midnight', 'after-clock-change']))
  assert.deepEqual(localDateTime(midwestScenario.referenceDate, midwestScenario.timezone), { date: '2026-10-10', time: '15:00' })
  assert.match(formatEventTime('2026-10-10T01:20:00Z', 'America/Chicago'), /Oct 9/)
})

test('polygon boundaries are included and proximity uses geographic distance', () => {
  for (const point of [[0, 0], [1, 0], [-1, -1]]) assert.equal(pointInPolygon(point, square), true)
  assert.equal(pointInPolygon([1.001, 0], square), false)
  assert.equal(pointInPolygon([0, 0], []), false)
  assert.equal(distanceMiles([0, 0], [0, 0]), 0)
  assert.ok(Math.abs(distanceMiles([0, 0], [0, 1]) - 69.0934) < 0.01)
})

test('matching distinguishes footprints, report proximity, warnings, and service area', () => {
  const events = [
    event('footprint', '2026-10-10T12:00:00Z', { evidence: 'estimated', point: [0, 0], footprint: square }),
    event('report', '2026-10-10T12:00:00Z', { point: [0, 0] }),
    event('warning', '2026-10-10T12:00:00Z', { evidence: 'warning', point: [0, 0], footprint: square }),
    event('missing-footprint', '2026-10-10T12:00:00Z', { evidence: 'estimated', point: [0, 0] }),
  ]
  const matches = matchProperties([property('center', [0, 0]), property('edge', [1, 0]), property('outside', [1.1, 0])], events, 5, square)
  assert.deepEqual(matches.map(item => [item.property.id, item.matches.map(match => match.event.id)]), [['center', ['footprint', 'report']], ['edge', ['footprint']]])
  assert.match(matches[0].matches[0].reason, /estimated/)
  assert.match(matches[0].matches[1].reason, /mi from hail report/)
  assert.equal(matchProperties([property('near', [0, 0.1])], [events[1]], 5).length, 0)
  assert.equal(matchProperties([property('near', [0, 0.1])], [events[1]], 7).length, 1)
})

test('fixture snapshots are independent copies and load validates configured scenarios', async () => {
  const source = createFixtureDataSource(northvaneConfig)
  const initial = await source.load('midwest')
  assert.equal(initial.properties.length, 36)
  initial.properties[0].address = 'Changed outside adapter'
  initial.events[0].footprint[0][0] = 999
  assert.notEqual((await source.load('midwest')).properties[0].address, 'Changed outside adapter')
  assert.notEqual((await source.load('midwest')).events[0].footprint[0][0], 999)
  assert.equal((await source.load('coastal')).properties.length, 20)
  await assert.rejects(source.load('unknown'), /scenario/)
  const isolated = createFixtureDataSource({ ...northvaneConfig, scenarios: [midwestScenario] })
  await assert.rejects(isolated.load('coastal'), /scenario/)
})

test('seeded worklist associations are supported by geometry rather than hardcoded weather IDs', async () => {
  const source = createFixtureDataSource(northvaneConfig)
  for (const scenario of northvaneConfig.scenarios) {
    const state = await source.load(scenario.id)
    for (const row of state.followUps) {
      const target = state.properties.find(item => item.id === row.propertyId)
      const evidence = matchProperties([target], state.events, 3, scenario.serviceArea)[0]?.matches ?? []
      assert.deepEqual(row.eventIds, evidence.map(match => match.event.id))
    }
  }
})

test('worklists deduplicate property/event IDs and never add warning evidence', async () => {
  const source = createFixtureDataSource(northvaneConfig)
  await source.addToWorklist('midwest', ['northvane-property-15', 'northvane-property-15'], ['midwest-hail-report', 'midwest-warning'], 5)
  const state = await source.addToWorklist('midwest', ['northvane-property-15'], ['midwest-hail-report', 'midwest-wind-report'], 5)
  const rows = state.followUps.filter(item => item.propertyId === 'northvane-property-15')
  assert.equal(rows.length, 1)
  assert.deepEqual(rows[0].eventIds, ['midwest-hail-report', 'midwest-wind-report'])
  assert.equal(rows[0].status, 'to-contact')
  // Changing the current radius does not erase earlier valid associations.
  const retained = await source.addToWorklist('midwest', ['northvane-property-15'], ['midwest-hail-report'])
  assert.deepEqual(retained.followUps.find(item => item.propertyId === 'northvane-property-15').eventIds, rows[0].eventIds)
})

test('bulk adds associate each property only with its matching evidence and respect the requested radius', async () => {
  const source = createFixtureDataSource(northvaneConfig)
  const eventIds = ['midwest-hail-report', 'midwest-wind-report', 'midwest-wind-footprint', 'midwest-warning']
  let state = await source.addToWorklist('midwest', ['northvane-property-14', 'northvane-property-21'], eventIds, 5)
  assert.deepEqual(state.followUps.find(item => item.propertyId === 'northvane-property-14').eventIds, ['midwest-wind-report'])
  assert.deepEqual(state.followUps.find(item => item.propertyId === 'northvane-property-21').eventIds, ['midwest-hail-report'])
  // Property 15 is between the reports, outside the default three-mile radius.
  state = await source.addToWorklist('midwest', ['northvane-property-15'], eventIds)
  assert.deepEqual(state.followUps.find(item => item.propertyId === 'northvane-property-15').eventIds, [])
  state = await source.addToWorklist('midwest', ['northvane-property-15'], eventIds, 5)
  assert.deepEqual(state.followUps.find(item => item.propertyId === 'northvane-property-15').eventIds, ['midwest-hail-report', 'midwest-wind-report'])
  // Manual records may have no weather linkage; outside-area properties never gain one.
  state = await source.addToWorklist('midwest', ['northvane-property-07'], [])
  assert.deepEqual(state.followUps.find(item => item.propertyId === 'northvane-property-07').eventIds, [])
  state = await source.addToWorklist('midwest', ['northvane-property-36'], eventIds, 100)
  assert.deepEqual(state.followUps.find(item => item.propertyId === 'northvane-property-36').eventIds, [])
})

test('DNC and not-interested records reject add, enrichment, and appointments without partial updates', async () => {
  const source = createFixtureDataSource(northvaneConfig)
  for (const id of ['northvane-property-06', 'northvane-property-09']) {
    await assert.rejects(source.addToWorklist('midwest', ['northvane-property-08', id], []), /Do not contact|Not interested/)
    await assert.rejects(source.scheduleInspection('midwest', id, appointment), /Do not contact|Not interested/)
    await assert.rejects(source.enrichProperty('midwest', id), /Do not contact|Not interested/)
  }
  assert.equal((await source.load('midwest')).followUps.some(item => item.propertyId === 'northvane-property-08'), false)
  await assert.rejects(source.updateFollowUp('midwest', 'northvane-property-06', 'contacted', ''), /Do not contact/)
})

test('appointments validate local dates/time, reschedule in place, and preserve state on failure', async () => {
  const source = createFixtureDataSource(northvaneConfig)
  const id = 'northvane-property-03'
  for (const input of [
    { ...appointment, date: '2026-10-09' }, { ...appointment, date: '2026-10-10', time: '14:59' },
    { ...appointment, date: '2026-02-30' }, { ...appointment, time: '25:00' }, { ...appointment, time: '9:30' },
    { ...appointment, assignee: ' ' },
  ]) await assert.rejects(source.scheduleInspection('midwest', id, input), /valid inspection|inspector/)
  assert.equal((await source.load('midwest')).inspections.find(item => item.propertyId === id).date, '2026-10-12')
  await source.scheduleInspection('midwest', id, { ...appointment, date: '2026-10-10', time: '15:00' })
  const state = await source.scheduleInspection('midwest', id, { ...appointment, time: '11:00' })
  const inspections = state.inspections.filter(item => item.propertyId === id)
  assert.equal(inspections.length, 1)
  assert.equal(inspections[0].time, '11:00')
  assert.equal(inspections[0].id, 'northvane-inspection-3')
  assert.equal(state.followUps.find(item => item.propertyId === id).status, 'scheduled')
  await assert.rejects(source.scheduleInspection('coastal', 'coastal-property-03', { ...appointment, date: '2026-10-10', time: '15:30' }), /valid inspection/)
})

test('completion, cancellation, and DNC keep follow-ups and inspections consistent', async () => {
  const source = createFixtureDataSource(northvaneConfig)
  const id = 'northvane-property-03'
  let state = await source.updateFollowUp('midwest', id, 'completed', 'Fictional inspection complete.')
  assert.equal(state.inspections.find(item => item.propertyId === id).status, 'completed')
  state = await source.scheduleInspection('midwest', id, appointment)
  assert.equal(state.inspections.filter(item => item.propertyId === id).length, 1)
  state = await source.updateFollowUp('midwest', id, 'contacted', 'Appointment cancelled; waiting for a new date.')
  assert.equal(state.inspections.find(item => item.propertyId === id).status, 'cancelled')
  await assert.rejects(source.updateFollowUp('midwest', id, 'scheduled', ''), /date and time/)
  await source.scheduleInspection('midwest', id, appointment)
  state = await source.updateFollowUp('midwest', id, 'do-not-contact', 'Fictional homeowner request.')
  assert.equal(state.properties.find(item => item.id === id).doNotContact, true)
  assert.equal(state.inspections.find(item => item.propertyId === id).status, 'cancelled')
  assert.equal(summarize(state, []).scheduled, 0)
})

test('fictional enrichment retains unknown permission and a no-match leaves no fabricated contact', async () => {
  const source = createFixtureDataSource(northvaneConfig)
  const state = await source.enrichProperty('midwest', 'northvane-property-11')
  const contact = state.properties.find(item => item.id === 'northvane-property-11').contact
  assert.equal(contact.permission, 'unknown')
  assert.match(contact.email, /@example\.com$/)
  assert.match(contact.phone, /555-01\d{2}$/)
  await assert.rejects(source.enrichProperty('midwest', 'northvane-property-10'), /No fictional contact match/)
  assert.equal((await source.load('midwest')).properties.find(item => item.id === 'northvane-property-10').contact, null)
  await assert.rejects(source.enrichProperty('midwest', 'northvane-property-01'), /prospective properties only/)
})

test('sample CSV imports once per scenario, skips existing IDs, and preserves missing contacts', async () => {
  const source = createFixtureDataSource(northvaneConfig)
  const original = await source.load('midwest')
  const imported = await source.importSampleCsv('midwest')
  assert.equal(imported.properties.length, original.properties.length + 3)
  assert.equal(imported.sampleImported, true)
  assert.deepEqual(imported.properties[0], original.properties[0])
  assert.equal(imported.properties.find(item => item.id === 'northvane-import-02').contact, null)
  assert.equal(imported.properties.find(item => item.id === 'northvane-import-03').contact.phone, null)
  assert.equal((await source.importSampleCsv('midwest')).properties.length, imported.properties.length)
  assert.equal((await source.load('coastal')).sampleImported, false)
  const coast = await source.importSampleCsv('coastal')
  assert.equal(coast.properties.length, 23)
  assert.equal(coast.properties.some(item => item.id.startsWith('northvane')), false)
})

test('CSV parser supports quoted addresses and rejects malformed coordinates before import', () => {
  const header = 'id,name,email,phone,address,city,postalCode,longitude,latitude,roofAge\n'
  const row = 'example,Alex Example,alex@example.com,,"42 Example Lane, Unit A",Demo city,64101,-94.7,39,Unknown'
  assert.equal(parseSampleCustomerCsv(header + row, midwestScenario)[0].address, '42 Example Lane, Unit A')
  assert.throws(() => parseSampleCustomerCsv('id,address\na,b', midwestScenario), /missing a required column/)
  assert.throws(() => parseSampleCustomerCsv(header + row.replace(',-94.7,39,', ',,39,'), midwestScenario), /valid ID, address and map coordinates/)
  assert.throws(() => parseSampleCustomerCsv(header + row.replace(',-94.7,39,', ',-94.7,99,'), midwestScenario), /valid ID, address and map coordinates/)
  assert.throws(() => parseSampleCustomerCsv(header + row + '\n' + row, midwestScenario), /repeats a property ID/)
})

test('scenario state survives switches, config instances stay isolated, and reset restores all scenarios', async () => {
  const source = createFixtureDataSource(northvaneConfig)
  const otherClient = createFixtureDataSource(coastalConfig)
  await source.addToWorklist('midwest', ['northvane-property-07'], [])
  await source.importSampleCsv('coastal')
  assert.equal((await source.load('midwest')).followUps.some(item => item.propertyId === 'northvane-property-07'), true)
  assert.equal((await otherClient.load('coastal')).sampleImported, false)
  await source.reset()
  assert.equal((await source.load('midwest')).followUps.some(item => item.propertyId === 'northvane-property-07'), false)
  assert.equal((await source.load('coastal')).sampleImported, false)
  assert.equal((await source.load('coastal')).properties.length, 20)
})

test('disabled optional features fail explicitly without mutating sample state', async () => {
  const source = createFixtureDataSource({ ...northvaneConfig, features: { enrichment: false, sampleImport: false, websiteLeads: true } })
  await assert.rejects(source.importSampleCsv('midwest'), /not enabled/)
  await assert.rejects(source.enrichProperty('midwest', 'northvane-property-11'), /not enabled/)
  assert.equal((await source.load('midwest')).sampleImported, false)
})
