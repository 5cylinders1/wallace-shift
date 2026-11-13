export const MAIL_SENDERS = [
  { email: 'matthew@wallaceshift.com', name: 'Matthew' },
  { email: 'bella@wallaceshift.com', name: 'Bella' },
] as const

export type MailSender = typeof MAIL_SENDERS[number]['email']

export const MAIL_LIMITS = {
  attachmentBytes: 3 * 1024 * 1024,
  attachments: 10,
  recipients: 50,
  htmlBytes: 100000,
  signatureBytes: 30000,
  subjectLength: 200,
} as const

export type MailAttachment = { filename: string; content: string; contentType: string }
export type MailMessage = {
  id: string
  from: MailSender
  to: string[]
  cc: string[]
  bcc: string[]
  subject: string
  html: string
  attachments: { filename: string; size: number; contentType: string }[]
  createdAt: string
  status: 'sent' | 'failed' | 'review' | 'pending'
  providerId?: string
}

export type MailSession = {
  authenticated: boolean
  email?: string
  signatures?: Record<MailSender, string>
  messages?: MailMessage[]
}
