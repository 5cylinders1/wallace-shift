import { createHash } from 'node:crypto'
import { isAiBookingQualified, type AiQualificationAnswers } from '../../src/content/aiOffer.js'
import { aiQualificationFacts } from '../../src/lib/aiQualificationSummary.js'
import { DemoError } from './demo-access.js'
import { opportunityId } from './ai-opportunity-store.js'
import { redis } from './portal-store.js'

type PendingQuizNotice = {
  state: 'pending'
  fingerprint: string
  completedAt: number
  payload: { from: string; to: string[]; subject: string; text: string }
}
type QuizNotice = PendingQuizNotice | { state: 'sent'; fingerprint: string }

/** Called with normalized, validated quiz answers. Freeze the first payload so retries have the same Resend key and content. */
export async function notifyQualifiedQuiz(attemptId: string, answers: AiQualificationAnswers): Promise<void> {
  if (!isAiBookingQualified(answers)) throw new DemoError('not_qualified', 400)
  const id = opportunityId(attemptId.toLowerCase())
  const fingerprint = createHash('sha256').update(JSON.stringify(answers, Object.keys(answers).sort())).digest('hex')
  const key = `portal:ai-quiz:owner-notice:${id}`
  let raw = await redis(['GET', key])
  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (raw === null) {
    const from = process.env.CONTACT_FROM_EMAIL?.trim()
    if (!from || /[\r\n]/.test(from) || !apiKey) throw new DemoError('email_not_configured', 503)
    const facts = aiQualificationFacts(answers)
    if (answers.businessType) facts.unshift(['Business type', answers.businessType])
    const completedAt = Date.now()
    const completed = new Intl.DateTimeFormat('en-US', {
      dateStyle: 'full', timeStyle: 'long', timeZone: 'America/Chicago',
    }).format(completedAt)
    const notice: PendingQuizNotice = {
      state: 'pending', fingerprint, completedAt,
      payload: {
        from, to: ['matthew@wallaceshift.com'], subject: 'Qualified AI project quiz results',
        text: [
          'A qualified visitor completed the AI project quiz. Booking status is unknown.',
          `Completed (Chicago time): ${completed}`, '',
          ...facts.map(([question, answer]) => `${question}: ${answer}`),
        ].join('\n'),
      },
    }
    await redis(['SET', key, JSON.stringify(notice), 'NX'])
    raw = await redis(['GET', key])
  }
  if (typeof raw !== 'string') throw new DemoError('storage_unavailable', 503)
  const saved = JSON.parse(raw) as QuizNotice
  if (saved.fingerprint !== fingerprint) throw new DemoError('attempt_conflict', 409)
  if (saved.state === 'sent') return
  if (!apiKey) throw new DemoError('email_not_configured', 503)
  // A timeout can hide a successful delivery. Don't replay an ambiguous attempt beyond provider idempotency.
  if (Date.now() - saved.completedAt >= 23 * 3600000) throw new DemoError('notification_review_required', 503)
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json', 'idempotency-key': `ai-quiz/${id}` },
      body: JSON.stringify(saved.payload), signal: AbortSignal.timeout(8000),
    })
    if (!response.ok) throw new Error('Provider unavailable')
    const result = await response.json() as { id?: unknown }
    if (typeof result.id !== 'string' || !result.id || result.id.length > 200) throw new Error('Missing provider receipt')
  } catch {
    throw new DemoError('email_unavailable', 503)
  }
  // Keep a receipt that prevents future duplicate sends, without retaining the mailed answers.
  await redis(['SET', key, JSON.stringify({ state: 'sent', fingerprint } satisfies QuizNotice)])
}
