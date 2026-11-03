import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import ts from 'typescript'

const compile = source => ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext } }).outputText
const url = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`
const schemaUrl = url(compile(await readFile(new URL('../src/content/aiOffer.ts', import.meta.url), 'utf8')))
const { aiOffer, aiPackages, recommendAiOpportunity, routeAiOpportunity, isAiBookingQualified, qualificationSteps, workflowOptions, roleOptions, revenueOptions, weeklyHoursOptions, impactOptions, budgetOptions, timingOptions } = await import(schemaUrl)
const adapter = compile(await readFile(new URL('../src/lib/aiOpportunityAdapter.ts', import.meta.url), 'utf8'))
const { submitAiOpportunity, validateAiOpportunity, normalizeAiOpportunity, createAiOpportunityPayload, initialAiOpportunityValues } = await import(url(adapter.replaceAll("'../content/aiOffer'", `'${schemaUrl}'`)))

const valid = {
  businessType: 'Example business', workflows: ['admin'], workflowDetails: 'We turn job notes into customer updates by hand.', currentTools: 'Email and spreadsheets',
  weeklyHours: '6_10', impacts: ['delay'], impactDetails: '', timing: 'soon', role: 'owner', approverAvailability: '', revenue: '250k_1m',
  aiExperience: 'considered', aiBarriers: ['technical'], budget: 'ready',
  name: 'Example person', businessName: 'Example business', email: 'example@example.com', website: '',
  contactMethod: 'email', phone: '', offerAcknowledged: true, contactConsent: true, company: '',
  nextStep: 'consultation', packageId: '',
}
const payload = { ...valid, submissionId: '412621ae-e86a-49ee-b25b-063842f71913', offerVersion: aiOffer.version }
const saved = { ok: true, applicationId: '5178cafe-46cb-40b0-b2e4-8061b45f0262', route: 'fit_call', notification: 'queued' }

async function withFetch(fake, callback) {
  const original = globalThis.fetch
  globalThis.fetch = fake
  try { await callback() } finally { globalThis.fetch = original }
}

test('final timing choices preserve existing values and present the four requested labels in order', () => {
  assert.deepEqual(timingOptions, [
    { value: 'now', label: 'Now' },
    { value: 'soon', label: 'Within the next month' },
    { value: 'quarter', label: 'Within 3 months' },
    { value: 'exploring', label: 'Just researching' },
  ])
  for (const { value: timing } of timingOptions) {
    assert.deepEqual(validateAiOpportunity({ ...valid, timing }, 'readiness'), {})
  }
})

test('direct booking requires independent purchase authority, investment approval and near term timing across every combination', () => {
  for (const { value: role } of roleOptions) {
    for (const { value: budget } of budgetOptions) {
      for (const { value: timing } of timingOptions) {
        assert.equal(isAiBookingQualified({ role, budget, timing }), ['owner', 'decision_maker'].includes(role) && budget === 'ready' && ['now', 'soon'].includes(timing), `${role}/${budget}/${timing}`)
      }
    }
  }
})

test('direct booking does not inherit recommendation gates or treat missing and unknown answers as qualified', () => {
  for (const timing of ['now', 'soon']) {
    const answers = { ...valid, timing, role: 'decision_maker', revenue: 'not_trading', workflows: ['demand'] }
    assert.equal(recommendAiOpportunity(answers).kind, 'preparation')
    assert.equal(isAiBookingQualified(answers), true)
  }
  for (const input of [null, undefined, {}, { role: 'owner' }, { role: 'owner', budget: 'ready' }, { role: 'owner', timing: 'now' }, { budget: 'ready', timing: 'now' }, { role: 'unknown', budget: 'ready', timing: 'now' }, { role: 'owner', budget: '', timing: 'now' }, { role: 'owner', budget: 'ready', timing: '' }, { role: 'owner', budget: 'yes', timing: 'now' }, { role: 'owner', budget: 'ready', timing: 'immediately' }, { role: 'owner', budget: true, timing: 'now' }, { role: 'owner', budget: 'ready', timing: ['now'] }]) {
    assert.equal(isAiBookingQualified(input), false)
  }
})

test('question order places purchase authority immediately before investment and uses the requested uncertainty labels', () => {
  assert.deepEqual(qualificationSteps.map(step => step.id), ['bottleneck', 'business', 'impact', 'experience', 'context', 'authority', 'readiness'])
  assert.equal(qualificationSteps.find(step => step.id === 'authority').heading, 'Are you authorized to approve a purchase for this business?')
  assert.equal(revenueOptions.find(option => option.value === 'prefer_not').label, "I don't know")
  assert.equal(weeklyHoursOptions.find(option => option.value === 'not_sure').label, "I don't know")
  assert.equal(impactOptions.find(option => option.value === 'not_sure').label, "I don't know")
  assert.equal(impactOptions.find(option => option.value === 'other').label, 'other')
})

test('quiz validation permits a local recommendation before contact details or consent', () => {
  const quiz = { ...valid, businessType: '', name: '', email: '', contactConsent: false, offerAcknowledged: false }
  for (const step of qualificationSteps) assert.deepEqual(validateAiOpportunity(quiz, step.id), {})
  assert.ok(validateAiOpportunity(quiz, 'contact').email)
  assert.deepEqual(validateAiOpportunity({ ...initialAiOpportunityValues, workflows: ['inquiries'] }, 'bottleneck'), {})
})

test('business type is optional contact context and does not affect qualification', () => {
  const values = { ...valid, businessType: '' }
  assert.deepEqual(validateAiOpportunity(values), {})
  assert.deepEqual(recommendAiOpportunity(values), recommendAiOpportunity(valid))
  assert.deepEqual(validateAiOpportunity({ ...values, businessType: 'x'.repeat(121) }, 'business'), {})
  assert.ok(validateAiOpportunity({ ...values, businessType: 'x'.repeat(121) }, 'contact').businessType)
})

test('phone consultations do not require email while a supplied address is validated', () => {
  const phone = { ...valid, contactMethod: 'call', phone: '+1 555 555 0100', email: '' }
  assert.deepEqual(validateAiOpportunity(phone, 'contact'), {})
  assert.ok(validateAiOpportunity({ ...phone, email: 'not-an-email' }, 'contact').email)
  assert.ok(validateAiOpportunity({ ...phone, phone: '' }, 'contact').phone)
  assert.ok(validateAiOpportunity({ ...phone, contactMethod: 'email' }, 'contact').email)
})

test('package selection uses the shared catalog and requires an email contact', () => {
  for (const packageId of Object.keys(aiPackages)) {
    assert.deepEqual(validateAiOpportunity({ ...valid, nextStep: 'package', packageId }, 'contact'), {})
  }
  for (const packageId of ['', 'invented', 'constructor', '__proto__']) {
    assert.ok(validateAiOpportunity({ ...valid, nextStep: 'package', packageId }, 'contact').packageId)
  }
  assert.ok(validateAiOpportunity({ ...valid, nextStep: 'package', packageId: 'inquiry', email: '' }, 'contact').email)
  assert.ok(validateAiOpportunity({ ...valid, nextStep: 'package', packageId: 'notes', contactMethod: 'call', phone: '+1 555 555 0100' }, 'contact').contactMethod)
  assert.ok(validateAiOpportunity({ ...valid, nextStep: 'unknown' }, 'contact').nextStep)
  assert.ok(validateAiOpportunity({ ...valid, packageId: 'inquiry' }, 'contact').packageId)
})

test('changing conversion paths clears hidden package or phone details without changing quiz answers', () => {
  const packageValues = { ...valid, nextStep: 'package', packageId: 'inquiry', contactMethod: 'call', phone: '+1 555 555 0100' }
  const selected = normalizeAiOpportunity(packageValues)
  assert.equal(selected.contactMethod, 'email')
  assert.equal(selected.phone, '')
  assert.equal(selected.packageId, 'inquiry')
  assert.equal(packageValues.phone, '+1 555 555 0100')
  assert.deepEqual(selected.workflows, valid.workflows)
  const consultation = normalizeAiOpportunity({ ...packageValues, nextStep: 'consultation' })
  assert.equal(consultation.packageId, '')
  assert.equal(consultation.contactMethod, 'call')
  assert.equal(consultation.phone, '+1 555 555 0100')
  const built = createAiOpportunityPayload(packageValues, payload.submissionId)
  assert.equal(built.nextStep, 'package')
  assert.equal(built.packageId, 'inquiry')
  assert.equal(built.contactMethod, 'email')
  assert.equal(built.phone, '')
})

test('unknown selection values, missing acknowledgments, and excessive input are rejected', () => {
  const errors = validateAiOpportunity({ ...valid, budget: 'made_up', businessType: 'x'.repeat(121), offerAcknowledged: false, contactConsent: false })
  assert.deepEqual(Object.keys(errors).sort(), ['budget', 'businessType', 'contactConsent', 'offerAcknowledged'])
})

test('authority does not require the removed approver follow up and its answer cannot qualify another role', () => {
  assert.deepEqual(validateAiOpportunity(valid, 'authority'), {})
  for (const role of ['joint', 'researching']) {
    assert.deepEqual(validateAiOpportunity({ ...valid, role }, 'authority'), {})
    assert.deepEqual(validateAiOpportunity({ ...valid, role, approverAvailability: 'yes' }, 'authority'), {})
    assert.equal(isAiBookingQualified({ ...valid, role, approverAvailability: 'yes' }), false)
  }
})

test('other consequence requires bounded explanation and hiding the branch clears stale details', () => {
  for (const impactDetails of ['', '   ', 'x'.repeat(1501)]) assert.ok(validateAiOpportunity({ ...valid, impacts: ['other'], impactDetails }, 'impact').impactDetails)
  assert.deepEqual(validateAiOpportunity({ ...valid, impacts: ['other', 'cost'], impactDetails: '  Customers have to repeat their requests.  ' }, 'impact'), {})
  const values = { ...valid, impacts: ['other'], impactDetails: '  Customers repeat requests.\nWe reenter the same details.  ' }
  assert.equal(normalizeAiOpportunity(values).impactDetails, values.impactDetails, 'normalization preserves whitespace while the visitor is typing')
  const built = createAiOpportunityPayload(values, payload.submissionId)
  assert.equal(built.impactDetails, 'Customers repeat requests.\nWe reenter the same details.')
  assert.equal(values.impactDetails, '  Customers repeat requests.\nWe reenter the same details.  ')
  assert.equal(normalizeAiOpportunity({ ...values, impacts: ['delay'] }).impactDetails, '')
  const old = { ...valid }; delete old.impactDetails
  assert.deepEqual(validateAiOpportunity(old, 'impact'), {})
  assert.equal(normalizeAiOpportunity(old).impactDetails, '')
})

test('multi-select responses enforce bounds, known choices, uniqueness, and uncertainty exclusivity', () => {
  for (const impacts of [[], ['delay', 'missed', 'cost'], ['delay', 'delay'], ['invented'], ['not_sure', 'delay']]) {
    assert.ok(validateAiOpportunity({ ...valid, impacts }, 'impact').impacts)
  }
  assert.deepEqual(validateAiOpportunity({ ...valid, impacts: ['not_sure'], workflowDetails: '' }, 'impact'), {})
  for (const aiBarriers of [[], ['time', 'value', 'privacy'], ['time', 'time'], ['invented']]) {
    assert.ok(validateAiOpportunity({ ...valid, aiBarriers }, 'experience').aiBarriers)
  }
  assert.deepEqual(validateAiOpportunity({ ...valid, aiExperience: 'new', aiBarriers: [] }, 'experience'), {})
})

test('bottlenecks allow all specific issues and keep uncertainty exclusive', () => {
  const issues = workflowOptions.filter(option => option.value !== 'not_sure').map(option => option.value)
  assert.deepEqual(validateAiOpportunity({ ...valid, workflows: issues }, 'bottleneck'), {})
  assert.deepEqual(validateAiOpportunity({ ...valid, workflows: ['not_sure'] }, 'bottleneck'), {})
  for (const workflows of [[], 'admin', ['unknown'], ['admin', 'admin'], ['admin', 'not_sure']]) {
    assert.ok(validateAiOpportunity({ ...valid, workflows }, 'bottleneck').workflows)
  }
  const values = { ...valid, workflows: ['admin', 'handoffs', 'demand'] }
  const built = createAiOpportunityPayload(values, payload.submissionId)
  assert.deepEqual(built.workflows, values.workflows)
  assert.notEqual(built.workflows, values.workflows)
  assert.equal('workflow' in built, false)
})

test('multiple issues get a consultation without dropping context or selecting an arbitrary package', () => {
  for (const workflows of [['inquiries', 'admin'], ['admin', 'demand'], ['demand', 'admin'], ['owner', 'capacity', 'handoffs']]) {
    const result = recommendAiOpportunity({ ...valid, workflows })
    assert.equal(result.kind, 'consultation')
    assert.equal(result.packageId, null)
    assert.notEqual(result.route, 'resource')
  }
  assert.deepEqual(recommendAiOpportunity({ ...valid, workflows: ['admin', 'demand'] }), recommendAiOpportunity({ ...valid, workflows: ['demand', 'admin'] }))
  assert.equal(recommendAiOpportunity({ ...valid, workflows: ['admin', 'demand'], role: 'researching', approverAvailability: 'no' }).kind, 'preparation')
})

test('payload construction removes obsolete branch answers without mutating the form', () => {
  const values = { ...valid, role: 'decision_maker', approverAvailability: 'yes', aiExperience: 'new', aiBarriers: ['privacy'], phone: '+1 555 555 0100' }
  const normalized = normalizeAiOpportunity(values)
  assert.equal(normalized.approverAvailability, '')
  assert.deepEqual(normalized.aiBarriers, [])
  assert.equal(normalized.phone, '')
  assert.deepEqual(values.aiBarriers, ['privacy'])
  assert.equal(values.approverAvailability, 'yes')
  assert.deepEqual(createAiOpportunityPayload(values, payload.submissionId), { ...normalized, submissionId: payload.submissionId, offerVersion: aiOffer.version })
  const resource = normalizeAiOpportunity({ ...valid, budget: 'unavailable' })
  assert.equal(resource.offerAcknowledged, false)
  assert.deepEqual(validateAiOpportunity(resource), {})
})

test('commercial gates cannot be offset by revenue when recommending a next step', () => {
  const excluded = [
    { budget: 'unavailable' }, { revenue: 'not_trading' }, { workflows: ['demand'] }, { timing: 'exploring' },
    { role: 'joint', approverAvailability: 'no' }, { role: 'joint', approverAvailability: 'not_sure' },
    { role: 'researching', approverAvailability: 'no' }, { role: 'researching', approverAvailability: 'not_sure' },
  ]
  for (const overrides of excluded) {
    const result = recommendAiOpportunity({ ...valid, revenue: 'over_5m', ...overrides })
    assert.equal(result.route, 'resource')
    assert.equal(result.kind, 'preparation')
    assert.equal(result.packageId, null)
  }
  for (const role of ['joint', 'researching']) assert.equal(recommendAiOpportunity({ ...valid, role, approverAvailability: 'yes' }).kind, 'consultation')
  assert.equal(routeAiOpportunity({ ...valid, budget: 'approval' }), 'manual_review')
  assert.equal(routeAiOpportunity({ ...valid, budget: 'value' }), 'manual_review')
})

test('revenue is a prioritization signal, not a cutoff for an otherwise suitable buyer', () => {
  for (const revenue of ['under_100k', '100k_250k', 'prefer_not']) {
    const result = recommendAiOpportunity({ ...valid, revenue })
    assert.equal(result.kind, 'package')
    assert.equal(result.priority, 'standard')
  }
  for (const revenue of ['250k_1m', '1m_5m', 'over_5m']) assert.equal(recommendAiOpportunity({ ...valid, revenue }).priority, 'established')
})

test('unresolved scope goes to consultation and AI history changes guidance without penalizing familiarity', () => {
  for (const overrides of [{ weeklyHours: 'under_2' }, { weeklyHours: 'not_sure' }, { impacts: ['not_sure'] }, { workflows: ['other'] }]) {
    assert.equal(recommendAiOpportunity({ ...valid, ...overrides }).kind, 'consultation')
  }
  for (const aiExperience of ['new', 'considered', 'individual_tools', 'disappointed', 'established']) {
    assert.equal(recommendAiOpportunity({ ...valid, aiExperience }).kind, 'package')
  }
  const result = recommendAiOpportunity({ ...valid, aiExperience: 'disappointed', aiBarriers: ['accuracy', 'privacy'] })
  assert.equal(result.barrierGuidance.length, 2)
  assert.match(result.barrierGuidance[0], /review/)
  assert.match(result.barrierGuidance[1], /information/)
  assert.equal(recommendAiOpportunity({ ...valid, workflows: ['inquiries'] }).packageId, 'inquiry')
  assert.equal(recommendAiOpportunity(valid).packageId, 'notes')
  assert.deepEqual(recommendAiOpportunity({ ...valid, currentTools: '' }), recommendAiOpportunity(valid))
  assert.equal(recommendAiOpportunity(initialAiOpportunityValues).kind, 'consultation')
})

test('a phone number is required only for a requested call and must be plausible', () => {
  assert.deepEqual(validateAiOpportunity(valid), {})
  assert.ok(validateAiOpportunity({ ...valid, contactMethod: 'call', phone: '' }).phone)
  assert.ok(validateAiOpportunity({ ...valid, contactMethod: 'call', phone: '+1 555 ABC 0000' }).phone)
  assert.deepEqual(validateAiOpportunity({ ...valid, contactMethod: 'call', phone: '+1 (555) 555-0100' }), {})
})

test('optional website accepts an ordinary HTTP(S) address, not scripts or embedded credentials', () => {
  for (const website of ['', 'https://example.com', 'http://www.example.com/about']) assert.deepEqual(validateAiOpportunity({ ...valid, website }), {})
  for (const website of ['javascript:alert(1)', 'https://name:secret@example.com', 'example.com', 'https://localhost']) assert.ok(validateAiOpportunity({ ...valid, website }).website)
})

test('durable success accepts queued notification without claiming that an email was sent', async () => {
  await withFetch(async (input, options) => {
    assert.equal(input, '/api/ai-opportunity')
    assert.equal(options.method, 'POST')
    assert.deepEqual(JSON.parse(options.body), payload)
    assert.ok(options.signal instanceof AbortSignal)
    return new Response(JSON.stringify(saved), { status: 200 })
  }, async () => assert.deepEqual(await submitAiOpportunity(payload), saved))
})

test('SPA HTML, a bare success flag, and an HTTP failure cannot become a saved application', async () => {
  for (const response of [
    () => new Response('<html>local dev server</html>', { status: 200 }),
    () => new Response(JSON.stringify({ ok: true }), { status: 200 }),
    () => new Response(JSON.stringify(saved), { status: 503 }),
    () => new Response(JSON.stringify({ ...saved, route: 'approved' }), { status: 200 }),
  ]) await withFetch(async () => response(), async () => assert.equal((await submitAiOpportunity(payload)).ok, false))
})

test('disabled capture, conflict, and rate limiting remain distinct recoverable responses', async () => {
  for (const reason of ['not_configured', 'submission_conflict', 'offer_changed', 'rate_limited', 'invalid']) {
    await withFetch(async () => new Response(JSON.stringify({ ok: false, error: reason }), { status: 503 }),
      async () => assert.deepEqual(await submitAiOpportunity(payload), { ok: false, reason }))
  }
})

test('network errors and storage failures never report confirmed acceptance', async () => {
  await withFetch(async () => { throw new Error('timeout') }, async () => assert.deepEqual(await submitAiOpportunity(payload), { ok: false, reason: 'unavailable' }))
  await withFetch(async () => new Response(JSON.stringify({ ok: false, error: 'storage_unavailable' }), { status: 503 }),
    async () => assert.deepEqual(await submitAiOpportunity(payload), { ok: false, reason: 'unavailable' }))
})
