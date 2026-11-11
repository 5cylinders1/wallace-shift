import { useEffect, useRef, useState, type FormEvent } from 'react'
import { submitInquiry, type SubmitResult } from './submit'
import { Arrow, Field, NotSent } from './ui'
import { focusFirstError, validEmail, validPhone } from './validate'

const TOPICS = ['A color question', 'Color correction', 'Cuts & styling', 'Keratin treatment', 'Gift cards', 'Products', 'Something else'] as const
const MAX_PHOTOS = 3

interface Photo { name: string; url: string }

type Errors = Partial<Record<'name' | 'email' | 'phone' | 'message' | 'photos', string>>

/**
 * A question for Lara. The compact version lives in the hero card; the full
 * one adds a topic and up to three photos of the visitor's current hair, which
 * is how most color conversations start.
 */
export default function InquiryForm({ compact = false }: { compact?: boolean }) {
  const form = useRef<HTMLFormElement>(null)
  const result = useRef<HTMLDivElement>(null)
  const [topic, setTopic] = useState<string>(TOPICS[0])
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const [photos, setPhotos] = useState<Photo[]>([])
  const [errors, setErrors] = useState<Errors>({})
  const [sending, setSending] = useState(false)
  const [outcome, setOutcome] = useState<SubmitResult | null>(null)

  // Object URLs for the previews are released when they leave the form.
  const photoUrls = useRef<string[]>([])
  useEffect(() => { photoUrls.current = photos.map((p) => p.url) }, [photos])
  useEffect(() => () => photoUrls.current.forEach((url) => URL.revokeObjectURL(url)), [])

  useEffect(() => { if (outcome) result.current?.querySelector<HTMLElement>('[tabindex="-1"]')?.focus() }, [outcome])

  const addPhotos = (files: FileList | null) => {
    if (!files) return
    const images = [...files].filter((file) => file.type.startsWith('image/'))
    const room = MAX_PHOTOS - photos.length
    const added = images.slice(0, room).map((file) => ({ name: file.name, url: URL.createObjectURL(file) }))
    setPhotos((current) => [...current, ...added])
    setErrors((current) => ({ ...current, photos: images.length > room ? `Up to ${MAX_PHOTOS} photos. The first ${MAX_PHOTOS} were kept.` : undefined }))
  }

  const removePhoto = (url: string) => {
    URL.revokeObjectURL(url)
    setPhotos((current) => current.filter((photo) => photo.url !== url))
  }

  const validate = (): Errors => {
    const next: Errors = {}
    if (!name.trim()) next.name = 'Please add your name.'
    const hasEmail = email.trim() !== ''
    const hasPhone = phone.trim() !== ''
    if (!hasEmail && !hasPhone) next.email = 'Add an email or a phone number so Lara can reply.'
    if (hasEmail && !validEmail(email)) next.email = 'That email address looks incomplete.'
    if (hasPhone && !validPhone(phone)) next.phone = 'Please enter a 10-digit phone number.'
    if (message.trim().length < 5) next.message = 'Tell Lara a little about what you need.'
    return next
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const next = validate()
    setErrors(next)
    if (Object.keys(next).length) {
      focusFirstError(form.current)
      return
    }
    setSending(true)
    const response = await submitInquiry({ topic: compact ? 'Quick question' : topic, name, email, phone, message, photos: photos.map((p) => p.name) })
    setSending(false)
    setOutcome(response)
  }

  const reset = () => {
    photos.forEach((photo) => URL.revokeObjectURL(photo.url))
    setTopic(TOPICS[0]); setName(''); setEmail(''); setPhone(''); setMessage(''); setPhotos([]); setErrors({}); setOutcome(null)
  }

  if (outcome) {
    return (
      <div ref={result} className="sl-form-result">
        {outcome.status === 'demo' && <NotSent what="question" onReset={reset} />}
        {outcome.status === 'sent' && (
          <div className="sl-sent" role="status" tabIndex={-1}>
            <p className="sl-notsent-title">Thanks, {name.split(' ')[0]}. Your question is with Lara.</p>
            <button type="button" className="sl-link-btn" onClick={reset}>Ask something else</button>
          </div>
        )}
        {outcome.status === 'error' && (
          <div className="sl-notsent" role="alert" tabIndex={-1}>
            <p className="sl-notsent-title">That didn’t go through.</p>
            <button type="button" className="sl-link-btn" onClick={() => setOutcome(null)}>Try again</button>
          </div>
        )}
      </div>
    )
  }

  return (
    <form ref={form} className={`sl-form${compact ? ' sl-form--compact' : ''}`} onSubmit={onSubmit} noValidate aria-label={compact ? 'Quick question for Lara' : 'Ask Lara a question'}>
      {!compact && (
        <Field label="What’s it about?">
          {(props) => (
            <select {...props} value={topic} onChange={(e) => setTopic(e.target.value)}>
              {TOPICS.map((t) => <option key={t}>{t}</option>)}
            </select>
          )}
        </Field>
      )}
      <Field label="Your name" error={errors.name}>
        {(props) => <input {...props} type="text" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />}
      </Field>
      <div className="sl-field-row">
        <Field label="Email" error={errors.email}>
          {(props) => <input {...props} type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} />}
        </Field>
        <Field label="Phone" error={errors.phone}>
          {(props) => <input {...props} type="tel" autoComplete="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />}
        </Field>
      </div>
      <p className="sl-hint sl-hint--row">Give an email, a phone number or both, whichever you prefer.</p>
      <Field label={compact ? 'Your question' : 'Your question or hair goal'} error={errors.message} hint={compact ? undefined : 'Your current color, anything used at home, and the look you want all help.'}>
        {(props) => <textarea {...props} rows={compact ? 3 : 5} value={message} onChange={(e) => setMessage(e.target.value)} />}
      </Field>
      {!compact && (
        <div className="sl-field sl-photos">
          <span className="sl-photos-label" id="sl-photos-label">Photos of your hair <span className="sl-optional">(optional, up to {MAX_PHOTOS})</span></span>
          <div className="sl-photo-row">
            {photos.map((photo) => (
              <figure key={photo.url} className="sl-photo-thumb">
                <img src={photo.url} alt={`Your photo ${photo.name}`} />
                <button type="button" onClick={() => removePhoto(photo.url)} aria-label={`Remove ${photo.name}`}>×</button>
              </figure>
            ))}
            {photos.length < MAX_PHOTOS && (
              <label className="sl-photo-add">
                <input type="file" accept="image/*" multiple aria-labelledby="sl-photos-label" onChange={(e) => { addPhotos(e.target.files); e.target.value = '' }} />
                <span aria-hidden="true">+</span>
                <span className="sl-visually-hidden">Add photos</span>
              </label>
            )}
          </div>
          {errors.photos && <p className="sl-hint">{errors.photos}</p>}
          <p className="sl-hint">Natural light, front and back. Photos stay on your device in this preview.</p>
        </div>
      )}
      <button type="submit" className="sl-btn sl-btn--dark sl-btn--block" disabled={sending}>
        {sending ? 'Sending…' : 'Send question'} <Arrow />
      </button>
    </form>
  )
}
