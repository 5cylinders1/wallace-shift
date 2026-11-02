import { beginNotification, getOpportunity, mutateOpportunity, type NotificationPayload, type NotificationState, type OpportunityRecord } from './ai-opportunity-store.js'
import { aiPackages } from '../../src/content/aiOffer.js'
import { aiConsultation } from '../../src/content/aiConsultation.js'

function configuredPayload(record: OpportunityRecord): NotificationPayload | null {
  const from = process.env.CONTACT_FROM_EMAIL?.trim()
  const to = (process.env.AI_OPPORTUNITY_TO_EMAIL ?? process.env.CONTACT_TO_EMAIL)?.trim()
  if (!from || !to || /[\r\n]/.test(from + to) || !process.env.RESEND_API_KEY?.trim()) return null
  return {
    from, to: [to], ...(record.application.email ? { reply_to: record.application.email } : {}),
    subject: `AI opportunity application ${record.id}`,
    text: [
      'A new AI opportunity application has been saved for review.',
      `Application ID: ${record.id}`, `Received: ${record.createdAt}`, `Suggested route: ${record.route}`,
      ...(record.application.nextStep ? [
        `Requested next step: ${record.application.nextStep === 'package' ? 'Package' : `Free ${aiConsultation.durationMinutes} minute consultation`}`,
        ...(record.application.nextStep === 'package' && record.application.packageId && Object.hasOwn(aiPackages, record.application.packageId)
          ? [`Selected package: ${aiPackages[record.application.packageId].name}`, `Proposed package price: $${aiPackages[record.application.packageId].price.toLocaleString('en-US')}`]
          : [
            `Consultation format: ${record.application.contactMethod === 'call' ? 'Phone call' : 'Google Meet'}`,
            record.application.contactMethod === 'call'
              ? 'The visitor requested a phone consultation. A time still needs to be arranged.'
              : 'The visitor chose to send their quiz answers separately from Google Calendar booking. This submission does not verify whether an appointment was booked.',
          ]),
      ] : []),
      'This is an application, not a confirmed appointment, quote, or website approval.', '',
      ...(record.qualification ? [
        'Qualification at submission:',
        ...Object.entries(record.qualification).map(([key, value]) => `${key}: ${typeof value === 'string' ? value : JSON.stringify(value)}`),
        '',
      ] : ['This older application has no saved qualification summary; review its original answers.', '']),
      ...Object.entries(record.application).map(([key, value]) => `${key}: ${typeof value === 'string' ? value : JSON.stringify(value)}`), '',
      'Sign into the Wallace Shift client portal as the owner to review applications.',
      'Owner-only application records: /api/ai-opportunity',
    ].join('\n'),
  }
}

/** Internal notification only. A stored application remains received if notification fails.
 * Preserve one immutable provider payload/key so owner retries cannot duplicate email. */
export async function notifyOpportunity(id: string): Promise<NotificationState> {
  const record = await getOpportunity(id)
  if (record.notification.state === 'sent' || record.notification.state === 'review_required') return record.notification.state
  const payload = record.notification.payload ?? configuredPayload(record)
  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!payload || !apiKey) {
    await mutateOpportunity(id, current => {
      if (current.notification.state === 'pending' || current.notification.state === 'failed') current.notification.error = 'email_not_configured'
    })
    return record.notification.state
  }
  const attempt = await beginNotification(id, payload)
  if (!attempt) return (await getOpportunity(id)).notification.state
  let providerId: string | undefined
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json', 'idempotency-key': `ai-opportunity/${id}` },
      body: JSON.stringify(attempt.payload), signal: AbortSignal.timeout(8_000),
    })
    if (!response.ok) throw new Error('provider unavailable')
    const body = await response.json() as { id?: unknown }
    if (typeof body.id !== 'string' || !body.id || body.id.length > 200) throw new Error('provider result unavailable')
    providerId = body.id
  } catch {
    await mutateOpportunity(id, current => {
      if (current.notification.attemptToken !== attempt.token) return
      current.notification.state = 'failed'; current.notification.error = 'provider_unavailable'
    })
    return 'failed'
  }
  await mutateOpportunity(id, current => {
    if (current.notification.attemptToken !== attempt.token) return
    current.notification.state = 'sent'; current.notification.providerId = providerId; delete current.notification.error
  })
  return 'sent'
}

/** Notification payloads contain transport internals and never belong in the admin API. */
export function ownerOpportunityView(record: OpportunityRecord): OpportunityRecord {
  const copy = structuredClone(record)
  delete copy.notification.payload; delete copy.notification.attemptToken
  return copy
}
