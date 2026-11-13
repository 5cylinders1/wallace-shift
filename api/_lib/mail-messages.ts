import { randomBytes } from 'node:crypto'
import { DemoError } from './demo-access.js'
import { mailApiKey } from './mail-auth.js'
import { cleanMailHtml, mailAttachments, mailRecipients, mailSender, mailText } from './mail-content.js'
import { mailCompareAndSet, mailGet, mailHash, mailKey, mailLimit, mailRedis, userKey } from './mail-store.js'
import { MAIL_LIMITS, MAIL_SENDERS, type MailMessage, type MailSender } from '../../src/mail/model.js'

type Payload = { from: string; reply_to: string; to: string[]; cc?: string[]; bcc?: string[]; subject: string; html: string; text: string; attachments?: { filename: string; content: string; content_type: string }[] }
type MailRecord = MailMessage & { fingerprint: string; lease?: { token: string; until: number } }
type Signatures = { [sender in MailSender]: string }
export const blankSignatures = (): Signatures => Object.fromEntries(MAIL_SENDERS.map(sender => [sender.email, ''])) as Signatures
const messageKey = (email: string, id: string) => userKey(email, `message:${id}`)
const payloadKey = (email: string, id: string) => userKey(email, `payload:${id}`)

function messageId(value: unknown): string {
  if (typeof value !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value)) throw new DemoError('invalid_fields', 400)
  return value.toLowerCase()
}

function publicMessage(record: MailRecord): MailMessage {
  const { fingerprint: _fingerprint, lease: _lease, ...message } = record
  // Consumers cannot see file bytes, internal leases, or request fingerprints.
  return message
}

export async function mailView(email: string): Promise<{ authenticated: true; email: string; signatures: Signatures; messages: MailMessage[] }> {
  const values = await Promise.all(MAIL_SENDERS.map(sender => mailGet<string>(userKey(email, `signature:${sender.email}`))))
  const signatures = blankSignatures()
  MAIL_SENDERS.forEach((sender, index) => { signatures[sender.email] = values[index] ?? '' })
  const ids = await mailRedis(['ZREVRANGE', userKey(email, 'messages'), 0, 49])
  if (!Array.isArray(ids) || ids.some(id => typeof id !== 'string')) throw new DemoError('storage_unavailable', 503)
  const records = ids.length ? await mailRedis(['MGET', ...ids.map(id => messageKey(email, id as string))]) : []
  if (!Array.isArray(records)) throw new DemoError('storage_unavailable', 503)
  // Keep the history response below the serverless response ceiling even when
  // every saved message contains unusually large pasted markup.
  const messages: MailMessage[] = []; let bytes = 0
  for (const record of records) {
    if (typeof record !== 'string') continue
    const message = publicMessage(JSON.parse(record) as MailRecord)
    bytes += Buffer.byteLength(JSON.stringify(message))
    if (bytes > 2_000_000) break
    messages.push(message)
  }
  return { authenticated: true, email, signatures, messages }
}

export async function saveMailSignature(email: string, sender: unknown, html: unknown): Promise<void> {
  await mailRedis(['SET', userKey(email, `signature:${mailSender(sender)}`), JSON.stringify(cleanMailHtml(html, true))])
}

const RESERVE = `-- wallace-mail:reserve-send
local old = redis.call('GET', KEYS[1])
if old then return old end
if tonumber(redis.call('GET', KEYS[4]) or '0') >= 60 then return 'rate_limited' end
if tonumber(redis.call('GET', KEYS[5]) or '0') >= 250 then return 'rate_limited' end
if tonumber(redis.call('GET', KEYS[6]) or '0') >= 500 then return 'rate_limited' end
for i = 4, 6 do
  local count = redis.call('INCR', KEYS[i])
  if count == 1 then redis.call('EXPIRE', KEYS[i], i == 4 and 3600 or 86400) end
end
redis.call('SET', KEYS[1], ARGV[1])
redis.call('SET', KEYS[2], ARGV[2], 'EX', 86400)
redis.call('ZADD', KEYS[3], ARGV[3], ARGV[4])
redis.call('ZREMRANGEBYRANK', KEYS[3], 0, -51)
return ARGV[1]`

export async function prepareMail(email: string, body: Record<string, unknown>): Promise<MailRecord> {
  mailApiKey()
  const id = messageId(body.id)
  const from = mailSender(body.from)
  const to = mailRecipients(body.to, true), cc = mailRecipients(body.cc ?? []), bcc = mailRecipients(body.bcc ?? [])
  if (to.length + cc.length + bcc.length > MAIL_LIMITS.recipients) throw new DemoError('invalid_recipients', 400)
  if (typeof body.subject !== 'string' || !body.subject.trim() || body.subject.length > MAIL_LIMITS.subjectLength || /[\x00-\x1f\x7f]/.test(body.subject)) throw new DemoError('subject_required', 400)
  const subject = body.subject.trim()
  const html = cleanMailHtml(body.html)
  const attachments = mailAttachments(body.attachments ?? [])
  const text = mailText(html)
  if (!text && !/<img\s[^>]*src=/i.test(html) && !attachments.length) throw new DemoError('message_required', 400)
  const name = MAIL_SENDERS.find(sender => sender.email === from)!.name
  const payload: Payload = { from: `${name} <${from}>`, reply_to: from, to, ...(cc.length ? { cc } : {}), ...(bcc.length ? { bcc } : {}), subject,
    html: `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#20252b">${html}</body></html>`, text: text || 'See attached files.',
    ...(attachments.length ? { attachments: attachments.map(file => ({ filename: file.filename, content: file.content, content_type: file.contentType })) } : {}),
  }
  const fingerprint = mailHash(JSON.stringify(payload))
  const now = Date.now()
  const fresh: MailRecord = { id, from, to, cc, bcc, subject, html, attachments: attachments.map(file => ({ filename: file.filename, size: Buffer.from(file.content, 'base64').length, contentType: file.contentType })), createdAt: new Date(now).toISOString(), status: 'pending', fingerprint }
  const reserved = await mailRedis(['EVAL', RESERVE, 6, messageKey(email, id), payloadKey(email, id), userKey(email, 'messages'), userKey(email, `sends:hour:${Math.floor(now / 3_600_000)}`), userKey(email, `sends:day:${Math.floor(now / 86_400_000)}`), mailKey(`sends:day:${Math.floor(now / 86_400_000)}`), JSON.stringify(fresh), JSON.stringify(payload), now, id])
  if (reserved === 'rate_limited') throw new DemoError('rate_limited', 429)
  if (typeof reserved !== 'string') throw new DemoError('storage_unavailable', 503)
  const record = JSON.parse(reserved) as MailRecord
  if (record.fingerprint !== fingerprint) throw new DemoError('message_changed', 409)
  return record
}

export async function sendMail(email: string, idValue: unknown): Promise<MailMessage> {
  const id = messageId(idValue)
  const key = messageKey(email, id)
  let record = await mailGet<MailRecord>(key)
  if (!record) throw new DemoError('message_not_found', 404)
  if (record.status === 'sent' || record.status === 'review') return publicMessage(record)
  if (record.lease && record.lease.until > Date.now()) return publicMessage(record)
  const payload = await mailGet<Payload>(payloadKey(email, id))
  if (!payload || Date.now() - Date.parse(record.createdAt) > 23 * 3600_000) {
    const review: MailRecord = { ...record, status: 'review' }; delete review.lease
    if (await mailCompareAndSet(key, record, review)) return publicMessage(review)
    return publicMessage((await mailGet<MailRecord>(key))!)
  }
  const apiKey = mailApiKey()
  await mailLimit(`send-attempt:${mailHash(email)}`, 60, 20)
  const leased: MailRecord = { ...record, status: 'pending', lease: { token: randomBytes(16).toString('hex'), until: Date.now() + 30000 } }
  if (!await mailCompareAndSet(key, record, leased)) return publicMessage((await mailGet<MailRecord>(key))!)
  record = leased
  let providerId: string | undefined
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json', 'idempotency-key': `${mailKey('send')}/${mailHash(email)}/${id}` },
      body: JSON.stringify(payload), signal: AbortSignal.timeout(10000),
    })
    if (response.ok) {
      const accepted = await response.json() as { id?: unknown }
      if (typeof accepted.id === 'string' && accepted.id) providerId = accepted.id
    }
  } catch { /* Unknown outcomes retain the frozen payload and provider idempotency key. */ }
  const updated: MailRecord = { ...record, status: providerId ? 'sent' : 'failed', ...(providerId ? { providerId } : {}) }; delete updated.lease
  if (!await mailCompareAndSet(key, record, updated)) return publicMessage((await mailGet<MailRecord>(key))!)
  if (providerId) await mailRedis(['DEL', payloadKey(email, id)])
  return publicMessage(updated)
}
