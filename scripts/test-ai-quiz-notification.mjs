import assert from 'node:assert/strict'
import { after, beforeEach, test } from 'node:test'
import { randomUUID } from 'node:crypto'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import ts from 'typescript'

const root = fileURLToPath(new URL('../', import.meta.url))
const temporary = await mkdtemp(join(tmpdir(), 'wallace-quiz-notification-'))
const compiled = new Map()
async function compile(relative) {
  if (compiled.has(relative)) return compiled.get(relative)
  const target = join(temporary, relative + '.mjs')
  compiled.set(relative, target)
  let source = ts.transpileModule(await readFile(join(root, relative), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext },
  }).outputText
  for (const match of [...source.matchAll(/(from\s+)(['"])(\.[^'"]+)\2/g)]) {
    const dependency = await compile(join(dirname(relative), match[3].replace(/\.js$/, '.ts')))
    source = source.replace(match[0], `from ${JSON.stringify(pathToFileURL(dependency).href)}`)
  }
  await mkdir(dirname(target), { recursive: true })
  await writeFile(target, source)
  return target
}
const { notifyQualifiedQuiz } = await import(pathToFileURL(await compile('api/_lib/ai-quiz-notification.ts')).href)
const answers = {
  businessType: '', workflows: ['inquiries', 'admin'], workflowDetails: 'We enter invoices manually.',
  currentTools: '', weeklyHours: '6_10', impacts: ['other'], impactDetails: 'Work is duplicated.',
  role: 'owner', approverAvailability: '', revenue: '250k_1m', aiExperience: 'considered',
  aiBarriers: ['time', 'technical'], budget: 'ready', timing: 'soon',
}
const originalFetch = globalThis.fetch, savedEnv = { ...process.env }, originalNow = Date.now
let store, accepted, attempts, loseFirstResponse, failedProvider, now
beforeEach(() => {
  Object.assign(process.env, {
    DEMO_AUDIT_REDIS_URL: 'https://redis.example.test', DEMO_AUDIT_REDIS_TOKEN: 'fake',
    CONTACT_FROM_EMAIL: 'Wallace Shift <site@example.test>', RESEND_API_KEY: 'fake',
    CONTACT_TO_EMAIL: 'unrelated@example.test', AI_OPPORTUNITY_TO_EMAIL: 'unused@example.test',
  })
  now = Date.UTC(2026, 10, 3, 18, 3)
  Date.now = () => now
  store = new Map(); accepted = new Map(); attempts = []; loseFirstResponse = false; failedProvider = false
  globalThis.fetch = async (url, init) => {
    if (url === 'https://redis.example.test') {
      const [verb, key, value, ...options] = JSON.parse(init.body)
      if (verb === 'GET') return Response.json({ result: store.get(key) ?? null })
      assert.equal(verb, 'SET')
      if (options.includes('NX') && store.has(key)) return Response.json({ result: null })
      store.set(key, value)
      return Response.json({ result: 'OK' })
    }
    assert.equal(url, 'https://api.resend.com/emails', 'Unexpected network destination')
    const key = init.headers['idempotency-key']
    attempts.push([key, init.body])
    if (failedProvider) return Response.json({ error: 'Unavailable' }, { status: 503 })
    if (accepted.has(key)) assert.equal(accepted.get(key), init.body)
    else accepted.set(key, init.body)
    if (loseFirstResponse && attempts.length === 1) throw new Error('Lost response after acceptance')
    return Response.json({ id: 'fixture-message' })
  }
})
after(async () => {
  globalThis.fetch = originalFetch; Date.now = originalNow
  for (const key of Object.keys(process.env)) if (!Object.hasOwn(savedEnv, key)) delete process.env[key]
  Object.assign(process.env, savedEnv)
  await rm(temporary, { recursive: true, force: true })
})

test('one readable quiz summary goes directly to Matthew and describes a completed quiz without claiming a booking', async () => {
  const id = randomUUID()
  await notifyQualifiedQuiz(id, answers)
  const message = JSON.parse(accepted.get(`ai-quiz/${id}`))
  assert.deepEqual(message.to, ['matthew@wallaceshift.com'])
  assert.equal(message.reply_to, undefined)
  assert.ok(!message.text.includes('meet.google.com'))
  assert.ok(!message.text.includes(id))
  for (const label of [
    'Booking status is unknown.', 'November 3, 2026', 'We struggle to respond to inquiries quickly',
    'Repetitive administration takes too much time', 'Purchase authority: I own the business and can approve the purchase',
    'Annual revenue: $250,000 to $999,999', 'Weekly team time: 6 to 10 hours', 'Other consequence: Work is duplicated.',
    'AI experience: We have considered it but have not started', 'We have not had time to implement it', 'We need technical help',
    'Workflow context: We enter invoices manually.', 'Investment: Yes, I can approve that investment', 'Timing: Within the next month',
  ]) assert.ok(message.text.includes(label), label)
  assert.ok(![...store.values()][0].includes('invoices'), 'sent receipt retains no answer text')
  now += 2 * 86400000
  await notifyQualifiedQuiz(id, answers)
  assert.equal(attempts.length, 1)
})
test('concurrent delivery and a lost response use a single provider key and immutable payload', async () => {
  const id = randomUUID()
  loseFirstResponse = true
  await assert.rejects(notifyQualifiedQuiz(id, answers), error => error.code === 'email_unavailable')
  process.env.CONTACT_FROM_EMAIL = 'changed@example.test'
  now += 120000
  await Promise.all([notifyQualifiedQuiz(id, answers), notifyQualifiedQuiz(id, answers)])
  assert.equal(accepted.size, 1)
  for (const attempt of attempts) assert.deepEqual(attempt, attempts[0])
  await assert.rejects(notifyQualifiedQuiz(id, { ...answers, workflowDetails: 'Different' }), error => error.code === 'attempt_conflict')
})
test('unqualified answers and invalid attempt IDs neither store nor email a summary', async () => {
  for (const change of [{ role: 'joint' }, { budget: 'value' }, { timing: 'quarter' }]) {
    await assert.rejects(notifyQualifiedQuiz(randomUUID(), { ...answers, ...change }), error => error.code === 'not_qualified')
  }
  await assert.rejects(notifyQualifiedQuiz('malformed', answers), error => error.code === 'invalid')
  assert.equal(store.size, 0); assert.equal(attempts.length, 0)
})
test('failed provider delivery remains retryable with the same payload; expired uncertain outcomes are never resent', async () => {
  failedProvider = true
  const id = randomUUID()
  await assert.rejects(notifyQualifiedQuiz(id, answers), error => error.code === 'email_unavailable')
  failedProvider = false
  await notifyQualifiedQuiz(id, answers)
  assert.equal(accepted.size, 1)
  assert.deepEqual(attempts[0], attempts[1])
  const secondId = randomUUID()
  failedProvider = true
  await assert.rejects(notifyQualifiedQuiz(secondId, answers), error => error.code === 'email_unavailable')
  now += 86400000
  await assert.rejects(notifyQualifiedQuiz(secondId, answers), error => error.code === 'notification_review_required')
  assert.equal(attempts.length, 3)
})
