import sanitizeHtml from 'sanitize-html'
import { DemoError } from './demo-access.js'
import { MAIL_LIMITS, MAIL_SENDERS, type MailAttachment, type MailSender } from '../../src/mail/model.js'

const dimension = /^(?:0|[0-9]{1,4}(?:\.[0-9]{1,2})?(?:px|pt|em|rem|%))$/
const color = /^(?:#[0-9a-fA-F]{3,8}|[a-zA-Z]{3,20}|rgba?\([\d.,%\s]+\))$/
const spacing = /^(?:0|[0-9.]{1,6}(?:px|pt|em|%))(?:\s+(?:0|[0-9.]{1,6}(?:px|pt|em|%))){0,3}$/
const border = /^[0-9]{1,2}px (?:solid|dotted|dashed) (?:#[0-9a-fA-F]{3,8}|[a-zA-Z]{3,20})$/
/** Keep email formatting and signature tables, never active HTML or arbitrary CSS. */
export function cleanMailHtml(html: unknown, signature = false): string {
  if (typeof html !== 'string') throw new DemoError('invalid_fields', 400)
  if (Buffer.byteLength(html) > (signature ? MAIL_LIMITS.signatureBytes : MAIL_LIMITS.htmlBytes)) throw new DemoError(signature ? 'signature_too_large' : 'message_too_large', 413)
  return sanitizeHtml(html, {
    allowedTags: ['p', 'div', 'span', 'br', 'hr', 'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'h1', 'h2', 'h3', 'h4', 'blockquote', 'pre', 'code', 'ul', 'ol', 'li', 'a', 'img', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th'],
    allowedAttributes: { '*': ['style'], a: ['href', 'title'], img: ['src', 'alt', 'width', 'height'], table: ['width', 'cellpadding', 'cellspacing', 'border', 'role'], td: ['width', 'colspan', 'rowspan', 'align', 'valign'], th: ['width', 'colspan', 'rowspan', 'align', 'valign'], ol: ['start'] },
    allowedSchemes: ['https', 'http', 'mailto', 'tel'], allowedSchemesByTag: { img: ['https'] }, allowProtocolRelative: false,
    allowedStyles: { '*': {
      color: [color], 'background-color': [color], 'font-family': [/^[\w\s,'"-]{1,100}$/], 'font-size': [dimension],
      'font-weight': [/^(?:normal|bold|[1-9]00)$/], 'font-style': [/^(?:normal|italic)$/],
      'text-decoration': [/^(?:none|underline|line-through)$/], 'text-align': [/^(?:left|center|right|justify)$/],
      'vertical-align': [/^(?:top|middle|bottom|baseline)$/], 'line-height': [/^(?:normal|[0-9.]{1,5}(?:px|pt|em|%)?)$/],
      width: [dimension], 'max-width': [dimension], height: [dimension],
      margin: [spacing], padding: [spacing],
      'margin-top': [dimension], 'margin-right': [dimension], 'margin-bottom': [dimension], 'margin-left': [dimension],
      'padding-top': [dimension], 'padding-right': [dimension], 'padding-bottom': [dimension], 'padding-left': [dimension],
      'border-collapse': [/^(?:collapse|separate)$/], border: [border],
      'border-top': [border], 'border-right': [border], 'border-bottom': [border], 'border-left': [border],
    } },
    disallowedTagsMode: 'discard', enforceHtmlBoundary: false,
  })
}

export function mailText(html: string): string {
  return sanitizeHtml(html.replace(/<br\s*\/?\s*>/gi, '\n').replace(/<\/(?:p|div|h[1-4]|li|tr|blockquote)>/gi, '\n'), { allowedTags: [], allowedAttributes: {} })
    .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&').trim()
}

export function mailSender(value: unknown): MailSender {
  if (typeof value !== 'string' || !MAIL_SENDERS.some(sender => sender.email === value)) throw new DemoError('invalid_sender', 400)
  return value as MailSender
}

export function mailRecipients(value: unknown, required = false): string[] {
  if (!Array.isArray(value) || value.length > MAIL_LIMITS.recipients || (required && value.length === 0)) throw new DemoError('invalid_recipients', 400)
  const emails = value.map(item => {
    if (typeof item !== 'string') throw new DemoError('invalid_recipients', 400)
    const email = item.trim().toLowerCase()
    if (email.length > 254 || !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/.test(email) || email.startsWith('.') || email.includes('..') || email.includes('.@')) throw new DemoError('invalid_recipients', 400)
    return email
  })
  return [...new Set(emails)]
}

// Executable and active script attachments are rejected before reaching the provider.
const UNSUPPORTED = /\.(?:ade|adp|app|asp|bas|bat|chm|cmd|com|cpl|csh|exe|fxp|gadget|hlp|hta|inf|ins|isp|its|jar|js|jse|ksh|lib|lnk|mde|msc|msh|msi|msp|mst|pif|ps1|reg|scr|sct|sh|sys|vb|vbe|vbs|vxd|wsc|wsf|wsh)$/i
export function mailAttachments(value: unknown): MailAttachment[] {
  if (!Array.isArray(value) || value.length > MAIL_LIMITS.attachments) throw new DemoError('attachment_invalid', 400)
  let total = 0
  return value.map(item => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new DemoError('attachment_invalid', 400)
    const { filename, content, contentType } = item as Record<string, unknown>
    if (typeof filename !== 'string' || !filename.trim() || filename.length > 180 || /[\x00-\x1f\x7f/\\]/.test(filename) || filename === '.' || filename === '..' || typeof content !== 'string' || content.length > Math.ceil(MAIL_LIMITS.attachmentBytes / 3) * 4 || content.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(content)) throw new DemoError('attachment_invalid', 400)
    if (UNSUPPORTED.test(filename.trim())) throw new DemoError('unsupported_attachment', 400)
    const buffer = Buffer.from(content, 'base64')
    if (buffer.toString('base64') !== content) throw new DemoError('attachment_invalid', 400)
    total += buffer.length
    if (total > MAIL_LIMITS.attachmentBytes) throw new DemoError('attachments_too_large', 413)
    if (contentType !== undefined && (typeof contentType !== 'string' || !/^[a-zA-Z0-9!#$&^_.+-]+\/[a-zA-Z0-9!#$&^_.+-]+$/.test(contentType))) throw new DemoError('attachment_invalid', 400)
    return { filename: filename.trim(), content, contentType: typeof contentType === 'string' ? contentType : 'application/octet-stream' }
  })
}
