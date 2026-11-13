import { useEffect, useRef, useState, type FormEvent } from 'react'
import DOMPurify from 'dompurify'
import { MAIL_LIMITS, MAIL_SENDERS, type MailAttachment, type MailMessage, type MailSender, type MailSession } from './model'
import { MailIcon, RichTextEditor } from './RichTextEditor'
import './mail.css'

type Tab = 'compose' | 'sent' | 'signatures'
type Draft = { from: MailSender; to: string; cc: string; bcc: string; subject: string; html: string; includeSignature: boolean; pendingId: string; hadAttachments?: boolean; signatureHtml?: string; resubmitId?: string }
type HeldDraft = { id: string; heldAt: string; draft: Draft }
type Attachment = MailAttachment & { id: string; size: number }
type Result = Partial<MailSession> & { ok?: boolean; message?: MailMessage; error?: string }
const errorMessages: Record<string, string> = {
  work_email_required: 'Use your @wallaceshift.com email address to sign in.',
  email_not_configured: 'Email sending is not connected yet. The site owner needs to finish the mail configuration.',
  email_unavailable: 'We could not send your sign in code. Please wait a minute and try again.',
  storage_unavailable: 'Mail is temporarily unavailable. Your draft is still here. Please try again shortly.',
  forbidden: 'This request could not be verified. Refresh the page and try again.',
  rate_limited: 'Too many attempts. Please wait before trying again.',
  code_invalid: 'That code is incorrect. Check your email and try again.',
  invalid_code: 'Enter the six digit code from your email.',
  code_expired: 'Your code has expired. Request a new code to continue.',
  access_required: 'Your session has ended. Sign in again to continue.',
  invalid_fields: 'Check the message fields and try again.',
  invalid_recipients: 'Enter valid recipient email addresses, separated by commas.',
  invalid_sender: 'Choose Matthew or Bella as the sender.',
  subject_required: 'Add a subject before sending.',
  message_required: 'Write a message before sending.',
  attachments_too_large: 'Attachments can total up to 3 MB. Remove a file and try again.',
  attachment_invalid: 'One of the attachments could not be read. Remove it and attach it again.',
  unsupported_attachment: 'That file type cannot be sent. Remove it and use a supported document or image.',
  signature_too_large: 'Your signature is too large. Use hosted image URLs instead of embedded image data.',
  message_too_large: 'The message is too large. Shorten it or remove pasted images before sending.',
  message_changed: 'This message already has a sending attempt. Retry the saved message from Sent activity.',
  too_large: 'This message is too large. Remove an attachment or shorten the message.',
  message_not_found: 'No sending attempt was recorded. Review your draft and try sending again.',
  not_configured: 'Mail is not connected yet. The site owner needs to finish its configuration.',
  unavailable: 'Mail is temporarily unavailable. Please try again shortly.',
}
class MailRequestError extends Error { code: string; constructor(code: string) { super(errorMessages[code] ?? 'The request could not be completed. Please try again.'); this.code = code } }
async function request(body?: Record<string, unknown>): Promise<Result> {
  let response: Response
  try { response = await fetch('/api/mail', { method: body ? 'POST' : 'GET', credentials: 'same-origin', cache: 'no-store', headers: body ? { 'content-type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined }) }
  catch { throw new Error('The connection was interrupted. Your draft is still here.') }
  let data: Result
  try { data = await response.json() as Result } catch { throw new Error('Mail could not confirm the request. Your draft is still here.') }
  if (!response.ok || data.error) throw new MailRequestError(data.error ?? 'unavailable')
  return data
}
function blankDraft(email?: string): Draft { return { from: email === 'bella@wallaceshift.com' ? 'bella@wallaceshift.com' : 'matthew@wallaceshift.com', to: '', cc: '', bcc: '', subject: '', html: '', includeSignature: true, pendingId: '' } }
function draftKey(email: string) { return `wallace-mail-draft:${email}` }
function restoreDraft(email: string, messages: MailMessage[]): Draft {
  try {
    const saved = JSON.parse(localStorage.getItem(draftKey(email)) ?? 'null') as Draft | null
    if (!saved || !MAIL_SENDERS.some(sender => sender.email === saved.from)) return blankDraft(email)
    if ((saved.pendingId || saved.resubmitId) && messages.some(message => message.id === (saved.pendingId || saved.resubmitId) && message.status === 'sent')) return blankDraft(email)
    return { ...blankDraft(email), ...saved }
  } catch { return blankDraft(email) }
}
function storeDraft(email: string, draft: Draft) { try { localStorage.setItem(draftKey(email), JSON.stringify(draft)); return true } catch { return false } }
function heldDraftKey(email: string) { return `wallace-mail-held:${email}` }
function restoreHeldDrafts(email: string): HeldDraft[] { try { const data = JSON.parse(localStorage.getItem(heldDraftKey(email)) ?? '[]'); return Array.isArray(data) ? data.filter(item => item?.id && item?.draft?.from) : [] } catch { return [] } }
function persistHeldDrafts(email: string, entries: HeldDraft[]) { try { localStorage.setItem(heldDraftKey(email), JSON.stringify(entries)); return true } catch { return false } }
function fileSize(bytes: number) { return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB` }
function readableDate(date: string) { const value = new Date(date); return Number.isNaN(value.valueOf()) ? date : value.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) }
function recipients(value: string) { return value.split(/[,;\n]+/).map(item => item.trim()).filter(Boolean) }
function safePreview(html: string) {
  const clean = DOMPurify.sanitize(html, { USE_PROFILES: { html: true }, FORBID_TAGS: ['style', 'form', 'input', 'button', 'iframe'], FORBID_ATTR: ['srcset'] })
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="referrer" content="no-referrer"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><style>body{margin:0;padding:16px;font:14px/1.65 Arial,sans-serif;color:#18242f;overflow-wrap:anywhere}img{max-width:100%;height:auto}table{max-width:100%}a{color:#175c99}p:first-child{margin-top:0}</style></head><body>${clean}</body></html>`
}
function HtmlPreview({ html, title, compact = false }: { html: string; title: string; compact?: boolean }) { return <iframe className={`mail-html-preview${compact ? ' mail-html-preview-compact' : ''}`} title={title} sandbox="" referrerPolicy="no-referrer" srcDoc={safePreview(html)} /> }
const statusText: Record<MailMessage['status'], string> = { sent: 'Accepted for sending', failed: 'Retry needed', pending: 'Sending not confirmed', review: 'Needs review' }

export function MailApp() {
  const [session, setSession] = useState<MailSession | null>(null)
  const [loadError, setLoadError] = useState('')
  async function load() { setLoadError(''); try { setSession(await request() as MailSession) } catch (error) { setLoadError(error instanceof Error ? error.message : 'Mail could not load.') } }
  useEffect(() => { let active = true; request().then(data => { if (active) setSession(data as MailSession) }).catch(error => { if (active) setLoadError(error.message) }); return () => { active = false } }, [])
  useEffect(() => { const previous = document.title; document.title = 'Mail | Wallace Shift'; return () => { document.title = previous } }, [])
  if (!session) return <div className="mail-app mail-loading"><div className="mail-loading-inner"><Brand /><h1>Opening your mail</h1>{loadError ? <><p role="alert">{loadError}</p><button className="mail-button mail-primary" onClick={load}>Try again</button></> : <div role="status" className="mail-loading-lines"><span /><span /><span /><span className="mail-sr-only">Checking your session…</span></div>}</div></div>
  if (!session.authenticated || !session.email) return <MailSignIn onSignIn={setSession} />
  return <MailWorkspace key={session.email} initialSession={session} onSignOut={() => setSession({ authenticated: false })} />
}
function Brand() { return <a className="mail-brand" href="/" aria-label="Wallace Shift home"><img src="/brand/wallace-shift-logo-black.svg" width="30" height="26" alt="" /><span>WALLACE SHIFT</span></a> }
function MailSignIn({ onSignIn }: { onSignIn: (session: MailSession) => void }) {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [resendSeconds, setResendSeconds] = useState(0)
  const lock = useRef(false)
  useEffect(() => { if (!resendSeconds) return; const timer = window.setTimeout(() => setResendSeconds(seconds => Math.max(0, seconds - 1)), 1000); return () => window.clearTimeout(timer) }, [resendSeconds])
  async function submit(event: FormEvent, resend = false) {
    event.preventDefault(); if (lock.current || (resend && resendSeconds > 0)) return
    if (!/^[^\s@]+@wallaceshift\.com$/i.test(email.trim())) { setError(errorMessages.work_email_required); return }
    lock.current = true; setBusy(true); setError(''); setNotice('')
    try {
      if (!sent || resend) { await request({ action: 'send-code', email: email.trim().toLowerCase() }); setSent(true); setResendSeconds(60); setNotice('A sign in code is on its way. It expires in 10 minutes.') }
      else { const data = await request({ action: 'verify-code', code: code.trim() }); if (!data.authenticated) throw new Error('Sign in could not be completed. Request a new code.'); onSignIn(data as MailSession) }
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Sign in could not be completed.') }
    finally { lock.current = false; setBusy(false) }
  }
  return <div className="mail-app mail-auth"><header><Brand /><span className="mail-auth-team">Team mail</span></header><main className="mail-auth-main"><div className="mail-auth-symbol"><MailIcon name="lock" size={24} /></div><h1>Your work.<br />Your words.</h1><p className="mail-auth-description">A little space for your next conversation.<br />Sign in with your Wallace Shift email to get started.</p><form className="mail-auth-form" onSubmit={submit}>
    <label htmlFor="mail-signin-email">Work email</label><input id="mail-signin-email" type="email" autoComplete="username" placeholder="you@wallaceshift.com" value={email} readOnly={sent} required onChange={event => setEmail(event.target.value)} autoFocus />
    {sent && <><div className="mail-code-label"><label htmlFor="mail-signin-code">Sign in code</label><button type="button" className="mail-text-button" disabled={busy} onClick={() => { setSent(false); setCode(''); setError(''); setNotice('') }}>Change email</button></div><input id="mail-signin-code" className="mail-code-input" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} placeholder="000000" value={code} required autoFocus onChange={event => setCode(event.target.value.replace(/\D/g, ''))} /></>}
    {error && <p className="mail-alert mail-error" role="alert">{error}</p>}{notice && <p className="mail-auth-note" role="status">{notice}</p>}
    <button className="mail-button mail-primary mail-auth-submit" disabled={busy}>{busy ? (sent ? 'Checking…' : 'Sending code…') : sent ? 'Open mail' : 'Send sign in code'}<MailIcon name="arrow" size={18} /></button>
    {sent && <button type="button" className="mail-text-button mail-resend" disabled={busy || resendSeconds > 0} onClick={event => void submit(event, true)}>{resendSeconds > 0 ? `Resend in ${resendSeconds}s` : 'Send a new code'}</button>}
  </form><p className="mail-auth-footnote"><MailIcon name="lock" size={14} /> Only verified @wallaceshift.com accounts can enter.</p></main><footer>Wallace Shift LLC</footer></div>
}

function MailWorkspace({ initialSession, onSignOut }: { initialSession: MailSession; onSignOut: () => void }) {
  const email = initialSession.email!
  const [session, setSession] = useState(initialSession)
  const [tab, setTab] = useState<Tab>('compose')
  const [draft, setDraft] = useState(() => restoreDraft(email, initialSession.messages ?? []))
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [heldDrafts, setHeldDrafts] = useState<HeldDraft[]>(() => restoreHeldDrafts(email))
  const [startingNew, setStartingNew] = useState(false)
  const heldFiles = useRef(new Map<string, Attachment[]>())
  const [showCc, setShowCc] = useState(Boolean(draft.cc))
  const [showBcc, setShowBcc] = useState(Boolean(draft.bcc))
  const [dragging, setDragging] = useState(false)
  const [working, setWorking] = useState('')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [storageUnavailable, setStorageUnavailable] = useState(false)
  const [selectedId, setSelectedId] = useState('')
  const [signatureSender, setSignatureSender] = useState<MailSender>(draft.from)
  const [signatureDrafts, setSignatureDrafts] = useState<Record<MailSender, string>>({ 'matthew@wallaceshift.com': initialSession.signatures?.['matthew@wallaceshift.com'] ?? '', 'bella@wallaceshift.com': initialSession.signatures?.['bella@wallaceshift.com'] ?? '' })
  const fileInput = useRef<HTMLInputElement>(null)
  const operation = useRef(false)
  const noticeRef = useRef<HTMLDivElement>(null)
  const messages = session.messages ?? []
  const selected = messages.find(message => message.id === selectedId)
  const pending = messages.find(message => message.id === draft.pendingId)
  const locked = Boolean(draft.pendingId)
  const unresolved = Boolean(draft.pendingId || draft.resubmitId)
  const hasCurrentDraft = Boolean(draft.to || draft.cc || draft.bcc || draft.subject || draft.html.replace(/<[^>]*>/g, '').trim() || attachments.length || unresolved)
  const localHeld = heldDrafts.filter(entry => !messages.some(message => message.id === entry.id))
  const signature = locked ? (draft.signatureHtml ?? '') : (session.signatures?.[draft.from] ?? '')
  const totalBytes = attachments.reduce((sum, file) => sum + file.size, 0)
  const busy = Boolean(working)
  useEffect(() => { setStorageUnavailable(!storeDraft(email, { ...draft, hadAttachments: attachments.length > 0 || draft.hadAttachments })) }, [draft, attachments, email])
  useEffect(() => { if (error || notice) noticeRef.current?.focus() }, [error, notice])
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (attachments.length && !locked) { event.preventDefault(); event.returnValue = '' } }
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn)
  }, [attachments.length, locked])
  function updateDraft(change: Partial<Draft>) { if (!locked) setDraft(current => ({ ...current, ...change })) }
  function handleError(reason: unknown) { setError(reason instanceof Error ? reason.message : 'The request could not be completed.'); if (reason instanceof MailRequestError && reason.code === 'access_required') onSignOut() }
  function mergeMessage(message: MailMessage) { if (message.status === 'sent') { setHeldDrafts(current => { const next = current.filter(entry => entry.id !== message.id); persistHeldDrafts(email, next); return next }); heldFiles.current.delete(message.id) }; setSession(current => ({ ...current, messages: [message, ...(current.messages ?? []).filter(item => item.id !== message.id)].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 50) })) }
  function resetDraft() { setStartingNew(false); setDraft(blankDraft(email)); setAttachments([]); setShowCc(false); setShowBcc(false); storeDraft(email, blankDraft(email)) }
  function leaveHeldMessage() {
    const id = draft.pendingId || draft.resubmitId
    if (!id) return
    const held: HeldDraft = { id, heldAt: new Date().toISOString(), draft: { ...draft, pendingId: id, hadAttachments: attachments.length > 0 || draft.hadAttachments } }
    const next = [held, ...heldDrafts.filter(entry => entry.id !== id)]
    if (!persistHeldDrafts(email, next)) { setError('This device could not save the held message. Keep this draft open and try again after freeing browser storage.'); return }
    heldFiles.current.set(id, attachments); setHeldDrafts(next); resetDraft(); setNotice('The original message remains in Sent activity. You can now write a separate email.')
  }
  function resumeHeldMessage(entry: HeldDraft) {
    if (hasCurrentDraft) { setError('Finish or discard your current draft before reopening this held message.'); return }
    const restored = { ...entry.draft, pendingId: entry.id }
    if (!storeDraft(email, restored)) { setError('This device could not save the held message. Please try again after freeing browser storage.'); return }
    setDraft(restored); setAttachments(heldFiles.current.get(entry.id) ?? []); setShowCc(Boolean(restored.cc)); setShowBcc(Boolean(restored.bcc)); setTab('compose'); setError(''); setNotice('Your original message is open. Retry uses its original sending identifier.')
  }
  function handleSendResult(message: MailMessage) {
    mergeMessage(message)
    if (message.status === 'sent') { resetDraft(); setNotice('Your email was accepted for sending. You can find it in Sent activity.') }
    else if (message.status === 'review') setError('Sending could not be confirmed and this message needs review. Check its status with the site owner before sending another copy.')
    else setError('Sending could not be confirmed. Your message is saved. Use Retry sending to check and retry the same email.')
  }
  async function perform(label: string, run: () => Promise<void>) {
    if (operation.current) return
    operation.current = true; setWorking(label); setError(''); setNotice('')
    try { await run() } catch (reason) { handleError(reason) } finally { operation.current = false; setWorking('') }
  }
  async function refresh() { await perform('refresh', async () => { const data = await request() as MailSession; if (!data.authenticated) { onSignOut(); return }; setSession(data); setNotice('Sent activity is up to date.'); const current = data.messages?.find(message => message.id === draft.pendingId); if (current?.status === 'sent') resetDraft() }) }
  async function attach(files: File[]) {
    if (locked || operation.current || !files.length) return
    await perform('files', async () => {
      if (files.length + attachments.length > MAIL_LIMITS.attachments) throw new Error(`Attach up to ${MAIL_LIMITS.attachments} files per message.`)
      if (files.reduce((sum, file) => sum + file.size, totalBytes) > MAIL_LIMITS.attachmentBytes) throw new Error(errorMessages.attachments_too_large)
      const added = await Promise.all(files.map(async file => {
        const content = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1] ?? ''); reader.onerror = () => reject(new Error(`Could not read ${file.name}. Try attaching it again.`)); reader.readAsDataURL(file) })
        return { id: crypto.randomUUID(), filename: file.name, content, contentType: file.type || 'application/octet-stream', size: file.size }
      }))
      setAttachments(current => [...current, ...added]); setDraft(current => ({ ...current, hadAttachments: false }))
    })
  }
  async function send(event: FormEvent) {
    event.preventDefault(); if (locked || operation.current) return
    const to = recipients(draft.to), cc = recipients(draft.cc), bcc = recipients(draft.bcc)
    if (!to.length) { setError('Add at least one recipient in To.'); return }
    if ([...to, ...cc, ...bcc].some(address => !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(address))) { setError(errorMessages.invalid_recipients); return }
    if (to.length + cc.length + bcc.length > MAIL_LIMITS.recipients) { setError(`Send to up to ${MAIL_LIMITS.recipients} recipients at a time.`); return }
    if (!draft.subject.trim()) { setError(errorMessages.subject_required); return }
    if (!DOMPurify.sanitize(draft.html, { ALLOWED_TAGS: [] }).replace(/&nbsp;/g, ' ').trim()) { setError(errorMessages.message_required); return }
    if (draft.hadAttachments && !attachments.length) { setError('The files from your saved draft need to be attached again. Add them, or clear the attachment reminder to send without them.'); return }
    const html = `${draft.html}${draft.includeSignature && signature ? `<div style="margin-top:24px">${signature}</div>` : ''}`
    if (new TextEncoder().encode(html).length > MAIL_LIMITS.htmlBytes) { setError(errorMessages.message_too_large); return }
    const id = draft.resubmitId || crypto.randomUUID()
    await perform('send', async () => {
      const frozen = { ...draft, resubmitId: id, pendingId: id, hadAttachments: attachments.length > 0, signatureHtml: signature }
      setDraft(frozen); storeDraft(email, frozen)
      try {
        const data = await request({ action: 'send', id, from: draft.from, to, cc, bcc, subject: draft.subject.trim(), html, attachments: attachments.map(({ filename, content, contentType }) => ({ filename, content, contentType })) })
        if (!data.message) throw new Error('The send result could not be confirmed. Use Retry sending to check this message.')
        handleSendResult(data.message)
      } catch (reason) {
        // Validation failures occur before a sending record is created. Other failures
        // keep the draft frozen until the server resolves its original identifier.
        if (reason instanceof MailRequestError && ['invalid_fields', 'invalid_recipients', 'invalid_sender', 'subject_required', 'message_required', 'attachments_too_large', 'attachment_invalid', 'unsupported_attachment', 'message_too_large', 'too_large', 'email_not_configured'].includes(reason.code)) setDraft(current => ({ ...current, pendingId: '', resubmitId: id }))
        throw reason
      }
    })
  }
  async function retry(id: string) {
    await perform(`retry:${id}`, async () => {
      try {
        const data = await request({ action: 'retry-send', id }); if (!data.message) throw new Error('The send result could not be confirmed. Try refreshing Sent activity.')
        if (draft.pendingId === id) handleSendResult(data.message)
        else { mergeMessage(data.message); setNotice(data.message.status === 'sent' ? 'Your email was accepted for sending.' : 'Sending is still unconfirmed. The original message is saved.'); if (data.message.status === 'review') setError('This message needs review before another sending attempt.') }
      } catch (reason) {
        if (reason instanceof MailRequestError && reason.code === 'message_not_found' && draft.pendingId === id) { setDraft(current => ({ ...current, pendingId: '', resubmitId: id, hadAttachments: attachments.length ? false : current.hadAttachments })); setNotice('The original sending attempt is not available yet. Review the attachments and retry this draft; it will keep the same sending identifier.'); return }
        throw reason
      }
    })
  }
  async function saveSignature() {
    await perform('signature', async () => {
      const data = await request({ action: 'save-signature', sender: signatureSender, html: signatureDrafts[signatureSender] })
      if (data.signatures) { setSession(current => ({ ...current, signatures: data.signatures })); setSignatureDrafts(current => ({ ...current, [signatureSender]: data.signatures![signatureSender] })) }
      setNotice(`Signature saved for ${signatureSender}.`)
    })
  }
  function navigate(next: Tab) { setTab(next); setError(''); setNotice(''); if (next === 'sent') setSelectedId('') }
  return <div className="mail-app mail-workspace">
    <aside className="mail-sidebar"><Brand /><p className="mail-sidebar-title">Mail</p><nav aria-label="Mail navigation">
      <button type="button" className={`mail-nav-compose${tab === 'compose' ? ' is-active' : ''}`} aria-current={tab === 'compose' ? 'page' : undefined} onClick={() => navigate('compose')}><MailIcon name="compose" />Compose</button>
      <button type="button" className={tab === 'sent' ? 'is-active' : ''} aria-current={tab === 'sent' ? 'page' : undefined} onClick={() => navigate('sent')}><MailIcon name="sent" />Sent activity{messages.length > 0 && <span className="mail-count">{messages.length}</span>}</button>
      <button type="button" className={tab === 'signatures' ? 'is-active' : ''} aria-current={tab === 'signatures' ? 'page' : undefined} onClick={() => navigate('signatures')}><MailIcon name="signature" />Signatures</button>
    </nav><div className="mail-sidebar-bottom"><p>Replies arrive in the sender’s regular inbox.</p><div className="mail-account"><span className="mail-avatar">{email.slice(0, 1).toUpperCase()}</span><span><strong>{email.split('@')[0]}</strong><small>{email}</small></span><button type="button" className="mail-icon-button" title="Sign out" aria-label="Sign out" disabled={busy} onClick={() => void perform('logout', async () => { await request({ action: 'logout' }); onSignOut() })}><MailIcon name="logout" size={18} /></button></div></div></aside>
    <main className="mail-main"><header className="mail-page-header"><div><h1>{tab === 'compose' ? 'New message' : tab === 'sent' ? 'Sent activity' : 'Email signatures'}</h1><p>{tab === 'compose' ? 'A good conversation starts here.' : tab === 'sent' ? 'Your recent emails from this workspace.' : 'A personal finish, saved for each sender.'}</p></div><div className="mail-header-meta"><MailIcon name="lock" size={14} /><span>Team workspace</span></div></header>
      <div ref={noticeRef} tabIndex={-1} className="mail-notices" aria-live="polite">{error && <p className="mail-alert mail-error" role="alert">{error}</p>}{notice && <p className="mail-alert mail-success" role="status">{notice}</p>}</div>
      {tab === 'compose' && <form className="mail-compose" onSubmit={send}>
        <div className="mail-compose-fields"><div className="mail-address-row"><label htmlFor="mail-from">From</label><select id="mail-from" value={draft.from} disabled={busy || locked} onChange={event => updateDraft({ from: event.target.value as MailSender })}>{MAIL_SENDERS.map(sender => <option key={sender.email} value={sender.email}>{sender.name} &lt;{sender.email}&gt;</option>)}</select></div>
          <div className="mail-address-row"><label htmlFor="mail-to">To</label><input id="mail-to" value={draft.to} type="text" autoComplete="off" spellCheck={false} placeholder="name@company.com" disabled={busy || locked} onChange={event => updateDraft({ to: event.target.value })} aria-describedby="mail-recipient-help" /><div className="mail-recipient-toggles">{!showCc && <button type="button" className="mail-text-button" onClick={() => setShowCc(true)}>Cc</button>}{!showBcc && <button type="button" className="mail-text-button" onClick={() => setShowBcc(true)}>Bcc</button>}</div></div>
          {showCc && <div className="mail-address-row"><label htmlFor="mail-cc">Cc</label><input id="mail-cc" value={draft.cc} type="text" autoComplete="off" spellCheck={false} placeholder="Add a copy recipient" disabled={busy || locked} onChange={event => updateDraft({ cc: event.target.value })} aria-describedby="mail-recipient-help" /></div>}
          {showBcc && <div className="mail-address-row"><label htmlFor="mail-bcc">Bcc</label><input id="mail-bcc" value={draft.bcc} type="text" autoComplete="off" spellCheck={false} placeholder="Add a hidden copy recipient" disabled={busy || locked} onChange={event => updateDraft({ bcc: event.target.value })} aria-describedby="mail-recipient-help" /></div>}
          <span id="mail-recipient-help" className="mail-sr-only">Separate multiple email addresses with commas.</span>
          <div className="mail-address-row mail-subject-row"><label htmlFor="mail-subject">Subject</label><input id="mail-subject" value={draft.subject} placeholder="What’s on your mind?" maxLength={MAIL_LIMITS.subjectLength} disabled={busy || locked} onChange={event => updateDraft({ subject: event.target.value })} /></div>
        </div>
        <RichTextEditor value={draft.html} onChange={html => updateDraft({ html })} disabled={busy || locked} />
        <div className="mail-compose-signature"><div className="mail-signature-toggle"><label><input type="checkbox" checked={draft.includeSignature} disabled={busy || locked} onChange={event => updateDraft({ includeSignature: event.target.checked })} />Include saved signature</label><button className="mail-text-button" type="button" onClick={() => { setSignatureSender(draft.from); navigate('signatures') }}>{signature ? 'Edit signature' : 'Add signature'}</button></div>{draft.includeSignature && signature && <HtmlPreview html={signature} title="Signature included in this message" compact />}</div>
        <div className={`mail-attachments${dragging ? ' is-dragging' : ''}`} onDragOver={event => { event.preventDefault(); if (!locked) setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={event => { event.preventDefault(); setDragging(false); void attach(Array.from(event.dataTransfer.files)) }}>
          <input ref={fileInput} className="mail-sr-only" type="file" multiple aria-label="Choose attachments" tabIndex={-1} onChange={event => { void attach(Array.from(event.target.files ?? [])); event.target.value = '' }} />
          <div className="mail-attachment-heading"><button className="mail-text-button" type="button" disabled={busy || locked} onClick={() => fileInput.current?.click()}><MailIcon name="attachment" size={18} />{working === 'files' ? 'Reading files…' : 'Attach files'}</button><span>or drop here · 3 MB total</span></div>
          {attachments.length > 0 && <ul className="mail-file-list">{attachments.map(file => <li key={file.id}><MailIcon name="attachment" size={16} /><span className="mail-file-name">{file.filename}</span><small>{fileSize(file.size)}</small><button type="button" className="mail-icon-button" aria-label={`Remove ${file.filename}`} disabled={busy || locked} onClick={() => { setAttachments(current => current.filter(item => item.id !== file.id)); setDraft(current => ({ ...current, hadAttachments: false })) }}><MailIcon name="close" size={16} /></button></li>)}</ul>}
          {draft.hadAttachments && !attachments.length && !locked && <p className="mail-reattach">Files are not saved with drafts. Attach them again before sending. <button type="button" className="mail-text-button" onClick={() => setDraft(current => ({ ...current, hadAttachments: false }))}>Send without those files</button></p>}
        </div>
        {locked && <div className="mail-pending-note"><strong>{pending?.status === 'review' ? 'This message needs review' : 'Your original message is saved for retry'}</strong><p>{pending?.status === 'review' ? 'Check its status with the site owner before sending another copy.' : 'Its contents are held while sending is unconfirmed. Retrying uses the same message.'}</p></div>}
        {unresolved && <div className="mail-separate-message">{startingNew ? <><p>The original email may still be sent. Keep it in Sent activity and start a separate conversation. Avoid copying and resending the original until its status is confirmed.</p><div><button type="button" className="mail-button mail-button-small" disabled={busy} onClick={leaveHeldMessage}>Keep original and start new</button><button type="button" className="mail-text-button" onClick={() => setStartingNew(false)}>Keep working here</button></div></> : <button type="button" className="mail-text-button" disabled={busy} onClick={() => setStartingNew(true)}>Write a separate email</button>}</div>}
        <footer className="mail-compose-footer">{locked ? <button className="mail-button mail-primary" type="button" disabled={busy || pending?.status === 'review'} onClick={() => void retry(draft.pendingId)}><MailIcon name="refresh" size={18} />{working.startsWith('retry:') ? 'Checking…' : 'Retry sending'}</button> : <button className="mail-button mail-primary" type="submit" disabled={busy}><MailIcon name="sent" size={18} />{working === 'send' ? 'Sending…' : draft.resubmitId ? 'Retry original email' : 'Send email'}</button>}<span className="mail-draft-status">{storageUnavailable ? 'Draft could not be saved on this device' : locked ? 'Message held for retry' : 'Draft saved on this device'}{attachments.length > 0 && <small>Files stay until this page closes.</small>}</span><button type="button" className="mail-text-button mail-discard" disabled={busy || unresolved} onClick={() => { if (window.confirm('Discard this draft and its attachments?')) { resetDraft(); setError(''); setNotice('Draft discarded.') } }}>Discard</button></footer>
      </form>}
      {tab === 'signatures' && <section className="mail-settings"><div className="mail-settings-top"><label htmlFor="mail-signature-sender">Signature for</label><select id="mail-signature-sender" value={signatureSender} disabled={busy} onChange={event => setSignatureSender(event.target.value as MailSender)}>{MAIL_SENDERS.map(sender => <option key={sender.email} value={sender.email}>{sender.name} · {sender.email}</option>)}</select><p>Paste your HTML signature below. It will be added automatically when you compose from this address. Signatures are saved to your account.</p></div><div className="mail-signature-grid"><div><label className="mail-section-label" htmlFor="mail-signature-html">HTML source</label><textarea id="mail-signature-html" className="mail-signature-source" placeholder={'<p><strong>Your name</strong><br>Wallace Shift</p>'} value={signatureDrafts[signatureSender]} spellCheck={false} disabled={busy} onChange={event => setSignatureDrafts(current => ({ ...current, [signatureSender]: event.target.value }))} /><p className="mail-field-help">Tables, links, and hosted images are supported. Scripts and unsafe HTML are removed when you save.</p></div><div><span className="mail-section-label">Preview</span><div className="mail-signature-preview">{signatureDrafts[signatureSender].trim() ? <HtmlPreview html={signatureDrafts[signatureSender]} title={`Signature preview for ${signatureSender}`} /> : <div className="mail-preview-empty"><MailIcon name="signature" size={28} /><p>Your signature will appear here.</p></div>}</div></div></div><footer className="mail-settings-footer"><button className="mail-button mail-primary" type="button" disabled={busy || signatureDrafts[signatureSender] === (session.signatures?.[signatureSender] ?? '')} onClick={() => void saveSignature()}>{working === 'signature' ? 'Saving…' : 'Save signature'}</button><button type="button" className="mail-text-button" onClick={() => navigate('compose')}>Back to message</button></footer></section>}
      {tab === 'sent' && <section className="mail-sent"><div className="mail-sent-toolbar"><p>{selected ? 'Message details' : 'Last 50 messages sent from your account'}</p><button className="mail-text-button" type="button" disabled={busy} onClick={() => void refresh()}><MailIcon name="refresh" size={16} />Refresh</button></div>
        {!selected && localHeld.length > 0 && <div className="mail-held-drafts"><h2>Unresolved sending attempts</h2><p>These messages are saved on this device. Their original send may still complete; reopening keeps the same sending identifier.</p>{localHeld.map(entry => <div className="mail-held-entry" key={entry.id}><div><strong>{entry.draft.subject || 'Untitled message'}</strong><span>To {entry.draft.to || 'No recipient'} · {readableDate(entry.heldAt)}</span></div><button type="button" className="mail-text-button" disabled={busy || hasCurrentDraft} onClick={() => resumeHeldMessage(entry)}>Reopen original</button></div>)}{hasCurrentDraft && <p>Finish or discard your current draft before reopening one of these messages.</p>}</div>}
        {selected ? <article className="mail-message-detail"><button type="button" className="mail-text-button mail-back-button" onClick={() => setSelectedId('')}><MailIcon name="back" size={16} />All sent activity</button><div className="mail-message-title"><h2>{selected.subject}</h2><span className={`mail-status mail-status-${selected.status}`}>{statusText[selected.status]}</span></div><dl><div><dt>From</dt><dd>{selected.from}</dd></div><div><dt>To</dt><dd>{selected.to.join(', ')}</dd></div>{selected.cc.length > 0 && <div><dt>Cc</dt><dd>{selected.cc.join(', ')}</dd></div>}{selected.bcc.length > 0 && <div><dt>Bcc</dt><dd>{selected.bcc.join(', ')}</dd></div>}<div><dt>Created</dt><dd>{readableDate(selected.createdAt)}</dd></div></dl><HtmlPreview html={selected.html} title={`Message: ${selected.subject}`} />{selected.attachments.length > 0 && <div className="mail-sent-attachments"><MailIcon name="attachment" size={16} /><span>{selected.attachments.map(file => `${file.filename} (${fileSize(file.size)})`).join(' · ')}</span></div>}<div className="mail-delivery-note"><p>{selected.status === 'sent' ? 'Accepted by the email service for sending. Delivery to the recipient is not confirmed here.' : selected.status === 'review' ? 'This sending attempt needs review. Check its status with the site owner before creating another copy.' : 'Sending was not confirmed. You can safely retry this saved message.'}</p>{(selected.status === 'failed' || selected.status === 'pending') && <button className="mail-button mail-primary" disabled={busy} onClick={() => void retry(selected.id)}>{working.startsWith('retry:') ? 'Checking…' : 'Retry sending'}</button>}</div></article> : messages.length ? <ul className="mail-message-list">{messages.map(message => <li key={message.id}><button type="button" onClick={() => setSelectedId(message.id)}><span className="mail-message-icon"><MailIcon name="sent" size={19} /></span><span className="mail-message-summary"><strong>{message.subject}</strong><span>To {message.to.join(', ')}</span><small>From {message.from}</small></span><span className="mail-message-meta"><time dateTime={message.createdAt}>{readableDate(message.createdAt)}</time><span className={`mail-status mail-status-${message.status}`}>{statusText[message.status]}</span>{message.attachments.length > 0 && <small><MailIcon name="attachment" size={13} />{message.attachments.length}</small>}</span></button></li>)}</ul> : localHeld.length ? null : <div className="mail-empty"><MailIcon name="sent" size={36} /><h2>Your conversations start here</h2><p>Emails you send from this workspace will appear here, along with their sending status.</p><button type="button" className="mail-button mail-primary" onClick={() => navigate('compose')}>Write your first email<MailIcon name="arrow" size={18} /></button></div>}
      </section>}
    </main>
  </div>
}
